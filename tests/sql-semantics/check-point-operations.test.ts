import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  callableIdentity,
  type FunctionMetadata,
  type OperatorMetadata,
} from '../../src/postgres/builtins/catalog.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const value = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const points: (string | null)[] = [
  '(0,0)',
  '(-0,-0)',
  '(1,2)',
  '(-1,-2)',
  '(0.0000005,-0.0000005)',
  '(0.000001,0.000001)',
  '(0.0000010000000002,0)',
  '(5e-324,0)',
  '(1e308,-1e308)',
  '(Infinity,0)',
  '(-Infinity,0)',
  '(Infinity,Infinity)',
  '(NaN,0)',
  '(NaN,0.0000005)',
  '(0,NaN)',
  '(NaN,NaN)',
  null,
]
const sender = (result: string) =>
  result === 'pg_catalog.point'
    ? 'point_send'
    : result === 'pg_catalog.float8'
      ? 'float8send'
      : 'boolsend'

describe('point arithmetic, relative coordinates and measurements', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-point-operations-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches catalog functions and operator aliases, exact coordinate and distance bits, intermediate errors, tolerance boundaries, partial inputs and lazy branches', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/point_operations.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(14)
    const identities = new Map(functions.map((fn) => [callableIdentity(fn), fn]))
    const aliases = builtinCallables()
      .filter(
        (fn): fn is OperatorMetadata => fn.kind === 'operator' && identities.has(fn.implementation),
      )
      .map((operator, index) => ({
        name: 'operator_' + index,
        fn: identities.get(operator.implementation)!,
        sql: `a OPERATOR(pg_catalog.${operator.name}) b`,
      }))
    expect(aliases.length).toBeGreaterThanOrEqual(10)
    const expressions: Record<string, string> = {}
    for (const fn of functions) {
      expressions[fn.rustName] = `${sender(fn.result)}(pg_catalog."${fn.name}"(a,b)) = expected`
      expressions[fn.rustName + '_lazy'] =
        `CASE WHEN skip THEN true ELSE ${expressions[fn.rustName]} END`
      if (fn.result === 'pg_catalog.point')
        expressions[fn.rustName + '_semantic'] =
          `point_eq(pg_catalog."${fn.name}"(a,b), expected_point)`
    }
    for (const alias of aliases)
      expressions[alias.name] = `${sender(alias.fn.result)}(${alias.sql}) = expected`
    await pg.exec(
      `CREATE DOMAIN coordinate_point AS point; CREATE TABLE point_operation_checks(a coordinate_point,b point,expected bytea,expected_point point,skip bool,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'point_operation_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    const inputs = new Map<string | null, Input>()
    const decode = async (point: string | null): Promise<Input> => {
      if (inputs.has(point)) return inputs.get(point)!
      const hex = (
        await pg.query<{ hex: string | null }>("SELECT encode(point_send($1::point),'hex') hex", [
          point,
        ])
      ).rows[0]!.hex
      const bytes = hex === null ? null : Buffer.from(hex, 'hex')
      const input = value(
        bytes === null ? null : { x: bytes.readBigInt64BE(), y: bytes.readBigInt64BE(8) },
      )
      inputs.set(point, input)
      return input
    }
    const evaluate = async (fn: FunctionMetadata, a: string | null, b: string | null) => {
      let hex: string | null = null,
        expected: Outcome
      try {
        hex = (
          await pg.query<{ hex: string | null }>(
            `SELECT encode(${sender(fn.result)}(pg_catalog."${fn.name}"($1::point,$2::point)),'hex') hex`,
            [a, b],
          )
        ).rows[0]!.hex
        expected = { kind: hex === null ? 'Null' : 'True' }
      } catch (caught) {
        const code = (caught as { code: string }).code
        expect(['22003', '22012']).toContain(code)
        expected = error(code)
      }
      const semanticExpected = expected
      const bytes = hex === null ? null : Buffer.from(hex, 'hex')
      if (
        bytes &&
        ((fn.result === 'pg_catalog.point' &&
          (Number.isNaN(bytes.readDoubleBE()) || Number.isNaN(bytes.readDoubleBE(8)))) ||
          (fn.name === 'slope' && Number.isNaN(bytes.readDoubleBE())))
      )
        expected = { kind: 'Unknown' }
      const row: Row = {
        a: await decode(a),
        b: await decode(b),
        expected: value(hex),
        skip: value(false),
      }
      if (fn.result === 'pg_catalog.point') {
        const resultPoint =
          bytes === null ? null : { x: bytes.readBigInt64BE(), y: bytes.readBigInt64BE(8) }
        add(
          fn.rustName + '_semantic',
          { ...row, expected_point: value(resultPoint) },
          semanticExpected,
        )
      }
      add(fn.rustName, row, expected)
      for (const alias of aliases.filter((alias) => alias.fn.rustName === fn.rustName))
        add(alias.name, row, expected)
      if (expected.kind === 'Error' || a === null || b === null) {
        add(fn.rustName + '_lazy', row, expected)
        add(fn.rustName + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
      }
      if (a === '(1,2)' && b === '(1,2)' && hex !== null) {
        add(fn.rustName, { ...row, expected: value(hex === '00' ? '01' : '00') }, { kind: 'False' })
        add(fn.rustName + '_lazy', row, expected)
      }
    }
    for (const fn of functions)
      for (const a of points) for (const b of points) await evaluate(fn, a, b)
    let seed = 0x5617513
    const coordinate = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const number = (seed - 0x80000000) / Math.max(1, (seed >>> 8) % 1000)
      return number.toPrecision(17)
    }
    for (let index = 0; index < 128; index++) {
      const a = `(${coordinate()},${coordinate()})`,
        b = `(${coordinate()},${coordinate()})`
      for (const fn of functions.filter((fn) => fn.result !== 'pg_catalog.bool'))
        await evaluate(fn, a, b)
    }
    const baseline: Row = {
      a: await decode('(1,2)'),
      b: await decode('(1,2)'),
      expected: value(''),
      skip: value(false),
    }
    for (const fn of functions)
      for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22012')] as Input[])
        for (const field of ['a', 'b']) {
          const row = { ...baseline, [field]: state }
          add(fn.rustName, row, state as Outcome)
          add(fn.rustName + '_lazy', row, state as Outcome)
          add(fn.rustName + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
          if (state.kind !== 'Error')
            add(fn.rustName, { ...baseline, a: state, b: error('22003') }, error('22003'))
        }
    await runCheckParity(
      directory,
      'pointoperations',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
})
