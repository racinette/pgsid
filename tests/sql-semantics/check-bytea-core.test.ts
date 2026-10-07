import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const columns: Record<string, string> = {
  a: 'stored_payload',
  b: 'stored_payload',
  comparison: 'integer',
  larger: 'bytea',
  smaller: 'bytea',
  reversed: 'bytea',
  sent: 'bytea',
  recorded_length: 'integer',
  recorded_bits: 'integer',
  recorded_count: 'bigint',
  skip: 'boolean',
}
const comparisons = ['compare', 'lt', 'le', 'gt', 'ge', 'larger', 'smaller']
const inspections = ['length', 'octets', 'bits', 'count', 'reverse', 'send']
const expressions: Record<string, string> = {
  compare: 'byteacmp(a,b) = comparison',
  lt: '(a < b) = (comparison < 0)',
  le: '(a <= b) = (comparison <= 0)',
  gt: '(a > b) = (comparison > 0)',
  ge: '(a >= b) = (comparison >= 0)',
  larger: 'bytea_larger(a,b) = larger',
  smaller: 'bytea_smaller(a,b) = smaller',
  length: 'length(a) = recorded_length',
  octets: 'octet_length(a) = recorded_length',
  bits: 'bit_length(a) = recorded_bits',
  count: 'bit_count(a) = recorded_count',
  reverse: 'reverse(a) = reversed',
  send: 'byteasend(a) = sent',
  reuse: 'reverse(reverse(a)) = a',
  lazy: 'CASE WHEN skip THEN true ELSE byteacmp(a,b) = comparison END',
  selected: '(CASE WHEN skip THEN sent ELSE reverse(a) END) = reversed',
  defaulted: 'COALESCE(sent,reverse(a)) = reversed',
  empty: "bit_count('\\x'::bytea) = 0 AND length('\\x'::bytea) = 0",
  unsigned: "byteacmp('\\xff'::bytea,'\\x00'::bytea) = 255",
  pairs: "reverse('\\x012345'::bytea) = '\\x452301'::bytea",
}
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bytea inspection and ordering', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bytea-core-'))
    await pg.exec(`CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;
      CREATE TABLE payload_checks (${Object.entries(columns)
        .map(([name, type]) => `${name} ${type}`)
        .join(',')},
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches byte order, prefixes, selection, lengths, every octet, domains and value states in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'payload_checks')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => ({
          expression: lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((check) => check.name === name)!
              : { name, type: 'check', definition: `CHECK (${expressions[name]})` },
            [],
            catalog.domains,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + form,
          },
        })),
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
    const candidate = `(SELECT ${Object.entries(columns)
      .map(([name, type], index) => `$${index + 1}::${type} ${name}`)
      .join(',')}) candidate`
    let executions = 0
    const execute = async (sql: string, row: Row) => {
      if (executions > 0 && executions % 500 === 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(
          'CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;',
        )
      }
      executions++
      return (
        await pg.query<Record<string, boolean | number | string | null>>(
          `SELECT ${sql} FROM ${candidate}`,
          Object.keys(columns).map((name) =>
            row[name]?.kind !== 'Value'
              ? null
              : columns[name] === 'bytea'
                ? Buffer.from(String(row[name].value), 'hex')
                : columns[name] === 'stored_payload'
                  ? '\\x' + String(row[name].value)
                  : typeof row[name].value === 'bigint'
                    ? String(row[name].value)
                    : row[name].value,
          ),
        )
      ).rows[0]!
    }
    const oracle = async (row: Row, selected = names) => {
      const results = await execute(
        selected.map((name) => `(${expressions[name]}) "${name}"`).join(','),
        row,
      )
      for (const name of selected) {
        const value = results[name]
        record(name, row, { kind: value === null ? 'Null' : value ? 'True' : 'False' })
      }
    }
    const base: Row = {
      a: input('0080ff'),
      b: input('008100'),
      comparison: input(-1),
      larger: input('008100'),
      smaller: input('0080ff'),
      reversed: input('ff8000'),
      sent: input('0080ff'),
      recorded_length: input(3),
      recorded_bits: input(24),
      recorded_count: input(9n),
      skip: input(false),
    }
    const measured = async (a: string, b: string): Promise<Row> => {
      const row: Row = { ...base, a: input(a), b: input(b) }
      const results = await execute(
        "byteacmp(a,b) comparison, encode(bytea_larger(a,b),'hex') larger, encode(bytea_smaller(a,b),'hex') smaller, encode(reverse(a),'hex') reversed, encode(byteasend(a),'hex') sent, length(a) recorded_length, bit_length(a) recorded_bits, bit_count(a)::text recorded_count",
        row,
      )
      for (const [name, value] of Object.entries(results)) {
        expect(value).not.toBeNull()
        row[name] = input(
          name === 'recorded_count' ? BigInt(value as string) : (value as string | number),
        )
      }
      return row
    }
    const values = ['', '00', '01', '7f', '80', '81', 'fe', 'ff', '0000', '0001', 'ff00', '00ff']
    for (const a of values) for (const b of values) await oracle(await measured(a, b), comparisons)
    for (let byte = 0; byte < 256; byte++)
      await oracle(await measured(byte.toString(16).padStart(2, '0'), ''), inspections)
    for (const [a, b] of [
      ['', ''],
      ['0080ff', '008100'],
      ['000102ff80', '000102ff'],
      ['ff'.repeat(64), '00'.repeat(64)],
    ]) {
      const row = await measured(a!, b!)
      await oracle(row)
      await oracle({
        ...row,
        comparison: input(17),
        larger: input('1234'),
        smaller: input('1234'),
        reversed: input('1234'),
        sent: input('1234'),
        recorded_length: input(7),
        recorded_bits: input(7),
        recorded_count: input(7n),
      })
    }
    for (const row of [
      { ...base, a: input(null) },
      { ...base, b: input(null) },
      {
        ...base,
        comparison: input(null),
        larger: input(null),
        smaller: input(null),
        reversed: input(null),
        sent: input(null),
        recorded_length: input(null),
        recorded_bits: input(null),
        recorded_count: input(null),
      },
      { ...base, skip: input(true) },
      { ...base, skip: input(null) },
    ])
      await oracle(row)
    const unknown: Input = { kind: 'Unknown' }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const name of [...comparisons, ...inspections]) {
      record(name, { ...base, a: unknown }, { kind: 'Unknown' })
      record(name, { ...base, a: error }, error as Outcome)
      record(name, { ...base, a: input('0') }, { kind: 'Unknown' })
      record(name, { ...base, a: input('gg') }, { kind: 'Unknown' })
    }
    for (const name of comparisons) {
      record(name, { ...base, a: error, b: other }, error as Outcome)
      for (const value of [unknown, input(null)])
        record(name, { ...base, a: value, b: error }, error as Outcome)
    }
    record('lazy', { ...base, a: error, skip: input(true) }, { kind: 'True' })
    record(
      'selected',
      { ...base, a: error, skip: input(true), sent: base.reversed! },
      { kind: 'True' },
    )
    record('defaulted', { ...base, a: error, sent: base.reversed! }, { kind: 'True' })
    record('defaulted', { ...base, a: error, sent: input(null) }, error as Outcome)
    record('defaulted', { ...base, a: error, sent: unknown }, { kind: 'Unknown' })
    for (const name of [...comparisons, ...inspections])
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
          ),
          name + ': ' + kind,
        ).toBe(true)
    for (const name of ['empty', 'unsigned', 'pairs'])
      expect(fixtures.find((fixture) => fixture.name === name + '_raw')!.expected).toEqual({
        kind: 'True',
      })
    await runCheckParity(directory, 'byteacorechecks', group, fixtureNames, fixtures)
  }, 180000)
})
