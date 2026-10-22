import { it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity } from '../../tools/check-rust/parity.js'

it('preserves strict record JSON states, eager field errors, stopped conversions and independent owned cursors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-composite-json-state-'))
  const evaluatorSource = `pub fn evaluate_check(mode:Int4Value)->CheckOutcome{let value=json_record_state_probe(mode);check_from_bool(value)}`
  const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
  source.modules
    .find((m) => m.name === 'pg_catalog')!
    .files.push({
      path: 'tests/json_record_states.rs',
      source: `
fn record_probe_value(input:JsonRecordInputPayload)->JsonValue {
 let plan=finish_json_record_plan(input);
 sql__pg_catalog__row_to_json__99i2(plan,true)
}
fn record_probe_null(input:JsonValue)->BoolValue {
 if let JsonValue::Null=input{return make_bool_value(true);};make_bool_value(false)
}
fn record_probe_unknown(input:JsonValue)->BoolValue {
 if let JsonValue::Unknown=input{return make_bool_value(true);};make_bool_value(false)
}
fn record_probe_error(input:JsonValue,expected:SqlError)->BoolValue {
 if let JsonValue::Error(error)=input{return make_bool_value(error.state==expected.state);};make_bool_value(false)
}
fn record_probe_text(input:JsonValue,expected:&str)->BoolValue {
 if let JsonValue::Value(value)=input{return make_bool_value(value.source.as_str()==expected);};make_bool_value(false)
}
pub fn json_record_state_probe(input:Int4Value)->BoolValue {
 if let Int4Value::Value(mode)=input {
  let compact=make_bool_value(false);
  let mut record=make_composite_fields("public.sample");
  record=append_composite_field(record,ArrayElement::Null);
  record=append_composite_field(record,ArrayElement::Unknown);
  if mode==0{return record_probe_null(record_probe_value(prepare_json_record(CompositeValue::Null,BoolValue::Unknown,"public.sample",2)));};
  if mode==1{return record_probe_null(record_probe_value(prepare_json_record(CompositeValue::Unknown,BoolValue::Null,"public.sample",2)));};
  if mode==2{return record_probe_unknown(record_probe_value(prepare_json_record(record,BoolValue::Unknown,"public.sample",2)));};
  if mode==3{return record_probe_error(record_probe_value(prepare_json_record(CompositeValue::Error(make_sql_error(3452547)),BoolValue::Error(make_sql_error(3452582)),"public.sample",2)),make_sql_error(3452547));};
  if mode==4{return record_probe_error(record_probe_value(prepare_json_record(CompositeValue::Null,BoolValue::Error(make_sql_error(3452582)),"public.sample",2)),make_sql_error(3452582));};
  if mode==5 {
   let initial=prepare_json_record(record,compact,"public.sample",2);
   let stopped=append_json_record(initial,"first",JsonbInput::Unknown);
   return make_bool_value(json_record_has_field(&stopped)==false && stopped.position==1);
  };
  if mode==6 {
   let initial=prepare_json_record(record,compact,"public.sample",2);
   let stopped=append_json_record(initial,"first",JsonbInput::ConvertedError(make_sql_error(3452547)));
   return record_probe_error(record_probe_value(stopped),make_sql_error(3452547));
  };
  if mode==7 {
   record=append_composite_field(record,ArrayElement::Error(make_sql_error(3452582)));
   return record_probe_error(record_probe_value(prepare_json_record(record,compact,"public.sample",3)),make_sql_error(3452582));
  };
  if mode==8 {
   let original=prepare_json_record(record,compact,"public.sample",2);
   let first=append_json_record(original.clone(),"first",JsonbInput::Null);
   let saved=first.clone();
   let second=append_json_record(first,"next",JsonbInput::Text("ok".to_owned()));
   if original.values.len()!=0 || original.position!=0 || saved.values.len()!=2 || saved.position!=1 {return make_bool_value(false);};
   if json_record_has_field(&saved)==false || json_record_has_field(&second) {return make_bool_value(false);};
   return record_probe_text(record_probe_value(second),"{\\"first\\":null,\\"next\\":\\"ok\\"}");
  };
  if mode==9 {
   let original=prepare_json_record(record,compact,"public.sample",2);
   let first=append_json_record(original,"first",JsonbInput::Null);
   return record_probe_unknown(record_probe_value(first));
  };
  if mode==10{return record_probe_unknown(record_probe_value(prepare_json_record(record,compact,"public.other",2)));};
  if mode==11{return record_probe_unknown(record_probe_value(prepare_json_record(record,compact,"public.sample",1)));};
  if mode==12 {
   let initial=prepare_json_record(record,compact,"public.sample",2);
   let first=append_json_record(initial,"first",json_record_opaque_input(ArrayElement::Null));
   let second=append_json_record(first,"next",json_record_opaque_input(ArrayElement::Unknown));
   return record_probe_unknown(record_probe_value(second));
  };
  if mode==13 {
   let initial=prepare_json_record(record,compact,"public.sample",2);
   let first=append_json_record(initial,"first",JsonbInput::Null);
   let second=append_json_record(first,"next",JsonbInput::Null);
   let third=append_json_record(second,"extra",JsonbInput::Null);
   return record_probe_unknown(record_probe_value(third));
  };
 };
 BoolValue::Unknown
}`,
    })
  const group: ReturnType<typeof prepareCheckRustGroup> = {
    source,
    evaluatorSource,
    requiresRegex: false,
    checks: [
      {
        kind: 'supported',
        entryName: 'evaluate_check',
        inputs: [
          { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
        ],
      },
    ],
  }
  try {
    await runCheckParity(
      root,
      'compositejsonstates',
      group,
      ['states'],
      Array.from({ length: 14 }, (_, mode) => ({
        name: 'states',
        row: { mode: { kind: 'Value' as const, value: mode } },
        expected: { kind: 'True' as const },
      })),
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 240_000)
