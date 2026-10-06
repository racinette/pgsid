import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const transforms: Record<string, string> = {
  not6: '~a',
  and6: 'a & b',
  or6: 'a | b',
  trunc6: 'trunc(a)',
  not6_call: 'macaddr_not(a)',
  and6_call: 'macaddr_and(a,b)',
  or6_call: 'macaddr_or(a,b)',
  not8: '~d',
  and8: 'd & e',
  or8: 'd | e',
  trunc8: 'trunc(d)',
  set7: 'macaddr8_set7bit(d)',
  not8_call: 'macaddr8_not(d)',
  and8_call: 'macaddr8_and(d,e)',
  or8_call: 'macaddr8_or(d,e)',
  to8: 'a::macaddr8',
  to8_call: 'macaddr8(a)',
  to6: 'd::macaddr',
  to6_call: 'macaddr(d)',
  text6: 'raw::macaddr',
  text6_call: 'macaddr(raw)',
  varchar6: 'vraw::macaddr',
  text8: 'raw::macaddr8',
  text8_call: 'macaddr8(raw)',
  varchar8: 'vraw::macaddr8',
  case6: 'CASE WHEN flag THEN d ELSE a END',
  case8: 'CASE WHEN flag THEN a ELSE d END',
  coalesce6: 'COALESCE(a,d)',
  coalesce8: 'COALESCE(d,a)',
  case_then6: 'CASE WHEN flag THEN a ELSE NULL END',
  case_then8: 'CASE WHEN flag THEN d ELSE NULL END',
  eq6_mixed_call: 'a',
  eq8_mixed_call: 'd',
}
const six = new Set([
  'not6',
  'and6',
  'or6',
  'trunc6',
  'not6_call',
  'and6_call',
  'or6_call',
  'to6',
  'to6_call',
  'text6',
  'text6_call',
  'varchar6',
  'case6',
  'coalesce6',
  'case_then6',
  'eq6_mixed_call',
])
const expressions: Record<string, string> = Object.fromEntries(
  Object.entries(transforms).map(([name, sql]) => [
    name,
    name === 'eq6_mixed_call'
      ? 'macaddr_eq(a,d)'
      : name === 'eq8_mixed_call'
        ? 'macaddr8_eq(d,a)'
        : `(${sql}) = ${six.has(name) ? 'c' : 'f'}`,
  ]),
)
for (const name of ['to6', 'text6', 'text8', 'case6', 'coalesce6']) {
  expressions[name + '_null'] = `(${transforms[name]}) IS NULL`
  expressions[name + '_lazy'] = `CASE WHEN flag THEN true ELSE (${expressions[name]}) END`
}
expressions['input_cast6_null'] = 'raw::macaddr IS NULL'
expressions['input_cast8_null'] = 'raw::macaddr8 IS NULL'
expressions['set7_idempotent'] = 'macaddr8_set7bit(macaddr8_set7bit(d)) = macaddr8_set7bit(d)'
expressions['functional_literal6'] = "macaddr('0800.2b01.0203') = '08:00:2b:01:02:03'::macaddr"
expressions['functional_literal8'] =
  "macaddr8('0800:2b01:0203') = '08:00:2b:ff:fe:01:02:03'::macaddr8"
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('Rust CHECK MAC transforms and casts', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-mac-functions-'))
    await pg.exec(`CREATE TABLE hardware_transforms(a macaddr,b macaddr,c macaddr,d macaddr8,e macaddr8,f macaddr8,raw text,vraw varchar,flag boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'hardware_transforms')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('preserves PostgreSQL transforms, coercion order, SQL errors and lazy evaluation in Rust and both targets', async () => {
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => ({
          expression: lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((constraint) => constraint.name === name)!
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
      expect(check.kind, fixtureNames[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const unknownRow: Row = Object.fromEntries(
      table.columns.map((column) => [column.name, { kind: 'Unknown' }]),
    )
    const record = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + form, row: { ...unknownRow, ...row }, expected })
    }
    const candidate =
      '(SELECT $1::macaddr a,$2::macaddr b,$3::macaddr c,$4::macaddr8 d,$5::macaddr8 e,$6::macaddr8 f,$7::text raw,$8::varchar vraw,$9::bool flag) candidate'
    const parameters = (row: Row) =>
      ['a', 'b', 'c', 'd', 'e', 'f', 'raw', 'vraw', 'flag'].map((key) =>
        row[key]?.kind === 'Value' ? row[key].value : null,
      )
    let oracleErrors = 0
    const reference = async <T>(sql: string, row: Row): Promise<T | { error: string }> => {
      try {
        return (
          await pg.query<{ value: T }>(`SELECT (${sql}) value FROM ${candidate}`, parameters(row))
        ).rows[0]!.value
      } catch (error) {
        const code = (error as { code: string }).code
        expect(code).toMatch(/^22[A-Z0-9]{3}$/u)
        if (++oracleErrors % 256 === 0) {
          await pg.close()
          pg = await PGlite.create()
        }
        return { error: code }
      }
    }
    const oracle = async (name: string, row: Row) => {
      const value = await reference<boolean | null>(expressions[name]!, row)
      record(
        name,
        row,
        value !== null && typeof value === 'object'
          ? { kind: 'Error', value: { state: parseInt(value.error, 36) } }
          : outcome(value),
      )
    }
    const zero6 = '00:00:00:00:00:00',
      max6 = 'ff:ff:ff:ff:ff:ff',
      zero8 = '00:00:00:00:00:00:00:00',
      max8 = 'ff:ff:ff:ff:ff:ff:ff:ff'
    const base: Row = {
      a: input('08:00:2b:01:02:03'),
      b: input('0f:ff:ff:01:00:ff'),
      c: input(zero6),
      d: input('08:00:2b:ff:fe:01:02:03'),
      e: input('0f:ff:ff:ff:ff:00:00:ff'),
      f: input(zero8),
      raw: input('08:00:2b:01:02:03'),
      vraw: input('08:00:2b:01:02:03'),
      flag: input(false),
    }
    for (const name of ['functional_literal6', 'functional_literal8']) await oracle(name, base)
    const checkTransform = async (name: string, row: Row) => {
      const value = await reference<string | null>(`(${transforms[name]})::text`, row)
      const column = six.has(name) ? 'c' : 'f'
      const expected = value !== null && typeof value === 'object' ? input(null) : input(value)
      await oracle(name, { ...row, [column]: expected })
      if (value !== null && typeof value === 'string')
        await oracle(name, {
          ...row,
          [column]: input(
            value === (six.has(name) ? zero6 : zero8)
              ? six.has(name)
                ? max6
                : max8
              : six.has(name)
                ? zero6
                : zero8,
          ),
        })
    }
    for (const name of ['case6', 'case8', 'case_then6', 'case_then8'])
      await checkTransform(name, { ...base, flag: input(true) })
    const binary = ['and6', 'or6', 'and6_call', 'or6_call', 'and8', 'or8', 'and8_call', 'or8_call']
    for (const name of Object.keys(transforms).filter((name) => !name.startsWith('eq')))
      await checkTransform(name, base)
    for (const [width, a, b] of [
      [6, 'a', 'b'],
      [8, 'd', 'e'],
    ] as const) {
      const encode = (bytes: number[]) =>
        bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(':')
      const candidates = [
        Array(width).fill(0),
        Array(width).fill(255),
        Array(width).fill(170),
        Array(width).fill(85),
        ...Array.from({ length: width * 8 }, (_, bit) =>
          Array.from({ length: width }, (_, i) => (i === Math.floor(bit / 8) ? 2 ** (bit % 8) : 0)),
        ),
      ].map(encode)
      for (const value of candidates) {
        const row = {
          ...base,
          [a]: input(value),
          [b]: input(candidates[(candidates.indexOf(value) + 1) % candidates.length]!),
        }
        for (const name of [
          width === 6 ? 'not6' : 'not8',
          width === 6 ? 'trunc6' : 'trunc8',
          ...binary.filter((name) => name.includes(String(width))),
          ...(width === 8 ? ['set7'] : ['to8']),
        ])
          await checkTransform(name, row)
        if (width === 8) await oracle('set7_idempotent', row)
      }
    }
    for (const d of [
      '08:00:2b:ff:fe:01:02:03',
      zero8,
      max8,
      '08:00:2b:fe:fe:01:02:03',
      '08:00:2b:ff:ff:01:02:03',
      null,
    ]) {
      const row = { ...base, d: input(d) }
      for (const name of ['to6', 'to6_call', 'case6', 'coalesce6']) {
        await checkTransform(name, row)
        if (name === 'case6') await checkTransform(name, { ...row, flag: input(true) })
        if (name === 'coalesce6') await checkTransform(name, { ...row, a: input(null) })
      }
      for (const name of ['eq6_mixed_call', 'eq8_mixed_call', 'to6_null', 'to6_lazy'])
        await oracle(name, row)
      for (const name of ['to6_lazy', 'case6_lazy', 'coalesce6_lazy'])
        await oracle(name, { ...row, flag: input(true) })
    }
    const spellings = [
      null,
      '',
      'garbage',
      '08:00:2b:01:02:03',
      '0800.2b01.0203',
      '0800:2b01:0203',
      '08-00-2b-01-02-03',
      '08002b010203',
      '08:00:2b:ff:fe:01:02:03',
      '08:00-2b:01:02:03',
      '08:00:2b:01:02:03z',
      '08002b010203é',
      '0x:00:2b:01:02:03',
      '100:00:2b:01:02:03',
      '-1:00:2b:01:02:03',
      '100:00:2b:01:02:03 trailing',
      'ffffffff:00:00:00:00:00',
      '100000000:00:00:00:00:00',
      '100000001:00:00:00:00:00',
      'ffffffffffffffff:00:00:00:00:00',
      '10000000000000000:00:00:00:00:00',
      '-ffffffff:00:00:00:00:00',
      '-ffffffffffffffff:00:00:00:00:00',
      '-10000000000000000:00:00:00:00:00',
      ' \t+8:0:2b:1:2:3\r\n',
    ]
    for (const value of spellings) {
      const row = { ...base, raw: input(value), vraw: input(value) }
      for (const name of ['text6', 'text6_call', 'varchar6', 'text8', 'text8_call', 'varchar8'])
        await checkTransform(name, row)
      for (const name of ['text6_null', 'text8_null', 'input_cast6_null', 'input_cast8_null'])
        await oracle(name, row)
      for (const name of ['text6_lazy', 'text8_lazy'])
        await oracle(name, { ...row, flag: input(true) })
    }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const value of [{ kind: 'Unknown' } as Input, input(null), error]) {
      for (const [name, column] of Object.entries({
        not6: 'a',
        trunc6: 'a',
        to8: 'a',
        to6: 'd',
        not8: 'd',
        trunc8: 'd',
        set7: 'd',
        text6: 'raw',
        text8: 'raw',
        varchar6: 'vraw',
        varchar8: 'vraw',
      }))
        record(name, { ...base, [column]: value }, value as Outcome)
      for (const name of binary) {
        const [a, b] = name.includes('6') ? ['a', 'b'] : ['d', 'e']
        record(name, { ...base, [a!]: value }, value as Outcome)
        record(name, { ...base, [b!]: value }, value as Outcome)
        record(name, { ...base, [a!]: value, [b!]: other }, value.kind === 'Error' ? error : other)
        record(name, { ...base, [a!]: other, [b!]: value }, other)
      }
      for (const name of ['to6_lazy', 'text6_lazy', 'text8_lazy'])
        record(
          name,
          { ...base, a: value, d: value, raw: value, flag: input(true) },
          { kind: 'True' },
        )
      for (const name of ['case6', 'case8'])
        record(
          name,
          { ...base, flag: value },
          value.kind === 'Null' ? { kind: 'False' } : (value as Outcome),
        )
    }
    for (const name of ['text6', 'text8'])
      record(name, { ...base, raw: input('0'.repeat(257)) }, { kind: 'Unknown' })
    for (const name of Object.keys(transforms).filter((name) => !name.startsWith('eq'))) {
      const column = six.has(name) ? 'a' : 'd'
      if (
        !fixtures.some(
          (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === 'Null',
        )
      )
        await oracle(name, {
          ...base,
          [column]: input(null),
          a: input(null),
          b: input(null),
          d: input(null),
          e: input(null),
          raw: input(null),
          vraw: input(null),
        })
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
          ),
          `${name}: ${kind}`,
        ).toBe(true)
    }
    for (const name of ['to6', 'text6', 'text8', 'case6', 'coalesce6'])
      expect(
        fixtures.some(
          (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === 'Error',
        ),
        name,
      ).toBe(true)
    await runCheckParity(directory, 'mactransforms', group, fixtureNames, fixtures)
  }, 180000)
})
