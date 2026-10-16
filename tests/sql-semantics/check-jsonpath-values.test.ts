import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
import { expressions, invalid, deferred, validationCases } from './jsonpath-grammar-cases.js'

it('normalizes owned JSONPath graphs and canonical output in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-values-'))
  const value = (input: string): Input => ({ kind: 'Value', value: input })
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    const names = ['canonical', 'coerced', 'context', 'snapshot', 'is_null', 'guard', 'null']
    const entries = names.map((constraint) =>
      checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'jsonpath_values',
        constraint,
      }),
    )
    const evaluatorSource = entries
      .map(
        (entry, index) => `pub fn ${entry}(input: TextValue, expected: TextValue) -> CheckOutcome {
 let result = jsonpath_value_probe(input, expected, ${index}); check_from_bool(result)
}`,
      )
      .join('\n')
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: [],
      requiresRegex: true,
    })
    const operations = source.modules.find((module) => module.name === 'pg_catalog')!
    operations.files.find((file) => file.path.endsWith('/jsonpath_output.rs'))!.source += `
pub fn jsonpath_value_probe(input: TextValue, expected: TextValue, mode: i32) -> BoolValue {
 let mut parsed = jsonpath_unknown();
 if mode == 5 {
  let mut guard = CheckOutcome::True;
  if let TextValue::Null = input { guard = CheckOutcome::Null; };
  if let TextValue::Unknown = input { guard = CheckOutcome::Unknown; };
  if let TextValue::Error(error) = input { guard = CheckOutcome::Error(error); };
  parsed = jsonpath_from_case_guard(guard);
 } else if mode == 6 {
  parsed = jsonpath_null();
 } else if mode == 1 {
  parsed = jsonpath_from_coerced_source_utf8(input);
 } else {
  parsed = jsonpath_from_text_utf8(input, mode != 2);
 };
 parsed = jsonpath_from_coerced_value(parsed);
 if mode == 4 { return jsonpath_is_null(parsed); };
 if mode == 3 {
  let snapshot = parsed.clone();
  let mut changed_ok = false;
  if let JsonpathValue::Value(payload) = parsed {
   let mut nodes = payload.nodes;
   let mut characters = payload.characters;
   let root = payload.root;
   nodes[root] = JsonpathNode { kind: JSONPATH_NODE_TRUE, next: 0, left: 0, right: 0, text_start: 0, text_end: 0, first: 0, last: 0, flags: 0 };
   if characters.len() > 0 { characters[0] = 'X'; };
   let changed = JsonpathValue::Value(JsonpathPayload { nodes: nodes, characters: characters, root: root, lax: false });
   let output = jsonpath_to_text(changed);
   if let TextValue::Value(actual) = output { changed_ok = actual == "strict true"; };
  };
  if changed_ok == false { return BoolValue::Value(false); };
  parsed = snapshot;
 };
 let output = jsonpath_to_text(parsed);
 if let TextValue::Error(error) = output { return BoolValue::Error(error); };
 if let TextValue::Error(error) = expected { return BoolValue::Error(error); };
 if let TextValue::Unknown = output { return BoolValue::Unknown; };
 if let TextValue::Unknown = expected { return BoolValue::Unknown; };
 if let TextValue::Null = output {
  if let TextValue::Null = expected { return BoolValue::Value(true); };
  return BoolValue::Value(false);
 };
 if let TextValue::Value(actual) = output {
  if let TextValue::Value(wanted) = expected { return BoolValue::Value(actual == wanted); };
  return BoolValue::Value(false);
 };
 BoolValue::Unknown
}
`
    const inputs = ['input', 'expected'].map((name) => ({
      name,
      type: 'pg_catalog.text',
      rustName: name,
      rustType: 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: entries.map((entryName) => ({ kind: 'supported', entryName, inputs })),
      evaluatorSource,
      source,
      requiresRegex: true,
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const oracle: unknown[] = []
    const nonRoundtripping: unknown[] = []
    let roundtripReferences = 0
    const corpus = [
      ...new Set([
        ...expressions,
        ...invalid,
        ...deferred.map((item) => item.input),
        ...validationCases.map((item) => item.input),
        'strict ($.a + $[1 to 5, 7] ? (@ > 3).double()).type()',
        '(1).a',
        '(-1).a',
        '(!(exists($))).type()',
        '(($==1) is unknown).type()',
        '-(1).a',
        '- - -1.2300',
        '+ -0.000',
        '-0e5',
        '(-(+(-0.0100))).abs()',
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        '$[+1,-0.0,-0xFF,1+2,2*3 to -(1+2),last-1]',
        '$.decimal(-1,-2)',
        '$.decimal(+1.20,-0.00)',
        '1+(2+3)',
        '$?(@?(@?(@==1)==1)==1)',
        '(1+2)+3',
        '1/(2/3)',
        '!(exists($) || $ == 1) && $ > 0',
        '$ like_regex "a" flag "qqmmiissxx"',
        String.raw`$ . "\b\f\n\r\t\u0001\u001f\"\\"`,
        String.raw`$"雪😊" . "é"`,
        String.raw`"\u{1f600}\xFF\ud83d\ude00"`,
        '$.**{0 to last}.**{last to last}.**{2147483647 to last}',
      ]),
    ]
    for (const input of corpus) {
      let canonical: string | undefined
      const expected = await pg
        .query<{ canonical: string }>('SELECT $1::jsonpath::text canonical', [input])
        .then(
          (result) => {
            canonical = result.rows[0]!.canonical
            return { kind: 'True' } as Outcome
          },
          (failure: { code: string }) => error(failure.code),
        )
      fixtures.push({
        name: 'canonical',
        row: { input: value(input), expected: value(canonical ?? '') },
        expected,
      })
      oracle.push({ input, canonical, expected })
      if (canonical !== undefined) {
        roundtripReferences += 1
        const roundtrip = await pg
          .query<{ output: string }>('SELECT $1::jsonpath::text output', [canonical])
          .then(
            (result) => {
              expect(result.rows[0]!.output).toBe(canonical)
              return true
            },
            (failure: { code: string }) => {
              expect(failure.code).toBe('42601')
              nonRoundtripping.push({ input, canonical, sqlstate: failure.code })
              return false
            },
          )
        fixtures.push(
          { name: 'coerced', row: { input: value(input), expected: value(canonical) }, expected },
          {
            name: 'coerced',
            row: { input: value(canonical), expected: value(canonical) },
            expected: roundtrip ? expected : { kind: 'Unknown' },
          },
          { name: 'snapshot', row: { input: value(input), expected: value(canonical) }, expected },
        )
      }
    }
    for (const input of ['$', 'strict $', '1.2300', '"雪"', '$ like_regex "[" flag "q"']) {
      const canonical = (
        await pg.query<{ output: string }>('SELECT $1::jsonpath::text output', [input])
      ).rows[0]!.output
      fixtures.push({
        name: 'context',
        row: { input: value(input), expected: value(canonical) },
        expected: { kind: 'True' },
      })
    }
    fixtures.push({
      name: 'context',
      row: { input: value('$ like_regex "a"'), expected: value('') },
      expected: { kind: 'Unknown' },
    })
    const deepPattern = '(?='.repeat(65) + 'a' + ')'.repeat(65)
    const deepInput = '$ like_regex ' + JSON.stringify(deepPattern)
    const deepCanonical = (
      await pg.query<{ output: string }>('SELECT $1::jsonpath::text output', [deepInput])
    ).rows[0]!.output
    for (const input of [
      value('$'),
      { kind: 'Null' },
      { kind: 'Unknown' },
      error('22012'),
    ] as Input[])
      fixtures.push({
        name: 'guard',
        row: { input, expected: value('') },
        expected: input.kind === 'Error' ? (input as Outcome) : { kind: 'Unknown' },
      })
    fixtures.push({
      name: 'null',
      row: { input: value('$'), expected: { kind: 'Null' } },
      expected: { kind: 'True' },
    })
    fixtures.push(
      {
        name: 'canonical',
        row: { input: value(deepInput), expected: value(deepCanonical) },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'coerced',
        row: { input: value(deepCanonical), expected: value(deepCanonical) },
        expected: { kind: 'True' },
      },
    )
    for (const name of ['canonical', 'coerced', 'context']) {
      for (const input of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22012')] as Input[]) {
        fixtures.push({
          name,
          row: { input, expected: { kind: 'Null' } },
          expected: input.kind === 'Null' ? { kind: 'True' } : (input as Outcome),
        })
      }
    }
    for (const input of ['@', '$[last', '1e131072'])
      fixtures.push({
        name: 'coerced',
        row: { input: value(input), expected: value('') },
        expected: { kind: 'Unknown' },
      })
    for (const input of [
      value('$'),
      { kind: 'Null' },
      { kind: 'Unknown' },
      error('22012'),
    ] as Input[])
      fixtures.push({
        name: 'is_null',
        row: { input, expected: value('') },
        expected:
          input.kind === 'Value'
            ? { kind: 'False' }
            : input.kind === 'Null'
              ? { kind: 'True' }
              : (input as Outcome),
      })
    fixtures.push(
      {
        name: 'canonical',
        row: { input: value('('.repeat(1000) + '$' + ')'.repeat(1000)), expected: value('$') },
        expected: { kind: 'True' },
      },
      {
        name: 'canonical',
        row: { input: value('$' + '.a'.repeat(3000)), expected: value('$' + '."a"'.repeat(3000)) },
        expected: { kind: 'True' },
      },
      {
        name: 'canonical',
        row: {
          input: value('$?(' + '@?('.repeat(400) + '@==1' + ')==1'.repeat(400) + ')'),
          expected: value('$?(' + '@?('.repeat(400) + '@ == 1' + ') == 1'.repeat(400) + ')'),
        },
        expected: { kind: 'True' },
      },
    )
    await mkdir('artifacts/jsonpath-values', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-values/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await runCheckParity(directory, 'jsonpathvalueparity', group, names, fixtures)
    const scalarEvaluator = `pub fn ${entries[1]}(input: TextValue, expected: TextValue) -> CheckOutcome {
 let result = jsonpath_coerced_probe(input, expected); check_from_bool(result)
}`
    const scalarSource = assembleCheckRust({ source: scalarEvaluator, callables: [] })
    expect(scalarSource.modules.some((module) => module.name === 'regex_engine')).toBe(false)
    scalarSource.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.find((file) => file.path.endsWith('/jsonpath_output.rs'))!.source += `
pub fn jsonpath_coerced_probe(input: TextValue, expected: TextValue) -> BoolValue {
 let parsed = jsonpath_from_coerced_source_utf8(input);
 let output = jsonpath_to_text(parsed);
 if let TextValue::Error(error) = output { return BoolValue::Error(error); };
 if let TextValue::Unknown = output { return BoolValue::Unknown; };
 if let TextValue::Null = output {
  if let TextValue::Null = expected { return BoolValue::Value(true); };
  return BoolValue::Value(false);
 };
 if let TextValue::Value(actual) = output {
  if let TextValue::Value(wanted) = expected { return BoolValue::Value(actual == wanted); };
  return BoolValue::Value(false);
 };
 BoolValue::Unknown
}
`
    const scalarDirectory = join(directory, 'without-regex')
    await mkdir(scalarDirectory)
    await runCheckParity(
      scalarDirectory,
      'jsonpathcoercedparity',
      {
        checks: [{ kind: 'supported', entryName: entries[1]!, inputs }],
        evaluatorSource: scalarEvaluator,
        source: scalarSource,
        requiresRegex: false,
      },
      ['coerced'],
      fixtures.filter((fixture) => fixture.name === 'coerced'),
    )
    await writeFile(
      'artifacts/jsonpath-values/oracle.json',
      JSON.stringify(
        {
          scope:
            'Owned normalized graph, canonical UTF8 output and state/clone semantics; SQL binding/adapters and path execution remain pending.',
          fixtures: fixtures.length,
          postgresReferences: oracle.length + roundtripReferences + 6,
          nonRoundtripping,
          moduleForms: ['combined', 'split'],
          regexDependency:
            'Raw input validation only; coerced graph construction and output also execute without regex support',
          targets: ['Rust', 'Go', 'TypeScript'],
          oracle,
        },
        null,
        2,
      ) + '\n',
    )
    expect(fixtures.length).toBeGreaterThan(corpus.length)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
