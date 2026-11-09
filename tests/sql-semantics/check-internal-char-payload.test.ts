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
    const runtime = await import(pathToFileURL(join(target, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(bundle.checks, runtime)
    type Result = {
      certain: boolean
      value?: boolean | null
      error?: string
    }
    // A public "char" value is a string read as charin reads it: a four-character backslash
    // escape of three octal digits names one byte, anything else stands for its first byte.
    const text = (byte: number) => '\\' + byte.toString(8).padStart(3, '0')
    const expectedWire = Buffer.from('ff', 'hex')
    const evaluate = (
      amount: unknown,
      reference: unknown = text(maximum),
      expected: unknown = expectedWire,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicSingleBytePayloadsChecks({ amount, reference, expected })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    // The same values sent to the server as text decide each check there.
    const server = (
      amount: string | null,
      reference: string = text(maximum),
      expected = expectedWire,
    ) => serverResults(pg, 'single_byte_payloads', { amount, reference, expected })
    expect(evaluate(text(maximum))).toEqual({
      wire: { certain: true, value: true },
      same: { certain: true, value: true },
      present: { certain: true, value: true },
      absent: { certain: true, value: false },
      price: { certain: true, value: true },
    })
    expect(evaluate(text(maximum))).toEqual(await server(text(maximum)))
    expect(evaluate(text(maximum - 1)).price).toEqual({
      certain: true,
      value: false,
    })
    expect(evaluate(text(maximum - 1))).toEqual(await server(text(maximum - 1)))
    for (const value of [0, 128, 255]) {
      const bytes = Buffer.alloc(1)
      bytes.writeUIntBE(Number(value), 0, 1)
      expect(evaluate(text(value), text(value), bytes).wire).toEqual({
        certain: true,
        value: true,
      })
      expect(evaluate(text(value), text(value), bytes)).toEqual(
        await server(text(value), text(value), bytes),
      )
    }
    for (const [amount, byte] of [
      ['', 0],
      ['a', 97],
      ['ab', 97],
      ['\\', 92],
      ['\\141', 97],
      ['\\1411', 92],
      ['\\18', 92],
    ] as const) {
      const bytes = Buffer.from([byte])
      expect(evaluate(amount, amount, bytes).wire, amount).toEqual({ certain: true, value: true })
      expect(evaluate(amount, amount, bytes)).toEqual(await server(amount, amount, bytes))
    }
    for (const amount of [undefined])
      expect(Object.values(evaluate(amount))).toEqual(
        Array.from({ length: 5 }, () => ({ certain: false })),
      )
    for (const amount of [
      1.25,
      maximum,
      String.fromCharCode(0),
      '\uD800',
      { kind: 'Value', value: maximum },
      { kind: 'Value', value: 1.25 },
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
      internal('public.single_byte_payloads', {
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
