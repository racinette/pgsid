import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { runCheckParity } from '../../tools/check-rust/parity.js'
import { buildProject } from '../../src/project-runtime.js'

const run = promisify(execFile)
const schema = `CREATE TYPE export_status AS ENUM ('draft','ready');
CREATE TABLE enum_exports(stage export_status,expected integer,expected_seeded bigint,
 CONSTRAINT label_order CHECK(stage >= 'ready'::export_status),
 CONSTRAINT label_hash CHECK(hashenum(stage)=expected),
 CONSTRAINT seeded_hash CHECK(hashenumextended(stage,0)=expected_seeded),
 CONSTRAINT literal_hash CHECK(hashenum('ready'::export_status)=expected));`

describe('enum OIDs without deployment catalog access', () => {
  it('keeps label ordering while deferring hashes from generated literals and public label inputs', async () => {
    const first = await PGlite.create(),
      second = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-enum-oid-context-'))
    try {
      await first.exec(schema)
      await second.exec('CREATE TABLE oid_allocation_shift(id integer)')
      await second.exec(schema)
      const oracle = async (pg: PGlite) =>
        (
          await pg.query<{ oid: number; hash: number; seeded: bigint }>(
            "SELECT oid,hashenum('ready'::export_status) hash,hashenumextended('ready'::export_status,0) seeded FROM pg_enum WHERE enumtypid='export_status'::regtype AND enumlabel='ready'",
          )
        ).rows[0]!
      const a = await oracle(first),
        b = await oracle(second)
      expect(a.oid).not.toBe(b.oid)
      expect(a.hash).not.toBe(b.hash)
      const catalog = await snapshotCatalog(first)
      const table = catalog.tables.find((t) => t.name === 'enum_exports')!
      const literal = table.constraints.find((c) => c.name === 'literal_hash')!
      const group = prepareCheckRustGroup([
        {
          expression: lowerTableCheck(table, literal, catalog.enums)!.expression,
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: literal.name,
          },
        },
      ])
      expect(group.source).not.toContain('make_catalog_enum_value(')
      const literalDirectory = join(directory, 'literal')
      await mkdir(literalDirectory)
      await runCheckParity(
        literalDirectory,
        'enum_literal_context',
        group,
        [literal.name],
        [
          {
            name: literal.name,
            row: { expected: { kind: 'Value', value: a.hash } },
            expected: { kind: 'Unknown' },
          },
          {
            name: literal.name,
            row: { expected: { kind: 'Value', value: b.hash } },
            expected: { kind: 'Unknown' },
          },
        ],
      )
      const bundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains, [], {
        enums: catalog.enums,
      })
      const target = join(directory, 'typescript')
      await mkdir(target)
      await writeFile(join(target, 'package.json'), '{"type":"module"}\n')
      await writeFile(join(target, 'checks.ts'), bundle.checks)
      for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
        const path = join(target, 'checks-rust', artifact.path)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, artifact.content)
      }
      await run('node_modules/.bin/tsc', [
        '--strict',
        '--skipLibCheck',
        '--target',
        'es2022',
        '--module',
        'nodenext',
        '--moduleResolution',
        'nodenext',
        '--outDir',
        join(target, 'js'),
        join(target, 'checks.ts'),
      ])
      const generated = await import(pathToFileURL(join(target, 'js/checks.js')).href)
      for (const answer of [a, b]) {
        const results = Object.fromEntries(
          generated
            .evaluatePublicEnumExportsChecks({
              stage: 'ready',
              expected: answer.hash,
              expected_seeded: answer.seeded,
            })
            .map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
        )
        expect(results).toEqual({
          label_order: { certain: true, value: true },
          label_hash: { certain: false },
          seeded_hash: { certain: false },
          literal_hash: { certain: false },
        })
      }
      const root = join(directory, 'go')
      await mkdir(join(root, 'queries'), { recursive: true })
      await writeFile(join(root, 'schema.sql'), schema)
      await writeFile(
        join(root, 'queries/export.sql'),
        '-- name: InsertExport :exec\nINSERT INTO enum_exports(stage,expected,expected_seeded) VALUES (@stage,@expected,@expected_seeded);\n',
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
      await writeFile(
        join(root, 'generated/queries/export/enum_context_test.go'),
        `package export
import (
 "testing"
 pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx"
 schema "example.com/pgsid-fixture/generated/schema/public"
)
func TestEnumCatalogUnavailable(t *testing.T) {
 stage:=schema.ExportStatus("ready");hash:=int32(${a.hash});seeded:=int64(${a.seeded})
 input:=pgsid.PublicEnumExportsCheckInput{Stage:pgsid.KnownCheckValue(&stage),Expected:pgsid.KnownCheckValue(&hash),ExpectedSeeded:pgsid.KnownCheckValue(&seeded)}
 count:=0
 for _,check:=range pgsid.EvaluatePublicEnumExportsChecks(input) {
 count++
 if check.Constraint=="label_order" {
 if !check.Result.Certain || !check.Result.Value.Valid || !check.Result.Value.Value {t.Fatal("lost enum ordering",check)}
 } else if check.Result.Certain {t.Fatal("generation OID escaped into runtime hash",check)}
 }
 if count!=4 {t.Fatal("missing constraints",count)}
}
`,
      )
      await run('go', ['test', '-mod=mod', '-p', '1', './...'], { cwd: root })
    } finally {
      await first.close()
      await second.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 300_000)
})
