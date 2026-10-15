import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
it('validates SQL-coerced name strings and defers invalid encodings without imposing a deployment name width', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-name-payload-'))
  try {
    await pg.exec(
      `CREATE DOMAIN named_value AS name COLLATE "C";CREATE DOMAIN nested_named_value AS named_value;CREATE TABLE name_payloads(amount nested_named_value,reference name COLLATE "C",expected bytea,recorded text COLLATE "C",CONSTRAINT wire CHECK(namesend(amount)=expected),CONSTRAINT same CHECK(amount=reference),CONSTRAINT rendered CHECK(amount::text COLLATE "C"=recorded),CONSTRAINT present CHECK(amount IS NOT NULL),CONSTRAINT absent CHECK(amount IS NULL))`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'name_payloads')!,
      bundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains)
    await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(directory, 'checks.ts'), bundle.checks)
    for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
      const path = join(directory, 'checks-rust', artifact.path)
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
      join(directory, 'js'),
      join(directory, 'checks.ts'),
    ]).catch(async (e: { stdout: string; stderr: string }) => {
      await cp(directory, 'artifacts/name/public-generated', { recursive: true })
      throw new Error(e.stdout + e.stderr, { cause: e })
    })
    const generated = await import(pathToFileURL(join(directory, 'js/checks.js')).href)
    const evaluate = (amount: unknown, reference: unknown = amount, recorded: unknown = amount) =>
      Object.fromEntries(
        generated
          .evaluatePublicNamePayloadsChecks({
            amount,
            reference,
            recorded,
            expected: typeof amount === 'string' ? Buffer.from(amount, 'utf8') : null,
          })
          .map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
      )
    for (const value of ['', 'alpha', 'é😀', 'a '.repeat(60)])
      expect(evaluate(value)).toEqual({
        wire: /[^\x00-\x7f]/u.test(value) ? { certain: false } : { certain: true, value: true },
        same: { certain: true, value: true },
        rendered: { certain: true, value: true },
        present: { certain: true, value: true },
        absent: { certain: true, value: false },
      })
    expect(evaluate('alpha', 'beta', 'beta').same).toEqual({ certain: true, value: false })
    for (const value of [undefined, 123, {}, 'a\0b', '\ud800', '\udc00']) {
      const results = evaluate(value, 'valid', 'valid')
      expect(results['wire']).toEqual({ certain: false })
      expect(results['same']).toEqual({ certain: false })
      expect(results['rendered']).toEqual({ certain: false })
      expect(results['present']).toEqual({ certain: false })
      expect(results['absent']).toEqual({ certain: false })
    }
    expect(evaluate(null)).toEqual({
      wire: { certain: true, value: null },
      same: { certain: true, value: null },
      rendered: { certain: true, value: null },
      present: { certain: true, value: false },
      absent: { certain: true, value: true },
    })
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
