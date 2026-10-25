import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('preserves historical text I/O selection across cast replacement without deployment identities', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      await pg.exec(`CREATE TYPE pair AS(n int4,old int4);
        CREATE TABLE before_cast(n int4,label text COLLATE "C",CHECK(ROW(n,label::int4)::pair IS NOT NULL));
        CREATE FUNCTION chosen(text) RETURNS int4 LANGUAGE SQL IMMUTABLE AS 'SELECT 99';
        CREATE CAST(text AS int4) WITH FUNCTION chosen(text);
        CREATE TABLE after_cast(n int4,label text COLLATE "C",CHECK(ROW(n,label::int4)::pair IS NOT NULL));
        ALTER TYPE pair DROP ATTRIBUTE old;`)
      const catalog = await snapshotCatalog(pg),
        before = catalog.tables.find((t) => t.name === 'before_cast')!,
        after = catalog.tables.find((t) => t.name === 'after_cast')!
      expect(before.constraints[0]!.definition).toBe(after.constraints[0]!.definition)
      expect(before.constraints[0]!.rowCoercionContext?.complete).toBe(true)
      expect(after.constraints[0]!.rowCoercionContext?.complete).toBe(false)
      expect(
        uncertain(
          lowerTableCheck(
            before,
            before.constraints[0]!,
            catalog.enums,
            catalog.domains,
            'stored',
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        ),
      ).toBe(false)
      expect(
        uncertain(
          lowerTableCheck(
            after,
            after.constraints[0]!,
            catalog.enums,
            catalog.domains,
            'stored',
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        ),
      ).toBe(true)
      contexts.push(before.constraints[0]!.rowCoercionContext)
      ids.push((await pg.query<{ oid: number }>("SELECT 'pair'::regtype::oid AS oid")).rows[0]!.oid)
      await expect(pg.exec("INSERT INTO before_cast VALUES(1,'bad')")).rejects.toMatchObject({
        code: '22P02',
      })
      await pg.exec("INSERT INTO after_cast VALUES(1,'bad')")
    } finally {
      await pg.close()
    }
  }
  expect(contexts[0]).toEqual(contexts[1])
  expect(ids[0]).not.toBe(ids[1])
})
