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
  ['temporal_support', 'temporal_comparison', 'temporal_arithmetic', 'temporal_precision'].flatMap(
    (name) =>
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
const input = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const wide = (type: string) =>
  ['pg_catalog.int8', 'pg_catalog."timestamp"', 'pg_catalog.timestamptz'].includes(type)
const timestamp = (type: string) =>
  ['pg_catalog."timestamp"', 'pg_catalog.timestamptz'].includes(type)
const defaults = (): Row =>
  Object.fromEntries(
    Object.entries(columns).map(([name, type]) => [
      name,
      input(type === 'boolean' || type === 'pg_catalog.bool' ? false : wide(type) ? 0n : 0),
    ]),
  )
const wire = (type: string, expression: string) =>
  type === 'pg_catalog.date'
    ? `encode(date_send(${expression}), 'hex')`
    : type === 'pg_catalog."timestamp"'
      ? `encode(timestamp_send(${expression}), 'hex')`
      : type === 'pg_catalog.timestamptz'
        ? `encode(timestamptz_send(${expression}), 'hex')`
        : `(${expression})::text`
const deserialize = (value: string | null, type: string): Input => {
  if (value === null) return input(null)
  const temporal = type === 'pg_catalog.date' || timestamp(type)
  const decimal = temporal
    ? BigInt.asIntN(type === 'pg_catalog.date' ? 32 : 64, BigInt('0x' + value)).toString()
    : value
  return input(
    type === 'pg_catalog.bool' ? value === 'true' : wide(type) ? BigInt(decimal) : Number(decimal),
  )
}
const sampleSql = (type: string): string[] => {
  if (type === 'pg_catalog.date')
    return [
      "'-infinity'::date",
      "'infinity'::date",
      ...[-2451545, -2451544, -1, 0, 1, 106751982, 106751983, 2145031948].map(
        (day) => `date '2000-01-01' + (${day})`,
      ),
    ]
  if (timestamp(type))
    return [
      '-infinity',
      'infinity',
      '4714-11-24 BC',
      '1999-12-31 23:59:59.499999',
      '1999-12-31 23:59:59.500000',
      '1999-12-31 23:59:59.999999',
      '2000-01-01 00:00:00',
      '2000-01-01 00:00:00.000001',
      '2000-01-01 00:00:00.499999',
      '2000-01-01 00:00:00.500000',
      '2000-01-01 00:00:00.999999',
      '294276-12-31 23:59:59.999999',
    ].map((value) => `'${value}'::${type}`)
  if (type === 'pg_catalog.int4')
    return [-2147483648, -8, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 2147483647].map(
      (value) => `(${value})::int4`,
    )
  if (type === 'pg_catalog.int8')
    return ['-9223372036854775808', '-1', '0', '1', '9223372036854775807'].map(
      (value) => `(${value})::int8`,
    )
  return ['true', 'false']
}
type Sample = { sql: string; value: Input }

describe('Rust CHECK temporal functions', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-temporal-functions-'))
    await pg.exec(
      `SET TimeZone='UTC'; CREATE TABLE temporal_function_checks (${Object.entries(columns)
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
  it('preserves catalog overloads, date ranges, infinities, precision, operator aliases and value states in raw and stored CHECKs', async () => {
    expect(callables).toHaveLength(40)
    expect(sourceNames.size).toBe(callables.length)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'temporal_function_checks')!
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
        await pg.exec("SET TimeZone='UTC'")
      }
      executions++
      return (await pg.query<{ value: string | null }>(`SELECT ${wire(type, sql)} value`)).rows[0]!
        .value
    }
    const samples: Record<string, Sample[]> = {}
    for (const type of new Set(callables.flatMap((fn) => fn.args))) {
      samples[type] = []
      for (const sql of [...sampleSql(type), `NULL::${type}`])
        samples[type]!.push({ sql, value: deserialize(await execute(type, sql), type) })
    }
    const errorOne: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const errorTwo: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const fn of callables) {
      const args = fn.args.map((type, index) => argument(index, type))
      const alias = `operator_${fn.rustName}`
      const caseNames = [fn.rustName, ...(expressions[alias] ? [alias] : [])]
      const evaluate = async (values: Sample[]) => {
        const row = defaults()
        args.forEach((name, index) => {
          row[name] = values[index]!.value
        })
        const query = `pg_catalog.${fn.name}(${values.map((value) => value.sql).join(',')})`
        let value: string | null
        try {
          value = await execute(fn.result, query)
        } catch (error) {
          const code = (error as { code?: string }).code
          expect(['22008', '22023']).toContain(code)
          for (const name of caseNames)
            record(name, row, { kind: 'Error', value: { state: parseInt(code!, 36) } })
          return
        }
        const expected = deserialize(value, fn.result)
        row[recorded(fn.result)] = expected
        const roundedPastInputRange =
          timestamp(fn.result) &&
          expected.kind === 'Value' &&
          typeof expected.value === 'bigint' &&
          expected.value >= 9223371331200000000n &&
          expected.value !== 9223372036854775807n
        if (!roundedPastInputRange)
          for (const name of caseNames)
            record(name, row, { kind: value === null ? 'Null' : 'True' })
        if (expected.kind === 'Value') {
          row[recorded(fn.result)] = input(
            typeof expected.value === 'boolean'
              ? !expected.value
              : typeof expected.value === 'bigint'
                ? expected.value === 0n
                  ? 1n
                  : 0n
                : expected.value === 0
                  ? 1
                  : 0,
          )
          for (const name of caseNames) record(name, row, { kind: 'False' })
        }
      }
      expect(fn.args.length).toBeLessThanOrEqual(2)
      for (const first of samples[fn.args[0]!]!) {
        if (fn.args.length === 1) await evaluate([first])
        else for (const second of samples[fn.args[1]!]!) await evaluate([first, second])
      }
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
    await runCheckParity(directory, 'pgsid-check-temporal-functions', group, fixtureNames, fixtures)
  }, 600_000)
})
