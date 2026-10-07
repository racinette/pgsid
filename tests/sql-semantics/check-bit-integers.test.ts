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
  a: 'mask_integer',
  b: 'bigint',
  bits: 'raw_bits',
  variable_bits: 'varbit',
  width: 'integer',
  expected_bits: 'varbit',
  expected_int: 'integer',
  expected_big: 'bigint',
  skip: 'boolean',
}
const transforms: Record<string, { sql: string; expected: string }> = {
  encode_int: { sql: 'pg_catalog."bit"(a,width)', expected: 'expected_bits' },
  encode_big: { sql: 'pg_catalog."bit"(b,width)', expected: 'expected_bits' },
  cast_int: { sql: 'a::bit(32)', expected: 'expected_bits' },
  cast_big: { sql: 'b::bit(64)', expected: 'expected_bits' },
  wide_int: { sql: 'a::bit(33)', expected: 'expected_bits' },
  wide_big: { sql: 'b::bit(65)', expected: 'expected_bits' },
  short_int: { sql: 'a::bit(3)', expected: 'expected_bits' },
  short_big: { sql: 'b::bit(7)', expected: 'expected_bits' },
  default_int: { sql: 'a::bit', expected: 'expected_bits' },
  unbounded_big: { sql: 'b::pg_catalog."bit"', expected: 'expected_bits' },
  decode_int: { sql: 'bits::int4', expected: 'expected_int' },
  decode_big: { sql: 'bits::int8', expected: 'expected_big' },
  direct_int: { sql: 'int4(bits)', expected: 'expected_int' },
  direct_big: { sql: 'int8(bits)', expected: 'expected_big' },
  relabel_int: { sql: 'int4(variable_bits)', expected: 'expected_int' },
  relabel_big: { sql: '(variable_bits::pg_catalog."bit")::int8', expected: 'expected_big' },
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, { sql, expected }]) => [name, `(${sql}) = ${expected}`]),
  ),
  int_roundtrip: '(a::bit(32))::int4 = a',
  big_roundtrip: '(b::bit(64))::int8 = b',
  literal_int: "7::bit(8) = B'00000111'",
  literal_negative: "(-7)::bit(8) = B'11111001'",
  literal_min_int: "(-2147483648)::bit(32) = X'80000000'",
  literal_min_big: "(-9223372036854775808)::bit(64) = X'8000000000000000'",
  literal_max_big: "9223372036854775807::bit(64) = X'7FFFFFFFFFFFFFFF'",
  exact_int_sign: "X'FFFFFFFF'::int4 = -1",
  exact_big_sign: "X'FFFFFFFFFFFFFFFF'::int8 = -1",
  short_unsigned: "B'111'::int4 = 7",
  empty: "B''::int8 = 0",
  lazy: 'CASE WHEN skip THEN true ELSE bits::int4 = expected_int END',
  coalesce: 'COALESCE(expected_int,bits::int4) = expected_int',
}
const input = (value: number | bigint | string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK integer and bit conversions', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-bit-integers-'))
    await pg.exec(`CREATE DOMAIN raw_bits AS pg_catalog."bit";
      CREATE DOMAIN mask_integer AS integer;
      CREATE TABLE bit_integer_checks (${Object.entries(columns)
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
  it('matches signed boundaries, truncation, sign extension, length errors, NULLs and lazy evaluation in Rust, Go and TypeScript', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'bit_integer_checks')!
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
      Object.keys(columns).map((name) =>
        row[name]?.kind === 'Value' ? String(row[name].value) : null,
      )
    const query = async (sql: string, row: Row): Promise<Outcome> => {
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${sql}) value FROM ${candidate}`,
            params(row),
          )
        ).rows[0]!.value
        return { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        expect((error as { code: string }).code, sql + ': ' + String(error)).toBe('22003')
        return { kind: 'Error', value: { state: parseInt('22003', 36) } }
      }
    }
    const oracle = async (name: string, row: Row) =>
      record(name, row, await query(expressions[name]!, row))
    const known: Row = {
      a: input(7),
      b: input(7n),
      bits: input('111'),
      variable_bits: input('111'),
      width: input(8),
      expected_bits: input('00000111'),
      expected_int: input(7),
      expected_big: input(7n),
      skip: input(false),
    }
    const falseNames = new Set<string>()
    const checkTransform = async (name: string, row: Row) => {
      const { sql, expected } = transforms[name]!
      try {
        const value = (
          await pg.query<{ value: string | number | null }>(
            `SELECT (${sql}) value FROM ${candidate}`,
            params(row),
          )
        ).rows[0]!.value
        const converted =
          value === null ? null : expected === 'expected_big' ? BigInt(value) : value
        await oracle(name, { ...row, [expected]: input(converted) })
        if (value !== null && !falseNames.has(name)) {
          const wrong =
            expected === 'expected_bits'
              ? value + '0'
              : expected === 'expected_big'
                ? converted === 0n
                  ? 1n
                  : 0n
                : converted === 0
                  ? 1
                  : 0
          await oracle(name, { ...row, [expected]: input(wrong) })
          falseNames.add(name)
        }
      } catch (error) {
        if (!(error as { code?: string }).code) throw error
        await oracle(name, row)
      }
    }
    const widths = [
      -2147483648, -1, 0, 1, 2, 3, 7, 8, 9, 31, 32, 33, 63, 64, 65, 129, 2147483641, 2147483647,
    ]
    for (const a of [-2147483648, -2147483647, -129, -7, -2, -1, 0, 1, 2, 7, 128, 2147483647]) {
      for (const width of widths)
        await checkTransform('encode_int', { ...known, a: input(a), width: input(width) })
      for (const name of ['cast_int', 'wide_int', 'short_int', 'default_int'])
        await checkTransform(name, { ...known, a: input(a) })
      await oracle('int_roundtrip', { ...known, a: input(a) })
    }
    for (const b of [
      -9223372036854775808n,
      -9223372036854775807n,
      -2147483649n,
      -129n,
      -7n,
      -2n,
      -1n,
      0n,
      1n,
      7n,
      2147483648n,
      9223372036854775807n,
    ]) {
      for (const width of widths)
        await checkTransform('encode_big', { ...known, b: input(b), width: input(width) })
      for (const name of ['cast_big', 'wide_big', 'short_big', 'unbounded_big'])
        await checkTransform(name, { ...known, b: input(b) })
      await oracle('big_roundtrip', { ...known, b: input(b) })
    }
    for (const length of [0, 1, 2, 3, 7, 8, 9, 31, 32, 33, 63, 64, 65, 129]) {
      for (const bits of new Set([
        '0'.repeat(length),
        '1'.repeat(length),
        length ? '1' + '0'.repeat(length - 1) : '',
        length ? '0'.repeat(length - 1) + '1' : '',
        '10'.repeat(Math.ceil(length / 2)).slice(0, length),
      ]))
        for (const name of [
          'decode_int',
          'decode_big',
          'direct_int',
          'direct_big',
          'relabel_int',
          'relabel_big',
        ])
          await checkTransform(name, { ...known, bits: input(bits), variable_bits: input(bits) })
    }
    for (const row of [
      known,
      { ...known, a: input(null), b: input(null), bits: input(null), variable_bits: input(null) },
      { ...known, width: input(null) },
      {
        ...known,
        expected_bits: input(null),
        expected_int: input(null),
        expected_big: input(null),
      },
    ])
      for (const name of names) await oracle(name, row)
    for (const skip of [true, false, null])
      await oracle('lazy', { ...known, bits: input('0'.repeat(33)), skip: input(skip) })
    await oracle('coalesce', { ...known, bits: input('0'.repeat(65)) })
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const unknown: Input = { kind: 'Unknown' }
    for (const [name, column] of [
      ['encode_int', 'a'],
      ['encode_big', 'b'],
      ['decode_int', 'bits'],
      ['decode_big', 'bits'],
      ['relabel_int', 'variable_bits'],
    ] as const) {
      record(name, { ...known, [column]: unknown }, { kind: 'Unknown' })
      record(name, { ...known, [column]: error }, error as Outcome)
    }
    for (const [name, column] of [
      ['encode_int', 'a'],
      ['encode_big', 'b'],
    ] as const) {
      record(name, { ...known, [column]: error, width: other }, error as Outcome)
      for (const value of [unknown, input(null)])
        record(name, { ...known, [column]: value, width: other }, other as Outcome)
      record(name, { ...known, width: unknown }, { kind: 'Unknown' })
    }
    record('decode_int', { ...known, bits: input('xF') }, { kind: 'Unknown' })
    record('lazy', { ...known, bits: error, skip: input(true) }, { kind: 'True' })
    record('coalesce', { ...known, bits: error }, { kind: 'True' })
    for (const name of Object.keys(transforms))
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    for (const name of ['decode_int', 'decode_big'])
      expect(
        fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === 'Error'),
        name,
      ).toBe(true)
    await runCheckParity(directory, 'bitintegerchecks', group, fixtureNames, fixtures)
  }, 180000)
})
