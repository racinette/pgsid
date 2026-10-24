import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import {
  arrayConstantStorage,
  arrayStorageContainerTypes,
} from '../../../src/catalog/array-constant-storage.js'
import type { ConstantStorageType } from '../../../src/catalog/container-constant-storage.js'

it('captures array storage paths across nested records, domains and defaults without retaining catalog IDs', async () => {
  const captures: unknown[] = []
  const oids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x')")
      await pg.exec(`CREATE TYPE state_record AS(value float8[],label text);
        CREATE DOMAIN state_values AS float8[] CHECK(float8_avg('{1,2,3}'::float8[])>0);
        CREATE TYPE state_range AS RANGE(subtype=float8[]);
        CREATE FUNCTION state_default(lo float8[] DEFAULT '{1,2,3}',hi float8[] DEFAULT '{9,9,9}')
          RETURNS state_range LANGUAGE internal IMMUTABLE AS 'range_constructor2';
        CREATE TABLE sources(observation float8,CONSTRAINT direct CHECK(float8_avg('{1,2,3}'::float8[])>observation),
          CONSTRAINT record CHECK(float8_avg(('("{1,2,3}",x)'::state_record).value)>observation));`)
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'sources')!
      const contexts = table.constraints.map((c) => c.arrayConstants)
      expect(contexts.every((c) => c?.complete)).toBe(true)
      expect(contexts[0]?.constants[0]?.storage).toEqual([
        { path: '', dimensions: 1, elements: 3, nullBitmap: false },
      ])
      expect(contexts[1]?.constants[0]?.storage).toEqual([
        { path: '/0', dimensions: 1, elements: 3, nullBitmap: false },
      ])
      expect(catalog.domains[0]?.checks[0]?.arrayConstants?.constants[0]?.storage).toEqual(
        contexts[0]?.constants[0]?.storage,
      )
      const callable = catalog.rangeTypes
        .find((t) => t.name === 'state_range')!
        .callables!.find((c) => c.name === 'state_default')!
      expect(callable.defaultArrayConstants?.map((c) => c?.constants[0]?.storage)).toEqual([
        [{ path: '', dimensions: 1, elements: 3, nullBitmap: false }],
        [{ path: '', dimensions: 1, elements: 3, nullBitmap: false }],
      ])
      captures.push({ contexts, defaults: callable.defaultArrayConstants })
      oids.push(
        (await pg.query<{ oid: number }>("SELECT 'state_record'::regtype::oid oid")).rows[0]!.oid,
      )
    } finally {
      await pg.close()
    }
  }
  expect(oids[0]).not.toBe(oids[1])
  expect(captures[0]).toEqual(captures[1])
}, 30_000)

it('decodes native NULL bitmap presence in either byte order with plain or short array headers', () => {
  const scalar: ConstantStorageType = {
      oid: 51001,
      identity: 'pg_catalog.int4',
      kind: 'b',
      base: 0,
      element: null,
      length: 4,
      alignment: 'i',
      delimiter: ',',
      attributes: [],
    },
    array: ConstantStorageType = {
      ...scalar,
      oid: 51002,
      identity: 'pg_catalog._int4',
      element: 51001,
      length: -1,
    },
    types = new Map([
      [scalar.oid, scalar],
      [array.oid, array],
    ]),
    roots = arrayStorageContainerTypes(types)
  for (const little of [false, true])
    for (const bitmap of [false, true])
      for (const short of [false, true]) {
        const bytes = Buffer.alloc(bitmap ? 40 : 32),
          write = (value: number, offset: number) => {
            if (little) bytes.writeInt32LE(value, offset)
            else bytes.writeInt32BE(value, offset)
          }
        write(bytes.length * (little ? 4 : 1), 0)
        write(1, 4)
        write(bitmap ? 32 : 0, 8)
        write(scalar.oid, 12)
        write(2, 16)
        write(-3, 20)
        if (bitmap) bytes[24] = 3
        write(2, bitmap ? 32 : 24)
        write(3, bitmap ? 36 : 28)
        const input = short
          ? Buffer.concat([
              Buffer.from([little ? (bytes.length - 3) * 2 + 1 : (bytes.length - 3) | 128]),
              bytes.subarray(4),
            ])
          : bytes
        expect(arrayConstantStorage(input, array.oid, types, roots)).toEqual([
          { path: '', dimensions: 1, elements: 2, nullBitmap: bitmap },
        ])
        expect(
          arrayConstantStorage(input.subarray(0, input.length - 1), array.oid, types, roots),
        ).toBeUndefined()
      }
})
