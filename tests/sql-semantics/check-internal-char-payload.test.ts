import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
const failure = (code: string) => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
describe.each(['"char"'] as const)('public %s payloads', (type) => {
  const maximum = 255
  const invalidHigh = 256
  const invalidLow = -1
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-internal-char-payload-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('validates SQL-coerced byte carriers and retains known stored literal comparisons in the public API', async () => {
    await pg.exec(`CREATE DOMAIN octet_payload AS ${type}; CREATE DOMAIN nested_octet_payload AS octet_payload; CREATE TABLE single_byte_payloads(amount nested_octet_payload,reference ${type},expected bytea,
      CONSTRAINT wire CHECK(charsend(amount)=expected),CONSTRAINT same CHECK(chareq(amount,reference)),
      CONSTRAINT present CHECK(amount IS NOT NULL),CONSTRAINT absent CHECK(amount IS NULL),
      CONSTRAINT price CHECK(amount = '\\377'::${type}))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'single_byte_payloads')!
    const bundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains),
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
    type Result = {
      certain: boolean
      value?: boolean | null
      error?: string
    }
    const evaluate = (
      amount: unknown,
      reference: unknown = { kind: 'Value', value: maximum },
      expected: unknown = Buffer.from('ff', 'hex'),
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicSingleBytePayloadsChecks({ amount, reference, expected })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    expect(evaluate({ kind: 'Value', value: maximum })).toEqual({
      wire: { certain: true, value: true },
      same: { certain: true, value: true },
      present: { certain: true, value: true },
      absent: { certain: true, value: false },
      price: { certain: true, value: true },
    })
    expect(evaluate({ kind: 'Value', value: maximum - 1 }).price).toEqual({
      certain: true,
      value: false,
    })
    for (const value of [0, 128, 255]) {
      const bytes = Buffer.alloc(1)
      bytes.writeUIntBE(Number(value), 0, 1)
      expect(evaluate({ kind: 'Value', value }, { kind: 'Value', value }, bytes).wire).toEqual({
        certain: true,
        value: true,
      })
    }
    for (const amount of [
      undefined,
      '\\377',
      1.25,
      maximum,
      { kind: 'Value', value: 1.25 },
      { kind: 'Value', value: '125' },
      { kind: 'Value', value: invalidHigh },
      { kind: 'Value', value: invalidLow },
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
        price: { certain: true, value: null },
      })
    expect(Object.values(evaluate(failure('22003')))).toEqual(
      Array.from({ length: 5 }, () => ({ certain: true, error: '22003' })),
    )
  }, 120000)
})
