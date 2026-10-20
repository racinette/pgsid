import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { comparableStates, diffCatalogs, emptyCatalogSnapshot } from '../../../src/catalog/diff.js'
import { readRangeTypes, readCatalogRangeTypes } from '../../../src/postgres/range-types.js'
import type { CatalogSnapshot } from '../../../src/catalog/types.js'

const ddl = `
CREATE SCHEMA "Range.Types";
CREATE TYPE "Range.Types"."Continuous" AS RANGE(subtype=integer,multirange_type_name="Continuous Set");
CREATE TYPE "Range.Types"."Discrete";
CREATE FUNCTION "Range.Types".canonical("Range.Types"."Discrete") RETURNS "Range.Types"."Discrete"
AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
CREATE FUNCTION "Range.Types".difference(integer,integer) RETURNS float8 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT $1::float8-$2::float8';
CREATE FUNCTION "Range.Types".difference(bigint,bigint) RETURNS float8 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT $1::float8-$2::float8';
CREATE TYPE "Range.Types"."Discrete" AS RANGE(subtype=integer,canonical="Range.Types".canonical,subtype_diff="Range.Types".difference);
CREATE TYPE "Range.Types".words AS RANGE(subtype=text,subtype_opclass=pg_catalog.text_pattern_ops,collation="C");
CREATE TYPE "Range.Types".default_words AS RANGE(subtype=text);
CREATE DOMAIN "Range.Types".positive AS integer CHECK(VALUE>0);
CREATE TYPE "Range.Types".positive_ranges AS RANGE(subtype="Range.Types".positive);
CREATE TYPE "Range.Types".rating AS ENUM('low','high');
CREATE TYPE "Range.Types".ratings AS RANGE(subtype="Range.Types".rating);
CREATE TYPE "Range.Types".vectors AS RANGE(subtype=integer[]);
CREATE TABLE "Range.Types".values(payload "Range.Types"."Continuous");
`

it('captures user range and multirange support in snapshots with selected identities, collation and no deployment OIDs', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(ddl)
    await pg.exec(
      'CREATE TEMP TABLE temporary_host(id integer);CREATE TYPE pg_temp.hidden AS RANGE(subtype=integer)',
    )
    await pg.exec(
      `SET search_path='Range.Types',public;SET DateStyle='SQL,DMY';SET TimeZone='Europe/Minsk';SET array_nulls=off`,
    )
    const settings = () =>
      pg.query(
        "SELECT current_setting('search_path') search_path,current_setting('DateStyle') date_style,current_setting('TimeZone') zone,current_setting('array_nulls') array_nulls",
      )
    const before = (await settings()).rows
    const snapshot = await snapshotCatalog(pg)
    expect((await settings()).rows).toEqual(before)
    expect(snapshot.rangeTypes).toHaveLength(7)
    expect(snapshot.rangeTypes.map((r) => r.identity)).toEqual(
      [...snapshot.rangeTypes.map((r) => r.identity)].sort(),
    )
    expect(snapshot.rangeTypes.every((r) => r.schema === 'Range.Types')).toBe(true)
    const continuous = snapshot.rangeTypes.find((r) => r.name === 'Continuous')!
    expect(continuous).toMatchObject({
      schema: 'Range.Types',
      name: 'Continuous',
      identity: '"Range.Types"."Continuous"',
      multirange: 'public."Continuous Set"',
      multirangeSchema: 'public',
      multirangeName: 'Continuous Set',
      subtype: 'pg_catalog.int4',
      canonical: null,
      subtypeDiff: null,
      collation: null,
      collationDeterministic: null,
      collationIsC: null,
      collationIsDefault: null,
      output: 'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
      multirangeOutput: 'function:["pg_catalog","multirange_out"](pg_catalog.anymultirange)',
      subtypeOutput: 'function:["pg_catalog","int4out"](pg_catalog.int4)',
      input:
        'function:["pg_catalog","range_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
      multirangeInput:
        'function:["pg_catalog","multirange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
      subtypeInput: 'function:["pg_catalog","int4in"](pg_catalog.cstring)',
    })
    expect(
      (
        await pg.query<{ continuous: string; discrete: string }>(
          `SELECT '[1,2]'::"Range.Types"."Continuous"::text continuous,'[1,2]'::"Range.Types"."Discrete"::text discrete`,
        )
      ).rows[0],
    ).toEqual({ continuous: '[1,2]', discrete: '[1,3)' })
    expect(snapshot.rangeTypes.find((r) => r.name === 'Discrete')).toMatchObject({
      canonical: 'function:["Range.Types","canonical"]("Range.Types"."Discrete")',
      subtypeDiff: 'function:["Range.Types","difference"](pg_catalog.int4,pg_catalog.int4)',
    })
    expect(snapshot.rangeTypes.find((r) => r.name === 'words')).toMatchObject({
      collation: 'pg_catalog."C"',
      collationDeterministic: true,
      collationIsC: true,
      collationIsDefault: false,
      comparator: 'function:["pg_catalog","bttext_pattern_cmp"](pg_catalog.text,pg_catalog.text)',
    })
    expect(snapshot.rangeTypes.find((r) => r.name === 'default_words')).toMatchObject({
      collation: 'pg_catalog."default"',
      collationDeterministic: true,
      collationIsC: false,
      collationIsDefault: true,
    })
    expect(snapshot.rangeTypes.find((r) => r.name === 'positive_ranges')).toMatchObject({
      subtype: '"Range.Types".positive',
      comparator: 'function:["pg_catalog","btint4cmp"](pg_catalog.int4,pg_catalog.int4)',
      subtypeOutput: 'function:["pg_catalog","int4out"](pg_catalog.int4)',
      subtypeInput:
        'function:["pg_catalog","domain_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    })
    expect(snapshot.rangeTypes.find((r) => r.name === 'ratings')).toMatchObject({
      subtype: '"Range.Types".rating',
      comparator: 'function:["pg_catalog","enum_cmp"](pg_catalog.anyenum,pg_catalog.anyenum)',
      subtypeOutput: 'function:["pg_catalog","enum_out"](pg_catalog.anyenum)',
    })
    expect(snapshot.rangeTypes.find((r) => r.name === 'vectors')).toMatchObject({
      subtype: 'pg_catalog._int4',
      comparator: 'function:["pg_catalog","btarraycmp"](pg_catalog.anyarray,pg_catalog.anyarray)',
      subtypeOutput: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    })
    expect(
      snapshot.rangeTypes.every((r) =>
        Object.values(r).every(
          (v) => v === null || typeof v === 'string' || typeof v === 'boolean',
        ),
      ),
    ).toBe(true)
    expect(await readCatalogRangeTypes(pg, [])).toEqual([])
    expect(await readCatalogRangeTypes(pg, ['missing'])).toEqual([])
    const builtin = await readRangeTypes(pg, 'pg_catalog')
    expect(builtin).toHaveLength(6)
    expect(
      builtin.every((r) => Object.values(r).every((v) => v === null || typeof v === 'string')),
    ).toBe(true)
    expect(JSON.parse(JSON.stringify(snapshot)).rangeTypes).toEqual(snapshot.rangeTypes)
    expect(comparableStates(snapshot).get('Range.Types.Continuous')).toEqual(continuous)
    expect(comparableStates(snapshot).get('public.Continuous Set')).toEqual({
      range: continuous.identity,
      profile: continuous,
    })
    const constructors = snapshot.functions.filter((fn) => fn.returnType === continuous.multirange)
    expect(constructors).toHaveLength(3)
    expect(constructors.every((fn) => fn.schema === 'Range.Types')).toBe(true)
    await pg.exec('ALTER TYPE public."Continuous Set" RENAME TO "Moved Set"')
    const renamed = await snapshotCatalog(pg),
      renamedProfile = renamed.rangeTypes.find((r) => r.name === 'Continuous')!
    expect(renamedProfile).toMatchObject({
      multirangeSchema: 'public',
      multirangeName: 'Moved Set',
      multirange: 'public."Moved Set"',
    })
    const changes = diffCatalogs(snapshot, renamed)
    expect(changes.added).toEqual(['public.Moved Set'])
    expect(changes.removed).toEqual(['public.Continuous Set'])
    expect(changes.modified.map((item) => item.entityId)).toEqual(
      [
        'Range.Types.Continuous',
        ...constructors.map((fn) => `${fn.schema}.${fn.name}(${fn.argTypes})`),
      ].sort(),
    )
  } finally {
    await pg.close()
  }
}, 30_000)

it('compares profiles and quoted type identities across independent catalog OIDs and detects support changes', async () => {
  const snapshots: CatalogSnapshot[] = [],
    oids: number[] = []
  for (const noisy of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (noisy)
        await pg.exec(
          "CREATE TYPE public.unrelated AS ENUM('unused');CREATE DOMAIN public.unrelated_domain AS text",
        )
      await pg.exec(ddl)
      oids.push(
        (
          await pg.query<{ oid: number }>(
            `SELECT '"Range.Types"."Continuous"'::regtype::oid::integer oid`,
          )
        ).rows[0]!.oid,
      )
      const snapshot = await snapshotCatalog(pg)
      const onlyRanges = emptyCatalogSnapshot()
      onlyRanges.rangeTypes = snapshot.rangeTypes
      snapshots.push(onlyRanges)
    } finally {
      await pg.close()
    }
  }
  expect(oids[0]).not.toBe(oids[1])
  expect(snapshots[0]!.rangeTypes).toEqual(snapshots[1]!.rangeTypes)
  expect(diffCatalogs(snapshots[0]!, snapshots[1]!)).toEqual({
    added: [],
    removed: [],
    modified: [],
  })
  for (const field of ['comparator', 'canonical', 'subtypeDiff', 'collation'] as const) {
    const changed = structuredClone(snapshots[0]!)
    const range = changed.rangeTypes.find((r) => r.name === 'Continuous')!
    range[field] = 'new captured support'
    expect(diffCatalogs(snapshots[0]!, changed).modified.map((item) => item.entityId)).toEqual([
      'Range.Types.Continuous',
      'public.Continuous Set',
    ])
  }
  const changed = structuredClone(snapshots[0]!)
  changed.rangeTypes.find((r) => r.name === 'words')!.collationDeterministic = false
  const words = changed.rangeTypes.find((r) => r.name === 'words')!
  expect(diffCatalogs(snapshots[0]!, changed).modified.map((item) => item.entityId)).toEqual(
    ['Range.Types.words', `${words.multirangeSchema}.${words.multirangeName}`].sort(),
  )
  const empty = emptyCatalogSnapshot()
  expect(diffCatalogs(empty, snapshots[0]!).added).toHaveLength(14)
  expect(diffCatalogs(snapshots[0]!, empty).removed).toHaveLength(14)
}, 30_000)
