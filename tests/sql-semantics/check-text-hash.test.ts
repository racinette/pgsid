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
  ['text_hash', 'text_index_compare'].flatMap((name) =>
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
const textual = (type: string) => ['pg_catalog.text', 'pg_catalog.bpchar'].includes(type)
const columns: Record<string, string> = { skip: 'boolean' }
const expressions: Record<string, string> = {}
for (const fn of callables) {
  fn.args.forEach((type, index) => {
    columns[argument(index, type)] = type
  })
  columns[recorded(fn.result)] = fn.result
  expressions[fn.rustName] =
    `pg_catalog.${fn.name}(${fn.args.map((type, index) => argument(index, type)).join(',')}) = ${recorded(fn.result)}`
  if (textual(fn.result)) {
    columns.result_octets = 'integer'
    expressions[`octets_${fn.rustName}`] =
      `pg_catalog.octet_length(pg_catalog.${fn.name}(${fn.args.map((type, index) => argument(index, type)).join(',')})) = result_octets`
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
const defaults = (): Row =>
  Object.fromEntries(
    Object.entries(columns).map(([name, type]) => [
      name,
      input(
        type === 'boolean' || type === 'pg_catalog.bool'
          ? false
          : textual(type)
            ? ''
            : type === 'pg_catalog.int8'
              ? 0n
              : 0,
      ),
    ]),
  )
const deserialize = (value: string | null, type: string): Input =>
  value === null
    ? input(null)
    : input(
        textual(type)
          ? value
          : type === 'pg_catalog.bool'
            ? value === 'true'
            : type === 'pg_catalog.int8'
              ? BigInt(value)
              : Number(value),
      )
const sampleSql = (type: string): string[] => {
  if (type === 'pg_catalog.int8')
    return [
      '-9223372036854775808',
      '-4294967296',
      '-2147483649',
      '-1',
      '0',
      '1',
      '2147483647',
      '4294967295',
      '4294967296',
      '9223372036854775807',
    ].map((value) => `'${value}'::bigint`)
  const values = [
    '',
    ' ',
    '   ',
    'a',
    'a ',
    'a  ',
    'ab',
    'abc',
    'A',
    'z',
    'é',
    'ê',
    'αβ',
    '😊',
    '🙃',
    'é😊 ',
    'é',
    '\t a\n',
    '😊a😊',
    'aaabaaa',
    'aBC DEF 123ABC',
    'élÈVE STRAẞE İß Σσς',
    'aÉb😊c d_e-f.g',
    'hello123WORLD 12ABc',
    'ǅİıſKﬀ',
    ...Array.from({ length: 32 }, (_, index) => 'x'.repeat(index)),
    'é'.repeat(13),
    '😊'.repeat(8),
  ]
  return values.map((value) => `'${value.replaceAll("'", "''")}'::${type} COLLATE "C"`)
}
type Sample = { sql: string; value: Input }

describe('Rust CHECK text hashes and binary index comparisons', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-text-functions-'))
    await pg.exec(
      `CREATE TABLE text_function_checks (${Object.entries(columns)
        .map(([name, type]) => `"${name}" ${type}${textual(type) ? ' COLLATE "C"' : ''}`)
        .join(',')},${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches PostgreSQL UTF8 hashes, trailing blank removal, every seed bit, binary comparisons and partial inputs in raw and stored CHECKs', async () => {
    expect(callables).toHaveLength(6)
    expect(sourceNames.size).toBe(callables.length)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'text_function_checks')!
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
        await pg.query<{ value: string | null; result_octets: string | null }>(
          `SELECT (${sql})${textual(type) ? '' : '::text'} value, ${textual(type) ? `octet_length(${sql})::text` : 'NULL::text'} result_octets`,
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
        ...(textual(fn.result) ? [`octets_${fn.rustName}`] : []),
      ]
      const evaluate = async (values: Sample[]) => {
        const row = defaults()
        args.forEach((name, index) => {
          row[name] = values[index]!.value
        })
        const query = `pg_catalog.${fn.name}(${values.map((value) => value.sql).join(',')})`
        let result: { value: string | null; result_octets: string | null }
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
        row.result_octets = deserialize(result.result_octets, 'pg_catalog.int4')
        for (const name of caseNames)
          record(name, row, {
            kind:
              result.value === null || (name.startsWith('octets_') && result.result_octets === null)
                ? 'Null'
                : 'True',
          })
        if (expected.kind === 'Value') {
          row[recorded(fn.result)] = input(
            typeof expected.value === 'string'
              ? expected.value + '!'
              : typeof expected.value === 'boolean'
                ? !expected.value
                : typeof expected.value === 'bigint'
                  ? expected.value === 0n
                    ? 1n
                    : 0n
                  : expected.value === 0
                    ? 1
                    : 0,
          )
          row.result_octets = input(result.result_octets === '0' ? 1 : 0)
          for (const name of caseNames)
            record(name, row, {
              kind: name.startsWith('octets_') && result.result_octets === null ? 'Null' : 'False',
            })
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
      const skipped = defaults()
      skipped.skip = input(true)
      for (const name of args) skipped[name] = errorOne
      skipped[recorded(fn.result)] = errorTwo
      skipped.result_octets = errorTwo
      for (const name of caseNames) record(name, skipped, { kind: 'True' })
    }
    await runCheckParity(directory, 'pgsid-check-text-functions', group, fixtureNames, fixtures)
  }, 600_000)
})
