import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'
import { buildProject } from '../../src/project-runtime.js'
import { servePglite } from '../support/pglite-server.js'

const schema = `CREATE TABLE moments (
  id integer PRIMARY KEY, day date, local timestamp, instant timestamptz, clock time, zoned timetz,
  span interval, instants timestamptz[]
);
`
const queries = `-- name: InsertMoment :exec
INSERT INTO moments (id, day, local, instant, clock, zoned, span, instants) VALUES (@id, @day, @local, @instant, @clock, @zoned, @span, @instants);
-- name: GetMoment :one
SELECT id, day, local, instant, clock, zoned, span, instants FROM moments WHERE id = @id;
`

type Moment = Record<string, unknown> & { id: number }
// Each case pairs public values with the server's own text for them, read in UTC, so the generated
// calendar arithmetic is checked against the server's rather than against itself.
const cases: {
  moment: Moment
  day: string | null
  span: string | null
  clock: string | null
  local: string
  instant: string
}[] = [
  {
    moment: {
      id: 1,
      day: '2026-11-07',
      local: { localMicroseconds: 1_793_000_000_123_456n },
      instant: { epochMicroseconds: 0n },
      clock: { microseconds: 1 },
      zoned: { microseconds: 47_655_000_001, offsetSeconds: 19_815 },
      span: { months: 14, days: -3, microseconds: 14_706_000_007n },
      instants: [{ epochMicroseconds: -1n }, null, { infinity: 1 }],
    },
    day: '2026-11-07',
    span: '1 year 2 mons -3 days +04:05:06.000007',
    clock: '00:00:00.000001',
    local: '2026-10-26 07:33:20.123456',
    instant: '1970-01-01 00:00:00+00',
  },
  {
    moment: {
      id: 2,
      day: '-004713-11-24',
      local: { localMicroseconds: -210_866_803_200_000_000n },
      instant: { epochMicroseconds: 9_224_318_015_999_999_999n },
      clock: { microseconds: 86_400_000_000 },
      zoned: { microseconds: 0, offsetSeconds: -57_540 },
      span: { months: 0, days: 0, microseconds: -9_223_372_036_854_775_807n },
      instants: [],
    },
    day: '4714-11-24 BC',
    span: '-2562047788:00:54.775807',
    clock: '24:00:00',
    local: '4714-11-24 00:00:00 BC',
    instant: '294276-12-31 23:59:59.999999+00',
  },
  {
    moment: {
      id: 3,
      day: '+5874897-12-31',
      local: { infinity: -1 },
      instant: { epochMicroseconds: -210_866_803_200_000_000n },
      clock: null,
      zoned: null,
      span: { infinity: 1 },
      instants: null,
    },
    day: '5874897-12-31',
    span: 'infinity',
    clock: null,
    local: '-infinity',
    instant: '4714-11-24 00:00:00+00 BC',
  },
  {
    moment: {
      id: 4,
      day: '0000-02-29',
      local: { localMicroseconds: -62_135_596_800_000_001n },
      instant: { infinity: -1 },
      clock: { microseconds: 0 },
      zoned: { microseconds: 86_400_000_000, offsetSeconds: 0 },
      span: { months: 0, days: 0, microseconds: 0n },
      instants: [{ epochMicroseconds: 1_793_000_000_000_000n }],
    },
    day: '0001-02-29 BC',
    span: '00:00:00',
    clock: '00:00:00',
    local: '0001-12-31 23:59:59.999999 BC',
    instant: '-infinity',
  },
  {
    moment: {
      id: 5,
      day: 'infinity',
      local: { localMicroseconds: 0n },
      instant: { epochMicroseconds: -62_135_596_800_000_001n },
      clock: null,
      zoned: null,
      span: { months: -2_147_483_647, days: 2_147_483_647, microseconds: 1n },
      instants: null,
    },
    day: 'infinity',
    span: '-178956970 years -7 mons +2147483647 days 00:00:00.000001',
    clock: null,
    local: '1970-01-01 00:00:00',
    instant: '0001-12-31 23:59:59.999999+00 BC',
  },
]

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>
let client: pg.Client
let runtime: Record<string, (...args: unknown[]) => Promise<unknown>>
let helpers: { fromPg(client: unknown): unknown; fromPglite(db: unknown): unknown }

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-temporal-codecs-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/moments.sql'), queries)
  await writeFile(
    join(root, 'pgsid.yaml'),
    `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    typescript:
      queries:
        out:
          queries:
            types: generated/types
            runtime: generated/runtime
`,
  )
  const built = await buildProject({ baseDirectory: root })
  expect(built.state.diagnostics).toEqual([])
  runtime = {}
  for (const name of ['InsertMoment', 'GetMoment'])
    Object.assign(runtime, await import(join(root, `generated/runtime/moments/${name}.ts`)))
  helpers = (await import(
    join(root, 'generated/runtime/moments/pgsid/queryable.ts')
  )) as typeof helpers
  db = new PGlite()
  await db.exec(schema)
  server = await servePglite(db)
  client = new pg.Client({
    host: '127.0.0.1',
    port: server.port,
    user: 'postgres',
    database: 'postgres',
  })
  await client.connect()
}, 300_000)
afterAll(async () => {
  await client?.end()
  await server?.close()
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

const serverText = async (sql: string, id: number) =>
  (await db.query<{ value: string | null }>(sql, [id], { parsers: { 25: (value) => value } }))
    .rows[0]!.value

describe('TypeScript temporal codecs', () => {
  it.each([
    ['PGlite', () => helpers.fromPglite(db)],
    ['node-postgres', () => helpers.fromPg(client)],
  ] as const)('round-trips exact temporal values through %s', async (_name, connect) => {
    const queryable = connect()
    await db.exec("BEGIN; SET TIME ZONE 'UTC'")
    try {
      for (const { moment } of cases) await runtime['insertMoment']!(queryable, moment)
      for (const { moment, day, span, clock, local, instant } of cases) {
        expect(await runtime['getMoment']!(queryable, { id: moment.id })).toEqual(moment)
        expect(
          await serverText('SELECT day::text AS value FROM moments WHERE id = $1', moment.id),
        ).toBe(day)
        expect(
          await serverText('SELECT span::text AS value FROM moments WHERE id = $1', moment.id),
        ).toBe(span)
        expect(
          await serverText('SELECT clock::text AS value FROM moments WHERE id = $1', moment.id),
        ).toBe(clock)
        expect(
          await serverText('SELECT local::text AS value FROM moments WHERE id = $1', moment.id),
        ).toBe(local)
        expect(
          await serverText('SELECT instant::text AS value FROM moments WHERE id = $1', moment.id),
        ).toBe(instant)
      }
      for (const zone of ['Asia/Kathmandu', 'America/St_Johns', 'Europe/Amsterdam']) {
        await db.exec(`SET TIME ZONE '${zone}'`)
        for (const { moment } of cases)
          expect(await runtime['getMoment']!(queryable, { id: moment.id })).toEqual(moment)
      }
      await db.exec("SET intervalstyle = 'iso_8601'")
      for (const { moment } of cases)
        expect(await runtime['getMoment']!(queryable, { id: moment.id })).toEqual(moment)
      await db.exec("SET intervalstyle = 'sql_standard'")
      await expect(runtime['getMoment']!(queryable, { id: 1 })).rejects.toThrow(/IntervalStyle/u)
      await db.exec("RESET intervalstyle; SET datestyle = 'SQL, DMY'")
      await expect(runtime['getMoment']!(queryable, { id: 1 })).rejects.toThrow(/DateStyle/u)
    } finally {
      await db.exec('ROLLBACK')
      await db.exec('RESET ALL')
    }
  })

  it('writes the same values under every session date and interval style', async () => {
    const queryable = helpers.fromPglite(db)
    await db.exec('BEGIN')
    try {
      await db.exec(
        "SET datestyle = 'German, DMY'; SET intervalstyle = 'sql_standard'; SET TIME ZONE 'Pacific/Chatham'",
      )
      for (const { moment } of cases) await runtime['insertMoment']!(queryable, moment)
      await db.exec('RESET datestyle; RESET intervalstyle; RESET TIME ZONE')
      for (const { moment } of cases)
        expect(await runtime['getMoment']!(queryable, { id: moment.id })).toEqual(moment)
    } finally {
      await db.exec('ROLLBACK')
      await db.exec('RESET ALL')
    }
  })

  it('rejects malformed temporal parameters', async () => {
    const queryable = helpers.fromPglite(db)
    const base = { ...cases[0]!.moment, id: 9 }
    for (const [column, value] of [
      ['day', '2026-1-1'],
      ['day', '-000000-01-01'],
      ['day', new Date()],
      ['local', { epochMicroseconds: 0n }],
      ['instant', { epochMicroseconds: 0 }],
      ['instant', { infinity: 2 }],
      ['clock', { microseconds: -1 }],
      ['zoned', { microseconds: 1 }],
      ['span', { months: 1.5, days: 0, microseconds: 0n }],
    ] as const)
      await expect(
        runtime['insertMoment']!(queryable, { ...base, [column]: value }),
      ).rejects.toThrow(new RegExp(`Parameter ${column} holds a malformed`, 'u'))
  })
})
