import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { buildProject } from '../../src/project-runtime.js'

it.each(['pg_snapshot', 'txid_snapshot'] as const)(
  'preserves raw %s query parameters and validates SQL-coerced Go snapshot wrappers',
  async (type) => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-snapshot-write-'))
    try {
      await mkdir(join(root, 'queries'))
      await writeFile(
        join(root, 'schema.sql'),
        `CREATE DOMAIN snapshot_edge AS ${type};CREATE DOMAIN nested_snapshot_edge AS snapshot_edge;
      CREATE TABLE snapshot_writes(position ${type},domain_position nested_snapshot_edge,expected bytea,
      CONSTRAINT position_wire CHECK(${type}_send(position)=expected),CONSTRAINT domain_wire CHECK(${type}_send(domain_position)=expected),
      CONSTRAINT position_present CHECK(position IS NOT NULL));
      CREATE TABLE snapshot_text_writes(source_text text,expected_text text,CONSTRAINT canonical_text CHECK(source_text::${type}::text COLLATE "C"=expected_text COLLATE "C"));\n`,
      )
      await writeFile(
        join(root, 'queries/snapshots.sql'),
        '-- name: InsertSnapshot :exec\nINSERT INTO snapshot_writes(position,domain_position,expected) VALUES (@position,@domain_position,@expected);\n-- name: InsertSnapshotText :exec\nINSERT INTO snapshot_text_writes(source_text,expected_text) VALUES (@source_text,@expected_text);\n',
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
        join(root, 'generated/queries/snapshots/snapshot_input_test.go'),
        `package snapshots
import (
 "context"
 "encoding/hex"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime"
 schema "example.com/pgsid-fixture/generated/schema/public"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingSnapshotDB struct {pgsid.DBTX;arguments []any;calls int;failure error}
func (db *recordingSnapshotDB) Exec(ctx context.Context,sql string,arguments ...any)(pgconn.CommandTag,error){db.calls++;db.arguments=arguments;return pgconn.NewCommandTag("INSERT 0 1"),db.failure}
func TestRawParametersReachDatabase(t *testing.T){
 db:=&recordingSnapshotDB{};queries:=New(db)
 var position any=string("1:9:3,5");var domainPosition schema.NestedSnapshotEdge=string("1:9:3,5");wire:=[]byte{0}
 params:=InsertSnapshotParams{Position:&position,DomainPosition:&domainPosition,Expected:&wire}
 if err:=queries.InsertSnapshot(context.Background(),params);err!=nil{t.Fatal(err)}
 if db.calls!=1 || len(db.arguments)!=3 || db.arguments[0]!=params.Position || db.arguments[1]!=params.DomainPosition || db.arguments[2]!=params.Expected{t.Fatal("raw snapshot parameters changed")}
 position=string("invalid");db.failure=errors.New("database snapshot input rejection")
 if err:=queries.InsertSnapshot(context.Background(),params);!errors.Is(err,db.failure) || db.calls!=2{t.Fatal("database error not preserved",err)}
}
func TestRawTextEncodingDefersToDatabase(t *testing.T){
 db:=&recordingSnapshotDB{};queries:=New(db);source:="1:9:";expected:="1:9:"
 params:=InsertSnapshotTextParams{SourceText:&source,ExpectedText:&expected}
 if err:=queries.InsertSnapshotText(context.Background(),params);err!=nil || db.calls!=1{t.Fatal("valid text cast failed",err)}
 expected="wrong"
 if err:=queries.InsertSnapshotText(context.Background(),params);err==nil || db.calls!=1{t.Fatal("known bad canonical text reached database",err)}
 expected="1:9:";db.failure=&pgconn.PgError{Code:"22021",Message:"invalid input encoding"}
 for _,invalid:=range []string{string([]byte{0}),string([]byte{255})}{
  source=invalid;before:=db.calls
  if err:=queries.InsertSnapshotText(context.Background(),params);!errors.Is(err,db.failure) || db.calls!=before+1{t.Fatal("raw text encoding error was replaced locally",err)}
  if db.arguments[0]!=params.SourceText || db.arguments[1]!=params.ExpectedText{t.Fatal("raw text parameters changed")}
 }
}
func TestCoercedSnapshotInputs(t *testing.T){
 wire,err:=hex.DecodeString("000000020000000000000001000000000000000900000000000000030000000000000005");if err!=nil{t.Fatal(err)}
 words:=[]checkruntime.SnapshotXid{{Bits:3},{Bits:5}}
 value:=checkruntime.MakeSnapshotValue(checkruntime.SnapshotPayload{Xmin:1,Xmax:9,Xip:words})
 words[0].Bits=7
 input:=pgsid.PublicSnapshotWritesCheckInput{Position:pgsid.KnownCheckValue(value),DomainPosition:pgsid.KnownCheckValue(value),Expected:pgsid.KnownCheckValue(&wire)}
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicSnapshotWritesChecks);err!=nil{t.Fatal(err)}
 wrong:=[]byte{0};input.Expected=pgsid.KnownCheckValue(&wrong)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicSnapshotWritesChecks);err==nil{t.Fatal("wrong snapshot bytes accepted")}
 input.Expected=pgsid.KnownCheckValue(&wire)
 for _,bad:=range []checkruntime.SnapshotValue{
  {},{Kind:checkruntime.SnapshotValueValue},
  {Kind:checkruntime.SnapshotValueValue,Value:checkruntime.SnapshotPayload{Xmin:1,Xmax:9,Xip:[]checkruntime.SnapshotXid{{Bits:5},{Bits:3}}}},
 }{
  input.Position=pgsid.KnownCheckValue(bad)
  for _,check:=range pgsid.EvaluatePublicSnapshotWritesChecks(input){if (check.Constraint=="position_wire" || check.Constraint=="position_present") && check.Result.Certain{t.Fatal("invalid snapshot became definite",check)}}
 }
 input.Position=pgsid.NullCheckValue[checkruntime.SnapshotValue]()
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicSnapshotWritesChecks);err==nil{t.Fatal("NULL snapshot passed required presence")}
 input.Position=pgsid.KnownCheckValue(checkruntime.SnapshotValue{Kind:checkruntime.SnapshotValueError,Error:checkruntime.MakeSqlError(${parseInt('22003', 36)})})
 for _,check:=range pgsid.EvaluatePublicSnapshotWritesChecks(input){if check.Constraint=="position_wire" && (!check.Result.Certain || check.Result.Value.Error!="22003"){t.Fatal("snapshot error lost",check)}}
 binaryWire,err:=hex.DecodeString("00000001000000000000000100000000000000090000000000000009");if err!=nil{t.Fatal(err)}
 binaryValue:=checkruntime.MakeSnapshotValue(checkruntime.SnapshotPayload{Xmin:1,Xmax:9,Xip:[]checkruntime.SnapshotXid{{Bits:9}}})
 input.Position=pgsid.KnownCheckValue(binaryValue);input.DomainPosition=pgsid.KnownCheckValue(binaryValue);input.Expected=pgsid.KnownCheckValue(&binaryWire)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicSnapshotWritesChecks);err!=nil{t.Fatal("SQL-coerced binary endpoint snapshot rejected",err)}
}
`,
      )
      await promisify(execFile)('go', ['test', '-mod=mod', '-p', '1', './...'], {
        cwd: root,
      }).catch((e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  },
  300000,
)
