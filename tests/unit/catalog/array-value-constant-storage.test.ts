import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { storedArrayConstant } from '../../../src/catalog/array-value-constant-storage.js'
import { storedEnumConstant } from '../../../src/catalog/enum-constant-storage.js'
import type { ConstantStorageType } from '../../../src/catalog/container-constant-storage.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'

const constant = (bytes: Buffer, oid: number): Tree => ({
  kind: 'CONST',
  fields: {
    consttype: [String(oid)],
    constisnull: ['false'],
    constbyval: ['false'],
    constlen: ['-1'],
    constvalue: [String(bytes.length), [...bytes].map(String)],
  },
})

it('recovers fixed scalar cells, bounds and NULL bitmap in each source byte order and alignment', () => {
  const scalar: ConstantStorageType = {
      oid: 51001,
      identity: 'public.amount',
      kind: 'd',
      base: 51000,
      element: null,
      length: 8,
      alignment: 'd',
      delimiter: ',',
      attributes: [],
    },
    base = { ...scalar, oid: 51000, identity: 'pg_catalog.int8', kind: 'b', base: 0 },
    array = {
      ...scalar,
      oid: 51002,
      identity: 'public._amount',
      kind: 'b',
      base: 0,
      element: scalar.oid,
      length: -1,
    },
    types = new Map([base, scalar, array].map((t) => [t.oid, t]))
  for (const order of ['little', 'big'] as const)
    for (const alignment of [4, 8] as const) {
      const bytes = Buffer.alloc(48),
        write = (n: number, offset: number) =>
          order === 'little' ? bytes.writeInt32LE(n, offset) : bytes.writeInt32BE(n, offset)
      write(bytes.length * (order === 'little' ? 4 : 1), 0)
      write(1, 4)
      write(32, 8)
      write(scalar.oid, 12)
      write(3, 16)
      write(-2, 20)
      bytes[24] = 5
      if (order === 'little') {
        bytes.writeBigInt64LE(-9223372036854775808n, 32)
        bytes.writeBigInt64LE(9223372036854775807n, 40)
      } else {
        bytes.writeBigInt64BE(-9223372036854775808n, 32)
        bytes.writeBigInt64BE(9223372036854775807n, 40)
      }
      const capture = (data: Buffer) =>
        storedArrayConstant(constant(data, array.oid), types, order, alignment, (cell, type) => ({
          value: String(order === 'little' ? cell.readBigInt64LE() : cell.readBigInt64BE()),
          type: type.identity,
        }))
      expect(capture(bytes)).toEqual({
        PgsidStoredArrayConstant: {
          element: 'public.amount',
          dimensions: [{ lower: -2, length: 3 }],
          nullBitmap: true,
          arrayStorage: [{ path: '', dimensions: 1, elements: 3, nullBitmap: true }],
          args: [
            { value: '-9223372036854775808', type: 'pg_catalog.int8' },
            { A_Const: { isnull: true } },
            { value: '9223372036854775807', type: 'pg_catalog.int8' },
          ],
        },
      })
      expect(capture(bytes.subarray(0, -1))).toBeUndefined()
      const wrongElement = Buffer.from(bytes)
      if (order === 'little') wrongElement.writeInt32LE(42, 12)
      else wrongElement.writeInt32BE(42, 12)
      expect(capture(wrongElement)).toBeUndefined()
      expect(
        storedArrayConstant(constant(bytes, array.oid), types, order, alignment, () => undefined),
      ).toBeUndefined()
    }
})

it('requires source alignment when trailing zeroes permit distinct native cell interpretations', () => {
  const cell: ConstantStorageType = {
      oid: 51001,
      identity: 'pg_catalog.timetz',
      kind: 'b',
      base: 0,
      element: null,
      length: 12,
      alignment: 'd',
      delimiter: ',',
      attributes: [],
    },
    array = { ...cell, oid: 51002, identity: 'pg_catalog._timetz', length: -1, element: cell.oid },
    types = new Map([cell, array].map((t) => [t.oid, t]))
  for (const order of ['little', 'big'] as const) {
    const bytes = Buffer.alloc(52),
      write = (n: number, offset: number) =>
        order === 'little' ? bytes.writeInt32LE(n, offset) : bytes.writeInt32BE(n, offset)
    write(bytes.length * (order === 'little' ? 4 : 1), 0)
    write(1, 4)
    write(cell.oid, 12)
    write(2, 16)
    write(1, 20)
    Buffer.from('0102030405060708090a0b0c', 'hex').copy(bytes, 24)
    Buffer.from('0d0e0f101112131400000000', 'hex').copy(bytes, 40)
    const capture = (alignment: 4 | 8 | undefined) =>
      storedArrayConstant(constant(bytes, array.oid), types, order, alignment, (value) =>
        value.toString('hex'),
      )
    expect(capture(undefined)).toBeUndefined()
    expect(capture(8)).toMatchObject({
      PgsidStoredArrayConstant: { args: ['0102030405060708090a0b0c', '0d0e0f101112131400000000'] },
    })
  }
})

it('resolves enum labels locally without carrying native value IDs into the expression', () => {
  for (const order of ['little', 'big'] as const)
    for (const size of [4, 8]) {
      const data = Buffer.alloc(size)
      if (order === 'little') data.writeUInt32LE(51001)
      else data.writeUInt32BE(51001, size - 4)
      const node = constant(data, 50000)
      node.fields['constlen'] = ['4']
      node.fields['constbyval'] = ['true']
      node.fields['constvalue']![0] = '4'
      expect(storedEnumConstant(node, order, new Map([[51001, '']]))).toBe('')
      expect(storedEnumConstant(node, order, new Map([[51001, 'renamed']]))).toBe('renamed')
      expect(storedEnumConstant(node, order, new Map([[51002, 'other']]))).toBeUndefined()
      node.fields['constvalue'] = ['4', ['-129', '0', '0', '0']]
      expect(storedEnumConstant(node, order, new Map([[51001, 'x']]))).toBeUndefined()
    }
})

it('captures enum and domain array values independently of deployment OIDs and later input checks', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x'); CREATE TABLE padding_row(n int4)")
      await pg.exec(`CREATE TYPE phase AS ENUM('z','','a');
        CREATE DOMAIN positive AS int4 CHECK(VALUE>0);
        CREATE TYPE reading AS(n int4,old phase[],amount positive[]);
        CREATE TABLE history(n int4,CHECK(ROW(n,'[0:2]={z,"",NULL}'::phase[],'{1,2}'::positive[])::reading IS NOT NULL));`)
      await pg.exec(`ALTER DOMAIN positive ADD CHECK(VALUE>2) NOT VALID;
        ALTER TYPE phase RENAME VALUE 'z' TO 'middle';
        ALTER TYPE reading DROP ATTRIBUTE old;
        ALTER TYPE reading DROP ATTRIBUTE amount;`)
      const c = await snapshotCatalog(pg),
        k = c.tables.find((t) => t.name === 'history')!.constraints[0]!
      expect(k.rowCoercionContext?.complete).toBe(true)
      expect(k.arrayConstants?.complete).toBe(true)
      expect(k.coercionContext).toBeUndefined()
      expect(JSON.stringify(k.rowCoercionContext)).toContain('middle')
      expect(JSON.stringify(k.rowCoercionContext)).toContain('PgsidStoredArrayConstant')
      expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
      await pg.exec('INSERT INTO history VALUES(1)')
      await expect(pg.exec('INSERT INTO history VALUES(NULL)')).rejects.toMatchObject({
        code: '23514',
      })
      contexts.push(k.rowCoercionContext)
      ids.push((await pg.query<{ oid: number }>("SELECT 'phase'::regtype::oid oid")).rows[0]!.oid)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)

it('retains a selected polymorphic array consumer after later custom overload creation', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE reading AS(n int4,old int4);
      CREATE TABLE earlier(n int4,CHECK(ROW(n,width_bucket(n,'{{1,2},{3,4}}'::int4[]))::reading IS NOT NULL));
      CREATE FUNCTION width_bucket(int4,int4[]) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT 1';
      CREATE TABLE later(n int4,CHECK(ROW(n,width_bucket(n,'{{1,2},{3,4}}'::int4[]))::reading IS NOT NULL));
      ALTER TYPE reading DROP ATTRIBUTE old;`)
    const c = await snapshotCatalog(pg),
      earlier = c.tables.find((t) => t.name === 'earlier')!,
      later = c.tables.find((t) => t.name === 'later')!
    expect(earlier.constraints[0]!.rowCoercionContext?.complete).toBe(true)
    expect(later.constraints[0]!.rowCoercionContext?.complete).toBe(false)
    for (const origin of ['source', 'stored'] as const) {
      const expression = lowerTableCheck(
        earlier,
        earlier.constraints[0]!,
        c.enums,
        c.domains,
        origin,
        c.rangeTypes,
        c.compositeTypeGraph,
        origin === 'source'
          ? "CHECK(ROW(n,width_bucket(n,'{{1,2},{3,4}}'::int4[]))::reading IS NOT NULL)"
          : undefined,
      )!.expression
      expect(expression.kind).not.toBe('uncertain')
      expect(JSON.stringify(expression)).toContain('pg_catalog.anycompatiblearray')
      expect(
        lowerTableCheck(
          later,
          later.constraints[0]!,
          c.enums,
          c.domains,
          origin,
          c.rangeTypes,
          c.compositeTypeGraph,
        )!.expression,
      ).toEqual({ kind: 'uncertain' })
    }
    await expect(pg.exec('INSERT INTO earlier VALUES(1)')).rejects.toMatchObject({ code: '2202E' })
    await pg.exec('INSERT INTO later VALUES(1)')
  } finally {
    await pg.close()
  }
})
