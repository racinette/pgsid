import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

const known = (value: string | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('coerces array elements through catalog casts and common types while retaining bounds, dimensions, nominal enums, lazy branches and reached errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-compatible-casts-'))
  try {
    await pg.exec(
      "CREATE SCHEMA first_enum;CREATE SCHEMA second_enum;CREATE TYPE first_enum.stage AS ENUM ('new','done');CREATE TYPE second_enum.stage AS ENUM ('done','new');CREATE DOMAIN compatible_slots AS smallint[];CREATE TABLE compatible_values(a text,b text,bypass boolean);CREATE TABLE compatible_oracle(LIKE compatible_values)",
    )
    const forms = {
      widen: '(a::smallint[])::bigint[] = ARRAY[1,2]::bigint[]',
      narrow: '(a::integer[])::smallint[] = ARRAY[1,2]::smallint[]',
      decimal: '(a::integer[])::numeric[] = ARRAY[1,2]::numeric[]',
      decimal_narrow: '(a::numeric[])::integer[] = ARRAY[1,2]',
      bounds:
        'array_dims((a::integer[])::bigint[]) COLLATE "C" IS NOT DISTINCT FROM array_dims(a::integer[]) COLLATE "C"',
      exact:
        '((a::integer[])::bigint[])::text COLLATE "C" IS NOT DISTINCT FROM a::integer[]::text COLLATE "C"',
      domain: '(a::compatible_slots)::bigint[] = ARRAY[1,2]::bigint[]',
      common_coalesce: 'COALESCE(a::smallint[],b::bigint[]) = ARRAY[1,2]::bigint[]',
      common_case:
        '(CASE WHEN bypass THEN a::smallint[] ELSE b::bigint[] END) = ARRAY[1,2]::bigint[]',
      greatest: 'cardinality(GREATEST(a::smallint[],b::bigint[])) >= 0',
      least: 'cardinality(LEAST(a::integer[],b::bigint[])) >= 0',
      nested: 'array_ndims(ARRAY[a::smallint[],b::integer[]]) = 2',
      nested_narrow: 'cardinality(ARRAY[a::integer[],b::integer[]]::smallint[]) >= 0',
      guarded:
        'CASE WHEN bypass THEN true ELSE (a::integer[])::smallint[] = ARRAY[1,2]::smallint[] END',
      binary: '(a::varchar[])::text[] = b::text[]',
      integer_bits: "(a::integer[])::bit[] = ARRAY[B'1',B'0']",
      varying_bits: "(a::varbit[])::bit[] = ARRAY[B'1']",
      sized_bits: "(a::integer[])::bit(3)[] = ARRAY[B'001',B'010']",
      nested_bits: "(ARRAY[a::integer[]])::bit(3)[] = ARRAY[ARRAY[B'001',B'010']]",
      sized_numeric: '(a::integer[])::numeric(4,1)[] = ARRAY[1,2]::numeric[]',
      sized_character: "(a::varchar[])::char(3)[] = ARRAY['1','2']::char(3)[]",
      enum_coalesce:
        "COALESCE(NULL::first_enum.stage[],ARRAY['new'::first_enum.stage]) < ARRAY['done'::first_enum.stage]",
      enum_case:
        "(CASE WHEN bypass THEN ARRAY['new'::first_enum.stage] ELSE ARRAY['done'::first_enum.stage] END) <= ARRAY['done'::first_enum.stage]",
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE compatible_values ADD CONSTRAINT "${name}" CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'compatible_values')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => {
        const constraint = table.constraints.find((item) => item.name === name)!
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
              catalog.enums,
              catalog.domains,
              origin,
            )!.expression,
          ),
        }
      }),
    )
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.evaluatorSource).toContain('finish_array_coercion(')
    const pairs: (readonly [string | null, string | null])[] = [
      ['{1,2}', '{1,2}'],
      ['[0:1]={1,2}', '[0:1]={3,4}'],
      ['{{1,2},{3,4}}', '{{1,2},{3,4}}'],
      ['{}', '{}'],
      ['{NULL}', '{NULL}'],
      [null, '{1,2}'],
      ['{1,2}', null],
      [null, null],
      ['{32768}', '{1}'],
      ['{bad}', '{1}'],
      ['{1}', '{1,2}'],
      ['[0:1]={1,NULL}', '{1,NULL}'],
      ['{-2147483648,2147483647}', '{1,2}'],
      ['{1.5,2.5}', '{1,2}'],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [a, b] of pairs)
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE compatible_oracle')
        await pg.query('INSERT INTO compatible_oracle VALUES($1,$2,$3)', [a, b, bypass])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${sql} AS value FROM compatible_oracle`,
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          references.push({ name, a, b, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { a: known(a), b: known(b), bypass: known(bypass) },
              expected,
            })
        }
      }
    for (const sql of [
      "ARRAY['new'::first_enum.stage] = ARRAY['new'::second_enum.stage]",
      "COALESCE(ARRAY['new'::first_enum.stage],ARRAY['new'::second_enum.stage]) IS NULL",
    ]) {
      await expect(pg.query('SELECT ' + sql)).rejects.toBeDefined()
      expect(
        lowerTableCheck(
          table,
          { name: 'invalid', type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          [],
          'source',
        )!.expression,
      ).toEqual({ kind: 'uncertain' })
    }
    await mkdir('artifacts/array-compatible', { recursive: true })
    await writeFile(
      'artifacts/array-compatible/casts-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-compatible/casts-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycompatiblecasts',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('keeps structural results and known NULL cells when a reached scalar cast requires unavailable session context', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-compatible-context-'))
  try {
    await pg.exec(
      'CREATE TABLE compatible_context(a text,bypass boolean);CREATE TABLE compatible_context_oracle(LIKE compatible_context)',
    )
    const forms = {
      count: 'cardinality((a::date[])::timestamptz[]) IS NOT DISTINCT FROM cardinality(a::date[])',
      bounds:
        'array_dims((a::date[])::timestamptz[]) COLLATE "C" IS NOT DISTINCT FROM array_dims(a::date[]) COLLATE "C"',
      nullness: '(((a::date[])::timestamptz[]) IS NULL) = (a::date[] IS NULL)',
      fetch: '((a::date[])::timestamptz[])[1] IS NULL',
      equal_null: '((a::date[])::timestamptz[]) = ARRAY[NULL]::timestamptz[]',
      guarded: 'CASE WHEN bypass THEN true ELSE ((a::date[])::timestamptz[])[1] IS NULL END',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE compatible_context ADD CONSTRAINT "${name}" CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'compatible_context')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => {
        const constraint = table.constraints.find((item) => item.name === name)!
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
              [],
              [],
              origin,
            )!.expression,
          ),
        }
      }),
    )
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const samples = [
      null,
      '{}',
      '{NULL}',
      '{2024-01-01}',
      '[0:1]={2024-01-01,NULL}',
      '{2024-01-01,NULL}',
      '{2024-02-30}',
      '{bad}',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const a of samples)
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE compatible_context_oracle')
        await pg.query('INSERT INTO compatible_context_oracle VALUES($1,$2)', [a, bypass])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${sql} AS value FROM compatible_context_oracle`,
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          references.push({ name, a, bypass, postgres: expected })
          if (
            (name === 'fetch' || (name === 'guarded' && !bypass)) &&
            ['{2024-01-01}', '{2024-01-01,NULL}'].includes(a!)
          )
            expected = { kind: 'Unknown' }
          if (name === 'equal_null' && a === '{2024-01-01}') expected = { kind: 'Unknown' }
          if (a === '{bad}' && !(name === 'guarded' && bypass)) expected = { kind: 'Unknown' }
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { a: known(a), bypass: known(bypass) },
              expected,
            })
        }
      }
    await writeFile(
      'artifacts/array-compatible/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-compatible/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycompatiblecontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('prepares immutable array coercion errors inside parents while retaining pruned and stable runtime branches', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-compatible-constants-'))
  try {
    await pg.exec('CREATE TABLE compatible_constants(bypass boolean)')
    const forms = {
      constant_error:
        "CASE WHEN bypass THEN true ELSE ('{32768}'::integer[])::smallint[] = ARRAY[1]::smallint[] END",
      pruned:
        "CASE WHEN true THEN true ELSE ('{32768}'::integer[])::smallint[] = ARRAY[1]::smallint[] END",
      runtime_error:
        "CASE WHEN bypass THEN true ELSE ('{32768}'::text::integer[])::smallint[] = ARRAY[1]::smallint[] END",
      parent_constant:
        'CASE WHEN bypass THEN true ELSE 1 / ((ARRAY[0]::bigint[])::integer[])[1] = 1 END',
      strict_null: "NULL::smallint[] = ('{32768}'::integer[])::smallint[]",
      null_cast: '(NULL::integer[])::smallint[] IS NULL',
      empty_cast: "cardinality(('{}'::integer[])::smallint[]) = 0",
    }
    const table = (await snapshotCatalog(pg)).tables.find(
      (item) => item.name === 'compatible_constants',
    )!
    const plans = Object.entries(forms).map(([name, sql]) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          [],
          [],
          'source',
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, { arrayNulls: true })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const bypass of [false, true]) {
      await pg.exec('TRUNCATE compatible_constants')
      await pg.query('INSERT INTO compatible_constants VALUES($1)', [bypass])
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${sql} AS value FROM compatible_constants`,
            )
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        references.push({ name, bypass, expected })
        fixtures.push({ name, row: { bypass: known(bypass) }, expected })
      }
    }
    await writeFile(
      'artifacts/array-compatible/constants-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-compatible/constants-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycompatibleconstants',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
