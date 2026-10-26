import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
const packet = 'artifacts/goal-checks/instant-age-active'
const stamps = [
  '2000-01-01 00:00:00+00',
  '2000-01-31 12:00+00',
  '2000-02-29 11:59:59.999999+00',
  '2000-03-31 12:00+00',
  '2001-02-28 11:59:59.123456+00',
  '2024-11-03 05:30:00+00',
  '2024-11-03 05:59:59.999999+00',
  '2024-11-03 06:00:00+00',
  '2024-11-03 06:30:00+00',
  '2024-03-10 06:59:59.999999+00',
  '2024-03-10 07:00:00+00',
  '2024-04-06 14:59:59.999999+00',
  '2024-04-06 15:00:00+00',
  '2011-12-30 09:59:59.999999+00',
  '2011-12-30 10:00:00+00',
  '2014-10-25 21:59:59.999999+00',
  '2014-10-25 22:00:00+00',
  '1883-11-18 16:59:59.999999+00',
  '1883-11-18 17:00:00+00',
  '0001-01-01+00 BC',
  '0100-12-31+00 BC',
  '0101-01-01+00 BC',
  '4714-11-24+00 BC',
  '294276-12-31 23:59:59.999999+00',
  'infinity',
  '-infinity',
  null,
]
const zones = [
  'UTC',
  'America/New_York',
  'Australia/Lord_Howe',
  'Europe/Moscow',
  'Pacific/Apia',
  '167.999',
  '-167.999',
  'ABC3BCD2,M3.2.0,M11.1.0',
  '',
]
const forms = [
  { name: 'direct', call: 'pg_catalog.age(first_stamp,second_stamp)' },
  {
    name: 'contained',
    call: '(ARRAY[pg_catalog.age(first_stamp,second_stamp)::calendar_age,NULL])[1]',
  },
]
const expression = (call: string) =>
  `CASE WHEN bypass THEN true ELSE (encode(interval_send(${call}),'hex') COLLATE "C") IS NOT DISTINCT FROM expected END`
const known = (value: bigint | string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })
const infinite = (value: bigint | null) =>
  value === -9223372036854775808n || value === 9223372036854775807n

it('matches calendar age in declared zones across UTC/local order differences, DST folds, month borrowing, infinities and source/stored composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-instant-age-')
  const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    names: string[] = [],
    native: unknown[] = []
  try {
    await pg.exec(`SET TimeZone='UTC';CREATE DOMAIN calendar_age AS interval;
   CREATE TABLE age_checks(first_stamp timestamptz,second_stamp timestamptz,expected text,bypass boolean,${forms.map((f) => `CONSTRAINT ${f.name} CHECK(${expression(f.call)})`).join(',')});
   ${forms.map((f) => `CREATE TABLE oracle_${f.name}(first_stamp timestamptz,second_stamp timestamptz,expected text,bypass boolean,CHECK(${expression(f.call)}));`).join('\n')}`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'age_checks')!
    const groups = zones.map((timeZone, index) =>
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
            const value = portableCheckAtoms(lowered.expression)
            expect(hasUncertain(value), name).toBe(false)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: name,
              },
              expression: value,
            }
          }),
        ),
        timeZone === '' ? {} : { timeZone },
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
    const inputs = []
    for (const text of stamps) {
      const hex = (
        await pg.query<{ v: string | null }>(
          "SELECT encode(timestamptz_send($1::timestamptz),'hex') v",
          [text],
        )
      ).rows[0]!.v
      inputs.push({ text, value: hex === null ? null : Buffer.from(hex, 'hex').readBigInt64BE() })
    }
    const rounded = (
      await pg.query<{ v: string }>(
        "SELECT encode(timestamptz_send((timestamptz '294276-12-31 23:59:59.999999+00')::timestamptz(0)),'hex') v",
      )
    ).rows[0]!.v
    inputs.push({
      text: '294276-12-31 23:59:59.999999+00',
      value: Buffer.from(rounded, 'hex').readBigInt64BE(),
      rounded: true,
    })
    const sql = (side: string, rounded: boolean | undefined) =>
      rounded ? `($${side}::timestamptz)::timestamptz(0)` : `$${side}::timestamptz`
    let inserts = 0,
      pairs = 0,
      deferred = 0
    for (const [index, timeZone] of zones.entries()) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [timeZone || 'UTC'])
      for (const [ai, a] of inputs.entries())
        for (const [bi, b] of inputs.entries()) {
          if (
            index > 0 &&
            ai !== bi &&
            ![
              0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 23, 24, 25, 26, 27,
            ].includes(ai)
          )
            continue
          if (
            index > 0 &&
            ai !== bi &&
            ![
              0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 23, 24, 25, 26, 27,
            ].includes(bi)
          )
            continue
          if (
            index > 0 &&
            ai !== bi &&
            ai > 0 &&
            bi > 0 &&
            Math.abs(ai - bi) > 1 &&
            ai < 22 &&
            bi < 22
          )
            continue
          const aq = sql('1', 'rounded' in a ? a.rounded : undefined),
            bq = sql('2', 'rounded' in b ? b.rounded : undefined)
          for (const form of forms) {
            if (index === 0 && form.name === 'contained' && ai > 0 && bi > 0) continue
            pairs++
            let output: string | null = null,
              failure: Outcome | undefined
            try {
              output = (
                await pg.query<{ v: string | null }>(
                  `SELECT encode(interval_send(${form.call}),'hex') v FROM(SELECT ${aq} first_stamp,${bq} second_stamp)q`,
                  [a.text, b.text],
                )
              ).rows[0]!.v
            } catch (e) {
              failure = error((e as { code: string }).code)
            }
            const defer =
              timeZone === '' &&
              a.value !== null &&
              b.value !== null &&
              !infinite(a.value) &&
              !infinite(b.value) &&
              a.value !== b.value
            if (defer) deferred++
            native.push({
              zone: timeZone,
              form: form.name,
              first: ai,
              second: bi,
              output,
              failure,
              defer,
            })
            for (const expected of failure
              ? [null]
              : [output, output === null ? 'wrong' : output + '!']) {
              const reference: Outcome = failure ?? { kind: expected === output ? 'True' : 'False' }
              let state: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${form.name} SELECT ${aq},${bq},$3::text,false`,
                  [a.text, b.text, expected],
                )
              } catch (e) {
                state = (e as { code: string }).code
              }
              expect(state, JSON.stringify({ timeZone, ai, bi, form: form.name })).toBe(
                failure?.kind === 'Error'
                  ? failure.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : reference.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              inserts++
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${form.name}_${origin}`,
                  row: {
                    first_stamp: known(a.value),
                    second_stamp: known(b.value),
                    expected: known(expected),
                    bypass: known(false),
                  },
                  expected: defer ? { kind: 'Unknown' } : reference,
                })
            }
          }
        }
    }
    for (const [index] of zones.entries())
      for (const form of forms)
        for (const origin of ['source', 'stored']) {
          const name = `p${index}_${form.name}_${origin}`,
            row: Row = {
              first_stamp: known(0n),
              second_stamp: known(0n),
              expected: known('wrong'),
              bypass: known(false),
            }
          for (const field of ['first_stamp', 'second_stamp'])
            fixtures.push({
              name,
              row: { ...row, [field]: { kind: 'Unknown' } },
              expected: { kind: 'Unknown' },
            })
          fixtures.push({
            name,
            row: {
              ...row,
              first_stamp: error('22003') as Input,
              second_stamp: error('22012') as Input,
            },
            expected: error('22003'),
          })
          fixtures.push({
            name,
            row: { ...row, first_stamp: error('22003') as Input, bypass: known(true) },
            expected: { kind: 'True' },
          })
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          functions: 1,
          checks: names.length,
          profiles: zones.length,
          inputs: inputs.length,
          pairs,
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
    await runCheckParity(root, 'instant_age', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
