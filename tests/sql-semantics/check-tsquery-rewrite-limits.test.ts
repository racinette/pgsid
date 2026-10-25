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
pub fn tsquery_pool_term(text:&str)->TsqueryValue { tsquery_from_text_context(make_text_value(text),true) }
pub fn tsquery_pool_replacement()->TsqueryValue {
 let mut a=String::new();let mut b=String::new();let mut index:usize=0;
 while index<2046 {a.push('b');b.push('c');index+=1;}
 let mut nodes:Vec<TsqueryNode>=Vec::new();
 nodes.push(TsqueryNode{kind:0,text:a,weight:0,prefix:false,distance:0,left:0,right:0});
 nodes.push(TsqueryNode{kind:0,text:b,weight:0,prefix:false,distance:0,left:0,right:0});
 nodes.push(TsqueryNode{kind:2,text:String::new(),weight:0,prefix:false,distance:0,left:0,right:1});
 let payload=TsqueryPayload{nodes:nodes,root:2,native_bytes:-1};let bytes=tsquery_canonical_bytes(&payload);
 make_tsquery_value(TsqueryPayload{nodes:payload.nodes,root:2,native_bytes:bytes})
}
pub fn tsquery_pool_query(mode:Int4Value)->TsqueryValue {
 if let Int4Value::Value(kind)=mode {
  let mut count:usize=128;if kind==1{count=256;};if kind==2{count=257;};
  let mut nodes:Vec<TsqueryNode>=Vec::new();let mut root:usize=0;let mut index:usize=0;
  while index<count {
   let term=nodes.len();nodes.push(TsqueryNode{kind:0,text:"a".to_owned(),weight:0,prefix:false,distance:0,left:0,right:0});
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

it('checks repeated rewrite expansion against native pool limits and preserves skipped and empty-target branches', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-rewrite-limits-')),
    packet = 'artifacts/goal-checks/tsquery-rewrite-active'
  try {
    await pg.exec(`CREATE FUNCTION pool_query(mode integer) RETURNS tsquery LANGUAGE SQL IMMUTABLE AS $$
 SELECT string_agg('a',' & ')::tsquery FROM generate_series(1,CASE mode WHEN 0 THEN 128 WHEN 1 THEN 256 ELSE 257 END) word
 $$`)
    const replacement = "(repeat('b',2046)||' & '||repeat('c',2046))::tsquery"
    const forms = [
      {
        name: 'grow',
        sql: `ts_rewrite(pool_query(mode),'a'::tsquery,${replacement})`,
        rust: 'sql__pg_catalog__ts_rewrite__2hpb(query,pattern,replacement,true)',
      },
      {
        name: 'identity',
        sql: `ts_rewrite(pool_query(mode),''::tsquery,${replacement})`,
        rust: 'sql__pg_catalog__ts_rewrite__2hpb(query,pattern,replacement,true)',
      },
      {
        name: 'absent',
        sql: `ts_rewrite(pool_query(mode),'missing'::tsquery,${replacement})`,
        rust: 'sql__pg_catalog__ts_rewrite__2hpb(query,pattern,replacement,true)',
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
      const pattern = f.name === 'grow' ? 'a' : f.name === 'identity' ? '' : 'missing'
      const operands = `let pattern=tsquery_pool_term("${pattern}");let replacement=tsquery_pool_replacement();`
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
      expect(initial.nodes).toBe(2 * (mode === 0 ? 128 : mode === 1 ? 256 : 257) - 1)
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
        expect(state).toBe(f.name === 'grow' && mode === 2 ? '54000' : undefined)
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
