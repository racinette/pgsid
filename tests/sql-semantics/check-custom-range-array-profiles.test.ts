import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { rangeProfileSupport, type RangeProfile } from '../../src/sql-semantics/range-profiles.js'
import { arrayType, domainElementType } from '../../src/sql-semantics/expressions.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import {
  customRangeSchema,
  customRangeProfiles,
  nativeCustomRangeOutcome,
} from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText } from './check-range-array-fixtures.js'

const probe = String.raw`
fn profiled_array_same_range(left: RangeValue, right: RangeValue) -> bool {
 if let RangeValue::Null=left {if let RangeValue::Null=right{return true;};return false;};
 if let RangeValue::Unknown=left {if let RangeValue::Unknown=right{return true;};return false;};
 if let RangeValue::Error(a)=left {if let RangeValue::Error(b)=right{return a.state==b.state;};return false;};
 if let RangeValue::Value(a)=left {
  if let RangeValue::Value(b)=right {
   if a.type_name!=b.type_name || a.element_type!=b.element_type || a.element_kind!=b.element_kind || a.empty!=b.empty || a.lower_inclusive!=b.lower_inclusive || a.upper_inclusive!=b.upper_inclusive || a.bounds.len()!=b.bounds.len(){return false;};
   let mut index:usize=0;
   while index<a.bounds.len(){
    let x=a.bounds[index].clone();let y=b.bounds[index].clone();
    if a.element_kind==2 && array_element_to_int4(x.clone())!=array_element_to_int4(y.clone()){return false;};
    if a.element_kind==3 && array_element_to_int8(x.clone())!=array_element_to_int8(y.clone()){return false;};
    if a.element_kind==4 && array_element_to_timestamp(x.clone())!=array_element_to_timestamp(y.clone()){return false;};
    if a.element_kind==5 && array_element_to_timestamptz(x.clone())!=array_element_to_timestamptz(y.clone()){return false;};
    if a.element_kind==7 && array_element_to_date(x.clone())!=array_element_to_date(y.clone()){return false;};
    if a.element_kind==10 && array_element_to_numeric(x)!=array_element_to_numeric(y){return false;};
    index+=1;
   };
   return true;
  };
 };
 false
}
fn profiled_array_same_multi(left: MultirangePayload,right:MultirangePayload)->bool {
 if left.type_name!=right.type_name || left.range_type!=right.range_type || left.element_type!=right.element_type || left.element_kind!=right.element_kind || left.ranges.len()!=right.ranges.len(){return false;};
 let mut index:usize=0;
 while index<left.ranges.len(){if profiled_array_same_range(left.ranges[index].clone(),right.ranges[index].clone())==false{return false;};index+=1;};
 true
}
fn profiled_array_same_element(left:ArrayElement,right:ArrayElement)->bool {
 if let ArrayElement::Null=left {if let ArrayElement::Null=right{return true;};return false;};
 if let ArrayElement::Unknown=left {if let ArrayElement::Unknown=right{return true;};return false;};
 if let ArrayElement::Error(a)=left {if let ArrayElement::Error(b)=right{return a.state==b.state;};return false;};
 if let ArrayElement::Array(a)=left {if let ArrayElement::Array(b)=right{return profiled_array_same(a,b);};return false;};
 if let ArrayElement::Range(a)=left {if let ArrayElement::Range(b)=right{return profiled_array_same_range(RangeValue::Value(a),RangeValue::Value(b));};return false;};
 if let ArrayElement::Multirange(a)=left {if let ArrayElement::Multirange(b)=right{return profiled_array_same_multi(a,b);};};
 false
}
fn profiled_array_same(left:ArrayPayload,right:ArrayPayload)->bool {
 if left.element_type!=right.element_type || left.element_kind!=right.element_kind || left.null_bitmap!=right.null_bitmap || left.dimensions.len()!=right.dimensions.len() || left.elements.len()!=right.elements.len(){return false;};
 let mut index:usize=0;
 while index<left.dimensions.len(){if left.dimensions[index].lower!=right.dimensions[index].lower || left.dimensions[index].length!=right.dimensions[index].length{return false;};index+=1;};
 index=0;
 while index<left.elements.len(){if profiled_array_same_element(left.elements[index].clone(),right.elements[index].clone())==false{return false;};index+=1;};
 true
}
fn profiled_array_range_context(input:RangeValue,comparison:i32,canonical:i32)->bool {
 if let RangeValue::Value(span)=input {return span.support.comparison==comparison && span.support.canonical==canonical;};
 true
}
fn profiled_array_context(input:&ArrayPayload,comparison:i32,canonical:i32)->bool {
 let mut index:usize=0;
 while index<input.elements.len(){
  let element=input.elements[index].clone();
  let saved_profile_1=element.clone();if let ArrayElement::Array(nested)=saved_profile_1{if profiled_array_context(&nested,comparison,canonical)==false{return false;};};
  let saved_profile_2=element.clone();if let ArrayElement::Range(span)=saved_profile_2{if profiled_array_range_context(RangeValue::Value(span),comparison,canonical)==false{return false;};};
  if let ArrayElement::Multirange(spans)=element {
   if spans.support.comparison!=comparison || spans.support.canonical!=canonical{return false;};
   let mut member:usize=0;
   while member<spans.ranges.len(){if profiled_array_range_context(spans.ranges[member].clone(),comparison,canonical)==false{return false;};member+=1;};
  };
  index+=1;
 };
 true
}
fn profiled_array_edit_range(input:RangePayload,mode:i32)->RangePayload {
 let mut name=input.type_name;
 let mut bounds=input.bounds;
 if mode==3{name="forged.type".to_owned();};
 if mode==4{bounds.push(ArrayElement::Unknown);};
 RangePayload{bound_profile:input.bound_profile,enum_labels:input.enum_labels,enum_count:input.enum_count,type_name:name,element_type:input.element_type,element_kind:input.element_kind,support:make_range_support(99,99),empty:input.empty,lower_inclusive:input.lower_inclusive,upper_inclusive:input.upper_inclusive,bounds}
}
fn profiled_array_edit_multi(input:MultirangePayload,mode:i32)->MultirangePayload {
 let mut ranges=input.ranges;
 let mut index:usize=0;
 while index<ranges.len(){let member=ranges[index].clone();if let RangeValue::Value(span)=member {ranges[index]=RangeValue::Value(profiled_array_edit_range(span,mode));};index+=1;};
 MultirangePayload{type_name:input.type_name,range_type:input.range_type,element_type:input.element_type,element_kind:input.element_kind,support:make_range_support(99,99),ranges}
}
fn profiled_array_edit_element(input:ArrayElement,mode:i32)->ArrayElement {
 if let ArrayElement::Array(nested)=input{return ArrayElement::Array(profiled_array_edit(nested,mode));};
 if let ArrayElement::Range(span)=input{return ArrayElement::Range(profiled_array_edit_range(span,mode));};
 if let ArrayElement::Multirange(spans)=input{return ArrayElement::Multirange(profiled_array_edit_multi(spans,mode));};
 input
}
fn profiled_array_edit(input:ArrayPayload,mode:i32)->ArrayPayload {
 let mut elements=input.elements;
 let mut index:usize=0;
 while index<elements.len(){elements[index]=profiled_array_edit_element(elements[index].clone(),mode);index+=1;};
 ArrayPayload{element_type:input.element_type,element_kind:input.element_kind,dimensions:input.dimensions,elements,null_bitmap:input.null_bitmap}
}
fn profiled_array_first(input:ArrayValue)->ArrayElement {
 let first=array_flat_element(input,make_int4_value(0));
 if let ArrayElement::Array(nested)=first{return profiled_array_first(ArrayValue::Value(nested));};
 first
}
fn profiled_array_convert(input:ArrayValue,types:&str,kinds:&str,multi_type:&str,range_type:&str,element_type:&str,element_kind:i32,comparison:i32,canonical:i32)->ArrayValue {
 if multi_type=="" {return array_from_coerced_range_profile_tree(input,types,kinds,range_type,element_type,element_kind,comparison,canonical);};
 array_from_coerced_multirange_profile_tree(input,types,kinds,multi_type,range_type,element_type,element_kind,comparison,canonical)
}
pub fn profiled_array_evaluate(input:ArrayValue,types:&str,kinds:&str,multi_type:&str,range_type:&str,element_type:&str,element_kind:i32,comparison:i32,canonical:i32,count:Int4Value,bypass:BoolValue,mode:Int4Value)->BoolValue {
 if bypass==BoolValue::Value(true){return BoolValue::Value(true);};
 let mut selected:i32=0;
 if let Int4Value::Value(value)=mode{selected=value;};
 let original=input.clone();
 let mut candidate=input;
 if selected>=2 {if let ArrayValue::Value(payload)=candidate{candidate=ArrayValue::Value(profiled_array_edit(payload,selected));};};
 let converted=profiled_array_convert(candidate,types,kinds,multi_type,range_type,element_type,element_kind,comparison,canonical);
 if let ArrayValue::Error(error)=converted{return BoolValue::Error(error);};
 if let ArrayValue::Unknown=converted{return BoolValue::Unknown;};
 let saved_profile_3=converted.clone();if let ArrayValue::Value(after)=saved_profile_3{
  let saved_profile_4=original.clone();if let ArrayValue::Value(before)=saved_profile_4{
   if profiled_array_same(before.clone(),after.clone())==false || profiled_array_context(&after,comparison,canonical)==false{return BoolValue::Value(false);};
   let edited=profiled_array_edit(after.clone(),3);
   if edited.dimensions.len()!=after.dimensions.len() || profiled_array_same(before.clone(),after.clone())==false{return BoolValue::Value(false);};
   if let ArrayValue::Value(unchanged)=original {if profiled_array_same(before,unchanged)==false{return BoolValue::Value(false);};};
   if profiled_array_context(&after,comparison,canonical)==false{return BoolValue::Value(false);};
  };
 };
 if selected==1 {
  let first=profiled_array_first(converted);
  if multi_type=="" {let span=array_element_to_range(first);return sql__pg_catalog__range_eq__loxq(span.clone(),span);};
  let spans=array_element_to_multirange(first);return sql__pg_catalog__multirange_eq__9xy5(spans.clone(),spans);
 };
 sql__pg_catalog__int4eq__lrxe(sql__pg_catalog__cardinality__m1rn(converted),count)
}
`

it('attaches compiled custom range profiles throughout owned arrays while preserving native values, dimensions, partial states and independent snapshots', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-array-profiles-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC';" + customRangeSchema)
    const catalog = await snapshotCatalog(pg),
      profiles = customRangeProfiles(catalog)
    expect(profiles).toHaveLength(10)
    const forms = profiles.flatMap((profile, family) =>
      [false, true].flatMap((multi) =>
        [false, true].map((nested) => {
          const leaf = multi ? profile.multirange : profile.identity,
            base = multi ? profile.multirangeType : profile.rangeType,
            domain = `profiled_window_history_${family}_${Number(multi)}`,
            name = `profiled_arrays_${family}_${Number(multi)}_${Number(nested)}`,
            tag = domainElementType({ schema: 'public', name: domain }, arrayType(base)),
            cell = nested ? '(windows[1])[-2]' : 'windows[-2]',
            sql = `CASE WHEN bypass THEN true WHEN mode=1 THEN ${cell}=${cell} ELSE cardinality(windows)=expected_count END`
          return {
            profile,
            multi,
            nested,
            leaf,
            base,
            domain,
            name,
            tag,
            sql,
            type: arrayType(nested ? tag : base),
            types: nested ? tag + '\0' + leaf : leaf,
            kinds: nested
              ? '\u0029' + String.fromCharCode(multi ? 43 : 42)
              : String.fromCharCode(multi ? 43 : 42),
          }
        }),
      ),
    )
    for (const f of forms.filter((f) => !f.nested))
      await pg.exec(`CREATE DOMAIN ${f.domain} AS ${f.leaf}[]`)
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(windows ${f.nested ? f.domain + '[]' : f.leaf + '[]'},expected_count integer,bypass bool,mode integer,CONSTRAINT valid CHECK(${f.sql}))`,
      )
    const checks: ReturnType<typeof prepareCheckRustGroup>['checks'][number][] = [],
      entries: string[] = [],
      names: string[] = []
    for (const f of forms) {
      const entryName = checkRustEntryName({
          schema: 'public',
          kind: 'table',
          owner: f.name,
          constraint: 'owned_profile',
        }),
        support = rangeProfileSupport(f.profile)
      names.push(f.name)
      entries.push(
        `pub fn ${entryName}(windows:ArrayValue,expected_count:Int4Value,bypass:BoolValue,mode:Int4Value)->CheckOutcome {let result=profiled_array_evaluate(windows,${[f.types, f.kinds, f.multi ? f.profile.multirange : '', f.profile.identity, f.profile.subtype].map(rustStringLiteral).join(',')},${arrayElementFamily(f.profile.elementType)!},${support.comparison},${support.canonical},expected_count,bypass,mode);check_from_bool(result)}`,
      )
      checks.push({
        kind: 'supported',
        entryName,
        inputs: [
          { name: 'windows', rustName: 'windows', type: f.type, rustType: 'ArrayValue' },
          {
            name: 'expected_count',
            rustName: 'expected_count',
            type: 'pg_catalog.int4',
            rustType: 'Int4Value',
          },
          { name: 'bypass', rustName: 'bypass', type: 'pg_catalog.bool', rustType: 'BoolValue' },
          { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
        ],
      })
    }
    const evaluatorSource = entries.join('\n'),
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/custom_range_array_profile.rs', source: probe })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
        source,
        evaluatorSource,
        checks,
        requiresRegex: false,
      },
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      deferred = 0
    const readLeaf = async (profile: RangeProfile, multi: boolean, text: string | null) =>
      multi
        ? readMultirangeFixture(pg, profile.multirangeType, text)
        : readRangeFixture(pg, `SELECT $1::${profile.identity} span`, 'span', profile.rangeType, [
            text,
          ])
    for (const f of forms) {
      const temporal = [
          'pg_catalog.date',
          'pg_catalog."timestamp"',
          'pg_catalog.timestamptz',
        ].includes(f.profile.elementType),
        suffix = f.profile.elementType === 'pg_catalog.timestamptz' ? ' 00:00:00+00' : '',
        [a, b] = temporal
          ? ['2000-01-01' + suffix, '2000-01-03' + suffix]
          : f.profile.name === 'reverse_span'
            ? ['4', '1']
            : f.profile.elementType === 'pg_catalog."numeric"'
              ? ['1.00', '3.000']
              : ['1', '3'],
        nonempty = `[${a},${b}]`,
        samples: [string | null, string | null][] = [
          [null, null],
          ['empty', 'empty'],
          [nonempty, nonempty],
          ['(,)', nonempty],
          [nonempty, null],
        ]
      for (const [sample, [first, second]] of samples.entries()) {
        const texts = [first, second, null].map((t) =>
            f.multi ? (t === null ? null : t === 'empty' ? '{}' : '{' + t + '}') : t,
          ),
          flatText = rangeArrayText(texts, -2)
        const elements: OwnedArrayInputPayload['elements'] = []
        for (const t of texts) {
          const cell = await readLeaf(f.profile, f.multi, t)
          elements.push(
            cell === null
              ? { kind: 'Null' }
              : f.multi
                ? {
                    kind: 'Multirange',
                    value: cell as Awaited<ReturnType<typeof readMultirangeFixture>> & object,
                  }
                : {
                    kind: 'Range',
                    value: cell as Awaited<ReturnType<typeof readRangeFixture>> & object,
                  },
          )
        }
        const flat: OwnedArrayInputPayload = {
            elementType: f.leaf,
            elementKind: f.multi ? 43 : 42,
            dimensions: [{ lower: -2, length: 3 }],
            elements,
            nullBitmap: { kind: 'Value', value: true },
          },
          value: OwnedArrayInputPayload = f.nested
            ? {
                elementType: f.tag,
                elementKind: 41,
                dimensions: [{ lower: 1, length: 2 }],
                elements: [
                  { kind: 'Array', value: flat },
                  sample % 2 ? { kind: 'Null' } : { kind: 'Array', value: structuredClone(flat) },
                ],
                nullBitmap: { kind: 'Value', value: sample % 2 === 1 },
              }
            : flat,
          nativeText = f.nested
            ? (
                await pg.query<{ value: string }>(
                  `SELECT ARRAY[$1::${f.domain},${sample % 2 ? `NULL::${f.domain}` : `$1::${f.domain}`}]::text AS value`,
                  [flatText],
                )
              ).rows[0]!.value
            : flatText
        for (const count of [f.nested ? 2 : 3, 9])
          for (const bypass of [false, true])
            for (const mode of [0, 1, 2]) {
              const parameters = [nativeText, count, bypass, mode],
                expectedNative = await nativeCustomRangeOutcome(
                  pg,
                  `WITH inputs AS MATERIALIZED(SELECT $1::${f.nested ? f.domain + '[]' : f.leaf + '[]'} AS windows,$2::int4 AS expected_count,$3::bool AS bypass,$4::int4 AS mode) SELECT (${f.sql}) AS value FROM inputs`,
                  parameters,
                )
              const insert = pg.query(`INSERT INTO ${f.name} VALUES($1,$2,$3,$4)`, parameters)
              if (expectedNative.kind === 'False')
                await expect(insert).rejects.toMatchObject({ code: '23514' })
              else await insert
              inserts++
              const expected: Outcome =
                !bypass &&
                mode === 1 &&
                rangeProfileSupport(f.profile).comparison === 0 &&
                first !== null &&
                first !== 'empty' &&
                first !== '(,)'
                  ? { kind: 'Unknown' }
                  : expectedNative
              if (expected.kind === 'Unknown') deferred++
              fixtures.push({
                name: f.name,
                row: {
                  windows: { kind: 'Value', value },
                  expected_count: { kind: 'Value', value: count },
                  bypass: { kind: 'Value', value: bypass },
                  mode: { kind: 'Value', value: mode },
                },
                expected,
              })
            }
        if (first !== null && first !== 'empty')
          for (const mode of [3, 4])
            fixtures.push({
              name: f.name,
              row: {
                windows: { kind: 'Value', value },
                expected_count: { kind: 'Value', value: f.nested ? 2 : 3 },
                bypass: { kind: 'Value', value: false },
                mode: { kind: 'Value', value: mode },
              },
              expected: { kind: 'Unknown' },
            })
      }
      for (const input of [
        { kind: 'Null' },
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as const)
        for (const bypass of [false, true])
          fixtures.push({
            name: f.name,
            row: {
              windows: input,
              expected_count: { kind: 'Value', value: 3 },
              bypass: { kind: 'Value', value: bypass },
              mode: { kind: 'Value', value: 0 },
            },
            expected: bypass
              ? { kind: 'True' }
              : input.kind === 'Error'
                ? input
                : { kind: input.kind },
          })
    }
    const retained = forms.find((f) => f.profile.name === 'positive_span' && !f.multi && !f.nested)!
    await pg.exec(`CREATE TABLE retained_profiled_values(windows ${retained.leaf}[]);
      INSERT INTO retained_profiled_values VALUES(ARRAY['[1,3)'::${retained.leaf},NULL,NULL]);`)
    const retainedSpan = await readRangeFixture(
      pg,
      `SELECT windows[1] AS span FROM retained_profiled_values`,
      'span',
      retained.profile.rangeType,
    )
    expect(retainedSpan).not.toBeNull()
    const retainedPayload: OwnedArrayInputPayload = {
      elementType: retained.leaf,
      elementKind: 42,
      dimensions: [{ lower: 1, length: 3 }],
      elements: [{ kind: 'Range', value: retainedSpan! }, { kind: 'Null' }, { kind: 'Null' }],
      nullBitmap: { kind: 'Value', value: true },
    }
    await pg.exec(
      'ALTER DOMAIN "Custom.Range".positive ADD CONSTRAINT current_minimum CHECK(VALUE>2) NOT VALID',
    )
    await expect(pg.exec(`SELECT '[1,3)'::${retained.leaf}`)).rejects.toMatchObject({
      code: '23514',
    })
    for (const count of [3, 9])
      for (const mode of [0, 2]) {
        const insert = pg.query(
          `INSERT INTO ${retained.name} SELECT windows,$1,false,$2 FROM retained_profiled_values`,
          [count, mode],
        )
        if (count === 3) await insert
        else await expect(insert).rejects.toMatchObject({ code: '23514' })
        inserts++
        fixtures.push({
          name: retained.name,
          row: {
            windows: { kind: 'Value', value: retainedPayload },
            expected_count: { kind: 'Value', value: count },
            bypass: { kind: 'Value', value: false },
            mode: { kind: 'Value', value: mode },
          },
          expected: { kind: count === 3 ? 'True' : 'False' },
        })
      }
    await runCheckParity(directory, 'customarrayprofiles', group, names, fixtures)
    await mkdir('artifacts/check-custom-range-array-profiles', { recursive: true })
    await writeFile(
      'artifacts/check-custom-range-array-profiles/report.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          plans: forms.length,
          inserts,
          deferred,
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
}, 480_000)

it('retains profile-tree error order, unknown bounds and nominal validation before custom array admission', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-array-profile-state-'))
  try {
    const edgeProbe = String.raw`
const PROFILE_ARRAY_PROBE_ERROR:u32=3452582;
fn profile_state_range(name:&str,shape:i32)->ArrayElement {
 let mut bounds:Vec<ArrayElement>=Vec::new();
 if shape==1 {bounds.push(ArrayElement::Error(make_sql_error(PROFILE_ARRAY_PROBE_ERROR)));}else{bounds.push(ArrayElement::Unknown);};
 if shape!=0 {bounds.push(ArrayElement::Int4(3));};
 ArrayElement::Range(RangePayload{bound_profile:empty_range_bound_context(),enum_labels:String::new(),enum_count:-1,type_name:name.to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:make_range_support(99,99),empty:false,lower_inclusive:true,upper_inclusive:false,bounds})
}
fn profile_state_payload(first:ArrayElement,second:ArrayElement,kind:i32,name:&str)->ArrayPayload {
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension{lower:-2,length:2});
 let mut elements:Vec<ArrayElement>=Vec::new();elements.push(first);elements.push(second);
 ArrayPayload{element_type:name.to_owned(),element_kind:kind,dimensions,elements,null_bitmap:BoolValue::Unknown}
}
fn profile_state_multi(first:RangeValue,second:RangeValue)->ArrayElement {
 let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(first);ranges.push(second);
 ArrayElement::Multirange(MultirangePayload{type_name:"p.multi".to_owned(),range_type:"p.span".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:make_range_support(99,99),ranges})
}
fn profile_state_convert(input:ArrayValue)->ArrayValue {
 array_from_coerced_range_profile_tree(input,"p.span","*","p.span","pg_catalog.int4",2,2,1)
}
fn profile_state_error(input:ArrayValue)->BoolValue {
 if let ArrayValue::Error(error)=input{return BoolValue::Value(error.state==PROFILE_ARRAY_PROBE_ERROR);};
 BoolValue::Value(false)
}
fn profile_state_unknown(input:ArrayValue)->BoolValue {
 if let ArrayValue::Unknown=input{return BoolValue::Value(true);};
 BoolValue::Value(false)
}
pub fn profile_state_case(mode:Int4Value)->BoolValue {
 let mut selected:i32=0;
 if let Int4Value::Value(value)=mode{selected=value;};
 let error=ArrayElement::Error(make_sql_error(PROFILE_ARRAY_PROBE_ERROR));
 let malformed=profile_state_range("p.span",0);
 if selected==0 {let payload=profile_state_payload(error,malformed,42,"p.span");return profile_state_error(profile_state_convert(ArrayValue::Value(payload)));};
 if selected==1 {let payload=profile_state_payload(malformed,error,42,"p.span");return profile_state_unknown(profile_state_convert(ArrayValue::Value(payload)));};
 if selected==2 {
  let child=profile_state_payload(error,malformed,42,"p.span");
  let outer=profile_state_payload(ArrayElement::Array(child),ArrayElement::Null,41,"public.history");
  return profile_state_error(array_from_coerced_range_profile_tree(ArrayValue::Value(outer),"public.history\0p.span",")*","p.span","pg_catalog.int4",2,2,1));
 };
 if selected==3 {let wrong=profile_state_range("wrong.span",2);let payload=profile_state_payload(error,wrong,42,"p.span");return profile_state_unknown(profile_state_convert(ArrayValue::Value(payload)));};
 if selected==4 || selected==5 {
  let mut first=RangeValue::Error(make_sql_error(PROFILE_ARRAY_PROBE_ERROR));
  if selected==5{first=RangeValue::Null;};
  let bad=profile_state_range("p.span",0);
  let mut second=RangeValue::Unknown;
  if let ArrayElement::Range(payload)=bad{second=RangeValue::Value(payload);};
  let multi=profile_state_multi(first,second);
  let payload=profile_state_payload(multi,ArrayElement::Null,43,"p.multi");
  let output=array_from_coerced_multirange_profile_tree(ArrayValue::Value(payload),"p.multi","+","p.multi","p.span","pg_catalog.int4",2,2,1);
  if selected==4{return profile_state_error(output);};
  return profile_state_unknown(output);
 };
 if selected==6 {let payload=profile_state_payload(ArrayElement::Null,ArrayElement::Unknown,42,"wrong.array");return profile_state_unknown(profile_state_convert(ArrayValue::Value(payload)));};
 if selected==7 {return BoolValue::Value(array_is_null(profile_state_convert(ArrayValue::Null))==BoolValue::Value(true));};
 if selected==8 {return profile_state_unknown(profile_state_convert(ArrayValue::Unknown));};
 if selected==9 {return profile_state_error(profile_state_convert(ArrayValue::Error(make_sql_error(PROFILE_ARRAY_PROBE_ERROR))));};
 if selected==10 {
  let payload=profile_state_payload(ArrayElement::Unknown,ArrayElement::Null,42,"p.span");
  let output=profile_state_convert(ArrayValue::Value(payload));
  return BoolValue::Value(sql__pg_catalog__cardinality__m1rn(output)==make_int4_value(2));
 };
 if selected==11 {let bound_error=profile_state_range("p.span",1);let payload=profile_state_payload(bound_error,malformed,42,"p.span");return profile_state_error(profile_state_convert(ArrayValue::Value(payload)));};
 if selected==12 {
  let child=profile_state_payload(ArrayElement::Null,ArrayElement::Unknown,42,"wrong.array");
  let outer=profile_state_payload(ArrayElement::Array(child),error,41,"public.history");
  return profile_state_unknown(array_from_coerced_range_profile_tree(ArrayValue::Value(outer),"public.history\0p.span",")*","p.span","pg_catalog.int4",2,2,1));
 };
 if selected==13 {
  let span=profile_state_range("p.span",2);
  let payload=profile_state_payload(span,ArrayElement::Null,42,"p.span");
  let output=profile_state_convert(ArrayValue::Value(payload));
  if sql__pg_catalog__cardinality__m1rn(output.clone())!=make_int4_value(2){return BoolValue::Value(false);};
  let partial_range=array_element_to_range(array_flat_element(output,make_int4_value(0)));
  return BoolValue::Value(sql__pg_catalog__range_eq__loxq(partial_range.clone(),partial_range)==BoolValue::Unknown);
 };
 let dimensions:Vec<ArrayDimension>=Vec::new();let elements:Vec<ArrayElement>=Vec::new();
 let empty=ArrayPayload{element_type:"p.span".to_owned(),element_kind:42,dimensions,elements,null_bitmap:BoolValue::Value(false)};
 let output=array_from_coerced_range_profile_tree(ArrayValue::Value(empty),"p.span","*","p.span","pg_catalog.int4",2,0,0);
 BoolValue::Value(sql__pg_catalog__cardinality__m1rn(output)==make_int4_value(0))
}
`
    const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'profile_tree_state',
        constraint: 'states',
      }),
      evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let value=profile_state_case(mode);check_from_bool(value)}`,
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/custom_range_array_profile_state.rs', source: edgeProbe })
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
    await runCheckParity(
      directory,
      'customarrayprofilestate',
      group,
      ['state'],
      Array.from({ length: 15 }, (_, mode) => ({
        name: 'state',
        row: { mode: { kind: 'Value', value: mode } },
        expected: { kind: 'True' },
      })),
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
