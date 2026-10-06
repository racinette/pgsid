import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
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
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('portable Rust CHECK INET/CIDR', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-network-'))
    await pg.exec(`CREATE DOMAIN peer_address AS inet;
      CREATE TABLE network_checks (a peer_address, b inet, c cidr, flag bool, label text COLLATE "C",
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'network_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
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
})
