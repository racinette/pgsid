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
  [
    'integer_support',
    'integer_hash',
    'integer_bitwise',
    'integer_range',
    'integer_format',
    'integer_metadata',
  ].flatMap((name) =>
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
const input = (value: number | bigint | boolean | string | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const samples = (type: string): (number | bigint | boolean)[] => {
  if (type === 'pg_catalog.bool') return [false, true]
  if (type === 'pg_catalog.int2') return [-32768, -1024, -7, -1, 0, 1, 7, 31, 64, 32767]
  if (type === 'pg_catalog.int4') return [-2147483648, -65536, -7, -1, 0, 1, 7, 31, 64, 2147483647]
  return [-9223372036854775808n, -4294967296n, -7n, -1n, 0n, 1n, 7n, 31n, 64n, 9223372036854775807n]
}
const defaults = (): Row =>
  Object.fromEntries(
    Object.entries(columns).map(([name, type]) => [
      name,
      input(
        type === 'boolean' || type === 'pg_catalog.bool'
          ? false
          : type === 'pg_catalog.int8'
            ? 0n
            : type === 'pg_catalog.text'
              ? ''
              : 0,
      ),
    ]),
  )
const deserialize = (value: string, type: string): Input =>
  input(
    type === 'pg_catalog.bool'
      ? value === 'true'
      : type === 'pg_catalog.int8'
        ? BigInt(value)
        : type === 'pg_catalog.text'
          ? value
          : Number(value),
  )

describe('Rust CHECK integer and Boolean functions', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-integer-functions-'))
    await pg.exec(
      `CREATE TABLE integer_function_checks (${Object.entries(columns)
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
  it('preserves catalog overloads, operator aliases, integer boundaries, NULL, partial inputs and SQL errors in raw and stored CHECKs', async () => {
    expect(callables).toHaveLength(74)
    expect(sourceNames.size).toBe(callables.length)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'integer_function_checks')!
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
    const execute = async (sql: string, values: Input[]) => {
      if (executions > 0 && executions % 500 === 0) {
        await pg.close()
        pg = await PGlite.create()
      }
      executions++
      return (
        await pg.query<{ value: string | null }>(
          `SELECT (${sql})::text value`,
          values.map((value) => (value.kind === 'Value' ? String(value.value) : null)),
        )
      ).rows[0]!.value
    }
    const errorOne: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const errorTwo: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const fn of callables) {
      const args = fn.args.map((type, index) => argument(index, type))
      const alias = `operator_${fn.rustName}`
      const caseNames = [fn.rustName, ...(expressions[alias] ? [alias] : [])]
      const query = `pg_catalog.${fn.name}(${fn.args.map((type, index) => `$${index + 1}::${type}`).join(',')})`
      const evaluate = async (values: Input[]) => {
        const row = defaults()
        args.forEach((name, index) => {
          row[name] = values[index]!
        })
        try {
          const value = await execute(query, values)
          row[recorded(fn.result)] = value === null ? input(null) : deserialize(value, fn.result)
          for (const name of caseNames)
            record(name, row, { kind: value === null ? 'Null' : 'True' })
          if (value !== null) {
            const expected = row[recorded(fn.result)]!
            if (expected.kind === 'Value') {
              row[recorded(fn.result)] = input(
                typeof expected.value === 'boolean'
                  ? !expected.value
                  : typeof expected.value === 'string'
                    ? expected.value + '!'
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
        } catch (error) {
          const code = (error as { code?: string }).code
          expect(['22003', '22012', '22013']).toContain(code)
          for (const name of caseNames)
            record(name, row, { kind: 'Error', value: { state: parseInt(code!, 36) } })
        }
      }
      if (fn.args.length <= 2) {
        for (const first of samples(fn.args[0]!)) {
          if (fn.args.length === 1) await evaluate([input(first)])
          else
            for (const second of samples(fn.args[1]!)) await evaluate([input(first), input(second)])
        }
        if (fn.name.includes('shl') || fn.name.includes('shr'))
          for (const first of samples(fn.args[0]!))
            for (const shift of [
              -65, -64, -63, -33, -32, -31, -16, -15, 15, 16, 32, 63, 65, 127, 128,
            ])
              await evaluate([input(first), input(shift)])
      } else {
        expect(fn.name).toBe('in_range')
        const ranges = fn.args.slice(0, 3).map((type) => {
          const values = samples(type)
          return [values[0]!, values[3]!, values[4]!, values[5]!, values.at(-1)!]
        })
        for (const first of ranges[0]!)
          for (const second of ranges[1]!)
            for (const offset of ranges[2]!)
              for (const subtract of [false, true])
                for (const less of [false, true])
                  await evaluate([
                    input(first),
                    input(second),
                    input(offset),
                    input(subtract),
                    input(less),
                  ])
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
    await runCheckParity(directory, 'pgsid-check-integer-functions', group, fixtureNames, fixtures)
  }, 600_000)
})
