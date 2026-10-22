import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../../src/catalog/diff.js'
import { captureRowCoercionContext } from '../../../src/catalog/coercion-context.js'
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

it('captures native row conversion choices across cast replacement and shifted catalogs without OIDs', async () => {
  const contexts: unknown[] = [],
    sources: string[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec(`CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)`)
      await pg.exec(`CREATE SCHEMA "Coerce.Types";CREATE TABLE "Coerce.Types".parent(n int4);CREATE TABLE "Coerce.Types".child(extra int4) INHERITS("Coerce.Types".parent);
        CREATE TABLE before_cast(c "Coerce.Types".child,CONSTRAINT valid CHECK((c::"Coerce.Types".parent).n=1));
        CREATE CAST("Coerce.Types".child AS "Coerce.Types".parent) WITH INOUT AS IMPLICIT;
        CREATE TABLE after_cast(c "Coerce.Types".child,CONSTRAINT valid CHECK((c::"Coerce.Types".parent).n=1));
        CREATE TYPE "Coerce.Types".a AS(n int4);CREATE TYPE "Coerce.Types".b AS(n int4);
        CREATE FUNCTION "Coerce.Types".f("Coerce.Types".a) RETURNS "Coerce.Types".b LANGUAGE SQL IMMUTABLE AS 'SELECT ROW(99)::"Coerce.Types".b';
        CREATE CAST("Coerce.Types".a AS "Coerce.Types".b) WITH FUNCTION "Coerce.Types".f("Coerce.Types".a);
        CREATE TABLE before_function(c "Coerce.Types".a,CONSTRAINT valid CHECK((c::"Coerce.Types".b).n=99));
        DROP CAST("Coerce.Types".a AS "Coerce.Types".b);CREATE CAST("Coerce.Types".a AS "Coerce.Types".b) WITH INOUT;
        CREATE TABLE after_function(c "Coerce.Types".a,CONSTRAINT valid CHECK((c::"Coerce.Types".b).n=99));`)
      if (shifted) await pg.exec('SET quote_all_identifiers=on;SET search_path=pg_catalog')
      const c = await snapshotCatalog(pg),
        names = ['before_cast', 'after_cast', 'before_function', 'after_function'],
        tables = names.map((name) => c.tables.find((t) => t.name === name)!),
        constraints = tables.map((t) => t.constraints[0]!),
        plans = tables.map((t, i) => ({
          identity: {
            schema: t.schema,
            kind: 'table' as const,
            owner: t.name,
            constraint: 'valid',
          },
          expression: lowerTableCheck(
            t,
            constraints[i]!,
            c.enums,
            c.domains,
            'stored',
            c.rangeTypes,
            c.compositeTypeGraph,
          )!.expression,
        }))
      expect(constraints[0]!.definition).toBe(constraints[1]!.definition)
      expect(constraints[2]!.definition).toBe(constraints[3]!.definition)
      expect(constraints.map((c) => c.rowCoercionContext?.casts[0]?.kind)).toEqual([
        'row',
        'io',
        'function',
        'io',
      ])
      expect(constraints.every((c) => c.rowCoercionContext?.complete)).toBe(true)
      expect(plans.map((p) => uncertain(p.expression))).toEqual([false, false, true, false])
      const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
      expect(typeof group.evaluatorSource).toBe('string')
      sources.push(group.evaluatorSource!)
      contexts.push(
        constraints.map((c) => ({
          complete: c.rowCoercionContext!.complete,
          casts: c.rowCoercionContext!.casts,
        })),
      )
      ids.push(
        (await pg.query<{ oid: number }>(`SELECT '"Coerce.Types".child'::regtype::oid AS oid`))
          .rows[0]!.oid,
      )
      expect(JSON.stringify(contexts.at(-1))).not.toMatch(/"\w*oid\w*":/iu)
      await pg.exec(
        `INSERT INTO public.before_cast VALUES(ROW(1,2)::"Coerce.Types".child);INSERT INTO public.before_function VALUES(ROW(1)::"Coerce.Types".a)`,
      )
      await expect(
        pg.exec(`INSERT INTO public.after_cast VALUES(ROW(1,2)::"Coerce.Types".child)`),
      ).rejects.toMatchObject({ code: '22P02' })
      await expect(
        pg.exec(`INSERT INTO public.after_function VALUES(ROW(1)::"Coerce.Types".a)`),
      ).rejects.toMatchObject({ code: '23514' })
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
  expect(sources[0]).toBe(sources[1])
}, 60_000)

it('preserves array coercion depth and explicit source/stored evidence requirements', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE s AS(code text);CREATE TYPE t AS(n int4);CREATE CAST(s AS t) WITH INOUT AS IMPLICIT;
      CREATE DOMAIN sd AS s;CREATE DOMAIN td AS t;CREATE DOMAIN ss AS s[];CREATE DOMAIN ts AS t[];
      CREATE TABLE q(s s,t t,ss ss,ts ts,CONSTRAINT scalar CHECK((s::t).n>0),CONSTRAINT batch CHECK(cardinality(ss::t[])=1),CONSTRAINT composed CHECK(cardinality(COALESCE(ss,ts))=1));`)
    const c = await snapshotCatalog(pg),
      q = c.tables.find((t) => t.name === 'q')!,
      constraint = q.constraints.find((c) => c.name === 'scalar')!
    expect(
      q.constraints.map((c) => ({ name: c.name, depth: c.rowCoercionContext!.casts[0]!.depth })),
    ).toEqual([
      { name: 'batch', depth: 1 },
      { name: 'composed', depth: 1 },
      { name: 'scalar', depth: 0 },
    ])
    for (const check of q.constraints)
      expect(
        uncertain(
          lowerTableCheck(
            q,
            check,
            c.enums,
            c.domains,
            'stored',
            c.rangeTypes,
            c.compositeTypeGraph,
          )!.expression,
        ),
      ).toBe(false)
    const missing = { ...constraint }
    delete missing.rowCoercionContext
    expect(
      uncertain(
        lowerTableCheck(
          q,
          missing,
          c.enums,
          c.domains,
          'stored',
          c.rangeTypes,
          c.compositeTypeGraph,
        )!.expression,
      ),
    ).toBe(true)
    expect(
      uncertain(
        lowerTableCheck(
          q,
          missing,
          c.enums,
          c.domains,
          'source',
          c.rangeTypes,
          c.compositeTypeGraph,
        )!.expression,
      ),
    ).toBe(false)
    for (const context of [
      { ...constraint.rowCoercionContext!, complete: false },
      { ...constraint.rowCoercionContext!, definition: 'CHECK(false)' },
    ])
      expect(
        uncertain(
          lowerTableCheck(
            q,
            { ...constraint, rowCoercionContext: context },
            c.enums,
            c.domains,
            'stored',
            c.rangeTypes,
            c.compositeTypeGraph,
          )!.expression,
        ),
      ).toBe(true)
  } finally {
    await pg.close()
  }
}, 60_000)

it('aligns multiple stored conversion choices for the same row pair to their expression sites', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TABLE p(n int4);CREATE TABLE c(extra int4) INHERITS(p);CREATE CAST(c AS p) WITH INOUT;
      CREATE TABLE q(c c,p p,bypass bool,CONSTRAINT mixed CHECK(CASE WHEN bypass THEN true ELSE (c::p).n=1 OR (COALESCE(c,p)).n=1 END));`)
    const catalog = await snapshotCatalog(pg),
      t = catalog.tables.find((t) => t.name === 'q')!,
      constraint = t.constraints[0]!
    expect(constraint.rowCoercionContext!.casts.map((c) => c.kind)).toEqual(['io', 'row'])
    const legacy = {
      ...constraint,
      rowCoercionContext: {
        ...constraint.rowCoercionContext!,
        casts: constraint.rowCoercionContext!.casts.map(({ site: _site, ...cast }) => cast),
      },
    }
    expect(
      uncertain(
        lowerTableCheck(
          t,
          legacy,
          catalog.enums,
          catalog.domains,
          'stored',
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
      ),
    ).toBe(true)
    for (const origin of ['source', 'stored'] as const)
      expect(
        uncertain(
          lowerTableCheck(
            t,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? 'CHECK(CASE WHEN bypass THEN true ELSE (c::p).n=1 OR (COALESCE(c,p)).n=1 END)'
              : undefined,
          )!.expression,
        ),
      ).toBe(false)
    await pg.exec('INSERT INTO q VALUES(ROW(1,2)::c,NULL,true)')
    await expect(pg.exec('INSERT INTO q VALUES(ROW(1,2)::c,NULL,false)')).rejects.toMatchObject({
      code: '22P02',
    })
  } finally {
    await pg.close()
  }
}, 60_000)

it('marks malformed or untyped native coercion trees incomplete without retaining catalog numbers', () => {
  const identities = new Map([
    [1, { identity: 'public.s', depth: 0 }],
    [2, { identity: 'public.t', depth: 0 }],
  ])
  expect(
    captureRowCoercionContext(
      '{COERCEVIAIO :arg {VAR :vartype 1} :resulttype 2 :coerceformat 1}',
      'CHECK(true)',
      identities,
    ),
  ).toEqual({
    definition: 'CHECK(true)',
    complete: true,
    casts: [{ source: 'public.s', target: 'public.t', depth: 0, kind: 'io', site: '' }],
  })
  expect(
    captureRowCoercionContext(
      '{COERCEVIAIO :arg {MISSING} :resulttype 2}',
      'CHECK(true)',
      identities,
    )?.complete,
  ).toBe(false)
  expect(
    captureRowCoercionContext('{COERCEVIAIO :arg {VAR :vartype 1}', 'CHECK(true)', identities)
      ?.complete,
  ).toBe(false)
})

it('reports a native row conversion change when a replacement CHECK prints the same SQL', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      `CREATE TABLE p(n int4);CREATE TABLE c(extra int4) INHERITS(p);CREATE TABLE changing(c c,CONSTRAINT valid CHECK((c::p).n=1))`,
    )
    const before = await snapshotCatalog(pg)
    await pg.exec(
      `CREATE CAST(c AS p) WITH INOUT;ALTER TABLE changing DROP CONSTRAINT valid;ALTER TABLE changing ADD CONSTRAINT valid CHECK((c::p).n=1)`,
    )
    const after = await snapshotCatalog(pg),
      old = before.tables.find((t) => t.name === 'changing')!.constraints[0]!,
      fresh = after.tables.find((t) => t.name === 'changing')!.constraints[0]!
    expect(old.definition).toBe(fresh.definition)
    expect(old.rowCoercionContext!.casts[0]!.kind).toBe('row')
    expect(fresh.rowCoercionContext!.casts[0]!.kind).toBe('io')
    expect(diffCatalogs(before, after).modified.map((m) => m.entityId)).toContain('public.changing')
  } finally {
    await pg.close()
  }
}, 60_000)

it('defers stored row constructors whose dropped expressions disappeared from SQL but still affect native row NULL tests', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      `CREATE TYPE pair AS(a int4,b int4);CREATE TABLE changing(n int4,CONSTRAINT valid CHECK((ROW(n,1/n)::pair) IS NOT NULL));ALTER TYPE pair DROP ATTRIBUTE b`,
    )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'changing')!,
      constraint = t.constraints[0]!
    expect(constraint.definition).not.toContain('/')
    expect(constraint.rowCoercionContext?.complete).toBe(false)
    expect(
      uncertain(
        lowerTableCheck(
          t,
          constraint,
          c.enums,
          c.domains,
          'stored',
          c.rangeTypes,
          c.compositeTypeGraph,
        )!.expression,
      ),
    ).toBe(true)
    await expect(pg.exec('INSERT INTO changing VALUES(0)')).rejects.toMatchObject({ code: '22012' })
    await pg.exec('INSERT INTO changing VALUES(1)')
  } finally {
    await pg.close()
  }
}, 60_000)
