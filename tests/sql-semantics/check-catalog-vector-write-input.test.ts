import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { buildProject } from '../../src/project-runtime.js'

it('leaves raw vector and vector-domain parameters for database coercion in generated Go writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-vector-write-'))
  try {
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      `CREATE DOMAIN export_positions AS int2vector;
CREATE TABLE vector_writes(positions int2vector NOT NULL,type_ids oidvector NOT NULL,domain_positions export_positions NOT NULL,expected text COLLATE "C" NOT NULL,
CONSTRAINT position_text CHECK(positions::text=expected),CONSTRAINT type_text CHECK(type_ids::text=expected),CONSTRAINT domain_text CHECK(domain_positions::text=expected));`,
    )
    await writeFile(
      join(root, 'queries/vectors.sql'),
      '-- name: InsertVectors :exec\nINSERT INTO vector_writes(positions,type_ids,domain_positions,expected) VALUES (@positions,@type_ids,@domain_positions,@expected);\n',
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
      mappings:
        pgType:
          pg_catalog.int2vector: string
          pg_catalog.oidvector: string
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
      join(root, 'generated/queries/vectors/vector_write_test.go'),
      `package vectors
import("context";"errors";"testing";pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx";schema "example.com/pgsid-fixture/generated/schema/public";"github.com/jackc/pgx/v5/pgconn")
type recordingVectorDB struct {pgsid.DBTX;arguments []any;calls int;failure error}
func(db *recordingVectorDB)Exec(ctx context.Context,sql string,arguments ...any)(pgconn.CommandTag,error){db.arguments=arguments;db.calls++;return pgconn.NewCommandTag("INSERT 0 1"),db.failure}
func TestRawVectorParameters(t *testing.T){
 db:=&recordingVectorDB{};queries:=New(db)
 params:=InsertVectorsParams{Positions:"bad-vector-text",TypeIds:"not-an-oid",DomainPositions:schema.ExportPositions("bad-domain-vector"),Expected:"different"}
 if err:=queries.InsertVectors(context.Background(),params);err!=nil{t.Fatal(err)}
 if db.calls!=1||len(db.arguments)!=4||db.arguments[0]!=params.Positions||db.arguments[1]!=params.TypeIds||db.arguments[2]!=params.DomainPositions||db.arguments[3]!=params.Expected{t.Fatal("raw vector parameters changed",db.arguments)}
 db.failure=errors.New("database vector input rejection")
 if err:=queries.InsertVectors(context.Background(),params);!errors.Is(err,db.failure){t.Fatal("database rejection lost",err)}
}
`,
    )
    await promisify(execFile)('go', ['test', '-mod=mod', '-p', '1', './...'], {
      cwd: root,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((e: { stdout: string; stderr: string }) => {
      throw Error(e.stdout + e.stderr)
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
