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
const sessions = ['UTC', 'America/New_York', 'Australia/Lord_Howe', '+02:30', 'Asia/Kathmandu']
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
// Local times beside the range limits, runtime words, abbreviations and zone names that are
// unknown, not trailing or after an offset still defer.
const deferred = [
  '4714-11-24 BC',
  '294276-12-31 23:59',
  'today',
  '2000-01-01 00:00 America/Nowhere',
  '2000-01-01 12:00 UTC',
  '2000-01-01 America/New_York 12:00',
  '2000-01-01 00:00+05 America/New_York',
]
const input = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

it('resolves timestamptz text without a zone through the configured session time zone', async () => {
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
    const groups = sessions.map((session, index) => {
      const context: CheckExecutionContext = { timeZone: session }
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
    expect(groups[0]!.evaluatorSource).toContain('timestamptz_from_text_session(')
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
    ).not.toContain('timestamptz_from_text_session(')
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
    for (const [index, session] of sessions.entries()) {
      await pg.query("SELECT set_config('TimeZone', $1, false)", [session])
      for (const raw of [...definite, ...deferred, null]) {
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
            if (raw !== null && deferred.includes(raw) && readsRaw) {
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
