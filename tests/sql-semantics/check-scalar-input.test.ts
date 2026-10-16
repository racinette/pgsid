import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const probe = String.raw`

fn array_typmod_probe(source:TextValue,expected:TextValue,selected:i32)->BoolValue {
 let mut identity="pg_catalog.\"varchar\"".to_owned();
 let mut family:i32=8;let mut modifier:i32=6;
 if selected==7 {identity="pg_catalog.bpchar".to_owned();modifier=7;};
 if selected==8 {identity="pg_catalog.\"numeric\"".to_owned();family=10;modifier=262149;};
 if selected==9 {identity="pg_catalog.\"bit\"".to_owned();family=14;modifier=2;};
 if selected==10 {identity="pg_catalog.varbit".to_owned();family=14;modifier=2;};
 if selected==11 {identity="pg_catalog.\"time\"".to_owned();family=21;modifier=1;};
 if selected==12 {identity="pg_catalog.timetz".to_owned();family=22;modifier=1;};
 if selected==13 {identity="pg_catalog.\"timestamp\"".to_owned();family=4;modifier=1;};
 if selected==14 {identity="pg_catalog.timestamptz".to_owned();family=5;modifier=1;};
 if selected==15 {identity="pg_catalog.\"interval\"".to_owned();family=23;modifier=2147418113;};
 let payload=prepare_array_text(source,false,1);
 let mut builder=make_array_arguments(identity.as_str(),family);
 let mut index=make_int4_value(0);
 while array_text_has_event(&payload,index) {
  let text=array_text_event_at(&payload,index);let mut element=array_element_from_text(text.clone());
  if selected==8 {element=array_element_from_numeric(scalar_numeric_from_text(text.clone()));};
  if selected==9 || selected==10 {element=array_element_from_bit(bit_from_text(text.clone()));};
  if selected==11 {element=array_element_from_time(time_from_text(text.clone()));};
  if selected==12 {element=array_element_from_timetz(timetz_from_text(text.clone()));};
  if selected==13 {element=array_element_from_timestamp(timestamp_from_text(text.clone()));};
  if selected==14 {element=array_element_from_timestamptz(timestamptz_from_text(text.clone()));};
  if selected==15 {element=array_element_from_interval(interval_from_text(text));};
  builder=append_array_argument(builder,element);index=array_text_next_index(index);
 }
 let array=finish_prepared_array_text(payload,builder);let converted=array_with_typmod(array,modifier);
 let nullness=array_is_null(converted.clone());
 if let BoolValue::Error(error)=nullness {return BoolValue::Error(error);};
 if let BoolValue::Unknown=nullness {return BoolValue::Unknown;};
 let cell=array_flat_element(converted,Int4Value::Value(0));
 let mut actual=TextValue::Unknown;
 if selected==6 || selected==7 {
  let text=array_element_to_text(cell.clone());
  if let TextValue::Null=text {actual=TextValue::Null;};
  if let TextValue::Value(value)=text {actual=TextValue::Value(text_binary_hex(value.as_str(),false));};
 };
 if selected==8 {
  let number=array_element_to_numeric(cell.clone());
  if let NumericValue::Null=number {actual=TextValue::Null;};
  if let NumericValue::Value(value)=number {actual=TextValue::Value(numeric_work_text(numeric_work_from_value(value.as_str())));};
 };
 let mut wire=ByteaValue::Unknown;
 if selected==9 {wire=sql__pg_catalog__bit_send__1fyo(array_element_to_bit(cell.clone()));};
 if selected==10 {wire=sql__pg_catalog__varbit_send__yt0j(array_element_to_bit(cell.clone()));};
 if selected==11 {wire=sql__pg_catalog__time_send__0qc6(array_element_to_time(cell.clone()));};
 if selected==12 {wire=sql__pg_catalog__timetz_send__r9py(array_element_to_timetz(cell.clone()));};
 if selected==13 {wire=sql__pg_catalog__timestamp_send__3syx(array_element_to_timestamp(cell.clone()));};
 if selected==14 {wire=sql__pg_catalog__timestamptz_send__jyu1(array_element_to_timestamptz(cell.clone()));};
 if selected==15 {wire=sql__pg_catalog__interval_send__jxgl(array_element_to_interval(cell));};
 if selected>=9 {
  if let ByteaValue::Error(error)=wire {return BoolValue::Error(error);};
  if let ByteaValue::Null=wire {actual=TextValue::Null;};
  if let ByteaValue::Value(value)=wire {actual=TextValue::Value(value);};
 };
 if let TextValue::Unknown=actual {return BoolValue::Unknown;};
 BoolValue::Value(actual==expected)
}
pub fn scalar_input_probe(source:TextValue,expected:TextValue,mode:Int4Value)->BoolValue {
 let mut selected:i32=0;
 if let Int4Value::Value(value)=mode {selected=value;};
 if selected>=6 {return array_typmod_probe(source,expected,selected);};
 let mut actual=TextValue::Unknown;
 if selected<=2 {
  let mut bits:i32=16;
  if selected==1 {bits=32;};if selected==2 {bits=64;};
  actual=int8_to_text(scalar_integer_from_text(source.clone(),bits));
 };
 if selected==3 {
  let boolean=scalar_boolean_from_text(source.clone());
  if let BoolValue::Error(error)=boolean {return BoolValue::Error(error);};
  if let BoolValue::Null=boolean {actual=TextValue::Null;};
  if let BoolValue::Value(value)=boolean {actual=make_text_value("false");if value {actual=make_text_value("true");};};
 };
 if selected==4 {
  let number=scalar_numeric_from_text(source.clone());
  if let NumericValue::Error(error)=number {return BoolValue::Error(error);};
  if let NumericValue::Null=number {actual=TextValue::Null;};
  if let NumericValue::Value(value)=number {let work=numeric_work_from_value(value.as_str());actual=TextValue::Value(numeric_work_text(work));};
 };
 if selected==5 {actual=enum_to_text(scalar_enum_from_text(source,"\0new\0雪\0NULL",4),"\0new\0雪\0NULL",4);};
 if let TextValue::Error(error)=actual {return BoolValue::Error(error);};
 if let TextValue::Unknown=actual {return BoolValue::Unknown;};
 BoolValue::Value(actual==expected)
}
`

it('preserves exact signed integer, boolean, numeric and enum input values and error order for array elements in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-scalar-input-'))
  const known = (value: string | number | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      "SET TimeZone='UTC'; SET array_nulls=on; CREATE TYPE input_label AS ENUM ('','new','雪','NULL')",
    )
    const integers = [
      '',
      ' ',
      '0',
      '-0',
      '+0',
      '01',
      '0777',
      '123',
      '-123',
      ' \t+42\r\n',
      '32767',
      '32768',
      '32769',
      '-32768',
      '-32769',
      '32768x',
      '32769x',
      '327690x',
      '2147483647',
      '2147483648',
      '2147483649',
      '-2147483648',
      '-2147483649',
      '9223372036854775807',
      '9223372036854775808',
      '9223372036854775809',
      '-9223372036854775808',
      '-9223372036854775809',
      '9223372036854775809x',
      '9223372036854775810x',
      '0x_FF',
      '-0X8000000000000000',
      '0x8000000000000000x',
      '0xFFFFFFFFFFFFFFFF',
      '+0o7_7',
      '-0b100_000',
      '0x',
      '0x_',
      '0x__ff',
      '0b2',
      '0o8',
      '0xg',
      '_1',
      '1_',
      '1__0',
      '1_000',
      '0_1',
      '1 2',
      '+ 1',
      '--1',
      '1.0',
      '1e2',
      '雪',
      'NaN',
      '999999999999999999999999999999999999999999x',
    ]
    const booleans = [
      '',
      ' ',
      't',
      'tr',
      'tru',
      'true',
      'TRUE',
      'truex',
      'f',
      'fa',
      'fal',
      'fals',
      'false',
      'y',
      'ye',
      'yes',
      'n',
      'no',
      'o',
      'on',
      'of',
      'off',
      'ON',
      'OFF',
      '1',
      '0',
      '10',
      '2',
      '-1',
      ' \tYES\r\n',
      't r',
      '雪',
    ]
    const numerics = [
      '',
      ' ',
      '0',
      '-0.00',
      '+1.2300',
      '123456789012345678901234567890.0012300',
      'NaN',
      '+NaN',
      '-NaN',
      'inf',
      'Infinity',
      '+Inf',
      '-Infinity',
      'InfinitYx',
      '0x_FF',
      '0x__FF',
      '0b10_1',
      '0o7_7',
      '00.10',
      '000e2',
      '1_2.3_4',
      '1e1_0',
      '1.e2',
      '.5e1',
      '.',
      '.e2',
      '1e',
      '1e+',
      '1e_2',
      '1e1000',
      '1e-1000',
      '1e200000',
      '1e-20000',
      '1e999999999x',
      '1e999999999999',
      '0e-999999999',
      '999999999999999999999999999999999999999999.00x',
      '1__2',
      '1._2',
      '1_.2',
      '-0x_ffff',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const [mode, type, values] of [
      [0, 'smallint', integers],
      [1, 'integer', integers],
      [2, 'bigint', integers],
      [3, 'boolean', booleans],
      [4, 'numeric', numerics],
      [5, 'input_label', ['', 'new', '雪', 'NULL', 'null', ' new', 'new ', 'bad']],

      [6, 'varchar(2)[]', ['{abcdef}', '{雪😊abc}', '{"",NULL}', '{}', '{NULL}']],
      [7, 'character(3)[]', ['{a}', '{abcdef}', '{雪😊}', '{}', '{NULL}']],
      [
        8,
        'numeric(4,1)[]',
        ['{1.25}', '{-1.25}', '{999.95}', '{999999,bad}', '{NaN}', '{}', '{NULL}'],
      ],
      [9, 'bit(2)[]', ['{1}', '{10101}', '{xF}', '{}', '{NULL}']],
      [10, 'bit varying(2)[]', ['{1}', '{10101}', '{xF}', '{}', '{NULL}']],
      [11, 'time(1)[]', ['{12:34:56.150001}', '{23:59:59.999999}', '{}', '{NULL}']],
      [12, 'timetz(1)[]', ['{"12:34:56.150001+03"}', '{"23:59:59.999999+00"}', '{}', '{NULL}']],
      [
        13,
        'timestamp(1)[]',
        ['{"2000-01-01 00:00:00.15"}', '{"1999-12-31 23:59:59.85"}', '{}', '{NULL}'],
      ],
      [
        14,
        'timestamptz(1)[]',
        ['{"2000-01-01 00:00:00.15+00"}', '{"1999-12-31 23:59:59.85+03"}', '{}', '{NULL}'],
      ],
      [
        15,
        'interval(1)[]',
        ['{"1 month 2 days 00:00:00.15"}', '{"-0.15 seconds"}', '{}', '{NULL}'],
      ],
    ] as const) {
      for (const value of values) {
        let expected: Outcome = { kind: 'True' },
          output: string | null = null
        try {
          const cell = mode >= 6 ? `($1::text::${type})[1]` : `$1::text::${type}`
          const send = (
            {
              9: 'bit_send',
              10: 'varbit_send',
              11: 'time_send',
              12: 'timetz_send',
              13: 'timestamp_send',
              14: 'timestamptz_send',
              15: 'interval_send',
            } as Record<number, string>
          )[mode]
          const query =
            mode === 6 || mode === 7
              ? `SELECT encode(convert_to((array_to_json($1::text::${type})->>0),'UTF8'),'hex') AS value`
              : send
                ? `SELECT encode(pg_catalog.${send}(${cell}),'hex') AS value`
                : `SELECT (${cell})::text AS value`
          output = (await pg.query<{ value: string }>(query, [value])).rows[0]!.value
        } catch (error) {
          const code = (error as { code: string }).code
          if (typeof code !== 'string')
            throw new Error(JSON.stringify({ type, source: value, error: String(error) }), {
              cause: error,
            })
          expect(code, JSON.stringify({ type, source: value, error: String(error) })).toMatch(
            /^[A-Z0-9]{5}$/,
          )
          expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        references.push({ type, source: value, output, expected })
        fixtures.push({
          name: 'scalar',
          row: { source: known(value), expected: known(output), mode: known(mode) },
          expected,
        })
      }
      for (const [source, expected] of [
        [{ kind: 'Null' }, { kind: 'True' }],
        [{ kind: 'Unknown' }, { kind: 'Unknown' }],
        [
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ],
      ] as const)
        fixtures.push({
          name: 'scalar',
          row: { source, expected: known(null), mode: known(mode) },
          expected,
        })
    }
    const evaluatorSource =
      'pub fn evaluate_check(source:TextValue,expected:TextValue,mode:Int4Value)->CheckOutcome {let result=scalar_input_probe(source,expected,mode);check_from_bool(result)}'
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({ path: 'test/scalar_input.rs', source: probe })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported',
          entryName: 'evaluate_check',
          inputs: [
            { name: 'source', rustName: 'source', type: 'pg_catalog.text', rustType: 'TextValue' },
            {
              name: 'expected',
              rustName: 'expected',
              type: 'pg_catalog.text',
              rustType: 'TextValue',
            },
            { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          ],
        },
      ],
    }
    await mkdir('artifacts/scalar-input', { recursive: true })
    await writeFile(
      'artifacts/scalar-input/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/scalar-input/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(directory, 'scalarinputparity', group, ['scalar'], fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('retains JSONPath number conversion errors, finite numeric strings, silent suppression and lazy guards through the shared SQL input parser', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-number-input-'))
  try {
    await pg.exec(
      'CREATE TABLE number_inputs(source text,expected text,bypass boolean); CREATE TABLE number_oracle(LIKE number_inputs)',
    )
    const expressions = {
      normal:
        'jsonb_path_query_first(source::jsonb,\'$.number()\')::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      silent:
        'jsonb_path_query_first(source::jsonb,\'$.number()\',\'{}\',true)::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      guarded:
        'bypass OR jsonb_path_query_first(source::jsonb,\'$.number()\')::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'number_inputs')!
    const plans = Object.entries(expressions).map(([name, sql]) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          [],
          [],
          'source',
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      defaultCtype: 'C.UTF-8',
      serverEncoding: 'UTF8',
    })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const value of [
      '.',
      '.e2',
      ' . ',
      '.5',
      '1.',
      '1.e2',
      '+1.2300',
      '-0.00',
      'NaN',
      'Infinity',
      '-Infinity',
      '0x_FF',
      '0b10_1',
      '0o7_7',
      '00.10',
      '1_2.3_4',
      '1e1_0',
      '1e200000',
      '1e-20000',
      '1e999999999x',
      '1e999999999999',
      '0e-999999999',
      '1__2',
      '1e_2',
    ]) {
      for (const [name, sql] of Object.entries(expressions)) {
        const source = JSON.stringify(value),
          bypass = name === 'guarded'
        await pg.exec('TRUNCATE number_oracle')
        await pg.query('INSERT INTO number_oracle VALUES($1,NULL,$2)', [source, bypass])
        let output: string | null = null,
          expected: Outcome = { kind: 'True' }
        try {
          if (!bypass)
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT jsonb_path_query_first(source::jsonb,'$.number()','{}',${name === 'silent'})::text AS value FROM number_oracle`,
              )
            ).rows[0]!.value
          await pg.query('UPDATE number_oracle SET expected=$1', [output])
          expect(
            (await pg.query<{ value: boolean }>(`SELECT ${sql} AS value FROM number_oracle`))
              .rows[0]!.value,
          ).toBe(true)
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        const row: Row = {
          source: { kind: 'Value', value: source },
          expected: output === null ? { kind: 'Null' } : { kind: 'Value', value: output },
          bypass: { kind: 'Value', value: bypass },
        }
        fixtures.push({ name, row, expected })
        references.push({ name, source, output, expected })
      }
    }
    await mkdir('artifacts/scalar-input', { recursive: true })
    await writeFile(
      'artifacts/scalar-input/jsonpath-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/scalar-input/jsonpath-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonpathnumberinput',
      group,
      Object.keys(expressions),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
