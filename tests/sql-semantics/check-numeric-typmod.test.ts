import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  callableIdentity,
  type FunctionMetadata,
  type OperatorMetadata,
} from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const sourceNames = new Set(
  ['numeric_typmod'].flatMap((name) =>
    [
      ...readFileSync(
        `crates/check-evaluator/src/operations/pg_catalog/${name}.rs`,
        'utf8',
      ).matchAll(/pub fn (sql__[a-z0-9_]+)\(/gu),
    ].map((match) => match[1]!),
  ),
)
const callables = builtinCallables().filter(
  (callable): callable is FunctionMetadata =>
    callable.kind === 'function' && sourceNames.has(callable.rustName),
)
const shortType = (type: string) => type.slice('pg_catalog.'.length).replaceAll('"', '')
const argument = (index: number, type: string) => `arg${index}_${shortType(type)}`
const recorded = (type: string) => `recorded_${shortType(type)}`
const columns: Record<string, string> = { skip: 'boolean' }
const expressions: Record<string, string> = {}
for (const fn of callables) {
  fn.args.forEach((type, index) => {
    columns[argument(index, type)] = type
  })
  columns[recorded(fn.result)] = fn.result
  expressions[fn.rustName] =
    `pg_catalog.${fn.name}(${fn.args.map((type, index) => argument(index, type)).join(',')}) = ${recorded(fn.result)}`
  if (fn.result === 'pg_catalog."numeric"') {
    columns.result_scale = 'integer'
    columns.result_wire = 'pg_catalog.bytea'
    expressions[`wire_${fn.rustName}`] =
      `pg_catalog.numeric_send(pg_catalog.${fn.name}(${fn.args.map((type, index) => argument(index, type)).join(',')})) = result_wire`
    expressions[`scale_${fn.rustName}`] =
      `pg_catalog.scale(pg_catalog.${fn.name}(${fn.args.map((type, index) => argument(index, type)).join(',')})) = result_scale`
  }
}
const functionsByIdentity = new Map(callables.map((fn) => [callableIdentity(fn), fn]))
const operatorCallables = builtinCallables()
  .filter(
    (fn): fn is OperatorMetadata =>
      fn.kind === 'operator' && functionsByIdentity.has(fn.implementation),
  )
  .map((fn) => ({ ...fn, rustName: functionsByIdentity.get(fn.implementation)!.rustName }))
for (const fn of operatorCallables) {
  const args = fn.args.map((type, index) => argument(index, type))
  const operator = `OPERATOR(pg_catalog.${fn.name})`
  expressions[`operator_${fn.rustName}`] =
    `(${args.length === 1 ? operator + ' ' + args[0] : args[0] + ' ' + operator + ' ' + args[1]}) = ${recorded(fn.result)}`
}
for (const [name, sql] of Object.entries(expressions))
  expressions[name] = `CASE WHEN skip THEN true ELSE ${sql} END`

const input = (value: number | bigint | boolean | string | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const numeric = (type: string) => type === 'pg_catalog."numeric"'
const defaults = (): Row =>
  Object.fromEntries(
    Object.entries(columns).map(([name, type]) => [
      name,
      input(
        type === 'boolean' || type === 'pg_catalog.bool'
          ? false
          : numeric(type)
            ? '0'
            : type === 'pg_catalog.bytea'
              ? ''
              : 0,
      ),
    ]),
  )
const deserialize = (value: string | null, type: string): Input =>
  value === null ? input(null) : input(numeric(type) ? value : Number(value))
const sampleSql = (type: string): string[] => {
  if (numeric(type))
    return [
      'NaN',
      '-Infinity',
      'Infinity',
      '0',
      '0.0000',
      '-0.0000',
      '1',
      '-1',
      '1.5000',
      '-1.5000',
      '1000',
      '-1000',
      '9999',
      '10000',
      '0.001',
      '0.0001',
      '0.00001',
      '0.00001e-2',
      '99999999999999999999',
      '10000000000000000000',
      '0.49999',
      '-0.49999',
      '0.50000',
      '-0.50000',
      '1.23456',
      '-1.23456',
      '12.3400',
      '-12.3400',
      '999.995',
      '-999.995',
      '150.5',
      '-150.5',
      '1e-20',
      '-1e-20',
      '123456789012345678901234567890.1234000',
      '-123456789012345678901234567890.1234000',
      '1_000.50',
      '1.2e3',
      '-1.2e-3',
    ].map((value) => `'${value}'::numeric`)
  const pack = (precision: number, scale: number) =>
    precision * 65536 + (scale < 0 ? scale + 2048 : scale) + 4
  return [
    -2147483648,
    -1,
    0,
    1,
    3,
    4,
    5,
    2147483647,
    pack(1, 0),
    pack(2, 0),
    pack(3, 2),
    pack(5, 2),
    pack(5, 5),
    pack(2, -1),
    pack(2, -2),
    pack(3, -3),
    pack(3, 5),
    pack(1000, 1000),
    pack(1000, -1000),
    pack(1, 1023),
    pack(1, -1024),
  ].map((value) => `'${value}'::int4`)
}
type Sample = { sql: string; value: Input }

describe('Rust CHECK numeric precision and scale coercion', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-numeric-functions-'))
    await pg.exec(
      `CREATE TABLE numeric_function_checks (${Object.entries(columns)
        .map(([name, type]) => `"${name}" ${type}`)
        .join(',')},${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches PostgreSQL precision after rounding, negative scales, packed modifiers, NaN and infinity, binary output and lazy value states', async () => {
    expect(callables).toHaveLength(1)
    expect(sourceNames.size).toBe(callables.length)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'numeric_function_checks')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => {
          const plan = lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((check) => check.name === name)!
              : { name, type: 'check', definition: `CHECK (${expressions[name]})` },
            [],
            catalog.domains,
          )!
          expect(plan.expression.kind, name + '_' + form).not.toBe('uncertain')
          return {
            expression: plan.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + form,
            },
          }
        }),
      ),
    )
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        fixtureNames[index] + (check.kind === 'unsupported' ? ': ' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const record = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
    }
    let executions = 0
    const execute = async (type: string, sql: string) => {
      if (executions > 0 && executions % 500 === 0) {
        await pg.close()
        pg = await PGlite.create()
      }
      executions++
      return (
        await pg.query<{
          value: string | null
          result_scale: string | null
          result_wire: string | null
        }>(
          `SELECT (${sql})::text value, ${numeric(type) ? `scale(${sql})::text` : 'NULL::text'} result_scale, ${numeric(type) ? `encode(numeric_send(${sql}),'hex')` : 'NULL::text'} result_wire`,
        )
      ).rows[0]!
    }
    const samples: Record<string, Sample[]> = {}
    for (const type of new Set(callables.flatMap((fn) => fn.args))) {
      samples[type] = []
      for (const sql of [...sampleSql(type), `NULL::${type}`])
        samples[type]!.push({ sql, value: deserialize((await execute(type, sql)).value, type) })
    }
    const errorOne: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const errorTwo: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const fn of callables) {
      const args = fn.args.map((type, index) => argument(index, type))
      const alias = `operator_${fn.rustName}`
      const caseNames = [
        fn.rustName,
        ...(expressions[alias] ? [alias] : []),
        ...(numeric(fn.result) ? [`scale_${fn.rustName}`, `wire_${fn.rustName}`] : []),
      ]
      const evaluate = async (values: Sample[]) => {
        const row = defaults()
        args.forEach((name, index) => {
          row[name] = values[index]!.value
        })
        const query = `pg_catalog.${fn.name}(${values.map((value) => value.sql).join(',')})`
        let result: {
          value: string | null
          result_scale: string | null
          result_wire: string | null
        }
        try {
          result = await execute(fn.result, query)
        } catch (error) {
          const code = (error as { code?: string }).code
          expect(code).toBe('22003')
          for (const name of caseNames)
            record(name, row, { kind: 'Error', value: { state: parseInt(code!, 36) } })
          return
        }
        const expected = deserialize(result.value, fn.result)
        row[recorded(fn.result)] = expected
        row.result_scale = deserialize(result.result_scale, 'pg_catalog.int4')
        row.result_wire = input(result.result_wire)
        for (const name of caseNames)
          record(name, row, {
            kind:
              result.value === null || (name.startsWith('scale_') && result.result_scale === null)
                ? 'Null'
                : 'True',
          })
        if (expected.kind === 'Value') {
          row[recorded(fn.result)] = input(
            typeof expected.value === 'string'
              ? expected.value === 'NaN'
                ? '0'
                : 'NaN'
              : expected.value === 0
                ? 1
                : 0,
          )
          row.result_scale = input(result.result_scale === '0' ? 1 : 0)
          row.result_wire = input(result.result_wire === '' ? '00' : '')
          for (const name of caseNames)
            record(name, row, {
              kind: name.startsWith('scale_') && result.result_scale === null ? 'Null' : 'False',
            })
        }
      }
      expect(fn.args.length).toBeLessThanOrEqual(2)
      for (const first of samples[fn.args[0]!]!) {
        if (fn.args.length === 1) await evaluate([first])
        else for (const second of samples[fn.args[1]!]!) await evaluate([first, second])
      }
      for (const [value, modifier] of [
        ['999.995', 5 * 65536 + 2 + 4],
        ['999.994', 5 * 65536 + 2 + 4],
        ['-999.995', 5 * 65536 + 2 + 4],
        ['-999.994', 5 * 65536 + 2 + 4],
        ['995', 2 * 65536 + 2048 - 1 + 4],
        ['994', 2 * 65536 + 2048 - 1 + 4],
        ['0.000995', 2 * 65536 + 5 + 4],
        ['0.000994', 2 * 65536 + 5 + 4],
        ['1e131071', -1],
        ['1e-16383', -1],
        ['1e131071', 2147483647],
        ['1e-16383', 1 * 65536 + 1023 + 4],
      ] as const) {
        await evaluate([
          { sql: `'${value}'::numeric`, value: input(value) },
          { sql: `'${modifier}'::int4`, value: input(modifier) },
        ])
      }
      const skipped = defaults()
      skipped.skip = input(true)
      for (const name of args) skipped[name] = errorOne
      skipped[recorded(fn.result)] = errorTwo
      skipped.result_scale = errorTwo
      skipped.result_wire = errorTwo
      for (const name of caseNames) record(name, skipped, { kind: 'True' })
      const row = defaults()
      for (const [index, name] of args.entries()) {
        const known = row[name]!
        row[name] = input(null)
        for (const name of caseNames) record(name, row, { kind: 'Null' })
        row[name] = { kind: 'Unknown' }
        for (const name of caseNames) record(name, row, { kind: 'Unknown' })
        row[name] = errorOne
        for (const name of caseNames) record(name, row, { kind: 'Error', value: errorOne.value })
        if (index > 0) {
          row[args[0]!] = { kind: 'Unknown' }
          for (const name of caseNames) record(name, row, { kind: 'Error', value: errorOne.value })
          row[args[0]!] = errorTwo
          for (const name of caseNames) record(name, row, { kind: 'Error', value: errorTwo.value })
          row[args[0]!] = defaults()[args[0]!]!
        }
        row[name] = known
      }
    }
    await runCheckParity(directory, 'pgsid-check-numeric-functions', group, fixtureNames, fixtures)
  }, 600_000)
})
