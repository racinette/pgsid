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
  a: 'installed_bits',
  av: 'varbit',
  expected: 'bigint',
  small_expected: 'smallint',
  default_count: 'bigint',
  skip: 'boolean',
}
const counters = ['fixed', 'varying', 'direct', 'small']
const expressions: Record<string, string> = {
  fixed: 'bit_count(a) = expected',
  varying: 'bit_count(av) = expected',
  direct: 'pg_catalog.bit_count(a) = expected',
  small: 'bit_count(a) = small_expected',
  reuse: 'bit_count(a) + bit_count(a) = expected + expected',
  lazy: 'CASE WHEN skip THEN true ELSE bit_count(a) = expected END',
  selected: '(CASE WHEN skip THEN default_count ELSE bit_count(a) END) = expected',
  defaulted: 'COALESCE(default_count,bit_count(a)) = expected',
  empty: "bit_count(B'') = 0",
  partial: "bit_count(B'1') = 1",
  hexadecimal: "bit_count(X'ff') = 8",
}
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bit count', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bit-count-'))
    await pg.exec(`CREATE DOMAIN raw_bits AS pg_catalog."bit"; CREATE DOMAIN installed_bits AS raw_bits;
      CREATE TABLE bit_count_checks (${Object.entries(columns)
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
  it('matches set-bit counts, padding, bigint results, domains and partial inputs in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'bit_count_checks')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => ({
          expression: lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((item) => item.name === name)!
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
          'CREATE DOMAIN raw_bits AS pg_catalog."bit"; CREATE DOMAIN installed_bits AS raw_bits;',
        )
      }
      executions++
      const params = Object.keys(columns).map((name) =>
        row[name]?.kind === 'Value' ? String(row[name].value) : null,
      )
      return (
        await pg.query<Record<string, boolean | number | string | null>>(
          `SELECT ${sql} FROM ${candidate}`,
          params,
        )
      ).rows[0]!
    }
    const oracle = async (row: Row, selectedNames = names) => {
      const results = await execute(
        selectedNames.map((name) => `(${expressions[name]}) "${name}"`).join(','),
        row,
      )
      for (const name of selectedNames) {
        const value = results[name]
        record(name, row, { kind: value === null ? 'Null' : value ? 'True' : 'False' })
      }
    }
    const known: Row = {
      a: input('00101101'),
      av: input('00101101'),
      expected: input(4n),
      small_expected: input(4),
      default_count: input(null),
      skip: input(false),
    }
    const compare = async (bits: string) => {
      const row = { ...known, a: input(bits), av: input(bits) }
      const { value } = await execute('bit_count(a)::text value', row)
      expect(typeof value).toBe('string')
      const count = BigInt(value as string)
      await oracle(
        { ...row, expected: input(count), small_expected: input(Number(count)) },
        counters,
      )
      await oracle(
        { ...row, expected: input(count + 1n), small_expected: input(Number(count) + 1) },
        counters,
      )
    }
    await compare('')
    for (let width = 1; width <= 8; width++)
      for (let value = 0; value < 2 ** width; value++)
        await compare(value.toString(2).padStart(width, '0'))
    for (const bits of [
      '0'.repeat(65),
      '1'.repeat(65),
      '10'.repeat(32) + '1',
      '0'.repeat(64) + '1',
      '1'.repeat(128),
      '101001'.repeat(19),
    ])
      await compare(bits)
    for (const row of [
      known,
      { ...known, a: input(''), av: input(''), expected: input(0n), small_expected: input(0) },
      { ...known, a: input(null), av: input(null) },
      { ...known, expected: input(null), small_expected: input(null) },
      { ...known, skip: input(true), default_count: input(4n) },
      { ...known, skip: input(null) },
      { ...known, default_count: input(7n) },
    ])
      await oracle(row)
    for (const value of [-9223372036854775808n, 9223372036854775807n])
      await oracle(
        { ...known, expected: input(value) },
        counters.filter((name) => name !== 'small'),
      )
    for (const name of ['empty', 'partial', 'hexadecimal'])
      expect(fixtures.find((item) => item.name === name + '_raw')!.expected).toEqual({
        kind: 'True',
      })
    const unknown: Input = { kind: 'Unknown' }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    record('fixed', { ...known, a: unknown }, { kind: 'Unknown' })
    record('fixed', { ...known, a: error }, error as Outcome)
    record('fixed', { ...known, a: input('b101') }, { kind: 'Unknown' })
    record('fixed', { ...known, a: error, expected: other }, error as Outcome)
    for (const value of [unknown, input(null)])
      record('fixed', { ...known, a: value, expected: error }, error as Outcome)
    record('lazy', { ...known, a: error, skip: input(true) }, { kind: 'True' })
    record(
      'selected',
      { ...known, a: error, skip: input(true), default_count: input(4n) },
      { kind: 'True' },
    )
    record('defaulted', { ...known, a: error, default_count: input(4n) }, { kind: 'True' })
    record('defaulted', { ...known, a: error }, error as Outcome)
    record('defaulted', { ...known, a: error, default_count: unknown }, { kind: 'Unknown' })
    record('selected', { ...known, a: unknown, skip: input(false) }, { kind: 'Unknown' })
    for (const name of counters)
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((item) => item.name === name + '_raw' && item.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    await runCheckParity(directory, 'bitcountchecks', group, fixtureNames, fixtures)
  }, 180000)
})
