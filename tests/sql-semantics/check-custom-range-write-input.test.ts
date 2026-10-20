import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildProject } from '../../src/project-runtime.js'

it('preserves raw custom range and multirange query arguments and exposes SQL-coerced CHECK inputs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-write-'))
  try {
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      `
CREATE TYPE write_span AS RANGE(subtype=int4);
CREATE DOMAIN saved_write AS write_span;
CREATE TABLE custom_writes(v write_span,w saved_write,m write_span_multirange,expected bool,
 CONSTRAINT scalar CHECK(isempty(v)=expected),CONSTRAINT domain_shape CHECK(isempty(w)=expected),CONSTRAINT multi CHECK(isempty(m)=expected));`,
    )
    await writeFile(
      join(root, 'queries/windows.sql'),
      '-- name: InsertWindow :exec\nINSERT INTO custom_writes(v,w,m,expected) VALUES(@v,@w,@m,@expected);\n',
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
      join(root, 'generated/queries/windows/custom_test.go'),
      `package windows
import("context";"errors";"testing";pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx";checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime";schema "example.com/pgsid-fixture/generated/schema/public";"github.com/jackc/pgx/v5/pgconn")
type customDB struct{pgsid.DBTX;args []any;calls int;failure error}
func(db *customDB)Exec(ctx context.Context,sql string,args ...any)(pgconn.CommandTag,error){db.calls++;db.args=args;return pgconn.NewCommandTag("INSERT 0 1"),db.failure}
func TestCustomWrites(t *testing.T){
 db:=&customDB{};queries:=New(db);var v any="not a range";var w schema.SavedWrite="not a range";var m any="not a multirange";expected:=false
 params:=InsertWindowParams{V:&v,W:&w,M:&m,Expected:&expected}
 if err:=queries.InsertWindow(context.Background(),params);err!=nil{t.Fatal(err)}
 if db.calls!=1||len(db.args)!=4||db.args[0]!=params.V||db.args[1]!=params.W||db.args[2]!=params.M||db.args[3]!=params.Expected{t.Fatal("raw parameters changed")}
 db.failure=errors.New("database custom range conversion failure");if err:=queries.InsertWindow(context.Background(),params);!errors.Is(err,db.failure){t.Fatal("database error lost",err)}
 value:=checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:"public.write_span",ElementType:"pg_catalog.int4",ElementKind:2,LowerInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt4,Int4:1},{Kind:checkruntime.ArrayElementInt4,Int4:9}}})
 multi:=checkruntime.MakeCoercedMultirangeValue(checkruntime.MultirangePayload{TypeName:"public.write_span_multirange",RangeType:"public.write_span",ElementType:"pg_catalog.int4",ElementKind:2,Ranges:[]checkruntime.RangeValue{value}})
 input:=pgsid.PublicCustomWritesCheckInput{V:pgsid.KnownCheckValue(value),W:pgsid.KnownCheckValue(value),M:pgsid.KnownCheckValue(multi),Expected:pgsid.KnownCheckValue(&expected)}
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicCustomWritesChecks);err!=nil{t.Fatal("SQL-coerced custom values",err)}
 expected=true;if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicCustomWritesChecks);err==nil{t.Fatal("wrong shape accepted")}
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
}, 240_000)
