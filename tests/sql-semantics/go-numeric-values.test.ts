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
import { buildGoNumericAsset } from '../../scripts/build-go-numeric.js'

const schema = `CREATE DOMAIN price AS numeric(12,2) CHECK (VALUE >= 0);
CREATE TABLE amounts (
  id integer PRIMARY KEY, exact numeric, scaled numeric(10,3), cost price, list numeric[],
  CONSTRAINT scaled_small CHECK (scaled < 1000)
);
`
const queries = `-- name: InsertAmount :exec
INSERT INTO amounts (id, exact, scaled, cost, list) VALUES (@id, @exact, @scaled, @cost, @list);
-- name: GetAmount :one
SELECT id, exact, scaled, cost, list FROM amounts WHERE id = @id;
`

// The generated Go numeric against the server through pgx: every result of its arithmetic, and
// every error, is compared with what the server computes for the same operands.
const goTest = `package amounts

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"testing"

	pgsid "example.com/pgsid-numeric/generated/go/pgsid"
	public "example.com/pgsid-numeric/generated/go/schema/public"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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
func numeric(t *testing.T, text string) pgsid.Numeric {
	t.Helper()
	value, err := pgsid.NumericOf(text)
	if err != nil {
		t.Fatal(text, err)
	}
	return value
}
func pointer[T any](value T) *T { return &value }

// What the server computes for an expression of two numerics: its text, or its error code. The
// simple protocol sends the values as their text, and a statement the server rejects leaves no
// prepared statement behind.
func server(t *testing.T, ctx context.Context, conn *pgx.Conn, sql string, args ...any) string {
	t.Helper()
	var text string
	if err := conn.QueryRow(ctx, "SELECT ("+sql+")::text", append([]any{pgx.QueryExecModeSimpleProtocol}, args...)...).Scan(&text); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			return "error " + pgErr.Code
		}
		t.Fatal(sql, err)
	}
	return text
}
func local(value pgsid.Numeric, err error) string {
	var numericErr *pgsid.NumericError
	if errors.As(err, &numericErr) {
		return "error " + numericErr.SQLState()
	}
	if err != nil {
		return err.Error()
	}
	return value.String()
}

func TestArithmetic(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	pairs := [][2]string{
		{"1.50", "2.25"}, {"1", "3"}, {"-7.5", "2"}, {"NaN", "1"}, {"Infinity", "-Infinity"},
		{"Infinity", "2"}, {"1e10", "3.333"}, {"0.0001", "12345.6789"}, {"1", "0"}, {"0", "0"},
		{"123456789012345678901234567890.123456789", "987654321.987654321"}, {"-0.000", "5.0"},
	}
	for _, pair := range pairs {
		a, b := numeric(t, pair[0]), numeric(t, pair[1])
		for _, op := range []struct {
			sql   string
			local func() (pgsid.Numeric, error)
		}{
			{"$1::numeric + $2::numeric", func() (pgsid.Numeric, error) { return a.Add(b) }},
			{"$1::numeric - $2::numeric", func() (pgsid.Numeric, error) { return a.Sub(b) }},
			{"$1::numeric * $2::numeric", func() (pgsid.Numeric, error) { return a.Mul(b) }},
			{"$1::numeric / $2::numeric", func() (pgsid.Numeric, error) { return a.Div(b) }},
			{"$1::numeric % $2::numeric", func() (pgsid.Numeric, error) { return a.Mod(b) }},
			{"round($1::numeric, 2)", func() (pgsid.Numeric, error) { return a.Round(2) }},
			{"round($1::numeric, -1)", func() (pgsid.Numeric, error) { return a.Round(-1) }},
			{"trunc($1::numeric, 1)", func() (pgsid.Numeric, error) { return a.Trunc(1) }},
			{"-$1::numeric", func() (pgsid.Numeric, error) { return a.Neg(), nil }},
			{"abs($1::numeric)", func() (pgsid.Numeric, error) { return a.Abs(), nil }},
			{"sign($1::numeric)", func() (pgsid.Numeric, error) { return a.Sign(), nil }},
		} {
			args := []any{a, b}
			if !containsSecond(op.sql) {
				args = args[:1]
			}
			if got, want := local(op.local()), server(t, ctx, conn, op.sql, args...); got != want {
				t.Errorf("%s with %v: got %s, the server %s", op.sql, pair, got, want)
			}
		}
		var order int
		var equal bool
		if err := conn.QueryRow(ctx, "SELECT sign(numeric_cmp($1::numeric, $2::numeric)), $1::numeric = $2::numeric", a, b).Scan(&order, &equal); err != nil {
			t.Fatal(err)
		}
		if a.Cmp(b) != order || a.Equal(b) != equal {
			t.Errorf("order of %v: got %d %v, the server %d %v", pair, a.Cmp(b), a.Equal(b), order, equal)
		}
	}
}
func containsSecond(sql string) bool {
	for i := 0; i+1 < len(sql); i++ {
		if sql[i] == '$' && sql[i+1] == '2' {
			return true
		}
	}
	return false
}

func TestInput(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	for _, text := range []string{"1.500", " 42 ", "-0", "1e3", ".5", "NaN", "inf", "-Infinity", "abc", "1.2.3", "", "1e1000000"} {
		var echoed string
		want := ""
		if err := conn.QueryRow(ctx, "SELECT $1::text::numeric::text", pgx.QueryExecModeSimpleProtocol, text).Scan(&echoed); err != nil {
			var pgErr *pgconn.PgError
			if !errors.As(err, &pgErr) {
				t.Fatal(err)
			}
			want = "error " + pgErr.Code
		} else {
			want = echoed
		}
		if got := local(pgsid.NumericOf(text)); got != want {
			t.Errorf("input %q: got %s, the server %s", text, got, want)
		}
	}
	if (pgsid.Numeric{}).String() != "0" {
		t.Error("the zero value is not 0")
	}
}

func TestQueries(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	queries := New(conn)
	if _, err := conn.Exec(ctx, "DELETE FROM amounts"); err != nil {
		t.Fatal(err)
	}
	for index, text := range []string{"1.500", "NaN", "Infinity", "-Infinity", "123456789012345678901234567890.000000000000001", "0"} {
		value := numeric(t, text)
		id := int32(index + 1)
		params := InsertAmountParams{Id: id, Exact: &value, Scaled: pointer(numeric(t, "1.2")), Cost: pointer(numeric(t, "3")), List: []pgsid.Numeric{value, numeric(t, "2.50")}}
		if err := queries.InsertAmount(ctx, params); err != nil {
			t.Fatal(text, err)
		}
		row, err := queries.GetAmount(ctx, GetAmountParams{Id: &id})
		if err != nil {
			t.Fatal(err)
		}
		if row.Exact.String() != server(t, ctx, conn, "SELECT exact FROM amounts WHERE id = $1", id) || row.Scaled.String() != "1.200" || row.Cost.String() != "3.00" || len(row.List) != 2 || row.List[1].String() != "2.50" {
			t.Errorf("%s read back as %v %v %v %v", text, row.Exact, row.Scaled, row.Cost, row.List)
		}
		var echoed string
		if err := conn.QueryRow(ctx, "SELECT $1::numeric::text", pgx.QueryExecModeSimpleProtocol, value).Scan(&echoed); err != nil || echoed != row.Exact.String() {
			t.Errorf("%s over the simple protocol: %s, %v", text, echoed, err)
		}
	}
	var null *pgsid.Numeric
	if err := conn.QueryRow(ctx, "SELECT NULL::numeric").Scan(&null); err != nil || null != nil {
		t.Fatalf("NULL read as %v, %v", null, err)
	}
	var plain pgsid.Numeric
	if err := conn.QueryRow(ctx, "SELECT NULL::numeric").Scan(&plain); err == nil {
		t.Fatal("NULL scanned into a numeric")
	}
	// The table's CHECKs see the values as the server would, after the column's and the domain's
	// scales are applied; the server's own outcome comes from the same insert sent as text.
	for _, c := range [][2]string{{"999.9994", "1"}, {"999.9995", "1"}, {"1", "-0.004"}, {"1", "-0.005"}, {"NaN", "1"}} {
		evaluations, err := public.EvaluatePublicAmountsChecks(public.PublicAmountsCheckInput{
			Id: public.KnownCheckValue(int32(100)), Exact: public.NullCheckValue[*pgsid.Numeric](), Scaled: public.KnownCheckValue(pointer(numeric(t, c[0]))),
			Cost: public.KnownCheckValue(pointer(numeric(t, c[1]))), List: public.NullCheckValue[[]pgsid.Numeric](),
		})
		if err != nil {
			t.Fatal(err)
		}
		// The column's domain checks its own constraint, as the server does reading the value.
		domain, err := public.EvaluatePublicPriceDomainChecks(public.PublicPriceCheckInput{Value: public.KnownCheckValue(pointer(numeric(t, c[1])))})
		if err != nil {
			t.Fatal(err)
		}
		got := ""
		for _, evaluation := range append(domain, evaluations...) {
			switch {
			case !evaluation.Result.Certain:
				got = "undecided " + evaluation.Constraint
			case evaluation.Result.Value.Error != "":
				got = "error " + evaluation.Result.Value.Error
			case evaluation.Result.Value.Valid && !evaluation.Result.Value.Value:
				got = "error 23514"
			}
		}
		want := ""
		if _, err := conn.Exec(ctx, "INSERT INTO amounts (id, scaled, cost) VALUES (100, $1, $2)", pgx.QueryExecModeSimpleProtocol, c[0], c[1]); err != nil {
			var pgErr *pgconn.PgError
			if !errors.As(err, &pgErr) {
				t.Fatal(err)
			}
			want = "error " + pgErr.Code
		}
		if got != want {
			t.Errorf("scaled %s cost %s: %q, the server %q", c[0], c[1], got, want)
		}
		if _, err := conn.Exec(ctx, "DELETE FROM amounts WHERE id = 100", pgx.QueryExecModeSimpleProtocol); err != nil {
			t.Fatal(err)
		}
	}
}

func TestJSON(t *testing.T) {
	value := numeric(t, "1.500")
	data, err := json.Marshal(value)
	if err != nil || string(data) != "\\"1.500\\"" {
		t.Fatalf("marshalled as %s, %v", data, err)
	}
	var read pgsid.Numeric
	if err := json.Unmarshal([]byte("2.250"), &read); err != nil || read.String() != "2.250" {
		t.Fatalf("a number read as %v, %v", read, err)
	}
	if err := json.Unmarshal([]byte("\\"NaN\\""), &read); err != nil || !read.IsNaN() {
		t.Fatalf("a string read as %v, %v", read, err)
	}
	if err := json.Unmarshal([]byte("\\"abc\\""), &read); err == nil {
		t.Fatal("malformed text read")
	}
}
`

const goBinary = process.env['PGSID_GO_BINARY'] ?? 'go'
const goAvailable = spawnSync(goBinary, ['version'], { encoding: 'utf8' }).status === 0

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-go-numeric-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/amounts.sql'), queries)
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
      'example.com/pgsid-numeric',
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
  'computes, sends and reads Go numerics as PostgreSQL does',
  async () => {
    const update = await buildProject({ baseDirectory: root })
    expect(update.state.diagnostics).toEqual([])
    await writeFile(join(root, 'generated/go/queries/amounts/numeric_test.go'), goTest)
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

it.skipIf(!goAvailable)(
  'ships the evaluator files the numeric value reaches as the asset build prunes them',
  async () => {
    expect(
      await readFile(new URL('../../src/codegen/go/assets/go-numeric.json', import.meta.url), 'utf8'),
    ).toBe(buildGoNumericAsset())
  },
  300_000,
)
