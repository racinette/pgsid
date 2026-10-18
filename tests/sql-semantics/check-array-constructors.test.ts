import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

it('constructs scalar and nested ARRAY expressions with PostgreSQL shape, coercion and error order in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-constructors-'))
  const forms = [
    ['scalar', 'ARRAY[a,b,NULL]'],
    ['matrix', 'ARRAY[[a,b],[b,a]]'],
    ['ragged', 'ARRAY[ARRAY[a],ARRAY[a,b]]'],
    ['empty', 'ARRAY[]::integer[]'],
    ['empty_children', 'ARRAY[ARRAY[]::integer[],ARRAY[]::integer[]]'],
    ['null_children', 'ARRAY[NULL::integer[],NULL::integer[]]'],
    ['unknown_null_child', 'ARRAY[NULL,ARRAY[a,b]]'],
    ['mixed_null_child', 'ARRAY[NULL::integer[],ARRAY[a,b]]'],
    ['mixed_empty_child', 'ARRAY[ARRAY[]::integer[],ARRAY[a,b]]'],
    ['late_error', 'ARRAY[ARRAY[a],ARRAY[a,b],ARRAY[b/divisor]]'],
    ['early_error', 'ARRAY[ARRAY[b/divisor],ARRAY[a,b],ARRAY[a]]'],
    ['promoted_small', 'ARRAY[small,a]'],
    ['promoted_wide', 'ARRAY[a,wide]'],
    ['explicit_wide', 'ARRAY[a,b]::bigint[]'],
    ['rounded_integer', 'ARRAY[1.9,a]::integer[]'],
    ['narrowed_small', 'ARRAY[a,b]::smallint[]'],
    ['text', "ARRAY[textcol,'NULL',NULL]"],
    ['text_width', 'ARRAY[textcol]::varchar(2)[]'],
    ['numeric_width', 'ARRAY[a,1.25]::numeric(4,1)[]'],
    ['enum', "ARRAY['new',NULL]::array_stage[]"],
    ['enum_null', 'NULL::array_stage[]'],
    ['rank_limit', 'ARRAY[ARRAY[ARRAY[ARRAY[ARRAY[ARRAY[ARRAY[a]]]]]]]'],
    ['guarded', 'CASE WHEN bypass THEN ARRAY[]::integer[] ELSE ARRAY[ARRAY[a],ARRAY[a,b]] END'],
    ['coalesced', 'COALESCE(NULL::integer[],ARRAY[a,b])'],
    ['guarded_constant_error', 'CASE WHEN bypass THEN ARRAY[]::integer[] ELSE ARRAY[1/0] END'],
    ['pruned_constant_error', 'CASE WHEN true THEN ARRAY[]::integer[] ELSE ARRAY[1/0] END'],
    ['coalesced_constant_error', 'COALESCE(ARRAY[a],ARRAY[1/0])'],
    ['coalesced_pruned_error', 'COALESCE(ARRAY[1],ARRAY[1/0])'],
  ] as const
  const scalarLiterals = [
    ['smallint', "'-123'"],
    ['integer', "'-2147483648'"],
    ['bigint', "'9007199254740993'"],
    ['timestamp', "'2000-01-01 12:34:56'"],
    ['timestamptz', "'2000-01-01 12:34:56+00'"],
    ['array_stage', "'new'"],
    ['date', "'2000-01-01'"],
    ['text', "'雪,NULL'"],
    ['boolean', 'true'],
    ['numeric', "'12345678901234567890.0012300'"],
    ['json', '\'{"a":1}\''],
    ['jsonb', '\'{"a":1}\''],
    ['inet', "'2001:db8::1/64'"],
    ['bit varying', "'101001'"],
    ['bytea', String.raw`'\x0001ff'`],
    ['macaddr', "'08:00:2b:01:02:03'"],
    ['macaddr8', "'08:00:2b:01:02:03:04:05'"],
    ['uuid', "'12345678-1234-1234-1234-123456789abc'"],
    ['real', "'NaN'"],
    ['double precision', "'-0'"],
    ['time', "'12:34:56'"],
    ['timetz', "'12:34:56+00'"],
    ['interval', "'1 day'"],
    ['point', "'(0,1)'"],
    ['line', "'{1,0,0}'"],
    ['lseg', "'[(0,0),(1,1)]'"],
    ['box', "'(1,1),(0,0)'"],
    ['path', "'[(0,0),(1,1)]'"],
    ['polygon', "'((0,0),(1,0),(0,1))'"],
    ['circle', "'<(0,0),1>'"],
    ['money', "'0'"],
    ['"char"', "'a'"],
    ['oid', "'4294967295'"],
    ['xid', "'4294967295'"],
    ['cid', "'4294967295'"],
    ['pg_snapshot', "'10:20:12,15'"],
    ['xid8', "'18446744073709551615'"],
    ['pg_lsn', "'FFFFFFFF/FFFFFFFF'"],
    ['tid', "'(4294967295,65535)'"],
    ['jsonpath', "'$.a[0]'"],
  ] as const
  const modes = ['cardinality', 'array_dims', 'array_length'] as const
  const variants = [
    ...forms.map(([name, array]) => ({ name, array })),
    ...scalarLiterals.map(([type, literal], index) => ({
      name: 'family_' + (index + 1),
      array: `ARRAY[${literal},NULL]::${type}[]`,
    })),
  ].flatMap((form) =>
    modes.map((mode) => ({
      ...form,
      mode,
      name: form.name + '_' + mode,
      call: mode + '(' + form.array + (mode === 'array_length' ? ',dimension' : '') + ')',
    })),
  )
  const sqlParameters = [
    'integer',
    'integer',
    'smallint',
    'bigint',
    'text',
    'integer',
    'boolean',
    'integer',
  ]
  const names = ['a', 'b', 'small', 'wide', 'textcol', 'divisor', 'bypass', 'dimension']
  try {
    await pg.exec(
      `CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE constructor_inputs(a integer,b integer,small smallint,wide bigint,textcol text,divisor integer,bypass boolean,dimension integer,expected_count integer,expected_text text)`,
    )
    for (const variant of variants)
      await pg.exec(
        `ALTER TABLE constructor_inputs ADD CONSTRAINT "${variant.name}" CHECK(${variant.call}${variant.mode === 'array_dims' ? ' COLLATE "C"' : ''} IS NOT DISTINCT FROM ${variant.mode === 'array_dims' ? 'expected_text COLLATE "C"' : 'expected_count'}) NOT VALID`,
      )
    await pg.exec(
      `CREATE DOMAIN owned_slots AS integer[];CREATE DOMAIN priority_lane AS integer;CREATE TABLE domain_constructor_inputs(a owned_slots,b owned_slots,plain integer[],lane priority_lane,bypass boolean);INSERT INTO domain_constructor_inputs VALUES('{1}','{2}','{3}',1,false)`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'constructor_inputs')!
    const domainTable = catalog.tables.find((table) => table.name === 'domain_constructor_inputs')!
    for (const [array, dimensions, deferred] of [
      ['ARRAY[a,b]', '[1:2]', true],
      ['ARRAY[COALESCE(a,b),b]', '[1:2]', true],
      ['ARRAY[CASE WHEN bypass THEN a ELSE b END,b]', '[1:2]', true],
      ['ARRAY[a::integer[],b::integer[]]', '[1:2][1:1]', false],
      ['ARRAY[a,plain]', '[1:2][1:1]', false],
      ['ARRAY[lane,lane]', '[1:2]', false],
      ['ARRAY[lane,NULL]', '[1:2]', false],
    ] as const) {
      const actual = (
        await pg.query<{ dims: string }>(
          `SELECT array_dims(${array}) AS dims FROM domain_constructor_inputs`,
        )
      ).rows[0]!.dims
      expect(actual, array).toBe(dimensions)
      const bound = lowerTableCheck(
        domainTable,
        { name: 'domain', type: 'check', definition: `CHECK(array_dims(${array}) IS NULL)` },
        catalog.enums,
        catalog.domains,
      )!
      expect(hasUncertain(bound.expression), array).toBe(deferred)
    }
    const plans = variants.flatMap((variant) => {
      const stored = table.constraints.find((constraint) => constraint.name === variant.name)!
      return ['source', 'stored'].map((origin) => ({
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...stored,
                  definition: `CHECK(${variant.call}${variant.mode === 'array_dims' ? ' COLLATE "C"' : ''} IS NOT DISTINCT FROM ${variant.mode === 'array_dims' ? 'expected_text COLLATE "C"' : 'expected_count'})`,
                }
              : stored,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: variant.name + '_' + origin,
        },
      }))
    })
    expect(
      plans.filter((plan) => hasUncertain(plan.expression)).map((plan) => plan.identity.constraint),
    ).toEqual([])
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      defaultCtype: 'C.UTF-8',
    })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    expect(group.evaluatorSource).toContain('finish_array_constructor(')
    expect(group.evaluatorSource).toContain('finish_array_children(')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    // The unconstrained oracle table keeps operands as row variables during planning.
    await pg.exec(
      `CREATE TABLE constructor_oracle(a integer,b integer,small smallint,wide bigint,textcol text,divisor integer,bypass boolean,dimension integer)`,
    )
    const rows = [
      [1, 2, 3, 9007199254740993n, '雪😊', 1, false, 1],
      [1, 2, 3, 9007199254740993n, 'NULL', 0, false, 1],
      [null, 2, 3, 0n, 'a', 1, false, 2],
      [1, null, null, -1n, 'a', 1, true, 1],
      [null, null, null, null, null, 1, false, 0],
      [2147483647, 1, 32767, 9223372036854775807n, 'abcdef', -1, false, 1],
      [-2147483648, -1, -32768, -9223372036854775808n, '', 1, false, null],
    ] as const
    for (const row of rows) {
      await pg.exec('TRUNCATE constructor_oracle')
      await pg.query(
        `INSERT INTO constructor_oracle VALUES(${sqlParameters.map((type, index) => '$' + (index + 1) + '::' + type).join(',')})`,
        row.map((value) => (typeof value === 'bigint' ? value.toString() : value)),
      )
      for (const variant of variants) {
        let output: string | null = null,
          expected: Outcome = { kind: 'True' }
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT (${variant.call})::text AS value FROM constructor_oracle`,
            )
          ).rows[0]!.value
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        references.push({ name: variant.name, row, output, expected })
        const input: Row = Object.fromEntries(
          names.map((name, index) => [
            name,
            row[index] === null ? { kind: 'Null' } : { kind: 'Value', value: row[index] },
          ]),
        ) as Row
        input['expected_count'] =
          variant.mode === 'array_dims' || output === null
            ? { kind: 'Null' }
            : { kind: 'Value', value: Number(output) }
        input['expected_text'] =
          variant.mode !== 'array_dims' || output === null
            ? { kind: 'Null' }
            : { kind: 'Value', value: output }
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: variant.name + '_' + origin, row: input, expected })
      }
    }
    await mkdir('artifacts/array-constructors', { recursive: true })
    const encode = (_key: string, value: unknown) =>
      typeof value === 'bigint' ? { $bigint: value.toString() } : value
    await writeFile(
      'artifacts/array-constructors/fixtures.json',
      JSON.stringify(fixtures, encode, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-constructors/references.json',
      JSON.stringify(references, encode, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayconstructorsparity',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('retains exact scalar cells and owned JSONB arenas when constructing flattened child arrays', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-constructor-payload-'))
  try {
    const evaluatorSource =
      'pub fn evaluate_check() -> CheckOutcome {let result=array_constructor_payload_probe();check_from_bool(result)}'
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: ['sql__pg_catalog__cardinality__m1rn'],
    })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_constructor_payload.rs',
        source: String.raw`
pub fn array_constructor_payload_probe()->BoolValue {
 let deferred=append_array_argument(make_array_arguments("pg_catalog.int4",2),ArrayElement::Unknown);
 let partial=finish_array_constructor(deferred);
 if array_is_null(partial.clone())!=BoolValue::Value(false) {return BoolValue::Value(false);};
 if sql__pg_catalog__cardinality__m1rn(partial.clone())!=make_int4_value(1) {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(partial,make_int4_value(0)))!=Int4Value::Unknown {return BoolValue::Value(false);};
 let scalar_error=make_sql_error(3452582);
 let scalar_later_error=make_sql_error(3452547);
 let first_error=append_array_argument(ArrayArguments::Error(scalar_error),ArrayElement::Error(scalar_later_error));
 if array_is_null(finish_array_constructor(first_error))!=BoolValue::Error(scalar_error) {return BoolValue::Value(false);};
 let unknown_then_error=append_array_argument(ArrayArguments::Unknown,ArrayElement::Error(scalar_later_error));
 if array_is_null(finish_array_constructor(unknown_then_error))!=BoolValue::Error(scalar_later_error) {return BoolValue::Value(false);};
 let deferred_child=append_array_child(make_array_children("pg_catalog.int4",2),ArrayValue::Unknown);
 if array_is_null(finish_array_children(deferred_child.clone()))!=BoolValue::Unknown {return BoolValue::Value(false);};
 let reached_child_error=append_array_child(deferred_child,ArrayValue::Error(scalar_error));
 if array_is_null(finish_array_children(reached_child_error))!=BoolValue::Error(scalar_error) {return BoolValue::Value(false);};
 let prior_child_error=append_array_child(ArrayChildrenArguments::Error(scalar_error),ArrayValue::Error(scalar_later_error));
 if array_is_null(finish_array_children(prior_child_error))!=BoolValue::Error(scalar_error) {return BoolValue::Value(false);};
 let unknown_children_error=append_array_child(ArrayChildrenArguments::Unknown,ArrayValue::Error(scalar_later_error));
 if array_is_null(finish_array_children(unknown_children_error))!=BoolValue::Error(scalar_later_error) {return BoolValue::Value(false);};
 let initial=make_array_arguments("pg_catalog.int4",2);
 let first=append_array_argument(initial,ArrayElement::Int4(-123));
 let second=append_array_argument(first,ArrayElement::Null);
 let third=append_array_argument(second,ArrayElement::Int4(2147483647));
 let row=finish_array_constructor(third);
 let int_children=make_array_children("pg_catalog.int4",2);
 let int_first_child=append_array_child(int_children,row.clone());
 let int_second_child=append_array_child(int_first_child,row);
 let matrix=finish_array_children(int_second_child);
 if sql__pg_catalog__array_dims__01ex(matrix.clone())!=make_text_value("[1:2][1:3]") {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(matrix.clone(),Int4Value::Value(0)))!=Int4Value::Value(-123) {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(matrix.clone(),Int4Value::Value(1)))!=Int4Value::Null {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(matrix.clone(),Int4Value::Value(2)))!=Int4Value::Value(2147483647) {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(matrix.clone(),Int4Value::Value(3)))!=Int4Value::Value(-123) {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(matrix.clone(),Int4Value::Value(4)))!=Int4Value::Null {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(matrix,Int4Value::Value(5)))!=Int4Value::Value(2147483647) {return BoolValue::Value(false);};
 let original=make_jsonb_value("{\"a\": [1, 2]}");
 let builder=make_array_arguments("pg_catalog.jsonb",12);
 let json_builder=append_array_argument(builder,array_element_from_jsonb(original.clone()));
 let json_row=finish_array_constructor(json_builder);
 let json_children=make_array_children("pg_catalog.jsonb",12);
 let json_first_child=append_array_child(json_children,json_row.clone());
 let snapshot=json_first_child.clone();
 let json_second_child=append_array_child(json_first_child,json_row);
 let one=finish_array_children(snapshot);
 let two=finish_array_children(json_second_child);
 if sql__pg_catalog__cardinality__m1rn(one)!=Int4Value::Value(1) {return BoolValue::Value(false);};
 if sql__pg_catalog__cardinality__m1rn(two.clone())!=Int4Value::Value(2) {return BoolValue::Value(false);};
 let json_first=array_element_to_jsonb(array_flat_element(two.clone(),Int4Value::Value(0)));
 let json_second=array_element_to_jsonb(array_flat_element(two,Int4Value::Value(1)));
 if jsonb_to_text(json_first)!=jsonb_to_text(original.clone()) || jsonb_to_text(json_second)!=jsonb_to_text(original) {return BoolValue::Value(false);};
 BoolValue::Value(true)
}
`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [{ kind: 'supported', entryName: 'evaluate_check', inputs: [] }],
    }
    await runCheckParity(
      directory,
      'arrayconstructorpayload',
      group,
      ['payload'],
      [{ name: 'payload', row: {}, expected: { kind: 'True' } }],
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 120_000)
