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

it('derives JSONPath object offsets from logical JSONB values in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-object-offsets-'))
  const entry = checkRustEntryName({
    schema: 'public',
    kind: 'table',
    owner: 'object_offsets',
    constraint: 'offset',
  })
  const evaluatorSource = `pub fn ${entry}(document: TextValue, path: TextValue, expected: TextValue, utf8: BoolValue) -> CheckOutcome {
 let result = jsonpath_offset_probe(document,path,expected,utf8);
 check_from_bool(result)
}`
  try {
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: ['sql__pg_catalog__jsonb_path_query_first__w0y6'],
    })
    expect(source.modules.some((module) => module.name === 'regex_engine')).toBe(true)
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/jsonpath_offsets.rs',
        source: `
pub fn jsonpath_offset_probe(document:TextValue,path:TextValue,expected:TextValue,utf8:BoolValue)->BoolValue {
 let input=jsonb_from_text(document);
 let query=jsonpath_from_coerced_source_utf8(path);
 if let JsonbValue::Value(payload)=input {
  if let JsonpathValue::Value(path)=query {
   if let BoolValue::Value(encoding)=utf8 {
    let mut value=payload;
    if encoding {value=jsonpath_execution_utf8_payload(value);};
    let offsets=jsonb_ordered_object_offsets(&value,encoding);
    let mut empty_nodes:Vec<JsonbNode>=Vec::new();
    empty_nodes.push(JsonbNode{kind:-1,child:0,next:0,key_start:0,key_end:0,text_start:0,text_end:0});
    empty_nodes.push(JsonbNode{kind:6,child:0,next:0,key_start:0,key_end:0,text_start:0,text_end:0});
    let empty_characters:Vec<char>=Vec::new();
    let vars=JsonbPayload{characters:empty_characters,nodes:empty_nodes,root:1};
    let context=jsonpath_execution_make_context(value,vars,path,true,encoding,true,false,0,false,"");
    let sequence=jsonpath_execution_walk(context.clone(),false);
    if sequence.unknown || sequence.error>0 || sequence.items.len()!=1 {return BoolValue::Unknown;};
    let reference=sequence.items[0];
    let offset=offsets[reference.node].clone();
    if let TextValue::Value(number)=expected {
     let comparison=numeric_compare(offset,NumericValue::Value(number));
     if let Int4Value::Value(order)=comparison {return BoolValue::Value(order==0);};
    };
   };
  };
 };
 BoolValue::Unknown
}`,
      })
    const inputs = ['document', 'path', 'expected', 'utf8'].map((name) => ({
      name,
      rustName: name,
      type: name === 'utf8' ? 'pg_catalog.bool' : 'pg_catalog.text',
      rustType: name === 'utf8' ? 'BoolValue' : 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: true,
      checks: [{ kind: 'supported', entryName: entry, inputs }],
    }
    const value = (input: string | boolean): Input => ({ kind: 'Value', value: input })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    const documents = new Set([
      '{"a":1}',
      '{"a":{"x":true},"long":{"y":null}}',
      '[{"a":1},{"b":2}]',
      '{"a":["x",1.2300,{"n":1}],"b":{"v":2}}',
      '{"a":{"old":1},"a":{"new":2}}',
      '{"aa":{"n":1},"é":{"n":2},"雪":{"n":3},"😀":{"n":4}}',
      '["é",{"a":1},"雪",{"b":2},"😀",{"c":3}]',
      '{"a":"é","b":{"v":1},"c":"雪","d":{"v":2}}',
    ])
    for (const number of [
      '0',
      '-0.000',
      '1.2300',
      '10000',
      '10001',
      '1e252',
      '1e256',
      '1e-63',
      '1e-64',
      '0e-63',
      '0e-64',
      '1e131071',
      '1e-16383',
    ]) {
      documents.add(`[${number},{"value":true}]`)
      documents.add(`{"a":${number},"b":{"value":true}}`)
    }
    for (let i = 0; i < 40; i++) {
      documents.add(
        JSON.stringify({
          ['k'.repeat((i % 8) + 1)]: ['x'.repeat(i % 7), i, { a: i, b: null }],
          z: { deep: [{ ok: true }] },
        }),
      )
    }
    for (const document of documents) {
      const canonical = (
        await pg.query<{ text: string }>('SELECT $1::jsonb::text AS text', [document])
      ).rows[0]!.text
      const pending: { value: unknown; path: string }[] = [
        { value: JSON.parse(canonical), path: '$' },
      ]
      while (pending.length) {
        const next = pending.pop()!
        if (Array.isArray(next.value))
          next.value.forEach((value, index) =>
            pending.push({ value, path: next.path + `[${index}]` }),
          )
        else if (next.value && typeof next.value === 'object') {
          const entries = Object.entries(next.value)
          if (entries.length) {
            const path = next.path + '.keyvalue().id'
            const expected = (
              await pg.query<{ text: string }>(
                'SELECT jsonb_path_query_first($1::jsonb,$2::jsonpath)::text AS text',
                [document, path],
              )
            ).rows[0]!.text
            expect(expected).toMatch(/^\d+$/)
            references.push({ document, path, expected })
            for (const utf8 of /[^\x00-\x7f]/u.test(document) ? [true] : [false, true])
              fixtures.push({
                name: 'offset',
                row: {
                  document: value(document),
                  path: value(next.path),
                  expected: value(expected),
                  utf8: value(utf8),
                },
                expected: { kind: 'True' },
              })
          }
          for (const [key, value] of entries)
            pending.push({ value, path: next.path + '.' + JSON.stringify(key) })
        }
      }
    }
    for (const [document, path, known] of [
      ['{"é":{"v":1}}', '$', true],
      ['{"é":{"v":1}}', '$."é"', true],
      ['{"éé":{"v":1}}', '$."éé"', false],
      ['["é",{"v":1}]', '$[1]', true],
      ['["éé",{"v":1}]', '$[1]', false],
      ['[{"v":1},"é"]', '$[0]', true],
      ['{"aa":{"v":1},"é":{"v":2}}', '$.aa', false],
    ] as const) {
      const expected = (
        await pg.query<{ text: string }>(
          'SELECT jsonb_path_query_first($1::jsonb,$2::jsonpath)::text AS text',
          [document, path + '.keyvalue().id'],
        )
      ).rows[0]!.text
      fixtures.push({
        name: 'offset',
        row: {
          document: value(document),
          path: value(path),
          expected: value(expected),
          utf8: value(false),
        },
        expected: { kind: known ? 'True' : 'Unknown' },
      })
      references.push({ document, path, expected, utf8: false, known })
    }
    await mkdir('artifacts/jsonpath-object-offsets', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-object-offsets/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonpath-object-offsets/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await runCheckParity(directory, 'jsonpathoffsetparity', group, ['offset'], fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
