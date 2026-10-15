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
  CREATE TABLE jsonb_text_writes(source_text text,expected_source text,bypass boolean,
  CONSTRAINT canonical CHECK(CASE WHEN bypass THEN true ELSE source_text::retained_document::text COLLATE "C"=expected_source COLLATE "C" END));
  CREATE TABLE jsonb_field_writes(document retained_document,field_name text,expected_text text,expected_exists boolean,bypass boolean,
  CONSTRAINT field_text CHECK(CASE WHEN bypass THEN true ELSE (document->>field_name) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END),
  CONSTRAINT key_exists CHECK(CASE WHEN bypass THEN true ELSE (document ? field_name) IS NOT DISTINCT FROM expected_exists END));
  CREATE TABLE jsonb_relation_writes(lhs retained_document,rhs jsonb,expected_equal boolean,expected_contains boolean,bypass boolean,
  CONSTRAINT same_value CHECK(CASE WHEN bypass THEN true ELSE (lhs=rhs) IS NOT DISTINCT FROM expected_equal END),
  CONSTRAINT includes_value CHECK(CASE WHEN bypass THEN true ELSE (lhs @> rhs) IS NOT DISTINCT FROM expected_contains END));
  CREATE SCHEMA isolated;CREATE TABLE isolated.jsonb_presence(document jsonb CONSTRAINT required CHECK(document IS NOT NULL));`,
    )
    await writeFile(
      join(root, 'queries/documents.sql'),
      '-- name: InsertDocument :exec\nINSERT INTO jsonb_writes(document,domain_document,expected_kind,expected_source) VALUES(@document,@domain_document,@expected_kind,@expected_source);\n-- name: InsertDocumentText :exec\nINSERT INTO jsonb_text_writes(source_text,expected_source,bypass) VALUES(@source_text,@expected_source,@bypass);\n-- name: InsertDocumentField :exec\nINSERT INTO jsonb_field_writes(document,field_name,expected_text,expected_exists,bypass) VALUES(@document,@field_name,@expected_text,@expected_exists,@bypass);\n-- name: InsertDocumentRelation :exec\nINSERT INTO jsonb_relation_writes(lhs,rhs,expected_equal,expected_contains,bypass) VALUES(@lhs,@rhs,@expected_equal,@expected_contains,@bypass);\n',
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
func TestJSONBTextCasts(t *testing.T){
 db:=&recordingJSONBDB{};queries:=New(db);source:=${JSON.stringify('{"a":1,"a":2}')};expected:=${JSON.stringify('{"a": 2}')};bypass:=false
 params:=InsertDocumentTextParams{SourceText:&source,ExpectedSource:&expected,Bypass:&bypass}
 if err:=queries.InsertDocumentText(context.Background(),params);err!=nil||db.calls!=1{t.Fatal(err)}
 for _,c:=range []struct{source,state string}{{"[1,]","22P02"},{"1e131072","22003"},{${JSON.stringify('"\\u0000"')},"22P05"}}{
  source=c.source
  input:=pgsid.PublicJsonbTextWritesCheckInput{SourceText:pgsid.KnownCheckValue(&source),ExpectedSource:pgsid.KnownCheckValue(&expected),Bypass:pgsid.KnownCheckValue(&bypass)}
  result:=pgsid.EvaluatePublicJsonbTextWritesChecks(input)[0].Result
  if !result.Certain||result.Value.Error!=c.state{t.Fatal("JSONB input error lost",c,result)}
  before:=db.calls;if err:=queries.InsertDocumentText(context.Background(),params);err==nil||db.calls!=before{t.Fatal("invalid JSONB text reached database",err)}
  bypass=true;if err:=queries.InsertDocumentText(context.Background(),params);err!=nil||db.calls!=before+1{t.Fatal("skipped JSONB cast failed",err)};bypass=false
 }
 source=${JSON.stringify('"\\u00e9"')};before:=db.calls
 if err:=queries.InsertDocumentText(context.Background(),params);err!=nil||db.calls!=before+1{t.Fatal("encoding-dependent cast failed locally",err)}
 db.failure=&pgconn.PgError{Code:"22021",Message:"invalid input encoding"}
 for _,invalid:=range []string{string([]byte{0}),string([]byte{255})}{source=invalid;before:=db.calls;if err:=queries.InsertDocumentText(context.Background(),params);!errors.Is(err,db.failure)||db.calls!=before+1{t.Fatal("raw encoding failure lost",err)}}
}
func TestJSONBFieldWrites(t *testing.T){
 key:="a";expected:="2";exists:=true;bypass:=false;value:=checkruntime.MakeJsonbValue(${JSON.stringify('{"a":1,"a":2}')})
 input:=pgsid.PublicJsonbFieldWritesCheckInput{Document:pgsid.KnownCheckValue(value),FieldName:pgsid.KnownCheckValue(&key),ExpectedText:pgsid.KnownCheckValue(&expected),ExpectedExists:pgsid.KnownCheckValue(&exists),Bypass:pgsid.KnownCheckValue(&bypass)}
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonbFieldWritesChecks);err!=nil{t.Fatal(err)}
 expected="wrong";if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonbFieldWritesChecks);err==nil{t.Fatal("wrong JSONB field accepted")}
 input.Document=pgsid.KnownCheckValue(checkruntime.JsonbValue{Kind:checkruntime.JsonbValueError,Error:checkruntime.MakeSqlError(${parseInt('22003', 36)})})
 for _,check:=range pgsid.EvaluatePublicJsonbFieldWritesChecks(input){if !check.Result.Certain||check.Result.Value.Error!="22003"{t.Fatal("JSONB error lost",check)}}
 bypass=true;if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonbFieldWritesChecks);err!=nil{t.Fatal("skipped JSONB read failed",err)}
 db:=&recordingJSONBDB{};queries:=New(db);bypass=false;raw:=json.RawMessage(${JSON.stringify('{"a":1,"a":2}')});domain:=schema.RetainedDocument(raw)
 params:=InsertDocumentFieldParams{Document:&domain,FieldName:&key,ExpectedText:&expected,ExpectedExists:&exists,Bypass:&bypass}
 if err:=queries.InsertDocumentField(context.Background(),params);err!=nil||db.calls!=1{t.Fatal("raw JSONB extraction input failed",err)}
 if len(db.arguments)!=5||db.arguments[0]!=params.Document||db.arguments[1]!=params.FieldName||db.arguments[2]!=params.ExpectedText||db.arguments[3]!=params.ExpectedExists||db.arguments[4]!=params.Bypass{t.Fatal("raw JSONB read parameters changed")}
}
func TestJSONBRelationWrites(t *testing.T){
 equal:=true;contains:=true;bypass:=false;value:=checkruntime.MakeJsonbValue(${JSON.stringify('{"a":1}')})
 input:=pgsid.PublicJsonbRelationWritesCheckInput{Lhs:pgsid.KnownCheckValue(value),Rhs:pgsid.KnownCheckValue(value),ExpectedEqual:pgsid.KnownCheckValue(&equal),ExpectedContains:pgsid.KnownCheckValue(&contains),Bypass:pgsid.KnownCheckValue(&bypass)}
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonbRelationWritesChecks);err!=nil{t.Fatal(err)}
 equal=false;if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonbRelationWritesChecks);err==nil{t.Fatal("wrong JSONB equality accepted")}
 input.Lhs=pgsid.KnownCheckValue(checkruntime.JsonbValue{Kind:checkruntime.JsonbValueError,Error:checkruntime.MakeSqlError(${parseInt('22003', 36)})})
 input.Rhs=pgsid.KnownCheckValue(checkruntime.JsonbValue{Kind:checkruntime.JsonbValueError,Error:checkruntime.MakeSqlError(${parseInt('22012', 36)})})
 for _,check:=range pgsid.EvaluatePublicJsonbRelationWritesChecks(input){if !check.Result.Certain||check.Result.Value.Error!="22003"{t.Fatal("JSONB error precedence lost",check)}}
 bypass=true;if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicJsonbRelationWritesChecks);err!=nil{t.Fatal("skipped JSONB relation failed",err)}
 db:=&recordingJSONBDB{};queries:=New(db);bypass=false;raw:=json.RawMessage(${JSON.stringify('{"a":1}')});domain:=schema.RetainedDocument(raw)
 params:=InsertDocumentRelationParams{Lhs:&domain,Rhs:&raw,ExpectedEqual:&equal,ExpectedContains:&contains,Bypass:&bypass}
 if err:=queries.InsertDocumentRelation(context.Background(),params);err!=nil||db.calls!=1{t.Fatal("raw JSONB relation failed locally",err)}
 if len(db.arguments)!=5||db.arguments[0]!=params.Lhs||db.arguments[1]!=params.Rhs||db.arguments[2]!=params.ExpectedEqual||db.arguments[3]!=params.ExpectedContains||db.arguments[4]!=params.Bypass{t.Fatal("raw JSONB relation parameters changed")}
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
