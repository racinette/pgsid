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
import { readRangeFixture, rangeCoreSamples } from './check-range-fixtures.js'

const probe = String.raw`
pub fn range_array_make(identity: &str, head: RangeValue, tail: RangeValue) -> ArrayValue {
 let mut dimensions: Vec<ArrayDimension> = Vec::new();
 dimensions.push(ArrayDimension { lower: -2, length: 3 });
 let mut elements: Vec<ArrayElement> = Vec::new();
 elements.push(array_element_from_range(head));
 elements.push(array_element_from_range(tail));
 elements.push(ArrayElement::Null);
 make_array_value(ArrayPayload { null_bitmap: BoolValue::Value(true), element_type: identity.to_owned(), element_kind: 42, dimensions, elements })
}
fn range_array_same_snapshot(left: RangeValue, right: RangeValue) -> bool {
 if let RangeValue::Null = left { if let RangeValue::Null = right { return true; }; return false; };
 if let RangeValue::Value(a) = left {
  if let RangeValue::Value(b) = right {
   if a.type_name != b.type_name || a.element_type != b.element_type || a.element_kind != b.element_kind || a.empty != b.empty || a.lower_inclusive != b.lower_inclusive || a.upper_inclusive != b.upper_inclusive || a.bounds.len() != b.bounds.len() { return false; };
   let mut i:usize=0;
   while i<a.bounds.len() {
    let x=a.bounds[i].clone();let y=b.bounds[i].clone();
    if a.element_kind==2 && array_element_to_int4(x.clone())!=array_element_to_int4(y.clone()) {return false;};
    if a.element_kind==3 && array_element_to_int8(x.clone())!=array_element_to_int8(y.clone()) {return false;};
    if a.element_kind==7 && array_element_to_date(x.clone())!=array_element_to_date(y.clone()) {return false;};
    if a.element_kind==4 && array_element_to_timestamp(x.clone())!=array_element_to_timestamp(y.clone()) {return false;};
    if a.element_kind==5 && array_element_to_timestamptz(x.clone())!=array_element_to_timestamptz(y.clone()) {return false;};
    if a.element_kind==10 && array_element_to_numeric(x)!=array_element_to_numeric(y) {return false;};
    i+=1;
   };
   return true;
  };
 };
 false
}
fn range_array_count(actual: Int4Value, expected: Int4Value) -> BoolValue {
 if let Int4Value::Error(error)=actual {return BoolValue::Error(error);};
 if let Int4Value::Error(error)=expected {return BoolValue::Error(error);};
 if let Int4Value::Null=expected {return BoolValue::Null;};
 if let Int4Value::Value(a)=actual {if let Int4Value::Value(b)=expected {return BoolValue::Value(a==b);};};
 BoolValue::Unknown
}
pub fn range_array_check(input:ArrayValue,head:RangeValue,tail:RangeValue,count:Int4Value,bypass:BoolValue)->BoolValue {
 if bypass==BoolValue::Value(true) {return BoolValue::Value(true);};
 if let ArrayValue::Error(error)=input {return BoolValue::Error(error);};
 if let ArrayValue::Unknown=input {return BoolValue::Unknown;};
 let lower=sql__pg_catalog__array_lower__3uq2(input.clone(),make_int4_value(1));
 if lower!=make_int4_value(-2) {return BoolValue::Value(false);};
 let first=array_element_to_range(array_flat_element(input.clone(),make_int4_value(0)));
 let second=array_element_to_range(array_flat_element(input.clone(),make_int4_value(1)));
 let last=array_element_to_range(array_flat_element(input.clone(),make_int4_value(2)));
 if range_array_same_snapshot(first,head)==false || range_array_same_snapshot(second,tail)==false || range_is_null(last)!=BoolValue::Value(true) {return BoolValue::Value(false);};
 range_array_count(sql__pg_catalog__cardinality__m1rn(input),count)
}
pub fn range_array_nested(identity:&str,element_identity:&str,head:RangeValue,tail:RangeValue)->ArrayValue {
 let first=range_array_make(element_identity,head.clone(),tail.clone());
 let second=range_array_make(element_identity,head,tail);
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:1,length:2});
 let mut elements:Vec<ArrayElement>=Vec::new();elements.push(array_element_from_array(first));elements.push(array_element_from_array(second));
 make_array_value(ArrayPayload {null_bitmap:BoolValue::Value(false),element_type:identity.to_owned(),element_kind:41,dimensions,elements})
}
pub fn range_array_nested_check(input:ArrayValue,head:RangeValue,tail:RangeValue,count:Int4Value,bypass:BoolValue)->BoolValue {
 if bypass==BoolValue::Value(true) {return BoolValue::Value(true);};
 if let ArrayValue::Error(error)=input {return BoolValue::Error(error);};
 if let ArrayValue::Unknown=input {return BoolValue::Unknown;};
 let mut i:i32=0;
 while i<2 {
  let cell=array_flat_element(input.clone(),make_int4_value(i));
  let inner=array_element_to_array(cell);
  let result=range_array_check(inner,head.clone(),tail.clone(),make_int4_value(3),BoolValue::Value(false));
  if result!=BoolValue::Value(true) {return result;};i=i+1;
 };
 range_array_count(sql__pg_catalog__cardinality__m1rn(input),count)
}
`

it('retains exact owned range cells inside bounded arrays and array-valued domain cells across native INSERTs and all targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-array-values-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) =>
      [false, true].map((nested) => {
        const domain = 'owned_range_history_' + family,
          table = `range_array_owned_${family}_${nested ? 'nested' : 'flat'}`
        const cell = nested ? '(windows[1])' : 'windows'
        const sql = `CASE WHEN bypass THEN true ELSE cardinality(windows)=expected_count AND array_lower(windows,1)=${nested ? 1 : -2} AND ${cell}[-2] IS NOT DISTINCT FROM head AND ${cell}[-1] IS NOT DISTINCT FROM tail AND ${cell}[0] IS NULL${nested ? ` AND cardinality(${cell})=3 AND array_lower(${cell},1)=-2` : ''} END`
        return { metadata, domain, table, sql, nested }
      }),
    )
    for (const [family, metadata] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(`CREATE DOMAIN owned_range_history_${family} AS ${metadata.identity}[]`)
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(windows ${f.nested ? f.domain + '[]' : f.metadata.identity + '[]'},head ${f.metadata.identity},tail ${f.metadata.identity},expected_count integer,bypass boolean,CHECK(${f.sql}))`,
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
        `array:${f.metadata.identity}` as ArrayType,
      )
      const constructor = f.nested
        ? `range_array_nested(${rustStringLiteral(identity)},${rustStringLiteral(f.metadata.identity)},head.clone(),tail.clone())`
        : `range_array_make(${rustStringLiteral(f.metadata.identity)},head.clone(),tail.clone())`
      entries.push(
        `pub fn ${entryName}(head:RangeValue,tail:RangeValue,expected_count:Int4Value,bypass:BoolValue)->CheckOutcome {let values=${constructor};let result=${f.nested ? 'range_array_nested_check' : 'range_array_check'}(values,head,tail,expected_count,bypass);check_from_bool(result)}`,
      )
      checks.push({
        kind: 'supported',
        entryName,
        inputs: [
          { name: 'head', rustName: 'head', type: f.metadata.identity, rustType: 'RangeValue' },
          { name: 'tail', rustName: 'tail', type: f.metadata.identity, rustType: 'RangeValue' },
          {
            name: 'expected_count',
            rustName: 'expected_count',
            type: 'pg_catalog.int4',
            rustType: 'Int4Value',
          },
          { name: 'bypass', rustName: 'bypass', type: 'pg_catalog.bool', rustType: 'BoolValue' },
        ],
      })
    }
    const evaluatorSource = entries.join('\n'),
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/range_array_probe.rs', source: probe })
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
      const { ranges } = rangeCoreSamples(f.metadata.identity)
      for (const [i, head] of ranges.entries()) {
        const tail = ranges[(i + 5) % ranges.length]!
        const headRange = await readRangeFixture(
          pg,
          `SELECT $1::${f.metadata.identity} span`,
          'span',
          f.metadata.identity,
          [head],
        )
        const tailRange = await readRangeFixture(
          pg,
          `SELECT $1::${f.metadata.identity} span`,
          'span',
          f.metadata.identity,
          [tail],
        )
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
            fixtures.push({
              name: f.table,
              row: {
                head: headRange ? { kind: 'Value', value: headRange } : { kind: 'Null' },
                tail: tailRange ? { kind: 'Value', value: tailRange } : { kind: 'Null' },
                expected_count: count === null ? { kind: 'Null' } : { kind: 'Value', value: count },
                bypass: { kind: 'Value', value: bypass },
              },
              expected,
            })
          }
      }
    }
    await runCheckParity(
      directory,
      'rangearrayvalues',
      group,
      forms.map((f) => f.table),
      fixtures,
    )
    await mkdir('artifacts/check-range-array-values', { recursive: true })
    await writeFile(
      'artifacts/check-range-array-values/report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          families: Object.keys(PG18_RANGE_TYPES),
          ownedRecursiveProfiles: [
            'RangePayload -> Vec<ArrayElement>',
            'ArrayPayload -> Vec<ArrayElement::Range>',
            'array-valued domain cells -> nested range arrays',
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

it('preserves recursive range cell snapshots, partial bounds, malformed input deferral and ordered errors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-array-state-'))
  try {
    const entryName = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'range_array',
      constraint: 'state',
    })
    const evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=range_array_state_probe(mode);check_from_bool(result)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/range_array_state.rs',
        source:
          probe +
          String.raw`
fn range_array_state_span(lower:ArrayElement,upper:ArrayElement)->RangeValue {
 range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,false,true,false,lower,upper)
}
fn range_array_state_raw(lower:ArrayElement,upper:ArrayElement)->ArrayElement {
 let mut bounds:Vec<ArrayElement>=Vec::new();bounds.push(lower);bounds.push(upper);
 ArrayElement::Range(RangePayload {type_name:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,empty:false,lower_inclusive:true,upper_inclusive:false,bounds})
}
fn range_array_state_single(element:ArrayElement,kind:i32)->ArrayValue {
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:1,length:1});
 let mut elements:Vec<ArrayElement>=Vec::new();elements.push(element);
 make_array_value(ArrayPayload {null_bitmap:BoolValue::Value(true),element_type:"pg_catalog.int4range".to_owned(),element_kind:kind,dimensions,elements})
}
fn range_array_state_replace(input:ArrayValue,replacement:ArrayElement)->ArrayValue {
 if let ArrayValue::Value(payload)=input {
  let mut elements=payload.elements;elements[0]=replacement;
  return make_array_value(ArrayPayload {null_bitmap:payload.null_bitmap,element_type:payload.element_type,element_kind:payload.element_kind,dimensions:payload.dimensions,elements});
 };
 input
}
fn range_array_state_revise(input:RangeValue)->RangeValue {
 if let RangeValue::Value(payload)=input {
  let mut bounds=payload.bounds;bounds[1]=ArrayElement::Int4(9);
  return make_coerced_range_value(RangePayload {type_name:payload.type_name,element_type:payload.element_type,element_kind:payload.element_kind,empty:payload.empty,lower_inclusive:payload.lower_inclusive,upper_inclusive:payload.upper_inclusive,bounds});
 };
 input
}
pub fn range_array_state_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
  let first=make_sql_error(3452582);let second=make_sql_error(3452547);
  if selected==0 {return range_is_null(array_element_to_range(array_element_from_range(RangeValue::Null)));};
  if selected==1 {return range_is_null(array_element_to_range(array_element_from_range(RangeValue::Unknown)));};
  if selected==2 {return range_is_null(array_element_to_range(array_element_from_range(RangeValue::Error(first))));};
  let malformed=range_array_state_raw(ArrayElement::Text("wrong bound".to_owned()),ArrayElement::Int4(3));
  if selected==3 {return range_is_null(array_element_to_range(malformed));};
  if selected==4 {return array_is_null(range_array_state_single(malformed,42));};
  if selected==5 {
   let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:1,length:1});
   let mut elements:Vec<ArrayElement>=Vec::new();elements.push(malformed);
   let unchecked=ArrayElement::Array(ArrayPayload {null_bitmap:BoolValue::Value(false),element_type:"pg_catalog.int4range".to_owned(),element_kind:42,dimensions,elements});
   return array_is_null(range_array_state_single(unchecked,41));
  };
  if selected==6 {return array_is_null(range_array_state_single(range_array_state_raw(ArrayElement::Error(first),ArrayElement::Int4(3)),42));};
  let span=range_array_state_span(ArrayElement::Int4(1),ArrayElement::Int4(3));
  if selected==7 {
   let partial=range_array_state_span(ArrayElement::Unknown,ArrayElement::Int4(3));
   let value=range_array_make("pg_catalog.int4range",partial,RangeValue::Null);
   if sql__pg_catalog__cardinality__m1rn(value.clone())!=make_int4_value(3) {return BoolValue::Value(false);};
   let restored=array_element_to_range(array_flat_element(value,make_int4_value(0)));
   if array_element_to_int4(range_bound(restored.clone(),false))!=Int4Value::Unknown {return BoolValue::Value(false);};
   return BoolValue::Value(array_element_to_int4(range_bound(restored,true))==make_int4_value(3));
  };
  if selected==8 {return array_is_null(range_array_state_single(array_element_from_range(span),2));};
  if selected==9 {
   let mut bounds:Vec<ArrayElement>=Vec::new();bounds.push(ArrayElement::Int4(1));
   let malformed_count=ArrayElement::Range(RangePayload {type_name:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,empty:false,lower_inclusive:true,upper_inclusive:false,bounds});
   return range_is_null(array_element_to_range(malformed_count));
  };
  if selected==10 {return array_is_null(range_array_state_single(range_array_state_raw(ArrayElement::Error(first),ArrayElement::Error(second)),42));};
  if selected==11 {return array_is_null(range_array_state_single(range_array_state_raw(ArrayElement::Text("wrong bound".to_owned()),ArrayElement::Error(first)),42));};
  if selected==12 {
   let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:1,length:2});
   let mut elements:Vec<ArrayElement>=Vec::new();elements.push(ArrayElement::Error(second));elements.push(malformed);
   return array_is_null(make_array_value(ArrayPayload {null_bitmap:BoolValue::Value(false),element_type:"pg_catalog.int4range".to_owned(),element_kind:42,dimensions,elements}));
  };
  if selected==13 {
   let original=range_array_nested("domain:owned_range_history","pg_catalog.int4range",span.clone(),span.clone());
   let snapshot=original.clone();
   let inner=array_element_to_array(array_flat_element(original.clone(),make_int4_value(0)));
   let extracted=array_element_to_range(array_flat_element(inner.clone(),make_int4_value(0)));
   let revised_span=range_array_state_revise(extracted);
   let revised_inner=range_array_state_replace(inner,array_element_from_range(revised_span.clone()));
   let revised_outer=range_array_state_replace(original.clone(),array_element_from_array(revised_inner));
   if range_array_nested_check(original,span.clone(),span.clone(),make_int4_value(2),BoolValue::Value(false))!=BoolValue::Value(true) {return BoolValue::Value(false);};
   if range_array_nested_check(snapshot,span.clone(),span.clone(),make_int4_value(2),BoolValue::Value(false))!=BoolValue::Value(true) {return BoolValue::Value(false);};
   let changed=array_element_to_array(array_flat_element(revised_outer.clone(),make_int4_value(0)));
   if range_array_check(changed,revised_span,span.clone(),make_int4_value(3),BoolValue::Value(false))!=BoolValue::Value(true) {return BoolValue::Value(false);};
   let unchanged=array_element_to_array(array_flat_element(revised_outer,make_int4_value(1)));
   return range_array_check(unchanged,span.clone(),span,make_int4_value(3),BoolValue::Value(false));
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
    const expected: Outcome[] = [
      { kind: 'True' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
      { kind: 'True' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
      { kind: 'True' },
    ]
    const fixtures = expected.map((outcome, mode) => ({
      name: 'state',
      row: { mode: { kind: 'Value' as const, value: mode } },
      expected: outcome,
    }))
    await runCheckParity(directory, 'rangearraystate', group, ['state'], fixtures)
    await mkdir('artifacts/check-range-array-values', { recursive: true })
    await writeFile(
      'artifacts/check-range-array-values/state-report.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          independentNestedSnapshots: true,
          malformedBounds: true,
          partialBoundRecovery: true,
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
