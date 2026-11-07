import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

const schema = `CREATE TABLE windows (
  id integer PRIMARY KEY,
  spot point CONSTRAINT right_half CHECK (spot[0] >= 0),
  edge line CONSTRAINT sloped CHECK (NOT ?| edge),
  piece lseg CONSTRAINT short_piece CHECK (length(piece) < 10),
  frame box CONSTRAINT small_frame CHECK (area(frame) < 100),
  route path CONSTRAINT few_stops CHECK (npoints(route) < 4),
  shape polygon CONSTRAINT polygonal CHECK (npoints(shape) >= 3),
  ring circle CONSTRAINT small_ring CHECK (radius(ring) <= 10)
);
`
const queries = `-- name: InsertWindow :exec
INSERT INTO windows (id, spot, edge, piece, frame, route, shape, ring) VALUES (@id, @spot, @edge, @piece, @frame, @route, @shape, @ring);
`
const empty = {
  spot: null,
  edge: null,
  piece: null,
  frame: null,
  route: null,
  shape: null,
  ring: null,
}
const point = (x: number, y: number) => ({ x, y })
// Each case sets one column; the others stay NULL, so only that column's CHECK can decide.
const cases: Record<string, unknown>[] = [
  { spot: point(0, 5) },
  { spot: point(-0.5, 5) },
  { spot: point(Number.NaN, 0) },
  { edge: { a: 1, b: -1, c: 0 } },
  { edge: { a: 1, b: 0, c: -3 } },
  { edge: { a: 0, b: 0, c: 1 } },
  { piece: { start: point(0, 0), end: point(3, 4) } },
  { piece: { start: point(0, 0), end: point(6, 8) } },
  { frame: { high: point(9, 9), low: point(0, 0) } },
  { frame: { high: point(0, 0), low: point(11, 10) } },
  { route: { closed: false, points: [point(0, 0), point(1, 1), point(2, 2)] } },
  { route: { closed: true, points: [point(0, 0), point(1, 1), point(2, 2), point(3, 3)] } },
  { shape: { points: [point(0, 0), point(0, 1), point(1, 0)] } },
  { shape: { points: [point(0, 0), point(0, 1)] } },
  { ring: { center: point(1, 1), radius: 10 } },
  { ring: { center: point(1, 1), radius: 10.5 } },
  { ring: { center: point(1, 1), radius: -1 } },
]

let root: string
let db: PGlite
let insertWindow: (db: unknown, params: unknown) => Promise<unknown>
let fromPglite: (db: PGlite) => {
  queryText(sql: string, values: readonly (string | null)[]): Promise<unknown>
}
let checks: { evaluatePublicWindowsChecks(row: object): { constraint: string; result: unknown }[] }

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-geometry-checks-'))
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

describe('geometric CHECKs on public TypeScript values', () => {
  it('decides geometric CHECKs locally exactly as PostgreSQL does', async () => {
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
    expect(decided).toBeGreaterThanOrEqual(5)
  })

  it('evaluates the schema-level CHECK API on public geometric values', () => {
    const results = (row: object) =>
      Object.fromEntries(
        checks
          .evaluatePublicWindowsChecks(row)
          .map(({ constraint, result }) => [constraint, result]),
      )
    expect(results({ frame: { high: point(11, 10), low: point(0, 0) } })['small_frame']).toEqual({
      certain: true,
      value: false,
    })
    expect(results({ frame: { high: point(0, 0), low: point(5, 5) } })['small_frame']).toEqual({
      certain: true,
      value: true,
    })
    expect(results({})['small_frame']).toMatchObject({ certain: false })
    expect(() => results({ frame: '(1,2),(0,0)' })).toThrow(TypeError)
    expect(() => results({ ring: { center: point(0, 0), radius: 1n } })).toThrow(TypeError)
  })
})
