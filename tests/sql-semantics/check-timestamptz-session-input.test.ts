import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const expressions = {
  equal: 'raw::timestamptz = anchor',
  null_test: 'raw::timestamptz IS NULL',
  lazy: 'CASE WHEN flag THEN true ELSE raw::timestamptz = anchor END',
  text_case: "(CASE WHEN flag THEN raw ELSE '2000-01-01 00:00:00Z' END)::timestamptz = anchor",
}
type DateOrder = 'MDY' | 'DMY' | 'YMD'
type Profile = { zone?: string; order?: DateOrder; abbreviations?: boolean }
const profiles: Profile[] = [
  { zone: 'UTC', order: 'MDY', abbreviations: true },
  { zone: 'America/New_York', order: 'DMY' },
  { zone: 'Australia/Lord_Howe', order: 'YMD', abbreviations: true },
  { zone: '+02:30' },
  { zone: 'Europe/Dublin', abbreviations: true },
]
const contextFor = (profile: Profile): CheckExecutionContext => ({
  ...(profile.zone === undefined ? {} : { timeZone: profile.zone }),
  ...(profile.order === undefined ? {} : { dateStyle: { format: 'ISO', order: profile.order } }),
  ...(profile.abbreviations
    ? { timeZoneAbbreviations: 'Default', maxIdentifierBytes: 63, serverEncoding: 'UTF8' }
    : {}),
})
// Trailing abbreviations of the session zone or the Default table, fixed or dynamic; Dublin's
// own IST takes precedence over the Default table's.
const abbreviated = [
  '2000-01-01 12:00 UTC',
  '2000-07-01 12:00 edt',
  '2021-03-14 02:30 EST',
  '1990-07-01 12:00 MSK',
  '2000-07-01 12:00 IST',
  'Jan 1 2000 12:00 PST',
]
// Short leading date fields whose roles follow the configured DateStyle order.
const ordered = [
  '01/02/2000 12:00',
  '1/2/03',
  '13/02/2000',
  '00/01/02',
  '01.02.2000 America/New_York',
]
// Local times across DST gaps and overlaps, every date form, and explicit-zone controls.
const definite = [
  '2000-01-01',
  '2000-01-01 00:00:00',
  '20000101',
  '2000-060 12:00',
  'Jan 1 2000 12:00 pm',
  '2000-01-01 12:00 BC',
  '2000-01-01 T12:00',
  '2021-03-14 02:30',
  '2021-03-14 03:00',
  '2021-11-07 01:30',
  '2021-04-04 01:45',
  '2021-10-03 02:15',
  '1880-07-01 12:00',
  '2040-07-01 12:00:00.5',
  'epoch',
  'infinity',
  '2000-01-01 00:00:00+05',
  '2000-13-01',
  '2000-01-01 25:00',
  '2000-01-01 00:00 America/New_York',
  '2021-03-14 02:30 america/new_york',
  '2000-01-01 00:00 BC Europe/Dublin',
  '2000-01-01 12:00 :Asia/Kathmandu',
  '2000-01-01 25:00 America/New_York',
]
// Local times beside the range limits, runtime words, unknown words, all-letter zone names and
// zones that are not trailing or follow an offset still defer.
const deferred = [
  '4714-11-24 BC',
  '294276-12-31 23:59',
  'today',
  '2000-01-01 00:00 America/Nowhere',
  '2000-01-01 12:00 XYZ',
  '2000-01-01 12:00 Japan',
  '2000-01-01 12:00+05 UTC',
  '2000-01-01 America/New_York 12:00',
  '2000-01-01 00:00+05 America/New_York',
]
const input = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

it('resolves timestamptz text through the configured session time zone and date order', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-timestamptz-session-input-'))
  try {
    await pg.exec(`CREATE TABLE session_input (raw text, anchor timestamptz, flag bool,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'session_input')!
    const names: string[] = []
    const groups = profiles.map((profile, index) => {
      const context = contextFor(profile)
      return prepareCheckRustGroup(
        Object.keys(expressions).map((name) => {
          names.push(`p${index}_${name}`)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: `p${index}_${name}`,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints.find((check) => check.name === name)!,
              )!.expression,
            ),
          }
        }),
        context,
      )
    })
    expect(groups[0]!.evaluatorSource).toContain('timestamptz_from_text_context(')
    expect(
      prepareCheckRustGroup([
        {
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'equal' },
          expression: lowerTableCheck(
            table,
            table.constraints.find((check) => check.name === 'equal')!,
          )!.expression,
        },
      ]).evaluatorSource,
    ).not.toContain('timestamptz_from_text_context(')
    const evaluatorSource = groups.map((group) => group.evaluatorSource!).join('\n')
    const group = {
      checks: groups.flatMap((group) => group.checks),
      evaluatorSource,
      source: assembleCheckRust({
        source: evaluatorSource,
        callables: [
          ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
        ],
      }),
      requiresRegex: false,
    }
    group.checks.forEach((check, i) => expect(check.kind, names[i]).toBe('supported'))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [index, profile] of profiles.entries()) {
      await pg.query("SELECT set_config('TimeZone', $1, false)", [profile.zone])
      await pg.exec(`SET DateStyle = 'ISO, ${profile.order ?? 'MDY'}'`)
      for (const raw of [...definite, ...ordered, ...abbreviated, ...deferred, null]) {
        let anchor = 0n
        // The anchor is the session's own reading of the text, so the oracle can pass the text.
        let anchorText = '2000-01-01 00:00:00+00'
        if (raw !== null)
          try {
            anchor = Buffer.from(
              (
                await pg.query<{ binary: string }>(
                  "SELECT encode(timestamptz_send($1::timestamptz), 'hex') AS binary",
                  [raw],
                )
              ).rows[0]!.binary,
              'hex',
            ).readBigInt64BE()
            anchorText = raw
          } catch (error) {
            expect(['22007', '22008', '22023']).toContain((error as { code: string }).code)
          }
        for (const flag of [false, true])
          for (const [name, sql] of Object.entries(expressions)) {
            let expected: Outcome
            // Only checks that read raw on this row defer with it.
            const readsRaw = name === 'lazy' ? !flag : name === 'text_case' ? flag : true
            const defers =
              raw !== null &&
              (deferred.includes(raw) ||
                (ordered.includes(raw) && profile.order === undefined) ||
                (abbreviated.includes(raw) && !profile.abbreviations))
            if (defers && readsRaw) {
              expected = { kind: 'Unknown' }
            } else {
              try {
                expected = outcome(
                  (
                    await pg.query<{ value: boolean | null }>(
                      `SELECT (${sql}) AS value FROM (SELECT $1::text raw, $2::timestamptz anchor, $3::bool flag) candidate`,
                      [raw, anchorText, flag],
                    )
                  ).rows[0]!.value,
                )
              } catch (error) {
                expected = {
                  kind: 'Error',
                  value: { state: Number.parseInt((error as { code: string }).code, 36) },
                }
              }
            }
            fixtures.push({
              name: `p${index}_${name}`,
              row: { raw: input(raw), anchor: input(anchor), flag: input(flag) },
              expected,
            })
          }
      }
    }
    await runCheckParity(directory, 'timestamptz_session_input', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('reads short leading date fields in the configured date order for date and timestamp text', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-date-order-input-'))
  const casts = {
    date_value: "raw::date = DATE '2000-01-02'",
    date_null: 'raw::date IS NULL',
    stamp_value: "raw::timestamp = TIMESTAMP '2000-01-02 12:00'",
  }
  const inputs = [
    '01/02/2000',
    '02/01/2000 12:00',
    '1/2/2000 BC',
    '01-02-00',
    '00.01.02',
    '13/02/2000',
    '01/02/0 BC',
    '01/02/000',
    '2000-01-02',
    'Jan 2 00',
    '00 1 Jan',
    '2 Jan 00 12:00',
    '12 Jan 31',
    '01 02 2000',
    '1 2 03',
    '00 Jan 2',
    '13 02 2000',
    'Feb 30 00',
    null,
  ]
  try {
    await pg.exec(`CREATE TABLE order_input (raw text,
      ${Object.entries(casts)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'order_input')!
    const orders: DateOrder[] = ['MDY', 'DMY', 'YMD']
    const names: string[] = []
    const groups = orders.map((order, index) =>
      prepareCheckRustGroup(
        Object.keys(casts).map((name) => {
          names.push(`o${index}_${name}`)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: `o${index}_${name}`,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints.find((check) => check.name === name)!,
              )!.expression,
            ),
          }
        }),
        contextFor({ order }),
      ),
    )
    expect(groups[0]!.evaluatorSource).toContain('date_from_text_order(')
    expect(groups[0]!.evaluatorSource).toContain('timestamp_from_text_order(')
    const evaluatorSource = groups.map((group) => group.evaluatorSource!).join('\n')
    const group = {
      checks: groups.flatMap((group) => group.checks),
      evaluatorSource,
      source: assembleCheckRust({
        source: evaluatorSource,
        callables: [
          ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
        ],
      }),
      requiresRegex: false,
    }
    group.checks.forEach((check, i) => expect(check.kind, names[i]).toBe('supported'))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [index, order] of orders.entries()) {
      await pg.exec(`SET DateStyle = 'ISO, ${order}'`)
      for (const raw of inputs)
        for (const [name, sql] of Object.entries(casts)) {
          let expected: Outcome
          try {
            expected = outcome(
              (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (${sql}) AS value FROM (SELECT $1::text raw) candidate`,
                  [raw],
                )
              ).rows[0]!.value,
            )
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: Number.parseInt((error as { code: string }).code, 36) },
            }
          }
          fixtures.push({ name: `o${index}_${name}`, row: { raw: input(raw) }, expected })
        }
    }
    await runCheckParity(directory, 'date_order_input', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
