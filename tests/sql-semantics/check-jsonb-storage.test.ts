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
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches JSONB stored-size accounting against PostgreSQL and checks format boundaries using compact logical values in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-storage-'))
  const definitions = ['exact', 'bounds', 'edge']
  const entries = definitions.map((constraint) =>
    checkRustEntryName({ schema: 'public', kind: 'table', owner: 'jsonb_storage', constraint }),
  )
  const evaluatorSource = `
pub fn ${entries[0]}(source:TextValue,expected:Int8Value)->CheckOutcome {
 let parsed=jsonb_from_text(source);
 let result=jsonb_storage_test_match(parsed,expected,true);
 check_from_bool(result)
}
pub fn ${entries[1]}(source:TextValue,expected:Int8Value)->CheckOutcome {
 let parsed=jsonb_from_text(source);
 let result=jsonb_storage_test_match(parsed,expected,false);
 check_from_bool(result)
}
pub fn ${entries[2]}(extra:Int4Value,unicode:BoolValue,discard:BoolValue)->CheckOutcome {
 let result=jsonb_storage_test_edge(extra,unicode,discard);
 check_from_bool(result)
}`
  const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
  source.modules
    .find((m) => m.name === 'checkruntime')!
    .files.push({
      path: 'test/jsonb_storage.rs',
      source: `
pub fn jsonb_storage_test_match(input:JsonbValue,expected:Int8Value,exact:bool)->BoolValue {
 if let JsonbValue::Error(error)=input{return BoolValue::Error(error);};
 if let JsonbValue::Value(value)=input {
  if let Int8Value::Value(bytes)=expected {
   let layout=jsonb_storage_layout(&value);
   if exact && layout.low!=layout.high {return BoolValue::Unknown;};
   return BoolValue::Value(bytes>=layout.low+4i64 && bytes<=layout.high+4i64);
  };
 };
 BoolValue::Unknown
}
pub fn jsonb_storage_test_edge(extra:Int4Value,unicode:BoolValue,discard:BoolValue)->BoolValue {
 if let Int4Value::Value(delta)=extra {
  if delta < -10 || delta > 10 {return BoolValue::Unknown;};
  let mut character='a';
  if let BoolValue::Value(wide)=unicode {if wide{character='é';};};
  let mut characters:Vec<char>=Vec::new();
  let mut index:usize=0;
  while index<1048576 {characters.push(character);index+=1;}
  let mut nodes:Vec<JsonbNode>=Vec::new();
  nodes.push(JsonbNode{kind:-1,child:0,next:0,key_start:0,key_end:0,text_start:0,text_end:0});
  nodes.push(JsonbNode{kind:5,child:2,next:0,key_start:0,key_end:0,text_start:0,text_end:0});
  index=0;
  while index<256 {
   let mut end:usize=1048576;
   let mut next=index+3;
   if index==255 {end=usize::try_from(1047547+delta).unwrap_or(0);next=0;};
   nodes.push(JsonbNode{kind:4,child:0,next:next,key_start:0,key_end:0,text_start:0,text_end:end});
   index+=1;
  }
  if let BoolValue::Value(remove)=discard {
   if remove {nodes[1]=JsonbNode{kind:0,child:0,next:0,key_start:0,key_end:0,text_start:0,text_end:0};};
  };
  let payload=JsonbPayload{characters:characters,nodes:nodes,root:1};
  return jsonb_storage_admission(&payload);
 };
 BoolValue::Unknown
}`,
    })
  const group: ReturnType<typeof prepareCheckRustGroup> = {
    source,
    evaluatorSource,
    requiresRegex: false,
    checks: definitions.map((_, index) => ({
      kind: 'supported',
      entryName: entries[index]!,
      inputs:
        index < 2
          ? [
              {
                name: 'source',
                rustName: 'source',
                rustType: 'TextValue',
                type: 'pg_catalog.text',
              },
              {
                name: 'expected',
                rustName: 'expected',
                rustType: 'Int8Value',
                type: 'pg_catalog.int8',
              },
            ]
          : [
              { name: 'extra', rustName: 'extra', rustType: 'Int4Value', type: 'pg_catalog.int4' },
              {
                name: 'unicode',
                rustName: 'unicode',
                rustType: 'BoolValue',
                type: 'pg_catalog.bool',
              },
              {
                name: 'discard',
                rustName: 'discard',
                rustType: 'BoolValue',
                type: 'pg_catalog.bool',
              },
            ],
    })),
  }
  const known = (value: string | number | bigint | boolean): Input => ({ kind: 'Value', value })
  const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    oracle: { input: string; bytes: number; exact: boolean }[] = []
  try {
    const inputs = new Set([
      'null',
      'true',
      'false',
      '0',
      '-0.000',
      '1',
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
      '[]',
      '{}',
      '[null,false,true]',
      '["a",1,{}]',
      '["ab",1,[]]',
      '["abc",1,[2]]',
      '{"aa":"x","b":1,"c":[]}',
      '{"a":1,"a":2}',
      '{"a":{"old":[1,2]},"a":null}',
      '"\\u0001"',
      '"\\u0061"',
      '"é😀"',
      '{"aa":1,"é":2}',
      '{"雪":"😊"}',
    ])
    for (let i = 0; i < 80; i++) {
      inputs.add(
        JSON.stringify({
          ['k'.repeat((i % 8) + 1)]: ['x'.repeat(i % 7), i + '.00', { a: i, b: null }],
          z: i % 2 === 0,
        }),
      )
      inputs.add(
        (i % 2 ? '-' : '') + '1234500.' + '0'.repeat(i % 17) + '678900' + 'e' + ((i % 33) - 16),
      )
    }
    for (const input of inputs) {
      const bytes = (
        await pg.query<{ bytes: number }>('SELECT pg_column_size($1::jsonb) bytes', [input])
      ).rows[0]!.bytes
      const exact = !/[^\x00-\x7f]/u.test(input)
      oracle.push({ input, bytes, exact })
      const row = { source: known(input), expected: known(BigInt(bytes)) }
      fixtures.push(
        { name: 'exact', row, expected: { kind: exact ? 'True' : 'Unknown' } },
        { name: 'bounds', row, expected: { kind: 'True' } },
      )
    }
    for (const unicode of [false, true])
      for (const extra of [-1, 0, 1]) {
        const row = { extra: known(extra), unicode: known(unicode), discard: known(false) }
        fixtures.push({
          name: 'edge',
          row,
          expected:
            extra > 0
              ? { kind: 'Error', value: { state: parseInt('54000', 36) } }
              : { kind: unicode ? 'Unknown' : 'True' },
        })
        fixtures.push({
          name: 'edge',
          row: { ...row, discard: known(true) },
          expected: { kind: 'True' },
        })
      }
    await mkdir('artifacts/jsonb-storage', { recursive: true })
    await writeFile('artifacts/jsonb-storage/oracle.json', JSON.stringify(oracle, null, 2) + '\n')
    await runCheckParity(directory, 'jsonb_storage', group, definitions, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
