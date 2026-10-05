import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
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
const lookup = await readFile(join(root, 'tools/check-rust-timezones/timezone.rs'), 'utf8')
const data = JSON.parse(await readFile(join(directory, 'tables.fixtures.json'), 'utf8')) as {
  names: string[]
  ids: number[]
  zones: { times: string[]; offsets: number[]; initial: number; future: string }[]
}
const statistics = JSON.parse(
  await readFile(join(directory, 'tables.stats.json'), 'utf8'),
) as Record<string, number>
const pg = await PGlite.create()
const fixtures: { name: string; row: Row; expected: Outcome }[] = []
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
  operations.files = [
    ...operations.files.filter((file) => !file.path.endsWith('/timezone.rs')),
    { path: 'timezone-tables.rs', source: tables },
    { path: 'timezone-spike.rs', source: lookup },
  ]
  const toText = (micros: bigint): string => {
    if (micros === -9223372036854775808n) return "'-infinity'"
    if (micros === 9223372036854775807n) return "'infinity'"
    if (micros === -211813488000000000n) return "'4714-11-24 00:00:00 BC'"
    if (micros === 9223371331199999999n) return "'294276-12-31 23:59:59.999999'"
    return `(TIMESTAMP '2000-01-01' + INTERVAL '${micros} microseconds')`
  }
  const compare = async (
    zone: string,
    micros: bigint,
    name: 'to_utc' | 'from_utc',
    supported: boolean,
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
          [zone],
        )
      ).rows[0]!.binary
      output = Buffer.from(binary, 'hex').readBigInt64BE()
    } catch (error) {
      const code = (error as { code: string }).code
      assert.equal(code, '22008')
      expected = { kind: 'Error', value: { state: Number.parseInt(code, 36) } }
    }
    if (!supported) expected = { kind: 'Unknown' }
    if (expected.kind === 'Unknown') counts.unknown++
    else if (expected.kind === 'Error') counts.errors++
    else counts.definite++
    const row: Row = {
      zone: value(zone),
      local_at: value(name === 'to_utc' ? micros : output),
      instant_at: value(name === 'to_utc' ? output : micros),
    }
    fixtures.push({ name, row, expected })
    if (
      expected.kind === 'True' &&
      output !== null &&
      output !== -9223372036854775808n &&
      output !== 9223372036854775807n
    ) {
      fixtures.push({
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
  for (const [index, zone] of data.names.entries()) {
    if (!zone.includes('/')) continue
    const info = data.zones[data.ids[index]!]!
    const times = info.times.map(BigInt)
    const recurring = /[,;]/u.test(info.future)
    const samples = new Set<bigint>([
      0n,
      820454400000001n,
      -211813488000000000n,
      9223371331199999999n,
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
    for (const micros of samples)
      for (const name of ['to_utc', 'from_utc'] as const) {
        // A local lookup starts one day earlier to find its next transition.
        const probe = name === 'to_utc' ? micros - 86400000000n : micros
        const supported = !recurring || !times.length || probe < times.at(-1)!
        await compare(zone, micros, name, supported)
      }
  }
  for (const zone of ['eUrOpE/mOsCoW', 'US/Eastern', 'Etc/UTC'])
    for (const name of ['to_utc', 'from_utc'] as const) await compare(zone, 0n, name, true)
  for (const name of ['to_utc', 'from_utc']) {
    for (const zone of ['No/Such_Zone', 'EST', 'UTC', 'UTC2DST'])
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
