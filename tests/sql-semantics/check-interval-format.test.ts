import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { isTemporalIntervalFormatting } from '../../src/sql-semantics/temporal-casts.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/interval-format-active'
const words = [
  'YYYY',
  'YYY',
  'YY',
  'Y',
  'Y,YYY',
  'IYYY',
  'IYY',
  'IY',
  'I',
  'CC',
  'MM',
  'DD',
  'DDD',
  'IDDD',
  'WW',
  'IW',
  'W',
  'Q',
  'J',
  'RM',
  'HH',
  'HH12',
  'HH24',
  'MI',
  'SS',
  'SSSS',
  'SSSSS',
  'MS',
  'US',
  'FF1',
  'FF2',
  'FF3',
  'FF4',
  'FF5',
  'FF6',
  'AM',
  'A.M.',
  'PM',
  'P.M.',
  'FX',
  'MONTH',
  'Month',
  'MON',
  'Mon',
  'DAY',
  'Day',
  'DY',
  'Dy',
  'D',
  'ID',
  'AD',
  'A.D.',
  'BC',
  'B.C.',
  'TZ',
  'TZH',
  'TZM',
  'OF',
]
const pictures = [
  ...new Set([
    ...words.flatMap((word) =>
      [word, word.toLowerCase()].flatMap((spelling) => [
        spelling,
        'FM' + spelling,
        'TM' + spelling,
        spelling + 'TH',
        spelling + 'th',
        spelling + 'SP',
      ]),
    ),
    '',
    '""',
    'FM',
    'TM',
    'fm',
    'tm',
    'FXFX',
    'FMFMHH24',
    'TMTMHH24',
    'HH24:MI:SS.US',
    'YYYY-MM-DD HH24:MI:SS',
    'RM|rm|FMRM|fmrm',
    'YYYYTH YYYth YYTH Yth',
    'FMFF1 FMFF2 FMMS FMUS FMFF6',
    'hello',
    'Hello World',
    '✨',
    '"年月日"HH24"時"MI"分"',
    '"YYYY"',
    '"unfinished',
    '"unfinished\\',
    '"escaped \\" quote"',
    '\\"YYYY\\"',
    '\\HH24',
    'FM?HH24',
    'TM?HH24',
    'FM"DD"DD',
    'FM\nHH24',
    'HH24\tMI',
    'HH24sp',
    'HH24SP',
    'HH24Th',
    'Ff1',
    'FmHH24',
    'TmHH24',
  ]),
]
const spans = [
  '0',
  '1 year 2 months 3 days 04:05:06.123456',
  '-1 year -2 months -3 days -04:05:06.123456',
  '1001 years 11 months 123 days 25:59:59.999999',
  '-1001 years -11 months -123 days -25:59:59.999999',
  '12 months',
  '-12 months',
  '1 month',
  '-1 month',
  '11 months',
  '-11 months',
  '1 day',
  '-1 day',
  '11 days',
  '12 days',
  '13 days',
  '21 days',
  '22 days',
  '23 days',
  '24 hours',
  '-24 hours',
  '-12 hours',
  '-1 microsecond',
  '-1001 microseconds',
  '2147483647 months',
  '-2147483648 months',
  '2147483647 days',
  '-2147483648 days',
  '9223372036854.775807 seconds',
  '-9223372036854.775808 seconds',
  '2147483647 months 2147483647 days 9223372036854.775807 seconds',
  '-2147483648 months -2147483648 days -9223372036854.775807 seconds',
  'infinity',
  '-infinity',
  null,
]
const forms = [
  { name: 'direct', call: 'pg_catalog.to_char(v,picture)' },
  { name: 'contained', call: '(ARRAY[pg_catalog.to_char(v,picture)::formatted_duration,NULL])[1]' },
  { name: 'collated', call: 'pg_catalog.to_char(v,picture COLLATE "C")' },
]
const expression = (call: string) =>
  `CASE WHEN bypass THEN true ELSE (${call}) IS NOT DISTINCT FROM expected END`
const sqlText = (value: string | null) =>
  value === null ? 'NULL' : "'" + value.replaceAll("'", "''") + "'"
const known = (
  v: string | boolean | { months: number; days: number; time: bigint } | null,
): Input => (v === null ? { kind: 'Null' } : { kind: 'Value', value: v })
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('matches native interval templates, every keyword and modifier, signed extremes, finite/NULL/infinite values, containers and lazy errors in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-interval-format-')
  const names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = []
  try {
    const functions = builtinCallables().filter(
      (item): item is FunctionMetadata =>
        item.kind === 'function' && isTemporalIntervalFormatting(item),
    )
    expect(functions.map((fn) => fn.rustName)).toEqual(['sql__pg_catalog__to_char__0fwv'])
    await pg.exec(`SET TimeZone='UTC';SET IntervalStyle='postgres';CREATE DOMAIN formatted_duration AS text;
      CREATE TABLE format_inputs(id serial,v interval);
      INSERT INTO format_inputs(v) VALUES ${spans.map((v) => '(' + sqlText(v) + '::interval)').join(',')};
      CREATE TABLE format_checks(v interval,picture text,expected text,bypass boolean,${forms.map((f) => `CONSTRAINT ${f.name} CHECK(${expression(f.call)})`).join(',')});
      ${forms.map((f) => `CREATE TABLE oracle_${f.name}(v interval,picture text,expected text,bypass boolean,CHECK(${expression(f.call)}));`).join('\n')}`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'format_checks')!
    const group = prepareCheckRustGroup(
      forms.flatMap((form) =>
        (['source', 'stored'] as const).map((origin) => {
          const name = form.name + '_' + origin
          names.push(name)
          const lowered = lowerTableCheck(
            table,
            table.constraints.find((c) => c.name === form.name)!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? 'CHECK(' + expression(form.call) + ')' : undefined,
          )!
          expect(hasUncertain(lowered.expression), name).toBe(false)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name,
            },
            expression: portableCheckAtoms(lowered.expression),
          }
        }),
      ),
    )
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    const inputs = (
      await pg.query<{ id: number; bytes: string | null }>(
        "SELECT id,encode(interval_send(v),'hex') bytes FROM format_inputs ORDER BY id",
      )
    ).rows.map((row) => ({
      id: row.id,
      span:
        row.bytes === null
          ? null
          : {
              time: Buffer.from(row.bytes, 'hex').readBigInt64BE(),
              days: Buffer.from(row.bytes, 'hex').readInt32BE(8),
              months: Buffer.from(row.bytes, 'hex').readInt32BE(12),
            },
    }))
    expect(inputs).toHaveLength(spans.length)
    let probes = 0,
      pairs = 0
    const outcomes = new Set<string>()
    for (const input of inputs) {
      const selected =
        input.id <= 3
          ? pictures
          : pictures.filter((p) => words.includes(p) || p.includes('|') || p.includes(':'))
      for (const picture of selected) {
        pairs++
        let output: string | null = null,
          failure: Outcome | undefined
        try {
          output = (
            await pg.query<{ output: string | null }>(
              'SELECT to_char(v,$1) output FROM format_inputs WHERE id=$2',
              [picture, input.id],
            )
          ).rows[0]!.output
        } catch (e) {
          expect((e as { code: string }).code).toBe('22007')
          failure = error('22007')
        }
        outcomes.add(failure ? 'Error' : output === null ? 'Null' : 'Value')
        for (const expected of [output, output === null ? 'wrong' : output + '!']) {
          const outcome: Outcome = failure ?? { kind: output === expected ? 'True' : 'False' }
          for (const form of forms) {
            let code: string | undefined
            try {
              await pg.query(
                `INSERT INTO oracle_${form.name} SELECT v,$1::text,$2::text,false FROM format_inputs WHERE id=$3`,
                [picture, expected, input.id],
              )
            } catch (e) {
              code = (e as { code: string }).code
            }
            expect(code, `${input.id}/${picture}/${form.name}`).toBe(
              failure ? '22007' : outcome.kind === 'False' ? '23514' : undefined,
            )
            probes++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: form.name + '_' + origin,
                row: {
                  v: known(input.span),
                  picture: known(picture),
                  expected: known(expected),
                  bypass: known(false),
                },
                expected: outcome,
              })
          }
        }
      }
    }
    for (const name of names) {
      const row: Row = {
        v: known(inputs[1]!.span),
        picture: known('HH24'),
        expected: known('04'),
        bypass: known(false),
      }
      fixtures.push({
        name,
        row: { ...row, v: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name,
        row: { ...row, picture: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name,
        row: { ...row, picture: { kind: 'Null' }, expected: { kind: 'Null' } },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name,
        row: { ...row, v: error('22003') as Input, picture: error('22012') as Input },
        expected: error('22003'),
      })
      fixtures.push({
        name,
        row: { ...row, v: { kind: 'Null' }, picture: error('22012') as Input },
        expected: error('22012'),
      })
      fixtures.push({
        name,
        row: { ...row, v: error('22003') as Input, bypass: known(true) },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name,
        row: { ...row, v: { kind: 'Unknown' }, bypass: known(true) },
        expected: { kind: 'True' },
      })
    }
    expect(outcomes).toEqual(new Set(['Value', 'Null', 'Error']))
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          functions: functions.length,
          inputs: inputs.length,
          templates: pictures.length,
          pairs,
          checks: names.length,
          fixtures: fixtures.length,
          inserts: probes,
          targets: ['Rust', 'Go', 'TypeScript'],
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'interval_format', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
