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
  small: 'smallint',
  wide: 'integer',
  big: 'bigint',
  day: 'date',
  local_time: 'timestamp',
  instant: 'timestamptz',
  flag: 'boolean',
  expected: 'bytea',
  expected_small: 'smallint',
  expected_wide: 'integer',
  expected_big: 'bigint',
  backup: 'bytea',
  skip: 'boolean',
}
const transforms: Record<string, { sql: string; target: string }> = {
  small_decode: { sql: 'a::smallint', target: 'expected_small' },
  direct_small_decode: { sql: 'int2(a)', target: 'expected_small' },
  wide_decode: { sql: 'a::integer', target: 'expected_wide' },
  direct_wide_decode: { sql: 'int4(a)', target: 'expected_wide' },
  big_decode: { sql: 'a::bigint', target: 'expected_big' },
  direct_big_decode: { sql: 'int8(a)', target: 'expected_big' },
  small_encode: { sql: 'small::bytea', target: 'expected' },
  direct_small_encode: { sql: 'bytea(small)', target: 'expected' },
  small_send: { sql: 'int2send(small)', target: 'expected' },
  wide_encode: { sql: 'wide::bytea', target: 'expected' },
  direct_wide_encode: { sql: 'bytea(wide)', target: 'expected' },
  wide_send: { sql: 'int4send(wide)', target: 'expected' },
  big_encode: { sql: 'big::bytea', target: 'expected' },
  direct_big_encode: { sql: 'bytea(big)', target: 'expected' },
  big_send: { sql: 'int8send(big)', target: 'expected' },
  date_send: { sql: 'date_send(day)', target: 'expected' },
  timestamp_send: { sql: 'timestamp_send(local_time)', target: 'expected' },
  instant_send: { sql: 'timestamptz_send(instant)', target: 'expected' },
  bool_send: { sql: 'boolsend(flag)', target: 'expected' },
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, operation]) => [
      name,
      `(${operation.sql}) = ${operation.target}`,
    ]),
  ),
  roundtrip_small: 'int2(small::bytea) = small',
  roundtrip_wide: 'int4(wide::bytea) = wide',
  roundtrip_big: 'int8(big::bytea) = big',
  reuse: 'int8send(big) = big::bytea',
  lazy: 'CASE WHEN skip THEN true ELSE int2(a) = expected_small END',
  selected: '(CASE WHEN skip THEN backup ELSE big::bytea END) = expected',
  defaulted: 'COALESCE(backup,big::bytea) = expected',
  unsigned_short: "'\\xff'::bytea::smallint = 255 AND '\\xffff'::bytea::integer = 65535",
  signed_full: "'\\xffff'::bytea::smallint = -1 AND '\\xffffffff'::bytea::integer = -1",
  empty_integer: "'\\x'::bytea::smallint = 0 AND '\\x'::bytea::bigint = 0",
}
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bytea integer conversion and scalar binary send', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bytea-integers-'))
    await pg.exec("SET TIME ZONE 'UTC'")
    await pg.exec(`CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;
      CREATE TABLE bytea_integer_checks (${Object.entries(columns)
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
  it('matches network order, signed widths, integer boundaries, scalar binary payloads and lazy errors in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'bytea_integer_checks')!
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
      .map(([name, type], index) => `$${index + 1}::${type} AS "${name}"`)
      .join(',')}) candidate`
    let executions = 0
    const temporalText = new Map<string, string>()
    const execute = async (sql: string, row: Row) => {
      if (executions > 0 && executions % 500 === 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(
          "SET TIME ZONE 'UTC'; CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;",
        )
      }
      executions++
      return (
        await pg.query<{ value: string | number | boolean | null }>(
          `SELECT (${sql}) value FROM ${candidate}`,
          Object.keys(columns).map((name) =>
            row[name]?.kind !== 'Value'
              ? null
              : ['day', 'local_time', 'instant'].includes(name)
                ? temporalText.get(name + ':' + String(row[name].value))!
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
        expect(code, sql + ': ' + String(error)).toBe('22003')
        return { kind: 'Error', value: { state: parseInt(code, 36) } }
      }
    }
    const oracle = async (name: string, row: Row) =>
      record(name, row, await query(expressions[name]!, row))
    const known: Row = {
      a: input('0007'),
      small: input(7),
      wide: input(7),
      big: input(7n),
      day: input(0),
      local_time: input(0n),
      instant: input(0n),
      flag: input(true),
      expected: input('0000000000000007'),
      expected_small: input(7),
      expected_wide: input(7),
      expected_big: input(7n),
      backup: input('0000000000000007'),
      skip: input(false),
    }
    temporalText.set('day:0', '2000-01-01')
    temporalText.set('local_time:0', '2000-01-01 00:00:00')
    temporalText.set('instant:0', '2000-01-01 00:00:00+00')
    const falseNames = new Set<string>()
    const transform = async (name: string, row: Row) => {
      const operation = transforms[name]!
      try {
        const value = await execute(
          operation.target === 'expected' ? `encode(${operation.sql},'hex')` : operation.sql,
          row,
        )
        const expected =
          value === null
            ? null
            : operation.target === 'expected_big'
              ? BigInt(value as string | number)
              : value
        await oracle(name, { ...row, [operation.target]: input(expected) })
        if (value !== null && !falseNames.has(name)) {
          await oracle(name, {
            ...row,
            [operation.target]: input(
              operation.target === 'expected'
                ? value + '00'
                : operation.target === 'expected_big'
                  ? BigInt(value as string | number) === 0n
                    ? 1n
                    : 0n
                  : Number(value) === 0
                    ? 1
                    : 0,
            ),
          })
          falseNames.add(name)
        }
      } catch (error) {
        if (!(error as { code?: string }).code) throw error
        await oracle(name, row)
      }
    }
    const decoders = Object.keys(transforms).filter((name) => name.endsWith('_decode'))
    for (const bytes of [
      '',
      '00',
      '7f',
      '80',
      'ff',
      '0000',
      '7fff',
      '8000',
      'ffff',
      '000000',
      'ffffff',
      '7fffffff',
      '80000000',
      'ffffffff',
      '0000000000',
      'ffffffffff',
      '7fffffffffffffff',
      '8000000000000000',
      '8000000000000001',
      'ffffffffffffffff',
      '00'.repeat(9),
    ])
      for (const name of decoders) await transform(name, { ...known, a: input(bytes) })
    for (let byte = 0; byte < 256; byte++)
      for (const name of decoders)
        await transform(name, { ...known, a: input(byte.toString(16).padStart(2, '0')) })
    for (const small of [-32768, -32767, -257, -256, -1, 0, 1, 255, 256, 32767]) {
      const row = { ...known, small: input(small) }
      for (const name of ['small_encode', 'direct_small_encode', 'small_send'])
        await transform(name, row)
      await oracle('roundtrip_small', row)
    }
    for (const wide of [
      -2147483648, -2147483647, -65536, -257, -1, 0, 1, 255, 256, 65535, 2147483647,
    ]) {
      const row = { ...known, wide: input(wide) }
      for (const name of ['wide_encode', 'direct_wide_encode', 'wide_send'])
        await transform(name, row)
      await oracle('roundtrip_wide', row)
    }
    for (const big of [
      -9223372036854775808n,
      -9223372036854775807n,
      -2147483649n,
      -257n,
      -1n,
      0n,
      1n,
      255n,
      256n,
      4294967295n,
      9223372036854775807n,
    ]) {
      const row = { ...known, big: input(big) }
      for (const name of ['big_encode', 'direct_big_encode', 'big_send']) await transform(name, row)
      await oracle('roundtrip_big', row)
    }
    for (const [column, type, spellings] of [
      [
        'day',
        'date',
        [
          '-infinity',
          'infinity',
          '2000-01-01',
          '1999-12-31',
          '2024-02-29',
          '4714-11-24 BC',
          '5874897-12-31',
        ],
      ],
      [
        'local_time',
        'timestamp',
        [
          '-infinity',
          'infinity',
          '2000-01-01 00:00:00',
          '1999-12-31 23:59:59.999999',
          '2024-02-29 12:34:56.123456',
          '4714-11-24 00:00:00 BC',
          '294276-12-31 23:59:59.999999',
        ],
      ],
      [
        'instant',
        'timestamptz',
        [
          '-infinity',
          'infinity',
          '2000-01-01 00:00:00+00',
          '1999-12-31 23:59:59.999999+00',
          '2024-02-29 12:34:56.123456+05:30',
          '294276-12-31 23:59:59.999999+00',
        ],
      ],
    ] as const) {
      for (const spelling of spellings) {
        let value: number | bigint
        if (spelling === '-infinity' || spelling === 'infinity') {
          const negative = spelling === '-infinity'
          value =
            column === 'day'
              ? negative
                ? -2147483648
                : 2147483647
              : negative
                ? -9223372036854775808n
                : 9223372036854775807n
        } else {
          const result = (
            await pg.query<{ value: string }>(
              column === 'day'
                ? `SELECT ($1::date - DATE '2000-01-01')::text value`
                : `SELECT (extract(epoch FROM ($1::${type} - ${type} '2000-01-01 00:00:00')) * 1000000)::text value`,
              [spelling],
            )
          ).rows[0]!.value
          value = column === 'day' ? Number(result) : BigInt(result.split('.')[0]!)
        }
        temporalText.set(column + ':' + String(value), spelling)
        await transform(
          column === 'day'
            ? 'date_send'
            : column === 'local_time'
              ? 'timestamp_send'
              : 'instant_send',
          { ...known, [column]: input(value) },
        )
      }
    }
    for (const flag of [false, true]) await transform('bool_send', { ...known, flag: input(flag) })
    for (const row of [
      known,
      { ...known, a: input(null) },
      {
        ...known,
        small: input(null),
        wide: input(null),
        big: input(null),
        day: input(null),
        local_time: input(null),
        instant: input(null),
        flag: input(null),
      },
      {
        ...known,
        expected: input(null),
        expected_small: input(null),
        expected_wide: input(null),
        expected_big: input(null),
      },
    ])
      for (const name of names) await oracle(name, row)
    await oracle('lazy', { ...known, a: input('00'.repeat(9)), skip: input(true) })
    await oracle('lazy', { ...known, a: input('00'.repeat(9)), skip: input(false) })
    const unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const name of Object.keys(transforms)) {
      const column = name.includes('decode')
        ? 'a'
        : name.startsWith('date')
          ? 'day'
          : name.startsWith('timestamp')
            ? 'local_time'
            : name.startsWith('instant')
              ? 'instant'
              : name.startsWith('bool')
                ? 'flag'
                : name.includes('small')
                  ? 'small'
                  : name.includes('wide')
                    ? 'wide'
                    : 'big'
      record(name, { ...known, [column]: unknown }, { kind: 'Unknown' })
      record(name, { ...known, [column]: error }, error as Outcome)
    }
    record('lazy', { ...known, a: error, skip: input(true) }, { kind: 'True' })
    record('selected', { ...known, big: error, skip: input(true) }, { kind: 'True' })
    record('defaulted', { ...known, big: error }, { kind: 'True' })
    for (const name of Object.keys(transforms))
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    for (const name of decoders)
      expect(
        fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === 'Error'),
        name,
      ).toBe(true)
    await runCheckParity(directory, 'byteaintegerschecks', group, fixtureNames, fixtures)
  }, 180000)
})
