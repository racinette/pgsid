import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { buildProject } from '../../src/project-runtime.js'

it('preserves raw XML parameters and validates explicit text casts before writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-xml-write-'))
  try {
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      `CREATE TABLE xml_writes(xml xml,expected text,
      CONSTRAINT source CHECK(xml::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"),
      CONSTRAINT present CHECK(xml IS NOT NULL));
      CREATE TABLE xml_text_writes(source text,expected text,bypass boolean,
      CONSTRAINT canonical CHECK(CASE WHEN bypass THEN true ELSE source::xml::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END));`,
    )
    await writeFile(
      join(root, 'queries/xmls.sql'),
      '-- name: InsertXml :exec\nINSERT INTO xml_writes(xml,expected) VALUES(@xml,@expected);\n-- name: InsertXmlText :exec\nINSERT INTO xml_text_writes(source,expected,bypass) VALUES(@source,@expected,@bypass);\n',
    )
    await writeFile(
      join(root, 'pgsid.yaml'),
      `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    checks: { defaultCollation: C, serverEncoding: UTF8, xmlOption: content }
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
      join(root, 'generated/queries/xmls/xml_input_test.go'),
      `package xmls
import (
 "context"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingXmlDB struct { pgsid.DBTX; arguments []any; calls int; failure error }
func(db *recordingXmlDB)Exec(ctx context.Context,sql string,arguments ...any)(pgconn.CommandTag,error){db.calls++;db.arguments=arguments;return pgconn.NewCommandTag("INSERT 0 1"),db.failure}
func TestRawXmlAssignment(t *testing.T){
 db:=&recordingXmlDB{};queries:=New(db);raw:="<r/>";expected:="deliberately wrong"
 params:=InsertXmlParams{Xml:&raw,Expected:&expected}
 if err:=queries.InsertXml(context.Background(),params);err!=nil||db.calls!=1{t.Fatal(err)}
 if len(db.arguments)!=2||db.arguments[0]!=params.Xml||db.arguments[1]!=params.Expected{t.Fatal("raw xml parameters changed")}
 db.failure=&pgconn.PgError{Code:"2200N",Message:"invalid xml"};raw="<r>";params.Xml=&raw
 if err:=queries.InsertXml(context.Background(),params);!errors.Is(err,db.failure)||db.calls!=2{t.Fatal("database conversion error lost",err)}
}
func TestExplicitXmlTextCast(t *testing.T){
 db:=&recordingXmlDB{};queries:=New(db);source:="<r/>";expected:="<r/>";bypass:=false
 params:=InsertXmlTextParams{Source:&source,Expected:&expected,Bypass:&bypass}
 if err:=queries.InsertXmlText(context.Background(),params);err!=nil||db.calls!=1{t.Fatal(err)}
 for _,c:=range []struct{source,state string}{{"<r>","2200N"},{"<!--bad--->","2200N"}}{
  source=c.source;input:=pgsid.PublicXmlTextWritesCheckInput{Source:pgsid.KnownCheckValue(&source),Expected:pgsid.KnownCheckValue(&expected),Bypass:pgsid.KnownCheckValue(&bypass)}
  result:=pgsid.EvaluatePublicXmlTextWritesChecks(input)[0].Result
  if !result.Certain||result.Value.Error!=c.state{t.Fatal("xml cast error lost",c,result)}
  before:=db.calls;if err:=queries.InsertXmlText(context.Background(),params);err==nil||db.calls!=before{t.Fatal("invalid cast reached database",err)}
  bypass=true;if err:=queries.InsertXmlText(context.Background(),params);err!=nil||db.calls!=before+1{t.Fatal("skipped cast failed",err)};bypass=false
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
