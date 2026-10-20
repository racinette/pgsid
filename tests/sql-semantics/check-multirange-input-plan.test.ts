import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const value = (input: string | number | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('interleaves owned multirange member scans with subtype conversion and normalizes only after complete outer syntax', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-plan-'))
  try {
    await pg.exec(`CREATE TYPE continuous_span AS RANGE(subtype=int4);
      CREATE DOMAIN positive AS int4 NOT NULL CHECK(VALUE>0);
      CREATE TYPE positive_span AS RANGE(subtype=positive);
      CREATE DOMAIN preflight AS int4 CHECK(VALUE>0 OR 1/0=0);
      CREATE TYPE preflight_span AS RANGE(subtype=preflight);
      CREATE TYPE callback_span;
      CREATE FUNCTION callback_canonical(callback_span) RETURNS callback_span AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
      CREATE TYPE callback_span AS RANGE(subtype=int4,canonical=callback_canonical);
      CREATE FUNCTION failed_comparator(int4,int4) RETURNS int4 LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'comparison reached' USING ERRCODE='22000';END$$;
      CREATE OPERATOR CLASS failed_ops FOR TYPE int4 USING btree AS OPERATOR 1 <,OPERATOR 2 <=,OPERATOR 3 =,OPERATOR 4 >=,OPERATOR 5 >,FUNCTION 1 failed_comparator(int4,int4);
      CREATE TYPE failed_span AS RANGE(subtype=int4,subtype_opclass=failed_ops);`)
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'multirange_input_plan',
      constraint: 'input',
    })
    const evaluatorSource = `pub fn ${entry}(mode:Int4Value,input:TextValue,expected:TextValue)->CheckOutcome {
 let initial=prepare_multirange_text(input);
 let mut cursor:MultirangeTextPayload=initial;
 while multirange_text_has_member(&cursor) {
  let text=multirange_text_member(&cursor);
  let member=multirange_plan_member(mode,text);
  cursor=append_multirange_text(cursor,member);
 }
 let result=multirange_plan_finish(mode,cursor);
 let compared=multirange_plan_compare(result,expected);
 check_from_bool(compared)
}`
    const snapshotEntry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'multirange_input_plan',
      constraint: 'ownership',
    })
    const snapshotSource = `pub fn ${snapshotEntry}(input:TextValue)->CheckOutcome {let result=multirange_plan_snapshot(input);check_from_bool(result)}`
    const source = assembleCheckRust({
      source: evaluatorSource + '\n' + snapshotSource,
      callables: [],
    })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'tests/multirange_input_plan.rs',
        source: String.raw`
fn multirange_plan_mode(input:Int4Value)->i32 {if let Int4Value::Value(number)=input {return number;};-1}
fn multirange_plan_type(mode:i32)->String {
 if mode==0 {return "pg_catalog.int4range".to_owned();};
 if mode==2 {return "public.positive_span".to_owned();};
 if mode==3 {return "public.preflight_span".to_owned();};
 if mode==4 {return "public.callback_span".to_owned();};
 if mode==5 {return "public.failed_span".to_owned();};
 "public.continuous_span".to_owned()
}
fn multirange_plan_element(mode:i32)->String {
 if mode==2 {return "public.positive".to_owned();};
 if mode==3 {return "public.preflight".to_owned();};
 "pg_catalog.int4".to_owned()
}
fn multirange_plan_support(mode:i32)->RangeSupport {
 let mut canonical:i32=1;let mut comparison:i32=2;
 if mode==0 {canonical=2;};if mode==4 {canonical=0;};if mode==5 {comparison=0;};
 make_range_support(comparison,canonical)
}
fn multirange_plan_bound(input:TextValue,mode:i32)->ArrayElement {
 if mode==3 {return ArrayElement::Error(make_sql_error(3452582));};
 let parsed=range_input_bound(input,2);
 if mode==2 {if let ArrayElement::Int4(number)=parsed {if number<=0 {return ArrayElement::Error(make_sql_error(3505720));};};};
 parsed
}
pub fn multirange_plan_member(mode:Int4Value,input:TextValue)->RangeValue {
 let selected=multirange_plan_mode(mode);
 if selected==6 {return RangeValue::Unknown;};
 if selected==7 {return RangeValue::Error(make_sql_error(3452582));};
 let type_name=multirange_plan_type(selected);let element=multirange_plan_element(selected);let support=multirange_plan_support(selected);
 let plan=prepare_range_text(input);
 if range_text_needs_bounds(plan.clone())==false {return range_text_initial(plan,type_name.as_str(),element.as_str(),2,support);};
 let mut lower=ArrayElement::Null;
 if range_text_bound_present(plan.clone(),false) {lower=multirange_plan_bound(range_text_bound(plan.clone(),false),selected);};
 if let ArrayElement::Error(error)=lower {return RangeValue::Error(error);};
 if let ArrayElement::Unknown=lower {return RangeValue::Unknown;};
 let mut upper=ArrayElement::Null;
 if range_text_bound_present(plan.clone(),true) {upper=multirange_plan_bound(range_text_bound(plan.clone(),true),selected);};
 finish_range_text(plan,type_name.as_str(),element.as_str(),2,support,lower,upper)
}
pub fn multirange_plan_finish(mode:Int4Value,input:MultirangeTextPayload)->MultirangeValue {
 let selected=multirange_plan_mode(mode);let range_type=multirange_plan_type(selected);let element=multirange_plan_element(selected);let support=multirange_plan_support(selected);
 let mut type_name="public.continuous_span_multirange".to_owned();
 if selected==0 {type_name="pg_catalog.int4multirange".to_owned();};
 if selected==2 {type_name="public.positive_span_multirange".to_owned();};
 if selected==3 {type_name="public.preflight_span_multirange".to_owned();};
 if selected==4 {type_name="public.callback_span_multirange".to_owned();};
 if selected==5 {type_name="public.failed_span_multirange".to_owned();};
 finish_multirange_text(input,type_name.as_str(),range_type.as_str(),element.as_str(),2,support)
}
pub fn multirange_plan_compare(input:MultirangeValue,expected:TextValue)->BoolValue {
 let output=multirange_to_text(input);
 if let TextValue::Error(error)=output {return BoolValue::Error(error);};
 if let TextValue::Unknown=output {return BoolValue::Unknown;};
 BoolValue::Value(output==expected)
}
pub fn multirange_plan_snapshot(input:TextValue)->BoolValue {
 let cursor=prepare_multirange_text(input);let saved=cursor.clone();
 let first=range_from_text(multirange_text_member(&cursor),"pg_catalog.int4range","pg_catalog.int4",2);
 let next=append_multirange_text(cursor,first);
 let fork=next.clone();let mut characters=fork.characters;let mut ranges=fork.ranges;
 characters[0]='x';ranges[0]=range_from_text(make_text_value("[8,9)"),"pg_catalog.int4range","pg_catalog.int4",2);
 let isolated=next.characters[0]=='{' && range_to_text(next.ranges[0].clone())==make_text_value("[1,3)") && characters[0]=='x' && range_to_text(ranges[0].clone())==make_text_value("[8,9)");
 let second=range_from_text(multirange_text_member(&next),"pg_catalog.int4range","pg_catalog.int4",2);
 let revised=append_multirange_text(next.clone(),second);
 let premature=finish_multirange_text(saved.clone(),"pg_catalog.int4multirange","pg_catalog.int4range","pg_catalog.int4",2,make_range_support(2,2));
 let final_value=finish_multirange_text(revised,"pg_catalog.int4multirange","pg_catalog.int4range","pg_catalog.int4",2,make_range_support(2,2));
 let final_text=multirange_to_text(final_value);
 BoolValue::Value(isolated && multirange_text_member(&saved)==make_text_value("[1,3)") && saved.ranges.len()==0 && multirange_text_member(&next)==make_text_value("[5,7)") && next.ranges.len()==1 && matches_multirange_unknown(premature) && final_text==make_text_value("{[1,3),[5,7)}"))
}
fn matches_multirange_unknown(input:MultirangeValue)->bool {if let MultirangeValue::Unknown=input {return true;};false}
`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource: evaluatorSource + '\n' + snapshotSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported',
          entryName: entry,
          inputs: [
            { name: 'mode', type: 'pg_catalog.int4', rustName: 'mode', rustType: 'Int4Value' },
            { name: 'input', type: 'pg_catalog.text', rustName: 'input', rustType: 'TextValue' },
            {
              name: 'expected',
              type: 'pg_catalog.text',
              rustName: 'expected',
              rustType: 'TextValue',
            },
          ],
        },
        {
          kind: 'supported',
          entryName: snapshotEntry,
          inputs: [
            { name: 'input', type: 'pg_catalog.text', rustName: 'input', rustType: 'TextValue' },
          ],
        },
      ],
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const common: (string | null)[] = [
      null,
      '',
      'bad',
      '{}',
      ' \t{ }\r\n',
      '{empty}',
      '{EMPTY,empty}',
      '{(,)}',
      '{[1,3)}',
      '{[5,7),[1,3),[3,5)}',
      '{[1,3),[1,3)}',
      '{(1,1)}',
      '{[1,1]}',
      '{[0,3)}',
      '{["1","3")}',
      '{[1\\,3)}',
      '{["1",3)}',
      '{["",3)}',
      '{[1,"3)}',
      '{[1,3)junk}',
      '{[1,3)}junk',
      '{[2147483648,3)junk}',
      '{[2147483648,3)',
      '{[2147483648,3',
      '{[bad,3),bad}',
      '{[bad,3',
      '{[3,1),bad}',
      '{[1,3),[2147483648,4)}junk',
      '{empty,}',
      '{emptyjunk}',
      '{,empty}',
      '{empty,,empty}',
      '{[1,3),}',
      '{[1,3)},',
      '{[1,3),empty,[5,7)}',
      '{[1_000,2_000)}',
    ]
    const callbacks = [
      { text: '{}', defer: false },
      { text: '{empty}', defer: false },
      { text: '{(1,1)}', defer: false },
      { text: '{[1,3)}', defer: true },
      { text: '{[1,3)junk}', defer: true },
      { text: '{[bad,3)junk}', defer: false },
      { text: '{(,)}', defer: true },
    ]
    const comparators = [
      { text: '{}', defer: false },
      { text: '{(,1)}', defer: false },
      { text: '{(,1),[2,)}', defer: true },
      { text: '{(,1),[2,)}junk', defer: false },
      { text: '{(,1),[2,),junk}', defer: false },
      { text: '{[1,3)junk}', defer: true },
      { text: '{[bad,3)junk}', defer: false },
    ]
    const types = [
      'int4multirange',
      'continuous_span_multirange',
      'positive_span_multirange',
      'preflight_span_multirange',
      'callback_span_multirange',
      'failed_span_multirange',
    ]
    let nativeCases = 0,
      nativeErrors = 0
    for (const [mode, type] of types.entries())
      for (const probe of mode === 4
        ? callbacks
        : mode === 5
          ? comparators
          : common.map((text) => ({ text, defer: false }))) {
        let expectedText: string | null = null,
          expected: Outcome = { kind: 'True' }
        try {
          expectedText = (
            await pg.query<{ value: string | null }>(`SELECT $1::${type}::text value`, [probe.text])
          ).rows[0]!.value
        } catch (e) {
          nativeErrors++
          expected = { kind: 'Error', value: { state: parseInt((e as { code: string }).code, 36) } }
        }
        if (probe.defer) expected = { kind: 'Unknown' }
        fixtures.push({
          name: 'input',
          row: { mode: value(mode), input: value(probe.text), expected: value(expectedText) },
          expected,
        })
        nativeCases++
      }
    for (const mode of [0, 1, 2, 3, 4, 5])
      for (const input of [
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as Input[])
        fixtures.push({
          name: 'input',
          row: { mode: value(mode), input, expected: value(null) },
          expected: input as Outcome,
        })
    for (const mode of [6, 7])
      fixtures.push({
        name: 'input',
        row: { mode: value(mode), input: value('{[1,3)junk}'), expected: value(null) },
        expected:
          mode === 6
            ? { kind: 'Unknown' }
            : { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })
    fixtures.push({
      name: 'ownership',
      row: { input: value('{[1,3),[5,7)}') },
      expected: { kind: 'True' },
    })
    expect(nativeCases).toBe(common.length * 4 + callbacks.length + comparators.length)
    expect(nativeErrors).toBeGreaterThan(0)
    expect(fixtures).toHaveLength(nativeCases + types.length * 2 + 3)
    await runCheckParity(directory, 'multirangeplan', group, ['input', 'ownership'], fixtures)
    await mkdir('artifacts/check-multirange-input-plan', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-input-plan/report.json',
      JSON.stringify({ nativeCases, nativeErrors, fixtures: fixtures.length }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
