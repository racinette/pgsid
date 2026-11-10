import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'
import { buildProject } from '../../src/project-runtime.js'
import { servePglite } from '../support/pglite-server.js'

const schema = `CREATE TABLE shapes (
  id integer PRIMARY KEY, spot point, edge line, piece lseg, frame box, route path, area polygon,
  ring circle, spots point[], document jsonb, price money, mask bit varying, host inet, net cidr,
  mac macaddr, ident uuid, markup xml, words tsvector, search tsquery
);
`
const columns =
  'id, spot, edge, piece, frame, route, area, ring, spots, document, price, mask, host, net, mac, ident, markup, words, search'
const queries = `-- name: InsertShape :exec
INSERT INTO shapes (${columns}) VALUES (@id, @spot, @edge, @piece, @frame, @route, @area, @ring, @spots, @document, @price, @mask, @host, @net, @mac, @ident, @markup, @words, @search);
-- name: GetShape :one
SELECT ${columns} FROM shapes WHERE id = @id;
`

const point = (x: number, y: number) => ({ x, y })
type Json = { text: string; value(): unknown }
let json: (value: unknown) => Json
let jsonText: (text: string) => Json
// Coordinates include values a decimal rendering could lose: signed zero, the smallest subnormal,
// NaN and infinities. Text types read back as the server's canonical text; a JSON value is a
// container of it, built once the generated support module is loaded.
const rows = () =>
  [
    {
      id: 1,
      spot: point(0.1, -0),
      edge: { a: 1, b: -1, c: 5e-324 },
      piece: { start: point(1, 2), end: point(Number.NaN, 4) },
      frame: { high: point(3, 4), low: point(1, 2) },
      route: { closed: false, points: [point(0, 0), point(1, 1), point(2.5, -1e300)] },
      area: { points: [point(0, 0), point(0, 1), point(1, 0)] },
      ring: { center: point(Number.POSITIVE_INFINITY, 1), radius: 2 },
      spots: [point(1, 2), null],
      document: json({ nested: [1, 'two', null, { deep: true }], text: 'quote " backslash \\' }),
      price: '$1,234.56',
      mask: '0101',
      host: '192.168.0.1/24',
      net: '10.0.0.0/8',
      mac: '08:00:2b:01:02:03',
      ident: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      markup: '<a href="x">text</a>',
      words: "'cat':1 'sat':2",
      search: "'cat' & 'sat'",
    },
    {
      id: 2,
      spot: null,
      edge: null,
      piece: null,
      frame: null,
      route: { closed: true, points: [point(1, 1)] },
      area: null,
      ring: null,
      spots: [],
      document: json('a JSON string'),
      price: '-$0.01',
      mask: '',
      host: '::1',
      net: null,
      mac: null,
      ident: null,
      markup: null,
      words: '',
      search: null,
    },
  ].flatMap((row) =>
    row.id === 2
      ? [
          row,
          // jsonb stores its own text: keys sorted, spacing its own, the last of a repeated key.
          { ...row, id: 3, document: jsonText(' {"b":1, "a" : [1,2], "b":"x"} ') },
          // A JSON null document is a container whose value is null, apart from SQL NULL.
          { ...row, id: 4, document: json(null) },
          { ...row, id: 5, document: null },
        ]
      : [row],
  )

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>
let client: pg.Client
let runtime: Record<string, (...args: unknown[]) => Promise<unknown>>
let helpers: {
  fromPg(client: unknown): unknown
  fromPglite(db: unknown): unknown
  json: typeof json
  jsonText: typeof jsonText
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-scalar-codecs-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/shapes.sql'), queries)
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
  runtime = {}
  for (const name of ['InsertShape', 'GetShape'])
    Object.assign(runtime, await import(join(root, `generated/runtime/shapes/${name}.ts`)))
  helpers = (await import(
    join(root, 'generated/runtime/shapes/pgsid/queryable.ts')
  )) as typeof helpers
  ;({ json, jsonText } = helpers)
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

describe('TypeScript scalar codecs', () => {
  it('types JSON as a container of a JSON value and compiles under strict settings', async () => {
    await writeFile(
      join(root, 'usage.ts'),
      `import { getShape } from './generated/runtime/shapes/GetShape.js'
import type { Shapes } from './generated/schema/public/tables.js'
import { json, jsonText, type PgsidJson, type PgsidJsonValue } from './generated/runtime/shapes/pgsid/queryable.js'
declare const db: Parameters<typeof getShape>[0]
export async function usage() {
  const row = await getShape(db, { id: 1 })
  const document: PgsidJson<PgsidJsonValue> | null | undefined = row?.document
  const text: string | undefined = row?.document?.text
  const value: string | number | boolean | null | undefined | object = row?.document?.value()
  const stored: Shapes['select']['document'] = json({ list: [1, 'two', null, { deep: true }] })
  const written: Shapes['select']['document'] = jsonText('{"list": [1]}')
  // @ts-expect-error a JSON value is a container, not a plain value
  const plain: Shapes['select']['document'] = { list: [1, 'two', null, { deep: true }] }
  // @ts-expect-error a function is not a JSON value
  const invalid: Shapes['select']['document'] = () => 0
  const spot: number | undefined = row?.spot?.x
  return [document, text, value, stored, written, plain, invalid, spot]
}
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

  it.each([
    ['PGlite', () => helpers.fromPglite(db)],
    ['node-postgres', () => helpers.fromPg(client)],
  ] as const)('round-trips geometry, JSON and text types through %s', async (_name, connect) => {
    const queryable = connect()
    const sent = rows()
    await db.exec('BEGIN')
    try {
      for (const row of sent) await runtime['insertShape']!(queryable, row)
      const texts: (string | null)[] = []
      for (const { document, ...row } of sent) {
        const { document: read, ...rest } = (await runtime['getShape']!(queryable, {
          id: row.id,
        })) as { document: Json | null }
        expect(rest).toEqual(row)
        // A JSON value reads back as the server's text, parsed to the value sent.
        const server = (
          await db.query<{ text: string | null }>(
            'SELECT document::text AS text FROM shapes WHERE id = $1',
            [row.id],
          )
        ).rows[0]!.text
        texts.push(server)
        expect(read && read.text).toBe(server)
        expect(read && read.value()).toEqual(document && document.value())
      }
      expect(texts.slice(2)).toEqual(['{"a": [1, 2], "b": "x"}', 'null', null])
    } finally {
      await db.exec('ROLLBACK')
    }
  })

  it('rejects malformed geometric parameters', async () => {
    const queryable = helpers.fromPglite(db)
    for (const [column, value] of [
      ['spot', '(1,2)'],
      ['spot', { x: 1n, y: 2 }],
      ['edge', { a: 1, b: 2 }],
      ['piece', { start: point(1, 2) }],
      ['route', { points: [point(1, 1)] }],
      ['area', { points: point(1, 1) }],
      ['ring', { center: point(1, 1), radius: '2' }],
      ['document', () => 0],
      // A JSON value is sent only as a container.
      ['document', { nested: [1] }],
      ['document', 'a JSON string'],
      ['document', { text: '{}' }],
    ] as const)
      await expect(
        runtime['insertShape']!(queryable, { ...rows()[1], id: 9, [column]: value }),
      ).rejects.toThrow(new RegExp(`Parameter ${column} holds a malformed`, 'u'))
  })
})
