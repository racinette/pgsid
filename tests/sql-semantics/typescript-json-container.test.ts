import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

// JSON values are containers of the server's text: exact, parsed on demand, a JSON null document
// apart from SQL NULL, and a column's JSON Schema checked when the value is read.
const schema = `CREATE TABLE events (
  id integer PRIMARY KEY,
  payload jsonb,
  raw json CHECK (raw IS NULL OR length(raw::text) < 20)
);
`
const queries = `-- name: AddEvent :exec
INSERT INTO events (id, payload, raw) VALUES (@id, @payload, @raw);
-- name: GetEvent :one
SELECT payload, raw FROM events WHERE id = @id;
`
const usage = `import type { GetEventRow } from './generated/types/events/GetEvent.js'
import type { AddEventParams } from './generated/types/events/AddEvent.js'
import { json, jsonText, type PgsidJson, type PgsidJsonValue } from './generated/runtime/events/pgsid/queryable.js'
declare function expectType<T>(value: T): void
declare const row: GetEventRow
expectType<PgsidJson<{ name: string }> | null>(row.payload)
expectType<PgsidJson<PgsidJsonValue> | null>(row.raw)
if (row.payload) expectType<string>(row.payload.value().name)
const params: AddEventParams = { id: 1, payload: json({ name: 'a' }), raw: jsonText(' [1, 2] ') }
void params
// @ts-expect-error A JSON value is sent as a container, so a plain value is not a parameter.
const plain: AddEventParams = { id: 1, payload: { name: 'a' }, raw: null }
void plain
`

let root: string
let db: PGlite
let addEvent: (db: unknown, params: unknown) => Promise<unknown>
let getEvent: (db: unknown, params: unknown) => Promise<Record<string, unknown> | undefined>
let support: {
  fromPglite(db: PGlite): {
    queryText(sql: string, values: readonly (string | null)[]): Promise<unknown>
  }
  json(value: unknown): { text: string }
  jsonText(text: string): { text: string }
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-json-container-'))
  await mkdir(join(root, 'queries'))
  await mkdir(join(root, 'schemas'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/events.sql'), queries)
  await writeFile(
    join(root, 'schemas/payload.json'),
    JSON.stringify({
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
      additionalProperties: false,
    }),
  )
  await writeFile(
    join(root, 'pgsid.yaml'),
    `schema: schema.sql
types:
  jsonSchemas:
    Payload: { file: schemas/payload.json }
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    typescript:
      mappings:
        column:
          public.events.payload: { jsonSchema: Payload }
      jsonSchemas: { runtime: generated/jsonschemas }
      queries:
        out:
          queries:
            types: generated/types
            runtime: generated/runtime
`,
  )
  const built = await buildProject({ baseDirectory: root })
  expect(built.state.diagnostics).toEqual([])
  ;({ addEvent } = (await import(join(root, 'generated/runtime/events/AddEvent.ts'))) as {
    addEvent: typeof addEvent
  })
  ;({ getEvent } = (await import(join(root, 'generated/runtime/events/GetEvent.ts'))) as {
    getEvent: typeof getEvent
  })
  support = (await import(
    join(root, 'generated/runtime/events/pgsid/queryable.ts')
  )) as typeof support
  db = new PGlite()
  await db.exec(schema)
}, 300_000)
afterAll(async () => {
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

type Container = {
  text: string
  value(): unknown
  safeValue(): { ok: boolean; value?: unknown; error?: unknown }
}

describe('TypeScript JSON containers', () => {
  it('types JSON columns as containers of their schema types', async () => {
    await writeFile(join(root, 'usage.ts'), usage)
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

  it('keeps the server text exactly and parses on demand', async () => {
    const text = support.fromPglite(db)
    await db.exec('BEGIN')
    try {
      // json keeps the text as written: whitespace and a repeated key.
      await addEvent(text, {
        id: 1,
        payload: support.json({ name: 'a' }),
        raw: support.jsonText('{"x":1, "x":2}'),
      })
      const row = (await getEvent(text, { id: 1 }))!
      const payload = row['payload'] as Container
      const raw = row['raw'] as Container
      expect(payload.text).toBe('{"name": "a"}')
      expect(payload.value()).toEqual({ name: 'a' })
      expect(raw.text).toBe('{"x":1, "x":2}')
      expect(raw.value()).toEqual({ x: 2 })
      // A JSON null document is a container whose value is null; SQL NULL is null.
      await addEvent(text, { id: 2, payload: null, raw: support.json(null) })
      const nulls = (await getEvent(text, { id: 2 }))!
      expect(nulls['payload']).toBeNull()
      expect((nulls['raw'] as Container).text).toBe('null')
      expect((nulls['raw'] as Container).value()).toBeNull()
    } finally {
      await db.exec('ROLLBACK')
    }
  })

  it('checks a JSON Schema when the value is read, and before a parameter is sent', async () => {
    const text = support.fromPglite(db)
    await db.exec('BEGIN')
    try {
      await db.exec(`INSERT INTO events (id, payload) VALUES (3, '{"name": 1}')`)
      // Reading the row succeeds; its payload fails when its value is asked for.
      const row = (await getEvent(text, { id: 3 }))!
      const payload = row['payload'] as Container
      expect(payload.text).toBe('{"name": 1}')
      expect(() => payload.value()).toThrow(/payload/)
      expect(payload.safeValue()).toMatchObject({ ok: false })
    } finally {
      await db.exec('ROLLBACK')
    }
    let calls = 0
    const counted = {
      queryText: (sql: string, values: readonly (string | null)[]) => {
        calls++
        return text.queryText(sql, values)
      },
    }
    await expect(
      addEvent(counted, { id: 4, payload: support.json({ name: 1 }), raw: null }),
    ).rejects.toThrow(/payload/)
    await expect(addEvent(counted, { id: 4, payload: { name: 'a' }, raw: null })).rejects.toThrow(
      TypeError,
    )
    expect(calls).toBe(0)
  })

  it('checks CHECKs on the exact text the query sends', async () => {
    const text = support.fromPglite(db)
    // Serialized, the value is short; written with spaces, its text is not.
    const value = [1, 2, 3]
    const spaced = support.jsonText(`[ ${value.join(' ,  ')} ]           `)
    let calls = 0
    const counted = {
      queryText: (sql: string, values: readonly (string | null)[]) => {
        calls++
        return text.queryText(sql, values)
      },
    }
    await db.exec('BEGIN')
    try {
      await addEvent(counted, { id: 5, payload: null, raw: support.json(value) })
      expect(calls).toBe(1)
      await expect(addEvent(counted, { id: 6, payload: null, raw: spaced })).rejects.toMatchObject({
        code: '23514',
      })
      expect(calls).toBe(1)
      await expect(
        db.query(`INSERT INTO events (id, raw) VALUES (7, $1)`, [spaced.text]),
      ).rejects.toThrow(/check constraint/)
    } finally {
      await db.exec('ROLLBACK')
    }
  })
})
