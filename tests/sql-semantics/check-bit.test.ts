import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
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
  recorded_comparison: 'integer',
  recorded_bits: 'integer',
  recorded_octets: 'integer',
  skip: 'boolean',
}
const expressions: Record<string, string> = {
  fixed_equal: 'a = b',
  fixed_unequal: 'a <> b',
  fixed_less: 'a < b',
  fixed_less_equal: 'a <= b',
  fixed_greater: 'a > b',
  fixed_greater_equal: 'a >= b',
  varying_equal: 'av = bv',
  varying_unequal: 'av <> bv',
  varying_less: 'av < bv',
  varying_less_equal: 'av <= bv',
  varying_greater: 'av > bv',
  varying_greater_equal: 'av >= bv',
  fixed_literal: "a = B'001'",
  hexadecimal_literal: "a = X'0f'",
  empty_literal: "av = B''",
  fixed_null: 'a IS NULL',
  varying_null: 'av IS NULL',
  simple_case: 'CASE a WHEN NULL THEN false WHEN b THEN true ELSE false END',
  scalar_case: '(CASE WHEN skip THEN a ELSE b END) = b',
  mixed_case: '(CASE WHEN skip THEN a ELSE bv END) = bv',
  default: 'COALESCE(a,b) = b',
  mixed_default: 'COALESCE(av,b) = bv',
  membership: 'a IN (b,NULL)',
  not_membership: 'av NOT IN (bv,NULL)',
  range: 'av BETWEEN bv AND bv',
  not_range: 'a NOT BETWEEN b AND b',
  mixed_compare: 'a = bv',
  varying_literal: "av = B'001'",
  reused: 'a = b AND a = b',
  lazy: 'CASE WHEN skip THEN true ELSE a = b END',
}
for (const fn of builtinCallables()) {
  if (fn.kind !== 'function' || !['pg_catalog."bit"', 'pg_catalog.varbit'].includes(fn.args[0]!))
    continue
  const varying = fn.args[0] === 'pg_catalog.varbit'
  const args = varying ? 'av,bv' : 'a,b'
  if (fn.args.length === 2 && /^(?:var)?bit(?:eq|ne|lt|le|gt|ge)$/.test(fn.name))
    expressions['direct_' + fn.name] = `${fn.name}(${args})`
  if (fn.args.length === 2 && /^(?:var)?bitcmp$/.test(fn.name))
    expressions['direct_' + fn.name] = `${fn.name}(${args}) = recorded_comparison`
}
for (const type of ['fixed', 'varying']) {
  const name = type === 'fixed' ? 'a' : 'av'
  for (const fn of ['length', 'bit_length', 'octet_length'])
    expressions[type + '_' + fn] =
      `${fn}(${name}) = ${fn === 'octet_length' ? 'recorded_octets' : 'recorded_bits'}`
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bit and varbit values', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bit-'))
    await pg.exec(`CREATE DOMAIN fixed_bits AS pg_catalog."bit"; CREATE DOMAIN installed_bits AS fixed_bits;
      CREATE TABLE bit_checks(${Object.entries(columns)
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
  it('matches PostgreSQL padded-byte ordering, exact lengths, literals, domains, control flow and partial inputs in every target', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'bit_checks')!
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
        fixtures.push({ name: name + '_' + form, row, expected })
    }
    const pairs: [string | null, string | null][] = [
      [null, null],
      [null, '1'],
      ['1', null],
      ['', ''],
      ['', '0'],
      ['0', ''],
      ['0', '00'],
      ['1', '10'],
      ['10', '101'],
      ['001', '1'],
      ['001', '001'],
      ['00001111', '00001111'],
      ['00001111', '00001110'],
      ['000000001', '0000000001'],
      ['11111111', '111111111'],
      ['00000000', '000000000'],
    ]
    for (let length = 0; length <= 17; length++) {
      const bits = '01'.repeat(9).slice(0, length)
      pairs.push([bits, bits], [bits, bits + '0'], [bits, bits + '1'])
    }
    for (const byte of [0, 1, 2, 7, 15, 16, 31, 63, 127, 128, 129, 191, 254, 255])
      pairs.push([byte.toString(2).padStart(8, '0'), (255 - byte).toString(2).padStart(8, '0')])
    pairs.push(
      ['0'.repeat(64) + '1', '0'.repeat(64) + '0'],
      ['1'.repeat(257), '1'.repeat(256) + '0'],
    )
    let base: Row = {}
    for (const [a, b] of pairs) {
      const ref = (
        await pg.query<{ comparison: number | null; bits: number | null; octets: number | null }>(
          'SELECT bitcmp($1::pg_catalog."bit",$2::pg_catalog."bit") comparison,bit_length($1::pg_catalog."bit") bits,octet_length($1::pg_catalog."bit") octets',
          [a, b],
        )
      ).rows[0]!
      const row: Row = {
        a: input(a),
        b: input(b),
        av: input(a),
        bv: input(b),
        recorded_comparison: input(ref.comparison),
        recorded_bits: input(ref.bits),
        recorded_octets: input(ref.octets),
        skip: input(false),
      }
      const actual = (
        await pg.query<Record<string, boolean | null>>(
          `SELECT ${names.map((name) => `(${expressions[name]}) "${name}"`).join(',')} FROM (SELECT ${Object.entries(
            columns,
          )
            .map(([name, type], index) => `$${index + 1}::${type} ${name}`)
            .join(',')}) candidate`,
          Object.keys(columns).map((name) =>
            row[name]!.kind === 'Value'
              ? (row[name] as Extract<Input, { kind: 'Value' }>).value
              : null,
          ),
        )
      ).rows[0]!
      for (const name of names)
        record(name, row, {
          kind: actual[name] === null ? 'Null' : actual[name] ? 'True' : 'False',
        })
      for (const name of ['scalar_case', 'mixed_case'])
        record(
          name,
          { ...row, skip: input(true) },
          { kind: actual.fixed_equal === null ? 'Null' : actual.fixed_equal ? 'True' : 'False' },
        )
      if (a === '001' && b === '001') base = row
    }
    for (const name of [
      'direct_bitcmp',
      'direct_varbitcmp',
      'fixed_length',
      'fixed_bit_length',
      'fixed_octet_length',
      'varying_length',
      'varying_bit_length',
      'varying_octet_length',
    ]) {
      const column = name.includes('cmp')
        ? 'recorded_comparison'
        : name.includes('octet')
          ? 'recorded_octets'
          : 'recorded_bits'
      record(name, { ...base, [column]: input(-1) }, { kind: 'False' })
      record(name, { ...base, [column]: input(null) }, { kind: 'Null' })
    }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const name of ['fixed_equal', 'direct_bitcmp', 'fixed_length', 'default', 'reused']) {
      record(name, { ...base, a: { kind: 'Unknown' } }, { kind: 'Unknown' })
      record(name, { ...base, a: error }, error as Outcome)
      for (const invalid of ['2', 'b001', 'x0f', ' 001', '001 ', '０１', '0\0'])
        record(name, { ...base, a: input(invalid) }, { kind: 'Unknown' })
    }
    record('fixed_equal', { ...base, a: error, b: other }, error as Outcome)
    for (const a of [{ kind: 'Unknown' }, { kind: 'Null' }] as Input[])
      record('fixed_equal', { ...base, a, b: other }, other as Outcome)
    record('default', { ...base, b: error }, { kind: 'Error', value: error.value! })
    record('mixed_default', { ...base, b: error }, { kind: 'True' })
    record('lazy', { ...base, a: error, b: other, skip: input(true) }, { kind: 'True' })
    record('scalar_case', { ...base, a: error, skip: input(false) }, { kind: 'True' })
    record('scalar_case', { ...base, a: error, skip: input(true) }, error as Outcome)
    record('scalar_case', { ...base, skip: { kind: 'Unknown' } }, { kind: 'Unknown' })
    record('scalar_case', { ...base, skip: input(null) }, { kind: 'True' })
    record('mixed_case', { ...base, a: error, skip: input(false) }, { kind: 'True' })
    for (const name of names) {
      if (name !== 'not_membership')
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === 'True'),
          name + ': True',
        ).toBe(true)
      if (name !== 'membership')
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === 'False'),
          name + ': False',
        ).toBe(true)
    }
    await runCheckParity(directory, 'bitchecks', group, fixtureNames, fixtures)
  }, 180000)

  it('defers integer casts and unported bit operations', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'bit_checks')!
    for (const sql of ['a = 7::bit(8)', 'a::int4 > 0']) {
      const bound = lowerTableCheck(
        table,
        { name: 'width', type: 'check', definition: `CHECK (${sql})` },
        [],
        catalog.domains,
      )!
      expect(bound.expression.kind, sql).toBe('uncertain')
    }
    const expression = lowerTableCheck(
      table,
      { name: 'concatenation', type: 'check', definition: 'CHECK ((a || b) = a)' },
      [],
      catalog.domains,
    )!.expression
    const prepared = prepareCheckRustGroup([
      {
        expression,
        identity: {
          schema: 'public',
          kind: 'table',
          owner: table.name,
          constraint: 'concatenation',
        },
      },
    ])
    expect(prepared.checks[0]!.kind).toBe('unsupported')
  })
})
