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

const schema = `CREATE TYPE mood AS ENUM ('calm', 'tense', 'two words');
CREATE TYPE pair AS (left_side integer, label text);
CREATE DOMAIN positive AS integer CHECK (VALUE > 0);
CREATE DOMAIN nested_positive AS positive;
CREATE TABLE things (
  id integer PRIMARY KEY, feeling mood, couple pair, amount positive, nested nested_positive,
  instant timestamptz, local timestamp, day date, gap interval, span int4range, stamps tstzrange,
  many int4multirange, doc jsonb, plain json, items integer[], words text[], flag boolean NOT NULL DEFAULT false
);
`

// The generated schema module against the server through tokio-postgres: each value is written
// through its generated type, compared with the server's own text for it, read back into the
// generated row, and written again to store the same.
const main = `mod db;

use chrono::{NaiveDate, TimeZone, Utc};
use db::pgsid::{Bound, Date, Interval, Json, Multirange, Range, Timestamp, Timestamptz};
use db::public::{Mood, NestedPositive, Pair, Positive, Things};

const COLUMNS: &str = "id, feeling, couple, amount, nested, instant, local, day, gap, span, stamps, many, doc, plain, items, words, flag";

async fn texts(client: &tokio_postgres::Client, id: i32) -> Vec<Option<String>> {
    let row = client
        .query_one(
            "SELECT feeling::text, couple::text, amount::text, nested::text, instant::text, local::text, day::text, gap::text, span::text, stamps::text, many::text, doc::text, plain::text, items::text, words::text FROM things WHERE id = $1",
            &[&id],
        )
        .await
        .unwrap();
    (0..row.len()).map(|index| row.get(index)).collect()
}

async fn insert(client: &tokio_postgres::Client, row: &Things) {
    client
        .execute(
            &format!("INSERT INTO things ({COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)"),
            &[
                &row.id, &row.feeling, &row.couple, &row.amount, &row.nested, &row.instant, &row.local, &row.day, &row.gap,
                &row.span, &row.stamps, &row.many, &row.doc, &row.plain, &row.items, &row.words, &row.flag,
            ],
        )
        .await
        .unwrap();
}

async fn read(client: &tokio_postgres::Client, id: i32) -> Things {
    let row = client.query_one(&format!("SELECT {COLUMNS} FROM things WHERE id = $1"), &[&id]).await.unwrap();
    Things::from_row(&row).unwrap()
}

#[tokio::main]
async fn main() {
    let url = std::env::var("PGSID_RUST_TEST_DATABASE_URL").unwrap();
    let (client, connection) = tokio_postgres::connect(&url, tokio_postgres::NoTls).await.unwrap();
    tokio::spawn(async move { connection.await.unwrap() });
    client.batch_execute("SET TimeZone = 'UTC'; SET DateStyle = 'ISO, YMD'; SET IntervalStyle = 'postgres'").await.unwrap();
    let instant = Utc.with_ymd_and_hms(2026, 3, 1, 12, 30, 45).unwrap() + chrono::Duration::microseconds(123456);
    let day = NaiveDate::from_ymd_opt(2026, 3, 1).unwrap();
    let cases = vec![
        (
            Things {
                id: 1,
                feeling: Some(Mood::TwoWords),
                couple: Some(Pair { left_side: Some(7), label: Some("a, \\"b\\"".to_owned()) }),
                amount: Some(Positive(5)),
                nested: Some(NestedPositive(Positive(6))),
                instant: Some(Timestamptz::Finite(instant)),
                local: Some(Timestamp::Finite(instant.naive_utc())),
                day: Some(Date::Finite(day)),
                gap: Some(Interval::Finite { months: 14, days: -3, microseconds: 3_600_000_001 }),
                span: Some(Range::Bounds { lower: Bound::Excluded(1), upper: Bound::Included(9) }),
                stamps: Some(Range::Bounds { lower: Bound::Included(Timestamptz::NegInfinity), upper: Bound::Unbounded }),
                many: Some(Multirange(vec![
                    Range::Bounds { lower: Bound::Included(5), upper: Bound::Excluded(9) },
                    Range::Bounds { lower: Bound::Included(1), upper: Bound::Excluded(6) },
                    Range::Empty,
                ])),
                doc: Some(Json::from_text("{\\"b\\": [1, 2.50], \\"a\\": null}").unwrap()),
                plain: Some(Json::from_text("{\\"b\\":1,  \\"b\\":2}").unwrap()),
                items: Some(vec![Some(1), None, Some(3)]),
                words: Some(vec![Some("with space".to_owned()), Some("".to_owned()), None]),
                flag: true,
            },
            vec![
                Some("two words"), Some("(7,\\"a, \\"\\"b\\"\\"\\")"), Some("5"), Some("6"),
                Some("2026-03-01 12:30:45.123456+00"), Some("2026-03-01 12:30:45.123456"), Some("2026-03-01"),
                Some("1 year 2 mons -3 days +01:00:00.000001"), Some("[2,10)"), Some("[-infinity,)"),
                Some("{[1,9)}"), Some("{\\"a\\": null, \\"b\\": [1, 2.50]}"), Some("{\\"b\\":1,  \\"b\\":2}"),
                Some("{1,NULL,3}"), Some("{\\"with space\\",\\"\\",NULL}"),
            ],
        ),
        (
            Things {
                id: 2,
                feeling: None, couple: Some(Pair { left_side: None, label: None }), amount: None, nested: None,
                instant: Some(Timestamptz::Infinity), local: Some(Timestamp::NegInfinity), day: Some(Date::Infinity),
                gap: Some(Interval::NegInfinity), span: Some(Range::Empty), stamps: None, many: Some(Multirange(vec![])),
                doc: Some(Json::from_text("null").unwrap()), plain: None, items: Some(vec![]), words: None, flag: false,
            },
            vec![
                None, Some("(,)"), None, None, Some("infinity"), Some("-infinity"), Some("infinity"), Some("-infinity"),
                Some("empty"), None, Some("{}"), Some("null"), None, Some("{}"), None,
            ],
        ),
    ];
    let mut failures = 0;
    for (row, expected) in cases {
        insert(&client, &row).await;
        let stored = texts(&client, row.id).await;
        let expected: Vec<Option<String>> = expected.into_iter().map(|text| text.map(str::to_owned)).collect();
        if stored != expected {
            eprintln!("row {} stored {:?}\\n expected {:?}", row.id, stored, expected);
            failures += 1;
        }
        let back = read(&client, row.id).await;
        let again = Things { id: row.id + 100, ..back.clone() };
        insert(&client, &again).await;
        if texts(&client, again.id).await != stored {
            eprintln!("row {} read back as {:?}", row.id, back);
            failures += 1;
        }
    }
    // Reads are the server's canonical form, and a JSON null document is not SQL NULL.
    let back = read(&client, 1).await;
    if back.span != Some(Range::Bounds { lower: Bound::Included(2), upper: Bound::Excluded(10) }) {
        eprintln!("canonical span read as {:?}", back.span);
        failures += 1;
    }
    if back.doc.as_ref().map(|doc| doc.value().unwrap()) != Some(serde_json::json!({"a": null, "b": [1, 2.5]})) {
        eprintln!("document decodes as {:?}", back.doc);
        failures += 1;
    }
    if read(&client, 2).await.doc.map(|doc| doc.text().to_owned()) != Some("null".to_owned()) {
        eprintln!("a JSON null document read as SQL NULL");
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
  root = await mkdtemp(join(tmpdir(), 'pgsid-rust-values-'))
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
  'writes and reads the generated Rust types through tokio-postgres as the server stores them',
  async () => {
    await writeRustCrate(root)
    await writeFile(join(root, 'schema.sql'), schema)
    await writeFile(
      join(root, 'pgsid.yaml'),
      'schema: schema.sql\nsql:\n  codegen:\n    rust:\n      schema: { outDir: src/db }\n',
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
