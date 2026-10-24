import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import {
  tsvectorContainerConstant,
  tsvectorConstantTypes,
} from '../../../src/catalog/tsvector-container-constants.js'
import type { ConstantStorageType } from '../../../src/catalog/container-constant-storage.js'

it('captures range and multirange bound facets across independent native catalogs, empty/unbounded values and offset strides', async () => {
  const captures: unknown[] = [],
    oids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x')")
      await pg.exec(`CREATE TYPE doc_span AS RANGE(subtype=tsvector,multirange_type_name=doc_ranges);
        CREATE TYPE state_span AS RANGE(subtype=float8[],multirange_type_name=state_ranges);
        CREATE TABLE literals(n int4,
          CONSTRAINT document CHECK(length(lower('[a,zzzzzzzzzz)'::doc_span))>n),
          CONSTRAINT members CHECK(length(lower('{[a,b),[c,d),[e,f),[g,h),[i,j)}'::doc_ranges))>n),
          CONSTRAINT empty_document CHECK(isempty('empty'::doc_span)),
          CONSTRAINT unbounded CHECK(length(upper('(,a]'::doc_span))>n),
          CONSTRAINT state CHECK(cardinality(lower('["{1,2,3}","{9,9,9}")'::state_span))>n));`)
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'literals')!
      const context = (name: string) =>
        table.constraints.find((c) => c.name === name)!.tsvectorConstants!
      expect(context('document')).toMatchObject({
        complete: true,
        containers: [
          {
            storage: [
              { nativeBytes: 13, lexemeCount: 1 },
              { nativeBytes: 22, lexemeCount: 1 },
            ],
          },
        ],
      })
      expect(context('members').containers![0]!.storage).toEqual(
        Array.from({ length: 10 }, () => ({ nativeBytes: 13, lexemeCount: 1 })),
      )
      expect(context('empty_document').containers![0]!.storage).toEqual([])
      expect(context('unbounded').containers![0]!.storage).toEqual([
        { nativeBytes: 13, lexemeCount: 1 },
      ])
      expect(table.constraints.find((c) => c.name === 'state')!.arrayConstants).toMatchObject({
        complete: true,
        constants: [
          {
            storage: [
              { path: '/0', dimensions: 1, elements: 3, nullBitmap: false },
              { path: '/1', dimensions: 1, elements: 3, nullBitmap: false },
            ],
          },
        ],
      })
      captures.push(
        table.constraints.map((c) => ({
          name: c.name,
          ts: c.tsvectorConstants,
          array: c.arrayConstants,
        })),
      )
      oids.push(
        (await pg.query<{ oid: number }>("SELECT 'doc_span'::regtype::oid oid")).rows[0]!.oid,
      )
    } finally {
      await pg.close()
    }
  }
  expect(oids[0]).not.toBe(oids[1])
  expect(captures[0]).toEqual(captures[1])
}, 30_000)

it('reads packed range bounds and multirange offset strides in either byte order and rejects inconsistent headers', () => {
  const scalar: ConstantStorageType = {
      oid: 51001,
      identity: 'pg_catalog.tsvector',
      kind: 'b',
      base: 0,
      element: null,
      length: -1,
      alignment: 'i',
      delimiter: ',',
      attributes: [],
    },
    range: ConstantStorageType = {
      ...scalar,
      oid: 61001,
      identity: 'public.doc_span',
      kind: 'r',
      rangeSubtype: scalar.oid,
    },
    multi: ConstantStorageType = {
      ...scalar,
      oid: 61002,
      identity: 'public.doc_ranges',
      kind: 'm',
      rangeType: range.oid,
    },
    types = new Map([scalar, range, multi].map((t) => [t.oid, t]))
  expect([...tsvectorConstantTypes(types).containers].sort()).toEqual([61001, 61002])
  for (const little of [false, true]) {
    const write = (data: Buffer, value: number, offset: number) => {
        if (little) data.writeUInt32LE(value, offset)
        else data.writeUInt32BE(value, offset)
      },
      leaf = Buffer.alloc(10)
    leaf[0] = little ? 21 : 138
    write(leaf, 1, 1)
    leaf[9] = 97
    const span = Buffer.alloc(29)
    write(span, span.length * (little ? 4 : 1), 0)
    write(span, range.oid, 4)
    leaf.copy(span, 8)
    leaf.copy(span, 18)
    span[28] = 2
    expect(tsvectorContainerConstant(span, range.oid, types)).toEqual([
      { nativeBytes: 13, lexemeCount: 1 },
      { nativeBytes: 13, lexemeCount: 1 },
    ])
    const members = Buffer.alloc(136)
    write(members, members.length * (little ? 4 : 1), 0)
    write(members, multi.oid, 4)
    write(members, 5, 8)
    for (let i = 0; i < 4; i++) write(members, i === 3 ? 2147483728 : 20, 12 + i * 4)
    for (let i = 0; i < 5; i++) {
      members[28 + i] = 2
      leaf.copy(members, 36 + i * 20)
      leaf.copy(members, 46 + i * 20)
    }
    expect(tsvectorContainerConstant(members, multi.oid, types)).toEqual(
      Array.from({ length: 10 }, () => ({ nativeBytes: 13, lexemeCount: 1 })),
    )
    for (const change of [
      (data: Buffer) => write(data, 80, 24),
      (data: Buffer) => write(data, 19, 12),
      (data: Buffer) => write(data, 99999, 4),
      (data: Buffer) => {
        data[28] = 1
      },
    ]) {
      const malformed = Buffer.from(members)
      change(malformed)
      expect(tsvectorContainerConstant(malformed, multi.oid, types)).toBeUndefined()
    }
  }
})
