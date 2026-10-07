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
  b: 'pg_catalog."bit"',
  av: 'varbit',
  bv: 'varbit',
  position: 'integer',
  replacement: 'integer',
  small_position: 'smallint',
  small_replacement: 'smallint',
  expected: 'varbit',
  expected_bit: 'integer',
  skip: 'boolean',
}
const transforms: Record<string, { sql: string; expected: string }> = {
  concatenate: { sql: 'a || b', expected: 'expected' },
  varying_concatenate: { sql: 'av || bv', expected: 'expected' },
  mixed_concatenate: { sql: 'a || bv', expected: 'expected' },
  reverse_mixed: { sql: 'av || b', expected: 'expected' },
  direct_concatenate: { sql: 'bitcat(a,b)', expected: 'expected' },
  direct_varying: { sql: 'bitcat(av,bv)', expected: 'expected' },
  get: { sql: 'get_bit(a,position)', expected: 'expected_bit' },
  varying_get: { sql: 'get_bit(av,position)', expected: 'expected_bit' },
  small_get: { sql: 'get_bit(a,small_position)', expected: 'expected_bit' },
  set: { sql: 'set_bit(a,position,replacement)', expected: 'expected' },
  varying_set: { sql: 'set_bit(av,position,replacement)', expected: 'expected' },
  small_set: { sql: 'set_bit(a,small_position,small_replacement)', expected: 'expected' },
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, { sql, expected }]) => [name, `(${sql}) = ${expected}`]),
  ),
  concatenate_length: 'bit_length(a || bv) = bit_length(a) + bit_length(bv)',
  associative: '(a || (b || av)) = ((a || b) || av)',
  reuse_input: 'set_bit(a,position,get_bit(a,position)) = a',
  set_get: 'get_bit(set_bit(a,position,replacement),position) = replacement',
  lazy: 'CASE WHEN skip THEN true ELSE get_bit(a,position) = expected_bit END',
  scalar_case: '(CASE WHEN skip THEN av ELSE set_bit(a,position,replacement) END) = expected',
  coalesce: 'COALESCE(av,set_bit(a,position,replacement)) = expected',
  empty_concatenate: "(B'' || X'F') = B'1111'",
  left_index: "get_bit(B'10000000',0) = 1",
  right_index: "get_bit(B'10000000',7) = 0",
  partial_byte: "set_bit(B'101010101',8,0) = B'101010100'",
  lazy_constant: "CASE WHEN false THEN get_bit(B'',0) = 1 ELSE true END",
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bit concatenation and editing', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-bit-edit-'))
    await pg.exec(`CREATE DOMAIN raw_bits AS pg_catalog."bit";
      CREATE DOMAIN installed_bits AS raw_bits;
      CREATE TABLE bit_edit_checks (${Object.entries(columns)
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
  it('matches left-to-right indices, exact concatenation, edits, error order, NULLs and lazy branches in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'bit_edit_checks')!
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
    const params = (row: Row) =>
      Object.keys(columns).map((name) => (row[name]?.kind === 'Value' ? row[name].value : null))
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
      return (
        await pg.query<{ value: string | number | boolean | null }>(
          `SELECT (${sql}) value FROM ${candidate}`,
          params(row),
        )
      ).rows[0]!.value
    }
    const query = async (sql: string, row: Row): Promise<Outcome> => {
      try {
        const value = await execute(sql, row)
        return { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        const code = (error as { code: string }).code
        expect(['2202E', '22023'], sql + ': ' + String(error)).toContain(code)
        return { kind: 'Error', value: { state: parseInt(code, 36) } }
      }
    }
    const oracle = async (name: string, row: Row) =>
      record(name, row, await query(expressions[name]!, row))
    const known: Row = {
      a: input('101'),
      b: input('0011'),
      av: input('101'),
      bv: input('0011'),
      position: input(0),
      replacement: input(0),
      small_position: input(0),
      small_replacement: input(0),
      expected: input('001'),
      expected_bit: input(1),
      skip: input(false),
    }
    const falseNames = new Set<string>()
    const transform = async (name: string, row: Row) => {
      const { sql, expected } = transforms[name]!
      try {
        const value = await execute(sql, row)
        await oracle(name, { ...row, [expected]: input(value) })
        if (value !== null && !falseNames.has(name)) {
          await oracle(name, {
            ...row,
            [expected]: input(expected === 'expected' ? value + '0' : value === 0 ? 1 : 0),
          })
          falseNames.add(name)
        }
      } catch (error) {
        if (!(error as { code?: string }).code) throw error
        await oracle(name, row)
      }
    }
    const patterns = [
      '',
      '0',
      '1',
      '01',
      '101',
      '0010110',
      '10000001',
      '101010101',
      '0'.repeat(17),
      '1'.repeat(33),
    ]
    const concatNames = Object.keys(transforms).filter(
      (name) =>
        name.includes('concatenate') || name === 'reverse_mixed' || name === 'direct_varying',
    )
    for (const a of patterns)
      for (const b of patterns) {
        const row = { ...known, a: input(a), av: input(a), b: input(b), bv: input(b) }
        for (const name of concatNames) await transform(name, row)
        for (const name of ['concatenate_length', 'associative']) await oracle(name, row)
      }
    for (const bits of patterns) {
      const positions = new Set([
        -2147483648,
        -1,
        0,
        1,
        2,
        7,
        8,
        bits.length - 1,
        bits.length,
        2147483647,
      ])
      for (const position of positions) {
        const row = {
          ...known,
          a: input(bits),
          av: input(bits),
          position: input(position),
          small_position: input(Math.max(-32768, Math.min(32767, position))),
        }
        for (const name of ['get', 'varying_get', 'small_get']) await transform(name, row)
        await oracle('reuse_input', row)
        for (const replacement of [-1, 0, 1, 2]) {
          const patched = {
            ...row,
            replacement: input(replacement),
            small_replacement: input(replacement),
          }
          for (const name of ['set', 'varying_set', 'small_set']) await transform(name, patched)
          await oracle('set_get', patched)
        }
      }
    }
    for (const replacement of [-2147483648, 2147483647])
      await oracle('set', { ...known, replacement: input(replacement) })
    for (const row of [
      known,
      { ...known, a: input(null), b: input(null), av: input(null), bv: input(null) },
      { ...known, position: input(null), small_position: input(null) },
      { ...known, replacement: input(null), small_replacement: input(null) },
      { ...known, expected: input(null), expected_bit: input(null) },
    ])
      for (const name of names) await oracle(name, row)
    for (const skip of [true, false, null])
      for (const name of ['lazy', 'scalar_case'])
        await oracle(name, {
          ...known,
          position: input(-1),
          replacement: input(2),
          skip: input(skip),
        })
    await oracle('coalesce', { ...known, position: input(-1) })
    await oracle('coalesce', { ...known, av: input(null), position: input(-1) })
    const unknown: Input = { kind: 'Unknown' }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('54000', 36) } }
    for (const [name, column] of [
      ['concatenate', 'a'],
      ['varying_concatenate', 'av'],
      ['get', 'a'],
      ['set', 'a'],
    ] as const) {
      record(name, { ...known, [column]: unknown }, { kind: 'Unknown' })
      record(name, { ...known, [column]: error }, error as Outcome)
    }
    record('concatenate', { ...known, a: error, b: other }, error as Outcome)
    for (const value of [unknown, input(null)]) {
      record('concatenate', { ...known, a: value, b: other }, other as Outcome)
      record('set', { ...known, a: value, position: error, replacement: other }, error as Outcome)
    }
    record('set', { ...known, a: error, position: other, replacement: other }, error as Outcome)
    record('set', { ...known, position: unknown, replacement: other }, other as Outcome)
    record('get', { ...known, position: unknown }, { kind: 'Unknown' })
    record('set', { ...known, replacement: unknown }, { kind: 'Unknown' })
    record('get', { ...known, a: input('b101') }, { kind: 'Unknown' })
    record('lazy', { ...known, a: error, skip: input(true) }, { kind: 'True' })
    record('coalesce', { ...known, a: error, expected: input('101') }, { kind: 'True' })
    for (const name of Object.keys(transforms))
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    for (const name of ['get', 'set'])
      expect(
        fixtures.some(
          (f) =>
            f.name === name + '_raw' &&
            f.expected.kind === 'Error' &&
            f.expected.value.state === parseInt('2202E', 36),
        ),
        name,
      ).toBe(true)
    expect(
      fixtures.some(
        (f) =>
          f.name === 'set_raw' &&
          f.expected.kind === 'Error' &&
          f.expected.value.state === parseInt('22023', 36),
      ),
    ).toBe(true)
    expect(
      await query(expressions.set!, { ...known, position: input(-1), replacement: input(2) }),
    ).toEqual({ kind: 'Error', value: { state: parseInt('2202E', 36) } })
    await runCheckParity(directory, 'biteditchecks', group, fixtureNames, fixtures)
  }, 180000)
})
