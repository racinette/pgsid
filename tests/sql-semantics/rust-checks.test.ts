import { afterAll, beforeAll, expect, it } from 'vitest'
import { execFile, spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'
import { servePglite } from '../support/pglite-server.js'
import { writeRustCrate } from '../support/rust-crate.js'
import { sharedTempDirectory } from '../../tools/test-run-temp.js'

const schema = `CREATE DOMAIN positive AS int CHECK (VALUE > 0);
CREATE DOMAIN small AS positive CHECK (VALUE < 1000);
CREATE DOMAIN code AS text CHECK (VALUE IN ('a', 'b'));
CREATE DOMAIN present AS text CHECK (VALUE IS NOT NULL);
CREATE TYPE mood AS ENUM ('sad', 'ok', 'happy');
CREATE TABLE items (
  id int PRIMARY KEY,
  qty small,
  price numeric(6,2) CHECK (price >= 0),
  name varchar(5) CHECK (length(name) > 1),
  kind text NOT NULL CHECK (kind IN ('x', 'y')),
  label code,
  note present,
  at date CHECK (at > '2000-01-01'),
  stamp timestamptz CHECK (stamp < '2100-01-01 00:00:00+00'),
  span interval CHECK (span > '0'),
  ratio float8 CHECK (ratio <> 'NaN'),
  flag bool,
  feeling mood CHECK (feeling <> 'sad'),
  host inet CHECK (family(host) = 4),
  doc jsonb CHECK (doc ? 'k'),
  big int8 CHECK (big < 100),
  spot point CHECK ((spot <-> point '(0,0)') < 10),
  ident uuid CHECK (ident <> '00000000-0000-0000-0000-000000000000'),
  bytes bytea CHECK (length(bytes) < 4),
  CHECK (flag OR qty > 5),
  CHECK (name IS NOT NULL OR kind = 'x')
);
CREATE TYPE pair AS (n int, label varchar(3), p positive);
CREATE TABLE boxes (
  id int PRIMARY KEY,
  nums int[] CHECK (cardinality(nums) < 4),
  grid int[] CHECK (array_ndims(grid) = 2),
  either int[] CHECK (cardinality(either) < 3),
  pos positive[] CHECK (cardinality(pos) < 9),
  span int4range CHECK (NOT isempty(span)),
  days daterange CHECK (lower(days) > '2000-01-01'),
  many int4multirange CHECK (many <> '{}'),
  couple pair CHECK ((couple).n > 0),
  couples pair[] CHECK (cardinality(couples) < 3),
  moods mood[] CHECK (moods[1] <> 'sad'),
  vec int2vector CHECK (vec[0] > 0),
  labels varchar(2)[] CHECK (cardinality(labels) < 5)
);
`

// Every row is evaluated by the generated CHECK API, then inserted: a row the evaluation refuses
// must fail on the server with the same SQLSTATE, and one it accepts must be stored. A check
// left undecided would compare nothing, so none may be.
const main = `mod db;

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

use chrono::{NaiveDate, TimeZone, Utc};
use db::pgsid::*;
use db::public::*;

const COLUMNS: &str = "id, qty, price, name, kind, label, note, at, stamp, span, ratio, flag, feeling, host, doc, big, spot, ident, bytes";

fn base(id: i32) -> Items {
    Items {
        id,
        qty: Some(Small(Positive(10))),
        price: Some(Numeric::parse("1.50").unwrap()),
        name: Some("abc".to_owned()),
        kind: ItemsKind::Y,
        label: Some(Code::A),
        note: Some(Present("n".to_owned())),
        at: Some(Date::Finite(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap())),
        stamp: Some(Timestamptz::Finite(Utc.with_ymd_and_hms(2026, 5, 6, 7, 8, 9).unwrap())),
        span: Some(Interval::Finite { months: 0, days: 1, microseconds: 0 }),
        ratio: Some(0.5),
        flag: Some(true),
        feeling: Some(Mood::Happy),
        host: Some(Inet { address: IpAddr::V4(Ipv4Addr::new(10, 0, 0, 1)), prefix: 32 }),
        doc: Some(Json::from_text(r#"{"k": 1}"#).unwrap()),
        big: Some(5),
        spot: Some(Point { x: 1.0, y: 2.0 }),
        ident: Some(Uuid([1; 16])),
        bytes: Some(vec![1, 2]),
    }
}

#[tokio::main]
async fn main() {
    let url = std::env::var("PGSID_RUST_TEST_DATABASE_URL").unwrap();
    let (client, connection) = tokio_postgres::connect(&url, tokio_postgres::NoTls).await.unwrap();
    tokio::spawn(async move { connection.await.unwrap() });
    let cases: Vec<(&str, Items)> = vec![
        ("valid", base(1)),
        ("domain of a domain", Items { qty: Some(Small(Positive(0))), ..base(2) }),
        ("outer domain", Items { qty: Some(Small(Positive(5000))), ..base(3) }),
        ("NULL domain value", Items { note: None, ..base(4) }),
        ("negative price", Items { price: Some(Numeric::parse("-1").unwrap()), ..base(5) }),
        ("price beyond its precision", Items { price: Some(Numeric::parse("12345.5").unwrap()), ..base(6) }),
        ("price rounded by its scale", Items { price: Some(Numeric::parse("-0.001").unwrap()), ..base(7) }),
        ("short name", Items { name: Some("a".to_owned()), ..base(8) }),
        ("name beyond its length", Items { name: Some("abcdef".to_owned()), ..base(9) }),
        ("name padded beyond its length", Items { name: Some("abc     ".to_owned()), ..base(10) }),
        ("old date", Items { at: Some(Date::Finite(NaiveDate::from_ymd_opt(1999, 1, 1).unwrap())), ..base(11) }),
        ("infinite date", Items { at: Some(Date::Infinity), ..base(12) }),
        ("late stamp", Items { stamp: Some(Timestamptz::Finite(Utc.with_ymd_and_hms(2100, 1, 1, 0, 0, 0).unwrap())), ..base(13) }),
        ("empty span", Items { span: Some(Interval::Finite { months: 0, days: 0, microseconds: 0 }), ..base(14) }),
        ("NaN ratio", Items { ratio: Some(f64::NAN), ..base(15) }),
        ("sad", Items { feeling: Some(Mood::Sad), ..base(16) }),
        ("IPv6 host", Items { host: Some(Inet { address: IpAddr::V6(Ipv6Addr::LOCALHOST), prefix: 128 }), ..base(17) }),
        ("document without the key", Items { doc: Some(Json::from_text(r#"{"j": 1}"#).unwrap()), ..base(18) }),
        ("big", Items { big: Some(100), ..base(19) }),
        ("distant spot", Items { spot: Some(Point { x: 20.0, y: 0.0 }), ..base(20) }),
        ("zero uuid", Items { ident: Some(Uuid([0; 16])), ..base(21) }),
        ("long bytes", Items { bytes: Some(vec![0; 4]), ..base(22) }),
        ("flag off, few", Items { flag: Some(false), qty: Some(Small(Positive(3))), ..base(23) }),
        ("flag NULL, few", Items { flag: None, qty: Some(Small(Positive(3))), ..base(24) }),
        ("no name, kind y", Items { name: None, ..base(25) }),
        ("no name, kind x", Items { name: None, kind: ItemsKind::X, ..base(26) }),
        ("all NULL", Items { qty: None, price: None, name: None, label: None, at: None, stamp: None, span: None, ratio: None, flag: None, feeling: None, host: None, doc: None, big: None, spot: None, ident: None, bytes: None, kind: ItemsKind::X, ..base(27) }),
    ];
    let mut failures = 0;
    for (name, row) in cases {
        let evaluations = ItemsCheckInput::from(&row).evaluate();
        if let Some(undecided) = evaluations.iter().find(|evaluation| matches!(evaluation.result, CheckResult::Undecided { .. })) {
            eprintln!("{name}: {undecided:?}");
            failures += 1;
            continue;
        }
        let expected = validate_checks(evaluations.clone()).err();
        let placeholders = (1..=19).map(|index| format!("\${index}")).collect::<Vec<_>>().join(", ");
        let stored = client
            .execute(
                &format!("INSERT INTO items ({COLUMNS}) VALUES ({placeholders})"),
                &[&row.id, &row.qty, &row.price, &row.name, &row.kind, &row.label, &row.note, &row.at, &row.stamp, &row.span, &row.ratio, &row.flag, &row.feeling, &row.host, &row.doc, &row.big, &row.spot, &row.ident, &row.bytes],
            )
            .await;
        let server = stored.as_ref().err().and_then(|error| error.code()).map(|code| code.code().to_owned());
        if expected.as_ref().map(|error| error.sqlstate().to_owned()) != server {
            eprintln!("{name}: evaluated {expected:?} from {evaluations:?}, the server answered {stored:?}");
            failures += 1;
        }
    }
    let day = |year, month, date| Date::Finite(NaiveDate::from_ymd_opt(year, month, date).unwrap());
    let pair = |n: i32, label: &str, p: i32| Pair { n: Some(n), label: Some(label.to_owned()), p: Some(Positive(p)) };
    let full = |id: i32| Boxes {
        id,
        nums: Some(vec![Some(1), None]),
        grid: Some(D2(vec![vec![Some(1), Some(2)], vec![Some(3), Some(4)]])),
        either: Some(Array1Or2::D1(vec![Some(1)])),
        pos: Some(vec![Some(Positive(2)), None]),
        span: Some(Range::Bounds { lower: Bound::Included(1), upper: Bound::Excluded(5) }),
        days: Some(Range::Bounds { lower: Bound::Included(day(2020, 1, 1)), upper: Bound::Unbounded }),
        many: Some(Multirange(vec![Range::Bounds { lower: Bound::Included(1), upper: Bound::Excluded(3) }])),
        couple: Some(pair(1, "abc", 1)),
        couples: Some(vec![Some(pair(1, "a", 2)), None]),
        moods: Some(vec![Some(Mood::Happy)]),
        vec: Some(vec![1, 2]),
        labels: Some(vec![Some("ab".to_owned()), None]),
    };
    let containers: Vec<(&str, Boxes)> = vec![
        ("valid containers", full(1)),
        ("long array", Boxes { nums: Some(vec![Some(1); 4]), ..full(2) }),
        ("empty array", Boxes { nums: Some(vec![]), ..full(3) }),
        ("two dimensions declared either way", Boxes { either: Some(Array1Or2::D2(vec![vec![Some(1)], vec![Some(2)], vec![Some(3)]])), ..full(4) }),
        ("domain element outside its CHECK", Boxes { pos: Some(vec![Some(Positive(0))]), ..full(5) }),
        ("empty range", Boxes { span: Some(Range::Bounds { lower: Bound::Included(3), upper: Bound::Excluded(3) }), ..full(6) }),
        ("explicitly empty range", Boxes { span: Some(Range::Empty), ..full(7) }),
        ("reversed range", Boxes { span: Some(Range::Bounds { lower: Bound::Included(5), upper: Bound::Included(1) }), ..full(8) }),
        ("early days", Boxes { days: Some(Range::Bounds { lower: Bound::Excluded(day(1999, 12, 31)), upper: Bound::Unbounded }), ..full(9) }),
        ("canonical lower bound", Boxes { days: Some(Range::Bounds { lower: Bound::Excluded(day(2000, 1, 1)), upper: Bound::Unbounded }), ..full(10) }),
        ("empty multirange", Boxes { many: Some(Multirange(vec![Range::Empty])), ..full(11) }),
        ("label beyond its length in a record", Boxes { couple: Some(pair(1, "abcd", 1)), ..full(12) }),
        ("domain field outside its CHECK", Boxes { couple: Some(pair(1, "a", 0)), ..full(13) }),
        ("non-positive record", Boxes { couple: Some(pair(0, "a", 1)), ..full(14) }),
        ("NULL record field", Boxes { couple: Some(Pair { n: None, label: None, p: None }), ..full(15) }),
        ("many records", Boxes { couples: Some(vec![None, None, None]), ..full(16) }),
        ("domain field in an array of records", Boxes { couples: Some(vec![Some(pair(1, "a", -1))]), ..full(17) }),
        ("sad first", Boxes { moods: Some(vec![Some(Mood::Sad), Some(Mood::Ok)]), ..full(18) }),
        ("vector from zero", Boxes { vec: Some(vec![0, 1]), ..full(19) }),
        ("element beyond its length", Boxes { labels: Some(vec![Some("abc".to_owned())]), ..full(20) }),
        ("element padded to its length", Boxes { labels: Some(vec![Some("ab  ".to_owned())]), ..full(21) }),
    ];
    for (name, row) in containers {
        let evaluations = BoxesCheckInput::from(&row).evaluate();
        if let Some(undecided) = evaluations.iter().find(|evaluation| matches!(evaluation.result, CheckResult::Undecided { .. })) {
            eprintln!("{name}: {undecided:?}");
            failures += 1;
            continue;
        }
        let expected = validate_checks(evaluations.clone()).err();
        let stored = client
            .execute(
                "INSERT INTO boxes (id, nums, grid, either, pos, span, days, many, couple, couples, moods, vec, labels) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
                &[&row.id, &row.nums, &row.grid, &row.either, &row.pos, &row.span, &row.days, &row.many, &row.couple, &row.couples, &row.moods, &row.vec, &row.labels],
            )
            .await;
        let server = stored.as_ref().err().and_then(|error| error.code()).map(|code| code.code().to_owned());
        if expected.as_ref().map(|error| error.sqlstate().to_owned()) != server {
            eprintln!("{name}: evaluated {expected:?} from {evaluations:?}, the server answered {stored:?}");
            failures += 1;
        }
    }
    // A column not given leaves undecided only the checks that read it.
    let partial = ItemsCheckInput { big: CheckValue::Value(200), ..Default::default() }.evaluate();
    let big = partial.iter().find(|evaluation| evaluation.constraint == "items_big_check").map(|evaluation| &evaluation.result);
    let price = partial.iter().find(|evaluation| evaluation.constraint == "items_price_check").map(|evaluation| &evaluation.result);
    if big != Some(&CheckResult::False) || !matches!(price, Some(CheckResult::Undecided { .. })) {
        eprintln!("partial input evaluated as {partial:?}");
        failures += 1;
    }
    if Small(Positive(0)).validate_checks().map_err(|error| error.sqlstate().to_owned()) != Err("23514".to_owned()) {
        eprintln!("a domain value outside its CHECKs validated");
        failures += 1;
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
  root = await mkdtemp(join(tmpdir(), 'pgsid-rust-checks-'))
  db = await PGlite.create()
  await db.exec(schema)
  server = await servePglite(db)
}, 120_000)

afterAll(async () => {
  await server?.close()
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

it.skipIf(!cargoAvailable)(
  'evaluates table and domain CHECKs in Rust as the server does on insert',
  async () => {
    await writeRustCrate(root)
    await writeFile(join(root, 'schema.sql'), schema)
    await writeFile(
      join(root, 'pgsid.yaml'),
      'schema: schema.sql\nsql:\n  codegen:\n    rust:\n      schema: { outDir: src/db }\n      mappings:\n        column:\n          public.boxes.grid: { dimensions: 2 }\n          public.boxes.either: { dimensions: [1, 2] }\n',
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
