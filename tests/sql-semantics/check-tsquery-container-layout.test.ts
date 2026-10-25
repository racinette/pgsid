import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { tsqueryContainerConstant } from '../../src/catalog/tsquery-container-constants.js'
import type { ConstantStorageType } from '../../src/catalog/container-constant-storage.js'
import { readTsqueryFixture } from './check-tsquery-fixtures.js'

it('normalizes full/short native query headers and both byte orders without exporting catalog IDs', async () => {
  const pg = await PGlite.create()
  try {
    const query = 'é:*AB <2> (😀 | z:D)'
    await pg.exec(
      `CREATE TABLE native_layout(flag bool CHECK(tsquerysend('${query}'::tsquery) IS NOT NULL))`,
    )
    const tree = (
      await pg.query<{ tree: string }>(
        "SELECT conbin::text tree FROM pg_constraint WHERE conrelid='native_layout'::regclass",
      )
    ).rows[0]!.tree
    const raw = tree
      .match(/\{CONST\b[^{}]*:constlen -1\b[^{}]*\}/u)![0]
      .match(/:constvalue\s+(\d+)\s+\[([^\]]*)\]/u)!
    const datum = Buffer.from(raw[2]!.trim().split(/\s+/u).map(Number))
    expect(datum.length).toBe(Number(raw[1]))
    expect(datum.length).toBeLessThan(128)
    const expected = await readTsqueryFixture(pg, `SELECT '${query}'::tsquery item`, 'item')
    for (const little of [true, false])
      for (const short of [false, true])
        for (const oid of [301, 401]) {
          const native = Buffer.from(datum)
          if (!little) {
            const count = datum.readUInt32LE(4)
            native.writeUInt32BE(native.length)
            native.writeUInt32BE(count, 4)
            for (let i = 0; i < count; i++) {
              const at = 8 + i * 12
              if (datum[at] === 1) {
                native.writeInt32BE(datum.readInt32LE(at + 4), at + 4)
                const packed = datum.readUInt32LE(at + 8)
                native.writeUInt32BE((packed & 4095) * 1048576 + (packed >>> 12), at + 8)
              } else {
                native.writeInt16BE(datum.readInt16LE(at + 2), at + 2)
                native.writeUInt32BE(datum.readUInt32LE(at + 4), at + 4)
              }
            }
          }
          const leaf = short
            ? Buffer.concat([
                Buffer.from([little ? (native.length - 3) * 2 + 1 : native.length - 3 + 128]),
                native.subarray(4),
              ])
            : native
          const array = Buffer.alloc(24 + leaf.length)
          const word = (v: number, at: number) =>
            little ? array.writeInt32LE(v, at) : array.writeInt32BE(v, at)
          word(little ? array.length * 4 : array.length, 0)
          word(1, 4)
          word(oid, 12)
          word(1, 16)
          word(-3, 20)
          leaf.copy(array, 24)
          const scalar: ConstantStorageType = {
            oid,
            identity: 'pg_catalog.tsquery',
            kind: 'b',
            base: 0,
            element: null,
            length: -1,
            alignment: 'i',
            delimiter: ',',
            attributes: [],
          }
          const collection: ConstantStorageType = {
            ...scalar,
            oid: oid + 1,
            identity: 'pg_catalog._tsquery',
            element: oid,
          }
          const types = new Map([
            [oid, scalar],
            [oid + 1, collection],
          ])
          expect(tsqueryContainerConstant(array, oid + 1, types, true)).toEqual([expected])
          expect(tsqueryContainerConstant(array, oid + 1, types, false)).toBeUndefined()
          expect(tsqueryContainerConstant(array.subarray(1), oid + 1, types, true)).toBeUndefined()
          const mismatched = Buffer.from(array)
          if (little) mismatched.writeUInt32LE(oid + 2, 12)
          else mismatched.writeUInt32BE(oid + 2, 12)
          expect(tsqueryContainerConstant(mismatched, oid + 1, types, true)).toBeUndefined()
        }
  } finally {
    await pg.close()
  }
})
