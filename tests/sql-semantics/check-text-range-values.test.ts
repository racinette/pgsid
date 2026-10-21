import { it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'

it('owns text range and multirange bounds with C UTF8 comparison, grammar, normalization and deferred support', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-text-range-values-'))
  try {
    await pg.exec(
      `CREATE TYPE text_span AS RANGE(subtype=text,collation="C",multirange_type_name=text_set)`,
    )
    const cases: { rust: string; expected: Outcome; reference?: unknown }[] = []
    const outcome = (error: unknown): Outcome => ({
      kind: 'Error',
      value: { state: parseInt((error as { code: string }).code, 36) },
    })
    const text = (value: string | null) =>
      value === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(value)})`
    for (const value of [
      null,
      'empty',
      '(,)',
      '[a,z)',
      '["",z]',
      '["a b",z]',
      '["a,b",z]',
      '["a\\\\b",z]',
      '["a""b",z]',
      '[é,漢]',
      '[\uE000,𐀀]',
      '[𐀀,😀]',
      '[x,x)',
      '[x,x]',
      '[z,a)',
      'bad',
      '[a,z',
      '[a,b,c]',
    ]) {
      let expected: Outcome,
        output: string | null = null
      try {
        output = (
          await pg.query<{ value: string | null }>('SELECT ($1::text_span)::text value', [value])
        ).rows[0]!.value
        expected = { kind: output === null ? 'Null' : 'True' }
      } catch (error) {
        expected = outcome(error)
      }
      cases.push({
        rust: `sql__pg_catalog__texteq__aet8(range_to_text(text_range_input(${text(value)},8,1)),${text(output)})`,
        expected,
        reference: { value, output },
      })
    }
    for (const [lo, hi] of [
      [null, null],
      ['', 'z'],
      ['a', 'z'],
      ['z', 'a'],
      ['x', 'x'],
      ['é', '漢'],
      ['\uE000', '𐀀'],
      ['𐀀', '😀'],
      ['a,b', 'a\\b'],
    ] as (string | null)[][])
      for (const flags of ['[]', '[)', '(]', '()', 'bad', null]) {
        let expected: Outcome,
          output: string | null = null
        try {
          output = (
            await pg.query<{ value: string | null }>(
              'SELECT text_span($1::text,$2::text,$3::text)::text value',
              [lo, hi, flags],
            )
          ).rows[0]!.value
          expected = { kind: output === null ? 'Null' : 'True' }
        } catch (error) {
          expected = outcome(error)
        }
        cases.push({
          rust: `sql__pg_catalog__texteq__aet8(range_to_text(range_construct_with_support("public.text_span","pg_catalog.text",8,array_element_from_text(${text(lo!)}),array_element_from_text(${text(hi!)}),${text(flags)},make_range_support(8,1))),${text(output)})`,
          expected,
          reference: { lo, hi, flags, output },
        })
      }
    const { builtinCallables } = await import('../../src/postgres/builtins/inventory.js')
    const callable = (name: string) => {
      const item = builtinCallables().find(
        (c) =>
          c.kind === 'function' &&
          c.schema === 'pg_catalog' &&
          c.name === name &&
          c.args.join(',') === 'pg_catalog.anyrange,pg_catalog.anyrange',
      )
      if (!item || item.kind !== 'function') throw new Error('Missing range callable: ' + name)
      return item.rustName
    }
    const binary = [
      ['=', 'range_eq'],
      ['<', 'range_lt'],
      ['&&', 'range_overlaps'],
      ['@>', 'range_contains'],
      ['-|-', 'range_adjacent'],
    ] as const
    const pairs = [
      ['empty', '[a,z)'],
      ['(,)', '[a,z)'],
      ['[a,m)', '[m,z)'],
      ['[a,m]', '[m,z)'],
      ['[a,z]', '[m,z]'],
      ['[é,漢]', '[\uE000,𐀀]'],
      ['[\uE000,𐀀]', '[𐀀,😀]'],
      ['["",z]', '[a,z]'],
    ]
    for (const [left, right] of pairs) {
      for (const [operator, name] of binary) {
        const result = (
          await pg.query<{ value: boolean | null }>(
            `SELECT $1::text_span ${operator} $2::text_span value`,
            [left, right],
          )
        ).rows[0]!.value
        cases.push({
          rust: `${callable(name)}(text_range_input(${text(left!)},8,1),text_range_input(${text(right!)},8,1))`,
          expected: { kind: result === null ? 'Null' : result ? 'True' : 'False' },
          reference: { left, right, operator },
        })
      }
      for (const [operator, name] of [
        ['+', 'range_union'],
        ['*', 'range_intersect'],
        ['-', 'range_minus'],
      ] as const) {
        let expected: Outcome,
          output: string | null = null
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT ($1::text_span ${operator} $2::text_span)::text value`,
              [left, right],
            )
          ).rows[0]!.value
          expected = { kind: 'True' }
        } catch (error) {
          expected = outcome(error)
        }
        cases.push({
          rust: `sql__pg_catalog__texteq__aet8(range_to_text(${callable(name)}(text_range_input(${text(left!)},8,1),text_range_input(${text(right!)},8,1))),${text(output)})`,
          expected,
          reference: { left, right, operator, output },
        })
      }
    }
    for (const value of [
      null,
      '{}',
      '{empty}',
      '{[a,m),[m,z)}',
      '{[m,z),[a,m]}',
      '{[a,b),[d,e)}',
      '{[é,漢],[\uE000,𐀀]}',
      '{[a,m),bad}',
      '{[a,m),[z,a)}',
    ]) {
      let expected: Outcome,
        output: string | null = null
      try {
        output = (
          await pg.query<{ value: string | null }>('SELECT ($1::text_set)::text value', [value])
        ).rows[0]!.value
        expected = { kind: output === null ? 'Null' : 'True' }
      } catch (error) {
        expected = outcome(error)
      }
      cases.push({
        rust: `sql__pg_catalog__texteq__aet8(multirange_to_text(multirange_from_text_with_support(${text(value)},"public.text_set","public.text_span","pg_catalog.text",8,make_range_support(8,1))),${text(output)})`,
        expected,
        reference: { value, output },
      })
    }
    cases.push(
      { rust: 'text_range_partial_states()', expected: { kind: 'True' } },
      { rust: 'text_range_snapshots()', expected: { kind: 'True' } },
    )
    const entryName = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'text_range_values',
      constraint: 'probe',
    })
    const evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=text_range_values_probe(mode);check_from_bool(result)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'tests/text_range_values.rs',
        source:
          String.raw`
fn text_range_input(input:TextValue,comparison:i32,canonical:i32)->RangeValue {
 range_from_text_with_support(input,"public.text_span","pg_catalog.text",8,make_range_support(comparison,canonical))
}
fn text_range_partial_states()->BoolValue {
 let error=make_sql_error(3452582);
 if range_is_null(text_range_input(TextValue::Null,8,1))!=BoolValue::Value(true){return BoolValue::Value(false);};
 if range_is_null(text_range_input(TextValue::Unknown,8,1))!=BoolValue::Unknown{return BoolValue::Value(false);};
 if range_is_null(text_range_input(TextValue::Error(error),8,1))!=BoolValue::Error(error){return BoolValue::Value(false);};
 if range_empty_state(text_range_input(make_text_value("empty"),0,0))!=BoolValue::Value(true){return BoolValue::Value(false);};
 if range_is_null(text_range_input(make_text_value("[a,z)"),0,1))!=BoolValue::Unknown{return BoolValue::Value(false);};
 if range_is_null(text_range_input(make_text_value("[a,z)"),8,0))!=BoolValue::Unknown{return BoolValue::Value(false);};
 let stored=range_from_profiled_bounds("public.text_span","pg_catalog.text",8,false,true,false,ArrayElement::Text("a".to_owned()),ArrayElement::Text("z".to_owned()),make_range_support(0,0));
 if range_to_text(stored.clone())!=make_text_value("[a,z)"){return BoolValue::Value(false);};
 if array_element_to_text(range_bound(stored.clone(),false))!=make_text_value("a"){return BoolValue::Value(false);};
 if range_support_valid(make_range_support(2,1),8){return BoolValue::Value(false);};
 if range_support_valid(make_range_support(8,8),8){return BoolValue::Value(false);};
 let failed=range_construct_with_support("public.text_span","pg_catalog.text",8,ArrayElement::Unknown,ArrayElement::Error(error),TextValue::Null,make_range_support(8,1));
 BoolValue::Value(range_is_null(failed)==BoolValue::Error(error))
}
fn text_range_snapshots()->BoolValue {
 let original=text_range_input(make_text_value("[a,z]"),8,1);
 let saved=original.clone();
 let mut known=false;
 if let RangeValue::Value(payload)=original {
  let mut changed=payload.bounds;
  known=true;
  changed[0]=ArrayElement::Text("changed".to_owned());
  if range_to_text(saved.clone())!=make_text_value("[a,z]"){return BoolValue::Value(false);};
 };
 if known==false{return BoolValue::Value(false);};
 let member=multirange_construct_single_with_support(saved.clone(),"public.text_set","public.text_span","pg_catalog.text",8,make_range_support(8,1));
 let extracted=multirange_boundary(member.clone(),false);
 if let RangeValue::Value(payload)=extracted {let mut changed=payload.bounds;changed[0]=ArrayElement::Text("changed".to_owned());};
 if multirange_to_text(member.clone())!=make_text_value("{[a,z]}"){return BoolValue::Value(false);};
 let mut elements:Vec<ArrayElement>=Vec::new();elements.push(array_element_from_multirange(member));
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension {lower:-2,length:1});
 let array=make_array_value(ArrayPayload {element_type:"public.text_set".to_owned(),element_kind:43,dimensions,elements,null_bitmap:make_bool_value(false)});
 let restored=array_element_to_multirange(array_flat_element(array.clone(),make_int4_value(0)));
 if let MultirangeValue::Value(payload)=restored {let mut changed=payload.ranges;changed[0]=text_range_input(make_text_value("[b,y)"),8,1);};
 let retained=array_element_to_multirange(array_flat_element(array,make_int4_value(0)));
 BoolValue::Value(multirange_to_text(retained)==make_text_value("{[a,z]}"))
}
pub fn text_range_values_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
` +
          cases.map((item, index) => `if selected==${index}{return ${item.rust};};`).join('\n') +
          `\n};BoolValue::Unknown\n}`,
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
    await mkdir('artifacts/text-range-values', { recursive: true })
    await writeFile(
      'artifacts/text-range-values/report.json',
      JSON.stringify(
        {
          cases: cases.length,
          nativeCases: cases.length - 2,
          sqlAdmission: false,
          references: cases.map((item) => item.reference ?? null),
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'textrangevalues',
      group,
      ['probe'],
      cases.map((item, index) => ({
        name: 'probe',
        row: { mode: { kind: 'Value', value: index } },
        expected: item.expected,
      })),
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
