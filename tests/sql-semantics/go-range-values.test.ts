import { afterAll, beforeAll, expect, it } from 'vitest'
import { execFile, spawnSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'
import { servePglite } from '../support/pglite-server.js'
import { sharedTempDirectory } from '../../tools/test-run-temp.js'

const schema = `CREATE TYPE floatspan AS RANGE (subtype = float8);
CREATE TYPE textspan AS RANGE (subtype = text, collation = "C");
CREATE DOMAIN shortspan AS int4range;
CREATE DOMAIN shorterspan AS shortspan;
CREATE DOMAIN stamp AS timestamptz;
CREATE TABLE spans (
  id integer PRIMARY KEY, ints int4range, bigs int8range, exact numrange, days daterange,
  local tsrange, instant tstzrange, floats floatspan, short shortspan, words textspan,
  many int4multirange, many_days datemultirange, float_many floatspan_multirange,
  list int4range[], required int4range NOT NULL DEFAULT 'empty'
);
`
const columns =
  'id, ints, bigs, exact, days, local, instant, floats, short, words, many, many_days, float_many, list, required'
const queries = `-- name: InsertSpan :exec
INSERT INTO spans (${columns}) VALUES (@id, @ints, @bigs, @exact, @days, @local, @instant, @floats, @short, @words, @many, @many_days, @float_many, @list, @required);
-- name: GetSpan :one
SELECT ${columns} FROM spans WHERE id = @id;
`

// The generated Go API against the server through pgx: every value goes in through the generated
// parameters and comes back through the generated row. What the server stored is compared, as its
// own text, with what was written; what was read is written again and must store the same.
const goTest = `package spans

import (
	"context"
	"math"
	"os"
	"testing"
	"time"

	pgsid "example.com/pgsid-range/generated/go/pgsid"
	support "example.com/pgsid-range/generated/go/queries/pgsid/pgx"
	public "example.com/pgsid-range/generated/go/schema/public"
	"github.com/jackc/pgx/v5"
)

func connect(t *testing.T, ctx context.Context) *pgx.Conn {
	conn, err := pgx.Connect(ctx, os.Getenv("PGSID_GO_TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close(ctx) })
	// Every connection reaches the one server session, which keeps the statements prepared before.
	if _, err := conn.Exec(ctx, "DEALLOCATE ALL; SET TimeZone = 'UTC'; SET DateStyle = 'ISO, YMD'"); err != nil {
		t.Fatal(err)
	}
	if err := support.RegisterTypes(ctx, conn); err != nil {
		t.Fatal(err)
	}
	return conn
}

func pointer[T any](value T) *T { return &value }
func ints(lower, upper pgsid.Bound[int32]) pgsid.Range[int32] { return pgsid.RangeOf(lower, upper) }
func day(year int, month time.Month, date int) pgsid.Date {
	return pgsid.DateOf(time.Date(year, month, date, 0, 0, 0, 0, time.UTC))
}

const textColumns = "ints::text, bigs::text, exact::text, days::text, local::text, instant::text, floats::text, short::text, words::text, many::text, many_days::text, float_many::text, list::text, required::text"

func stored(t *testing.T, ctx context.Context, conn *pgx.Conn, id int32) [14]*string {
	var texts [14]*string
	targets := make([]any, len(texts))
	for i := range texts {
		targets[i] = &texts[i]
	}
	if err := conn.QueryRow(ctx, "SELECT "+textColumns+" FROM spans WHERE id = $1", id).Scan(targets...); err != nil {
		t.Fatal(err)
	}
	return texts
}

func show(texts [14]*string) []any {
	shown := make([]any, len(texts))
	for i, text := range texts {
		if text != nil {
			shown[i] = *text
		}
	}
	return shown
}

func text(value string) *string { return &value }

func TestRangeRoundTrip(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	queries := New(conn)
	cases := []struct {
		params InsertSpanParams
		texts  [14]*string
	}{
		{InsertSpanParams{
			Id:        1,
			Ints:      pointer(ints(pgsid.Inclusive[int32](1), pgsid.Inclusive[int32](9))),
			Bigs:      pointer(pgsid.RangeOf(pgsid.Unbounded[int64](), pgsid.Exclusive[int64](math.MaxInt64))),
			Exact:     pointer(pgsid.RangeOf(pgsid.Inclusive("1.50"), pgsid.Unbounded[string]())),
			Days:      pointer(pgsid.RangeOf(pgsid.Exclusive(day(2026, 1, 1)), pgsid.Inclusive(day(2026, 1, 31)))),
			Local:     pointer(pgsid.RangeOf(pgsid.Inclusive(pgsid.TimestampNegInfinity), pgsid.Exclusive(pgsid.TimestampOf(time.Date(2026, 1, 1, 12, 0, 0, 1000, time.UTC))))),
			Instant:   pointer(pgsid.RangeOf(pgsid.Exclusive(pgsid.TimestamptzOf(time.Unix(0, 0))), pgsid.Inclusive(pgsid.TimestamptzInfinity))),
			Floats:    pointer(pgsid.RangeOf(pgsid.Inclusive(-0.5), pgsid.Exclusive(math.Inf(1)))),
			Short:     pointer(ints(pgsid.Exclusive[int32](math.MinInt32), pgsid.Unbounded[int32]())),
			Words:     pointer(pgsid.RangeOf(pgsid.Inclusive(""), pgsid.Exclusive("a \\"quoted\\", \\\\ (value)"))),
			Many:      pointer(pgsid.Multirange[int32]{ints(pgsid.Inclusive[int32](1), pgsid.Exclusive[int32](3)), ints(pgsid.Inclusive[int32](2), pgsid.Exclusive[int32](6)), pgsid.EmptyRange[int32]()}),
			ManyDays:  pointer(pgsid.Multirange[pgsid.Date]{}),
			FloatMany: pointer[pgsid.Multirange[float64]](nil),
			List:      []pgsid.Range[int32]{pgsid.EmptyRange[int32](), {}, ints(pgsid.Exclusive[int32](0), pgsid.Inclusive[int32](0))},
			Required:  pgsid.Range[int32]{},
		}, [14]*string{
			text("[1,10)"), text("(,9223372036854775807)"), text("[1.50,)"), text("[2026-01-02,2026-02-01)"),
			text("[-infinity,\\"2026-01-01 12:00:00.000001\\")"), text("(\\"1970-01-01 00:00:00+00\\",infinity]"),
			text("[-0.5,Infinity)"), text("[-2147483647,)"), text("[\\"\\",\\"a \\"\\"quoted\\"\\", \\\\\\\\ (value)\\")"),
			text("{[1,6)}"), text("{}"), text("{}"), text("{empty,\\"(,)\\",empty}"), text("(,)"),
		}},
		{InsertSpanParams{
			Id:       2,
			Ints:     pointer(pgsid.EmptyRange[int32]()),
			Days:     pointer(pgsid.RangeOf(pgsid.Inclusive(pgsid.DateNegInfinity), pgsid.Inclusive(pgsid.DateInfinity))),
			Instant:  pointer(pgsid.RangeOf(pgsid.Unbounded[pgsid.Timestamptz](), pgsid.Unbounded[pgsid.Timestamptz]())),
			List:     []pgsid.Range[int32]{},
			Required: pgsid.EmptyRange[int32](),
		}, [14]*string{
			text("empty"), nil, nil, text("[-infinity,infinity]"), nil, text("(,)"), nil, nil, nil, nil, nil, nil, text("{}"), text("empty"),
		}},
	}
	for _, c := range cases {
		if err := queries.InsertSpan(ctx, c.params); err != nil {
			t.Fatalf("%d: %v", c.params.Id, err)
		}
		texts := stored(t, ctx, conn, c.params.Id)
		for i := range texts {
			if (texts[i] == nil) != (c.texts[i] == nil) || (texts[i] != nil && *texts[i] != *c.texts[i]) {
				t.Errorf("%d: column %d stored %v, want %v", c.params.Id, i, show(texts)[i], show(c.texts)[i])
			}
		}
		row, err := queries.GetSpan(ctx, GetSpanParams{Id: &c.params.Id})
		if err != nil {
			t.Fatalf("%d: %v", c.params.Id, err)
		}
		again := InsertSpanParams{
			Id: c.params.Id + 100, Ints: row.Ints, Bigs: row.Bigs, Exact: row.Exact, Days: row.Days, Local: row.Local,
			Instant: row.Instant, Floats: row.Floats, Short: row.Short, Words: row.Words, Many: row.Many, ManyDays: row.ManyDays,
			FloatMany: row.FloatMany, List: row.List, Required: row.Required,
		}
		if err := queries.InsertSpan(ctx, again); err != nil {
			t.Fatalf("%d again: %v", c.params.Id, err)
		}
		if got, want := show(stored(t, ctx, conn, again.Id)), show(texts); len(got) != len(want) {
			t.Fatal("column count")
		} else {
			for i := range got {
				if got[i] != want[i] {
					t.Errorf("%d: column %d read back as %v, stored %v", c.params.Id, i, got[i], want[i])
				}
			}
		}
		// The simple protocol sends each value as range text. pgx builds array text only from element
		// types it has registered, so the list of ranges is not among them.
		simple := []any{row.Ints, row.Bigs, row.Exact, row.Days, row.Local, row.Instant, row.Floats, row.Short, row.Words, row.Many, row.ManyDays, row.FloatMany, nil, row.Required}
		casts := []string{"int4range", "int8range", "numrange", "daterange", "tsrange", "tstzrange", "floatspan", "shortspan", "textspan", "int4multirange", "datemultirange", "floatspan_multirange", "", "int4range"}
		for i, value := range simple {
			if casts[i] == "" {
				continue
			}
			var echoed *string
			if err := conn.QueryRow(ctx, "SELECT $1::"+casts[i]+"::text", pgx.QueryExecModeSimpleProtocol, value).Scan(&echoed); err != nil {
				t.Errorf("%d: column %d over the simple protocol: %v", c.params.Id, i, err)
				continue
			}
			if got, want := show([14]*string{echoed})[0], show(texts)[i]; got != want {
				t.Errorf("%d: column %d sent as text stores %v, want %v", c.params.Id, i, got, want)
			}
		}
	}
	row, err := queries.GetSpan(ctx, GetSpanParams{Id: pointer(int32(1))})
	if err != nil {
		t.Fatal(err)
	}
	// Reads are the server's canonical form.
	if *row.Ints != ints(pgsid.Inclusive[int32](1), pgsid.Exclusive[int32](10)) || *row.Short != ints(pgsid.Inclusive[int32](math.MinInt32+1), pgsid.Unbounded[int32]()) {
		t.Errorf("canonical ranges read as %v %v", *row.Ints, *row.Short)
	}
	if len(*row.Many) != 1 || (*row.Many)[0] != ints(pgsid.Inclusive[int32](1), pgsid.Exclusive[int32](6)) {
		t.Errorf("multirange read as %v", *row.Many)
	}
	if len(row.List) != 3 || !row.List[0].IsEmpty() || row.List[1] != (pgsid.Range[int32]{}) || !row.List[2].IsEmpty() {
		t.Errorf("list read as %v", row.List)
	}
	if row.FloatMany == nil || *row.FloatMany == nil || len(*row.FloatMany) != 0 {
		t.Errorf("an empty multirange read as %v", row.FloatMany)
	}
	if lower, ok := row.Local.Lower().Value(); !ok || lower.Infinity() != -1 || !row.Local.Lower().Inclusive() {
		t.Errorf("an infinite bound read as %v", row.Local.Lower())
	}
	if value, ok := row.Bigs.Lower().Value(); ok || value != 0 || row.Bigs.Lower().Inclusive() {
		t.Errorf("an unbounded end read as %v", row.Bigs.Lower())
	}
}

func TestRangeReads(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	var span pgsid.Range[int32]
	if err := conn.QueryRow(ctx, "SELECT NULL::int4range").Scan(&span); err == nil {
		t.Fatal("NULL scanned into a range")
	}
	var nullable *pgsid.Range[int32]
	if err := conn.QueryRow(ctx, "SELECT NULL::int4range").Scan(&nullable); err != nil || nullable != nil {
		t.Fatalf("NULL read as %v, %v", nullable, err)
	}
	var many pgsid.Multirange[int32]
	if err := conn.QueryRow(ctx, "SELECT NULL::int4multirange").Scan(&many); err == nil {
		t.Fatal("NULL scanned into a multirange")
	}
	// A value read again overwrites every part, unbounded ends included.
	span = ints(pgsid.Inclusive[int32](5), pgsid.Inclusive[int32](7))
	if err := conn.QueryRow(ctx, "SELECT '(,3)'::int4range").Scan(&span); err != nil || span != ints(pgsid.Unbounded[int32](), pgsid.Exclusive[int32](3)) {
		t.Fatalf("read as %v, %v", span, err)
	}
	if err := conn.QueryRow(ctx, "SELECT 'empty'::int4range").Scan(&span); err != nil || span != pgsid.EmptyRange[int32]() {
		t.Fatalf("empty read as %v, %v", span, err)
	}
	if _, ok := span.Lower().Value(); ok {
		t.Fatal("the empty range has a lower bound")
	}
	// The simple protocol reads range text.
	var days pgsid.Range[pgsid.Date]
	if err := conn.QueryRow(ctx, "SELECT '[2026-03-01,infinity)'::daterange", pgx.QueryExecModeSimpleProtocol).Scan(&days); err != nil || days != pgsid.RangeOf(pgsid.Inclusive(day(2026, 3, 1)), pgsid.Exclusive(pgsid.DateInfinity)) {
		t.Fatalf("text read as %v, %v", days, err)
	}
}

// A domain over a pgsid value, directly or through another domain, is that value to pgx.
func TestRangeDomains(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	var nested public.Shorterspan = ints(pgsid.Inclusive[int32](1), pgsid.Inclusive[int32](2))
	var echoed public.Shorterspan
	if err := conn.QueryRow(ctx, "SELECT $1::shorterspan", nested).Scan(&echoed); err != nil || echoed != ints(pgsid.Inclusive[int32](1), pgsid.Exclusive[int32](3)) {
		t.Fatalf("a nested range domain reads as %v, %v", echoed, err)
	}
	var moment public.Stamp = pgsid.TimestamptzInfinity
	var read public.Stamp
	if err := conn.QueryRow(ctx, "SELECT $1::stamp", moment).Scan(&read); err != nil || read.Infinity() != 1 {
		t.Fatalf("a timestamptz domain reads as %v, %v", read, err)
	}
}

func TestRangeText(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	for _, upper := range []string{"plain", "with space", "a,b", "(paren)", "[bracket]", "{brace}", "quote\\"d", "back\\\\slash", "NULL", " ", "\\t"} {
		value := pgsid.RangeOf(pgsid.Inclusive(""), pgsid.Exclusive(upper))
		var binary, simple string
		if err := conn.QueryRow(ctx, "SELECT $1::textspan::text", value).Scan(&binary); err != nil {
			t.Fatalf("%q: %v", upper, err)
		}
		if err := conn.QueryRow(ctx, "SELECT $1::textspan::text", pgx.QueryExecModeSimpleProtocol, value).Scan(&simple); err != nil {
			t.Fatalf("%q as text: %v", upper, err)
		}
		if binary != simple {
			t.Errorf("%q: binary stores %s, text %s", upper, binary, simple)
		}
		var read pgsid.Range[string]
		if err := conn.QueryRow(ctx, "SELECT $1::textspan", value).Scan(&read); err != nil || read != value {
			t.Errorf("%q: reads back as %v, %v", upper, read, err)
		}
		if err := conn.QueryRow(ctx, "SELECT $1::text::textspan", pgx.QueryExecModeSimpleProtocol, binary).Scan(&read); err != nil || read != value {
			t.Errorf("%q: text %s reads as %v, %v", upper, binary, read, err)
		}
	}
}
`

const goBinary = process.env['PGSID_GO_BINARY'] ?? 'go'
const goAvailable = spawnSync(goBinary, ['version'], { encoding: 'utf8' }).status === 0

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-go-range-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/spans.sql'), queries)
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
  const fixture = new URL('../fixtures/codegen/project/', import.meta.url)
  await writeFile(
    join(root, 'go.mod'),
    (await readFile(new URL('go.mod', fixture), 'utf8')).replace(
      'example.com/pgsid-fixture',
      'example.com/pgsid-range',
    ),
  )
  await copyFile(new URL('go.sum', fixture), join(root, 'go.sum'))
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
  'sends and reads Go ranges and multiranges through pgx',
  async () => {
    const update = await buildProject({ baseDirectory: root })
    expect(update.state.diagnostics).toEqual([])
    await writeFile(join(root, 'generated/go/queries/spans/range_test.go'), goTest)
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
