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
    const row = (
      await pg.query<{ wire: Uint8Array; bounds: Uint8Array }>(
        "SELECT poly_send(p) wire,box_send(box(p)) bounds FROM (SELECT polygon('(0,0),(-0,-0)'::box) p) input",
      )
    ).rows[0]!
    const bytes = Buffer.from(row.wire),
      boundsBytes = Buffer.from(row.bounds),
      points: { x: bigint; y: bigint }[] = []
    for (let at = 4; at < bytes.length; at += 16)
      points.push({ x: bytes.readBigInt64BE(at), y: bytes.readBigInt64BE(at + 8) })
    const bounds = {
      highX: boundsBytes.readBigInt64BE(),
      highY: boundsBytes.readBigInt64BE(8),
      lowX: boundsBytes.readBigInt64BE(16),
      lowY: boundsBytes.readBigInt64BE(24),
    }
    const value = { kind: 'Value', value: { points, bounds } }
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
    expect(evaluate(value)).toEqual(known)
    expect(
      evaluate({
        kind: 'Value',
        value: { points, bounds: { kind: 'Value', value: { ...bounds, wireKnown: true } } },
      }),
    ).toEqual(known)
    expect(evaluate({ kind: 'Value', value: { points } })).toEqual({
      ...known,
      bounds_wire: { certain: false },
    })
    expect(evaluate({ kind: 'Value', value: { points, bounds: { kind: 'NonNull' } } })).toEqual({
      ...known,
      bounds_wire: { certain: false },
    })
    for (const bad of [
      undefined,
      '((0,0))',
      { kind: 'Unknown' },
      { kind: 'Value', value: { points: [] } },
      { kind: 'Value', value: { points: [null] } },
      { kind: 'Value', value: { points: [{ x: 0, y: 0n }] } },
      { kind: 'Value', value: { points: [{ x: 9223372036854775808n, y: 0n }] } },
      { kind: 'Value', value: { points: [{ x: 0n, y: 0n, wireKnown: 'false' }] } },
      { kind: 'Value', value: { points, bounds: null } },
      { kind: 'Value', value: { points, bounds: { ...bounds, highX: 0x3ff0000000000000n } } },
      { kind: 'Value', value: { points, bounds: { kind: 'Null' } } },
      { kind: 'Value', value: { points, bounds: { kind: 'Error', value: { state: 1 } } } },
    ])
      expect(Object.values(evaluate(bad))).toEqual(
        Array.from({ length: 6 }, () => ({ certain: false })),
      )
    for (const shape of [null, { kind: 'Null' }])
      expect(evaluate(shape)).toEqual({
        wire: { certain: true, value: null },
        bounds_wire: { certain: true, value: null },
        present: { certain: true, value: false },
        absent: { certain: true, value: true },
        bounds_present: { certain: true, value: false },
        bounds_length: { certain: true, value: null },
      })
    expect(
      Object.values(evaluate({ kind: 'Error', value: { state: parseInt('22012', 36) } })),
    ).toEqual(Array.from({ length: 6 }, () => ({ certain: true, error: '22012' })))
    expect(points).toHaveLength(4)
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
