import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('quotes logical range bounds like PostgreSQL and preserves omitted bounds, partial outputs and owned snapshots', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-output-format-'))
  try {
    await pg.exec(
      'CREATE TYPE rendered_text_range AS RANGE(subtype=text,collation="C");CREATE TABLE range_rendered(payload text,expected text,CHECK(rendered_text_range(payload,payload,\'[]\')::text=expected))',
    )
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'rendered',
      constraint: 'format',
    })
    const stateEntry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'rendered',
      constraint: 'states',
    })
    const evaluatorSource = `pub fn ${entry}(payload: TextValue, expected: TextValue) -> CheckOutcome {
      let lower = array_element_from_text(payload.clone());
      let upper = array_element_from_text(payload.clone());
      let span = range_from_coerced_bounds("public.rendered_text_range", "pg_catalog.text", 8, false, true, true, lower, upper);
      let actual = range_format_text(span, payload.clone(), payload);
      let result = sql__pg_catalog__texteq__aet8(actual, expected);
      check_from_bool(result)
    }
    pub fn ${stateEntry}() -> CheckOutcome {
      let result = range_output_state_probe();
      check_from_bool(result)
    }`
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: ['sql__pg_catalog__texteq__aet8'],
    })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/range_output_probe.rs',
        source: `
pub fn range_output_state_probe() -> BoolValue {
  let mut bounds: Vec<ArrayElement> = Vec::new();
  bounds.push(ArrayElement::Null);
  bounds.push(ArrayElement::Int4(10));
  let span = make_coerced_range_value(RangePayload { type_name: "pg_catalog.int4range".to_owned(), element_type: "pg_catalog.int4".to_owned(), element_kind: 2, support: range_builtin_support("pg_catalog.int4range","pg_catalog.int4",2), empty: false, lower_inclusive: false, upper_inclusive: false, bounds });
  let snapshot = span.clone();
  let failure = TextValue::Error(make_sql_error(3360674));
  if range_format_text(span.clone(), failure.clone(), make_text_value("10")) != make_text_value("(,10)") { return BoolValue::Value(false); };
  if range_format_text(span.clone(), failure.clone(), TextValue::Unknown) != TextValue::Unknown { return BoolValue::Value(false); };
  if range_format_text(span.clone(), TextValue::Unknown, failure.clone()) != failure { return BoolValue::Value(false); };
  if range_to_text(snapshot) != make_text_value("(,10)") { return BoolValue::Value(false); };
  let lower = ArrayElement::Int4(0);
  let upper = ArrayElement::Int4(10);
  let both = range_from_coerced_bounds("pg_catalog.int4range", "pg_catalog.int4", 2, false, true, false, lower, upper);
  if range_format_text(both.clone(), TextValue::Unknown, failure.clone()) != TextValue::Unknown { return BoolValue::Value(false); };
  if range_format_text(both.clone(), failure.clone(), TextValue::Unknown) != failure { return BoolValue::Value(false); };
  if range_format_text(both, TextValue::Null, failure.clone()) != TextValue::Unknown { return BoolValue::Value(false); };
  let empty = range_from_coerced_bounds("pg_catalog.int4range", "pg_catalog.int4", 2, true, false, false, ArrayElement::Unknown, ArrayElement::Unknown);
  if range_format_text(empty, failure.clone(), TextValue::Unknown) != make_text_value("empty") { return BoolValue::Value(false); };
  if range_format_text(RangeValue::Null, failure.clone(), failure.clone()) != TextValue::Null { return BoolValue::Value(false); };
  if range_format_text(RangeValue::Unknown, failure.clone(), failure.clone()) != TextValue::Unknown { return BoolValue::Value(false); };
  if range_format_text(RangeValue::Error(make_sql_error(3360674)), TextValue::Unknown, TextValue::Unknown) != failure { return BoolValue::Value(false); };
  BoolValue::Value(true)
}`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported',
          entryName: entry,
          inputs: ['payload', 'expected'].map((name) => ({
            name,
            rustName: name,
            type: 'pg_catalog.text',
            rustType: 'TextValue',
          })),
        },
        { kind: 'supported', entryName: stateEntry, inputs: [] },
      ],
    }
    const texts = [
      '',
      'NULL',
      'null',
      'empty',
      '{}',
      '{a}',
      'ordinary',
      '(',
      ')',
      '[',
      ']',
      ',',
      'a b',
      '\t',
      '\r',
      '\n',
      '\v',
      '\f',
      '"',
      '\\',
      'a"b',
      'a\\b',
      '"\\',
      'é',
      '😀',
      'a\u00a0b',
      'a\u2003b',
      'a\tb',
      'a\rb',
      'a\nb',
      'a\vb',
      'a\fb',
      'a,b[]()"\\😀',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const outputs: { text: string; output: string }[] = []
    for (const text of texts) {
      const output = (
        await pg.query<{ output: string }>("SELECT rendered_text_range($1,$1,'[]')::text output", [
          text,
        ])
      ).rows[0]!.output
      outputs.push({ text, output })
      for (const expected of [output, output + 'x']) {
        let outcome: Outcome = { kind: 'True' }
        try {
          await pg.query('INSERT INTO range_rendered VALUES($1,$2)', [text, expected])
        } catch (error) {
          expect((error as { code: string }).code).toBe('23514')
          outcome = { kind: 'False' }
        }
        fixtures.push({
          name: 'format',
          row: {
            payload: { kind: 'Value', value: text },
            expected: { kind: 'Value', value: expected },
          },
          expected: outcome,
        })
      }
    }
    fixtures.push({ name: 'states', row: {}, expected: { kind: 'True' } })
    await runCheckParity(directory, 'rangeoutputformat', group, ['format', 'states'], fixtures)
    expect(outputs.find((r) => r.text === 'NULL')!.output).toBe('[NULL,NULL]')
    expect(outputs.find((r) => r.text === '')!.output).toBe('["",""]')
    await mkdir('artifacts/check-range-output', { recursive: true })
    await writeFile(
      'artifacts/check-range-output/format-report.json',
      JSON.stringify(
        {
          inserts: texts.length * 2,
          fixtures: fixtures.length,
          outputs,
          customRangeBinder: 'pending; formatter is exercised directly with text parameters',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
