import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const operationSource = readFileSync(
  'crates/check-evaluator/src/operations/pg_catalog/timezone_trunc.rs',
  'utf8',
)
const names = [...operationSource.matchAll(/pub fn (sql__[a-z0-9_]+)\(/gu)].map(
  (match) => match[1]!,
)
const fn = builtinCallables().find((fn) => fn.kind === 'function' && names.includes(fn.rustName))!
const expressions = {
  same: 'pg_catalog.date_trunc(unit_name, instant, zone_name) = recorded',
  skipped:
    'CASE WHEN skip THEN true ELSE pg_catalog.date_trunc(unit_name, instant, zone_name) = recorded END',
}
const value = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const wire = (hex: string | null): bigint | null =>
  hex === null ? null : BigInt.asIntN(64, BigInt('0x' + hex))
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const defaults = (): Row => ({
  unit_name: value('hour'),
  instant: value(0n),
  zone_name: value('UTC'),
  recorded: value(0n),
  skip: value(false),
})
const zones = [
  'UTC',
  'GMT',
  'uTc+2',
  'gmt-02:30',
  '0',
  '+0',
  '-0',
  '2',
  '+02',
  '-02',
  '+02:30',
  '-02:30:45',
  'GMT24',
  '+167:59:60',
  '-167:59:60',
  'UTC1:59:60',
  'UTC+002:003:004',
  'Etc/GMT+5',
  'America/New_York',
  'Europe/Berlin',
  'Australia/Lord_Howe',
  'Pacific/Apia',
  'Pacific/Chatham',
  'Asia/Kolkata',
  'US/Eastern',
]
const units = [
  'microseconds',
  'milliseconds',
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'decade',
  'century',
  'millennium',
]
const timestamps = [
  '-infinity',
  'infinity',
  '4714-11-24 00:00:00+00 BC',
  '4714-11-24 23:59:59.999999+00 BC',
  '4001-03-01 12:34:56.789012+00 BC',
  '0001-03-01 12:34:56.789012+00 BC',
  '0001-03-01 12:34:56.789012+00',
  '1899-12-31 23:59:59.999999+00',
  '1999-12-31 23:59:59.999999+00',
  '2000-02-29 12:34:56.789012+00',
  '2021-03-14 06:59:59.999999+00',
  '2021-03-14 07:00:00+00',
  '2021-11-07 05:30:45.123456+00',
  '2021-11-07 06:30:45.123456+00',
  '2021-03-28 00:30:45.123456+00',
  '2021-03-28 01:30:45.123456+00',
  '2021-10-31 00:30:45.123456+00',
  '2021-10-31 01:30:45.123456+00',
  '2021-04-03 14:45:45.123456+00',
  '2021-04-03 15:15:45.123456+00',
  '2011-12-30 09:30:00+00',
  '2011-12-30 10:30:00+00',
  '2040-03-11 07:30:45.123456+00',
  '2040-11-04 05:30:45.123456+00',
  '2040-11-04 06:30:45.123456+00',
  '294276-12-30 23:59:59.999999+00',
  '294276-12-31 23:59:59.999999+00',
  null,
]

describe('explicit timezone truncation CHECKs', () => {
  it('matches PostgreSQL raw/stored checks for aliases, folds, gaps, recurrence, BC dates, infinities, range boundaries and partial inputs', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-zone-trunc-'))
    let pg = await PGlite.create()
    try {
      expect(names).toHaveLength(1)
      expect(fn).toMatchObject({
        name: 'date_trunc',
        args: ['pg_catalog.text', 'pg_catalog.timestamptz', 'pg_catalog.text'],
        result: 'pg_catalog.timestamptz',
        strict: true,
        volatility: 'i',
      })
      await pg.exec(`CREATE TABLE timezone_bucket_checks (unit_name text, instant timestamptz, zone_name text, recorded timestamptz, skip bool,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')})`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'timezone_bucket_checks')!
      const prepared = Object.entries(expressions).flatMap(([name, sql]) =>
        ['raw', 'stored'].map((form) => {
          const constraint =
            form === 'raw'
              ? { name, type: 'check' as const, definition: `CHECK (${sql})` }
              : table.constraints.find((item) => item.name === name)!
          const plan = lowerTableCheck(table, constraint, [], catalog.domains)!
          expect(plan.expression.kind, name + '_' + form).not.toBe('uncertain')
          return {
            expression: plan.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + form,
            },
          }
        }),
      )
      const group = prepareCheckRustGroup(prepared)
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      expect(
        group
          .source!.modules.find((module) => module.name === 'pg_catalog')!
          .files.some((file) => file.path.endsWith('timezone_tables.rs')),
      ).toBe(true)
      const encoded = new Map<string | null, bigint | null>()
      for (const timestamp of timestamps)
        encoded.set(
          timestamp,
          wire(
            (
              await pg.query<{ value: string | null }>(
                "SELECT encode(timestamptz_send($1::timestamptz),'hex') value",
                [timestamp],
              )
            ).rows[0]!.value,
          ),
        )
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const record = (
        row: Row,
        expected: Outcome,
        checks: readonly string[] = Object.keys(expressions),
      ) => {
        for (const name of checks)
          for (const form of ['raw', 'stored'])
            fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
      }
      let count = 0
      const execute = async (
        unit: string | null,
        timestamp: string | null,
        zone: string | null,
      ) => {
        if (count > 0 && count % 500 === 0) {
          await pg.close()
          pg = await PGlite.create()
        }
        count++
        const row = defaults()
        row.unit_name = value(unit)
        row.instant = value(encoded.get(timestamp)!)
        row.zone_name = value(zone)
        let result: bigint | null
        try {
          result = wire(
            (
              await pg.query<{ value: string | null }>(
                "SELECT encode(timestamptz_send(pg_catalog.date_trunc($1::text,$2::timestamptz,$3::text)),'hex') value",
                [unit, timestamp, zone],
              )
            ).rows[0]!.value,
          )
        } catch (failure) {
          const state = (failure as { code: string }).code
          expect(['22008', '22023', '0A000'], `${unit}/${timestamp}/${zone}`).toContain(state)
          record(row, error(state))
          return
        }
        row.recorded = value(result)
        record(row, { kind: result === null ? 'Null' : 'True' })
        if (result !== null) {
          row.recorded = value(result === 0n ? 1n : 0n)
          record(row, { kind: 'False' })
        }
      }
      for (const zone of zones)
        for (const unit of units)
          for (const timestamp of timestamps) await execute(unit, timestamp, zone)
      const source = readFileSync(
        'crates/check-evaluator/src/operations/pg_catalog/temporal_fields.rs',
        'utf8',
      )
      const keys = [
        .../const TEMPORAL_UNIT_KEYS[^=]*= &\[([\s\S]*?)\];/u
          .exec(source)![1]!
          .matchAll(/"([^"]*)"/gu),
      ].map((match) => match[1]!)
      for (const unit of [
        ...keys,
        ...keys.map((key) => key.toUpperCase()),
        'microsecondsextra',
        'millisecondsextra',
        'epoch',
        'isoyear',
        'bogus',
        ' year',
        'year ',
        null,
      ])
        for (const timestamp of [timestamps[0]!, timestamps[1]!, timestamps[9]!, null])
          await execute(unit, timestamp, 'UTC')
      for (const zone of [
        '',
        '+',
        '-',
        'UTC+',
        '+168',
        'UTC0230',
        'GMT1:60',
        'UTC1:59:61',
        'UTC1:',
        'UTC1::',
        'UTC1:2:',
      ])
        for (const unit of ['day', 'bogus', 'timezone'])
          for (const timestamp of [timestamps[0]!, timestamps[1]!, timestamps[9]!])
            await execute(unit, timestamp, zone)
      await execute(null, timestamps[9]!, 'UTC')
      await execute('day', timestamps[9]!, null)
      for (const name of ['unit_name', 'instant', 'zone_name']) {
        for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22003')] as Input[])
          record({ ...defaults(), [name]: state }, state as Outcome)
        record(
          { ...defaults(), [name]: error('22003'), recorded: error('22012'), skip: value(true) },
          { kind: 'True' },
          ['skipped'],
        )
      }
      for (const name of ['instant', 'zone_name']) {
        record(
          { ...defaults(), unit_name: { kind: 'Unknown' }, [name]: error('22012') },
          error('22012'),
        )
        record({ ...defaults(), unit_name: error('22003'), [name]: error('22012') }, error('22003'))
      }
      for (const zone of ['PST', 'Foo/Bar', 'America/Does_Not_Exist'])
        record({ ...defaults(), zone_name: value(zone) }, { kind: 'Unknown' })
      await runCheckParity(
        directory,
        'pgsid-explicit-zone-trunc',
        group,
        prepared.map((item) => item.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 600_000)
})
