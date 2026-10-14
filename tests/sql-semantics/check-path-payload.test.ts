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

it('validates SQL-coerced path point lists, partial states and binary precision through the public TypeScript API', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-path-payload-'))
  try {
    await pg.exec(`CREATE TABLE path_payloads(route path,reference path,expected bytea,
      CONSTRAINT wire CHECK(path_send(route)=expected), CONSTRAINT cardinality CHECK(route=reference),
      CONSTRAINT present CHECK(route IS NOT NULL), CONSTRAINT absent CHECK(route IS NULL))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'path_payloads')!,
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
    const points = [
        { x: 0n, y: 0n, wireKnown: true },
        { x: 0x4008000000000000n, y: 0x4010000000000000n, wireKnown: true },
      ],
      payload = { closed: false, points },
      value = { kind: 'Value', value: payload }
    const wire = (
      await pg.query<{ wire: Uint8Array }>("SELECT path_send('[(0,0),(3,4)]'::path) wire")
    ).rows[0]!.wire
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (route: unknown, reference: unknown = value): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicPathPayloadsChecks({ route, reference, expected: wire })
          .map((check: { constraint: string; result: Result }) => [check.constraint, check.result]),
      )
    const known = {
      wire: { certain: true, value: true },
      cardinality: { certain: true, value: true },
      present: { certain: true, value: true },
      absent: { certain: true, value: false },
    }
    expect(evaluate(value)).toEqual(known)
    expect(
      evaluate({
        kind: 'Value',
        value: { closed: false, points: points.map((p) => ({ ...p, wireKnown: false })) },
      }),
    ).toEqual({ ...known, wire: { certain: false } })
    expect(
      evaluate(value, {
        kind: 'Value',
        value: {
          closed: true,
          points: [
            { x: 99n, y: 99n },
            { x: 100n, y: 100n },
          ],
        },
      }),
    ).toEqual(known)
    for (const bad of [
      undefined,
      '[(0,0),(3,4)]',
      { kind: 'Unknown' },
      { kind: 'Value', value: { closed: false, points: [] } },
      { kind: 'Value', value: { closed: 'false', points } },
      { kind: 'Value', value: { closed: false, points: [null] } },
      { kind: 'Value', value: { closed: false, points: [{ x: 0, y: 0n }] } },
      { kind: 'Value', value: { closed: false, points: [{ x: 9223372036854775808n, y: 0n }] } },
      { kind: 'Value', value: { closed: false, points: [{ x: 0n, y: 0n, wireKnown: 'false' }] } },
    ])
      expect(Object.values(evaluate(bad))).toEqual(
        Array.from({ length: 4 }, () => ({ certain: false })),
      )
    for (const nullValue of [null, { kind: 'Null' }])
      expect(evaluate(nullValue)).toEqual({
        wire: { certain: true, value: null },
        cardinality: { certain: true, value: null },
        present: { certain: true, value: false },
        absent: { certain: true, value: true },
      })
    expect(
      Object.values(evaluate({ kind: 'Error', value: { state: parseInt('22012', 36) } })),
    ).toEqual(Array.from({ length: 4 }, () => ({ certain: true, error: '22012' })))
    expect(
      evaluate({ kind: 'Value', value: { closed: false, points: [{ x: 0n, y: 0n }] } }).cardinality,
    ).toEqual({ certain: true, value: false })
    expect(points).toHaveLength(2)
    expect(points[1]!.x).toBe(0x4008000000000000n)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
