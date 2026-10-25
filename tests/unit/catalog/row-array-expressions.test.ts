import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { parseTree } from '../../../src/catalog/expression-tree.js'

it('captures omitted array construction and exact element casts independently of row type OIDs', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      await pg.exec(`CREATE TYPE reading AS(n int4,old numeric[]);
        CREATE TABLE history(n int4,d int4,CHECK(ROW(n,COALESCE(NULL::int4[],ARRAY[n/d,NULL])::numeric[])::reading IS NOT NULL));
        ALTER TYPE reading DROP ATTRIBUTE old;`)
      const c = await snapshotCatalog(pg),
        table = c.tables.find((t) => t.name === 'history')!,
        k = table.constraints[0]!
      expect(k.rowCoercionContext?.complete).toBe(true)
      expect(k.rowCoercionContext?.constructors?.[0]?.omitted).toHaveLength(1)
      expect(JSON.stringify(k.rowCoercionContext)).toContain('PgsidStoredArrayCoercion')
      expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
      for (const origin of ['source', 'stored'] as const)
        expect(
          lowerTableCheck(
            table,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source'
              ? 'CHECK(ROW(n,COALESCE(NULL::int4[],ARRAY[n/d,NULL])::numeric[])::reading IS NOT NULL)'
              : undefined,
          )!.expression.kind,
        ).not.toBe('uncertain')
      await pg.exec('INSERT INTO history VALUES(1,1)')
      await expect(pg.exec('INSERT INTO history VALUES(1,0)')).rejects.toMatchObject({
        code: '22012',
      })
      contexts.push(k.rowCoercionContext)
      ids.push((await pg.query<{ oid: number }>("SELECT 'reading'::regtype::oid oid")).rows[0]!.oid)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
})

it('keeps earlier native array I/O casts and defers selected unavailable custom element casts', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE reading AS(n int4,old int4[]);
      CREATE TABLE earlier(n int4,label text,CHECK(ROW(n,ARRAY[label]::int4[])::reading IS NOT NULL));
      CREATE FUNCTION chosen(text) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT 7';
      CREATE CAST(text AS int4) WITH FUNCTION chosen(text);
      CREATE TABLE later(n int4,label text,CHECK(ROW(n,ARRAY[label]::int4[])::reading IS NOT NULL));
      ALTER TYPE reading DROP ATTRIBUTE old;`)
    const c = await snapshotCatalog(pg),
      earlier = c.tables.find((t) => t.name === 'earlier')!,
      later = c.tables.find((t) => t.name === 'later')!
    expect(earlier.constraints[0]!.rowCoercionContext?.complete).toBe(true)
    expect(later.constraints[0]!.rowCoercionContext?.complete).toBe(false)
    const saved = JSON.stringify(earlier.constraints[0]!.rowCoercionContext)
    expect(saved).toContain('"kind":"io"')
    await expect(pg.exec("INSERT INTO earlier VALUES(1,'bad')")).rejects.toMatchObject({
      code: '22P02',
    })
    await pg.exec("INSERT INTO later VALUES(1,'bad')")
    for (const origin of ['source', 'stored'] as const) {
      const plan = lowerTableCheck(
        earlier,
        earlier.constraints[0]!,
        c.enums,
        c.domains,
        origin,
        c.rangeTypes,
        c.compositeTypeGraph,
        origin === 'source' ? 'CHECK(ROW(n,ARRAY[label]::int4[])::reading IS NOT NULL)' : undefined,
      )!
      expect(plan.expression.kind).not.toBe('uncertain')
      expect(JSON.stringify(plan.expression)).toContain('text-to-integer')
    }
    for (const origin of ['source', 'stored'] as const)
      expect(
        lowerTableCheck(
          later,
          later.constraints[0]!,
          c.enums,
          c.domains,
          origin,
          c.rangeTypes,
          c.compositeTypeGraph,
          origin === 'source'
            ? 'CHECK(ROW(n,ARRAY[label]::int4[])::reading IS NOT NULL)'
            : undefined,
        )!.expression,
      ).toEqual({ kind: 'uncertain' })
  } finally {
    await pg.close()
  }
})

it('requires captured array element identities and scopes element placeholders to their conversion', () => {
  const input = {
      types: new Map([
        [100, 'pg_catalog._int4'],
        [101, 'pg_catalog.int4'],
        [102, 'pg_catalog.int2'],
      ]),
      functions: new Map(),
      columns: new Map(),
      byteOrder: 'little' as const,
    },
    array = parseTree(
      '{ARRAYEXPR :array_typeid 100 :element_typeid 101 :array_collid 0 :elements <> :multidims false}',
    )
  expect(storedRowExpression(array, input)).toBeUndefined()
  expect(
    storedRowExpression(array, { ...input, arrayElements: new Map([[100, 102]]) }),
  ).toBeUndefined()
  expect(storedRowExpression(array, { ...input, arrayElements: new Map([[100, 101]]) })).toEqual({
    PgsidStoredArray: { element: 'pg_catalog.int4', multidimensional: false, args: [] },
  })
  const element = parseTree('{CASETESTEXPR :typeId 101 :typeMod -1 :collation 0}')
  expect(storedRowExpression(element, input)).toBeUndefined()
  expect(storedRowExpression(element, { ...input, arrayElement: 102 })).toBeUndefined()
  expect(storedRowExpression(element, { ...input, arrayElement: 101 })).toEqual({
    ColumnRef: { fields: [{ String: { sval: '__pgsid_domain_element' } }] },
  })
})
