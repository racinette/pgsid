import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import type { ConstantStorageType } from '../../../src/catalog/container-constant-storage.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'

const constant = (bytes: Buffer, oid: number): Tree => ({
  kind: 'CONST',
  fields: {
    consttype: [String(oid)],
    constcollid: ['0'],
    constisnull: ['false'],
    constbyval: ['false'],
    constlen: ['-1'],
    constvalue: [String(bytes.length), [...bytes].map((n) => String(n > 127 ? n - 256 : n))],
  },
})
it('recovers nominal vector shapes and unsigned cells with each byte order and shifted local headers', () => {
  for (const oid of [false, true])
    for (const shift of [0, 1000])
      for (const order of ['little', 'big'] as const) {
        const cell: ConstantStorageType = {
            oid: 51000 + shift,
            identity: oid ? 'pg_catalog.oid' : 'pg_catalog.int2',
            kind: 'b',
            base: 0,
            element: null,
            length: oid ? 4 : 2,
            alignment: oid ? 'i' : 's',
            delimiter: ',',
            attributes: [],
          },
          vector: ConstantStorageType = {
            ...cell,
            oid: 51001 + shift,
            identity: oid ? 'pg_catalog.oidvector' : 'pg_catalog.int2vector',
            length: -1,
            alignment: 'i',
          },
          types = new Map([cell, vector].map((t) => [t.oid, t]))
        const values = oid ? [0, 2147483648, 4294967295] : [-32768, 0, 32767]
        for (const data of [values, []])
          for (const lower of [-3, 0, 1]) {
            const bytes = Buffer.alloc(24 + data.length * cell.length),
              write = (n: number, at: number) =>
                order === 'little' ? bytes.writeInt32LE(n, at) : bytes.writeInt32BE(n, at)
            write(bytes.length * (order === 'little' ? 4 : 1), 0)
            write(1, 4)
            write(cell.oid, 12)
            write(data.length, 16)
            write(lower, 20)
            data.forEach((n, i) =>
              oid
                ? order === 'little'
                  ? bytes.writeUInt32LE(n, 24 + i * 4)
                  : bytes.writeUInt32BE(n, 24 + i * 4)
                : order === 'little'
                  ? bytes.writeInt16LE(n, 24 + i * 2)
                  : bytes.writeInt16BE(n, 24 + i * 2),
            )
            const input = {
                types: new Map([...types].map(([id, t]) => [id, t.identity])),
                functions: new Map(),
                columns: new Map(),
                storageTypes: types,
                byteOrder: order,
              },
              decode = (b: Buffer) => storedRowExpression(constant(b, vector.oid), input),
              result = decode(bytes)
            expect(result).toMatchObject({
              PgsidStoredArrayConstant: {
                vector: vector.identity,
                element: cell.identity,
                dimensions: [{ lower, length: data.length }],
                nullBitmap: false,
                args: data.map((n) =>
                  oid
                    ? { PgsidStoredSystem: { type: cell.identity, value: String(n) } }
                    : { TypeCast: { arg: { A_Const: { sval: { sval: String(n) } } } } },
                ),
              },
            })
            expect(decode(bytes.subarray(0, -1))).toBeUndefined()
            const corrupt = Buffer.from(bytes)
            if (order === 'little') corrupt.writeInt32LE(cell.oid + 10, 12)
            else corrupt.writeInt32BE(cell.oid + 10, 12)
            expect(decode(corrupt)).toBeUndefined()
            expect(types.get(vector.oid)?.element).toBeNull()
          }
      }
})
it('captures recursive vector constants independently of catalog IDs and later domain input checks', async () => {
  const contexts: unknown[][] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int)")
      await pg.exec(`CREATE DOMAIN saved_vector AS oidvector CHECK(cardinality(VALUE)<=3);
      CREATE TYPE saved AS(positions int2vector,types saved_vector,old int);
      CREATE TYPE result AS(n int,old saved[]);
      CREATE TABLE history(n int,CHECK(ROW(n,'{"(\\"-32768 32767\\",\\"4294967295 0\\",1)",NULL}'::saved[])::result IS NOT NULL));
      CREATE TABLE plain(expected int,CHECK(cardinality(''::int2vector)=expected));
      ALTER TYPE result DROP ATTRIBUTE old;
      ALTER DOMAIN saved_vector ADD CHECK(cardinality(VALUE)>3) NOT VALID;
      ALTER TYPE saved DROP ATTRIBUTE old;ALTER TYPE saved RENAME ATTRIBUTE positions TO current_positions;`)
      const c = await snapshotCatalog(pg),
        out: unknown[] = []
      for (const name of ['history', 'plain']) {
        const t = c.tables.find((t) => t.name === name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, name).toBe(true)
        const p = lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            'stored',
            c.rangeTypes,
            c.compositeTypeGraph,
          )!,
          g = prepareCheckRustGroup([
            {
              identity: { schema: 'public', kind: 'table', owner: name, constraint: 'stored' },
              expression: p.expression,
            },
          ])
        expect(g.checks[0]!.kind, name).toBe('supported')
        expect(g.evaluatorSource).not.toContain('catalog_vector_from_text(')
        out.push(k.rowCoercionContext)
      }
      await pg.exec('INSERT INTO history VALUES(1);INSERT INTO plain VALUES(0)')
      await expect(pg.exec('INSERT INTO history VALUES(NULL)')).rejects.toMatchObject({
        code: '23514',
      })
      contexts.push(out)
      ids.push((await pg.query<{ id: number }>("SELECT 'saved'::regtype::oid id")).rows[0]!.id)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)
