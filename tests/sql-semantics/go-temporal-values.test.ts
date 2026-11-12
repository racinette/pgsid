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

const schema = `CREATE TABLE moments (
  id integer PRIMARY KEY, day date, local timestamp, instant timestamptz, span interval,
  instants timestamptz[], required_day date NOT NULL DEFAULT 'infinity'
);
`
const queries = `-- name: InsertMoment :exec
INSERT INTO moments (id, day, local, instant, span, instants, required_day) VALUES (@id, @day, @local, @instant, @span, @instants, @required_day);
-- name: GetMoment :one
SELECT id, day, local, instant, span, instants, required_day FROM moments WHERE id = @id;
`

// The generated Go API against the server through pgx: every value goes in through the generated
// parameters and comes back through the generated row, and the server's own text for what it stored
// is compared with the value written. Infinities, extremes and NULL are among the cases.
const goTest = `package moments

import (
	"context"
	"math"
	"os"
	"testing"
	"time"

	pgsid "example.com/pgsid-temporal/generated/go/pgsid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func connect(t *testing.T, ctx context.Context) *pgx.Conn {
	conn, err := pgx.Connect(ctx, os.Getenv("PGSID_GO_TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close(ctx) })
	if _, err := conn.Exec(ctx, "SET TimeZone = 'UTC'; SET DateStyle = 'ISO, YMD'; SET IntervalStyle = 'iso_8601'"); err != nil {
		t.Fatal(err)
	}
	return conn
}

type moment struct {
	params  InsertMomentParams
	texts   [6]*string
}

func text(value string) *string { return &value }
func pointer[T any](value T) *T { return &value }

func TestTemporalRoundTrip(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	utc := time.UTC
	cases := []moment{
		{InsertMomentParams{
			Id:          1,
			Day:         pointer(pgsid.DateOf(time.Date(2026, 11, 7, 23, 0, 0, 0, time.FixedZone("x", -3600)))),
			Local:       pointer(pgsid.TimestampOf(time.Date(2026, 10, 26, 7, 33, 20, 123456000, time.FixedZone("y", 7200)))),
			Instant:     pointer(pgsid.TimestamptzOf(time.Unix(0, 0))),
			Span:        pointer(pgsid.IntervalOf(14, -3, 14706000007)),
			Instants:    []pgsid.Timestamptz{pgsid.TimestamptzOf(time.UnixMicro(-1)), pgsid.TimestamptzInfinity},
			RequiredDay: pgsid.DateOf(time.Date(2000, 2, 29, 0, 0, 0, 0, utc)),
		}, [6]*string{text("2026-11-07"), text("2026-10-26 07:33:20.123456"), text("1970-01-01 00:00:00+00"), text("P1Y2M-3DT4H5M6.000007S"), text("{\\"1969-12-31 23:59:59.999999+00\\",infinity}"), text("2000-02-29")}},
		{InsertMomentParams{
			Id:          2,
			Day:         pointer(pgsid.DateOf(time.Date(-4713, 11, 24, 0, 0, 0, 0, utc))),
			Local:       pointer(pgsid.TimestampOf(time.Date(-4713, 11, 24, 0, 0, 0, 0, utc))),
			Instant:     pointer(pgsid.TimestamptzOf(time.Date(294276, 12, 31, 23, 59, 59, 999999000, utc))),
			Span:        pointer(pgsid.IntervalOf(0, 0, -math.MaxInt64)),
			Instants:    []pgsid.Timestamptz{},
			RequiredDay: pgsid.DateOf(time.Date(5874897, 12, 31, 0, 0, 0, 0, utc)),
		}, [6]*string{text("4714-11-24 BC"), text("4714-11-24 00:00:00 BC"), text("294276-12-31 23:59:59.999999+00"), text("PT-2562047788H-54.775807S"), text("{}"), text("5874897-12-31")}},
		{InsertMomentParams{
			Id:          3,
			Day:         pointer(pgsid.DateNegInfinity),
			Local:       pointer(pgsid.TimestampNegInfinity),
			Instant:     pointer(pgsid.TimestamptzNegInfinity),
			Span:        pointer(pgsid.IntervalNegInfinity),
			Instants:    nil,
			RequiredDay: pgsid.DateInfinity,
		}, [6]*string{text("-infinity"), text("-infinity"), text("-infinity"), text("-infinity"), nil, text("infinity")}},
		{InsertMomentParams{
			Id:          4,
			Local:       pointer(pgsid.TimestampInfinity),
			Instant:     pointer(pgsid.TimestamptzInfinity),
			Span:        pointer(pgsid.IntervalInfinity),
			RequiredDay: pgsid.Date{},
		}, [6]*string{nil, text("infinity"), text("infinity"), text("infinity"), nil, text("0001-01-01")}},
		{InsertMomentParams{
			Id:          5,
			Span:        pointer(pgsid.IntervalOf(-2147483647, 2147483647, 1)),
			RequiredDay: pgsid.DateOf(time.Date(0, 2, 29, 0, 0, 0, 0, utc)),
		}, [6]*string{nil, nil, nil, text("P-178956970Y-7M2147483647DT0.000001S"), nil, text("0001-02-29 BC")}},
	}
	queries := New(conn)
	for _, c := range cases {
		if err := queries.InsertMoment(ctx, c.params); err != nil {
			t.Fatalf("%d: %v", c.params.Id, err)
		}
		var texts [6]*string
		if err := conn.QueryRow(ctx, "SELECT day::text, local::text, instant::text, span::text, instants::text, required_day::text FROM moments WHERE id = $1", c.params.Id).Scan(&texts[0], &texts[1], &texts[2], &texts[3], &texts[4], &texts[5]); err != nil {
			t.Fatal(err)
		}
		for i := range texts {
			if (texts[i] == nil) != (c.texts[i] == nil) || (texts[i] != nil && *texts[i] != *c.texts[i]) {
				t.Errorf("%d: column %d stored %v, want %v", c.params.Id, i, deref(texts[i]), deref(c.texts[i]))
			}
		}
		row, err := queries.GetMoment(ctx, GetMomentParams{Id: &c.params.Id})
		if err != nil {
			t.Fatalf("%d: %v", c.params.Id, err)
		}
		same := func(name string, got, want any) {
			if got != want {
				t.Errorf("%d: %s read %v, want %v", c.params.Id, name, got, want)
			}
		}
		same("day", show(row.Day), show(c.params.Day))
		same("local", show(row.Local), show(c.params.Local))
		same("instant", showInstant(row.Instant), showInstant(c.params.Instant))
		same("span", show(row.Span), show(c.params.Span))
		same("instants", len(row.Instants), len(c.params.Instants))
		same("instants nil", row.Instants == nil, c.params.Instants == nil)
		for i := range row.Instants {
			same("instant element", showInstant(&row.Instants[i]), showInstant(&c.params.Instants[i]))
		}
		same("required day", row.RequiredDay.String(), c.params.RequiredDay.String())
		if span := row.Span; span != nil {
			if *c.texts[3] != span.String() {
				t.Errorf("%d: span writes %s, the server %s", c.params.Id, span.String(), *c.texts[3])
			}
			var parsed pgsid.Interval
			if err := parsed.UnmarshalText([]byte(*c.texts[3])); err != nil || parsed != *span {
				t.Errorf("%d: span reads back %v, %v", c.params.Id, parsed, err)
			}
		}
	}
}

func deref(value *string) any {
	if value == nil {
		return nil
	}
	return *value
}

func show[T interface{ String() string }](value *T) any {
	if value == nil {
		return nil
	}
	return (*value).String()
}

// An instant is the same whatever location the time was read in.
func showInstant(value *pgsid.Timestamptz) any {
	if value == nil {
		return nil
	}
	if t, ok := value.Time(); ok {
		return t.UTC().Format(time.RFC3339Nano)
	}
	return value.String()
}

func TestTemporalReads(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	var instant pgsid.Timestamptz
	var local pgsid.Timestamp
	var day pgsid.Date
	var span pgsid.Interval
	if err := conn.QueryRow(ctx, "SELECT 'infinity'::timestamptz, '-infinity'::timestamp, 'infinity'::date, '-infinity'::interval").Scan(&instant, &local, &day, &span); err != nil {
		t.Fatal(err)
	}
	if _, ok := instant.Time(); ok || instant.Infinity() != 1 || local.Infinity() != -1 || day.Infinity() != 1 || span.Infinity() != -1 {
		t.Fatalf("infinities read as %v %v %v %v", instant, local, day, span)
	}
	if _, _, _, ok := span.Parts(); ok {
		t.Fatal("an infinite interval has no parts")
	}
	if err := conn.QueryRow(ctx, "SELECT '2024-02-29 12:00:00.000001+05'::timestamptz, '1999-12-31 23:59:59.5'::timestamp, '2024-02-29'::date, '1 mon 2 days 00:00:03.5'::interval").Scan(&instant, &local, &day, &span); err != nil {
		t.Fatal(err)
	}
	if got, ok := instant.Time(); !ok || !got.Equal(time.Date(2024, 2, 29, 7, 0, 0, 1000, time.UTC)) || instant.Infinity() != 0 {
		t.Fatalf("instant read as %v", instant)
	}
	if got, ok := local.Time(); !ok || got != time.Date(1999, 12, 31, 23, 59, 59, 500000000, time.UTC) {
		t.Fatalf("local read as %v", local)
	}
	if got, ok := day.Time(); !ok || got != time.Date(2024, 2, 29, 0, 0, 0, 0, time.UTC) {
		t.Fatalf("day read as %v", day)
	}
	if months, days, micros, ok := span.Parts(); !ok || months != 1 || days != 2 || micros != 3500000 {
		t.Fatalf("span read as %v", span)
	}
	// NULL has no value of these types: it needs a pointer.
	if err := conn.QueryRow(ctx, "SELECT NULL::date").Scan(&day); err == nil {
		t.Fatal("NULL scanned into a date")
	}
	var nullable *pgsid.Date
	if err := conn.QueryRow(ctx, "SELECT NULL::date").Scan(&nullable); err != nil || nullable != nil {
		t.Fatalf("NULL read as %v, %v", nullable, err)
	}
	// The simple protocol carries text both ways.
	if err := conn.QueryRow(ctx, "SELECT $1::timestamptz, $2::timestamp, $3::date, $4::interval", pgx.QueryExecModeSimpleProtocol, pgsid.TimestamptzNegInfinity, pgsid.TimestampOf(time.Date(2001, 2, 3, 4, 5, 6, 7000, time.UTC)), pgsid.DateInfinity, pgsid.IntervalOf(0, 0, math.MinInt64)).Scan(&instant, &local, &day, &span); err != nil {
		t.Fatal(err)
	}
	if months, days, micros, ok := span.Parts(); instant.Infinity() != -1 || local.String() != "2001-02-03T04:05:06.000007" || day.Infinity() != 1 || !ok || months != 0 || days != 0 || micros != math.MinInt64 {
		t.Fatalf("text values read as %v %v %v %v", instant, local, day, span)
	}
}

func TestTemporalRefusals(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	// A finite interval cannot be sent as the bytes PostgreSQL reads as infinity.
	var echoed string
	err := conn.QueryRow(ctx, "SELECT $1::interval::text", pgsid.IntervalOf(math.MaxInt32, math.MaxInt32, math.MaxInt64)).Scan(&echoed)
	if err == nil {
		t.Fatalf("sent as %s", echoed)
	}
	err = conn.QueryRow(ctx, "SELECT $1::interval::text", pgx.QueryExecModeSimpleProtocol, pgsid.IntervalOf(math.MinInt32, math.MinInt32, math.MinInt64)).Scan(&echoed)
	if err == nil {
		t.Fatalf("sent as text %s", echoed)
	}
	for _, source := range []string{"", "P", "PT", "1D", "P1", "P1S", "PT1D", "P1DT", "PT1.0000001S", "PT1H2", "PT--1S", "P99999999999Y"} {
		var span pgsid.Interval
		if span.UnmarshalText([]byte(source)) == nil {
			t.Errorf("%q read as %v", source, span)
		}
	}
	for _, source := range []string{"2024-02-30", "infinite", ""} {
		var day pgsid.Date
		if day.UnmarshalText([]byte(source)) == nil {
			t.Errorf("%q read as %v", source, day)
		}
	}
}

func TestTemporalIntervalText(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	for _, source := range []string{
		"0", "1 microsecond", "-1 microsecond", "59.999999 seconds", "-61 seconds", "1 hour -1 second",
		"25 hours", "-1 day 1 hour", "13 months", "-13 months", "1 year -1 month", "178956970 years 7 months",
		"-178956970 years -8 months", "2147483647 days", "-2147483648 days -2562047788 hours -54.775808 seconds",
		"2562047788 hours 54.775807 seconds", "1 mon -2 days 3 hours -4 minutes 5.5 seconds",
	} {
		var span pgsid.Interval
		var server string
		if err := conn.QueryRow(ctx, "SELECT $1::text::interval, $1::text::interval::text", source).Scan(&span, &server); err != nil {
			t.Fatalf("%s: %v", source, err)
		}
		if span.String() != server {
			t.Errorf("%s: writes %s, the server %s", source, span.String(), server)
		}
		var parsed pgsid.Interval
		if err := parsed.UnmarshalText([]byte(server)); err != nil || parsed != span {
			t.Errorf("%s: %s reads back as %v, %v", source, server, parsed, err)
		}
		var same bool
		if err := conn.QueryRow(ctx, "SELECT $1::interval::text = $2::text::interval::text", span, source).Scan(&same); err != nil || !same {
			t.Errorf("%s: sent back as another value, %v", source, err)
		}
		// The simple protocol reads the server's text, which follows the session's interval style.
		for _, style := range []string{"postgres", "iso_8601", "sql_standard", "postgres_verbose"} {
			if _, err := conn.Exec(ctx, "SET IntervalStyle = "+style); err != nil {
				t.Fatal(err)
			}
			var read pgsid.Interval
			err := conn.QueryRow(ctx, "SELECT $1::text::interval", pgx.QueryExecModeSimpleProtocol, source).Scan(&read)
			switch {
			case style == "postgres" || style == "iso_8601":
				if err != nil || read != span {
					t.Errorf("%s: %s text reads as %v, %v", source, style, read, err)
				}
			case err == nil && read != span:
				t.Errorf("%s: %s text misread as %v", source, style, read)
			}
		}
		if _, err := conn.Exec(ctx, "SET IntervalStyle = iso_8601"); err != nil {
			t.Fatal(err)
		}
	}
	for _, source := range []string{"infinity", "-infinity"} {
		var read pgsid.Interval
		if err := conn.QueryRow(ctx, "SELECT $1::text::interval", pgx.QueryExecModeSimpleProtocol, source).Scan(&read); err != nil || read.String() != source {
			t.Errorf("%s text reads as %v, %v", source, read, err)
		}
	}
	for _, source := range []string{"", "1", "+-1:00:00", "1 hour", "@ 1 year", "1-2", "3 4:05:06", "1 day 2", "1:00", "9223372036854775808:00:00", "2562047788:00:54.775808", "-2562047788:00:54.775809", "1 day 1.5:00:00"} {
		var read pgsid.Interval
		if err := read.ScanText(pgtype.Text{String: source, Valid: true}); err == nil {
			t.Errorf("%q reads as %v, %v", source, read, err)
		}
	}
	for source, expected := range map[string]pgsid.Interval{
		"-2562047788:00:54.775808": pgsid.IntervalOf(0, 0, math.MinInt64),
		"+2562047788:00:54.775807": pgsid.IntervalOf(0, 0, math.MaxInt64),
		"1 year -2 mons +3 days -04:05:06.5": pgsid.IntervalOf(10, 3, -14706500000),
	} {
		var read pgsid.Interval
		if err := read.ScanText(pgtype.Text{String: source, Valid: true}); err != nil || read != expected {
			t.Errorf("%q reads as %v, %v", source, read, err)
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
  root = await mkdtemp(join(tmpdir(), 'pgsid-go-temporal-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/moments.sql'), queries)
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
      'example.com/pgsid-temporal',
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
  'sends and reads Go temporal values, infinities included, through pgx',
  async () => {
    const update = await buildProject({ baseDirectory: root })
    expect(update.state.diagnostics).toEqual([])
    await writeFile(join(root, 'generated/go/queries/moments/temporal_test.go'), goTest)
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
