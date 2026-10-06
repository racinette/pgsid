import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const expressions: Record<string, string> = {
  regex_dependency: "label ~ '^a'",
  equal: 'a = b',
  unequal: 'a <> b',
  less: 'a < b',
  less_equal: 'a <= b',
  greater: 'a > b',
  greater_equal: 'a >= b',
  contained: 'a << b',
  contained_equal: 'a <<= b',
  contains: 'a >> b',
  contains_equal: 'a >>= b',
  overlap: 'a && b',
  cidr_equal: 'c = b',
  cidr_relabel: 'c::inet = b',
  literal: "a <<= '10.0.0.0/8'::cidr",
  literal_cidr_short: "a <<= '10'::cidr",
  literal_cidr_hex: "a <<= '0x0a'::cidr",
  literal_cidr_class: "a <<= '192.168'::cidr",
  literal_cidr_ipv6: "a <<= '2001:db8::/32'::cidr",
  scalar_case: '(CASE WHEN flag THEN a ELSE b END) = b',
  simple_case: 'CASE a WHEN b THEN true ELSE false END',
  mixed_case: '(CASE WHEN flag THEN c ELSE b END) = b',
  mixed_coalesce: 'COALESCE(c, b) = b',
  mixed_coalesce_reverse: 'COALESCE(b, c) = b',
  cidr_case: '(CASE WHEN flag THEN c ELSE c END) IS NULL',
  cidr_coalesce: 'COALESCE(c, c) IS NULL',
  coalesce: 'COALESCE(a, b) = b',
  membership: 'a IN (b, NULL)',
  between: 'a BETWEEN b AND b',
  null_test: 'a IS NULL',
  cidr_null: 'c IS NULL',
}
for (const fn of builtinCallables())
  if (
    fn.kind === 'function' &&
    fn.args.length === 2 &&
    fn.args.every((type) => type === 'pg_catalog.inet') &&
    fn.result === 'pg_catalog.bool'
  )
    if (fn.name.startsWith('network_'))
      expressions['direct_' + fn.name] = `pg_catalog.${fn.name}(a,b)`
const extendedExpressions: Record<string, string> = {
  cast_equal: 'raw::inet = b',
  cast_function: 'pg_catalog.inet(raw) = b',
  cast_cidr_function: 'cidr(raw) = c',
  cast_cidr_equal: 'raw::cidr = c',
  cast_null: 'raw::inet IS NULL',
  cast_cidr_null: 'raw::cidr IS NULL',
  cast_varchar: 'raw_varchar::inet = b',
  cast_literal: "('10.0.0.1'::text)::inet = b",
  cast_lazy: 'CASE WHEN flag THEN true ELSE raw::inet = b END',
  cast_case: "(CASE WHEN flag THEN raw ELSE '10.0.0.1' END)::inet = b",
  cast_coalesce: 'COALESCE(raw::inet, b) = b',
  add: 'a + delta = b',
  add_reverse: 'delta + a = b',
  subtract: 'a - delta = b',
  difference: 'a - b = delta',
  add_null: '(a + delta) IS NULL',
  subtract_null: '(a - delta) IS NULL',
  difference_null: '(a - b) IS NULL',
  add_step: 'a + step = b',
  add_smallstep: 'a + smallstep = b',
  reverse_step: 'step + a = b',
  subtract_step: 'a - step = b',
  add_cidr: 'c + delta = b',
  add_one: 'a + 1 = b',
  subtract_one: 'a - 1 = b',
  direct_add: 'pg_catalog.inetpl(a, delta) = b',
  direct_reverse: 'pg_catalog.int8pl_inet(delta, a) = b',
  direct_subtract: 'pg_catalog.inetmi_int8(a, delta) = b',
  direct_difference: 'pg_catalog.inetmi(a, b) = delta',
  lazy_arithmetic: 'CASE WHEN flag THEN true ELSE a + delta = b END',
  scalar_arithmetic: '(CASE WHEN flag THEN a + delta ELSE b END) = b',
}
const values: (string | null)[] = [
  null,
  '0.0.0.0/0',
  '0.0.0.0',
  '10.0.0.1/8',
  '10.255.255.255/8',
  '10.0.0.0/16',
  '10.0.0.1/16',
  '10.128.0.1/9',
  '10.128.0.2/31',
  '10.0.0.1',
  '10.0.0.2',
  '11.0.0.0/8',
  '128.0.0.0/1',
  '255.255.255.255',
  '::/0',
  '::',
  '::1',
  '::ffff:192.0.2.1',
  '2001:db8::/32',
  '2001:db8::1/32',
  '2001:db8:ffff::/48',
  '2001:db8::1/128',
  '2001:db8:0:0:8000::1/65',
  '2001:db8::1/127',
  'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
]
const input = (value: string | bigint | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('portable Rust CHECK INET/CIDR', () => {
  let pg: PGlite
  let oraclePg: PGlite | undefined
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-network-'))
    await pg.exec(`CREATE DOMAIN peer_address AS inet;
      CREATE TABLE network_checks (a peer_address, b inet, c cidr, flag bool, label text COLLATE "C",
        raw text, raw_varchar varchar, delta bigint, step integer, smallstep smallint,
        ${Object.entries({ ...expressions, ...extendedExpressions })
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'network_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (oraclePg && !oraclePg.closed) await oraclePg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches PGlite in native Rust, Go and TypeScript for raw and stored constraints', async () => {
    const names = Object.keys(expressions)
    const plans = names.flatMap((name) =>
      ['raw', 'stored'].map((form) => ({
        expression: lowerTableCheck(
          table,
          form === 'stored'
            ? table.constraints.find((c) => c.name === name)!
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
    )
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((check) => check.kind !== 'supported')).toEqual([])
    expect(group.evaluatorSource).toContain('NetworkValue')
    expect(group.evaluatorSource).toContain('make_cidr_value("10")')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    for (const a of values)
      for (const b of values) {
        const row = {
          a: input(a),
          b: input(b),
          c: input('10.0.0.0/8'),
          flag: input(a !== null),
          label: input('abc'),
        }
        const result = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${names.map((name) => `(${expressions[name]}) AS "${name}"`).join(',')} FROM
         (SELECT $1::inet a, $2::inet b, '10.0.0.0/8'::cidr c, $3::bool flag, $4::text COLLATE "C" label) candidate`,
            [a, b, a !== null, 'abc'],
          )
        ).rows[0]!
        for (const name of names)
          for (const form of ['raw', 'stored'])
            fixtures.push({ name: name + '_' + form, row, expected: outcome(result[name]!) })
      }
    for (const a of [
      '10/8',
      '10.1/16',
      '010.001.000.001',
      '2001:DB8:0:0:0:0:0:1',
      '::ffff:0:192.0.2.1',
      '1:2:3:4:5:6:7::',
      '::1:2:3:4:5:6:7',
    ]) {
      const b = (await pg.query<{ value: string }>('SELECT $1::inet::text value', [a])).rows[0]!
        .value
      fixtures.push({
        name: 'equal_raw',
        row: { a: input(a), b: input(b) },
        expected: { kind: 'True' },
      })
    }
    for (const a of [
      '',
      '1.2.3',
      '256.0.0.1',
      '1.2.3.4/33',
      '1.2.3.4/',
      '::/129',
      '::/01',
      ':::1',
      '1::2::3',
      '1:2:3:4:5:6:7:8::',
      '::ffff:192.00.2.1',
      'fe80::1%eth0',
      ' 127.0.0.1',
      '१२',
    ])
      fixtures.push({
        name: 'equal_raw',
        row: { a: input(a), b: input('::') },
        expected: { kind: 'Unknown' },
      })
    const error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const otherError: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const name of ['equal', 'contained', 'contains', 'overlap']) {
      fixtures.push({
        name: name + '_raw',
        row: { a: { kind: 'Unknown' }, b: input('::') },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name: name + '_raw',
        row: { a: { kind: 'Unknown' }, b: error },
        expected: error,
      })
      fixtures.push({ name: name + '_raw', row: { a: error, b: otherError }, expected: error })
    }
    fixtures.push(
      { name: 'coalesce_raw', row: { a: input('::'), b: error }, expected: error },
      {
        name: 'scalar_case_raw',
        row: { a: error, b: input('::'), flag: input(false) },
        expected: { kind: 'True' },
      },
      { name: 'null_test_raw', row: { a: { kind: 'Unknown' } }, expected: { kind: 'Unknown' } },
    )
    await runCheckParity(directory, 'networkchecks', group, fixtureNames, fixtures)
  }, 180000)
  it('matches SQL text casts and address arithmetic, including errors and lazy branches', async () => {
    const names = Object.keys(extendedExpressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => ({
          expression: lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((constraint) => constraint.name === name)!
              : { name, type: 'check', definition: `CHECK (${extendedExpressions[name]})` },
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
      expect(check.kind, fixtureNames[index]).toBe('supported')
    expect(group.evaluatorSource).toContain('network_from_text(input_raw.clone())')
    expect(group.evaluatorSource).toContain('cidr_from_text(input_raw.clone())')
    oraclePg = await PGlite.create()
    let oracleFailures = 0
    const oracleQuery = async <T>(sql: string, parameters: unknown[]) => {
      // Repeated SQL errors consume this embedded PostgreSQL build's stack.
      if (oracleFailures >= 512) {
        await oraclePg!.close()
        oraclePg = await PGlite.create()
        oracleFailures = 0
      }
      try {
        return await oraclePg!.query<T>(sql, parameters)
      } catch (error) {
        oracleFailures++
        throw error
      }
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const unknownRow: Row = Object.fromEntries(
      table.columns.map((column) => [column.name, { kind: 'Unknown' }]),
    )
    const record = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + form, row: { ...unknownRow, ...row }, expected })
    }
    const oracle = async (name: string, row: Row) => {
      const parameters = [
        'a',
        'b',
        'c',
        'raw',
        'raw_varchar',
        'delta',
        'step',
        'smallstep',
        'flag',
      ].map((key) => {
        const value = row[key]
        return value?.kind === 'Value'
          ? typeof value.value === 'bigint'
            ? value.value.toString()
            : value.value
          : null
      })
      let expected: Outcome
      try {
        const result = (
          await oracleQuery<{ value: boolean | null }>(
            `SELECT (${extendedExpressions[name]}) value FROM
          (SELECT $1::inet a, $2::inet b, $3::cidr c, $4::text raw, $5::varchar raw_varchar,
          $6::bigint delta, $7::integer step, $8::smallint smallstep, $9::bool flag) candidate`,
            parameters,
          )
        ).rows[0]!.value
        expected = outcome(result)
      } catch (error) {
        expect(
          ['22P02', '22003', '22023'],
          `${name}: ${JSON.stringify(parameters)}: ${(error as Error).message}`,
        ).toContain((error as { code: string }).code)
        expected = {
          kind: 'Error',
          value: { state: parseInt((error as { code: string }).code, 36) },
        }
      }
      record(name, row, expected)
    }
    const castNames = names.filter((name) => name.startsWith('cast_'))
    const spellings = [
      ...values,
      '',
      '10',
      '10/8',
      '10.1/16',
      '192.168',
      '224',
      '240',
      '0x0a',
      '0X0A00/16',
      '0xa',
      '0xac1/24',
      '0x00000000/0',
      '0x0',
      '0x',
      '0x123456789',
      '010.001.000.001',
      '10.0.0.0/008',
      '10.0.0.0/00000032',
      '10.0.0.1/4294967328',
      '10.0.0.0/4294967304',
      '10.0.0.0/2147483648',
      '10.0.0.0/4294967296',
      '10.0.0.0/999999999999999999999999999999',
      '1.2.3.4.',
      '1.2.3./24',
      '1.2.3.4./24',
      '1.2.3',
      '1.2.3.4.5',
      '256.0.0.1',
      '1.2.3.4/33',
      '1.2.3.4/',
      '1.2.3.4//24',
      '1.2.3.4/-1',
      '::/129',
      '::/01',
      ':::1',
      '1::2::3',
      '1:2:3:4:5:6:7:8::',
      '1:2:3:4:5:6:7:8:/64',
      '::ffff:192.00.2.1',
      '::ffff:192..2.1',
      '::192.1',
      '::192.0.2.',
      '::192.0.2./120',
      '::192.0.2/120',
      '::192..2.1/128',
      'fe80::1%eth0',
      ' 127.0.0.1',
      '127.0.0.1 ',
      '१२',
      'junk',
      '10.0.0.1/8',
      '2001:db8::1/32',
      '0'.repeat(300) + '10.0.0.1',
      '10.0.0.1/' + '0'.repeat(300) + '32',
    ]
    for (const raw of spellings) {
      const row: Row = {
        raw: input(raw),
        raw_varchar: input(raw),
        b: input('10.0.0.1'),
        c: input('10.0.0.0/8'),
        flag: input(false),
      }
      for (const name of castNames) await oracle(name, row)
      await oracle('cast_lazy', { ...row, flag: input(true) })
      for (const [type, name, column] of [
        ['inet', 'cast_equal', 'b'],
        ['cidr', 'cast_cidr_equal', 'c'],
      ] as const) {
        try {
          const canonical = (
            await oracleQuery<{ value: string }>(`SELECT $1::${type}::text value`, [raw])
          ).rows[0]!.value
          if (raw !== null) await oracle(name, { ...row, [column]: input(canonical) })
        } catch (error) {
          expect((error as { code: string }).code).toBe('22P02')
        }
      }
    }
    const arithmeticNames = names.filter((name) => !name.startsWith('cast_'))
    const addresses = [
      ...values,
      '::7fff:ffff:ffff:ffff',
      '::8000:0:0:0',
      '::ffff:ffff:ffff:ffff',
      '0:0:0:1::',
      '7fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
      '8000::',
    ]
    const offsets = [
      null,
      0n,
      1n,
      -1n,
      255n,
      -256n,
      65535n,
      65536n,
      -65536n,
      4294967295n,
      -4294967296n,
      9223372036854775807n,
      -9223372036854775808n,
    ]
    for (const a of addresses)
      for (const delta of offsets) {
        const row: Row = {
          a: input(a),
          b: input(a),
          c: input('10.0.0.0/8'),
          delta: input(delta),
          step: input(1),
          smallstep: input(1),
          flag: input(false),
        }
        for (const name of arithmeticNames) await oracle(name, row)
        await oracle('lazy_arithmetic', { ...row, flag: input(true) })
        for (const [operation, name] of [
          ['+', 'add'],
          ['-', 'subtract'],
        ] as const) {
          try {
            const shifted = (
              await oracleQuery<{ value: string | null }>(
                `SELECT ($1::inet ${operation} $2::bigint)::text value`,
                [a, delta === null ? null : delta.toString()],
              )
            ).rows[0]!.value
            await oracle(name, { ...row, b: input(shifted) })
          } catch (error) {
            expect((error as { code: string }).code).toBe('22003')
          }
        }
      }
    for (const a of addresses)
      for (const b of addresses) {
        const row = { a: input(a), b: input(b), delta: input(0n) }
        await oracle('difference', row)
        await oracle('direct_difference', row)
        try {
          const difference = (
            await oracleQuery<{ value: string | null }>(
              'SELECT ($1::inet - $2::inet)::text value',
              [a, b],
            )
          ).rows[0]!.value
          await oracle('difference', {
            ...row,
            delta: input(difference === null ? null : BigInt(difference)),
          })
        } catch (error) {
          expect(['22003', '22023']).toContain((error as { code: string }).code)
        }
      }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const otherError: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const value of [{ kind: 'Unknown' } as Input, { kind: 'Null' } as Input, error]) {
      for (const name of [
        'cast_equal',
        'cast_varchar',
        'cast_cidr_equal',
        'cast_function',
        'cast_cidr_function',
        'cast_coalesce',
      ]) {
        const row = { raw: value, raw_varchar: value, b: input('10.0.0.1'), c: input('10.0.0.0/8') }
        record(
          name,
          row,
          value.kind === 'Null'
            ? { kind: name === 'cast_coalesce' ? 'True' : 'Null' }
            : (value as Outcome),
        )
      }
      record('cast_lazy', { raw: value, flag: input(true) }, { kind: 'True' })
      record(
        'cast_case',
        { raw: value, flag: input(false), b: input('10.0.0.1') },
        { kind: 'True' },
      )
      for (const name of ['add', 'add_reverse', 'subtract']) {
        record(
          name,
          { a: value, delta: input(0n), b: input('::') },
          value.kind === 'Null' ? { kind: 'Null' } : (value as Outcome),
        )
        record(
          name,
          { a: input('::'), delta: value, b: input('::') },
          value.kind === 'Null' ? { kind: 'Null' } : (value as Outcome),
        )
        record(
          name,
          { a: value, delta: otherError, b: input('::') },
          name === 'add_reverse' || value.kind !== 'Error' ? otherError : error,
        )
      }
      record(
        'lazy_arithmetic',
        { a: value, delta: otherError, flag: input(true) },
        { kind: 'True' },
      )
      record(
        'scalar_arithmetic',
        { a: value, delta: otherError, b: input('::'), flag: input(false) },
        { kind: 'True' },
      )
    }
    for (const name of ['difference', 'direct_difference']) {
      record(name, { a: error, b: otherError, delta: input(0n) }, error)
      record(name, { a: { kind: 'Unknown' }, b: otherError, delta: input(0n) }, otherError)
      record(
        name,
        { a: { kind: 'Unknown' }, b: { kind: 'Null' }, delta: input(0n) },
        { kind: 'Unknown' },
      )
    }
    const extendedDirectory = join(directory, 'extended')
    await mkdir(extendedDirectory)
    await runCheckParity(extendedDirectory, 'networkextended', group, fixtureNames, fixtures)
  }, 180000)
})
