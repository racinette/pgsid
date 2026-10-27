import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'

const profiles = [
  { name: 'ints', element: 'int', base: '1' },
  { name: 'texts', element: 'text', base: 'x' },
  { name: 'words', element: 'varchar(2)', base: 'xy' },
  { name: 'chars', element: 'char(2)', base: 'xy' },
  { name: 'bits', element: 'bit(2)', base: '10' },
  { name: 'varying_bits', element: 'varbit(2)', base: '10' },
  { name: 'domains', element: 'positive', base: '1' },
  { name: 'nonnulls', element: 'required_int', base: '1' },
  { name: 'domain_bits', element: 'bit_word', base: '10' },
  { name: 'faults', element: 'fault_int', base: '1' },
  { name: 'docs', element: 'jsonb', base: '1' },
  { name: 'rawdocs', element: 'json', base: '1' },
  { name: 'labels', element: 'label', base: 'ready' },
  { name: 'numbers', element: 'numeric(3,1)', base: '1' },
  { name: 'clocks', element: 'time(2)', base: '12:34:56' },
  { name: 'periods', element: 'interval hour to minute', base: '01:02' },
] as const

const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('populates structured JSON arrays through scalar and domain input plans with ordered shape and conversion errors in every target', async () => {
  const selected = process.env['PGSID_CHECK_JSON_POPULATE_ARRAY_TYPES']?.split(',')
  if (selected) {
    expect(new Set(selected).size).toBe(selected.length)
    for (const name of selected)
      expect(
        profiles.some((profile) => profile.name === name),
        name,
      ).toBe(true)
  }
  const active = profiles.filter((profile) => !selected || selected.includes(profile.name))
  const packet =
    'artifacts/goal-checks/json-populate-arrays-active' +
    (selected ? '/scope-' + selected.join('_') : '')
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-populate-arrays-'))
  const pg = await PGlite.create()
  try {
    await pg.exec(`SET DateStyle='ISO, MDY';SET IntervalStyle='postgres';SET array_nulls=on;
      CREATE DOMAIN positive AS int CHECK(VALUE>0);
      CREATE DOMAIN required_int AS int NOT NULL;
      CREATE DOMAIN bit_word AS bit(2) CHECK(VALUE<>B'00');
      CREATE DOMAIN fault_int AS int CHECK(10/VALUE>0);
      CREATE TYPE label AS ENUM('ready','done')`)
    const forms = active.flatMap((profile) => {
      const row = 'row_' + profile.name
      const base = `CASE WHEN use_base THEN ROW('[0:0]={${profile.base}}'::${profile.element}[])::${row} ELSE NULL::${row} END`
      return ['json_populate_record', 'jsonb_populate_record', 'jsonb_populate_record_valid'].map(
        (fn) => {
          const name = profile.name + '_' + fn
          const call = `pg_catalog.${fn}((${base}),data::${fn === 'json_populate_record' ? 'json' : 'jsonb'})`
          const valid = fn.endsWith('_valid')
          const value = valid ? call : `(${call}).v::text`
          const expression = `CASE WHEN bypass THEN true ELSE (${value}) IS NOT DISTINCT FROM ${valid ? 'expected_bool' : 'expected_text'} END`
          return { name, row, profile, fn, value, expression, valid }
        },
      )
    })
    for (const profile of active)
      await pg.exec(`CREATE TYPE row_${profile.name} AS(v ${profile.element}[])`)
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(data text,use_base bool,expected_text text COLLATE "C",expected_bool bool,bypass bool,CONSTRAINT populated CHECK(${form.expression}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${form.expression})` : undefined,
        )!
        expect(hasUncertain(lowered.expression), form.name + origin).toBe(false)
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: form.name,
            constraint: form.name + '_' + origin,
          },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
      dateStyle: { format: 'ISO', order: 'MDY' },
      intervalStyle: 'postgres',
    })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.identity.constraint + JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const observations = []
    const values = [
      '[]',
      '[[]]',
      '[[],[]]',
      '[[[]],[[]]]',
      '[[1,2],[3,4]]',
      '[[1],[2,3]]',
      '[[1],null]',
      '[1,[2]]',
      '[{},[2]]',
      '[["bad"],[2,3]]',
      '[[1],["bad",3]]',
      '[[0],[1,2]]',
      '[[0],["bad",2]]',
      '[[1],[0,2]]',
      '[[1],[0,2,3]]',
      '[[[[[[1]]]]]]',
      '[[[[[[[1]]]]]]]',
      '[[[[[[[]]]]]]]',
      '[[[[[[["bad"]]]]]]]',
      '[null]',
      '[1,null,2]',
      '["NULL","null",null]',
      '[true,false]',
      '["ready","done"]',
      '["a","ab","abc"]',
      '["é","éé","😊"]',
      '["0","10","ab"]',
      '["ab","10"]',
      '["xF","xG"]',
      '["b10","B01"]',
      '["12:34:56.999","23:59:59.999"]',
      '["1.25","100","-2"]',
      '["1","1 hour 2 minutes","01:02:03"]',
      '["12:34",["12:34"]]',
      '["1 hour",{"1":"hour"}]',
      '["12:34",["1::2"]]',
      '["1::2","12:34:"]',
      '[{"x":1,"x":2},1e2,-0.00,"hello"]',
      '[null,[1]]',
      '[[],1]',
      '[[],[1]]',
      '[{},[]]',
    ]
    const data = [
      null,
      '{}',
      '{"v":null}',
      '{"v":1}',
      '{"v":{}}',
      ...values.map((value) => '{"v":' + value + '}'),
      ...['{}', '{NULL}', '[0:1]={1,NULL}', '{{1,2},{3,4}}'].map((value) =>
        JSON.stringify({ v: value }),
      ),
      '{"v":[1],"v":[2]}',
      '{"v":[1],"unused":"\\ud800"}',
    ]
    for (const form of forms)
      for (const source of data)
        for (const useBase of source === '{}' || source === null || source === '{"v":null}'
          ? [false, true]
          : [false]) {
          let output: string | boolean | null = null
          let expected: Outcome = { kind: 'True' }
          try {
            output = (
              await pg.query<{ value: string | boolean | null }>(
                `WITH args AS MATERIALIZED(SELECT $1::text data,$2::bool use_base)SELECT ${form.value} value FROM args`,
                [source, useBase],
              )
            ).rows[0]!.value
          } catch (error) {
            const code = (error as { code?: string }).code
            if (!code) throw error
            expected = failure(code)
          }
          const row: Row = {
            data: known(source),
            use_base: known(useBase),
            expected_text: known(form.valid ? null : (output as string | null)),
            expected_bool: known(form.valid ? (output as boolean | null) : null),
            bypass: known(false),
          }
          for (const origin of ['source', 'stored']) {
            const name = form.name + '_' + origin
            fixtures.push({ name, row, expected })
            if (expected.kind === 'True')
              fixtures.push({
                name,
                row: {
                  ...row,
                  ...(form.valid
                    ? { expected_bool: known(output === null ? true : !output) }
                    : { expected_text: known('wrong') }),
                },
                expected: { kind: 'False' },
              })
          }
          observations.push({ name: form.name, source, useBase, output, expected })
        }
    for (const form of forms)
      for (const origin of ['source', 'stored']) {
        const name = form.name + '_' + origin
        const row: Row = {
          data: { kind: 'Unknown' },
          use_base: known(false),
          expected_text: known(null),
          expected_bool: known(null),
          bypass: known(false),
        }
        fixtures.push({ name, row, expected: { kind: 'Unknown' } })
        fixtures.push({ name, row: { ...row, bypass: known(true) }, expected: { kind: 'True' } })
        fixtures.push({
          name,
          row: { ...row, data: failure('22012') as Input },
          expected: failure('22012'),
        })
      }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          selection: selected ?? null,
          profiles: active.length,
          checks: plans.length,
          fixtures: fixtures.length,
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'json_populate_arrays',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('detaches JSONB subtree nodes and characters before retaining array elements in every target', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-array-owned-'))
  const pg = await PGlite.create()
  try {
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'json_array_owned',
      constraint: 'value',
    })
    const evaluatorSource = `pub fn ${entry}(input:TextValue,expected:TextValue,nodes:Int4Value,characters:Int4Value)->CheckOutcome {
      let result=json_array_owned_probe(input,expected,nodes,characters);check_from_bool(result)
    }`
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: ['sql__pg_catalog__jsonb_eq__tfah'],
    })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/json_array_owned.rs',
        source: `
pub fn json_array_owned_probe(input:TextValue,expected:TextValue,nodes:Int4Value,characters:Int4Value)->BoolValue {
 let parsed=jsonb_from_text_context(input,true);
 let selected=sql__pg_catalog__jsonb_array_element__08oi(parsed,make_int4_value(1));
 if let JsonbValue::Error(error)=selected {return BoolValue::Error(error);};
 if let JsonbValue::Value(value)=selected {
  let detached=jsonb_detach_subtree(value);
  let node_count=detached.nodes.len() as i32;
  let text_count=detached.characters.len() as i32;
  let actual=JsonbValue::Value(detached);
  let wanted=jsonb_from_text_context(expected,true);
  let same=sql__pg_catalog__jsonb_eq__tfah(actual,wanted);
  if let BoolValue::Value(equal)=same {
   if let Int4Value::Value(node_size)=nodes {
    if let Int4Value::Value(text_size)=characters {return make_bool_value(equal && node_count==node_size && text_count==text_size);};
   };
  };
  return same;
 };
 BoolValue::Unknown
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
          inputs: ['input', 'expected', 'nodes', 'characters'].map((name) => ({
            name,
            rustName: name,
            type: name === 'input' || name === 'expected' ? 'pg_catalog.text' : 'pg_catalog.int4',
            rustType: name === 'input' || name === 'expected' ? 'TextValue' : 'Int4Value',
          })),
        },
      ],
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [value, nodes, characters] of [
      ['1', 2, 1],
      ['{"a":[1,"é"],"b":true}', 6, 4],
      ['"z"', 2, 1],
    ] as const) {
      const input = '["unrelated padding",' + value + ',{"unused":"more padding"}]'
      const expected = (
        await pg.query<{ value: string }>('SELECT ($1::jsonb->1)::text value', [input])
      ).rows[0]!.value
      expect(
        (
          await pg.query<{ same: boolean }>('SELECT ($1::jsonb->1)=$2::jsonb same', [
            input,
            expected,
          ])
        ).rows[0]!.same,
      ).toBe(true)
      fixtures.push({
        name: 'owned',
        row: {
          input: known(input),
          expected: known(expected),
          nodes: { kind: 'Value', value: nodes },
          characters: { kind: 'Value', value: characters },
        },
        expected: { kind: 'True' },
      })
    }
    const packet = 'artifacts/goal-checks/json-populate-arrays-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/owned-summary.json',
      JSON.stringify(
        { fixtures: fixtures.length, targets: ['Rust', 'Go', 'TypeScript'] },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(directory, 'json_array_owned', group, ['owned'], fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
})
