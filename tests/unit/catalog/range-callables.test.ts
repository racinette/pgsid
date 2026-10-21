import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { comparableStates, diffCatalogs } from '../../../src/catalog/diff.js'
import { readCatalogRangeTypes } from '../../../src/postgres/range-types.js'
import { capturedRangeType } from '../../../src/sql-semantics/range-profiles.js'
import { rangeConstructorImplementation } from '../../../src/sql-semantics/range-callables.js'
import type { RangeCallInfo, RangeTypeInfo } from '../../../src/catalog/types.js'

const ddl = `CREATE SCHEMA "Calls.A";CREATE SCHEMA "Calls.B";
 CREATE TYPE "Calls.A".span AS RANGE(subtype=int4,multirange_type_name=span_set);
 CREATE DOMAIN saved_span AS "Calls.A".span;
 CREATE DOMAIN saved_chain AS saved_span;
 CREATE FUNCTION "Calls.A".span(payload text,extra int DEFAULT 7) RETURNS "Calls.A".span LANGUAGE sql IMMUTABLE AS $$SELECT 'empty'::"Calls.A".span$$;
 CREATE FUNCTION "Calls.A".span(VARIADIC items bigint[]) RETURNS "Calls.A".span LANGUAGE sql IMMUTABLE AS $$SELECT 'empty'::"Calls.A".span$$;
 CREATE FUNCTION "Calls.A".span(label name DEFAULT 'one',OUT accepted bool) LANGUAGE sql IMMUTABLE AS $$SELECT true$$;
 CREATE FUNCTION "Calls.A".span(float8,float8) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'rival'::text$$;
 CREATE FUNCTION public.span_set(payload text,extra int DEFAULT 9) RETURNS public.span_set LANGUAGE sql IMMUTABLE AS $$SELECT '{}'::public.span_set$$;
 CREATE FUNCTION saved_chain(text) RETURNS saved_chain LANGUAGE sql IMMUTABLE AS $$SELECT NULL::saved_chain$$;
 CREATE AGGREGATE "Calls.A".span(bigint)(SFUNC=pg_catalog.int8pl,STYPE=bigint,INITCOND='0');
 CREATE PROCEDURE "Calls.A".span(flag bool) LANGUAGE plpgsql AS $$BEGIN NULL;END$$;
 CREATE DOMAIN "Calls.A".positive AS int4 NOT NULL CHECK(VALUE>0);
 CREATE TYPE "Calls.A".positive_span AS RANGE(subtype="Calls.A".positive);`

const profile = (profiles: readonly RangeTypeInfo[], name = 'span') =>
  profiles.find((p) => p.name === name)!
const constructor = (p: RangeTypeInfo, implementation: string) =>
  p.callables!.find((c) => c.implementation === implementation)!

it('captures complete same-name rivals, actual constructor namespaces, defaults, variadics and inherited domain type-call names', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(ddl)
    const snapshot = await snapshotCatalog(pg),
      p = profile(snapshot.rangeTypes)
    expect(p.multirange).toBe('public.span_set')
    expect(p.callables).toHaveLength(13)
    for (const name of [
      'range_constructor2',
      'range_constructor3',
      'multirange_constructor0',
      'multirange_constructor1',
      'multirange_constructor2',
    ]) {
      const c = constructor(p, name)
      expect(c.schema).toBe('Calls.A')
      expect(rangeConstructorImplementation(p, c)).toBe(name)
    }
    expect(constructor(p, 'multirange_constructor2')).toMatchObject({
      args: ['"Calls.A"._span'],
      variadic: '"Calls.A".span',
    })
    expect(
      p.callables!.find(
        (c) => c.name === 'span' && c.args.join(',') === 'pg_catalog.text,pg_catalog.int4',
      ),
    ).toMatchObject({
      schema: 'Calls.A',
      argumentNames: ['payload', 'extra'],
      numArgDefaults: 1,
      defaultExprs: [null, '7'],
      implementation: null,
    })
    expect(p.callables!.find((c) => c.variadic === 'pg_catalog.int8')).toMatchObject({
      args: ['pg_catalog._int8'],
      argumentNames: ['items'],
      implementation: null,
    })
    expect(p.callables!.find((c) => c.args[0] === 'pg_catalog.name')).toMatchObject({
      args: ['pg_catalog.name'],
      argumentNames: ['label'],
      defaultExprs: ["'one'::name"],
      result: 'pg_catalog.bool',
    })
    expect(
      p.callables!.find((c) => c.args.join(',') === 'pg_catalog.float8,pg_catalog.float8'),
    ).toMatchObject({ result: 'pg_catalog.text', implementation: null })
    expect(p.callables!.find((c) => c.schema === 'public' && c.name === 'span_set')).toMatchObject({
      args: ['pg_catalog.text', 'pg_catalog.int4'],
      numArgDefaults: 1,
      defaultExprs: [null, '9'],
      result: 'public.span_set',
      implementation: null,
    })
    expect(p.callables!.find((c) => c.name === 'saved_chain')).toMatchObject({
      schema: 'public',
      args: ['pg_catalog.text'],
      result: 'public.saved_chain',
      implementation: null,
    })
    expect(p.callables!.find((c) => c.kind === 'aggregate')).toMatchObject({
      schema: 'Calls.A',
      name: 'span',
      args: ['pg_catalog.int8'],
      result: 'pg_catalog.int8',
    })
    expect(p.callables!.find((c) => c.kind === 'procedure')).toMatchObject({
      args: ['pg_catalog.bool'],
      argumentNames: ['flag'],
    })
    expect(p.callables!.every((c) => c.args.length === c.argumentNames.length)).toBe(true)
    expect(p.callables!.every((c) => c.args.length === c.defaultExprs?.length)).toBe(true)
    expect(
      (
        await pg.query(`SELECT
          "Calls.A".span('[1,3)')::text AS untyped,
          "Calls.A".span('[1,3)'::text)::text AS typed,
          "Calls.A".span('[1,3)'::varchar)::text AS binary_relabel,
          public.span_set('{[1,3)}')::text AS multi_untyped,
          public.span_set('{[1,3)}'::text)::text AS multi_typed`)
      ).rows,
    ).toEqual([
      {
        untyped: '[1,3)',
        typed: 'empty',
        binary_relabel: '[1,3)',
        multi_untyped: '{[1,3)}',
        multi_typed: '{}',
      },
    ])
    const positive = profile(snapshot.rangeTypes, 'positive_span')
    expect(constructor(positive, 'range_constructor2').args).toEqual([
      '"Calls.A".positive',
      '"Calls.A".positive',
    ])
    expect(
      rangeConstructorImplementation(positive, constructor(positive, 'range_constructor2')),
    ).toBe('range_constructor2')
    await expect(pg.exec('SELECT public.span_set()')).rejects.toMatchObject({ code: '42883' })
    expect((await pg.query('SELECT "Calls.A".span_set()::text value')).rows).toEqual([
      { value: '{}' },
    ])
    await pg.exec(
      'ALTER FUNCTION "Calls.A".span(int4,int4) RENAME TO moved_span;ALTER FUNCTION "Calls.A".moved_span(int4,int4) SET SCHEMA "Calls.B";CREATE OR REPLACE FUNCTION "Calls.A".span(int4,int4,text) RETURNS "Calls.A".span LANGUAGE sql IMMUTABLE AS $$SELECT \'empty\'::"Calls.A".span$$;',
    )
    const changed = await snapshotCatalog(pg),
      q = profile(changed.rangeTypes)
    expect(constructor(q, 'range_constructor2')).toMatchObject({
      schema: 'Calls.B',
      name: 'moved_span',
    })
    expect(rangeConstructorImplementation(q, constructor(q, 'range_constructor2'))).toBe(
      'range_constructor2',
    )
    const replaced = q.callables!.find(
      (c) =>
        c.schema === 'Calls.A' &&
        c.name === 'span' &&
        c.args.join(',') === 'pg_catalog.int4,pg_catalog.int4,pg_catalog.text',
    )!
    expect(replaced.implementation).toBeNull()
    expect(rangeConstructorImplementation(q, replaced)).toBeNull()
    expect((await pg.query('SELECT "Calls.B".moved_span(1,3)::text value')).rows).toEqual([
      { value: '[1,3)' },
    ])
    expect(capturedRangeType(p, 'pg_catalog.int4')).toBe(capturedRangeType(q, 'pg_catalog.int4'))
    expect(comparableStates(snapshot).get('Calls.A.span')).toEqual(
      comparableStates(changed).get('Calls.A.span'),
    )
    expect(
      diffCatalogs(snapshot, changed).modified.some((change) => change.entityId === 'Calls.A.span'),
    ).toBe(false)
    for (const mutation of [
      { kind: 'procedure' },
      { volatility: 's' },
      { returnsSet: true },
      { strict: true },
      { variadic: 'pg_catalog.int4' },
      { args: ['pg_catalog.int8', 'pg_catalog.int8'] },
      { result: p.multirange },
      { implementation: null },
    ] as Partial<RangeCallInfo>[])
      expect(
        rangeConstructorImplementation(p, { ...constructor(p, 'range_constructor2'), ...mutation }),
      ).toBeNull()
  } finally {
    await pg.close()
  }
}, 30_000)

it('keeps callable facts independent of OIDs and search paths while excluding them from owned value identity', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  try {
    await first.exec(ddl)
    await second.exec('CREATE TABLE discarded(id int);DROP TABLE discarded;' + ddl)
    const before = await readCatalogRangeTypes(first, ['Calls.A'])
    await first.exec('SET search_path="Calls.B",pg_catalog')
    expect(await readCatalogRangeTypes(first, ['Calls.A'])).toEqual(before)
    const alternate = await readCatalogRangeTypes(second, ['Calls.A'])
    expect(alternate).toEqual(before)
    const a = (
      await first.query<{ oid: number }>(
        `SELECT oid FROM pg_type WHERE typname='span' AND typnamespace='"Calls.A"'::regnamespace`,
      )
    ).rows[0]!.oid
    const b = (
      await second.query<{ oid: number }>(
        `SELECT oid FROM pg_type WHERE typname='span' AND typnamespace='"Calls.A"'::regnamespace`,
      )
    ).rows[0]!.oid
    expect(a).not.toBe(b)
    expect(JSON.stringify(before)).not.toMatch(/"(?:oid|typeOid|functionOid)"\s*:/u)
    const p = profile(before),
      encoded = capturedRangeType(p, 'pg_catalog.int4')!
    expect(encoded).not.toContain('callables')
    expect(capturedRangeType({ ...p, callables: [] }, 'pg_catalog.int4')).toBe(encoded)
  } finally {
    await first.close()
    await second.close()
  }
}, 30_000)
