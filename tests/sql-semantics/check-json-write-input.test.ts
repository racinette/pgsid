import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { buildProject } from '../../src/project-runtime.js'

it('preserves raw JSON query parameters and validates SQL-coerced Go wrappers without trusting cached type metadata', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-json-write-'))
  try {
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      `CREATE DOMAIN document_value AS json;CREATE DOMAIN nested_document AS document_value;
      CREATE TABLE json_writes(document json,domain_document nested_document,expected_kind text COLLATE "C",expected_source text COLLATE "C",
      CONSTRAINT shape CHECK(json_typeof(document) COLLATE "C"=expected_kind),
      CONSTRAINT domain_shape CHECK(json_typeof(domain_document) COLLATE "C"=expected_kind),
      CONSTRAINT source CHECK(document::text COLLATE "C"=expected_source),
      CONSTRAINT present CHECK(document IS NOT NULL));
      CREATE TABLE json_text_writes(source_text text,expected_text text,bypass boolean,
      CONSTRAINT canonical CHECK(CASE WHEN bypass THEN true ELSE source_text::nested_document::text COLLATE "C"=expected_text COLLATE "C" END));\n`,
    )
    await writeFile(
      join(root, 'queries/documents.sql'),
      '-- name: InsertDocument :exec\nINSERT INTO json_writes(document,domain_document,expected_kind,expected_source) VALUES (@document,@domain_document,@expected_kind,@expected_source);\n-- name: InsertDocumentText :exec\nINSERT INTO json_text_writes(source_text,expected_text,bypass) VALUES (@source_text,@expected_text,@bypass);\n',
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
      join(root, 'generated/queries/documents/json_input_test.go'),
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
type recordingJSONDB struct {pgsid.DBTX;arguments []any;calls int;failure error}
func(db *recordingJSONDB)Exec(ctx context.Context,sql string,arguments ...any)(pgconn.CommandTag,error){db.calls++;db.arguments=arguments;return pgconn.NewCommandTag("INSERT 0 1"),db.failure}
func TestRawJSONReachesDatabase(t *testing.T){
 db:=&recordingJSONDB{};queries:=New(db)
 document:=json.RawMessage("{\\"a\\":9007199254740993,\\"a\\":2}");domainDocument:=schema.NestedDocument(document);kind:="object";source:=string(document)
 params:=InsertDocumentParams{Document:&document,DomainDocument:&domainDocument,ExpectedKind:&kind,ExpectedSource:&source}
 if err:=queries.InsertDocument(context.Background(),params);err!=nil{t.Fatal(err)}
 if db.calls!=1 || len(db.arguments)!=4 || db.arguments[0]!=params.Document || db.arguments[1]!=params.DomainDocument || db.arguments[2]!=params.ExpectedKind || db.arguments[3]!=params.ExpectedSource{t.Fatal("raw JSON parameters changed")}
 document=json.RawMessage("[1,]");db.failure=errors.New("database JSON input rejection")
 if err:=queries.InsertDocument(context.Background(),params);!errors.Is(err,db.failure) || db.calls!=2{t.Fatal("database JSON error lost",err)}
}
func TestCoercedJSONInputs(t *testing.T){
 source:="{\\"a\\":9007199254740993,\\"a\\":2}";kind:="object";value:=checkruntime.MakeJsonValue(source)
 input:=pgsid.PublicJsonWritesCheckInput{Document:pgsid.KnownCheckValue(value),DomainDocument:pgsid.KnownCheckValue(value),ExpectedKind:pgsid.KnownCheckValue(&kind),ExpectedSource:pgsid.KnownCheckValue(&source)}
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonWritesChecks);err!=nil{t.Fatal(err)}
 kind="array"
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonWritesChecks);err==nil{t.Fatal("wrong JSON shape accepted")}
 kind="object";value.Value.Kind=3;value.Value.Depth=10000;input.Document=pgsid.KnownCheckValue(value)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonWritesChecks);err!=nil{t.Fatal("cached metadata was trusted",err)}
 for _,bad:=range []checkruntime.JsonValue{{},{Kind:checkruntime.JsonValueValue},{Kind:checkruntime.JsonValueValue,Value:checkruntime.JsonPayload{Source:"[1,]"}},{Kind:checkruntime.JsonValueValue,Value:checkruntime.JsonPayload{Source:string([]byte{255})}},{Kind:checkruntime.JsonValueValue,Value:checkruntime.JsonPayload{Source:string([]byte{0})}}}{
  input.Document=pgsid.KnownCheckValue(bad)
  for _,check:=range pgsid.EvaluatePublicJsonWritesChecks(input){if check.Constraint!="domain_shape" && check.Result.Certain{t.Fatal("invalid JSON became definite",check)}}
 }
 input.Document=pgsid.NullCheckValue[checkruntime.JsonValue]()
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonWritesChecks);err==nil{t.Fatal("SQL NULL passed required presence")}
 input.Document=pgsid.KnownCheckValue(checkruntime.JsonValue{Kind:checkruntime.JsonValueError,Error:checkruntime.MakeSqlError(${parseInt('22003', 36)})})
 for _,check:=range pgsid.EvaluatePublicJsonWritesChecks(input){if check.Constraint!="domain_shape" && (!check.Result.Certain || check.Result.Value.Error!="22003"){t.Fatal("JSON error lost",check)}}
}
func TestJSONTextCastsBeforeWrites(t *testing.T){
 db:=&recordingJSONDB{};queries:=New(db);source:="[1, 2]";expected:=source;bypass:=false
 params:=InsertDocumentTextParams{SourceText:&source,ExpectedText:&expected,Bypass:&bypass}
 if err:=queries.InsertDocumentText(context.Background(),params);err!=nil || db.calls!=1{t.Fatal("valid JSON text failed",err)}
 if db.arguments[0]!=params.SourceText || db.arguments[1]!=params.ExpectedText || db.arguments[2]!=params.Bypass{t.Fatal("raw text parameters changed")}
 expected="[]"
 if err:=queries.InsertDocumentText(context.Background(),params);err==nil || db.calls!=1{t.Fatal("wrong JSON source reached database",err)}
 source="[1,]";expected=source
 if err:=queries.InsertDocumentText(context.Background(),params);err==nil || db.calls!=1{t.Fatal("JSON syntax error reached database",err)}
 bypass=true
 if err:=queries.InsertDocumentText(context.Background(),params);err!=nil || db.calls!=2{t.Fatal("skipped JSON cast failed",err)}
 bypass=false;db.failure=&pgconn.PgError{Code:"22021",Message:"invalid input encoding"}
 for _,invalid:=range []string{string([]byte{0}),string([]byte{255})}{source=invalid;before:=db.calls;if err:=queries.InsertDocumentText(context.Background(),params);!errors.Is(err,db.failure)||db.calls!=before+1{t.Fatal("raw encoding error replaced locally",err)}}
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
