import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('retains native array-value and unrelated-row rejection boundaries after scalar inheritance resolution', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TABLE parent(n int4,label text);CREATE TABLE child(extra int4) INHERITS(parent);
      CREATE TABLE sibling(other int4) INHERITS(parent);CREATE DOMAIN pd AS parent;CREATE DOMAIN cd AS child;
      CREATE TABLE q(c child,p parent,s sibling,cs child[],ps parent[],ds cd[],pick bool)`)
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'q')!
    for (const [sql, code] of [
      ['cs::parent[] IS NULL', '42846'],
      ['NULL::child[]::parent[] IS NULL', '42846'],
      ['cs::pd[] IS NULL', '42846'],
      ['ds::parent[] IS NULL', '42846'],
      ['(CASE WHEN pick THEN cs ELSE ps END) IS NULL', '42846'],
      ['COALESCE(cs,ps) IS NULL', '42846'],
      ['GREATEST(cs,ps) IS NULL', '42846'],
      ['array_cat(cs,ps) IS NULL', 'XX000'],
      ['cs=ps', '42883'],
      ['(CASE WHEN pick THEN c ELSE s END) IS NULL', '42846'],
      ['ARRAY[CASE WHEN pick THEN c ELSE s END]::parent[] IS NULL', '42846'],
      ['c::pd IS NULL', '42846'],
      ['ARRAY[c]::pd[] IS NULL', '42846'],
    ]) {
      await expect(
        pg.exec('ALTER TABLE q ADD CHECK(' + sql + ') NOT VALID'),
        sql,
      ).rejects.toMatchObject({ code })
      const plan = lowerTableCheck(
        t,
        { name: 'invalid', type: 'check', definition: 'CHECK(' + sql + ')' },
        c.enums,
        c.domains,
        'source',
        c.rangeTypes,
        c.compositeTypeGraph,
      )!
      expect(uncertain(plan.expression), sql).toBe(true)
    }
  } finally {
    await pg.close()
  }
}, 60_000)

it('defers a native custom compatible-array overload instead of substituting the builtin implementation', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TABLE parent(n int4);CREATE TABLE child(extra int4) INHERITS(parent);
      CREATE FUNCTION public.array_append(parent[],child) RETURNS parent[] LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT NULL::parent[]';
      CREATE TABLE q(ps parent[],c child,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE array_append(ps,c) IS NULL END));`)
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'q')!,
      constraint = t.constraints[0]!
    expect(constraint.definition).toContain('public.array_append')
    for (const origin of ['source', 'stored'] as const) {
      const plan = lowerTableCheck(
        t,
        constraint,
        c.enums,
        c.domains,
        origin,
        c.rangeTypes,
        c.compositeTypeGraph,
        origin === 'source'
          ? 'CHECK(CASE WHEN bypass THEN true ELSE array_append(ps,c) IS NULL END)'
          : undefined,
      )!
      expect(uncertain(plan.expression), origin).toBe(true)
    }
    expect(
      (
        await pg.query<{ value: boolean }>(
          `SELECT public.array_append(ARRAY[ROW(1)::parent],ROW(1,2)::child) IS NULL AS value`,
        )
      ).rows[0]!.value,
    ).toBe(true)
    await pg.exec('INSERT INTO q VALUES(ARRAY[ROW(1)::parent],ROW(1,2)::child,false)')
  } finally {
    await pg.close()
  }
}, 60_000)

it('selects captured common row identities across catalog allocation changes and defers absent ancestry', async () => {
  const sources: string[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      await pg.exec(`CREATE SCHEMA "Row.Types";
        CREATE TABLE "Row.Types".parent(n int4,label text COLLATE "C");
        CREATE TABLE "Row.Types".child(extra int4,label text COLLATE "C",n int4);
        ALTER TABLE "Row.Types".child INHERIT "Row.Types".parent;
        CREATE TABLE q(c "Row.Types".child,p "Row.Types".parent,ps "Row.Types".parent[],pick bool,
          CONSTRAINT selected CHECK((CASE WHEN pick THEN c ELSE p END).n>=0),
          CONSTRAINT combined CHECK(cardinality(ARRAY[c,p])=2),
          CONSTRAINT appended CHECK(array_append(ps,c) IS NOT NULL));`)
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.name === 'q')!,
        plans = t.constraints.map((constraint) => ({
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
        group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
      for (const plan of plans) expect(uncertain(plan.expression)).toBe(false)
      for (const check of group.checks) expect(check.kind).toBe('supported')
      expect(typeof group.evaluatorSource).toBe('string')
      sources.push(group.evaluatorSource!)
      ids.push(
        (await pg.query<{ oid: number }>(`SELECT '"Row.Types".child'::regtype::oid AS oid`))
          .rows[0]!.oid,
      )
      const graph = structuredClone(c.compositeTypeGraph!)
      graph.definitions.find((n) => n.identity === '"Row.Types".child')!.parents = []
      const missing = lowerTableCheck(
        t,
        {
          name: 'missing',
          type: 'check',
          definition: 'CHECK((CASE WHEN pick THEN c ELSE p END).n>=0)',
        },
        c.enums,
        c.domains,
        'source',
        c.rangeTypes,
        graph,
      )!
      expect(uncertain(missing.expression)).toBe(true)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(sources[0]).toBe(sources[1])
}, 60_000)
