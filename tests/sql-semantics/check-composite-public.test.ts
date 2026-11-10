import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

// Public composites are objects of their fields in attribute order; queries send a missing field
// as NULL. Each field converts as its own type does, ranges and arrays inside included.
const schema = `CREATE TYPE address AS (street text, zip text);
CREATE TYPE slot AS (span int4range, label text, sizes int4[]);
CREATE TYPE tag AS (code varchar(3), amount numeric(4,1));
CREATE TABLE notes (
  id integer PRIMARY KEY,
  home address CONSTRAINT postal_zip CHECK (length((home).zip) = 5),
  homes address[] CONSTRAINT two_homes CHECK (cardinality(homes) <= 2),
  booking slot CONSTRAINT short_booking CHECK (upper((booking).span) <= 10 AND cardinality((booking).sizes) <= 2),
  tagged tag CONSTRAINT coded CHECK ((tagged).code IS NOT NULL),
  tags tag[] CONSTRAINT few_tags CHECK (cardinality(tags) <= 2),
  code varchar(3) CONSTRAINT has_code CHECK (code <> ''),
  amount numeric(4,1) CONSTRAINT small_amount CHECK (amount < 100)
);
`
const columns = ['home', 'homes', 'booking', 'tagged', 'tags', 'code', 'amount'] as const
const queries = `-- name: InsertNote :exec
INSERT INTO notes (id, ${columns.join(', ')}) VALUES (@id, ${columns.map((column) => `@${column}`).join(', ')});
`
const span = (lower: unknown, upper: unknown, lowerInclusive = true, upperInclusive = false) => ({
  empty: false,
  lower: lower === null ? null : { value: lower, inclusive: lowerInclusive },
  upper: upper === null ? null : { value: upper, inclusive: upperInclusive },
})
// Each case sets one column; the others stay NULL, so only that column's CHECK can decide.
const cases: Partial<Record<(typeof columns)[number], unknown>>[] = [
  { home: { street: 'Main', zip: '12345' } },
  { home: { street: 'Main', zip: '1234' } },
  { home: { street: 'Main' } },
  { home: { street: 'Main', zip: '12345', extra: 1 } },
  { home: { street: 'a "quoted", (street)', zip: '00000' } },
  { homes: [{ street: 'a', zip: '1' }] },
  { homes: [{ street: 'a' }, { street: 'b' }, { street: 'c' }] },
  { homes: [null, { street: 'b' }] },
  { homes: [] },
  { booking: { span: span(1, 10, true, true), label: 'x', sizes: [1] } },
  { booking: { span: span(1, 9, true, true), label: 'x', sizes: [1, 2] } },
  { booking: { span: span(1, 9, true, true), label: 'x', sizes: [1, 2, 3] } },
  { booking: { span: span(5, 3), label: 'x', sizes: [] } },
  { booking: { span: { empty: true }, sizes: [[1, 2], [3]] } },
  // Type modifiers apply as the server reads the value, before any check.
  { tagged: { code: 'abc', amount: '1.25' } },
  { tagged: { amount: '1' } },
  { tagged: { code: 'long' } },
  { tagged: { code: 'abc', amount: '12345' } },
  { tags: [{ code: 'a' }, { code: 'b' }, { code: 'c' }] },
  { tags: [{ code: 'long' }, { code: 'b' }, { code: 'c' }] },
  { code: 'abc' },
  { code: '' },
  { code: 'long' },
  { code: 'ab   ' },
  { amount: '99.94' },
  { amount: '99.96' },
  { amount: '12345' },
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
  root = await mkdtemp(join(tmpdir(), 'pgsid-composite-checks-'))
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

describe('CHECKs on public TypeScript composites', () => {
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
    // CHECK violations and malformed field values are decided before the server.
    expect(decided).toBeGreaterThanOrEqual(5)
  })

  it('takes only public composites in the schema-level CHECK API', () => {
    const result = (row: object, constraint: string) =>
      checks.evaluatePublicNotesChecks(row).find((check) => check.constraint === constraint)!.result
    expect(result({ home: { street: 'a', zip: 'x' } }, 'postal_zip')).toEqual({
      certain: true,
      value: false,
    })
    // Type modifiers apply as the server reads the value: a varchar too long fails and a numeric
    // rounds to its scale before the check.
    expect(result({ code: 'long' }, 'has_code')).toMatchObject({ certain: true, error: '22001' })
    expect(result({ code: 'ab   ' }, 'has_code')).toEqual({ certain: true, value: true })
    expect(result({ amount: '99.96' }, 'small_amount')).toEqual({ certain: true, value: false })
    expect(result({ amount: '12345' }, 'small_amount')).toMatchObject({
      certain: true,
      error: '22003',
    })
    // A value its type modifier rejects is never certainly within a check.
    for (const [row, constraint] of [
      [{ tagged: { code: 'long' } }, 'coded'],
      [{ tags: [{ code: 'long' }] }, 'few_tags'],
      [{ code: 'long' }, 'has_code'],
      [{ amount: '12345' }, 'small_amount'],
      [{ amount: '99.96' }, 'small_amount'],
    ] as const)
      expect(result(row, constraint), JSON.stringify(row)).not.toMatchObject({ value: true })
    for (const home of ['Main,12345', ['Main', '12345'], { street: 1, zip: '12345' }])
      expect(() => result({ home }, 'postal_zip'), JSON.stringify(home)).toThrow(TypeError)
    // A composite is any object of its fields: unknown keys are ignored and missing fields are
    // NULL, as queries send them, so a stray object is an all-NULL row rather than malformed.
    expect(result({ home: { kind: 'Value', value: {} } }, 'postal_zip')).toEqual({
      certain: true,
      value: null,
    })
  })
})
