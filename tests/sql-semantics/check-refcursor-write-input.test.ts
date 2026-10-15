import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { buildProject } from '../../src/project-runtime.js'
it('preserves raw cursor parameters and validates portable wire constraints in Go', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-refcursor-write-'))
  try {
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      'CREATE DOMAIN cursor_edge AS refcursor;CREATE DOMAIN nested_cursor_edge AS cursor_edge;CREATE TABLE cursor_writes(position refcursor,domain_position nested_cursor_edge,expected bytea,CONSTRAINT position_wire CHECK(textsend(position::text)=expected),CONSTRAINT domain_position_wire CHECK(textsend(domain_position::text)=expected));\n',
    )
    await writeFile(
      join(root, 'queries/cursors.sql'),
      '-- name: InsertCursor :exec\nINSERT INTO cursor_writes(position,domain_position,expected) VALUES (@position,@domain_position,@expected);\n',
    )
    await writeFile(
      join(root, 'pgsid.yaml'),
      `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    go:
      driver: pgx
      schema: { outDir: generated/schema }
      queries:
        out:
          queries: generated/queries
`,
    )
    for (const file of ['go.mod', 'go.sum'])
      await writeFile(
        join(root, file),
        await readFile('tests/fixtures/codegen/project/' + file, 'utf8'),
      )
    const built = await buildProject({ baseDirectory: root })
    expect(built.state.diagnostics).toEqual([])
    await writeFile(
      join(root, 'generated/queries/cursors/cursor_input_test.go'),
      `package cursors
import (
 "context"
 "errors"
 "strings"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 schema "example.com/pgsid-fixture/generated/schema/public"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingCursorDB struct { pgsid.DBTX; arguments []any; calls int; failure error }
func (db *recordingCursorDB) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag,error) {
 db.calls++;db.arguments=arguments;return pgconn.NewCommandTag("INSERT 0 1"),db.failure
}
func TestRawParametersReachDatabase(t *testing.T) {
 db:=&recordingCursorDB{};queries:=New(db)
 position:=strings.Repeat("a",256);domainPosition:=schema.NestedCursorEdge(position);wire:=[]byte(position)
 params:=InsertCursorParams{Position:&position,DomainPosition:&domainPosition,Expected:&wire}
 if err:=queries.InsertCursor(context.Background(),params);err!=nil {t.Fatal(err)}
 if db.calls!=1 || len(db.arguments)!=3 || db.arguments[0]!=params.Position || db.arguments[1]!=params.DomainPosition || db.arguments[2]!=params.Expected {t.Fatal("raw cursor parameters changed")}
 wrong:=[]byte("wrong");params.Expected=&wrong
 if err:=queries.InsertCursor(context.Background(),params);err==nil || db.calls!=1 {t.Fatal("portable wrong cursor wire reached database",err)}
 params.Expected=&wire;position=string([]byte{0})
 db.failure=errors.New("database cursor encoding rejection")
 if err:=queries.InsertCursor(context.Background(),params);!errors.Is(err,db.failure) || db.calls!=2 {t.Fatal("database rejection lost",err)}
}
func TestCoercedCursorInputs(t *testing.T) {
 position:="ascii_name";domainPosition:=schema.NestedCursorEdge(position);wire:=[]byte(position)
 input:=pgsid.PublicCursorWritesCheckInput{Position:pgsid.KnownCheckValue(&position),DomainPosition:pgsid.KnownCheckValue(&domainPosition),Expected:pgsid.KnownCheckValue(&wire)}
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicCursorWritesChecks);err!=nil {t.Fatal(err)}
 wrong:=[]byte("wrong");input.Expected=pgsid.KnownCheckValue(&wrong)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicCursorWritesChecks);err==nil {t.Fatal("wrong cursor bytes accepted")}
 input.Expected=pgsid.KnownCheckValue(&wire)
 position="é😀"
 for _,check:=range pgsid.EvaluatePublicCursorWritesChecks(input) {if check.Constraint=="position_wire" && check.Result.Certain {t.Fatal("session-dependent cursor wire became definite")}}
 for _,invalid:=range []string{string([]byte{0}),string([]byte{255})} {
  input.Position.V=&invalid
  for _,check:=range pgsid.EvaluatePublicCursorWritesChecks(input) {if check.Constraint=="position_wire" && check.Result.Certain {t.Fatal("invalid cursor encoding became definite")}}
 }
 input.Position.Set=false
 for _,check:=range pgsid.EvaluatePublicCursorWritesChecks(input) {if check.Constraint=="position_wire" && check.Result.Certain {t.Fatal("missing cursor input became definite")}}
}
`,
    )
    await promisify(execFile)('go', ['test', '-mod=mod', '-p', '1', './...'], { cwd: root }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
