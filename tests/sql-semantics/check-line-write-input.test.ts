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

describe('raw line query parameters and portable CHECK inputs', () => {
  it('compiles line writes, preserves database validation and retains checks on explicit line payloads', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-line-write-input-'))
    roots.push(root)
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      'CREATE DOMAIN imported_axis AS line; CREATE DOMAIN nested_axis AS imported_axis; CREATE TABLE line_writes(position line,domain_position nested_axis,expected bytea,CONSTRAINT position_wire CHECK(line_send(position)=expected),CONSTRAINT domain_position_wire CHECK(line_send(domain_position)=expected));\n',
    )
    await writeFile(
      join(root, 'queries/lines.sql'),
      '-- name: InsertPosition :exec\nINSERT INTO line_writes(position,domain_position,expected) VALUES (@position,@domain_position,@expected);\n',
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
      join(root, 'generated/queries/lines/line_input_test.go'),
      `package lines
import (
 "context"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime"
 schema "example.com/pgsid-fixture/generated/schema/public"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingLineDB struct {
 pgsid.DBTX
 arguments []any
 calls int
 failure error
}
func (db *recordingLineDB) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag,error) {
 db.calls++
 db.arguments=arguments
 return pgconn.NewCommandTag("INSERT 0 1"),db.failure
}
func TestRawParametersReachDatabase(t *testing.T) {
 db:=&recordingLineDB{}
 queries:=New(db)
 var position any="{1,-1,0}"
 var domainPosition schema.NestedAxis="{1,-1,0}"
 wire:=[]byte{0x3f,0xf0,0,0,0,0,0,0,0xbf,0xf0,0,0,0,0,0,0,0,0,0,0,0,0,0,0}
 params:=InsertPositionParams{Position:&position,DomainPosition:&domainPosition,Expected:&wire}
 if err:=queries.InsertPosition(context.Background(),params);err!=nil {t.Fatal(err)}
 if db.calls!=1 || len(db.arguments)!=3 || db.arguments[0]!=params.Position || db.arguments[1]!=params.DomainPosition || db.arguments[2]!=params.Expected {t.Fatal("raw parameters changed before database execution")}
 db.failure=errors.New("database CHECK rejection")
 if err:=queries.InsertPosition(context.Background(),params);!errors.Is(err,db.failure) {t.Fatal("database rejection was not preserved",err)}
}
func TestPortablePayloadStillValidates(t *testing.T) {
 wire:=[]byte{0x3f,0xf0,0,0,0,0,0,0,0xbf,0xf0,0,0,0,0,0,0,0,0,0,0,0,0,0,0}
 input:=pgsid.PublicLineWritesCheckInput{
  Position:pgsid.KnownCheckValue(checkruntime.MakeLineBits(0x3ff0000000000000,-4616189618054758400,0)),
  DomainPosition:pgsid.KnownCheckValue(checkruntime.MakeLineBits(0x3ff0000000000000,-4616189618054758400,0)),
  Expected:pgsid.KnownCheckValue(&wire),
 }
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicLineWritesChecks);err!=nil {t.Fatal(err)}
 wrong:=[]byte{0}
 input.Expected=pgsid.KnownCheckValue(&wrong)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicLineWritesChecks);err==nil {t.Fatal("portable line CHECK did not reject wrong wire bytes")}
 input.Expected=pgsid.KnownCheckValue(&wire)
 input.Position.V.Value.WireKnown=false
 wireChecks:=0
 for _,check:=range pgsid.EvaluatePublicLineWritesChecks(input) {
  if check.Constraint=="position_wire" {wireChecks++;if check.Result.Certain {t.Fatal("unavailable line wire precision was treated as known")}}
 }
 if wireChecks!=1 {t.Fatal("missing line wire constraint")}
 wireChecks=0
 input.Position.V.Value.WireKnown=true
 input.Position.V.Value.A=0
 input.Position.V.Value.B=0
 for _,check:=range pgsid.EvaluatePublicLineWritesChecks(input) {
  if check.Constraint=="position_wire" {wireChecks++;if check.Result.Certain {t.Fatal("invalid line coefficient pair was treated as a known payload")}}
 }
 if wireChecks!=1 {t.Fatal("missing line wire constraint")}
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
