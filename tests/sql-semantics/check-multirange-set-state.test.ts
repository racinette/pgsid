import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { multirangeExactProbe } from './check-multirange-exact-probe.js'

const probe =
  multirangeExactProbe +
  String.raw`
fn multirange_set_state_value(input:MultirangeValue)->BoolValue {
 if let MultirangeValue::Error(error)=input {return BoolValue::Error(error);};
 if let MultirangeValue::Null=input {return BoolValue::Null;};
 if let MultirangeValue::Value(_)=input {return BoolValue::Value(false);};
 BoolValue::Unknown
}
pub fn multirange_set_state(left:MultirangeValue,right:MultirangeValue,mode:Int4Value)->BoolValue {
 if mode==Int4Value::Value(0) {return multirange_set_state_value(sql__pg_catalog__multirange_union__3oae(left,right));};
 if mode==Int4Value::Value(1) {return multirange_set_state_value(sql__pg_catalog__multirange_intersect__ezyb(left,right));};
 if mode==Int4Value::Value(2) {return multirange_set_state_value(sql__pg_catalog__multirange_minus__8qbr(left,right));};
 range_empty_state(sql__pg_catalog__range_merge__f619(left))
}
fn multirange_set_partial_span(lower:ArrayElement,upper:ArrayElement)->RangeValue {
 range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,false,true,false,lower,upper)
}
fn multirange_set_partial_pack(first:RangeValue,second:RangeValue,two:bool)->MultirangeValue {
 let mut spans:Vec<RangeValue>=Vec::new();spans.push(first);if two {spans.push(second);};
 make_coerced_multirange_value(MultirangePayload {type_name:"pg_catalog.int4multirange".to_owned(),range_type:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:range_builtin_support("pg_catalog.int4range","pg_catalog.int4",2),ranges:spans})
}
pub fn multirange_set_partial(mode:Int4Value)->BoolValue {
 let span=multirange_set_partial_span(ArrayElement::Unknown,ArrayElement::Int4(3));
 let partial=multirange_set_partial_pack(span.clone(),span.clone(),false);
 let empty=sql__pg_catalog__int4multirange__qvfa();
 if mode==Int4Value::Value(0) {return multirange_fixture_exact(sql__pg_catalog__multirange_union__3oae(partial.clone(),empty),partial);};
 if mode==Int4Value::Value(1) {return multirange_fixture_exact(sql__pg_catalog__multirange_union__3oae(empty,partial.clone()),partial);};
 if mode==Int4Value::Value(2) {return multirange_fixture_exact(sql__pg_catalog__multirange_minus__8qbr(partial.clone(),empty),partial);};
 if mode==Int4Value::Value(3) {return multirange_empty_state(sql__pg_catalog__multirange_minus__8qbr(empty,partial));};
 if mode==Int4Value::Value(4) {return multirange_empty_state(sql__pg_catalog__multirange_intersect__ezyb(partial,empty));};
 if mode==Int4Value::Value(5) {return multirange_empty_state(sql__pg_catalog__multirange_intersect__ezyb(empty,partial));};
 if mode==Int4Value::Value(6) {let merged=sql__pg_catalog__range_merge__f619(partial);let lower=range_bound(merged,false);return BoolValue::Value(array_element_to_int4(lower)==Int4Value::Unknown);};
 let first=multirange_set_partial_span(ArrayElement::Int4(1),ArrayElement::Unknown);
 let last=multirange_set_partial_span(ArrayElement::Unknown,ArrayElement::Int4(9));
 let outer=multirange_set_partial_pack(first,last,true);
 if mode==Int4Value::Value(7) {let merged=sql__pg_catalog__range_merge__f619(outer);let lower=range_bound(merged.clone(),false);let upper=range_bound(merged,true);return BoolValue::Value(array_element_to_int4(lower)==Int4Value::Value(1) && array_element_to_int4(upper)==Int4Value::Value(9));};
 if mode==Int4Value::Value(8) {return range_empty_state(sql__pg_catalog__range_merge__f619(empty));};
 if mode==Int4Value::Value(9) {return multirange_set_state_value(sql__pg_catalog__multirange_union__3oae(partial,outer));};
 let known_first=multirange_set_partial_span(ArrayElement::Int4(1),ArrayElement::Int4(3));
 let known_last=multirange_set_partial_span(ArrayElement::Int4(5),ArrayElement::Int4(9));
 let original=multirange_set_partial_pack(known_first.clone(),known_first,false);
 let other=multirange_set_partial_pack(known_last.clone(),known_last,false);
 let mut result=sql__pg_catalog__multirange_union__3oae(original.clone(),other.clone());
 if mode==Int4Value::Value(11) {result=sql__pg_catalog__multirange_minus__8qbr(original.clone(),other.clone());};
 if mode==Int4Value::Value(12) {result=sql__pg_catalog__multirange_intersect__ezyb(original.clone(),original.clone());};
 if let MultirangeValue::Value(stored)=result {
  let mut payload=stored.clone();
  let part=payload.ranges[0].clone();
  if let RangeValue::Value(selected)=part {let mut member=selected.clone();member.bounds[0]=ArrayElement::Int4(999);payload.ranges[0]=RangeValue::Value(member);};
  let untouched=multirange_fixture_exact(original.clone(),multirange_set_partial_pack(multirange_set_partial_span(ArrayElement::Int4(1),ArrayElement::Int4(3)),span,false));
  if untouched!=BoolValue::Value(true) {return untouched;};
  let other_untouched=multirange_fixture_exact(other.clone(),multirange_set_partial_pack(multirange_set_partial_span(ArrayElement::Int4(5),ArrayElement::Int4(9)),RangeValue::Unknown,false));
  if other_untouched!=BoolValue::Value(true) {return other_untouched;};
  let changed=MultirangeValue::Value(payload);return BoolValue::Value(multirange_fixture_exact(changed,original)!=BoolValue::Value(true));
 };
 BoolValue::Unknown
}
`

it('preserves strict algebra states, empty identities, partial hulls and independent result snapshots', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-set-state-'))
  try {
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      entries: string[] = [],
      names: string[] = [],
      checks: ReturnType<typeof prepareCheckRustGroup>['checks'][number][] = []
    const error = (code: string): Input & Outcome => ({
      kind: 'Error',
      value: { state: parseInt(code, 36) },
    })
    const entryName = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'states',
      constraint: 'algebra',
    })
    entries.push(
      `pub fn ${entryName}(left:MultirangeValue,right:MultirangeValue,mode:Int4Value,bypass:BoolValue)->CheckOutcome {let guard=check_from_bool(bypass);let mut result:CheckOutcome=check_unknown();if case_guard_stops(guard) {result=guard;} else {if case_guard_takes(guard) {result=guard;} else {let actual=multirange_set_state(left,right,mode);result=check_from_bool(actual);};};result}`,
    )
    names.push('states')
    checks.push({
      kind: 'supported',
      entryName,
      inputs: [
        {
          name: 'left',
          rustName: 'left',
          type: 'pg_catalog.int4multirange',
          rustType: 'MultirangeValue',
        },
        {
          name: 'right',
          rustName: 'right',
          type: 'pg_catalog.int4multirange',
          rustType: 'MultirangeValue',
        },
        { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
        { name: 'bypass', rustName: 'bypass', type: 'pg_catalog.bool', rustType: 'BoolValue' },
      ],
    })
    const cases: [Input, Input, Outcome][] = [
      [{ kind: 'Null' }, { kind: 'Null' }, { kind: 'Null' }],
      [{ kind: 'Unknown' }, { kind: 'Unknown' }, { kind: 'Unknown' }],
      [error('22012'), error('22003'), error('22012')],
      [{ kind: 'Null' }, error('22003'), error('22003')],
      [{ kind: 'Unknown' }, { kind: 'Null' }, { kind: 'Null' }],
      [error('22012'), { kind: 'Null' }, error('22012')],
      [{ kind: 'Null' }, { kind: 'Unknown' }, { kind: 'Null' }],
    ]
    for (const mode of [0, 1, 2])
      for (const [left, right, expected] of cases)
        for (const bypass of [false, true])
          fixtures.push({
            name: 'states',
            row: {
              left,
              right,
              mode: { kind: 'Value', value: mode },
              bypass: { kind: 'Value', value: bypass },
            },
            expected: bypass ? { kind: 'True' } : expected,
          })
    for (const [left, expected] of [
      [{ kind: 'Null' }, { kind: 'Null' }],
      [{ kind: 'Unknown' }, { kind: 'Unknown' }],
      [error('22012'), error('22012')],
    ] as [Input, Outcome][])
      for (const bypass of [false, true])
        fixtures.push({
          name: 'states',
          row: {
            left,
            right: { kind: 'Unknown' },
            mode: { kind: 'Value', value: 3 },
            bypass: { kind: 'Value', value: bypass },
          },
          expected: bypass ? { kind: 'True' } : expected,
        })
    const partialEntry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'partial',
      constraint: 'algebra',
    })
    entries.push(
      `pub fn ${partialEntry}(mode:Int4Value)->CheckOutcome {let actual=multirange_set_partial(mode);check_from_bool(actual)}`,
    )
    names.push('partial')
    checks.push({
      kind: 'supported',
      entryName: partialEntry,
      inputs: [{ name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' }],
    })
    for (let mode = 0; mode < 13; mode++)
      fixtures.push({
        name: 'partial',
        row: { mode: { kind: 'Value', value: mode } },
        expected: { kind: mode === 9 ? 'Unknown' : 'True' },
      })
    const evaluatorSource = entries.join('\n'),
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/multirange_set_state_probe.rs', source: probe })
    await runCheckParity(
      directory,
      'multirangesetstates',
      { source, evaluatorSource, checks, requiresRegex: false },
      names,
      fixtures,
    )
    expect(fixtures).toHaveLength(61)
    await mkdir('artifacts/check-multirange-set', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-set/state-report.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          strictStates: true,
          emptyIdentities: true,
          partialHulls: true,
          snapshots: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
