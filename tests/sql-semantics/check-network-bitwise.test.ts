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
  complement: '~a',
  complement_cidr: '~c',
  direct_complement: 'pg_catalog.inetnot(a)',
  intersection: 'a & b',
  union: 'a | b',
  direct_intersection: 'pg_catalog.inetand(a,b)',
  direct_union: 'pg_catalog.inetor(a,b)',
  cidr_intersection: 'c & b',
  cidr_union: 'c | b',
  right_cidr_intersection: 'a & c',
  right_cidr_union: 'a | c',
  both_cidr_intersection: 'c & c',
  both_cidr_union: 'c | c',
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(Object.entries(transforms).map(([name, sql]) => [name, `(${sql}) = d`])),
  double_complement: '~(~a) = a',
  network_mask: 'a & netmask(a) = set_masklen(network(a), -1)',
  broadcast_mask: 'a | hostmask(a) = set_masklen(broadcast(a), -1)',
  complement_null: '(~a) IS NULL',
  intersection_null: '(a & b) IS NULL',
  union_null: '(a | b) IS NULL',
  lazy_intersection: 'CASE WHEN flag THEN true ELSE (a & b) = d END',
  lazy_union: 'CASE WHEN flag THEN true ELSE (a | b) = d END',
  scalar_case: '(CASE WHEN flag THEN a & b ELSE c END) = d',
  coalesce: 'COALESCE(a | b, c) = d',
}
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('portable Rust CHECK network bitwise operators', () => {
  let pg: PGlite
  let oraclePg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    oraclePg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-network-bitwise-'))
    await pg.exec(`CREATE DOMAIN peer_address AS inet;
      CREATE TABLE network_bits (a peer_address, b inet, c cidr, d inet, flag boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'network_bits')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (oraclePg && !oraclePg.closed) await oraclePg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches PGlite for raw/stored expressions, address bits, prefixes and value states', async () => {
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
    let failures = 0
    const query = async <T>(sql: string, parameters: unknown[]) => {
      // Repeated SQL errors consume this embedded PostgreSQL build's stack.
      if (failures >= 512) {
        await oraclePg.close()
        oraclePg = await PGlite.create()
        failures = 0
      }
      try {
        return await oraclePg.query<T>(sql, parameters)
      } catch (error) {
        failures++
        throw error
      }
    }
    const candidate =
      '(SELECT $1::inet a, $2::inet b, $3::cidr c, $4::inet d, $5::bool flag) candidate'
    const parameters = (row: Row) =>
      ['a', 'b', 'c', 'd', 'flag'].map((key) => {
        const value = row[key]
        return value?.kind === 'Value' ? value.value : null
      })
    const oracle = async (name: string, row: Row) => {
      let expected: Outcome
      try {
        const value = (
          await query<{ value: boolean | null }>(
            `SELECT (${expressions[name]}) value FROM ${candidate}`,
            parameters(row),
          )
        ).rows[0]!.value
        expected = outcome(value)
      } catch (error) {
        expect((error as { code: string }).code, `${name}: ${(error as Error).message}`).toBe(
          '22023',
        )
        expected = { kind: 'Error', value: { state: parseInt('22023', 36) } }
      }
      record(name, row, expected)
    }
    const matchesTransform = async (name: string, row: Row) => {
      try {
        const value = (
          await query<{ value: string | null }>(
            `SELECT (${transforms[name]})::text value FROM ${candidate}`,
            parameters(row),
          )
        ).rows[0]!.value
        await oracle(name, { ...row, d: input(value) })
        const otherFamily = value?.includes(':') ? '127.0.0.1' : '::1'
        await oracle(name, { ...row, d: input(otherFamily) })
      } catch (error) {
        expect((error as { code: string }).code).toBe('22023')
        await oracle(name, row)
      }
    }
    const addresses = [
      null,
      '0.0.0.0/0',
      '0.0.0.0',
      '255.255.255.255/0',
      '255.255.255.255',
      '165.90.195.60/1',
      '165.90.195.60/17',
      '165.90.195.60/31',
      '90.165.60.195/9',
      '10.1.2.3/24',
      '::/0',
      '::',
      '::1',
      'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff/0',
      'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
      'a55a:c33c:9669:f00f:5aa5:3cc3:6996:ff0/65',
      '5aa5:3cc3:6996:ff0:a55a:c33c:9669:f00f/127',
      '::ffff:192.0.2.1/120',
    ]
    for (const a of addresses) {
      const c = (await query<{ value: string | null }>('SELECT network($1::inet)::text value', [a]))
        .rows[0]!.value
      for (const b of addresses) {
        const row = { a: input(a), b: input(b), c: input(c), d: input(a), flag: input(false) }
        for (const name of names) await oracle(name, row)
        for (const name of Object.keys(transforms)) await matchesTransform(name, row)
        for (const name of ['lazy_intersection', 'lazy_union'])
          await oracle(name, { ...row, flag: input(true) })
      }
    }
    const spelling = (value: bigint, width: number): string =>
      width === 32
        ? [24n, 16n, 8n, 0n].map((shift) => String((value >> shift) & 255n)).join('.')
        : Array.from({ length: 8 }, (_, index) =>
            ((value >> BigInt((7 - index) * 16)) & 65535n).toString(16),
          ).join(':')
    for (const width of [32, 128]) {
      const maximum = (1n << BigInt(width)) - 1n
      for (let bit = 0; bit < width; bit++) {
        const single = 1n << BigInt(bit)
        const row = {
          a: input(`${spelling(single, width)}/${bit}`),
          b: input(`${spelling(maximum - single, width)}/${width - bit}`),
          c: input(`${spelling(single, width)}/${width}`),
          d: input('::'),
          flag: input(false),
        }
        for (const name of [
          'complement',
          'complement_cidr',
          'intersection',
          'union',
          'right_cidr_intersection',
          'right_cidr_union',
        ])
          await matchesTransform(name, row)
        for (const name of ['double_complement', 'network_mask', 'broadcast_mask'])
          await oracle(name, row)
      }
    }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const otherError: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const known: Row = {
      a: input('10.1.2.3/24'),
      b: input('255.255.255.0'),
      c: input('10.1.2.0/24'),
      d: input('10.1.2.0'),
      flag: input(false),
    }
    const binaryNames = ['intersection', 'union', 'direct_intersection', 'direct_union']
    for (const value of [{ kind: 'Unknown' } as Input, { kind: 'Null' } as Input, error]) {
      for (const name of [
        'complement',
        'direct_complement',
        'double_complement',
        'network_mask',
        'broadcast_mask',
      ])
        record(name, { ...known, a: value }, value as Outcome)
      record('complement_cidr', { ...known, c: value }, value as Outcome)
      for (const name of binaryNames) {
        record(name, { ...known, a: value }, value as Outcome)
        record(name, { ...known, b: value }, value as Outcome)
        record(
          name,
          { ...known, a: value, b: otherError },
          value.kind === 'Error' ? error : otherError,
        )
        record(name, { ...known, a: otherError, b: value }, otherError)
        record(name, { ...known, a: { kind: 'Unknown' }, b: input(null) }, { kind: 'Unknown' })
        record(name, { ...known, a: input(null), b: { kind: 'Unknown' } }, { kind: 'Unknown' })
      }
      for (const name of ['lazy_intersection', 'lazy_union'])
        record(name, { ...known, a: value, b: otherError, flag: input(true) }, { kind: 'True' })
      record(
        'scalar_case',
        { ...known, a: value, b: otherError, d: known.c!, flag: input(false) },
        { kind: 'True' },
      )
      record(
        'coalesce',
        { ...known, a: value, d: known.c! },
        value.kind === 'Null' ? { kind: 'True' } : (value as Outcome),
      )
      for (const name of ['complement_null', 'intersection_null', 'union_null'])
        record(
          name,
          { ...known, a: value },
          value.kind === 'Null' ? { kind: 'True' } : (value as Outcome),
        )
    }
    for (const name of [
      'cidr_intersection',
      'cidr_union',
      'right_cidr_intersection',
      'right_cidr_union',
      'both_cidr_intersection',
      'both_cidr_union',
    ]) {
      record(name, { ...known, c: { kind: 'Unknown' } }, { kind: 'Unknown' })
      record(name, { ...known, c: input(null) }, { kind: 'Null' })
      record(name, { ...known, c: error }, error)
    }
    for (const name of Object.keys(transforms))
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
          ),
          `${name}: ${kind}`,
        ).toBe(true)
    await runCheckParity(directory, 'networkbitwise', group, fixtureNames, fixtures)
  }, 180000)
})
