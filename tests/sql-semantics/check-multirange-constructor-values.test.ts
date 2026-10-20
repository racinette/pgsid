import { multirangeExactProbe as exactProbe } from './check-multirange-exact-probe.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { builtinCallables, builtinMultirangeType } from '../../src/postgres/builtins/inventory.js'
import { type RangeType } from '../../src/sql-semantics/expressions.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readRangeFixture, rangeCoreSamples } from './check-range-fixtures.js'
import { readRangeArrayFixture, rangeArrayText } from './check-range-array-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

it('retains exact canonical members and numeric scales for every builtin multirange constructor in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-constructor-values-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const constructors = builtinCallables().filter(
      (c): c is FunctionMetadata =>
        c.kind === 'function' &&
        builtinMultirangeType(c.result) !== null &&
        c.name === c.result.slice('pg_catalog.'.length),
    )
    const checks: ReturnType<typeof prepareCheckRustGroup>['checks'][number][] = [],
      entries: string[] = [],
      names: string[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const [i, c] of constructors.entries()) {
      const m = builtinMultirangeType(c.result)!,
        range = m.identity as RangeType,
        mode = c.args.length === 0 ? 'zero' : c.variadic ? 'array' : 'single',
        name = `constructor_${i}`
      names.push(name)
      const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: name,
        constraint: 'canonical',
      })
      const actual =
        mode === 'zero'
          ? `${c.rustName}()`
          : mode === 'array'
            ? `${c.rustName}(spans)`
            : `${c.rustName}(span)`
      entries.push(
        `pub fn ${entryName}(span:RangeValue,spans:ArrayValue,expected:MultirangeValue)->CheckOutcome {let actual=${actual};let result=multirange_fixture_exact(actual,expected);check_from_bool(result)}`,
      )
      checks.push({
        kind: 'supported',
        entryName,
        inputs: [
          { name: 'span', rustName: 'span', type: range, rustType: 'RangeValue' },
          { name: 'spans', rustName: 'spans', type: `array:${range}`, rustType: 'ArrayValue' },
          {
            name: 'expected',
            rustName: 'expected',
            type: m.multirange,
            rustType: 'MultirangeValue',
          },
        ],
      })
      const ctor =
        mode === 'zero'
          ? `${m.multirange}()`
          : mode === 'array'
            ? `${m.multirange}(VARIADIC spans)`
            : `${m.multirange}(span)`
      await pg.exec(
        `CREATE TABLE ${name}(span ${range},spans ${range}[],expected ${m.multirange},CHECK(${ctor} IS NOT DISTINCT FROM expected))`,
      )
      const samples = rangeCoreSamples(range).ranges,
        one = samples[5]!,
        two = samples[10]!
      const cases: ((string | null)[] | null)[] =
        mode === 'zero'
          ? [[]]
          : mode === 'single'
            ? [null, ...samples.map((s) => [s])]
            : [
                null,
                [],
                ['empty'],
                [one],
                [one, two],
                [two, one],
                [one, one],
                ['empty', two, one, 'empty'],
                ['(,)', one],
                ...samples.map((s) => [s]),
                [null],
                [one, null],
              ]
      if (mode === 'array' && m.subtype === 'pg_catalog."numeric"')
        for (const length of [6, 7, 8, 12, 41, 65]) {
          const a = Array.from(
            { length },
            (_, n) =>
              `[${n % 3}.` + '0'.repeat(n + 1) + `,${(n % 3) + 1}.` + '0'.repeat(n + 1) + ']',
          )
          cases.push(a, [...a].reverse())
        }
      if (mode === 'array' && m.subtype === 'pg_catalog."numeric"') {
        let seed = 17
        for (const length of [8, 41, 65, 93]) {
          const values = Array.from(
            { length },
            (_, i) =>
              `[${(i % 9) * 4}.` +
              '0'.repeat((i % 17) + 1) +
              `,${(i % 9) * 4 + 1}.` +
              '0'.repeat((i % 17) + 1) +
              ']',
          )
          for (let i = values.length - 1; i > 0; i--) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
            const j = seed % (i + 1)
            ;[values[i], values[j]] = [values[j]!, values[i]!]
          }
          cases.push(values)
        }
      }
      for (const pieces of cases) {
        const span = mode === 'single' ? (pieces?.[0] ?? null) : null,
          spans = mode === 'array' && pieces !== null ? rangeArrayText(pieces) : null
        let native: string | null = null,
          error: string | null = null
        try {
          native = (
            await pg.query<{ value: string | null }>(
              `SELECT ${ctor}::text value FROM (SELECT $1::${range} span,$2::${range}[] spans) q`,
              [span, spans],
            )
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        const spanPayload = await readRangeFixture(pg, `SELECT $1::${range} span`, 'span', range, [
            span,
          ]),
          arrayPayload = await readRangeArrayFixture(pg, range, spans)
        for (const mismatch of [false, true]) {
          const wanted = error ? null : mismatch ? (native === '{}' ? '{(,)}' : '{}') : native
          const expectedPayload = await readMultirangeFixture(pg, m.multirange, wanted)
          let expected: Outcome
          try {
            await pg.query(`INSERT INTO ${name} VALUES($1,$2,$3)`, [span, spans, wanted])
            expected = { kind: 'True' }
          } catch (e) {
            const code = (e as { code: string }).code
            expected =
              code === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          if (error)
            expect(expected).toEqual({ kind: 'Error', value: { state: parseInt(error, 36) } })
          inserts++
          fixtures.push({
            name,
            row: {
              span: spanPayload ? { kind: 'Value', value: spanPayload } : { kind: 'Null' },
              spans: arrayPayload ? { kind: 'Value', value: arrayPayload } : { kind: 'Null' },
              expected: expectedPayload
                ? { kind: 'Value', value: expectedPayload }
                : { kind: 'Null' },
            },
            expected,
          })
        }
      }
    }
    const evaluatorSource = entries.join('\n'),
      source = assembleCheckRust({
        source: evaluatorSource,
        callables: constructors.map((c) => c.rustName),
      })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/multirange_constructor_probe.rs', source: exactProbe })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      checks,
      requiresRegex: false,
    }
    expect(constructors).toHaveLength(18)
    await runCheckParity(directory, 'multirangeconstructors', group, names, fixtures)
    await mkdir('artifacts/check-multirange-constructors', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-constructors/values-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          overloads: constructors.length,
          exactNumericScaleChecks: true,
          sortSizes: [6, 7, 8, 12, 41, 65],
          shuffledSortSizes: [8, 41, 65, 93],
          automaticSqlBinding: 'separate owner',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('preserves constructor states, shape error order, partial bounds and independent input snapshots', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-constructor-state-'))
  try {
    const entryName = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'constructor_state',
      constraint: 'state',
    })
    const evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=multirange_construct_state_probe(mode);check_from_bool(result)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/multirange_constructor_states.rs',
        source: String.raw`
fn multirange_construct_state_span(lower:ArrayElement,upper:ArrayElement)->RangeValue {
 range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,false,true,false,lower,upper)
}
fn multirange_construct_state_array(a:ArrayElement,b:ArrayElement,multi:bool)->ArrayValue {
 let mut dimensions:Vec<ArrayDimension>=Vec::new();
 if multi {dimensions.push(ArrayDimension {lower:1,length:1});};
 dimensions.push(ArrayDimension {lower:-2,length:2});
 let mut elements:Vec<ArrayElement>=Vec::new();elements.push(a);elements.push(b);
 make_array_value(ArrayPayload {null_bitmap:BoolValue::Value(true),element_type:"pg_catalog.int4range".to_owned(),element_kind:42,dimensions,elements})
}
fn multirange_construct_state_first(input:&ArrayPayload)->Int4Value {
 let cell=input.elements[0].clone();
 let span=array_element_to_range(cell);array_element_to_int4(range_bound(span,false))
}
pub fn multirange_construct_state_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
  let first=make_sql_error(3452582);
  if selected==0 {return multirange_empty_state(sql__pg_catalog__int4multirange__qvfa());};
  if selected==1 {return multirange_is_null(sql__pg_catalog__int4multirange__weie(RangeValue::Null));};
  if selected==2 {return multirange_is_null(sql__pg_catalog__int4multirange__weie(RangeValue::Unknown));};
  if selected==3 {return multirange_is_null(sql__pg_catalog__int4multirange__weie(RangeValue::Error(first)));};
  if selected==4 {return multirange_is_null(sql__pg_catalog__int4multirange__809e(ArrayValue::Null));};
  if selected==5 {return multirange_is_null(sql__pg_catalog__int4multirange__809e(ArrayValue::Unknown));};
  if selected==6 {return multirange_is_null(sql__pg_catalog__int4multirange__809e(ArrayValue::Error(first)));};
  if selected==7 {
   let empty=range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,true,false,false,ArrayElement::Null,ArrayElement::Null);
   let a=array_element_from_range(empty.clone());let b=array_element_from_range(empty);let input=multirange_construct_state_array(a,b,false);
   return multirange_empty_state(sql__pg_catalog__int4multirange__809e(input));
  };
  if selected==8 || selected==9 || selected==10 || selected==17 {
   let mut a=ArrayElement::Null;
   if selected==10 {a=ArrayElement::Unknown;};if selected==17 {a=ArrayElement::Error(first);};
   let input=multirange_construct_state_array(a,ArrayElement::Null,selected==9 || selected==17);
   return multirange_is_null(sql__pg_catalog__int4multirange__809e(input));
  };
  if selected==11 {
   let span=multirange_construct_state_span(ArrayElement::Unknown,ArrayElement::Int4(3));let input=sql__pg_catalog__int4multirange__weie(span);
   if multirange_is_null(input.clone())!=BoolValue::Value(false) || multirange_empty_state(input.clone())!=BoolValue::Value(false) {return BoolValue::Value(false);};
   if array_element_to_int4(multirange_bound(input.clone(),false))!=Int4Value::Unknown {return BoolValue::Value(false);};
   return BoolValue::Value(array_element_to_int4(multirange_bound(input,true))==make_int4_value(3));
  };
  if selected==12 {
   let envelope=range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int4",2,false,false,false,ArrayElement::Null,ArrayElement::Null);
   let partial=multirange_construct_state_span(ArrayElement::Unknown,ArrayElement::Int4(3));
   let input=multirange_construct_state_array(array_element_from_range(envelope),array_element_from_range(partial),false);
   let result=sql__pg_catalog__int4multirange__809e(input);
   return BoolValue::Value(multirange_bound_flag(result.clone(),false,true)==BoolValue::Value(true) && multirange_bound_flag(result,true,true)==BoolValue::Value(true));
  };
  if selected==13 {
   let partial=multirange_construct_state_span(ArrayElement::Int4(1),ArrayElement::Unknown);
   let second=multirange_construct_state_span(ArrayElement::Int4(5),ArrayElement::Int4(7));
   let input=multirange_construct_state_array(array_element_from_range(partial),array_element_from_range(second),false);
   return multirange_is_null(sql__pg_catalog__int4multirange__809e(input));
  };
  if selected==14 {
   let dimensions:Vec<ArrayDimension>=Vec::new();let elements:Vec<ArrayElement>=Vec::new();
   let input=make_array_value(ArrayPayload {null_bitmap:BoolValue::Value(false),element_type:"public.other_range".to_owned(),element_kind:42,dimensions,elements});
   return multirange_is_null(sql__pg_catalog__int4multirange__809e(input));
  };
  if selected==15 {
   let span=range_from_coerced_bounds("pg_catalog.int4range","pg_catalog.int8",3,false,true,false,ArrayElement::Int8(1i64),ArrayElement::Int8(3i64));
   return multirange_is_null(sql__pg_catalog__int4multirange__weie(span));
  };
  if selected==16 {
   let bounds:Vec<ArrayElement>=Vec::new();
   let span=RangeValue::Value(RangePayload {type_name:"pg_catalog.int4range".to_owned(),element_type:"pg_catalog.int4".to_owned(),element_kind:2,support:range_builtin_support("pg_catalog.int4range","pg_catalog.int4",2),empty:false,lower_inclusive:true,upper_inclusive:false,bounds});
   return multirange_is_null(sql__pg_catalog__int4multirange__weie(span));
  };
  if selected==18 {
   let a=multirange_construct_state_span(ArrayElement::Int4(5),ArrayElement::Int4(7));let saved=a.clone();
   let b=multirange_construct_state_span(ArrayElement::Int4(1),ArrayElement::Int4(3));
   let input=multirange_construct_state_array(array_element_from_range(a),array_element_from_range(b),false);
   let original=input.clone();let result=sql__pg_catalog__int4multirange__809e(input);
   if array_element_to_int4(multirange_bound(result.clone(),false))!=make_int4_value(1) || array_element_to_int4(multirange_bound(result,true))!=make_int4_value(7) {return BoolValue::Value(false);};
   if array_element_to_int4(range_bound(saved,false))!=make_int4_value(5) {return BoolValue::Value(false);};
   if let ArrayValue::Value(payload)=original {return BoolValue::Value(multirange_construct_state_first(&payload)==make_int4_value(5));};
   return BoolValue::Value(false);
  };
  if selected==19 {
   let input=multirange_construct_state_array(ArrayElement::Bool(true),ArrayElement::Bool(false),false);
   return multirange_is_null(sql__pg_catalog__int4multirange__809e(input));
  };
 };
 BoolValue::Unknown
}
`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      checks: [
        {
          kind: 'supported',
          entryName,
          inputs: [
            { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          ],
        },
      ],
      requiresRegex: false,
    }
    const error = (code: string): Outcome => ({
      kind: 'Error',
      value: { state: parseInt(code, 36) },
    })
    const expected: Outcome[] = [
      { kind: 'True' },
      { kind: 'True' },
      { kind: 'Unknown' },
      error('22012'),
      { kind: 'True' },
      { kind: 'Unknown' },
      error('22012'),
      { kind: 'True' },
      error('22004'),
      error('21000'),
      error('22004'),
      { kind: 'True' },
      { kind: 'True' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      { kind: 'Unknown' },
      error('22012'),
      { kind: 'True' },
      { kind: 'Unknown' },
    ]
    const fixtures = expected.map((outcome, mode) => ({
      name: 'state',
      row: { mode: { kind: 'Value' as const, value: mode } },
      expected: outcome,
    }))
    await runCheckParity(directory, 'multirangeconstructorstates', group, ['state'], fixtures)
    await mkdir('artifacts/check-multirange-constructors', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-constructors/state-report.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          partialBounds: true,
          orderedShapeAndNullErrors: true,
          independentInputSnapshots: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
