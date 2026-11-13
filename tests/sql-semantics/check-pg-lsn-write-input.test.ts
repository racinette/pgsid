import { afterEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { buildProject } from '../../src/project-runtime.js'
const run = promisify(execFile)
const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})
describe('raw WAL-location query parameters and portable CHECK inputs', () => {
  it.each(['pg_lsn'] as const)(
    'preserves raw %s query parameters and validates explicit SQL-coerced wrappers',
    async (type) => {
      const root = await mkdtemp(join(tmpdir(), 'pgsid-oid-write-input-'))
      roots.push(root)
      await mkdir(join(root, 'queries'))
      await writeFile(
        join(root, 'schema.sql'),
        `CREATE DOMAIN imported_edge AS ${type}; CREATE DOMAIN nested_edge AS imported_edge; CREATE TABLE wal_location_writes(position ${type},domain_position nested_edge,expected bytea,CONSTRAINT position_wire CHECK(pg_lsn_send(position)=expected),CONSTRAINT domain_position_wire CHECK(pg_lsn_send(domain_position)=expected));\n`,
      )
      await writeFile(
        join(root, 'queries/locations.sql'),
        '-- name: InsertPosition :exec\nINSERT INTO wal_location_writes(position,domain_position,expected) VALUES (@position,@domain_position,@expected);\n',
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
      await writeFile(
        join(root, 'go.mod'),
        await readFile('tests/fixtures/codegen/project/go.mod', 'utf8'),
      )
      await writeFile(
        join(root, 'go.sum'),
        await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
      )
      const built = await buildProject({ baseDirectory: root })
      expect(built.state.diagnostics).toEqual([])
      await writeFile(
        join(root, 'generated/queries/locations/oid_input_test.go'),
        `package locations
import (
 "context"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 schema "example.com/pgsid-fixture/generated/schema/public"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingWalLocationDB struct {
 pgsid.DBTX
 arguments []any
 calls int
 failure error
}
func (db *recordingWalLocationDB) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag,error) {
 db.calls++
 db.arguments=arguments
 return pgconn.NewCommandTag("INSERT 0 1"),db.failure
}
func TestRawParametersReachDatabase(t *testing.T) {
 db:=&recordingWalLocationDB{}
 queries:=New(db)
 var position string="FFFFFFFF/FFFFFFFF"
 var domainPosition schema.NestedEdge="FFFFFFFF/FFFFFFFF"
 wire:=[]byte{255,255,255,255,255,255,255,255}
 params:=InsertPositionParams{Position:&position,DomainPosition:&domainPosition,Expected:&wire}
 if err:=queries.InsertPosition(context.Background(),params);err!=nil {t.Fatal(err)}
 if db.calls!=1 || len(db.arguments)!=3 || db.arguments[0]!=params.Position || db.arguments[1]!=params.DomainPosition || db.arguments[2]!=params.Expected {t.Fatal("raw parameters changed before database execution")}
 db.failure=errors.New("database CHECK rejection")
 if err:=queries.InsertPosition(context.Background(),params);!errors.Is(err,db.failure) {t.Fatal("database rejection was not preserved",err)}
}
func TestPublicValuesStillValidate(t *testing.T) {
 wire:=[]byte{255,255,255,255,255,255,255,255}
 position:="FFFFFFFF/FFFFFFFF"
 domainPosition:=schema.NestedEdge("ffffffff/ffffffff")
 input:=pgsid.PublicWalLocationWritesCheckInput{Position:pgsid.KnownCheckValue(&position),DomainPosition:pgsid.KnownCheckValue(&domainPosition),Expected:pgsid.KnownCheckValue(&wire)}
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicWalLocationWritesChecks);err!=nil {t.Fatal(err)}
 wrong:=[]byte{0}
 input.Expected=pgsid.KnownCheckValue(&wrong)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicWalLocationWritesChecks);err==nil {t.Fatal("public WAL-location CHECK did not reject wrong wire bytes")}
 changed:="0/7E"
 input.Expected=pgsid.KnownCheckValue(&wire)
 input.Position=pgsid.KnownCheckValue(&changed)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicWalLocationWritesChecks);err==nil {t.Fatal("changed WAL location kept the old wire bytes")}
 malformed:="FFFFFFFF"
 input.Position=pgsid.KnownCheckValue(&malformed)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicWalLocationWritesChecks);err==nil {t.Fatal("malformed WAL location was accepted")}
}
`,
      )
      await writeFile(
        join(root, 'generated/queries/pgsid/pgx/wal_location_payload_test.go'),
        `package pgsidpgx
import (
 "testing"
 checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime"
)
func TestStoredPayloadStillValidates(t *testing.T) {
 wire:=[]byte{255,255,255,255,255,255,255,255}
 input:=publicWalLocationWritesCheckInput{
  Position:KnownCheckValue(checkruntime.MakePgLsnBits(-1)),
  DomainPosition:KnownCheckValue(checkruntime.MakePgLsnBits(-1)),
  Expected:KnownCheckValue(&wire),
 }
 if err:=ValidateCheckInputs(input,evaluatePublicWalLocationWritesChecks);err!=nil {t.Fatal(err)}
 wrong:=[]byte{0}
 input.Expected=KnownCheckValue(&wrong)
 if err:=ValidateCheckInputs(input,evaluatePublicWalLocationWritesChecks);err==nil {t.Fatal("portable WAL-location CHECK did not reject wrong wire bytes")}
 input.Expected=KnownCheckValue(&wire)
 input.Position.V=checkruntime.PgLsnValue{}
 wireChecks:=0
 for _,check:=range func() []CheckEvaluation {r, e := evaluatePublicWalLocationWritesChecks(input); if e != nil {return nil}; return r}() {
  if check.Constraint=="position_wire" {wireChecks++;if check.Result.Certain {t.Fatal("zero WAL-location wrapper did not remain unknown")}}
 }
 if wireChecks!=1 {t.Fatal("missing oid wire constraint")}
 
 input.Position.V=checkruntime.MakePgLsnBits(126)
 for _,check:=range func() []CheckEvaluation {r, e := evaluatePublicWalLocationWritesChecks(input); if e != nil {panic(e)}; return r}() {
  if check.Constraint=="position_wire" && (!check.Result.Certain || !check.Result.Value.Valid || check.Result.Value.Value) {t.Fatal("changed WAL location did not reject wrong wire bytes")}
 }



}
`,
      )
      await run('go', ['test', '-mod=mod', '-p', '1', './...'], { cwd: root }).catch(
        (error: { stdout: string; stderr: string }) => {
          throw new Error(error.stdout + error.stderr, { cause: error })
        },
      )
    },
    300000,
  )
})
