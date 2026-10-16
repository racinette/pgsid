import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
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
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const probe = String.raw`
fn array_text_same(actual:TextValue,expected:TextValue)->BoolValue {
 if let TextValue::Error(error)=actual {return BoolValue::Error(error);};
 if let TextValue::Unknown=actual {return BoolValue::Unknown;};
 BoolValue::Value(actual==expected)
}
pub fn array_text_probe(source:TextValue,expected:TextValue,index:Int4Value,mode:Int4Value,nulls:Int4Value)->BoolValue {
 let mut selection:i32=0;
 if let Int4Value::Value(value)=mode {selection=value;};
 let mut null_mode:i32=-1;
 if let Int4Value::Value(value)=nulls {null_mode=value;};
 let mut delimiter=',';
 let mut family:i32=8;
 let mut identity="pg_catalog.text".to_owned();
 if selection==3 {family=20;identity="pg_catalog.float8".to_owned();};
 if selection==4 {family=27;identity="pg_catalog.box".to_owned();delimiter=';';};
 let plan=parse_array_text(source,delimiter,null_mode);
 let mut builder=make_array_arguments(identity.as_str(),family);
 let saved=plan.clone();
 if let ArrayTextPlan::Value(payload)=saved {
  let count=array_text_event_count(&payload);
  let mut length:i32=0;
  if let Int4Value::Value(value)=count {length=value;};
  let mut position:i32=0;
  while position<length {
   let event=array_text_event_at(&payload,Int4Value::Value(position));
   let mut element=array_element_from_text(event.clone());
   if selection==3 {element=array_element_from_float8(float8_from_text(event.clone()));};
   if selection==4 {element=array_element_from_box(box_from_text(event));};
   builder=append_array_argument(builder,element);
   position=position+1;
  }
 };
 let array=finish_array_text(plan,builder);
 let nullness=array_is_null(array.clone());
 if let BoolValue::Error(error)=nullness {return BoolValue::Error(error);};
 if let BoolValue::Unknown=nullness {return BoolValue::Unknown;};
 let mut actual=sql__pg_catalog__array_dims__01ex(array.clone());
 if selection==1 {actual=int4_to_text(sql__pg_catalog__cardinality__m1rn(array.clone()));};
 if selection==2 {actual=array_element_to_text(array_flat_element(array,index));};
 array_text_same(actual,expected)
}
pub fn array_text_ownership_probe()->BoolValue {
 let original=parse_array_text(make_text_value("[0:1]={a,b}"),',',1);
 let copied=original.clone();
 if let ArrayTextPlan::Value(payload)=copied {
  let mut events=payload.events;events[0]=ArrayTextEvent::Text("changed".to_owned());
  let mut dimensions=payload.dimensions;dimensions[0]=ArrayDimension{lower:-10,length:2};
  let changed=ArrayTextPayload{dimensions:dimensions,events:events};
  if array_text_event_at(&changed,Int4Value::Value(0))!=make_text_value("changed") {return BoolValue::Value(false);};
 };
 let retained=original.clone();
 if let ArrayTextPlan::Value(payload)=retained {
  if array_text_event_at(&payload,Int4Value::Value(0))!=make_text_value("a") {return BoolValue::Value(false);};
 };
 let mut builder=make_array_arguments("pg_catalog.text",8);
 builder=append_array_argument(builder,ArrayElement::Text("a".to_owned()));
 builder=append_array_argument(builder,ArrayElement::Text("b".to_owned()));
 if sql__pg_catalog__array_dims__01ex(finish_array_text(original,builder))!=make_text_value("[0:1]") {return BoolValue::Value(false);};
 let unknown_plan=parse_array_text(TextValue::Unknown,',',1);
 if array_is_null(finish_array_text(unknown_plan,make_array_arguments("pg_catalog.text",8)))!=BoolValue::Unknown {return BoolValue::Value(false);};
 let null_plan=parse_array_text(TextValue::Null,',',1);
 if array_is_null(finish_array_text(null_plan,make_array_arguments("pg_catalog.text",8)))!=BoolValue::Value(true) {return BoolValue::Value(false);};
 BoolValue::Value(true)
}
`

it('parses ordered array text events, dimensions and escapes with explicit NULL-token context in native and generated targets before SQL admission', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-text-'))
  const known = (value: string | number | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const textSources = [
    '{}',
    ' { } ',
    '{a}',
    '{""," ","NULL",NULL,nUlL,NuLl}',
    String.raw`{ \ a , a\  , a\ b , \NULL , N\ULL }`,
    '{雪😊,é}',
    String.raw`{"a,b","{x}","a\"b","a\\b"}`,
    '{a\tb, a\n b}',
    '{{a,b},{c,d}}',
    '[0:1][-3:-2]={{a,b},{c,d}}',
    '[2]={a,b}',
    '[+0:+1]={a,b}',
    '[2147483646:2147483646]={a}',
    '[-2147483648:-2147483648]={a}',
    '{{}}',
    '{{},{}}',
    '{{{}}}',
    '{{{{{{a}}}}}}',
    ' \t\n\r\v\f{a}\n',
    '{\u00a0a\u00a0}',
    '',
    'null',
    '[]',
    '{',
    '}',
    '{{',
    '{a',
    '{a,}',
    '{,a}',
    '{a,,b}',
    '{a}x',
    '{"a"',
    '{"a"x}',
    '{a"b}',
    '{a{b}',
    '{"a"{}}',
    '{a,{b}}',
    '{{a},b}',
    '{{a},{b,c}}',
    '{{},{a}}',
    '{{a},{}}',
    '[1:0]={}',
    '[2147483647]={a}',
    '[2147483648]={a}',
    '[-2147483649]={a}',
    '[-2147483648:0]={a}',
    '[1:2]={a}',
    '[1]={}',
    '[2][2]={{a,b},{c}}',
    '[1 :2]={a,b}',
    '[ 1:2]={a,b}',
    '[1: 2]={a,b}',
    '[+]={a}',
    '[--1]={a}',
    '[1] {a}',
    '[1]=a',
    '[1:1][1:1][1:1][1:1][1:1][1:1][1:1]={a}',
    '{{{{{{{a}}}}}}}',
    '{{{{{{{}}}}}}}',
    String.raw`{a\}`,
    '"{}"',
    '{a}\nfoo',
  ]
  for (const left of ['a', '"x"', 'NULL', '', '{a}', '{}'])
    for (const right of ['a', '"x"', 'NULL', '', '{a}', '{}'])
      textSources.push('{' + left + ',' + right + '}')
  const floatSources = [
    '{1e99999,}',
    '{1e99999}x',
    '{1e99999,{2}}',
    '{{1},nope}',
    '{nope,1e99999}',
    '{1e99999,nope}',
    '{NULL,1}',
    '{"NULL"}',
    '{NaN,Infinity,-Infinity,-0,.5}',
    '[1:0]={1e9999}',
    '{1e9999"{x}}',
    '{}',
    '{{1,2},{3,4}}',
    '{1000,16,1e-99}',
  ]
  const boxSources = [
    '{(1,2),(3,4);(5,6),(7,8)}',
    '{"(1,2),(3,4)";NULL}',
    '{(1,2),(3,4),(5,6),(7,8)}',
    '{}',
    '{{(1,2),(3,4)};{(5,6),(7,8)}}',
    '{bad;}',
    '{(1,2),(3,4);}',
  ]
  try {
    const ownershipEntry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'array_text',
      constraint: 'ownership',
    })
    const evaluatorSource = `pub fn evaluate_check(source:TextValue,expected:TextValue,index:Int4Value,mode:Int4Value,nulls:Int4Value)->CheckOutcome {
 let result=array_text_probe(source,expected,index,mode,nulls);check_from_bool(result)
}
pub fn ${ownershipEntry}()->CheckOutcome {let result=array_text_ownership_probe();check_from_bool(result)}`
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: ['sql__pg_catalog__cardinality__m1rn'],
    })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({ path: 'test/array_text.rs', source: probe })
    const inputs = ['source', 'expected', 'index', 'mode', 'nulls'].map((name) => ({
      name,
      rustName: name,
      type: name === 'source' || name === 'expected' ? 'pg_catalog.text' : 'pg_catalog.int4',
      rustType: name === 'source' || name === 'expected' ? 'TextValue' : 'Int4Value',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        { kind: 'supported', entryName: 'evaluate_check', inputs },
        { kind: 'supported', entryName: ownershipEntry, inputs: [] },
      ],
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    const add = (
      source: Input,
      mode: number,
      nulls: Input,
      index: number,
      expected: string | null,
      outcome: Outcome = { kind: 'True' },
    ) => {
      fixtures.push({
        name: 'grammar',
        row: { source, mode: known(mode), nulls, index: known(index), expected: known(expected) },
        expected: outcome,
      })
    }
    for (const nulls of [0, 1]) {
      await pg.exec('SET array_nulls=' + (nulls === 1 ? 'on' : 'off'))
      for (const [type, sources, selected] of [
        ['text', textSources, 0],
        ['float8', floatSources, 3],
        ['box', boxSources, 4],
      ] as const) {
        for (const text of sources) {
          try {
            const actual = (
              await pg.query<{ dims: string | null; count: number; cells: unknown[] }>(
                `SELECT array_dims($1::${type}[]) AS dims, cardinality($1::${type}[]) AS count, array_to_json($1::${type}[]) AS cells`,
                [text],
              )
            ).rows[0]!
            references.push({ type, text, nulls, actual })
            add(known(text), selected, known(nulls), 0, actual.dims)
            if (type === 'text') {
              add(known(text), 1, known(nulls), 0, String(actual.count))
              const cells = actual.cells.flat(Infinity) as (string | null)[]
              for (let index = -1; index <= cells.length; index++)
                add(known(text), 2, known(nulls), index, cells[index] ?? null)
            }
          } catch (error) {
            const code = (error as { code: string }).code
            expect(code).toMatch(/^[A-Z0-9]{5}$/)
            references.push({ type, text, nulls, code })
            add(known(text), selected, known(nulls), 0, null, {
              kind: 'Error',
              value: { state: parseInt(code, 36) },
            })
          }
        }
      }
    }
    for (const text of ['{}', '{"NULL",\\NULL}', '[0:1]={a,b}', '{{a,b},{c,d}}']) {
      const actual = (
        await pg.query<{ dims: string | null }>('SELECT array_dims($1::text[]) AS dims', [text])
      ).rows[0]!
      add(known(text), 0, { kind: 'Unknown' }, 0, actual.dims)
    }
    for (const text of ['{NULL}', '{null,bad}', '{a,NULL}', '{NULL,}'])
      add(known(text), 0, { kind: 'Unknown' }, 0, null, { kind: 'Unknown' })
    add(known('{1e99999,NULL}'), 3, { kind: 'Unknown' }, 0, null, {
      kind: 'Error',
      value: { state: parseInt('22003', 36) },
    })
    add({ kind: 'Unknown' }, 0, known(1), 0, null, { kind: 'Unknown' })
    add({ kind: 'Null' }, 0, known(1), 0, null)
    add({ kind: 'Error', value: { state: parseInt('22012', 36) } }, 0, known(1), 0, null, {
      kind: 'Error',
      value: { state: parseInt('22012', 36) },
    })
    fixtures.push({ name: 'ownership', row: {}, expected: { kind: 'True' } })
    await mkdir('artifacts/array-text', { recursive: true })
    await writeFile('artifacts/array-text/fixtures.json', JSON.stringify(fixtures, null, 2) + '\n')
    await writeFile(
      'artifacts/array-text/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(directory, 'arraytextparity', group, ['grammar', 'ownership'], fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
