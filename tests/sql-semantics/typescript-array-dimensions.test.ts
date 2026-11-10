import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'
import { serverCheckResults } from '../support/check-server-results.js'

const schema = `CREATE DOMAIN ints AS integer[];
CREATE TABLE grids (
  id integer PRIMARY KEY, plain integer[], matrix integer[], flexible integer[], nested ints[],
  spans int4multirange[], docs jsonb[],
  CONSTRAINT matrix_rows CHECK (array_length(matrix, 1) <= 3),
  CONSTRAINT flexible_size CHECK (cardinality(flexible) < 4),
  CONSTRAINT nested_count CHECK (cardinality(nested) <= 2),
  CONSTRAINT spans_count CHECK (cardinality(spans) <= 2)
);
`
const queries = `-- name: InsertGrid :exec
INSERT INTO grids (id, plain, matrix, flexible, nested, spans, docs)
VALUES (@id, @plain, @matrix, @flexible, @nested, @spans, @docs);
-- name: GetGrid :one
SELECT id, plain, matrix, flexible, nested, spans, docs FROM grids WHERE id = @id;
-- name: GetMixed :one
SELECT CASE WHEN @two::boolean THEN matrix ELSE plain END AS mixed FROM grids WHERE id = @id;
`

const span = (lower: number, upper: number) => ({
  empty: false,
  lower: { value: lower, inclusive: true },
  upper: { value: upper, inclusive: false },
})
type Json = { text: string; value(): unknown }
let json: (value: unknown) => Json
// Below its declared levels an array's element may itself be a list: a domain over an array or a
// multirange. A JSON element is a container, even of a JSON array. Nesting never adds a dimension.
const full = () => ({
  id: 1,
  plain: [1, null],
  matrix: [
    [1, 2],
    [3, null],
  ],
  flexible: { dimensions: 2, elements: [[1], [2]] },
  nested: [[1, 2], null],
  spans: [[span(1, 3), span(5, 7)], []],
  // A JSON null element is a container, apart from a NULL element.
  docs: [json([1, 2]), json({ a: [3] }), json('text'), json(null), null],
})
const empty = {
  id: 2,
  plain: [],
  matrix: [],
  flexible: { dimensions: 2, elements: [] },
  nested: [],
  spans: [],
  docs: [],
}

let root: string
let db: PGlite
let runtime: Record<string, (...args: unknown[]) => Promise<unknown>>
let queryable: unknown
let checks: { evaluatePublicGridsChecks(row: object): { constraint: string; result: unknown }[] }

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-array-dimensions-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/grids.sql'), queries)
  await writeFile(
    join(root, 'pgsid.yaml'),
    `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    typescript:
      mappings:
        column:
          public.grids.matrix: { dimensions: 2 }
          public.grids.flexible: { dimensions: [1, 2] }
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
  runtime = {}
  for (const name of ['InsertGrid', 'GetGrid', 'GetMixed'])
    Object.assign(runtime, await import(join(root, `generated/runtime/grids/${name}.ts`)))
  const helpers = (await import(join(root, 'generated/runtime/grids/pgsid/queryable.ts'))) as {
    fromPglite(db: unknown): unknown
    json: typeof json
  }
  json = helpers.json
  checks = (await import(join(root, 'generated/schema/public/checks.ts'))) as typeof checks
  db = new PGlite()
  await db.exec(schema)
  queryable = helpers.fromPglite(db)
}, 300_000)
afterAll(async () => {
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

describe('TypeScript array dimensions', () => {
  it('types one declared count as a list and several as a tagged union', async () => {
    await writeFile(
      join(root, 'usage.ts'),
      `import type { GetGridRow } from './generated/types/grids/GetGrid.js'
import type { GetMixedRow } from './generated/types/grids/GetMixed.js'
import type { PgsidJson, PgsidJsonValue } from './generated/runtime/grids/pgsid/queryable.js'
declare function expectType<T>(value: T): void
declare const row: GetGridRow
expectType<(number | null)[] | null>(row.plain)
expectType<(number | null)[][] | null>(row.matrix)
type Flexible =
  | { readonly dimensions: 1; readonly elements: (number | null)[] }
  | { readonly dimensions: 2; readonly elements: (number | null)[][] }
expectType<Flexible | null>(row.flexible)
expectType<Flexible | null>(({} as GetMixedRow).mixed)
expectType<(PgsidJson<PgsidJsonValue> | null)[] | null>(row.docs)
// @ts-expect-error A declared matrix is not a vector.
const vector: GetGridRow['matrix'] = [1, 2]
void vector
// @ts-expect-error A JSON element is a container, not a plain value.
const docs: GetGridRow['docs'] = [[1, 2]]
void docs
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
        join(root, 'usage.ts'),
      ],
      { cwd: process.cwd() },
    ).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 120_000)

  it('round-trips declared dimensions with list elements and empty arrays', async () => {
    const sent = full()
    await db.exec('BEGIN')
    try {
      for (const row of [sent, empty]) await runtime['insertGrid']!(queryable, row)
      const { docs, ...read } = (await runtime['getGrid']!(queryable, { id: 1 })) as {
        docs: (Json | null)[]
      }
      const { docs: _docs, ...expected } = sent
      expect(read).toEqual(expected)
      // JSON elements read back as the server's text of each element, parsed on demand.
      const texts = (
        await db.query<{ texts: (string | null)[] }>(
          `SELECT array(SELECT element::text FROM unnest(docs) WITH ORDINALITY AS u(element, n)
           ORDER BY n) AS texts FROM grids WHERE id = 1`,
        )
      ).rows[0]!.texts
      expect(texts).toEqual(['[1, 2]', '{"a": [3]}', '"text"', 'null', null])
      expect(docs.map((element) => element && element.text)).toEqual(texts)
      expect(docs.map((element) => element && element.value())).toEqual([
        [1, 2],
        { a: [3] },
        'text',
        null,
        null,
      ])
      expect(docs[3]).not.toBeNull()
      expect(docs[4]).toBeNull()
      // An empty array has no dimensions; a union reads it back as its lowest count.
      expect(await runtime['getGrid']!(queryable, { id: 2 })).toEqual({
        ...empty,
        flexible: { dimensions: 1, elements: [] },
      })
      expect(
        (await db.query<{ text: string }>('SELECT nested::text AS text FROM grids WHERE id = 1'))
          .rows[0]!.text,
      ).toBe('{"{1,2}",NULL}')
      expect(await runtime['getMixed']!(queryable, { id: 1, two: true })).toEqual({
        mixed: { dimensions: 2, elements: sent.matrix },
      })
      expect(await runtime['getMixed']!(queryable, { id: 1, two: false })).toEqual({
        mixed: { dimensions: 1, elements: sent.plain },
      })
    } finally {
      await db.exec('ROLLBACK')
    }
  })

  it('rejects values that do not have a declared dimension count', async () => {
    for (const [column, value] of [
      ['flexible', [1, 2]],
      ['flexible', { dimensions: 3, elements: [[[1]]] }],
      ['flexible', { dimensions: '1', elements: [1] }],
      ['matrix', [1, 2]],
      ['plain', [[1]]],
      // A JSON element is sent only as a container.
      ['docs', [[1, 2]]],
      ['docs', [{ a: 1 }]],
      ['docs', ['text']],
    ] as const)
      await expect(
        runtime['insertGrid']!(queryable, { ...empty, id: 9, [column]: value }),
      ).rejects.toThrow(new RegExp(`(?:Parameter|CHECK input) ${column} holds a malformed`, 'u'))
    for (const row of [{ flexible: [1, 2] }, { matrix: [1, 2] }])
      expect(() => checks.evaluatePublicGridsChecks(row)).toThrow(TypeError)
  })

  it('fails loudly naming the setting when the server returns other dimensions', async () => {
    await db.exec('BEGIN')
    try {
      await db.exec(`INSERT INTO grids (id, plain) VALUES (3, '{{1},{2}}')`)
      await expect(runtime['getGrid']!(queryable, { id: 3 })).rejects.toThrow(
        'The server returned an array of 2 dimensions where the default of one array dimension allows 1',
      )
      await db.exec(`UPDATE grids SET plain = NULL, matrix = '{1,2}' WHERE id = 3`)
      await expect(runtime['getGrid']!(queryable, { id: 3 })).rejects.toThrow(
        'sql.codegen.typescript.mappings.column["public.grids.matrix"].dimensions allows 2',
      )
    } finally {
      await db.exec('ROLLBACK')
    }
  })

  it('checks list elements and declared levels as the server does', async () => {
    const rows: {
      matrix?: number[][]
      flexible?: { dimensions: number; elements: unknown[] }
      nested?: number[][]
      spans?: ReturnType<typeof span>[][]
    }[] = [
      { matrix: [[1], [2], [3], [4]] },
      { matrix: [[1, 2], [3]] },
      {
        flexible: {
          dimensions: 2,
          elements: [
            [1, 2],
            [3, 4],
          ],
        },
      },
      { flexible: { dimensions: 1, elements: [1, 2, 3] } },
      { nested: [[1, 2], [3]] },
      { nested: [[1], [2], [3]] },
      { spans: [[span(1, 2)], [], []] },
      { spans: [[span(1, 2)], [span(3, 4), span(4, 6)]] },
    ]
    for (const row of rows) {
      const text = {
        matrix: row.matrix
          ? JSON.stringify(row.matrix).replaceAll('[', '{').replaceAll(']', '}')
          : null,
        flexible: row.flexible
          ? JSON.stringify(row.flexible.elements).replaceAll('[', '{').replaceAll(']', '}')
          : null,
        nested: row.nested
          ? `{${row.nested.map((item) => `"{${item.join(',')}}"`).join(',')}}`
          : null,
        spans: row.spans
          ? `{${row.spans
              .map(
                (ranges) =>
                  `"{${ranges.map((range) => `[${range.lower.value},${range.upper.value})`).join(',')}}"`,
              )
              .join(',')}}`
          : null,
      }
      const server = await serverCheckResults(db, 'grids', text)
      const local = Object.fromEntries(
        checks
          .evaluatePublicGridsChecks(row)
          .filter(({ constraint }) => constraint.startsWith(Object.keys(row)[0]!.slice(0, 4)))
          .map(({ constraint, result }) => [constraint, result]),
      )
      expect(Object.keys(local)).toHaveLength(1)
      expect(local).toEqual(
        Object.fromEntries(
          Object.keys(local).map((constraint) => [constraint, server[constraint]]),
        ),
      )
    }
  })
})
