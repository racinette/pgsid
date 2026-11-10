import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

// Types whose public TypeScript value is the server's text (JSON values as their container's text,
// exactly as written), and the numeric identifiers and "char", whose CHECK inputs read the value
// as the server's input function reads the parameter text.
const schema = `CREATE DOMAIN short_doc AS tsvector CHECK (length(VALUE) < 3);
CREATE DOMAIN limited_positions AS int2vector CHECK (VALUE IS NOT NULL);
CREATE TABLE notes (
  id integer PRIMARY KEY,
  body tsvector CONSTRAINT few_lexemes CHECK (length(body) < 3),
  query tsquery CONSTRAINT small_query CHECK (numnode(query) < 4),
  cash money CONSTRAINT positive_cash CHECK (cash > '0'::money),
  place tid CONSTRAINT not_origin CHECK (place <> '(0,0)'),
  lsn pg_lsn CONSTRAINT past_start CHECK (lsn > '0/10'),
  doc jsonb CONSTRAINT has_a CHECK (doc ? 'a'),
  raw json CONSTRAINT object_raw CHECK (json_typeof(raw) = 'object'),
  spaced json CONSTRAINT short_spaced CHECK (length(spaced::text) < 10),
  markup xml CONSTRAINT document_markup CHECK (markup IS DOCUMENT),
  path jsonpath CONSTRAINT not_root CHECK (path::text <> '$'),
  ident oid CONSTRAINT large_oid CHECK (ident > 10),
  tx xid CONSTRAINT not_three CHECK (tx <> '3'::xid),
  tx8 xid8 CONSTRAINT past_five CHECK (tx8 > '5'::xid8),
  flag "char" CONSTRAINT not_a CHECK (flag <> 'a'),
  snap pg_snapshot CONSTRAINT late_snapshot CHECK (pg_snapshot_xmin(snap) > '1'::xid8),
  short short_doc,
  positions int2vector CONSTRAINT two_positions CHECK (cardinality(positions::limited_positions) = 2)
);
`
const columns = [
  'body',
  'query',
  'cash',
  'place',
  'lsn',
  'doc',
  'raw',
  'spaced',
  'markup',
  'path',
  'ident',
  'tx',
  'tx8',
  'flag',
  'snap',
  'short',
  'positions',
] as const
const queries = `-- name: InsertNote :exec
INSERT INTO notes (id, ${columns.join(', ')}) VALUES (@id, ${columns.map((column) => `@${column}`).join(', ')});
`
type Json = { text: string }
// Each case sets one column; the others stay NULL, so only that column's CHECK can decide. JSON
// values are containers, built once the generated support module is loaded.
const cases = (
  json: (value: unknown) => Json,
  jsonText: (text: string) => Json,
): Partial<Record<(typeof columns)[number], unknown>>[] => [
  { body: 'a b' },
  { body: 'a b c' },
  { body: "'a':1 'b':2A" },
  { query: 'a & b' },
  { query: 'a & (b | c)' },
  { query: 'a &' },
  { cash: '1.50' },
  { cash: '-1' },
  { cash: 'abc' },
  { place: '(0,0)' },
  { place: '(1,2)' },
  { place: '(1,' },
  { lsn: '0/10' },
  { lsn: '16/B374D848' },
  { lsn: 'x/1' },
  { doc: json({ a: 1 }) },
  { doc: json({ b: [1, 'two', null] }) },
  { doc: json(['a']) },
  { doc: json('a') },
  // A JSON null document is a value, unlike SQL NULL, and has no key.
  { doc: json(null) },
  { doc: jsonText(' {"b": 1,\n "a": 2} ') },
  { doc: jsonText('{"a": 1, "a": 2}') },
  { doc: jsonText('{"a": ') },
  { raw: json({ a: 1, a2: { b: true } }) },
  { raw: json([1, 2]) },
  { raw: json(3.5) },
  { raw: json(null) },
  { raw: jsonText('\t{"a": [1, 2]}  ') },
  { raw: jsonText('{"a" 1}') },
  // The CHECK reads json text as written: the same value is short serialized, long spaced.
  { spaced: json([1, 2, 3]) },
  { spaced: jsonText('[ 1, 2, 3 ]') },
  { spaced: jsonText('"\\u00e9"') },
  { spaced: jsonText('"\\u00e9\\u00e9"') },
  { markup: '<a>1</a>' },
  { markup: 'text <b/>' },
  { markup: '<a>' },
  { path: '$' },
  { path: '$.a[*] ? (@ > 1)' },
  { path: '$.' },
  { ident: 10 },
  { ident: 11 },
  { ident: 4294967295 },
  { tx: 3 },
  { tx: 4 },
  { tx8: 5n },
  { tx8: 18446744073709551615n },
  { flag: 'a' },
  { flag: 'b' },
  { flag: '\\141' },
  { flag: '\\142' },
  { flag: '' },
  { snap: '1:1:' },
  { snap: '5:9:6,7' },
  { snap: '9:5:' },
  { short: 'a b' },
  { short: 'a b c' },
  { positions: '1 2' },
  { positions: '1 2 3' },
  { positions: '1 x' },
]

let root: string
let db: PGlite
let insertNote: (db: unknown, params: unknown) => Promise<unknown>
let support: {
  fromPglite(db: PGlite): {
    queryText(sql: string, values: readonly (string | null)[]): Promise<unknown>
  }
  json(value: unknown): Json
  jsonText(text: string): Json
}
let checks: {
  evaluatePublicNotesChecks(row: object): { constraint: string; result: unknown }[]
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-text-checks-'))
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
  support = (await import(
    join(root, 'generated/runtime/notes/pgsid/queryable.ts')
  )) as typeof support
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

describe('CHECKs on public TypeScript text, JSON and identifier values', () => {
  it('decides each CHECK locally exactly as PostgreSQL does', async () => {
    const text = support.fromPglite(db)
    const empty = Object.fromEntries(columns.map((column) => [column, null]))
    let decided = 0
    for (const [index, change] of cases(support.json, support.jsonText).entries()) {
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
      // A container shows as its text.
      const shown = JSON.stringify(change, (_, v: unknown) => (typeof v === 'bigint' ? `${v}n` : v))
      expect({ shown, local }).toEqual({ shown, local: server })
      if (calls === 0) decided++
      else expect({ shown, calls }).toEqual({ shown, calls: 1 })
    }
    // The CHECK violations above are decided before the server.
    expect(decided).toBeGreaterThanOrEqual(12)
  })

  it('sends JSON only as containers', async () => {
    const text = support.fromPglite(db)
    const empty = Object.fromEntries(columns.map((column) => [column, null]))
    let calls = 0
    const counted = {
      queryText: (sql: string, values: readonly (string | null)[]) => {
        calls++
        return text.queryText(sql, values)
      },
    }
    for (const change of [
      { doc: { a: 1 } },
      { doc: 'a' },
      { raw: [1, 2] },
      { raw: '{"a": 1}' },
      { spaced: 1 },
      { doc: { text: '{"a": 1}' } },
    ])
      await expect(
        insertNote(counted, { id: 1, ...empty, ...change }),
        JSON.stringify(change),
      ).rejects.toThrow(TypeError)
    expect(calls).toBe(0)
  })

  it('takes only public values in the schema-level CHECK API', () => {
    const result = (row: object, constraint: string) =>
      checks.evaluatePublicNotesChecks(row).find((check) => check.constraint === constraint)!.result
    expect(result({ body: 'a b c' }, 'few_lexemes')).toEqual({ certain: true, value: false })
    expect(result({ doc: support.json({ a: 1 }) }, 'has_a')).toEqual({ certain: true, value: true })
    expect(result({ doc: support.json(null) }, 'has_a')).toEqual({ certain: true, value: false })
    expect(result({ doc: null }, 'has_a')).toEqual({ certain: true, value: null })
    expect(result({ spaced: support.json([1, 2, 3]) }, 'short_spaced')).toEqual({
      certain: true,
      value: true,
    })
    expect(result({ spaced: support.jsonText('[ 1, 2, 3 ]') }, 'short_spaced')).toEqual({
      certain: true,
      value: false,
    })
    expect(result({ flag: '\\141' }, 'not_a')).toEqual({ certain: true, value: false })
    expect(result({}, 'few_lexemes')).toMatchObject({ certain: false })
    for (const [row, constraint] of [
      [{ body: { kind: 'Value', value: { lexemes: [], nativeBytes: 0 } } }, 'few_lexemes'],
      [{ body: { kind: 'Unknown' } }, 'few_lexemes'],
      [{ cash: 150n }, 'positive_cash'],
      [{ ident: 1n }, 'large_oid'],
      [{ ident: -1 }, 'large_oid'],
      [{ tx8: 5 }, 'past_five'],
      [{ flag: 97 }, 'not_a'],
      [{ doc: { a: 1n } }, 'has_a'],
      // A JSON value is a container, so a plain value or a look-alike object is malformed.
      [{ doc: { a: 1 } }, 'has_a'],
      [{ doc: 'a' }, 'has_a'],
      [{ raw: { text: '{}' } }, 'object_raw'],
      [{ spaced: [1, 2, 3] }, 'short_spaced'],
    ] as const)
      expect(
        () => result(row, constraint),
        JSON.stringify(row, (_, v) => String(v)),
      ).toThrow(TypeError)
  })
})
