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

describe('raw point query parameters and portable CHECK inputs', () => {
  it('compiles point writes, preserves database validation and retains checks on explicit point payloads', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-point-write-input-'))
    roots.push(root)
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      'CREATE TABLE point_writes(position point,expected bytea,CONSTRAINT position_wire CHECK(point_send(position)=expected));\n',
    )
    await writeFile(
      join(root, 'queries/points.sql'),
      '-- name: InsertPosition :exec\nINSERT INTO point_writes(position,expected) VALUES (@position,@expected);\n',
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
      join(root, 'generated/queries/points/point_input_test.go'),
      `package points
import (
 "context"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime"
 "github.com/jackc/pgx/v5/pgconn"
 "github.com/jackc/pgx/v5/pgtype"
)
type recordingPointDB struct {
 pgsid.DBTX
 arguments []any
 calls int
 failure error
}
func (db *recordingPointDB) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag,error) {
 db.calls++
 db.arguments=arguments
 return pgconn.NewCommandTag("INSERT 0 1"),db.failure
}
func TestRawParametersReachDatabase(t *testing.T) {
 db:=&recordingPointDB{}
 queries:=New(db)
 var position any=pgtype.Point{P:pgtype.Vec2{X:1,Y:2},Valid:true}
 wire:=[]byte{0x3f,0xf0,0,0,0,0,0,0,0x40,0,0,0,0,0,0,0}
 params:=InsertPositionParams{Position:&position,Expected:&wire}
 if err:=queries.InsertPosition(context.Background(),params);err!=nil {t.Fatal(err)}
 if db.calls!=1 || len(db.arguments)!=2 || db.arguments[0]!=params.Position || db.arguments[1]!=params.Expected {t.Fatal("raw parameters changed before database execution")}
 db.failure=errors.New("database CHECK rejection")
 if err:=queries.InsertPosition(context.Background(),params);!errors.Is(err,db.failure) {t.Fatal("database rejection was not preserved",err)}
}
func TestPortablePayloadStillValidates(t *testing.T) {
 wire:=[]byte{0x3f,0xf0,0,0,0,0,0,0,0x40,0,0,0,0,0,0,0}
 input:=pgsid.PublicPointWritesCheckInput{
  Position:pgsid.KnownCheckValue(checkruntime.MakePointBits(0x3ff0000000000000,0x4000000000000000)),
  Expected:pgsid.KnownCheckValue(&wire),
 }
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicPointWritesChecks);err!=nil {t.Fatal(err)}
 wrong:=[]byte{0}
 input.Expected=pgsid.KnownCheckValue(&wrong)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicPointWritesChecks);err==nil {t.Fatal("portable point CHECK did not reject wrong wire bytes")}
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
