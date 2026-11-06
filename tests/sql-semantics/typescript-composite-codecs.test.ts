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

const schema = `CREATE TYPE address AS (street text, number integer, tags text[]);
CREATE TYPE person AS (name text, home address, balance numeric, seen timestamptz, stay int4range);
CREATE DOMAIN numbered AS address CHECK ((VALUE).number > 0);
CREATE TABLE people (id integer PRIMARY KEY, who person, everyone person[], mail numbered);
`
const queries = `-- name: InsertPerson :exec
INSERT INTO people (id, who, everyone, mail) VALUES (@id, @who, @everyone, @mail);
-- name: GetPerson :one
SELECT id, who, everyone, mail FROM people WHERE id = @id;
-- name: GetRow :one
SELECT p FROM people p WHERE id = @id;
`

const tricky = 'quote " comma , paren ( ) backslash \\ brace {'
const address = (street: string | null, number: number | null, tags: (string | null)[] | null) => ({
  street,
  number,
  tags,
})
const rows = [
  {
    id: 1,
    who: {
      name: tricky,
      home: address('', 7, [tricky, null, 'NULL', '']),
      balance: '-12.50',
      seen: { epochMicroseconds: 1n },
      stay: { empty: false, lower: 1, upper: 5, lowerInclusive: true, upperInclusive: false },
    },
    everyone: [
      { name: 'NULL', home: null, balance: null, seen: { infinity: 1 }, stay: { empty: true } },
      null,
      { name: null, home: address(null, null, null), balance: 'NaN', seen: null, stay: null },
    ],
    mail: address('Main', 1, []),
  },
  { id: 2, who: null, everyone: [], mail: null },
  {
    id: 3,
    who: { name: '', home: address(' padded ', -1, ['']), balance: '0', seen: null, stay: null },
    everyone: null,
    mail: address('(x,y)', 2147483647, null),
  },
]

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>
let client: pg.Client
let runtime: Record<string, (...args: unknown[]) => Promise<unknown>>
let helpers: { fromPg(client: unknown): unknown; fromPglite(db: unknown): unknown }

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-composite-codecs-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/people.sql'), queries)
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
  for (const name of ['InsertPerson', 'GetPerson', 'GetRow'])
    Object.assign(runtime, await import(join(root, `generated/runtime/people/${name}.ts`)))
  helpers = (await import(
    join(root, 'generated/runtime/people/pgsid/queryable.ts')
  )) as typeof helpers
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

describe('TypeScript composite codecs', () => {
  it('compiles the generated composite runtime under strict settings', async () => {
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
        ...['InsertPerson', 'GetPerson', 'GetRow'].map((name) =>
          join(root, `generated/runtime/people/${name}.ts`),
        ),
      ],
      { cwd: process.cwd() },
    ).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 120_000)

  it.each([
    ['PGlite', () => helpers.fromPglite(db)],
    ['node-postgres', () => helpers.fromPg(client)],
  ] as const)('round-trips nested composites and row types through %s', async (_name, connect) => {
    const queryable = connect()
    await db.exec('BEGIN')
    try {
      for (const row of rows) await runtime['insertPerson']!(queryable, row)
      for (const row of rows) {
        expect(await runtime['getPerson']!(queryable, { id: row.id })).toEqual(row)
        expect(await runtime['getRow']!(queryable, { id: row.id })).toEqual({ p: row })
      }
    } finally {
      await db.exec('ROLLBACK')
    }
  })

  it('leaves a composite domain CHECK to the database', async () => {
    await expect(
      runtime['insertPerson']!(helpers.fromPglite(db), {
        id: 4,
        who: null,
        everyone: null,
        mail: address('Main', 0, null),
      }),
    ).rejects.toMatchObject({ code: '23514' })
  })

  it('rejects malformed composite parameters', async () => {
    const queryable = helpers.fromPglite(db)
    for (const [column, value] of [
      ['who', '(a,b)'],
      ['who', [1]],
      ['mail', address('Main', 1.5, null)],
      ['everyone', { name: 'x' }],
    ] as const)
      await expect(
        runtime['insertPerson']!(queryable, { ...rows[1], id: 9, [column]: value }),
      ).rejects.toThrow(new RegExp(`Parameter ${column} holds a malformed`, 'u'))
  })
})
