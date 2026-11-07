import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { internalCheckRows } from '../support/check-entries.js'

it('validates public polygon payloads, cached bounds, malformed inputs and partial binary precision', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-polygon-payload-'))
  try {
    await pg.exec(`CREATE TABLE polygon_payloads(shape polygon,expected bytea,expected_bounds bytea,
      CONSTRAINT wire CHECK(poly_send(shape)=expected), CONSTRAINT bounds_wire CHECK(box_send(box(shape))=expected_bounds),
      CONSTRAINT present CHECK(shape IS NOT NULL), CONSTRAINT absent CHECK(shape IS NULL),
      CONSTRAINT bounds_present CHECK(box(shape) IS NOT NULL), CONSTRAINT bounds_length CHECK(length(box_send(box(shape)))=32))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'polygon_payloads')!,
      bundle = renderTypescriptSchemaCheckArtifacts([table])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), bundle.checks)
    for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
      const path = join(root, 'checks-rust', artifact.path)
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
      join(root, 'js'),
      join(root, 'checks.ts'),
    ]).catch((caught: { stdout: string; stderr: string }) => {
      throw new Error(caught.stdout + caught.stderr, { cause: caught })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(bundle.checks, runtime)
    const row = (
      await pg.query<{ wire: Uint8Array; bounds: Uint8Array }>(
        "SELECT poly_send(p) wire,box_send(box(p)) bounds FROM (SELECT polygon('(0,0),(-0,-0)'::box) p) input",
      )
    ).rows[0]!
    const bytes = Buffer.from(row.wire),
      boundsBytes = Buffer.from(row.bounds),
      points: { x: bigint; y: bigint }[] = [],
      corners: { x: number; y: number }[] = []
    for (let at = 4; at < bytes.length; at += 16) {
      points.push({ x: bytes.readBigInt64BE(at), y: bytes.readBigInt64BE(at + 8) })
      corners.push({ x: bytes.readDoubleBE(at), y: bytes.readDoubleBE(at + 8) })
    }
    const bounds = {
      highX: boundsBytes.readBigInt64BE(),
      highY: boundsBytes.readBigInt64BE(8),
      lowX: boundsBytes.readBigInt64BE(16),
      lowY: boundsBytes.readBigInt64BE(24),
    }
    const value = { points: corners }
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (shape: unknown): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicPolygonPayloadsChecks({
            shape,
            expected: row.wire,
            expected_bounds: row.bounds,
          })
          .map((check: { constraint: string; result: Result }) => [check.constraint, check.result]),
      )
    const known = {
      wire: { certain: true, value: true },
      bounds_wire: { certain: true, value: true },
      present: { certain: true, value: true },
      absent: { certain: true, value: false },
      bounds_present: { certain: true, value: true },
      bounds_length: { certain: true, value: true },
    }
    // A public polygon reaches the server as text, so poly_in computes its cached bounds from the
    // points in order; the server's answer for that text decides the bounds' wire bits.
    const text = `(${corners.map(({ x, y }) => `(${Object.is(x, -0) ? '-0' : x},${Object.is(y, -0) ? '-0' : y})`).join(',')})`
    const sameBounds = (
      await pg.query<{ same: boolean }>('SELECT box_send(box($1::polygon)) = $2::bytea same', [
        text,
        row.bounds,
      ])
    ).rows[0]!.same
    expect(evaluate(value)).toEqual({ ...known, bounds_wire: { certain: true, value: sameBounds } })
    expect(Object.values(evaluate(undefined))).toEqual(
      Array.from({ length: 6 }, () => ({ certain: false })),
    )
    const payloadPoints = points.map((point) => ({ ...point, wireKnown: true }))
    for (const bad of [
      '((0,0))',
      { points: [] },
      {},
      { points: [null] },
      { points: [{ x: 0, y: 0n }] },
      { points: [{ x: '0', y: 0 }] },
      { points: [{ x: 0 }] },
      { kind: 'Value', value: { points } },
      { kind: 'Value', value: { points, bounds } },
      { kind: 'Value', value: { points: [] } },
      { kind: 'Value', value: { points: [null] } },
      { kind: 'Value', value: { points: [{ x: 0, y: 0n }] } },
      { kind: 'Value', value: { points: [{ x: 9223372036854775808n, y: 0n }] } },
      { kind: 'Value', value: { points: [{ x: 0n, y: 0n, wireKnown: 'false' }] } },
      { kind: 'Value', value: { points, bounds: null } },
      { kind: 'Value', value: { points, bounds: { ...bounds, highX: 0x3ff0000000000000n } } },
      { kind: 'Value', value: { points, bounds: { kind: 'Null' } } },
      { kind: 'Value', value: { points, bounds: { kind: 'Error', value: { state: 1 } } } },
      { kind: 'Unknown' },
      { kind: 'Null' },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    ])
      expect(
        () => evaluate(bad),
        JSON.stringify(bad, (_key, item) => (typeof item === 'bigint' ? String(item) : item)),
      ).toThrow(TypeError)
    expect(evaluate(null)).toEqual({
      wire: { certain: true, value: null },
      bounds_wire: { certain: true, value: null },
      present: { certain: true, value: false },
      absent: { certain: true, value: true },
      bounds_present: { certain: true, value: false },
      bounds_length: { certain: true, value: null },
    })
    // States no public value expresses go to the evaluator entries directly: the stored bounds the
    // server caches decide the bounds' wire bits, a bounds whose bits are unknown or only known to
    // be present leaves them undecided, cached bounds that disagree with the points (or are SQL
    // NULL or failed) describe no polygon, and an unknown or failed operand leaves or fails every
    // check that reads it.
    const rows = (shape: unknown) =>
      internal('public.polygon_payloads', {
        shape,
        expected: runtime.makeByteaValue(bytes.toString('hex')),
        expected_bounds: runtime.makeByteaValue(boundsBytes.toString('hex')),
      })
    const polygon = (cached: unknown): { kind: string } =>
      runtime.makePolygonValue({ points: payloadPoints, bounds: cached })
    const internalKnown = {
      wire: { kind: 'True' },
      bounds_wire: { kind: 'True' },
      present: { kind: 'True' },
      absent: { kind: 'False' },
      bounds_present: { kind: 'True' },
      bounds_length: { kind: 'True' },
    }
    const cached = runtime.makeBoxBits(bounds.highX, bounds.highY, bounds.lowX, bounds.lowY)
    expect(rows(polygon(cached))).toEqual(internalKnown)
    for (const unresolved of [runtime.boxUnknown(), { kind: 'NonNull' }])
      expect(rows(polygon(unresolved))).toEqual({
        ...internalKnown,
        bounds_wire: { kind: 'Unknown' },
      })
    for (const invalid of [
      runtime.makeBoxBits(0x3ff0000000000000n, bounds.highY, bounds.lowX, bounds.lowY),
      { kind: 'Null' },
      { kind: 'Error', value: { state: 1 } },
    ])
      expect(polygon(invalid).kind).not.toBe('Value')
    expect(runtime.makePolygonValue({ points: [], bounds: runtime.boxUnknown() }).kind).not.toBe(
      'Value',
    )
    expect(Object.values(rows({ kind: 'Unknown' }))).toEqual(
      Array.from({ length: 6 }, () => ({ kind: 'Unknown' })),
    )
    expect(rows({ kind: 'Null' })).toEqual({
      wire: { kind: 'Null' },
      bounds_wire: { kind: 'Null' },
      present: { kind: 'False' },
      absent: { kind: 'True' },
      bounds_present: { kind: 'False' },
      bounds_length: { kind: 'Null' },
    })
    const failed = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    expect(Object.values(rows(failed))).toEqual(Array.from({ length: 6 }, () => failed))
    expect(points).toHaveLength(4)
    expect(corners).toHaveLength(4)
    expect(bounds).toEqual({
      highX: -9223372036854775808n,
      highY: -9223372036854775808n,
      lowX: 0n,
      lowY: 0n,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
