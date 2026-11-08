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
import { internalCheckRows } from '../support/check-entries.js'
const failure = (code: string) => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
describe.each(['xid', 'cid', 'xid8'] as const)('public %s payloads', (type) => {
  const maximum = type === 'xid8' ? -1n : 4294967295n
  const invalidHigh = type === 'xid8' ? 9223372036854775808n : 4294967296n
  const invalidLow = type === 'xid8' ? -9223372036854775809n : -1n
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
    await pg.exec(`CREATE TABLE identifier_payloads(amount ${type},reference ${type},expected bytea,
      CONSTRAINT wire CHECK(${type}send(amount)=expected),CONSTRAINT same CHECK(${type === 'xid' ? 'xideq' : type === 'cid' ? 'cideq' : 'xid8eq'}(amount,reference)),
      CONSTRAINT present CHECK(amount IS NOT NULL),CONSTRAINT absent CHECK(amount IS NULL),
      CONSTRAINT price CHECK(amount = '${type === 'xid8' ? '18446744073709551615' : '4294967295'}'::${type}))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'identifier_payloads')!
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
    const runtime = await import(pathToFileURL(join(target, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(bundle.checks, runtime)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    // Public xid and cid values are numbers and xid8 values bigints, all unsigned.
    const publicMaximum = type === 'xid8' ? 18446744073709551615n : 4294967295
    const publicValue = (bits: bigint) =>
      type === 'xid8' ? BigInt.asUintN(64, bits) : Number(BigInt.asUintN(32, bits))
    const expectedWire = Buffer.from(type === 'xid8' ? 'ffffffffffffffff' : 'ffffffff', 'hex')
    const evaluate = (
      amount: unknown,
      reference: unknown = publicMaximum,
      expected: unknown = expectedWire,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicIdentifierPayloadsChecks({ amount, reference, expected })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    expect(evaluate(publicMaximum)).toEqual({
      wire: { certain: true, value: true },
      same: { certain: true, value: true },
      present: { certain: true, value: true },
      absent: { certain: true, value: false },
      price: { certain: true, value: true },
    })
    expect(evaluate(publicValue(maximum - 1n)).price).toEqual({
      certain: true,
      value: false,
    })
    for (const value of type === 'xid8'
      ? [-9223372036854775808n, 9223372036854775807n, -1n]
      : [0n, 4294967295n]) {
      const bytes = Buffer.alloc(type === 'xid8' ? 8 : 4)
      if (type === 'xid8') bytes.writeBigInt64BE(value)
      else bytes.writeUInt32BE(Number(value))
      expect(evaluate(publicValue(value), publicValue(value), bytes).wire).toEqual({
        certain: true,
        value: true,
      })
    }
    for (const amount of [undefined])
      expect(Object.values(evaluate(amount))).toEqual(
        Array.from({ length: 5 }, () => ({ certain: false })),
      )
    for (const amount of [
      '$1.25',
      '125',
      1.25,
      type === 'xid8' ? 125 : 125n,
      type === 'xid8' ? invalidHigh * 2n : Number(invalidHigh),
      type === 'xid8' ? -1n : -1,
      { kind: 'Value', value: maximum },
      { kind: 'Value', value: 125 },
      { kind: 'Value', value: '125' },
      { kind: 'Value', value: invalidHigh },
      { kind: 'Value', value: invalidLow },
      { kind: 'Null' },
      { kind: 'Unknown' },
      failure('22003'),
    ])
      expect(() => evaluate(amount), String(amount)).toThrow(TypeError)
    expect(evaluate(null)).toEqual({
      wire: { certain: true, value: null },
      same: { certain: true, value: null },
      present: { certain: true, value: false },
      absent: { certain: true, value: true },
      price: { certain: true, value: null },
    })
    // A NULL or failed operand handed to the evaluator directly: NULL propagates through every
    // strict comparison, and a failure fails every check that reads it.
    const rows = (amount: unknown) =>
      internal('public.identifier_payloads', {
        amount,
        reference: { kind: 'Value', value: maximum },
        expected: runtime.makeByteaValue(expectedWire.toString('hex')),
      })
    expect(rows({ kind: 'Value', value: maximum })).toEqual({
      wire: { kind: 'True' },
      same: { kind: 'True' },
      present: { kind: 'True' },
      absent: { kind: 'False' },
      price: { kind: 'True' },
    })
    expect(rows({ kind: 'Null' })).toEqual({
      wire: { kind: 'Null' },
      same: { kind: 'Null' },
      present: { kind: 'False' },
      absent: { kind: 'True' },
      price: { kind: 'Null' },
    })
    expect(Object.values(rows(failure('22003')))).toEqual(
      Array.from({ length: 5 }, () => failure('22003')),
    )
  }, 120_000)
})
