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

it('executes JSONPath regex predicates, flags, sequences and declared character contexts in every target', async () => {
  const pg = await PGlite.create({ initDbStartParams: ['--lc-collate=C', '--lc-ctype=C'] })
  const unicode = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-regex-'))
  const value = (value: string | boolean): Input => ({ kind: 'Value', value })
  const error = (state: string): Outcome => ({
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
  const profiles = [
    { name: 'c', c: true, utf8: true, ctype: 1 },
    { name: 'c_unknown_encoding', c: true, utf8: false, ctype: 1 },
    { name: 'c_utf8_ctype', c: true, utf8: true, ctype: 2 },
    { name: 'c_unknown_ctype', c: true, utf8: true, ctype: 0 },
    { name: 'unknown_collation', c: false, utf8: true, ctype: 0 },
  ]
  try {
    expect(
      (
        await pg.query(
          'SELECT datcollate,datctype FROM pg_database WHERE datname=current_database()',
        )
      ).rows,
    ).toEqual([{ datcollate: 'C', datctype: 'C' }])
    expect(
      (
        await unicode.query(
          'SELECT datcollate,datctype FROM pg_database WHERE datname=current_database()',
        )
      ).rows,
    ).toEqual([{ datcollate: 'C', datctype: 'C.UTF-8' }])
    const variants = functions.flatMap(([name, sql, hash], mode) =>
      [false, true].flatMap((stored) =>
        profiles.map((profile) => ({
          name: name + '_' + (stored ? 'stored' : 'source') + '_' + profile.name,
          sql,
          hash,
          mode,
          stored,
          profile,
        })),
      ),
    )
    const entries = variants.map(({ name }) =>
      checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'jsonpath_regex',
        constraint: name,
      }),
    )
    const evaluatorSource = entries
      .map(
        (
          entry,
          index,
        ) => `pub fn ${entry}(document:TextValue,path:TextValue,variables:TextValue,silent:BoolValue,expected:TextValue)->CheckOutcome {
 let result=jsonpath_regex_probe(document,path,variables,silent,expected,${variants[index]!.mode},${variants[index]!.stored},${variants[index]!.profile.c},${variants[index]!.profile.utf8},${variants[index]!.profile.ctype});check_from_bool(result)
}`,
      )
      .join('\n')
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: functions.map(([, sql, hash]) => `sql__pg_catalog__${sql}__${hash}`),
    })
    expect(source.modules.some((module) => module.name === 'regex_engine')).toBe(true)
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/jsonpath_regex.rs',
        source: `
pub fn jsonpath_regex_probe(document:TextValue,path:TextValue,variables:TextValue,silent:BoolValue,expected:TextValue,mode:i32,stored:bool,c_collation:bool,utf8:bool,ctype:i32)->BoolValue {
 let input=jsonb_from_text(document);let vars=jsonb_from_text(variables);
 let mut query=jsonpath_from_coerced_source_utf8(path.clone());if stored {query=jsonpath_from_stored_text(path);};
 let mut result=JsonbValue::Unknown;
 if mode==2 {result=jsonpath_query_array_context(input,query,vars,silent,c_collation,utf8,ctype);}
 else if mode==3 {result=jsonpath_query_first_context(input,query,vars,silent,c_collation,utf8,ctype);}
 else {
  let mut answer=BoolValue::Unknown;
  if mode==0 {answer=jsonpath_exists_context(input,query,vars,silent,c_collation,utf8,ctype);} else if mode==1 {answer=jsonpath_match_context(input,query,vars,silent,c_collation,utf8,ctype);} else if mode==4 {answer=jsonpath_exists_opr_context(input,query,c_collation,utf8,ctype);} else if mode==5 {answer=jsonpath_match_opr_context(input,query,c_collation,utf8,ctype);};
  if let BoolValue::Value(value)=answer {result=jsonpath_execution_boolean(value);};
  if let BoolValue::Error(failure)=answer {result=JsonbValue::Error(failure);};
  if let BoolValue::Null=answer {result=JsonbValue::Null;};
 };
 if let JsonbValue::Error(failure)=result {return BoolValue::Error(failure);};
 if let JsonbValue::Unknown=result {return BoolValue::Unknown;};
 if let JsonbValue::Null=result {if let TextValue::Null=expected {return BoolValue::Value(true);};return BoolValue::Value(false);};
 sql__pg_catalog__jsonb_eq__tfah(result,jsonb_from_text(expected))
}
`,
      })
    const inputs = ['document', 'path', 'variables', 'silent', 'expected'].map((name) => ({
      name,
      rustName: name,
      type: name === 'silent' ? 'pg_catalog.bool' : 'pg_catalog.text',
      rustType: name === 'silent' ? 'BoolValue' : 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: true,
      checks: entries.map((entryName) => ({ kind: 'supported', entryName, inputs })),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    const cases: [string, string, string?][] = []
    for (const subject of ['abc', 'a\nb', 'b', 'aa', '42', 'word', 'é', '😊', ''])
      for (const pattern of [
        'a',
        '^a$',
        'a.b',
        'a.*b',
        '[a-z]+',
        '[[:alpha:]]+',
        '\\d+',
        '\\w+',
        '(a|b)+',
        '(?=a)a',
        '(a)\\1',
        '\\mword\\M',
        '(?:a|b){1,3}',
        '',
        '^$',
        '[^a]',
        'a?',
        '(?i)abc',
        '(?n)^b$',
        '***=a.b',
      ])
        cases.push([JSON.stringify(subject), '$ like_regex ' + JSON.stringify(pattern)])
    for (const flags of ['', 'i', 's', 'm', 'ms', 'ims', 'q', 'qi', 'qmsx', 'mmis'])
      for (const subject of ['a.b', 'A.B', 'a\nb', 'aa\nb'])
        cases.push([JSON.stringify(subject), '$ like_regex "^a.b$" flag ' + JSON.stringify(flags)])
    cases.push(
      ['["a","b"]', '$ like_regex "a"'],
      ['["a",1]', '$ like_regex "a"'],
      ['[1,"a"]', '$ like_regex "a"'],
      ['["a",1]', 'strict $[*] like_regex "a"'],
      ['[1,"a"]', 'strict $[*] like_regex "a"'],
      ['["b",1]', '$ like_regex "a"'],
      ['[["a"]]', '$ like_regex "a"'],
      ['[]', '$ like_regex "a"'],
      ['null', '$ like_regex "a"'],
      ['true', '$ like_regex "a"'],
      ['1', '$ like_regex "a"'],
      ['{}', '$ like_regex "a"'],
      ['{}', '$.missing like_regex "a"'],
      ['{}', 'strict $.missing like_regex "a"'],
      ['{}', '$missing like_regex "a"'],
      ['{}', '(1/0) like_regex "a"'],
      ['{}', '((1/0) like_regex "a") is unknown'],
      ['{}', '!("abc" like_regex "z")'],
      ['{}', '(1==2) && ($missing like_regex "a")'],
      ['{}', '(1==1) || ($missing like_regex "a")'],
      ['["abc",1,"zab"]', '$[*]?(@ like_regex "ab")'],
      ['["abc",1,"zab"]', 'strict $[*]?(@ like_regex "ab")'],
      ['{}', '(12).string() like_regex "12"'],
      ['{}', '"2024-02-29".date() like_regex "2024"'],
      ['{}', '"2024-02-29".date().string() like_regex "2024"'],
      ['{"a":1,"bb":2}', '$.keyvalue()?(@.key like_regex "b").value'],
      ['{}', '$v like_regex "a"', '{"v":"abc"}'],
      ['{}', '$v like_regex "a"', '{"v":["abc",1]}'],
      ['{}', 'strict $v like_regex "a"', '{"v":["abc",1]}'],
    )
    const add = async (
      document: string,
      path: string,
      variables: string,
      profileNames: string[],
      deferred: string[],
    ) => {
      const canonical = (
        await pg.query<{ text: string }>('SELECT $1::jsonpath::text AS text', [path])
      ).rows[0]!.text
      for (const silent of [false, true])
        for (const [mode, [, sql]] of functions.entries())
          for (const profile of profiles.filter((profile) => profileNames.includes(profile.name))) {
            const backend = profile.ctype === 2 ? unicode : pg
            const query =
              mode < 4
                ? `SELECT ${sql}($1::jsonb,$2::jsonpath,$3::jsonb,$4::boolean)::text AS text`
                : `SELECT ($1::jsonb ${mode === 4 ? '@?' : '@@'} $2::jsonpath)::text AS text`
            let output: string | null = null
            let expected: Outcome = { kind: 'True' }
            try {
              output = (
                await backend.query<{ text: string | null }>(
                  query,
                  mode < 4 ? [document, path, variables, silent] : [document, path],
                )
              ).rows[0]!.text
            } catch (failure) {
              expected = error((failure as { code: string }).code)
            }
            if (deferred.includes(profile.name)) expected = { kind: 'Unknown' }
            references.push({
              document,
              path,
              variables,
              silent,
              sql,
              profile: profile.name,
              output,
              expected,
            })
            for (const variant of variants.filter(
              (item) => item.mode === mode && item.profile.name === profile.name,
            ))
              fixtures.push({
                name: variant.name,
                row: {
                  document: value(document),
                  path: value(variant.stored ? canonical : path),
                  variables: value(variables),
                  silent: value(silent),
                  expected: output === null ? { kind: 'Null' } : value(output),
                },
                expected,
              })
          }
    }
    for (const [document, path, variables = '{}'] of cases)
      await add(document, path, variables, ['c'], [])
    const allProfiles = profiles.map((profile) => profile.name)
    for (const [subject, pattern, flags, deferred] of [
      ['abc', 'a', '', ['unknown_collation']],
      ['ABC', 'abc', 'i', ['unknown_collation', 'c_unknown_ctype']],
      ['é', '.', '', ['unknown_collation', 'c_unknown_encoding']],
      [
        'é',
        '[[:alpha:]]',
        '',
        ['unknown_collation', 'c_unknown_encoding', 'c_unknown_ctype', 'c_utf8_ctype'],
      ],
      [
        'ſ',
        's',
        'i',
        ['unknown_collation', 'c_unknown_encoding', 'c_unknown_ctype', 'c_utf8_ctype'],
      ],
      [
        's',
        '\\u017f',
        'i',
        ['unknown_collation', 'c_unknown_encoding', 'c_unknown_ctype', 'c_utf8_ctype'],
      ],
      ['é', 'é', 'q', ['c_unknown_encoding']],
      ['Abc', 'abc', 'qi', ['unknown_collation', 'c_unknown_ctype']],
    ] as const)
      await add(
        JSON.stringify(subject),
        '$ like_regex ' + JSON.stringify(pattern) + ' flag ' + JSON.stringify(flags),
        '{}',
        allProfiles,
        [...deferred],
      )
    for (const document of ['null', 'true', '1', '{}', '[]'])
      await add(document, '$ like_regex "a"', '{}', allProfiles, [])
    for (const path of ['(1==2)&&($ like_regex "a")', '(1==1)||($ like_regex "a")'])
      await add('"abc"', path, '{}', allProfiles, [])
    await mkdir('artifacts/jsonpath-regex', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-regex/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonpath-regex/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonpathregexparity',
      group,
      variants.map((item) => item.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await unicode.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
