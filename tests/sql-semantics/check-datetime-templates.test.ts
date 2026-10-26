import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { isTemporalTemplateParsing } from '../../src/sql-semantics/temporal-casts.js'
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
import { datetimeTemplatePairs } from './check-datetime-template-cases.js'

const available = builtinCallables().filter(
  (f): f is FunctionMetadata => f.kind === 'function' && isTemporalTemplateParsing(f),
)
const { functions, scope } = selectCheckFunctions(
  available,
  process.env['PGSID_CHECK_DATETIME_TEMPLATE_FUNCTIONS'],
)
const basePacket = 'artifacts/goal-checks/datetime-template-active'
const packet =
  scope.kind === 'all-functions'
    ? basePacket
    : basePacket + '/scoped/' + functions.map((f) => f.rustName).join('+')
const full: CheckExecutionContext = {
  timeZone: 'UTC',
  timeZoneAbbreviations: 'Default',
  timeLocale: 'C',
  defaultCollation: 'C',
  serverEncoding: 'UTF8',
}
const profiles: { name: string; context: CheckExecutionContext }[] = [
  { name: 'UTC', context: full },
  { name: 'New_York', context: { ...full, timeZone: 'America/New_York' } },
  { name: 'Moscow', context: { ...full, timeZone: 'Europe/Moscow' } },
  { name: 'POSIX', context: { ...full, timeZone: 'ABC3BCD2,M3.2.0,M11.1.0' } },
  { name: 'POSIX_same', context: { ...full, timeZone: 'ABC3ABC2,M3.2.0,M11.1.0' } },
  { name: 'missing_zone', context: { ...full, timeZone: undefined } },
  { name: 'missing_locale', context: { ...full, timeLocale: undefined } },
  { name: 'missing_collation', context: { ...full, defaultCollation: undefined } },
  { name: 'missing_encoding', context: { ...full, serverEncoding: undefined } },
  { name: 'missing_registry', context: { ...full, timeZoneAbbreviations: undefined } },
]
const cases = [
  { input: '2024-02-29', template: 'YYYY-MM-DD' },
  { input: '2024-02-29 +02', template: 'YYYY-MM-DD TZH', numeric: true },
  { input: '2024-02-29 -00:30', template: 'YYYY-MM-DD OF', numeric: true },
  { input: '2024-02-29 UTC', template: 'YYYY-MM-DD TZ', abbreviation: true },
  { input: '2024-02-29 EST', template: 'YYYY-MM-DD TZ', abbreviation: true, registry: true },
  { input: 'February 29 2024', template: 'Month DD YYYY' },
  { input: 'February 29 2024', template: 'TMMonth DD YYYY', locale: true },
  { input: '2024 February 29', template: 'YYYY TMMonth DD', locale: true },
  { input: ' é', template: 'FXMM"1"', encoding: true },
  { input: '2024-02-30 +99', template: 'YYYY-MM-DD TZH', numeric: true },
  { input: '2024-02-29 +99', template: 'YYYY-MM-DD TZH', numeric: true },
  { input: '', template: 'TMMonth' },
  { input: null, template: 'TMMonth' },
  { input: 'bad', template: null },
  { input: 'bad', template: 'YYYY-MM-DD' },
] as const
const forms = functions.flatMap((fn) => [
  {
    name: fn.name + '_direct',
    fn,
    explicit: false,
    other: false,
    call: `pg_catalog.${fn.name}(input,picture)`,
  },
  {
    name: fn.name + '_contained',
    fn,
    explicit: true,
    other: false,
    call: `(ARRAY[pg_catalog.${fn.name}(input,picture COLLATE "C")::parsed_${fn.name},NULL])[1]`,
  },
  {
    name: fn.name + '_other',
    fn,
    explicit: false,
    other: true,
    call: `pg_catalog.${fn.name}(input,picture COLLATE public.template_other)`,
  },
])
const expression = (call: string, fn: FunctionMetadata) =>
  `CASE WHEN bypass THEN true ELSE (encode(pg_catalog.${fn.name === 'to_date' ? 'date_send' : 'timestamptz_send'}(${call}),'hex') COLLATE "C") IS NOT DISTINCT FROM expected END`
const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })
const overflowGroup = (input: string | null, template: string | null) => {
  if (input === null || template === null || !template.includes('Y,YYY')) return false
  const match = input.match(/^\s*([+-]?\d+),\s*[+-]?\d/)
  return match !== null && (BigInt(match[1]!) > 2147483647n || BigInt(match[1]!) < -2147483648n)
}

it('matches SQL datetime templates, native input grammar, calendars, zone prefixes, explicit context, domains and lazy source/stored checks', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-datetime-templates-')
  const names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    expect(available.map((f) => f.rustName).sort()).toEqual([
      'sql__pg_catalog__to_date__643t',
      'sql__pg_catalog__to_timestamp__xn0m',
    ])
    await pg.exec(`SET TimeZone='UTC';SET lc_time='C';CREATE COLLATION public.template_other(provider=icu,locale='und',deterministic=true);
      CREATE DOMAIN parsed_to_date AS date;CREATE DOMAIN parsed_to_timestamp AS timestamptz;
      CREATE TABLE template_checks(input text,picture text,expected text,bypass boolean,${forms.map((f) => `CONSTRAINT ${f.name} CHECK(${expression(f.call, f.fn)})`).join(',')});
      ${forms.map((f) => `CREATE TABLE oracle_${f.name}(input text,picture text,expected text,bypass boolean,CHECK(${expression(f.call, f.fn)}));`).join('\n')}`)
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
              origin === 'source' ? 'CHECK(' + expression(form.call, form.fn) + ')' : undefined,
            )!
            expect(hasUncertain(lowered.expression), name).toBe(false)
            const expression_ = portableCheckAtoms(lowered.expression)
            expect(hasUncertain(expression_), name).toBe(false)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: name,
              },
              expression: expression_,
            }
          }),
        ),
        profile.context,
      ),
    )
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n')
    const group = {
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
    const pairs = await datetimeTemplatePairs(pg)
    pairs.push(['4294967296,001', 'Y,YYY'])
    const wrapped = (
      await pg.query<{ value: string }>(
        "SELECT encode(date_send(to_date('4294967296,001','Y,YYY')),'hex') value",
      )
    ).rows[0]!.value
    expect(wrapped).toBe(
      (await pg.query<{ value: string }>("SELECT encode(date_send(date '0001-01-01'),'hex') value"))
        .rows[0]!.value,
    )
    let inserts = 0,
      deferred = 0
    for (const [index, profile] of profiles.entries()) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [profile.context.timeZone ?? 'UTC'])
      const selected = index === 0 ? pairs.map(([input, template]) => ({ input, template })) : cases
      for (const input of selected)
        for (const form of forms) {
          if (index === 0 && (form.other || form.explicit)) continue
          let output: string | null = null,
            failure: Outcome | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT encode(pg_catalog.${form.fn.name === 'to_date' ? 'date_send' : 'timestamptz_send'}(${form.call}),'hex') value FROM (SELECT $1::text input,$2::text picture) q`,
                [input.input, input.template],
              )
            ).rows[0]!.value
          } catch (e) {
            failure = error((e as { code: string }).code)
          }
          const settings = input as (typeof cases)[number]
          const nullInput = input.input === null || input.template === null
          const needsLocale = 'locale' in settings && settings.locale
          const needsLookup = 'abbreviation' in settings && settings.abbreviation
          const needsEncoding = 'encoding' in settings && settings.encoding
          const needsRegistry = 'registry' in settings && settings.registry
          const explicitZone = ('numeric' in settings && settings.numeric) || needsLookup
          const defer =
            overflowGroup(input.input, input.template) ||
            (!nullInput &&
              ((needsLocale &&
                (profile.context.timeLocale === undefined ||
                  form.other ||
                  (!form.explicit && profile.context.defaultCollation === undefined))) ||
                (needsLookup && profile.context.timeZone === undefined) ||
                (needsEncoding && profile.context.serverEncoding === undefined) ||
                (needsRegistry && profile.context.timeZoneAbbreviations === undefined) ||
                (!failure &&
                  form.fn.name === 'to_timestamp' &&
                  !explicitZone &&
                  profile.context.timeZone === undefined)))
          if (defer) deferred++
          native.push({ profile: profile.name, input, form: form.name, output, failure, defer })
          for (const expected of failure
            ? [null]
            : [output, output === null ? 'wrong' : output + '!']) {
            const reference: Outcome = failure ?? { kind: expected === output ? 'True' : 'False' }
            let state: string | undefined
            try {
              await pg.query(
                `INSERT INTO oracle_${form.name}(input,picture,expected,bypass) VALUES($1,$2,$3,false)`,
                [input.input, input.template, expected],
              )
            } catch (e) {
              state = (e as { code: string }).code
            }
            expect(state, JSON.stringify({ input, form: form.name, profile: profile.name })).toBe(
              failure
                ? parseInt((failure as { value: { state: number } }).value.state.toString(), 10)
                    .toString(36)
                    .toUpperCase()
                    .padStart(5, '0')
                : reference.kind === 'False'
                  ? '23514'
                  : undefined,
            )
            inserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `p${index}_${form.name}_${origin}`,
                row: {
                  input: known(input.input),
                  picture: known(input.template),
                  expected: known(expected),
                  bypass: known(false),
                },
                expected: defer ? { kind: 'Unknown' } : reference,
              })
          }
        }
    }
    for (const [index] of profiles.entries())
      for (const form of forms)
        for (const origin of ['source', 'stored']) {
          const name = `p${index}_${form.name}_${origin}`,
            row: Row = {
              input: known('2024-02-29'),
              picture: known('YYYY-MM-DD'),
              expected: known('wrong'),
              bypass: known(false),
            }
          for (const field of ['input', 'picture'])
            fixtures.push({
              name,
              row: { ...row, [field]: { kind: 'Unknown' } },
              expected: { kind: 'Unknown' },
            })
          fixtures.push({
            name,
            row: { ...row, input: error('22003') as Input, picture: error('22012') as Input },
            expected: error('22003'),
          })
          fixtures.push({
            name,
            row: { ...row, input: error('22003') as Input, bypass: known(true) },
            expected: { kind: 'True' },
          })
          fixtures.push({
            name,
            row: { ...row, input: { kind: 'Unknown' }, bypass: known(true) },
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
          profiles: profiles.length,
          pairs: pairs.length,
          fixtures: fixtures.length,
          inserts,
          deferred,
          targets: ['Rust', 'Go', 'TypeScript'],
        },
        null,
        2,
      ) + '\n',
    )
    await writeFile(packet + '/native.json', JSON.stringify(native, null, 2) + '\n')
    await runCheckParity(root, 'datetime_templates', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)

it('preserves parsing validation order, offset boundaries and template independence from unavailable non-NULL bytes', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-datetime-template-boundaries-')
  const names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  const boundaryForms = functions.flatMap((fn) => [
    { name: fn.name + '_direct', fn, kind: 'direct', call: `pg_catalog.${fn.name}(input,picture)` },
    {
      name: fn.name + '_lost_input',
      fn,
      kind: 'lost_input',
      call: `pg_catalog.${fn.name}(stamp::text,picture)`,
    },
    {
      name: fn.name + '_lost_template',
      fn,
      kind: 'lost_template',
      call: `pg_catalog.${fn.name}(input,stamp::text)`,
    },
  ])
  const boundaryProfiles = [
    full,
    { ...full, timeZone: 'America/New_York' },
    { ...full, timeZone: 'Europe/Moscow' },
    { ...full, timeZone: 'ABC3ABC2,M3.2.0,M11.1.0' },
  ]
  const inputs: [string | null, string | null][] = [
    ['1 2147484', 'DDD MS'],
    ['1 2147484', 'IDDD MS'],
    ['0 2147484', 'HH12 MS'],
    ['2023-02-29 24:00 +99', 'YYYY-MM-DD HH24:MI TZH'],
    ['4714-11-23 23:00 -02 BC', 'YYYY-MM-DD HH24:MI TZH BC'],
    ['294277-01-01 00:00 +01', 'YYYY-MM-DD HH24:MI TZH'],
    ['294276-12-31 23:59:59.999999 +00', 'YYYY-MM-DD HH24:MI:SS.FF3 TZH'],
    ['294277-01-01 00:59:59.999999 +01', 'YYYY-MM-DD HH24:MI:SS.FF1 TZH'],
    ['-2147483 -2147483648', 'FXMS US'],
    ['4294967296,001', 'Y,YYY'],
    ...[
      '2024-11-03 01:30 EST',
      '2024-11-03 01:30 EDT',
      '2024-03-10 02:30 EST',
      '2024-03-10 02:30 EDT',
      '2024-02-29 12:00 MSK',
      '2024-02-29 12:00 ABC',
      '2024-07-29 12:00 ABC',
    ].map((input) => [input, 'YYYY-MM-DD HH24:MI TZ'] as [string, string]),
  ]
  try {
    await pg.exec(
      `SET TimeZone='UTC';CREATE TABLE template_boundaries(input text,picture text,stamp timestamp,expected text,bypass boolean,${boundaryForms.map((f) => `CONSTRAINT ${f.name} CHECK(${expression(f.call, f.fn)})`).join(',')});`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'template_boundaries')!
    const groups = boundaryProfiles.map((profile, index) =>
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
              origin === 'source' ? 'CHECK(' + expression(form.call, form.fn) + ')' : undefined,
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
        profile,
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
    for (const [index, profile] of boundaryProfiles.entries()) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [profile.timeZone])
      for (const form of boundaryForms) {
        const selected =
          form.kind === 'direct'
            ? inputs
            : form.kind === 'lost_input'
              ? [
                  [null, null],
                  [null, ''],
                  [null, '"literal"'],
                  [null, 'FX'],
                  [null, 'YYYY-MM-DD'],
                ]
              : [
                  ['', null],
                  [null, null],
                  ['2024', null],
                ]
        for (const [input, picture] of selected) {
          let output: string | null = null,
            failure: Outcome | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT encode(pg_catalog.${form.fn.name === 'to_date' ? 'date_send' : 'timestamptz_send'}(${form.call}),'hex') value FROM(SELECT $1::text input,$2::text picture,timestamp '2000-01-01' stamp) q`,
                [input, picture],
              )
            ).rows[0]!.value
          } catch (e) {
            failure = error((e as { code: string }).code)
          }
          const defer =
            overflowGroup(input ?? null, picture ?? null) ||
            (form.kind === 'lost_input' && picture === 'YYYY-MM-DD') ||
            (form.kind === 'lost_template' && input === '2024')
          native.push({
            profile: profile.timeZone,
            form: form.name,
            input,
            picture,
            output,
            failure,
            defer,
          })
          for (const expected of failure
            ? [null]
            : [output, output === null ? 'wrong' : output + '!'])
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `b${index}_${form.name}_${origin}`,
                row: {
                  input: known(input ?? null),
                  picture: known(picture ?? null),
                  stamp: { kind: 'Value', value: 0n },
                  expected: known(expected),
                  bypass: known(false),
                },
                expected: defer
                  ? { kind: 'Unknown' }
                  : (failure ?? { kind: expected === output ? 'True' : 'False' }),
              })
        }
      }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/boundaries-native.json', JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      packet + '/boundaries-summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          profiles: boundaryProfiles.length,
          targets: ['Rust', 'Go', 'TypeScript'],
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'datetime_template_boundaries', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
