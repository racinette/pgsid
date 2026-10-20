import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
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
import { multirangeComparisonCallables } from './check-multirange-comparison-fixtures.js'

it('preserves strict state precedence for all multirange predicates and retains decisions independent of partial bounds', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-comparison-state-'))
  try {
    const checks: ReturnType<typeof prepareCheckRustGroup>['checks'][number][] = [],
      entries: string[] = [],
      names: string[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const error = (code: string): Input & Outcome => ({
      kind: 'Error',
      value: { state: parseInt(code, 36) },
    })
    for (const [i, c] of multirangeComparisonCallables.entries()) {
      const name = `state_${i}`,
        entryName = checkRustEntryName({
          schema: 'public',
          kind: 'table',
          owner: name,
          constraint: 'state',
        })
      const fields = c.args.map((t, i) =>
        t === 'pg_catalog.anyelement'
          ? 'element'
          : t === 'pg_catalog.anyrange'
            ? 'span'
            : i === 0
              ? 'a'
              : c.args[0] === 'pg_catalog.anymultirange'
                ? 'b'
                : 'a',
      )
      const args = fields.map((f) => (f === 'element' ? 'cell.clone()' : f + '.clone()')).join(',')
      entries.push(`pub fn ${entryName}(a:MultirangeValue,b:MultirangeValue,span:RangeValue,element:Int4Value,bypass:BoolValue)->CheckOutcome {
 let guard=check_from_bool(bypass);let mut result:CheckOutcome=check_unknown();
 if case_guard_stops(guard) {result=guard;} else {if case_guard_takes(guard) {result=guard;} else {
 ${fields.includes('element') ? 'let cell=array_element_from_int4(element);' : ''}let actual=${c.rustName}(${args});
 ${c.result === 'pg_catalog.int4' ? 'let boolean=multirange_state_cmp(actual);result=check_from_bool(boolean);' : 'result=check_from_bool(actual);'}
 };};result
}`)
      checks.push({
        kind: 'supported',
        entryName,
        inputs: [
          {
            name: 'a',
            rustName: 'a',
            type: 'pg_catalog.int4multirange',
            rustType: 'MultirangeValue',
          },
          {
            name: 'b',
            rustName: 'b',
            type: 'pg_catalog.int4multirange',
            rustType: 'MultirangeValue',
          },
          { name: 'span', rustName: 'span', type: 'pg_catalog.int4range', rustType: 'RangeValue' },
          { name: 'element', rustName: 'element', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          { name: 'bypass', rustName: 'bypass', type: 'pg_catalog.bool', rustType: 'BoolValue' },
        ],
      })
      names.push(name)
      const cases: [Input, Input, Outcome][] = [
        [{ kind: 'Null' }, { kind: 'Null' }, { kind: 'Null' }],
        [{ kind: 'Unknown' }, { kind: 'Unknown' }, { kind: 'Unknown' }],
        [error('22012'), error('22003'), error('22012')],
        [{ kind: 'Null' }, error('22003'), error('22003')],
        [{ kind: 'Unknown' }, { kind: 'Null' }, { kind: 'Null' }],
        [error('22012'), { kind: 'Null' }, error('22012')],
        [{ kind: 'Null' }, { kind: 'Unknown' }, { kind: 'Null' }],
      ]
      for (const [left, right, expected] of cases)
        for (const bypass of [false, true]) {
          const row: Row = {
            a: { kind: 'Unknown' },
            b: { kind: 'Unknown' },
            span: { kind: 'Unknown' },
            element: { kind: 'Unknown' },
            bypass: { kind: 'Value', value: bypass },
          }
          row[fields[0]!] = left
          row[fields[1]!] = right
          fixtures.push({ name, row, expected: bypass ? { kind: 'True' } : expected })
        }
    }
    const name = 'partial',
      entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: name,
        constraint: 'partial',
      })
    entries.push(
      `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=multirange_partial_probe(mode);check_from_bool(result)}`,
    )
    checks.push({
      kind: 'supported',
      entryName,
      inputs: [{ name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' }],
    })
    names.push(name)
    const evaluatorSource = entries.join('\n'),
      source = assembleCheckRust({
        source: evaluatorSource,
        callables: multirangeComparisonCallables.map((c) => c.rustName),
      })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/multirange_comparison_states.rs',
        source: String.raw`
pub fn multirange_state_cmp(input:Int4Value)->BoolValue {range_order_boolean(input,3)}
fn multirange_partial_span(lower:ArrayElement,upper:ArrayElement)->RangeValue {
 range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,false,true,false,lower,upper)
}
fn multirange_partial_pack(first:RangeValue,second:RangeValue,two:bool)->MultirangeValue {
 let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(first);if two {ranges.push(second);};
 make_coerced_multirange_value(MultirangePayload {type_name:"pg_catalog.int4multirange".to_owned(),range_type:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,ranges})
}
pub fn multirange_partial_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
  let a=multirange_partial_span(ArrayElement::Unknown,ArrayElement::Int4(3));
  let b=multirange_partial_span(ArrayElement::Int4(1),ArrayElement::Int4(3));
  let c=multirange_partial_span(ArrayElement::Int4(5),ArrayElement::Int4(7));
  let partial=multirange_partial_pack(a,RangeValue::Null,false);
  let known=multirange_partial_pack(b.clone(),c.clone(),true);
  if selected==0 {return sql__pg_catalog__multirange_eq__9xy5(partial,known);};
  if selected==1 {let compared=sql__pg_catalog__multirange_cmp__mafd(partial,known);return multirange_state_cmp(compared);};
  if selected==2 {let one=multirange_partial_pack(c,RangeValue::Null,false);return sql__pg_catalog__multirange_before_multirange__8hjl(partial,one);};
  if selected==3 {let one=multirange_partial_pack(c,RangeValue::Null,false);return sql__pg_catalog__multirange_overleft_multirange__lj1m(partial,one);};
  if selected==4 {let one=multirange_partial_pack(c,RangeValue::Null,false);return sql__pg_catalog__multirange_overright_multirange__20d6(partial,one);};
  if selected==5 {let empty=sql__pg_catalog__int4multirange__qvfa();return sql__pg_catalog__multirange_contains_multirange__xn5h(partial,empty);};
  if selected==6 {let next=multirange_partial_span(ArrayElement::Int4(3),ArrayElement::Int4(5));let one=multirange_partial_pack(next,RangeValue::Null,false);return sql__pg_catalog__multirange_adjacent_multirange__volo(partial,one);};
  if selected==7 {
   let lo=multirange_partial_span(ArrayElement::Int4(1),ArrayElement::Int4(2));let hi=multirange_partial_span(ArrayElement::Int4(5),ArrayElement::Int4(6));let gap=multirange_partial_span(ArrayElement::Int4(2),ArrayElement::Int4(3));
   let left=multirange_partial_pack(lo,hi,true);let right=multirange_partial_pack(gap,RangeValue::Null,false);return sql__pg_catalog__multirange_adjacent_multirange__volo(left,right);
  };
  if selected==8 || selected==9 {
   let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(RangeValue::Unknown);
   let malformed=MultirangeValue::Value(MultirangePayload {type_name:"pg_catalog.int4multirange".to_owned(),range_type:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,ranges});
   if selected==8 {return sql__pg_catalog__multirange_contains_elem__aq4j(malformed,ArrayElement::Int4(1));};
   return sql__pg_catalog__multirange_contains_range__bpqf(malformed,b);
  };
  if selected==10 {return multirange_is_null(finish_multirange_domain_conversion(partial,CheckOutcome::Unknown));};
  if selected==11 {let error=make_sql_error(3452582);return multirange_is_null(finish_multirange_domain_conversion(partial,CheckOutcome::Error(error)));};
  if selected==12 {return multirange_empty_state(finish_multirange_domain_conversion(partial,CheckOutcome::True));};
  if selected==13 {
   let ranges:Vec<RangeValue>=Vec::new();let bad=make_coerced_multirange_value(MultirangePayload {type_name:"public.other".to_owned(),range_type:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,ranges});
   let empty=sql__pg_catalog__int4multirange__qvfa();return sql__pg_catalog__multirange_eq__9xy5(bad,empty);
  };
 };
 BoolValue::Unknown
}
`,
      })
    const extra: Outcome[] = [
      { kind: 'False' },
      { kind: 'Unknown' },
      { kind: 'True' },
      { kind: 'True' },
      { kind: 'Unknown' },
      { kind: 'True' },
      { kind: 'True' },
      { kind: 'False' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      error('22012'),
      { kind: 'False' },
      { kind: 'Unknown' },
    ]
    extra.forEach((expected, mode) =>
      fixtures.push({ name: 'partial', row: { mode: { kind: 'Value', value: mode } }, expected }),
    )
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      checks,
      requiresRegex: false,
    }
    expect(multirangeComparisonCallables).toHaveLength(33)
    await runCheckParity(directory, 'multirangecomparisonstates', group, names, fixtures)
    await mkdir('artifacts/check-multirange-comparisons', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-comparisons/state-report.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          callables: 33,
          partialBounds: true,
          strictStatesAndArgumentOrder: true,
          checkedDomainStates: true,
          malformedSearchDeferral: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
