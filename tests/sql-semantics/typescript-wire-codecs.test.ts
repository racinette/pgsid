import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'
import { buildProject } from '../../src/project-runtime.js'
import { servePglite } from '../support/pglite-server.js'

const run = promisify(execFile)
const schema = `CREATE TYPE mood AS ENUM ('calm', 'loud');
CREATE DOMAIN positive AS integer CHECK (VALUE > 0);
CREATE TABLE wire (
  id integer PRIMARY KEY,
  flag boolean, small smallint, regular integer, wide bigint, single real, double double precision,
  exact numeric, label text, bytes bytea, document json, binary_document jsonb, seats int8range,
  counts integer[], labels text[], grid integer[], boxes box[], feeling mood, amount positive, ident oid
);
`
const columns =
  'id, flag, small, regular, wide, single, double, exact, label, bytes, document, binary_document, seats, counts, labels, grid, boxes, feeling, amount, ident'
const queries = `-- name: InsertWire :exec
INSERT INTO wire (${columns}) VALUES (@id, @flag, @small, @regular, @wide, @single, @double, @exact, @label, @bytes, @document, @binary_document, @seats, @counts, @labels, @grid, @boxes, @feeling, @amount, @ident);
-- name: GetWire :one
SELECT ${columns} FROM wire WHERE id = @id;
-- name: ListWire :many
SELECT id, wide FROM wire ORDER BY id;
-- name: CountWire :execrows
UPDATE wire SET flag = NOT flag WHERE id >= @id;
`

const tricky = 'quote " backslash \\ comma , brace { } NULL ü 𝄞'
const values = [
  {
    id: 1,
    flag: true,
    small: -32768,
    regular: 2147483647,
    wide: 9223372036854775807n,
    single: 0.1,
    double: 0.1,
    exact: '-12345678901234567890.000000000000000001',
    label: tricky,
    bytes: Uint8Array.from([0, 1, 92, 127, 128, 255]),
    document: { text: tricky, list: [1, null, true], nested: { empty: {} } },
    binary_document: [{ a: 1 }, 'two', 3.5],
    seats: { empty: false, lower: -5n, upper: null, lowerInclusive: true, upperInclusive: false },
    counts: [1, null, 3],
    labels: [tricky, 'NULL', '', null, ' padded '],
    grid: [
      [1, 2],
      [3, 4],
    ],
    boxes: [
      { high: { x: 1, y: 1 }, low: { x: 0, y: 0 } },
      { high: { x: 3, y: 4 }, low: { x: 2, y: 2 } },
    ],
    feeling: 'loud',
    amount: 5,
    ident: 4294967295,
  },
  {
    id: 2,
    flag: false,
    small: null,
    regular: null,
    wide: -9223372036854775808n,
    single: Number.POSITIVE_INFINITY,
    double: -0,
    exact: 'NaN',
    label: '',
    bytes: new Uint8Array(),
    document: 'a JSON string',
    binary_document: null,
    seats: { empty: true },
    counts: [],
    labels: null,
    grid: null,
    boxes: [],
    feeling: null,
    amount: null,
    ident: 0,
  },
  {
    id: 3,
    flag: null,
    small: 0,
    regular: -1,
    wide: 0n,
    single: Number.NaN,
    double: 5e-324,
    exact: 'Infinity',
    label: null,
    bytes: null,
    document: null,
    binary_document: { deep: [[[]]] },
    seats: null,
    counts: null,
    labels: [],
    grid: [[null]],
    boxes: null,
    feeling: 'calm',
    amount: 1,
    ident: null,
  },
]
// The server normalizes values it stores: a real keeps float4 precision.
const stored = (value: (typeof values)[number]) => ({
  ...value,
  single: value.single === 0.1 ? Math.fround(0.1) : value.single,
})

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>
let client: pg.Client
let runtime: Record<string, (...args: unknown[]) => Promise<unknown>>
let helpers: { fromPg(client: unknown): unknown; fromPglite(db: unknown): unknown }

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-wire-codecs-'))
  await mkdir(join(root, 'queries'))
  await symlink(join(process.cwd(), 'node_modules'), join(root, 'node_modules'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/wire.sql'), queries)
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
          public.wire.grid: { dimensions: 2 }
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
  for (const name of ['InsertWire', 'GetWire', 'ListWire', 'CountWire'])
    Object.assign(
      runtime ?? (runtime = {}),
      await import(join(root, `generated/runtime/wire/${name}.ts`)),
    )
  helpers = (await import(
    join(root, 'generated/runtime/wire/pgsid/queryable.ts')
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

const drivers = () =>
  [
    ['PGlite', () => helpers.fromPglite(db)],
    ['node-postgres', () => helpers.fromPg(client)],
  ] as const

describe('TypeScript wire codecs', () => {
  it('compiles the generated runtime against both drivers under strict settings', async () => {
    await writeFile(
      join(root, 'usage.ts'),
      `import pg from 'pg'
import { PGlite } from '@electric-sql/pglite'
import { fromPg, fromPglite } from './generated/runtime/wire/pgsid/queryable.js'
import { getWire } from './generated/runtime/wire/GetWire.js'
export async function usage(pool: pg.Pool, client: pg.PoolClient, db: PGlite) {
  const row = await getWire(fromPg(pool), { id: 1 })
  await getWire(fromPg(client), { id: 1 })
  await db.transaction(async (tx) => getWire(fromPglite(tx), { id: 1 }))
  // @ts-expect-error a driver needs its adapter
  await getWire(pool, { id: 1 })
  const wide: bigint | null | undefined = row?.wide
  const bytes: Uint8Array | null | undefined = (await getWire(fromPglite(db), { id: 1 }))?.bytes
  return [wide, bytes]
}
`,
    )
    await run(
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
        '--types',
        'node',
        join(root, 'usage.ts'),
      ],
      { cwd: process.cwd() },
    ).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 120_000)

  it.each(drivers())('round-trips every codec through %s', async (_name, connect) => {
    const queryable = connect()
    await db.exec('BEGIN')
    try {
      for (const value of values) await runtime['insertWire']!(queryable, value)
      for (const value of values)
        expect(await runtime['getWire']!(queryable, { id: value.id })).toEqual(stored(value))
      expect(await runtime['getWire']!(queryable, { id: 99 })).toBeUndefined()
      expect(await runtime['listWire']!(queryable)).toEqual(
        values.map(({ id, wide }) => ({ id, wide })),
      )
      expect(await runtime['countWire']!(queryable, { id: 2 })).toBe(2)
      await db.exec("SET bytea_output = 'escape'")
      expect(await runtime['getWire']!(queryable, { id: 1 })).toMatchObject({
        bytes: values[0]!.bytes,
      })
    } finally {
      await db.exec('ROLLBACK')
      await db.exec('RESET bytea_output')
    }
  })

  it.each(drivers())('rejects malformed parameters before %s sees them', async (_name, connect) => {
    const queryable = connect()
    for (const [column, value] of [
      ['wide', 1],
      ['regular', 1.5],
      ['regular', 2n],
      ['exact', 1.5],
      ['exact', '1e'],
      ['bytes', [1, 2]],
      ['flag', 'true'],
      ['counts', 1],
      ['seats', '[1,2)'],
      ['document', () => 0],
    ] as const)
      await expect(
        runtime['insertWire']!(queryable, { ...values[1], id: 10, [column]: value }),
      ).rejects.toThrow(new RegExp(`Parameter ${column} holds a malformed`))
  })
})
