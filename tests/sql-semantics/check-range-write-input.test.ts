import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildProject } from '../../src/project-runtime.js'

it('preserves raw range query arguments and database rejection while exposing typed SQL-coerced CHECK inputs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-range-write-'))
  try {
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      `CREATE DOMAIN retained_span AS int4range;CREATE DOMAIN nested_span AS retained_span;
   CREATE TABLE range_writes(span int4range,domain_span nested_span,expected boolean,
    CONSTRAINT span_shape CHECK(isempty(span)=expected),CONSTRAINT domain_shape CHECK(isempty(domain_span)=expected));\n`,
    )
    await writeFile(
      join(root, 'queries/windows.sql'),
      '-- name: InsertWindow :exec\nINSERT INTO range_writes(span,domain_span,expected) VALUES(@span,@domain_span,@expected);\n',
    )
    await writeFile(
      join(root, 'pgsid.yaml'),
      `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: {plpgsql: false}
  codegen:
    go:
      driver: pgx
      schema: {outDir: generated/schema}
      queries:
        out:
          queries: generated/queries
`,
    )
    for (const file of ['go.mod', 'go.sum'])
      await writeFile(join(root, file), await readFile('tests/fixtures/codegen/project/' + file))
    const built = await buildProject({ baseDirectory: root })
    expect(built.state.diagnostics).toEqual([])
    await writeFile(
      join(root, 'generated/queries/windows/range_test.go'),
      `package windows
import("context";"errors";"testing";pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx";checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime";schema "example.com/pgsid-fixture/generated/schema/public";"github.com/jackc/pgx/v5/pgconn")
type rangeDB struct{pgsid.DBTX;args []any;calls int;failure error}
func(db *rangeDB)Exec(ctx context.Context,sql string,args ...any)(pgconn.CommandTag,error){db.calls++;db.args=args;return pgconn.NewCommandTag("INSERT 0 1"),db.failure}
func TestRangeWrites(t *testing.T){
 db:=&rangeDB{};queries:=New(db);var span any="not a range";var domain schema.NestedSpan="not a range";expected:=false
 params:=InsertWindowParams{Span:&span,DomainSpan:&domain,Expected:&expected}
 if err:=queries.InsertWindow(context.Background(),params);err!=nil{t.Fatal(err)}
 if db.calls!=1||len(db.args)!=3||db.args[0]!=params.Span||db.args[1]!=params.DomainSpan||db.args[2]!=params.Expected{t.Fatal("raw parameters changed")}
 db.failure=errors.New("database range input failure");if err:=queries.InsertWindow(context.Background(),params);!errors.Is(err,db.failure){t.Fatal("database error lost",err)}
 value:=checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:"pg_catalog.int4range",ElementType:"pg_catalog.int4",ElementKind:2,LowerInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt4,Int4:1},{Kind:checkruntime.ArrayElementInt4,Int4:9}}})
 input:=pgsid.PublicRangeWritesCheckInput{Span:pgsid.KnownCheckValue(value),DomainSpan:pgsid.KnownCheckValue(value),Expected:pgsid.KnownCheckValue(&expected)}
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicRangeWritesChecks);err!=nil{t.Fatal("typed range",err)}
 expected=true;if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicRangeWritesChecks);err==nil{t.Fatal("wrong range shape was accepted")}
}
`,
    )
    await promisify(execFile)('go', ['test', '-mod=mod', '-p', '1', './...'], { cwd: root }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 180000)
