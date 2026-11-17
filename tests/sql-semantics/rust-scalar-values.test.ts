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

const columns: [string, string][] = [
  ['clock', 'time'],
  ['zoned', 'timetz'],
  ['spot', 'point'],
  ['edge', 'line'],
  ['seg', 'lseg'],
  ['area', 'box'],
  ['route', 'path'],
  ['shape', 'polygon'],
  ['ring', 'circle'],
  ['ident', 'uuid'],
  ['tx', 'xid'],
  ['cmd', 'cid'],
  ['tx8', 'xid8'],
  ['cash', 'money'],
  ['letter', '"char"'],
  ['position', 'tid'],
  ['location', 'pg_lsn'],
  ['snap', 'pg_snapshot'],
  ['host', 'inet'],
  ['net', 'cidr'],
  ['mac', 'macaddr'],
  ['mac8', 'macaddr8'],
  ['flags', 'bit(4)'],
  ['vflags', 'varbit'],
  ['doc', 'xml'],
  ['path_expr', 'jsonpath'],
  ['words', 'tsvector'],
  ['query', 'tsquery'],
  ['cls', 'regclass'],
  ['cursor_name', 'refcursor'],
  ['ints', 'int2vector'],
]
const schema = `CREATE TABLE scalars (id integer PRIMARY KEY, ${columns.map(([name, type]) => `${name} ${type}`).join(', ')});
`
const names = columns.map(([name]) => name)

// The generated Rust values of the remaining built-in types against the server: each is written,
// its stored text compared with the server's for the value meant, read back and written again to
// store the same, and a value whose text Rust writes is compared with the server's text for it.
const main = `mod db;

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

use db::pgsid::*;
use db::public::Scalars;

const COLUMNS: &str = "${['id', ...names].join(', ')}";

async fn texts(client: &tokio_postgres::Client, id: i32) -> Vec<Option<String>> {
    let row = client
        .query_one(&format!("SELECT ${names.map((name) => `${name}::text`).join(', ')} FROM scalars WHERE id = {id}"), &[])
        .await
        .unwrap();
    (0..row.len()).map(|index| row.get(index)).collect()
}
async fn insert(client: &tokio_postgres::Client, row: &Scalars) {
    client
        .execute(
            &format!("INSERT INTO scalars ({COLUMNS}) VALUES (${['id', ...names].map((_, index) => `$${index + 1}`).join(', ')})"),
            &[&row.id, ${names.map((name) => `&row.${name}`).join(', ')}],
        )
        .await
        .unwrap();
}
fn point(x: f64, y: f64) -> Point {
    Point { x, y }
}

#[tokio::main]
async fn main() {
    let url = std::env::var("PGSID_RUST_TEST_DATABASE_URL").unwrap();
    let (client, connection) = tokio_postgres::connect(&url, tokio_postgres::NoTls).await.unwrap();
    tokio::spawn(async move { connection.await.unwrap() });
    let row = Scalars {
        id: 1,
        clock: Some(Time::from_microseconds(86_400_000_000).unwrap()),
        zoned: Some(Timetz::new(Time::from_microseconds(45_296_000_001).unwrap(), -(5 * 3600 + 30 * 60)).unwrap()),
        spot: Some(point(1.5, -2.0)),
        edge: Some(Line { a: 1.0, b: -1.0, c: 0.0 }),
        seg: Some(Lseg { start: point(0.0, 0.0), end: point(3.0, 4.0) }),
        area: Some(PgBox { high: point(3.0, 4.0), low: point(0.0, 0.0) }),
        route: Some(Path { closed: false, points: vec![point(0.0, 0.0), point(1.0, 1.0)] }),
        shape: Some(Polygon { points: vec![point(0.0, 0.0), point(1.0, 0.0), point(0.0, 1.0)] }),
        ring: Some(Circle { center: point(1.0, 1.0), radius: 2.5 }),
        ident: Some(Uuid([0xa0, 0xee, 0xbc, 0x99, 0x9c, 0x0b, 0x4e, 0xf8, 0xbb, 0x6d, 0x6b, 0xb9, 0xbd, 0x38, 0x0a, 0x11])),
        tx: Some(Xid(4_294_967_295)),
        cmd: Some(Cid(7)),
        tx8: Some(Xid8(18_446_744_073_709_551_615)),
        cash: Some(Money(-123_456)),
        letter: Some(Char(b'Q')),
        position: Some(Tid { block: 4_294_967_295, offset: 65_535 }),
        location: Some(PgLsn(0x16_B374_D848)),
        snap: Some(Snapshot { xmin: 10, xmax: 20, running: vec![11, 15] }),
        host: Some(Inet { address: IpAddr::V4(Ipv4Addr::new(192, 168, 0, 1)), prefix: 24 }),
        net: Some(Cidr { address: IpAddr::V6(Ipv6Addr::new(0x2001, 0xdb8, 0, 0, 0, 0, 0, 0)), prefix: 32 }),
        mac: Some(Macaddr([0x08, 0x00, 0x2b, 0x01, 0x02, 0x03])),
        mac8: Some(Macaddr8([0x08, 0x00, 0x2b, 0x01, 0x02, 0x03, 0x04, 0x05])),
        flags: Some(BitString::parse("1010").unwrap()),
        vflags: Some(BitString::parse("101").unwrap()),
        doc: Some(Xml("<a b=\\"c\\">x &amp; y</a>".to_owned())),
        path_expr: Some(Jsonpath("$.a[*] ? (@ > 1)".to_owned())),
        words: Some(Tsvector("b:2B a:1A,3 'it''s':4".to_owned())),
        query: Some(Tsquery("!a & (b:* | c:AB) <2> 'd e'".to_owned())),
        cls: Some(OidAlias(1259)),
        cursor_name: Some(Refcursor("cursor one".to_owned())),
        ints: Some(vec![1, -2, 3]),
    };
    let expected: Vec<Option<&str>> = vec![
        Some("24:00:00"), Some("12:34:56.000001-05:30"), Some("(1.5,-2)"), Some("{1,-1,0}"), Some("[(0,0),(3,4)]"),
        Some("(3,4),(0,0)"), Some("[(0,0),(1,1)]"), Some("((0,0),(1,0),(0,1))"), Some("<(1,1),2.5>"),
        Some("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"), Some("4294967295"), Some("7"), Some("18446744073709551615"),
        Some("-$1,234.56"), Some("Q"), Some("(4294967295,65535)"), Some("16/B374D848"), Some("10:20:11,15"),
        Some("192.168.0.1/24"), Some("2001:db8::/32"), Some("08:00:2b:01:02:03"), Some("08:00:2b:01:02:03:04:05"),
        Some("1010"), Some("101"), Some("<a b=\\"c\\">x &amp; y</a>"), Some("$.\\"a\\"[*]?(@ > 1)"),
        Some("'a':1A,3 'b':2B 'it''s':4"), Some("!'a' & ( 'b':* | 'c':AB ) <2> 'd e'"), Some("pg_class"),
        Some("cursor one"), Some("1 -2 3"),
    ];
    let mut failures = 0;
    insert(&client, &row).await;
    let stored = texts(&client, 1).await;
    for (index, (got, want)) in stored.iter().zip(&expected).enumerate() {
        if got.as_deref() != *want {
            eprintln!("column {index} stored {got:?}, expected {want:?}");
            failures += 1;
        }
    }
    let back = Scalars::from_row(&client.query_one(&format!("SELECT {COLUMNS} FROM scalars WHERE id = 1"), &[]).await.unwrap()).unwrap();
    insert(&client, &Scalars { id: 2, ..back.clone() }).await;
    if texts(&client, 2).await != stored {
        eprintln!("read back as {back:?}");
        failures += 1;
    }
    // Values whose text Rust writes read as the server writes them.
    let shown = [
        back.ident.map(|value| value.to_string()), back.position.map(|value| value.to_string()),
        back.location.map(|value| value.to_string()), back.snap.as_ref().map(|value| value.to_string()),
        back.host.map(|value| value.to_string()), back.net.map(|value| value.to_string()),
        back.mac.map(|value| value.to_string()), back.mac8.map(|value| value.to_string()),
        back.flags.as_ref().map(|value| value.to_string()), back.vflags.as_ref().map(|value| value.to_string()),
        back.doc.as_ref().map(|value| value.to_string()), back.path_expr.as_ref().map(|value| value.to_string()),
        back.words.as_ref().map(|value| value.to_string()), back.query.as_ref().map(|value| value.to_string()),
        back.clock.map(|value| value.to_string()),
    ];
    let columns = [9, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 0];
    for (value, column) in shown.iter().zip(columns) {
        if value.as_deref() != stored[column].as_deref() {
            eprintln!("column {column} shows {value:?}, the server {:?}", stored[column]);
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
  root = await mkdtemp(join(tmpdir(), 'pgsid-rust-scalars-'))
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
  'writes and reads the remaining built-in types through tokio-postgres as the server stores them',
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
