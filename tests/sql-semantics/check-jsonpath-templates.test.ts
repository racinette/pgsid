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

it('executes numeric and calendar JSONPath datetime templates with strict formatting and error hardness in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-templates-'))
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
        owner: 'jsonpath_templates',
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
    const pairs: [string, string][] = [
      ['2024', 'YYYY'],
      ['24', 'YYYY'],
      ['0', 'YYYY'],
      ['-1', 'YYYY'],
      ['-2', 'YYYY'],
      ['20240229', 'YYYYMMDD'],
      ['2024012', 'YYYYMMDD'],
      ['240102', 'YYMMDD'],
      ['2024-02-29', 'YYYY-MM-DD'],
      ['29/02/2024', 'DD/MM/YYYY'],
      ['02.29.2024', 'MM.DD.YYYY'],
      ['2023-02-29', 'YYYY-MM-DD'],
      ['2024-00-00', 'YYYY-MM-DD'],
      ['2024-13-1', 'YYYY-MM-DD'],
      [' 2024- 2- 29 ', 'YYYY-MM-DD'],
      ['2024/02/29', 'YYYY-MM-DD'],
      ['2024-02', 'YYYY-MM-DD'],
      ['2024-02-29extra', 'YYYY-MM-DD'],
      ['2024T12:34:56', 'YYYY"T"HH24:MI:SS'],
      ['2024t12:34:56', 'YYYY"T"HH24:MI:SS'],
      ['2024-02-29 12:34:56.123456+03:30', 'YYYY-MM-DD HH24:MI:SS.USTZH:TZM'],
      ['2024-02-29 12:34:56.123456+03:30', 'YYYY-MM-DD HH24:MI:SS.USOF'],
      ['2024-02-29 12:34:56.123456+03:30', 'YYYY-MM-DD HH24:MI:SS.USTZ'],
      ['2024-02-29 12:34:56.123456', 'YYYY-MM-DD HH24:MI:SS.US'],
      ['12:34:56.123456-05:30', 'HH24:MI:SS.USTZH:TZM'],
      ['12:34:56.123456-05:30', 'HH24:MI:SS.USTZ'],
      ['12:34:56.123456-05:30', 'HH24:MI:SS.USOF'],
      ['12:34:56.1', 'HH24:MI:SS.MS'],
      ['12:34:56.12', 'HH24:MI:SS.MS'],
      ['12:34:56.001', 'HH24:MI:SS.MS'],
      ['12:34:56.0000001', 'HH24:MI:SS.US'],
      ['12:34:56.1234567', 'HH24:MI:SS.US'],
      ['12:34:56. 1', 'HH24:MI:SS.US'],
      ['12:34:56.+1', 'HH24:MI:SS.US'],
      ['12:34:56.-1', 'HH24:MI:SS.US'],
      ['12:34:56.1.1', 'HH24:MI:SS.MS.US'],
      ['12:34:56.999.999999', 'HH24:MI:SS.MS.US'],
      ['12:34:56+0300', 'HH24:MI:SSTZH'],
      ['12:34:56+03:30', 'HH24:MI:SSOF'],
      ['12:34:56+15:59', 'HH24:MI:SSOF'],
      ['12:34:56+16:00', 'HH24:MI:SSOF'],
      ['12:34:56+03:60', 'HH24:MI:SSOF'],
      ['12:34:56 3:4', 'HH24:MI:SSOF'],
      ['12:34:56 30', 'HH24:MI:SS TZM'],
      ['12:34:56 -30', 'HH24:MI:SS TZM'],
      ['2024 +03', 'YYYY TZH'],
      ['+03', 'TZH'],
      ['2024', 'FXYYYY'],
      ['2024', 'YYYYFX'],
      ['', 'YYYY'],
      ['', ''],
      ['x', '"x"'],
      ['2024', 'YyYy'],
      ['2024', 'YYYYx'],
      ['2024', 'YYYY_'],
      ['2024', 'YYYY\t'],
      ['2024', 'YYYY"'],
      ['2024', 'FMYYYY'],
      ['2024', 'TMYYYY'],
      ['2024', 'YYYYSP'],
      ['2024xx', 'YYYYTH'],
      ['2024🦊é', 'YYYYTH'],
      ['2024x', 'YYYYTH'],
      ['2024', 'YYYYTH'],
      ['2024 2024', 'YYYY YYYY'],
      ['2024 24', 'YYYY YY'],
      ['24 24', 'YY YY'],
      ['0 2024', 'YYYY YYYY'],
      ['2024 0', 'YYYY YYYY'],
      ['12 12', 'HH24 HH24'],
      ['12 13', 'HH24 HH24'],
      ['0.1 0.1', 'SS.US SS.US'],
      ['0.000001 0.000001', 'SS.US SS.US'],
      ['12:34:56', 'hh24:mi:ss'],
      ['2024-02-29', 'yyyy-mm-dd'],
      ['2024-2-29', 'FXYYYY-MM-DD'],
      ['2024-2-29', 'FMYYYY-FMMM-FMDD'],
      ['2024-02-29', 'YYYY"-"MM"-"DD'],
      ['2024🦊02🦊29', 'YYYY"🦊"MM"🦊"DD'],
      ['2024-02-29', 'YYYY"🦊"MM"🦊"DD'],
      ['-2147483648', 'YYYY'],
      ['2147483648', 'YYYY'],
      ['999999999999999999999999', 'YYYY'],
      ['5874897-12-31', 'YYYY-MM-DD'],
      ['5874897-12-31 00:00:00', 'YYYY-MM-DD HH24:MI:SS'],
      ['294276-12-31 23:59:59.999999', 'YYYY-MM-DD HH24:MI:SS.FF1'],
      ['23:59:59.999999', 'HH24:MI:SS.FF1'],
      ['12:34:56', 'HH24:MI:SS""'],
      ['12:34:56', 'HH24:MI:SS '],
      ['2024-02-29', 'YYYY-MM-DD"unterminated'],
    ]
    pairs.push(
      ['21 24', 'CC YY'],
      ['2024 AD', 'YYYY AD'],
      ['2460370', 'J'],
      ['4', 'Q'],
      ['2024-09', 'YYYY-WW'],
      ['2024-02-4', 'YYYY-MM-W'],
      ['2024-060', 'YYYY-DDD'],
      ['2024-W09-4', 'IYYY-"W"IW-ID'],
      ['02-30', 'MM-DD'],
      ['02-31', 'MM-DD'],
      ['00-31', 'MM-DD'],
      ['13-01', 'MM-DD'],
      ['0000-02-30', 'YYYY-MM-DD'],
      ['-1-02-30', 'YYYY-MM-DD'],
      ['1 BC-060', 'YYYY BC-DDD'],
      ['0 BC-060', 'YYYY BC-DDD'],
      ['2024-05-01-060', 'YYYY-MM-DD-DDD'],
      ['2024-01-05-060', 'YYYY-MM-DD-DDD'],
      ['2023-02-02-999', 'YYYY-MM-DD-DDD'],
      ['2024-00-02-060', 'YYYY-MM-DD-DDD'],
      ['2024-09-001', 'YYYY-WW-DDD'],
      ['2024-02-2-28', 'YYYY-MM-W-DD'],
      ['1 AD BC', 'YYYY AD AD'],
      ['1 BC AD', 'YYYY BC BC'],
      ['1 BC BC', 'YYYY AD BC'],
      ['2460370 2024', 'J YYYY'],
      ['2024 2460370', 'YYYY J'],
      ['2147483647 2460370', 'YYYY J'],
      ['2460370 0', 'J YYYY'],
      ['2024-09-1', 'YYYY-IW-ID'],
      ['2024-02-29', 'IYYY-MM-DD'],
      ['2024-09-1', 'IYYY-WW-D'],
      ['2024-060-01', 'IYYY-IDDD-DD'],
      ['2024-W09-4', 'iyyy-"W"iw-id'],
      ['24-09-4', 'IY-IW-ID'],
      ['2024', 'IYYY'],
      ['060', 'IDDD'],
      ['060', 'DDD'],
      ['53 12', 'IW HH24'],
      ['2147483647 12', 'IW HH24'],
      ['-2147483648 12', 'IW HH24'],
      ['306783380 12', 'IW HH24'],
      ['53', 'IW'],
      ['53', 'WW'],
      ['2,024', 'Y,YYY'],
      ['2,0240229', 'Y,YYYMMDD'],
      ['2,024-02-29', 'Y,YYY-MM-DD'],
      ['2,24', 'Y,YYY'],
      ['2,0244', 'Y,YYY'],
      ['2, 24', 'Y,YYY'],
      ['2 ,024', 'Y,YYY'],
      ['-2,024', 'Y,YYY'],
      ['+2,-24', 'Y,YYY'],
      ['2,+24', 'Y,YYY'],
      ['0,000', 'Y,YYY'],
      ['2147483,647', 'Y,YYY'],
      ['2147483,648', 'Y,YYY'],
      ['2147484,-99', 'Y,YYY'],
      ['2,024 2024', 'Y,YYY YYYY'],
      ['2,024 24', 'Y,YYY YY'],
      ['2,024 BC', 'Y,YYY BC'],
    )
    for (const century of [
      '0',
      '1',
      '19',
      '20',
      '21',
      '-1',
      '42949673',
      '2147483647',
      '-2147483648',
    ])
      for (const year of ['00', '01', '24', '99']) pairs.push([century + ' ' + year, 'CC YY'])
    for (const year of ['0', '1', '-1', '2024', '2147483647', '-2147483648'])
      for (const era of ['AD', 'BC', 'a.d.', 'b.c.'])
        pairs.push([year + ' ' + era, 'YYYY ' + (era.includes('.') ? 'A.D.' : 'AD')])
    for (const century of ['1', '21', '-1', '2147483647', '-2147483648'])
      for (const era of ['AD', 'BC']) pairs.push([century + ' ' + era, 'CC BC'])
    for (const year of ['2023', '2024', '0000', '-1'])
      for (const ordinal of [
        '0',
        '1',
        '59',
        '60',
        '365',
        '366',
        '367',
        '-1',
        '2147483647',
        '-2147483648',
      ])
        pairs.push([year + '-' + ordinal, 'YYYY-DDD'])
    for (const week of [
      '0',
      '1',
      '9',
      '53',
      '54',
      '-1',
      '2147483647',
      '-2147483648',
      '306783380',
    ]) {
      pairs.push(['2024-' + week, 'YYYY-WW'])
      pairs.push(['2024-02-' + week, 'YYYY-MM-W'])
    }
    for (const year of ['2020', '2021', '2024', '0', '2147483647', '-2147483648'])
      for (const week of ['0', '1', '53', '54', '-1', '2147483647', '-2147483648'])
        pairs.push([year + '-' + week, 'IYYY-IW'])
    for (const weekday of ['-2147483648', '-1', '0', '1', '4', '7', '8', '2147483647']) {
      pairs.push(['2024-09-' + weekday, 'IYYY-IW-ID'])
      pairs.push([weekday, 'D'])
    }
    for (const ordinal of ['-2147483648', '-1', '0', '1', '365', '366', '371', '372', '2147483647'])
      pairs.push(['2024-' + ordinal, 'IYYY-IDDD'])
    for (const julian of [
      '-2147483648',
      '-32045',
      '-32044',
      '-32043',
      '-1',
      '0',
      '1',
      '1721060',
      '2451545',
      '2460370',
      '2147483493',
      '2147483494',
      '2147483647',
    ])
      pairs.push([julian, 'J'])
    for (const year of [
      '1',
      '69',
      '70',
      '99',
      '100',
      '519',
      '520',
      '999',
      '0001',
      '-1',
      '+1',
      ' 1',
    ])
      for (const format of ['Y', 'YY', 'YYY']) pairs.push([year, format])
    for (const format of ['SSSS', 'SSSSS'])
      for (const time of ['0', '1', '45296', '86399', '86400', '-1']) pairs.push([time, format])
    for (const digits of ['1', '12', '123', '1234', '12345', '123456', '0000001'])
      for (let precision = 1; precision <= 6; precision++)
        pairs.push(['12:34:56.' + digits, 'HH24:MI:SS.FF' + precision])
    for (const offset of ['+00', '+03:30', '-03:30']) {
      pairs.push(['294277-01-01 00:00:00' + offset, 'YYYY-MM-DD HH24:MI:SSOF'])
      pairs.push(['294276-12-31 23:59:59.999999' + offset, 'YYYY-MM-DD HH24:MI:SS.FF1OF'])
    }
    const cases: [string, string, string?][] = pairs.map(([input, format]) => [
      JSON.stringify(input),
      '$.datetime(' + JSON.stringify(format) + ')',
    ])
    for (const [input, format] of pairs.slice(0, 20))
      cases.push([JSON.stringify(input), '$.datetime(' + JSON.stringify(format) + ').type()'])
    for (const digits of [0, 1, 3, 6, 7]) {
      cases.push(['"294276-12-31T23:59:59.999999"', `$.timestamp(${digits})`])
      cases.push(['"294276-12-31T23:59:59.999999+00"', `$.timestamp_tz(${digits})`])
    }
    for (const offset of ['+00', '+03:30', '-03:30'])
      cases.push([JSON.stringify('294277-01-01T00:00:00' + offset), '$.datetime()'])
    cases.push(
      ['{}', '"2024".datetime("YYYY")=="2024-01-01".date()'],
      ['{}', '"2024".datetime("YYYY").string().date()'],
      ['{}', 'exists("2024".datetime("YYYY_"))'],
      ['{}', '("bad".datetime("YYYY")==null) is unknown'],
      ['{}', '("bad".datetime("YYYY_")==null) is unknown'],
      ['{}', '(1==1)||exists("2024".datetime("YYYY_"))'],
      ['{}', '(1==2)&&exists("2024".datetime("YYYY_"))'],
      ['["2024","bad","2025"]', '$.datetime("YYYY")'],
      ['["2024","bad","2025"]', 'strict $[*].datetime("YYYY")'],
      ['["2024","bad","2025"]', '$[*]?(@.datetime("YYYY")>"2024-06-01".date()).datetime("YYYY")'],
      ['[["2024"]]', '$.datetime("YYYY")'],
      ['["2024"]', 'strict $.datetime("YYYY")'],
      ['null', '$.datetime("YYYY_")'],
      ['1', '$.datetime("YYYY_")'],
      ['{}', '$v.datetime("YYYY")', '{"v":"2024"}'],
      ['{}', '$.missing.datetime("YYYY_")'],
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const [document, path, variables = '{}'] of cases) {
      const canonical = (
        await pg.query<{ text: string }>('SELECT $1::jsonpath::text AS text', [path])
      ).rows[0]!.text
      for (const silent of [false, true])
        for (const [mode, [, sql]] of functions.entries()) {
          const query =
            mode < 4
              ? `SELECT ${sql}($1::jsonb,$2::jsonpath,$3::jsonb,$4::boolean)::text AS text`
              : `SELECT ($1::jsonb ${mode === 4 ? '@?' : '@@'} $2::jsonpath)::text AS text`
          let expected: Outcome = { kind: 'True' }
          let output: string | null = null
          try {
            output = (
              await pg.query<{ text: string | null }>(
                query,
                mode < 4 ? [document, path, variables, silent] : [document, path],
              )
            ).rows[0]!.text
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
              expected,
            })
        }
    }
    for (const [input, format] of [
      ['February', 'TMMonth'],
      ['February', 'Month'],
      ['Tue', 'DY'],
      ['Tuesday', 'DAY'],
      ['IX', 'RM'],
      ['12 PM', 'HH12 AM'],
      ['12:34:56Z', 'HH24:MI:SSTZ'],
    ]) {
      const path = '$.datetime(' + JSON.stringify(format) + ')'
      const output = (
        await pg.query<{ output: string }>(
          'SELECT jsonb_path_query_array($1::jsonb,$2::jsonpath)::text AS output',
          [JSON.stringify(input), path],
        )
      ).rows[0]!.output
      expect(JSON.parse(output)).toHaveLength(1)
      references.push({ document: JSON.stringify(input), path, output, deferred: true })
      for (const variant of variants)
        fixtures.push({
          name: variant.name,
          row: {
            document: value(JSON.stringify(input)),
            path: value(path),
            variables: value('{}'),
            silent: value(true),
            expected: value('true'),
          },
          expected: { kind: 'Unknown' },
        })
    }
    for (const input of ['4294967296,024', '2147483648,001', '99999999999999999999,024']) {
      const path = '$.datetime("Y,YYY")'
      let output: string | null = null
      let state: string | null = null
      try {
        output = (
          await pg.query<{ output: string }>(
            'SELECT jsonb_path_query_array($1::jsonb,$2::jsonpath)::text AS output',
            [JSON.stringify(input), path],
          )
        ).rows[0]!.output
      } catch (failure) {
        state = (failure as { code: string }).code
      }
      references.push({
        document: JSON.stringify(input),
        path,
        output,
        state,
        deferred: true,
        requirement: 'out-of-range C scanf integer input',
      })
      for (const variant of variants)
        fixtures.push({
          name: variant.name,
          row: {
            document: value(JSON.stringify(input)),
            path: value(path),
            variables: value('{}'),
            silent: value(true),
            expected: value('true'),
          },
          expected: { kind: 'Unknown' },
        })
    }
    await mkdir('artifacts/jsonpath-templates', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-templates/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonpath-templates/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonpathtemplatesparity',
      group,
      variants.map((item) => item.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
