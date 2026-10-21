import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import {
  catalogRangeType,
  catalogMultirangeType,
  catalogArrayType,
} from '../../src/sql-semantics/catalog-check-binder.js'
import {
  rangeArraySubtype,
  rangeTypeProfile,
  rangeSubtypeOutput,
  rangeProfileSupport,
  capturedRangeType,
  rangeSubtypeIsDomain,
} from '../../src/sql-semantics/range-profiles.js'
import { domainElementType, arrayType } from '../../src/sql-semantics/expressions.js'
import { builtinTypeIO } from '../../src/postgres/builtins/inventory.js'
import { rangeHashSupport } from '../../src/codegen/shared/check-hash-context.js'

it('captures array range carriers and callback context through domains and enums without deployment OIDs', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');CREATE DOMAIN bag AS int4[];CREATE DOMAIN bags AS bag;
   CREATE TYPE int_span AS RANGE(subtype=int4[]);CREATE TYPE enum_span AS RANGE(subtype=stage[]);
   CREATE TYPE domain_span AS RANGE(subtype=bags);CREATE TYPE nested_span AS RANGE(subtype=bag[]);
   CREATE TYPE json_span AS RANGE(subtype=json[]);CREATE TYPE text_span AS RANGE(subtype=text[],collation="C");`)
    const catalog = await snapshotCatalog(pg)
    const expected = new Map([
      ['int_span', 'array:pg_catalog.int4'],
      ['enum_span', 'array:enum:["public","stage"]'],
      ['domain_span', 'array:pg_catalog.int4'],
      [
        'nested_span',
        arrayType(
          domainElementType({ schema: 'public', name: 'bag' }, arrayType('pg_catalog.int4')),
        ),
      ],
      ['json_span', 'array:pg_catalog."json"'],
      ['text_span', 'array:pg_catalog.text'],
    ])
    for (const metadata of catalog.rangeTypes) {
      expect(rangeArraySubtype(metadata)).toBe(expected.get(metadata.name))
      const type = catalogRangeType(
        metadata.identity,
        undefined,
        catalog.domains,
        catalog.rangeTypes,
      )!
      expect(type).not.toBeNull()
      const profile = rangeTypeProfile(type)!
      expect(profile.elementType).toBe(expected.get(metadata.name))
      expect(rangeProfileSupport(profile)).toEqual({ comparison: 41, canonical: 1 })
      expect(rangeSubtypeOutput(profile)).toBe(builtinTypeIO('pg_catalog._int4')!.output)
      expect(rangeSubtypeIsDomain(profile)).toBe(metadata.name === 'domain_span')
      for (const extended of [false, true]) {
        expect(rangeHashSupport(profile, extended)).toEqual({
          available: metadata.name !== 'json_span',
          compatible: true,
          safe: metadata.name !== 'json_span',
          context: metadata.name === 'text_span' ? 'text' : null,
        })
        const changed = structuredClone(profile)
        const leaf = changed.subtypeDefinitions!.find((node) => !node.base && !node.element)!
        leaf[extended ? 'hashExtended' : 'hash'] = null
        expect(rangeHashSupport(changed, extended).available).toBe(false)
        const selected = extended ? 'subtypeHashExtended' : 'subtypeHash'
        changed[selected] = 'function:["public","custom_array_hash"](pg_catalog.anyarray)'
        expect(rangeHashSupport(changed, extended)).toMatchObject({
          available: true,
          safe: false,
          context: null,
        })
        const incompatible = structuredClone(profile)
        incompatible.subtypeDefinitions!.find(
          (node) => !node.base && !node.element,
        )!.hashEqualityCompatible = false
        expect(rangeHashSupport(incompatible, extended).compatible).toBe(false)
      }
      expect(
        catalogMultirangeType(metadata.multirange, undefined, catalog.domains, catalog.rangeTypes),
      ).not.toBeNull()
      expect(
        catalogArrayType(
          profile.subtype,
          undefined,
          catalog.domains,
          catalog.enums,
          catalog.rangeTypes,
        ) ?? profile.elementType,
      ).toBe(profile.elementType)
      for (const edit of ['missing', 'cycle', 'duplicate', 'kind', 'identity', 'extra']) {
        const invalid = structuredClone(metadata)
        if (edit === 'missing') invalid.subtypeDefinitions = invalid.subtypeDefinitions!.slice(1)
        if (edit === 'cycle') {
          const root = invalid.subtypeDefinitions!.find((n) => n.identity === invalid.subtype)!
          root.kind = 'd'
          root.base = root.identity
          root.element = null
        }
        if (edit === 'duplicate')
          invalid.subtypeDefinitions = [
            ...invalid.subtypeDefinitions!,
            invalid.subtypeDefinitions![0]!,
          ]
        if (edit === 'kind') invalid.subtypeDefinitions![0]!.kind = 'p'
        if (edit === 'identity') invalid.subtypeDefinitions![0]!.name = 'forged'
        if (edit === 'extra') Object.assign(invalid.subtypeDefinitions![0]!, { oid: 123 })
        expect(
          capturedRangeType(invalid, profile.elementType),
          metadata.name + '/' + edit,
        ).toBeNull()
      }
      const changed = structuredClone(metadata)
      const leaf = changed.subtypeDefinitions!.find((n) => n.element === null && n.base === null)!
      leaf.output = builtinTypeIO(
        leaf.output === builtinTypeIO('pg_catalog.int4')!.output
          ? 'pg_catalog.text'
          : 'pg_catalog.int4',
      )!.output
      const modified = rangeTypeProfile(capturedRangeType(changed, profile.elementType)!)!
      if (profile.elementType !== 'array:pg_catalog.int4')
        expect(rangeSubtypeOutput(modified)).toBeUndefined()
    }
  } finally {
    await pg.close()
  }
})
