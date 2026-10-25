import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'
import type { ConstantStorageType } from '../../../src/catalog/container-constant-storage.js'

it('retains native comparison, renamed field and concrete domain result identities independently of deployment OIDs', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      await pg.exec(`SET search_path=public,pg_catalog;CREATE TYPE inner_value AS(v int4,label text COLLATE "C");
        CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE positive_span AS RANGE(subtype=positive);
        CREATE TYPE scalar_row AS(n int4,old int4);CREATE TYPE bool_row AS(n int4,old bool);
        CREATE TABLE history(n int4,d int4,
          CHECK(ROW(n,NULLIF(('(3,x)'::inner_value).v,n/d))::scalar_row IS NOT NULL),
          CHECK(ROW(n,CASE WHEN lower('[1,3)'::positive_span)=1 THEN 1/d ELSE NULL END)::scalar_row IS NOT NULL),
          CHECK(ROW(n,n IS NOT DISTINCT FROM d)::bool_row IS NOT NULL));
        ALTER TYPE scalar_row DROP ATTRIBUTE old;ALTER TYPE bool_row DROP ATTRIBUTE old;
        ALTER TYPE inner_value RENAME ATTRIBUTE v TO score;ALTER DOMAIN positive ADD CHECK(VALUE>=10);
        CREATE FUNCTION public.lower(positive_span) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT 99';`)
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.name === 'history')!
      for (const k of t.constraints) {
        expect(k.rowCoercionContext?.complete).toBe(true)
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        for (const origin of ['source', 'stored'] as const)
          expect(
            lowerTableCheck(t, k, c.enums, c.domains, origin, c.rangeTypes, c.compositeTypeGraph)!
              .expression.kind,
          ).not.toBe('uncertain')
      }
      const serialized = JSON.stringify(t.constraints.map((k) => k.rowCoercionContext))
      expect(serialized).toContain('PgsidStoredComparison')
      expect(serialized).toContain('score')
      expect(serialized).toContain('"result":"public.positive"')
      await pg.exec('INSERT INTO history VALUES(1,1)')
      await expect(pg.exec('INSERT INTO history VALUES(1,0)')).rejects.toMatchObject({
        code: '22012',
      })
      contexts.push(t.constraints.map((k) => k.rowCoercionContext))
      ids.push(
        (await pg.query<{ oid: number }>("SELECT 'inner_value'::regtype::oid oid")).rows[0]!.oid,
      )
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)

it('defers selected unavailable equality callbacks instead of replacing them with builtin comparisons', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`SET search_path=public,pg_catalog;CREATE TYPE reading AS(n int4,old int4);
      CREATE TABLE earlier(n int4,d int4,CHECK(ROW(n,CASE WHEN n IS NOT DISTINCT FROM d THEN NULLIF(n,d) ELSE 1/d END)::reading IS NOT NULL));
      CREATE FUNCTION chosen(int4,int4) RETURNS bool LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT false';
      CREATE OPERATOR public.= (LEFTARG=int4,RIGHTARG=int4,FUNCTION=chosen);
      CREATE TABLE later(n int4,d int4,CHECK(ROW(n,CASE WHEN n IS NOT DISTINCT FROM d THEN NULLIF(n,d) ELSE 1/d END)::reading IS NOT NULL));
      ALTER TYPE reading DROP ATTRIBUTE old;`)
    const c = await snapshotCatalog(pg)
    for (const name of ['earlier', 'later']) {
      const t = c.tables.find((t) => t.name === name)!,
        k = t.constraints[0]!
      expect(k.rowCoercionContext?.complete).toBe(name === 'earlier')
      for (const origin of ['source', 'stored'] as const)
        expect(
          lowerTableCheck(t, k, c.enums, c.domains, origin, c.rangeTypes, c.compositeTypeGraph)!
            .expression.kind === 'uncertain',
        ).toBe(name === 'later')
    }
    await expect(pg.exec('INSERT INTO earlier VALUES(1,1)')).rejects.toMatchObject({
      code: '23514',
    })
    await pg.exec('INSERT INTO later VALUES(1,1)')
  } finally {
    await pg.close()
  }
})

it('requires the captured field position, name and result type without inferring missing attributes', () => {
  const record: ConstantStorageType = {
      oid: 500,
      identity: 'public.reading',
      kind: 'c',
      base: 0,
      element: null,
      length: -1,
      alignment: 'd',
      delimiter: ',',
      attributes: [{ name: 'renamed', type: 100, length: 4, alignment: 'i', dropped: false }],
    },
    arg: Tree = {
      kind: 'VAR',
      fields: {
        varno: ['1'],
        varlevelsup: ['0'],
        varattno: ['1'],
        vartype: ['500'],
        varcollid: ['0'],
      },
    },
    field: Tree = {
      kind: 'FIELDSELECT',
      fields: { arg: [arg], fieldnum: ['1'], resulttype: ['100'], resultcollid: ['0'] },
    },
    input = {
      types: new Map([
        [500, 'public.reading'],
        [100, 'pg_catalog.int4'],
      ]),
      functions: new Map(),
      columns: new Map([[1, { name: 'r', type: 500 }]]),
      byteOrder: 'little' as const,
      storageTypes: new Map([[500, record]]),
    }
  expect(storedRowExpression(field, input)).toEqual({
    A_Indirection: {
      arg: { ColumnRef: { fields: [{ String: { sval: 'r' } }] } },
      indirection: [{ String: { sval: 'renamed' } }],
    },
  })
  for (const attribute of [
    { ...record.attributes[0]!, name: undefined },
    { ...record.attributes[0]!, dropped: true },
    { ...record.attributes[0]!, type: 101 },
  ])
    expect(
      storedRowExpression(field, {
        ...input,
        storageTypes: new Map([[500, { ...record, attributes: [attribute] }]]),
      }),
    ).toBeUndefined()
  expect(
    storedRowExpression({ ...field, fields: { ...field.fields, fieldnum: ['2'] } }, input),
  ).toBeUndefined()
})
