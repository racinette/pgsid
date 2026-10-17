import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const unknown: Input = { kind: 'Unknown' }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

it('retains partial winners, safe metadata, eager errors and lazy branches without assuming unknown comparisons succeed', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-extrema-state-'))
  const forms: Record<string, string> = {}
  for (const fn of ['array_larger', 'array_smaller']) {
    const plain = `${fn}(ARRAY[quantity],ARRAY[other])`,
      prefix = `${fn}(ARRAY[0,quantity],ARRAY[1,other])`,
      parsed = `${fn}(ARRAY[payload::numeric],ARRAY[other::numeric])`
    forms[fn + '_count'] = `cardinality(${plain})=1`
    forms[fn + '_prefix'] = `cardinality(${prefix})=2`
    forms[fn + '_fetch'] = `(${prefix})[1]=${fn === 'array_larger' ? 1 : 0}`
    forms[fn + '_safe_wrapped'] =
      `array_dims(ARRAY[cardinality(${plain})]) COLLATE "C"='[1:1]' COLLATE "C"`
    forms[fn + '_metadata_wrapped'] =
      `array_dims(ARRAY[array_dims(${plain})]) COLLATE "C"='[1:1]' COLLATE "C"`
    forms[fn + '_parsed_wrapped'] =
      `array_dims(ARRAY[cardinality(${parsed})]) COLLATE "C"='[1:1]' COLLATE "C"`
    forms[fn + '_literal_null'] = `${fn}(NULL::integer[],ARRAY[quantity]) IS NULL`
    forms[fn + '_right_null'] = `${fn}(ARRAY[quantity],NULL::integer[]) IS NULL`
    forms[fn + '_prepared_null'] =
      `(CASE WHEN bypass THEN ARRAY[]::json[] ELSE ${fn}(ARRAY['1'::json],ARRAY['2'::json]) END) IS NULL`
    forms[fn + '_pruned_null'] =
      `(CASE WHEN true THEN ARRAY[]::json[] ELSE ${fn}(ARRAY['1'::json],ARRAY['2'::json]) END) IS NULL`
    forms[fn + '_error'] = `cardinality(${fn}(ARRAY[quantity],ARRAY[other/divisor]))=1`
    forms[fn + '_guarded'] = `CASE WHEN bypass THEN true ELSE cardinality(${parsed})=1 END`
  }
  try {
    await pg.exec(
      'CREATE TABLE extrema_state(quantity integer,other integer,payload text,divisor integer,bypass boolean);CREATE TABLE extrema_state_oracle(LIKE extrema_state)',
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE extrema_state ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'extrema_state')!
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
            origin === 'stored'
              ? table.constraints.find((c) => c.name === name)!
              : { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    expect(
      plans.filter((p) => hasUncertain(p.expression)).map((p) => p.identity.constraint),
    ).toEqual([])
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    for (const values of [
      [1, 2, '1', 1, false],
      [1, 2, 'bad', 0, false],
      [null, null, null, 1, null],
      [-1, 0, 'NaN', 1, true],
      [2147483647, -2147483648, '1.25', -1, false],
    ] as const) {
      await pg.exec('TRUNCATE extrema_state_oracle')
      await pg.query('INSERT INTO extrema_state_oracle VALUES($1,$2,$3,$4,$5)', [...values])
      const row = {
        quantity: known(values[0]),
        other: known(values[1]),
        payload: known(values[2]),
        divisor: known(values[3]),
        bypass: known(values[4]),
      }
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${sql} value FROM extrema_state_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (cause) {
          const code = (cause as { code: string }).code
          expect(['22P02', '22012', '22003', '42883']).toContain(code)
          expected = error(code)
        }
        references.push({ name, values, expected })
        add(name, row, expected)
      }
    }
    const base: Row = {
      quantity: unknown,
      other: unknown,
      payload: unknown,
      divisor: known(1),
      bypass: known(false),
    }
    for (const fn of ['array_larger', 'array_smaller']) {
      for (const suffix of ['count', 'parsed_wrapped', 'error', 'guarded'])
        add(fn + '_' + suffix, base, { kind: 'Unknown' })
      for (const suffix of [
        'prefix',
        'fetch',
        'safe_wrapped',
        'metadata_wrapped',
        'literal_null',
        'right_null',
      ])
        add(fn + '_' + suffix, base, { kind: 'True' })
      add(fn + '_error', { ...base, divisor: known(0), other: known(1) }, error('22012'))
      add(
        fn + '_guarded',
        { ...base, bypass: known(true), payload: error('22012') },
        { kind: 'True' },
      )
      add(fn + '_guarded', { ...base, bypass: unknown, payload: known('bad') }, { kind: 'Unknown' })
      add(fn + '_parsed_wrapped', { ...base, payload: known('bad') }, error('22P02'))
      add(fn + '_safe_wrapped', { ...base, quantity: error('22012') }, error('22012'))
      add(fn + '_prefix', { ...base, other: error('22012') }, error('22012'))
      add(fn + '_literal_null', { ...base, quantity: error('22012') }, { kind: 'True' })
      add(fn + '_right_null', { ...base, quantity: error('22012') }, { kind: 'True' })
    }
    await mkdir('artifacts/array-extrema', { recursive: true })
    await writeFile(
      'artifacts/array-extrema/state-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-extrema/state-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayextremastate',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('owns selected dimensions and nested JSONB graphs independently of the original operands', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-extrema-owned-'))
  try {
    const evaluatorSource =
      'pub fn evaluate_check() -> CheckOutcome {let value=array_extrema_owned_probe();check_from_bool(value)}'
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: ['sql__pg_catalog__array_larger__9l3m', 'sql__pg_catalog__array_smaller__xp88'],
    })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_extrema_owned.rs',
        source: String.raw`
fn extrema_owned_array(source: &str) -> ArrayValue {
 let value=make_jsonb_value(source);
 let element=array_element_from_jsonb(value);
 let initial=make_array_arguments("pg_catalog.jsonb",12);
 let built=append_array_argument(initial,element);
 finish_array_constructor(built)
}
pub fn array_extrema_owned_probe()->BoolValue {
 let first_error=make_sql_error(3452582);
 let second_error=make_sql_error(3452547);
 let larger_left=sql__pg_catalog__array_larger__9l3m(ArrayValue::Error(first_error),ArrayValue::Error(second_error),int4_unknown());
 let smaller_left=sql__pg_catalog__array_smaller__xp88(ArrayValue::Error(first_error),array_unknown(),int4_unknown());
 let larger_right=sql__pg_catalog__array_larger__9l3m(array_null(),ArrayValue::Error(second_error),int4_null());
 let smaller_right=sql__pg_catalog__array_smaller__xp88(array_unknown(),ArrayValue::Error(second_error),int4_unknown());
 let larger_left_state=prepare_array_output(larger_left);
 let smaller_left_state=prepare_array_output(smaller_left);
 let larger_right_state=prepare_array_output(larger_right);
 let smaller_right_state=prepare_array_output(smaller_right);
 if larger_left_state.error!=first_error || smaller_left_state.error!=first_error {return BoolValue::Value(false);};
 if larger_right_state.error!=second_error || smaller_right_state.error!=second_error {return BoolValue::Value(false);};
 let lower=extrema_owned_array("[0]");
 let upper=extrema_owned_array("[3,4]");
 let mut original=extrema_owned_array("[1,2]");
 let selected_large=sql__pg_catalog__array_larger__9l3m(lower,original.clone(),make_int4_value(-1));
 let selected_small=sql__pg_catalog__array_smaller__xp88(original.clone(),upper,make_int4_value(-1));
 if let ArrayValue::Value(payload)=original {
   let mut changed_payload=payload;
   let cell=changed_payload.elements[0].clone();
   if let ArrayElement::Jsonb(document)=cell {
     let mut changed_document=document;
     let child=changed_document.nodes[changed_document.root].child;
     let start=changed_document.nodes[child].text_start;
     changed_document.characters[start]='9';
     changed_payload.elements[0]=ArrayElement::Jsonb(changed_document);
   };
   let length=changed_payload.dimensions[0].length;
   changed_payload.dimensions[0]=ArrayDimension {lower:-5,length:length};
   original=ArrayValue::Value(changed_payload);
 };
 let changed=array_element_to_jsonb(array_flat_element(original.clone(),make_int4_value(0)));
 if jsonb_to_text(changed)!=make_text_value("[9, 2]") {return BoolValue::Value(false);};
 let large=array_element_to_jsonb(array_flat_element(selected_large.clone(),make_int4_value(0)));
 let small=array_element_to_jsonb(array_flat_element(selected_small.clone(),make_int4_value(0)));
 if jsonb_to_text(large)!=make_text_value("[1, 2]") {return BoolValue::Value(false);};
 if jsonb_to_text(small)!=make_text_value("[1, 2]") {return BoolValue::Value(false);};
 let large_plan=prepare_array_output(selected_large);
 let small_plan=prepare_array_output(selected_small);
 let original_plan=prepare_array_output(original);
 if large_plan.state!=1 || small_plan.state!=1 || original_plan.state!=1 {return BoolValue::Value(false);};
 if large_plan.dimensions[0].lower!=1 || small_plan.dimensions[0].lower!=1 || original_plan.dimensions[0].lower!= -5 {return BoolValue::Value(false);};
 BoolValue::Value(true)
}
`,
      })
    const group = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [{ kind: 'supported' as const, entryName: 'evaluate_check', inputs: [] }],
    }
    const fixtures = [{ name: 'owned', row: {}, expected: { kind: 'True' as const } }]
    await mkdir('artifacts/array-extrema', { recursive: true })
    await writeFile(
      'artifacts/array-extrema/owned-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await runCheckParity(directory, 'arrayextremaowned', group, ['owned'], fixtures)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
