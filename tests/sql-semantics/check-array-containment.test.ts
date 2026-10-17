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

type Pair = readonly [string | null, string | null]
type Fixture = { name: string; row: Row; expected: Outcome }
const known = (value: string | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

async function proveContainment(
  pg: PGlite,
  directory: string,
  owner: string,
  forms: readonly { name: string; sql: string; profile: string }[],
  pairs: ReadonlyMap<string, readonly Pair[]>,
  extra: readonly Fixture[] = [],
) {
  await pg.exec(
    'CREATE TABLE containment_values(a text,b text,bypass boolean);CREATE TABLE containment_oracle(LIKE containment_values)',
  )
  for (const form of forms)
    await pg.exec(`ALTER TABLE containment_values ADD CONSTRAINT ${form.name} CHECK(${form.sql})`)
  const catalog = await snapshotCatalog(pg),
    table = catalog.tables.find((item) => item.name === 'containment_values')!
  const plans = forms.flatMap((form) =>
    (['source', 'stored'] as const).map((origin) => {
      const constraint = table.constraints.find((item) => item.name === form.name)!
      const plan = lowerTableCheck(
        table,
        origin === 'source' ? { ...constraint, definition: `CHECK(${form.sql})` } : constraint,
        catalog.enums,
        catalog.domains,
        origin,
      )!
      return {
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: form.name + '_' + origin,
        },
        expression: portableCheckAtoms(plan.expression),
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
  if (owner === 'shapes') expect(group.requiresRegex).toBe(false)
  expect(group.evaluatorSource).toContain('while array_membership_scan_continues(&')
  const fixtures: Fixture[] = [],
    references: unknown[] = []
  for (const form of forms)
    for (const [a, b] of pairs.get(form.profile)!) {
      await pg.exec('TRUNCATE containment_oracle')
      await pg.query('INSERT INTO containment_oracle VALUES($1,$2,false)', [a, b])
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT ${form.sql} AS value FROM containment_oracle`,
          )
        ).rows[0]!.value
        expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        expected = {
          kind: 'Error',
          value: { state: parseInt((error as { code: string }).code, 36) },
        }
      }
      references.push({ name: form.name, a, b, expected })
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: form.name + '_' + origin,
          row: { a: known(a), b: known(b), bypass: known(false) },
          expected,
        })
    }
  fixtures.push(...extra)
  await mkdir('artifacts/array-containment', { recursive: true })
  await writeFile(
    `artifacts/array-containment/${owner}-fixtures.json`,
    JSON.stringify(fixtures, null, 2) + '\n',
  )
  await writeFile(
    `artifacts/array-containment/${owner}-references.json`,
    JSON.stringify(references, null, 2) + '\n',
  )
  await runCheckParity(
    directory,
    'arraycontainment' + owner,
    group,
    plans.map((plan) => plan.identity.constraint),
    fixtures,
  )
}

it('matches raw/stored containment and overlap for duplicates, NULL cells, shape independence, aliases and guarded input errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-containment-shapes-'))
  try {
    await pg.exec('CREATE DOMAIN containment_slots AS integer[]')
    const expressions = {
      contains: 'a::containment_slots @> b::integer[]',
      contained: 'a::integer[] <@ b::integer[]',
      overlap: 'a::integer[] && b::integer[]',
      named_contains: 'arraycontains(a::integer[],b::integer[])',
      named_contained: 'arraycontained(a::integer[],b::integer[])',
      named_overlap: 'arrayoverlap(a::integer[],b::integer[])',
      coalesce: 'COALESCE(a::integer[],ARRAY[1]) @> b::integer[]',
      guarded: 'CASE WHEN bypass THEN true ELSE a::integer[] @> b::integer[] END',
    }
    const arrays = [
      '{}',
      '{NULL}',
      '{1}',
      '{1,1}',
      '{1,2}',
      '{2,1}',
      '{1,NULL}',
      '{NULL,1,2}',
      '[0:1]={1,2}',
      '{{1,2}}',
      '[-2147483648:-2147483647]={1,2}',
      null,
    ]
    const pairs: Pair[] = arrays.flatMap((a) => arrays.map((b) => [a, b] as const))
    const base: Row = { a: known('{1}'), b: known('{1}'), bypass: known(false) }
    await proveContainment(
      pg,
      directory,
      'shapes',
      Object.entries(expressions).map(([name, sql]) => ({ name, sql, profile: 'integer' })),
      new Map([['integer', pairs]]),
      [
        {
          name: 'contains_source',
          row: { ...base, a: { kind: 'Unknown' } },
          expected: { kind: 'Unknown' },
        },
        {
          name: 'contains_stored',
          row: {
            ...base,
            a: known(null),
            b: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          },
          expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        },
        {
          name: 'guarded_source',
          row: { ...base, b: known('{bad}'), bypass: known(true) },
          expected: { kind: 'True' },
        },
        {
          name: 'guarded_stored',
          row: { ...base, b: known('{bad}') },
          expected: { kind: 'Error', value: { state: parseInt('22P02', 36) } },
        },
      ],
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('uses default element equality for every represented scalar/enum profile and retains missing-operator errors for empty and NULL-only arrays', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-containment-families-'))
  try {
    await pg.exec("CREATE TYPE array_stage AS ENUM ('new','done')")
    const pairs = new Map<string, Pair[]>(),
      forms: { name: string; sql: string; profile: string }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const value = `${literal}::${type}`
      const row = (
        await pg.query<{ base: string; shorter: string; shifted: string }>(
          `SELECT ARRAY[${value},NULL::${type}]::text AS base,ARRAY[${value}]::text AS shorter,array_fill(${value},ARRAY[1,2],ARRAY[-1,0])::text AS shifted`,
        )
      ).rows[0]!
      if (type === 'money') {
        row.base = '{0,NULL}'
        row.shorter = '{0}'
        row.shifted = '[-1:-1][0:1]={{0,0}}'
      }
      pairs.set(type, [
        [row.base, row.base],
        [row.base, row.shorter],
        [row.shorter, row.base],
        [row.shorter, row.shifted],
        [row.base, '{}'],
        ['{}', '{}'],
        ['{NULL}', '{NULL}'],
        [null, row.base],
        [row.base, null],
        [null, null],
      ])
      for (const [name, operator] of [
        ['contains', '@>'],
        ['contained', '<@'],
        ['overlap', '&&'],
      ])
        forms.push({
          name: `family_${index}_${name}`,
          sql: `a::${type}[] ${operator} b::${type}[]`,
          profile: type,
        })
    }
    expect(arrayScalarProfiles).toHaveLength(58)
    await proveContainment(pg, directory, 'families', forms, pairs)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('recovers definite membership from partial cells while preserving reached errors and skipped candidates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-containment-partial-'))
  try {
    const evaluatorSource =
      'pub fn evaluate_check()->CheckOutcome {let result=array_containment_partial_probe();check_from_bool(result)}'
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_containment.rs',
        source: String.raw`
fn array_containment_partial_cell(value:i32)->ArrayElement {
 if value == -10 {return ArrayElement::Unknown;};
 if value == -11 {return ArrayElement::Null;};
 if value == -12 {return ArrayElement::Error(make_sql_error(3452582));};
 array_element_from_int4(make_int4_value(value))
}
fn array_containment_partial_array(first:i32,second:i32,count:i32)->ArrayValue {
 let mut cells:Vec<ArrayElement>=Vec::new();
 let mut dimensions:Vec<ArrayDimension>=Vec::new();
 if count>0 {cells.push(array_containment_partial_cell(first));dimensions.push(ArrayDimension{lower:1,length:count});};
 if count>1 {cells.push(array_containment_partial_cell(second));};
 ArrayValue::Value(ArrayPayload{null_bitmap:BoolValue::Unknown,element_type:"pg_catalog.int4".to_owned(),element_kind:2,dimensions:dimensions,elements:cells})
}
fn array_containment_partial_match(left:ArrayValue,right:ArrayValue,all:bool)->BoolValue {
 let payload=prepare_array_membership(left,right,false,true);
 let mut result=array_membership_initial(&payload,all);
 let first=make_int4_value(0);
 let mut index=first;
 while array_membership_continues(&payload,index,result,all) {
  let mut scan=first;
  let mut matched=array_membership_match_initial(&payload,index);
  while array_membership_scan_continues(&payload,index,scan,matched) {
   let left_cell=array_membership_element_at(&payload,index,false);
   let right_cell=array_membership_element_at(&payload,scan,true);
   let pair=array_membership_pair(left_cell.clone(),right_cell.clone());
   let mut comparison=pair;
   if array_pair_requires_scalar(pair) {
    let a=array_element_to_int4(left_cell);let b=array_element_to_int4(right_cell);
    comparison=array_equality_step(sql__pg_catalog__int4eq__lrxe(a,b));
   };
   matched=array_membership_match_step(matched,comparison);
   scan=array_text_next_index(scan);
  }
  result=array_membership_finish_step(result,matched,all);
  index=array_text_next_index(index);
 }
 result
}
pub fn array_containment_partial_probe()->BoolValue {
 let unknown_first=array_containment_partial_array(-10,1,2);
 let one=array_containment_partial_array(1,0,1);
 let two=array_containment_partial_array(2,0,1);
 let unknown_only=array_containment_partial_array(-10,0,1);
 let null_only=array_containment_partial_array(-11,0,1);
 let empty=array_containment_partial_array(0,0,0);
 if array_containment_partial_match(one.clone(),unknown_first.clone(),true)!=BoolValue::Value(true) {return BoolValue::Value(false);};
 if array_containment_partial_match(two.clone(),unknown_first.clone(),true)!=BoolValue::Unknown {return BoolValue::Value(false);};
 if array_containment_partial_match(unknown_first,one.clone(),false)!=BoolValue::Value(true) {return BoolValue::Value(false);};
 if array_containment_partial_match(unknown_only.clone(),null_only.clone(),false)!=BoolValue::Value(false) {return BoolValue::Value(false);};
 if array_containment_partial_match(null_only.clone(),unknown_only.clone(),false)!=BoolValue::Value(false) {return BoolValue::Value(false);};
 if array_containment_partial_match(unknown_only.clone(),empty.clone(),true)!=BoolValue::Value(false) {return BoolValue::Value(false);};
 if array_containment_partial_match(empty,unknown_only,true)!=BoolValue::Value(true) {return BoolValue::Value(false);};
 let unknown_null=array_containment_partial_array(-10,-11,2);
 if array_containment_partial_match(unknown_null,one.clone(),true)!=BoolValue::Value(false) {return BoolValue::Value(false);};
 let later_error=array_containment_partial_array(1,-12,2);
 if array_containment_partial_match(one.clone(),later_error.clone(),true)!=BoolValue::Value(true) {return BoolValue::Value(false);};
 if array_containment_partial_match(later_error.clone(),one,false)!=BoolValue::Value(true) {return BoolValue::Value(false);};
 if array_containment_partial_match(two,later_error.clone(),false)!=BoolValue::Error(make_sql_error(3452582)) {return BoolValue::Value(false);};
 if array_containment_partial_match(null_only,later_error,false)!=BoolValue::Value(false) {return BoolValue::Value(false);};
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
      'arraycontainmentpartial',
      group,
      ['partial'],
      [{ name: 'partial', row: {}, expected: { kind: 'True' } }],
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('prepares immutable containment errors and defers unavailable equality only for reached non-NULL pairs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-containment-context-'))
  try {
    await pg.exec('CREATE TABLE containment_context(a text,b text,bypass boolean,divisor integer)')
    const expressions = {
      contains: 'a::text[] @> b::text[]',
      overlap: 'a::text[] && b::text[]',
      explicit: '(a::text[] COLLATE "C") && (b::text[] COLLATE "C")',
      constant_missing: "CASE WHEN bypass THEN true ELSE '{}'::json[] @> '{}'::json[] END",
      runtime_missing:
        "CASE WHEN bypass THEN true ELSE '{}'::text::json[] @> '{}'::text::json[] END",
      pruned: "CASE WHEN true THEN true ELSE '{}'::json[] && '{}'::json[] END",
      shape_missing: "'{}'::json[] @> '{NULL}'::json[]",
      strict_null: "NULL::json[] && '{}'::json[]",
      element_error: 'ARRAY[1/divisor] @> ARRAY[1]',
    }
    const catalog = await snapshotCatalog(pg),
      original = catalog.tables.find((table) => table.name === 'containment_context')!
    const table = {
      ...original,
      columns: original.columns.map((column) =>
        column.name === 'a' || column.name === 'b'
          ? {
              ...column,
              collationIsC: false,
              collationDeterministic: false,
              collationIsDefault: false,
            }
          : column,
      ),
    }
    const plans = Object.entries(expressions).map(([name, sql]) => ({
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
    const group = prepareCheckRustGroup(plans, { arrayNulls: true, serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const samples: (readonly [string | null, string | null, boolean])[] = [
      ['{}', '{a}', false],
      ['{a}', '{}', false],
      ['{NULL}', '{NULL}', false],
      ['{a}', '{a}', true],
      ['{a}', '{NULL}', false],
      [null, '{a}', false],
    ]
    const fixtures: Fixture[] = [],
      references: unknown[] = []
    for (const [a, b, needsContext] of samples)
      for (const bypass of [false, true])
        for (const divisor of [0, 1]) {
          await pg.exec('TRUNCATE containment_context')
          await pg.query('INSERT INTO containment_context VALUES($1,$2,$3,$4)', [
            a,
            b,
            bypass,
            divisor,
          ])
          for (const [name, sql] of Object.entries(expressions)) {
            let expected: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${sql} AS value FROM containment_context`,
                )
              ).rows[0]!.value
              expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (error) {
              expected = {
                kind: 'Error',
                value: { state: parseInt((error as { code: string }).code, 36) },
              }
            }
            references.push({ name, a, b, bypass, divisor, postgres: expected })
            if (needsContext && ['contains', 'overlap'].includes(name))
              expected = { kind: 'Unknown' }
            fixtures.push({
              name,
              row: {
                a: known(a),
                b: known(b),
                bypass: known(bypass),
                divisor: { kind: 'Value', value: divisor },
              },
              expected,
            })
          }
        }
    for (const [sql, code] of [
      ['ARRAY[1] @> ARRAY[1::bigint]', '42883'],
      ['(ARRAY[\'a\'] COLLATE "C") && (ARRAY[\'a\'] COLLATE "POSIX")', '42P21'],
    ]) {
      await expect(pg.query('SELECT ' + sql)).rejects.toMatchObject({ code })
      expect(
        lowerTableCheck(
          table,
          { name: 'invalid', type: 'check', definition: `CHECK(${sql})` },
          [],
          [],
          'source',
        )!.expression,
      ).toEqual({ kind: 'uncertain' })
    }
    await writeFile(
      'artifacts/array-containment/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-containment/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycontainmentcontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
