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
  position: 'integer',
  count: 'integer',
  small_position: 'smallint',
  small_count: 'smallint',
  expected: 'bytea',
  expected_position: 'integer',
  backup: 'bytea',
  skip: 'boolean',
}
const transforms: Record<string, { sql: string; binary?: boolean }> = {
  concatenate: { sql: 'a || b', binary: true },
  direct_concatenate: { sql: 'byteacat(a,b)', binary: true },
  substring: { sql: 'substring(a FROM position FOR count)', binary: true },
  direct_substring: { sql: 'pg_catalog.substring(a,position,count)', binary: true },
  substr: { sql: 'substr(a,position,count)', binary: true },
  small_substring: { sql: 'pg_catalog.substring(a,small_position,small_count)', binary: true },
  suffix: { sql: 'substring(a FROM position)', binary: true },
  substr_suffix: { sql: 'substr(a,position)', binary: true },
  overlay: { sql: 'overlay(a PLACING b FROM position FOR count)', binary: true },
  direct_overlay: { sql: 'pg_catalog.overlay(a,b,position,count)', binary: true },
  default_overlay: { sql: 'overlay(a PLACING b FROM position)', binary: true },
  direct_default_overlay: { sql: 'pg_catalog.overlay(a,b,position)', binary: true },
  small_overlay: { sql: 'pg_catalog.overlay(a,b,small_position,small_count)', binary: true },
  position: { sql: 'position(b IN a)' },
  direct_position: { sql: 'pg_catalog.position(a,b)' },
  btrim: { sql: 'btrim(a,b)', binary: true },
  ltrim: { sql: 'ltrim(a,b)', binary: true },
  rtrim: { sql: 'rtrim(a,b)', binary: true },
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, operation]) => [
      name,
      `(${operation.sql}) = ${operation.binary ? 'expected' : 'expected_position'}`,
    ]),
  ),
  concatenate_length: 'length(a || b) = length(a) + length(b)',
  associative: '(a || (a || b)) = ((a || a) || b)',
  suffix_reuses_input: 'substring(a FROM 1) = a',
  self_search: 'position(a IN a) = 1',
  lazy: 'CASE WHEN skip THEN true ELSE substring(a FROM position FOR count) = expected END',
  selected:
    '(CASE WHEN skip THEN backup ELSE overlay(a PLACING b FROM position FOR count) END) = expected',
  defaulted: 'COALESCE(backup,substring(a FROM position FOR count)) = expected',
  empty_search: "position('\\x'::bytea IN '\\x'::bytea) = 1",
  aligned_search: "position('\\xf0'::bytea IN '\\x0f00'::bytea) = 0",
  matched_search: "position('\\x00ff'::bytea IN '\\x0100ff'::bytea) = 2",
  zero_start: "substring('\\x0080ff'::bytea FROM 0 FOR 2) = '\\x00'::bytea",
  trim_bytes: "btrim('\\x0f0fff0f'::bytea,'\\x0f'::bytea) = '\\xff'::bytea",
  trim_set: "btrim('\\x00ffff0100ff'::bytea,'\\xff00'::bytea) = '\\x01'::bytea",
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bytea manipulation', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bytea-ranges-'))
    await pg.exec(`CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;
      CREATE TABLE bytea_ranges_checks (${Object.entries(columns)
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
  it('matches byte ranges, overlays, search alignment, trimming, concatenation and lazy errors in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'bytea_ranges_checks')!
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
        await pg.query<{ value: string | number | boolean | null }>(
          `SELECT (${sql}) value FROM ${candidate}`,
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
      ).rows[0]!.value
    }
    const query = async (sql: string, row: Row): Promise<Outcome> => {
      try {
        const value = await execute(sql, row)
        return { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        const code = (error as { code: string }).code
        expect(['22011', '22003'], sql + ': ' + String(error)).toContain(code)
        return { kind: 'Error', value: { state: parseInt(code, 36) } }
      }
    }
    const oracle = async (name: string, row: Row) =>
      record(name, row, await query(expressions[name]!, row))
    const known: Row = {
      a: input('0080ff0100ff'),
      b: input('ff00'),
      position: input(2),
      count: input(3),
      small_position: input(2),
      small_count: input(3),
      expected: input('80ff01'),
      expected_position: input(0),
      backup: input('80ff01'),
      skip: input(false),
    }
    const falseNames = new Set<string>()
    const transform = async (name: string, row: Row) => {
      const operation = transforms[name]!
      try {
        const value = await execute(
          operation.binary ? `encode(${operation.sql},'hex')` : operation.sql,
          row,
        )
        const column = operation.binary ? 'expected' : 'expected_position'
        await oracle(name, { ...row, [column]: input(value as string | number | null) })
        if (value !== null && !falseNames.has(name)) {
          await oracle(name, { ...row, [column]: input(operation.binary ? value + '00' : 17) })
          falseNames.add(name)
        }
      } catch (error) {
        if (!(error as { code?: string }).code) throw error
        await oracle(name, row)
      }
    }
    const pairs = [
      '',
      '00',
      '0f',
      'f0',
      'ff',
      '0080ff',
      '000000',
      'ff00ff',
      '0123456789abcdef',
      '0f0fff0f',
      '00'.repeat(33),
    ]
    const pairNames = [
      'concatenate',
      'direct_concatenate',
      'position',
      'direct_position',
      'btrim',
      'ltrim',
      'rtrim',
    ]
    for (const a of pairs)
      for (const b of pairs) {
        const row = { ...known, a: input(a), b: input(b) }
        for (const name of pairNames) await transform(name, row)
        for (const name of [
          'concatenate_length',
          'associative',
          'suffix_reuses_input',
          'self_search',
        ])
          await oracle(name, row)
      }
    const rangeNames = [
      'substring',
      'direct_substring',
      'substr',
      'small_substring',
      'overlay',
      'direct_overlay',
      'small_overlay',
    ]
    for (const a of ['', '00', '0080ff0100ff', '0123456789abcdef']) {
      for (const position of [-2147483648, -2, 0, 1, 2, 5, 8, 2147483647]) {
        const row = {
          ...known,
          a: input(a),
          position: input(position),
          small_position: input(Math.max(-32768, Math.min(32767, position))),
        }
        for (const name of ['suffix', 'substr_suffix', 'default_overlay', 'direct_default_overlay'])
          await transform(name, row)
        for (const count of [-2147483648, -1, 0, 1, 3, 2147483647]) {
          const ranged = {
            ...row,
            count: input(count),
            small_count: input(Math.max(-32768, Math.min(32767, count))),
          }
          for (const name of rangeNames) await transform(name, ranged)
        }
      }
    }
    for (const a of pairs)
      for (const b of ['', '00', 'ff', '0080ff']) {
        const row = { ...known, a: input(a), b: input(b) }
        for (const name of ['default_overlay', 'direct_default_overlay', 'overlay'])
          await transform(name, row)
      }
    for (const row of [
      known,
      { ...known, a: input(null) },
      { ...known, b: input(null) },
      { ...known, position: input(null), small_position: input(null) },
      { ...known, count: input(null), small_count: input(null) },
      { ...known, expected: input(null), expected_position: input(null) },
    ])
      for (const name of names) await oracle(name, row)
    for (const skip of [true, false, null])
      for (const name of ['lazy', 'selected'])
        await oracle(name, { ...known, count: input(-1), position: input(-1), skip: input(skip) })
    await oracle('defaulted', { ...known, count: input(-1) })
    await oracle('defaulted', { ...known, count: input(-1), backup: input(null) })
    const unknown: Input = { kind: 'Unknown' }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const name of Object.keys(transforms)) {
      record(name, { ...known, a: unknown }, { kind: 'Unknown' })
      record(name, { ...known, a: error }, error as Outcome)
      record(name, { ...known, a: input('g0') }, { kind: 'Unknown' })
    }
    for (const name of pairNames) {
      record(name, { ...known, a: error, b: other }, error as Outcome)
      for (const value of [unknown, input(null)])
        record(name, { ...known, a: value, b: error }, error as Outcome)
    }
    for (const name of ['substring', 'overlay']) {
      record(name, { ...known, a: error, position: other, count: other }, error as Outcome)
      record(name, { ...known, position: error, count: other }, error as Outcome)
      record(name, { ...known, position: unknown, count: other }, other as Outcome)
      record(name, { ...known, count: unknown }, { kind: 'Unknown' })
    }
    record('overlay', { ...known, b: error, position: other }, error as Outcome)
    record('lazy', { ...known, a: error, skip: input(true) }, { kind: 'True' })
    record('selected', { ...known, a: error, skip: input(true) }, { kind: 'True' })
    record('defaulted', { ...known, a: error }, { kind: 'True' })
    for (const name of Object.keys(transforms))
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    expect(
      await query(expressions.substring!, {
        ...known,
        position: input(2147483647),
        count: input(-1),
      }),
    ).toEqual({ kind: 'Error', value: { state: parseInt('22011', 36) } })
    expect(
      await query(expressions.overlay!, { ...known, position: input(0), count: input(2147483647) }),
    ).toEqual({ kind: 'Error', value: { state: parseInt('22011', 36) } })
    expect(
      await query(expressions.overlay!, { ...known, position: input(2147483647), count: input(1) }),
    ).toEqual({ kind: 'Error', value: { state: parseInt('22003', 36) } })
    await runCheckParity(directory, 'bytearangeschecks', group, fixtureNames, fixtures)
  }, 180000)
})
