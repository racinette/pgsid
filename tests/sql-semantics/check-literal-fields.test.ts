import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readLiteralFields, type LiteralFields } from '../../src/catalog/literal-fields.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { runCheckParity } from '../../tools/check-rust/parity.js'

it('decodes stored range, multirange and flattened array fields with shared grammar in Wasm, Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-literal-fields-'))
  try {
    await pg.exec(
      'CREATE TYPE text_span AS RANGE(subtype=text,multirange_type_name=text_multirange)',
    )
    const cases: { kind: 'range' | 'multirange' | 'array'; text: string; result: LiteralFields }[] =
      []
    const add = (kind: 'range' | 'multirange' | 'array', text: string, result: LiteralFields) => {
      expect(readLiteralFields(kind, text), JSON.stringify({ kind, text })).toEqual(result)
      cases.push({ kind, text, result })
    }
    for (const text of [
      'empty',
      '(,)',
      '[,z]',
      '["",z)',
      '["$1,000.00","$2,000.00"]',
      '["a\\\\b","z\\\"z"]',
      '["a""b",z]',
      '[é,雪)',
      '[NULL,null]',
      ' [ alpha , omega ) ',
    ]) {
      const row = (
        await pg.query<{ empty: boolean; lower: string | null; upper: string | null }>(
          'SELECT isempty(v) empty,lower(v),upper(v) FROM (SELECT $1::text_span v) input',
          [text],
        )
      ).rows[0]!
      add('range', text, { kind: 'Value', fields: row.empty ? [] : [row.lower, row.upper] })
    }
    for (const text of [
      '{}',
      '{NULL,"NULL","",null,"a,b","a\\\\b","é雪"}',
      '[-2:0]={a,NULL,c}',
      '{{a,b},{c,d}}',
      '{"[1,2]","{[3,4]}",empty}',
    ]) {
      const rows = (
        await pg.query<{ value: string | null }>(
          'SELECT value FROM unnest($1::text[]) WITH ORDINALITY AS input(value,position) ORDER BY position',
          [text],
        )
      ).rows
      add('array', text, { kind: 'Value', fields: rows.map((row) => row.value) })
    }
    for (const [text, fields] of [
      ['{}', []],
      ['{empty}', ['empty']],
      [' { [a,z) , empty , (,z] } ', ['[a,z)', 'empty', '(,z]']],
      ['{["$1,000.00","$2,000.00"],["é","雪"]}', ['["$1,000.00","$2,000.00"]', '["é","雪"]']],
      ['{[1,2,3]}', ['[1,2,3]']],
    ] as const)
      add('multirange', text, { kind: 'Value', fields })
    for (const [kind, texts, type] of [
      ['range', ['bad', '[a,b,c]', '["a,b)', '[a,b]tail'], 'text_span'],
      ['array', ['bad', '{a,}', '{{a},{b,c}}', '[0:2]={a,b}'], 'text[]'],
      ['multirange', ['bad', '{[a,b),}', '{[a,b)'], 'text_multirange'],
    ] as const) {
      for (const text of texts) {
        let code = ''
        try {
          await pg.query(`SELECT $1::${type}`, [text])
        } catch (error) {
          code = (error as { code: string }).code
        }
        expect(code).toBe('22P02')
        add(kind, text, { kind: 'Error', state: parseInt(code, 36) })
      }
    }
    await pg.exec('SET array_nulls=off')
    expect(
      (await pg.query<{ value: string }>("SELECT ('{NULL}'::text[])[1] value")).rows[0]!.value,
    ).toBe('NULL')
    expect(readLiteralFields('array', '{NULL}')).toEqual({ kind: 'Value', fields: [null] })
    const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'literal_fields',
        constraint: 'probe',
      }),
      evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=literal_fields_probe(mode);check_from_bool(result)}`,
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    const probes = cases.map(({ kind, text, result }) => {
      const input = `literal_text_fields(make_text_value(${rustStringLiteral(text)}),${['range', 'multirange', 'array'].indexOf(kind)})`
      if (result.kind === 'Error')
        return `return BoolValue::Value(array_is_null(${input})==BoolValue::Error(make_sql_error(${result.state})));`
      if (result.kind !== 'Value') throw new Error('Unexpected grammar result')
      return `let mut fields:Vec<ArrayElement>=Vec::new();${result.fields.map((field) => `fields.push(${field === null ? 'ArrayElement::Null' : `ArrayElement::Text(${rustStringLiteral(field)}.to_owned())`});`).join('')}return literal_fields_equal(${input},literal_text_fields_value(fields));`
    })
    probes.push(`return literal_fields_states();`)
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'tests/literal_fields.rs',
        source: `
fn literal_fields_equal(left:ArrayValue,right:ArrayValue)->BoolValue {
 if let ArrayValue::Value(a)=left {
  if let ArrayValue::Value(b)=right {
   if a.element_type!=b.element_type || a.element_kind!=b.element_kind || a.null_bitmap!=b.null_bitmap || a.dimensions.len()!=b.dimensions.len() || a.elements.len()!=b.elements.len(){return BoolValue::Value(false);};
   let mut index:usize=0;
   while index<a.dimensions.len(){if a.dimensions[index].lower!=b.dimensions[index].lower || a.dimensions[index].length!=b.dimensions[index].length{return BoolValue::Value(false);};index+=1;};
   index=0;
   while index<a.elements.len(){if array_element_to_text(a.elements[index].clone())!=array_element_to_text(b.elements[index].clone()){return BoolValue::Value(false);};index+=1;};
   return BoolValue::Value(true);
  };
 };
 BoolValue::Value(false)
}
fn literal_fields_states()->BoolValue {
 let error=make_sql_error(3452582);
 let mut kind:usize=0;
 while kind<3 {
  if array_is_null(literal_text_fields(TextValue::Null,kind as i32))!=BoolValue::Value(true){return BoolValue::Value(false);};
  if array_is_null(literal_text_fields(TextValue::Unknown,kind as i32))!=BoolValue::Unknown{return BoolValue::Value(false);};
  if array_is_null(literal_text_fields(TextValue::Error(error),kind as i32))!=BoolValue::Error(error){return BoolValue::Value(false);};
  kind+=1;
 };
 let original=literal_text_fields(make_text_value("[a,z]"),0);
 let saved=original.clone();
 if let ArrayValue::Value(value)=original {let mut changed=value.elements;changed[0]=ArrayElement::Unknown;};
 if array_is_null(literal_text_fields(make_text_value("{}"),99))!=BoolValue::Unknown{return BoolValue::Value(false);};
 literal_fields_equal(saved,literal_text_fields(make_text_value("[a,z]"),0))
}
pub fn literal_fields_probe(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {
 ${probes.map((probe, index) => `if selected==${index}{${probe}};`).join('\n')}
 };BoolValue::Unknown
}`,
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
    await runCheckParity(
      directory,
      'literalfields',
      group,
      ['probe'],
      probes.map((_, index) => ({
        name: 'probe',
        row: { mode: { kind: 'Value', value: index } },
        expected: { kind: 'True' },
      })),
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
