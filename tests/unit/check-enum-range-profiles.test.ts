import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import {
  catalogArrayType,
  catalogRangeType,
  catalogMultirangeType,
} from '../../src/sql-semantics/catalog-check-binder.js'
import {
  capturedRangeType,
  rangeTypeProfile,
  rangeEnumType,
  rangeProfileSupport,
  rangeSubtypeIsDomain,
} from '../../src/sql-semantics/range-profiles.js'

it('captures nominal enum range support and label order through domains without catalog OID dependence', async () => {
  const a = await PGlite.create(),
    b = await PGlite.create()
  try {
    const schema = `CREATE SCHEMA "Enum.Profile";
      CREATE TYPE "Enum.Profile"."Phase.Kind" AS ENUM('z','a','');
      ALTER TYPE "Enum.Profile"."Phase.Kind" ADD VALUE 'mid' BEFORE 'a';
      CREATE DOMAIN "Enum.Profile".inner_label AS "Enum.Profile"."Phase.Kind";
      CREATE DOMAIN "Enum.Profile".outer_label AS "Enum.Profile".inner_label;
      CREATE TYPE "Enum.Profile".plain_span AS RANGE(subtype="Enum.Profile"."Phase.Kind");
      CREATE TYPE "Enum.Profile".domain_span AS RANGE(subtype="Enum.Profile".outer_label);
      CREATE TYPE "Enum.Profile".empty_label AS ENUM();
      CREATE TYPE "Enum.Profile".empty_span AS RANGE(subtype="Enum.Profile".empty_label);
      CREATE TYPE "Enum.Profile".blank_label AS ENUM('');
      CREATE TYPE "Enum.Profile".blank_span AS RANGE(subtype="Enum.Profile".blank_label);`
    await a.exec(schema)
    await b.exec('CREATE TABLE shifted_oid(v text);DROP TABLE shifted_oid;' + schema)
    const left = await snapshotCatalog(a),
      right = await snapshotCatalog(b)
    expect(left.enums[0]!.oid).not.toBe(right.enums[0]!.oid)
    const encoded = (catalog: typeof left) =>
      catalog.rangeTypes.map((info) =>
        catalogRangeType(info.identity, undefined, catalog.domains, catalog.rangeTypes),
      )
    expect(encoded(left)).toEqual(encoded(right))
    expect(encoded(left)).not.toContain(null)
    for (const info of left.rangeTypes) {
      const type = catalogRangeType(info.identity, undefined, left.domains, left.rangeTypes)!,
        profile = rangeTypeProfile(type)!
      expect(profile.elementType).toBe(rangeEnumType(info.subtypeEnum!))
      expect(profile.subtypeEnum).toEqual(info.subtypeEnum)
      expect(rangeSubtypeIsDomain(profile)).toBe(info.name === 'domain_span')
      expect(rangeProfileSupport(profile)).toEqual({ comparison: 6, canonical: 1 })
      expect(rangeProfileSupport({ ...profile, comparator: null })).toEqual({
        comparison: 0,
        canonical: 1,
      })
      expect(catalogMultirangeType(info.multirange, undefined, left.domains, left.rangeTypes)).toBe(
        profile.multirangeType,
      )
      expect(
        catalogArrayType(
          info.identity + '[]',
          undefined,
          left.domains,
          left.enums,
          left.rangeTypes,
        ),
      ).toBe('array:' + type)
      const data = JSON.parse(type.slice(6)) as Record<string, unknown>
      expect(Object.keys(data['subtypeEnum'] as object).sort()).toEqual([
        'name',
        'schema',
        'values',
      ])
      for (const subtypeEnum of [
        null,
        { ...info.subtypeEnum!, values: ['x', 'x'] },
        { ...info.subtypeEnum!, values: ['bad\0label'] },
        { ...info.subtypeEnum!, valueOids: [1] },
      ])
        expect(rangeTypeProfile('range:' + JSON.stringify({ ...data, subtypeEnum }))).toBeNull()
      expect(capturedRangeType(info, 'enum:["wrong","type"]')).toBeNull()
      expect(capturedRangeType({ ...info, subtypeEnum: undefined }, profile.elementType)).toBeNull()
    }
  } finally {
    await a.close()
    await b.close()
  }
})
