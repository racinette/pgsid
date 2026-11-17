import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

// zod v4 schemas of query parameters and rows: a field accepts what the query sends or reads, a
// CHECK literal set as its literals, and the inferred types are the generated parameter and row
// types.
const schema = `CREATE TYPE pay_kind AS ENUM ('paid', 'pending');
CREATE TABLE payments (
  id integer PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('open', 'closed')),
  kind pay_kind NOT NULL,
  paid_at date,
  amount numeric,
  total bigint NOT NULL DEFAULT 0,
  note text
);
`
const queries = `-- name: AddPayment :exec
INSERT INTO payments (id, status, kind, paid_at, amount, total, note) VALUES (@id, @status, @kind, @paid_at, @amount, @total, @note);
-- name: GetPayment :one
SELECT id, status, kind, paid_at, amount, total, note FROM payments WHERE id = $1;
-- name: ListNotes :many
SELECT note, NULL::text AS nothing FROM payments ORDER BY id;
`

const usage = `import { z } from 'zod/v4'
import { addPaymentParamsSchema, type AddPaymentParams } from './generated/runtime/q/AddPayment.js'
import { getPaymentParamsSchema, getPaymentRowSchema, type GetPaymentParams, type GetPaymentRow } from './generated/runtime/q/GetPayment.js'
import { listNotesRowSchema, type ListNotesRow } from './generated/runtime/q/ListNotes.js'
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
declare function same<T extends true>(): void
same<Same<z.infer<typeof addPaymentParamsSchema>, AddPaymentParams>>()
same<Same<z.infer<typeof getPaymentParamsSchema>, GetPaymentParams>>()
same<Same<z.infer<typeof getPaymentRowSchema>, GetPaymentRow>>()
same<Same<z.infer<typeof listNotesRowSchema>, ListNotesRow>>()
`

type Schema = {
  safeParse(value: unknown): { success: boolean; error?: { issues: { path: unknown[] }[] } }
}

let root: string
let db: PGlite

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-query-zod-'))
  await mkdir(join(root, 'queries'))
  await symlink(join(process.cwd(), 'node_modules'), join(root, 'node_modules'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/q.sql'), queries)
  await writeFile(
    join(root, 'pgsid.yaml'),
    `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    typescript:
      queries:
        zod: true
        out:
          queries:
            types: generated/types
            runtime: generated/runtime
`,
  )
  const built = await buildProject({ baseDirectory: root })
  expect(built.state.diagnostics).toEqual([])
  db = new PGlite()
  await db.exec(schema)
}, 300_000)

afterAll(async () => {
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

describe('zod v4 query schemas', () => {
  it('infers the generated parameter and row types', async () => {
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

  it('accepts what the query sends and reads, and refuses what it cannot', async () => {
    const add = (await import(join(root, 'generated/runtime/q/AddPayment.ts'))) as {
      addPaymentParamsSchema: Schema
      addPayment(db: unknown, params: unknown): Promise<void>
    }
    const get = (await import(join(root, 'generated/runtime/q/GetPayment.ts'))) as {
      getPaymentParamsSchema: Schema
      getPaymentRowSchema: Schema
      getPayment(db: unknown, ...params: unknown[]): Promise<unknown>
    }
    const { numeric } = (await import(join(root, 'generated/runtime/q/pgsid/numeric.ts'))) as {
      numeric(text: string): unknown
    }
    const { fromPglite } = (await import(join(root, 'generated/runtime/q/pgsid/queryable.ts'))) as {
      fromPglite(db: PGlite): unknown
    }
    const params = {
      id: 1,
      status: 'open',
      kind: 'paid',
      paid_at: '2024-01-02',
      amount: numeric('12.50'),
      total: 5n,
      note: null,
    }
    const issues = (schema: Schema, value: unknown) =>
      schema.safeParse(value).error?.issues.map((issue) => issue.path.join('.')) ?? []
    expect(issues(add.addPaymentParamsSchema, params)).toEqual([])
    expect(issues(add.addPaymentParamsSchema, { ...params, status: 'other' })).toEqual(['status'])
    expect(issues(add.addPaymentParamsSchema, { ...params, amount: '12.50' })).toEqual(['amount'])
    expect(issues(add.addPaymentParamsSchema, { ...params, total: 5 })).toEqual(['total'])
    expect(issues(add.addPaymentParamsSchema, { ...params, paid_at: 'not a date' })).toEqual([
      'paid_at',
    ])
    expect(issues(get.getPaymentParamsSchema, [1])).toEqual([])
    expect(issues(get.getPaymentParamsSchema, ['1'])).toEqual(['0'])
    // A row the query reads is a row its schema accepts.
    const queryable = fromPglite(db)
    await add.addPayment(queryable, params)
    const row = await get.getPayment(queryable, 1)
    expect(issues(get.getPaymentRowSchema, row)).toEqual([])
    expect(issues(get.getPaymentRowSchema, { ...(row as object), kind: 'refunded' })).toEqual([
      'kind',
    ])
  }, 120_000)
})
