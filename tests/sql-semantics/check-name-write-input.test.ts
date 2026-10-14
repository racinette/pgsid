import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { buildProject } from '../../src/project-runtime.js'
it('preserves raw name parameters for database coercion and validates explicitly SQL-coerced public inputs in Go', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-name-write-'))
  try {
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      'CREATE DOMAIN name_edge AS name COLLATE "C";CREATE DOMAIN nested_name_edge AS name_edge;CREATE TABLE name_writes(position name COLLATE "C",domain_position nested_name_edge,expected bytea,CONSTRAINT position_wire CHECK(namesend(position)=expected),CONSTRAINT domain_position_wire CHECK(namesend(domain_position)=expected));\n',
    )
    await writeFile(
      join(root, 'queries/names.sql'),
      '-- name: InsertName :exec\nINSERT INTO name_writes(position,domain_position,expected) VALUES (@position,@domain_position,@expected);\n',
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
      join(root, 'generated/queries/names/name_input_test.go'),
      `package names
import (
 "context"
 "errors"
 "strings"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 schema "example.com/pgsid-fixture/generated/schema/public"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingNameDB struct { pgsid.DBTX; arguments []any; calls int; failure error }
func (db *recordingNameDB) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag,error) {
 db.calls++;db.arguments=arguments;return pgconn.NewCommandTag("INSERT 0 1"),db.failure
}
func TestRawParametersReachDatabase(t *testing.T) {
 db:=&recordingNameDB{};queries:=New(db)
 position:=strings.Repeat("a",256);domainPosition:=schema.NestedNameEdge(position);wire:=[]byte("x")
 params:=InsertNameParams{Position:&position,DomainPosition:&domainPosition,Expected:&wire}
 if err:=queries.InsertName(context.Background(),params);err!=nil {t.Fatal(err)}
 if db.calls!=1 || len(db.arguments)!=3 || db.arguments[0]!=params.Position || db.arguments[1]!=params.DomainPosition || db.arguments[2]!=params.Expected {t.Fatal("raw name parameters changed")}
 db.failure=errors.New("database name CHECK rejection")
 if err:=queries.InsertName(context.Background(),params);!errors.Is(err,db.failure) {t.Fatal("database rejection lost",err)}
}
func TestCoercedNameInputs(t *testing.T) {
 position:="é😀";domainPosition:=schema.NestedNameEdge(position);wire:=[]byte(position)
 input:=pgsid.PublicNameWritesCheckInput{Position:pgsid.KnownCheckValue(&position),DomainPosition:pgsid.KnownCheckValue(&domainPosition),Expected:pgsid.KnownCheckValue(&wire)}
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicNameWritesChecks);err!=nil {t.Fatal(err)}
 wrong:=[]byte("wrong");input.Expected=pgsid.KnownCheckValue(&wrong)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicNameWritesChecks);err==nil {t.Fatal("wrong name bytes accepted")}
 input.Expected=pgsid.KnownCheckValue(&wire)
 for _,invalid:=range []string{string([]byte{0}),string([]byte{255})} {
  input.Position.V=&invalid
  for _,check:=range pgsid.EvaluatePublicNameWritesChecks(input) {if check.Constraint=="position_wire" && check.Result.Certain {t.Fatal("invalid name encoding became definite")}}
 }
 input.Position.Set=false
 for _,check:=range pgsid.EvaluatePublicNameWritesChecks(input) {if check.Constraint=="position_wire" && check.Result.Certain {t.Fatal("missing name input became definite")}}
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
