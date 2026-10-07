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
  b: 'varbit',
  position: 'integer',
  count: 'integer',
  small_position: 'smallint',
  small_count: 'smallint',
  expected: 'varbit',
  skip: 'boolean',
}
const transforms: Record<string, string> = {
  bounded: 'overlay(a PLACING b FROM position FOR count)',
  varying: 'overlay(av PLACING b FROM position FOR count)',
  direct: 'pg_catalog.overlay(a,b,position,count)',
  small: 'overlay(a PLACING b FROM small_position FOR small_count)',
  omitted: 'overlay(a PLACING b FROM position)',
  varying_omitted: 'overlay(av PLACING b FROM position)',
  direct_omitted: 'pg_catalog.overlay(a,b,position)',
  small_omitted: 'overlay(a PLACING b FROM small_position)',
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, sql]) => [name, `(${sql}) = expected`]),
  ),
  reuse: "overlay(a PLACING B'' FROM 1 FOR 0) = a",
  lazy: 'CASE WHEN skip THEN true ELSE overlay(a PLACING b FROM position FOR count) = expected END',
  selected:
    '(CASE WHEN skip THEN av ELSE overlay(a PLACING b FROM position FOR count) END) = expected',
  defaulted: 'COALESCE(av,overlay(a PLACING b FROM position FOR count)) = expected',
  negative: "overlay(B'10101010' PLACING B'11' FROM 3 FOR -1) = B'10110101010'",
  overflow: "overlay(B'' PLACING B'1' FROM 2147483647) = B''",
  lazy_constant: "CASE WHEN false THEN overlay(B'' PLACING B'1' FROM 0) = B'' ELSE true END",
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bit overlay', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-bit-overlay-'))
    await pg.exec(`CREATE DOMAIN raw_bits AS pg_catalog."bit";
      CREATE DOMAIN installed_bits AS raw_bits;
      CREATE TABLE bit_overlay_checks (${Object.entries(columns)
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
  it('matches replacement ranges, negative lengths, start validation, overflow and omitted lengths in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'bit_overlay_checks')!
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
        await pg.query<{ value: string | boolean | null }>(
          `SELECT (${sql}) value FROM ${candidate}`,
          params,
        )
      ).rows[0]!.value
    }
    const query = async (name: string, row: Row): Promise<Outcome> => {
      try {
        const value = await execute(expressions[name]!, row)
        return { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        const code = (error as { code?: string }).code!
        expect(['22011', '22003'], name + ': ' + String(error)).toContain(code)
        return { kind: 'Error', value: { state: parseInt(code, 36) } }
      }
    }
    const oracle = async (name: string, row: Row) => record(name, row, await query(name, row))
    const known: Row = {
      a: input('101010101'),
      av: input('101010101'),
      b: input('11'),
      position: input(2),
      count: input(3),
      small_position: input(2),
      small_count: input(3),
      expected: input('010'),
      skip: input(false),
    }
    const falseNames = new Set<string>()
    const transform = async (name: string, row: Row) => {
      try {
        const value = await execute(transforms[name]!, row)
        await oracle(name, { ...row, expected: input(value) })
        if (value !== null && !falseNames.has(name)) {
          await oracle(name, { ...row, expected: input(value + '0') })
          falseNames.add(name)
        }
      } catch (error) {
        if (!(error as { code?: string }).code) throw error
        await oracle(name, row)
      }
    }
    const patterns = ['', '0', '1', '01', '0010110', '10000001', '101010101', '1'.repeat(33)]
    for (const bits of patterns) {
      for (const replacement of ['', '0', '11', '101010101']) {
        const positions = new Set([
          -2147483648,
          -3,
          -1,
          0,
          1,
          2,
          7,
          8,
          bits.length,
          bits.length + 1,
          2147483647,
        ])
        for (const position of positions) {
          const row = {
            ...known,
            a: input(bits),
            av: input(bits),
            b: input(replacement),
            position: input(position),
            small_position: input(Math.max(-32768, Math.min(32767, position))),
          }
          for (const name of ['omitted', 'varying_omitted', 'direct_omitted', 'small_omitted'])
            await transform(name, row)
          for (const count of [-2147483648, -1, 0, 1, 3, 8, 2147483647]) {
            const bounded = {
              ...row,
              count: input(count),
              small_count: input(Math.max(-32768, Math.min(32767, count))),
            }
            for (const name of ['bounded', 'varying', 'direct', 'small'])
              await transform(name, bounded)
          }
        }
      }
    }
    for (const row of [
      known,
      { ...known, a: input(null), av: input(null) },
      { ...known, position: input(null), small_position: input(null) },
      { ...known, count: input(null), small_count: input(null) },
      { ...known, expected: input(null) },
      { ...known, b: input(null) },
    ])
      for (const name of names) await oracle(name, row)
    for (const skip of [true, false, null])
      for (const name of ['lazy', 'selected'])
        await oracle(name, { ...known, position: input(0), skip: input(skip) })
    await oracle('defaulted', { ...known, position: input(0), expected: input('101010101') })
    await oracle('defaulted', { ...known, position: input(0), av: input(null) })
    const unknown: Input = { kind: 'Unknown' }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const column of ['a', 'b', 'position', 'count']) {
      record('bounded', { ...known, [column]: unknown }, { kind: 'Unknown' })
      record('bounded', { ...known, [column]: error }, error as Outcome)
    }
    record(
      'bounded',
      { ...known, a: error, b: other, position: other, count: other },
      error as Outcome,
    )
    for (const value of [unknown, input(null)]) {
      record('bounded', { ...known, a: value, position: error, count: other }, error as Outcome)
      record('bounded', { ...known, position: value, count: error }, error as Outcome)
      record('bounded', { ...known, a: value, b: error, position: other }, error as Outcome)
      record('bounded', { ...known, b: value, position: error }, error as Outcome)
      record('bounded', { ...known, a: value, b: input(null), count: unknown }, { kind: 'Unknown' })
    }
    for (const column of ['a', 'b', 'position']) {
      record('omitted', { ...known, [column]: unknown }, { kind: 'Unknown' })
      record('omitted', { ...known, [column]: error }, error as Outcome)
    }
    record('bounded', { ...known, a: input('b101') }, { kind: 'Unknown' })
    record('omitted', { ...known, count: error, expected: input('111010101') }, { kind: 'True' })
    record('lazy', { ...known, a: error, skip: input(true) }, { kind: 'True' })
    record('defaulted', { ...known, a: error, expected: input('101010101') }, { kind: 'True' })
    for (const name of Object.keys(transforms))
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    for (const name of ['bounded', 'varying', 'direct', 'small'])
      expect(
        fixtures.some(
          (f) =>
            f.name === name + '_raw' &&
            f.expected.kind === 'Error' &&
            f.expected.value.state === parseInt('22011', 36),
        ),
        name,
      ).toBe(true)
    expect(
      await query('bounded', {
        ...known,
        a: input(''),
        position: input(0),
        count: input(2147483647),
      }),
    ).toEqual({ kind: 'Error', value: { state: parseInt('22011', 36) } })
    expect(
      await query('bounded', {
        ...known,
        a: input(''),
        position: input(2147483647),
        count: input(1),
      }),
    ).toEqual({ kind: 'Error', value: { state: parseInt('22003', 36) } })
    await runCheckParity(directory, 'bitoverlaychecks', group, fixtureNames, fixtures)
  }, 300000)
})
