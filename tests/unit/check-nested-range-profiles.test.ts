import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import {
  catalogRangeType,
  catalogMultirangeType,
  catalogArrayType,
} from '../../src/sql-semantics/catalog-check-binder.js'
import {
  rangeTypeProfile,
  rangeContainerKind,
  rangeProfileSupport,
  rangeNestedProfile,
  rangeSubtypeIsDomain,
} from '../../src/sql-semantics/range-profiles.js'
import { rangeBoundProfiles } from '../../src/codegen/shared/check-array-types.js'
import { readCatalogRangeTypes } from '../../src/postgres/range-types.js'

it('resolves nested range subtype profiles and retained child semantics independently of deployment identities', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE phase AS ENUM('z','a');CREATE TYPE phase_span AS RANGE(subtype=phase,multirange_type_name=phase_set);
CREATE DOMAIN positive AS int4 CHECK(VALUE>0);CREATE TYPE positive_span AS RANGE(subtype=positive);
CREATE DOMAIN admitted AS int4range;
CREATE TYPE ranges_span AS RANGE(subtype=int4range);CREATE TYPE sets_span AS RANGE(subtype=int4multirange);
CREATE TYPE phases_span AS RANGE(subtype=phase_span);CREATE TYPE phases_array_span AS RANGE(subtype=phase_span[]);
CREATE TYPE domains_span AS RANGE(subtype=admitted);CREATE TYPE checked_span AS RANGE(subtype=positive_span);
CREATE TYPE deep_span AS RANGE(subtype=ranges_span);`)
    const c = await snapshotCatalog(pg)
    for (const name of [
      'ranges_span',
      'sets_span',
      'phases_span',
      'phases_array_span',
      'domains_span',
      'checked_span',
      'deep_span',
    ]) {
      const info = c.rangeTypes.find((p) => p.name === name)!,
        type = catalogRangeType(info.identity, undefined, c.domains, c.rangeTypes)
      expect(type, name).not.toBeNull()
      const profile = rangeTypeProfile(type!)!
      const kind = name === 'sets_span' ? 43 : name === 'phases_array_span' ? 41 : 42
      expect(rangeContainerKind(profile.elementType), name).toBe(kind)
      expect(rangeProfileSupport(profile), name).toEqual({ comparison: kind, canonical: 1 })
      expect(rangeSubtypeIsDomain(profile)).toBe(name === 'domains_span')
      expect(
        catalogMultirangeType(info.multirange, undefined, c.domains, c.rangeTypes),
      ).not.toBeNull()
      expect(type).not.toContain('callResolution')
      expect(type).not.toContain('callables')
      expect(type).not.toContain('valueOids')
      const child = rangeNestedProfile(profile, info.subtypeRanges![0]!.identity)
      expect(child, name).not.toBeNull()
      if (name === 'checked_span') expect(child!.elementType).toBe('pg_catalog.int4')
      if (name.startsWith('phases')) expect(child!.subtypeEnum!.values).toEqual(['z', 'a'])
    }
    const encoded = catalogRangeType(
      c.rangeTypes.find((p) => p.name === 'phases_span')!.identity,
      undefined,
      c.domains,
      c.rangeTypes,
    )!
    const encodedData = JSON.parse(encoded.slice(6))
    for (const mutate of [
      (p: typeof encodedData) => {
        p.subtypeRanges = []
      },
      (p: typeof encodedData) => {
        p.subtypeRanges[0].rangeHash = null
      },
      (p: typeof encodedData) => {
        p.subtypeRanges[0].identity = 'public.missing'
      },
      (p: typeof encodedData) => {
        p.subtypeRanges[0].subtypeEnum.values.reverse()
      },
      (p: typeof encodedData) => {
        p.subtypeDefinitions.find((n: { kind: string }) => n.kind === 'r').subtype =
          'public.missing'
      },
    ]) {
      const data = structuredClone(encodedData)
      mutate(data)
      expect(rangeTypeProfile(`range:${JSON.stringify(data)}`)).toBeNull()
    }
    const integers = rangeTypeProfile(
      catalogRangeType(
        c.rangeTypes.find((p) => p.name === 'ranges_span')!.identity,
        undefined,
        c.domains,
        c.rangeTypes,
      )!,
    )!
    expect(rangeBoundProfiles(integers)!.map((n) => [n.kind, n.comparison, n.canonical])).toEqual([
      [42, 42, 2],
      [2, 2, 1],
    ])
    const changed = JSON.parse(integers.rangeType.slice(6))
    changed.subtypeRanges[0].canonical = null
    changed.subtypeRanges[0].comparator =
      'function:["public","reverse"](pg_catalog.int4,pg_catalog.int4)'
    const captured = rangeTypeProfile(`range:${JSON.stringify(changed)}`)!
    expect(captured).not.toBeNull()
    expect(rangeBoundProfiles(captured)!.map((n) => [n.kind, n.comparison, n.canonical])).toEqual([
      [42, 42, 1],
      [2, 0, 1],
    ])
  } finally {
    await pg.close()
  }
}, 60_000)

it('resolves child range identities and arrays from schema-scoped captured dependencies', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA inside;CREATE SCHEMA outside;
CREATE DOMAIN inside.positive AS int4 CHECK(VALUE>0);
CREATE TYPE inside.leaf AS RANGE(subtype=inside.positive,multirange_type_name=inside.leaves);
CREATE TYPE outside.envelope AS RANGE(subtype=inside.leaf);
CREATE TYPE outside.history AS RANGE(subtype=inside.leaf[]);`)
    const scoped = await readCatalogRangeTypes(pg, ['outside'])
    expect(scoped.map((p) => p.schema)).toEqual(['outside', 'outside'])
    const child = catalogRangeType('inside.leaf', undefined, [], scoped)
    expect(child).not.toBeNull()
    expect(rangeTypeProfile(child!)!.elementType).toBe('pg_catalog.int4')
    expect(catalogMultirangeType('inside.leaves', undefined, [], scoped)).not.toBeNull()
    expect(catalogArrayType('inside.leaf[]', undefined, [], [], scoped)).toBe('array:' + child)
    expect(catalogArrayType('inside._leaf', undefined, [], [], scoped)).toBe('array:' + child)
  } finally {
    await pg.close()
  }
}, 60_000)
