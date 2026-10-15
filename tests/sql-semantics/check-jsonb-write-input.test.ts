import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { buildProject } from '../../src/project-runtime.js'

it('validates SQL-coerced Go JSONB graphs and forwards raw JSONB query parameters unchanged', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-write-'))
  try {
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      `CREATE DOMAIN stored_document AS jsonb;CREATE DOMAIN retained_document AS stored_document;
  CREATE TABLE jsonb_writes(document jsonb,domain_document retained_document,expected_kind text COLLATE "C",expected_source text COLLATE "C",
  CONSTRAINT shape CHECK(jsonb_typeof(document) COLLATE "C"=expected_kind),
  CONSTRAINT domain_shape CHECK(jsonb_typeof(domain_document) COLLATE "C"=expected_kind),
  CONSTRAINT source CHECK(document::text COLLATE "C"=expected_source),
  CONSTRAINT present CHECK(document IS NOT NULL));
  CREATE SCHEMA isolated;CREATE TABLE isolated.jsonb_presence(document jsonb CONSTRAINT required CHECK(document IS NOT NULL));`,
    )
    await writeFile(
      join(root, 'queries/documents.sql'),
      '-- name: InsertDocument :exec\nINSERT INTO jsonb_writes(document,domain_document,expected_kind,expected_source) VALUES(@document,@domain_document,@expected_kind,@expected_source);\n',
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
      join(root, 'generated/queries/documents/jsonb_input_test.go'),
      `package documents
import (
 "context"
 "encoding/json"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime"
 schema "example.com/pgsid-fixture/generated/schema/public"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingJSONBDB struct {pgsid.DBTX;arguments []any;calls int;failure error}
func(db *recordingJSONBDB)Exec(ctx context.Context,sql string,arguments ...any)(pgconn.CommandTag,error){db.calls++;db.arguments=arguments;return pgconn.NewCommandTag("INSERT 0 1"),db.failure}
func TestRawJSONBReachesDatabase(t *testing.T){
 db:=&recordingJSONBDB{};queries:=New(db)
 raw:=json.RawMessage(${JSON.stringify('{"a":9007199254740993,"a":2}')});domain:=schema.RetainedDocument(raw);kind:="object";source:="deliberately wrong"
 params:=InsertDocumentParams{Document:&raw,DomainDocument:&domain,ExpectedKind:&kind,ExpectedSource:&source}
 if err:=queries.InsertDocument(context.Background(),params);err!=nil||db.calls!=1{t.Fatal(err)}
 if len(db.arguments)!=4||db.arguments[0]!=params.Document||db.arguments[1]!=params.DomainDocument||db.arguments[2]!=params.ExpectedKind||db.arguments[3]!=params.ExpectedSource{t.Fatal("raw JSONB parameters changed")}
 db.failure=&pgconn.PgError{Code:"22P02",Message:"invalid JSONB input"};raw=json.RawMessage("[1,]")
 if err:=queries.InsertDocument(context.Background(),params);!errors.Is(err,db.failure)||db.calls!=2{t.Fatal("database conversion error lost",err)}
}
func TestCoercedJSONBValues(t *testing.T){
 kind:="object";source:=${JSON.stringify('{"a": 9007199254740993.00}')};value:=checkruntime.MakeJsonbValue(source)
 input:=pgsid.PublicJsonbWritesCheckInput{Document:pgsid.KnownCheckValue(value),DomainDocument:pgsid.KnownCheckValue(value),ExpectedKind:pgsid.KnownCheckValue(&kind),ExpectedSource:pgsid.KnownCheckValue(&source)}
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonbWritesChecks);err!=nil{t.Fatal(err)}
 kind="array";if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonbWritesChecks);err==nil{t.Fatal("wrong JSONB kind accepted")};kind="object"
 input.Document=pgsid.NullCheckValue[checkruntime.JsonbValue]();if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonbWritesChecks);err==nil{t.Fatal("SQL NULL passed presence")}
 input.Document=pgsid.KnownCheckValue(checkruntime.JsonbValue{Kind:checkruntime.JsonbValueError,Error:checkruntime.MakeSqlError(${parseInt('22003', 36)})})
 for _,check:=range pgsid.EvaluatePublicJsonbWritesChecks(input){if check.Constraint!="domain_shape"&&(!check.Result.Certain||check.Result.Value.Error!="22003"){t.Fatal("JSONB error lost",check)}}
 for _,mutate:=range []func(*checkruntime.JsonbPayload){
  func(p *checkruntime.JsonbPayload){p.Root=0},func(p *checkruntime.JsonbPayload){p.Root=999},func(p *checkruntime.JsonbPayload){p.Root=-1},
  func(p *checkruntime.JsonbPayload){p.Nodes[1].Kind=7},func(p *checkruntime.JsonbPayload){p.Nodes[1].Child=1},func(p *checkruntime.JsonbPayload){p.Nodes[1].Child=999},
  func(p *checkruntime.JsonbPayload){p.Nodes[2].Next=2},func(p *checkruntime.JsonbPayload){p.Nodes[2].Next=999},func(p *checkruntime.JsonbPayload){p.Nodes[2].Child=1},
  func(p *checkruntime.JsonbPayload){p.Nodes[2].TextEnd=999},func(p *checkruntime.JsonbPayload){p.Nodes[2].TextStart=p.Nodes[2].TextEnd+1},
  func(p *checkruntime.JsonbPayload){p.Nodes[2].KeyStart=-1},func(p *checkruntime.JsonbPayload){p.Characters[p.Nodes[2].KeyStart]=0},
  func(p *checkruntime.JsonbPayload){p.Characters[p.Nodes[2].TextStart]=0},func(p *checkruntime.JsonbPayload){p.Characters[0]=0xd800},
 }{
  bad:=checkruntime.MakeJsonbValue(${JSON.stringify('{"a":"x"}')});mutate(&bad.Value);input.Document=pgsid.KnownCheckValue(bad)
  for _,check:=range pgsid.EvaluatePublicJsonbWritesChecks(input){if check.Constraint!="domain_shape"&&check.Result.Certain{t.Fatal("invalid JSONB graph became definite",check)}}
 }
 for _,text:=range []string{"NaN","1e999999",${JSON.stringify('{"a":1}')} ,"null","1,2"}{
  bad:=checkruntime.MakeJsonbValue("1");bad.Value.Characters=[]rune(text);bad.Value.Nodes[1].TextStart=0;bad.Value.Nodes[1].TextEnd=len([]rune(text));input.Document=pgsid.KnownCheckValue(bad)
  for _,check:=range pgsid.EvaluatePublicJsonbWritesChecks(input){if check.Constraint!="domain_shape"&&check.Result.Certain{t.Fatal("invalid JSONB number became definite",text,check)}}
 }
 input.Document=pgsid.KnownCheckValue(checkruntime.MakeJsonbValue("null"));kind="null";source="null"
 for _,check:=range pgsid.EvaluatePublicJsonbWritesChecks(input){if check.Constraint!="domain_shape"&&(!check.Result.Certain||!check.Result.Value.Valid||!check.Result.Value.Value){t.Fatal("JSON null became SQL NULL",check)}}
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
}, 240000)
