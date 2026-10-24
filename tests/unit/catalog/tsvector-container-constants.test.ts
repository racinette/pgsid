import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { tsvectorContainerConstant } from '../../../src/catalog/tsvector-container-constants.js'
import type { ConstantStorageType } from '../../../src/catalog/container-constant-storage.js'

it('captures container leaf metadata across independent catalogs without retaining deployment type identities', async () => {
  const contexts: unknown[] = [],
    oids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE occupy_id AS ENUM('x')")
      await pg.exec(`CREATE DOMAIN vector_import AS tsvector;
    CREATE TYPE saved_vector AS(payload vector_import,terms tsvector[]);
    CREATE TABLE saved_vectors(source text,flag bool,
     CONSTRAINT scalar CHECK(flag OR ($record$("a:1A","[-1:0]={a:1A,NULL}")$record$::saved_vector).payload=source::tsvector),
     CONSTRAINT cell CHECK(flag OR (($record$("a:1A","[-1:0]={a:1A,NULL}")$record$::saved_vector).terms)[-1]=source::tsvector));`)
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'saved_vectors')!
      oids.push(
        (await pg.query<{ oid: number }>("SELECT 'saved_vector'::regtype::oid oid")).rows[0]!.oid,
      )
      contexts.push(table.constraints.map((c) => c.tsvectorConstants))
      for (const constraint of table.constraints) {
        expect(constraint.tsvectorConstants).toMatchObject({
          complete: true,
          containers: [
            {
              storage: [
                { nativeBytes: 18, lexemeCount: 1 },
                { nativeBytes: 18, lexemeCount: 1 },
              ],
            },
          ],
        })
        const visit = (value: unknown): void => {
          if (Array.isArray(value)) {
            value.forEach(visit)
            return
          }
          if (!value || typeof value !== 'object') return
          for (const [key, child] of Object.entries(value)) {
            expect([
              'definition',
              'complete',
              'constants',
              'containers',
              'site',
              'storage',
              'nativeBytes',
              'lexemeCount',
            ]).toContain(key)
            visit(child)
          }
        }
        visit(constraint.tsvectorConstants)
      }
    } finally {
      await pg.close()
    }
  }
  expect(oids[0]).not.toBe(oids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 60_000)

it('reads container framing and leaf sizes in either byte order with relocated type IDs and rejects unavailable or malformed frames', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      `CREATE TABLE vector_frames(flag bool,CHECK(flag OR ('{a:1A,NULL,""}'::tsvector[])[1] IS NOT NULL))`,
    )
    const rows = (
      await pg.query<ConstantStorageType>(
        `SELECT t.oid,n.nspname||'.'||t.typname identity,t.typtype kind,t.typbasetype base,NULLIF(t.typelem,0) element,t.typlen::int length,t.typalign alignment,t.typdelim delimiter,'[]'::json attributes FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.oid IN ('tsvector'::regtype,'tsvector[]'::regtype)`,
      )
    ).rows
    const types = new Map(rows.map((t) => [t.oid, t])),
      array = rows.find((t) => t.element !== null)!,
      element = array.element!
    const tree = (
      await pg.query<{ tree: string }>(
        "SELECT conbin::text tree FROM pg_constraint WHERE conrelid='vector_frames'::regclass",
      )
    ).rows[0]!.tree
    const data = tree.match(
      new RegExp(':consttype ' + array.oid + '\\b[^{}]*:constvalue \\d+ \\[([^\\]]+)\\]', 'u'),
    )![1]!
    const bytes = Buffer.from(
      data
        .trim()
        .split(/\s+/u)
        .map((v) => Number(v) & 255),
    )
    expect(bytes.readUInt32LE(0) / 4).toBe(bytes.length)
    const expected = [
      { nativeBytes: 18, lexemeCount: 1 },
      { nativeBytes: 8, lexemeCount: 0 },
    ]
    expect(tsvectorContainerConstant(bytes, array.oid, types)).toEqual(expected)
    const relocated = new Map(
      [...types.values()].map((t) => {
        const oid = t.oid === element ? 71001 : 72001
        return [oid, { ...t, oid, element: t.element === element ? 71001 : t.element }] as const
      }),
    )
    for (const little of [true, false]) {
      const foreign = Buffer.from(bytes),
        write = (value: number, offset: number) => {
          if (little) foreign.writeInt32LE(value, offset)
          else foreign.writeInt32BE(value, offset)
        }
      if (little) foreign.writeUInt32LE(bytes.length * 4, 0)
      else foreign.writeUInt32BE(bytes.length, 0)
      for (const offset of [4, 8, 16, 20]) write(bytes.readInt32LE(offset), offset)
      write(71001, 12)
      const count = bytes.readInt32LE(16),
        fixed = 24,
        bitmap = bytes.readInt32LE(8)
      let position = bitmap || fixed
      for (let i = 0; i < count; i++) {
        if (bitmap && (bytes[fixed + (i >>> 3)]! & (1 << (i & 7))) === 0) continue
        position = Math.ceil(position / 4) * 4
        const size = bytes.readUInt32LE(position) / 4,
          lexemes = bytes.readInt32LE(position + 4)
        if (little) foreign.writeUInt32LE(size * 4, position)
        else foreign.writeUInt32BE(size, position)
        write(lexemes, position + 4)
        position += size
      }
      expect(tsvectorContainerConstant(foreign, 72001, relocated)).toEqual(expected)
      expect(tsvectorContainerConstant(foreign, array.oid, types)).toBeUndefined()
    }
    for (const corrupt of [bytes.subarray(0, bytes.length - 1), Buffer.alloc(0)])
      expect(tsvectorContainerConstant(corrupt, array.oid, types)).toBeUndefined()
    const compressed = Buffer.from(bytes),
      start = bytes.readInt32LE(8) || 24
    compressed.writeUInt32LE(compressed.readUInt32LE(start) | 2, start)
    expect(tsvectorContainerConstant(compressed, array.oid, types)).toBeUndefined()
    const impossible = Buffer.from(bytes)
    impossible.writeInt32LE(-1, 16)
    expect(tsvectorContainerConstant(impossible, array.oid, types)).toBeUndefined()
  } finally {
    await pg.close()
  }
}, 60_000)
