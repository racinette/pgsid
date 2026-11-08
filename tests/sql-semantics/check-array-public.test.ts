import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

// Public arrays are nested lists, sent as array text, so array_in's rules decide their shape;
// each element converts as its own type does and the evaluator's array builder assembles them.
const schema = `CREATE TYPE mood AS ENUM ('low', 'mid', 'high');
CREATE TABLE notes (
  id integer PRIMARY KEY,
  counts int4[] CONSTRAINT few_counts CHECK (cardinality(counts) <= 3),
  grid int4[] CONSTRAINT corner_one CHECK (grid[1][1] = 1),
  tags text[] CONSTRAINT tagged_x CHECK ('x' = ANY (tags)),
  days date[] CONSTRAINT modern_days CHECK (days[1] >= '2000-01-01'),
  spans int4range[] CONSTRAINT short_spans CHECK (upper(spans[1]) <= 10),
  moods mood[] CONSTRAINT calm CHECK (NOT ('high' = ANY (moods))),
  ratios real[] CONSTRAINT small_ratios CHECK (ratios[1] < 0.5)
);
`
const columns = ['counts', 'grid', 'tags', 'days', 'spans', 'moods', 'ratios'] as const
const queries = `-- name: InsertNote :exec
INSERT INTO notes (id, ${columns.join(', ')}) VALUES (@id, ${columns.map((column) => `@${column}`).join(', ')});
`
const span = (lower: unknown, upper: unknown, lowerInclusive = true, upperInclusive = false) => ({
  empty: false,
  lower,
  upper,
  lowerInclusive,
  upperInclusive,
})
const deep = (depth: number): unknown => (depth === 0 ? 1 : [deep(depth - 1)])
// Each case sets one column; the others stay NULL, so only that column's CHECK can decide.
const cases: Partial<Record<(typeof columns)[number], unknown>>[] = [
  { counts: [1, 2, 3] },
  { counts: [1, 2, 3, 4] },
  { counts: [] },
  { counts: [1, null, 3, null] },
  {
    counts: [
      [1, 2],
      [3, 4],
    ],
  },
  { counts: [[1, 2], [3]] },
  { counts: [[1, 2], 3] },
  { counts: deep(7) },
  {
    grid: [
      [1, 2],
      [3, 4],
    ],
  },
  {
    grid: [
      [2, 1],
      [3, 4],
    ],
  },
  { grid: [[null, 1]] },
  { grid: [1, 2] },
  { tags: ['a', 'x'] },
  { tags: ['a', 'b'] },
  { tags: ['a', null] },
  { tags: ['say "x"', 'x'] },
  { days: ['2026-11-07'] },
  { days: ['1999-12-31', '2026-01-01'] },
  { days: ['2026-02-30'] },
  { spans: [span(1, 10, true, true)] },
  { spans: [span(1, 9, true, true), span(5, 3)] },
  { spans: [span(5, 3)] },
  { moods: ['low', 'mid'] },
  { moods: ['low', 'high'] },
  // A number that is no real is sent as its shortest text and rounded by the server.
  { ratios: [0.25] },
  { ratios: [0.1] },
  { ratios: [0.4999999999] },
  { ratios: [1e39] },
]

let root: string
let db: PGlite
let insertNote: (db: unknown, params: unknown) => Promise<unknown>
let fromPglite: (db: PGlite) => {
  queryText(sql: string, values: readonly (string | null)[]): Promise<unknown>
}
let checks: {
  evaluatePublicNotesChecks(row: object): { constraint: string; result: unknown }[]
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-array-checks-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/notes.sql'), queries)
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
  ;({ insertNote } = (await import(join(root, 'generated/runtime/notes/InsertNote.ts'))) as {
    insertNote: typeof insertNote
  })
  ;({ fromPglite } = (await import(join(root, 'generated/runtime/notes/pgsid/queryable.ts'))) as {
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

describe('CHECKs on public TypeScript arrays', () => {
  it('decides each CHECK locally exactly as PostgreSQL does', async () => {
    const text = fromPglite(db)
    const empty = Object.fromEntries(columns.map((column) => [column, null]))
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
      const local = await outcome(() => insertNote(counted, params))
      await db.exec('ROLLBACK')
      await db.exec('BEGIN')
      const server = await outcome(() => insertNote(text, params))
      await db.exec('ROLLBACK')
      const shown = JSON.stringify(change)
      expect({ shown, local }).toEqual({ shown, local: server })
      if (calls === 0) decided++
      else expect({ shown, calls }).toEqual({ shown, calls: 1 })
    }
    // CHECK violations, ragged arrays and reversed range elements are decided before the server.
    expect(decided).toBeGreaterThanOrEqual(10)
  })

  it('takes only public arrays in the schema-level CHECK API', () => {
    const result = (row: object, constraint: string) =>
      checks.evaluatePublicNotesChecks(row).find((check) => check.constraint === constraint)!.result
    expect(result({ counts: [1, 2, 3, 4] }, 'few_counts')).toEqual({ certain: true, value: false })
    expect(result({ counts: [[1, 2], [3]] }, 'few_counts')).toMatchObject({
      certain: true,
      error: '22P02',
    })
    for (const counts of [
      1,
      '{1,2}',
      [1n],
      [1.5],
      [undefined],
      { kind: 'Value', value: { elementType: 'pg_catalog.int4', elements: [] } },
    ])
      expect(() => result({ counts }, 'few_counts'), String(counts)).toThrow(TypeError)
  })
})
