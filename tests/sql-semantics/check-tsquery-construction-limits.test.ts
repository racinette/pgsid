import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

const helpers = `
fn tsquery_pool_word(length:i32)->String {
 let mut text=String::new();let mut i:i32=0;
 while i<length {text.push('a');i=i+1;}
 text
}
pub fn tsquery_pool_query(mode:Int4Value)->TsqueryValue {
 if let Int4Value::Value(kind)=mode {
  let long=tsquery_pool_word(2046);
  let mut first=long.clone();let mut short=tsquery_pool_word(610);let mut count:usize=513;
  if kind==1 {first=tsquery_pool_word(2045);short=tsquery_pool_word(510);count=514;};
  if kind==2 {first=tsquery_pool_word(2044);short=tsquery_pool_word(511);count=514;};
  let mut nodes:Vec<TsqueryNode>=Vec::new();let mut root:usize=0;let mut index:usize=0;
  while index<count {
   let mut text=long.clone();
   if index==0 {text=first.clone();};
   if kind==0&&index==511 {text=short.clone();};
   if kind!=0&&index==512 {text=short.clone();};
   let term=nodes.len();nodes.push(TsqueryNode{kind:0,text:text,weight:0,prefix:false,distance:0,left:0,right:0});
   if index==0 {root=term;}else{let left=root;root=nodes.len();nodes.push(TsqueryNode{kind:2,text:String::new(),weight:0,prefix:false,distance:0,left:left,right:term});};
   index+=1;
  }
  let payload=TsqueryPayload{nodes:nodes,root:root,native_bytes:-1};let bytes=tsquery_canonical_bytes(&payload);
  return make_tsquery_value(TsqueryPayload{nodes:payload.nodes,root:root,native_bytes:bytes});
 };
 TsqueryValue::Unknown
}
pub fn tsquery_pool_equal(input:TsqueryValue,nodes:Int4Value,bytes:Int4Value)->BoolValue {
 if let TsqueryValue::Error(error)=input{return BoolValue::Error(error);};
 if let TsqueryValue::Value(value)=input {
  let count=make_int4_value(value.nodes.len() as i32);let size=make_int4_value(value.native_bytes);
  return make_bool_value(count==nodes&&size==bytes);
 };
 BoolValue::Unknown
}
`

it('checks rebuilt right-first pool offsets at the native limit while preserving empty identity branches', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-construction-limits-')),
    packet = 'artifacts/goal-checks/tsquery-construction-active'
  try {
    await pg.exec(`CREATE FUNCTION pool_query(mode integer) RETURNS tsquery LANGUAGE SQL IMMUTABLE AS $$
   SELECT string_agg(CASE WHEN word=0 AND mode=1 THEN repeat('a',2045) WHEN word=0 AND mode=2 THEN repeat('a',2044)
    WHEN word=511 AND mode=0 THEN repeat('a',610) WHEN word=512 AND mode=1 THEN repeat('a',510) WHEN word=512 AND mode=2 THEN repeat('a',511)
    ELSE repeat('a',2046) END,' & ' ORDER BY word)::tsquery FROM generate_series(0,CASE WHEN mode=0 THEN 512 ELSE 513 END) word
  $$`)
    const forms = [
      { name: 'not', sql: '!!pool_query(mode)', rust: 'sql__pg_catalog__tsquery_not__5zwa(query)' },
      {
        name: 'and',
        sql: "pool_query(mode)&&'b'::tsquery",
        rust: 'sql__pg_catalog__tsquery_and__zwff(query,tiny)',
      },
      {
        name: 'and_empty',
        sql: "pool_query(mode)&&''::tsquery",
        rust: 'sql__pg_catalog__tsquery_and__zwff(query,empty)',
      },
      {
        name: 'or_empty',
        sql: "''::tsquery||pool_query(mode)",
        rust: 'sql__pg_catalog__tsquery_or__le7y(empty,query)',
      },
      {
        name: 'phrase_empty',
        sql: "tsquery_phrase(pool_query(mode),''::tsquery,1)",
        rust: 'sql__pg_catalog__tsquery_phrase__gq2o(query,empty)',
      },
      {
        name: 'bad_distance',
        sql: "tsquery_phrase(pool_query(mode),''::tsquery,16385)",
        rust: 'sql__pg_catalog__tsquery_phrase__u1ck(query,empty,bad)',
      },
    ]
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE pool_${f.name}(mode int4,expected_nodes int4,expected_bytes int4,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE numnode(${f.sql})=expected_nodes AND pg_column_size(${f.sql})=expected_bytes END))`,
      )
    const inputs = [
      { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4' as const, rustType: 'Int4Value' },
      {
        name: 'expected_nodes',
        rustName: 'expected_nodes',
        type: 'pg_catalog.int4' as const,
        rustType: 'Int4Value',
      },
      {
        name: 'expected_bytes',
        rustName: 'expected_bytes',
        type: 'pg_catalog.int4' as const,
        rustType: 'Int4Value',
      },
      {
        name: 'bypass',
        rustName: 'bypass',
        type: 'pg_catalog.bool' as const,
        rustType: 'BoolValue',
      },
    ]
    const entries = forms.map((f) => {
      const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'tsquery_pool',
        constraint: f.name,
      })
      const operands = [
        ...(f.rust.includes('tiny')
          ? [
              'let tiny_text=make_text_value("b");let tiny=tsquery_from_text_context(tiny_text,true);',
            ]
          : []),
        ...(f.rust.includes('empty')
          ? [
              'let empty_text=make_text_value("");let empty=tsquery_from_text_context(empty_text,true);',
            ]
          : []),
        ...(f.rust.includes('bad') ? ['let bad=make_int4_value(16385);'] : []),
      ].join('')
      return {
        entryName,
        source: `pub fn ${entryName}(mode:Int4Value,expected_nodes:Int4Value,expected_bytes:Int4Value,bypass:BoolValue)->CheckOutcome{let mut result:CheckOutcome=check_unknown();let guard=check_from_bool(bypass);if case_guard_takes(guard){let yes=make_bool_value(true);result=check_from_bool(yes);}else{let query=tsquery_pool_query(mode);${operands}let actual=${f.rust};let observed=tsquery_pool_equal(actual,expected_nodes,expected_bytes);result=check_from_bool(observed);};result}`,
      }
    })
    const evaluatorSource = entries.map((e) => e.source).join('\n'),
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'test/tsquery_pool.rs', source: helpers })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: entries.map((e) => ({ kind: 'supported', entryName: e.entryName, inputs })),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const mode of [0, 1, 2]) {
      const initial = (
        await pg.query<{ nodes: number; bytes: number }>(
          'SELECT numnode(pool_query($1)) nodes,pg_column_size(pool_query($1)) bytes',
          [mode],
        )
      ).rows[0]!
      expect(initial.nodes).toBe(mode === 0 ? 1025 : 1027)
      for (const f of forms) {
        let nodes: number | null = null,
          bytes: number | null = null,
          state: string | undefined
        try {
          const value = (
            await pg.query<{ nodes: number; bytes: number }>(
              `SELECT numnode(${f.sql}) nodes,pg_column_size(${f.sql}) bytes FROM (SELECT $1::int4 mode) input`,
              [mode],
            )
          ).rows[0]!
          nodes = value.nodes
          bytes = value.bytes
        } catch (error) {
          state = (error as { code: string }).code
        }
        expect(state).toBe(
          f.name === 'bad_distance'
            ? '22023'
            : (f.name === 'not' && mode === 2) || (f.name === 'and' && mode !== 0)
              ? '54000'
              : undefined,
        )
        for (const bypass of [false, true]) {
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO pool_${f.name} VALUES($1,$2,$3,$4)`, [
              mode,
              nodes,
              bytes,
              bypass,
            ])
          } catch (error) {
            failure = (error as { code: string }).code
          }
          expect(failure).toBe(bypass ? undefined : state)
          inserts++
          const row: Row = {
              mode: { kind: 'Value', value: mode },
              expected_nodes: nodes === null ? { kind: 'Null' } : { kind: 'Value', value: nodes },
              expected_bytes: bytes === null ? { kind: 'Null' } : { kind: 'Value', value: bytes },
              bypass: { kind: 'Value', value: bypass },
            },
            expected: Outcome = bypass
              ? { kind: 'True' }
              : state
                ? { kind: 'Error', value: { state: parseInt(state, 36) } }
                : { kind: 'True' }
          fixtures.push({ name: f.name, row, expected })
          references.push({ mode, initial, name: f.name, bypass, nodes, bytes, state, failure })
        }
      }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'limits-reference.json'),
      JSON.stringify({ nativeInserts: inserts, fixtures: fixtures.length, references }, null, 2) +
        '\n',
    )
    await runCheckParity(
      root,
      'tsquerypool',
      group,
      forms.map((f) => f.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
