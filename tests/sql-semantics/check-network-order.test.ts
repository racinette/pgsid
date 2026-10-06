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
  larger: 'network_larger(a,b)',
  smaller: 'network_smaller(a,b)',
  larger_cidr: 'network_larger(c,b)',
  smaller_cidr: 'network_smaller(c,b)',
  larger_right_cidr: 'network_larger(a,c)',
  smaller_right_cidr: 'network_smaller(a,c)',
}
const expressions: Record<string, string> = {
  cmp: 'pg_catalog.network_cmp(a,b) = step',
  cmp_cidr: 'network_cmp(c,b) = step',
  cmp_right_cidr: 'network_cmp(a,c) = step',
  ...Object.fromEntries(Object.entries(transforms).map(([name, sql]) => [name, `${sql} = d`])),
  cmp_null: 'network_cmp(a,b) IS NULL',
  larger_null: 'network_larger(a,b) IS NULL',
  smaller_null: 'network_smaller(a,b) IS NULL',
  lazy_cmp: 'CASE WHEN flag THEN true ELSE network_cmp(a,b) = step END',
  lazy_larger: 'CASE WHEN flag THEN true ELSE network_larger(a,b) = d END',
  lazy_smaller: 'CASE WHEN flag THEN true ELSE network_smaller(a,b) = d END',
  scalar_case: '(CASE WHEN flag THEN network_larger(a,b) ELSE c END) = d',
  coalesce: 'COALESCE(network_smaller(a,b), c) = d',
  comparison_sign:
    'CASE WHEN network_cmp(a,b) < 0 THEN a < b WHEN network_cmp(a,b) > 0 THEN a > b ELSE a = b END',
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('portable Rust CHECK network ordering functions', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-network-order-'))
    await pg.exec(`CREATE TABLE network_ordering (a inet, b inet, c cidr, d inet, step integer, flag boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'network_ordering')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches exact PGlite comparison results and selected addresses in Rust and both targets', async () => {
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
      '(SELECT $1::inet a, $2::inet b, $3::cidr c, $4::inet d, $5::integer step, $6::bool flag) candidate'
    const parameters = (row: Row) =>
      ['a', 'b', 'c', 'd', 'step', 'flag'].map((key) => {
        const value = row[key]
        return value?.kind === 'Value' ? value.value : null
      })
    const oracle = async (name: string, row: Row) => {
      const value = (
        await pg.query<{ value: boolean | null }>(
          `SELECT (${expressions[name]}) value FROM ${candidate}`,
          parameters(row),
        )
      ).rows[0]!.value
      record(name, row, outcome(value))
    }
    const observed = new Set<number>()
    const pair = async (a: string | null, b: string | null, detailed = false) => {
      const reference = (
        await pg.query<{
          c: string | null
          step: number | null
          larger: string | null
          smaller: string | null
        }>(
          'SELECT network($1::inet)::text c, network_cmp($1::inet,$2::inet) step, network_larger($1::inet,$2::inet)::text larger, network_smaller($1::inet,$2::inet)::text smaller',
          [a, b],
        )
      ).rows[0]!
      if (reference.step !== null) observed.add(reference.step)
      const row = {
        a: input(a),
        b: input(b),
        c: input(reference.c),
        d: input(reference.larger),
        step: input(reference.step),
        flag: input(false),
      }
      const core = ['cmp', 'larger', 'smaller', 'comparison_sign']
      for (const name of core) await oracle(name, row)
      await oracle('cmp', { ...row, step: input(reference.step === null ? 1 : reference.step + 1) })
      await oracle('smaller', { ...row, d: input(reference.smaller) })
      for (const name of ['larger', 'smaller'])
        await oracle(name, { ...row, d: input(a?.includes(':') ? '127.0.0.1' : '::1') })
      if (!detailed) return
      for (const name of names.filter((name) => !core.includes(name))) await oracle(name, row)
      for (const [name, sql] of Object.entries(transforms)) {
        if (name === 'larger' || name === 'smaller') continue
        const expected = (
          await pg.query<{ value: string | null }>(
            `SELECT (${sql})::text value FROM ${candidate}`,
            parameters(row),
          )
        ).rows[0]!.value
        await oracle(name, { ...row, d: input(expected) })
        await oracle(name, { ...row, d: input(expected?.includes(':') ? '127.0.0.1' : '::1') })
      }
      for (const [name, sql] of [
        ['cmp_cidr', 'network_cmp(c,b)'],
        ['cmp_right_cidr', 'network_cmp(a,c)'],
      ]) {
        const expected = (
          await pg.query<{ value: number | null }>(
            `SELECT (${sql}) value FROM ${candidate}`,
            parameters(row),
          )
        ).rows[0]!.value
        await oracle(name!, { ...row, step: input(expected) })
        await oracle(name!, { ...row, step: input(expected === null ? 1 : expected + 1) })
      }
    }
    const addresses = [
      null,
      '0.0.0.0/0',
      '0.0.0.0',
      '255.255.255.255',
      '10.0.0.1/8',
      '10.0.0.1/32',
      '10.0.0.2/32',
      '10.128.1.2/9',
      '::',
      '::1',
      '::ffff',
      '::ffff:192.0.2.1/120',
      '2001:db8::1/32',
      '2001:db8::1/128',
      '2001:db8:0:0:8000::1/65',
      'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    ]
    for (const a of addresses) for (const b of addresses) await pair(a, b, true)
    const spelling = (value: bigint, width: number): string =>
      width === 32
        ? [24n, 16n, 8n, 0n].map((shift) => String((value >> shift) & 255n)).join('.')
        : Array.from({ length: 8 }, (_, index) =>
            ((value >> BigInt((7 - index) * 16)) & 65535n).toString(16),
          ).join(':')
    for (const width of [32, 128]) {
      const maximum = (1n << BigInt(width)) - 1n
      for (let prefix = 0; prefix <= width; prefix++) {
        await pair(`${spelling(maximum, width)}/${prefix}`, `${spelling(maximum, width)}/${width}`)
        await pair(`${spelling(maximum, width)}/${width}`, `${spelling(maximum, width)}/${prefix}`)
      }
      for (let bit = 0; bit < width; bit++) {
        const changed = maximum - (1n << BigInt(bit))
        const prefix = width - bit
        await pair(`${spelling(maximum, width)}/${prefix}`, `${spelling(changed, width)}/${prefix}`)
        await pair(`${spelling(changed, width)}/${prefix}`, `${spelling(maximum, width)}/${prefix}`)
      }
    }
    for (const value of [-255, -128, -24, -1, 0, 1, 24, 128, 255])
      expect(observed.has(value), `comparison magnitude ${value}`).toBe(true)
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const otherError: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const known: Row = {
      a: input('10.0.0.1'),
      b: input('10.0.0.2'),
      c: input('10.0.0.0/8'),
      d: input('10.0.0.2'),
      step: input(-1),
      flag: input(false),
    }
    for (const value of [{ kind: 'Unknown' } as Input, { kind: 'Null' } as Input, error]) {
      for (const name of ['cmp', 'larger', 'smaller']) {
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
      for (const name of ['cmp_null', 'larger_null', 'smaller_null'])
        record(
          name,
          { ...known, a: value },
          value.kind === 'Null' ? { kind: 'True' } : (value as Outcome),
        )
      for (const name of ['lazy_cmp', 'lazy_larger', 'lazy_smaller'])
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
    }
    for (const name of [
      'cmp_cidr',
      'cmp_right_cidr',
      'larger_cidr',
      'smaller_cidr',
      'larger_right_cidr',
      'smaller_right_cidr',
    ]) {
      record(name, { ...known, c: { kind: 'Unknown' } }, { kind: 'Unknown' })
      record(name, { ...known, c: input(null) }, { kind: 'Null' })
      record(name, { ...known, c: error }, error)
    }
    for (const name of ['cmp', 'cmp_cidr', 'cmp_right_cidr', ...Object.keys(transforms)])
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
          ),
          `${name}: ${kind}`,
        ).toBe(true)
    await runCheckParity(directory, 'networkorder', group, fixtureNames, fixtures)
  }, 180000)
})
