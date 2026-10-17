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
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
import { arrayScalarProfiles } from './check-array-fixtures.js'

const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const sqlError = (error: unknown): Outcome => ({
  kind: 'Error',
  value: { state: parseInt((error as { code: string }).code, 36) },
})

it('removes and replaces raw/stored array cells with NULL equality, retained bounds, rank checks, compatible promotion and lazy composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-rewrite-shapes-'))
  try {
    await pg.exec(
      'CREATE TABLE rewrite_values(a text,needle integer,replacement integer,expected text,bypass boolean);CREATE TABLE rewrite_oracle(LIKE rewrite_values)',
    )
    const forms = {
      remove: 'array_remove(a::int[],needle)',
      replace: 'array_replace(a::int[],needle,replacement)',
      promoted_remove: 'array_remove(a::smallint[],needle::bigint)',
      promoted_replace: 'array_replace(a::smallint[],needle::bigint,replacement::bigint)',
      nested: 'array_remove(array_replace(a::int[],needle,replacement),replacement)',
      append: 'array_append(array_remove(a::int[],needle),replacement)',
      guarded:
        'CASE WHEN bypass THEN ARRAY[42] ELSE array_replace(a::int[],needle,replacement) END',
      coalesce: 'COALESCE(array_remove(a::int[],needle),ARRAY[42])',
    }
    const sqlForms = Object.fromEntries(
      Object.entries(forms).map(([name, value]) => [
        name,
        `(${value})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(sqlForms))
      await pg.exec(`ALTER TABLE rewrite_values ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'rewrite_values')!
    const plans = Object.entries(sqlForms).flatMap(([name, sql]) =>
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
    expect(group.requiresRegex).toBe(false)
    const arrays = [
      null,
      '{}',
      '{NULL}',
      '{1}',
      '{1,1,NULL,2}',
      '{NULL,1,NULL}',
      '[0:3]={1,NULL,1,2}',
      '[-3:-1]={1,2,1}',
      '[-2147483648:-2147483647]={1,NULL}',
      '[2147483645:2147483646]={1,NULL}',
      '{{1,2},{NULL,1}}',
      '[0:1][2:3]={{1,NULL},{2,1}}',
      '{{{1}}}',
      '{bad}',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [name, sql] of Object.entries(sqlForms))
      for (const a of arrays)
        for (const needle of [null, 1, 9])
          for (const replacement of name.includes('remove') || name === 'coalesce'
            ? [null]
            : [null, 1, 2]) {
            let output: string | null = null
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${forms[name as keyof typeof forms]})::text AS value FROM (SELECT $1::text a,$2::integer needle,$3::integer replacement,false bypass) q`,
                  [a, needle, replacement],
                )
              ).rows[0]!.value
            } catch {}
            await pg.exec('TRUNCATE rewrite_oracle')
            await pg.query('INSERT INTO rewrite_oracle VALUES($1,$2,$3,$4,false)', [
              a,
              needle,
              replacement,
              output,
            ])
            let expected: Outcome
            try {
              expected = outcome(
                (
                  await pg.query<{ value: boolean | null }>(
                    `SELECT ${sql} AS value FROM rewrite_oracle`,
                  )
                ).rows[0]!.value,
              )
            } catch (error) {
              expected = sqlError(error)
            }
            references.push({ name, a, needle, replacement, output, expected })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: {
                  a: known(a),
                  needle: known(needle),
                  replacement: known(replacement),
                  expected: known(output),
                  bypass: known(false),
                },
                expected,
              })
          }
    fixtures.push({
      name: 'guarded_source',
      row: {
        a: known('{bad}'),
        needle: { kind: 'Unknown' },
        replacement: { kind: 'Unknown' },
        expected: known('{42}'),
        bypass: known(true),
      },
      expected: { kind: 'True' },
    })
    await mkdir('artifacts/array-rewrite', { recursive: true })
    await writeFile(
      'artifacts/array-rewrite/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-rewrite/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayrewriteshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('rewrites every represented scalar/enum array through default equality and preserves empty/NULL and missing-support boundaries', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-rewrite-families-'))
  try {
    await pg.exec(
      "CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE rewrite_families(a text,needle text,replacement text,expected_count integer,expected_positions text);CREATE TABLE rewrite_family_oracle(LIKE rewrite_families)",
    )
    const forms: { name: string; sql: string; type: string; expression: string }[] = [],
      samples = new Map<
        string,
        readonly (readonly [string | null, string | null, string | null])[]
      >()
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      let values = (
        await pg.query<{ base: string; single: string }>(
          `SELECT ARRAY[NULL::${type},${literal}::${type},NULL::${type},${literal}::${type}]::text base,ARRAY[${literal}::${type}]::text single`,
        )
      ).rows[0]!
      if (type === 'money' || type.startsWith('reg'))
        values = { base: '{NULL,0,NULL,0}', single: '{0}' }
      samples.set(type, [
        [values.base, values.single, null],
        [values.base, null, values.single],
        [values.base, values.single, values.single],
        ['{NULL}', null, null],
        ['{}', values.single, values.single],
        [null, values.single, null],
        ['{{NULL}}', null, null],
      ])
      const needle = `(needle::${type}[])[1]`,
        replacement = `(replacement::${type}[])[1]`
      for (const [name, expression] of Object.entries({
        remove: `array_remove(a::${type}[],${needle})`,
        replace: `array_replace(a::${type}[],${needle},${replacement})`,
      })) {
        const sql = `cardinality(${expression}) IS NOT DISTINCT FROM expected_count AND array_positions(${expression},NULL)::text COLLATE "C" IS NOT DISTINCT FROM expected_positions COLLATE "C"`
        forms.push({ name: `family_${index}_${name}`, sql, type, expression })
      }
    }
    for (const form of forms)
      await pg.exec(`ALTER TABLE rewrite_families ADD CONSTRAINT ${form.name} CHECK(${form.sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'rewrite_families')!
    const plans = forms.flatMap((form) =>
      (['source', 'stored'] as const).map((origin) => {
        const constraint = table.constraints.find((item) => item.name === form.name)!
        return {
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
                ? { ...constraint, definition: `CHECK(${form.sql})` }
                : constraint,
              catalog.enums,
              [],
              origin,
            )!.expression,
          ),
        }
      }),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms)
      for (const [a, needle, replacement] of samples.get(form.type)!) {
        let count: number | null = null,
          positions: string | null = null
        try {
          count = (
            await pg.query<{ count: number | null }>(
              `SELECT cardinality(${form.expression}) count FROM (SELECT $1::text a,$2::text needle,$3::text replacement) q`,
              [a, needle, replacement],
            )
          ).rows[0]!.count
        } catch {}
        try {
          positions = (
            await pg.query<{ positions: string | null }>(
              `SELECT array_positions(${form.expression},NULL)::text positions FROM (SELECT $1::text a,$2::text needle,$3::text replacement) q`,
              [a, needle, replacement],
            )
          ).rows[0]!.positions
        } catch {}
        await pg.exec('TRUNCATE rewrite_family_oracle')
        await pg.query('INSERT INTO rewrite_family_oracle VALUES($1,$2,$3,$4,$5)', [
          a,
          needle,
          replacement,
          count,
          positions,
        ])
        let expected: Outcome
        try {
          expected = outcome(
            (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${form.sql} AS value FROM rewrite_family_oracle`,
              )
            ).rows[0]!.value,
          )
        } catch (error) {
          expected = sqlError(error)
        }
        references.push({ name: form.name, a, needle, replacement, count, positions, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: {
              a: known(a),
              needle: known(needle),
              replacement: known(replacement),
              expected_count: known(count),
              expected_positions: known(positions),
            },
            expected,
          })
      }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/array-rewrite', { recursive: true })
    await writeFile(
      'artifacts/array-rewrite/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-rewrite/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 64) {
      const selected = plans.slice(offset, offset + 64),
        group = prepareCheckRustGroup(selected, {
          arrayNulls: true,
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
        }),
        batch = join(directory, 'batch-' + offset)
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          selected[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      await mkdir(batch)
      const names = selected.map((plan) => plan.identity.constraint),
        allowed = new Set(names)
      await runCheckParity(
        batch,
        'arrayrewritefamilies' + offset,
        group,
        names,
        fixtures.filter((fixture) => allowed.has(fixture.name)),
      )
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('preserves partial replacement shapes, ambiguous removal, NULL recovery, eager errors and independent results', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-rewrite-partial-'))
  try {
    const evaluatorSource =
        'pub fn evaluate_check()->CheckOutcome {let result=array_rewrite_partial_probe();check_from_bool(result)}',
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_rewrite.rs',
        source: String.raw`
fn rewrite_partial_input()->ArrayValue {
 let mut builder=make_array_arguments("pg_catalog.int4",2);
 builder=append_array_dimension(builder,-2,3);
 builder=append_array_argument(builder,ArrayElement::Null);
 let one=array_element_from_int4(make_int4_value(1));
 builder=append_array_argument(builder,one);
 builder=append_array_argument(builder,ArrayElement::Unknown);
 finish_array_arguments(builder)
}
fn rewrite_partial_run(original:ArrayValue,needle:ArrayElement,replacement:ArrayElement,remove:bool)->ArrayValue {
 let plan=prepare_array_rewrite(original.clone(),needle,replacement,remove,true);
 let mut index=make_int4_value(0);let mut result=array_search_initial(&plan);
 let mut output=make_array_arguments("pg_catalog.int4",2);
 let mut changed=make_bool_value(false);
 while array_rewrite_continues(&plan,index,result) {
  let a=array_membership_element_at(&plan,index,false);let b=array_rewrite_needle(&plan);
  let pair=array_comparison_pair(a.clone(),b.clone(),true);let mut compared=pair;
  if array_pair_requires_scalar(pair) {
   let left=array_element_to_int4(a);let right=array_element_to_int4(b);
   compared=array_equality_step(sql__pg_catalog__int4eq__lrxe(left,right));
  };
  output=array_rewrite_step(output,&plan,index,compared,remove);
  changed=array_bitmap_union(changed,array_rewrite_changed(&plan,compared,remove));
  result=compared;index=array_text_next_index(index);
 }
 finish_array_rewrite(original,&plan,output,remove,changed)
}
pub fn array_rewrite_partial_probe()->BoolValue {
 let original=rewrite_partial_input();let one=array_element_from_int4(make_int4_value(1));let two=array_element_from_int4(make_int4_value(2));
 let replaced=rewrite_partial_run(original.clone(),one.clone(),two.clone(),false);
 let result=prepare_array_output(replaced);
 if result.state!=1 || result.elements.len()!=3 || result.dimensions[0].lower!= -2 {return BoolValue::Value(false);};
 if array_element_to_int4(result.elements[1].clone())!=make_int4_value(2) {return BoolValue::Value(false);};
 if array_element_to_int4(result.elements[2].clone())!=Int4Value::Unknown {return BoolValue::Value(false);};
 let removed=rewrite_partial_run(original.clone(),one.clone(),ArrayElement::Null,true);
 let removed_state=prepare_array_output(removed);
 if removed_state.state!= -1 {return BoolValue::Value(false);};
 let null_kept=rewrite_partial_run(original.clone(),ArrayElement::Unknown,ArrayElement::Null,false);
 let null_plan=prepare_array_output(null_kept);
 if array_element_to_int4(null_plan.elements[0].clone())!=Int4Value::Null {return BoolValue::Value(false);};
 let unknown_replacement=rewrite_partial_run(original.clone(),one.clone(),ArrayElement::Unknown,false);
 if sql__pg_catalog__cardinality__m1rn(unknown_replacement)!=make_int4_value(3) {return BoolValue::Value(false);};
 let original_plan=prepare_array_output(original);
 if array_element_to_int4(original_plan.elements[1].clone())!=make_int4_value(1) {return BoolValue::Value(false);};
 let first=make_sql_error(3452547);let second=make_sql_error(3452582);
 let failed=prepare_array_rewrite(ArrayValue::Error(first),ArrayElement::Error(second),ArrayElement::Unknown,false,true);
 if array_search_initial(&failed)!=Int4Value::Error(first) {return BoolValue::Value(false);};
 let null_failed=prepare_array_rewrite(ArrayValue::Null,one.clone(),ArrayElement::Error(second),false,true);
 if array_search_initial(&null_failed)!=Int4Value::Error(second) {return BoolValue::Value(false);};
 let empty=finish_array_constructor(make_array_arguments("pg_catalog.int4",2));
 let empty_plan=prepare_array_rewrite(empty.clone(),ArrayElement::Unknown,ArrayElement::Unknown,false,false);
 let empty_output=finish_array_rewrite(empty,&empty_plan,make_array_arguments("pg_catalog.int4",2),false,make_bool_value(false));
 if sql__pg_catalog__cardinality__m1rn(empty_output)!=make_int4_value(0) {return BoolValue::Value(false);};
 let missing=prepare_array_rewrite(rewrite_partial_input(),ArrayElement::Unknown,ArrayElement::Unknown,false,false);
 if array_search_initial(&missing)!=Int4Value::Error(make_sql_error(6822435)) {return BoolValue::Value(false);};
 let plan=prepare_array_rewrite(rewrite_partial_input(),one,two,true,true);
 let uncertain=array_rewrite_step(make_array_arguments("pg_catalog.int4",2),&plan,make_int4_value(0),Int4Value::Unknown,true);
 let later_error=array_rewrite_step(uncertain,&plan,make_int4_value(1),Int4Value::Error(first),true);
 let error_result=finish_array_rewrite(rewrite_partial_input(),&plan,later_error,true,BoolValue::Unknown);
 let error_plan=prepare_array_output(error_result);
 if error_plan.state!= -2 || error_plan.error!=first {return BoolValue::Value(false);};
 if array_rewrite_continues(&plan,make_int4_value(1),Int4Value::Unknown)==false {return BoolValue::Value(false);};
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
    await runCheckParity(
      directory,
      'arrayrewritepartial',
      group,
      ['partial'],
      [{ name: 'partial', row: {}, expected: { kind: 'True' } }],
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('preserves rewrite preparation, reached collation requirements, nominal enum inference and produced-bound composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-rewrite-context-'))
  try {
    await pg.exec(
      "CREATE SCHEMA rewrite_first;CREATE SCHEMA rewrite_second;CREATE TYPE rewrite_first.stage AS ENUM ('new','done');CREATE TYPE rewrite_second.stage AS ENUM ('done','new');CREATE TABLE rewrite_context(a text,needle text,replacement text,expected integer,bypass boolean)",
    )
    const forms = {
      removal: 'cardinality(array_remove(a::text[],needle)) IS NOT DISTINCT FROM expected',
      replacement:
        'cardinality(array_replace(a::text[],needle,replacement)) IS NOT DISTINCT FROM expected',
      explicit:
        'cardinality(array_remove(a::text[] COLLATE "C",needle COLLATE "C")) IS NOT DISTINCT FROM expected',
      null_source: 'array_replace(NULL::text[],needle,replacement) IS NULL',
      empty: 'cardinality(array_replace(ARRAY[]::text[],needle,replacement))=0',
      constant_rank: "CASE WHEN bypass THEN true ELSE array_remove('{{1}}'::int[],1) IS NULL END",
      runtime_rank:
        "CASE WHEN bypass THEN true ELSE array_remove('{{1}}'::text::int[],1) IS NULL END",
      pruned: "CASE WHEN true THEN true ELSE array_remove('{{1}}'::int[],1) IS NULL END",
      missing:
        'CASE WHEN bypass THEN true ELSE array_replace(ARRAY[NULL::json],NULL,NULL) IS NULL END',
      eager_replacement: 'array_replace(NULL::int[],1,1/0) IS NULL',
      enum_literal:
        "cardinality(array_remove(ARRAY['new'::rewrite_first.stage,'done'::rewrite_first.stage],'done'))=1",
      enum_replacement:
        "array_replace(ARRAY['new'::rewrite_first.stage],'new','done') = ARRAY['done'::rewrite_first.stage]",
      high_remove:
        "array_upper(array_remove(array_prepend(0,'[2147483646:2147483646]={1}'::int[]),9),1)=2147483647",
      high_replacement:
        "array_position(array_replace(array_prepend(0,'[2147483646:2147483646]={1}'::int[]),1,2),2)=2147483647",
      high_empty:
        "cardinality(array_remove(array_prepend(1,'[2147483646:2147483646]={1}'::int[]),1))=0",
    }
    const catalog = await snapshotCatalog(pg),
      original = catalog.tables.find((item) => item.name === 'rewrite_context')!,
      table = {
        ...original,
        columns: original.columns.map((column) =>
          ['a', 'needle', 'replacement'].includes(column.name)
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
          [],
          'source',
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, { arrayNulls: true, serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const a of [null, '{}', '{a}', '{NULL}', '{a,NULL}'])
      for (const needle of [null, 'a', 'z'])
        for (const replacement of [null, 'b'])
          for (const bypass of [false, true]) {
            await pg.exec('TRUNCATE rewrite_context')
            await pg.query('INSERT INTO rewrite_context VALUES($1,$2,$3,$4,$5)', [
              a,
              needle,
              replacement,
              a === null ? null : a === '{}' ? 0 : a === '{a,NULL}' ? 2 : 1,
              bypass,
            ])
            for (const [name, sql] of Object.entries(forms)) {
              let expected: Outcome
              try {
                expected = outcome(
                  (
                    await pg.query<{ value: boolean | null }>(
                      `SELECT ${sql} AS value FROM rewrite_context`,
                    )
                  ).rows[0]!.value,
                )
              } catch (error) {
                expected = sqlError(error)
              }
              const row = {
                a: known(a),
                needle: known(needle),
                replacement: known(replacement),
                expected: known(a === null ? null : a === '{}' ? 0 : a === '{a,NULL}' ? 2 : 1),
                bypass: known(bypass),
              }
              references.push({ name, row, postgres: expected })
              if (
                name === 'removal' &&
                a !== null &&
                a !== '{}' &&
                needle !== null &&
                (a === '{a}' || a === '{a,NULL}')
              )
                expected = { kind: 'Unknown' }
              fixtures.push({ name, row, expected })
            }
          }
    for (const name of ['null_source', 'empty'])
      fixtures.push({
        name,
        row: { needle: { kind: 'Unknown' }, replacement: { kind: 'Unknown' } },
        expected: { kind: 'True' },
      })
    for (const sql of [
      "array_replace(ARRAY['new'::rewrite_first.stage],'new'::rewrite_second.stage,'done'::rewrite_first.stage) IS NULL",
      "array_remove(ARRAY['new'::rewrite_first.stage],'new'::rewrite_second.stage) IS NULL",
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
    await mkdir('artifacts/array-rewrite', { recursive: true })
    await writeFile(
      'artifacts/array-rewrite/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-rewrite/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayrewritecontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
