import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

// Elements and fields whose public value is the server's text (a JSON value as its container's
// text, exactly as written) go through their type's input inside arrays, records and ranges, as array and record input read
// each element, so malformed text fails with the server's error.
const schema = `CREATE TYPE note_meta AS (doc tsvector, cash money, info jsonb);
CREATE TYPE lsn_span AS RANGE (subtype = pg_lsn);
CREATE TABLE notes (
  id integer PRIMARY KEY,
  docs tsvector[] CONSTRAINT short_docs CHECK (length(docs[1]) < 3),
  queries tsquery[] CONSTRAINT small_queries CHECK (numnode(queries[1]) < 4),
  grants aclitem[] CONSTRAINT one_grant CHECK (cardinality(grants) <= 1),
  cashes money[] CONSTRAINT positive_cashes CHECK (cashes[1] > '0'::money),
  infos jsonb[] CONSTRAINT has_a CHECK (infos[1] ? 'a'),
  raws json[] CONSTRAINT object_raws CHECK (json_typeof(raws[1]) = 'object'),
  places tid[] CONSTRAINT not_origin CHECK (places[1] <> '(0,0)'),
  lsns pg_lsn[] CONSTRAINT past_start CHECK (lsns[1] > '0/10'),
  marks xml[] CONSTRAINT document_marks CHECK (marks[1] IS DOCUMENT),
  snaps pg_snapshot[] CONSTRAINT late_snapshots CHECK (pg_snapshot_xmin(snaps[1]) > '1'::xid8),
  meta note_meta CONSTRAINT short_meta CHECK (length((meta).doc) < 3 AND (meta).cash > '0'::money),
  metas note_meta[] CONSTRAINT metas_a CHECK ((metas[1]).info ? 'a'),
  span lsn_span CONSTRAINT early_span CHECK (upper(span) <= '1/0'),
  paths jsonpath[] CONSTRAINT few_paths CHECK (cardinality(paths) < 3)
);
`
const columns = [
  'docs',
  'queries',
  'grants',
  'cashes',
  'infos',
  'raws',
  'places',
  'lsns',
  'marks',
  'snaps',
  'meta',
  'metas',
  'span',
  'paths',
] as const
const queries = `-- name: InsertNote :exec
INSERT INTO notes (id, ${columns.join(', ')}) VALUES (@id, ${columns.map((column) => `@${column}`).join(', ')});
`
const span = (lower: unknown, upper: unknown, lowerInclusive = true, upperInclusive = false) => ({
  empty: false,
  lower: lower === null ? null : { value: lower, inclusive: lowerInclusive },
  upper: upper === null ? null : { value: upper, inclusive: upperInclusive },
})
type Json = { text: string }
// Each case sets one column; the others stay NULL, so only that column's CHECK can decide. JSON
// elements and fields are containers, built once the generated support module is loaded.
const cases = (
  json: (value: unknown) => Json,
  jsonText: (text: string) => Json,
): Partial<Record<(typeof columns)[number], unknown>>[] => [
  { docs: ['a b', 'c'] },
  { docs: ['a b c'] },
  { docs: ["'a':1 'b':2A", null] },
  { docs: ["'a"] },
  { queries: ['a & b'] },
  { queries: ['a & (b | c)'] },
  { queries: ['a &'] },
  { grants: ['postgres=r/postgres'] },
  { grants: ['postgres=r/postgres', '=w/postgres'] },
  { grants: ['postgres=?/postgres'] },
  { cashes: ['1.50'] },
  { cashes: ['-1', '2'] },
  { cashes: ['abc'] },
  { infos: [json({ a: 1 })] },
  { infos: [json({ b: 1 }), json({ a: 1 })] },
  { infos: [json('a')] },
  // A JSON null element is a value, unlike a NULL element, and has no key.
  { infos: [json(null)] },
  { infos: [null, json({ a: 1 })] },
  { infos: [jsonText(' {"b": 1,\n "a": 2} ')] },
  { infos: [jsonText('{"a": ')] },
  { raws: [json({ a: [1, 2] })] },
  { raws: [json(3.5)] },
  { raws: [json(null)] },
  { raws: [jsonText('\t{"a": 1, "a": 2}  ')] },
  { raws: [jsonText('{"a" 1}')] },
  { places: ['(1,2)'] },
  { places: ['(0,0)'] },
  { places: ['(1,'] },
  { lsns: ['16/B374D848'] },
  { lsns: ['0/10'] },
  { lsns: ['x/1'] },
  { marks: ['<a>1</a>'] },
  { marks: ['text <b/>'] },
  { marks: ['<a>'] },
  { snaps: ['5:9:6,7'] },
  { snaps: ['1:1:'] },
  { snaps: ['9:5:'] },
  { meta: { doc: 'a b', cash: '1' } },
  { meta: { doc: 'a b c', cash: '1' } },
  { meta: { doc: 'a', cash: '-1' } },
  { meta: { doc: "'a", cash: '1' } },
  { metas: [{ info: json({ a: 1 }) }] },
  { metas: [{ info: json({ b: 1 }) }] },
  { metas: [{ info: jsonText(' { "a" : null } ') }] },
  { meta: { doc: 'a', cash: '1', info: jsonText('[1,  2]') } },
  { metas: [{ cash: 'abc' }] },
  { span: span('0/10', '0/20') },
  { span: span('0/10', '2/0') },
  { span: span('0/20', '0/10') },
  { span: span('0/10', 'x') },
  { paths: ['$'] },
  { paths: [''] },
  { paths: ['$', '$', '$'] },
  // The project declares no collation, which like_regex patterns depend on.
  { paths: ['$.a ? (@ like_regex "(")'] },
  { paths: ['strict $.a ? (@ like_regex "^b" flag "i")', null] },
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
  root = await mkdtemp(join(tmpdir(), 'pgsid-container-text-checks-'))
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

describe('CHECKs on text-valued elements in public containers', () => {
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
      const shown = JSON.stringify(change)
      expect({ shown, local }).toEqual({ shown, local: server })
      if (calls === 0) decided++
      else expect({ shown, calls }).toEqual({ shown, calls: 1 })
    }
    // CHECK violations and malformed element text are decided before the server; money and XML
    // input read session settings the project does not declare, and ACL input reads roles. A
    // record with a money field is undecided as a whole, since the server reads every field.
    expect(decided).toBeGreaterThanOrEqual(19)
  })

  it('sends JSON elements and fields only as containers', async () => {
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
      { infos: [{ a: 1 }] },
      { infos: [support.json({ a: 1 }), 'a'] },
      { raws: [[1, 2]] },
      { raws: [{ text: '{}' }] },
      { meta: { doc: 'a', cash: '1', info: { a: 1 } } },
      { metas: [{ info: '{"a": 1}' }] },
    ])
      await expect(
        insertNote(counted, { id: 1, ...empty, ...change }),
        JSON.stringify(change),
      ).rejects.toThrow(TypeError)
    expect(calls).toBe(0)
  })

  it('takes only public element text in the schema-level CHECK API', () => {
    const result = (row: object, constraint: string) =>
      checks.evaluatePublicNotesChecks(row).find((check) => check.constraint === constraint)!.result
    expect(result({ docs: ['a b c'] }, 'short_docs')).toEqual({ certain: true, value: false })
    expect(result({ docs: ["'a"] }, 'short_docs')).toMatchObject({ certain: true, error: '42601' })
    expect(result({ metas: [{ info: support.json({ a: 1 }) }] }, 'metas_a')).toEqual({
      certain: true,
      value: true,
    })
    expect(result({ infos: [support.json(null)] }, 'has_a')).toEqual({
      certain: true,
      value: false,
    })
    expect(result({ infos: [support.jsonText(' {"a": 1} ')] }, 'has_a')).toEqual({
      certain: true,
      value: true,
    })
    expect(result({ raws: [support.jsonText(' [ ] ')] }, 'object_raws')).toEqual({
      certain: true,
      value: false,
    })
    // The server rejects an empty JSON path before the check is reached.
    expect(result({ paths: [''] }, 'few_paths')).toMatchObject({ certain: true, error: '22P02' })
    for (const [row, constraint] of [
      [{ docs: [1] }, 'short_docs'],
      [{ docs: [{ kind: 'Value', value: { lexemes: [] } }] }, 'short_docs'],
      [{ cashes: [150n] }, 'positive_cashes'],
      [{ infos: [{ a: 1n }] }, 'has_a'],
      // A JSON element or field is a container, so a plain value or a look-alike is malformed.
      [{ infos: [{ a: 1 }] }, 'has_a'],
      [{ raws: [{ text: '{}' }] }, 'object_raws'],
      [{ metas: [{ info: { a: 1 } }] }, 'metas_a'],
      [{ meta: { doc: ['a'] } }, 'short_meta'],
    ] as const)
      expect(
        () => result(row, constraint),
        JSON.stringify(row, (_, v: unknown) => String(v)),
      ).toThrow(TypeError)
  })
})
