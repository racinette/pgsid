import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { isTemporalTimestampFormatting } from '../../src/sql-semantics/temporal-casts.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { selectCheckFunctions } from './check-function-selection.js'

const available = builtinCallables().filter(
  (f): f is FunctionMetadata => f.kind === 'function' && isTemporalTimestampFormatting(f),
)
const { functions, scope } = selectCheckFunctions(
  available,
  process.env['PGSID_CHECK_TIMESTAMP_FORMAT_FUNCTIONS'],
)
const basePacket = 'artifacts/goal-checks/timestamp-format-active'
const packet =
  scope.kind === 'all-functions'
    ? basePacket
    : basePacket + '/scoped/' + functions.map((f) => f.rustName).join('+')
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

const compound = [
  { text: 'YYYY-MM-DD HH24:MI:SS.US', zone: true },
  { text: 'Month|Mon|DAY|Dy|RM|MM|Q', zone: true, weekdayName: true },
  { text: 'IYYY-IW-ID-IDDD|YYYY-DDD-WW-W', zone: true },
  { text: 'Y,YYY CC BC AD', zone: true },
  { text: 'TZ|tz|TZH:TZM|OF|FMOF', zone: true },
  { text: 'TMMONTH TMMon TMday', zone: true, locale: true, weekdayName: true },
  { text: 'FMDDth', zone: true },
  { text: '"literal"', zone: false },
  { text: 'FF1 FF2 FF3 FF4 FF5 FF6 MS US', zone: false },
  { text: 'FX', zone: false },
  { text: '', zone: false },
]
const dates = [
  '2000-12-31 23:59:59.123456',
  '0001-01-01 BC',
  ...Array.from(
    { length: 12 },
    (_, m) => `2024-${String(m + 1).padStart(2, '0')}-15 12:34:56.000001`,
  ),
  '1900-01-01',
  '2001-01-01',
  '10000-01-01',
  '0100-12-31 BC',
  '0101-01-01 BC',
  '4714-11-24 BC',
  '294276-12-31 23:59:59.999999',
  '1883-11-18 17:00:00',
  '2024-03-10 07:30:00',
  '2024-11-03 05:30:00',
  'infinity',
  '-infinity',
  null,
]
const textSql = (value: string | null) =>
  value === null ? 'NULL' : "'" + value.replaceAll("'", "''") + "'"
const normal = dates.map((value, i) => ({
  label: 'date_' + i,
  s: textSql(value) + '::timestamp',
  z: value === null ? 'NULL::timestamptz' : `(${textSql(value)}::timestamp AT TIME ZONE 'UTC')`,
}))
const inputsSql = [
  ...normal,
  {
    label: 'rounded',
    s: "(timestamp '294276-12-31 23:59:59.999999')::timestamp(0)",
    z: "(timestamptz '294276-12-31 23:59:59.999999+00')::timestamptz(0)",
  },
  {
    label: 'stored_lower',
    s: "(timestamptz '4714-11-24+00 BC')::date::timestamp",
    z: "timestamptz '4714-11-24+00 BC'",
  },
]
const profiles: { name: string; context: CheckExecutionContext }[] = [
  { name: 'UTC', context: { timeZone: 'UTC', timeLocale: 'C', defaultCollation: 'C' } },
  {
    name: 'New_York',
    context: { timeZone: 'America/New_York', timeLocale: 'C', defaultCollation: 'C' },
  },
  { name: 'Guam', context: { timeZone: 'Pacific/Guam', timeLocale: 'C', defaultCollation: 'C' } },
  { name: 'east', context: { timeZone: '167.999', timeLocale: 'C', defaultCollation: 'C' } },
  { name: 'west', context: { timeZone: '-167.999', timeLocale: 'C', defaultCollation: 'C' } },
  { name: 'missing_zone', context: { timeLocale: 'C', defaultCollation: 'C' } },
  { name: 'missing_locale', context: { timeZone: 'UTC', defaultCollation: 'C' } },
  { name: 'missing_collation', context: { timeZone: 'UTC', timeLocale: 'C' } },
]
const forms = functions.flatMap((fn) => {
  const column = fn.args[0] === 'pg_catalog.timestamptz' ? 'z' : 's'
  return [
    {
      name: fn.rustName + '_direct',
      fn,
      column,
      explicit: false,
      call: `pg_catalog.to_char(${column},picture)`,
    },
    {
      name: fn.rustName + '_contained',
      fn,
      column,
      explicit: true,
      call: `(ARRAY[pg_catalog.to_char(${column},picture COLLATE "C")::formatted_instant,NULL])[1]`,
    },
    {
      name: fn.rustName + '_other',
      fn,
      column,
      explicit: false,
      other: true,
      call: `pg_catalog.to_char(${column},picture COLLATE public.format_other)`,
    },
  ]
})
const expression = (call: string) =>
  `CASE WHEN bypass THEN true ELSE ((${call}) COLLATE "C") IS NOT DISTINCT FROM expected END`
const known = (v: bigint | string | boolean | null): Input =>
  v === null ? { kind: 'Null' } : { kind: 'Value', value: v }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })
const infinite = (v: bigint | null) => v === -9223372036854775808n || v === 9223372036854775807n

it('matches local and instant timestamp templates with explicit locale and timezone, native calendars, conditional context, stored bounds and lazy composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-timestamp-format-')
  const names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    expect(available.map((f) => f.rustName).sort()).toEqual([
      'sql__pg_catalog__to_char__ly1v',
      'sql__pg_catalog__to_char__m86d',
    ])
    await pg.exec(`SET TimeZone='UTC';SET lc_time='C';CREATE COLLATION public.format_other(provider=icu,locale='und',deterministic=true);CREATE DOMAIN formatted_instant AS text;
   CREATE TABLE template_inputs(id serial,label text,s timestamp,z timestamptz);
   INSERT INTO template_inputs(label,s,z) VALUES ${inputsSql
     .slice(0, -1)
     .map((r) => `('${r.label}',${r.s},${r.z})`)
     .join(',')};
   SET TimeZone='-24'; INSERT INTO template_inputs(label,s,z) VALUES ('stored_lower',${inputsSql.at(-1)!.s},${inputsSql.at(-1)!.z}); SET TimeZone='UTC';
   CREATE TABLE template_checks(s timestamp,z timestamptz,picture text,expected text,bypass boolean,${forms.map((f) => `CONSTRAINT ${f.name} CHECK(${expression(f.call)})`).join(',')});
   ${forms.map((f) => `CREATE TABLE oracle_${f.name}(s timestamp,z timestamptz,picture text,expected text,bypass boolean,CHECK(${expression(f.call)}));`).join('\n')}`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'template_checks')!
    const groups = profiles.map((profile, index) =>
      prepareCheckRustGroup(
        forms.flatMap((form) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `p${index}_${form.name}_${origin}`
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
        profile.context,
      ),
    )
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
      group = {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({
          source: evaluatorSource,
          callables: [
            ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
          ],
        }),
        requiresRegex: false,
      }
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    const inputs = (
      await pg.query<{ id: number; label: string; s: string | null; z: string | null }>(
        "SELECT id,label,encode(timestamp_send(s),'hex') s,encode(timestamptz_send(z),'hex') z FROM template_inputs ORDER BY id",
      )
    ).rows.map((r) => ({
      ...r,
      s: r.s === null ? null : Buffer.from(r.s, 'hex').readBigInt64BE(),
      z: r.z === null ? null : Buffer.from(r.z, 'hex').readBigInt64BE(),
    }))
    expect(inputs).toHaveLength(inputsSql.length)
    let pairs = 0,
      probes = 0,
      deferred = 0
    const used = new Set<number>()
    for (const [index, profile] of profiles.entries()) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [profile.context.timeZone ?? 'UTC'])
      const selected =
        index === 0
          ? inputs
          : inputs.filter((r) => [1, 2, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29].includes(r.id))
      for (const input of selected) {
        used.add(input.id)
        const negativeWeekday =
          input.z !== null &&
          !infinite(input.z) &&
          Number(
            (
              await pg.query<{ value: string | null }>(
                "SELECT to_char(z,'D') value FROM template_inputs WHERE id=$1",
                [input.id],
              )
            ).rows[0]!.value,
          ) < 1

        if (negativeWeekday) {
          const nativeName = (
            await pg.query<{ value: string }>(
              "SELECT to_char(z,'Day') value FROM template_inputs WHERE id=$1",
              [input.id],
            )
          ).rows[0]!.value.trim()
          expect([
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
          ]).not.toContain(nativeName)
        }
        const templates =
          index === 0 && input.id <= 2
            ? pictures.map((text) => ({ text, zone: false, locale: false, weekdayName: false }))
            : compound
        for (const picture of templates)
          for (const form of forms) {
            if (
              form.other &&
              (index !== 0 ||
                input.id !== 1 ||
                !['MONTH', 'TMMONTH', 'DD', 'TZ'].includes(picture.text))
            )
              continue
            pairs++
            let output: string | null = null,
              failure: Outcome | undefined
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${form.call}) value FROM(SELECT s,z,$1::text picture FROM template_inputs WHERE id=$2)q`,
                  [picture.text, input.id],
                )
              ).rows[0]!.value
            } catch (e) {
              expect((e as { code: string }).code).toBe('22008')
              failure = error('22008')
            }
            const inputValue = form.column === 's' ? input.s : input.z
            const platformDeferral =
              form.column === 'z' &&
              profile.context.timeZone !== undefined &&
              negativeWeekday &&
              picture.weekdayName
            const defer =
              platformDeferral ||
              (!failure &&
                inputValue !== null &&
                !infinite(inputValue) &&
                picture.text !== '' &&
                ((form.column === 'z' && profile.context.timeZone === undefined && picture.zone) ||
                  ((picture.locale || (form.other && picture.text === 'TMMONTH')) &&
                    (profile.context.timeLocale === undefined ||
                      form.other ||
                      (!form.explicit && profile.context.defaultCollation === undefined)))))
            if (defer) deferred++
            native.push({
              profile: profile.name,
              input: input.label,
              formatter: form.fn.rustName,
              form: form.name,
              picture: picture.text,
              output,
              error: failure,
              defer,
            })
            for (const expected of [output, output === null ? 'wrong' : output + '!']) {
              const reference: Outcome = failure ?? { kind: output === expected ? 'True' : 'False' }
              let code: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${form.name} SELECT s,z,$1::text,$2::text,false FROM template_inputs WHERE id=$3`,
                  [picture.text, expected, input.id],
                )
              } catch (e) {
                code = (e as { code: string }).code
              }
              const detailError =
                input.s !== null && !infinite(input.s) && input.s < -211813488000000000n
              expect(code, `${profile.name}/${input.label}/${picture.text}/${form.name}`).toBe(
                failure
                  ? '22008'
                  : reference.kind === 'False'
                    ? detailError
                      ? '22008'
                      : '23514'
                    : undefined,
              )
              probes++
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${form.name}_${origin}`,
                  row: {
                    s: known(input.s),
                    z: known(input.z),
                    picture: known(picture.text),
                    expected: known(expected),
                    bypass: known(false),
                  },
                  expected: defer ? { kind: 'Unknown' } : reference,
                })
            }
          }
      }
    }
    for (const [index] of profiles.entries())
      for (const form of forms)
        for (const origin of ['source', 'stored']) {
          const name = `p${index}_${form.name}_${origin}`,
            row: Row = {
              s: known(inputs[0]!.s),
              z: known(inputs[0]!.z),
              picture: known('YYYY'),
              expected: known('2000'),
              bypass: known(false),
            }
          fixtures.push({
            name,
            row: { ...row, [form.column]: { kind: 'Unknown' } },
            expected: { kind: 'Unknown' },
          })
          fixtures.push({
            name,
            row: { ...row, picture: { kind: 'Unknown' } },
            expected: { kind: 'Unknown' },
          })
          fixtures.push({
            name,
            row: {
              ...row,
              [form.column]: error('22003') as Input,
              picture: error('22012') as Input,
            },
            expected: error('22003'),
          })
          fixtures.push({
            name,
            row: { ...row, [form.column]: error('22003') as Input, bypass: known(true) },
            expected: { kind: 'True' },
          })
          fixtures.push({
            name,
            row: { ...row, [form.column]: { kind: 'Unknown' }, bypass: known(true) },
            expected: { kind: 'True' },
          })
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          scope,
          functions: functions.length,
          checks: names.length,
          templates: pictures.length,
          profiles: profiles.length,
          inputs: used.size,
          pairs,
          fixtures: fixtures.length,
          inserts: probes,
          deferred,
          targets: ['Rust', 'Go', 'TypeScript'],
        },
        null,
        2,
      ) + '\n',
    )
    await writeFile(packet + '/native.json', JSON.stringify(native, null, 2) + '\n')
    await runCheckParity(root, 'timestamp_format', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)

it.skipIf(!functions.some((fn) => fn.args[0] === 'pg_catalog.timestamptz'))(
  'preserves long timezone label errors after missing locale and non-NULL template facts',
  async () => {
    const pg = await PGlite.create(),
      root = await mkdtemp('/tmp/pgsid-timestamp-format-boundaries-')
    const names: string[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const boundaryForms = [
      { name: 'picture', call: 'pg_catalog.to_char(z,picture)' },
      { name: 'nonnull', call: 'pg_catalog.to_char(z,s::text)' },
    ]
    const zones = ['<ABCDEFGHIJKLMNOPQRSTUVWX>0', '<ABCDEFGHIJKLMNOPQRSTUVWXY>0']
    try {
      await pg.exec(
        `SET lc_time='C';SET TimeZone='UTC';CREATE TABLE template_boundaries(z timestamptz,s timestamp,picture text,expected text,bypass boolean,${boundaryForms.map((f) => `CONSTRAINT ${f.name} CHECK(${expression(f.call)})`).join(',')});${boundaryForms.map((f) => `CREATE TABLE boundary_${f.name}(z timestamptz,s timestamp,picture text,expected text,bypass boolean,CHECK(${expression(f.call)}));`).join('\n')}`,
      )
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'template_boundaries')!
      const groups = zones.map((timeZone, index) =>
        prepareCheckRustGroup(
          boundaryForms.flatMap((form) =>
            (['source', 'stored'] as const).map((origin) => {
              const name = `b${index}_${form.name}_${origin}`
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
              expect(hasUncertain(lowered.expression)).toBe(false)
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
          { timeZone, defaultCollation: 'C' },
        ),
      )
      const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
        group = {
          checks: groups.flatMap((g) => g.checks),
          evaluatorSource,
          source: assembleCheckRust({
            source: evaluatorSource,
            callables: [
              ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
            ],
          }),
          requiresRegex: false,
        }
      expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
      let inserts = 0
      for (const [index, timeZone] of zones.entries()) {
        await pg.query("SELECT set_config('TimeZone',$1,false)", [timeZone])
        for (const z of [0n, 9223372036854775807n, null])
          for (const picture of [
            'TZ',
            'tz',
            'TZH OF',
            'TMMONTH TZ',
            'TZ TMMONTH',
            '"literal"',
            'TMMONTH',
          ])
            for (const form of boundaryForms) {
              const instant = z === null ? null : z === 0n ? '2000-01-01+00' : 'infinity'
              let output: string | null = null,
                code: string | undefined
              try {
                output = (
                  await pg.query<{ value: string | null }>(
                    `SELECT (${form.call}) value FROM(SELECT $1::timestamptz z,timestamp '2000-01-01' s,$2::text picture)q`,
                    [instant, picture],
                  )
                ).rows[0]!.value
              } catch (e) {
                code = (e as { code: string }).code
                expect(code).toBe('22008')
              }
              const defer =
                z === 0n && !code && (form.name === 'nonnull' || picture.includes('TMMONTH'))
              for (const expected of [output, output === null ? 'wrong' : output + '!']) {
                const result: Outcome = code
                  ? error(code)
                  : { kind: output === expected ? 'True' : 'False' }
                let rejection: string | undefined
                try {
                  await pg.query(
                    `INSERT INTO boundary_${form.name} VALUES($1::timestamptz,timestamp '2000-01-01',$2::text,$3::text,false)`,
                    [instant, picture, expected],
                  )
                } catch (e) {
                  rejection = (e as { code: string }).code
                }
                expect(rejection).toBe(code ?? (result.kind === 'False' ? '23514' : undefined))
                inserts++
                for (const origin of ['source', 'stored'])
                  fixtures.push({
                    name: `b${index}_${form.name}_${origin}`,
                    row: {
                      z: known(z),
                      s: known(0n),
                      picture: known(picture),
                      expected: known(expected),
                      bypass: known(false),
                    },
                    expected: defer ? { kind: 'Unknown' } : result,
                  })
              }
            }
      }
      await mkdir(packet, { recursive: true })
      await writeFile(
        packet + '/boundaries-summary.json',
        JSON.stringify(
          {
            checks: names.length,
            fixtures: fixtures.length,
            inserts,
            profiles: zones.length,
            targets: ['Rust', 'Go', 'TypeScript'],
          },
          null,
          2,
        ) + '\n',
      )
      await runCheckParity(root, 'timestamp_format_boundaries', group, names, fixtures)
    } finally {
      await pg.close()
      await rm(root, { recursive: true, force: true })
    }
  },
  600000,
)
