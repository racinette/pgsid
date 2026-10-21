import { it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves multirange partial bounds, ordered errors, nominal validation and independent extracted range snapshots', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-state-'))
  try {
    const entryName = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'multirange',
      constraint: 'state',
    })
    const evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let value=multirange_state_probe(mode);check_from_bool(value)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/multirange_state_probe.rs',
        source: String.raw`
fn multirange_state_span(lower:ArrayElement,upper:ArrayElement)->RangeValue {
 range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,false,true,false,lower,upper)
}
fn multirange_state_pack(ranges:Vec<RangeValue>)->MultirangeValue {
 make_coerced_multirange_value(MultirangePayload {type_name:"pg_catalog.int4multirange".to_owned(),range_type:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:range_builtin_support("pg_catalog.int4range","pg_catalog.int4",2),ranges})
}
fn multirange_state_single(span:RangeValue)->MultirangeValue {
 let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(span);multirange_state_pack(ranges)
}
fn multirange_state_revise(span:RangeValue)->RangeValue {
 if let RangeValue::Value(payload)=span {
  let mut bounds=payload.bounds;bounds[1]=ArrayElement::Int4(2);
  return make_coerced_range_value(RangePayload {bound_profile:payload.bound_profile,enum_labels:payload.enum_labels,enum_count:payload.enum_count,type_name:payload.type_name,element_type:payload.element_type,element_kind:payload.element_kind,support:payload.support,empty:payload.empty,lower_inclusive:payload.lower_inclusive,upper_inclusive:payload.upper_inclusive,bounds});
 };
 span
}
fn multirange_state_replace(input:MultirangeValue,span:RangeValue)->MultirangeValue {
 if let MultirangeValue::Value(payload)=input {
  let mut ranges=payload.ranges;ranges[0]=span;
  return make_coerced_multirange_value(MultirangePayload {type_name:payload.type_name,range_type:payload.range_type,element_type:payload.element_type,element_kind:payload.element_kind,support:payload.support,ranges});
 };
 input
}
fn multirange_state_upper(input:MultirangeValue)->Int4Value {
 array_element_to_int4(multirange_bound(input,true))
}
pub fn multirange_state_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Error(error)=mode {return BoolValue::Error(error);};
 if let Int4Value::Value(selected)=mode {
  let first=make_sql_error(3452582);let second=make_sql_error(3452547);
  if selected==0 {return multirange_is_null(multirange_null());};
  if selected==1 {return multirange_is_null(multirange_unknown());};
  if selected==2 {return multirange_is_null(MultirangeValue::Error(first));};
  if selected==3 {
   let ranges:Vec<RangeValue>=Vec::new();let empty=multirange_state_pack(ranges);
   if multirange_empty_state(empty.clone())!=BoolValue::Value(true) || multirange_is_null(empty.clone())!=BoolValue::Value(false) {return BoolValue::Value(false);};
   if array_element_to_int4(multirange_bound(empty.clone(),false))!=Int4Value::Null || multirange_state_upper(empty.clone())!=Int4Value::Null {return BoolValue::Value(false);};
   if multirange_bound_flag(empty.clone(),false,true)!=BoolValue::Value(false) || multirange_bound_flag(empty,true,false)!=BoolValue::Value(false) {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if selected==4 {
   if multirange_empty_state(MultirangeValue::Null)!=BoolValue::Null || multirange_bound_flag(MultirangeValue::Null,false,true)!=BoolValue::Null || multirange_state_upper(MultirangeValue::Null)!=Int4Value::Null {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if selected==5 {return multirange_is_null(multirange_state_single(RangeValue::Null));};
  if selected==6 {return multirange_is_null(multirange_state_single(RangeValue::Unknown));};
  if selected==7 {
   let empty=range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,true,false,false,ArrayElement::Null,ArrayElement::Null);
   return multirange_is_null(multirange_state_single(empty));
  };
  let span=multirange_state_span(ArrayElement::Int4(1),ArrayElement::Int4(3));
  if selected==8 {
   let other=range_from_coerced_bounds("public.other_range","pg_catalog.int4",2,false,true,false,ArrayElement::Int4(1),ArrayElement::Int4(3));
   return multirange_is_null(multirange_state_single(other));
  };
  if selected==9 {
   let other=range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int8",3,false,true,false,ArrayElement::Int8(1i64),ArrayElement::Int8(3i64));
   return multirange_is_null(multirange_state_single(other));
  };
  if selected==10 || selected==14 {
   let mut bounds:Vec<ArrayElement>=Vec::new();
   if selected==10 {bounds.push(ArrayElement::Text("bad bound tag".to_owned()));} else {bounds.push(ArrayElement::Error(first));};
   bounds.push(ArrayElement::Int4(3));
   let malformed=RangeValue::Value(RangePayload {bound_profile:empty_range_bound_context(),enum_labels:String::new(),enum_count:-1,type_name:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:range_builtin_support("pg_catalog.int4range","pg_catalog.int4",2),empty:false,lower_inclusive:true,upper_inclusive:false,bounds});
   return multirange_is_null(multirange_state_single(malformed));
  };
  if selected==11 || selected==12 || selected==13 {
   let mut ranges:Vec<RangeValue>=Vec::new();
   if selected==11 {ranges.push(RangeValue::Error(first));};
   if selected==12 {ranges.push(RangeValue::Unknown);};
   if selected==13 {ranges.push(span);};
   ranges.push(RangeValue::Error(second));return multirange_is_null(multirange_state_pack(ranges));
  };
  if selected==15 {return multirange_is_null(multirange_require_type(multirange_state_single(span),"public.other_multirange","pg_catalog.int4range","pg_catalog.int4",2));};
  if selected==16 {return multirange_is_null(multirange_require_type(multirange_state_single(span),"pg_catalog.int4multirange","public.other_range","pg_catalog.int4",2));};
  if selected==17 {return multirange_is_null(multirange_require_type(multirange_state_single(span),"pg_catalog.int4multirange","pg_catalog.int4range","pg_catalog.int8",3));};
  if selected==18 {
   let partial=multirange_state_span(ArrayElement::Unknown,ArrayElement::Int4(3));let input=multirange_state_single(partial);
   if multirange_empty_state(input.clone())!=BoolValue::Value(false) || multirange_is_null(input.clone())!=BoolValue::Value(false) {return BoolValue::Value(false);};
   if multirange_state_upper(input.clone())!=make_int4_value(3) || array_element_to_int4(multirange_bound(input.clone(),false))!=Int4Value::Unknown {return BoolValue::Value(false);};
   return BoolValue::Value(multirange_bound_flag(input,false,false)==BoolValue::Value(true));
  };
  if selected==19 {
   let last=multirange_state_span(ArrayElement::Int4(5),ArrayElement::Int4(7));let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(span.clone());ranges.push(last);
   let original=multirange_state_pack(ranges);let saved=original.clone();
   let extracted=multirange_boundary(original.clone(),false);let revised_span=multirange_state_revise(extracted);
   let revised=multirange_state_replace(original.clone(),revised_span);
   if array_element_to_int4(range_bound(multirange_boundary(original.clone(),false),true))!=make_int4_value(3) || array_element_to_int4(range_bound(multirange_boundary(saved.clone(),false),true))!=make_int4_value(3) {return BoolValue::Value(false);};
   if array_element_to_int4(range_bound(multirange_boundary(revised.clone(),false),true))!=make_int4_value(2) || multirange_state_upper(revised)!=make_int4_value(7) {return BoolValue::Value(false);};
   return BoolValue::Value(multirange_state_upper(original)==make_int4_value(7) && multirange_state_upper(saved)==make_int4_value(7));
  };
  if selected>=20 && selected<=23 {
   let mut type_name="pg_catalog.int4multirange".to_owned();let mut range_type="pg_catalog.int4range".to_owned();let mut element_type="pg_catalog.int4".to_owned();let mut element_kind:i32=2;
   if selected==20 {type_name="".to_owned();};if selected==21 {range_type="".to_owned();};if selected==22 {element_type="".to_owned();};if selected==23 {element_kind=0;};
   let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(span);
   return multirange_is_null(make_coerced_multirange_value(MultirangePayload {type_name,range_type,element_type,element_kind,support:range_unknown_support(),ranges}));
  };
  if selected==24 {return multirange_is_null(multirange_from_case_guard(CheckOutcome::Error(first)));};
  if selected==25 {return multirange_is_null(multirange_from_case_guard(CheckOutcome::Unknown));};
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
    const expected: Outcome[] = [
      { kind: 'True' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
      { kind: 'True' },
      { kind: 'True' },
      ...Array.from({ length: 6 }, () => ({ kind: 'Unknown' as const })),
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ...Array.from({ length: 3 }, () => ({ kind: 'Unknown' as const })),
      { kind: 'True' },
      { kind: 'True' },
      ...Array.from({ length: 4 }, () => ({ kind: 'Unknown' as const })),
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
      { kind: 'Unknown' },
    ]
    const fixtures = expected.map((outcome, mode) => ({
      name: 'state',
      row: { mode: { kind: 'Value' as const, value: mode } },
      expected: outcome,
    }))
    await runCheckParity(directory, 'multirangestate', group, ['state'], fixtures)
    await mkdir('artifacts/check-multirange-values', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-values/state-report.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          partialBounds: true,
          nominalTypeValidation: true,
          malformedMemberDeferral: true,
          orderedErrors: true,
          independentExtractedAndReinsertedSnapshots: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
