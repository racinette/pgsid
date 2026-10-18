import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readRangeTypes } from '../../../src/postgres/range-types.js'
import { readBuiltinCatalog } from '../../../src/postgres/builtins/catalog.js'
import { builtinTypeComparison } from '../../../src/postgres/builtins/inventory.js'

let pg: PGlite
beforeAll(async () => {
  pg = await PGlite.create()
})
afterAll(async () => {
  await pg.close()
})

const ddl = `
  CREATE SCHEMA "Ranges";
  CREATE TYPE "Ranges"."_Window";
  CREATE TYPE "Ranges"."_Window Set";
  CREATE TYPE "Ranges"."Window";
  CREATE FUNCTION "Ranges".canonical("Ranges"."Window") RETURNS "Ranges"."Window"
    AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
  CREATE FUNCTION "Ranges".canonical(integer) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT AS 'SELECT $1';
  CREATE FUNCTION "Ranges".difference(integer,integer) RETURNS double precision
    LANGUAGE sql IMMUTABLE STRICT AS 'SELECT $1::float8 - $2::float8';
  CREATE FUNCTION "Ranges".difference(bigint,bigint) RETURNS double precision
    LANGUAGE sql IMMUTABLE STRICT AS 'SELECT $1::float8 - $2::float8';
  CREATE TYPE "Ranges"."Window" AS RANGE (
    subtype=integer,canonical="Ranges".canonical,subtype_diff="Ranges".difference,
    multirange_type_name="Ranges"."Window Set"
  );
  CREATE COLLATION "Ranges"."Ordering" (provider=libc,locale='C');
  CREATE TYPE "Ranges".words AS RANGE (
    subtype=text,subtype_opclass=pg_catalog.text_pattern_ops,
    collation="Ranges"."Ordering",multirange_type_name="Ranges".word_sets
  );
  CREATE DOMAIN "Ranges".identifier AS integer CHECK (VALUE>0);
  CREATE TYPE "Ranges".identifiers AS RANGE (subtype="Ranges".identifier);
  CREATE TYPE "Ranges".priority AS ENUM ('low','high');
  CREATE TYPE "Ranges".priorities AS RANGE (subtype="Ranges".priority);
  CREATE TYPE "Ranges".vectors AS RANGE (subtype=integer[]);
`

it('captures selected range support, nominal subtypes, quoted names and overloaded functions without OIDs', async () => {
  await pg.exec(ddl)
  const ranges = await readRangeTypes(pg, 'Ranges')
  expect(ranges).toHaveLength(5)
  expect(ranges.find((range) => range.identity === '"Ranges"."Window"')).toEqual({
    identity: '"Ranges"."Window"',
    array: '"Ranges"."_Window_1"',
    subtype: 'pg_catalog.int4',
    multirange: '"Ranges"."Window Set"',
    multirangeArray: '"Ranges"."_Window Set_1"',
    collation: null,
    subtypeClass: 'pg_catalog.int4_ops',
    comparator: 'function:["pg_catalog","btint4cmp"](pg_catalog.int4,pg_catalog.int4)',
    canonical: 'function:["Ranges","canonical"]("Ranges"."Window")',
    subtypeDiff: 'function:["Ranges","difference"](pg_catalog.int4,pg_catalog.int4)',
  })
  const words = ranges.find((range) => range.identity === '"Ranges".words')!
  expect(words).toMatchObject({
    subtype: 'pg_catalog.text',
    multirange: '"Ranges".word_sets',
    collation: '"Ranges"."Ordering"',
    subtypeClass: 'pg_catalog.text_pattern_ops',
    comparator: 'function:["pg_catalog","bttext_pattern_cmp"](pg_catalog.text,pg_catalog.text)',
    canonical: null,
    subtypeDiff: null,
  })
  expect(words.comparator).not.toBe(builtinTypeComparison('pg_catalog.text')!.comparator)
  expect(ranges.find((range) => range.identity === '"Ranges".identifiers')).toMatchObject({
    subtype: '"Ranges".identifier',
    subtypeClass: 'pg_catalog.int4_ops',
    comparator: 'function:["pg_catalog","btint4cmp"](pg_catalog.int4,pg_catalog.int4)',
  })
  expect(ranges.find((range) => range.identity === '"Ranges".priorities')).toMatchObject({
    subtype: '"Ranges".priority',
    subtypeClass: 'pg_catalog.enum_ops',
    comparator: 'function:["pg_catalog","enum_cmp"](pg_catalog.anyenum,pg_catalog.anyenum)',
    canonical: null,
  })
  expect(ranges.find((range) => range.identity === '"Ranges".vectors')).toMatchObject({
    subtype: 'pg_catalog._int4',
    subtypeClass: 'pg_catalog.array_ops',
    comparator: 'function:["pg_catalog","btarraycmp"](pg_catalog.anyarray,pg_catalog.anyarray)',
  })
  expect(
    ranges.every((range) =>
      Object.values(range).every((value) => value === null || typeof value === 'string'),
    ),
  ).toBe(true)
  expect(await readRangeTypes(pg, 'missing')).toEqual([])
  const builtins = (await readBuiltinCatalog(pg)).rangeTypes
  expect(builtins).toHaveLength(6)
  expect(await readRangeTypes(pg)).toEqual(
    [...builtins, ...ranges].sort((a, b) =>
      a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0,
    ),
  )

  const original = await pg.query<{ oid: number }>(
    `SELECT '"Ranges"."Window"'::regtype::oid AS oid`,
  )
  await pg.exec('SET search_path TO "Ranges", public, pg_catalog')
  expect(await readRangeTypes(pg, 'Ranges')).toEqual(ranges)
  await pg.exec('RESET search_path; DROP SCHEMA "Ranges" CASCADE')
  await pg.exec("CREATE TYPE public.decoy AS ENUM ('unused'); DROP TYPE public.decoy")
  await pg.exec(ddl)
  const rebuilt = await pg.query<{ oid: number }>(`SELECT '"Ranges"."Window"'::regtype::oid AS oid`)
  expect(rebuilt.rows[0]!.oid).not.toBe(original.rows[0]!.oid)
  expect(await readRangeTypes(pg, 'Ranges')).toEqual(ranges)
  expect(await readRangeTypes(pg, 'pg_catalog')).toEqual(builtins)
})
