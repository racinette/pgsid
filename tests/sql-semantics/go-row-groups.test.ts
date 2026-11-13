import { afterAll, beforeAll, expect, it } from 'vitest'
import { execFile, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'
import { servePglite } from '../support/pglite-server.js'
import { writeGoModule } from '../support/go-module.js'
import { sharedTempDirectory } from '../../tools/test-run-temp.js'

const schema = `CREATE TYPE pay_kind AS ENUM ('paid', 'pending', 'refunded');
CREATE TABLE accounts (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE payments (id int PRIMARY KEY, account_id int, kind pay_kind NOT NULL, paid_at date,
  CHECK ((kind = 'paid') = (paid_at IS NOT NULL)));
CREATE TABLE notes (id int PRIMARY KEY, payment_id int NOT NULL, body text NOT NULL);
CREATE TABLE contacts (id int PRIMARY KEY, email text, phone text, CHECK (num_nonnulls(email, phone) = 1));
CREATE TABLE levels (id int PRIMARY KEY, level int NOT NULL, reason text,
  CHECK ((level = -1) = (reason IS NOT NULL)));
CREATE TABLE flags (id int PRIMARY KEY, active boolean NOT NULL, since date,
  CHECK ((active AND since IS NOT NULL) OR (NOT active AND since IS NULL)));
CREATE TABLE shipments (id int PRIMARY KEY, account_id int NOT NULL, kind pay_kind NOT NULL, sent_at date,
  paid boolean NOT NULL, receipt text,
  CHECK ((kind = 'paid') = (sent_at IS NOT NULL)),
  CHECK ((paid AND receipt IS NOT NULL) OR (NOT paid AND receipt IS NULL)));
`
const seed = `INSERT INTO accounts VALUES (1, 'ann'), (2, 'bob'), (3, 'cat');
INSERT INTO payments VALUES (10, 1, 'paid', '2026-01-02'), (11, 1, 'pending', NULL), (12, 2, 'refunded', NULL);
INSERT INTO notes VALUES (100, 10, 'first'), (101, 11, 'second');
INSERT INTO contacts VALUES (1, 'a@x', NULL), (2, NULL, '555');
INSERT INTO levels VALUES (1, -1, 'banned'), (2, 3, NULL);
INSERT INTO flags VALUES (1, true, '2026-01-01'), (2, false, NULL);
INSERT INTO shipments VALUES (20, 1, 'paid', '2026-02-03', true, 'r-1'), (21, 2, 'pending', NULL, false, NULL);
`
const queries = `-- name: ListAccountPayments :many
SELECT a.id, a.name, p.id AS payment_id, p.kind, p.paid_at FROM accounts a LEFT JOIN payments p ON p.account_id = a.id ORDER BY a.id, p.id;
-- name: ListAccountTrails :many
SELECT a.id, p.id AS payment_id, p.kind, n.id AS note_id, n.body FROM accounts a LEFT JOIN payments p ON p.account_id = a.id LEFT JOIN notes n ON n.payment_id = p.id ORDER BY a.id, p.id, n.id;
-- name: ListAccountNotes :many
SELECT a.id, p.id AS payment_id, p.kind, p.paid_at, n.body FROM accounts a LEFT JOIN (payments p JOIN notes n ON n.payment_id = p.id) ON p.account_id = a.id ORDER BY a.id, p.id, n.id;
-- name: ListPayments :many
SELECT id, kind, paid_at FROM payments ORDER BY id;
-- name: GetContact :one
SELECT id, email, phone FROM contacts WHERE id = @id;
-- name: GetLevel :one
SELECT id, level, reason FROM levels WHERE id = @id;
-- name: GetFlag :one
SELECT id, active, since FROM flags WHERE id = @id;
-- name: ListShipments :many
SELECT id, kind, sent_at, paid, receipt FROM shipments ORDER BY id;
-- name: ListAccountShipments :many
SELECT a.id, s.id AS shipment_id, s.kind, s.sent_at, s.paid, s.receipt FROM accounts a LEFT JOIN shipments s ON s.account_id = a.id ORDER BY a.id;
`

// The generated Go API against the server through pgx: each group of a row is one field holding
// the member its columns say the row is, and a member carries only the columns its rows can hold.
const goTest = `package groups

import (
	"context"
	"os"
	"testing"
	"time"

	pgsid "example.com/pgsid-groups/generated/go/pgsid"
	public "example.com/pgsid-groups/generated/go/schema/public"
	"github.com/jackc/pgx/v5"
)

func connect(t *testing.T, ctx context.Context) *Queries {
	conn, err := pgx.Connect(ctx, os.Getenv("PGSID_GO_TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close(ctx) })
	// Every connection reaches the one server session, which keeps the statements prepared before.
	if _, err := conn.Exec(ctx, "DEALLOCATE ALL"); err != nil {
		t.Fatal(err)
	}
	return New(conn)
}

func day(year int, month time.Month, date int) pgsid.Date {
	return pgsid.DateOf(time.Date(year, month, date, 0, 0, 0, 0, time.UTC))
}

func pointer[T any](value T) *T { return &value }

func TestOuterJoinedCases(t *testing.T) {
	ctx := context.Background()
	q := connect(t, ctx)
	rows, err := q.ListAccountPayments(ctx)
	if err != nil {
		t.Fatal(err)
	}
	want := []ListAccountPaymentsP{
		ListAccountPaymentsPPaid{PaymentId: 10, PaidAt: day(2026, 1, 2)},
		ListAccountPaymentsPOther{PaymentId: 11, Kind: public.PayKindPending},
		ListAccountPaymentsPOther{PaymentId: 12, Kind: public.PayKindRefunded},
		ListAccountPaymentsPAbsent{},
	}
	if len(rows) != len(want) {
		t.Fatalf("read %d rows", len(rows))
	}
	for index, row := range rows {
		if row.P != want[index] {
			t.Errorf("row %d: %#v, want %#v", index, row.P, want[index])
		}
	}
	if rows[3].Id != 3 || rows[3].Name != "cat" {
		t.Errorf("flat columns read as %#v", rows[3])
	}
}

func TestIndependentJoins(t *testing.T) {
	ctx := context.Background()
	q := connect(t, ctx)
	rows, err := q.ListAccountTrails(ctx)
	if err != nil {
		t.Fatal(err)
	}
	type trail struct {
		P ListAccountTrailsP
		N ListAccountTrailsN
	}
	want := []trail{
		{ListAccountTrailsPPresent{PaymentId: 10, Kind: public.PayKindPaid}, ListAccountTrailsNPresent{NoteId: 100, Body: "first"}},
		{ListAccountTrailsPPresent{PaymentId: 11, Kind: public.PayKindPending}, ListAccountTrailsNPresent{NoteId: 101, Body: "second"}},
		{ListAccountTrailsPPresent{PaymentId: 12, Kind: public.PayKindRefunded}, ListAccountTrailsNAbsent{}},
		{ListAccountTrailsPAbsent{}, ListAccountTrailsNAbsent{}},
	}
	if len(rows) != len(want) {
		t.Fatalf("read %d rows", len(rows))
	}
	for index, row := range rows {
		if (trail{row.P, row.N}) != want[index] {
			t.Errorf("row %d: %#v %#v, want %#v", index, row.P, row.N, want[index])
		}
	}
}

// A joined side that is itself a join is one group, holding both relations' columns.
func TestJoinedJoin(t *testing.T) {
	ctx := context.Background()
	q := connect(t, ctx)
	rows, err := q.ListAccountNotes(ctx)
	if err != nil {
		t.Fatal(err)
	}
	want := []ListAccountNotesP{
		ListAccountNotesPPaid{PaymentId: 10, PaidAt: day(2026, 1, 2), Body: "first"},
		ListAccountNotesPOther{PaymentId: 11, Kind: public.PayKindPending, Body: "second"},
		ListAccountNotesPAbsent{},
		ListAccountNotesPAbsent{},
	}
	if len(rows) != len(want) {
		t.Fatalf("read %d rows", len(rows))
	}
	for index, row := range rows {
		if row.P != want[index] {
			t.Errorf("row %d: %#v, want %#v", index, row.P, want[index])
		}
	}
}

func TestDiscriminants(t *testing.T) {
	ctx := context.Background()
	q := connect(t, ctx)
	payments, err := q.ListPayments(ctx)
	if err != nil || len(payments) != 3 {
		t.Fatalf("%#v, %v", payments, err)
	}
	if payments[0].Payments != (ListPaymentsPaymentsPaid{PaidAt: day(2026, 1, 2)}) || payments[2].Payments != (ListPaymentsPaymentsOther{Kind: public.PayKindRefunded}) {
		t.Errorf("payments read as %#v", payments)
	}
	email, err := q.GetContact(ctx, GetContactParams{Id: pointer(int32(1))})
	if err != nil || email.Contacts != (GetContactContactsEmail{Email: "a@x"}) {
		t.Errorf("contact 1 read as %#v, %v", email, err)
	}
	phone, err := q.GetContact(ctx, GetContactParams{Id: pointer(int32(2))})
	if err != nil || phone.Contacts != (GetContactContactsPhone{Phone: "555"}) {
		t.Errorf("contact 2 read as %#v, %v", phone, err)
	}
	banned, err := q.GetLevel(ctx, GetLevelParams{Id: pointer(int32(1))})
	if err != nil || banned.Levels != (GetLevelLevelsLevelMinus1{Reason: "banned"}) {
		t.Errorf("level 1 read as %#v, %v", banned, err)
	}
	other, err := q.GetLevel(ctx, GetLevelParams{Id: pointer(int32(2))})
	if err != nil || other.Levels != (GetLevelLevelsOther{Level: 3}) {
		t.Errorf("level 2 read as %#v, %v", other, err)
	}
	active, err := q.GetFlag(ctx, GetFlagParams{Id: pointer(int32(1))})
	if err != nil || active.Flags != (GetFlagFlagsActiveTrue{Since: day(2026, 1, 1)}) {
		t.Errorf("flag 1 read as %#v, %v", active, err)
	}
	inactive, err := q.GetFlag(ctx, GetFlagParams{Id: pointer(int32(2))})
	if err != nil || inactive.Flags != (GetFlagFlagsActiveFalse{}) {
		t.Errorf("flag 2 read as %#v, %v", inactive, err)
	}
}

// Two case groups of one table are named by their discriminants; under an outer join the present
// member holds both.
func TestSeveralCaseGroups(t *testing.T) {
	ctx := context.Background()
	q := connect(t, ctx)
	shipments, err := q.ListShipments(ctx)
	if err != nil || len(shipments) != 2 {
		t.Fatalf("%#v, %v", shipments, err)
	}
	if shipments[0].Kind != (ListShipmentsKindPaid{SentAt: day(2026, 2, 3)}) || shipments[0].Paid != (ListShipmentsPaidPaidTrue{Receipt: "r-1"}) {
		t.Errorf("shipment 20 read as %#v", shipments[0])
	}
	if shipments[1].Kind != (ListShipmentsKindOther{Kind: public.PayKindPending}) || shipments[1].Paid != (ListShipmentsPaidPaidFalse{}) {
		t.Errorf("shipment 21 read as %#v", shipments[1])
	}
	rows, err := q.ListAccountShipments(ctx)
	if err != nil || len(rows) != 3 {
		t.Fatalf("%#v, %v", rows, err)
	}
	present, ok := rows[0].S.(ListAccountShipmentsSPresent)
	if !ok || present.ShipmentId != 20 || present.Kind != (ListAccountShipmentsSPresentKindPaid{SentAt: day(2026, 2, 3)}) || present.Paid != (ListAccountShipmentsSPresentPaidPaidTrue{Receipt: "r-1"}) {
		t.Errorf("account 1 read as %#v", rows[0].S)
	}
	if rows[2].S != (ListAccountShipmentsSAbsent{}) {
		t.Errorf("account 3 read as %#v", rows[2].S)
	}
}
`

const goBinary = process.env['PGSID_GO_BINARY'] ?? 'go'
const goAvailable = spawnSync(goBinary, ['version'], { encoding: 'utf8' }).status === 0

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-go-groups-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/groups.sql'), queries)
  await writeFile(
    join(root, 'pgsid.yaml'),
    `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    go:
      driver: pgx
      schema: { outDir: generated/go/schema }
      queries:
        out:
          queries: generated/go/queries
`,
  )
  await writeGoModule(root, 'example.com/pgsid-groups')
  db = await PGlite.create()
  await db.exec(schema + seed)
  server = await servePglite(db)
}, 120_000)

afterAll(async () => {
  await server?.close()
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

it.skipIf(!goAvailable)(
  'reads each row group as the member its columns say',
  async () => {
    const update = await buildProject({ baseDirectory: root })
    expect(update.state.diagnostics).toEqual([])
    await writeFile(join(root, 'generated/go/queries/groups/groups_test.go'), goTest)
    const result = await promisify(execFile)(
      goBinary,
      ['test', '-count=1', '-mod=readonly', './generated/...'],
      {
        cwd: root,
        env: {
          ...process.env,
          GOCACHE: join(sharedTempDirectory, 'pgsid-codegen-go-cache'),
          GOTOOLCHAIN: 'local',
          PGSID_GO_TEST_DATABASE_URL: `postgres://postgres@127.0.0.1:${server.port}/postgres?sslmode=disable`,
        },
        timeout: 240_000,
      },
    ).catch((error: { stdout?: string; stderr?: string }) => {
      throw new Error(`Go tests failed:\n${error.stdout}\n${error.stderr}`, { cause: error })
    })
    expect(result.stdout).toContain('ok')
  },
  300_000,
)
