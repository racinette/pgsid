import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { builtinCast } from '../../src/postgres/builtins/inventory.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const expressions: Record<string, string> = {}
for (const column of [
  'enabled',
  'address',
  'scope',
  'domain_enabled',
  'domain_address',
  'domain_scope',
])
  for (const [index, target] of [
    'varchar',
    'varchar(1)',
    'varchar(5)',
    'varchar(20)',
    'bpchar',
    'char(1)',
    'char(5)',
    'char(20)',
  ].entries())
    expressions[`${column}_${index}`] = `${column}::${target}::text IS NOT DISTINCT FROM note`
Object.assign(expressions, {
  boolean_case:
    '(CASE WHEN choose THEN enabled ELSE domain_enabled END)::varchar(4)::text IS NOT DISTINCT FROM note',
  network_coalesce: 'COALESCE(scope,address)::varchar(8)::text IS NOT DISTINCT FROM note',
  network_nullif: 'NULLIF(address,scope)::char(20)::text IS NOT DISTINCT FROM note',
  network_greatest: 'GREATEST(address,scope)::varchar(10)::text IS NOT DISTINCT FROM note',
  boolean_error: '(amount/divisor > 0)::varchar(5)::text IS NOT DISTINCT FROM note',
  network_error: '(address + offset_value)::char(20)::text IS NOT DISTINCT FROM note',
  lazy: 'CASE WHEN choose THEN true ELSE (amount/divisor > 0)::varchar(5)::text = note END',
  constant_error: 'CASE WHEN choose THEN true ELSE (1/0 > 0)::varchar(5)::text = note END',
  skipped_constant: 'CASE WHEN false THEN (1/0 > 0)::varchar(5)::text = note ELSE true END',
})
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const signatures = (value: unknown): string[] => {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, field]) =>
    key === 'signature' && typeof field === 'string' ? [field] : signatures(field),
  )
}

describe('catalog character casts from Boolean and network values', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-character-sources-'))
    await pg.exec(`CREATE DOMAIN enabled_value AS boolean;
      CREATE DOMAIN address_value AS inet; CREATE DOMAIN scope_value AS cidr;
      CREATE TABLE character_sources (
        enabled boolean,address inet,scope cidr,domain_enabled enabled_value,
        domain_address address_value,domain_scope scope_value,note text COLLATE "C",
        choose boolean,amount integer,divisor integer,offset_value bigint,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')})`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'character_sources')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches raw/stored catalog paths, widths, domains, composition, lazy errors and partial inputs', async () => {
    const entries = Object.entries(expressions).flatMap(([name, sql]) =>
      ['raw', 'stored'].map((form) => ({
        name: `${form}_${name}`,
        expression: lowerTableCheck(
          table,
          form === 'raw'
            ? { name, type: 'check', definition: `CHECK (${sql})` }
            : table.constraints.find((constraint) => constraint.name === name)!,
          catalog.enums,
          catalog.domains,
        )!.expression,
      })),
    )
    const group = prepareCheckRustGroup(
      entries.map(({ name, expression }) => {
        expect(hasUncertain(expression), name).toBe(false)
        return {
          expression,
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
        }
      }),
    )
    group.checks.forEach((check, index) =>
      expect(check.kind, entries[index]!.name).toBe('supported'),
    )
    for (const [column, source] of [
      ['enabled', 'pg_catalog.bool'],
      ['address', 'pg_catalog.inet'],
      ['scope', 'pg_catalog.cidr'],
    ] as const)
      for (const target of ['pg_catalog."varchar"', 'pg_catalog.bpchar']) {
        const expression = entries.find(
          (entry) => entry.name === `raw_${column}_${target === 'pg_catalog.bpchar' ? 4 : 0}`,
        )!.expression
        expect(signatures(expression)).toContain(builtinCast(source, target)!.implementation)
      }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: `${form}_${name}`, row, expected })
    }
    const defaults = (): Row => ({
      enabled: input(true),
      address: input('192.0.2.1'),
      scope: input('192.0.2.0/24'),
      domain_enabled: input(false),
      domain_address: input('::1'),
      domain_scope: input('::/0'),
      note: input('true'),
      choose: input(false),
      amount: input(1),
      divisor: input(1),
      offset_value: input(0n),
    })
    const oracle = async (name: string, row: Row) => {
      const args = Object.values(row).map((value) =>
        value.kind === 'Null' ? null : value.kind === 'Value' ? value.value : undefined,
      )
      expect(args.every((value) => value !== undefined)).toBe(true)
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `WITH candidate AS MATERIALIZED (SELECT
            $1::boolean AS enabled,$2::inet AS address,$3::cidr AS scope,$4::enabled_value AS domain_enabled,
            $5::address_value AS domain_address,$6::scope_value AS domain_scope,$7::text COLLATE "C" AS note,
            $8::boolean AS choose,$9::integer AS amount,$10::integer AS divisor,$11::bigint AS offset_value)
            SELECT (${expressions[name]}) AS value FROM candidate`,
            args,
          )
        ).rows[0]!.value
        expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        const code = (error as { code: string }).code
        expect(['22003', '22012']).toContain(code)
        expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
      }
      add(name, row, expected)
    }
    for (const enabled of [true, false, null])
      for (const [address, scope] of [
        ['192.0.2.1', '192.0.2.0/24'],
        ['2001:db8::1/64', '2001:db8::/32'],
        ['::ffff:192.0.2.1', '::/0'],
        [null, null],
      ] as const)
        for (const note of [
          null,
          'true',
          'false',
          't',
          'f',
          'fals',
          '192.0.2.1/32',
          '192.0',
          '::',
          'different',
        ]) {
          const row = {
            ...defaults(),
            enabled: input(enabled),
            address: input(address),
            scope: input(scope),
            domain_enabled: input(enabled),
            domain_address: input(address),
            domain_scope: input(scope),
            note: input(note),
          }
          for (const name of Object.keys(expressions)) await oracle(name, row)
        }
    for (const choose of [false, true]) {
      const row = { ...defaults(), divisor: input(0), choose: input(choose) }
      for (const name of ['boolean_error', 'lazy', 'constant_error', 'skipped_constant'])
        await oracle(name, row)
      await oracle('network_error', {
        ...row,
        address: input('255.255.255.255'),
        offset_value: input(1n),
      })
    }
    for (const name of Object.keys(expressions).filter((name) =>
      /^(enabled|address|scope)_/u.test(name),
    )) {
      const column = name.split('_')[0]!
      for (const state of [
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22003', 36) } },
      ] as const)
        add(name, { ...defaults(), [column]: state }, state)
    }
    await runCheckParity(
      directory,
      'charactersources',
      group,
      entries.map((entry) => entry.name),
      fixtures,
    )
  })
})
