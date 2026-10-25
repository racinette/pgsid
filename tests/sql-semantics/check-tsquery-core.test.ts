import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import {
  tsqueryRustNode,
  type TsqueryInputNode,
  type TsqueryInputPayload,
} from '../../tools/check-rust/tsquery-input.js'
import { readTsqueryFixture } from './check-tsquery-fixtures.js'

const packet = 'artifacts/goal-checks/tsquery-core-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const inputs = [
  { name: 'source', rustName: 'source', type: 'pg_catalog.text' as const, rustType: 'TextValue' },
  {
    name: 'expected_text',
    rustName: 'expected_text',
    type: 'pg_catalog.text' as const,
    rustType: 'TextValue',
  },
  {
    name: 'expected_number',
    rustName: 'expected_number',
    type: 'pg_catalog.int4' as const,
    rustType: 'Int4Value',
  },
  { name: 'bypass', rustName: 'bypass', type: 'pg_catalog.bool' as const, rustType: 'BoolValue' },
]
const helpers = `
pub fn tsquery_test_text(actual:TextValue,expected:TextValue)->BoolValue {
 if let TextValue::Error(error)=actual{return BoolValue::Error(error);};
 if actual==TextValue::Unknown{return BoolValue::Unknown;};
 if actual==TextValue::Null&&expected==TextValue::Null{return make_bool_value(true);};
 if actual==TextValue::Null||expected==TextValue::Null{return make_bool_value(false);};
 sql__pg_catalog__texteq__aet8(actual,expected)
}
pub fn tsquery_test_number(actual:Int4Value,expected:Int4Value)->BoolValue {
 if let Int4Value::Error(error)=actual{return BoolValue::Error(error);};
 if actual==Int4Value::Unknown{return BoolValue::Unknown;};
 make_bool_value(actual==expected)
}
pub fn tsquery_test_wire(actual:ByteaValue,expected:TextValue)->BoolValue {
 if let ByteaValue::Error(error)=actual{return BoolValue::Error(error);};
 if let ByteaValue::Null=actual{return make_bool_value(expected==TextValue::Null);};
 if let ByteaValue::Value(value)=actual{return tsquery_test_text(make_text_value(value.as_str()),expected);};
 BoolValue::Unknown
}
pub fn tsquery_test_owned(input:TsqueryValue)->TextValue {
 let saved=input.clone();
 if let TsqueryValue::Value(payload)=input {
  let mut nodes=payload.nodes;
  let mut index:usize=0;
  while index<nodes.len(){
   let node=nodes[index].clone();
   if node.kind==0{nodes[index]=TsqueryNode{kind:0,text:"changed".to_owned(),weight:node.weight,prefix:node.prefix,distance:0,left:0,right:0};break;};
   index+=1;
  }
  let changed=make_tsquery_value(TsqueryPayload{nodes:nodes,root:payload.root,native_bytes:-1});
  let state=tsquery_is_null(changed);
  if state==BoolValue::Unknown{return TextValue::Unknown;};
 };
 tsquery_to_text(saved)
}
`

it('parses owned raw tsquery trees with native text, node count, wire, error and snapshot parity in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-core-'))
  try {
    await pg.exec('CREATE TABLE binary_queries(key text,value tsquery)')
    const binary = [
      { key: '__empty_operand', distance: null, word: '', prefix: 0 },
      { key: '__wide_operand', distance: null, word: 'a'.repeat(2047), prefix: 0 },
      { key: '__negative_phrase', distance: 65535, word: 'a', prefix: 0 },
      { key: '__minimum_phrase', distance: 32768, word: 'a', prefix: 0 },
      { key: '__wide_phrase', distance: 32767, word: 'a', prefix: 0 },
      { key: '__empty_prefix', distance: null, word: '', prefix: 1 },
      { key: '__prefix_flag', distance: null, word: 'a', prefix: 128 },
    ]
    const owned: string[] = []
    for (const sample of binary) {
      const count = Buffer.alloc(4),
        operand = (word: string, prefix = 0) =>
          Buffer.concat([Buffer.from([1, 0, prefix]), Buffer.from(word), Buffer.from([0])]),
        operator = Buffer.alloc(4)
      count.writeUInt32BE(sample.distance === null ? 1 : 3)
      operator.writeUInt8(2, 0)
      operator.writeUInt8(4, 1)
      operator.writeUInt16BE(sample.distance ?? 0, 2)
      const payload = Buffer.concat([
          count,
          ...(sample.distance === null ? [] : [operator, operand('b')]),
          operand(sample.word, sample.prefix),
        ]),
        header = Buffer.alloc(19),
        columns = Buffer.alloc(2),
        keySize = Buffer.alloc(4),
        valueSize = Buffer.alloc(4)
      Buffer.from('5047434f50590aff0d0a00', 'hex').copy(header)
      columns.writeUInt16BE(2)
      keySize.writeUInt32BE(Buffer.byteLength(sample.key))
      valueSize.writeUInt32BE(payload.length)
      await pg.exec("COPY binary_queries FROM '/dev/blob' (FORMAT binary)", {
        blob: new Blob([
          new Uint8Array(
            Buffer.concat([
              header,
              columns,
              keySize,
              Buffer.from(sample.key),
              valueSize,
              payload,
              Buffer.from('ffff', 'hex'),
            ]),
          ),
        ]),
      })
      const query = await readTsqueryFixture(
        pg,
        'SELECT value FROM binary_queries WHERE key=$1',
        'value',
        [sample.key],
      )
      expect(query).not.toBeNull()
      owned.push(
        `if text=="${sample.key}"{let mut nodes:Vec<TsqueryNode>=Vec::new();${query!.nodes.map((node) => `nodes.push(${tsqueryRustNode(node)});`).join('')}let payload=TsqueryPayload{nodes:nodes,root:${query!.root},native_bytes:${query!.nativeBytes}};return make_tsquery_value(payload);};`,
      )
    }
    const testInput = `pub fn tsquery_test_input(input:TextValue)->TsqueryValue {let saved=input.clone();if let TextValue::Value(text)=saved{${owned.join('')}};tsquery_from_text_context(input,true)}`
    const leaf: TsqueryInputNode = {
        kind: 0,
        text: 'a',
        weight: 0,
        prefix: false,
        distance: 0,
        left: 0,
        right: 0,
      },
      term: TsqueryInputPayload = { nodes: [leaf], root: 0, nativeBytes: -1 },
      branch: TsqueryInputNode = {
        kind: 4,
        text: '',
        weight: 0,
        prefix: false,
        distance: 1,
        left: 0,
        right: 1,
      },
      payloads = [
        { value: { nodes: [], root: 0, nativeBytes: 8 }, unknown: false },
        { value: term, unknown: false },
        {
          value: { ...term, nodes: [{ ...leaf, text: '', weight: 15, prefix: true }] },
          unknown: false,
        },
        {
          value: { ...term, nodes: [leaf, leaf, { ...branch, distance: -32768 }], root: 2 },
          unknown: false,
        },
        ...[
          { ...term, root: 1 },
          { ...term, nativeBytes: -2 },
          { ...term, nativeBytes: 1 },
          { ...term, nativeBytes: 1073741824 },
          ...[
            { kind: 5 },
            { text: 'a\0b' },
            { text: 'a'.repeat(2048) },
            { weight: -1 },
            { weight: 16 },
            { distance: 1 },
            { left: 1 },
          ].map((fields) => ({ ...term, nodes: [{ ...leaf, ...fields }] })),
          { ...term, nodes: [leaf, leaf], root: 1 },
          {
            ...term,
            nodes: [leaf, { ...branch, kind: 1, left: 1, right: 0, distance: 0 }],
            root: 1,
          },
          ...[
            { right: 0 },
            { distance: 32768 },
            { distance: -32769 },
            { text: 'unexpected' },
            { weight: 1 },
            { prefix: true },
          ].map((fields) => ({ ...term, nodes: [leaf, leaf, { ...branch, ...fields }], root: 2 })),
        ].map((value) => ({ value, unknown: true })),
      ] satisfies { value: TsqueryInputPayload; unknown: boolean }[]
    const payloadHelper = `pub fn tsquery_test_payload(mode:Int4Value)->BoolValue {if let Int4Value::Value(index)=mode {${payloads.map(({ value }, index) => `if index==${index}{let mut nodes:Vec<TsqueryNode>=Vec::new();${value.nodes.map((node) => `nodes.push(${tsqueryRustNode(node)});`).join('')}let payload=TsqueryPayload{nodes:nodes,root:${value.root},native_bytes:${value.nativeBytes}};let query=make_tsquery_value(payload);let state=tsquery_is_null(query);return make_bool_value(state==BoolValue::Unknown);};`).join('')}};BoolValue::Unknown}`
    await mkdir(packet, { recursive: true })
    await writeFile(`${packet}/test-helpers.rs`, helpers + testInput + payloadHelper)
    await pg.exec(
      `CREATE FUNCTION native_query_value(text) RETURNS tsquery LANGUAGE sql STABLE AS $function$ SELECT CASE WHEN $1 IN (${binary.map((sample) => "'" + sample.key + "'").join(',')}) THEN (SELECT value FROM binary_queries WHERE key=$1) ELSE $1::tsquery END $function$`,
    )
    const definitions = {
      render: {
        sql: 'source::tsquery::text',
        body: 'let actual=tsquery_to_text(query);let compared=tsquery_test_text(actual,expected_text);',
      },
      count: {
        sql: 'numnode(source::tsquery)',
        body: 'let actual=sql__pg_catalog__numnode__7bkv(query);let compared=tsquery_test_number(actual,expected_number);',
      },
      wire: {
        sql: "encode(tsquerysend(source::tsquery),'hex')",
        body: 'let actual=sql__pg_catalog__tsquerysend__0660(query,true);let compared=tsquery_test_wire(actual,expected_text);',
      },
      owned: {
        sql: 'source::tsquery::text',
        body: 'let actual=tsquery_test_owned(query);let compared=tsquery_test_text(actual,expected_text);',
      },
    }
    for (const definition of Object.values(definitions))
      definition.sql = definition.sql.replaceAll('source::tsquery', 'native_query_value(source)')
    const specifications = [
      ...Object.entries(definitions).map(([name, d]) => ({
        name,
        body: d.body,
        input: 'tsquery_test_input(source)',
      })),
      ...Object.entries(definitions).map(([name, d]) => ({
        name: name + '_without_encoding',
        body: d.body,
        input: 'tsquery_from_text_context(source,false)',
      })),
      {
        name: 'wire_without_client',
        body: definitions.wire.body.replace('query,true)', 'query,false)'),
        input: 'tsquery_test_input(source)',
      },
    ]
    const checks = specifications.map((d) => {
      const name = d.name
      const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'tsquery_core',
        constraint: name,
      })
      return {
        name,
        entryName,
        source: `pub fn ${entryName}(${inputs.map((i) => i.name + ':' + i.rustType).join(',')})->CheckOutcome {let mut result:CheckOutcome=check_unknown();let guard=check_from_bool(bypass);if case_guard_takes(guard){let yes=make_bool_value(true);result=check_from_bool(yes);}else{let query=${d.input};${d.body}result=check_from_bool(compared);};result}`,
      }
    })
    const payloadEntry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'tsquery_core',
      constraint: 'payload_contract',
    })
    checks.push({
      name: 'payload_contract',
      entryName: payloadEntry,
      source: `pub fn ${payloadEntry}(${inputs.map((i) => i.name + ':' + i.rustType).join(',')})->CheckOutcome {let mut result:CheckOutcome=check_unknown();let guard=check_from_bool(bypass);if case_guard_takes(guard){let yes=make_bool_value(true);result=check_from_bool(yes);}else{let actual=tsquery_test_payload(expected_number);result=check_from_bool(actual);};result}`,
    })
    const evaluatorSource = checks.map((c) => c.source).join('\n'),
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'test/tsquery_core.rs', source: helpers + testInput + payloadHelper })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: checks.map((c) => ({ kind: 'supported', entryName: c.entryName, inputs })),
    }
    const samples: (string | null)[] = [
      null,
      '',
      ' ',
      '\t\n\v\f\r',
      'a',
      'a & b',
      'a | b',
      '!a',
      '!!a',
      '!a & b | c <-> d',
      '(a | b) & c',
      'a & b & c',
      '(a & b) & c',
      'a & (b & c)',
      'a <-> b <-> c',
      'a <-> (b <-> c)',
      'a <0> b',
      'a <0001> b',
      'a <16384> b',
      'a <16385> b',
      'a <2147483647> b',
      'a <999999999999999999999999> b',
      'a <-1> b',
      'a <+1> b',
      'a < 1> b',
      'a<1>b',
      'a<>b',
      'a<1',
      'a<1x>b',
      'a <->',
      'a:A',
      'a:aAbBCd*',
      'a:',
      'a:**',
      'a:Q',
      'a:1',
      'a::',
      'a: A',
      'a:*&b',
      'a*',
      '*',
      '+',
      '-',
      'a>b',
      "a'b",
      "'a''b'",
      "'a\\b'",
      "'a\\\\b'",
      "'a b'",
      "' '",
      "''",
      "'unterminated",
      'a\\',
      'a\\ b',
      '\\!',
      "'!'",
      ':a',
      'a b',
      'a &',
      '& a',
      '()',
      '(a',
      'a)',
      'a && b',
      'a || b',
      'a !b',
      'a(b)',
      '!'.repeat(32) + 'a',
      '!'.repeat(33) + 'a',
      '('.repeat(64) + 'a' + ')'.repeat(64),
      Array.from({ length: 40 }, () => '!(').join('') + 'a' + ')'.repeat(40),
      'é & 日本:*A | 😀',
      'é',
      "'é':AB",
      ':é',
      "'unterminatedé",
      'a <16385> é',
      "''é",
      'a\u00a0b',
      '\ue000 | 😀',
      'a'.repeat(2047),
      'a'.repeat(2046),
      'a'.repeat(2048),
      '😀'.repeat(511),
      '😀'.repeat(512),
      ...binary.map((sample) => sample.key),
    ]
    await pg.exec(
      'CREATE TEMP TABLE query_input(source text,expected_text text,expected_number int4,bypass bool)',
    )
    for (const [name, d] of Object.entries(definitions))
      await pg.exec(
        `CREATE TABLE query_${name}(source text,expected_text text,expected_number int4,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE (${d.sql}) IS NOT DISTINCT FROM ${name === 'count' ? 'expected_number' : 'expected_text'} END))`,
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const encodingCases = new Set<string | null>([
        null,
        'a',
        'a & b',
        'é',
        "'é':AB",
        ':é',
        "'unterminatedé",
        'a <16385> é',
        "''é",
      ]),
      unknownEncoding = new Set(['é', "'é':AB", "'unterminatedé"])
    let inserts = 0
    for (const text of samples) {
      await pg.query('DELETE FROM query_input')
      await pg.query('INSERT INTO query_input VALUES($1,NULL,NULL,false)', [text])
      for (const [name, d] of Object.entries(definitions)) {
        let value: string | number | null = null,
          state: string | undefined
        try {
          value = (
            await pg.query<{ value: string | number | null }>(
              `SELECT (${d.sql}) value FROM query_input`,
            )
          ).rows[0]!.value
        } catch (error) {
          state = (error as { code: string }).code
        }
        for (const wrong of [false, true]) {
          const expectedValue = wrong
            ? name === 'count'
              ? (typeof value === 'number' ? value : 0) + 1
              : 'wrong'
            : value
          await pg.query(
            `UPDATE query_input SET ${name === 'count' ? 'expected_number' : 'expected_text'}=$1`,
            [expectedValue],
          )
          let rejected: string | undefined
          try {
            await pg.exec(`INSERT INTO query_${name} SELECT * FROM query_input`)
          } catch (error) {
            rejected = (error as { code: string }).code
          }
          expect(rejected).toBe(state ?? (wrong ? '23514' : undefined))
          inserts++
          const expected: Outcome = state ? failure(state) : { kind: wrong ? 'False' : 'True' },
            row: Row = {
              source: known(text),
              expected_text: known(name === 'count' ? null : (expectedValue as string | null)),
              expected_number: known(name === 'count' ? expectedValue : null),
              bypass: known(false),
            }
          fixtures.push(
            { name, row, expected },
            { name, row: { ...row, bypass: known(true) }, expected: { kind: 'True' } },
          )
          if (encodingCases.has(text)) {
            fixtures.push(
              {
                name: name + '_without_encoding',
                row,
                expected:
                  text !== null && unknownEncoding.has(text) ? { kind: 'Unknown' } : expected,
              },
              {
                name: name + '_without_encoding',
                row: { ...row, bypass: known(true) },
                expected: { kind: 'True' },
              },
            )
          }
          if (name === 'wire')
            fixtures.push(
              {
                name: 'wire_without_client',
                row,
                expected:
                  !state && text !== null && /[^\x00-\x7f]/u.test(text)
                    ? { kind: 'Unknown' }
                    : expected,
              },
              {
                name: 'wire_without_client',
                row: { ...row, bypass: known(true) },
                expected: { kind: 'True' },
              },
            )
          references.push({ source: text, name, wrong, value, state, expected })
        }
      }
    }
    for (const { name } of checks)
      for (const source of [
        { kind: 'Unknown' } as Input,
        { kind: 'Error', value: { state: parseInt('22023', 36) } } as Input,
      ]) {
        if (name === 'payload_contract') continue
        const row: Row = {
          source,
          expected_text: known(null),
          expected_number: known(null),
          bypass: known(false),
        }
        fixtures.push(
          { name, row, expected: source.kind === 'Error' ? source : { kind: 'Unknown' } },
          { name, row: { ...row, bypass: known(true) }, expected: { kind: 'True' } },
        )
      }
    for (const [index, { unknown }] of payloads.entries()) {
      const row: Row = {
        source: known(null),
        expected_text: known(null),
        expected_number: known(index),
        bypass: known(false),
      }
      fixtures.push(
        { name: 'payload_contract', row, expected: { kind: unknown ? 'True' : 'False' } },
        {
          name: 'payload_contract',
          row: { ...row, bypass: known(true) },
          expected: { kind: 'True' },
        },
      )
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      `${packet}/native.json`,
      JSON.stringify(
        {
          nativeInserts: inserts,
          fixtures: fixtures.length,
          payloadCases: payloads.length,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'tsquerycore',
      group,
      checks.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
