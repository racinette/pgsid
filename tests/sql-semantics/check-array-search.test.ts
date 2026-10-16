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

it('searches raw/stored arrays with NULL equality, SQL lower bounds, optional starts, compatible promotion and expression composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-search-shapes-'))
  try {
    await pg.exec(
      'CREATE TABLE search_values(a text,needle integer,start integer,expected integer,expected_start integer,expected_positions text,bypass boolean);CREATE TABLE search_oracle(LIKE search_values)',
    )
    const forms = {
      first: 'array_position(a::integer[],needle) IS NOT DISTINCT FROM expected',
      from_start: 'array_position(a::integer[],needle,start) IS NOT DISTINCT FROM expected_start',
      positions:
        'array_positions(a::integer[],needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_positions COLLATE "C"',
      promoted: 'array_position(a::smallint[],needle::bigint) IS NOT DISTINCT FROM expected',
      empty_nullif: 'NULLIF(array_positions(a::integer[],needle),ARRAY[]::integer[]) IS NULL',
      coalesce: 'COALESCE(array_position(a::integer[],needle),-999) = COALESCE(expected,-999)',
      guarded:
        'CASE WHEN bypass THEN true ELSE array_position(a::integer[],needle) IS NOT DISTINCT FROM expected END',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE search_values ADD CONSTRAINT "${name}" CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'search_values')!
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
    expect(group.evaluatorSource).toContain('while array_search_continues(&')
    expect(group.requiresRegex).toBe(false)
    const arrays = [
      null,
      '{}',
      '{NULL}',
      '{1}',
      '{1,2,1,NULL}',
      '{NULL,1,NULL}',
      '[0:2]={1,NULL,1}',
      '[-3:-1]={1,NULL,1}',
      '[-2147483648:-2147483647]={1,NULL}',
      '[2147483645:2147483646]={1,NULL}',
      '{{1,2}}',
      '{bad}',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const a of arrays)
      for (const needle of [null, 1, 2, 9])
        for (const start of [null, -2147483648, -1, 0, 1, 2, 999]) {
          let first: number | null = null,
            from: number | null = null,
            positions: string | null = null
          try {
            first = (
              await pg.query<{ value: number | null }>(
                'SELECT array_position($1::integer[],$2::integer) AS value',
                [a, needle],
              )
            ).rows[0]!.value
          } catch {}
          try {
            from = (
              await pg.query<{ value: number | null }>(
                'SELECT array_position($1::integer[],$2::integer,$3::integer) AS value',
                [a, needle, start],
              )
            ).rows[0]!.value
          } catch {}
          try {
            positions = (
              await pg.query<{ value: string | null }>(
                'SELECT array_positions($1::integer[],$2::integer)::text AS value',
                [a, needle],
              )
            ).rows[0]!.value
          } catch {}
          await pg.exec('TRUNCATE search_oracle')
          await pg.query('INSERT INTO search_oracle VALUES($1,$2,$3,$4,$5,$6,false)', [
            a,
            needle,
            start,
            first,
            from,
            positions,
          ])
          for (const [name, sql] of Object.entries(forms)) {
            let expected: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${sql} AS value FROM search_oracle`,
                )
              ).rows[0]!.value
              expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (error) {
              expected = {
                kind: 'Error',
                value: { state: parseInt((error as { code: string }).code, 36) },
              }
            }
            references.push({ name, a, needle, start, first, from, positions, expected })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: {
                  a: known(a),
                  needle: known(needle),
                  start: known(start),
                  expected: known(first),
                  expected_start: known(from),
                  expected_positions: known(positions),
                  bypass: known(false),
                },
                expected,
              })
          }
        }
    fixtures.push({
      name: 'guarded_source',
      row: { a: known('{bad}'), needle: known(1), expected: known(null), bypass: known(true) },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'first_source',
      row: { a: { kind: 'Unknown' }, needle: known(1), expected: known(1) },
      expected: { kind: 'Unknown' },
    })
    await mkdir('artifacts/array-search', { recursive: true })
    await writeFile(
      'artifacts/array-search/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-search/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraysearchshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('searches every represented scalar and enum profile, preserving catalog support checks and NULL-search fast paths', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-search-families-'))
  try {
    await pg.exec(
      "CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE search_families(a text,needle text,start integer,expected integer,expected_positions text);CREATE TABLE search_families_oracle(LIKE search_families)",
    )
    const forms: { name: string; sql: string; type: string; all: boolean; literal: string }[] = [],
      samples = new Map<string, (readonly [string | null, string | null, number | null])[]>()
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const row = (
        await pg.query<{ value: string; base: string; plain: string }>(
          `SELECT (${literal}::${type})::text AS value,ARRAY[NULL::${type},${literal}::${type},NULL::${type},${literal}::${type}]::text AS base,ARRAY[${literal}::${type}]::text AS plain`,
        )
      ).rows[0]!
      if (type === 'money') {
        row.value = '0'
        row.base = '{NULL,0,NULL,0}'
        row.plain = '{0}'
      }
      if (type.startsWith('reg')) {
        row.value = '0'
        row.base = '{NULL,0,NULL,0}'
        row.plain = '{0}'
      }
      const needleSql = `(needle::${type}[])[1]`
      samples.set(type, [
        [row.base, row.plain, -1],
        [row.base, null, 1],
        [row.plain, null, null],
        ['{}', row.plain, null],
        ['{}', null, null],
        ['{NULL}', null, 1],
        ['{NULL}', row.plain, 1],
        [null, row.plain, null],
        [row.base, row.plain, null],
        [row.base, null, 999],
      ])
      forms.push({
        name: `family_${index}_first`,
        sql: `array_position(a::${type}[],${needleSql},start) IS NOT DISTINCT FROM expected`,
        type,
        all: false,
        literal,
      })
      forms.push({
        name: `family_${index}_positions`,
        sql: `array_positions(a::${type}[],${needleSql})::text COLLATE "C" IS NOT DISTINCT FROM expected_positions COLLATE "C"`,
        type,
        all: true,
        literal,
      })
    }
    for (const form of forms)
      await pg.exec(`ALTER TABLE search_families ADD CONSTRAINT ${form.name} CHECK(${form.sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'search_families')!
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms)
      for (const [a, needle, start] of samples.get(form.type)!) {
        let first: number | null = null,
          positions: string | null = null
        try {
          first = (
            await pg.query<{ value: number | null }>(
              `SELECT array_position($1::${form.type}[],($2::${form.type}[])[1],$3::integer) AS value`,
              [a, needle, start],
            )
          ).rows[0]!.value
        } catch {}
        try {
          positions = (
            await pg.query<{ value: string | null }>(
              `SELECT array_positions($1::${form.type}[],($2::${form.type}[])[1])::text AS value`,
              [a, needle],
            )
          ).rows[0]!.value
        } catch {}
        await pg.exec('TRUNCATE search_families_oracle')
        await pg.query('INSERT INTO search_families_oracle VALUES($1,$2,$3,$4,$5)', [
          a,
          needle,
          start,
          first,
          positions,
        ])
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${form.sql} AS value FROM search_families_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        references.push({ name: form.name, a, needle, start, first, positions, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: {
              a: known(a),
              needle: known(needle),
              start: known(start),
              expected: known(first),
              expected_positions: known(positions),
            },
            expected,
          })
      }
    expect(arrayScalarProfiles).toHaveLength(58)
    await writeFile(
      'artifacts/array-search/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-search/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraysearchfamilies',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('retains earliest possible positions, skips prefixes before the start and preserves partial-array search states', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-search-partial-'))
  try {
    const evaluatorSource =
      'pub fn evaluate_check()->CheckOutcome {let result=array_search_partial_probe();check_from_bool(result)}'
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_search.rs',
        source: String.raw`
fn array_search_partial_array(first:i32,second:i32)->ArrayValue {
 let mut cells:Vec<ArrayElement>=Vec::new();
 let mut dimensions:Vec<ArrayDimension>=Vec::new();
 let mut a=ArrayElement::Unknown;let mut b=ArrayElement::Unknown;
 if first == -11 {a=ArrayElement::Null;};
 if first >= 0 {a=array_element_from_int4(make_int4_value(first));};
 if second == -11 {b=ArrayElement::Null;};
 if second >= 0 {b=array_element_from_int4(make_int4_value(second));};
 cells.push(a);cells.push(b);dimensions.push(ArrayDimension{lower:-2,length:2});
 ArrayValue::Value(ArrayPayload{element_type:"pg_catalog.int4".to_owned(),element_kind:2,dimensions:dimensions,elements:cells})
}
fn array_search_partial_run(input:ArrayValue,needle:ArrayElement,start:Int4Value,all:bool)->Int4Value {
 let payload=prepare_array_search(input,needle,start,true,true);
 let mut result=array_search_initial(&payload);
 let mut index=array_search_start(&payload);
 let mut values=make_array_arguments("pg_catalog.int4",2);
 while array_search_continues(&payload,index,result,all) {
  let a=array_search_needle(&payload);
  let b=array_membership_element_at(&payload,index,false);
  let pair=array_comparison_pair(a.clone(),b.clone(),true);
  let mut compared=pair;
  if array_pair_requires_scalar(pair) {
   let left=array_element_to_int4(a);let right=array_element_to_int4(b);
   compared=array_equality_step(sql__pg_catalog__int4eq__lrxe(left,right));
  };
  result=array_search_result_step(&payload,index,compared);
  values=array_search_append(values,result);
  index=array_text_next_index(index);
 }
 if all {
  let positions=finish_array_search_positions(&payload,values,result);
  return sql__pg_catalog__cardinality__m1rn(positions);
 };
 result
}
pub fn array_search_partial_probe()->BoolValue {
 let one=array_element_from_int4(make_int4_value(1));
 let start=make_int4_value(-2);
 let unknown_first=array_search_partial_array(-10,1);
 if array_search_partial_run(unknown_first.clone(),one.clone(),start,false)!=Int4Value::Unknown {return BoolValue::Value(false);};
 if array_search_partial_run(unknown_first.clone(),one.clone(),make_int4_value(-1),false)!=make_int4_value(-1) {return BoolValue::Value(false);};
 if array_search_partial_run(unknown_first,one.clone(),start,true)!=Int4Value::Unknown {return BoolValue::Value(false);};
 let known_first=array_search_partial_array(1,-10);
 if array_search_partial_run(known_first.clone(),one.clone(),start,false)!=make_int4_value(-2) {return BoolValue::Value(false);};
 if array_search_partial_run(known_first,one.clone(),start,true)!=Int4Value::Unknown {return BoolValue::Value(false);};
 let null_first=array_search_partial_array(-11,1);
 if array_search_partial_run(null_first.clone(),ArrayElement::Null,start,false)!=make_int4_value(-2) {return BoolValue::Value(false);};
 if array_search_partial_run(null_first,ArrayElement::Null,start,true)!=make_int4_value(1) {return BoolValue::Value(false);};
 let null_unknown=array_search_partial_array(-11,-10);
 if array_search_partial_run(null_unknown,ArrayElement::Unknown,start,false)!=Int4Value::Unknown {return BoolValue::Value(false);};
 if array_search_partial_run(ArrayValue::Null,ArrayElement::Unknown,Int4Value::Null,false)!=Int4Value::Null {return BoolValue::Value(false);};
 let empty=finish_array_constructor(make_array_arguments("pg_catalog.int4",2));
 if array_search_partial_run(empty,ArrayElement::Unknown,Int4Value::Null,true)!=make_int4_value(0) {return BoolValue::Value(false);};
 let beyond=array_search_partial_array(-10,1);
 if array_search_partial_run(beyond,one,make_int4_value(0),false)!=Int4Value::Null {return BoolValue::Value(false);};
 let no_nulls=array_search_partial_array(1,2);
 if array_search_partial_run(no_nulls,ArrayElement::Null,Int4Value::Null,false)!=Int4Value::Null {return BoolValue::Value(false);};
 let uncertain_null=array_search_partial_array(-10,1);
 let conditional=prepare_array_search(uncertain_null,ArrayElement::Null,start,true,false);
 if array_search_initial(&conditional)!=Int4Value::Unknown {return BoolValue::Value(false);};
 let known_null=array_search_partial_array(-11,1);
 let missing=prepare_array_search(known_null.clone(),ArrayElement::Unknown,start,true,false);
 if array_search_initial(&missing)!=Int4Value::Error(make_sql_error(6822435)) {return BoolValue::Value(false);};
 let null_start=prepare_array_search(known_null,ArrayElement::Unknown,Int4Value::Null,true,false);
 if array_search_initial(&null_start)!=Int4Value::Error(make_sql_error(3452548)) {return BoolValue::Value(false);};
 let nonnull=array_search_partial_array(1,2);
 let uncertain_start=prepare_array_search(nonnull,ArrayElement::Unknown,Int4Value::Null,true,false);
 if array_search_initial(&uncertain_start)!=Int4Value::Unknown {return BoolValue::Value(false);};
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
      'arraysearchpartial',
      group,
      ['partial'],
      [{ name: 'partial', row: {}, expected: { kind: 'True' } }],
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('preserves search preparation, nominal compatible types and reached collation requirements', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-search-context-'))
  try {
    await pg.exec(
      "CREATE SCHEMA search_first;CREATE SCHEMA search_second;CREATE TYPE search_first.stage AS ENUM ('new','done');CREATE TYPE search_second.stage AS ENUM ('done','new');CREATE TABLE search_context(a text,needle text,bypass boolean)",
    )
    const forms = {
      first: 'array_position(a::text[],needle) IS NULL',
      positions: 'cardinality(array_positions(a::text[],needle)) >= 0',
      explicit: 'array_position(a::text[] COLLATE "C",needle COLLATE "C") IS NULL',
      null_source: 'array_position(NULL::text[],needle) IS NULL',
      null_positions: 'array_positions(NULL::text[],needle) IS NULL',
      constant_rank:
        "CASE WHEN bypass THEN true ELSE array_position('{{1}}'::integer[],1) IS NULL END",
      runtime_rank:
        "CASE WHEN bypass THEN true ELSE array_position('{{1}}'::text::integer[],1) IS NULL END",
      pruned: "CASE WHEN true THEN true ELSE array_position('{{1}}'::integer[],1) IS NULL END",
      constant_missing:
        "CASE WHEN bypass THEN true ELSE array_position('{NULL}'::json[],NULL) IS NULL END",
      empty_start: "array_position('{}'::json[],NULL,NULL) IS NULL",
      null_start: 'array_position(ARRAY[1],NULL,NULL) IS NULL',
      enum_literal:
        "array_position(ARRAY['new'::search_first.stage,'done'::search_first.stage],'done') = 2",
      raw_array_literal: "array_position('{1,2}',1) = 1",
      mixed_numeric: 'array_position(ARRAY[1::numeric],1::float8) = 1',
    }
    const catalog = await snapshotCatalog(pg),
      original = catalog.tables.find((item) => item.name === 'search_context')!
    const table = {
      ...original,
      columns: original.columns.map((column) =>
        column.name === 'a' || column.name === 'needle'
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
    for (const [a, needle, context] of [
      [null, 'x', false],
      ['{}', 'x', false],
      ['{NULL}', null, false],
      ['{x}', null, false],
      ['{x}', 'x', true],
      ['{x}', 'z', true],
      ['{NULL,x}', null, false],
      ['{{x}}', 'x', false],
    ] as const)
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE search_context')
        await pg.query('INSERT INTO search_context VALUES($1,$2,$3)', [a, needle, bypass])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${sql} AS value FROM search_context`,
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          references.push({ name, a, needle, bypass, postgres: expected })
          if (context && ['first', 'positions'].includes(name)) expected = { kind: 'Unknown' }
          fixtures.push({
            name,
            row: { a: known(a), needle: known(needle), bypass: known(bypass) },
            expected,
          })
        }
      }
    for (const name of ['null_source', 'null_positions'])
      fixtures.push({ name, row: { needle: { kind: 'Unknown' } }, expected: { kind: 'True' } })
    for (const sql of [
      "array_position(ARRAY['new'::search_first.stage],'new'::search_second.stage) IS NULL",
      "array_position(ARRAY[1],'bad'::text) IS NULL",
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
    await writeFile(
      'artifacts/array-search/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-search/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraysearchcontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
