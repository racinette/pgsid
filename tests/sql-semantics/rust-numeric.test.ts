import { afterAll, beforeAll, expect, it } from 'vitest'
import { execFile, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'
import { servePglite } from '../support/pglite-server.js'
import { writeRustCrate } from '../support/rust-crate.js'
import { sharedTempDirectory } from '../../tools/test-run-temp.js'
import { buildRustNumericAsset } from '../../scripts/build-rust-numeric.js'

const schema = `CREATE TABLE amounts (id integer PRIMARY KEY, exact numeric, scaled numeric(10,3), list numeric[]);
`

// The generated Rust numeric against the server: every result of its arithmetic, and every error,
// is compared with what the server computes for the same operands, which the simple protocol
// sends as literals.
const main = `mod db;

use db::pgsid::{Numeric, NumericError};
use db::public::Amounts;
use tokio_postgres::SimpleQueryMessage;

async fn server(client: &tokio_postgres::Client, sql: &str) -> String {
    match client.simple_query(&format!("SELECT ({sql})::text")).await {
        Ok(messages) => messages
            .into_iter()
            .find_map(|message| match message {
                SimpleQueryMessage::Row(row) => Some(row.get(0).unwrap().to_owned()),
                _ => None,
            })
            .unwrap(),
        Err(error) => format!("error {}", error.code().unwrap().code()),
    }
}
fn local(value: Result<Numeric, NumericError>) -> String {
    match value {
        Ok(value) => value.to_string(),
        Err(error) => format!("error {}", error.code),
    }
}
fn literal(value: &Numeric) -> String {
    format!("'{value}'::numeric")
}

#[tokio::main]
async fn main() {
    let url = std::env::var("PGSID_RUST_TEST_DATABASE_URL").unwrap();
    let (client, connection) = tokio_postgres::connect(&url, tokio_postgres::NoTls).await.unwrap();
    tokio::spawn(async move { connection.await.unwrap() });
    let mut failures = 0;
    let pairs = [
        ("1.50", "2.25"), ("1", "3"), ("-7.5", "2"), ("NaN", "1"), ("Infinity", "-Infinity"), ("Infinity", "2"),
        ("1e10", "3.333"), ("0.0001", "12345.6789"), ("1", "0"), ("0", "0"),
        ("123456789012345678901234567890.123456789", "987654321.987654321"), ("-0.000", "5.0"),
    ];
    for (left, right) in pairs {
        let (a, b) = (Numeric::parse(left).unwrap(), Numeric::parse(right).unwrap());
        let (x, y) = (literal(&a), literal(&b));
        let cases: Vec<(String, String)> = vec![
            (local(a.add(&b)), format!("{x} + {y}")),
            (local(a.sub(&b)), format!("{x} - {y}")),
            (local(a.mul(&b)), format!("{x} * {y}")),
            (local(a.div(&b)), format!("{x} / {y}")),
            (local(a.rem(&b)), format!("{x} % {y}")),
            (local(a.round(2)), format!("round({x}, 2)")),
            (local(a.round(-1)), format!("round({x}, -1)")),
            (local(a.trunc(1)), format!("trunc({x}, 1)")),
            (a.neg().to_string(), format!("-{x}")),
            (a.abs().to_string(), format!("abs({x})")),
            (a.sign().to_string(), format!("sign({x})")),
            (format!("{}", match a.partial_cmp(&b).unwrap() { std::cmp::Ordering::Less => -1, std::cmp::Ordering::Equal => 0, std::cmp::Ordering::Greater => 1 }), format!("sign(numeric_cmp({x}, {y}))")),
            ((a == b).to_string(), format!("{x} = {y}")),
        ];
        for (got, sql) in cases {
            let want = server(&client, &sql).await;
            if got != want {
                eprintln!("{sql}: got {got}, the server {want}");
                failures += 1;
            }
        }
    }
    for text in ["1.500", " 42 ", "-0", "1e3", ".5", "NaN", "inf", "-Infinity", "abc", "1.2.3", "", "1e1000000"] {
        let want = server(&client, &format!("'{text}'::numeric")).await;
        let got = local(Numeric::parse(text));
        if got != want {
            eprintln!("input {text:?}: got {got}, the server {want}");
            failures += 1;
        }
    }
    for (index, text) in ["1.500", "NaN", "Infinity", "-Infinity", "123456789012345678901234567890.000000000000001", "0", "-0.0001", "10000", "0.00000001"].iter().enumerate() {
        let value = Numeric::parse(text).unwrap();
        let id = index as i32 + 1;
        client
            .execute(
                "INSERT INTO amounts (id, exact, scaled, list) VALUES ($1, $2, $3, $4)",
                &[&id, &value, &Numeric::parse("1.2").unwrap(), &vec![Some(value.clone()), None, Some(Numeric::parse("2.50").unwrap())]],
            )
            .await
            .unwrap();
        let stored = server(&client, &format!("SELECT exact FROM amounts WHERE id = {id}")).await;
        let row = Amounts::from_row(&client.query_one("SELECT id, exact, scaled, list FROM amounts WHERE id = $1", &[&id]).await.unwrap()).unwrap();
        let exact = row.exact.unwrap().to_string();
        let list = row.list.unwrap();
        if exact != stored || row.scaled.unwrap().to_string() != "1.200" || list[0].as_ref().unwrap().to_string() != stored || list[1].is_some() || list[2].as_ref().unwrap().to_string() != "2.50" {
            eprintln!("{text} read back as {exact}, stored {stored}");
            failures += 1;
        }
    }
    let value = Numeric::parse("1.500").unwrap();
    // A JSON string keeps the exact text; a JSON number is read as the double it denotes.
    if serde_json::to_string(&value).unwrap() != "\\"1.500\\""
        || serde_json::from_str::<Numeric>("\\"2.250\\"").unwrap().to_string() != "2.250"
        || serde_json::from_str::<Numeric>("2.250").unwrap() != Numeric::parse("2.25").unwrap()
    {
        eprintln!("JSON");
        failures += 1;
    }
    if Numeric::parse("1.50").unwrap() != Numeric::parse("1.5").unwrap() || Numeric::parse("NaN").unwrap() != Numeric::parse("NaN").unwrap() {
        eprintln!("equality");
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
  root = await mkdtemp(join(tmpdir(), 'pgsid-rust-numeric-'))
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
  'computes, sends and reads Rust numerics as PostgreSQL does',
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

it.skipIf(!cargoAvailable)(
  'ships the evaluator modules the numeric value reaches as the asset build prunes them',
  async () => {
    expect(
      await readFile(new URL('../../src/codegen/rust/assets/rust-numeric.json', import.meta.url), 'utf8'),
    ).toBe(buildRustNumericAsset())
  },
  600_000,
)
