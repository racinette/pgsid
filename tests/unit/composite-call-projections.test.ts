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

it('requires native field binding evidence and rejects decorated or qualified projection guesses', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE TYPE pair AS(n int4,to_jsonb text);CREATE TABLE q(p pair,CONSTRAINT valid CHECK(n(p)>=0));',
    )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'q')!,
      constraint = t.constraints[0]!,
      lower = (sql: string, witness: boolean) =>
        lowerTableCheck(
          t,
          witness ? constraint : { ...constraint, definition: sql },
          c.enums,
          c.domains,
          'source',
          c.rangeTypes,
          c.compositeTypeGraph,
          witness ? sql : undefined,
        )!.expression
    expect(uncertain(lower('CHECK(n(p)>=0)', true))).toBe(false)
    expect(uncertain(lower('CHECK(n(p)>=0)', false))).toBe(true)
    expect(uncertain(lower('CHECK(to_jsonb(p) IS NULL)', false))).toBe(true)
    expect(uncertain(lower('CHECK(to_jsonb(p) IS NULL)', true))).toBe(true)
    for (const sql of [
      'public.n(p)>=0',
      'pg_catalog.text(p) IS NULL',
      'n(p=>p)>=0',
      'n(DISTINCT p)>=0',
      'n(p ORDER BY p)>=0',
      'n(p) FILTER(WHERE true)>=0',
      'n(p) OVER()>=0',
    ]) {
      await expect(
        pg.exec('ALTER TABLE q ADD CHECK(' + sql + ') NOT VALID'),
      ).rejects.toHaveProperty('code')
      expect(uncertain(lower('CHECK(' + sql + ')', false)), sql).toBe(true)
    }
    expect(uncertain(lower('CHECK(n(DISTINCT p)>=0)', true))).toBe(true)
    expect(uncertain(lower('CHECK(n(p) OVER()>=0)', true))).toBe(true)
    expect(uncertain(lower('CHECK(', true))).toBe(true)
  } finally {
    await pg.close()
  }
}, 60_000)

it('keeps quoted field identities and generated evaluators independent of deployment OIDs', async () => {
  const sources: string[] = [],
    oids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('one','two');CREATE TABLE padding_row(n int4)")
      await pg.exec(`CREATE SCHEMA "Odd.Schema";SET search_path="Odd.Schema",public;
        CREATE TYPE "Pair.Name" AS("N.Name" int4,"Label.Name" text COLLATE "C");
        CREATE TABLE "Rows.Name"(p "Pair.Name",CONSTRAINT valid CHECK("N.Name"(p)>=0));`)
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.name === 'Rows.Name')!,
        plan = lowerTableCheck(
          t,
          t.constraints[0]!,
          c.enums,
          c.domains,
          'source',
          c.rangeTypes,
          c.compositeTypeGraph,
          'CHECK("N.Name"(p)>=0)',
        )!
      expect(uncertain(plan.expression)).toBe(false)
      const group = prepareCheckRustGroup([
        {
          identity: { schema: t.schema, kind: 'table', owner: t.name, constraint: 'valid' },
          expression: plan.expression,
        },
      ])
      expect(group.checks[0]!.kind).toBe('supported')
      expect(typeof group.evaluatorSource).toBe('string')
      sources.push(group.evaluatorSource!)
      oids.push(
        (await pg.query<{ oid: number }>(`SELECT '"Odd.Schema"."Pair.Name"'::regtype::oid AS oid`))
          .rows[0]!.oid,
      )
    } finally {
      await pg.close()
    }
  }
  expect(oids[0]).not.toBe(oids[1])
  expect(sources[0]).toBe(sources[1])
}, 60_000)
