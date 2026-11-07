import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

const schema = `CREATE DOMAIN workday AS date CHECK (extract(isodow FROM VALUE) < 6);
CREATE TABLE windows (
  id integer PRIMARY KEY,
  day date CONSTRAINT modern_day CHECK (day >= '2000-01-01' AND day < 'infinity'),
  local timestamp CONSTRAINT finite_local CHECK (local > '-infinity' AND local < '3000-01-01'),
  instant timestamptz CONSTRAINT century CHECK (instant < '2100-01-01 00:00:00+00'),
  clock time CONSTRAINT morning CHECK (clock < '12:00'),
  zoned timetz CONSTRAINT late_utc CHECK (zoned > '01:00:00+00'),
  span interval CONSTRAINT short_span CHECK (span < interval '1 year' AND span > interval '-1 day'),
  office workday
);
`
const queries = `-- name: InsertWindow :exec
INSERT INTO windows (id, day, local, instant, clock, zoned, span, office) VALUES (@id, @day, @local, @instant, @clock, @zoned, @span, @office);
`
const empty = {
  day: null,
  local: null,
  instant: null,
  clock: null,
  zoned: null,
  span: null,
  office: null,
}
// Each case sets one column; the others stay NULL, so only that column's CHECK can decide.
const cases: Record<string, unknown>[] = [
  { day: '2026-11-07' },
  { day: '1999-12-31' },
  { day: 'infinity' },
  { day: '-infinity' },
  { day: '-004713-11-24' },
  { day: '2024-02-29' },
  { day: '2023-02-29' },
  { local: { localMicroseconds: 0n } },
  { local: { localMicroseconds: 32_503_680_000_000_000n } },
  { local: { infinity: -1 } },
  { local: { infinity: 1 } },
  { instant: { epochMicroseconds: 4_102_444_799_999_999n } },
  { instant: { epochMicroseconds: 4_102_444_800_000_000n } },
  { instant: { infinity: -1 } },
  { clock: { microseconds: 43_199_999_999 } },
  { clock: { microseconds: 43_200_000_000 } },
  { clock: { microseconds: 86_400_000_000 } },
  { zoned: { microseconds: 7_200_000_000, offsetSeconds: 3_600 } },
  { zoned: { microseconds: 7_200_000_000, offsetSeconds: 7_200 } },
  { zoned: { microseconds: 0, offsetSeconds: -7_200 } },
  { span: { months: 11, days: 30, microseconds: 0n } },
  { span: { months: 12, days: 0, microseconds: 0n } },
  { span: { months: 0, days: -1, microseconds: 1n } },
  { span: { months: 0, days: 0, microseconds: -86_400_000_000n } },
  { span: { infinity: 1 } },
  { office: '2026-11-06' },
  { office: '2026-11-07' },
]

let root: string
let db: PGlite
let insertWindow: (db: unknown, params: unknown) => Promise<unknown>
let fromPglite: (db: PGlite) => {
  queryText(sql: string, values: readonly (string | null)[]): Promise<unknown>
}
let checks: { evaluatePublicWindowsChecks(row: object): { constraint: string; result: unknown }[] }

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-temporal-checks-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/windows.sql'), queries)
  await writeFile(
    join(root, 'pgsid.yaml'),
    `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    typescript:
      schema: { outDir: generated/schema }
      queries:
        out:
          queries:
            types: generated/types
            runtime: generated/runtime
`,
  )
  const built = await buildProject({ baseDirectory: root })
  expect(built.state.diagnostics).toEqual([])
  ;({ insertWindow } = (await import(join(root, 'generated/runtime/windows/InsertWindow.ts'))) as {
    insertWindow: typeof insertWindow
  })
  ;({ fromPglite } = (await import(join(root, 'generated/runtime/windows/pgsid/queryable.ts'))) as {
    fromPglite: typeof fromPglite
  })
  checks = (await import(join(root, 'generated/schema/public/checks.ts'))) as typeof checks
  db = new PGlite()
  await db.exec(schema)
}, 300_000)
afterAll(async () => {
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

const outcome = (work: () => Promise<unknown>): Promise<string> =>
  work().then(
    () => 'accepted',
    (error: { code?: string; constraint?: string }) =>
      error.code === '23514' ? `23514 ${error.constraint}` : String(error.code),
  )

describe('temporal CHECKs on public TypeScript values', () => {
  it('decides temporal CHECKs locally exactly as PostgreSQL does', async () => {
    const text = fromPglite(db)
    let decided = 0
    for (const [index, change] of cases.entries()) {
      const params = { id: index + 1, ...empty, ...change }
      let calls = 0
      const counted = {
        queryText: (sql: string, values: readonly (string | null)[]) => {
          calls++
          return text.queryText(sql, values)
        },
      }
      await db.exec('BEGIN')
      const local = await outcome(() => insertWindow(counted, params))
      await db.exec('ROLLBACK')
      await db.exec('BEGIN')
      const server = await outcome(() => insertWindow(text, params))
      await db.exec('ROLLBACK')
      expect({ change, local }).toEqual({ change, local: server })
      if (calls === 0) decided++
      else expect({ change, calls }).toEqual({ change, calls: 1 })
    }
    // Every rejection above is decided before the server; the accepted rows reach it.
    expect(decided).toBeGreaterThanOrEqual(10)
  })

  it('evaluates the schema-level CHECK API on public temporal values', () => {
    const results = (row: object) =>
      Object.fromEntries(
        checks
          .evaluatePublicWindowsChecks(row)
          .map(({ constraint, result }) => [constraint, result]),
      )
    expect(results({ day: '1999-12-31' })['modern_day']).toEqual({ certain: true, value: false })
    expect(results({ day: '2000-01-01' })['modern_day']).toEqual({ certain: true, value: true })
    expect(results({ span: { infinity: 1 } })['short_span']).toEqual({
      certain: true,
      value: false,
    })
    expect(results({})['modern_day']).toMatchObject({ certain: false })
    expect(() => results({ day: new Date() })).toThrow(TypeError)
    expect(() => results({ instant: { epochMicroseconds: 1 } })).toThrow(TypeError)
  })
})
