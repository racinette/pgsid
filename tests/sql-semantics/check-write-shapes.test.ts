import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

const run = promisify(execFile)
const schema = `CREATE TABLE ledger (
  id integer PRIMARY KEY,
  amount integer NOT NULL DEFAULT 1 CONSTRAINT positive_amount CHECK (amount > 0),
  label text CONSTRAINT filled_label CHECK (label <> ''),
  note text
);
CREATE TABLE incoming (id integer PRIMARY KEY, amount integer);
`
const queries = `-- name: InsertMany :exec
INSERT INTO ledger (id, amount, label) VALUES (@first_id, @first_amount, @first_label), (@second_id, @second_amount, @second_label);
-- name: InsertSelected :exec
INSERT INTO ledger (id, amount) SELECT id + 100, @amount FROM incoming;
-- name: Upsert :exec
INSERT INTO ledger (id, amount, label) VALUES (@id, @amount, @label) ON CONFLICT (id) DO UPDATE SET amount = excluded.amount, label = @replacement;
-- name: UpdateAmount :exec
UPDATE ledger SET amount = @amount WHERE id = @id;
-- name: UpdatePair :exec
UPDATE ledger SET (amount, label) = (@amount, @label) WHERE id = @id;
-- name: AddAmount :exec
UPDATE ledger SET amount = amount + @delta WHERE id = @id;
-- name: MergeIncoming :exec
MERGE INTO ledger USING incoming s ON ledger.id = s.id WHEN MATCHED THEN UPDATE SET amount = @matched_amount WHEN NOT MATCHED THEN INSERT (id, amount, label) VALUES (s.id, @inserted_amount, @label);
`
const seed = `INSERT INTO ledger VALUES (1, 5, 'one', NULL); INSERT INTO incoming VALUES (1, 7), (2, 8);`

// `local` is the constraint the generated query rejects before sending; `server` is what PostgreSQL
// answers for the same statement, which differs only where no row would be written.
const cases: {
  query: string
  params: Record<string, unknown>
  values: unknown[]
  local: string | null
  server: string | null
}[] = [
  {
    query: 'InsertMany',
    params: {
      first_id: 10,
      first_amount: 1,
      first_label: 'a',
      second_id: 11,
      second_amount: -1,
      second_label: 'b',
    },
    values: [10, 1, 'a', 11, -1, 'b'],
    local: 'positive_amount',
    server: 'positive_amount',
  },
  {
    query: 'InsertMany',
    params: {
      first_id: 10,
      first_amount: 1,
      first_label: '',
      second_id: 11,
      second_amount: 1,
      second_label: 'b',
    },
    values: [10, 1, '', 11, 1, 'b'],
    local: 'filled_label',
    server: 'filled_label',
  },
  {
    query: 'InsertMany',
    params: {
      first_id: 10,
      first_amount: 1,
      first_label: 'a',
      second_id: 11,
      second_amount: 2,
      second_label: null,
    },
    values: [10, 1, 'a', 11, 2, null],
    local: null,
    server: null,
  },
  {
    query: 'InsertSelected',
    params: { amount: 0 },
    values: [0],
    local: 'positive_amount',
    server: 'positive_amount',
  },
  { query: 'InsertSelected', params: { amount: 3 }, values: [3], local: null, server: null },
  {
    query: 'Upsert',
    params: { id: 1, amount: 3, label: 'x', replacement: '' },
    values: [1, 3, 'x', ''],
    local: 'filled_label',
    server: 'filled_label',
  },
  {
    query: 'Upsert',
    params: { id: 20, amount: 3, label: 'x', replacement: '' },
    values: [20, 3, 'x', ''],
    local: 'filled_label',
    server: null,
  },
  {
    query: 'Upsert',
    params: { id: 1, amount: 0, label: 'x', replacement: 'y' },
    values: [1, 0, 'x', 'y'],
    local: 'positive_amount',
    server: 'positive_amount',
  },
  {
    query: 'UpdateAmount',
    params: { amount: 0, id: 99 },
    values: [0, 99],
    local: 'positive_amount',
    server: null,
  },
  {
    query: 'UpdateAmount',
    params: { amount: 0, id: 1 },
    values: [0, 1],
    local: 'positive_amount',
    server: 'positive_amount',
  },
  {
    query: 'UpdateAmount',
    params: { amount: 2, id: 1 },
    values: [2, 1],
    local: null,
    server: null,
  },
  {
    query: 'UpdatePair',
    params: { amount: 2, label: '', id: 1 },
    values: [2, '', 1],
    local: 'filled_label',
    server: 'filled_label',
  },
  {
    query: 'UpdatePair',
    params: { amount: 2, label: null, id: 1 },
    values: [2, null, 1],
    local: null,
    server: null,
  },
  {
    query: 'AddAmount',
    params: { delta: -100, id: 1 },
    values: [-100, 1],
    local: null,
    server: 'positive_amount',
  },
  {
    query: 'MergeIncoming',
    params: { matched_amount: -1, inserted_amount: 1, label: 'm' },
    values: [-1, 1, 'm'],
    local: 'positive_amount',
    server: 'positive_amount',
  },
  {
    query: 'MergeIncoming',
    params: { matched_amount: 1, inserted_amount: 0, label: 'm' },
    values: [1, 0, 'm'],
    local: 'positive_amount',
    server: 'positive_amount',
  },
  {
    query: 'MergeIncoming',
    params: { matched_amount: 1, inserted_amount: 1, label: '' },
    values: [1, 1, ''],
    local: 'filled_label',
    server: 'filled_label',
  },
  {
    query: 'MergeIncoming',
    params: { matched_amount: 1, inserted_amount: 1, label: 'm' },
    values: [1, 1, 'm'],
    local: null,
    server: null,
  },
]

let root: string
let db: PGlite
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-check-write-shapes-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/ledger.sql'), queries)
  await writeFile(
    join(root, 'pgsid.yaml'),
    `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    typescript:
      schema: { outDir: generated/ts/schema }
      queries:
        out:
          queries:
            types: generated/ts/types
            runtime: generated/ts/runtime
    go:
      driver: pgx
      schema: { outDir: generated/go/schema }
      queries:
        out:
          queries: generated/go/queries
`,
  )
  for (const file of ['go.mod', 'go.sum'])
    await writeFile(
      join(root, file),
      await readFile(`tests/fixtures/codegen/project/${file}`, 'utf8'),
    )
  const built = await buildProject({ baseDirectory: root })
  expect(built.state.diagnostics).toEqual([])
  db = new PGlite()
  await db.exec(schema + seed)
}, 300_000)
afterAll(async () => {
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

const rolledBack = async <T>(work: () => Promise<T>): Promise<T> => {
  await db.exec('BEGIN')
  try {
    return await work()
  } finally {
    await db.exec('ROLLBACK')
  }
}
const outcome = async (work: () => Promise<unknown>): Promise<string | null> =>
  work().then(
    () => null,
    (error: { code?: string; constraint?: string }) => {
      expect(error.code).toBe('23514')
      return error.constraint ?? 'missing constraint'
    },
  )

describe('CHECK prevalidation across write shapes', () => {
  it.each(cases.map((item, index) => ({ ...item, index })))(
    '$query #$index rejects locally as $local and PostgreSQL answers $server',
    async ({ query, params, values, local, server }) => {
      const module = (await import(
        join(root, `generated/ts/runtime/ledger/${query}.ts`)
      )) as Record<string, unknown>
      const name = query[0]!.toLowerCase() + query.slice(1)
      const sql = module[`${name}Sql`] as string
      expect(await rolledBack(() => outcome(() => db.query(sql, values)))).toBe(server)
      let calls = 0
      const queryable = {
        query: async (text: string, parameters?: unknown[]) => {
          calls++
          expect([text, parameters]).toEqual([sql, values])
          const result = await db.query<Record<string, unknown>>(text, parameters)
          return { rows: result.rows, rowCount: result.affectedRows ?? null }
        },
      }
      const generated = module[name] as (db: unknown, params: unknown) => Promise<unknown>
      const result = await rolledBack(() => outcome(() => generated(queryable, params)))
      expect({ result, calls }).toEqual(
        local === null ? { result: server, calls: 1 } : { result: local, calls: 0 },
      )
    },
  )

  it('rejects the same writes in generated Go before executing them', async () => {
    await writeFile(
      join(root, 'generated/go/queries/ledger/shapes_test.go'),
      `package ledger
import (
 "context"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/go/queries/pgsid/pgx"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingDB struct {
 pgsid.DBTX
 calls int
}
func (db *recordingDB) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
 db.calls++
 return pgconn.NewCommandTag("UPDATE 0"), nil
}
func expectRejected(t *testing.T, name, constraint string, run func(*Queries) error) {
 db := &recordingDB{}
 var violation *pgsid.CheckViolationError
 if err := run(New(db)); !errors.As(err, &violation) || violation.Constraint != constraint || db.calls != 0 {
  t.Fatalf("%s: got %v after %d calls, want %s before executing", name, err, db.calls, constraint)
 }
}
func TestWriteShapes(t *testing.T) {
 ctx := context.Background()
 empty, label := "", "x"
 missing := int32(99)
 expectRejected(t, "second VALUES row", "positive_amount", func(q *Queries) error {
  return q.InsertMany(ctx, InsertManyParams{FirstId: 10, FirstAmount: 1, FirstLabel: &label, SecondId: 11, SecondAmount: -1, SecondLabel: &label})
 })
 expectRejected(t, "INSERT SELECT", "positive_amount", func(q *Queries) error { return q.InsertSelected(ctx, InsertSelectedParams{Amount: 0}) })
 expectRejected(t, "conflict update", "filled_label", func(q *Queries) error {
  return q.Upsert(ctx, UpsertParams{Id: 20, Amount: 3, Label: &label, Replacement: &empty})
 })
 expectRejected(t, "zero-row update", "positive_amount", func(q *Queries) error {
  return q.UpdateAmount(ctx, UpdateAmountParams{Amount: 0, Id: &missing})
 })
 expectRejected(t, "multiple assignment", "filled_label", func(q *Queries) error {
  return q.UpdatePair(ctx, UpdatePairParams{Amount: 2, Label: &empty, Id: &missing})
 })
 expectRejected(t, "merge insert", "positive_amount", func(q *Queries) error {
  return q.MergeIncoming(ctx, MergeIncomingParams{MatchedAmount: 1, InsertedAmount: 0, Label: &label})
 })
 db := &recordingDB{}
 if err := New(db).AddAmount(ctx, AddAmountParams{Delta: -100, Id: &missing}); err != nil || db.calls != 1 {
  t.Fatalf("an expression over the previous row must reach the database: %v after %d calls", err, db.calls)
 }
}
`,
    )
    await run(
      'go',
      ['test', '-mod=mod', '-run', 'TestWriteShapes', './generated/go/queries/ledger/'],
      {
        cwd: root,
        env: { ...process.env, GOTOOLCHAIN: 'local' },
      },
    ).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 300_000)
})
