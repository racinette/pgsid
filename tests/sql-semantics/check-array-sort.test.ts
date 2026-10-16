import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { arrayScalarProfiles } from './check-array-fixtures.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const errorOutcome = (error: unknown): Outcome => ({
  kind: 'Error',
  value: { state: parseInt((error as { code: string }).code, 36) },
})
const context = { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' } as const

it('sorts raw/stored first-dimension items through all overloads, strict flags, bounds, composition and lazy errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-sort-shapes-'))
  try {
    await pg.exec(
      "CREATE TYPE sort_stage AS ENUM ('new','done');CREATE TABLE sort_values(a text,descending boolean,nulls_first boolean,expected text,bypass boolean);CREATE TABLE sort_oracle(LIKE sort_values)",
    )
    const forms = {
      ascending: 'array_sort(a::int[])',
      descending: 'array_sort(a::int[],descending)',
      flags: 'array_sort(a::int[],descending,nulls_first)',
      composed: 'trim_array(array_sort(a::int[]),1)',
      guarded: 'CASE WHEN bypass THEN ARRAY[42] ELSE array_sort(a::int[]) END',
      maximum: "array_sort(array_prepend(0,'[2147483646:2147483646]={1}'::int[]))",
      enum: "array_sort(ARRAY['done'::sort_stage,NULL,'new'::sort_stage])",
    }
    const sqlForms = Object.fromEntries(
      Object.entries(forms).map(([name, value]) => [
        name,
        `(${value})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(sqlForms))
      await pg.exec(`ALTER TABLE sort_values ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'sort_values')!
    const plans = Object.entries(sqlForms).flatMap(([name, sql]) =>
      ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...table.constraints.find((item) => item.name === name)!,
                  definition: `CHECK(${sql})`,
                }
              : table.constraints.find((item) => item.name === name)!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
      })),
    )
    const group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const arrays = [
      null,
      '{}',
      '{NULL}',
      '{1}',
      '{NULL,NULL}',
      '{3,1,NULL,2,1}',
      '[0:2]={3,NULL,1}',
      '[-3:-2]={2,1}',
      '[-2147483648:-2147483647]={2,1}',
      '[2147483645:2147483646]={2,1}',
      '{{3,1}}',
      '{{2},{1}}',
      '[0:1][2:3]={{2,1},{1,3}}',
      '{{NULL,1},{2,NULL}}',
      '{{{3,1}},{{2,4}}}',
      'bad',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [name, sql] of Object.entries(sqlForms)) {
      const directions = name === 'flags' || name === 'descending' ? [false, true, null] : [false]
      const nullOrders = name === 'flags' ? [false, true, null] : [false]
      const samples = name === 'maximum' || name === 'enum' ? [null] : arrays
      for (const a of samples)
        for (const descending of directions)
          for (const nulls_first of nullOrders)
            for (const bypass of name === 'guarded' ? [false, true] : [false]) {
              let output: string | null = null
              try {
                output = (
                  await pg.query<{ value: string | null }>(
                    `SELECT (${forms[name as keyof typeof forms]})::text value FROM (SELECT $1::text a,$2::boolean descending,$3::boolean nulls_first,$4::boolean bypass) q`,
                    [a, descending, nulls_first, bypass],
                  )
                ).rows[0]!.value
              } catch {}
              await pg.exec('TRUNCATE sort_oracle')
              await pg.query('INSERT INTO sort_oracle VALUES($1,$2,$3,$4,$5)', [
                a,
                descending,
                nulls_first,
                output,
                bypass,
              ])
              let expected: Outcome
              try {
                expected = outcome(
                  (
                    await pg.query<{ value: boolean | null }>(
                      `SELECT ${sql} value FROM sort_oracle`,
                    )
                  ).rows[0]!.value,
                )
              } catch (error) {
                expected = errorOutcome(error)
              }
              references.push({ name, a, descending, nulls_first, bypass, output, expected })
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: name + '_' + origin,
                  row: {
                    a: known(a),
                    descending: known(descending),
                    nulls_first: known(nulls_first),
                    expected: known(output),
                    bypass: known(bypass),
                  },
                  expected,
                })
            }
    }
    for (const origin of ['source', 'stored']) {
      fixtures.push({
        name: 'ascending_' + origin,
        row: { a: { kind: 'Unknown' }, expected: known('{}') },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name: 'ascending_' + origin,
        row: { a: known('{2,1}'), expected: known('{2,1}') },
        expected: { kind: 'False' },
      })
      fixtures.push({
        name: 'guarded_' + origin,
        row: { a: { kind: 'Unknown' }, bypass: known(true), expected: known('{42}') },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: 'flags_' + origin,
        row: {
          a: known('{}'),
          descending: { kind: 'Unknown' },
          nulls_first: known(false),
          expected: known('{}'),
        },
        expected: { kind: 'Unknown' },
      })
    }
    await mkdir('artifacts/array-sort', { recursive: true })
    await writeFile(
      'artifacts/array-sort/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-sort/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraysortshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('retains sorting shape, exact duplicate payloads, ambiguous tied cells, nominal enums and reached comparison requirements', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-sort-context-'))
  try {
    await pg.exec(
      "CREATE SCHEMA sort_first;CREATE SCHEMA sort_second;CREATE TYPE sort_first.stage AS ENUM ('new','done');CREATE TYPE sort_second.stage AS ENUM ('done','new');CREATE TABLE sort_context(a text,expected text,bypass boolean)",
    )
    const forms = {
      context_values:
        'array_sort(a::text[])::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      context_shape: 'cardinality(array_sort(a::text[]))>=0',
      explicit:
        'array_sort(a::text[] COLLATE "C")::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      numeric_values:
        'array_sort(a::numeric[])::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      numeric_shape: 'cardinality(array_sort(a::numeric[]))>=0',
      numeric_prefix: '(array_sort(a::numeric[]))[1] IS NOT DISTINCT FROM 0::numeric',
      numeric_suffix: '(array_sort(a::numeric[]))[4] IS NOT DISTINCT FROM 2::numeric',
      enum_first:
        "array_sort(ARRAY['done'::sort_first.stage,'new'::sort_first.stage])::text COLLATE \"C\"='{new,done}' COLLATE \"C\"",
      enum_second:
        "array_sort(ARRAY['new'::sort_second.stage,'done'::sort_second.stage])::text COLLATE \"C\"='{done,new}' COLLATE \"C\"",
      constant_missing:
        "CASE WHEN bypass THEN true ELSE array_sort('{NULL,NULL}'::json[]) IS NULL END",
      runtime_missing: 'CASE WHEN bypass THEN true ELSE array_sort(a::json[]) IS NULL END',
      pruned: "CASE WHEN true THEN true ELSE array_sort('{NULL,NULL}'::json[]) IS NULL END",
      strict_error: 'array_sort(NULL::int[],(1/0)>0) IS NULL',
    }
    const catalog = await snapshotCatalog(pg),
      original = catalog.tables.find((item) => item.name === 'sort_context')!
    const table = {
      ...original,
      columns: original.columns.map((column) =>
        column.name === 'a'
          ? {
              ...column,
              collationIsC: false,
              collationDeterministic: false,
              collationIsDefault: false,
            }
          : column,
      ),
    }
    const plans = Object.entries(forms).map(([name, sql]) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          catalog.domains,
          'source',
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [name, sql] of Object.entries(forms))
      for (const a of [null, '{}', '{NULL}', '{NULL,NULL}', '{0,1.0,1.00,2}', '{2,1,1,0}', 'bad'])
        for (const bypass of [false, true]) {
          let expectedText: string | null = null
          const expression = name.startsWith('numeric')
            ? 'array_sort(a::numeric[])::text'
            : 'array_sort(a::text[] COLLATE "C")::text'
          try {
            expectedText = (
              await pg.query<{ value: string | null }>(
                `SELECT (${expression}) value FROM (SELECT $1::text a) q`,
                [a],
              )
            ).rows[0]!.value
          } catch {}
          await pg.exec('TRUNCATE sort_context')
          await pg.query('INSERT INTO sort_context VALUES($1,$2,$3)', [a, expectedText, bypass])
          let postgres: Outcome
          try {
            postgres = outcome(
              (await pg.query<{ value: boolean | null }>(`SELECT (${sql}) value FROM sort_context`))
                .rows[0]!.value,
            )
          } catch (error) {
            postgres = errorOutcome(error)
          }
          let expected = postgres
          if (name === 'context_values' && (a === '{0,1.0,1.00,2}' || a === '{2,1,1,0}'))
            expected = { kind: 'Unknown' }
          if (name === 'numeric_values' && a === '{0,1.0,1.00,2}') expected = { kind: 'Unknown' }
          references.push({ name, a, bypass, expectedText, postgres, expected })
          fixtures.push({
            name,
            row: { a: known(a), bypass: known(bypass), expected: known(expectedText) },
            expected,
          })
        }
    await mkdir('artifacts/array-sort', { recursive: true })
    await writeFile(
      'artifacts/array-sort/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-sort/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraysortcontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('sorts every scalar and enum profile through captured comparison support while retaining empty and singleton fast paths', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-sort-families-'))
  try {
    await pg.exec(
      "CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE sort_families(source text,expected_count integer,expected_layout text,expected_null boolean)",
    )
    const forms: { name: string; sql: string; type: string; matrix: boolean; array: string }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries())
      for (const matrix of [false, true]) {
        const expression = matrix
          ? `ARRAY[ARRAY[NULL::${type},${literal}::${type}],ARRAY[${literal}::${type},NULL::${type}]]`
          : `ARRAY[${literal}::${type},NULL::${type},${literal}::${type}]`
        let contents = (await pg.query<{ value: string }>(`SELECT (${expression})::text value`))
          .rows[0]!.value
        if (type === 'money') contents = matrix ? '{{NULL,0},{0,NULL}}' : '{0,NULL,0}'
        const layout = matrix ? '[0:1][2:3]' : '[0:2]',
          array = layout + '=' + contents,
          name = `sort_${index}_${matrix ? 'matrix' : 'vector'}`
        const sorted = `array_sort(source::${type}[])`,
          cell = matrix ? `(${sorted})[0][2]` : `(${sorted})[0]`
        const sql = `cardinality(${sorted}) IS NOT DISTINCT FROM expected_count AND array_dims(${sorted}) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C" AND (${cell} IS NULL) IS NOT DISTINCT FROM expected_null`
        forms.push({ name, sql, type, matrix, array })
        await pg.exec(`ALTER TABLE sort_families ADD CONSTRAINT ${name} CHECK(${sql})`)
      }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'sort_families')!
    const plans = forms.flatMap((form) =>
      ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: form.name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...table.constraints.find((item) => item.name === form.name)!,
                  definition: `CHECK(${form.sql})`,
                }
              : table.constraints.find((item) => item.name === form.name)!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
      })),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms)
      for (const source of [null, '{}', '[0:0]={NULL}', form.array]) {
        let count: number | null = null,
          layout: string | null = null,
          isNull: boolean | null = null
        const sorted = `array_sort($1::${form.type}[])`,
          cell = form.matrix ? `(${sorted})[0][2]` : `(${sorted})[0]`
        let postgres: Outcome = { kind: 'True' }
        try {
          const row = (
            await pg.query<{ count: number | null; layout: string | null; is_null: boolean }>(
              `SELECT cardinality(${sorted}) count,array_dims(${sorted}) layout,${cell} IS NULL is_null`,
              [source],
            )
          ).rows[0]!
          count = row.count
          layout = row.layout
          isNull = row.is_null
        } catch (error) {
          postgres = errorOutcome(error)
        }
        references.push({
          name: form.name,
          type: form.type,
          source,
          count,
          layout,
          isNull,
          postgres,
        })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: {
              source: known(source),
              expected_count: known(count),
              expected_layout: known(layout),
              expected_null: known(isNull),
            },
            expected: postgres,
          })
      }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/array-sort', { recursive: true })
    await writeFile(
      'artifacts/array-sort/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-sort/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 64) {
      const batch = plans.slice(offset, offset + 64),
        group = prepareCheckRustGroup(batch, context)
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          batch[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const names = batch.map((plan) => plan.identity.constraint),
        selected = new Set(names),
        scratch = await mkdtemp(join(directory, 'batch-'))
      await runCheckParity(
        scratch,
        'arraysortfamilies',
        group,
        names,
        fixtures.filter((fixture) => selected.has(fixture.name)),
      )
      await rm(scratch, { recursive: true, force: true })
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('demonstrates session-dependent tied representations and independently owns mutable merge cursors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-sort-owned-'))
  try {
    const references = []
    for (const memory of ['64kB', '64MB']) {
      await pg.exec(`SET work_mem='${memory}'`)
      const row = (
        await pg.query<{ hash: string; count: number }>(
          "SELECT md5(array_sort(array_agg(('1.'||repeat('0',i%7))::numeric))::text) hash,cardinality(array_sort(array_agg(('1.'||repeat('0',i%7))::numeric))) count FROM generate_series(1,10000) i",
        )
      ).rows[0]!
      expect(row.count).toBe(10000)
      references.push({ memory, ...row })
    }
    expect(references[0]!.hash).not.toBe(references[1]!.hash)
    const evaluatorSource =
        'pub fn evaluate_check()->CheckOutcome {let result=array_sort_owned_probe();check_from_bool(result)}',
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_sort_owned.rs',
        source: String.raw`
pub fn array_sort_owned_probe()->BoolValue {
 let mut builder=make_array_arguments("pg_catalog.int4",2);
 builder=append_array_dimension(builder,0,2);
 builder=append_array_argument(builder,array_element_from_int4(make_int4_value(2)));
 builder=append_array_argument(builder,array_element_from_int4(make_int4_value(1)));
 let array=finish_array_arguments(builder);
 let original=prepare_array_sort(array,make_bool_value(false),make_bool_value(false),true);
 let changed=array_sort_step(original.clone(),make_int4_value(1));
 if original.buffer[0]!=0 || changed.buffer[0]!=1 {return BoolValue::Value(false);};
 if original.left!=0 || original.right!=1 || changed.right!=2 {return BoolValue::Value(false);};
 let copied=original.clone();let unknown=array_sort_step(copied,Int4Value::Unknown);
 let partial=finish_array_sort(unknown);
 if sql__pg_catalog__cardinality__m1rn(partial.clone())!=make_int4_value(2) {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(partial,make_int4_value(0)))!=Int4Value::Unknown {return BoolValue::Value(false);};
 let failed=array_sort_step(original.clone(),Int4Value::Error(make_sql_error(3452547)));
 let failed_array=finish_array_sort(failed);let error_plan=prepare_array_output(failed_array);
 if error_plan.state!= -2 || error_plan.error!=make_sql_error(3452547) {return BoolValue::Value(false);};
 let mut nested_builder=make_array_arguments("pg_catalog.jsonb",12);
 nested_builder=append_array_dimension(nested_builder,1,2);
 nested_builder=append_array_argument(nested_builder,array_element_from_jsonb(make_jsonb_value("{\"a\":[1]}")));
 nested_builder=append_array_argument(nested_builder,array_element_from_jsonb(make_jsonb_value("{\"b\":[2]}")));
 let nested=finish_array_arguments(nested_builder);
 let nested_plan=prepare_array_sort(nested,make_bool_value(false),make_bool_value(false),true);
 let nested_copy=nested_plan.clone();let moved=array_sort_step(nested_copy,make_int4_value(1));
 if nested_plan.buffer[0]!=0 || moved.buffer[0]!=1 {return BoolValue::Value(false);};
 let old=array_element_to_jsonb(nested_plan.elements[0].clone());let retained=array_element_to_jsonb(moved.elements[0].clone());
 if jsonb_to_text(old)!=make_text_value("{\"a\": [1]}") {return BoolValue::Value(false);};
 if jsonb_to_text(retained)!=make_text_value("{\"a\": [1]}") {return BoolValue::Value(false);};
 BoolValue::Value(true)
}
`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [{ kind: 'supported', entryName: 'evaluate_check', inputs: [] }],
    }
    const fixtures = [{ name: 'owned', row: {}, expected: { kind: 'True' as const } }]
    await mkdir('artifacts/array-sort', { recursive: true })
    await writeFile(
      'artifacts/array-sort/owned-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-sort/owned-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(directory, 'arraysortowned', group, ['owned'], fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
