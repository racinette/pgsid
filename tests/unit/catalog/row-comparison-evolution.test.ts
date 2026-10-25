import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../../src/catalog/diff.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('captures width conversions elided from expanded row comparisons after width changes and type removal without OIDs', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      const source = "CHECK(ROW(n,label)::pair IS DISTINCT FROM ROW(m,'ab')::pair)"
      await pg.exec(`CREATE TYPE pair AS(a int4,label varchar(2) COLLATE "C");
        CREATE TABLE changing(n int4,m int4,label text COLLATE "C",CONSTRAINT valid ${source});
        ALTER TYPE pair ALTER ATTRIBUTE label TYPE varchar(3);`)
      const old = await snapshotCatalog(pg),
        before = old.tables.find((t) => t.name === 'changing')!,
        constraint = before.constraints[0]!
      expect(constraint.definition).not.toContain('varying(2)')
      expect(constraint.rowCoercionContext?.scalars?.length).toBe(2)
      expect(
        uncertain(
          lowerTableCheck(
            before,
            constraint,
            old.enums,
            old.domains,
            'source',
            old.rangeTypes,
            old.compositeTypeGraph,
            source,
          )!.expression,
        ),
      ).toBe(false)
      expect(
        uncertain(
          lowerTableCheck(
            before,
            {
              ...constraint,
              rowCoercionContext: { ...constraint.rowCoercionContext!, scalars: undefined },
            },
            old.enums,
            old.domains,
            'source',
            old.rangeTypes,
            old.compositeTypeGraph,
            source,
          )!.expression,
        ),
      ).toBe(true)
      contexts.push(constraint.rowCoercionContext)
      ids.push((await pg.query<{ oid: number }>("SELECT 'pair'::regtype::oid AS oid")).rows[0]!.oid)
      await expect(pg.exec("INSERT INTO changing VALUES(1,1,'abc')")).rejects.toMatchObject({
        code: '23514',
      })
      await pg.exec(
        `ALTER TABLE changing DROP CONSTRAINT valid;ALTER TABLE changing ADD CONSTRAINT valid ${source}`,
      )
      const fresh = await snapshotCatalog(pg),
        after = fresh.tables.find((t) => t.name === 'changing')!.constraints[0]!
      expect(constraint.definition).toBe(after.definition)
      expect(constraint.rowCoercionContext?.scalars).not.toEqual(after.rowCoercionContext?.scalars)
      expect(diffCatalogs(old, fresh).modified.map((m) => m.entityId)).toContain('public.changing')
      await pg.exec("INSERT INTO changing VALUES(1,1,'abc');DROP TYPE pair")
      const removed = await snapshotCatalog(pg),
        table = removed.tables.find((t) => t.name === 'changing')!
      expect(
        uncertain(
          lowerTableCheck(
            table,
            table.constraints[0]!,
            removed.enums,
            removed.domains,
            'source',
            removed.rangeTypes,
            removed.compositeTypeGraph,
            source,
          )!.expression,
        ),
      ).toBe(false)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
  expect(JSON.stringify(contexts)).not.toMatch(/"\w*oid\w*":/iu)
})

it('defers selected unavailable scalar cast functions after row comparison expansion instead of borrowing builtin I/O', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE pair AS(n int4,old int4);
      CREATE TABLE before_cast(n int4,label text,CHECK(ROW(n,label)::pair IS DISTINCT FROM ROW(n,99)::pair));
      CREATE FUNCTION chosen(text) RETURNS int4 LANGUAGE SQL IMMUTABLE AS 'SELECT 99';
      CREATE CAST(text AS int4) WITH FUNCTION chosen(text);
      CREATE TABLE after_cast(n int4,label text,CHECK(ROW(n,label)::pair IS DISTINCT FROM ROW(n,99)::pair));
      CREATE TABLE explicit_cast(n int4,label text,CHECK(ROW(n,label::int4)::pair IS DISTINCT FROM ROW(n,99)::pair));
      ALTER TYPE pair DROP ATTRIBUTE old;`)
    const catalog = await snapshotCatalog(pg),
      before = catalog.tables.find((t) => t.name === 'before_cast')!,
      after = catalog.tables.find((t) => t.name === 'after_cast')!
    expect(before.constraints[0]!.definition).toBe(after.constraints[0]!.definition)
    expect(before.constraints[0]!.rowCoercionContext?.complete ?? true).toBe(true)
    expect(after.constraints[0]!.rowCoercionContext?.complete).toBe(false)
    expect(
      catalog.tables.find((t) => t.name === 'explicit_cast')!.constraints[0]!.rowCoercionContext
        ?.complete,
    ).toBe(false)
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
    await expect(pg.exec("INSERT INTO before_cast VALUES(1,'bad')")).rejects.toMatchObject({
      code: '22P02',
    })
    await expect(pg.exec("INSERT INTO after_cast VALUES(1,'bad')")).rejects.toMatchObject({
      code: '23514',
    })
  } finally {
    await pg.close()
  }
})

it('retains an explicit recovery gap for hidden native numeric constants instead of evaluating the lossy printed cast chain', async () => {
  const pg = await PGlite.create()
  try {
    const source = 'CHECK(ROW(n,1.25)::ip IS DISTINCT FROM ROW(n,1.25)::np)'
    await pg.exec(
      `CREATE TYPE ip AS(n int4,v int4);CREATE TYPE np AS(n int4,v numeric);CREATE TABLE changing(n int4,${source})`,
    )
    const c = await snapshotCatalog(pg),
      table = c.tables.find((t) => t.name === 'changing')!,
      constraint = table.constraints[0]!
    expect(constraint.rowCoercionContext?.complete).toBe(false)
    expect(
      uncertain(
        lowerTableCheck(
          table,
          constraint,
          c.enums,
          c.domains,
          'source',
          c.rangeTypes,
          c.compositeTypeGraph,
          source,
        )!.expression,
      ),
    ).toBe(true)
    await pg.exec('INSERT INTO changing VALUES(1)')
  } finally {
    await pg.close()
  }
})
