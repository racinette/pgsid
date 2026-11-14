import { afterAll, beforeAll, expect, it } from 'vitest'
import { execFile, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'
import { servePglite } from '../support/pglite-server.js'
import { writeRustCrate } from '../support/rust-crate.js'
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
CREATE TABLE plans (id int PRIMARY KEY, tier text NOT NULL CHECK (tier IN ('free', 'pro')), price numeric NOT NULL,
  note text, CHECK ((tier = 'pro') = (note IS NOT NULL)));
CREATE TABLE grids (id int PRIMARY KEY, cells int[], wide int[]);
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
-- name: AddPlan :exec
INSERT INTO plans (id, tier, price, note) VALUES (@id, @tier, @price, @note);
-- name: ListPlans :many
SELECT id, tier, price FROM plans ORDER BY id;
-- name: RaisePrices :execrows
UPDATE plans SET price = price * @factor WHERE tier = @tier;
-- name: AddGrid :exec
INSERT INTO grids (id, cells, wide) VALUES (@id, @cells, @wide);
-- name: GetGrid :one
SELECT cells, wide FROM grids WHERE id = @id;
`

// The generated query functions against the server through tokio-postgres: each group of a row
// is one field holding the variant its columns say the row is, carrying only the columns its rows
// can hold; parameters and rows keep the types the schema's values have.
const main = `mod db;
mod queries {
    pub mod groups;
}

use chrono::NaiveDate;
use db::pgsid::{Array1Or2, Date, Numeric, D2};
use db::public::PayKind;
use queries::groups::*;

fn day(year: i32, month: u32, date: u32) -> Date {
    Date::Finite(NaiveDate::from_ymd_opt(year, month, date).unwrap())
}

macro_rules! check {
    ($failures:ident, $got:expr, $want:expr) => {
        let got = $got;
        let want = $want;
        if got != want {
            eprintln!("{}: {:?}, want {:?}", stringify!($got), got, want);
            $failures += 1;
        }
    };
}

#[tokio::main]
async fn main() {
    let url = std::env::var("PGSID_RUST_TEST_DATABASE_URL").unwrap();
    let (client, connection) = tokio_postgres::connect(&url, tokio_postgres::NoTls).await.unwrap();
    tokio::spawn(async move { connection.await.unwrap() });
    let mut failures = 0;

    let rows = list_account_payments(&client).await.unwrap();
    check!(failures, rows.iter().map(|row| row.p.clone()).collect::<Vec<_>>(), vec![
        ListAccountPaymentsP::Paid { payment_id: 10, paid_at: day(2026, 1, 2) },
        ListAccountPaymentsP::Other { payment_id: 11, kind: PayKind::Pending },
        ListAccountPaymentsP::Other { payment_id: 12, kind: PayKind::Refunded },
        ListAccountPaymentsP::Absent,
    ]);
    check!(failures, (rows[3].id, rows[3].name.as_str()), (3, "cat"));

    // Independent outer joins are groups of their own.
    let rows = list_account_trails(&client).await.unwrap();
    check!(failures, rows.iter().map(|row| (row.p.clone(), row.n.clone())).collect::<Vec<_>>(), vec![
        (ListAccountTrailsP::Present { payment_id: 10, kind: PayKind::Paid }, ListAccountTrailsN::Present { note_id: 100, body: "first".to_owned() }),
        (ListAccountTrailsP::Present { payment_id: 11, kind: PayKind::Pending }, ListAccountTrailsN::Present { note_id: 101, body: "second".to_owned() }),
        (ListAccountTrailsP::Present { payment_id: 12, kind: PayKind::Refunded }, ListAccountTrailsN::Absent),
        (ListAccountTrailsP::Absent, ListAccountTrailsN::Absent),
    ]);

    // A joined side that is itself a join is one group holding both relations' columns.
    let rows = list_account_notes(&client).await.unwrap();
    check!(failures, rows.iter().map(|row| row.p.clone()).collect::<Vec<_>>(), vec![
        ListAccountNotesP::Paid { payment_id: 10, paid_at: day(2026, 1, 2), body: "first".to_owned() },
        ListAccountNotesP::Other { payment_id: 11, kind: PayKind::Pending, body: "second".to_owned() },
        ListAccountNotesP::Absent,
        ListAccountNotesP::Absent,
    ]);

    let payments = list_payments(&client).await.unwrap();
    check!(failures, payments.iter().map(|row| row.payments.clone()).collect::<Vec<_>>(), vec![
        ListPaymentsPayments::Paid { paid_at: day(2026, 1, 2) },
        ListPaymentsPayments::Other { kind: PayKind::Pending },
        ListPaymentsPayments::Other { kind: PayKind::Refunded },
    ]);
    let contact = |id| GetContactParams { id: Some(id) };
    check!(failures, get_contact(&client, &contact(1)).await.unwrap().map(|row| row.contacts), Some(GetContactContacts::Email { email: "a@x".to_owned() }));
    check!(failures, get_contact(&client, &contact(2)).await.unwrap().map(|row| row.contacts), Some(GetContactContacts::Phone { phone: "555".to_owned() }));
    check!(failures, get_contact(&client, &contact(9)).await.unwrap(), None);
    let level = |id| GetLevelParams { id: Some(id) };
    check!(failures, get_level(&client, &level(1)).await.unwrap().map(|row| row.levels), Some(GetLevelLevels::LevelMinus1 { reason: "banned".to_owned() }));
    check!(failures, get_level(&client, &level(2)).await.unwrap().map(|row| row.levels), Some(GetLevelLevels::Other { level: 3 }));
    let flag = |id| GetFlagParams { id: Some(id) };
    check!(failures, get_flag(&client, &flag(1)).await.unwrap().map(|row| row.flags), Some(GetFlagFlags::ActiveTrue { since: day(2026, 1, 1) }));
    check!(failures, get_flag(&client, &flag(2)).await.unwrap().map(|row| row.flags), Some(GetFlagFlags::ActiveFalse));

    // Two case groups of one table are named by their discriminants; under an outer join the
    // present variant holds both.
    let shipments = list_shipments(&client).await.unwrap();
    check!(failures, shipments.iter().map(|row| (row.kind.clone(), row.paid.clone())).collect::<Vec<_>>(), vec![
        (ListShipmentsKind::Paid { sent_at: day(2026, 2, 3) }, ListShipmentsPaid::PaidTrue { receipt: "r-1".to_owned() }),
        (ListShipmentsKind::Other { kind: PayKind::Pending }, ListShipmentsPaid::PaidFalse),
    ]);
    let rows = list_account_shipments(&client).await.unwrap();
    check!(failures, rows.iter().map(|row| row.s.clone()).collect::<Vec<_>>(), vec![
        ListAccountShipmentsS::Present {
            shipment_id: 20,
            kind: ListAccountShipmentsSPresentKind::Paid { sent_at: day(2026, 2, 3) },
            paid: ListAccountShipmentsSPresentPaid::PaidTrue { receipt: "r-1".to_owned() },
        },
        ListAccountShipmentsS::Present {
            shipment_id: 21,
            kind: ListAccountShipmentsSPresentKind::Other { kind: PayKind::Pending },
            paid: ListAccountShipmentsSPresentPaid::PaidFalse,
        },
        ListAccountShipmentsS::Absent,
    ]);

    // Writes and counts, and a column whose CHECKs admit only some literals read as their enum.
    let price = |text: &str| Numeric::parse(text).unwrap();
    add_plan(&client, &AddPlanParams { id: 1, tier: "free".to_owned(), price: price("0"), note: None }).await.unwrap();
    add_plan(&client, &AddPlanParams { id: 2, tier: "pro".to_owned(), price: price("9.50"), note: Some("support".to_owned()) }).await.unwrap();
    let raised = raise_prices(&client, &RaisePricesParams { factor: price("2"), tier: Some("pro".to_owned()) }).await.unwrap();
    check!(failures, raised, 1);
    let plans = list_plans(&client).await.unwrap();
    check!(failures, plans.iter().map(|row| (row.id, row.tier, row.price.to_string())).collect::<Vec<_>>(), vec![
        (1, ListPlansTier::Free, "0".to_owned()),
        (2, ListPlansTier::Pro, "19.00".to_owned()),
    ]);

    // Arrays take the dimension counts their columns declare.
    add_grid(&client, &AddGridParams { id: 1, cells: Some(Array1Or2::D2(vec![vec![Some(1), Some(2)], vec![Some(3), None]])), wide: Some(D2(vec![vec![Some(4)]])) }).await.unwrap();
    check!(failures, get_grid(&client, &GetGridParams { id: Some(1) }).await.unwrap(), Some(GetGridRow {
        cells: Some(Array1Or2::D2(vec![vec![Some(1), Some(2)], vec![Some(3), None]])),
        wide: Some(D2(vec![vec![Some(4)]])),
    }));

    // A row the CHECKs refuse is the server's error. The test server serves nothing after an error,
    // so this comes last.
    match add_plan(&client, &AddPlanParams { id: 3, tier: "pro".to_owned(), price: price("1"), note: None }).await {
        Err(db::pgsid::QueryError::Database(error)) if error.code() == Some(&tokio_postgres::error::SqlState::CHECK_VIOLATION) => {}
        other => {
            eprintln!("a row the CHECKs refuse was stored: {other:?}");
            failures += 1;
        }
    }

    if failures > 0 {
        std::process::exit(1);
    }
    println!("ok");
}
`

const cargo = process.env['PGSID_CARGO_BINARY'] ?? 'cargo'
const cargoAvailable = spawnSync(cargo, ['--version'], { encoding: 'utf8' }).status === 0

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-rust-queries-'))
  db = await PGlite.create()
  await db.exec(schema + seed)
  server = await servePglite(db)
}, 120_000)

afterAll(async () => {
  await server?.close()
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

it.skipIf(!cargoAvailable)(
  'runs generated queries through tokio-postgres and reads each row group as its variant',
  async () => {
    await writeRustCrate(root)
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
    rust:
      schema: { outDir: src/db }
      queries:
        out:
          queries: src/queries
      mappings:
        column:
          public.grids.cells: { dimensions: [1, 2] }
          public.grids.wide: { dimensions: 2 }
`,
    )
    const built = await buildProject({ baseDirectory: root })
    expect(built.state.diagnostics).toEqual([])
    await writeFile(join(root, 'src', 'main.rs'), main)
    const result = await promisify(execFile)(cargo, ['run', '--offline', '--quiet'], {
      cwd: root,
      env: {
        ...process.env,
        CARGO_TARGET_DIR: join(sharedTempDirectory, 'pgsid-cargo-target'),
        PGSID_RUST_TEST_DATABASE_URL: `postgres://postgres@127.0.0.1:${server.port}/postgres?sslmode=disable`,
      },
      timeout: 900_000,
      maxBuffer: 64 * 1024 * 1024,
    }).catch((error: { stdout?: string; stderr?: string }) => {
      throw new Error(`Rust run failed:\n${error.stdout}\n${error.stderr}`, { cause: error })
    })
    expect(result.stdout).toContain('ok')
  },
  1_000_000,
)
