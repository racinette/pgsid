import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
const implementation = readFileSync(
  new URL(
    '../../crates/check-evaluator/src/operations/pg_catalog/array_float_transition.rs',
    import.meta.url,
  ),
  'utf8',
)
const functions = builtinCallables().filter(
  (fn): fn is FunctionMetadata =>
    fn.kind === 'function' && implementation.includes('fn ' + fn.rustName + '('),
)

it('matches floating state transitions and combiners through catalog calls, overflow guards, fresh bounds, exact finite fields and eager/lazy composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-float-transition-'))
  try {
    expect(functions).toHaveLength(5)
    await pg.exec(
      'SET extra_float_digits=3;CREATE TABLE float_transition_values(a text,b text,x text,y text,expected text,wire bytea,bypass boolean,raw_a float8[],raw_b float8[],raw_x float8,raw_y float8,raw_real real);CREATE TABLE float_transition_oracle(LIKE float_transition_values)',
    )
    const forms: Record<string, string> = {},
      expressions: Record<string, string> = {}
    for (const fn of functions) {
      const combine = fn.name.endsWith('combine'),
        regression = fn.name.includes('regr'),
        width = regression ? 6 : 3
      const args = combine
        ? 'a::float8[],b::float8[]'
        : regression
          ? 'a::float8[],y::float8,x::float8'
          : `a::float8[],x::${fn.name === 'float4_accum' ? 'float4' : 'float8'}`
      const result = `pg_catalog.${fn.name}(${args})`
      const raw = `pg_catalog.${fn.name}(${combine ? 'raw_a,raw_b' : regression ? 'raw_a,raw_y,raw_x' : `raw_a,${fn.name === 'float4_accum' ? 'raw_real' : 'raw_x'}`})`
      const checks: Record<string, string> = {
        direct: `${result} IS NOT DISTINCT FROM expected::float8[]`,
        bounds: `array_lower(${result},1) IS NOT DISTINCT FROM CASE WHEN expected IS NULL THEN NULL::int ELSE 1 END`,
        wrapped: `cardinality(ARRAY[${result}])=CASE WHEN expected IS NULL THEN 0 ELSE ${width} END`,
        final: `pg_catalog.${regression ? 'float8_regr_sxy' : 'float8_var_pop'}(${result}) IS NOT DISTINCT FROM pg_catalog.${regression ? 'float8_regr_sxy' : 'float8_var_pop'}(expected::float8[])`,
        lazy: `CASE WHEN bypass THEN true ELSE ${result} IS NOT DISTINCT FROM expected::float8[] END`,
        prepared: `CASE WHEN bypass THEN true ELSE pg_catalog.${fn.name}(${combine ? "'{}'::float8[],'{1,2,3}'::float8[]" : regression ? "'{}'::float8[],1::float8,2::float8" : `'{}'::float8[],1::${fn.name === 'float4_accum' ? 'float4' : 'float8'}`}) IS NULL END`,
        pruned: `CASE WHEN true THEN true ELSE pg_catalog.${fn.name}(${combine ? "'{}'::float8[],'{1,2,3}'::float8[]" : regression ? "'{}'::float8[],1::float8,2::float8" : `'{}'::float8[],1::${fn.name === 'float4_accum' ? 'float4' : 'float8'}`}) IS NULL END`,
        raw: `${raw} IS NULL`,
        raw_wrapped: `cardinality(ARRAY[${raw}])=0`,
      }
      for (let field = 1; field <= width; field++)
        checks['wire_' + field] = `float8send((${result})[${field}]) IS NOT DISTINCT FROM wire`
      for (const [mode, sql] of Object.entries(checks)) {
        const name = fn.name + '_' + mode
        forms[name] = sql
        expressions[name] = result
        await pg.exec(
          `ALTER TABLE float_transition_values ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
        )
      }
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'float_transition_values')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name, type: 'check', definition: `CHECK(${sql})` }
              : table.constraints.find((c) => c.name === name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    const group = prepareCheckRustGroup(plans, { arrayNulls: true })
    await writeFile(
      'artifacts/goal-checks/array-float-transition/plans.json',
      JSON.stringify(plans, null, 2),
    )
    for (const [i, plan] of plans.entries()) {
      expect(hasUncertain(plan.expression), plan.identity.constraint).toBe(false)
      expect(group.checks[i]!.kind, plan.identity.constraint).toBe('supported')
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    let nanWireDeferrals = 0
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: name + '_' + origin,
          row: { ...row, ...(row.raw_x ? { raw_real: row.raw_x } : {}) },
          expected,
        })
    }
    const vectors = [
      ['0', '0', '0', '0', '0', '0'],
      ['1', '2', '0', '3', '0', '0'],
      ['2', '4', '8', '6', '18', '12'],
      ['-1', '1e308', '7', '1e308', '9', '11'],
      ['0.5', '-0', '-4', '-0', '-7', '-9'],
      ['NaN', '2', '3', '4', '5', '6'],
      ['Infinity', '2', '3', '4', '5', '6'],
      ['2', 'Infinity', '1', '-Infinity', '2', '3'],
      ['2', '1', 'Infinity', '1', 'Infinity', 'Infinity'],
      ['2', '1', 'NaN', '1', 'NaN', 'NaN'],
      ['2', '1e308', '0', '1e308', '0', '0'],
      ['2', '5e-324', '5e-324', '5e-324', '5e-324', '5e-324'],
      ['1e308', '1e308', '1e308', '1e308', '1e308', '1e308'],
      ['2', '-0', '-0', '-0', '-0', '-0'],
      ['1.5', '0.1', '0.2', '0.3', '0.4', '0.5'],
    ]
    for (const fn of functions) {
      const regression = fn.name.includes('regr'),
        combine = fn.name.endsWith('combine'),
        width = regression ? 6 : 3
      const array = (cells: string[], lower = 1) =>
        `[${lower}:${lower + width - 1}]={${cells.slice(0, width).join(',')}}`
      const canonical = array(vectors[2]!),
        samples: { a: string | null; b: string | null; x: string | null; y: string | null }[] = []
      if (combine) {
        for (const a of vectors)
          for (const b of [vectors[0]!, vectors[2]!, vectors[3]!, vectors[7]!, vectors[9]!])
            samples.push({ a: array(a), b: array(b), x: '1', y: '2' })
        samples.push({
          a: array(['0', '99', '88', '77', '66', '55'], -3),
          b: array(['0', '1', '2', '3', '4', '5'], 0),
          x: '1',
          y: '2',
        })
      } else {
        for (const a of vectors)
          for (const x of [
            '0',
            '-0',
            '3',
            '-7',
            '0.1',
            'Infinity',
            '-Infinity',
            'NaN',
            fn.name === 'float4_accum' ? '3e38' : '1e308',
          ])
            samples.push({ a: array(a), b: canonical, x, y: x === '3' ? '7' : x })
        samples.push({
          a: array(vectors[2]!, -3),
          b: canonical,
          x: '0.3333333333333333',
          y: '0.6666666666666666',
        })
      }
      for (const a of [
        null,
        '{}',
        '{1}',
        '{' + Array(width).fill('NULL').join(',') + '}',
        '{{' + Array(width).fill('0').join(',') + '}}',
        'bad',
        '{1,',
      ])
        samples.push({ a, b: canonical, x: '1', y: '2' })
      samples.push({ a: canonical, b: null, x: null, y: null })
      samples.push({ a: '{}', b: null, x: null, y: null })
      samples.push({ a: 'bad', b: null, x: null, y: null })
      samples.push({ a: null, b: 'bad', x: 'bad', y: 'bad' })
      if (combine)
        for (const b of ['{}', 'bad', '{1}']) samples.push({ a: canonical, b, x: '1', y: '2' })
      else
        for (const x of [null, 'bad', '1e999'])
          samples.push({ a: canonical, b: canonical, x, y: '2' })
      for (const sample of samples) {
        const bindings = [sample.a, sample.b, sample.x, sample.y]
        let text: string | null = null,
          wires: (string | null)[] = Array(width).fill(null)
        try {
          const sql = expressions[fn.name + '_direct']!
          const projection = Array.from(
            { length: width },
            (_, i) => `encode(float8send((${sql})[${i + 1}]),'hex') w${i}`,
          )
          const result = (
            await pg.query<Record<string, string | null>>(
              `SELECT (${sql})::text value,${projection.join(',')} FROM (SELECT $1::text a,$2::text b,$3::text x,$4::text y) q`,
              bindings,
            )
          ).rows[0]!
          text = result.value!
          wires = Array.from({ length: width }, (_, i) => result['w' + i]!)
        } catch {}
        for (const mode of [
          'direct',
          'bounds',
          'wrapped',
          'final',
          'lazy',
          ...Array.from({ length: width }, (_, i) => 'wire_' + (i + 1)),
        ]) {
          const name = fn.name + '_' + mode,
            field = mode.startsWith('wire_') ? Number(mode.slice(5)) - 1 : 0
          for (const bypass of mode === 'lazy' ? [false, true] : [false]) {
            await pg.exec('TRUNCATE float_transition_oracle')
            await pg.query(
              "INSERT INTO float_transition_oracle(a,b,x,y,expected,wire,bypass) VALUES($1,$2,$3,$4,$5,decode($6::text,'hex'),$7)",
              [...bindings, text, wires[field]!, bypass],
            )
            let expected: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${forms[name]} value FROM float_transition_oracle`,
                )
              ).rows[0]!.value
              expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (error) {
              expected = failure((error as { code: string }).code)
            }
            const wire = wires[field]
            if (
              mode.startsWith('wire_') &&
              wire &&
              (BigInt('0x' + wire) & 0x7fffffffffffffffn) > 0x7ff0000000000000n &&
              expected.kind === 'True'
            ) {
              expected = { kind: 'Unknown' }
              nanWireDeferrals++
            }
            add(
              name,
              {
                a: known(sample.a),
                b: known(sample.b),
                x: known(sample.x),
                y: known(sample.y),
                expected: known(text),
                wire: known(wire ?? null),
                bypass: known(bypass),
              },
              expected,
            )
            observations.push({ name, ...sample, text, wire, bypass, expected })
          }
        }
      }
      for (const mode of ['prepared', 'pruned'])
        for (const bypass of [false, true])
          add(
            fn.name + '_' + mode,
            { bypass: known(bypass) },
            mode === 'prepared' ? failure('XX000') : { kind: 'True' },
          )
      for (const mode of ['direct', 'bounds', 'wrapped'])
        add(
          fn.name + '_' + mode,
          {
            a: { kind: 'Null' },
            b: combine ? { kind: 'Unknown' } : known(canonical),
            x: { kind: 'Unknown' },
            y: { kind: 'Unknown' },
            expected: { kind: 'Null' },
          },
          { kind: 'Unknown' },
        )
      for (const mode of ['raw', 'raw_wrapped']) {
        const name = fn.name + '_' + mode
        add(
          name,
          {
            raw_a: { kind: 'Unknown' },
            raw_b: { kind: 'Unknown' },
            raw_x: { kind: 'Unknown' },
            raw_y: { kind: 'Unknown' },
          },
          { kind: 'Unknown' },
        )
        add(
          name,
          {
            raw_a: { kind: 'Null' },
            raw_b: { kind: 'Unknown' },
            raw_x: { kind: 'Unknown' },
            raw_y: { kind: 'Unknown' },
          },
          { kind: 'True' },
        )
        add(
          name,
          {
            raw_a: { kind: 'Null' },
            raw_b: combine
              ? { kind: 'Error', value: { state: parseInt('22012', 36) } }
              : { kind: 'Unknown' },
            raw_x: combine
              ? { kind: 'Unknown' }
              : { kind: 'Error', value: { state: parseInt('22012', 36) } },
            raw_y: { kind: 'Unknown' },
          },
          failure('22012'),
        )
      }
    }
    await mkdir('artifacts/goal-checks/array-float-transition', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-float-transition/observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'floatarraytransition',
      group,
      Object.keys(forms).flatMap((name) =>
        ['source', 'stored'].map((origin) => name + '_' + origin),
      ),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-float-transition/measurements.json',
      JSON.stringify(
        {
          callables: functions.length,
          forms: Object.keys(forms).length,
          fixtures: fixtures.length,
          postgresObservations: observations.length,
          nanWireDeferrals,
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

it('retains partial non-NULL words, bitmap requirements, copied NaN precision and ordered errors in owned floating states', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-float-transition-owned-'))
  try {
    const dispatch: string[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [operation, fn] of functions.entries()) {
      const regression = fn.name.includes('regr'),
        combine = fn.name.endsWith('combine'),
        width = regression ? 6 : 3
      const args = combine
        ? 'left,right'
        : regression
          ? 'left,y,x'
          : `left,${fn.name === 'float4_accum' ? 'float8_narrow_for_probe(x)' : 'x'}`
      dispatch.push(
        `if op==${operation} {let result=${fn.rustName}(${args});return transition_probe_result(result,selected,${width},${combine});};`,
      )
      for (let mode = 0; mode < 17; mode++) {
        let expected: Outcome = { kind: 'True' }
        if ([0, 4, 14].includes(mode)) expected = { kind: 'Unknown' }
        if ([1, 2].includes(mode) || (mode === 15 && combine)) expected = failure('XX000')
        if (mode === 15 && !combine) expected = { kind: 'Unknown' }
        if ([3, 13].includes(mode)) expected = { kind: 'Null' }
        if ([5, 12, 16].includes(mode)) expected = failure('22012')
        fixtures.push({
          name: 'state',
          row: {
            mode: { kind: 'Value', value: mode },
            operation: { kind: 'Value', value: operation },
          },
          expected,
        })
      }
    }
    const nan = BigInt.asIntN(64, 0xfff800000000002an)
    const evaluatorSource =
      'pub fn evaluate_check(mode:Int4Value,operation:Int4Value)->CheckOutcome {let result=transition_probe(mode,operation);check_from_bool(result)}\n'
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: functions.map((fn) => fn.rustName),
    })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'owned_transition_probe.rs',
        source: `
fn float8_narrow_for_probe(input:Float8Value)->Float4Value {float8_narrow(input)}
fn transition_probe_array(width:i32,selected:i32,right:bool)->ArrayValue {
 if selected==3 && right==false {return ArrayValue::Null;};
 if selected==4 && right==false {return ArrayValue::Unknown;};
 if (selected==5 || selected==16) && right==false {return ArrayValue::Error(make_sql_error(3452582));};
 if selected==12 && right {return ArrayValue::Error(make_sql_error(3452582));};
 if selected==13 && right {return ArrayValue::Null;};
 if selected==14 && right {return ArrayValue::Unknown;};
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension{lower:-3,length:width});
 if selected==2 || selected==13 || selected==14 || (selected==15 && right) {dimensions.push(ArrayDimension{lower:1,length:1});};
 let mut bitmap=BoolValue::Value(false);if selected==0 || (selected==15 && right==false) {bitmap=BoolValue::Unknown;};if selected==1 {bitmap=BoolValue::Value(true);};
 let mut cells:Vec<ArrayElement>=Vec::new();let mut index:i32=0;
 while index<width {
  let mut value=make_float8_value(0.0f64);
  if selected==6 && index==0 {value=make_float8_value(2.0f64);};
  if selected==7 && right && index==0 {value=make_float8_value(2.0f64);};
  if (selected==10 || selected==11) && index==1 {value=make_float8_bits(${nan}i64);};
  if selected==11 && right && index==1 {value=make_float8_bits(${nan}i64);};
  let mut cell=array_element_from_float8(value);
  if (selected==7 || selected==8) && index==2 {cell=ArrayElement::Unknown;};
  cells.push(cell);index=index+1;
 };
 make_array_value(ArrayPayload{element_type:"pg_catalog.float8".to_owned(),element_kind:20,dimensions:dimensions,elements:cells,null_bitmap:bitmap})
}
fn transition_probe_result(input:ArrayValue,selected:i32,width:i32,combine:bool)->BoolValue {
 if let ArrayValue::Error(error)=input {return BoolValue::Error(error);};
 if let ArrayValue::Null=input {return BoolValue::Null;};
 if let ArrayValue::Value(value)=input {
  if value.dimensions.len()!=1 || value.dimensions[0].lower!=1 || value.dimensions[0].length!=width || value.null_bitmap!=BoolValue::Value(false) {return BoolValue::Value(false);};
  if selected==7 || selected==8 {let cell=value.elements[2].clone();if let ArrayElement::Unknown=cell {return BoolValue::Value(true);};return BoolValue::Value(false);};
  let field=float_state_field(&value,1);
  if selected==10 || selected==11 {
   if combine {return BoolValue::Value(field==make_float8_bits(${nan}i64));};
   return BoolValue::Value(field==Float8Value::UnspecifiedNan);
  };
  if selected==9 && combine==false {return BoolValue::Value(float_state_field(&value,2)==Float8Value::UnspecifiedNan);};
  return BoolValue::Value(true);
 };BoolValue::Unknown
}
pub fn transition_probe(mode:Int4Value,operation:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {if let Int4Value::Value(op)=operation {
  let mut width:i32=3;if ${functions.flatMap((fn, i) => (fn.name.includes('regr') ? [`op==${i}`] : [])).join(' || ')} {width=6;};
  let left=transition_probe_array(width,selected,false);let right=transition_probe_array(width,selected,true);
  let mut x=make_float8_value(2.0f64);let mut y=make_float8_value(3.0f64);
  if selected==9 {x=make_float8_value(1.0f64/0.0f64);};
  if selected==12 {y=Float8Value::Error(make_sql_error(3452582));x=y;};
  if selected==13 {x=Float8Value::Null;};if selected==14 {x=Float8Value::Unknown;};
  if selected==16 {y=Float8Value::Error(make_sql_error(56966976));x=y;};
  ${dispatch.join('\n')}
 };};BoolValue::Unknown
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
          entryName: 'evaluate_check',
          inputs: [
            { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
            {
              name: 'operation',
              rustName: 'operation',
              type: 'pg_catalog.int4',
              rustType: 'Int4Value',
            },
          ],
        },
      ],
    }
    await runCheckParity(directory, 'floattransitionowned', group, ['state'], fixtures)
    await writeFile(
      'artifacts/goal-checks/array-float-transition/owned-measurements.json',
      JSON.stringify(
        { operations: functions.length, profiles: 17, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
