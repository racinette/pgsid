import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

// zod v4 schemas of table shapes: fields accept what the generated queries send, and CHECKs
// apply as a refinement on whichever shape the caller picks.
const schema = `CREATE TYPE pay_kind AS ENUM ('paid', 'pending', 'refunded');
CREATE DOMAIN tier AS text CHECK (VALUE IN ('gold', 'silver'));
CREATE DOMAIN positive AS integer CHECK (VALUE > 0);
CREATE TABLE payments (
  id integer PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('open', 'closed')),
  kind pay_kind NOT NULL,
  paid_at date,
  amount numeric CHECK (amount > 0),
  total bigint NOT NULL DEFAULT 0,
  tags text[],
  tier tier,
  score positive,
  created timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'paid') = (paid_at IS NOT NULL))
);
CREATE TABLE notes (id integer GENERATED ALWAYS AS IDENTITY, body text NOT NULL);
`

const usage = `import { z } from 'zod/v4'
import type { Payments } from './generated/schema/public/tables.js'
import type { InferInsert, InferSelect } from './generated/schema/helpers.js'
import {
  notesInsertSchema,
  paymentsInsertSchema,
  paymentsSelectSchema,
  paymentsUpdateSchema,
  withPaymentsChecks,
} from './generated/schema/public/zod.js'
declare function expectType<T>(value: T): void
type Insert = z.infer<typeof paymentsInsertSchema>
declare const insert: Insert
expectType<'open' | 'closed'>(insert.status)
expectType<'paid' | 'pending' | 'refunded'>(insert.kind)
expectType<InferInsert<Payments>['tags']>(insert.tags)
expectType<InferInsert<Payments>['tier']>(insert.tier)
expectType<InferInsert<Payments>['amount']>(insert.amount)
declare const selected: z.infer<typeof paymentsSelectSchema>
expectType<InferSelect<Payments>['created']>(selected.created)
// A checked shape keeps its type, so partial and picked shapes check too.
const partial = withPaymentsChecks(paymentsInsertSchema.partial())
expectType<Partial<Insert>>(partial.parse({}))
const picked = withPaymentsChecks(paymentsInsertSchema.pick({ kind: true, paid_at: true }))
expectType<Pick<Insert, 'kind' | 'paid_at'>>(picked.parse({ kind: 'pending' }))
void paymentsUpdateSchema
// @ts-expect-error An identity column generated always is not inserted.
notesInsertSchema.shape.id
`

let root: string
let zod: Record<
  string,
  {
    safeParse(value: unknown): {
      success: boolean
      error?: { issues: { message: string; path: unknown[]; params?: unknown }[] }
    }
  }
> & {
  withPaymentsChecks<S>(schema: S): S
}
let db: PGlite

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-zod-'))
  await mkdir(join(root, 'queries'))
  await symlink(join(process.cwd(), 'node_modules'), join(root, 'node_modules'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/q.sql'), '-- name: One :one\nSELECT 1 AS one;\n')
  await writeFile(
    join(root, 'pgsid.yaml'),
    `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    typescript:
      schema: { outDir: generated/schema, zod: true }
      queries:
        out:
          queries:
            types: generated/types
            runtime: generated/runtime
`,
  )
  const built = await buildProject({ baseDirectory: root })
  expect(built.state.diagnostics).toEqual([])
  zod = (await import(join(root, 'generated/schema/public/zod.ts'))) as typeof zod
  ;({ numeric } = (await import(join(root, 'generated/schema/pgsid/numeric.ts'))) as {
    numeric: typeof numeric
  })
  paid = {
    id: 1,
    status: 'open',
    kind: 'paid',
    paid_at: '2024-01-01',
    amount: numeric('12.50'),
    tags: ['a', null],
    tier: 'gold',
    score: 3,
  }
  db = new PGlite()
  await db.exec(schema)
}, 300_000)
afterAll(async () => {
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

// A numeric is the numeric module's value, made once the generated module is loaded.
let numeric: (value: string) => { toString(): string }
let paid: Record<string, unknown>

describe('zod v4 table schemas', () => {
  it('types fields as the table types do', async () => {
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

  it('accepts what the queries send and rejects malformed fields', () => {
    const insert = zod['paymentsInsertSchema']!
    expect(insert.safeParse(paid).success).toBe(true)
    expect(insert.safeParse({ ...paid, created: { epochMicroseconds: 0n } }).success).toBe(true)
    for (const [field, value] of [
      ['status', 'other'],
      ['kind', 'unknown'],
      ['id', 1.5],
      ['amount', 'abc'],
      ['amount', 12.5],
      // A numeric is taken only as the numeric module's value, not as its text.
      ['amount', '12.50'],
      ['paid_at', '2024/01/01'],
      ['tags', [['nested']]],
      ['tier', 'bronze'],
      ['score', 0],
      ['total', 1],
      ['created', new Date()],
    ] as const) {
      const result = insert.safeParse({ ...paid, [field]: value })
      expect(result.success, `${field} ${String(value)}`).toBe(false)
      expect(result.error!.issues[0]!.path, field).toEqual([field])
    }
  })

  it('refines any shape with the CHECKs, deciding what the server decides', async () => {
    const checked = zod.withPaymentsChecks(zod['paymentsInsertSchema']!)
    expect(checked.safeParse(paid).success).toBe(true)
    for (const row of [
      { ...paid, paid_at: null },
      { ...paid, kind: 'pending' },
      { ...paid, amount: numeric('-1') },
    ]) {
      const result = checked.safeParse(row)
      expect(result.success, JSON.stringify(row)).toBe(false)
      const issue = result.error!.issues[0]!
      expect(issue.message).toMatch(/violates check constraint/)
      const columns = Object.keys(row).filter((key) => key !== 'created' && key !== 'total')
      await expect(
        db.query(
          `INSERT INTO payments (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`,
          columns.map((key) => {
            const value = (row as Record<string, unknown>)[key]
            return Array.isArray(value)
              ? `{${value.map((item) => item ?? 'NULL').join(',')}}`
              : key === 'amount'
                ? String(value)
                : value
          }),
        ),
      ).rejects.toThrow(
        new RegExp(String((issue.params as { constraint: string }).constraint), 'u'),
      )
    }
    // A value of the right shape the server's input rejects fails the checks that read it.
    const month = checked.safeParse({ ...paid, paid_at: '2024-13-01' })
    expect(month.success).toBe(false)
    expect(month.error!.issues[0]!.params).toMatchObject({ code: '22008' })
    // Left-out columns leave the checks reading them undecided.
    const partial = zod.withPaymentsChecks(
      (zod['paymentsInsertSchema'] as unknown as { partial(): never }).partial(),
    ) as unknown as (typeof zod)[string]
    expect(partial.safeParse({ status: 'open' }).success).toBe(true)
    expect(partial.safeParse({ kind: 'paid', paid_at: null }).success).toBe(false)
  })
})
