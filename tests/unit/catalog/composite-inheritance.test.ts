import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readCatalogCompositeTypes } from '../../../src/postgres/composite-types.js'
import { compositeTypeDependencies } from '../../../src/catalog/composite-dependencies.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import {
  catalogCompositeType,
  compositeAncestorMapping,
  compositeProfile,
} from '../../../src/sql-semantics/composite-profiles.js'

const ddl = `CREATE SCHEMA "Base.Types";CREATE SCHEMA selected;
CREATE TYPE "Base.Types".phase AS ENUM('z','a');
CREATE TABLE "Base.Types"."Ancestor.Name"(n int4,discard int4,label text COLLATE "C",phase "Base.Types".phase,tags int4[]);
ALTER TABLE "Base.Types"."Ancestor.Name" DROP COLUMN discard;
CREATE TABLE "Base.Types".other(flag bool,n int4);
CREATE TABLE selected.child(local int4,label text COLLATE "C",tags int4[],n int4,phase "Base.Types".phase,flag bool);
ALTER TABLE selected.child INHERIT "Base.Types"."Ancestor.Name";
ALTER TABLE selected.child INHERIT "Base.Types".other;
CREATE TABLE selected.leaf(extra int4) INHERITS(selected.child);
CREATE TABLE "Base.Types".unrelated(n int4,label text COLLATE "C",phase "Base.Types".phase,tags int4[]);`

it('captures ordered qualified ancestor dependencies across schema filters and maps live fields by name without OIDs', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  try {
    await first.exec(ddl)
    await second.exec(
      `CREATE TYPE padding AS ENUM('x');${ddl}SET quote_all_identifiers=on;SET search_path=pg_catalog`,
    )
    const a = await readCatalogCompositeTypes(first, ['selected']),
      b = await readCatalogCompositeTypes(second, ['selected']),
      slice = compositeTypeDependencies(a, ['selected.leaf'])!,
      types = (name: string) => catalogCompositeType(name, a)!
    expect(a).toEqual(b)
    expect(slice).not.toBeNull()
    expect(slice.definitions.find((n) => n.identity === 'selected.child')!.parents).toEqual([
      '"Base.Types"."Ancestor.Name"',
      '"Base.Types".other',
    ])
    expect(slice.definitions.find((n) => n.identity === 'selected.leaf')!.parents).toEqual([
      'selected.child',
    ])
    expect(slice.definitions.some((n) => n.identity === '"Base.Types".unrelated')).toBe(false)
    expect(
      compositeAncestorMapping(types('selected.child'), types('"Base.Types"."Ancestor.Name"')),
    ).toEqual([3, 1, 4, 2])
    expect(
      compositeAncestorMapping(types('selected.leaf'), types('"Base.Types"."Ancestor.Name"')),
    ).toEqual([3, 1, 4, 2])
    expect(compositeAncestorMapping(types('selected.leaf'), types('"Base.Types".other'))).toEqual([
      5, 3,
    ])
    expect(
      compositeAncestorMapping(types('"Base.Types"."Ancestor.Name"'), types('selected.child')),
    ).toBeNull()
    expect(
      compositeProfile(types('selected.leaf'))!.graph.definitions.map((n) => n.identity),
    ).toContain('"Base.Types".other')
    expect(JSON.stringify(a)).not.toMatch(/"\w*oid\w*":/iu)
    const before = (
        await first.query<{ oid: number }>(`SELECT 'selected.leaf'::regtype::oid AS oid`)
      ).rows[0]!.oid,
      after = (await second.query<{ oid: number }>(`SELECT 'selected.leaf'::regtype::oid AS oid`))
        .rows[0]!.oid
    expect(before).not.toBe(after)
    slice.definitions.find((n) => n.identity === 'selected.child')!.parents!.pop()
    expect(a.definitions.find((n) => n.identity === 'selected.child')!.parents).toHaveLength(2)
    const broken = structuredClone(a)
    broken.definitions = broken.definitions.filter((n) => n.identity !== '"Base.Types".other')
    expect(compositeTypeDependencies(broken, ['selected.leaf'])).toBeNull()
    expect(catalogCompositeType('selected.leaf', broken)).toBeNull()
    await first.exec('ALTER TABLE selected.child NO INHERIT "Base.Types"."Ancestor.Name"')
    const changed = await readCatalogCompositeTypes(first, ['selected'])
    expect(
      compositeAncestorMapping(
        catalogCompositeType('selected.leaf', changed)!,
        types('"Base.Types"."Ancestor.Name"'),
      ),
    ).toBeNull()
  } finally {
    await first.close()
    await second.close()
  }
}, 60_000)

it('rejects structural, reverse and direct ancestor-domain cast guesses while admitting explicit ancestor then domain coercion', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`${ddl}CREATE DOMAIN selected.approved AS "Base.Types"."Ancestor.Name" CHECK((VALUE).n>=0);
      CREATE TABLE selected.holder(c selected.child,p "Base.Types"."Ancestor.Name");`)
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'holder')!,
      uncertain = (x: unknown): boolean =>
        !!x &&
        typeof x === 'object' &&
        (('kind' in x && x.kind === 'uncertain') ||
          Object.entries(x).some(
            ([key, value]) =>
              key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
          ))
    for (const sql of [
      'c::selected.approved IS NULL',
      'p::selected.child IS NULL',
      'c::"Base.Types".unrelated IS NULL',
    ]) {
      await expect(
        pg.exec('ALTER TABLE selected.holder ADD CHECK(' + sql + ') NOT VALID'),
      ).rejects.toMatchObject({ code: '42846' })
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
    await pg.exec(
      'ALTER TABLE selected.holder ADD CONSTRAINT valid CHECK(((c::"Base.Types"."Ancestor.Name")::selected.approved).n>=0) NOT VALID',
    )
    const fresh = await snapshotCatalog(pg),
      table = fresh.tables.find((t) => t.name === 'holder')!,
      plan = lowerTableCheck(
        table,
        table.constraints[0]!,
        fresh.enums,
        fresh.domains,
        'stored',
        fresh.rangeTypes,
        fresh.compositeTypeGraph,
      )!
    expect(uncertain(plan.expression)).toBe(false)
  } finally {
    await pg.close()
  }
}, 60_000)
