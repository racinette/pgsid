import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const unknown: Input = { kind: 'Unknown' }
const known = (value: number | bigint | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome & Input => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const bits = (text: string | null, width: number): number | bigint | null =>
  text === null
    ? null
    : width === 32
      ? Number(BigInt.asIntN(32, BigInt('0x' + text)))
      : BigInt.asIntN(64, BigInt('0x' + text))

it('retains safe context-dependent array shapes and NULL cells while guarding temporal range and unknown input failures', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-cast-context-'))
  const shape = (array: string) => `array_dims(${array}) COLLATE "C" = '[1:1]' COLLATE "C"`
  const forms: Record<string, string> = {
    date_zone: shape('(ARRAY[calendar]::date[])::timestamptz[]'),
    local_zone: shape('(ARRAY[local_stamp]::timestamp[])::timestamptz[]'),
    zoned_local: shape('(ARRAY[zoned_stamp]::timestamptz[])::timestamp[]'),
    zoned_date: shape('(ARRAY[zoned_stamp]::timestamptz[])::date[]'),
    zoned_time: shape('(ARRAY[zoned_stamp]::timestamptz[])::time[]'),
    zoned_timetz: shape('(ARRAY[zoned_stamp]::timestamptz[])::timetz[]'),
    clock_zone: shape('(ARRAY[clock]::time[])::timetz[]'),
    cash_numeric: shape('(ARRAY[units]::money[])::numeric[]'),
    first_null: '(((ARRAY[NULL::date,calendar]::date[])::timestamptz[])[1] IS NULL)',
  }
  try {
    await pg.exec(
      'CREATE TABLE cast_context(calendar date,local_stamp timestamp,zoned_stamp timestamptz,clock time,units money);CREATE TABLE cast_context_oracle(LIKE cast_context)',
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE cast_context ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'cast_context')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'stored'
              ? table.constraints.find((item) => item.name === name)!
              : { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    expect(
      plans.filter((plan) => hasUncertain(plan.expression)).map((plan) => plan.identity.constraint),
    ).toEqual([])
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    const samples = [
      ['2000-01-01', '2000-01-01 12:34:56', '2000-01-01 12:34:56+00', '12:34:56', 1],
      [null, null, null, null, null],
      ['infinity', 'infinity', 'infinity', '24:00', -1],
      ['-infinity', '-infinity', '-infinity', '00:00', 0],
      [
        '5000000-01-01',
        '294276-12-31 23:59:59.999999',
        '294276-12-31 23:59:59.999999+00',
        '00:00',
        1,
      ],
      ['294276-12-31', '2000-01-01', '2000-01-01+00', '00:00', 0],
    ] as const
    for (const [index, values] of samples.entries()) {
      await pg.exec("SET TimeZone='UTC';TRUNCATE cast_context_oracle")
      await pg.query(
        'INSERT INTO cast_context_oracle VALUES($1::date,$2::timestamp,$3::timestamptz,$4::time,($5::int4)::money)',
        [...values],
      )
      const wire = (
        await pg.query<Record<string, string | null>>(
          `SELECT encode(date_send(calendar),'hex') calendar,encode(timestamp_send(local_stamp),'hex') local_stamp,encode(timestamptz_send(zoned_stamp),'hex') zoned_stamp,encode(time_send(clock),'hex') clock,encode(cash_send(units),'hex') units FROM cast_context_oracle`,
        )
      ).rows[0]!
      const row = Object.fromEntries(
        Object.entries(wire).map(([name, value]) => [
          name,
          known(bits(value, name === 'calendar' ? 32 : 64)),
        ]),
      )
      for (const timezone of ['UTC', 'America/New_York', 'Etc/GMT+12', 'Etc/GMT-14']) {
        await pg.query("SELECT set_config('TimeZone',$1,false)", [timezone])
        for (const [name, sql] of Object.entries(forms)) {
          let postgres: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${sql} value FROM cast_context_oracle`,
              )
            ).rows[0]!.value
            postgres = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (cause) {
            const code = (cause as { code: string }).code
            expect(code, name).toBe('22008')
            postgres = error(code)
          }
          const deferred =
            (index === 4 && ['local_zone', 'zoned_local'].includes(name)) ||
            (index === 5 && ['date_zone', 'first_null'].includes(name))
          const expected = deferred ? { kind: 'Unknown' as const } : postgres
          references.push({ name, values, timezone, postgres, deferred, expected })
          add(name, row, expected)
        }
      }
    }
    const base: Row = {
      calendar: unknown,
      local_stamp: unknown,
      zoned_stamp: unknown,
      clock: unknown,
      units: unknown,
    }
    for (const name of ['date_zone', 'local_zone', 'zoned_local', 'zoned_date', 'first_null'])
      add(name, base, { kind: 'Unknown' })
    for (const name of ['zoned_time', 'zoned_timetz', 'clock_zone', 'cash_numeric'])
      add(name, base, { kind: 'True' })
    add('date_zone', { ...base, calendar: error('22012') }, error('22012'))
    add('first_null', { ...base, calendar: error('22012') }, error('22012'))
    await mkdir('artifacts/array-cast-validity', { recursive: true })
    const encode = (_key: string, value: unknown) =>
      typeof value === 'bigint' ? { $bigint: value.toString() } : value
    await writeFile(
      'artifacts/array-cast-validity/context-fixtures.json',
      JSON.stringify(fixtures, encode, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-cast-validity/context-references.json',
      JSON.stringify(references, encode, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycastcontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
