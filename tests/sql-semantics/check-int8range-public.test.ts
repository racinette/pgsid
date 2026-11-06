import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

const run = promisify(execFile)
const schema = `CREATE TABLE booking (
  id integer PRIMARY KEY,
  seats int8range NOT NULL CONSTRAINT bounded_seats CHECK (lower(seats) >= 0 AND upper(seats) <= 100)
);
`
const queries = `-- name: InsertBooking :exec
INSERT INTO booking (id, seats) VALUES (@id, @seats);
-- name: GetBooking :one
SELECT id, seats FROM booking WHERE id = @id;
-- name: MoveBooking :exec
UPDATE booking SET seats = @seats WHERE id = @id;
`

type Range =
  | 'empty'
  | { lower: bigint | null; upper: bigint | null; lowerInclusive: boolean; upperInclusive: boolean }
const range = (text: string): Range => {
  const match = /^([[(])(-?[0-9]*),(-?[0-9]*)([\])])$/u.exec(text)!
  return {
    lower: match[2] ? BigInt(match[2]) : null,
    upper: match[3] ? BigInt(match[3]) : null,
    lowerInclusive: match[1] === '[',
    upperInclusive: match[4] === ']',
  }
}
const max = '9223372036854775807'
// Each value is written through the generated query and as text straight to PostgreSQL.
const values: { value: Range; text: string }[] = [
  '[1,10]',
  '(0,100]',
  '[0,100)',
  '[-1,5)',
  '(-1,5)',
  '(,5)',
  '[,5]',
  '[3,)',
  '[5,3)',
  '[5,5)',
  '[5,5]',
  '(5,6)',
  '(5,5]',
  `(${max},)`,
  `[1,${max}]`,
  `[0,${max})`,
].map((text) => ({ value: range(text), text }))
values.push({ value: 'empty', text: 'empty' })

let root: string
let db: PGlite
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-int8range-public-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/booking.sql'), queries)
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
    // Only a violation names its constraint; an input error is the same error wherever it is raised.
    (error: { code?: string; constraint?: string }) =>
      error.code === '23514' ? `23514 ${error.constraint}` : String(error.code),
  )
const rolledBack = async <T>(work: () => Promise<T>): Promise<T> => {
  await db.exec('BEGIN')
  try {
    return await work()
  } finally {
    await db.exec('ROLLBACK')
  }
}
const queryable = (calls: { count: number }) => ({
  query: async (text: string, parameters?: unknown[]) => {
    calls.count++
    const result = await db.query<Record<string, unknown>>(text, parameters)
    return { rows: result.rows, rowCount: result.affectedRows ?? null }
  },
})
const load = async (name: string) =>
  (await import(join(root, `generated/runtime/booking/${name}.ts`))) as Record<
    string,
    (...args: unknown[]) => Promise<unknown>
  >

describe('int8range as a public TypeScript value', () => {
  it('types parameters, rows and CHECK inputs with the public range type', async () => {
    await writeFile(
      join(root, 'usage.ts'),
      `import { insertBooking } from './generated/runtime/booking/InsertBooking.js'
import { getBooking } from './generated/runtime/booking/GetBooking.js'
import { evaluatePublicBookingChecks } from './generated/schema/public/checks.js'
import type { Booking } from './generated/schema/public/tables.js'
declare const db: Parameters<typeof insertBooking>[0]
export async function usage(): Promise<bigint | null | undefined> {
  await insertBooking(db, { id: 1, seats: { lower: 1n, upper: 5n, lowerInclusive: true, upperInclusive: false } })
  await insertBooking(db, { id: 2, seats: 'empty' })
  // @ts-expect-error range text is not the public value
  await insertBooking(db, { id: 3, seats: '[1,5)' })
  evaluatePublicBookingChecks({ seats: 'empty' })
  const stored: Booking['select']['seats'] = 'empty'
  void stored
  const row = await getBooking(db, { id: 1 })
  return row && row.seats !== 'empty' ? row.seats.lower : undefined
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
        join(root, 'usage.ts'),
      ],
      { cwd: process.cwd() },
    ).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 120_000)

  it.each(values)('decides $text locally exactly as PostgreSQL does', async ({ value, text }) => {
    const server = await rolledBack(() =>
      outcome(() => db.query('INSERT INTO booking (id, seats) VALUES ($1, $2)', [1, text])),
    )
    const { insertBooking } = await load('InsertBooking')
    const calls = { count: 0 }
    const local = await rolledBack(() =>
      outcome(() => insertBooking!(queryable(calls), { id: 1, seats: value })),
    )
    expect({ local, calls: calls.count }).toEqual({
      local: server,
      calls: server === 'accepted' ? 1 : 0,
    })
    const { moveBooking } = await load('MoveBooking')
    const moved = { count: 0 }
    await expect(
      outcome(() => moveBooking!(queryable(moved), { id: 99, seats: value })),
    ).resolves.toBe(server)
  })

  it('reads stored ranges back as canonical public values', async () => {
    const { insertBooking } = await load('InsertBooking')
    const { getBooking } = await load('GetBooking')
    const calls = { count: 0 }
    await insertBooking!(queryable(calls), { id: 7, seats: range('(0,10]') })
    await insertBooking!(queryable(calls), { id: 8, seats: 'empty' })
    await insertBooking!(queryable(calls), { id: 9, seats: range('[,5]') })
    expect(await getBooking!(queryable(calls), { id: 7 })).toEqual({
      id: 7,
      seats: range('[1,11)'),
    })
    expect(await getBooking!(queryable(calls), { id: 8 })).toEqual({ id: 8, seats: 'empty' })
    expect(await getBooking!(queryable(calls), { id: 9 })).toEqual({ id: 9, seats: range('(,6)') })
  })

  it('evaluates the schema-level CHECK API on public values', async () => {
    const checks = (await import(join(root, 'generated/schema/public/checks.ts'))) as {
      evaluatePublicBookingChecks: (row: object) => { constraint: string; result: unknown }[]
    }
    expect(checks.evaluatePublicBookingChecks({ seats: range('(0,100]') })).toMatchObject([
      { constraint: 'bounded_seats', result: { certain: true, value: false } },
    ])
    expect(checks.evaluatePublicBookingChecks({ seats: range('[0,100)') })).toMatchObject([
      { constraint: 'bounded_seats', result: { certain: true, value: true } },
    ])
    expect(checks.evaluatePublicBookingChecks({})).toMatchObject([
      { constraint: 'bounded_seats', result: { certain: false } },
    ])
    expect(() => checks.evaluatePublicBookingChecks({ seats: '[0,100)' })).toThrow(TypeError)
    expect(
      await readFile(join(root, 'generated/types/booking/InsertBooking.d.ts'), 'utf8'),
    ).not.toContain('unknown')
  })
})
