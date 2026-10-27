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

it('preserves signed JSONPath counter and identity widths in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-counter-'))
  const names = ['identity', 'next', 'walk']
  const entries = names.map((constraint) =>
    checkRustEntryName({ schema: 'public', kind: 'table', owner: 'jsonpath_counter', constraint }),
  )
  const evaluatorSource = `
pub fn ${entries[0]}(identity:Int8Value,offset:NumericValue,expected:TextValue)->CheckOutcome {let result=jsonpath_counter_identity_probe(identity,offset,expected);check_from_bool(result)}
pub fn ${entries[1]}(identity:Int8Value,expected:Int8Value)->CheckOutcome {let result=jsonpath_counter_next_probe(identity,expected);check_from_bool(result)}
pub fn ${entries[2]}(identity:Int8Value,path:TextValue,expected:TextValue)->CheckOutcome {let result=jsonpath_counter_walk_probe(identity,path,expected);check_from_bool(result)}
`
  try {
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: ['sql__pg_catalog__jsonb_path_query_array__qidf'],
    })
    expect(source.modules.some((module) => module.name === 'regex_engine')).toBe(true)
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/jsonpath_counter.rs',
        source: `
pub fn jsonpath_counter_identity_probe(identity:Int8Value,offset:NumericValue,expected:TextValue)->BoolValue {
 if let Int8Value::Value(base)=identity {
  let result=jsonpath_keyvalue_add_base(offset,base);
  if let NumericValue::Error(error)=result {return BoolValue::Error(error);};
  if let NumericValue::Null=result {return BoolValue::Null;};
  if let NumericValue::Value(number)=result {
   if let TextValue::Value(wanted)=expected {return BoolValue::Value(number==wanted);};
  };
 };
 BoolValue::Unknown
}
pub fn jsonpath_counter_next_probe(identity:Int8Value,expected:Int8Value)->BoolValue {
 if let Int8Value::Value(base)=identity {
  if let Int8Value::Value(wanted)=expected {return BoolValue::Value(jsonpath_keyvalue_next_identity(base)==wanted);};
 };
 BoolValue::Unknown
}
pub fn jsonpath_counter_walk_probe(identity:Int8Value,path:TextValue,expected:TextValue)->BoolValue {
 let input=jsonb_from_text(TextValue::Value("{\\"a\\":{\\"x\\":1},\\"b\\":{\\"y\\":2}}".to_owned()));
 let variables=jsonb_from_text(TextValue::Value("{}".to_owned()));
 let query=jsonpath_from_coerced_source_utf8(path);
 if let Int8Value::Value(base)=identity {
  if let JsonbValue::Value(document)=input {
   if let JsonbValue::Value(vars)=variables {
    if let JsonpathValue::Value(path)=query {
     let context=jsonpath_execution_make_context(document,vars,path,true,true,true,false,0,false,"");
     let seeded=JsonpathExecutionContext {
      document_characters:context.document_characters,document_nodes:context.document_nodes,document_root:context.document_root,
      variables_characters:context.variables_characters,variables_nodes:context.variables_nodes,variables_root:context.variables_root,
      literal_nodes:context.literal_nodes,path_characters:context.path_characters,path_nodes:context.path_nodes,path_root:context.path_root,
      lax:context.lax,utf8:context.utf8,c_collation:context.c_collation,ctype:context.ctype,use_timezone:context.use_timezone,session_timezone:context.session_timezone,ordered_result:context.ordered_result,document_ids:context.document_ids,variables_ids:context.variables_ids,
      generated_nodes:context.generated_nodes,generated_characters:context.generated_characters,generated_ids:context.generated_ids,next_generated_id:base,
     };
     let sequence=jsonpath_execution_walk(seeded.clone(),false);
     if sequence.unknown {return BoolValue::Unknown;};
     if sequence.error>0 {return BoolValue::Error(make_sql_error(sequence.error));};
     let result=jsonpath_execution_output(&seeded,&sequence,true);
     return sql__pg_catalog__jsonb_eq__tfah(result,jsonb_from_text(expected));
    };
   };
  };
 };
 BoolValue::Unknown
}`,
      })
    const input = (name: string, type: string, rustType: string) => ({
      name,
      rustName: name,
      type,
      rustType,
    })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: true,
      checks: entries.map((entryName, index) => ({
        kind: 'supported',
        entryName,
        inputs:
          index === 0
            ? [
                input('identity', 'pg_catalog.int8', 'Int8Value'),
                input('offset', 'pg_catalog."numeric"', 'NumericValue'),
                input('expected', 'pg_catalog.text', 'TextValue'),
              ]
            : index === 1
              ? [
                  input('identity', 'pg_catalog.int8', 'Int8Value'),
                  input('expected', 'pg_catalog.int8', 'Int8Value'),
                ]
              : [
                  input('identity', 'pg_catalog.int8', 'Int8Value'),
                  input('path', 'pg_catalog.text', 'TextValue'),
                  input('expected', 'pg_catalog.text', 'TextValue'),
                ],
      })),
    }
    const value = (value: string | bigint): Input => ({ kind: 'Value', value })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    const bases = [
      -2147483648n,
      -2147483647n,
      -922337204n,
      -922337203n,
      -1n,
      0n,
      1n,
      2n,
      922337203n,
      922337204n,
      2147483646n,
      2147483647n,
    ]
    for (const base of bases) {
      const next = (
        await pg.query<{ text: string }>(
          'SELECT (($1::bigint+1)::bit(32)::integer)::text AS text',
          [base.toString()],
        )
      ).rows[0]!.text
      fixtures.push({
        name: 'next',
        row: { identity: value(base), expected: value(BigInt(next)) },
        expected: { kind: 'True' },
      })
      references.push({ base: base.toString(), next })
      for (const offset of [0n, 1n, 48n, 268435455n, 4294967295n]) {
        const wanted = (
          await pg.query<{ text: string }>(
            `WITH raw AS(SELECT $1::numeric*10000000000+$2::numeric AS n),wrapped AS(SELECT mod(mod(n,18446744073709551616)+18446744073709551616,18446744073709551616) AS n FROM raw) SELECT (CASE WHEN n>=9223372036854775808 THEN n-18446744073709551616 ELSE n END)::text AS text FROM wrapped`,
            [base.toString(), offset.toString()],
          )
        ).rows[0]!.text
        expect(wanted).toBe(BigInt.asIntN(64, base * 10000000000n + offset).toString())
        fixtures.push({
          name: 'identity',
          row: { identity: value(base), offset: value(offset.toString()), expected: value(wanted) },
          expected: { kind: 'True' },
        })
        references.push({ base: base.toString(), offset: offset.toString(), expected: wanted })
      }
      for (const path of [
        '$.keyvalue().keyvalue().id',
        '$.keyvalue().value.keyvalue().id',
        '$.keyvalue().keyvalue().keyvalue().id',
      ]) {
        const ordinary = (
          await pg.query<{ text: string }>(
            `SELECT jsonb_path_query_array('{"a":{"x":1},"b":{"y":2}}',$1::jsonpath)::text AS text`,
            [path],
          )
        ).rows[0]!.text
        const ids = JSON.parse(ordinary) as number[]
        const expected = ids.map((id) => {
          expect(Number.isSafeInteger(id)).toBe(true)
          const ordinaryBase = BigInt(id) / 10000000000n
          const offset = BigInt(id) % 10000000000n
          const seededBase = BigInt.asIntN(32, base + ordinaryBase - 2n)
          return BigInt.asIntN(64, seededBase * 10000000000n + offset).toString()
        })
        const wanted = '[' + expected.join(',') + ']'
        fixtures.push({
          name: 'walk',
          row: { identity: value(base), path: value(path), expected: value(wanted) },
          expected: { kind: 'True' },
        })
        references.push({
          base: base.toString(),
          path,
          ordinary,
          expected: wanted,
          method:
            'Relocate generated base ordinals while preserving observed PostgreSQL object offsets.',
        })
      }
    }
    for (const [offset, expected] of [
      [{ kind: 'Unknown' }, { kind: 'Unknown' }],
      [{ kind: 'Null' }, { kind: 'Null' }],
      [
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ],
    ] as const)
      fixtures.push({
        name: 'identity',
        row: { identity: value(2n), offset, expected: value('0') },
        expected,
      })
    await mkdir('artifacts/jsonpath-counter', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-counter/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonpath-counter/fixtures.json',
      JSON.stringify(
        fixtures,
        (_key, value: unknown) => (typeof value === 'bigint' ? value.toString() : value),
        2,
      ) + '\n',
    )
    await runCheckParity(directory, 'jsonpathcounterparity', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
