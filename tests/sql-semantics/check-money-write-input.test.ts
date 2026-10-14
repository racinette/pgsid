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

describe('raw money query parameters and portable CHECK inputs', () => {
  it('compiles money writes, preserves database validation and retains checks on explicit money payloads', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-money-write-input-'))
    roots.push(root)
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      'CREATE DOMAIN imported_edge AS money; CREATE DOMAIN nested_edge AS imported_edge; CREATE TABLE money_writes(position money,domain_position nested_edge,expected bytea,CONSTRAINT position_wire CHECK(cash_send(position)=expected),CONSTRAINT domain_position_wire CHECK(cash_send(domain_position)=expected));\n',
    )
    await writeFile(
      join(root, 'queries/moneys.sql'),
      '-- name: InsertPosition :exec\nINSERT INTO money_writes(position,domain_position,expected) VALUES (@position,@domain_position,@expected);\n',
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
      join(root, 'generated/queries/moneys/money_input_test.go'),
      `package moneys
import (
 "context"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime"
 schema "example.com/pgsid-fixture/generated/schema/public"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingMoneyDB struct {
 pgsid.DBTX
 arguments []any
 calls int
 failure error
}
func (db *recordingMoneyDB) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag,error) {
 db.calls++
 db.arguments=arguments
 return pgconn.NewCommandTag("INSERT 0 1"),db.failure
}
func TestRawParametersReachDatabase(t *testing.T) {
 db:=&recordingMoneyDB{}
 queries:=New(db)
 var position string="1.25"
 var domainPosition schema.NestedEdge="1.25"
 wire:=[]byte{0,0,0,0,0,0,0,125}
 params:=InsertPositionParams{Position:&position,DomainPosition:&domainPosition,Expected:&wire}
 if err:=queries.InsertPosition(context.Background(),params);err!=nil {t.Fatal(err)}
 if db.calls!=1 || len(db.arguments)!=3 || db.arguments[0]!=params.Position || db.arguments[1]!=params.DomainPosition || db.arguments[2]!=params.Expected {t.Fatal("raw parameters changed before database execution")}
 db.failure=errors.New("database CHECK rejection")
 if err:=queries.InsertPosition(context.Background(),params);!errors.Is(err,db.failure) {t.Fatal("database rejection was not preserved",err)}
}
func TestPortablePayloadStillValidates(t *testing.T) {
 wire:=[]byte{0,0,0,0,0,0,0,125}
 input:=pgsid.PublicMoneyWritesCheckInput{
  Position:pgsid.KnownCheckValue(checkruntime.MakeMoneyValue(125)),
  DomainPosition:pgsid.KnownCheckValue(checkruntime.MakeMoneyValue(125)),
  Expected:pgsid.KnownCheckValue(&wire),
 }
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicMoneyWritesChecks);err!=nil {t.Fatal(err)}
 wrong:=[]byte{0}
 input.Expected=pgsid.KnownCheckValue(&wrong)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicMoneyWritesChecks);err==nil {t.Fatal("portable money CHECK did not reject wrong wire bytes")}
 input.Expected=pgsid.KnownCheckValue(&wire)
 input.Position.V=checkruntime.MoneyValue{}
 wireChecks:=0
 for _,check:=range pgsid.EvaluatePublicMoneyWritesChecks(input) {
  if check.Constraint=="position_wire" {wireChecks++;if check.Result.Certain {t.Fatal("zero money wrapper did not remain unknown")}}
 }
 if wireChecks!=1 {t.Fatal("missing money wire constraint")}
 input.Position.V=checkruntime.MakeMoneyValue(126)
 for _,check:=range pgsid.EvaluatePublicMoneyWritesChecks(input) {
  if check.Constraint=="position_wire" && (!check.Result.Certain || !check.Result.Value.Valid || check.Result.Value.Value) {t.Fatal("changed money units did not reject wrong wire bytes")}
 }



}
`,
    )
    await run('go', ['test', '-mod=mod', '-p', '1', './...'], { cwd: root }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
  }, 300_000)
})
