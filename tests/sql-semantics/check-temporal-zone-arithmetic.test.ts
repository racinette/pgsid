import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
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

const forms: Record<string, string> = {
  add: "encode(timestamptz_send(date_add(v,span,zone)),'hex')",
  subtract: "encode(timestamptz_send(date_subtract(v,span,zone)),'hex')",
  nested:
    "encode(timestamptz_send((ROW((ARRAY[date_add(v,span,zone)::instant_zone_domain,NULL])[1])::instant_zone_record).v),'hex')",
}
const common: CheckExecutionContext = {
  timeZone: 'UTC',
  timeZoneAbbreviations: 'Default',
  maxIdentifierBytes: 63,
  defaultCollation: 'C',
  serverEncoding: 'UTF8',
}
const profiles: {
  session: string
  context: CheckExecutionContext
  zones: (string | null)[]
  unknown?: (zone: string | null) => boolean
}[] = [
  { session: 'UTC', context: common, zones: [] },
  {
    session: 'America/New_York',
    context: { ...common, timeZone: 'America/New_York' },
    zones: ['LMT', 'EST', 'EDT', 'UTC', 'America/New_York'],
  },
  {
    session: 'Europe/Dublin',
    context: { ...common, timeZone: 'Europe/Dublin' },
    zones: ['IST', 'GMT', 'DMT', 'UTC', 'Europe/Dublin'],
  },
  {
    session: 'Europe/Moscow',
    context: { ...common, timeZone: 'Europe/Moscow' },
    zones: ['MSK', 'MSD', 'MMT', 'UTC'],
  },
  {
    session: '<UTC>-02',
    context: { ...common, timeZone: '<UTC>-02' },
    zones: ['UTC', 'utc', 'Etc/UTC', 'GMT', ''],
  },
  {
    session: '<Etc/UTC>-02',
    context: { ...common, timeZone: '<Etc/UTC>-02' },
    zones: ['Etc/UTC', 'etc/utc', 'UTC', ''],
  },
  {
    session: '<America/New_York>-02',
    context: { ...common, timeZone: '<America/New_York>-02' },
    zones: ['America/New_York', 'America/New_Xxxx', 'UTC'],
    unknown: (z) => z === 'America/New_Xxxx',
  },
  {
    session: '<+02>-03',
    context: { ...common, timeZone: '<+02>-03' },
    zones: ['+02', '-02', '02:30', 'UTC'],
  },
  {
    session: 'ABC3DEF3,M3.2.0,M11.1.0',
    context: { ...common, timeZone: 'ABC3DEF3,M3.2.0,M11.1.0' },
    zones: ['ABC', 'DEF', 'UTC'],
  },
  {
    session: 'Pacific/Guam',
    context: { ...common, timeZone: 'Pacific/Guam' },
    zones: ['ChST', 'GST', 'UTC', 'Pacific/Guam'],
    unknown: (z) => z === 'ChST',
  },
  {
    session: 'UTC',
    context: { ...common, timeZone: undefined },
    zones: ['UTC', 'Etc/UTC', '+02', ''],
    unknown: () => true,
  },
  {
    session: 'UTC',
    context: { ...common, timeZoneAbbreviations: undefined },
    zones: ['UTC', 'Etc/UTC', 'EST', '+02', ''],
    unknown: (z) => z !== 'UTC',
  },
  {
    session: 'UTC',
    context: { ...common, maxIdentifierBytes: undefined },
    zones: ['UTC', 'EST', 'America/New_York', ''],
    unknown: (z) => z !== '',
  },

  {
    session: '<ABCDEFGHIJK>-02<ABCDEFGHIJL>-03,M3.2.0,M11.1.0',
    context: { ...common, timeZone: '<ABCDEFGHIJK>-02<ABCDEFGHIJL>-03,M3.2.0,M11.1.0' },
    zones: ['ABCDEFGHIJK', 'ABCDEFGHIJL', 'ABCDEFGHIJ'],
    unknown: () => true,
  },
]
const pairs: [string | null, string | null][] = [
  ['2001-01-30T23:00:00Z', '1 month'],
  ['2024-03-09T17:00:00Z', '1 day'],
  ['2024-03-09T17:00:00Z', '24 hours'],
  ['2024-10-31T23:00:00Z', '1 month 1 day 1 hour'],
  ['1880-01-30T23:00:00Z', '1 month'],
  ['infinity', '1 day'],
  ['2000-01-01T00:00:00Z', '-9223372036854.775808 seconds'],
  [null, '1 day'],
  ['2000-01-01T00:00:00Z', null],
]
const known = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (cause: unknown): Outcome => {
  const code = (cause as { code?: string }).code
  if (!code || !/^[A-Z0-9]{5}$/.test(code)) throw cause
  return { kind: 'Error', value: { state: parseInt(code, 36) } }
}
it('resolves explicit timezone names in native session, registry and tzdb order before interval arithmetic across targets and INSERTs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-temporal-zone-arithmetic-')),
    packet = 'artifacts/goal-checks/temporal-zone-arithmetic-active',
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    expect(
      (await pg.query<{ value: string }>("SELECT current_setting('max_identifier_length') value"))
        .rows[0]!.value,
    ).toBe(String(common.maxIdentifierBytes))
    const file = await readFile('vendor/postgresql-timezone/Default', 'utf8'),
      oracle = (
        await pg.query<{ contents: string }>(
          "SELECT pg_read_file('/pglite/share/postgresql/timezonesets/Default') contents",
        )
      ).rows[0]!.contents
    expect(file).toBe(oracle)
    const abbreviations = file
      .split('\n')
      .map((l) => l.split('#')[0]!.trim().split(/\s+/u)[0]!)
      .filter(Boolean)
    expect(abbreviations).toHaveLength(195)
    profiles[0]!.zones = [
      ...abbreviations,
      'America/New_York',
      'Australia/Lord_Howe',
      'Pacific/Apia',
      '+02',
      '-02',
      '02:30',
      'UTC+5:30',
      'ABC3DEF3,M3.2.0,M11.1.0',
      '',
      null,
    ]
    await pg.exec(`CREATE DOMAIN instant_zone_domain AS timestamptz CHECK(VALUE IS NULL OR VALUE IS NOT NULL);CREATE TYPE instant_zone_record AS(v timestamptz);
CREATE TABLE explicit_zone_arithmetic(v timestamptz,span interval,zone text,expected text COLLATE "C",bypass boolean,${Object.entries(
      forms,
    )
      .map(
        ([name, sql]) =>
          `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
      .join(',')})`)
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE zone_oracle_${name}(LIKE explicit_zone_arithmetic);ALTER TABLE zone_oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'explicit_zone_arithmetic')!,
      groups = profiles.map((profile, index) =>
        prepareCheckRustGroup(
          Object.entries(forms).flatMap(([operation, sql]) =>
            (['source', 'stored'] as const).map((origin) => {
              const name = `p${index}_${operation}_${origin}`
              names.push(name)
              const expression = lowerTableCheck(
                  table,
                  table.constraints.find((c) => c.name === operation)!,
                  catalog.enums,
                  catalog.domains,
                  origin,
                  catalog.rangeTypes,
                  catalog.compositeTypeGraph,
                  origin === 'source'
                    ? `CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                    : undefined,
                )!.expression,
                publicExpression = portableCheckAtoms(expression)
              expect(hasUncertain(expression), name).toBe(false)
              expect(hasUncertain(publicExpression), name).toBe(false)
              return {
                identity: {
                  schema: 'public',
                  kind: 'table' as const,
                  owner: table.name,
                  constraint: name,
                },
                expression: publicExpression,
              }
            }),
          ),
          profile.context,
        ),
      ),
      evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
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
    group.checks.forEach((check, i) =>
      expect(check.kind, names[i] + ('reason' in check ? ':' + check.reason : '')).toBe(
        'supported',
      ),
    )
    for (const [index, profile] of profiles.entries()) {
      // Changing the zone clears the native abbreviation cache before each profile.
      await pg.query("SELECT set_config('TimeZone','GMT',false)")
      await pg.query("SELECT set_config('TimeZone',$1,false)", [profile.session])
      for (const zone of profile.zones)
        for (const [value, amount] of pairs) {
          const data = (
              await pg.query<{ stamp: string | null; duration: string | null }>(
                "SELECT encode(timestamptz_send($1::timestamptz),'hex') stamp,encode(interval_send($2::interval),'hex') duration",
                [value, amount],
              )
            ).rows[0]!,
            timestamp =
              data.stamp === null ? null : Buffer.from(data.stamp, 'hex').readBigInt64BE(),
            buffer = data.duration === null ? null : Buffer.from(data.duration, 'hex'),
            span: Input = buffer
              ? {
                  kind: 'Value',
                  value: {
                    time: buffer.readBigInt64BE(),
                    days: buffer.readInt32BE(8),
                    months: buffer.readInt32BE(12),
                  },
                }
              : { kind: 'Null' }
          for (const [operation, sql] of Object.entries(forms)) {
            let output: string | null = null,
              observation: Outcome = { kind: 'True' }
            try {
              output = (
                await pg.query<{ output: string | null }>(
                  `SELECT (${sql}) output FROM(SELECT $1::timestamptz v,$2::interval span,$3::text zone)q`,
                  [value, amount, zone],
                )
              ).rows[0]!.output
            } catch (cause) {
              observation = failure(cause)
            }
            for (const expectedText of [output, 'wrong'])
              for (const bypass of [false, true]) {
                const reference: Outcome = bypass
                  ? { kind: 'True' }
                  : observation.kind === 'Error'
                    ? observation
                    : { kind: output === expectedText ? 'True' : 'False' }
                let code: string | undefined
                try {
                  await pg.query(
                    `INSERT INTO zone_oracle_${operation} VALUES($1::timestamptz,$2::interval,$3::text,$4::text,$5::boolean)`,
                    [value, amount, zone, expectedText, bypass],
                  )
                } catch (cause) {
                  code = (cause as { code: string }).code
                }
                expect(code, `${index}/${operation}/${zone}/${value}/${amount}`).toBe(
                  reference.kind === 'Error'
                    ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                    : reference.kind === 'False'
                      ? '23514'
                      : undefined,
                )
                const expected: Outcome =
                  !bypass &&
                  value !== null &&
                  amount !== null &&
                  zone !== null &&
                  profile.unknown?.(zone)
                    ? { kind: 'Unknown' }
                    : reference
                native.push({
                  profile: index,
                  operation,
                  zone,
                  value,
                  amount,
                  expectedText,
                  bypass,
                  reference,
                  expected,
                })
                for (const origin of ['source', 'stored'])
                  fixtures.push({
                    name: `p${index}_${operation}_${origin}`,
                    row: {
                      v: known(timestamp),
                      span,
                      zone: known(zone),
                      expected: known(expectedText),
                      bypass: known(bypass),
                    },
                    expected,
                  })
              }
          }
        }
    }
    for (const name of names) {
      const base: Row = {
        v: known(0n),
        span: { kind: 'Value', value: { time: 3600000000n, months: 0, days: 0 } },
        zone: known('UTC'),
        expected: known('ref'),
        bypass: known(false),
      }
      for (const field of ['v', 'span', 'zone'])
        for (const state of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[]) {
          fixtures.push({ name, row: { ...base, [field]: state }, expected: state as Outcome })
          fixtures.push({
            name,
            row: { ...base, [field]: state, bypass: known(true) },
            expected: { kind: 'True' },
          })
        }
      fixtures.push({
        name,
        row: {
          ...base,
          v: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          zone: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        },
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'native.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      join(packet, 'summary.json'),
      JSON.stringify(
        {
          inserts: native.length,
          fixtures: fixtures.length,
          checks: names.length,
          profiles: profiles.length,
          defaultAbbreviations: abbreviations.length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'temporal_zone_arithmetic', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)

it('witnesses lookup-history dependence for long abbreviation prefixes and empty labels', async () => {
  const pg = await PGlite.create()
  try {
    const reset = async (zone: string) => {
        await pg.exec("SET TimeZone='GMT'")
        await pg.query("SELECT set_config('TimeZone',$1,false)", [zone])
      },
      query = async (zone: string) =>
        (
          await pg.query<{ value: string }>(
            "SELECT encode(timestamptz_send(date_add('2001-01-30T21:30:00Z'::timestamptz,'1 month'::interval,$1)),'hex') value",
            [zone],
          )
        ).rows[0]!.value,
      session = '<ABCDEFGHIJK>-02<ABCDEFGHIJL>-03,M3.2.0,M11.1.0'
    await reset(session)
    const fresh = await query('ABCDEFGHIJL')
    await reset(session)
    const primed = await query('ABCDEFGHIJK'),
      cached = await query('ABCDEFGHIJL')
    expect(cached).toBe(primed)
    expect(cached).not.toBe(fresh)
    await reset('<America/New_York>-02')
    await expect(query('America/New_Xxxx')).rejects.toMatchObject({ code: '22023' })
    const matched = await query('America/New_York')
    expect(await query('America/New_Xxxx')).toBe(matched)
    await reset('02:30')
    await expect(query('')).rejects.toMatchObject({ code: '22023' })
    await query('UTC')
    expect(await query('')).toBeTypeOf('string')
  } finally {
    await pg.close()
  }
})
