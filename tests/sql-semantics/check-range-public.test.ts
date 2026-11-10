import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

// Public ranges are built by the evaluator's own range constructor, which orders, canonicalizes
// and empties ranges as range_in does for the text the query sends.
const schema = `CREATE TYPE mood AS ENUM ('low', 'mid', 'high');
CREATE TYPE floatrange AS RANGE (subtype = float8);
CREATE TYPE moodrange AS RANGE (subtype = mood);
CREATE TABLE notes (
  id integer PRIMARY KEY,
  seats int4range CONSTRAINT ten_seats CHECK (upper(seats) <= 10),
  amounts numrange CONSTRAINT bounded_amounts CHECK (NOT upper_inf(amounts) AND lower(amounts) >= 0),
  days daterange CONSTRAINT short_days CHECK (upper(days) - lower(days) <= 7),
  local tsrange CONSTRAINT modern_local CHECK (lower(local) >= '2000-01-01'),
  instants tstzrange CONSTRAINT open_instants CHECK (NOT isempty(instants)),
  ratio floatrange CONSTRAINT unit_ratio CHECK (ratio <@ floatrange(0, 1, '[]')),
  moods moodrange CONSTRAINT calm_moods CHECK (NOT moods @> 'high'::mood),
  slots int4multirange CONSTRAINT short_slots CHECK (upper(slots) <= 10),
  weeks datemultirange CONSTRAINT this_year CHECK (range_merge(weeks) <@ daterange('2026-01-01', '2027-01-01')),
  ratios floatmultirange CONSTRAINT single_ratio CHECK (ratios = floatmultirange(floatrange(0, 1)))
);
`
const columns = [
  'seats',
  'amounts',
  'days',
  'local',
  'instants',
  'ratio',
  'moods',
  'slots',
  'weeks',
  'ratios',
] as const
const queries = `-- name: InsertNote :exec
INSERT INTO notes (id, ${columns.join(', ')}) VALUES (@id, ${columns.map((column) => `@${column}`).join(', ')});
`
// A null bound is unbounded and has no inclusivity; the flags apply only to present bounds.
const span = (lower: unknown, upper: unknown, lowerInclusive = true, upperInclusive = false) => ({
  empty: false,
  lower: lower === null ? null : { value: lower, inclusive: lowerInclusive },
  upper: upper === null ? null : { value: upper, inclusive: upperInclusive },
})
const day = (date: string) => date
const micros = (iso: string, field: 'localMicroseconds' | 'epochMicroseconds') => ({
  [field]: BigInt(Date.parse(iso)) * 1000n,
})
// Each case sets one column; the others stay NULL, so only that column's CHECK can decide.
const cases: Partial<Record<(typeof columns)[number], unknown>>[] = [
  { seats: span(1, 10, true, true) },
  { seats: span(1, 9, true, true) },
  { seats: span(0, 10, false, true) },
  { seats: span(3, 4, false, false) },
  { seats: span(5, 3) },
  { seats: { empty: true } },
  { seats: span(null, 11) },
  { amounts: span('0', '1.5') },
  { amounts: span('-0.1', '1') },
  { amounts: span('1.0', '1', true, false) },
  { amounts: span('0', null) },
  { amounts: span('2', '1') },
  { days: span(day('2026-11-01'), day('2026-11-08')) },
  { days: span(day('2026-11-01'), day('2026-11-08'), true, true) },
  { days: span(day('2026-11-01'), day('2026-11-02'), false, false) },
  { local: span(micros('2000-01-01T00:00:00Z', 'localMicroseconds'), null) },
  { local: span(micros('1999-12-31T23:59:59Z', 'localMicroseconds'), null) },
  { local: span({ infinity: -1 }, null) },
  {
    instants: span(
      micros('2026-11-07T00:00:00Z', 'epochMicroseconds'),
      micros('2026-11-07T00:00:00Z', 'epochMicroseconds'),
    ),
  },
  {
    instants: span(
      micros('2026-11-07T00:00:00Z', 'epochMicroseconds'),
      micros('2026-11-07T00:00:00Z', 'epochMicroseconds'),
      true,
      true,
    ),
  },
  { instants: { empty: true } },
  { ratio: span(0, 1, true, true) },
  { ratio: span(0, 1.5) },
  { ratio: span(0.5, 0.25) },
  { ratio: span(NaN, NaN, true, true) },
  { moods: span('low', 'mid', true, true) },
  { moods: span('low', 'high', true, true) },
  { moods: span('high', 'low') },
  // Multiranges sort, merge and drop empty members as multirange_in does.
  { slots: [span(1, 3), span(2, 5)] },
  { slots: [span(8, 10, true, true)] },
  { slots: [span(1, 2), span(4, 4)] },
  { slots: [] },
  { slots: [span(5, 3)] },
  {
    weeks: [span(day('2026-03-01'), day('2026-03-08')), span(day('2026-12-30'), day('2027-01-02'))],
  },
  { weeks: [span(day('2026-03-01'), day('2026-03-08'))] },
  { ratios: [span(0.5, 1), span(0, 0.5)] },
  { ratios: [span(0, 0.25), span(0.5, 1)] },
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
  root = await mkdtemp(join(tmpdir(), 'pgsid-range-checks-'))
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

// Each bound is null or an object with a present value and a boolean inclusivity: an unbounded
// side cannot be inclusive, and the former flat shape is not a public value.
const malformedBounds: unknown[] = [
  { empty: false, lower: { value: null, inclusive: true }, upper: { value: 11, inclusive: false } },
  { empty: false, lower: { inclusive: true }, upper: { value: 11, inclusive: false } },
  { empty: false, lower: { value: 1 }, upper: { value: 11, inclusive: false } },
  { empty: false, lower: { value: 1, inclusive: 'yes' }, upper: null },
  { empty: false, lower: null, upper: { value: undefined, inclusive: false } },
  { empty: false, lower: 1, upper: null },
  { empty: false, lower: null },
  { empty: false, lower: 1, upper: 2, lowerInclusive: true, upperInclusive: false },
  { empty: false, lower: null, upper: 11, lowerInclusive: true, upperInclusive: false },
]

describe('CHECKs on public TypeScript ranges', () => {
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
      const shown = JSON.stringify(change, (_, value: unknown) =>
        typeof value === 'bigint' ? `${value}n` : value,
      )
      expect({ shown, local }).toEqual({ shown, local: server })
      if (calls === 0) decided++
      else expect({ shown, calls }).toEqual({ shown, calls: 1 })
    }
    // CHECK violations and reversed bounds above are decided before the server.
    expect(decided).toBeGreaterThanOrEqual(10)
  })

  it('takes only public ranges in the schema-level CHECK API', async () => {
    const result = (row: object, constraint: string) =>
      checks.evaluatePublicNotesChecks(row).find((check) => check.constraint === constraint)!.result
    // [1,10] is stored as [1,11), so its upper bound is 11.
    expect(result({ seats: span(1, 10, true, true) }, 'ten_seats')).toEqual({
      certain: true,
      value: false,
    })
    expect(result({ seats: span(5, 3) }, 'ten_seats')).toMatchObject({
      certain: true,
      error: '22000',
    })
    for (const seats of [
      { kind: 'Value', value: { empty: true } },
      { empty: 'no' },
      { empty: false, lower: 1 },
      span(1n, 2),
      span(1.5, 2),
      [1, 2],
      ...malformedBounds,
    ])
      expect(
        () => result({ seats }, 'ten_seats'),
        JSON.stringify(seats, (_, v) => String(v)),
      ).toThrow(TypeError)
    // The query rejects the same malformed bounds, at its CHECK inputs or its encoder, before
    // anything reaches the server.
    const empty = Object.fromEntries(columns.map((column) => [column, null]))
    for (const seats of malformedBounds) {
      let calls = 0
      const counted = {
        queryText: () => {
          calls++
          return Promise.reject(new Error('reached the server'))
        },
      }
      const error: unknown = await insertNote(counted, { id: 1, ...empty, seats }).then(
        () => undefined,
        (reason: unknown) => reason,
      )
      const shown = JSON.stringify(seats, (_, v) => String(v))
      expect(error, shown).toBeInstanceOf(TypeError)
      expect((error as Error).message, shown).toMatch(
        /^(?:Parameter|CHECK input) seats holds a malformed/u,
      )
      expect(calls, shown).toBe(0)
    }
    for (const slots of malformedBounds.map((range) => [span(1, 2), range]))
      expect(
        () => result({ slots }, 'short_slots'),
        JSON.stringify(slots, (_, v) => String(v)),
      ).toThrow(TypeError)
    for (const slots of [span(1, 2), [null], [span(1, 2), undefined], [{ kind: 'Value' }]])
      expect(
        () => result({ slots }, 'short_slots'),
        JSON.stringify(slots, (_, v) => String(v)),
      ).toThrow(TypeError)
  })
})
