import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { catalogRangeType } from '../../../src/sql-semantics/catalog-check-binder.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'
import {
  rangeTypeProfile,
  rangeProfileSupport,
  rangeSubtypeOutput,
} from '../../../src/sql-semantics/range-profiles.js'
import { rangeBoundProfiles } from '../../../src/codegen/shared/check-array-types.js'

it('captures nominal vector dependencies and selected range comparators independently of deployment identifiers', async () => {
  const results = []
  for (const padding of ['', "CREATE TYPE padding AS ENUM('unused');"]) {
    const pg = await PGlite.create()
    try {
      await pg.exec(`${padding}
        CREATE DOMAIN export_types AS oidvector CHECK(cardinality(VALUE)<=3);
        CREATE TYPE position_span AS RANGE(subtype=int2vector);
        CREATE TYPE type_span AS RANGE(subtype=oidvector);
        CREATE TYPE array_type_span AS RANGE(subtype=oidvector,subtype_opclass=pg_catalog.array_ops);
        CREATE TYPE domain_type_span AS RANGE(subtype=export_types);
        CREATE TYPE vector_array_span AS RANGE(subtype=oidvector[]);
        CREATE TYPE nested_span AS RANGE(subtype=type_span);
        CREATE TYPE vector_record AS(positions int2vector,type_ids oidvector);
        CREATE TYPE record_span AS RANGE(subtype=vector_record);`)
      const catalog = await snapshotCatalog(pg)
      const summaries = catalog.rangeTypes
        .filter((r) => r.schema === 'public')
        .map((r) => {
          const type = catalogRangeType(r.identity, undefined, catalog.domains, catalog.rangeTypes)
          expect(type, r.name).not.toBeNull()
          const profile = rangeTypeProfile(type!)!
          const nodes = rangeBoundProfiles(profile)
          expect(nodes, r.name).not.toBeNull()
          if (r.name === 'type_span' || r.name === 'domain_type_span') {
            expect(profile.elementType).toBe('pg_catalog.oidvector')
            expect(rangeProfileSupport(profile)).toEqual({ comparison: 441, canonical: 1 })
            expect(nodes![0]).toMatchObject({
              kind: 41,
              typeName: 'pg_catalog.oidvector',
              comparison: 441,
              elementType: 'pg_catalog.oid',
              child: 1,
            })
          }
          if (r.name === 'array_type_span')
            expect(rangeProfileSupport(profile)).toEqual({ comparison: 41, canonical: 1 })
          if (r.name === 'position_span') expect(profile.elementType).toBe('pg_catalog.int2vector')
          if (['type_span', 'domain_type_span', 'array_type_span'].includes(r.name))
            expect(rangeSubtypeOutput(profile)).toContain('oidvectorout')
          if (r.name === 'record_span')
            expect(
              nodes!.some((n) => n.typeName === 'pg_catalog.oidvector' && n.comparison === 441),
            ).toBe(true)
          return { definition: r, nodes, support: rangeProfileSupport(profile) }
        })
      expect(summaries).toHaveLength(7)
      results.push(summaries)
    } finally {
      await pg.close()
    }
  }
  expect(results[0]).toEqual(results[1])
}, 60_000)

it('admits vector-to-array constructor coercion without erasing nominal vector overload identity', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE ordinary_span AS RANGE(subtype=smallint[]);
      CREATE TYPE vector_span AS RANGE(subtype=int2vector);
      CREATE TABLE vector_to_array(v int2vector,w int2vector,
        CONSTRAINT retains_bounds CHECK(array_lower(lower(ordinary_span(v,w)),1)=0));`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!,
      constraint = table.constraints[0]!
    for (const origin of ['source', 'stored'] as const) {
      const expression = lowerTableCheck(
        table,
        constraint,
        [],
        catalog.domains,
        origin,
        catalog.rangeTypes,
        catalog.compositeTypeGraph,
        origin === 'source' ? 'CHECK(array_lower(lower(ordinary_span(v,w)),1)=0)' : undefined,
      )!.expression
      expect(expression.kind).not.toBe('uncertain')
      const group = prepareCheckRustGroup([
        {
          expression,
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: origin },
        },
      ])
      const check = group.checks[0]!
      expect(check.kind).toBe('supported')
      expect(check.kind === 'supported' && check.inputs.some((i) => i.name === 'v')).toBe(true)
    }
    await pg.exec("INSERT INTO vector_to_array VALUES('1 2','3 4')")
    await expect(
      pg.exec('SELECT vector_span(ARRAY[1::smallint],ARRAY[2::smallint])'),
    ).rejects.toMatchObject({ code: '42883' })
  } finally {
    await pg.close()
  }
})

it('aligns nested source casts through stored variadic packing across later function shadowing', async () => {
  const pg = await PGlite.create()
  const sql =
    "lower(position_set(position_span(int2vector(input_text),'99'::int2vector),'empty'::position_span))::text='1'"
  const uncertain = (node: unknown): boolean =>
    !!node &&
    typeof node === 'object' &&
    (('kind' in node && node.kind === 'uncertain') || Object.values(node).some(uncertain))
  try {
    await pg.exec(`CREATE TYPE position_span AS RANGE(subtype=int2vector,multirange_type_name=position_set);
      CREATE TABLE earlier(input_text text,CONSTRAINT valid CHECK(${sql}));
      CREATE FUNCTION public.int2vector(text) RETURNS int2vector LANGUAGE SQL IMMUTABLE STRICT AS $$ SELECT '9'::int2vector $$;
      CREATE TABLE later(input_text text,CONSTRAINT valid CHECK(${sql}));`)
    const catalog = await snapshotCatalog(pg)
    for (const name of ['earlier', 'later']) {
      const table = catalog.tables.find((t) => t.name === name)!,
        constraint = table.constraints[0]!
      expect(constraint.definition).toContain('VARIADIC ARRAY')
      for (const origin of ['source', 'stored'] as const) {
        const expression = lowerTableCheck(
          table,
          constraint,
          [],
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${sql})` : undefined,
        )!.expression
        expect(uncertain(expression), name + '/' + origin).toBe(name === 'later')
      }
    }
    await pg.exec("INSERT INTO earlier VALUES('1')")
    await expect(pg.exec("INSERT INTO later VALUES('1')")).rejects.toMatchObject({ code: '23514' })
  } finally {
    await pg.close()
  }
})
