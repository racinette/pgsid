import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { floatInputForms, deferredFloatInputForms } from './check-float-input-forms.js'

const value = (value: string | boolean | number | bigint | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const expressions = {
  input4: 'float4send(source::real) = expected',
  input8: 'float8send(source::float8) = expected',
  lazy4: 'CASE WHEN skip THEN true ELSE float4send(source::real) = expected END',
  lazy8: 'CASE WHEN skip THEN true ELSE float8send(source::float8) = expected END',
  send4: 'float4send(single_value) = expected',
  send8: 'float8send(double_value) = expected',
}

describe('floating-point SQL text input and binary output', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-float-input-'))
    await pg.exec(
      `CREATE TABLE float_input_checks (source text, expected bytea, skip bool, single_value real, double_value float8, ${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`,
    )
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches decimal rounding, special values, range errors, signed zero, states and lazy branches in every target', async () => {
    await expect(pg.query('SELECT $1::text', ['1\0'])).rejects.toMatchObject({ code: '22021' })
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'float_input_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const constraint = table.constraints.find((c) => c.name === name)!
      return [
        { ...constraint, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...constraint, name: name + '_stored' },
      ]
    })
    const bitLiterals: { name: string; expression: EvalBoolExpression }[] = []
    for (const width of [4, 8] as const) {
      const type = width === 4 ? 'pg_catalog.float4' : 'pg_catalog.float8'
      for (const bits of width === 4
        ? ['00000000', '80000000', '7fc00001', '7f800001']
        : ['0000000000000000', '8000000000000000', '7ff8000000000001', '7ff0000000000001']) {
        bitLiterals.push({
          name: `literal${width}_${bits}`,
          expression: {
            kind: 'eval-scalar',
            expression: {
              kind: 'call',
              call: {
                kind: 'operator',
                signature: 'operator:["pg_catalog","="](pg_catalog.bytea,pg_catalog.bytea)',
                type: 'pg_catalog.bool',
              },
              operands: [
                {
                  kind: 'call',
                  call: {
                    kind: 'function',
                    signature: `function:["pg_catalog","float${width}send"](${type})`,
                    type: 'pg_catalog.bytea',
                  },
                  operands: [{ kind: 'certain', expression: { kind: 'float', type, bits } }],
                },
                {
                  kind: 'certain',
                  expression: { kind: 'bytea', type: 'pg_catalog.bytea', value: bits },
                },
              ],
            },
          },
        })
      }
    }
    const group = prepareCheckRustGroup([
      ...constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, catalog.enums, catalog.domains)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
      ...bitLiterals.map(({ name, expression }) => ({
        expression,
        identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      })),
    ])
    expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const width of [4, 8]) {
      for (const text of floatInputForms) {
        let hex: string | null = null
        let expected: Outcome
        try {
          hex = (
            await pg.query<{ hex: string | null }>(
              `SELECT encode(float${width}send($1::${width === 4 ? 'real' : 'float8'}),'hex') hex`,
              [text],
            )
          ).rows[0]!.hex
          expected = {
            kind:
              hex === null
                ? 'Null'
                : Number.isNaN(
                      width === 4
                        ? Buffer.from(hex, 'hex').readFloatBE()
                        : Buffer.from(hex, 'hex').readDoubleBE(),
                    )
                  ? 'Unknown'
                  : 'True',
          }
        } catch (caught) {
          const code = (caught as { code: string }).code
          expect(['22003', '22P02']).toContain(code)
          expected = error(code)
        }
        const row = { source: value(text), expected: value(hex), skip: value(false) }
        add('input' + width, row, expected)
        add('lazy' + width, row, expected)
        add('lazy' + width, { ...row, skip: value(true) }, { kind: 'True' })
      }
      for (const text of deferredFloatInputForms)
        add('input' + width, { source: value(text), expected: value('') }, { kind: 'Unknown' })
      for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22012')] as Input[]) {
        add('input' + width, { source: state, expected: value('') }, state as Outcome)
        add(
          'lazy' + width,
          { source: state, expected: value(''), skip: value(true) },
          { kind: 'True' },
        )
        add(
          'send' + width,
          { [width === 4 ? 'single_value' : 'double_value']: state, expected: value('') },
          state as Outcome,
        )
      }
      const bits =
        width === 4
          ? [
              '00000000',
              '80000000',
              '00000001',
              '7f7fffff',
              '7f800000',
              'ff800000',
              '7fc00001',
              '7f800001',
              'ffffffff',
            ]
          : [
              '0000000000000000',
              '8000000000000000',
              '0000000000000001',
              '7fefffffffffffff',
              '7ff0000000000000',
              'fff0000000000000',
              '7ff8000000000001',
              '7ff0000000000001',
              'ffffffffffffffff',
            ]
      for (const hex of bits) {
        const signed = BigInt.asIntN(width === 4 ? 32 : 64, BigInt('0x' + hex))
        add(
          'send' + width,
          {
            [width === 4 ? 'single_value' : 'double_value']: value(
              width === 4 ? Number(signed) : signed,
            ),
            expected: value(hex),
          },
          { kind: 'True' },
        )
      }
    }
    for (const literal of bitLiterals)
      fixtures.push({
        name: literal.name,
        row: {},
        expected: {
          kind: Number.isNaN(
            literal.name.startsWith('literal4_')
              ? Buffer.from(literal.name.split('_')[1]!, 'hex').readFloatBE()
              : Buffer.from(literal.name.split('_')[1]!, 'hex').readDoubleBE(),
          )
            ? 'Unknown'
            : 'True',
        },
      })
    await runCheckParity(
      directory,
      'floatinput',
      group,
      [...constraints.map((c) => c.name), ...bitLiterals.map((literal) => literal.name)],
      fixtures,
    )
  }, 180_000)
  it('preserves native Go float32 and float64 payloads through the public row adapter', async () => {
    const catalog = await snapshotCatalog(pg)
    const folder = join(directory, 'public-go')
    await mkdir(folder)
    const config = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: { outDir: schema }\n',
    )
    const output = renderGoSchemaArtifacts(
      catalog,
      config,
      {},
      join(folder, 'schema'),
      'floatpublic/schema',
    )
    expect(output.diagnostics).toEqual([])
    for (const artifact of output.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await writeFile(
      join(folder, 'go.mod'),
      'module floatpublic\n\ngo 1.25\n\nrequire (\n github.com/jackc/pgx/v5 v5.10.0\n github.com/shopspring/decimal v1.4.0\n)\n',
    )
    await writeFile(
      join(folder, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    await writeFile(
      join(folder, 'schema/public/float_payload_test.go'),
      `package public
import("testing"; "math")
func TestFloatPayloads(t *testing.T) {
  for _, bits := range []uint32{0,0x80000000,1,0x7f800000,0xff800000,0x7fc00001,0x7f800001,0xff800001} {
    native := math.Float32frombits(bits)
    wire := []byte{byte(bits >> 24),byte(bits >> 16),byte(bits >> 8),byte(bits)}
    row := PublicFloatInputChecksCheckInput{SingleValue: KnownCheckValue(&native), Expected: KnownCheckValue(&wire)}
    found := false
    for _, check := range EvaluatePublicFloatInputChecksChecks(row) {
      if check.Constraint != "send4" { continue }; found = true
      if !check.Result.Certain || !check.Result.Value.Valid || !check.Result.Value.Value || check.Result.Value.Error != "" { t.Fatalf("float4 %08x: %+v",bits,check) }
    }
    if !found { t.Fatal("missing float4 CHECK") }
  }
  for _, bits := range []uint64{0,0x8000000000000000,1,0x7ff0000000000000,0xfff0000000000000,0x7ff8000000000001,0x7ff0000000000001,0xfff0000000000001} {
    native := math.Float64frombits(bits)
    wire := []byte{byte(bits >> 56),byte(bits >> 48),byte(bits >> 40),byte(bits >> 32),byte(bits >> 24),byte(bits >> 16),byte(bits >> 8),byte(bits)}
    row := PublicFloatInputChecksCheckInput{DoubleValue: KnownCheckValue(&native), Expected: KnownCheckValue(&wire)}
    found := false
    for _, check := range EvaluatePublicFloatInputChecksChecks(row) {
      if check.Constraint != "send8" { continue }; found = true
      if !check.Result.Certain || !check.Result.Value.Valid || !check.Result.Value.Value || check.Result.Value.Error != "" { t.Fatalf("float8 %016x: %+v",bits,check) }
    }
    if !found { t.Fatal("missing float8 CHECK") }
  }
}
`,
    )
    await promisify(execFile)('go', ['test', '-mod=mod', './...'], {
      cwd: folder,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 120_000)
})
