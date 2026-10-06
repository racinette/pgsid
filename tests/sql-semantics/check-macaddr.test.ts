import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { catalogCheckGroups, lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const operators = { eq: '=', ne: '<>', lt: '<', le: '<=', gt: '>', ge: '>=' }
const sixForms = [
  '08:00:2b:01:02:03',
  '08-00-2b-01-02-03',
  '08002b:010203',
  '08002b-010203',
  '0800.2b01.0203',
  '0800-2b01-0203',
  '08002b010203',
]
const eightForms = [
  '08:00:2b:01:02:03:04:05',
  '08-00-2b-01-02-03-04-05',
  '08002b:0102030405',
  '08002b-0102030405',
  '0800.2b01.0203.0405',
  '08002b01:02030405',
  '08002b0102030405',
]
const expressions: Record<string, string> = {}
for (const [type, a, b, c] of [
  ['macaddr', 'a', 'b', 'c'],
  ['macaddr8', 'd', 'e', 'f'],
]) {
  for (const [suffix, op] of Object.entries(operators)) {
    expressions[`${type}_${suffix}`] = `${a} ${op} ${b}`
    expressions[`${type}_${suffix}_call`] = `${type}_${suffix}(${a},${b})`
  }
  Object.assign(expressions, {
    [`${type}_cmp`]: `${type}_cmp(${a},${b}) = step`,
    [`${type}_is_null`]: `${a} IS NULL`,
    [`${type}_is_not_null`]: `${a} IS NOT NULL`,
    [`${type}_searched`]: `(CASE WHEN flag THEN ${a} ELSE ${b} END) = ${c}`,
    [`${type}_simple`]: `CASE ${a} WHEN ${b} THEN true ELSE false END`,
    [`${type}_coalesce`]: `COALESCE(${a}, ${b}) = ${c}`,
    [`${type}_in`]: `${a} IN (${b},${c})`,
    [`${type}_between`]: `${a} BETWEEN ${b} AND ${c}`,
    [`${type}_literal`]: `${a} = '08:00:2b:01:02:03'::${type}`,
    [`${type}_typed_null`]: `COALESCE(NULL::${type}, ${a}) = ${b}`,
    [`${type}_lazy`]: `CASE WHEN flag THEN true ELSE ${a} = ${b} END`,
  })
}
for (const [index, form] of sixForms.entries())
  expressions[`literal6_${index}`] = `'${form}'::macaddr = '08:00:2b:01:02:03'::macaddr`
for (const [index, form] of [...sixForms, ...eightForms, '0800:2b01:0203'].entries())
  expressions[`literal8_${index}`] =
    `'${form}'::macaddr8 = '${index < sixForms.length || form === '0800:2b01:0203' ? '08:00:2b:ff:fe:01:02:03' : eightForms[0]}'::macaddr8`
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('portable Rust CHECK MAC addresses', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-macaddr-'))
    await pg.exec(`CREATE TABLE hardware_addresses (a macaddr, b macaddr, c macaddr,
      d macaddr8, e macaddr8, f macaddr8, step integer, flag boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});`)
    await pg.exec(`CREATE DOMAIN unicast_mac AS macaddr CONSTRAINT unicast_mac_present CHECK (VALUE > '00:00:00:00:00:00'::macaddr);
      CREATE DOMAIN unicast_mac8 AS macaddr8 CONSTRAINT unicast_mac8_present CHECK (VALUE > '00:00:00:00:00:00:00:00'::macaddr8);`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'hardware_addresses')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches PostgreSQL parsing, byte ordering and control flow in native Rust, Go and TypeScript', async () => {
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
    const oracle = async (name: string, row: Row) => {
      const parameters = ['a', 'b', 'c', 'd', 'e', 'f', 'step', 'flag'].map((key) =>
        row[key]?.kind === 'Value' ? row[key].value : null,
      )
      const value = (
        await pg.query<{ value: boolean | null }>(
          `SELECT (${expressions[name]}) value FROM
        (SELECT $1::macaddr a, $2::macaddr b, $3::macaddr c, $4::macaddr8 d, $5::macaddr8 e, $6::macaddr8 f, $7::integer step, $8::bool flag) candidate`,
          parameters,
        )
      ).rows[0]!.value
      record(name, row, outcome(value))
    }
    for (const name of names.filter((name) => name.startsWith('literal'))) await oracle(name, {})
    const signs = new Set<number>()
    for (const [type, a, b, c, size] of [
      ['macaddr', 'a', 'b', 'c', 6],
      ['macaddr8', 'd', 'e', 'f', 8],
    ] as const) {
      const zero = Array(size).fill('00').join(':')
      const maximum = Array(size).fill('ff').join(':')
      const spell = (bytes: readonly number[]) =>
        bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(':')
      const addresses = [
        null,
        zero,
        maximum,
        type === 'macaddr' ? sixForms[0]! : '08:00:2b:ff:fe:01:02:03',
        ...Array.from({ length: size }, (_, index) =>
          spell(Array.from({ length: size }, (_, i) => (i === index ? 128 : 0))),
        ),
        ...Array.from({ length: size }, (_, index) =>
          spell(Array.from({ length: size }, (_, i) => (i === index ? 127 : 255))),
        ),
      ]
      for (const left of addresses)
        for (const right of addresses) {
          const step = (
            await pg.query<{ value: number | null }>(
              `SELECT ${type}_cmp($1::${type},$2::${type}) value`,
              [left, right],
            )
          ).rows[0]!.value
          if (step !== null) signs.add(step)
          const row: Row = {
            [a]: input(left),
            [b]: input(right),
            [c]: input(maximum),
            step: input(step),
            flag: input(false),
          }
          for (const name of names.filter((name) => name.startsWith(type + '_')))
            await oracle(name, row)
          await oracle(type + '_cmp', { ...row, step: input(step === null ? 1 : step + 1) })
          await oracle(type + '_searched', { ...row, [c]: input(left), flag: input(true) })
        }
      const valid =
        type === 'macaddr'
          ? [
              ...sixForms,
              '+8:0:2b:1:2:3',
              '0x08:0x00:0x2b:0x01:0x02:0x03',
              '8:0:2B:1:2:3',
              '-0:0:0:0:0:0',
              '00000008:0:2b:1:2:3',
            ]
          : [
              ...sixForms,
              ...eightForms,
              '0800:2b01:0203',
              '08:00:2b:01:02:03z',
              '08:00:2b:01:02:03:',
              '08002b0102034',
              '08002b0102030405z',
              '08002b0102030405:',
            ]
      for (const original of valid)
        for (const spelling of [original, original.toUpperCase(), ' \t' + original + '\r\n']) {
          let canonical: string
          try {
            canonical = (
              await pg.query<{ value: string }>(`SELECT $1::${type}::text value`, [spelling])
            ).rows[0]!.value
          } catch {
            expect(spelling).not.toBe(original)
            record(type + '_eq', { [a]: input(spelling), [b]: input(zero) }, { kind: 'Unknown' })
            continue
          }
          const row = { [a]: input(spelling), [b]: input(canonical) }
          await oracle(type + '_eq', row)
          await oracle(type + '_cmp', { ...row, step: input(0) })
        }
      let state = 12345
      for (let sample = 0; sample < 64; sample++) {
        const bytes = Array.from({ length: size }, () => {
          state = (state * 1664525 + 1013904223) >>> 0
          return state >>> 24
        })
        const canonical = spell(bytes)
        const separator = [':', '-', '.', ''][sample % 4]!
        const spelling =
          type === 'macaddr' && separator === '.'
            ? bytes
                .map((byte) => byte.toString(16).padStart(2, '0'))
                .join('')
                .match(/.{4}/g)!
                .join('.')
            : bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(separator)
        await oracle(type + '_eq', { [a]: input(spelling), [b]: input(canonical) })
      }
      for (const spelling of [
        '',
        'garbage',
        '08:00:2b:01:02',
        '08:00:2g:01:02:03',
        '08:00-2b:01:02:03',
        '08:00:2b:01:02:03 trailing',
        '08:00:2b:01:02:03:04:05:06',
        '100:00:2b:01:02:03',
        '0x0800010203',
        '0x:00:2b:01:02:03',
        '08002b010203é',
        '08002b010203💾',
      ]) {
        await expect(pg.query(`SELECT $1::${type}`, [spelling])).rejects.toMatchObject({
          code: expect.any(String),
        })
        record(type + '_eq', { [a]: input(spelling), [b]: input(zero) }, { kind: 'Unknown' })
      }
      for (const spelling of ['0'.repeat(257), '08002b010203\0'])
        record(type + '_eq', { [a]: input(spelling), [b]: input(zero) }, { kind: 'Unknown' })
      const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
      const otherError: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
      const known: Row = {
        [a]: input(zero),
        [b]: input(maximum),
        [c]: input(maximum),
        step: input(-1),
        flag: input(false),
      }
      for (const flag of [{ kind: 'Unknown' } as Input, error])
        record(type + '_searched', { ...known, flag }, flag as Outcome)
      await oracle(type + '_searched', { ...known, flag: input(null) })
      for (const value of [{ kind: 'Unknown' } as Input, input(null), error]) {
        for (const name of [
          ...Object.keys(operators),
          ...Object.keys(operators).map((op) => op + '_call'),
          'cmp',
        ]) {
          record(type + '_' + name, { ...known, [a]: value }, value as Outcome)
          record(type + '_' + name, { ...known, [b]: value }, value as Outcome)
          record(
            type + '_' + name,
            { ...known, [a]: value, [b]: otherError },
            value.kind === 'Error' ? error : otherError,
          )
          record(type + '_' + name, { ...known, [a]: otherError, [b]: value }, otherError)
          record(
            type + '_' + name,
            { ...known, [a]: { kind: 'Unknown' }, [b]: input(null) },
            { kind: 'Unknown' },
          )
        }
        for (const name of ['is_null', 'is_not_null'])
          record(
            type + '_' + name,
            { ...known, [a]: value },
            value.kind === 'Null'
              ? { kind: name === 'is_null' ? 'True' : 'False' }
              : (value as Outcome),
          )
        record(
          type + '_lazy',
          { ...known, [a]: value, [b]: otherError, flag: input(true) },
          { kind: 'True' },
        )
        record(
          type + '_searched',
          { ...known, [a]: value, [b]: input(maximum), [c]: input(maximum), flag: input(false) },
          { kind: 'True' },
        )
        record(
          type + '_coalesce',
          { ...known, [a]: value },
          value.kind === 'Null' ? { kind: 'True' } : (value as Outcome),
        )
      }
      for (const name of [
        ...Object.keys(operators),
        ...Object.keys(operators).map((op) => op + '_call'),
        'cmp',
        'searched',
        'coalesce',
        'in',
        'between',
        'literal',
        'typed_null',
      ])
        for (const kind of ['True', 'False', 'Null'])
          expect(
            fixtures.some(
              (fixture) =>
                fixture.name === type + '_' + name + '_raw' && fixture.expected.kind === kind,
            ),
            `${type}_${name}: ${kind}`,
          ).toBe(true)
    }
    expect([...signs].sort()).toEqual([-1, 0, 1])
    await runCheckParity(directory, 'macaddress', group, fixtureNames, fixtures)
  }, 180000)
  it('evaluates domain CHECKs with their underlying MAC value types', async () => {
    const domains = catalogCheckGroups([], catalog.domains).filter(
      (group) => group.kind === 'domain',
    )
    expect(domains.map((group) => group.source.name).sort()).toEqual([
      'unicast_mac',
      'unicast_mac8',
    ])
    const names = domains.map((domain) => domain.name)
    const group = prepareCheckRustGroup(
      domains.map((domain) => ({
        expression: domain.checks[0]!.plan.expression,
        identity: {
          schema: domain.source.schema,
          kind: 'domain' as const,
          owner: domain.source.name,
          constraint: domain.checks[0]!.plan.name,
        },
      })),
    )
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const domain of domains) {
      const type = domain.source.name === 'unicast_mac' ? 'macaddr' : 'macaddr8'
      const zero = Array(type === 'macaddr' ? 6 : 8)
        .fill('00')
        .join(':')
      for (const value of [null, zero, '08:00:2b:01:02:03']) {
        const expected = (
          await pg.query<{ value: boolean | null }>(`SELECT $1::${type} > $2::${type} value`, [
            value,
            zero,
          ])
        ).rows[0]!.value
        fixtures.push({
          name: domain.name,
          row: { value: input(value) },
          expected: outcome(expected),
        })
      }
      fixtures.push({
        name: domain.name,
        row: { value: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
      const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
      fixtures.push({ name: domain.name, row: { value: error }, expected: error as Outcome })
    }
    await mkdir(join(directory, 'domains'))
    await runCheckParity(join(directory, 'domains'), 'macdomains', group, names, fixtures)
  }, 180000)
  it('defers ambiguous mixed comparisons and unported output callables', () => {
    for (const sql of [
      'a = d',
      'CASE a WHEN d THEN true ELSE false END',
      'hashmacaddr(a) > 0',
      "macaddr_send(a) <> '\\x'::bytea",
    ]) {
      const expression = lowerTableCheck(
        table,
        { name: 'unsupported', type: 'check', definition: `CHECK (${sql})` },
        [],
        catalog.domains,
      )!.expression
      const group = prepareCheckRustGroup([
        {
          expression,
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: 'unsupported',
          },
        },
      ])
      const check = group.checks[0]!
      if (check.kind === 'supported')
        expect(group.evaluatorSource, sql).toContain('check_unknown()')
      else expect(check.kind, sql).toBe('unsupported')
    }
  })
})
