import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { jsonInputForms, invalidJsonInputForms } from './check-json-input-forms.js'

it('normalizes JSONB logical values with shared JSON grammar/decoding, exact numbers, last keys, iterative nesting and owned snapshots in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-model-'))
  const callable = (name: string) => {
    const item = builtinCallables().find((c) => c.kind === 'function' && c.name === name)
    if (!item || !('rustName' in item)) throw new Error(name)
    return item.rustName
  }
  const equal = callable('texteq'),
    kind = callable('jsonb_typeof')
  const definitions = [
    { name: 'output', helper: 'jsonb_to_text', parser: 'jsonb_from_text', expected: true },
    { name: 'kind', helper: kind, parser: 'jsonb_from_text', expected: true },
    { name: 'nullness', helper: 'jsonb_is_null', parser: 'jsonb_from_text', expected: false },
    { name: 'coerced', helper: 'jsonb_to_text', parser: 'jsonb_test_coerced', expected: true },
    { name: 'snapshot', helper: 'jsonb_test_snapshot', parser: 'jsonb_from_text', expected: true },
  ]
  const entries = definitions.map((d) =>
    checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'jsonb_model',
      constraint: d.name,
    }),
  )
  const evaluatorSource = definitions
    .map(
      (
        d,
        index,
      ) => `pub fn ${entries[index]}(source: TextValue${d.expected ? ',expected: TextValue' : ''}) -> CheckOutcome {
    let parsed = ${d.parser}(source);
    let result = ${d.helper}(parsed);
    ${d.expected ? `let compared = ${equal}(result,expected);check_from_bool(compared)` : 'check_from_bool(result)'}
  }`,
    )
    .join('\n')
  const source = assembleCheckRust({ source: evaluatorSource, callables: [equal, kind] })
  source.modules
    .find((m) => m.name === 'checkruntime')!
    .files.push({
      path: 'test/jsonb_snapshots.rs',
      source: `
pub fn jsonb_test_coerced(input: TextValue) -> JsonbValue {
  if let TextValue::Error(error) = input { return JsonbValue::Error(error); };
  if let TextValue::Null = input { return JsonbValue::Null; };
  if let TextValue::Value(value) = input { return make_jsonb_value(value.as_str()); };
  JsonbValue::Unknown
}
fn jsonb_test_changed(input: JsonbValue) -> JsonbValue {
  if let JsonbValue::Value(payload) = input {
    let mut characters = payload.characters;
    let mut nodes = payload.nodes;
    characters.push('X');
    nodes[payload.root] = JsonbNode {kind:0,child:0,next:0,key_start:0,key_end:0,text_start:0,text_end:0};
    return JsonbValue::Value(JsonbPayload {characters:characters,nodes:nodes,root:payload.root});
  };
  input
}
pub fn jsonb_test_snapshot(input: JsonbValue) -> TextValue {
  let saved = input.clone();
  let changed = jsonb_test_changed(input.clone());
  let original_text = jsonb_to_text(input);
  let saved_text = jsonb_to_text(saved);
  let changed_text = jsonb_to_text(changed);
  if let TextValue::Value(text) = changed_text {
    if text.as_str() != "null" { return TextValue::Unknown; };
  };
  if let TextValue::Value(original) = original_text {
    if let TextValue::Value(previous) = saved_text {
      if original.as_str() == previous.as_str() { return TextValue::Value(original); };
      return TextValue::Unknown;
    };
  };
  saved_text
}`,
    })
  const group: ReturnType<typeof prepareCheckRustGroup> = {
    evaluatorSource,
    requiresRegex: false,
    source,
    checks: definitions.map((d, index) => ({
      kind: 'supported',
      entryName: entries[index]!,
      inputs: [
        { name: 'source', rustName: 'source', rustType: 'TextValue', type: 'pg_catalog.text' },
        ...(d.expected
          ? [
              {
                name: 'expected',
                rustName: 'expected',
                rustType: 'TextValue',
                type: 'pg_catalog.text',
              },
            ]
          : []),
      ],
    })),
  }
  const known = (value: string): Input => ({ kind: 'Value', value })
  const error = (state: string): Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  const fixtures: { name: string; row: Row; expected: Outcome }[] = []
  const oracle: {
    input: string
    output?: string
    kind?: string
    error?: string
    context?: boolean
  }[] = []
  const add = (name: string, input: Input, expected: string, outcome: Outcome) =>
    fixtures.push({ name, row: { source: input, expected: known(expected) }, expected: outcome })
  try {
    const inputs = new Set<string>([
      ...jsonInputForms,
      ...invalidJsonInputForms,
      '1e2',
      '1.230e-5',
      '1.230e5',
      '-0',
      '-0.000',
      '-0e2',
      '0e-3',
      '0e1073741823',
      '0e1073741824',
      '0e-16384',
      '1e131071',
      '1e-16383',
      '1e-16384',
      '{"aa":1,"b":2,"c":3,"a":4}',
      '{"a":1,"\\u0061":2}',
      '{"a":{"x":1},"a":{"y":2}}',
      '{"a":{"雪":1},"a":2}',
      '{"雪":1,"a":2,"雪":3}',
      '{"雪":"😊"}',
      '{"outer":{"雪":1}}',
      '{"aa":1,"é":2}',
      '[{"b":1,"a":2},{"z":[{"x":null}]}]',
      '[1e999999,]',
      '[1e999999x]',
      '[1e999999.]',
      '[1e999999+]',
      '[1e999999_]',
      '[1e999999 nullx]',
      '[1e999999 "\\u0000"]',
      '"\\u0000\\x"',
      '"\\u0000',
      '{"a":1e999999,"a":2}',
      '{"a":"\\ud800","a":2}',
    ])
    for (let code = 1; code < 32; code++)
      inputs.add('"\\u' + code.toString(16).padStart(4, '0') + '"')
    for (let seed = 0; seed < 20; seed++) {
      const keys = Array.from({ length: 20 }, (_, i) => 'k' + ((i * 13 + seed * 7) % 11))
      inputs.add(
        '{' +
          keys
            .map(
              (key, i) =>
                JSON.stringify(key) + ':' + (i % 3 === 0 ? '[null,{"z":' + i + '}]' : i + '.00'),
            )
            .join(',') +
          '}',
      )
    }
    for (const input of inputs) {
      let output = '',
        rootKind = '',
        state: string | undefined
      try {
        const row = (
          await pg.query<{ output: string; kind: string }>(
            'SELECT value::text output,jsonb_typeof(value) kind FROM (SELECT $1::jsonb value) q',
            [input],
          )
        ).rows[0]!
        output = row.output
        rootKind = row.kind
        oracle.push({ input, output, kind: rootKind })
      } catch (e) {
        state = (e as { code: string }).code
        expect(['22P02', '22P05', '22003'], input).toContain(state)
        oracle.push({ input, error: state })
      }
      const unavailableEscape = input === '"\\ud83d\\ude00"' || input === '"\\u00e9"'
      const keyEncoding = input === '{"aa":1,"é":2}' || input === '{"雪":1,"a":2,"雪":3}'
      for (const name of ['output', 'kind', 'nullness', 'coerced', 'snapshot']) {
        const outcome: Outcome =
          unavailableEscape || (keyEncoding && ['output', 'coerced', 'snapshot'].includes(name))
            ? { kind: 'Unknown' }
            : state
              ? name === 'coerced'
                ? { kind: 'Unknown' }
                : error(state)
              : name === 'nullness'
                ? { kind: 'False' }
                : { kind: 'True' }
        add(name, known(input), name === 'kind' ? rootKind : output, outcome)
      }
    }
    for (const input of ['"\\u00e9\\x"', '[1e999999 "\\u00e9"]', '{"a":"\\u00e9","a":2}']) {
      for (const name of definitions.map((d) => d.name))
        add(name, known(input), 'unused', { kind: 'Unknown' })
    }
    for (const input of [
      { kind: 'Null' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    ] as const)
      for (const name of definitions.map((d) => d.name))
        add(
          name,
          input,
          'unused',
          name === 'nullness' && input.kind === 'Null'
            ? { kind: 'True' }
            : input.kind === 'Error'
              ? input
              : { kind: input.kind },
        )
    const depth = 16384,
      nested = '['.repeat(depth) + '0' + ']'.repeat(depth)
    add('output', known(nested), nested, { kind: 'True' })
    add('kind', known(nested), 'array', { kind: 'True' })
    add('snapshot', known(nested), nested, { kind: 'True' })
    add('output', known('{"a":1}'), '{"a":2}', { kind: 'False' })
    await mkdir('artifacts/jsonb-model', { recursive: true })
    await writeFile('artifacts/jsonb-model/oracle.json', JSON.stringify(oracle, null, 2) + '\n')
    await runCheckParity(
      directory,
      'jsonb_model',
      group,
      definitions.map((d) => d.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
