import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readCatalogRangeTypes, readRangeTypes } from '../../../src/postgres/range-types.js'
import { builtinTypeComparison, builtinTypeIO } from '../../../src/postgres/builtins/inventory.js'
import type { RangeTypeInfo } from '../../../src/catalog/types.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { comparableStates } from '../../../src/catalog/diff.js'

const schema = `CREATE SCHEMA "Inner.Types";CREATE SCHEMA "Outer.Types";
CREATE TYPE "Inner.Types".phase AS ENUM('z','a');ALTER TYPE "Inner.Types".phase ADD VALUE 'mid' BEFORE 'a';
CREATE TYPE "Inner.Types".phase_span AS RANGE(subtype="Inner.Types".phase,multirange_type_name="Inner.Types".phase_set);
CREATE FUNCTION "Inner.Types".reverse(integer,integer) RETURNS integer LANGUAGE sql IMMUTABLE STRICT AS 'SELECT btint4cmp($2,$1)';
CREATE OPERATOR CLASS "Inner.Types".reverse_ops FOR TYPE integer USING btree AS OPERATOR 1 >,OPERATOR 2 >=,OPERATOR 3 =,OPERATOR 4 <=,OPERATOR 5 <,FUNCTION 1 "Inner.Types".reverse(integer,integer);
CREATE TYPE "Inner.Types".reverse_span AS RANGE(subtype=integer,subtype_opclass="Inner.Types".reverse_ops,multirange_type_name="Inner.Types".reverse_set);
CREATE TYPE "Outer.Types".range_span AS RANGE(subtype=int4range,multirange_type_name="Outer.Types".range_set);
CREATE TYPE "Outer.Types".multi_span AS RANGE(subtype=int4multirange,multirange_type_name="Outer.Types".multi_set);
CREATE TYPE "Outer.Types".double_span AS RANGE(subtype="Outer.Types".range_span,multirange_type_name="Outer.Types".double_set);
CREATE TYPE "Outer.Types".reverse_span AS RANGE(subtype="Inner.Types".reverse_span,multirange_type_name="Outer.Types".reverse_set);
CREATE TYPE "Outer.Types".phase_span AS RANGE(subtype="Inner.Types".phase_span[],multirange_type_name="Outer.Types".phase_set);
CREATE DOMAIN "Outer.Types".phase_bag AS "Inner.Types".phase_span[];
CREATE TYPE "Outer.Types".nested_span AS RANGE(subtype="Outer.Types".phase_bag[],multirange_type_name="Outer.Types".nested_set);`

const containsOidKey = (value: unknown): boolean =>
  value !== null &&
  typeof value === 'object' &&
  Object.entries(value).some(([key, child]) => /oid/i.test(key) || containsOidKey(child))

it('captures closed nested range definitions across schema filters, domains and arrays with selected support and no deployment OIDs', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  try {
    await first.exec(schema)
    await second.exec('CREATE TABLE shift_ids(v text);DROP TABLE shift_ids;' + schema)
    await first.exec('SET search_path="Outer.Types",pg_catalog')
    await second.exec('SET search_path=pg_catalog')
    const left = await readCatalogRangeTypes(first, ['Outer.Types']),
      right = await readCatalogRangeTypes(second, ['Outer.Types'])
    expect(left).toHaveLength(6)
    expect(right).toEqual(left)
    expect(containsOidKey(left)).toBe(false)
    const ids = async (pg: PGlite) =>
      (await pg.query<{ id: number }>(`SELECT oid::integer id FROM pg_type WHERE typname='phase'`))
        .rows[0]!.id
    expect(await ids(first)).not.toBe(await ids(second))
    const profile = (name: string) => left.find((p) => p.name === name)!
    const inner = (name: string) => profile(name).subtypeRanges![0]!
    expect(inner('range_span')).toMatchObject({
      identity: 'pg_catalog.int4range',
      subtype: 'pg_catalog.int4',
      canonical: 'function:["pg_catalog","int4range_canonical"](pg_catalog.int4range)',
      comparator: builtinTypeComparison('pg_catalog.int4')!.comparator,
    })
    expect(inner('multi_span').identity).toBe('pg_catalog.int4range')
    expect(profile('multi_span').subtypeDefinitions!.find((n) => n.kind === 'm')).toMatchObject({
      identity: 'pg_catalog.int4multirange',
      member: 'pg_catalog.int4range',
      comparator: builtinTypeComparison('pg_catalog.int4multirange')!.comparator,
    })
    expect(inner('double_span').identity).toBe('"Outer.Types".range_span')
    expect(inner('double_span').subtypeRanges![0]!.identity).toBe('pg_catalog.int4range')
    expect(inner('reverse_span')).toMatchObject({
      identity: '"Inner.Types".reverse_span',
      comparator: 'function:["Inner.Types","reverse"](pg_catalog.int4,pg_catalog.int4)',
      canonical: null,
    })
    expect(
      profile('reverse_span').subtypeDefinitions!.find((n) => n.kind === 'r')!.comparator,
    ).toBe(builtinTypeComparison('pg_catalog.int4range')!.comparator)
    for (const name of ['phase_span', 'nested_span']) {
      const range = inner(name)
      expect(range.identity).toBe('"Inner.Types".phase_span')
      expect(range.subtypeEnum!.values).toEqual(['z', 'mid', 'a'])
      expect(range.output).toBe(builtinTypeIO('pg_catalog.int4range')!.output)
      expect(range.callables!.length).toBeGreaterThan(0)
      expect(range.callResolution!.types.some((t) => t.identity === '"Inner.Types".phase')).toBe(
        true,
      )
      const definitions = new Map(profile(name).subtypeDefinitions!.map((n) => [n.identity, n]))
      for (const n of definitions.values())
        for (const ref of [n.base, n.element, n.subtype, n.member])
          if (ref) expect(definitions.has(ref), name + '/' + ref).toBe(true)
    }
    const legacy = await readRangeTypes(first, 'Outer.Types')
    expect(legacy).toHaveLength(6)
    expect(containsOidKey(legacy)).toBe(false)
    expect(legacy.every((p) => !('subtypeRanges' in p) && !('subtypeDefinitions' in p))).toBe(true)
    const before = structuredClone(right)
    ;(inner('phase_span').subtypeEnum!.values as string[]).push('caller mutation')
    expect(inner('nested_span').subtypeEnum!.values).toEqual(['z', 'mid', 'a'])
    expect(right).toEqual(before)
    expect(await readCatalogRangeTypes(second, ['Outer.Types'])).toEqual(before)
    const check = (profile: RangeTypeInfo) => {
      if (!profile.subtypeDefinitions) return
      const child = profile.subtypeRanges?.[0]
      for (const node of profile.subtypeDefinitions) {
        if (node.kind === 'r' && node.identity === child?.identity)
          expect(node.subtype).toBe(child.subtype)
      }
      profile.subtypeRanges?.forEach(check)
    }
    before.forEach(check)
    const snapshot = await snapshotCatalog(first)
    const states = structuredClone(comparableStates(snapshot))
    const nested = snapshot.rangeTypes.find(
      (p) => p.schema === 'Outer.Types' && p.name === 'phase_span',
    )!.subtypeRanges![0]!
    nested.callables = []
    nested.callResolution = { types: [], implicitCasts: [] }
    expect(comparableStates(snapshot)).toEqual(states)
    ;(nested.subtypeEnum!.values as string[]).push('changed schema value')
    expect(comparableStates(snapshot)).not.toEqual(states)
    await first.exec(`CREATE TABLE "Outer.Types".admission(v "Outer.Types".range_span CHECK(lower(v)='[1,4)'::int4range));
INSERT INTO "Outer.Types".admission VALUES("Outer.Types".range_span('[1,3]'::int4range,NULL,'[]'));`)
    await expect(
      first.exec(
        `INSERT INTO "Outer.Types".admission VALUES("Outer.Types".range_span('[2,3]'::int4range,NULL,'[]'))`,
      ),
    ).rejects.toMatchObject({ code: '23514' })
  } finally {
    await first.close()
    await second.close()
  }
}, 60_000)
