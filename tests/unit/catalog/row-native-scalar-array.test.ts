import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'

it('captures native scalar-array operator identities independently of deployment IDs and later overloads', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      await pg.exec(`SET search_path=public,pg_catalog;
        CREATE TYPE stage AS ENUM('a','b');CREATE TYPE history_row AS(n int4,old bool);
        CREATE TABLE history(n int4,d int4,label text COLLATE "C",phase stage,
          CHECK(ROW(n,n=ANY(ARRAY[d,NULL]))::history_row IS NOT NULL),
          CHECK(ROW(n,label<ALL(ARRAY['z',NULL]))::history_row IS NOT NULL),
          CHECK(ROW(n,phase=ANY(ARRAY['b'::stage,NULL]))::history_row IS NOT NULL));
        ALTER TYPE history_row DROP ATTRIBUTE old;
        CREATE FUNCTION chosen(int4,int4) RETURNS bool LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT false';
        CREATE OPERATOR public.= (LEFTARG=int4,RIGHTARG=int4,FUNCTION=chosen);`)
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.name === 'history')!
      for (const k of t.constraints) {
        expect(k.rowCoercionContext?.complete).toBe(true)
        expect(JSON.stringify(k.rowCoercionContext)).toContain('PgsidStoredScalarArray')
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        for (const origin of ['source', 'stored'] as const)
          expect(
            lowerTableCheck(t, k, c.enums, c.domains, origin, c.rangeTypes, c.compositeTypeGraph)!
              .expression.kind,
            k.definition + ':' + origin,
          ).not.toBe('uncertain')
      }
      contexts.push(t.constraints.map((k) => k.rowCoercionContext))
      ids.push((await pg.query<{ oid: number }>("SELECT 'stage'::regtype::oid oid")).rows[0]!.oid)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)

it.each(['chosen', 'pg_catalog.int4eq'])(
  'keeps selected custom scalar-array operators unavailable even with implementation %s',
  async (implementation) => {
    const pg = await PGlite.create()
    try {
      await pg.exec(`SET search_path=public,pg_catalog;
      CREATE FUNCTION chosen(int4,int4) RETURNS bool LANGUAGE SQL IMMUTABLE AS 'SELECT true';
      CREATE OPERATOR public.= (LEFTARG=int4,RIGHTARG=int4,FUNCTION=${implementation});
      CREATE TYPE history_row AS(n int4,old bool);
      CREATE TABLE history(n int4,d int4,CHECK(ROW(n,n=ANY(ARRAY[d]))::history_row IS NOT NULL));
      ALTER TYPE history_row DROP ATTRIBUTE old;`)
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.name === 'history')!
      expect(t.constraints[0]!.rowCoercionContext?.complete).toBe(false)
    } finally {
      await pg.close()
    }
  },
  30_000,
)

it('validates selected scalar-array implementations, array carriers, flags and collation metadata', () => {
  const column = (type: string, position: string): Tree => ({
      kind: 'VAR',
      fields: {
        varno: ['1'],
        varlevelsup: ['0'],
        varattno: [position],
        vartype: [type],
        varcollid: ['0'],
      },
    }),
    signature = 'operator:["pg_catalog","="](pg_catalog.int4,pg_catalog.int4)',
    implementation = 'function:["pg_catalog","int4eq"](pg_catalog.int4,pg_catalog.int4)',
    input = {
      types: new Map([
        [101, 'pg_catalog.int4'],
        [202, 'pg_catalog.bool'],
        [303, 'pg_catalog._int4'],
      ]),
      functions: new Map([
        [
          404,
          {
            signature: implementation,
            args: ['pg_catalog.int4', 'pg_catalog.int4'],
            result: 'pg_catalog.bool',
          },
        ],
      ]),
      operators: new Map([[505, { signature, implementation }]]),
      columns: new Map([
        [1, { name: 'n', type: 101 }],
        [2, { name: 'values', type: 303 }],
      ]),
      byteOrder: 'little' as const,
      arrayElements: new Map([[303, 101]]),
    },
    node: Tree = {
      kind: 'SCALARARRAYOPEXPR',
      fields: {
        opno: ['505'],
        opfuncid: ['404'],
        inputcollid: ['0'],
        useOr: ['true'],
        hashfuncid: ['0'],
        negfuncid: ['0'],
        args: [[column('101', '1'), column('303', '2')]],
      },
    }
  expect(storedRowExpression(node, input)).toMatchObject({
    PgsidStoredScalarArray: { signature, implementation, any: true },
  })
  for (const [key, values] of Object.entries({
    opno: ['999'],
    opfuncid: ['999'],
    inputcollid: ['999'],
    useOr: ['bad'],
    hashfuncid: ['999'],
    negfuncid: ['999'],
  }))
    expect(
      storedRowExpression({ ...node, fields: { ...node.fields, [key]: values } }, input),
    ).toBeUndefined()
  expect(storedRowExpression(node, { ...input, arrayElements: new Map() })).toBeUndefined()
  expect(
    storedRowExpression(node, {
      ...input,
      operators: new Map([[505, { signature, implementation: 'other' }]]),
    }),
  ).toBeUndefined()
})
