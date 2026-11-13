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

const schema = `CREATE DOMAIN zoned AS timetz;
CREATE TABLE shapes (
  id integer PRIMARY KEY, clock time, zone zoned, spot point, ray line, segment lseg, area box,
  route path, outline polygon, ring circle, words tsvector, transaction xid, spots point[]
);
`
const columns = 'id, clock, zone, spot, ray, segment, area, route, outline, ring, words, transaction, spots'
const queries = `-- name: InsertShape :exec
INSERT INTO shapes (${columns}) VALUES (@id, @clock, @zone, @spot, @ray, @segment, @area, @route, @outline, @ring, @words, @transaction, @spots);
-- name: GetShape :one
SELECT ${columns} FROM shapes WHERE id = @id;
`

// The generated Go API against the server through pgx: what goes in through the generated
// parameters is compared with the server's own text for what it stored, and what comes back is
// written again and must store the same.
const goTest = `package shapes

import (
	"context"
	"os"
	"testing"

	pgsid "example.com/pgsid-shapes/generated/go/pgsid"
	public "example.com/pgsid-shapes/generated/go/schema/public"
	"github.com/jackc/pgx/v5"
)

func connect(t *testing.T, ctx context.Context) *pgx.Conn {
	conn, err := pgx.Connect(ctx, os.Getenv("PGSID_GO_TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close(ctx) })
	// Every connection reaches the one server session, which keeps the statements prepared before.
	if _, err := conn.Exec(ctx, "DEALLOCATE ALL"); err != nil {
		t.Fatal(err)
	}
	return conn
}

func pointer[T any](value T) *T { return &value }

func clock(t *testing.T, microseconds int64) pgsid.Time {
	t.Helper()
	value, err := pgsid.TimeOf(microseconds)
	if err != nil {
		t.Fatal(err)
	}
	return value
}

func zoned(t *testing.T, microseconds int64, offset int32) pgsid.Timetz {
	t.Helper()
	value, err := pgsid.TimetzOf(microseconds, offset)
	if err != nil {
		t.Fatal(err)
	}
	return value
}

const texts = "clock::text, zone::text, spot::text, ray::text, segment::text, area::text, route::text, outline::text, ring::text, words::text, transaction::text, spots::text"

func stored(t *testing.T, ctx context.Context, conn *pgx.Conn, id int32) [12]*string {
	var values [12]*string
	targets := make([]any, len(values))
	for index := range values {
		targets[index] = &values[index]
	}
	if err := conn.QueryRow(ctx, "SELECT "+texts+" FROM shapes WHERE id = $1", id).Scan(targets...); err != nil {
		t.Fatal(err)
	}
	return values
}

func shown(values [12]*string) [12]string {
	var result [12]string
	for index, value := range values {
		result[index] = "NULL"
		if value != nil {
			result[index] = *value
		}
	}
	return result
}

func TestRoundTrip(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	queries := New(conn)
	zone := public.Zoned(zoned(t, 45296000000, 19800))
	params := InsertShapeParams{
		Id:          1,
		Clock:       pointer(clock(t, 45296789000)),
		Zone:        &zone,
		Spot:        &pgsid.Point{X: 1.5, Y: -2},
		Ray:         &pgsid.Line{A: 1, B: -1, C: 0},
		Segment:     &pgsid.Lseg{Start: pgsid.Point{}, End: pgsid.Point{X: 1, Y: 1}},
		Area:        &pgsid.Box{High: pgsid.Point{}, Low: pgsid.Point{X: 2, Y: 2}},
		Route:       &pgsid.Path{Points: []pgsid.Point{{}, {X: 1, Y: 1}}},
		Outline:     &pgsid.Polygon{Points: []pgsid.Point{{}, {X: 1, Y: 1}, {X: 1}}},
		Ring:        &pgsid.Circle{Radius: 2},
		Words:       pointer(pgsid.Tsvector("b a")),
		Transaction: pointer(uint32(4294967295)),
		Spots:       []pgsid.Point{{X: 1}, {Y: -0.5}},
	}
	if err := queries.InsertShape(ctx, params); err != nil {
		t.Fatal(err)
	}
	want := [12]string{"12:34:56.789", "12:34:56+05:30", "(1.5,-2)", "{1,-1,0}", "[(0,0),(1,1)]", "(2,2),(0,0)", "[(0,0),(1,1)]", "((0,0),(1,1),(1,0))", "<(0,0),2>", "'a' 'b'", "4294967295", "{\\"(1,0)\\",\\"(0,-0.5)\\"}"}
	if got := shown(stored(t, ctx, conn, 1)); got != want {
		t.Fatalf("stored %q, want %q", got, want)
	}
	row, err := queries.GetShape(ctx, GetShapeParams{Id: pointer(int32(1))})
	if err != nil {
		t.Fatal(err)
	}
	// The server keeps a box's upper right corner first.
	if *row.Area != (pgsid.Box{High: pgsid.Point{X: 2, Y: 2}, Low: pgsid.Point{}}) || row.Clock.Microseconds() != 45296789000 || row.Zone.OffsetSeconds() != 19800 {
		t.Fatalf("read %+v", row)
	}
	again := InsertShapeParams{Id: 2, Clock: row.Clock, Zone: row.Zone, Spot: row.Spot, Ray: row.Ray, Segment: row.Segment, Area: row.Area, Route: row.Route, Outline: row.Outline, Ring: row.Ring, Words: row.Words, Transaction: row.Transaction, Spots: row.Spots}
	if err := queries.InsertShape(ctx, again); err != nil {
		t.Fatal(err)
	}
	if got := shown(stored(t, ctx, conn, 2)); got != want {
		t.Fatalf("read back as %q, want %q", got, want)
	}
	// The simple protocol sends each value as its text.
	values := []any{row.Clock, row.Zone, row.Spot, row.Ray, row.Segment, row.Area, row.Route, row.Outline, row.Ring}
	casts := []string{"time", "timetz", "point", "line", "lseg", "box", "path", "polygon", "circle"}
	for index, value := range values {
		var echoed string
		if err := conn.QueryRow(ctx, "SELECT $1::"+casts[index]+"::text", pgx.QueryExecModeSimpleProtocol, value).Scan(&echoed); err != nil || echoed != want[index] {
			t.Errorf("%s over the simple protocol: %q, %v", casts[index], echoed, err)
		}
	}
	if err := queries.InsertShape(ctx, InsertShapeParams{Id: 3}); err != nil {
		t.Fatal(err)
	}
	empty, err := queries.GetShape(ctx, GetShapeParams{Id: pointer(int32(3))})
	if err != nil || empty.Clock != nil || empty.Zone != nil || empty.Spot != nil || empty.Route != nil || empty.Spots != nil {
		t.Fatalf("SQL NULL read as %+v, %v", empty, err)
	}
}

func TestClocks(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	for _, source := range []string{"00:00:00", "24:00:00", "23:59:59.999999", "12:00:00.5"} {
		var clock pgsid.Time
		if err := conn.QueryRow(ctx, "SELECT $1::text::time", source).Scan(&clock); err != nil || clock.String() != source {
			t.Errorf("%s read as %v, %v", source, clock, err)
		}
	}
	for _, source := range []string{"12:00:00+00", "12:00:00-15:59:59", "00:00:00.000001+05:30", "24:00:00+15:59"} {
		var zone pgsid.Timetz
		if err := conn.QueryRow(ctx, "SELECT $1::text::timetz", source).Scan(&zone); err != nil || zone.String() != source {
			t.Errorf("%s read as %v, %v", source, zone, err)
		}
		var echoed string
		if err := conn.QueryRow(ctx, "SELECT $1::timetz::text", zone).Scan(&echoed); err != nil || echoed != source {
			t.Errorf("%s sent as %q, %v", source, echoed, err)
		}
	}
	if _, err := pgsid.TimeOf(86400000001); err == nil {
		t.Error("a clock past 24:00:00 accepted")
	}
	if _, err := pgsid.TimeOf(-1); err == nil {
		t.Error("a negative clock accepted")
	}
	if _, err := pgsid.TimetzOf(0, 57600); err == nil {
		t.Error("an offset past 15:59:59 accepted")
	}
	var zone pgsid.Timetz
	if err := conn.QueryRow(ctx, "SELECT NULL::timetz").Scan(&zone); err == nil {
		t.Error("SQL NULL scanned into a time with time zone")
	}
}
`

const goBinary = process.env['PGSID_GO_BINARY'] ?? 'go'
const goAvailable = spawnSync(goBinary, ['version'], { encoding: 'utf8' }).status === 0

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-go-shapes-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/shapes.sql'), queries)
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
  await writeGoModule(root, 'example.com/pgsid-shapes')
  db = await PGlite.create()
  await db.exec(schema)
  server = await servePglite(db)
}, 120_000)

afterAll(async () => {
  await server?.close()
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

it.skipIf(!goAvailable)(
  'sends and reads Go clocks, geometric shapes and text-typed values through pgx',
  async () => {
    const update = await buildProject({ baseDirectory: root })
    expect(update.state.diagnostics).toEqual([])
    await writeFile(join(root, 'generated/go/queries/shapes/shapes_test.go'), goTest)
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
