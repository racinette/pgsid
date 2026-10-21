import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import {
  capturedRangeType,
  rangeTypeProfile,
  rangeProfileSupport,
} from '../../src/sql-semantics/range-profiles.js'
import { customRangeProfiles } from '../sql-semantics/check-custom-range-fixtures.js'
import { textRangeSchema } from '../sql-semantics/check-text-range-fixtures.js'

it('admits captured text bounds and selects comparison only from captured C collation and comparator facts', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(textRangeSchema)
    const catalog = await snapshotCatalog(pg),
      profiles = customRangeProfiles(catalog)
    expect(profiles).toHaveLength(3)
    for (const profile of profiles) {
      expect(profile.elementType).toBe('pg_catalog.text')
      expect(rangeProfileSupport(profile).comparison).toBe(0)
      expect(rangeProfileSupport(profile, { defaultCollation: 'C' }).comparison).toBe(0)
      expect(rangeProfileSupport(profile, { serverEncoding: 'UTF8' }).comparison).toBe(
        profile.name === 'default_words' ? 0 : 8,
      )
      expect(
        rangeProfileSupport(profile, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      ).toEqual({
        comparison: 8,
        canonical: 1,
      })
      for (const change of [
        { collationIsC: false, collationIsDefault: false },
        { collationIsC: null, collationIsDefault: null },
        { comparator: 'function:["private","compare"](pg_catalog.text,pg_catalog.text)' },
        { comparator: null },
      ])
        expect(
          rangeProfileSupport(
            { ...profile, ...change },
            { defaultCollation: 'C', serverEncoding: 'UTF8' },
          ).comparison,
        ).toBe(0)
      if (profile.name !== 'bound_words')
        expect(capturedRangeType(profile, 'pg_catalog.int4')).toBeNull()
    }
    const profile = profiles.find((p) => p.name === 'words')!
    expect(rangeTypeProfile(profile.rangeType)).toMatchObject({
      identity: '"Text.Range".words',
      elementType: 'pg_catalog.text',
      collationIsC: true,
    })
    expect(
      capturedRangeType(
        { ...profile, elementType: 'pg_catalog.int4' } as typeof profile,
        'pg_catalog.int4',
      ),
    ).toBeNull()
  } finally {
    await pg.close()
  }
}, 30_000)
