import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { domainElementType, type ArrayType } from '../../src/sql-semantics/expressions.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { rangeCoreSamples } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { multirangeExactProbe } from './check-multirange-exact-probe.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'

const probe = String.raw`
pub fn multi_array_make(identity: &str, head: MultirangeValue, tail: MultirangeValue) -> ArrayValue {
 let mut dimensions: Vec<ArrayDimension> = Vec::new();
 dimensions.push(ArrayDimension { lower: -2, length: 3 });
 let mut elements: Vec<ArrayElement> = Vec::new();
 elements.push(array_element_from_multirange(head));
 elements.push(array_element_from_multirange(tail));
 elements.push(ArrayElement::Null);
 make_array_value(ArrayPayload { null_bitmap: BoolValue::Value(true), element_type: identity.to_owned(), element_kind: 43, dimensions, elements })
}
fn multi_array_same_snapshot(left:MultirangeValue,right:MultirangeValue)->bool {
 multirange_fixture_exact(left,right)==BoolValue::Value(true)
}
fn multi_array_count(actual: Int4Value, expected: Int4Value) -> BoolValue {
 if let Int4Value::Error(error)=actual {return BoolValue::Error(error);};
 if let Int4Value::Error(error)=expected {return BoolValue::Error(error);};
 if let Int4Value::Null=expected {return BoolValue::Null;};
 if let Int4Value::Value(a)=actual {if let Int4Value::Value(b)=expected {return BoolValue::Value(a==b);};};
 BoolValue::Unknown
}
pub fn multi_array_check(input:ArrayValue,head:MultirangeValue,tail:MultirangeValue,count:Int4Value,bypass:BoolValue)->BoolValue {
 if bypass==BoolValue::Value(true) {return BoolValue::Value(true);};
 if let ArrayValue::Error(error)=input {return BoolValue::Error(error);};
 if let ArrayValue::Unknown=input {return BoolValue::Unknown;};
 let lower=sql__pg_catalog__array_lower__3uq2(input.clone(),make_int4_value(1));
 if lower!=make_int4_value(-2) {return BoolValue::Value(false);};
 let first=array_element_to_multirange(array_flat_element(input.clone(),make_int4_value(0)));
 let second=array_element_to_multirange(array_flat_element(input.clone(),make_int4_value(1)));
 let last=array_element_to_multirange(array_flat_element(input.clone(),make_int4_value(2)));
 if multi_array_same_snapshot(first,head)==false || multi_array_same_snapshot(second,tail)==false || multirange_is_null(last)!=BoolValue::Value(true) {return BoolValue::Value(false);};
 multi_array_count(sql__pg_catalog__cardinality__m1rn(input),count)
}
pub fn multi_array_nested(identity:&str,element_identity:&str,head:MultirangeValue,tail:MultirangeValue)->ArrayValue {
 let first=multi_array_make(element_identity,head.clone(),tail.clone());
 let second=multi_array_make(element_identity,head,tail);
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:1,length:2});
 let mut elements:Vec<ArrayElement>=Vec::new();elements.push(array_element_from_array(first));elements.push(array_element_from_array(second));
 make_array_value(ArrayPayload {null_bitmap:BoolValue::Value(false),element_type:identity.to_owned(),element_kind:41,dimensions,elements})
}
pub fn multi_array_nested_check(input:ArrayValue,head:MultirangeValue,tail:MultirangeValue,count:Int4Value,bypass:BoolValue)->BoolValue {
 if bypass==BoolValue::Value(true) {return BoolValue::Value(true);};
 if let ArrayValue::Error(error)=input {return BoolValue::Error(error);};
 if let ArrayValue::Unknown=input {return BoolValue::Unknown;};
 let mut i:i32=0;
 while i<2 {
  let cell=array_flat_element(input.clone(),make_int4_value(i));
  let inner=array_element_to_array(cell);
  let result=multi_array_check(inner,head.clone(),tail.clone(),make_int4_value(3),BoolValue::Value(false));
  if result!=BoolValue::Value(true) {return result;};i=i+1;
 };
 multi_array_count(sql__pg_catalog__cardinality__m1rn(input),count)
}
`

it('retains exact owned multirange cells inside bounded arrays and array-valued domain cells across native INSERTs and all targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-array-values-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) =>
      [false, true].map((nested) => {
        const domain = 'owned_multi_history_' + family,
          table = `multi_array_owned_${family}_${nested ? 'nested' : 'flat'}`
        const cell = nested ? '(windows[1])' : 'windows'
        const sql = `CASE WHEN bypass THEN true ELSE cardinality(windows)=expected_count AND array_lower(windows,1)=${nested ? 1 : -2} AND ${cell}[-2] IS NOT DISTINCT FROM head AND ${cell}[-1] IS NOT DISTINCT FROM tail AND ${cell}[0] IS NULL${nested ? ` AND cardinality(${cell})=3 AND array_lower(${cell},1)=-2` : ''} END`
        return { metadata, domain, table, sql, nested }
      }),
    )
    for (const [family, metadata] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(`CREATE DOMAIN owned_multi_history_${family} AS ${metadata.multirange}[]`)
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(windows ${f.nested ? f.domain + '[]' : f.metadata.multirange + '[]'},head ${f.metadata.multirange},tail ${f.metadata.multirange},expected_count integer,bypass boolean,CHECK(${f.sql}))`,
      )
    const checks: ReturnType<typeof prepareCheckRustGroup>['checks'][number][] = [],
      entries: string[] = []
    for (const f of forms) {
      const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: f.table,
        constraint: 'owned_cells',
      })
      const identity = domainElementType(
        { schema: 'public', name: f.domain },
        `array:${f.metadata.multirange}` as ArrayType,
      )
      const constructor = f.nested
        ? `multi_array_nested(${rustStringLiteral(identity)},${rustStringLiteral(f.metadata.multirange)},head.clone(),tail.clone())`
        : `multi_array_make(${rustStringLiteral(f.metadata.multirange)},head.clone(),tail.clone())`
      entries.push(
        `pub fn ${entryName}(head:MultirangeValue,tail:MultirangeValue,expected_count:Int4Value,bypass:BoolValue)->CheckOutcome {let values=${constructor};let result=${f.nested ? 'multi_array_nested_check' : 'multi_array_check'}(values,head,tail,expected_count,bypass);check_from_bool(result)}`,
      )
      const check: ReturnType<typeof prepareCheckRustGroup>['checks'][number] = {
        kind: 'supported',
        entryName,
        inputs: [
          {
            name: 'head',
            rustName: 'head',
            type: f.metadata.multirange,
            rustType: 'MultirangeValue',
          },
          {
            name: 'tail',
            rustName: 'tail',
            type: f.metadata.multirange,
            rustType: 'MultirangeValue',
          },
          {
            name: 'expected_count',
            rustName: 'expected_count',
            type: 'pg_catalog.int4',
            rustType: 'Int4Value',
          },
          { name: 'bypass', rustName: 'bypass', type: 'pg_catalog.bool', rustType: 'BoolValue' },
        ],
      }
      checks.push(check)
      const directEntry = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: f.table,
        constraint: 'direct_cells',
      })
      entries.push(
        `pub fn ${directEntry}(windows:ArrayValue,head:MultirangeValue,tail:MultirangeValue,expected_count:Int4Value,bypass:BoolValue)->CheckOutcome {let values=array_from_coerced_value(windows,${rustStringLiteral(f.nested ? identity : f.metadata.multirange)},${f.nested ? 41 : 43});let result=${f.nested ? 'multi_array_nested_check' : 'multi_array_check'}(values,head,tail,expected_count,bypass);check_from_bool(result)}`,
      )
      checks.push({
        ...check,
        entryName: directEntry,
        inputs: [
          {
            name: 'windows',
            rustName: 'windows',
            type: `array:${f.nested ? identity : f.metadata.multirange}`,
            rustType: 'ArrayValue',
          },
          ...check.inputs,
        ],
      })
    }
    const evaluatorSource = entries.join('\n'),
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/multi_array_probe.rs', source: multirangeExactProbe + probe })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      checks,
      requiresRegex: false,
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    const quote = (s: string | null) =>
      s === null ? 'NULL' : '"' + s.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
    for (const f of forms) {
      const core = rangeCoreSamples(f.metadata.identity).ranges
      const separated = ['pg_catalog.int4', 'pg_catalog.int8', 'pg_catalog."numeric"'].includes(
        f.metadata.subtype,
      )
        ? '[7,9)'
        : '[2000-02-01,2000-03-01)'
      const ranges = [
        null,
        '{}',
        ...core.filter((r): r is string => r !== null).map((r) => '{' + r + '}'),
        '{' + core[5] + ',' + separated + '}',
      ]
      for (const [i, head] of ranges.entries()) {
        const tail = ranges[(i + 5) % ranges.length]!
        const headRange = await readMultirangeFixture(pg, f.metadata.multirange, head)
        const tailRange = await readMultirangeFixture(pg, f.metadata.multirange, tail)
        const flat = '[-2:0]={' + quote(head) + ',' + quote(tail) + ',NULL}'
        const windows = f.nested
          ? (
              await pg.query<{ value: string }>(
                `SELECT ARRAY[$1::${f.domain},$1::${f.domain}]::text value`,
                [flat],
              )
            ).rows[0]!.value
          : flat
        for (const count of [f.nested ? 2 : 3, 9, null])
          for (const bypass of [false, true]) {
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ result: boolean | null }>(
                  `INSERT INTO ${f.table} VALUES($1,$2,$3,$4,$5) RETURNING (${f.sql}) result`,
                  [windows, head, tail, count, bypass],
                )
              ).rows[0]!.result
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (error) {
              expect((error as { code: string }).code).toBe('23514')
              expected = { kind: 'False' }
            }
            inserts++
            const fixture: { name: string; row: Row; expected: Outcome } = {
              name: f.table,
              row: {
                head: headRange ? { kind: 'Value', value: headRange } : { kind: 'Null' },
                tail: tailRange ? { kind: 'Value', value: tailRange } : { kind: 'Null' },
                expected_count: count === null ? { kind: 'Null' } : { kind: 'Value', value: count },
                bypass: { kind: 'Value', value: bypass },
              },
              expected,
            }
            fixtures.push(fixture)
            const flatPayload: OwnedArrayInputPayload = {
              elementType: f.metadata.multirange,
              elementKind: 43,
              dimensions: [{ lower: -2, length: 3 }],
              nullBitmap: { kind: 'Value', value: true },
              elements: [
                headRange ? { kind: 'Multirange', value: headRange } : { kind: 'Null' },
                tailRange ? { kind: 'Multirange', value: tailRange } : { kind: 'Null' },
                { kind: 'Null' },
              ],
            }
            const directPayload: OwnedArrayInputPayload = f.nested
              ? {
                  elementType: domainElementType(
                    { schema: 'public', name: f.domain },
                    `array:${f.metadata.multirange}` as ArrayType,
                  ),
                  elementKind: 41,
                  dimensions: [{ lower: 1, length: 2 }],
                  nullBitmap: { kind: 'Value', value: false },
                  elements: [
                    { kind: 'Array', value: flatPayload },
                    { kind: 'Array', value: flatPayload },
                  ],
                }
              : flatPayload
            fixtures.push({
              ...fixture,
              name: f.table + '_direct',
              row: { ...fixture.row, windows: { kind: 'Value', value: directPayload } },
            })
          }
      }
    }
    await runCheckParity(
      directory,
      'multiarrayvalues',
      group,
      forms.flatMap((f) => [f.table, f.table + '_direct']),
      fixtures,
    )
    await mkdir('artifacts/check-multirange-array-values', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-array-values/report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          families: Object.values(PG18_RANGE_TYPES).map((m) => m.multirange),
          ownedRecursiveProfiles: [
            'MultirangePayload -> Vec<RangeValue> -> RangePayload -> Vec<ArrayElement>',
            'ArrayPayload -> Vec<ArrayElement::Multirange>',
            'array-valued domain cells -> nested multirange arrays',
          ],
          sqlArrayAdmission: 'pending; CHECK fragments exercise the owned representation directly',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)

it('preserves recursive multirange cell snapshots, partial members, malformed input deferral and ordered errors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-array-state-'))
  try {
    const entryName = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'multi_array',
      constraint: 'state',
    })
    const evaluatorSource =
      'pub fn ' +
      entryName +
      '(mode:Int4Value)->CheckOutcome {let result=multi_array_state_probe(mode);check_from_bool(result)}'
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/multi_array_state.rs',
        source:
          multirangeExactProbe +
          probe +
          String.raw`
const MULTI_ARRAY_TEST_DIVISION_BY_ZERO:u32=3452582;
const MULTI_ARRAY_TEST_OVERFLOW:u32=3452547;
fn multi_array_state_span(lower:ArrayElement,upper:ArrayElement)->RangeValue {
 range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,false,true,false,lower,upper)
}
fn multi_array_state_bad_span(lower:ArrayElement,upper:ArrayElement)->RangeValue {
 let mut bounds:Vec<ArrayElement>=Vec::new();bounds.push(lower);bounds.push(upper);
 RangeValue::Value(RangePayload {type_name:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:range_builtin_support("pg_catalog.int4range","pg_catalog.int4",2),empty:false,lower_inclusive:true,upper_inclusive:false,bounds})
}
fn multi_array_state_raw(first:RangeValue,second:RangeValue)->ArrayElement {
 let mut ranges:Vec<RangeValue>=Vec::new();ranges.push(first);ranges.push(second);
 ArrayElement::Multirange(MultirangePayload {type_name:"pg_catalog.int4multirange".to_owned(),range_type:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:range_builtin_support("pg_catalog.int4range","pg_catalog.int4",2),ranges})
}
fn multi_array_state_single(element:ArrayElement,kind:i32)->ArrayValue {
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:1,length:1});
 let mut elements:Vec<ArrayElement>=Vec::new();elements.push(element);
 make_array_value(ArrayPayload {null_bitmap:BoolValue::Value(true),element_type:"pg_catalog.int4multirange".to_owned(),element_kind:kind,dimensions,elements})
}
fn multi_array_state_replace(input:ArrayValue,replacement:ArrayElement)->ArrayValue {
 if let ArrayValue::Value(payload)=input {
  let mut elements=payload.elements;elements[0]=replacement;
  return make_array_value(ArrayPayload {null_bitmap:payload.null_bitmap,element_type:payload.element_type,element_kind:payload.element_kind,dimensions:payload.dimensions,elements});
 };
 input
}
fn multi_array_state_revise(input:MultirangeValue)->MultirangeValue {
 if let MultirangeValue::Value(payload)=input {
  let first=payload.ranges[0].clone();
  if let RangeValue::Value(span)=first {
   let mut bounds=span.bounds;bounds[1]=ArrayElement::Int4(4);
   let revised=make_coerced_range_value(RangePayload {type_name:span.type_name,element_type:span.element_type,element_kind:span.element_kind,support:span.support,empty:span.empty,lower_inclusive:span.lower_inclusive,upper_inclusive:span.upper_inclusive,bounds});
   let mut ranges=payload.ranges;ranges[0]=revised;
   return make_coerced_multirange_value(MultirangePayload {type_name:payload.type_name,range_type:payload.range_type,element_type:payload.element_type,element_kind:payload.element_kind,support:payload.support,ranges});
  };
 };
 MultirangeValue::Unknown
}
pub fn multi_array_state_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
  let first=make_sql_error(MULTI_ARRAY_TEST_DIVISION_BY_ZERO);
  let second=make_sql_error(MULTI_ARRAY_TEST_OVERFLOW);
  if selected==0 {return multirange_is_null(array_element_to_multirange(array_element_from_multirange(MultirangeValue::Null)));};
  if selected==1 {return multirange_is_null(array_element_to_multirange(array_element_from_multirange(MultirangeValue::Unknown)));};
  if selected==2 {return multirange_is_null(array_element_to_multirange(array_element_from_multirange(MultirangeValue::Error(first))));};
  let lower=multi_array_state_span(ArrayElement::Int4(1),ArrayElement::Int4(3));
  let upper=multi_array_state_span(ArrayElement::Int4(7),ArrayElement::Int4(9));
  let malformed=multi_array_state_raw(multi_array_state_bad_span(ArrayElement::Text("wrong bound".to_owned()),ArrayElement::Int4(3)),upper.clone());
  if selected==3 {return multirange_is_null(array_element_to_multirange(malformed));};
  if selected==4 {return array_is_null(multi_array_state_single(malformed,43));};
  if selected==5 {
   let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:1,length:1});
   let mut elements:Vec<ArrayElement>=Vec::new();elements.push(malformed);
   let unchecked=ArrayElement::Array(ArrayPayload {null_bitmap:BoolValue::Value(false),element_type:"pg_catalog.int4multirange".to_owned(),element_kind:43,dimensions,elements});
   return array_is_null(multi_array_state_single(unchecked,41));
  };
  if selected==6 {return array_is_null(multi_array_state_single(multi_array_state_raw(multi_array_state_bad_span(ArrayElement::Error(first),ArrayElement::Int4(3)),upper.clone()),43));};
  let owned=array_element_to_multirange(multi_array_state_raw(lower.clone(),upper.clone()));
  if selected==7 {
   let partial=multi_array_state_span(ArrayElement::Unknown,ArrayElement::Int4(3));
   let value=multi_array_make("pg_catalog.int4multirange",array_element_to_multirange(multi_array_state_raw(partial,upper.clone())),MultirangeValue::Null);
   if sql__pg_catalog__cardinality__m1rn(value.clone())!=make_int4_value(3) {return BoolValue::Value(false);};
   let restored=array_element_to_multirange(array_flat_element(value,make_int4_value(0)));
   if let MultirangeValue::Value(payload)=restored {
    let first_span=payload.ranges[0].clone();
    if array_element_to_int4(range_bound(first_span.clone(),false))!=Int4Value::Unknown {return BoolValue::Value(false);};
    if array_element_to_int4(range_bound(first_span,true))!=make_int4_value(3) {return BoolValue::Value(false);};
    return BoolValue::Value(array_element_to_int4(range_bound(payload.ranges[1].clone(),true))==make_int4_value(9));
   };
   return BoolValue::Value(false);
  };
  if selected==8 {return array_is_null(multi_array_state_single(array_element_from_multirange(owned),2));};
  if selected==9 {return multirange_is_null(array_element_to_multirange(multi_array_state_raw(lower.clone(),RangeValue::Null)));};
  if selected==10 {return array_is_null(multi_array_state_single(multi_array_state_raw(multi_array_state_bad_span(ArrayElement::Error(first),ArrayElement::Int4(3)),RangeValue::Error(second)),43));};
  if selected==11 {return array_is_null(multi_array_state_single(multi_array_state_raw(multi_array_state_bad_span(ArrayElement::Text("wrong bound".to_owned()),ArrayElement::Int4(3)),RangeValue::Error(first)),43));};
  if selected==12 {
   let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:1,length:2});
   let mut elements:Vec<ArrayElement>=Vec::new();elements.push(ArrayElement::Error(second));elements.push(malformed);
   return array_is_null(make_array_value(ArrayPayload {null_bitmap:BoolValue::Value(false),element_type:"pg_catalog.int4multirange".to_owned(),element_kind:43,dimensions,elements}));
  };
  if selected==13 {
   let original=multi_array_nested("domain:owned_multi_history","pg_catalog.int4multirange",owned.clone(),owned.clone());
   let snapshot=original.clone();
   let inner=array_element_to_array(array_flat_element(original.clone(),make_int4_value(0)));
   let extracted=array_element_to_multirange(array_flat_element(inner.clone(),make_int4_value(0)));
   let revised=multi_array_state_revise(extracted);
   let revised_inner=multi_array_state_replace(inner,array_element_from_multirange(revised.clone()));
   let revised_outer=multi_array_state_replace(original.clone(),array_element_from_array(revised_inner));
   if multi_array_nested_check(original,owned.clone(),owned.clone(),make_int4_value(2),BoolValue::Value(false))!=BoolValue::Value(true) {return BoolValue::Value(false);};
   if multi_array_nested_check(snapshot,owned.clone(),owned.clone(),make_int4_value(2),BoolValue::Value(false))!=BoolValue::Value(true) {return BoolValue::Value(false);};
   let changed=array_element_to_array(array_flat_element(revised_outer.clone(),make_int4_value(0)));
   if multi_array_check(changed,revised,owned.clone(),make_int4_value(3),BoolValue::Value(false))!=BoolValue::Value(true) {return BoolValue::Value(false);};
   let unchanged=array_element_to_array(array_flat_element(revised_outer,make_int4_value(1)));
   return multi_array_check(unchanged,owned.clone(),owned,make_int4_value(3),BoolValue::Value(false));
  };
  if selected==14 {
   let mut ranges:Vec<RangeValue>=Vec::new();
   let empty=make_coerced_multirange_value(MultirangePayload {type_name:"pg_catalog.int4multirange".to_owned(),range_type:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:range_builtin_support("pg_catalog.int4range","pg_catalog.int4",2),ranges});
   let value=multi_array_make("pg_catalog.int4multirange",empty,MultirangeValue::Null);
   let restored=array_element_to_multirange(array_flat_element(value,make_int4_value(0)));
   return BoolValue::Value(multirange_is_null(restored.clone())==BoolValue::Value(false) && multirange_empty_state(restored)==BoolValue::Value(true));
  };
  if selected==15 {return multirange_is_null(array_element_to_multirange(multi_array_state_raw(RangeValue::Unknown,RangeValue::Error(first))));};
  if selected==16 {
   let empty=range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,true,false,false,ArrayElement::Unknown,ArrayElement::Unknown);
   return multirange_is_null(array_element_to_multirange(multi_array_state_raw(lower.clone(),empty)));
  };
  if selected==17 {return multirange_is_null(array_element_to_multirange(array_element_from_range(lower)));};
  if selected==18 {
   let value=multi_array_make("pg_catalog.int4multirange",MultirangeValue::Unknown,MultirangeValue::Null);
   let restored=array_element_to_multirange(array_flat_element(value.clone(),make_int4_value(0)));
   return BoolValue::Value(sql__pg_catalog__cardinality__m1rn(value)==make_int4_value(3) && multirange_is_null(restored)==BoolValue::Unknown);
  };
 };
 BoolValue::Value(false)
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
    const failure = (state: string): Outcome => ({
      kind: 'Error',
      value: { state: parseInt(state, 36) },
    })
    const expected: Outcome[] = [
      { kind: 'True' },
      { kind: 'Unknown' },
      failure('22012'),
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      failure('22012'),
      { kind: 'True' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      failure('22012'),
      { kind: 'Unknown' },
      failure('22003'),
      { kind: 'True' },
      { kind: 'True' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      { kind: 'True' },
    ]
    const fixtures = expected.map((outcome, mode) => ({
      name: 'state',
      row: { mode: { kind: 'Value' as const, value: mode } },
      expected: outcome,
    }))
    await runCheckParity(directory, 'multiarraystate', group, ['state'], fixtures)
    await mkdir('artifacts/check-multirange-array-values', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-array-values/state-report.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          independentNestedSnapshots: true,
          malformedMemberBounds: true,
          partialMemberRecovery: true,
          emptyVersusNull: true,
          orderedErrors: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
