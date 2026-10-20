import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'

it('carries owned range support independently of subtype and defers only reached unavailable support', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-support-values-'))
  const pg = await PGlite.create()
  try {
    await pg.exec(`
CREATE TYPE continuous AS RANGE(subtype=integer,multirange_type_name=continuousmulti);
CREATE TYPE discrete;
CREATE FUNCTION discrete_canonical(discrete) RETURNS discrete
AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
CREATE TYPE discrete AS RANGE(subtype=integer,canonical=discrete_canonical,multirange_type_name=discretemulti);
CREATE TYPE unavailable;
CREATE FUNCTION unavailable_canonical(unavailable) RETURNS unavailable
AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
CREATE TYPE unavailable AS RANGE(subtype=integer,canonical=unavailable_canonical);
`)
    const native: { sql: string; rust: string }[] = []
    for (const [name, canonical] of [
      ['continuous', 1],
      ['discrete', 2],
    ] as const) {
      for (const flags of ['[]', '[)', '(]', '()']) {
        native.push({
          sql: `${name}(1,2,'${flags}')::text = '${name === 'continuous' ? flags[0] + '1,2' + flags[1] : flags === '[]' ? '[1,3)' : flags === '[)' ? '[1,2)' : flags === '(]' ? '[2,3)' : 'empty'}'`,
          rust: `sql__pg_catalog__texteq__aet8(range_to_text(support_construct("public.${name}",${canonical},1,2,"${flags}")),make_text_value("${name === 'continuous' ? flags[0] + '1,2' + flags[1] : flags === '[]' ? '[1,3)' : flags === '[)' ? '[1,2)' : flags === '(]' ? '[2,3)' : 'empty'}"))`,
        })
      }
      native.push(
        {
          sql: `${name}(1,2,'[]') -|- ${name}(3,4,'[]')`,
          rust: `sql__pg_catalog__range_adjacent__03u0(support_construct("public.${name}",${canonical},1,2,"[]"),support_construct("public.${name}",${canonical},3,4,"[]"))`,
        },
        {
          sql: `(${name}(1,4,'[]') * ${name}(2,5,'[]'))::text = '${canonical === 1 ? '[2,4]' : '[2,5)'}'`,
          rust: `sql__pg_catalog__texteq__aet8(range_to_text(sql__pg_catalog__range_intersect__4pce(support_construct("public.${name}",${canonical},1,4,"[]"),support_construct("public.${name}",${canonical},2,5,"[]"))),make_text_value("${canonical === 1 ? '[2,4]' : '[2,5)'}"))`,
        },
        {
          sql: `(${name}(1,4,'[]') - ${name}(2,5,'[]'))::text = '[1,2)'`,
          rust: `sql__pg_catalog__texteq__aet8(range_to_text(sql__pg_catalog__range_minus__f67g(support_construct("public.${name}",${canonical},1,4,"[]"),support_construct("public.${name}",${canonical},2,5,"[]"))),make_text_value("[1,2)"))`,
        },
        {
          sql: `range_merge(${name}multi(${name}(1,2,'[]'),${name}(4,5,'[]')))::text = '${canonical === 1 ? '[1,5]' : '[1,6)'}'`,
          rust: `sql__pg_catalog__texteq__aet8(range_to_text(sql__pg_catalog__range_merge__f619(support_multi("public.${name}",${canonical}))),make_text_value("${canonical === 1 ? '[1,5]' : '[1,6)'}"))`,
        },
        {
          sql: `${name}multi(${name}(1,2,'[]'),${name}(3,4,'[]'))::text = '${canonical === 1 ? '{[1,2],[3,4]}' : '{[1,5)}'}'`,
          rust: `support_multirange_normalization("public.${name}",${canonical},${canonical === 1 ? 2 : 1})`,
        },
      )
    }
    native.push({
      sql: `isempty(unavailable(1,1,'()'))`,
      rust: 'range_empty_state(support_construct("public.unavailable",0,1,1,"()"))',
    })
    const expected: Outcome[] = []
    for (const item of native) {
      const result = (await pg.query<{ result: boolean }>(`SELECT ${item.sql} AS result`)).rows[0]!
      expected.push({ kind: result.result ? 'True' : 'False' })
    }
    const partial: { rust: string; expected: Outcome }[] = [
      {
        rust: 'range_is_null(support_construct("public.unavailable",0,1,2,"[]"))',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'range_empty_state(support_empty("public.unavailable",2,0))',
        expected: { kind: 'True' },
      },
      {
        rust: 'range_empty_state(support_empty("public.continuous",0,1))',
        expected: { kind: 'True' },
      },
      { rust: 'support_owned_snapshots()', expected: { kind: 'True' } },
      { rust: 'support_mismatch()', expected: { kind: 'True' } },
      { rust: 'support_missing_comparison()', expected: { kind: 'True' } },
      { rust: 'support_missing_canonical()', expected: { kind: 'True' } },
      { rust: 'support_states()', expected: { kind: 'True' } },
      { rust: 'support_builtin_array_defaults()', expected: { kind: 'True' } },
    ]
    const nativeErrors = [
      {
        sql: "unavailable(3,1,'[]')",
        rust: 'range_is_null(support_construct("public.unavailable",0,3,1,"[]"))',
      },
      {
        sql: "continuous(1,2,'invalid')",
        rust: 'range_is_null(support_construct("public.continuous",1,1,2,"invalid"))',
      },
      {
        sql: "discrete(2147483647,2147483647,'[]')",
        rust: 'range_is_null(support_construct("public.discrete",2,2147483647,2147483647,"[]"))',
      },
    ]
    for (const item of nativeErrors) {
      let state: string | undefined
      try {
        await pg.query('SELECT ' + item.sql)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string')
          state = error.code
        else throw error
      }
      expect(state).toMatch(/^[0-9A-Z]{5}$/u)
      partial.push({
        rust: item.rust,
        expected: { kind: 'Error', value: { state: parseInt(state!, 36) } },
      })
    }
    const entryName = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'range_support',
      constraint: 'values',
    })
    const evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let value=support_values_probe(mode);check_from_bool(value)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/range_support_values.rs',
        source:
          String.raw`
fn support_construct(identity:&str,canonical:i32,lower:i32,upper:i32,flags:&str)->RangeValue {
 range_construct_with_support(identity,"pg_catalog.int4",2,ArrayElement::Int4(lower),ArrayElement::Int4(upper),make_text_value(flags),RangeSupport {comparison:2,canonical})
}
fn support_empty(identity:&str,comparison:i32,canonical:i32)->RangeValue {
 range_from_profiled_bounds(identity,"pg_catalog.int4",2,true,false,false,ArrayElement::Null,ArrayElement::Null,RangeSupport {comparison,canonical})
}
fn support_stored(comparison:i32,canonical:i32)->RangeValue {
 range_from_profiled_bounds("public.unavailable","pg_catalog.int4",2,false,true,false,ArrayElement::Int4(1),ArrayElement::Int4(3),RangeSupport {comparison,canonical})
}
fn support_multi(identity:&str,canonical:i32)->MultirangeValue {
 let mut ranges:Vec<RangeValue>=Vec::new();
 ranges.push(support_construct(identity,canonical,1,2,"[]"));ranges.push(support_construct(identity,canonical,4,5,"[]"));
 multirange_from_profiled_ranges("public.multivalue",identity,"pg_catalog.int4",2,ranges,RangeSupport {comparison:2,canonical})
}
fn support_multirange_normalization(identity:&str,canonical:i32,count:i32)->BoolValue {
 let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(support_construct(identity,canonical,3,4,"[]"));ranges.push(support_construct(identity,canonical,1,2,"[]"));
 let normalized=multirange_construct_normalize(MultirangePayload {type_name:"public.multivalue".to_owned(),range_type:identity.to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:RangeSupport {comparison:2,canonical},ranges});
 if let MultirangeValue::Value(payload)=normalized {
  if range_support_equal(payload.support,RangeSupport {comparison:2,canonical})==false {return BoolValue::Value(false);};
  return BoolValue::Value(payload.ranges.len() as i32==count);
 };
 BoolValue::Value(false)
}
fn support_owned_snapshots()->BoolValue {
 let original=support_multi("public.continuous",1);let saved=original.clone();
 let extracted=multirange_boundary(original.clone(),false);
 let mut replacement:Vec<RangeValue>=Vec::new();replacement.push(support_construct("public.continuous",2,1,2,"[]"));
 let revised=multirange_from_profiled_ranges("public.multivalue","public.continuous","pg_catalog.int4",2,replacement,RangeSupport {comparison:2,canonical:2});
 if array_element_to_int4(range_bound(extracted.clone(),true))!=make_int4_value(2) {return BoolValue::Value(false);};
 if array_element_to_int4(multirange_bound(revised,true))!=make_int4_value(3) {return BoolValue::Value(false);};
 if array_element_to_int4(multirange_bound(saved.clone(),true))!=make_int4_value(5) {return BoolValue::Value(false);};
 if let MultirangeValue::Value(payload)=saved {
  if range_support_equal(payload.support,RangeSupport {comparison:2,canonical:1})==false {return BoolValue::Value(false);};
 };
 let mut elements:Vec<ArrayElement>=Vec::new();elements.push(array_element_from_multirange(original));elements.push(ArrayElement::Null);
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:-1,length:2});
 let array=make_array_value(ArrayPayload {element_type:"public.multivalue".to_owned(),element_kind:43,dimensions,elements,null_bitmap:BoolValue::Value(true)});
 if let ArrayValue::Value(payload)=array {
  let cell=array_element_to_multirange(payload.elements[0].clone());
  return sql__pg_catalog__texteq__aet8(range_to_text(sql__pg_catalog__range_merge__f619(cell)),make_text_value("[1,5]"));
 };
 BoolValue::Value(false)
}
fn support_mismatch()->BoolValue {
 let first=support_construct("public.continuous",1,1,2,"[]");let second=support_construct("public.continuous",2,1,2,"[]");
 if sql__pg_catalog__range_cmp__8jgl(first.clone(),second.clone())!=Int4Value::Unknown {return BoolValue::Value(false);};
 if range_is_null(range_require_support(first,RangeSupport {comparison:2,canonical:2}))!=BoolValue::Unknown {return BoolValue::Value(false);};
 let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(second);
 let mixed=multirange_from_profiled_ranges("public.multi","public.continuous","pg_catalog.int4",2,ranges,RangeSupport {comparison:2,canonical:1});
 if multirange_is_null(mixed)!=BoolValue::Unknown {return BoolValue::Value(false);};
 let empty:Vec<RangeValue>=Vec::new();
 let invalid=multirange_from_profiled_ranges("public.multi","public.continuous","pg_catalog.int4",2,empty,RangeSupport {comparison:3,canonical:1});
 if multirange_is_null(invalid)!=BoolValue::Unknown {return BoolValue::Value(false);};
 let forged=range_from_profiled_bounds("pg_catalog.int4range","pg_catalog.int4",2,true,false,false,ArrayElement::Null,ArrayElement::Null,RangeSupport {comparison:2,canonical:1});
 BoolValue::Value(range_is_null(forged)==BoolValue::Unknown)
}
fn support_missing_comparison()->BoolValue {
 let stored=support_stored(0,1);let empty=support_empty("public.unavailable",0,1);
 if range_is_null(stored.clone())!=BoolValue::Value(false) {return BoolValue::Value(false);};
 if array_element_to_int4(range_bound(stored.clone(),true))!=make_int4_value(3) {return BoolValue::Value(false);};
 if sql__pg_catalog__range_cmp__8jgl(stored.clone(),stored.clone())!=Int4Value::Unknown {return BoolValue::Value(false);};
 if sql__pg_catalog__range_cmp__8jgl(empty.clone(),stored.clone())!=make_int4_value(-1) {return BoolValue::Value(false);};
 let selected=sql__pg_catalog__range_union__8koj(empty,stored);
 BoolValue::Value(array_element_to_int4(range_bound(selected,true))==make_int4_value(3))
}
fn support_missing_canonical()->BoolValue {
 let stored=support_stored(2,0);let empty=support_empty("public.unavailable",2,0);
 if sql__pg_catalog__range_cmp__8jgl(stored.clone(),stored.clone())!=make_int4_value(0) {return BoolValue::Value(false);};
 let selected=sql__pg_catalog__range_union__8koj(empty.clone(),stored.clone());
 if array_element_to_int4(range_bound(selected,true))!=make_int4_value(3) {return BoolValue::Value(false);};
 if range_empty_state(sql__pg_catalog__range_intersect__4pce(empty,stored.clone()))!=BoolValue::Value(true) {return BoolValue::Value(false);};
 if range_is_null(sql__pg_catalog__range_intersect__4pce(stored.clone(),stored.clone()))!=BoolValue::Unknown {return BoolValue::Value(false);};
 let ranges:Vec<RangeValue>=Vec::new();
 let multirange=multirange_from_profiled_ranges("public.multi","public.unavailable","pg_catalog.int4",2,ranges,RangeSupport {comparison:2,canonical:0});
 let hull=sql__pg_catalog__range_merge__f619(multirange);
 if let RangeValue::Value(payload)=hull {return BoolValue::Value(payload.empty && payload.support.canonical==0);};
 BoolValue::Value(false)
}
fn support_states()->BoolValue {
 let first=make_sql_error(3452582);let second=make_sql_error(3452547);
 if range_is_null(range_require_support(RangeValue::Null,RangeSupport {comparison:2,canonical:1}))!=BoolValue::Value(true) {return BoolValue::Value(false);};
 if range_is_null(range_require_support(RangeValue::Error(first),range_unknown_support()))!=BoolValue::Error(first) {return BoolValue::Value(false);};
 let value=range_construct_with_support("public.continuous","pg_catalog.int4",2,ArrayElement::Error(first),ArrayElement::Error(second),TextValue::Null,range_unknown_support());
 if range_is_null(value)!=BoolValue::Error(first) {return BoolValue::Value(false);};
 let invalid=range_construct_with_support("public.continuous","pg_catalog.int4",2,ArrayElement::Int4(1),ArrayElement::Int4(2),TextValue::Null,RangeSupport {comparison:2,canonical:1});
 BoolValue::Value(range_is_null(invalid)==BoolValue::Error(make_sql_error(3452544)))
}
fn support_builtin_array_defaults()->BoolValue {
 let mut bounds:Vec<ArrayElement>=Vec::new();bounds.push(ArrayElement::Int4(1));bounds.push(ArrayElement::Int4(3));
 let raw=RangePayload {type_name:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:range_unknown_support(),empty:false,lower_inclusive:true,upper_inclusive:false,bounds};
 let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(RangeValue::Value(raw.clone()));
 let multi=MultirangePayload {type_name:"pg_catalog.int4multirange".to_owned(),range_type:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:range_unknown_support(),ranges};
 let mut multi_cells:Vec<ArrayElement>=Vec::new();multi_cells.push(ArrayElement::Multirange(multi));
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:1,length:1});
 let multi_array=make_array_value(ArrayPayload {element_type:"pg_catalog.int4multirange".to_owned(),element_kind:43,dimensions:dimensions,elements:multi_cells,null_bitmap:BoolValue::Value(false)});
 let restored_multi=array_element_to_multirange(array_flat_element(multi_array,make_int4_value(0)));
 if multirange_is_null(multirange_require_support(restored_multi.clone(),RangeSupport {comparison:2,canonical:2}))!=BoolValue::Value(false) {return BoolValue::Value(false);};
 let mut cells:Vec<ArrayElement>=Vec::new();cells.push(ArrayElement::Range(raw));
 let mut inner_dimensions:Vec<ArrayDimension>=Vec::new();inner_dimensions.push(ArrayDimension {lower:1,length:1});
 let inner=make_array_value(ArrayPayload {element_type:"pg_catalog.int4range".to_owned(),element_kind:42,dimensions:inner_dimensions,elements:cells,null_bitmap:BoolValue::Value(false)});
 let mut nested:Vec<ArrayElement>=Vec::new();nested.push(array_element_from_array(inner));
 let mut outer_dimensions:Vec<ArrayDimension>=Vec::new();outer_dimensions.push(ArrayDimension {lower:1,length:1});
 let outer=make_array_value(ArrayPayload {element_type:"public.range_history".to_owned(),element_kind:41,dimensions:outer_dimensions,elements:nested,null_bitmap:BoolValue::Value(false)});
 let restored_inner=array_element_to_array(array_flat_element(outer,make_int4_value(0)));
 let span=array_element_to_range(array_flat_element(restored_inner,make_int4_value(0)));
 if range_is_null(range_require_support(span.clone(),RangeSupport {comparison:2,canonical:2}))!=BoolValue::Value(false) {return BoolValue::Value(false);};
 BoolValue::Value(sql__pg_catalog__range_cmp__8jgl(span,multirange_boundary(restored_multi,false))==make_int4_value(0))
}
pub fn support_values_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
` +
          [...native.map((c) => c.rust), ...partial.map((c) => c.rust)]
            .map((rust, mode) => `if selected==${mode} {return ${rust};};`)
            .join('\n') +
          `
 };
 BoolValue::Unknown
}
`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported',
          entryName,
          inputs: [
            { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          ],
        },
      ],
    }
    expected.push(...partial.map((c) => c.expected))
    await runCheckParity(
      directory,
      'rangesupportvalues',
      group,
      ['support'],
      expected.map((outcome, mode) => ({
        name: 'support',
        row: { mode: { kind: 'Value', value: mode } },
        expected: outcome,
      })),
    )
    const runtime = await import(
      pathToFileURL(join(directory, 'typescript/checkruntime/runtime.ts')).href
    )
    const raw = {
      typeName: 'public.multivalue',
      rangeType: 'public.continuous',
      elementType: 'pg_catalog.int4',
      elementKind: 2,
      support: { comparison: 2, canonical: 1 },
      ranges: [
        {
          kind: 'Value',
          value: {
            typeName: 'public.continuous',
            elementType: 'pg_catalog.int4',
            elementKind: 2,
            support: { comparison: 2, canonical: 1 },
            empty: false,
            lowerInclusive: true,
            upperInclusive: true,
            bounds: [
              { kind: 'Int4', value: 1 },
              { kind: 'Int4', value: 2 },
            ],
          },
        },
      ],
    }
    const owned = runtime.makeCoercedMultirangeValue(raw)
    const copied = runtime.copyMultirangeValue(owned)
    raw.ranges.length = 0
    owned.value.ranges[0] = runtime.rangeFromProfiledBounds(
      'public.continuous',
      'pg_catalog.int4',
      2,
      false,
      true,
      false,
      { kind: 'Int4', value: 1 },
      { kind: 'Int4', value: 3 },
      { comparison: 2, canonical: 2 },
    )
    expect(copied.value.support).toEqual({ comparison: 2, canonical: 1 })
    const extracted = runtime.multirangeBoundary(copied, false)
    extracted.value.bounds[0] = { kind: 'Int4', value: 99 }
    expect(copied.value.ranges[0].value.support).toEqual({ comparison: 2, canonical: 1 })
    const array = runtime.makeArrayValue({
      elementType: 'public.multivalue',
      elementKind: 43,
      dimensions: [{ lower: 1, length: 1 }],
      nullBitmap: { kind: 'Value', value: false },
      elements: [{ kind: 'Multirange', value: copied.value }],
    })
    copied.value.ranges[0] = owned.value.ranges[0]
    expect(array.value.elements[0].value.support).toEqual({ comparison: 2, canonical: 1 })
    expect(array.value.elements[0].value.ranges[0].value.support).toEqual({
      comparison: 2,
      canonical: 1,
    })
    const runtimeSource = await readFile(
      join(directory, 'typescript/checkruntime/runtime.ts'),
      'utf8',
    )
    expect(runtimeSource).toMatch(
      /interface RangeSupport \{\s+readonly comparison: number;\s+readonly canonical: number;/u,
    )
    await mkdir('artifacts/check-range-support-values', { recursive: true })
    await writeFile(
      'artifacts/check-range-support-values/report.json',
      JSON.stringify(
        {
          nativeCases: native.length,
          nativeErrorCases: nativeErrors.length,
          partialCases: partial.length - nativeErrors.length,
          fixtures: native.length + partial.length,
          ownedProfileSnapshots: true,
          customSqlAdmission: false,
        },
        null,
        2,
      ) + '\n',
    )
    expect(native).toHaveLength(19)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120_000)
