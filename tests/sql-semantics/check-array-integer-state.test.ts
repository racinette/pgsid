import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('evaluates integer aggregate states with wrapping transitions, exact final division, bitmap validation and ordered expression validity', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-integer-state-'))
  try {
    const outputs: Record<string, string> = {
      int2_forward: 'int2_avg_accum(payload::bigint[],quantity::smallint)',
      int4_forward: 'int4_avg_accum(payload::bigint[],quantity)',
      int2_inverse: 'int2_avg_accum_inv(payload::bigint[],quantity::smallint)',
      int4_inverse: 'int4_avg_accum_inv(payload::bigint[],quantity)',
      average: 'int8_avg(payload::bigint[])',
      sum: 'int2int4_sum(payload::bigint[])',
      composed_average: 'int8_avg(int4_avg_accum(payload::bigint[],quantity))',
      composed_sum: 'int2int4_sum(int2_avg_accum_inv(payload::bigint[],quantity::smallint))',
      retained: 'int2int4_sum((payload::bigint[])[1:2])',
      rebuilt: 'int8_avg(((payload::bigint[])[1:2])::text::bigint[])',
      reversed: 'int2int4_sum(array_reverse((payload::bigint[])[1:2]))',
      eager: 'int4_avg_accum(payload::bigint[],quantity/divisor)',
    }
    const forms: Record<string, string> = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    Object.assign(forms, {
      raw_transition: 'int4_avg_accum(raw_state,quantity) IS NULL',
      raw_small: 'int2_avg_accum(raw_state,quantity::smallint) IS NULL',
      raw_wrapped_sum: 'cardinality(ARRAY[int2int4_sum(raw_state)])=1',
      raw_wrapped_average: 'cardinality(ARRAY[int8_avg(raw_state)])=1',
      raw_wrapped_transition: 'cardinality(ARRAY[int4_avg_accum(raw_state,quantity)])=2',
      lazy: 'CASE WHEN bypass THEN true ELSE int8_avg(payload::bigint[]) IS NOT NULL END',
      prepared: "CASE WHEN bypass THEN true ELSE int8_avg('{}'::bigint[]) IS NULL END",
      pruned: "CASE WHEN true THEN true ELSE int8_avg('{}'::bigint[]) IS NULL END",
      constant_null: 'int4_avg_accum(payload::bigint[],NULL::integer) IS NULL',
      constructor: 'int2int4_sum(ARRAY[quantity::bigint,divisor::bigint]) IS NULL',
    })
    await pg.exec(
      'CREATE TABLE integer_state_values(payload text,quantity integer,divisor integer,bypass boolean,expected text,raw_state bigint[]);CREATE TABLE integer_state_oracle(LIKE integer_state_values);',
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE integer_state_values ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'integer_state_values')!
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
      ),
      group = prepareCheckRustGroup(plans, { arrayNulls: true, defaultCollation: 'C' })
    for (const [index, plan] of plans.entries()) {
      expect(hasUncertain(plan.expression), plan.identity.constraint).toBe(false)
      const check = group.checks[index]!
      expect(
        check.kind,
        plan.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row: { ...row }, expected })
    }
    const states = [
      null,
      '{}',
      '{0,0}',
      '{0,12}',
      '{1,2}',
      '{2,9}',
      '{-1,7}',
      '{9223372036854775807,9223372036854775807}',
      '{-9223372036854775808,-9223372036854775808}',
      '{1,9223372036854775807}',
      '{-1,-9223372036854775808}',
      '[-3:-2]={2,9}',
      '[2147483646:2147483647]={1,-2}',
      '{NULL,2}',
      '{2,NULL}',
      '{0}',
      '{1,2,3}',
      '{1,2,NULL}',
      '{{1,2}}',
      '{{{0}}}',
      'bad',
      '{1,',
      '{1,bad}',
    ]
    for (const [name, sql] of Object.entries(forms).filter(([name]) => !name.startsWith('raw_'))) {
      const quantities = /quantity/u.test(sql)
        ? [null, -2147483648, -32768, -1, 0, 1, 32767, 32768, 2147483647]
        : [1]
      const payloads = ['prepared', 'pruned', 'constructor'].includes(name) ? ['{1,2}'] : states
      for (const payload of payloads)
        for (const quantity of quantities)
          for (const divisor of name === 'eager' || name === 'constructor' ? [null, 0, -1, 1] : [1])
            for (const bypass of ['lazy', 'prepared', 'pruned'].includes(name)
              ? [false, true]
              : [false]) {
              let expectedText: string | null = null
              if (outputs[name]) {
                try {
                  expectedText = (
                    await pg.query<{ value: string | null }>(
                      `SELECT (${outputs[name]})::text value FROM (SELECT $1::text payload,$2::integer quantity,$3::integer divisor) q`,
                      [payload, quantity, divisor],
                    )
                  ).rows[0]!.value
                } catch {}
              }
              await pg.exec('TRUNCATE integer_state_oracle')
              await pg.query('INSERT INTO integer_state_oracle VALUES($1,$2,$3,$4,$5)', [
                payload,
                quantity,
                divisor,
                bypass,
                expectedText,
              ])
              let expected: Outcome
              try {
                const value = (
                  await pg.query<{ value: boolean | null }>(
                    `SELECT ${sql} value FROM integer_state_oracle`,
                  )
                ).rows[0]!.value
                expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
              } catch (error) {
                expected = failure((error as { code: string }).code)
              }
              const row = {
                payload: known(payload),
                quantity: known(quantity),
                divisor: known(divisor),
                bypass: known(bypass),
                expected: known(expectedText),
              }
              add(name, row, expected)
              observations.push({
                name,
                payload,
                quantity,
                divisor,
                bypass,
                expectedText,
                expected,
              })
            }
    }
    for (const name of ['average', 'sum']) {
      const row = {
        payload: known('{{0}}'),
        quantity: known(1),
        divisor: known(1),
        bypass: known(false),
        expected: known(null),
      }
      expect(
        (
          await pg.query<{ value: string | null }>(
            `SELECT ${outputs[name]}::text value FROM (SELECT '{{0}}'::text payload) q`,
          )
        ).rows[0]!.value,
      ).toBe(null)
      add(name, row, { kind: 'True' })
    }
    const unknown: Input = { kind: 'Unknown' },
      nullInput: Input = { kind: 'Null' },
      first: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } },
      second: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const [raw_state, quantity, expected] of [
      [unknown, nullInput, { kind: 'True' }],
      [nullInput, unknown, { kind: 'True' }],
      [unknown, unknown, { kind: 'Unknown' }],
      [first, nullInput, failure('22012')],
      [unknown, second, failure('22003')],
      [first, second, failure('22012')],
      [nullInput, second, failure('22003')],
    ] as [Input, Input, Outcome][]) {
      add('raw_transition', { raw_state, quantity }, expected)
    }
    add('raw_small', { raw_state: nullInput, quantity: unknown }, { kind: 'Unknown' })
    for (const name of ['raw_wrapped_sum', 'raw_wrapped_average']) {
      add(name, { raw_state: unknown }, { kind: 'Unknown' })
      add(name, { raw_state: nullInput }, { kind: 'True' })
      add(name, { raw_state: first }, failure('22012'))
    }
    add('raw_wrapped_transition', { raw_state: unknown, quantity: known(1) }, { kind: 'Unknown' })
    expect(
      (
        await pg.query<{ value: boolean }>(
          'SELECT cardinality(ARRAY[int4_avg_accum(NULL::bigint[],1)])=2 value',
        )
      ).rows[0]!.value,
    ).toBe(false)
    add('raw_wrapped_transition', { raw_state: nullInput, quantity: known(1) }, { kind: 'False' })
    add('raw_wrapped_transition', { raw_state: unknown, quantity: nullInput }, { kind: 'False' })
    add(
      'int4_forward',
      { payload: unknown, quantity: nullInput, expected: nullInput },
      { kind: 'Unknown' },
    )
    add(
      'int4_forward',
      { payload: unknown, quantity: second, expected: nullInput },
      { kind: 'Unknown' },
    )
    add('constant_null', { payload: unknown }, { kind: 'True' })
    add('lazy', { payload: unknown, bypass: known(true) }, { kind: 'True' })
    await mkdir('artifacts/goal-checks/array-integer-state', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-integer-state/observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'integerarraystate',
      group,
      Object.keys(forms).flatMap((name) =>
        ['source', 'stored'].map((origin) => name + '_' + origin),
      ),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-integer-state/measurements.json',
      JSON.stringify(
        {
          forms: Object.keys(forms).length,
          fixtures: fixtures.length,
          postgresObservations: observations.length,
          callables: 6,
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

it('preserves explicit and missing storage facets, partial state words, strict states and owned transition results', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-integer-owned-'))
  try {
    const equal = builtinCallables().filter(
      (f) =>
        f.kind === 'function' &&
        f.schema === 'pg_catalog' &&
        f.name === 'numeric_eq' &&
        f.args.join(',') === 'pg_catalog."numeric",pg_catalog."numeric"',
    )
    expect(equal).toHaveLength(1)
    const numericEqual = equal[0]!
    if (numericEqual.kind !== 'function') throw new Error('Numeric equality function required')
    const evaluatorSource =
        'pub fn evaluate_check(mode:Int4Value,operation:Int4Value)->CheckOutcome{let result=integer_state_probe(mode,operation);check_from_bool(result)}',
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/integer_state_probe.rs',
        source: String.raw`
fn integer_probe_value(selected:i32)->ArrayValue {
 let mut dimensions:Vec<ArrayDimension>=Vec::new();let mut elements:Vec<ArrayElement>=Vec::new();
 let mut count=make_int8_value(1i64);let mut sum=make_int8_value(2i64);let mut facet=BoolValue::Value(false);
 if selected==0 || selected==3 || selected==9 {facet=BoolValue::Unknown;};
 if selected==2 || selected==11 {facet=BoolValue::Value(true);};
 if selected==3 || selected==4 || selected==6 {count=make_int8_value(0i64);};
 if selected==4 {sum=Int8Value::Unknown;};if selected==5 {count=Int8Value::Unknown;};
 if selected==6 || selected==7 {
  dimensions.push(ArrayDimension{lower:1,length:1});dimensions.push(ArrayDimension{lower:1,length:1});elements.push(array_element_from_int8(count));
 } else {
  let mut length:i32=2;if selected==9 {length=1;};dimensions.push(ArrayDimension{lower:-3,length:length});
  elements.push(array_element_from_int8(count));if selected!=9 {elements.push(array_element_from_int8(sum));};
 };
 if selected==8 {elements[1]=ArrayElement::Null;facet=BoolValue::Unknown;};
 let value=make_array_value(ArrayPayload{element_type:"pg_catalog.int8".to_owned(),element_kind:3,dimensions:dimensions,elements:elements,null_bitmap:facet});
 if selected==12 {return ArrayValue::Null;};if selected==13 {return ArrayValue::Unknown;};
 if selected==14 || selected==16 {return ArrayValue::Error(make_sql_error(3452582));};value
}
fn integer_probe_truth(input:Int8Value)->BoolValue {
 if let Int8Value::Error(error)=input {return BoolValue::Error(error);};
 if input==Int8Value::Null {return BoolValue::Null;};
 if let Int8Value::Value(value)=input {return BoolValue::Value(value==2i64);};BoolValue::Unknown
}
pub fn integer_state_probe(mode:Int4Value,operation:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {if let Int4Value::Value(op)=operation {
  let original=integer_probe_value(selected);
  if op==0 {return integer_probe_truth(sql__pg_catalog__int2int4_sum__8u9i(original));};
  if op==1 {return ${numericEqual.rustName}(sql__pg_catalog__int8_avg__pgr2(original),make_numeric_value("2"));};
  let mut amount=make_int4_value(1);let mut small=make_int2_value(1);
  if selected==10 || selected==11 {amount=Int4Value::Null;small=Int2Value::Null;};
  if selected==15 || selected==16 {amount=Int4Value::Error(make_sql_error(3452547));small=Int2Value::Error(make_sql_error(3452547));};
  let mut result=ArrayValue::Unknown;
  if op==2 {result=sql__pg_catalog__int2_avg_accum__7nj2(original.clone(),small);};
  if op==3 {result=sql__pg_catalog__int4_avg_accum__tsby(original.clone(),amount);};
  if op==4 {result=sql__pg_catalog__int2_avg_accum_inv__vtyq(original.clone(),small);};
  if op==5 {result=sql__pg_catalog__int4_avg_accum_inv__dt0r(original.clone(),amount);};
  let count=sql__pg_catalog__cardinality__m1rn(result.clone());
  let plan=prepare_array_output(result);
  if plan.state==1 {
   if plan.null_bitmap!=BoolValue::Value(false) || plan.dimensions[0].lower!= -3 {return BoolValue::Value(false);};
   let mut cells=plan.elements;cells[1]=array_element_from_int8(make_int8_value(99i64));
   let mut dimensions=plan.dimensions;dimensions[0]=ArrayDimension{lower:99,length:2};
   let retained=prepare_array_output(original);
   if retained.dimensions[0].lower!= -3 {return BoolValue::Value(false);};
   if selected==1 {
    if array_element_to_int8(retained.elements[0].clone())!=make_int8_value(1i64) || array_element_to_int8(retained.elements[1].clone())!=make_int8_value(2i64) {return BoolValue::Value(false);};
   };
  };
  if let Int4Value::Error(error)=count {return BoolValue::Error(error);};if count==Int4Value::Null {return BoolValue::Null;};
  if let Int4Value::Value(value)=count {return BoolValue::Value(value==2);};
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
          inputs: ['mode', 'operation'].map((name) => ({
            name,
            rustName: name,
            type: 'pg_catalog.int4',
            rustType: 'Int4Value',
          })),
        },
      ],
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (let mode = 0; mode < 17; mode++)
      for (let operation = 0; operation < 6; operation++) {
        let expected: Outcome = { kind: 'Unknown' }
        if ([1, 10, 15].includes(mode)) expected = { kind: 'True' }
        if ([2, 8, 9, 11].includes(mode)) expected = failure('XX000')
        if ([4, 6, 12].includes(mode)) expected = { kind: 'Null' }
        if ([14, 16].includes(mode)) expected = failure('22012')
        if (operation >= 2) {
          if ([4, 5].includes(mode)) expected = { kind: 'True' }
          if (mode === 6) expected = { kind: 'Unknown' }
          if ([10, 11].includes(mode)) expected = { kind: 'Null' }
          if (mode === 15) expected = failure('22003')
        }
        fixtures.push({
          name: 'state',
          row: { mode: known(mode), operation: known(operation) },
          expected,
        })
      }
    await runCheckParity(directory, 'integerstateowned', group, ['state'], fixtures)
    await writeFile(
      'artifacts/goal-checks/array-integer-state/owned-measurements.json',
      JSON.stringify({ fixtures: fixtures.length, operations: 6, storageProfiles: 17 }, null, 2) +
        '\n',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
