import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

// CHECK-derived narrowing of generated types: literal sets become literal unions, and CHECKs
// tying columns together become discriminated unions, in rows read, parameters written and
// table types. Each type the usage file rejects is a row the server rejects too.
const schema = `CREATE TYPE pay_kind AS ENUM ('paid', 'pending', 'refunded');
CREATE TABLE payments (
  id integer PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('open', 'closed')),
  kind pay_kind NOT NULL,
  paid_at date,
  level integer CHECK (level IN (1, 2)),
  delta bigint CHECK (delta IN (-5, 7)),
  settled boolean NOT NULL DEFAULT false,
  note text,
  CHECK ((kind = 'paid') = (paid_at IS NOT NULL)),
  CHECK (settled OR note IS NULL)
);
CREATE TABLE owners (id integer PRIMARY KEY, payment integer);
CREATE VIEW paid_view AS SELECT id, kind, paid_at FROM payments;
CREATE DOMAIN tier AS text CHECK (VALUE IN ('gold', 'silver'));
CREATE TABLE members (id integer PRIMARY KEY, tier tier NOT NULL);
CREATE TABLE drafts (id integer PRIMARY KEY, state text);
ALTER TABLE drafts ADD CHECK (state IN ('new')) NOT VALID;
`
const queries = `-- name: GetPayment :one
SELECT id, status, kind, paid_at, level, delta, settled, note FROM payments WHERE id = @id;
-- name: OwnerPayments :many
SELECT o.id, p.kind, p.paid_at FROM owners o LEFT JOIN payments p ON p.id = o.payment;
-- name: Either :many
SELECT kind, paid_at, status FROM payments UNION ALL SELECT kind, paid_at, status FROM payments;
-- name: Mixed :many
SELECT status FROM payments UNION SELECT 'other';
-- name: AddPayment :exec
INSERT INTO payments (id, status, kind, paid_at, level, delta, settled, note)
VALUES (@id, @status, @kind, @paid_at, @level, @delta, @settled, @note);
-- name: SetPaid :exec
UPDATE payments SET kind = @kind, paid_at = @paid_at WHERE id = @id;
-- name: GetMember :one
SELECT tier FROM members WHERE id = @id;
-- name: AddMember :exec
INSERT INTO members (id, tier) VALUES (@id, @tier);
-- name: GetDraft :one
SELECT state FROM drafts WHERE id = @id;
-- name: AddDraft :exec
INSERT INTO drafts (id, state) VALUES (@id, @state);
`

const usage = `import type { GetPaymentRow } from './generated/types/q/GetPayment.js'
import type { OwnerPaymentsRow } from './generated/types/q/OwnerPayments.js'
import type { EitherRow } from './generated/types/q/Either.js'
import type { MixedRow } from './generated/types/q/Mixed.js'
import type { AddPaymentParams } from './generated/types/q/AddPayment.js'
import type { SetPaidParams } from './generated/types/q/SetPaid.js'
import type { GetDraftRow } from './generated/types/q/GetDraft.js'
import type { GetMemberRow } from './generated/types/q/GetMember.js'
import type { AddMemberParams } from './generated/types/q/AddMember.js'
import type { AddDraftParams } from './generated/types/q/AddDraft.js'
import type { Payments, PaidView } from './generated/schema/public/tables.js'
import type { InferInsert, InferSelect, InferUpdate } from './generated/schema/helpers.js'
declare function expectType<T>(value: T): void
declare const row: GetPaymentRow
expectType<'open' | 'closed'>(row.status)
expectType<1 | 2 | null>(row.level)
expectType<-5n | 7n | null>(row.delta)
if (row.kind === 'paid') expectType<string>(row.paid_at)
else expectType<null>(row.paid_at)
if (!row.settled) expectType<null>(row.note)
// @ts-expect-error A paid row has a payment date.
const unpaid: GetPaymentRow = { ...row, kind: 'paid', paid_at: null }
void unpaid

declare const owned: OwnerPaymentsRow
if (owned.kind === 'paid') expectType<string>(owned.paid_at)
if (owned.kind === null) expectType<null>(owned.paid_at)

// A set operation's rows come from either branch: literals join, and cases are not read.
declare const either: EitherRow
expectType<string | null>(either.paid_at)
expectType<'open' | 'closed'>(either.status)
declare const mixed: MixedRow
expectType<string>(mixed.status)
// @ts-expect-error A branch writes another value.
expectType<'open' | 'closed'>(mixed.status)

const add: AddPaymentParams = {
  id: 1, status: 'open', kind: 'paid', paid_at: '2024-01-01', level: 1, delta: -5n, settled: false, note: null,
}
void add
// @ts-expect-error The status CHECK admits open and closed only.
const badStatus: AddPaymentParams = { ...add, status: 'other' }
// @ts-expect-error A pending payment has no payment date.
const badPending: AddPaymentParams = { ...add, kind: 'pending', paid_at: '2024-01-01' }
// @ts-expect-error An unsettled payment has no note.
const badNote: AddPaymentParams = { ...add, settled: false, note: 'n' }
void [badStatus, badPending, badNote]
const setPaid: SetPaidParams = { id: 1, kind: 'refunded', paid_at: null }
void setPaid
// @ts-expect-error A refunded payment has no payment date.
const badSetPaid: SetPaidParams = { id: 1, kind: 'refunded', paid_at: '2024-01-01' }
void badSetPaid

declare const stored: InferSelect<Payments>
if (stored.kind !== 'paid') expectType<null>(stored.paid_at)
const insert: InferInsert<Payments> = { id: 2, status: 'closed', kind: 'pending' }
void insert
// @ts-expect-error A paid payment cannot leave its payment date to NULL.
const badInsert: InferInsert<Payments> = { id: 2, status: 'closed', kind: 'paid' }
void badInsert
const update: InferUpdate<Payments> = { status: 'closed', paid_at: null }
void update
// @ts-expect-error The status CHECK binds updates too.
const badUpdate: InferUpdate<Payments> = { status: 'other' }
void badUpdate

declare const viewed: InferSelect<PaidView>
if (viewed.kind === 'paid') expectType<string>(viewed.paid_at)

// A domain's CHECKs narrow its alias, and so every value of the domain.
declare const member: GetMemberRow
expectType<'gold' | 'silver'>(member.tier)
type Branded<T> = T & { readonly __brand: 'public.tier' }
const addMember: AddMemberParams = { id: 1, tier: 'gold' as Branded<'gold'> }
void addMember
// @ts-expect-error The tier domain admits gold and silver only.
const badMember: AddMemberParams = { id: 1, tier: 'bronze' as Branded<'bronze'> }
void badMember

// A NOT VALID CHECK binds writes, while stored rows may predate it.
declare const draft: GetDraftRow
expectType<string | null>(draft.state)
const addDraft: AddDraftParams = { id: 1, state: 'new' }
void addDraft
// @ts-expect-error New drafts are new.
const badDraft: AddDraftParams = { id: 1, state: 'old' }
void badDraft
`

let root: string
let db: PGlite

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-check-unions-'))
  await mkdir(join(root, 'queries'))
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

describe('CHECK-derived TypeScript unions', () => {
  it('narrows rows, parameters and table types as the CHECKs do', async () => {
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

  it('rejects on the server every write the types reject', async () => {
    const insert = (values: string) =>
      db.exec(`BEGIN; INSERT INTO payments VALUES ${values}; ROLLBACK`).then(
        () => 'accepted',
        async (error: { code?: string }) => {
          await db.exec('ROLLBACK')
          return error.code
        },
      )
    expect(await insert(`(1, 'open', 'paid', '2024-01-01', 1, -5, false, NULL)`)).toBe('accepted')
    for (const values of [
      `(1, 'other', 'paid', '2024-01-01', 1, -5, false, NULL)`,
      `(1, 'open', 'pending', '2024-01-01', 1, -5, false, NULL)`,
      `(1, 'open', 'paid', NULL, 1, -5, false, NULL)`,
      `(1, 'open', 'paid', '2024-01-01', 3, -5, false, NULL)`,
      `(1, 'open', 'paid', '2024-01-01', 1, 5, false, NULL)`,
      `(1, 'open', 'paid', '2024-01-01', 1, -5, false, 'n')`,
    ])
      expect(await insert(values), values).toBe('23514')
    await expect(db.exec(`INSERT INTO drafts VALUES (1, 'old')`)).rejects.toThrow(/check/)
    await expect(db.exec(`INSERT INTO members VALUES (1, 'bronze')`)).rejects.toThrow(/check/)
  })
})
