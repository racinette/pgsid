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
  b: 'installed_bits',
  av: 'varbit',
  bv: 'varbit',
  expected: 'integer',
  default_position: 'integer',
  skip: 'boolean',
}
const searches: Record<string, string> = {
  fixed: 'position(b IN a)',
  varying: 'position(bv IN av)',
  mixed: 'position(bv IN a)',
  fixed_pattern: 'position(b IN av)',
  direct: 'pg_catalog.position(a,b)',
  direct_varying: 'pg_catalog.position(av,bv)',
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(searches).map(([name, sql]) => [name, `(${sql}) = expected`]),
  ),
  reuse: 'position(a IN a) = CASE WHEN length(a) = 0 THEN 0 ELSE 1 END',
  lazy: 'CASE WHEN skip THEN true ELSE position(b IN a) = expected END',
  selected: '(CASE WHEN skip THEN default_position ELSE position(b IN a) END) = expected',
  defaulted: 'COALESCE(default_position,position(b IN a)) = expected',
  empty: "position(B'' IN B'') = 0",
  empty_pattern: "position(B'' IN B'101') = 1",
  reversed: "pg_catalog.position(B'00101',B'101') = 3",
  partial: "position(B'01' IN B'0') = 0",
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bit position', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bit-position-'))
    await pg.exec(`CREATE DOMAIN raw_bits AS pg_catalog."bit"; CREATE DOMAIN installed_bits AS raw_bits;
      CREATE TABLE bit_position_checks (${Object.entries(columns)
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
  it('matches first occurrences, empty values, bit boundaries, domains and partial inputs in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'bit_position_checks')!
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
        row[name]?.kind === 'Value' ? row[name].value : null,
      )
      return (
        await pg.query<Record<string, boolean | number | null>>(
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
      a: input('001011010'),
      b: input('101'),
      av: input('001011010'),
      bv: input('101'),
      expected: input(3),
      default_position: input(null),
      skip: input(false),
    }
    const compare = async (haystack: string, needle: string) => {
      const row = {
        ...known,
        a: input(haystack),
        av: input(haystack),
        b: input(needle),
        bv: input(needle),
      }
      const { value } = await execute('position(b IN a) value', row)
      expect(typeof value).toBe('number')
      await oracle({ ...row, expected: input(value!) }, Object.keys(searches))
      await oracle({ ...row, expected: input((value as number) + 1) }, Object.keys(searches))
    }
    const patterns = ['']
    for (let width = 1; width <= 3; width++)
      for (let value = 0; value < 2 ** width; value++)
        patterns.push(value.toString(2).padStart(width, '0'))
    for (const haystack of patterns) for (const needle of patterns) await compare(haystack, needle)
    for (let offset = 0; offset < 17; offset++) {
      const haystack = '0'.repeat(offset) + '101100101' + '000'
      await compare(haystack, '101100101')
      await compare(haystack, '1011001010000')
    }
    for (const [haystack, needle] of [
      ['101010101', '10101'],
      ['000000001', '00000001'],
      ['001011010', '10'],
      ['10000000', '000000001'],
      ['1'.repeat(33), '1'.repeat(17)],
      ['1'.repeat(65) + '0', '1'.repeat(32) + '0'],
    ])
      await compare(haystack!, needle!)
    for (const row of [
      known,
      { ...known, a: input(''), av: input(''), b: input(''), bv: input(''), expected: input(0) },
      { ...known, a: input(null), av: input(null) },
      { ...known, b: input(null), bv: input(null) },
      { ...known, expected: input(null) },
      { ...known, skip: input(true), default_position: input(3) },
      { ...known, skip: input(null) },
      { ...known, default_position: input(7) },
    ])
      await oracle(row)
    for (const name of ['empty', 'empty_pattern', 'reversed', 'partial'])
      expect(fixtures.find((item) => item.name === name + '_raw')!.expected).toEqual({
        kind: 'True',
      })
    const unknown: Input = { kind: 'Unknown' }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const column of ['a', 'b']) {
      record('fixed', { ...known, [column]: unknown }, { kind: 'Unknown' })
      record('fixed', { ...known, [column]: error }, error as Outcome)
      record('fixed', { ...known, [column]: input('b101') }, { kind: 'Unknown' })
    }
    record('fixed', { ...known, a: error, b: other }, error as Outcome)
    for (const value of [unknown, input(null)]) {
      record('fixed', { ...known, a: value, b: error }, error as Outcome)
      record('fixed', { ...known, a: value, b: unknown }, { kind: 'Unknown' })
    }
    record('lazy', { ...known, a: error, b: other, skip: input(true) }, { kind: 'True' })
    record(
      'selected',
      { ...known, a: error, skip: input(true), default_position: input(3) },
      { kind: 'True' },
    )
    record('defaulted', { ...known, a: error, default_position: input(3) }, { kind: 'True' })
    record('defaulted', { ...known, a: error }, error as Outcome)
    record('defaulted', { ...known, a: error, default_position: unknown }, { kind: 'Unknown' })
    record('selected', { ...known, a: unknown, skip: input(false) }, { kind: 'Unknown' })
    for (const name of Object.keys(searches))
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((item) => item.name === name + '_raw' && item.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    await runCheckParity(directory, 'bitpositionchecks', group, fixtureNames, fixtures)
  }, 180000)
})
