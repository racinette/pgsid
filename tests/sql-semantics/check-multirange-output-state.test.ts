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
const probe = String.raw`
const MULTIRANGE_OUTPUT_TEST_DIVISION_BY_ZERO: u32 = 3452582;
fn multirange_output_fixture_span(lower:ArrayElement,upper:ArrayElement)->RangeValue {
 range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,false,true,false,lower,upper)
}
fn multirange_output_fixture_pack(first:RangeValue,second:RangeValue)->MultirangeValue {
 let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(first);ranges.push(second);
 MultirangeValue::Value(MultirangePayload {type_name:"pg_catalog.int4multirange".to_owned(),range_type:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,ranges})
}
pub fn multirange_output_partial(mode:Int4Value)->BoolValue {
 let first=multirange_output_fixture_span(ArrayElement::Int4(1),ArrayElement::Int4(3));
 let last=multirange_output_fixture_span(ArrayElement::Int4(5),ArrayElement::Int4(9));
 let unknown=multirange_output_fixture_span(ArrayElement::Unknown,ArrayElement::Int4(3));
 let error=RangeValue::Error(make_sql_error(MULTIRANGE_OUTPUT_TEST_DIVISION_BY_ZERO));
 if mode==Int4Value::Value(0) {return BoolValue::Value(multirange_to_text(multirange_output_fixture_pack(first,last))==make_text_value("{[1,3),[5,9)}"));};
 if mode==Int4Value::Value(1) {return BoolValue::Value(multirange_to_text(multirange_output_fixture_pack(unknown,error))==TextValue::Unknown);};
 if mode==Int4Value::Value(2) {return BoolValue::Value(multirange_to_text(multirange_output_fixture_pack(error,unknown))==TextValue::Error(make_sql_error(MULTIRANGE_OUTPUT_TEST_DIVISION_BY_ZERO)));};
 if mode==Int4Value::Value(3) {return BoolValue::Value(multirange_to_text(multirange_output_fixture_pack(first,RangeValue::Unknown))==TextValue::Unknown);};
 if mode==Int4Value::Value(4) {return BoolValue::Value(multirange_to_text(multirange_output_fixture_pack(first,RangeValue::Null))==TextValue::Unknown);};
 let unbounded=range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,false,false,false,ArrayElement::Null,ArrayElement::Int4(3));
 if mode==Int4Value::Value(5) {return BoolValue::Value(multirange_to_text(multirange_output_fixture_pack(unbounded,last))==make_text_value("{(,3),[5,9)}"));};
 let original=multirange_output_fixture_pack(first,last);
 let snapshot=original.clone();
 let rendered=multirange_to_text(original.clone());
 let rerendered=multirange_to_text(snapshot);
 if rendered!=make_text_value("{[1,3),[5,9)}") {return BoolValue::Value(false);};
 BoolValue::Value(rendered==rerendered && multirange_to_text(original)==rendered)
}
`
it('preserves output state precedence, reached member errors, partial bounds and snapshots', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-output-state-'))
  try {
    const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'states',
        constraint: 'output',
      }),
      partial = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'partial',
        constraint: 'output',
      })
    const evaluatorSource = `pub fn ${entryName}(payload:MultirangeValue,expected:TextValue)->CheckOutcome {let actual=multirange_to_text(payload);let result=sql__pg_catalog__texteq__aet8(actual,expected);check_from_bool(result)}
 pub fn ${partial}(mode:Int4Value)->CheckOutcome {let result=multirange_output_partial(mode);check_from_bool(result)}`
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: ['sql__pg_catalog__texteq__aet8'],
    })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/multirange_output_state_probe.rs', source: probe })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported',
          entryName,
          inputs: [
            {
              name: 'payload',
              rustName: 'payload',
              type: 'pg_catalog.int4multirange',
              rustType: 'MultirangeValue',
            },
            {
              name: 'expected',
              rustName: 'expected',
              type: 'pg_catalog.text',
              rustType: 'TextValue',
            },
          ],
        },
        {
          kind: 'supported',
          entryName: partial,
          inputs: [
            { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          ],
        },
      ],
    }
    const error = (code: string): Input & Outcome => ({
      kind: 'Error',
      value: { state: parseInt(code, 36) },
    })
    const empty: Input = {
      kind: 'Value',
      value: {
        typeName: 'pg_catalog.int4multirange',
        rangeType: 'pg_catalog.int4range',
        elementType: 'pg_catalog.int4',
        elementKind: 2,
        ranges: [],
      },
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [
      {
        name: 'states',
        row: { payload: { kind: 'Null' }, expected: { kind: 'Value', value: 'ignored' } },
        expected: { kind: 'Null' },
      },
      {
        name: 'states',
        row: { payload: { kind: 'Unknown' }, expected: { kind: 'Value', value: 'ignored' } },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'states',
        row: { payload: error('22012'), expected: error('22003') },
        expected: error('22012'),
      },
      {
        name: 'states',
        row: { payload: empty, expected: error('22003') },
        expected: error('22003'),
      },
      {
        name: 'states',
        row: { payload: { kind: 'Null' }, expected: error('22003') },
        expected: error('22003'),
      },
      {
        name: 'states',
        row: { payload: empty, expected: { kind: 'Value', value: '{}' } },
        expected: { kind: 'True' },
      },
    ]
    for (let mode = 0; mode < 7; mode++)
      fixtures.push({
        name: 'partial',
        row: { mode: { kind: 'Value', value: mode } },
        expected: { kind: 'True' },
      })
    await runCheckParity(
      directory,
      'multirangeoutputstates',
      group,
      ['states', 'partial'],
      fixtures,
    )
    expect(fixtures).toHaveLength(13)
    await mkdir('artifacts/check-multirange-output', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-output/state-report.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          memberOrder: true,
          partialBounds: true,
          snapshots: true,
          strictStates: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
