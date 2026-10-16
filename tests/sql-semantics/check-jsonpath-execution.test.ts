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

it('executes structural JSONPath sequences, arithmetic, strict errors and silent prefixes in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-execution-'))
  const value = (input: string | boolean): Input => ({ kind: 'Value', value: input })
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  const functions = [
    ['exists', 'jsonb_path_exists', '81t5'],
    ['match', 'jsonb_path_match', '421e'],
    ['query_array', 'jsonb_path_query_array', 'qidf'],
    ['query_first', 'jsonb_path_query_first', 'w0y6'],
    ['exists_opr', 'jsonb_path_exists_opr', '8snd'],
    ['match_opr', 'jsonb_path_match_opr', 'juo6'],
  ] as const
  try {
    const variants = functions.flatMap(([name, sql, hash], mode) =>
      [false, true].flatMap((stored) =>
        [false, true].map((utf8) => ({
          name: name + (stored ? '_stored' : '_source') + (utf8 ? '_utf8' : ''),
          sql,
          hash,
          mode,
          stored,
          utf8,
        })),
      ),
    )
    const entries = variants.map(({ name }) =>
      checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'jsonpath_execution',
        constraint: name,
      }),
    )
    const evaluatorSource = entries
      .map(
        (
          entry,
          index,
        ) => `pub fn ${entry}(document: TextValue, path: TextValue, variables: TextValue, silent: BoolValue, expected: TextValue) -> CheckOutcome {
 let result = jsonpath_execution_probe(document, path, variables, silent, expected, ${variants[index]!.mode}, ${variants[index]!.stored}, ${variants[index]!.utf8}); check_from_bool(result)
}`,
      )
      .join('\n')
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: functions.map(([, sql, hash]) => `sql__pg_catalog__${sql}__${hash}`),
    })
    expect(source.modules.some((module) => module.name === 'regex_engine')).toBe(false)
    const operations = source.modules.find((module) => module.name === 'pg_catalog')!
    operations.files.find((file) => file.path.endsWith('/jsonpath_execute.rs'))!.source += `
pub fn jsonpath_execution_probe(document: TextValue, path: TextValue, variables: TextValue, silent: BoolValue, expected: TextValue, mode: i32, stored: bool, utf8: bool) -> BoolValue {
 let input = jsonb_from_text(document);
 let vars = jsonb_from_text(variables);
 let mut query = jsonpath_from_coerced_source_utf8(path.clone());
 if stored { query = jsonpath_from_stored_text(path); };
 let mut result = JsonbValue::Unknown;
 if mode == 2 {
  if utf8 { result = jsonpath_query_array_utf8(input, query, vars, silent); } else { result = sql__pg_catalog__jsonb_path_query_array__qidf(input, query, vars, silent); };
 } else if mode == 3 {
  if utf8 { result = jsonpath_query_first_utf8(input, query, vars, silent); } else { result = sql__pg_catalog__jsonb_path_query_first__w0y6(input, query, vars, silent); };
 } else {
  let mut answer = BoolValue::Unknown;
  if mode == 0 {
   if utf8 { answer = jsonpath_exists_utf8(input, query, vars, silent); } else { answer = sql__pg_catalog__jsonb_path_exists__81t5(input, query, vars, silent); };
  } else if mode == 1 {
   if utf8 { answer = jsonpath_match_utf8(input, query, vars, silent); } else { answer = sql__pg_catalog__jsonb_path_match__421e(input, query, vars, silent); };
  } else if mode == 4 {
   if utf8 { answer = jsonpath_exists_opr_utf8(input, query); } else { answer = sql__pg_catalog__jsonb_path_exists_opr__8snd(input, query); };
  } else {
   if utf8 { answer = jsonpath_match_opr_utf8(input, query); } else { answer = sql__pg_catalog__jsonb_path_match_opr__juo6(input, query); };
  };
  if let BoolValue::Error(failure) = answer { result = JsonbValue::Error(failure); };
  if let BoolValue::Null = answer { result = JsonbValue::Null; };
  if let BoolValue::Value(known) = answer { result = jsonpath_execution_boolean(known); };
 };
 if let JsonbValue::Error(failure) = result { return BoolValue::Error(failure); };
 if let JsonbValue::Unknown = result { return BoolValue::Unknown; };
 if let JsonbValue::Null = result {
  if let TextValue::Null = expected { return BoolValue::Value(true); };
  return BoolValue::Value(false);
 };
 sql__pg_catalog__jsonb_eq__tfah(result, jsonb_from_text(expected))
}
`
    const inputs = ['document', 'path', 'variables', 'silent', 'expected'].map((name) => ({
      name,
      rustName: name,
      type: name === 'silent' ? 'pg_catalog.bool' : 'pg_catalog.text',
      rustType: name === 'silent' ? 'BoolValue' : 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: entries.map((entryName) => ({ kind: 'supported', entryName, inputs })),
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const cases: [string, string, string?, boolean?][] = [
      ['{}', '1+2*3'],
      ['{}', '(1+2)*3'],
      ['{}', '1/3'],
      ['{}', '5.50%2'],
      ['{}', '-(1+2)'],
      ['{}', '+(1-2)'],
      ['{}', '1/0'],
      ['{}', '1%0'],
      ['{}', 'true+1'],
      ['{}', 'true+$missing'],
      ['{}', 'true+(1/0)'],
      ['{}', '(1/0)+$missing'],
      ['{}', '-true'],
      ['{}', 'strict -true'],
      ['{}', '-$v', '{"v":[1,2]}'],
      ['[1,"x",2]', '-$'],
      ['[1,"x",2]', 'strict -$'],
      ['["x",1]', '+$'],
      ['[]', '-$'],
      ['[[1],2]', '-$'],
      ['[1]', '$+1'],
      ['[1,2]', '$+1'],
      ['[1]', 'strict $+1'],
      ['{}', '$a+$b', '{"a":[1],"b":[2]}'],
      ['{}', '$a+$missing', '{"a":[1,2]}'],
      ['{}', '$a+1', '{"a":[]}'],
      ['[1]', 'strict -$[0,8]', '{}', false],
      ['[1]', 'strict $[0,8]+1', '{}', false],
      ['[1,2]', '-$[*]', '{}', false],
      ['[1,"x",2]', '-$[*]', '{}', false],
      ['{"x":2,"y":3}', '$.x+$.y', '{}', false],
      ['{}', '(1+2)[0]', '{}', false],
      ['{}', 'strict (1+2)[0]', '{}', false],
      ['{}', '(-$v)[0]', '{"v":2}', false],
      ['[0,1,2,3]', '$[last-1]'],
      ['[0,1,2,3]', '$[last-1 to last]'],
      ['[0,1,2,3]', '$[(5/2)-1]'],
      ['[0,1,2,3]', '$[1+1,3%2]'],
      ['[0,1,2,3]', '$[$i+1]', '{"i":[1]}'],
      ['[0,1,2,3]', '$[$i+1]', '{"i":[1,2]}'],
      ['[0,1,2,3]', '$[-$i]', '{"i":[-1,-2]}'],
      ['[0,1,2,3]', '$[-$i]', '{"i":[-1]}'],
      ['[0,1]', '$[0,1/0]'],
      ['[0,1]', 'strict $[0,1/0]'],
      ['[]', '$[last-1]'],
      ['[0,1]', '$[last+1]'],
      ['[0,1]', 'strict $[last+1]'],
      ['[0,1]', '$[$[0]+1]', '{}', false],
      ['{"a":[0,1,2],"i":[1,0]}', '$.a[$.i[last] to last]'],
      ['[0,1,0]', '$[last-$[last]]', '{}', false],
      ['[0,1,2]', '$[last-$x[last]]', '{"x":[0,1]}', false],
      ['{}', '(1+2).a', '{}', false],
      ['{}', '1e131071*10'],
      ['null', '$'],
      ['false', '$'],
      ['true', '$'],
      ['1.2300', '$'],
      ['"hello"', '$'],
      ['[]', '$'],
      ['{}', '$'],
      ['{}', '$.missing'],
      ['{}', 'strict $.missing'],
      ['1', 'strict $.missing'],
      ['1', 'strict $.*'],
      ['1', 'strict $[*]'],
      ['1', 'strict $[0]'],
      ['{"a":{"b":true}}', '$.a.b'],
      ['{"a":null}', '$.a'],
      ['{"a":[1,2],"longer":3}', '$.*[*]'],
      ['[{"a":true},{"a":false}]', '$.a'],
      ['[[{"a":1}],{"a":2}]', '$.a'],
      ['[{"a":true},{}]', 'strict $[*].a'],
      ['[{}, {"a":true}]', 'strict $[*].a'],
      ['[{"a":true},{}]', '$[*].a'],
      ['[[{"a":1}],{"a":2}]', '$[*].a'],
      ['1', '$[*]'],
      ['{"a":true}', '$[*].a'],
      ['[]', '$[*]'],
      ['{}', '$.*'],
      ['[0,1,2,3]', '$[2,0,2,1 to 3]'],
      ['[0,1,2,3]', '$[last]'],
      ['[]', '$[last]'],
      ['[]', 'strict $[last]'],
      ['[0,1]', '$[-3 to 8]'],
      ['[0,1]', 'strict $[-3 to 8]'],
      ['[0,1]', '$[1 to 0]'],
      ['[0,1]', 'strict $[1 to 0]'],
      ['[true]', 'strict $[0,5]'],
      ['[true]', 'strict $[5,0]'],
      ['[true]', '$[0,$missing]'],
      ['[true]', 'strict $[0,$missing]'],
      ['[true]', '$[$missing,0]'],
      ['[true,false,null]', '$[1.9,-0.9]'],
      ['[true]', '$[2147483648]'],
      ['[]', '$["x"]'],
      ['[]', '$[true]'],
      ['true', '$[0]'],
      ['true', '$[1]'],
      ['true', '$[-1 to 1]'],
      ['{}', '$x', '{"x":{"a":[true,false]}}'],
      ['{}', '$x.a[*]', '{"x":{"a":[true,false]}}'],
      ['{}', '$x', '{"x":null}'],
      ['{}', '$x'],
      ['{}', '$', '[]'],
      ['{}', '$', 'null'],
      ['[10,20]', '$[$i]', '{"i":1.9}'],
      ['[10,20]', '$[$i]', '{"i":[1]}'],
      ['{}', 'true'],
      ['{}', 'false'],
      ['{}', 'null'],
      ['{}', '12.30'],
      ['{}', '"text"'],
      ['{}', '(1)[0]'],
      ['{"a":[1,{"b":true}],"empty":{},"list":[]}', '$.**'],
      ['{"a":[1,{"b":true}],"empty":{},"list":[]}', 'strict $.**.b'],
      ['{"a":[1,{"b":true}],"empty":{},"list":[]}', '$.**{last}'],
      ['true', '$.**{last}'],
      ['true', '$.**{0}'],
      ['true', '$.**{1}'],
      ['{"a":{"b":1},"c":[2,3]}', '$.**{1 to 2}'],
      ['{"a":{"b":1},"c":[2,3]}', '$.**{2 to 1}'],
      ['{"a":{"b":1}}', '$.**{last to 2}'],
      ['{"a":{"b":1}}', '$.**{0 to last}.b'],
      ['[[1,2],[3]]', '$.**[*]'],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const [document, path, variables = '{}', storedSafe = true] of cases) {
      const canonical = (
        await pg.query<{ text: string }>('SELECT $1::jsonpath::text AS text', [path])
      ).rows[0]!.text
      for (const silent of [false, true]) {
        for (const [mode, [, sql]] of functions.entries()) {
          const query =
            mode < 4
              ? `SELECT ${sql}($1::jsonb,$2::jsonpath,$3::jsonb,$4::boolean)::text AS text`
              : `SELECT ($1::jsonb ${mode === 4 ? '@?' : '@@'} $2::jsonpath)::text AS text`
          const parameters = mode < 4 ? [document, path, variables, silent] : [document, path]
          let expected: Outcome = { kind: 'True' }
          let output: string | null = null
          try {
            output = (await pg.query<{ text: string | null }>(query, parameters)).rows[0]!.text
          } catch (failure) {
            expected = error((failure as { code: string }).code)
          }
          references.push({ document, path, variables, silent, sql, output, expected })
          for (const variant of variants.filter((item) => item.mode === mode))
            fixtures.push({
              name: variant.name,
              row: {
                document: value(document),
                path: value(variant.stored ? canonical : path),
                variables: value(variables),
                silent: value(silent),
                expected: output === null ? { kind: 'Null' } : value(output),
              },
              expected: variant.stored && !storedSafe ? { kind: 'Unknown' } : expected,
            })
        }
      }
    }
    for (const variant of variants) {
      const base: Row = {
        document: value('{}'),
        path: value('$'),
        variables: value('{}'),
        silent: value(false),
        expected: value('true'),
      }
      for (const column of [
        'document',
        'path',
        ...(variant.mode < 4 ? ['variables', 'silent'] : []),
      ]) {
        fixtures.push({
          name: variant.name,
          row: { ...base, [column]: { kind: 'Unknown' } },
          expected: { kind: 'Unknown' },
        })
        fixtures.push({
          name: variant.name,
          row: { ...base, [column]: error('22012') },
          expected: error('22012'),
        })
        fixtures.push({
          name: variant.name,
          row: { ...base, [column]: { kind: 'Null' }, expected: { kind: 'Null' } },
          expected: { kind: 'True' },
        })
      }
      if (variant.mode < 4) {
        fixtures.push({
          name: variant.name,
          row: {
            ...base,
            document: { kind: 'Null' },
            path: { kind: 'Unknown' },
            expected: { kind: 'Null' },
          },
          expected: { kind: 'True' },
        })
        fixtures.push({
          name: variant.name,
          row: { ...base, document: { kind: 'Unknown' }, variables: error('22003') },
          expected: error('22003'),
        })
      }
      fixtures.push({
        name: variant.name,
        row: { ...base, path: value('$.a.type()') },
        expected: variant.stored
          ? { kind: 'Unknown' }
          : variant.mode === 0 || variant.mode === 4
            ? { kind: 'False' }
            : variant.mode === 2
              ? { kind: 'False' }
              : variant.mode === 3
                ? { kind: 'False' }
                : variant.mode === 5
                  ? { kind: 'False' }
                  : error('22038'),
      })
      fixtures.push({
        name: variant.name,
        row: { ...base, document: value('{"a":1}'), path: value('$.a.type()') },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name: variant.name,
        row: { ...base, path: value('(-$.x.abs() == 1)') },
        expected: { kind: 'Unknown' },
      })
    }
    for (const variant of variants) {
      for (const path of ['$?(@==1)', '$.a.size()', '$ == true', '$ like_regex "a"'])
        fixtures.push({
          name: variant.name,
          row: {
            document: value('{"a":[1,2]}'),
            path: value(path),
            variables: value('{}'),
            silent: value(false),
            expected: value('true'),
          },
          expected: { kind: 'Unknown' },
        })
    }
    for (const [, sql] of functions.slice(0, 4))
      await expect(
        pg.query(`SELECT ${sql}('{}'::jsonb,'(-$.x.abs() == 1)'::jsonpath,'[]'::jsonb,true)`),
      ).rejects.toMatchObject({ code: '22023' })
    for (const variant of variants.filter((item) => item.mode < 4)) {
      const row: Row = {
        document: value('{}'),
        path: value('(-$.x.abs() == 1)'),
        variables: value('[]'),
        silent: value(true),
        expected: value('true'),
      }
      fixtures.push({ name: variant.name, row, expected: error('22023') })
      fixtures.push({
        name: variant.name,
        row: { ...row, path: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
    }
    for (const variant of variants) {
      const document = '{"aa":1,"é":2,"z":3}'
      for (const path of ['$.*', '$.**', '$.**{0}']) {
        const mode = variant.mode
        const sql = variant.sql
        const query =
          mode < 4
            ? `SELECT ${sql}($1::jsonb,$2::jsonpath,'{}'::jsonb,false)::text AS text`
            : `SELECT ($1::jsonb ${mode === 4 ? '@?' : '@@'} $2::jsonpath)::text AS text`
        let expected: Outcome = { kind: 'True' },
          output: string | null = null
        try {
          output = (await pg.query<{ text: string | null }>(query, [document, path])).rows[0]!.text
        } catch (failure) {
          expected = error((failure as { code: string }).code)
        }
        if (!variant.utf8 && path !== '$.**{0}' && (mode === 2 || mode === 3))
          expected = { kind: 'Unknown' }
        fixtures.push({
          name: variant.name,
          row: {
            document: value(document),
            path: value(path),
            variables: value('{}'),
            silent: value(false),
            expected: output === null ? { kind: 'Null' } : value(output),
          },
          expected,
        })
      }
    }
    const original = '(-$v)[0]+2'
    const printed = (
      await pg.query<{ text: string }>('SELECT $1::jsonpath::text AS text', [original])
    ).rows[0]!.text
    const witness: Record<string, string> = {}
    for (const [name, path] of [
      ['original', original],
      ['printed', printed],
    ] as const) {
      try {
        witness[name] = (
          await pg.query<{ text: string }>(
            `SELECT jsonb_path_query_array('{}'::jsonb,$1::jsonpath,'{"v":[1,2]}'::jsonb)::text AS text`,
            [path],
          )
        ).rows[0]!.text
      } catch (failure) {
        witness[name] = (failure as { code: string }).code
      }
    }
    expect(witness).toEqual({ original: '22038', printed: '[1]' })
    for (const variant of variants.filter(
      (item) => !item.stored && (item.mode === 2 || item.mode === 3),
    ))
      fixtures.push({
        name: variant.name,
        row: {
          document: value('{}'),
          path: value('1+'.repeat(4000) + '1'),
          variables: value('{}'),
          silent: value(false),
          expected: value(variant.mode === 2 ? '[4001]' : '4001'),
        },
        expected: { kind: 'True' },
      })
    await mkdir('artifacts/jsonpath-arithmetic', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-arithmetic/lossy-rendering.json',
      JSON.stringify({ original, printed, witness }, null, 2) + '\n',
    )
    await mkdir('artifacts/jsonpath-execution', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-execution/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonpath-execution/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonpathexecutionparity',
      group,
      variants.map((item) => item.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
