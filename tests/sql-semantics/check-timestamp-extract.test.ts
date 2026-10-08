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
  'crates/check-evaluator/src/operations/pg_catalog/temporal_timestamp_extract.rs',
  'utf8',
)
const names = [...operationSource.matchAll(/pub fn (sql__[a-z0-9_]+)\(/gu)].map(
  (match) => match[1]!,
)
const fn = builtinCallables().find((fn) => fn.kind === 'function' && names.includes(fn.rustName))!
const expressions = {
  same: 'pg_catalog.extract(unit_name, local_time) = recorded',
  exact_scale:
    'pg_catalog.numeric_send(pg_catalog.extract(unit_name, local_time)) = recorded_bytes',
  skipped: 'CASE WHEN skip THEN true ELSE pg_catalog.extract(unit_name, local_time) = recorded END',
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
  unit_name: value('year'),
  local_time: value(0n),
  recorded: value('2000'),
  recorded_bytes: value(''),
  skip: value(false),
})
const timestamps = [
  '-infinity',
  'infinity',
  '4714-11-24 00:00:00 BC',
  '4001-03-01 12:34:56.789012 BC',
  '0101-03-01 12:34:56.789012 BC',
  '0010-03-01 12:34:56.789012 BC',
  '0001-03-01 12:34:56.789012 BC',
  '0001-03-01 12:34:56.789012',
  '1900-03-01 12:34:56.789012',
  '1969-12-31 23:59:59.999999',
  '1970-01-01 00:00:00',
  '1970-01-01 00:00:00.000001',
  '1999-12-31 23:59:59.999999',
  '2000-01-01 00:00:00',
  '2000-01-01 00:00:00.000001',
  '2000-01-01 00:00:00.000864',
  '2000-01-01 00:00:00.000865',
  '2000-01-01 00:00:00.009999',
  '2000-01-01 00:00:00.010000',
  '2000-01-01 00:00:08.649999',
  '2000-01-01 00:00:08.650000',
  '2000-01-01 00:01:39.999999',
  '2000-01-01 00:01:40',
  '2000-01-01 12:00:00',
  '2000-02-29 12:34:56.789012',
  '2019-12-30 12:34:56.789012',
  '2021-01-01 12:34:56.789012',
  '2024-02-29 23:59:59.999999',
  '294276-12-31 23:59:59.123449',
  '294276-12-31 23:59:59.123450',
  '294276-12-31 23:59:59.123451',
  '294276-12-31 23:59:59.999949',
  '294276-12-31 23:59:59.999950',
  '294276-12-31 23:59:59.999951',
  '294276-12-31 23:59:59.999999',
  null,
]

describe('timestamp field extraction CHECKs', () => {
  it('matches exact PostgreSQL values and numeric wire scales for field aliases, BC calendars, ISO years, fractional days, epoch overflow, infinities and lazy branches', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-timestamp-extract-'))
    let pg = await PGlite.create()
    try {
      expect(names).toHaveLength(1)
      expect(fn).toMatchObject({
        name: 'extract',
        args: ['pg_catalog.text', 'pg_catalog."timestamp"'],
        result: 'pg_catalog."numeric"',
        strict: true,
        volatility: 'i',
      })
      await pg.exec(`CREATE TABLE timestamp_field_checks(unit_name text, local_time timestamp, recorded numeric, recorded_bytes bytea,skip bool,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')})`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'timestamp_field_checks')!
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
      for (const microseconds of [9222425352054775806n, 9222425352054775807n, 9222425352054775808n])
        timestamps.push(
          (
            await pg.query<{ value: string }>(
              "SELECT (timestamp '2000-01-01' + ($1 || ' microseconds')::interval)::text value",
              [String(microseconds)],
            )
          ).rows[0]!.value,
        )
      const encoded = new Map<string | null, bigint | null>()
      for (const timestamp of timestamps)
        encoded.set(
          timestamp,
          wire(
            (
              await pg.query<{ value: string | null }>(
                "SELECT encode(timestamp_send($1::timestamp),'hex') value",
                [timestamp],
              )
            ).rows[0]!.value,
          ),
        )
      const sources = ['temporal_fields', 'temporal_extract'].map((name) =>
        readFileSync(`crates/check-evaluator/src/operations/pg_catalog/${name}.rs`, 'utf8'),
      )
      const keys = sources.flatMap((source) =>
        [
          .../const TEMPORAL_(?:UNIT|EXTRACT)_KEYS[^=]*= &\[([\s\S]*?)\];/u
            .exec(source)![1]!
            .matchAll(/"([^"]*)"/gu),
        ].map((match) => match[1]!),
      )
      expect(keys).toHaveLength(78)
      const units = [
        ...keys,
        ...keys.map((key) => key.toUpperCase()),
        'microsecondsextra',
        'millisecondsextra',
        'timezone_hour',
        'timezone_minute',
        'bogus',
        ' year',
        'year ',
        null,
      ]
      let count = 0
      for (const unit of units)
        for (const timestamp of timestamps) {
          if (count > 0 && count % 500 === 0) {
            await pg.close()
            pg = await PGlite.create()
          }
          count++
          const row = defaults()
          row.unit_name = value(unit)
          row.local_time = value(encoded.get(timestamp)!)
          let result: { value: string | null; bytes: string | null }
          try {
            result = (
              await pg.query<{ value: string | null; bytes: string | null }>(
                "SELECT (value)::text value, encode(numeric_send(value),'hex') bytes FROM (SELECT pg_catalog.extract($1::text,$2::timestamp) value) result",
                [unit, timestamp],
              )
            ).rows[0]!
          } catch (failure) {
            const state = (failure as { code: string }).code
            expect(['22023', '0A000'], `${unit}/${timestamp}`).toContain(state)
            record(row, error(state))
            continue
          }
          row.recorded = value(result.value)
          row.recorded_bytes = value(result.bytes)
          record(row, { kind: result.value === null ? 'Null' : 'True' })
          if (result.value !== null) {
            row.recorded = value(/^[-+]?0(?:\.0+)?$/u.test(result.value) ? '1' : '0')
            row.recorded_bytes = value(result.bytes === '00' ? '01' : '00')
            record(row, { kind: 'False' })
          }
        }
      for (const name of ['unit_name', 'local_time']) {
        for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22003')] as Input[])
          record({ ...defaults(), [name]: state }, state as Outcome)
        record(
          { ...defaults(), [name]: error('22003'), recorded: error('22012'), skip: value(true) },
          { kind: 'True' },
          ['skipped'],
        )
      }
      record(
        { ...defaults(), unit_name: { kind: 'Unknown' }, local_time: error('22012') },
        error('22012'),
      )
      record(
        { ...defaults(), unit_name: error('22003'), local_time: error('22012') },
        error('22003'),
      )
      await runCheckParity(
        directory,
        'pgsid-timestamp-field-extract',
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
