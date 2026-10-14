import { afterEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { oidAliasTypes } from '../../src/sql-semantics/expressions.js'
import { buildProject } from '../../src/project-runtime.js'

const run = promisify(execFile)
const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('raw catalog alias parameters and portable CHECK inputs', () => {
  it('preserves named database parameters and validates every alias through nested domains', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-alias-write-input-'))
    roots.push(root)
    await mkdir(join(root, 'queries'))
    const names = oidAliasTypes.map((type) => type.slice('pg_catalog.'.length))
    const fields = names.flatMap((name) => ['position_' + name, 'domain_position_' + name])
    const schema =
      names
        .map(
          (name) =>
            `CREATE DOMAIN imported_edge_${name} AS ${name}; CREATE DOMAIN nested_edge_${name} AS imported_edge_${name};`,
        )
        .join('\n') +
      `
      CREATE TABLE alias_target(id integer);
      CREATE TABLE alias_writes(${names
        .flatMap((name) => [
          `position_${name} ${name}`,
          `domain_position_${name} nested_edge_${name}`,
        ])
        .join(',')},expected bytea,${names
        .flatMap((name) => [
          `CONSTRAINT position_${name}_wire CHECK(${name}send(position_${name})=expected)`,
          `CONSTRAINT domain_position_${name}_wire CHECK(${name}send(domain_position_${name})=expected)`,
        ])
        .join(',')});`
    await writeFile(join(root, 'schema.sql'), schema)
    await writeFile(
      join(root, 'queries/aliases.sql'),
      `-- name: InsertAliases :exec\nINSERT INTO alias_writes(${[...fields, 'expected'].join(',')}) VALUES (${[...fields, 'expected'].map((name) => '@' + name).join(',')});\n`,
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
    for (const name of ['go.mod', 'go.sum'])
      await writeFile(
        join(root, name),
        await readFile('tests/fixtures/codegen/project/' + name, 'utf8'),
      )
    const built = await buildProject({ baseDirectory: root })
    expect(built.state.diagnostics).toEqual([])
    const capital = (name: string) => name[0]!.toUpperCase() + name.slice(1)
    await writeFile(
      join(root, 'generated/queries/aliases/alias_input_test.go'),
      `package aliases
import (
 "context"
 "errors"
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime"
 schema "example.com/pgsid-fixture/generated/schema/public"
 "github.com/jackc/pgx/v5/pgconn"
)
type recordingAliasDB struct {pgsid.DBTX;arguments []any;calls int;failure error}
func (db *recordingAliasDB) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag,error) {
 db.calls++;db.arguments=arguments;return pgconn.NewCommandTag("INSERT 0 1"),db.failure
}
func TestRawNamesReachDatabase(t *testing.T) {
 db:=&recordingAliasDB{};queries:=New(db);wire:=[]byte{0,0,0,125}
 ${names.map((name) => `var position${capital(name)} any="alias_target";var domainPosition${capital(name)} schema.NestedEdge${capital(name)}="alias_target"`).join('\n')}
 params:=InsertAliasesParams{
 ${names.map((name) => `Position${capital(name)}:&position${capital(name)},DomainPosition${capital(name)}:&domainPosition${capital(name)},`).join('\n')}
 Expected:&wire,
 }
 if err:=queries.InsertAliases(context.Background(),params);err!=nil {t.Fatal(err)}
 expected:=[]any{${names.flatMap((name) => [`params.Position${capital(name)}`, `params.DomainPosition${capital(name)}`]).join(',')},params.Expected}
 if db.calls!=1 || len(db.arguments)!=len(expected) {t.Fatal("missing raw parameters")}
 for index,value:=range expected {if db.arguments[index]!=value {t.Fatal("raw parameter changed",index)}}
 db.failure=errors.New("database CHECK rejection")
 if err:=queries.InsertAliases(context.Background(),params);!errors.Is(err,db.failure) {t.Fatal("database rejection lost",err)}
}
func TestPortableAliases(t *testing.T) {
 wire:=[]byte{0,0,0,125}
 input:=pgsid.PublicAliasWritesCheckInput{
 ${names.map((name) => `Position${capital(name)}:pgsid.KnownCheckValue(checkruntime.MakeOidValue(125)),DomainPosition${capital(name)}:pgsid.KnownCheckValue(checkruntime.MakeOidValue(125)),`).join('\n')}
 Expected:pgsid.KnownCheckValue(&wire),
 }
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicAliasWritesChecks);err!=nil {t.Fatal(err)}
 wrong:=[]byte{0};input.Expected=pgsid.KnownCheckValue(&wrong)
 if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicAliasWritesChecks);err==nil {t.Fatal("wrong bytes accepted")}
 input.Expected=pgsid.KnownCheckValue(&wire)
 ${names
   .map(
     (name) => `
 for _,invalid:=range []checkruntime.OidValue{{},{Kind:checkruntime.OidValueValue,Value:-1},{Kind:checkruntime.OidValueValue,Value:4294967296}} {
 input.Position${capital(name)}.V=invalid
 for _,check:=range pgsid.EvaluatePublicAliasWritesChecks(input) {
 if check.Constraint=="position_${name}_wire" && check.Result.Certain {t.Fatal("invalid alias became definite","${name}",invalid)}
 }
 }
 input.Position${capital(name)}.V=checkruntime.MakeOidValue(125)
 `,
   )
   .join('\n')}
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
