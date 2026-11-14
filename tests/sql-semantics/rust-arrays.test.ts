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

const schema = `CREATE TABLE grids (id integer PRIMARY KEY, one integer[], two integer[], either integer[], cube text[]);
`

// Arrays with the dimension counts their columns declare: written as nested vectors, stored as
// arrays of that many dimensions, read back the same, and an array of another count refused.
const main = `mod db;

use db::pgsid::{Array1Or2, D2, D3};
use db::public::Grids;

const COLUMNS: &str = "id, one, two, either, cube";

async fn texts(client: &tokio_postgres::Client, id: i32) -> Vec<Option<String>> {
    let row = client.query_one(&format!("SELECT one::text, two::text, either::text, cube::text FROM grids WHERE id = {id}"), &[]).await.unwrap();
    (0..row.len()).map(|index| row.get(index)).collect()
}
async fn insert(client: &tokio_postgres::Client, row: &Grids) -> Result<u64, tokio_postgres::Error> {
    client
        .execute("INSERT INTO grids (id, one, two, either, cube) VALUES ($1, $2, $3, $4, $5)", &[&row.id, &row.one, &row.two, &row.either, &row.cube])
        .await
}

#[tokio::main]
async fn main() {
    let url = std::env::var("PGSID_RUST_TEST_DATABASE_URL").unwrap();
    let (client, connection) = tokio_postgres::connect(&url, tokio_postgres::NoTls).await.unwrap();
    tokio::spawn(async move { connection.await.unwrap() });
    let mut failures = 0;
    let cases = vec![
        (
            Grids {
                id: 1,
                one: Some(vec![Some(1), None]),
                two: Some(D2(vec![vec![Some(1), Some(2)], vec![Some(3), None]])),
                either: Some(Array1Or2::D2(vec![vec![Some(5)], vec![Some(6)]])),
                cube: Some(D3(vec![vec![vec![Some("a".to_owned())], vec![None]]])),
            },
            ["{1,NULL}", "{{1,2},{3,NULL}}", "{{5},{6}}", "{{{a},{NULL}}}"],
        ),
        (
            Grids { id: 2, one: Some(vec![]), two: Some(D2(vec![])), either: Some(Array1Or2::D1(vec![Some(7)])), cube: Some(D3(vec![])) },
            ["{}", "{}", "{7}", "{}"],
        ),
    ];
    for (row, expected) in cases {
        insert(&client, &row).await.unwrap();
        let stored = texts(&client, row.id).await;
        if stored.iter().map(|text| text.as_deref()).collect::<Vec<_>>() != expected.iter().map(|text| Some(*text)).collect::<Vec<_>>() {
            eprintln!("row {} stored {stored:?}", row.id);
            failures += 1;
        }
        let back = Grids::from_row(&client.query_one(&format!("SELECT {COLUMNS} FROM grids WHERE id = $1"), &[&row.id]).await.unwrap()).unwrap();
        // The empty array reads as the lowest count it declares.
        let expected_back = if row.id == 2 { Grids { either: Some(Array1Or2::D1(vec![Some(7)])), ..row.clone() } } else { row.clone() };
        if back != expected_back {
            eprintln!("row {} read back as {back:?}", row.id);
            failures += 1;
        }
    }
    // An array of a count the column does not declare is an error naming the mapping.
    client.batch_execute("INSERT INTO grids (id, two) VALUES (3, '{1,2}')").await.unwrap();
    match client.query_one(&format!("SELECT {COLUMNS} FROM grids WHERE id = 3"), &[]).await.map(|row| Grids::from_row(&row)) {
        Ok(Err(error)) if std::error::Error::source(&error).is_some_and(|cause| cause.to_string().contains("dimensions mapping")) => {}
        other => {
            eprintln!("a one-dimensional array in a two-dimensional column read as {other:?}");
            failures += 1;
        }
    }
    // A ragged array is refused before it is sent.
    let ragged = Grids { id: 4, one: None, two: Some(D2(vec![vec![Some(1)], vec![]])), either: None, cube: None };
    match insert(&client, &ragged).await {
        Err(error) if format!("{error:?}").contains("differ in length") => {}
        other => {
            eprintln!("a ragged array was sent: {other:?}");
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
  root = await mkdtemp(join(tmpdir(), 'pgsid-rust-arrays-'))
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
  'writes and reads Rust arrays of their declared dimension counts',
  async () => {
    await writeRustCrate(root)
    await writeFile(join(root, 'schema.sql'), schema)
    await writeFile(
      join(root, 'pgsid.yaml'),
      `schema: schema.sql
sql:
  codegen:
    rust:
      schema: { outDir: src/db }
      mappings:
        column:
          public.grids.two: { dimensions: 2 }
          public.grids.either: { dimensions: [1, 2] }
          public.grids.cube: { dimensions: 3 }
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
