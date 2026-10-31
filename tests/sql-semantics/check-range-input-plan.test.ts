import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'

const value = (input: string | number | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('separates range grammar from ordered subtype input, skips omitted domain bounds and retains owned plans and reached support', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-input-plan-'))
  try {
    await pg.exec(`CREATE TYPE continuous_span AS RANGE(subtype=int4);
      CREATE DOMAIN positive AS int4 NOT NULL CHECK(VALUE>0);
      CREATE TYPE positive_span AS RANGE(subtype=positive);
      CREATE TYPE callback_span;
      CREATE FUNCTION callback_canonical(callback_span) RETURNS callback_span AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
      CREATE TYPE callback_span AS RANGE(subtype=int4,canonical=callback_canonical);
      CREATE FUNCTION reversed(int4,int4) RETURNS int4 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT btint4cmp($2,$1)';
      CREATE OPERATOR CLASS reverse_ops FOR TYPE int4 USING btree AS OPERATOR 1 >,OPERATOR 2 >=,OPERATOR 3 =,OPERATOR 4 <=,OPERATOR 5 <,FUNCTION 1 reversed(int4,int4);
      CREATE TYPE reverse_span AS RANGE(subtype=int4,subtype_opclass=reverse_ops)`)
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'range_input_plan',
      constraint: 'states',
    })
    const evaluatorSource = `pub fn ${entry}(mode:Int4Value,input:TextValue,expected:TextValue)->CheckOutcome {let result=range_input_plan_probe(mode,input,expected);check_from_bool(result)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'tests/range_input_plan.rs',
        source: String.raw`
fn range_input_plan_bound(input:TextValue,domain:bool)->ArrayElement {
 let parsed=range_input_bound(input,2,false,false,0,false,"",0);
 if domain {
  if let ArrayElement::Null=parsed {return ArrayElement::Error(make_sql_error(3505682));};
  if let ArrayElement::Int4(number)=parsed {
   if number<=0 {return ArrayElement::Error(make_sql_error(3505720));};
  };
 };
 parsed
}
fn range_input_plan_finish(plan:RangeTextPlan,type_name:&str,support:RangeSupport,domain:bool)->RangeValue {
 let mut element_type="pg_catalog.int4".to_owned();if domain {element_type="public.positive".to_owned();};
 if range_text_needs_bounds(plan.clone())==false {return range_text_initial(plan.clone(),type_name,element_type.as_str(),2,support);};
 let mut lower=ArrayElement::Null;
 if range_text_bound_present(plan.clone(),false) {lower=range_input_plan_bound(range_text_bound(plan.clone(),false),domain);};
 if let ArrayElement::Error(error)=lower {return RangeValue::Error(error);};
 if let ArrayElement::Unknown=lower {return RangeValue::Unknown;};
 let mut upper=ArrayElement::Null;
 if range_text_bound_present(plan.clone(),true) {upper=range_input_plan_bound(range_text_bound(plan.clone(),true),domain);};
 finish_range_text(plan,type_name,element_type.as_str(),2,support,lower,upper)
}
pub fn range_input_plan_probe(mode:Int4Value,input:TextValue,expected:TextValue)->BoolValue {
 if let Int4Value::Value(selected)=mode {
  let plan=prepare_range_text(input);
  if selected==5 {
   let saved=plan.clone();
   let revised=range_text_value(false,make_text_value("revised"),range_text_bound(plan.clone(),true),"[]".to_owned());
   return BoolValue::Value(range_text_state(saved.clone())==BoolValue::Value(false) && range_text_bound(saved.clone(),false)==expected && range_text_bound(revised.clone(),false)==make_text_value("revised") && range_text_bound(saved.clone(),true)==make_text_value("c\"d") && range_text_flags(saved.clone())==make_text_value("[]"));
  };
  if selected==6 {return BoolValue::Value(range_text_state(plan.clone())==BoolValue::Value(false) && range_text_bound(plan.clone(),false)==make_text_value("") && range_text_bound(plan.clone(),true)==make_text_value("") && range_text_bound_present(plan.clone(),false) && range_text_bound_present(plan.clone(),true));};
  if selected==7 {return BoolValue::Value(range_text_state(plan.clone())==BoolValue::Value(false) && range_text_bound(plan.clone(),false)==make_text_value(" 1") && range_text_bound(plan.clone(),true)==make_text_value(" 3 ") && range_text_flags(plan.clone())==make_text_value("[)"));};
  if selected==8 {return BoolValue::Value(range_text_state(plan.clone())==BoolValue::Unknown && range_text_needs_bounds(plan.clone())==false && range_text_bound_present(plan.clone(),false)==false && range_text_bound(plan.clone(),false)==TextValue::Null && range_text_bound(plan.clone(),true)==TextValue::Null);};
  if selected==9 {return BoolValue::Value(range_text_state(plan.clone())==BoolValue::Error(make_sql_error(3484946)) && range_text_bound(plan.clone(),false)==TextValue::Null && range_text_bound(plan.clone(),true)==TextValue::Null && range_text_flags(plan.clone())==TextValue::Null);};
  let mut type_name="public.continuous_span".to_owned();
  let mut canonical:i32=1;let mut comparison:i32=2;
  if selected==0 {type_name="pg_catalog.int4range".to_owned();canonical=2;};
  if selected==2 {type_name="public.positive_span".to_owned();};
  if selected==3 {type_name="public.callback_span".to_owned();canonical=0;};
  if selected==4 {type_name="public.reverse_span".to_owned();comparison=0;};
  let support=RangeSupport{comparison,canonical};
  let result=range_input_plan_finish(plan,type_name.as_str(),support,selected==2);
  let output=range_to_text(result);
  if let TextValue::Error(error)=output {return BoolValue::Error(error);};
  if let TextValue::Unknown=output {return BoolValue::Unknown;};
  return BoolValue::Value(output==expected);
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
      ],
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const common: (string | null)[] = [
      null,
      'empty',
      ' EMPTY ',
      '(,)',
      '[,3]',
      '[1,)',
      '[1,3]',
      '(1,3)',
      '[1,1]',
      '(1,1)',
      '[0,bad)',
      '[bad,0)',
      '[0,0)',
      '[0,3)trailing',
      '["",3]',
      '[2147483648,bad)',
      '[bad,2147483648)',
      '[2147483648,3',
      '[3,1)',
      '[1,3]garbage',
      '["1","3")',
      '[1_000,2_000]',
      '[0x10,0x20)',
    ]
    const callbacks = [
      { text: 'empty', defer: false },
      { text: '(1,1)', defer: false },
      { text: '[1,1]', defer: true },
      { text: '[1,3)', defer: true },
      { text: '(,)', defer: true },
      { text: '(,2147483647]', defer: true },
      { text: '[3,1)', defer: false },
      { text: '[bad,1)', defer: false },
      { text: '[1,3]garbage', defer: false },
    ]
    const reversed = [
      { text: 'empty', defer: false },
      { text: '(,)', defer: false },
      { text: '(,3]', defer: false },
      { text: '[3,)', defer: false },
      { text: '[3,1)', defer: true },
      { text: '[1,3)', defer: true },
      { text: '(1,1)', defer: true },
      { text: '[bad,1)', defer: false },
      { text: '[2147483648,1)', defer: false },
    ]
    const types = ['int4range', 'continuous_span', 'positive_span', 'callback_span', 'reverse_span']
    let errors = 0
    for (const [mode, type] of types.entries()) {
      const probes =
        mode === 3
          ? callbacks
          : mode === 4
            ? reversed
            : common.map((text) => ({ text, defer: false }))
      for (const probe of probes) {
        let expectedText: string | null = null
        let outcome: Outcome = { kind: 'True' }
        try {
          expectedText = (
            await pg.query<{ value: string | null }>(`SELECT $1::${type}::text AS value`, [
              probe.text,
            ])
          ).rows[0]!.value
        } catch (error) {
          if (
            !error ||
            typeof error !== 'object' ||
            !('code' in error) ||
            typeof error.code !== 'string'
          )
            throw error
          outcome = { kind: 'Error', value: { state: parseInt(error.code, 36) } }
          errors++
        }
        fixtures.push({
          name: 'plan',
          row: { mode: value(mode), input: value(probe.text), expected: value(expectedText) },
          expected: probe.defer ? { kind: 'Unknown' } : outcome,
        })
      }
      for (const input of [
        { kind: 'Unknown' as const },
        { kind: 'Error' as const, value: { state: parseInt('22012', 36) } },
      ])
        fixtures.push({
          name: 'plan',
          row: { mode: value(mode), input, expected: value(null) },
          expected:
            input.kind === 'Unknown' ? { kind: 'Unknown' } : { kind: 'Error', value: input.value },
        })
    }
    for (const [mode, input, expected] of [
      [5, '["a,b","c""d"]', 'a,b'],
      [6, '["",""]', null],
      [7, ' [ 1, 3 ) ', null],
      [8, null, null],
      [9, '[first,second]trailing', null],
    ] as const)
      fixtures.push({
        name: 'plan',
        row: {
          mode: value(mode),
          input: mode === 8 ? { kind: 'Unknown' } : value(input),
          expected: value(expected),
        },
        expected: { kind: 'True' },
      })
    await runCheckParity(directory, 'rangeinputplan', group, ['plan'], fixtures)
    expect(errors).toBeGreaterThan(0)
    await mkdir('artifacts/check-range-input-plan', { recursive: true })
    await writeFile(
      'artifacts/check-range-input-plan/report.json',
      JSON.stringify(
        {
          nativeCases: common.length * 3 + callbacks.length + reversed.length,
          nativeErrors: errors,
          fixtures: fixtures.length,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
