import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Input, type Outcome, type Row } from '../check-rust/parity.js'

const run = promisify(execFile)
const root = fileURLToPath(new URL('../../', import.meta.url))
const directory = join(root, 'artifacts/check-rust-timezones')
await rm(directory, { recursive: true, force: true })
await mkdir(join(directory, 'tzif'), { recursive: true })
await run(process.env['ZIC'] ?? 'zic', [
  '-d',
  join(directory, 'tzif'),
  join(root, 'vendor/postgresql-timezone/tzdata.zi'),
])
await run('cargo', [
  'run',
  '--quiet',
  '--locked',
  '--offline',
  '--manifest-path',
  join(root, 'tools/check-timezone-data/Cargo.toml'),
  '--',
  join(directory, 'tzif'),
  join(directory, 'tables.rs'),
])
const tables = await readFile(join(directory, 'tables.rs'), 'utf8')
const ruleTables = await readFile(join(root, 'tools/check-rust-timezones/rule-fixtures.rs'), 'utf8')
const data = JSON.parse(await readFile(join(directory, 'tables.fixtures.json'), 'utf8')) as {
  names: string[]
  ids: number[]
  zones: { times: string[]; offsets: number[]; initial: number; future: string }[]
}
const statistics = JSON.parse(
  await readFile(join(directory, 'tables.stats.json'), 'utf8'),
) as Record<string, number>
const pg = await PGlite.create()
type Fixture = { name: string; row: Row; expected: Outcome }
const fixtures: Fixture[] = []
const ruleFixtures: Fixture[] = []
const value = (input: bigint | string | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }
const definitions = {
  to_utc: 'timezone(zone,local_at) = instant_at',
  from_utc: 'timezone(zone,instant_at) = local_at',
}
let group: ReturnType<typeof prepareCheckRustGroup>
const counts = { definite: 0, unknown: 0, errors: 0 }
try {
  await pg.exec(`CREATE TABLE named_timezone_checks (zone text,local_at timestamp,instant_at timestamptz,
    CONSTRAINT to_utc CHECK (${definitions.to_utc}),CONSTRAINT from_utc CHECK (${definitions.from_utc}));`)
  const catalog = await snapshotCatalog(pg)
  const table = catalog.tables.find((item) => item.name === 'named_timezone_checks')!
  group = prepareCheckRustGroup(
    Object.keys(definitions).map((name) => ({
      expression: lowerTableCheck(
        table,
        table.constraints.find((item) => item.name === name)!,
      )!.expression,
      identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
    })),
  )
  assert.ok(group.source)
  const operations = group.source.modules.find((module) => module.name === 'pg_catalog')!
  assert.equal(
    operations.files.find((file) => file.path === 'generated/timezone_tables.rs')?.source,
    tables,
  )
  const toText = (micros: bigint): string => {
    if (micros === -9223372036854775808n) return "'-infinity'"
    if (micros === 9223372036854775807n) return "'infinity'"
    if (micros === -211813488000000000n) return "'4714-11-24 00:00:00 BC'"
    if (micros === 9223371331199999999n) return "'294276-12-31 23:59:59.999999'"
    const days = micros / 86400000000n
    const remainder = micros % 86400000000n
    const seconds = remainder / 1000000n
    const fraction = remainder % 1000000n
    return `(TIMESTAMP '2000-01-01' + INTERVAL '${days} days' + INTERVAL '${seconds} seconds' + INTERVAL '${fraction} microseconds')`
  }
  const compare = async (
    zone: string,
    micros: bigint,
    name: 'to_utc' | 'from_utc',
    oracleZone = zone,
    destination = fixtures,
  ): Promise<void> => {
    let output: bigint | null = null
    let expected: Outcome = { kind: 'True' }
    try {
      const input = toText(micros)
      const converted =
        name === 'to_utc'
          ? `timezone($1,${input}::timestamp)`
          : `timezone($1,timezone('UTC',${input}::timestamp))`
      const binary = (
        await pg.query<{ binary: string }>(
          `SELECT encode(${name === 'to_utc' ? 'timestamptz_send' : 'timestamp_send'}(${converted}),'hex') AS binary`,
          [oracleZone],
        )
      ).rows[0]!.binary
      output = Buffer.from(binary, 'hex').readBigInt64BE()
    } catch (error) {
      const code = (error as { code: string }).code
      assert.equal(code, '22008')
      expected = { kind: 'Error', value: { state: Number.parseInt(code, 36) } }
    }
    if (destination === fixtures) {
      if (expected.kind === 'Unknown') counts.unknown++
      else if (expected.kind === 'Error') counts.errors++
      else counts.definite++
    }
    const row: Row = {
      zone: value(zone),
      local_at: value(name === 'to_utc' ? micros : output),
      instant_at: value(name === 'to_utc' ? output : micros),
    }
    destination.push({ name, row, expected })
    if (
      expected.kind === 'True' &&
      output !== null &&
      output !== -9223372036854775808n &&
      output !== 9223372036854775807n
    ) {
      destination.push({
        name,
        row: {
          ...row,
          [name === 'to_utc' ? 'instant_at' : 'local_at']: value(
            output === 9223371331199999999n ? output - 1n : output + 1n,
          ),
        },
        expected: { kind: 'False' },
      })
    }
  }
  const futureBoundarySamples = async (zone: string, years: readonly number[]) => {
    const samples = new Set<bigint>()
    let transitions = 0
    for (const year of years) {
      const daily = (
        await pg.query<{ utc: string; local: string }>(
          `
          SELECT encode(timestamptz_send(t),'hex') AS utc,
                 encode(timestamp_send(timezone($1,t)),'hex') AS local
          FROM generate_series(timezone('UTC',$2::timestamp),timezone('UTC',$3::timestamp),
                               INTERVAL '1 day') AS t`,
          [zone, `${year - 1}-12-24`, `${year + 1}-01-08`],
        )
      ).rows.map((row) => {
        const utc = Buffer.from(row.utc, 'hex').readBigInt64BE()
        return { utc, offset: Buffer.from(row.local, 'hex').readBigInt64BE() - utc }
      })
      for (const [i, day] of daily.entries()) {
        if (i === 0 || day.offset === daily[i - 1]!.offset) continue
        const before = daily[i - 1]!.offset
        let low = daily[i - 1]!.utc / 1000000n
        let high = day.utc / 1000000n
        while (low + 1n < high) {
          const middle = low + (high - low) / 2n
          const micros = middle * 1000000n
          const binary = (
            await pg.query<{ binary: string }>(
              `
              SELECT encode(timestamp_send(timezone($1,timezone('UTC',${toText(micros)}))),'hex') AS binary`,
              [zone],
            )
          ).rows[0]!.binary
          const offset = Buffer.from(binary, 'hex').readBigInt64BE() - micros
          if (offset === before) low = middle
          else high = middle
        }
        const boundary = high * 1000000n
        transitions++
        for (const point of [
          boundary - 1n,
          boundary,
          boundary + 1n,
          boundary + before - 1n,
          boundary + before,
          boundary + before + 1n,
          boundary + day.offset - 1n,
          boundary + day.offset,
          boundary + day.offset + 1n,
          boundary + (before + day.offset) / 2n,
        ])
          samples.add(point)
      }
    }
    return { samples, transitions }
  }
  const special = new Set([
    'America/New_York',
    'Europe/Moscow',
    'Europe/Dublin',
    'Australia/Lord_Howe',
    'Pacific/Apia',
    'Asia/Kathmandu',
    'Africa/Casablanca',
    'Europe/Paris',
  ])
  const futureDates = ['2050-01-01', '2050-07-01', '2100-01-01', '2400-01-01', '10000-01-01']
  const futureSamples: bigint[] = []
  for (const date of futureDates) {
    const binary = (
      await pg.query<{ binary: string }>(
        `SELECT encode(timestamp_send($1::timestamp),'hex') AS binary`,
        [date],
      )
    ).rows[0]!.binary
    futureSamples.push(Buffer.from(binary, 'hex').readBigInt64BE())
  }
  const futureRules = new Set<string>()
  let futureTransitions = 0
  for (const [index, zone] of data.names.entries()) {
    if (!zone.includes('/')) continue
    const info = data.zones[data.ids[index]!]!
    const times = info.times.map(BigInt)
    const samples = new Set<bigint>([
      0n,
      820454400000001n,
      -211813488000000000n,
      9223371331199999999n,
      ...futureSamples,
    ])
    if (times.length) {
      samples.add(times[0]! - 1n)
      samples.add(times.at(-1)!)
      samples.add(times.at(-1)! + 86400000001n)
    }
    if (special.has(zone)) {
      for (const [i, time] of times.entries()) {
        const before = BigInt(i === 0 ? info.initial : info.offsets[i - 1]!) * 1000000n
        const after = BigInt(info.offsets[i]!) * 1000000n
        for (const point of [
          time - 1n,
          time,
          time + 1n,
          time + before - 1n,
          time + before,
          time + after - 1n,
          time + after,
        ])
          samples.add(point)
      }
    }
    if (/[,;]/u.test(info.future) && !futureRules.has(info.future)) {
      futureRules.add(info.future)
      const future = await futureBoundarySamples(zone, [2040, 2100, 2400, 10000])
      futureTransitions += future.transitions
      for (const point of future.samples) samples.add(point)
    }
    for (const micros of samples)
      for (const name of ['to_utc', 'from_utc'] as const) {
        await compare(zone, micros, name)
      }
  }
  statistics['futureRulePatternsTested'] = futureRules.size
  statistics['futureTransitionsTested'] = futureTransitions
  assert.equal(
    futureRules.size,
    new Set(data.zones.map((zone) => zone.future).filter((rule) => /[,;]/u.test(rule))).size,
  )
  for (const [zone, oracleZone] of [
    ['Test/Julian', 'STD0DST,J60/0,J300/0'],
    ['Test/Ordinal', 'STD0DST,59/0,300/0'],
    ['Test/Seconds', 'STD-0:30:60DST-1:45:60,M3.5.0/26:30:60,M10.5.0/-1:20:60'],
    ['Test/Signed', 'STD0DST-1;J1/-2,J300/26'],
  ] as const) {
    const future = await futureBoundarySamples(oracleZone, [2040, 2100, 2400, 10000])
    const samples = new Set([...future.samples, ...futureSamples, 9223371331199999999n])
    for (const micros of samples)
      for (const name of ['to_utc', 'from_utc'] as const)
        await compare(zone, micros, name, oracleZone, ruleFixtures)
  }
  for (const name of ['to_utc', 'from_utc'])
    ruleFixtures.push({
      name,
      row: {
        zone: value('Test/Invalid'),
        local_at: value(futureSamples[0]!),
        instant_at: value(futureSamples[0]!),
      },
      expected: { kind: 'Unknown' },
    })
  for (const zone of [
    'eUrOpE/mOsCoW',
    'US/Eastern',
    'Etc/UTC',
    'UTC',
    'GMT',
    'UTC+02:30',
    '-03:45:30',
  ])
    for (const name of ['to_utc', 'from_utc'] as const) await compare(zone, 0n, name)
  for (const name of ['to_utc', 'from_utc']) {
    for (const zone of ['No/Such_Zone', 'EST', 'UTC2DST'])
      fixtures.push({
        name,
        row: { zone: value(zone), local_at: value(0n), instant_at: value(0n) },
        expected: { kind: 'Unknown' },
      })
    const unknown: Input = { kind: 'Unknown' }
    const error: Input = { kind: 'Error', value: { state: Number.parseInt('22009', 36) } }
    fixtures.push({
      name,
      row: { zone: unknown, local_at: value(0n), instant_at: value(0n) },
      expected: unknown,
    })
    fixtures.push({
      name,
      row: { zone: error, local_at: unknown, instant_at: unknown },
      expected: error,
    })
    fixtures.push({
      name,
      row: {
        zone: value('Europe/Moscow'),
        local_at: { kind: 'Null' },
        instant_at: { kind: 'Null' },
      },
      expected: { kind: 'Null' },
    })
    for (const infinity of [-9223372036854775808n, 9223372036854775807n])
      fixtures.push({
        name,
        row: {
          zone: value('No/Such_Zone'),
          local_at: value(infinity),
          instant_at: value(infinity),
        },
        expected: { kind: 'True' },
      })
  }
} finally {
  await pg.close()
}
await runCheckParity(directory, 'timezonechecks', group, Object.keys(definitions), fixtures)
const ruleGroup = structuredClone(group)
const ruleOperations = ruleGroup.source!.modules.find((module) => module.name === 'pg_catalog')!
ruleOperations.files = ruleOperations.files.map((file) =>
  file.path === 'generated/timezone_tables.rs'
    ? { path: 'timezone-rule-fixtures.rs', source: ruleTables }
    : file,
)
const ruleDirectory = join(directory, 'rule-fixtures')
await mkdir(ruleDirectory, { recursive: true })
await runCheckParity(
  ruleDirectory,
  'timezonerulechecks',
  ruleGroup,
  Object.keys(definitions),
  ruleFixtures,
)
statistics['syntheticRuleFixtures'] = ruleFixtures.length
for (const language of ['go', 'typescript']) {
  const extension = language === 'go' ? 'go' : 'ts'
  statistics[language + 'OperationsSourceBytes'] = (
    await readFile(join(directory, language, 'pg_catalog/operations.' + extension))
  ).byteLength
}
await writeFile(
  join(directory, 'results.json'),
  JSON.stringify({ statistics, counts, parityFixtures: fixtures.length }, null, 2) + '\n',
)
process.stdout.write(
  JSON.stringify({ statistics, counts, parityFixtures: fixtures.length }, null, 2) + '\n',
)
