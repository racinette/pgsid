import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('binds JSONPath execution identities, defaults and expression composition in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-execution-sql-'))
  const known = (input: string | boolean | null): Input =>
    input === null ? { kind: 'Null' } : { kind: 'Value', value: input }
  const error = (state: string): Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    const expressions: Record<string, string> = {
      keyvalue_root: `jsonb_path_query_array('{"a":1}'::jsonb,'$.keyvalue()') IS NOT DISTINCT FROM '[{"id":0,"key":"a","value":1}]'::jsonb`,
      keyvalue_keys: `jsonb_path_query_array(document,'$.a.keyvalue().key') IS NOT DISTINCT FROM expected_array`,
      keyvalue_filter: `jsonb_path_query_first(document,'$.a.keyvalue()?(@.key=="selected").value') IS NOT DISTINCT FROM expected_first`,
      keyvalue_repeat: `jsonb_path_query_array('{"a":{"x":1}}'::jsonb,'$.keyvalue().value.keyvalue().id') IS NOT DISTINCT FROM '[20000000048]'::jsonb`,
      integer_round: `jsonb_path_query_first(document,'(1.5).integer()') IS NOT DISTINCT FROM '2'::jsonb`,
      bigint_boundary: `jsonb_path_query_first(document,'"-9223372036854775808".bigint()') IS NOT DISTINCT FROM '-9223372036854775808'::jsonb`,
      boolean_prefix: `(document @@ '"of".boolean()') IS FALSE`,
      boolean_fraction: `(document @@ '((1.0).boolean()==true) is unknown') IS TRUE`,
      number_scale: `jsonb_path_query_array(document,'"001.2300".number()')::text COLLATE "C" IS NOT DISTINCT FROM '[1.2300]' COLLATE "C"`,
      decimal_scale: `jsonb_path_query_array(document,'"12.345".decimal(4,2)')::text COLLATE "C" IS NOT DISTINCT FROM '[12.35]' COLLATE "C"`,
      decimal_negative_scale: `jsonb_path_query_array(document,'"1234".decimal(3,-1)')::text COLLATE "C" IS NOT DISTINCT FROM '[1230]' COLLATE "C"`,
      converted_string: `(document @@ '(1.2300).string()=="1.2300"') IS TRUE`,
      converted_prefix: `(document @@ '(12).string() starts with "1"') IS TRUE`,
      converted_pair: `(document @@ '(12).string()==(12).string()') IS TRUE`,
      conversion_chain: `jsonb_path_query_array(document,'"001.2300".number().string().number()')::text COLLATE "C" IS NOT DISTINCT FROM '[1.2300]' COLLATE "C"`,
      type: `(document @@ '$.a.type()=="array"') IS NOT DISTINCT FROM expected_exists`,
      size: `jsonb_path_query_first(document,'$.a.size()') IS NOT DISTINCT FROM expected_first`,
      numeric_filter: `jsonb_path_query_array(document,'$.a?(@.type()=="number").abs()') IS NOT DISTINCT FROM expected_array`,
      runtime_render: `jsonb_path_query_first(document,source::jsonpath,variables,silent)::text COLLATE "C" IS NOT DISTINCT FROM expected_first::text COLLATE "C"`,
      method_scales: `jsonb_path_query_array(document,'(1.2300).abs()')::text COLLATE "C" IS NOT DISTINCT FROM '[1.2300]' COLLATE "C"`,
      double_number_scale: `jsonb_path_query_array(document,'(1.2300).double()')::text COLLATE "C" IS NOT DISTINCT FROM '[1.2300]' COLLATE "C"`,
      double_string_scale: `jsonb_path_query_array(document,'"1.234567890123456789".double()')::text COLLATE "C" IS NOT DISTINCT FROM '[1.23456789012346]' COLLATE "C"`,
      predicate: `(document @@ '$.flag==true') IS NOT DISTINCT FROM expected_match`,
      filter_exists: `(document @? '$.a?(@>1)') IS NOT DISTINCT FROM expected_exists`,
      filter_array: `jsonb_path_query_array(document,'$.a?(@>1)') IS NOT DISTINCT FROM expected_array`,
      predicate_unknown: `(document @@ '(1=="x") is unknown') IS TRUE`,
      suppressed_predicate: `(document @@ '(1/0==1) is unknown') IS TRUE`,
      logical_skip: `(document @@ '(1==1) || exists($missing)') IS TRUE`,
      arithmetic: `jsonb_path_query_array(document,'(2+3)*4') IS NOT DISTINCT FROM '[20]'::jsonb`,
      penultimate: `jsonb_path_query_first(document,'$.a[last-1]') IS NOT DISTINCT FROM expected_first`,
      nested_last: `jsonb_path_query_array(document,'$.a[$.i[last] to last]') IS NOT DISTINCT FROM expected_array`,
      exists: `jsonb_path_exists(document,'$.a[*]') IS NOT DISTINCT FROM expected_exists`,
      exists_vars: `jsonb_path_exists(document,'$.a[$index]',variables,silent) IS NOT DISTINCT FROM expected_exists`,
      match: `jsonb_path_match(document,'$.flag','{}',true) IS NOT DISTINCT FROM expected_match`,
      match_default: `jsonb_path_match(document,'$.flag') IS NOT DISTINCT FROM expected_match`,
      match_opr: `(document @@ '$.flag') IS NOT DISTINCT FROM expected_match`,
      exists_opr: `(document @? '$.a[*]') IS NOT DISTINCT FROM expected_exists`,
      array: `jsonb_path_query_array(document,'$.a[*]') IS NOT DISTINCT FROM expected_array`,
      first: `jsonb_path_query_first(document,'$.a[*]') IS NOT DISTINCT FROM expected_first`,
      array_vars: `jsonb_path_query_array(document,'$selection',variables) IS NOT DISTINCT FROM expected_array`,
      array_runtime: `jsonb_path_query_array(document,source::retained_execution_path,variables,silent) IS NOT DISTINCT FROM expected_array`,
      first_runtime: `jsonb_path_query_first(document,source::jsonpath,variables,silent) IS NOT DISTINCT FROM expected_first`,
      exists_runtime: `jsonb_path_exists(document,source::jsonpath,variables,silent) IS NOT DISTINCT FROM expected_exists`,
      guarded: `CASE WHEN bypass THEN true ELSE jsonb_path_exists(document,source::jsonpath,variables,silent) IS NOT DISTINCT FROM expected_exists END`,
      selected: `jsonb_path_query_array(document,CASE WHEN bypass THEN '$.a[*]'::jsonpath ELSE source::jsonpath END,variables,silent) IS NOT DISTINCT FROM expected_array`,
      fallback: `COALESCE(jsonb_path_query_first(document,'$.absent'),jsonb_path_query_first(document,'$.a[*]')) IS NOT DISTINCT FROM expected_first`,
      null_path: `jsonb_path_exists(document,NULL::retained_execution_path) IS NULL`,
    }
    await pg.exec(`CREATE DOMAIN execution_path AS jsonpath;CREATE DOMAIN retained_execution_path AS execution_path;
 CREATE TABLE execution_checks(document jsonb,source text,variables jsonb,silent boolean,expected_exists boolean,expected_match boolean,expected_array jsonb,expected_first jsonb,bypass boolean,
 ${Object.entries(expressions)
   .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
   .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'execution_checks')!
    const checks = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((item) => item.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const plans = checks.map((constraint) => ({
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
          constraint.name.endsWith('_raw') ? 'source' : 'stored',
        )!.expression,
      ),
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: table.name,
        constraint: constraint.name,
      },
    }))
    for (const [index, plan] of plans.entries())
      expect(hasUncertain(plan.expression), checks[index]!.name).toBe(false)
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, checks[index]!.name + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      )
    expect(group.evaluatorSource).toContain('jsonpath_exists_utf8(')
    const defaultContext = prepareCheckRustGroup(plans)
    expect(defaultContext.evaluatorSource).toContain('sql__pg_catalog__jsonb_path_exists__81t5(')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    const cases: [string | null, string, string, boolean, boolean][] = [
      [
        '{"a":[true,false],"flag":true}',
        '$.a[*]',
        '{"index":0,"selection":[true,false]}',
        false,
        false,
      ],
      ['{"a":null,"flag":null}', '$.a[*]', '{"index":0,"selection":[null]}', false, false],
      ['{"a":[],"flag":false}', '$.a[*]', '{"index":0,"selection":[]}', false, false],
      ['{}', '$.a[*]', '{"index":0,"selection":[]}', false, false],
      [null, '$.a[*]', '{}', false, false],
      ['{"a":[1,2],"flag":false}', 'strict $.missing', '{}', false, false],
      ['{"a":[true],"flag":true}', 'strict $.a[0,8]', '{}', true, false],
      ['{"a":[true],"flag":true}', 'strict $.a[0,$missing]', '{}', true, false],
      ['{"a":[1,2],"flag":true}', '(', '{}', false, true],
      ['{"a":[1,2],"flag":true}', '$.a.datetime()', '{}', false, true],
      ['{"a":[1,2,3],"flag":true}', '$.a[last-1]', '{}', false, false],
      ['{"a":[1,2],"flag":true}', '$v+1', '{"v":[1]}', false, false],
      ['{"a":[],"flag":true}', 'strict -$v[0,8]', '{"v":[1]}', true, false],
      ['{"a":[1,2,3],"flag":true}', '$.a?(@>1)', '{}', false, false],
      ['{"a":[1,2],"flag":true}', '$.a?(@>$limit)', '{"limit":1}', false, false],
      ['{"a":[],"flag":true}', 'strict $.missing==1', '{}', false, false],
      ['{"a":[1,2],"flag":true}', '$.a?(@==$missing)', '{}', true, false],
      ['{"a":1.2300,"flag":true}', '$.a.double()', '{}', false, false],
      ['{"a":[-1,2],"flag":true}', '$.a.abs()', '{}', false, false],
      ['{"a":[1,"x",2],"flag":true}', '$.a.double()', '{}', true, false],
      ['{"a":1.5,"flag":true}', '$.a.integer()', '{}', false, false],
      ['{"a":"-9223372036854775808","flag":true}', '$.a.bigint()', '{}', false, false],
      ['{"a":"of","flag":true}', '$.a.boolean()', '{}', false, false],
      ['{"a":"001.2300","flag":true}', '$.a.number().string()', '{}', false, false],
      ['{"a":"12.345","flag":true}', '$.a.decimal(4,2)', '{}', false, false],
      ['{"a":[1,"bad",2],"flag":true}', '$.a.integer()', '{}', true, false],
      ['{"a":1.0,"flag":true}', '$.a.boolean()', '{}', false, false],
      ['{"a":12,"flag":true}', '$.a.string() starts with "1"', '{}', false, false],
      ['{"a":{"selected":1,"other":2},"flag":true}', '$.a.keyvalue()', '{}', false, false],
      ['{"a":{"selected":1,"other":2},"flag":true}', '$.a.keyvalue().key', '{}', false, false],
      [
        '{"a":{"selected":1,"other":2},"flag":true}',
        '$.a.keyvalue()?(@.value>1).key',
        '{}',
        false,
        false,
      ],
      [
        '{"a":{"selected":{"x":1}},"flag":true}',
        '$.a.keyvalue().value.keyvalue().id',
        '{}',
        false,
        false,
      ],
      ['{"a":[],"flag":true}', '$v.keyvalue()', '{"v":{"x":1}}', false, false],
    ]
    for (const [document, source, variables, silent, bypass] of cases) {
      const wanted = (
        await pg.query<{
          exists: boolean | null
          match: boolean | null
          array: string | null
          first: string | null
        }>(
          `SELECT jsonb_path_exists($1::jsonb,'$.a[*]') AS exists,jsonb_path_match($1::jsonb,'$.flag','{}',true) AS match,jsonb_path_query_array($1::jsonb,'$.a[*]')::text AS array,jsonb_path_query_first($1::jsonb,'$.a[*]')::text AS first`,
          [document],
        )
      ).rows[0]!
      const parameters = [
        document,
        source,
        variables,
        silent,
        wanted.exists,
        wanted.match,
        wanted.array,
        wanted.first,
        bypass,
      ]
      const row: Row = Object.fromEntries(
        [
          'document',
          'source',
          'variables',
          'silent',
          'expected_exists',
          'expected_match',
          'expected_array',
          'expected_first',
          'bypass',
        ].map((name, index) => [name, known(parameters[index]!)]),
      )
      for (const [name, sql] of Object.entries(expressions)) {
        let expected: Outcome
        if (
          source === '$.a.datetime()' &&
          ['array_runtime', 'first_runtime', 'exists_runtime', 'runtime_render'].includes(name)
        )
          expected = { kind: 'Unknown' }
        else {
          try {
            const answer = (
              await pg.query<{ answer: boolean | null }>(
                `SELECT (${sql}) AS answer FROM (SELECT $1::jsonb AS document,$2::text AS source,$3::jsonb AS variables,$4::boolean AS silent,$5::boolean AS expected_exists,$6::boolean AS expected_match,$7::jsonb AS expected_array,$8::jsonb AS expected_first,$9::boolean AS bypass) AS row`,
                parameters,
              )
            ).rows[0]!.answer
            expected = { kind: answer === null ? 'Null' : answer ? 'True' : 'False' }
          } catch (failure) {
            expected = error((failure as { code: string }).code)
          }
        }
        references.push({ name, parameters, expected })
        for (const suffix of ['_raw', '_stored'])
          fixtures.push({ name: name + suffix, row, expected })
      }
    }
    for (const [column, input] of [
      ['document', { kind: 'Unknown' }],
      ['source', { kind: 'Unknown' }],
      ['document', { kind: 'Error', value: { state: parseInt('22012', 36) } }],
    ] as const) {
      fixtures.push({
        name: 'guarded_stored',
        row: {
          document: known('{}'),
          source: known('('),
          variables: known('{}'),
          silent: known(false),
          expected_exists: known(false),
          bypass: known(true),
          [column]: input,
        },
        expected: { kind: 'True' },
      })
    }
    await mkdir('artifacts/jsonpath-execution-sql', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-execution-sql/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonpathexecutionsqlparity',
      group,
      checks.map((check) => check.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
