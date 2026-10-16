import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { buildProject } from '../../src/project-runtime.js'

it('preserves raw JSONPath parameters and validates explicit text casts before writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-write-'))
  try {
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      `CREATE TABLE path_writes(path jsonpath,expected text,
      CONSTRAINT source CHECK(path::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"),
      CONSTRAINT present CHECK(path IS NOT NULL));
      CREATE TABLE path_text_writes(source text,expected text,bypass boolean,
      CONSTRAINT canonical CHECK(CASE WHEN bypass THEN true ELSE source::jsonpath::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END));`,
    )
    await writeFile(
      join(root, 'queries/paths.sql'),
      '-- name: InsertPath :exec\nINSERT INTO path_writes(path,expected) VALUES(@path,@expected);\n-- name: InsertPathText :exec\nINSERT INTO path_text_writes(source,expected,bypass) VALUES(@source,@expected,@bypass);\n',
    )
    await writeFile(
      join(root, 'pgsid.yaml'),
      `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    checks: { defaultCollation: C, serverEncoding: UTF8 }
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
      join(root, 'generated/queries/paths/jsonpath_input_test.go'),
      `package paths
import (
 "context"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingPathDB struct { pgsid.DBTX; arguments []any; calls int; failure error }
func(db *recordingPathDB)Exec(ctx context.Context,sql string,arguments ...any)(pgconn.CommandTag,error){db.calls++;db.arguments=arguments;return pgconn.NewCommandTag("INSERT 0 1"),db.failure}
func TestRawPathAssignment(t *testing.T){
 db:=&recordingPathDB{};queries:=New(db);var raw any="$.a";expected:="deliberately wrong"
 params:=InsertPathParams{Path:&raw,Expected:&expected}
 if err:=queries.InsertPath(context.Background(),params);err!=nil||db.calls!=1{t.Fatal(err)}
 if len(db.arguments)!=2||db.arguments[0]!=params.Path||db.arguments[1]!=params.Expected{t.Fatal("raw path parameters changed")}
 db.failure=&pgconn.PgError{Code:"42601",Message:"invalid path"};raw="(";params.Path=&raw
 if err:=queries.InsertPath(context.Background(),params);!errors.Is(err,db.failure)||db.calls!=2{t.Fatal("database conversion error lost",err)}
}
func TestExplicitPathTextCast(t *testing.T){
 db:=&recordingPathDB{};queries:=New(db);source:="lax $";expected:="$";bypass:=false
 params:=InsertPathTextParams{Source:&source,Expected:&expected,Bypass:&bypass}
 if err:=queries.InsertPathText(context.Background(),params);err!=nil||db.calls!=1{t.Fatal(err)}
 for _,c:=range []struct{source,state string}{{"(","42601"},{"1e131072","22003"}}{
  source=c.source;input:=pgsid.PublicPathTextWritesCheckInput{Source:pgsid.KnownCheckValue(&source),Expected:pgsid.KnownCheckValue(&expected),Bypass:pgsid.KnownCheckValue(&bypass)}
  result:=pgsid.EvaluatePublicPathTextWritesChecks(input)[0].Result
  if !result.Certain||result.Value.Error!=c.state{t.Fatal("path cast error lost",c,result)}
  before:=db.calls;if err:=queries.InsertPathText(context.Background(),params);err==nil||db.calls!=before{t.Fatal("invalid cast reached database",err)}
  bypass=true;if err:=queries.InsertPathText(context.Background(),params);err!=nil||db.calls!=before+1{t.Fatal("skipped cast failed",err)};bypass=false
 }
}
`,
    )
    await promisify(execFile)('go', ['test', '-mod=mod', '-p', '1', './...'], { cwd: root }).catch(
      (failure: { stdout: string; stderr: string }) => {
        throw new Error(failure.stdout + failure.stderr, { cause: failure })
      },
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 180_000)
