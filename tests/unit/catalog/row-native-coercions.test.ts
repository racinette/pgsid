import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'
import type { ConstantStorageType } from '../../../src/catalog/container-constant-storage.js'

it('captures domain and detached ancestor coercions without portable deployment identities', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      await pg.exec(`CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);
    CREATE TABLE parent_value(n int4);CREATE TABLE child_value(d int4) INHERITS(parent_value);
    CREATE TYPE scalar_result AS(n int4,old int4);CREATE TYPE row_result AS(n int4,old parent_value);
    CREATE TABLE history(n int4,d int4,
     CHECK(ROW(n,n::positive)::scalar_result IS NOT NULL),
     CHECK(ROW(n,n::positive::int4)::scalar_result IS NOT NULL),
     CHECK(ROW(n,ROW(n,d)::child_value::parent_value)::row_result IS NOT NULL));
    ALTER TYPE scalar_result DROP ATTRIBUTE old;ALTER TYPE row_result DROP ATTRIBUTE old;
    ALTER TABLE child_value NO INHERIT parent_value;ALTER DOMAIN positive ADD CHECK(VALUE>=2);`)
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.name === 'history')!
      for (const k of t.constraints) {
        expect(k.rowCoercionContext?.complete).toBe(true)
        expect(JSON.stringify(k.rowCoercionContext)).toContain('PgsidStoredCoercion')
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        for (const origin of ['source', 'stored'] as const)
          expect(
            lowerTableCheck(t, k, c.enums, c.domains, origin, c.rangeTypes, c.compositeTypeGraph)!
              .expression.kind,
          ).not.toBe('uncertain')
      }
      contexts.push(t.constraints.map((k) => k.rowCoercionContext))
      ids.push(
        (await pg.query<{ oid: number }>("SELECT 'positive'::regtype::oid oid")).rows[0]!.oid,
      )
      await pg.exec('INSERT INTO history VALUES(2,1)')
      await expect(pg.exec('INSERT INTO history VALUES(1,1)')).rejects.toMatchObject({
        code: '23514',
      })
      await expect(pg.exec('SELECT ROW(2,1)::child_value::parent_value')).rejects.toMatchObject({
        code: '42846',
      })
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)

it('validates native domain base identities, stored type cycles and scalar versus row coercion roles', () => {
  const scalar: Tree = {
      kind: 'VAR',
      fields: {
        varno: ['1'],
        varlevelsup: ['0'],
        varattno: ['1'],
        vartype: ['101'],
        varcollid: ['0'],
      },
    },
    node: Tree = {
      kind: 'COERCETODOMAIN',
      fields: { arg: [scalar], resulttype: ['303'], resultcollid: ['0'] },
    },
    base: ConstantStorageType = {
      oid: 101,
      identity: 'pg_catalog.int4',
      kind: 'b',
      base: 0,
      element: null,
      length: 4,
      alignment: 'i',
      delimiter: ',',
      attributes: [],
    },
    domain: ConstantStorageType = {
      ...base,
      oid: 303,
      identity: 'public.positive',
      kind: 'd',
      base: 101,
    },
    input = {
      types: new Map([
        [101, 'pg_catalog.int4'],
        [202, 'pg_catalog.bool'],
        [303, 'public.positive'],
      ]),
      functions: new Map(),
      columns: new Map([[1, { name: 'n', type: 101 }]]),
      byteOrder: 'little' as const,
      storageTypes: new Map([
        [101, base],
        [303, domain],
      ]),
    }
  expect(storedRowExpression(node, input)).toMatchObject({
    PgsidStoredCoercion: { kind: 'domain', source: 'pg_catalog.int4', type: 'public.positive' },
  })
  for (const target of [
    { ...domain, base: 202 },
    { ...domain, base: 303 },
    { ...domain, kind: 'b' },
  ])
    expect(
      storedRowExpression(node, {
        ...input,
        storageTypes: new Map([
          [101, base],
          [303, target],
        ]),
      }),
    ).toBeUndefined()
  expect(storedRowExpression({ ...node, kind: 'CONVERTROWTYPEEXPR' }, input)).toBeUndefined()
  expect(storedRowExpression(node, { ...input, storageTypes: new Map() })).toBeUndefined()
})
