import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import {
  goParityModule,
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const value = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const slope = 'slope(a,b)'
const expressions = {
  equal: `${slope} = 'NaN'::float8`,
  different: `${slope} <> 0::float8`,
  ordered: `${slope} > 'Infinity'::float8`,
  compared: `btfloat8cmp(${slope},'NaN'::float8) = 0`,
  present: `${slope} IS NOT NULL`,
  absent: `${slope} IS NULL`,
  selected: `(CASE WHEN choose_slope THEN ${slope} ELSE 0::float8 END) = 'NaN'::float8`,
  coalesced: `COALESCE(${slope},0::float8) = 'NaN'::float8`,
  largest: `GREATEST(${slope},'NaN'::float8) = 'NaN'::float8`,
  smallest: `LEAST(${slope},0::float8) = 0::float8`,
  add: `(${slope} + operand) = 'NaN'::float8`,
  subtract: `(${slope} - operand) = 'NaN'::float8`,
  multiply: `(${slope} * operand) = 'NaN'::float8`,
  divide: `(${slope} / operand) = 'NaN'::float8`,
  negate: `-${slope} = 'NaN'::float8`,
  absolute: `abs(${slope}) = 'NaN'::float8`,
  root: `sqrt(${slope}) = 'NaN'::float8`,
  narrow: `(${slope})::float4 = 'NaN'::float4`,
  mixed: `(${slope})::float4 = ${slope}`,
  widen: `(${slope})::float4::float8 = 'NaN'::float8`,
  narrow_add: `((${slope})::float4 + 1::float4) = 'NaN'::float4`,
  numeric: `(${slope})::numeric = 'NaN'::numeric`,
  narrow_numeric: `(${slope})::float4::numeric = 'NaN'::numeric`,
  integer_error: `(${slope})::int8 > 0`,
  narrow_integer_error: `(${slope})::float4::int4 > 0`,
  clock_error: `make_time(0,0,${slope}) IS NULL`,
  duration_error: `make_interval(0,0,0,0,0,0,${slope}) IS NULL`,
  scale_error: `(INTERVAL '1 hour' * ${slope}) IS NULL`,
  point_semantics: `point_eq(point(${slope},0::float8),'(NaN,0)'::point)`,
  point_present: `point(${slope},0::float8) IS NOT NULL`,
  wire: `float8send(${slope}) = expected`,
  narrow_wire: `float4send((${slope})::float4) = expected`,
  point_wire: `point_send(point(${slope},0::float8)) = expected`,
  selected_wire: `float8send(CASE WHEN choose_slope THEN ${slope} ELSE operand END) = expected`,
  coalesced_wire: `float8send(COALESCE(${slope},operand)) = expected`,
  greatest_wire: `float8send(GREATEST(${slope},'NaN'::float8)) = expected`,
  recovered_wire: `float8send(float8larger(${slope},'NaN'::float8)) = expected`,
  recovered_finite_wire: `float8send(LEAST(${slope},operand)) = expected`,
  lazy: `CASE WHEN choose_slope THEN true ELSE (${slope} + operand) = 'NaN'::float8 END`,
}

describe('known NaN values with unavailable binary precision', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-float-nan-precision-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('retains NaN comparisons, casts, errors and composition while deferring only unavailable binary output', async () => {
    await pg.exec(
      `CREATE TABLE nan_precision(a point,b point,operand float8,choose_slope boolean,expected bytea,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'nan_precision')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const row: Row = {
      a: value({ x: 0x7ff0000000000000n, y: 0x7ff0000000000000n }),
      b: value({ x: 0n, y: 0n }),
      operand: value(0x3ff0000000000000n),
      choose_slope: value(true),
      expected: value(null),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    const wires = new Set([
      'wire',
      'narrow_wire',
      'point_wire',
      'selected_wire',
      'coalesced_wire',
      'greatest_wire',
      'recovered_wire',
    ])
    for (const [name, sql] of Object.entries(expressions)) {
      let expected: Outcome
      let wire: string | null = null
      try {
        if (name.includes('wire')) {
          const output = sql.slice(0, -' = expected'.length)
          wire = (
            await pg.query<{ wire: string }>(
              `SELECT encode(${output},'hex') wire FROM (SELECT '(Infinity,Infinity)'::point a,'(0,0)'::point b,1::float8 operand,true choose_slope) source`,
            )
          ).rows[0]!.wire
        }
        const result = (
          await pg.query<{ result: boolean | null }>(
            `SELECT ${sql} result FROM (SELECT '(Infinity,Infinity)'::point a,'(0,0)'::point b,1::float8 operand,true choose_slope,$1::bytea expected) source`,
            [wire === null ? null : Buffer.from(wire, 'hex')],
          )
        ).rows[0]!.result
        expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
      } catch (caught) {
        const state = (caught as { code: string }).code
        expect(['22003', '22008']).toContain(state)
        expected = error(state)
      }
      add(name, { ...row, expected: value(wire) }, wires.has(name) ? { kind: 'Unknown' } : expected)
    }
    for (const name of ['add', 'subtract', 'multiply', 'divide']) {
      add(name, { ...row, operand: value(null) }, { kind: 'Null' })
      add(name, { ...row, operand: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(name, { ...row, operand: error('22012') }, error('22012'))
    }
    add('lazy', { ...row, operand: error('22012') }, { kind: 'True' })
    add('lazy', { ...row, operand: error('22012'), choose_slope: value(false) }, error('22012'))
    await runCheckParity(
      directory,
      'nanprecision',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
    await mkdir(join(directory, 'go/defaults'))
    await writeFile(
      join(directory, 'go/defaults/values_test.go'),
      `package defaults
import("testing"; r "${goParityModule}/checkruntime")
func TestZeroFloatValuesRemainUnknown(t *testing.T) {
 var single r.Float4Value
 var double r.Float8Value
 if single.Kind!=r.Float4ValueUnknown || double.Kind!=r.Float8ValueUnknown {t.Fatal("zero float value changed meaning")}
}
`,
    )
    await promisify(execFile)('go', ['test', '-p', '1', './defaults'], {
      cwd: join(directory, 'go'),
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 300_000)
  it('retains native JavaScript NaN semantics without inventing the original PostgreSQL bits', async () => {
    const predicates = {
      single_semantic: "single = 'NaN'::real",
      double_semantic: "double = 'NaN'::float8",
      single_present: 'single IS NOT NULL',
      double_present: 'double IS NOT NULL',
      single_wire: 'float4send(single) = expected_single',
      double_wire: 'float8send(double) = expected_double',
    }
    await pg.exec(`CREATE TABLE native_nan_inputs(single real,double double precision,expected_single bytea,expected_double bytea,
      ${Object.entries(predicates)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')});
      INSERT INTO native_nan_inputs VALUES (
        ('Infinity'::float8-'Infinity'::float8)::real,'Infinity'::float8-'Infinity'::float8,
        float4send(('Infinity'::float8-'Infinity'::float8)::real),float8send('Infinity'::float8-'Infinity'::float8));`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'native_nan_inputs')!
    const output = renderTypescriptSchemaCheckArtifacts([table])
    const folder = join(directory, 'native-input')
    await mkdir(folder)
    await writeFile(join(folder, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(folder, 'checks.ts'), output.checks)
    for (const artifact of checkTypescriptArtifacts(output.rustFiles!)) {
      const path = join(folder, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await promisify(execFile)('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(folder, 'js'),
      join(folder, 'checks.ts'),
    ])
    const generated = await import(pathToFileURL(join(folder, 'js/checks.js')).href)
    type NativeRow = {
      single: number | null
      double: number | null
      expected_single: Uint8Array | null
      expected_double: Uint8Array | null
    }
    type Result = {
      constraint: keyof typeof predicates
      result: { certain: boolean; value?: boolean | null }
    }
    const evaluate = generated.evaluatePublicNativeNanInputsChecks as (row: object) => Result[]
    const inputs = [
      'SELECT * FROM native_nan_inputs',
      "SELECT 1.5::real single,'-0'::float8 double,float4send(1.5::real) expected_single,float8send('-0'::float8) expected_double",
      'SELECT NULL::real single,NULL::float8 double,NULL::bytea expected_single,NULL::bytea expected_double',
    ]
    for (const sql of inputs) {
      const row = (await pg.query<NativeRow>(sql)).rows[0]!
      const oracle = (
        await pg.query<Record<keyof typeof predicates, boolean | null>>(
          `SELECT ${Object.entries(predicates)
            .map(([name, expression]) => `${expression} AS ${name}`)
            .join(',')} FROM (${sql}) candidate`,
        )
      ).rows[0]!
      for (const { constraint, result } of evaluate(row)) {
        const input = constraint.startsWith('single') ? row.single : row.double
        expect(result, constraint).toEqual(
          constraint.endsWith('_wire') && Number.isNaN(input)
            ? { certain: false }
            : { certain: true, value: oracle[constraint] },
        )
      }
      const exact = {
        ...row,
        single:
          row.expected_single === null
            ? null
            : { kind: 'Value', value: Buffer.from(row.expected_single).readInt32BE() },
        double:
          row.expected_double === null
            ? null
            : { kind: 'Value', value: Buffer.from(row.expected_double).readBigInt64BE() },
      }
      for (const { constraint, result } of evaluate(exact))
        expect(result, constraint).toEqual({ certain: true, value: oracle[constraint] })
    }
  }, 120_000)
})
