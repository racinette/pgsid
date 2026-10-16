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

it('owns typed ISO JSONPath temporal values and rendering in every target before SQL admission', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-temporal-values-'))
  const names = ['render', 'type', 'value', 'zone', 'hard']
  const entries = names.map((constraint) =>
    checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'jsonpath_temporal_values',
      constraint,
    }),
  )
  const evaluatorSource = entries
    .map(
      (
        entry,
        index,
      ) => `pub fn ${entry}(input:TextValue,method:Int4Value,precision:Int4Value,expected:TextValue)->CheckOutcome {
 let result=jsonpath_temporal_value_probe(input,method,precision,expected,${index});check_from_bool(result)
}`,
    )
    .join('\n')
  try {
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    expect(source.modules.some((module) => module.name === 'regex_engine')).toBe(false)
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/jsonpath_temporal_values.rs',
        source: `
pub fn jsonpath_temporal_value_probe(input:TextValue,method:Int4Value,precision:Int4Value,expected:TextValue,mode:i32)->BoolValue {
 if let Int4Value::Value(operation)=method {
  if let Int4Value::Value(digits)=precision {
   let result=jsonpath_temporal_convert(input,operation,digits);
   if result.unknown {return BoolValue::Unknown;};
   if mode==4 {
    if let TextValue::Value(wanted)=expected {return BoolValue::Value(result.hard==(wanted=="true".to_owned()));};
   };
   if result.error>0 {return BoolValue::Error(make_sql_error(result.error));};
   if result.kind<0 {return BoolValue::Null;};
   let mut actual=jsonpath_temporal_render(result);
   if mode==1 {
    let mut name="date".to_owned();
    if result.kind==2 {name="time without time zone".to_owned();};
    if result.kind==3 {name="time with time zone".to_owned();};
    if result.kind==4 {name="timestamp without time zone".to_owned();};
    if result.kind==5 {name="timestamp with time zone".to_owned();};
    actual=TextValue::Value(name);
   };
   if mode==2 {actual=TextValue::Value(text_signed_number(result.value));};
   if mode==3 {actual=TextValue::Value(text_signed_number(result.zone as i64));};
   if let TextValue::Error(error)=actual {return BoolValue::Error(error);};
   if let TextValue::Value(value)=actual {
    if let TextValue::Value(wanted)=expected {return BoolValue::Value(value==wanted);};
   };
  };
 };
 BoolValue::Unknown
}`,
      })
    const inputs = ['input', 'method', 'precision', 'expected'].map((name) => ({
      name,
      rustName: name,
      type: name === 'method' || name === 'precision' ? 'pg_catalog.int4' : 'pg_catalog.text',
      rustType: name === 'method' || name === 'precision' ? 'Int4Value' : 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: entries.map((entryName) => ({ kind: 'supported', entryName, inputs })),
    }
    const value = (value: string | number): Input => ({ kind: 'Value', value })
    const sqlError = (state: string): Outcome => ({
      kind: 'Error',
      value: { state: parseInt(state, 36) },
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    const cases = new Set([
      '0000-02-30',
      '0000-02-31',
      '-1-02-30',
      '2023-02-30',
      '2024-00-00',
      '2024-00-02',
      '2024-01-00',
      '2024--0--0',
      '0-0-0',
      '23:59:59.999999',
      '2024-02-29',
      '2023-02-29',
      '2024-1-2',
      '24-01-02',
      '1-1-1',
      '0000-01-01',
      '-1-01-01',
      '-2-01-01',
      '+24-+1-+2',
      '2024- 1- 2',
      '2024 -01-02',
      '2024-001-002',
      '000000000000000000000024-01-02',
      '2024/01/02',
      '2024.01.02',
      '20240102',
      ' 2024-01-02 ',
      '2024-01-02 BC',
      '12:34:56',
      '12:34',
      '123456',
      '1:2:3',
      '+1:+2:+3',
      '12: 34: 56',
      '12 :34:56',
      '12:34:+56',
      '12:34:56.1',
      '12:34:56.123456',
      '12:34:56.1234567',
      '12:34:56.0000000',
      '12:34:56.0000001',
      '12:34:56.+1',
      '12:34:56.-1',
      '12:34:56. 1',
      '12:34:56.+00001',
      '12:34:56.000000000000001',
      '24:00:00',
      '23:59:60',
      '12:34:56+03',
      '12:34:56-15:59',
      '12:34:56+16',
      '12:34:56+03:60',
      '12:34:56+03:30:15',
      '12:34:56+0300',
      '12:34:56+0030',
      '12:34:56+3:4',
      '12:34:56 03',
      '12:34:56 3:4',
      '12:34:56  ',
      '2024-02-29T12:34:56',
      '2024-02-29t12:34:56',
      '2024-02-29  12:34:56',
      '2024-02-29\t12:34:56',
      '2024-02-29T 12:34:56',
      '2024-02-29T12:34:56+03:30',
      '0000-01-01T00:00:00-03',
      '2024-12-31T23:59:59.999999',
      '294276-12-31',
      '294277-01-01',
      '5874897-12-31',
      'infinity',
      'now',
      'epoch',
      '',
      '12:34:56EST',
      '12:34:56Z',
      '2024-02-29T12:34:56Z',
    ])
    const methods = [
      ['datetime', 128],
      ['date', 104],
      ['time', 109],
      ['time_tz', 126],
      ['timestamp', 130],
      ['timestamp_tz', 132],
    ] as const
    const settings = methods.map(([name, method]) => ({ name, method, precision: -1 }))
    for (const [name, method] of methods.filter(([name]) => name !== 'date' && name !== 'datetime'))
      for (const precision of [0, 1, 3, 6, 7]) settings.push({ name, method, precision })
    for (const input of cases)
      for (const { name, method, precision } of settings) {
        if (
          precision >= 0 &&
          ![
            '23:59:59.999999',
            '2024-12-31T23:59:59.999999',
            '12:34:56.1',
            '2024-02-29T12:34:56+03:30',
          ].includes(input)
        )
          continue
        const path = `$.${name}(${precision < 0 ? '' : precision})`
        let output: string | null = null,
          type: string | null = null,
          error: string | null = null,
          hard = false,
          scalar: string | null = null,
          zone = '0'
        try {
          const result = (
            await pg.query<{ output: string; type: string }>(
              `SELECT jsonb_path_query_first($1::jsonb,$2::jsonpath)::text AS output,jsonb_path_query_first($1::jsonb,($2::text||'.type()')::jsonpath)::text AS type`,
              [JSON.stringify(input), path],
            )
          ).rows[0]!
          output = JSON.parse(result.output) as string
          type = JSON.parse(result.type) as string
        } catch (failure) {
          error = (failure as { code: string }).code
        }
        if (error)
          try {
            await pg.query("SELECT jsonb_path_query_first($1::jsonb,$2::jsonpath,'{}',true)", [
              JSON.stringify(input),
              path,
            ])
          } catch {
            hard = true
          }
        const namedZone = /:\d+(?:\.\d+)?[A-Za-z]+\s*$/u.test(input)
        const sessionTime =
          name === 'time_tz' &&
          type === 'time with time zone' &&
          /^[-+\d]+-.*[ T].*[+-]\d/u.test(input)
        const knownNamedFailure =
          namedZone && !input.includes('-') && ['date', 'timestamp', 'timestamp_tz'].includes(name)
        const deferred = (namedZone && !knownNamedFailure) || sessionTime
        if (output !== null && !deferred) {
          if (type === 'date')
            scalar = (
              await pg.query<{ value: string }>(
                "SELECT ($1::date-'2000-01-01'::date)::bigint::text AS value",
                [output],
              )
            ).rows[0]!.value
          else if (type?.startsWith('time ')) {
            const result = (
              await pg.query<{ value: string; zone: string }>(
                `SELECT ((extract(hour FROM $1::timetz)*3600+extract(minute FROM $1::timetz)*60+extract(second FROM $1::timetz))*1000000)::bigint::text AS value,(-extract(timezone FROM $1::timetz))::integer::text AS zone`,
                [output],
              )
            ).rows[0]!
            scalar = result.value
            if (type === 'time with time zone') zone = result.zone
          } else {
            const cast = type === 'timestamp with time zone' ? 'timestamptz' : 'timestamp'
            scalar = (
              await pg.query<{ value: string }>(
                `SELECT ((extract(epoch FROM $1::${cast})-946684800)*1000000)::bigint::text AS value`,
                [output],
              )
            ).rows[0]!.value
            if (type === 'timestamp with time zone')
              zone = (
                await pg.query<{ zone: string }>(
                  'SELECT (-extract(timezone FROM $1::timetz))::integer::text AS zone',
                  [output.slice(output.indexOf('T') + 1).replace(/ (?:BC|AD)$/u, '')],
                )
              ).rows[0]!.zone
          }
        }
        references.push({ input, path, output, type, error, hard, deferred, scalar, zone })
        for (const [index, name] of names.entries()) {
          const wanted = [output, type, scalar, zone, String(hard)][index] ?? ''
          fixtures.push({
            name,
            row: {
              input: value(input),
              method: value(method),
              precision: value(precision),
              expected: value(wanted),
            },
            expected: deferred
              ? { kind: 'Unknown' }
              : index === 4
                ? { kind: 'True' }
                : error
                  ? sqlError(error)
                  : { kind: 'True' },
          })
        }
      }
    for (const [input, expected] of [
      [{ kind: 'Unknown' }, { kind: 'Unknown' }],
      [{ kind: 'Null' }, { kind: 'Null' }],
      [{ kind: 'Error', value: { state: parseInt('22012', 36) } }, sqlError('22012')],
    ] as const)
      fixtures.push({
        name: 'render',
        row: { input, method: value(128), precision: value(-1), expected: value('') },
        expected,
      })
    await mkdir('artifacts/jsonpath-temporal-values', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-temporal-values/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonpath-temporal-values/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(directory, 'jsonpathtemporalvaluesparity', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
