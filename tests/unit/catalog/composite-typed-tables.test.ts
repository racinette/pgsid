import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readCatalogCompositeTypes } from '../../../src/postgres/composite-types.js'
import { compositeTypeDependencies } from '../../../src/catalog/composite-dependencies.js'
import {
  catalogCompositeType,
  compositeAncestorMapping,
  compositeRowCoercion,
} from '../../../src/sql-semantics/composite-profiles.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))
const ddl = `CREATE SCHEMA "Row.Base"; CREATE SCHEMA selected;
CREATE TYPE "Row.Base".reading AS(score int4,label text COLLATE "C");
CREATE TABLE selected.readings OF "Row.Base".reading;
CREATE TABLE selected.child(extra int4) INHERITS(selected.readings);
CREATE TYPE "Row.Base".unrelated AS(score int4,label text COLLATE "C");
CREATE TABLE selected.q(v selected.readings,p "Row.Base".reading,
  CONSTRAINT direct CHECK((v::"Row.Base".reading).score>=0),
  CONSTRAINT common CHECK((COALESCE(v,p)).score>=0));`

it('captures typed-table targets outside selected schemas without making OF relationships transitively inheritable', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  try {
    await first.exec(ddl)
    await second.exec(
      `CREATE TYPE padding AS ENUM('x');${ddl}SET quote_all_identifiers=on;SET search_path=pg_catalog`,
    )
    const a = await readCatalogCompositeTypes(first, ['selected']),
      b = await readCatalogCompositeTypes(second, ['selected']),
      slice = compositeTypeDependencies(a, ['selected.child'])!,
      type = (id: string) => catalogCompositeType(id, a)!
    expect(a).toEqual(b)
    expect(slice.definitions.find((n) => n.identity === 'selected.readings')!.typedOf).toBe(
      '"Row.Base".reading',
    )
    expect(slice.definitions.some((n) => n.identity === '"Row.Base".unrelated')).toBe(false)
    expect(compositeAncestorMapping(type('selected.readings'), type('"Row.Base".reading'))).toEqual(
      [0, 1],
    )
    expect(compositeAncestorMapping(type('selected.child'), type('selected.readings'))).toEqual([
      0, 1,
    ])
    expect(compositeAncestorMapping(type('selected.child'), type('"Row.Base".reading'))).toBeNull()
    expect(
      compositeAncestorMapping(type('"Row.Base".reading'), type('selected.readings')),
    ).toBeNull()
    const ids = [],
      sources = []
    for (const pg of [first, second]) {
      ids.push(
        (await pg.query<{ oid: number }>(`SELECT 'selected.readings'::regtype::oid AS oid`))
          .rows[0]!.oid,
      )
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.schema === 'selected' && t.name === 'q')!,
        checks = t.constraints.map((constraint) => ({
          identity: {
            schema: t.schema,
            kind: 'table' as const,
            owner: t.name,
            constraint: constraint.name,
          },
          expression: lowerTableCheck(
            t,
            constraint,
            c.enums,
            c.domains,
            'stored',
            c.rangeTypes,
            c.compositeTypeGraph,
          )!.expression,
        })),
        group = prepareCheckRustGroup(checks, { defaultCollation: 'C', serverEncoding: 'UTF8' })
      for (const p of checks) expect(uncertain(p.expression)).toBe(false)
      expect(typeof group.evaluatorSource).toBe('string')
      sources.push(group.evaluatorSource)
    }
    expect(ids[0]).not.toBe(ids[1])
    expect(sources[0]).toBe(sources[1])
    expect(JSON.stringify(a)).not.toMatch(/"\w*oid\w*":/iu)
    const broken = structuredClone(a)
    broken.definitions = broken.definitions.filter((n) => n.identity !== '"Row.Base".reading')
    expect(compositeTypeDependencies(broken, ['selected.child'])).toBeNull()
    expect(catalogCompositeType('selected.child', broken)).toBeNull()
    slice.definitions.find((n) => n.identity === 'selected.readings')!.typedOf = 'missing.type'
    expect(a.definitions.find((n) => n.identity === 'selected.readings')!.typedOf).toBe(
      '"Row.Base".reading',
    )
    await first.exec('ALTER TABLE selected.readings NOT OF')
    const changed = await readCatalogCompositeTypes(first, ['selected'])
    expect(
      compositeAncestorMapping(
        catalogCompositeType('selected.readings', changed)!,
        type('"Row.Base".reading'),
      ),
    ).toBeNull()
  } finally {
    await first.close()
    await second.close()
  }
}, 60_000)

it('captures selected row casts before inheritance and typed-table conversion with native coercion-context precedence', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA selected;CREATE SCHEMA "Cast.Target";
      CREATE TYPE "Cast.Target".p AS(n int4);CREATE TABLE selected.t OF "Cast.Target".p;
      CREATE TABLE selected.c(extra int4) INHERITS(selected.t);
      CREATE FUNCTION selected.explicit_cast(selected.c) RETURNS selected.t LANGUAGE SQL IMMUTABLE AS 'SELECT ROW(91)::selected.t';
      CREATE CAST(selected.c AS selected.t) WITH FUNCTION selected.explicit_cast(selected.c);
      CREATE FUNCTION selected.implicit_cast(selected.t) RETURNS "Cast.Target".p LANGUAGE SQL IMMUTABLE AS 'SELECT ROW(92)::"Cast.Target".p';
      CREATE CAST(selected.t AS "Cast.Target".p) WITH FUNCTION selected.implicit_cast(selected.t) AS IMPLICIT;
      CREATE TYPE "Cast.Target".unrelated AS(n int4);
      CREATE FUNCTION selected.assignment_cast(selected.c) RETURNS "Cast.Target".unrelated LANGUAGE SQL IMMUTABLE AS 'SELECT ROW(93)::"Cast.Target".unrelated';
      CREATE CAST(selected.c AS "Cast.Target".unrelated) WITH FUNCTION selected.assignment_cast(selected.c) AS ASSIGNMENT;`)
    const g = await readCatalogCompositeTypes(pg, ['selected']),
      type = (id: string) => catalogCompositeType(id, g)!,
      c = type('selected.c'),
      t = type('selected.t'),
      p = type('"Cast.Target".p'),
      u = type('"Cast.Target".unrelated'),
      slice = compositeTypeDependencies(g, ['selected.c'])!
    expect(slice.definitions.find((n) => n.identity === 'selected.c')!.rowCasts).toEqual([
      {
        target: '"Cast.Target".unrelated',
        context: 'a',
        method: 'f',
        function: 'function:["selected","assignment_cast"](selected.c)',
      },
      {
        target: 'selected.t',
        context: 'e',
        method: 'f',
        function: 'function:["selected","explicit_cast"](selected.c)',
      },
    ])
    expect(compositeRowCoercion(c, t, 'e')).toEqual({ kind: 'cast' })
    expect(compositeRowCoercion(c, t, 'a')).toEqual({ kind: 'row', mapping: [0] })
    expect(compositeRowCoercion(c, t, 'i')).toEqual({ kind: 'row', mapping: [0] })
    for (const context of ['i', 'a', 'e'] as const)
      expect(compositeRowCoercion(t, p, context)).toEqual({ kind: 'cast' })
    expect(compositeRowCoercion(c, u, 'i')).toBeNull()
    for (const context of ['a', 'e'] as const)
      expect(compositeRowCoercion(c, u, context)).toEqual({ kind: 'cast' })
    expect(
      (
        await pg.query<{ explicit: number; implicit: number; typed: number }>(
          `SELECT (ROW(1,2)::selected.c::selected.t).n AS explicit,(COALESCE(ROW(1,2)::selected.c,ROW(4)::selected.t)).n AS implicit,(ROW(1)::selected.t::"Cast.Target".p).n AS typed`,
        )
      ).rows[0],
    ).toEqual({ explicit: 91, implicit: 1, typed: 92 })
    await expect(
      pg.exec('CREATE CAST(selected.c AS "Cast.Target".p) WITHOUT FUNCTION'),
    ).rejects.toMatchObject({ code: '42P17' })
    const broken = structuredClone(g)
    broken.definitions = broken.definitions.filter((n) => n.identity !== '"Cast.Target".unrelated')
    expect(compositeTypeDependencies(broken, ['selected.c'])).toBeNull()
    slice.definitions.find((n) => n.identity === 'selected.c')!.rowCasts![0]!.target =
      'missing.type'
    expect(g.definitions.find((n) => n.identity === 'selected.c')!.rowCasts![0]!.target).toBe(
      '"Cast.Target".unrelated',
    )
  } finally {
    await pg.close()
  }
}, 60_000)

it('defers selected function and I/O row casts without replacing them with builtin row conversion', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TABLE p(n int4);CREATE TABLE c(extra int4) INHERITS(p);
      CREATE FUNCTION f(c) RETURNS p LANGUAGE SQL IMMUTABLE AS 'SELECT ROW(99)::p';CREATE CAST(c AS p) WITH FUNCTION f(c);
      CREATE TABLE q(c c,p p,CONSTRAINT explicit CHECK((c::p).n=99),CONSTRAINT implicit CHECK((COALESCE(c,p)).n=1));`)
    const catalog = await snapshotCatalog(pg),
      t = catalog.tables.find((t) => t.name === 'q')!,
      lower = (definition: string, origin: 'source' | 'stored') =>
        lowerTableCheck(
          t,
          { name: 'x', type: 'check', definition },
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression
    for (const origin of ['source', 'stored'] as const)
      expect(uncertain(lower('CHECK((c::p).n=99)', origin))).toBe(true)
    expect(uncertain(lower('CHECK((COALESCE(c,p)).n=1)', 'source'))).toBe(false)
    const stored = t.constraints.find((c) => c.name === 'implicit')!.definition
    expect(stored).toContain('::public.p')
    expect(uncertain(lower(stored, 'stored'))).toBe(true)
    await pg.exec('INSERT INTO q VALUES(ROW(1,2)::c,NULL)')
    await pg.exec('DROP TABLE q;DROP CAST(c AS p);CREATE CAST(c AS p) WITH INOUT')
    const io = await readCatalogCompositeTypes(pg)
    expect(io.definitions.find((n) => n.identity === 'public.c')!.rowCasts).toEqual([
      { target: 'public.p', context: 'e', method: 'i', function: null },
    ])
    expect(
      compositeAncestorMapping(
        catalogCompositeType('public.c', io)!,
        catalogCompositeType('public.p', io)!,
      ),
    ).toBeNull()
    await expect(pg.query('SELECT ROW(1,2)::c::p')).rejects.toMatchObject({ code: '22P02' })
  } finally {
    await pg.close()
  }
}, 60_000)

it('retains native typed-table rejection boundaries for reverse, inherited, domain-target and existing-array conversions', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`${ddl}CREATE DOMAIN selected.approved AS "Row.Base".reading;
      CREATE TABLE selected.boundary(t selected.readings,c selected.child,p "Row.Base".reading,ts selected.readings[],ps "Row.Base".reading[])`)
    const catalog = await snapshotCatalog(pg),
      t = catalog.tables.find((t) => t.name === 'boundary')!
    for (const sql of [
      'p::selected.readings IS NULL',
      'c::"Row.Base".reading IS NULL',
      't::selected.approved IS NULL',
      'ts::"Row.Base".reading[] IS NULL',
      'COALESCE(ts,ps) IS NULL',
      'ARRAY[ARRAY[t],ARRAY[p]] IS NULL',
    ]) {
      await expect(
        pg.exec('ALTER TABLE selected.boundary ADD CHECK(' + sql + ') NOT VALID'),
        sql,
      ).rejects.toMatchObject({ code: '42846' })
      expect(
        uncertain(
          lowerTableCheck(
            t,
            { name: 'invalid', type: 'check', definition: 'CHECK(' + sql + ')' },
            catalog.enums,
            catalog.domains,
            'source',
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        ),
        sql,
      ).toBe(true)
    }
  } finally {
    await pg.close()
  }
}, 60_000)
