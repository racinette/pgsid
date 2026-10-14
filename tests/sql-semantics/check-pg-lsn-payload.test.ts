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
describe.each(['pg_lsn'] as const)('public %s payloads', (type) => {
  const maximum = -1n
  const invalidHigh = 9223372036854775808n
  const invalidLow = -9223372036854775809n
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-oid-payload-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('validates SQL-coerced unsigned carriers and retains known stored literal comparisons in the public API', async () => {
    await pg.exec(`CREATE TABLE wal_location_payloads(amount ${type},reference ${type},expected bytea,
      CONSTRAINT wire CHECK(pg_lsn_send(amount)=expected),CONSTRAINT same CHECK(pg_lsn_eq(amount,reference)),
      CONSTRAINT present CHECK(amount IS NOT NULL),CONSTRAINT absent CHECK(amount IS NULL),
      CONSTRAINT price CHECK(amount = 'FFFFFFFF/FFFFFFFF'::${type}))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'wal_location_payloads')!
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
      expected: unknown = Buffer.from('ffffffffffffffff', 'hex'),
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicWalLocationPayloadsChecks({ amount, reference, expected })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    expect(evaluate({ kind: 'Value', value: maximum })).toEqual({
      wire: { certain: true, value: true },
      same: { certain: true, value: true },
      present: { certain: true, value: true },
      absent: { certain: true, value: false },
      price: { certain: true, value: true },
    })
    expect(evaluate({ kind: 'Value', value: maximum - 1n }).price).toEqual({
      certain: true,
      value: false,
    })
    for (const value of [-9223372036854775808n, 9223372036854775807n, -1n]) {
      const bytes = Buffer.alloc(8)
      if (true) bytes.writeBigInt64BE(value)
      else bytes.writeUInt32BE(Number(value))
      expect(evaluate({ kind: 'Value', value }, { kind: 'Value', value }, bytes).wire).toEqual({
        certain: true,
        value: true,
      })
    }
    for (const amount of [
      undefined,
      'FFFFFFFF/FFFFFFFF',
      1.25,
      maximum,
      { kind: 'Value', value: 125 },
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
