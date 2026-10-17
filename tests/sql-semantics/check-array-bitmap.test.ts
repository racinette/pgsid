import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
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
import { arrayFixtureSource } from './check-array-fixtures.js'

const name = (fn: string, arity: number, args?: string) => {
  const rows = builtinCallables().filter(
    (f) =>
      f.kind === 'function' &&
      f.schema === 'pg_catalog' &&
      f.name === fn &&
      f.args.length === arity &&
      (!args || f.args.join(',') === args),
  )
  expect(rows).toHaveLength(1)
  const row = rows[0]!
  if (row.kind !== 'function') throw new Error('function required')
  return row.rustName
}
const probe =
  arrayFixtureSource +
  String.raw`
fn bitmap_input(input:TextValue,textual:bool)->ArrayValue {
 let plan=prepare_array_text(input,false,1);
 let mut kind:i32=2;let mut identity="pg_catalog.int4".to_owned();
 if textual {kind=8;identity="pg_catalog.text".to_owned();};
 let mut builder=make_array_arguments(identity.as_str(),kind);let mut index=make_int4_value(0);
 while array_text_has_event(&plan,index) {
  let text=array_text_event_at(&plan,index);let mut element=array_integer_text_element(text.clone(),2);
  if textual {element=array_element_from_text(text);};
  builder=append_array_argument(builder,element);index=array_text_next_index(index);
 }
 finish_prepared_array_text(plan,builder)
}
fn bitmap_coerce(input:ArrayValue,binary:bool,textual:bool)->ArrayValue {
 let plan=prepare_array_output(input);let mut index=make_int4_value(0);
 let mut family:i32=2;let mut identity="pg_catalog.int4".to_owned();
 if textual {family=8;identity="pg_catalog.\"varchar\"".to_owned();}
 else if binary==false {family=3;identity="pg_catalog.int8".to_owned();};
 let mut builder=make_array_arguments(identity.as_str(),family);
 while array_output_has_element(&plan,index) {
  let mut element=array_output_element_at(&plan,index);
  if textual && binary==false {element=array_element_typmod(element,identity.as_str(),7);}
  else if textual==false && binary==false {element=array_element_from_int8(${name('int8', 1, 'pg_catalog.int4')}(array_element_to_int4(element)));};
  builder=append_array_argument(builder,element);index=array_text_next_index(index);
 }
 finish_array_coercion(plan,builder,binary)
}
fn bitmap_rewrite(input:ArrayValue,mode:i32,textual:bool)->ArrayValue {
 let mut query=array_element_from_int4(make_int4_value(1));let mut replacement=query.clone();
 if textual {query=array_element_from_text(make_text_value("1"));replacement=query.clone();};
 if mode==11 {replacement=array_element_from_int4(make_int4_value(2));if textual {replacement=array_element_from_text(make_text_value("2"));};};
 if mode==13 || mode==16 {query=array_element_from_int4(make_int4_value(5));if textual {query=array_element_from_text(make_text_value("5"));};replacement=query.clone();};
 if mode==14 || mode==17 {query=ArrayElement::Null;replacement=ArrayElement::Null;};
 let remove=mode>=15;let plan=prepare_array_rewrite(input.clone(),query,replacement,remove,true);
 let mut kind:i32=2;let mut identity="pg_catalog.int4".to_owned();if textual {kind=8;identity="pg_catalog.text".to_owned();};
 let mut builder=make_array_arguments(identity.as_str(),kind);let mut index=make_int4_value(0);
 let mut status=array_search_initial(&plan);let mut changed=make_bool_value(false);
 while array_rewrite_continues(&plan,index,status) {
  let left=array_membership_element_at(&plan,index,false);let right=array_rewrite_needle(&plan);
  let mut compared=array_comparison_pair(left.clone(),right.clone(),true);
  if array_pair_requires_scalar(compared) {
   let mut eq=${name('int4eq', 2)}(array_element_to_int4(left.clone()),array_element_to_int4(right.clone()));
   if textual {eq=${name('texteq', 2)}(array_element_to_text(left),array_element_to_text(right));};
   compared=array_equality_step(eq);
  };
  builder=array_rewrite_step(builder,&plan,index,compared,remove);
  changed=array_bitmap_union(changed,array_rewrite_changed(&plan,compared,remove));
  status=compared;index=array_text_next_index(index);
 }
 finish_array_rewrite(input,&plan,builder,remove,changed)
}
fn bitmap_sort(input:ArrayValue,textual:bool)->ArrayValue {
 let mut plan=prepare_array_sort(input,make_bool_value(false),make_bool_value(false),true);
 while array_sort_continues(&plan) {
  let mut result=make_int4_value(0);
  if array_sort_needs_pair(&plan) {
   let mut index=make_int4_value(0);
   while array_sort_pair_continues(&plan,index,result) {
    let left=array_sort_element_at(&plan,index,false);let right=array_sort_element_at(&plan,index,true);
    let mut compared=array_sort_cell_pair(&plan,left.clone(),right.clone());
    if array_pair_requires_scalar(compared) {
     compared=${name('btint4cmp', 2)}(array_element_to_int4(left.clone()),array_element_to_int4(right.clone()));
     if textual {compared=${name('bttextcmp', 2)}(array_element_to_text(left),array_element_to_text(right));};
    };
    result=compared;index=array_text_next_index(index);
   }
  };
  plan=array_sort_step(plan,result);
 }
 finish_array_sort(plan)
}
fn bitmap_roundtrip(input:ArrayValue,textual:bool)->ArrayValue {
 let plan=prepare_array_output(input);let mut rendered=make_array_conversion();let mut index=make_int4_value(0);
 while array_output_has_element(&plan,index) {
  let cell=array_output_element_at(&plan,index);let mut text=int4_to_text(array_element_to_int4(cell.clone()));
  if textual {text=array_element_to_text(cell);};
  rendered=append_array_conversion(rendered,array_element_from_text(text),true);index=array_text_next_index(index);
 }
 let converted=array_conversion_arguments(rendered,"pg_catalog.text",8);
 let output=finish_array_output(plan,converted,false);
 bitmap_input(output,textual)
}
pub fn bitmap_partial(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
  let mut elements:Vec<ArrayElement>=Vec::new();elements.push(ArrayElement::Unknown);
  if (selected/3)%2==1 {elements.push(ArrayElement::Null);} else {elements.push(array_element_from_int4(make_int4_value(1)));};
  let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension{lower:1,length:2});
  let mut facet=BoolValue::Unknown;let flag=selected%3;
  if flag==1 {facet=BoolValue::Value(false);};if flag==2 {facet=BoolValue::Value(true);};
  let value=make_array_value(ArrayPayload{element_type:"pg_catalog.int4".to_owned(),element_kind:2,dimensions:dimensions,elements:elements,null_bitmap:facet});
  let mut result=value.clone();
  if selected>=6 {result=bitmap_sort(value,false);};
  return array_null_bitmap(result);
 };BoolValue::Unknown
}
pub fn bitmap_probe(mode:Int4Value,input:TextValue,other:TextValue,textual:BoolValue,retained:BoolValue)->BoolValue {
 if let Int4Value::Value(selected)=mode {if let BoolValue::Value(is_text)=textual {
  let mut left=bitmap_input(input,is_text);let right=bitmap_input(other,is_text);
  if let BoolValue::Value(slice)=retained {if slice {
   let mut bounds=make_array_subscripts();bounds=append_array_subscript(bounds,make_int4_value(1),true,true);bounds=append_array_subscript(bounds,make_int4_value(2),false,true);
   left=array_slice_subscript(left,bounds);
  };};
  let mut result=left.clone();
  if selected==1 {let mut bounds=make_array_subscripts();bounds=append_array_subscript(bounds,make_int4_value(1),true,true);bounds=append_array_subscript(bounds,make_int4_value(1),false,true);result=array_slice_subscript(left.clone(),bounds);};
  if selected==2 {result=${name('trim_array', 2)}(left.clone(),make_int4_value(1));};
  if selected==3 {result=${name('array_reverse', 1)}(left.clone());};
  let mut cell=array_element_from_int4(make_int4_value(1));let mut family:i32=2;let mut identity="pg_catalog.int4".to_owned();
  if is_text {cell=array_element_from_text(make_text_value("1"));family=8;identity="pg_catalog.text".to_owned();};
  if selected==4 {result=${name('array_append', 2)}(left.clone(),cell.clone(),identity.as_str(),family);};
  if selected==5 {result=${name('array_prepend', 2)}(cell,left.clone(),identity.as_str(),family);};
  if selected==6 {result=${name('array_cat', 2)}(left.clone(),right.clone());};
  if selected==7 {let mut children=make_array_children(identity.as_str(),family);children=append_array_child(children,left.clone());children=append_array_child(children,right);result=finish_array_children(children);};
  if selected==8 {result=bitmap_roundtrip(left.clone(),is_text);};
  if selected==9 || selected==10 {result=bitmap_coerce(left.clone(),selected==9,is_text);};
  if selected>=11 && selected<=17 {result=bitmap_rewrite(left.clone(),selected,is_text);};
  if selected==18 {result=bitmap_sort(left.clone(),is_text);};
  if selected>=20 && selected<=23 {let original=left.clone();if let ArrayValue::Value(value)=original {
   let mut facet=BoolValue::Unknown;if selected==21 {facet=make_bool_value(false);};if selected==22 {facet=make_bool_value(true);};if selected==23 {facet=BoolValue::Null;};
   result=array_from_coerced_value(ArrayValue::Value(ArrayPayload{element_type:value.element_type,element_kind:value.element_kind,dimensions:value.dimensions,elements:value.elements,null_bitmap:facet}),identity.as_str(),family);
  };};
  return array_null_bitmap(result);
 };};BoolValue::Unknown
}
pub fn bitmap_families(family:Int4Value)->BoolValue {
 if let Int4Value::Value(kind)=family {
  let element=array_fixture_element(kind);let mut builder=make_array_arguments("probe",kind);builder=append_array_argument(builder,element);let array=finish_array_constructor(builder);
  if array_null_bitmap(array.clone())!=BoolValue::Value(false) {return BoolValue::Value(false);};
  let output=prepare_array_output(array);let mut nulls=array_conversion_arguments(output,"probe",kind);nulls=append_array_argument(nulls,ArrayElement::Null);let result=finish_array_constructor(nulls);
  return array_null_bitmap(result);
 };BoolValue::Unknown
}
`

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
it('retains or reconstructs actual PostgreSQL NULL bitmaps independently of logical cells across owned arrays and transformations', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-bitmap-'))
  try {
    const entries = ['bitmap_observe', 'bitmap_families', 'bitmap_partial']
    const entryNames = entries.map((constraint) =>
      checkRustEntryName({ schema: 'public', kind: 'table', owner: 'array_bitmap', constraint }),
    )
    const evaluatorSource = `pub fn ${entryNames[0]}(mode:Int4Value,input:TextValue,other:TextValue,textual:BoolValue,retained:BoolValue)->CheckOutcome{let result=bitmap_probe(mode,input,other,textual,retained);check_from_bool(result)}\npub fn ${entryNames[1]}(family:Int4Value)->CheckOutcome{let result=bitmap_families(family);check_from_bool(result)}\npub fn ${entryNames[2]}(mode:Int4Value)->CheckOutcome{let result=bitmap_partial(mode);check_from_bool(result)}\n`
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: [],
      requiresRegex: false,
    })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'test/bitmap_probe.rs', source: probe })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported',
          entryName: entryNames[0]!,
          inputs: [
            ['mode', 'pg_catalog.int4', 'Int4Value'],
            ['input', 'pg_catalog.text', 'TextValue'],
            ['other', 'pg_catalog.text', 'TextValue'],
            ['textual', 'pg_catalog.bool', 'BoolValue'],
            ['retained', 'pg_catalog.bool', 'BoolValue'],
          ].map(([name, type, rustType]) => ({
            name: name!,
            rustName: name!,
            type: type!,
            rustType: rustType!,
          })),
        },
        {
          kind: 'supported',
          entryName: entryNames[1]!,
          inputs: [
            { name: 'family', rustName: 'family', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          ],
        },
        {
          kind: 'supported',
          entryName: entryNames[2]!,
          inputs: [
            { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          ],
        },
      ],
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const cases = [
      '{}',
      '{1}',
      '{1,2}',
      '{3,4}',
      '{1,2,NULL}',
      '{NULL,1,2}',
      '{NULL,NULL}',
      '{{1,2},{3,4}}',
      '{{1,2},{3,4},{NULL,NULL}}',
      null,
    ]
    for (const textual of [false, true])
      for (const retained of [false, true])
        for (const input of cases)
          for (let mode = 0; mode <= 23; mode++) {
            if (mode === 19) continue
            const type = textual ? 'text' : 'integer',
              other = '{3,4}'
            const base = `(${input === null ? 'NULL' : "'" + input + "'"}::${type}[])${retained ? '[1:2]' : ''}`
            const right = `'${other}'::${type}[]`
            const sql = [
              base,
              `(${base})[1:1]`,
              `trim_array(${base},1)`,
              `array_reverse(${base})`,
              `array_append(${base},'1'::${type})`,
              `array_prepend('1'::${type},${base})`,
              `array_cat(${base},${right})`,
              `ARRAY[${base},${right}]`,
              `(${base})::text::${type}[]`,
              textual ? `(${base})::varchar[]` : `(${base})::integer[]`,
              textual ? `(${base})::varchar(3)[]` : `(${base})::bigint[]`,
              `array_replace(${base},'1'::${type},'2'::${type})`,
              `array_replace(${base},'1'::${type},'1'::${type})`,
              `array_replace(${base},'5'::${type},'5'::${type})`,
              `array_replace(${base},NULL::${type},NULL::${type})`,
              `array_remove(${base},'1'::${type})`,
              `array_remove(${base},'5'::${type})`,
              `array_remove(${base},NULL::${type})`,
              `array_sort(${base})`,
            ][mode]
            let expected: Outcome
            if (mode >= 20) {
              if (input === null) expected = { kind: 'Null' }
              else if (mode === 23) expected = { kind: 'Unknown' }
              else {
                const nulls = (
                  await pg.query<{ v: boolean }>(
                    `SELECT array_position(ARRAY(SELECT unnest(${base})),NULL) IS NOT NULL v`,
                  )
                ).rows[0]!.v
                expected = {
                  kind:
                    mode === 20
                      ? nulls
                        ? 'True'
                        : 'Unknown'
                      : mode === 21
                        ? nulls
                          ? 'Unknown'
                          : 'False'
                        : 'True',
                }
              }
            } else {
              try {
                const v = (
                  await pg.query<{ v: boolean | null }>(
                    `SELECT get_byte(array_send(${sql!}),7)=1 v`,
                  )
                ).rows[0]!.v
                expected = { kind: v === null ? 'Null' : v ? 'True' : 'False' }
              } catch (e) {
                expected = {
                  kind: 'Error',
                  value: { state: parseInt((e as { code: string }).code, 36) },
                }
              }
            }
            const row = {
              mode: known(mode),
              input: known(input),
              other: known(other),
              textual: known(textual),
              retained: known(retained),
            }
            fixtures.push({ name: entries[0]!, row, expected })
            observations.push({ mode, input, textual, retained, sql, expected })
          }
    for (let family = 1; family <= 40; family++)
      fixtures.push({
        name: entries[1]!,
        row: { family: known(family) },
        expected: { kind: 'True' },
      })
    for (const [mode, kind] of [
      'Unknown',
      'False',
      'True',
      'True',
      'Unknown',
      'True',
      'Unknown',
      'False',
      'Unknown',
      'True',
      'Unknown',
      'True',
    ].entries())
      fixtures.push({
        name: entries[2]!,
        row: { mode: known(mode) },
        expected: { kind: kind as 'True' | 'False' | 'Unknown' },
      })
    await mkdir('artifacts/goal-checks/array-bitmap', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-bitmap/observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await runCheckParity(directory, 'arraybitmap', group, entries, fixtures).catch(
      (error: unknown) => {
        const failure = error as Error & { stdout?: string; stderr?: string }
        throw new Error(
          [failure.message, failure.stdout, failure.stderr].filter(Boolean).join('\n'),
          { cause: error },
        )
      },
    )
    await writeFile(
      'artifacts/goal-checks/array-bitmap/measurements.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          postgresObservations: observations.length,
          representedElementFamilies: 40,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
