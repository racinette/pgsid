import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { oidAliasTypes } from '../../src/sql-semantics/expressions.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
const failure = (code: string) => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
describe('public catalog alias payloads', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-oid-alias-payload-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('validates SQL-coerced unsigned carriers and retains known stored literal comparisons in the public API', async () => {
    for (const type of oidAliasTypes) {
      const name = type.slice('pg_catalog.'.length)
      await pg.exec(`CREATE DOMAIN imported_${name} AS ${type};
        CREATE DOMAIN nested_${name} AS imported_${name};
        CREATE TABLE alias_${name}_payloads(amount nested_${name},reference ${type},expected bytea,
        CONSTRAINT wire CHECK(${name}send(amount)=expected),
        CONSTRAINT same CHECK(amount=reference),
        CONSTRAINT present CHECK(amount IS NOT NULL),CONSTRAINT absent CHECK(amount IS NULL),
        CONSTRAINT minimum CHECK(amount::oid >= '125'::oid))`)
    }
    const catalog = await snapshotCatalog(pg)
    const bundle = renderTypescriptSchemaCheckArtifacts(catalog.tables, catalog.domains),
      target = join(directory, 'public')
    await mkdir(target)
    await writeFile(join(target, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(target, 'checks.ts'), bundle.checks)
    for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
      const path = join(target, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await promisify(execFile)('node_modules/.bin/tsc', [
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
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    const generated = await import(pathToFileURL(join(target, 'js/checks.js')).href)
    for (const type of oidAliasTypes) {
      const name = type.slice('pg_catalog.'.length)
      type Result = { certain: boolean; value?: boolean | null; error?: string }
      const evaluate = (
        amount: unknown,
        reference: unknown = { kind: 'Value', value: 125n },
        expected: unknown = Buffer.from('0000007d', 'hex'),
      ): Record<string, Result> =>
        Object.fromEntries(
          generated[
            'evaluatePublicAlias' + name[0]!.toUpperCase() + name.slice(1) + 'PayloadsChecks'
          ]({ amount, reference, expected }).map((c: { constraint: string; result: Result }) => [
            c.constraint,
            c.result,
          ]),
        )
      expect(evaluate({ kind: 'Value', value: 125n })).toEqual({
        wire: { certain: true, value: true },
        same: { certain: true, value: true },
        present: { certain: true, value: true },
        absent: { certain: true, value: false },
        minimum: { certain: true, value: true },
      })
      expect(evaluate({ kind: 'Value', value: 124n }).minimum).toEqual({
        certain: true,
        value: false,
      })
      for (const value of [0n, 4294967295n]) {
        const bytes = Buffer.alloc(4)
        bytes.writeUInt32BE(Number(value))
        expect(evaluate({ kind: 'Value', value }, { kind: 'Value', value }, bytes).wire).toEqual({
          certain: true,
          value: true,
        })
      }
      for (const amount of [
        undefined,
        'named_object',
        1.25,
        125n,
        { kind: 'Value', value: 125 },
        { kind: 'Value', value: '125' },
        { kind: 'Value', value: 4294967296n },
        { kind: 'Value', value: -1n },
      ])
        expect(Object.values(evaluate(amount))).toEqual(
          Array.from({ length: 5 }, () => ({ certain: false })),
        )
      for (const amount of [null, { kind: 'Null' }])
        expect(evaluate(amount)).toEqual({
          wire: { certain: true, value: null },
          same: { certain: true, value: null },
          present: { certain: true, value: false },
          absent: { certain: true, value: true },
          minimum: { certain: true, value: null },
        })
      expect(Object.values(evaluate(failure('22003')))).toEqual(
        Array.from({ length: 5 }, () => ({ certain: true, error: '22003' })),
      )
    }
  }, 300_000)
})
