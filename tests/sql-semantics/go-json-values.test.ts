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

const schema = `CREATE TABLE documents (
  id integer PRIMARY KEY, exact json, normal jsonb, typed jsonb, list jsonb[],
  required jsonb NOT NULL DEFAULT '{}'
);
`
const columns = 'id, exact, normal, typed, list, required'
const queries = `-- name: InsertDocument :exec
INSERT INTO documents (${columns}) VALUES (@id, @exact, @normal, @typed, @list, @required);
-- name: GetDocument :one
SELECT ${columns} FROM documents WHERE id = @id;
`

// The generated Go API against the server through pgx: a document goes in as its text and comes
// back as the server's text, decoded only when its value is asked for.
const goTest = `package documents

import (
	"context"
	"os"
	"testing"

	"example.com/pgsid-json/generated/go/jsonschemas"
	pgsid "example.com/pgsid-json/generated/go/pgsid"
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

func text[T any](t *testing.T, source string) pgsid.JSON[T] {
	t.Helper()
	document, err := pgsid.JSONText[T](source)
	if err != nil {
		t.Fatal(err)
	}
	return document
}

func TestJSONRoundTrip(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	queries := New(conn)
	exact := text[any](t, \` {"b": 1, "a": [1,  2], "b": 2} \`)
	typed, err := pgsid.JSONOf(jsonschemas.Doc{Id: 5, Label: "<a&b>"})
	if err != nil {
		t.Fatal(err)
	}
	params := InsertDocumentParams{
		Id:       1,
		Exact:    &exact,
		Normal:   &exact,
		Typed:    &typed,
		List:     []pgsid.JSON[any]{text[any](t, "[1,2]"), {}, text[any](t, \`"x"\`)},
		Required: pgsid.JSON[any]{},
	}
	if err := queries.InsertDocument(ctx, params); err != nil {
		t.Fatal(err)
	}
	var stored struct{ exact, normal, typed, required string }
	var nullRequired bool
	if err := conn.QueryRow(ctx, "SELECT exact::text, normal::text, typed::text, required::text, required IS NULL FROM documents WHERE id = 1").Scan(&stored.exact, &stored.normal, &stored.typed, &stored.required, &nullRequired); err != nil {
		t.Fatal(err)
	}
	// json keeps the text as written; jsonb keeps its own normal form.
	if stored.exact != exact.Text() || stored.normal != \`{"a": [1, 2], "b": 2}\` || stored.typed != \`{"id": 5, "label": "<a&b>"}\` {
		t.Fatalf("stored %+v", stored)
	}
	if stored.required != "null" || nullRequired {
		t.Fatalf("the null document stored as %q, SQL NULL %v", stored.required, nullRequired)
	}
	row, err := queries.GetDocument(ctx, GetDocumentParams{Id: &params.Id})
	if err != nil {
		t.Fatal(err)
	}
	if row.Exact.Text() != exact.Text() || row.Normal.Text() != stored.normal || row.Required != (pgsid.JSON[any]{}) || row.Required.Text() != "null" {
		t.Fatalf("read %s %s %s", row.Exact.Text(), row.Normal.Text(), row.Required.Text())
	}
	doc, err := row.Typed.Value()
	if err != nil || doc.Id != 5 || doc.Label != "<a&b>" {
		t.Fatalf("typed read as %+v, %v", doc, err)
	}
	value, err := row.Exact.Value()
	if object, ok := value.(map[string]any); err != nil || !ok || object["b"] != float64(2) {
		t.Fatalf("exact decodes as %#v, %v", value, err)
	}
	if len(row.List) != 3 || row.List[0].Text() != "[1, 2]" || row.List[1].Text() != "null" || row.List[2].Text() != \`"x"\` {
		t.Fatalf("list read as %v", row.List)
	}
	if err := queries.InsertDocument(ctx, InsertDocumentParams{Id: 2}); err != nil {
		t.Fatal(err)
	}
	row, err = queries.GetDocument(ctx, GetDocumentParams{Id: pointer(int32(2))})
	if err != nil || row.Exact != nil || row.Normal != nil || row.Typed != nil || row.List != nil {
		t.Fatalf("SQL NULL read as %+v, %v", row, err)
	}
	// In a nullable column the null document is a document, not SQL NULL.
	if err := queries.InsertDocument(ctx, InsertDocumentParams{Id: 3, Exact: &pgsid.JSON[any]{}, Normal: &pgsid.JSON[any]{}}); err != nil {
		t.Fatal(err)
	}
	row, err = queries.GetDocument(ctx, GetDocumentParams{Id: pointer(int32(3))})
	if err != nil || row.Exact == nil || row.Exact.Text() != "null" || row.Normal == nil || *row.Normal != (pgsid.JSON[any]{}) {
		t.Fatalf("the null document read as %+v, %v", row, err)
	}
	// The simple protocol sends the text as written too.
	var echoed string
	if err := conn.QueryRow(ctx, "SELECT $1::json::text", pgx.QueryExecModeSimpleProtocol, exact).Scan(&echoed); err != nil || echoed != exact.Text() {
		t.Fatalf("simple protocol stored %q, %v", echoed, err)
	}
}

func pointer[T any](value T) *T { return &value }

func TestJSONReads(t *testing.T) {
	ctx := context.Background()
	conn := connect(t, ctx)
	var document pgsid.JSON[any]
	if err := conn.QueryRow(ctx, "SELECT NULL::jsonb").Scan(&document); err == nil {
		t.Fatal("SQL NULL scanned into a document")
	}
	// pgx alone reads the null document into a pointer as nil; the package's target keeps it.
	var nullable *pgsid.JSON[any]
	if err := conn.QueryRow(ctx, "SELECT NULL::jsonb").Scan(pgsid.NullableJSON(&nullable)); err != nil || nullable != nil {
		t.Fatalf("SQL NULL read as %v, %v", nullable, err)
	}
	if err := conn.QueryRow(ctx, "SELECT 'null'::jsonb").Scan(pgsid.NullableJSON(&nullable)); err != nil || nullable == nil || *nullable != (pgsid.JSON[any]{}) {
		t.Fatalf("the null document read as %v, %v", nullable, err)
	}
	var typed pgsid.JSON[jsonschemas.Doc]
	if err := conn.QueryRow(ctx, \`SELECT '{"id":"x"}'::jsonb\`).Scan(&typed); err != nil {
		t.Fatal(err)
	}
	if _, err := typed.Value(); err == nil {
		t.Fatal("a document of another shape decoded")
	}
	for _, invalid := range []string{"", "{", "[1,]", "1 2"} {
		if _, err := pgsid.JSONText[any](invalid); err == nil {
			t.Errorf("%q accepted as JSON text", invalid)
		}
	}
	null, err := pgsid.JSONOf[any](nil)
	if err != nil || null != (pgsid.JSON[any]{}) {
		t.Fatalf("nil written as %v, %v", null, err)
	}
}
`

const goBinary = process.env['PGSID_GO_BINARY'] ?? 'go'
const goAvailable = spawnSync(goBinary, ['version'], { encoding: 'utf8' }).status === 0

let root: string
let db: PGlite
let server: Awaited<ReturnType<typeof servePglite>>

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-go-json-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(join(root, 'queries/documents.sql'), queries)
  await writeFile(
    join(root, 'pgsid.yaml'),
    `schema: schema.sql
types:
  jsonSchemas:
    Doc:
      schema:
        type: object
        required: [id, label]
        properties:
          id: { type: integer }
          label: { type: string }
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    go:
      driver: pgx
      mappings:
        column:
          public.documents.typed: { jsonSchema: Doc }
      schema: { outDir: generated/go/schema }
      queries:
        out:
          queries: generated/go/queries
`,
  )
  await writeGoModule(root, 'example.com/pgsid-json')
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
  'sends and reads Go JSON documents through pgx as their text',
  async () => {
    const update = await buildProject({ baseDirectory: root })
    expect(update.state.diagnostics).toEqual([])
    await writeFile(join(root, 'generated/go/queries/documents/json_test.go'), goTest)
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
