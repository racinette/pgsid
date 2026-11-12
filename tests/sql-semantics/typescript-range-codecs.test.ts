import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'
import { buildProject } from '../../src/project-runtime.js'
import { servePglite } from '../support/pglite-server.js'

const schema = `CREATE TYPE textrange AS RANGE (subtype = text, collation = "C");
CREATE TYPE floatrange AS RANGE (subtype = float8);
CREATE DOMAIN shortspan AS int4range CHECK (upper(VALUE) - lower(VALUE) < 100);
CREATE TABLE spans (
  id integer PRIMARY KEY, small int4range, wide int8range, exact numrange, days daterange,
  local tsrange, instant tstzrange, words textrange, fractions floatrange, bounded shortspan,
  smalls int4multirange, instants tstzmultirange, wordsets textmultirange, list int4range[]
);
`
const columns =
  'id, small, wide, exact, days, local, instant, words, fractions, bounded, smalls, instants, wordsets, list'
const queries = `-- name: InsertSpan :exec
INSERT INTO spans (${columns}) VALUES (@id, @small, @wide, @exact, @days, @local, @instant, @words, @fractions, @bounded, @smalls, @instants, @wordsets, @list);
-- name: GetSpan :one
SELECT ${columns} FROM spans WHERE id = @id;
-- name: Canonical :one
SELECT int4range(1, 5, '[]') AS small, daterange('2026-01-01', '2026-01-31', '[]') AS days, '{[1,3),[2,6),[8,9)}'::int4multirange AS smalls;
`

// A null bound is unbounded and has no inclusivity; the flags apply only to present bounds.
const span = <T>(
  lower: T | null,
  upper: T | null,
  lowerInclusive = true,
  upperInclusive = false,
) => ({
  empty: false as const,
  lower: lower === null ? null : { value: lower, inclusive: lowerInclusive },
  upper: upper === null ? null : { value: upper, inclusive: upperInclusive },
})
const empty = { empty: true as const }
const tricky = 'a "quoted", \\ value (with) [brackets]'
let numeric: (value: string) => { toString(): string }
// Every value is already in the canonical form the server stores, so it reads back unchanged.
// Numerics are numeric values, built once the generated numeric module is loaded.
const rows = () => [
  {
    id: 1,
    small: span(1, 10),
    wide: span(-9223372036854775808n, null, true, false),
    exact: span(numeric('1.5'), numeric('2.50'), true, true),
    days: span('2026-01-01', '2026-02-01'),
    local: span({ infinity: -1 }, { localMicroseconds: 1n }, false, true),
    instant: span(null, { epochMicroseconds: 0n }, false, false),
    words: span('', tricky, true, true),
    fractions: span(-0.5, Number.POSITIVE_INFINITY, false, false),
    bounded: span(5, 50),
    smalls: [span(1, 3), span(5, 8)],
    instants: [span({ infinity: -1 }, { epochMicroseconds: 0n }, false, false)],
    wordsets: [span('', 'b', true, false), span(`z ${tricky}`, null, false, false)],
    list: [span(1, 2), null, empty],
  },
  {
    id: 2,
    small: empty,
    wide: empty,
    exact: span(null, null, false, false),
    days: empty,
    local: empty,
    instant: span({ epochMicroseconds: -1n }, { infinity: 1 }, true, false),
    words: span(null, 'NULL', false, false),
    fractions: empty,
    bounded: null,
    smalls: [],
    instants: [],
    wordsets: [],
    list: [],
  },
  {
    id: 3,
    small: null,
    wide: null,
    exact: null,
    days: null,
    local: null,
    instant: null,
    words: null,
    fractions: null,
    bounded: null,
    smalls: null,
    instants: null,
    wordsets: null,
    list: null,
  },
]
// A numeric has no fields of its own to compare, so a numeric range is compared by its bounds' text.
const comparable = (row: unknown) => {
  const { exact } = row as { exact: ReturnType<typeof span<unknown>> | typeof empty | null }
  if (!exact || exact.empty) return row
  const text = (bound: { value: unknown; inclusive: boolean } | null) =>
    bound && { ...bound, value: String(bound.value) }
  return { ...(row as object), exact: { ...exact, lower: text(exact.lower), upper: text(exact.upper) } }
}

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>
let client: pg.Client
let runtime: Record<string, (...args: unknown[]) => Promise<unknown>>
let helpers: { fromPg(client: unknown): unknown; fromPglite(db: unknown): unknown }

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-range-codecs-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/spans.sql'), queries)
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
  for (const name of ['InsertSpan', 'GetSpan', 'Canonical'])
    Object.assign(runtime, await import(join(root, `generated/runtime/spans/${name}.ts`)))
  helpers = (await import(
    join(root, 'generated/runtime/spans/pgsid/queryable.ts')
  )) as typeof helpers
  ;({ numeric } = (await import(join(root, 'generated/runtime/spans/pgsid/numeric.ts'))) as {
    numeric: typeof numeric
  })
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

describe('TypeScript range codecs', () => {
  it('compiles the generated range runtime under strict settings', async () => {
    await writeFile(
      join(root, 'usage.ts'),
      `import type { GetSpanRow } from './generated/types/spans/GetSpan.js'
declare function expectType<T>(value: T): void
declare const row: GetSpanRow
type Bound<T> = { readonly value: T; readonly inclusive: boolean } | null
type Range<T> =
  | { readonly empty: true }
  | { readonly empty: false; readonly lower: Bound<T>; readonly upper: Bound<T> }
expectType<Range<number> | null>(row.small)
expectType<Range<bigint> | null>(row.wide)
expectType<Range<number>[] | null>(row.smalls)
expectType<(Range<number> | null)[] | null>(row.list)
const small: GetSpanRow['small'] = {} as Range<number> | null
const open: GetSpanRow['small'] = { empty: false, lower: null, upper: { value: 2, inclusive: false } }
// @ts-expect-error An unbounded side has no inclusivity.
const inclusive: GetSpanRow['small'] = { empty: false, lower: { value: null, inclusive: true }, upper: null }
// @ts-expect-error A present bound states its inclusivity.
const bare: GetSpanRow['small'] = { empty: false, lower: { value: 1 }, upper: null }
// @ts-expect-error The former flat shape is not a range.
const flat: GetSpanRow['small'] = { empty: false, lower: 1, upper: 2, lowerInclusive: true, upperInclusive: false }
void [small, open, inclusive, bare, flat]
`,
    )
    await promisify(execFile)(
      process.execPath,
      [
        'node_modules/typescript/bin/tsc',
        '--strict',
        '--noEmit',
        '--skipLibCheck',
        '--target',
        'es2022',
        '--module',
        'nodenext',
        '--moduleResolution',
        'nodenext',
        ...['InsertSpan', 'GetSpan', 'Canonical'].map((name) =>
          join(root, `generated/runtime/spans/${name}.ts`),
        ),
        join(root, 'usage.ts'),
      ],
      { cwd: process.cwd() },
    ).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 120_000)

  it.each([
    ['PGlite', () => helpers.fromPglite(db)],
    ['node-postgres', () => helpers.fromPg(client)],
  ] as const)(
    'round-trips ranges, multiranges and range arrays through %s',
    async (_name, connect) => {
      const queryable = connect()
      await db.exec('BEGIN')
      try {
        for (const row of rows()) await runtime['insertSpan']!(queryable, row)
        for (const row of rows())
          expect(comparable(await runtime['getSpan']!(queryable, { id: row.id }))).toEqual(
            comparable(row),
          )
        expect(
          (await db.query<{ words: string }>('SELECT words::text AS words FROM spans WHERE id = 2'))
            .rows[0]!.words,
        ).toBe('(,NULL)')
      } finally {
        await db.exec('ROLLBACK')
      }
    },
  )

  it('reads the server canonical form of discrete ranges and multiranges', async () => {
    expect(await runtime['canonical']!(helpers.fromPglite(db))).toEqual({
      small: span(1, 6),
      days: span('2026-01-01', '2026-02-01'),
      smalls: [span(1, 6), span(8, 9)],
    })
  })

  it('rejects malformed range parameters', async () => {
    const queryable = helpers.fromPglite(db)
    for (const [column, value] of [
      ['small', '[1,2)'],
      ['small', { empty: false, lower: 1, upper: 2 }],
      ['small', { lower: 1, upper: 2, lowerInclusive: true, upperInclusive: false }],
      // The former flat shape, and bounds that are not a present value with its inclusivity.
      ['small', { empty: false, lower: 1, upper: 2, lowerInclusive: true, upperInclusive: false }],
      [
        'small',
        { empty: false, lower: null, upper: 2, lowerInclusive: false, upperInclusive: false },
      ],
      ['small', { lower: { value: 1, inclusive: true }, upper: { value: 2, inclusive: false } }],
      ['small', { empty: false, lower: { value: 1, inclusive: true } }],
      ['small', { empty: false, lower: { value: null, inclusive: true }, upper: null }],
      ['small', { empty: false, lower: null, upper: { inclusive: false } }],
      ['small', { empty: false, lower: { value: 1 }, upper: null }],
      ['small', { empty: false, lower: { value: 1, inclusive: 'true' }, upper: null }],
      ['smalls', [span(1, 2), { empty: false, lower: { value: 3, inclusive: true }, upper: 4 }]],
      ['list', [span(1, 2), { empty: false, lower: 1, upper: null }]],
      ['small', span(1.5, 2)],
      ['wide', span(1, 2)],
      ['smalls', span(1, 2)],
      ['smalls', [null]],
      // A numeric bound is a numeric value, not its text.
      ['exact', span('1.5', '2.50')],
    ] as const)
      await expect(
        runtime['insertSpan']!(queryable, { ...rows()[2], id: 9, [column]: value }),
      ).rejects.toThrow(new RegExp(`Parameter ${column} holds a malformed`, 'u'))
  })
})
