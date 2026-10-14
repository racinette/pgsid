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

describe('raw oid query parameters and portable CHECK inputs', () => {
  it.each(['xid', 'cid', 'xid8'] as const)(
    'preserves raw %s query parameters and validates explicit SQL-coerced wrappers',
    async (type) => {
      const root = await mkdtemp(join(tmpdir(), 'pgsid-oid-write-input-'))
      roots.push(root)
      await mkdir(join(root, 'queries'))
      await writeFile(
        join(root, 'schema.sql'),
        `CREATE DOMAIN imported_edge AS ${type}; CREATE DOMAIN nested_edge AS imported_edge; CREATE TABLE identifier_writes(position ${type},domain_position nested_edge,expected bytea,CONSTRAINT position_wire CHECK(${type}send(position)=expected),CONSTRAINT domain_position_wire CHECK(${type}send(domain_position)=expected));\n`,
      )
      await writeFile(
        join(root, 'queries/oids.sql'),
        '-- name: InsertPosition :exec\nINSERT INTO identifier_writes(position,domain_position,expected) VALUES (@position,@domain_position,@expected);\n',
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
        join(root, 'generated/queries/oids/oid_input_test.go'),
        `package oids
import (
 "context"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime"
 schema "example.com/pgsid-fixture/generated/schema/public"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingOidDB struct {
 pgsid.DBTX
 arguments []any
 calls int
 failure error
}
func (db *recordingOidDB) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag,error) {
 db.calls++
 db.arguments=arguments
 return pgconn.NewCommandTag("INSERT 0 1"),db.failure
}
func TestRawParametersReachDatabase(t *testing.T) {
 db:=&recordingOidDB{}
 queries:=New(db)
 var position any=${type === 'xid8' ? 'uint64(18446744073709551615)' : 'uint32(4294967295)'}
 var domainPosition schema.NestedEdge=${type === 'xid8' ? 'uint64(18446744073709551615)' : 'uint32(4294967295)'}
 wire:=[]byte{${type === 'xid8' ? '255,255,255,255,255,255,255,255' : '255,255,255,255'}}
 params:=InsertPositionParams{Position:&position,DomainPosition:&domainPosition,Expected:&wire}
 if err:=queries.InsertPosition(context.Background(),params);err!=nil {t.Fatal(err)}
 if db.calls!=1 || len(db.arguments)!=3 || db.arguments[0]!=params.Position || db.arguments[1]!=params.DomainPosition || db.arguments[2]!=params.Expected {t.Fatal("raw parameters changed before database execution")}
 db.failure=errors.New("database CHECK rejection")
 if err:=queries.InsertPosition(context.Background(),params);!errors.Is(err,db.failure) {t.Fatal("database rejection was not preserved",err)}
}
func TestPortablePayloadStillValidates(t *testing.T) {
 wire:=[]byte{${type === 'xid8' ? '255,255,255,255,255,255,255,255' : '255,255,255,255'}}
 input:=pgsid.PublicIdentifierWritesCheckInput{
  Position:pgsid.KnownCheckValue(checkruntime.${type === 'xid8' ? 'MakeXid8Bits(-1)' : type === 'xid' ? 'MakeXidValue(4294967295)' : 'MakeCidValue(4294967295)'}),
  DomainPosition:pgsid.KnownCheckValue(checkruntime.${type === 'xid8' ? 'MakeXid8Bits(-1)' : type === 'xid' ? 'MakeXidValue(4294967295)' : 'MakeCidValue(4294967295)'}),
  Expected:pgsid.KnownCheckValue(&wire),
 }
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicIdentifierWritesChecks);err!=nil {t.Fatal(err)}
 wrong:=[]byte{0}
 input.Expected=pgsid.KnownCheckValue(&wrong)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicIdentifierWritesChecks);err==nil {t.Fatal("portable oid CHECK did not reject wrong wire bytes")}
 input.Expected=pgsid.KnownCheckValue(&wire)
 input.Position.V=checkruntime.${type === 'xid8' ? 'Xid8' : type === 'xid' ? 'Xid' : 'Cid'}Value{}
 wireChecks:=0
 for _,check:=range pgsid.EvaluatePublicIdentifierWritesChecks(input) {
  if check.Constraint=="position_wire" {wireChecks++;if check.Result.Certain {t.Fatal("zero oid wrapper did not remain unknown")}}
 }
 if wireChecks!=1 {t.Fatal("missing oid wire constraint")}
 ${
   type === 'xid8'
     ? ''
     : `for _,invalid:=range []int64{-1,4294967296} {
  input.Position.V=checkruntime.${type === 'xid' ? 'Xid' : 'Cid'}Value{Kind:checkruntime.${type === 'xid' ? 'Xid' : 'Cid'}ValueValue,Value:invalid}
  for _,check:=range pgsid.EvaluatePublicIdentifierWritesChecks(input) {
   if check.Constraint=="position_wire" && check.Result.Certain {t.Fatal("invalid identifier carrier became definite",invalid)}
  }
 }`
 }
 input.Position.V=checkruntime.${type === 'xid8' ? 'MakeXid8Bits(126)' : type === 'xid' ? 'MakeXidValue(126)' : 'MakeCidValue(126)'}
 for _,check:=range pgsid.EvaluatePublicIdentifierWritesChecks(input) {
  if check.Constraint=="position_wire" && (!check.Result.Certain || !check.Result.Value.Valid || check.Result.Value.Value) {t.Fatal("changed oid units did not reject wrong wire bytes")}
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
    300_000,
  )
})
