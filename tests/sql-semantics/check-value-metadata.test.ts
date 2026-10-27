import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  isTypeFormatCallable,
  isCollationMetadataCallable,
} from '../../src/sql-semantics/metadata-callables.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { checkUnknownMessage } from '../../src/codegen/shared/check-diagnostics.js'

const packet = 'artifacts/goal-checks/metadata-branches-active'
const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const fail = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('admits only the native stable non-strict metadata shapes', () => {
  for (const predicate of [isTypeFormatCallable, isCollationMetadataCallable]) {
    const functions = builtinCallables().filter(predicate)
    expect(functions).toHaveLength(1)
    const fn = functions[0]!
    expect(predicate({ ...fn, schema: 'custom' })).toBe(false)
    expect(predicate({ ...fn, strict: true })).toBe(false)
    expect(predicate({ ...fn, volatility: 'i' })).toBe(false)
    expect(predicate({ ...fn, returnsSet: true })).toBe(false)
    expect(predicate({ ...fn, result: 'pg_catalog.bool' })).toBe(false)
    expect(predicate({ ...fn, args: [...fn.args, 'pg_catalog.bool'] })).toBe(false)
  }
})

it('formats only NULL and invalid type sentinels locally while preserving eager errors and catalog requirements', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-type-metadata-'))
  try {
    await pg.exec(`CREATE TYPE metadata_type AS ENUM('ready')`)
    const typeOid = (await pg.query<{ id: number }>(`SELECT 'metadata_type'::regtype::oid::int id`))
      .rows[0]!.id
    const forms = [
      { name: 'value', value: 'pg_catalog.format_type(type_id,modifier)', bool: false },
      { name: 'nullness', value: 'pg_catalog.format_type(type_id,modifier) IS NULL', bool: true },
      { name: 'eager', value: 'pg_catalog.format_type(type_id,modifier/denominator)', bool: false },
    ].map((f) => ({
      ...f,
      expression: `CASE WHEN bypass THEN true ELSE (${f.value}) IS NOT DISTINCT FROM ${f.bool ? 'expected_bool' : 'expected_text'} END`,
    }))
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE metadata_${f.name}(type_id oid,modifier int,denominator int,expected_text text COLLATE "C",expected_bool bool,bypass bool,CHECK(${f.expression}))`,
      )
    const c = await snapshotCatalog(pg),
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const f of forms)
      for (const origin of ['source', 'stored'] as const) {
        const t = c.tables.find((t) => t.name === 'metadata_' + f.name)!
        const lower = lowerTableCheck(
          t,
          t.constraints[0]!,
          c.enums,
          c.domains,
          origin,
          c.rangeTypes,
          c.compositeTypeGraph,
          origin === 'source' ? `CHECK(${f.expression})` : undefined,
        )!
        expect(
          hasUncertain(lower.expression),
          f.name + origin + JSON.stringify(lower.expression),
        ).toBe(false)
        expect(checkUnknownMessage(lower.expression)).toContain('catalog')
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: t.name,
            constraint: f.name + '_' + origin,
          },
          expression: portableCheckAtoms(lower.expression),
        })
      }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C' })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.identity.constraint + JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    for (const f of forms)
      for (const id of [null, 0, typeOid, typeOid + 1000000])
        for (const modifier of [null, -2147483648, -1, 0, 4, 655364, 2147483647])
          for (const denominator of f.name === 'eager' ? [0, 1] : [1]) {
            let output: string | boolean | null = null,
              native: Outcome = { kind: 'True' }
            try {
              output = (
                await pg.query<{ value: string | boolean | null }>(
                  `WITH args AS MATERIALIZED(SELECT $1::oid type_id,$2::int modifier,$3::int denominator)SELECT ${f.value} value FROM args`,
                  [id, modifier, denominator],
                )
              ).rows[0]!.value
            } catch (e) {
              const code = (e as { code?: string }).code
              if (!code) throw e
              native = fail(code)
            }
            const expected: Outcome =
              native.kind === 'True' && id !== null && id !== 0 ? { kind: 'Unknown' } : native
            const row: Row = {
              type_id: known(id === null ? null : BigInt(id)),
              modifier: known(modifier),
              denominator: known(denominator),
              expected_text: known(f.bool ? null : (output as string | null)),
              expected_bool: known(f.bool ? (output as boolean | null) : null),
              bypass: known(false),
            }
            for (const origin of ['source', 'stored']) {
              const name = f.name + '_' + origin
              fixtures.push({ name, row, expected })
              if (expected.kind === 'True')
                fixtures.push({
                  name,
                  row: {
                    ...row,
                    ...(f.bool
                      ? { expected_bool: known(!output) }
                      : { expected_text: known('wrong') }),
                  },
                  expected: { kind: 'False' },
                })
            }
            observations.push({ form: f.name, id, modifier, denominator, output, native, expected })
          }
    for (const origin of ['source', 'stored'])
      for (const id of [null, 0])
        for (const form of ['value', 'eager'])
          fixtures.push({
            name: form + '_' + origin,
            row: {
              type_id: known(id === null ? null : 0n),
              modifier: { kind: 'Unknown' },
              denominator: known(1),
              expected_text: known(id === null ? null : '-'),
              expected_bool: known(null),
              bypass: known(false),
            },
            expected: form === 'value' ? { kind: 'True' } : { kind: 'Unknown' },
          })
    for (const origin of ['source', 'stored']) {
      const row: Row = {
        type_id: { kind: 'Unknown' },
        modifier: known(null),
        denominator: known(1),
        expected_text: known(null),
        expected_bool: known(null),
        bypass: known(false),
      }
      fixtures.push({ name: 'value_' + origin, row, expected: { kind: 'Unknown' } })
      fixtures.push({
        name: 'value_' + origin,
        row: { ...row, modifier: fail('22012') as Input },
        expected: fail('22012'),
      })
      fixtures.push({
        name: 'value_' + origin,
        row: { ...row, type_id: fail('22003') as Input, modifier: fail('22012') as Input },
        expected: fail('22003'),
      })
      fixtures.push({
        name: 'value_' + origin,
        row: { ...row, bypass: known(true) },
        expected: { kind: 'True' },
      })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/format-summary.json',
      JSON.stringify({ checks: plans.length, fixtures: fixtures.length, observations }, null, 2) +
        '\n',
    )
    await runCheckParity(
      directory,
      'type_metadata',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('uses concrete argument types and resolved collation facts without inventing deployment-visible names', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-collation-metadata-'))
  try {
    await pg.exec(
      `CREATE TYPE metadata_label AS ENUM('ready');CREATE TYPE metadata_pair AS(n int,label text);CREATE DOMAIN metadata_count AS int CHECK(VALUE>0);CREATE DOMAIN metadata_word AS text;CREATE COLLATION metadata_insensitive(provider=icu,locale='und',deterministic=false)`,
    )
    const profiles = [
      { name: 'integer', type: 'int', collatable: false },
      { name: 'integer_division', type: 'int', collatable: false, operand: 'arg/divisor' },
      { name: 'boolean', type: 'bool', collatable: false },
      { name: 'numeric', type: 'numeric', collatable: false },
      { name: 'uuid', type: 'uuid', collatable: false },
      { name: 'cursor', type: 'refcursor', collatable: false },
      { name: 'document', type: 'jsonb', collatable: false },
      { name: 'integers', type: 'int[]', collatable: false },
      { name: 'label', type: 'metadata_label', collatable: false },
      { name: 'pair', type: 'metadata_pair', collatable: false },
      { name: 'domain_integer', type: 'metadata_count', collatable: false },
      { name: 'text', type: 'text', collatable: true },
      { name: 'text_c', type: 'text', collation: '"C"', collatable: true },
      { name: 'text_icu', type: 'text', collation: 'metadata_insensitive', collatable: true },
      { name: 'texts', type: 'text[]', collatable: true },
      { name: 'name', type: 'name', collatable: true },
      { name: 'domain_text', type: 'metadata_word', collatable: true },
    ]
    const forms = profiles.flatMap((p) =>
      [
        { suffix: 'value', value: 'pg_catalog.pg_collation_for(arg)', bool: false },
        { suffix: 'nullness', value: 'pg_catalog.pg_collation_for(arg) IS NULL', bool: true },
        { suffix: 'nonnull', value: 'pg_catalog.pg_collation_for(arg) IS NOT NULL', bool: true },
      ].map((f) => {
        const value = f.value.replace('(arg)', `(${p.operand ?? 'arg'})`)
        return {
          ...f,
          value,
          profile: p,
          name: p.name + '_' + f.suffix,
          expression: `CASE WHEN bypass THEN true ELSE (${value})${f.bool ? '' : ' COLLATE "C"'} IS NOT DISTINCT FROM ${f.bool ? 'expected_bool' : 'expected_text'} END`,
        }
      }),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE collation_${f.name}(arg ${f.profile.type}${f.profile.collation ? ' COLLATE ' + f.profile.collation : ''},divisor int,expected_text text COLLATE "C",expected_bool bool,bypass bool,CHECK(${f.expression}))`,
      )
    const c = await snapshotCatalog(pg),
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const f of forms)
      for (const origin of ['source', 'stored'] as const) {
        const t = c.tables.find((t) => t.name === 'collation_' + f.name)!,
          lower = lowerTableCheck(
            t,
            t.constraints[0]!,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source' ? `CHECK(${f.expression})` : undefined,
          )!
        expect(
          hasUncertain(lower.expression),
          f.name + origin + JSON.stringify(lower.expression),
        ).toBe(false)
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: t.name,
            constraint: f.name + '_' + origin,
          },
          expression: portableCheckAtoms(lower.expression),
        })
      }
    const group = prepareCheckRustGroup(plans)
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.identity.constraint + JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    for (const f of forms) {
      let output: string | boolean | null = null,
        native: Outcome = { kind: 'True' }
      try {
        output = (
          await pg.query<{ value: string | boolean | null }>(
            `WITH args AS MATERIALIZED(SELECT NULL::${f.profile.type}${f.profile.collation ? ' COLLATE ' + f.profile.collation : ''} arg,1::int divisor)SELECT ${f.value} value FROM args`,
          )
        ).rows[0]!.value
      } catch (e) {
        const code = (e as { code?: string }).code
        if (!code) throw e
        native = fail(code)
      }
      if (!f.profile.collatable) expect(native).toEqual(fail('42804'))
      const expected: Outcome = f.profile.collatable && !f.bool ? { kind: 'Unknown' } : native
      for (const origin of ['source', 'stored'])
        for (const arg of f.profile.operand
          ? ([{ kind: 'Null' }] as const)
          : ([{ kind: 'Null' }, { kind: 'Unknown' }] as const)) {
          const row: Row = {
              arg,
              divisor: known(1),
              expected_text: known(f.bool ? null : (output as string | null)),
              expected_bool: known(f.bool ? (output as boolean | null) : null),
              bypass: known(false),
            },
            name = f.name + '_' + origin
          fixtures.push({ name, row, expected })
          if (expected.kind === 'True')
            fixtures.push({
              name,
              row: { ...row, expected_bool: known(!output) },
              expected: { kind: 'False' },
            })
          fixtures.push({
            name,
            row: { ...row, arg: fail('22012') as Input },
            expected: fail('22012'),
          })
          fixtures.push({ name, row: { ...row, bypass: known(true) }, expected: { kind: 'True' } })
          if (f.profile.operand) {
            fixtures.push({
              name,
              row: { ...row, arg: known(1), divisor: known(0) },
              expected: fail('22012'),
            })
            fixtures.push({
              name,
              row: { ...row, arg: known(1), divisor: { kind: 'Unknown' } },
              expected: { kind: 'Unknown' },
            })
            fixtures.push({
              name,
              row: { ...row, divisor: { kind: 'Unknown' } },
              expected: { kind: 'Unknown' },
            })
          }
        }
      observations.push({ form: f.name, output, native, expected })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/collation-summary.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          checks: plans.length,
          fixtures: fixtures.length,
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'collation_metadata',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
