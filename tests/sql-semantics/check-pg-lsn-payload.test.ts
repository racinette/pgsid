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
// PostgreSQL's own result for each CHECK of a table on one row, the values sent as a query sends
// them: bytea as bytes, everything else as its text, and null as SQL NULL.
async function serverResults(
  pg: PGlite,
  table: string,
  row: Record<string, string | Uint8Array | null>,
): Promise<Record<string, unknown>> {
  const { rows } = await pg.query<{ name: string; expression: string }>(
    `SELECT conname AS name, pg_get_expr(conbin, conrelid) AS expression FROM pg_constraint
      WHERE conrelid = $1::regclass AND contype = 'c'`,
    [table],
  )
  const columns = (
    await pg.query<{ name: string; type: string }>(
      `SELECT attname AS name, format_type(atttypid, atttypmod) AS type FROM pg_attribute
        WHERE attrelid = $1::regclass AND attnum > 0 AND NOT attisdropped ORDER BY attnum`,
      [table],
    )
  ).rows
  const inputs = columns.map(({ name, type }, index) => `$${index + 1}::${type} AS ${name}`)
  const results: Record<string, unknown> = {}
  for (const { name, expression } of rows)
    try {
      const value = (
        await pg.query<{ result: boolean | null }>(
          `SELECT (${expression}) AS result FROM (SELECT ${inputs.join(', ')}) AS input`,
          columns.map(({ name }) => row[name] ?? null),
        )
      ).rows[0]!.result
      results[name] = { certain: true, value }
    } catch (error) {
      results[name] = { certain: true, error: (error as { code: string }).code }
    }
  return results
}
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
    const runtime = await import(pathToFileURL(join(target, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(bundle.checks, runtime)
    type Result = {
      certain: boolean
      value?: boolean | null
      error?: string
    }
    // Public pg_lsn values are the server's text, read through its input function.
    const text = (bits: bigint) => {
      const unsigned = BigInt.asUintN(64, bits)
      return `${(unsigned >> 32n).toString(16)}/${(unsigned & 0xffffffffn).toString(16)}`.toUpperCase()
    }
    const expectedWire = Buffer.from('ffffffffffffffff', 'hex')
    const evaluate = (
      amount: unknown,
      reference: unknown = text(maximum),
      expected: unknown = expectedWire,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicWalLocationPayloadsChecks({ amount, reference, expected })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    // The same values sent to the server as text decide each check there.
    const server = (
      amount: string | null,
      reference: string = text(maximum),
      expected = expectedWire,
    ) => serverResults(pg, 'wal_location_payloads', { amount, reference, expected })
    expect(evaluate(text(maximum))).toEqual({
      wire: { certain: true, value: true },
      same: { certain: true, value: true },
      present: { certain: true, value: true },
      absent: { certain: true, value: false },
      price: { certain: true, value: true },
    })
    expect(evaluate(text(maximum))).toEqual(await server(text(maximum)))
    expect(evaluate(text(maximum - 1n)).price).toEqual({
      certain: true,
      value: false,
    })
    expect(evaluate(text(maximum - 1n))).toEqual(await server(text(maximum - 1n)))
    for (const value of [-9223372036854775808n, 9223372036854775807n, -1n]) {
      const bytes = Buffer.alloc(8)
      bytes.writeBigInt64BE(value)
      expect(evaluate(text(value), text(value), bytes).wire).toEqual({
        certain: true,
        value: true,
      })
      expect(evaluate(text(value), text(value), bytes)).toEqual(
        await server(text(value), text(value), bytes),
      )
    }
    // Malformed text fails each check reading it with the server's own input error.
    for (const amount of ['x/1', '1/FFFFFFFFF', '']) {
      expect(Object.values(evaluate(amount))).toEqual(
        Array.from({ length: 5 }, () => ({ certain: true, error: '22P02' })),
      )
      expect(evaluate(amount)).toEqual(await server(amount))
    }
    for (const amount of [undefined])
      expect(Object.values(evaluate(amount))).toEqual(
        Array.from({ length: 5 }, () => ({ certain: false })),
      )
    for (const amount of [
      1.25,
      maximum,
      18446744073709551615n,
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
    expect(evaluate(null)).toEqual(await server(null))
    // A NULL or failed operand handed to the evaluator directly: NULL propagates through every
    // strict comparison, and a failure fails every check that reads it.
    const rows = (amount: unknown) =>
      internal('public.wal_location_payloads', {
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
  }, 120000)
})
