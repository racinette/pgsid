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
  network: 'network(a)',
  cidr: 'cidr(a)',
  cidr_cast: 'a::cidr',
  broadcast: 'broadcast(a)',
  netmask: 'netmask(a)',
  hostmask: 'hostmask(a)',
  network_cidr: 'network(c)',
  broadcast_cidr: 'broadcast(c)',
  netmask_cidr: 'netmask(c)',
  hostmask_cidr: 'hostmask(c)',
  set_inet: 'set_masklen(a, step)',
  set_cidr: 'set_masklen(c, step)',
  set_small: 'set_masklen(a, smallstep)',
  set_literal: 'set_masklen(a, -1)',
}
const expressions: Record<string, string> = {
  family: 'family(a) = step',
  masklen: 'masklen(a) = step',
  family_cidr: 'family(c) = step',
  masklen_cidr: 'masklen(c) = step',
  same_family: 'inet_same_family(a, b) = flag',
  ...Object.fromEntries(Object.entries(transforms).map(([name, sql]) => [name, `${sql} = b`])),
  merge: 'inet_merge(a, b) = d',
  merge_reverse: 'inet_merge(b, a) = d',
  lazy_merge: 'CASE WHEN flag THEN true ELSE inet_merge(a, b) = d END',
  lazy_mask: 'CASE WHEN flag THEN true ELSE set_masklen(a, step) = b END',
  scalar_case: '(CASE WHEN flag THEN network(a) ELSE c END) = b',
  coalesce: 'COALESCE(a::cidr, c) = b',
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('portable Rust CHECK network inspection and construction', () => {
  let pg: PGlite
  let oraclePg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    oraclePg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-network-functions-'))
    await pg.exec(`CREATE TABLE network_functions (a inet, b inet, c cidr, d inet,
      step integer, smallstep smallint, flag boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'network_functions')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (oraclePg && !oraclePg.closed) await oraclePg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches PGlite for raw/stored CHECKs, every mask width, errors and lazy branches', async () => {
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
    const candidate = `(SELECT $1::inet a, $2::inet b, $3::cidr c, $4::inet d,
      $5::integer step, $6::smallint smallstep, $7::boolean flag) candidate`
    const parameters = (row: Row) =>
      ['a', 'b', 'c', 'd', 'step', 'smallstep', 'flag'].map((key) => {
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
    const transformed = async (sql: string, row: Row): Promise<string | null> =>
      (
        await query<{ value: string | null }>(
          `SELECT (${sql})::text value FROM ${candidate}`,
          parameters(row),
        )
      ).rows[0]!.value
    for (const [address, width, otherFamily] of [
      ['165.90.195.60', 32, '::1'],
      ['a55a:c33c:9669:f00f:5aa5:3cc3:6996:0ff0', 128, '127.0.0.1'],
    ] as const)
      for (let prefix = 0; prefix <= width; prefix++) {
        const a = `${address}/${prefix}`
        const c = (await query<{ value: string }>('SELECT network($1::inet)::text value', [a]))
          .rows[0]!.value
        const row = {
          a: input(a),
          b: input(a),
          c: input(c),
          step: input(prefix),
          smallstep: input(prefix),
        }
        for (const name of ['family', 'masklen', 'family_cidr', 'masklen_cidr']) {
          await oracle(name, row)
          await oracle(name, {
            ...row,
            step: input(name.startsWith('family') ? (width === 32 ? 4 : 6) : prefix),
          })
          await oracle(name, { ...row, step: input(-2) })
        }
        for (const [name, sql] of Object.entries(transforms)) {
          const expected = await transformed(sql, row)
          await oracle(name, { ...row, b: input(expected) })
          await oracle(name, { ...row, b: input(otherFamily) })
        }
        const fullWidthRow = { ...row, a: input(address), c: input(`${address}/${width}`) }
        for (const name of ['set_inet', 'set_cidr']) {
          const expected = await transformed(transforms[name]!, fullWidthRow)
          await oracle(name, { ...fullWidthRow, b: input(expected) })
          await oracle(name, { ...fullWidthRow, b: input(otherFamily) })
        }
      }
    for (const width of [32, 128]) {
      const maximum = (1n << BigInt(width)) - 1n
      const spelling = (value: bigint): string =>
        width === 32
          ? [24n, 16n, 8n, 0n].map((shift) => String((value >> shift) & 255n)).join('.')
          : Array.from({ length: 8 }, (_, index) =>
              ((value >> BigInt((7 - index) * 16)) & 65535n).toString(16),
            ).join(':')
      for (let common = 0; common < width; common++) {
        const row = {
          a: input(spelling(maximum)),
          b: input(spelling(maximum - (1n << BigInt(width - common - 1)))),
          d: input(spelling(maximum)),
        }
        const expected = await transformed('inet_merge(a,b)', row)
        for (const name of ['merge', 'merge_reverse']) {
          await oracle(name, row)
          await oracle(name, { ...row, d: input(expected) })
        }
      }
    }
    const addresses = [
      null,
      '0.0.0.0/0',
      '0.0.0.0',
      '10.1.2.3/8',
      '10.1.2.4/31',
      '10.128.0.1/9',
      '11.0.0.1',
      '255.255.255.255',
      '::/0',
      '::',
      '::1',
      '::ffff:192.0.2.1/120',
      '2001:db8::1/32',
      '2001:db8:0:0:8000::1/65',
      '2001:db8::1/127',
      'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    ]
    for (const a of addresses) {
      const c = (await query<{ value: string | null }>('SELECT network($1::inet)::text value', [a]))
        .rows[0]!.value
      for (const step of [
        null,
        -2147483648,
        -2,
        -1,
        0,
        1,
        7,
        8,
        15,
        16,
        17,
        31,
        32,
        33,
        64,
        65,
        127,
        128,
        129,
        2147483647,
      ]) {
        const row = { a: input(a), c: input(c), b: input(a), step: input(step), flag: input(false) }
        for (const name of ['set_inet', 'set_cidr', 'lazy_mask']) await oracle(name, row)
        await oracle('lazy_mask', { ...row, flag: input(true) })
        for (const name of ['set_inet', 'set_cidr'])
          try {
            const expected = await transformed(transforms[name]!, row)
            await oracle(name, { ...row, b: input(expected) })
          } catch (error) {
            expect((error as { code: string }).code).toBe('22023')
          }
      }
      for (const b of addresses) {
        const row = { a: input(a), b: input(b), d: input(a), flag: input(false) }
        for (const name of ['same_family', 'merge', 'merge_reverse', 'lazy_merge'])
          await oracle(name, row)
        await oracle('same_family', { ...row, flag: input(true) })
        await oracle('lazy_merge', { ...row, flag: input(true) })
        try {
          const expected = await transformed('inet_merge(a,b)', row)
          for (const name of ['merge', 'merge_reverse'])
            await oracle(name, { ...row, d: input(expected) })
        } catch (error) {
          expect((error as { code: string }).code).toBe('22023')
        }
      }
    }
    for (const name of names)
      await oracle(
        name,
        Object.fromEntries(Object.keys(unknownRow).map((key) => [key, input(null)])),
      )
    for (const flag of [true, false])
      for (const a of [null, '10.1.2.3/8', '2001:db8::1/32'])
        for (const c of [null, '10.0.0.0/8', '2001:db8::/32']) {
          const row = { a: input(a), b: input('10.0.0.0/8'), c: input(c), flag: input(flag) }
          await oracle('scalar_case', row)
          await oracle('coalesce', row)
        }
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const otherError: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const known: Row = {
      a: input('10.1.2.3/8'),
      b: input('10.1.2.3/8'),
      c: input('10.0.0.0/8'),
      d: input('10.0.0.0/8'),
      step: input(8),
      smallstep: input(8),
      flag: input(false),
    }
    for (const value of [{ kind: 'Unknown' } as Input, { kind: 'Null' } as Input, error]) {
      for (const name of [
        'family',
        'masklen',
        'family_cidr',
        'masklen_cidr',
        ...Object.keys(transforms),
      ]) {
        const column = name.endsWith('_cidr') || name === 'set_cidr' ? 'c' : 'a'
        record(name, { ...known, [column]: value }, value as Outcome)
      }
      for (const name of ['same_family', 'merge', 'merge_reverse']) {
        record(name, { ...known, a: value }, value as Outcome)
        record(name, { ...known, b: value }, value as Outcome)
        record(
          name,
          { ...known, a: value, b: otherError },
          name === 'merge_reverse' || value.kind !== 'Error' ? otherError : error,
        )
        record(name, { ...known, a: { kind: 'Unknown' }, b: { kind: 'Null' } }, { kind: 'Unknown' })
      }
      for (const name of ['set_inet', 'set_cidr', 'set_small']) {
        const column = name === 'set_small' ? 'smallstep' : 'step'
        const address = name === 'set_cidr' ? 'c' : 'a'
        record(name, { ...known, [column]: value }, value as Outcome)
        record(
          name,
          { ...known, [address]: value, [column]: otherError },
          value.kind === 'Error' ? error : otherError,
        )
        record(
          name,
          { ...known, [address]: { kind: 'Unknown' }, [column]: input(null) },
          { kind: 'Unknown' },
        )
      }
      record(
        'lazy_merge',
        { ...known, a: value, b: otherError, flag: input(true) },
        { kind: 'True' },
      )
      record(
        'lazy_mask',
        { ...known, a: value, step: otherError, flag: input(true) },
        { kind: 'True' },
      )
      record(
        'scalar_case',
        { ...known, a: value, b: known.c!, flag: input(false) },
        { kind: 'True' },
      )
    }
    for (const name of [
      'family',
      'masklen',
      'family_cidr',
      'masklen_cidr',
      ...Object.keys(transforms),
      'same_family',
      'merge',
      'merge_reverse',
    ])
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
          ),
          `${name}: ${kind}`,
        ).toBe(true)
    await runCheckParity(directory, 'networkfunctions', group, fixtureNames, fixtures)
  }, 180000)
})
