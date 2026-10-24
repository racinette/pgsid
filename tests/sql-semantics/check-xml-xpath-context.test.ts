import { it } from 'vitest'
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
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'

it('retains reached XPath requirement provenance separately from SQL errors and partial result shape in every target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-context-')),
    packet = 'artifacts/goal-checks/xml-xpath-sql-active'
  const known = (value: string | number): Input => ({ kind: 'Value', value })
  try {
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_context',
      constraint: 'matches',
    })
    const evaluatorSource = `pub fn ${entry}(input:TextValue,path:TextValue,mapping:ArrayValue,mode:Int4Value,projection:Int4Value,expected:Int4Value)->CheckOutcome {
    let result=xpath_sql_context_probe(input,path,mapping,mode,projection,expected);check_from_bool(result)
  }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_xpath_sql.rs'))!.source += `
pub fn xpath_sql_context_probe(input:TextValue,path:TextValue,mapping:ArrayValue,mode:Int4Value,projection:Int4Value,expected:Int4Value)->BoolValue {
 if let Int4Value::Value(profile)=mode {if let Int4Value::Value(operation)=projection {
  let mut xml=XmlValue::Unknown;
  if profile==1 {xml=xml_from_rendered_text(input);}else{xml=xml_from_storage_text(input);};
  let mut limit: i32=5000;if profile==5{limit=0;};
  let result=xpath_sql_execute(path,xml,mapping,profile!=2,limit,1,profile!=3 && profile!=13,profile<10);
  let mut value=Int4Value::Value(result.state);
  if operation==1 {value=sql__pg_catalog__cardinality__m1rn(result.output);};
  if operation==2 {
   value=Int4Value::Unknown;let existence=result.present;
   if let BoolValue::Error(error)=existence {value=Int4Value::Error(error);};
   if let BoolValue::Null=existence {value=Int4Value::Null;};
   if let BoolValue::Value(present)=existence {let mut number: i32=0;if present{number=1;};value=Int4Value::Value(number);};
  };
  return sql__pg_catalog__int4eq__lrxe(value,expected);
 };};BoolValue::Unknown
}
`
    const inputs = [
      ['input', 'pg_catalog.text', 'TextValue'],
      ['path', 'pg_catalog.text', 'TextValue'],
      ['mapping', 'array:pg_catalog.text', 'ArrayValue'],
      ['mode', 'pg_catalog.int4', 'Int4Value'],
      ['projection', 'pg_catalog.int4', 'Int4Value'],
      ['expected', 'pg_catalog.int4', 'Int4Value'],
    ].map(([name, type, rustType]) => ({
      name: name!,
      rustName: name!,
      type: type!,
      rustType: rustType!,
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const empty: OwnedArrayInputPayload = {
      elementType: 'pg_catalog.text',
      elementKind: 8,
      dimensions: [],
      elements: [],
      nullBitmap: { kind: 'Value', value: false },
    }
    const unknownUri: OwnedArrayInputPayload = {
      ...empty,
      dimensions: [
        { lower: 1, length: 1 },
        { lower: 1, length: 2 },
      ],
      elements: [{ kind: 'Text', value: 'p' }, { kind: 'Unknown' }],
    }
    const invalid: OwnedArrayInputPayload = {
      ...empty,
      dimensions: [{ lower: 1, length: 2 }],
      elements: [
        { kind: 'Text', value: 'p' },
        { kind: 'Text', value: 'urn:p' },
      ],
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (
      input: Input,
      path: string,
      mode: number,
      projection: number,
      expected: number,
      outcome: Outcome = { kind: 'True' },
      mapping: OwnedArrayInputPayload = empty,
    ) =>
      fixtures.push({
        name: 'matches',
        row: {
          input,
          path: known(path),
          mapping: { kind: 'Value', value: mapping },
          mode: known(mode),
          projection: known(projection),
          expected: known(expected),
        },
        expected: outcome,
      })
    for (const [input, path, mode, state] of [
      ['<r/>', 'false()', 0, 0],
      ['<r/>', 'false()', 1, 0],
      ['plain', 'false()', 1, 5],
      ['<?xml version="a"b"?><r/>', 'false()', 1, 11],
      ['<r/>', 'false()', 2, 10],
      ['<r/>', '', 2, 5],
      ['<r/>', '1 div 3', 3, 6],
      ['<r/>', '1', 3, 0],
      ['<r/>', '1 div 3', 13, 0],
      ['<r/>', "number('1e23')", 0, 1],
      ['<r/>', "true() or number('1e23')", 0, 0],
      ['<r/>', '('.repeat(52) + '1' + ')'.repeat(52), 5, 4],
      ['<!DOCTYPE r [<!NOTATION n SYSTEM "n"><!NOTATION m SYSTEM "m">]><r/>', '/', 0, 7],
    ] as const)
      add(known(input), path, mode, 0, state)
    add(known('<r/>'), '/p:r', 0, 0, 12, { kind: 'True' }, unknownUri)
    add(known('plain'), '', 2, 0, 5, { kind: 'True' }, invalid)
    add({ kind: 'Null' }, '(', 0, 0, 8)
    add({ kind: 'Unknown' }, '(', 0, 0, 9)
    add({ kind: 'Error', value: { state: parseInt('22003', 36) } }, '(', 0, 0, 5)
    for (const [path, count, present] of [
      ['//missing', 0, 0],
      ["''", 1, 1],
      ['false()', 1, 1],
      ['1 div 3', 1, 1],
    ] as const) {
      add(known('<r/>'), path, 3, 1, count)
      add(known('<r/>'), path, 3, 2, present)
    }
    const notation = '<!DOCTYPE r [<!NOTATION n SYSTEM "n"><!NOTATION m SYSTEM "m">]><r/>'
    add(known(notation), '/', 0, 1, 1)
    add(known(notation), '/', 0, 2, 1)
    add(known('<r/>'), '1 div 3', 13, 2, 1)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/context-reference.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          states: [0, 1, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          projections: ['reached state', 'array cardinality', 'existence'],
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpathcontext', group, ['matches'], fixtures)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
