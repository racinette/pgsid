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

const known = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
const implementation = readFileSync(
  new URL(
    '../../crates/check-evaluator/src/operations/pg_catalog/array_float_state.rs',
    import.meta.url,
  ),
  'utf8',
)
const functions = builtinCallables().filter(
  (fn): fn is FunctionMetadata =>
    fn.kind === 'function' && implementation.includes('fn ' + fn.rustName + '('),
)

it('matches floating aggregate finalizers through catalog states, native guards, unchecked arithmetic, exact finite wire output and semantic NaNs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-float-final-'))
  try {
    expect(functions).toHaveLength(16)
    await pg.exec(
      'SET extra_float_digits=3;CREATE TABLE float_state_values(payload text,expected float8,expected_wire bytea,bypass boolean,raw_state float8[]);CREATE TABLE float_state_oracle(LIKE float_state_values)',
    )
    const initial = (
      await pg.query<{ name: string; initial: string }>(
        `SELECT DISTINCT p.proname name,a.agginitval initial FROM pg_aggregate a JOIN pg_proc p ON p.oid=a.aggfinalfn JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='pg_catalog' AND a.agginitval IS NOT NULL`,
      )
    ).rows
    const forms: Record<string, string> = {},
      expressions: Record<string, string> = {},
      widths = new Map<string, number>()
    for (const fn of functions) {
      const states = initial.filter((row) => row.name === fn.name)
      expect(states, fn.name).toHaveLength(1)
      const width = states[0]!.initial.slice(1, -1).split(',').length
      expect([3, 6]).toContain(width)
      widths.set(fn.name, width)
      for (const mode of [
        'direct',
        'retained',
        'rebuilt',
        'wire',
        'lazy',
        'prepared',
        'pruned',
        'raw',
        'wrapped',
      ]) {
        const name = fn.name + '_' + mode
        let operand = 'payload::float8[]'
        if (mode === 'retained' || mode === 'rebuilt') operand = `(${operand})[1:${width}]`
        if (mode === 'rebuilt') operand = `(${operand})::text::float8[]`
        const value = `pg_catalog.${fn.name}(${operand})`
        expressions[name] = value
        forms[name] = `${value} IS NOT DISTINCT FROM expected`
        if (mode === 'wire') forms[name] = `float8send(${value}) IS NOT DISTINCT FROM expected_wire`
        if (mode === 'lazy') forms[name] = `CASE WHEN bypass THEN true ELSE ${forms[name]} END`
        if (mode === 'prepared')
          forms[name] =
            `CASE WHEN bypass THEN true ELSE pg_catalog.${fn.name}('{}'::float8[]) IS NULL END`
        if (mode === 'pruned')
          forms[name] =
            `CASE WHEN true THEN true ELSE pg_catalog.${fn.name}('{}'::float8[]) IS NULL END`
        if (mode === 'raw') forms[name] = `pg_catalog.${fn.name}(raw_state) IS NULL`
        if (mode === 'wrapped')
          forms[name] = `cardinality(ARRAY[pg_catalog.${fn.name}(raw_state)])=1`
        await pg.exec(
          `ALTER TABLE float_state_values ADD CONSTRAINT "${name}" CHECK(${forms[name]}) NOT VALID`,
        )
      }
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'float_state_values')!
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
    for (const [index, plan] of plans.entries()) {
      expect(hasUncertain(plan.expression), plan.identity.constraint).toBe(false)
      const check = group.checks[index]!
      expect(
        check.kind,
        plan.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    }
    const triples = [
      ['0', '0', '0'],
      ['1', '2', '9'],
      ['2', '4', '8'],
      ['-2', '3', '4'],
      ['0.5', '-0', '-4'],
      ['1.5', '6', '3'],
      ['Infinity', '1', 'Infinity'],
      ['NaN', '2', '3'],
      ['2', 'Infinity', '1'],
      ['2', '1', '-1'],
      ['2', '1', 'NaN'],
      ['2', '1', '1e308'],
      ['5e-324', '1e308', '1e308'],
      ['1e308', '5e-324', '5e-324'],
      ['2', '-0', '-0'],
    ]
    const sextuples = [
      ['0', '0', '0', '0', '0', '0'],
      ['2', '2', '2', '4', '8', '4'],
      ['1', '2', '4', '3', '9', '6'],
      ['0.5', '3', '2', '4', '8', '2'],
      ['1.5', '3', '2', '4', '8', '2'],
      ['-2', '3', '2', '4', '8', '2'],
      ['2', '0', '0', '0', '0', '0'],
      ['2', '0', '1', '0', '0', 'NaN'],
      ['2', '0', 'NaN', '0', '0', '1'],
      ['NaN', '1', '1', '2', '0', 'NaN'],
      ['2', '1', '1e308', '2', '1e308', '1e308'],
      ['2', '1e308', '1e308', '2', '1e308', '1e308'],
      ['2', '1', '5e-324', '2', '5e-324', '1'],
      ['2', '1', '-1', '2', '1', '1'],
      ['2', '-0', '-0', '0', '-0', '-0'],
      ['Infinity', '1', '2', '3', '4', '5'],
      ['2', 'NaN', '2', 'NaN', '8', '4'],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    let nanWireDeferrals = 0
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row: { ...row }, expected })
    }
    for (const fn of functions) {
      const width = widths.get(fn.name)!,
        vectors = width === 3 ? triples : sextuples
      const samples: { payload: string | null; rebuildSafe: boolean }[] = vectors.map((cells) => ({
        payload: '{' + cells.join(',') + '}',
        rebuildSafe: cells.every((cell) => {
          const n = Number(cell)
          return !Number.isFinite(n) || (Math.abs(n) <= 9 && Math.trunc(n) === n)
        }),
      }))
      for (const lower of [-3, 0, 2147483647 - width + 1])
        samples.push({
          payload: `[${lower}:${lower + width - 1}]={` + vectors[1]!.join(',') + '}',
          rebuildSafe: true,
        })
      samples.push(
        ...[
          null,
          '{}',
          '{0}',
          '{' + Array(width).fill('NULL').join(',') + '}',
          '{{' + Array(width).fill('0').join(',') + '}}',
          '{' + [...vectors[1]!, 'NULL'].join(',') + '}',
          'bad',
          '{1,',
        ].map((payload) => ({ payload, rebuildSafe: true })),
      )
      for (const mode of ['direct', 'retained', 'rebuilt', 'wire', 'lazy', 'prepared', 'pruned']) {
        const name = fn.name + '_' + mode,
          sql = forms[name]!
        const selected = ['prepared', 'pruned'].includes(mode)
          ? [{ payload: '{0}', rebuildSafe: true }]
          : samples
        for (const sample of selected) {
          if (mode === 'rebuilt' && !sample.rebuildSafe) continue
          for (const bypass of ['lazy', 'prepared', 'pruned'].includes(mode)
            ? [false, true]
            : [false]) {
            let text: string | null = null,
              wire: string | null = null
            try {
              const result = (
                await pg.query<{ text: string | null; wire: string | null }>(
                  `SELECT (${expressions[name]})::text text,encode(float8send(${expressions[name]}),'hex') wire FROM (SELECT $1::text payload) q`,
                  [sample.payload],
                )
              ).rows[0]!
              text = result.text
              wire = result.wire
            } catch {}
            await pg.exec('TRUNCATE float_state_oracle')
            await pg.query(
              "INSERT INTO float_state_oracle(payload,expected,expected_wire,bypass) VALUES($1,$2::float8,decode($3::text,'hex'),$4)",
              [sample.payload, text, wire, bypass],
            )
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${sql} value FROM float_state_oracle`,
                )
              ).rows[0]!.value
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (error) {
              expected = failure((error as { code: string }).code)
            }
            if (mode === 'wire' && text === 'NaN' && expected.kind === 'True') {
              expected = { kind: 'Unknown' }
              nanWireDeferrals++
            }
            add(
              name,
              {
                payload: known(sample.payload),
                expected:
                  wire === null ? { kind: 'Null' } : known(BigInt.asIntN(64, BigInt('0x' + wire))),
                expected_wire: known(wire),
                bypass: known(bypass),
              },
              expected,
            )
            observations.push({ name, payload: sample.payload, bypass, text, wire, expected })
          }
        }
      }
      for (const mode of ['raw', 'wrapped']) {
        add(fn.name + '_' + mode, { raw_state: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add(fn.name + '_' + mode, { raw_state: { kind: 'Null' } }, { kind: 'True' })
        add(
          fn.name + '_' + mode,
          { raw_state: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
          failure('22012'),
        )
      }
    }
    await mkdir('artifacts/goal-checks/array-float-final', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-float-final/observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'floatarrayfinal',
      group,
      Object.keys(forms).flatMap((name) =>
        ['source', 'stored'].map((origin) => name + '_' + origin),
      ),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-float-final/measurements.json',
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

it('retains partial floating states, known NULL guards and supplied NaN payloads independently of missing bitmap metadata', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-float-owned-'))
  try {
    const required: Record<string, number[]> = {
      float8_avg: [0, 1],
      float8_var_pop: [0, 2],
      float8_var_samp: [0, 2],
      float8_stddev_pop: [0, 2],
      float8_stddev_samp: [0, 2],
      float8_regr_sxx: [0, 2],
      float8_regr_syy: [0, 4],
      float8_regr_sxy: [0, 5],
      float8_regr_avgx: [0, 1],
      float8_regr_avgy: [0, 3],
      float8_covar_pop: [0, 5],
      float8_covar_samp: [0, 5],
      float8_corr: [0, 2, 4, 5],
      float8_regr_r2: [0, 2, 4, 5],
      float8_regr_slope: [0, 2, 5],
      float8_regr_intercept: [0, 1, 2, 3, 5],
    }
    const initial = (
      await pg.query<{ name: string; initial: string }>(
        `SELECT DISTINCT p.proname name,a.agginitval initial FROM pg_aggregate a JOIN pg_proc p ON p.oid=a.aggfinalfn WHERE a.agginitval IS NOT NULL`,
      )
    ).rows
    const nan = BigInt.asIntN(64, 0xfff800000000002an),
      dispatch: string[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [operation, fn] of functions.entries()) {
      const state = initial.filter((s) => s.name === fn.name)
      expect(state).toHaveLength(1)
      const width = state[0]!.initial.slice(1, -1).split(',').length
      const canonical = width === 3 ? '{2,4,8}' : '{2,2,2,4,8,4}'
      const wire = (
        await pg.query<{ wire: string }>(
          `SELECT encode(float8send(pg_catalog.${fn.name}('${canonical}'::float8[])),'hex') wire`,
        )
      ).rows[0]!.wire
      const bits = BigInt.asIntN(64, BigInt('0x' + wire)),
        fields = required[fn.name]!,
        mask = fields.reduce((value, index) => value + 2 ** index, 0),
        missing = fields.find((index) => index !== 0)!
      const selects = ['float8_regr_sxx', 'float8_regr_syy', 'float8_regr_sxy'].includes(fn.name)
      dispatch.push(
        `if op==${operation} {let input=float_final_probe_value(${width},selected,${mask},${missing});let result=${fn.rustName}(input);return float_final_probe_result(result,expected,selected,${selects});};`,
      )
      for (let mode = 0; mode < 15; mode++) {
        let expected: Outcome = { kind: 'Unknown' }
        if ([1, 5].includes(mode)) expected = { kind: 'Null' }
        if ([2, 3, 4].includes(mode)) expected = failure('XX000')
        if (mode === 7) expected = failure('22012')
        if ([9, 10, 12].includes(mode)) expected = { kind: 'True' }
        if (mode === 11)
          expected = {
            kind: [
              'float8_corr',
              'float8_regr_r2',
              'float8_regr_slope',
              'float8_regr_intercept',
            ].includes(fn.name)
              ? 'Null'
              : 'True',
          }
        fixtures.push({
          name: 'state',
          row: {
            mode: { kind: 'Value', value: mode },
            operation: { kind: 'Value', value: operation },
            expected: known(mode === 11 ? 0n : bits),
          },
          expected,
        })
      }
    }
    const evaluatorSource =
      'pub fn evaluate_check(mode:Int4Value,operation:Int4Value,expected:Int8Value)->CheckOutcome{let result=float_final_probe(mode,operation,expected);check_from_bool(result)}'
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'test/float_final_probe.rs',
        source: String.raw`
fn float_final_probe_value(width:i32,selected:i32,mask:i32,missing:i32)->ArrayValue {
 let mut dimensions:Vec<ArrayDimension>=Vec::new();let mut elements:Vec<ArrayElement>=Vec::new();
 let mut facet=BoolValue::Value(false);if selected==0 || selected==4 || selected==14 {facet=BoolValue::Unknown;};if selected==2 {facet=BoolValue::Value(true);};
 if selected==3 || selected==4 {dimensions.push(ArrayDimension{lower:1,length:1});};dimensions.push(ArrayDimension{lower:-3,length:width});
 let mut index:i32=0;let mut flags=mask;
 while index<width {
  let mut number=2.0f64;
  if width==3 {if index==1 {number=4.0f64;};if index==2 {number=8.0f64;};}
  else {if index==3 || index==5 {number=4.0f64;};if index==4 {number=8.0f64;};};
  if selected==11 && index!=0 {number=0.0f64;};if (selected==1 || selected==14) && index==0 {number=0.0f64;};
  let mut cell=array_element_from_float8(make_float8_value(number));
  if (selected==1 || selected==8) && index!=0 {cell=ArrayElement::Unknown;};
  if selected==9 && index!=0 {cell=array_element_from_float8(Float8Value::UnspecifiedNan);};
  if selected==10 && index!=0 {cell=array_element_from_float8(make_float8_bits(${nan}i64));};
  if selected==12 && flags%2==0 {cell=ArrayElement::Unknown;};if selected==13 && index==missing {cell=ArrayElement::Unknown;};
  elements.push(cell);flags=flags/2;index=index+1;
 }
 if selected==5 {return ArrayValue::Null;};if selected==6 {return ArrayValue::Unknown;};if selected==7 {return ArrayValue::Error(make_sql_error(3452582));};
 make_array_value(ArrayPayload{element_type:"pg_catalog.float8".to_owned(),element_kind:20,dimensions:dimensions,elements:elements,null_bitmap:facet})
}
fn float_final_probe_result(result:Float8Value,expected:Int8Value,selected:i32,selects:bool)->BoolValue {
 if selected==9 {return BoolValue::Value(result==Float8Value::UnspecifiedNan);};
 if selected==10 {if selects {return BoolValue::Value(result==make_float8_bits(${nan}i64));};return BoolValue::Value(result==Float8Value::UnspecifiedNan);};
 if let Float8Value::Error(error)=result {return BoolValue::Error(error);};if result==Float8Value::Null {return BoolValue::Null;};
 if let Float8Value::Value(bits)=result {if let Int8Value::Value(wanted)=expected {return BoolValue::Value(bits==wanted);};};BoolValue::Unknown
}
pub fn float_final_probe(mode:Int4Value,operation:Int4Value,expected:Int8Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {if let Int4Value::Value(op)=operation {
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
            {
              name: 'expected',
              rustName: 'expected',
              type: 'pg_catalog.int8',
              rustType: 'Int8Value',
            },
          ],
        },
      ],
    }
    await runCheckParity(directory, 'floatfinalowned', group, ['state'], fixtures)
    await writeFile(
      'artifacts/goal-checks/array-float-final/owned-measurements.json',
      JSON.stringify({ fixtures: fixtures.length, operations: 16, storageProfiles: 15 }, null, 2) +
        '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
