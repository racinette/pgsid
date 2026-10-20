import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readCatalogRangeTypes } from '../../../src/postgres/range-types.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../../scripts/check-measurements/probes.js'
import {
  resolveRangeCall,
  type RangeCallArgument,
} from '../../../src/sql-semantics/range-callables.js'

const int4 = 'pg_catalog.int4',
  text = 'pg_catalog.text',
  typed = (type: string, base = type): RangeCallArgument => ({ type, base }),
  unknown: RangeCallArgument = { type: null, base: null }

it('matches native exact, preferred, named, default, variadic and type-name call precedence from captured facts', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA resolve;
      CREATE TYPE resolve.span AS RANGE(subtype=int4);
      CREATE FUNCTION resolve.span(float8,float8) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'float rival'::text$$;
      CREATE TYPE resolve.import_span AS RANGE(subtype=int4,multirange_type_name=import_set);
      CREATE FUNCTION resolve.import_span(payload text,extra int DEFAULT 7) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'text rival'::text$$;
      CREATE FUNCTION resolve.import_span(VARIADIC items bigint[]) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'variadic rival'::text$$;
      CREATE TYPE resolve.default_span AS RANGE(subtype=int4);
      CREATE FUNCTION resolve.default_span(int4,int4,bool DEFAULT false) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'default rival'::text$$;
      CREATE TYPE resolve.variadic_span AS RANGE(subtype=int4);
      CREATE FUNCTION resolve.variadic_span(VARIADIC int4[]) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'variadic rival'::text$$;
      CREATE TYPE resolve.cross_span AS RANGE(subtype=int4);
      CREATE FUNCTION resolve.cross_span(text,int4) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'left text'::text$$;
      CREATE FUNCTION resolve.cross_span(int4,text) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'right text'::text$$;
      CREATE TYPE resolve.named_span AS RANGE(subtype=int4);
      CREATE OR REPLACE FUNCTION resolve.named_span(lo int4,hi int4) RETURNS resolve.named_span AS 'range_constructor2' LANGUAGE internal IMMUTABLE;
      CREATE DOMAIN resolve.small AS int2 CHECK(VALUE>0);
      CREATE DOMAIN resolve.saved AS resolve.import_span;`)
    const profiles = await readCatalogRangeTypes(pg, ['resolve'])
    const select = (
      name: string,
      args: readonly RangeCallArgument[],
      explicitVariadic = false,
      schema = 'resolve',
    ) => {
      const p = profiles.find((p) => p.name === (name === 'import_set' ? 'import_span' : name))!
      return resolveRangeCall(
        p.callables!.filter((c) => c.schema === schema && c.name === name),
        args,
        explicitVariadic,
        name === 'import_span' || (name === 'import_set' && schema === 'public')
          ? { type: `${schema}.${name}`, base: `${schema}.${name}` }
          : null,
        p.callResolution,
      )
    }
    const native = async (call: string, value: string) =>
      expect((await pg.query(`SELECT (${call})::text AS value`)).rows).toEqual([{ value }])
    await native('resolve.span(1,3)', '[1,3)')
    expect(select('span', [typed(int4), typed(int4)])).toMatchObject({
      kind: 'call',
      callable: { implementation: 'range_constructor2' },
    })
    await native('resolve.span(1::int2,3::int2)', 'float rival')
    expect(select('span', [typed('pg_catalog.int2'), typed('pg_catalog.int2')])).toMatchObject({
      kind: 'call',
      callable: { args: ['pg_catalog.float8', 'pg_catalog.float8'], implementation: null },
    })
    await native('resolve.span(1::resolve.small,3::resolve.small)', 'float rival')
    expect(
      select('span', [
        typed('resolve.small', 'pg_catalog.int2'),
        typed('resolve.small', 'pg_catalog.int2'),
      ]),
    ).toMatchObject({
      kind: 'call',
      callable: { args: ['pg_catalog.float8', 'pg_catalog.float8'] },
    })
    await native("resolve.import_span('[1,3)')", '[1,3)')
    expect(select('import_span', [unknown])).toEqual({ kind: 'cast' })
    await native("resolve.import_span('[1,3)'::text)", 'text rival')
    expect(select('import_span', [typed(text)])).toMatchObject({
      kind: 'call',
      callable: { args: [text, int4], numArgDefaults: 1 },
      order: [0, -1],
    })
    await native("resolve.import_span('[1,3)'::varchar)", '[1,3)')
    expect(select('import_span', [typed('pg_catalog."varchar"')])).toEqual({ kind: 'cast' })
    await native('resolve.import_span(1::int8,3::int8)', 'variadic rival')
    expect(
      select('import_span', [typed('pg_catalog.int8'), typed('pg_catalog.int8')]),
    ).toMatchObject({
      kind: 'call',
      callable: { variadic: 'pg_catalog.int8' },
      expanded: true,
    })
    await native('resolve.import_span(VARIADIC ARRAY[1::int8,3::int8])', 'variadic rival')
    expect(select('import_span', [typed('array:pg_catalog.int8')], true)).toMatchObject({
      kind: 'call',
      callable: { variadic: 'pg_catalog.int8' },
      expanded: false,
    })
    await expect(pg.exec('SELECT resolve.default_span(1,3)')).rejects.toMatchObject({
      code: '42725',
    })
    expect(select('default_span', [typed(int4), typed(int4)])).toEqual({ kind: 'unresolved' })
    await native('resolve.variadic_span(1,3)', '[1,3)')
    expect(select('variadic_span', [typed(int4), typed(int4)])).toMatchObject({
      kind: 'call',
      callable: { implementation: 'range_constructor2' },
      expanded: false,
    })
    await native('resolve.variadic_span(1,3,5)', 'variadic rival')
    expect(select('variadic_span', [typed(int4), typed(int4), typed(int4)])).toMatchObject({
      kind: 'call',
      callable: { variadic: int4 },
      expanded: true,
    })
    await expect(pg.exec("SELECT resolve.cross_span('1','3')")).rejects.toMatchObject({
      code: '42725',
    })
    expect(select('cross_span', [unknown, unknown])).toEqual({ kind: 'unresolved' })
    await native('resolve.named_span(hi=>3,lo=>1)', '[1,3)')
    expect(
      select('named_span', [
        { ...typed(int4), name: 'hi' },
        { ...typed(int4), name: 'lo' },
      ]),
    ).toMatchObject({
      kind: 'call',
      callable: { implementation: 'range_constructor2' },
      order: [1, 0],
    })
    await expect(pg.exec('SELECT public.import_set()')).rejects.toMatchObject({ code: '42883' })
    expect(select('import_set', [], false, 'public')).toEqual({ kind: 'unresolved' })
    await native("public.import_set('{[1,3)}')", '{[1,3)}')
    expect(select('import_set', [unknown], false, 'public')).toEqual({ kind: 'cast' })
    expect(profiles[0]!.callResolution!.types).toContainEqual({
      identity: 'resolve.small',
      base: 'pg_catalog.int2',
      element: null,
      category: 'N',
      preferred: false,
    })
    expect(profiles[0]!.callResolution!.types).toContainEqual({
      identity: 'resolve.saved',
      base: 'resolve.import_span',
      element: null,
      category: 'R',
      preferred: false,
    })
  } finally {
    await pg.close()
  }
}, 30_000)

it('binds selected implementations and type calls while deferring selected user overloads and missing resolution context', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA binding;
      CREATE TYPE binding.span AS RANGE(subtype=int4);
      CREATE FUNCTION binding.span(text) RETURNS binding.span LANGUAGE sql IMMUTABLE AS $$SELECT 'empty'::binding.span$$;
      CREATE TABLE binding.host(lo int4,hi int4,payload text,
        CONSTRAINT constructed CHECK(isempty(binding.span(lo,hi))),
        CONSTRAINT rival CHECK(isempty(binding.span(payload))),
        CONSTRAINT imported CHECK(isempty(binding.span('empty'))));`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.schema === 'binding' && t.name === 'host')!
    const sql = {
      constructed: 'isempty(binding.span(lo,hi))',
      rival: 'isempty(binding.span(payload))',
      imported: "isempty(binding.span('empty'))",
    }
    for (const origin of ['source', 'stored'] as const)
      for (const constraint of table.constraints) {
        const lower = (profiles = catalog.rangeTypes) =>
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...constraint, definition: `CHECK(${sql[constraint.name as keyof typeof sql]})` }
              : constraint,
            catalog.enums,
            catalog.domains,
            origin,
            profiles,
          )!.expression
        expect(hasUncertain(lower()), origin + '/' + constraint.name).toBe(
          constraint.name === 'rival',
        )
        expect(
          hasUncertain(
            lower(
              catalog.rangeTypes.map(
                ({ callables: _callables, callResolution: _resolution, ...p }) => p,
              ),
            ),
          ),
        ).toBe(!(origin === 'stored' && constraint.name === 'imported'))
        if (origin === 'stored' && constraint.name === 'imported')
          expect(constraint.definition).toContain("'empty'::binding.span")
      }
    expect(
      (
        await pg.query(
          "SELECT binding.span('[1,3)'::text)::text AS typed,binding.span('[1,3)')::text AS untyped",
        )
      ).rows,
    ).toEqual([{ typed: 'empty', untyped: '[1,3)' }])
    await pg.exec("INSERT INTO binding.host VALUES(1,1,'anything')")
    await expect(pg.exec("INSERT INTO binding.host VALUES(1,3,'anything')")).rejects.toMatchObject({
      code: '23514',
    })
  } finally {
    await pg.close()
  }
}, 30_000)

it('uses user implicit cast eligibility without following explicit casts or chaining conversion functions', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA eligibility;
      CREATE TYPE eligibility.span AS RANGE(subtype=int4);
      CREATE TYPE eligibility.label AS ENUM('one','two');
      CREATE TYPE eligibility.bridge AS ENUM('one','two');
      CREATE FUNCTION eligibility.span(eligibility.label,eligibility.label) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'label rival'::text$$;
      CREATE FUNCTION eligibility.to_label(int2) RETURNS eligibility.label LANGUAGE sql IMMUTABLE AS $$SELECT 'one'::eligibility.label$$;
      CREATE FUNCTION eligibility.to_bridge(int2) RETURNS eligibility.bridge LANGUAGE sql IMMUTABLE AS $$SELECT 'one'::eligibility.bridge$$;
      CREATE FUNCTION eligibility.from_bridge(eligibility.bridge) RETURNS eligibility.label LANGUAGE sql IMMUTABLE AS $$SELECT 'one'::eligibility.label$$;
      CREATE CAST(int2 AS eligibility.bridge) WITH FUNCTION eligibility.to_bridge(int2) AS IMPLICIT;
      CREATE CAST(eligibility.bridge AS eligibility.label) WITH FUNCTION eligibility.from_bridge(eligibility.bridge) AS IMPLICIT;
      CREATE CAST(int2 AS eligibility.label) WITH FUNCTION eligibility.to_label(int2);`)
    const select = async () => {
      const p = (await readCatalogRangeTypes(pg, ['eligibility'])).find((p) => p.name === 'span')!
      return resolveRangeCall(
        p.callables!.filter((c) => c.schema === 'eligibility' && c.name === 'span'),
        [typed('pg_catalog.int2'), typed('pg_catalog.int2')],
        false,
        null,
        p.callResolution,
      )
    }
    expect(
      (await pg.query('SELECT eligibility.span(1::int2,3::int2)::text AS value')).rows,
    ).toEqual([{ value: '[1,3)' }])
    expect(await select()).toMatchObject({
      kind: 'call',
      callable: { implementation: 'range_constructor2' },
    })
    await pg.exec(
      'DROP CAST(int2 AS eligibility.label);CREATE CAST(int2 AS eligibility.label) WITH FUNCTION eligibility.to_label(int2) AS IMPLICIT;',
    )
    await expect(pg.exec('SELECT eligibility.span(1::int2,3::int2)')).rejects.toMatchObject({
      code: '42725',
    })
    expect(await select()).toEqual({ kind: 'unresolved' })
    expect(
      (await pg.query('SELECT eligibility.span(1::int4,3::int4)::text AS value')).rows,
    ).toEqual([{ value: '[1,3)' }])
  } finally {
    await pg.close()
  }
}, 30_000)
