import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import {
  capturedRangeType,
  rangeTypeProfile,
  multirangeTypeProfile,
  rangeProfileSupport,
  rangeTypeOutput,
} from '../../src/sql-semantics/range-profiles.js'
import {
  catalogRangeType,
  catalogMultirangeType,
} from '../../src/sql-semantics/catalog-check-binder.js'
import {
  catalogScalarType,
  isRangeType,
  isMultirangeType,
} from '../../src/sql-semantics/expressions.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import type { RangeTypeInfo } from '../../src/catalog/types.js'

it('keeps builtin range identities and comparison/canonicalization modes', () => {
  for (const metadata of Object.values(PG18_RANGE_TYPES)) {
    const profile = rangeTypeProfile(metadata.identity)!
    expect(profile.rangeType).toBe(metadata.identity)
    expect(profile.multirangeType).toBe(metadata.multirange)
    expect(multirangeTypeProfile(metadata.multirange)).toEqual(profile)
    expect(rangeTypeOutput(metadata.identity)).toBe(
      'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
    )
    expect(rangeTypeOutput(metadata.multirange)).toBe(
      'function:["pg_catalog","multirange_out"](pg_catalog.anymultirange)',
    )
    expect(rangeProfileSupport(profile)).toEqual({
      comparison: {
        'pg_catalog.int4': 2,
        'pg_catalog.int8': 3,
        'pg_catalog.date': 7,
        'pg_catalog."numeric"': 10,
        'pg_catalog."timestamp"': 4,
        'pg_catalog.timestamptz': 5,
      }[metadata.subtype],
      canonical:
        metadata.canonical === null
          ? 1
          : { 'pg_catalog.int4': 2, 'pg_catalog.int8': 3, 'pg_catalog.date': 7 }[
              metadata.subtype as 'pg_catalog.int4'
            ],
    })
    expect(catalogScalarType(metadata.identity)).toBe(metadata.identity)
  }
})

it('requires captured range, member and subtype output identities before local text output', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE output_span AS RANGE(subtype=int4);
      CREATE TABLE output_profiles(v output_span,m output_span_multirange,label text,
      CONSTRAINT scalar CHECK(v::text COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"),
      CONSTRAINT multi CHECK(m::text COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!
    const profile = catalog.rangeTypes[0]!
    for (const check of table.constraints) {
      const lower = (range: RangeTypeInfo) =>
        lowerTableCheck(table, check, catalog.enums, catalog.domains, 'stored', [range])!.expression
      expect(prepareCheckRust(portableCheckAtoms(lower(profile))).kind).toBe('supported')
      const changes: Partial<RangeTypeInfo>[] = [
        { subtypeOutput: null },
        { subtypeOutput: 'function:["private","unknown_output"](pg_catalog.int4)' },
        { subtypeOutput: 'function:["pg_catalog","int8out"](pg_catalog.int8)' },
        { output: null },
        { output: 'function:["pg_catalog","textout"](pg_catalog.text)' },
        ...(check.name === 'multi'
          ? [
              { multirangeOutput: null },
              {
                multirangeOutput: 'function:["private","unknown_output"](pg_catalog.anymultirange)',
              },
            ]
          : []),
      ]
      for (const change of changes) {
        const expression = lower({ ...profile, ...change })
        const prepared = prepareCheckRust(portableCheckAtoms(expression))
        expect(
          hasUncertain(expression) || prepared.kind === 'unsupported',
          JSON.stringify(change),
        ).toBe(true)
      }
    }
  } finally {
    await pg.close()
  }
}, 30_000)

it('requires selected range, multirange and scalar/domain input identities for custom text casts', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE input_span AS RANGE(subtype=int4);
      CREATE DOMAIN positive_input AS int4 CHECK(VALUE>0);
      CREATE TYPE domain_input_span AS RANGE(subtype=positive_input);
      CREATE TABLE plain_input(payload text,CHECK(isempty(payload::input_span)));
      CREATE TABLE domain_input(payload text,CHECK(isempty(payload::domain_input_span)));
      CREATE TABLE plain_multi_input(payload text,CHECK(isempty(payload::input_span_multirange)));
      CREATE TABLE domain_multi_input(payload text,CHECK(isempty(payload::domain_input_span_multirange)));`)
    const catalog = await snapshotCatalog(pg)
    for (const table of catalog.tables) {
      const profile = catalog.rangeTypes.find(
        (profile) =>
          profile.name === (table.name.startsWith('plain_') ? 'input_span' : 'domain_input_span'),
      )!
      const lower = (range: RangeTypeInfo) =>
        lowerTableCheck(table, table.constraints[0]!, catalog.enums, catalog.domains, 'stored', [
          range,
        ])!.expression
      expect(prepareCheckRust(portableCheckAtoms(lower(profile))).kind).toBe('supported')
      for (const change of [
        { input: null },
        {
          input:
            'function:["private","range_input"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
        },
        { subtypeInput: null },
        { subtypeInput: 'function:["private","scalar_input"](pg_catalog.cstring)' },
        { subtypeInput: 'function:["pg_catalog","int8in"](pg_catalog.cstring)' },
        ...(table.name.includes('multi')
          ? [
              { multirangeInput: null },
              {
                multirangeInput:
                  'function:["private","multirange_input"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
              },
            ]
          : []),
      ]) {
        const expression = lower({ ...profile, ...change })
        expect(
          hasUncertain(expression) ||
            prepareCheckRust(portableCheckAtoms(expression)).kind === 'unsupported',
        ).toBe(true)
      }
    }
  } finally {
    await pg.close()
  }
}, 30_000)

it('resolves captured qualified identities, companion namespaces and domain subtypes independently of catalog OIDs', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  const ddl = `
CREATE SCHEMA "Types.A";CREATE SCHEMA "Types.B";
CREATE DOMAIN "Types.A".positive AS int4 CHECK(VALUE>0);
CREATE TYPE "Types.A".span AS RANGE(subtype="Types.A".positive,multirange_type_name=span_set);
CREATE TYPE "Types.B".span AS RANGE(subtype=int4);
CREATE TYPE "Types.A".discrete;
CREATE FUNCTION "Types.A".canon("Types.A".discrete) RETURNS "Types.A".discrete AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
CREATE TYPE "Types.A".discrete AS RANGE(subtype=int4,canonical="Types.A".canon);
CREATE DOMAIN "Types.A".nested AS "Types.A".span;
CREATE TABLE "Types.A".values(value "Types.A".nested,multiple public.span_set);
`
  try {
    await first.exec(ddl)
    await second.exec('CREATE TABLE discarded(value text);DROP TABLE discarded;' + ddl)
    const a = await snapshotCatalog(first),
      b = await snapshotCatalog(second)
    expect(a.tables[0]!.columns[0]!.typeOid).not.toBe(b.tables[0]!.columns[0]!.typeOid)
    const encode = (catalog: typeof a) =>
      catalog.rangeTypes.map((info) => capturedRangeType(info, 'pg_catalog.int4')!)
    expect(encode(a)).toEqual(encode(b))
    const info = a.rangeTypes.find((r) => r.identity === '"Types.A".span')!
    const encoded = capturedRangeType(info, 'pg_catalog.int4')!
    expect(capturedRangeType({ ...info, ...{ oid: 12345 } }, 'pg_catalog.int4')).toBe(encoded)
    expect(isRangeType(encoded)).toBe(true)
    expect(catalogScalarType(encoded)).toBe(encoded)
    const profile = rangeTypeProfile(encoded)!
    expect(profile).toMatchObject({
      identity: '"Types.A".span',
      subtype: '"Types.A".positive',
      elementType: 'pg_catalog.int4',
      multirange: 'public.span_set',
      captured: true,
    })
    expect(rangeProfileSupport(profile)).toEqual({ comparison: 2, canonical: 1 })
    expect(rangeTypeOutput(encoded)).toBe(
      'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
    )
    expect(profile.subtypeOutput).toBe('function:["pg_catalog","int4out"](pg_catalog.int4)')
    expect(isMultirangeType(profile.multirangeType)).toBe(true)
    expect(multirangeTypeProfile(profile.multirangeType)).toEqual(profile)
    const table = a.tables.find((t) => t.schema === 'Types.A' && t.name === 'values')!
    expect(
      catalogRangeType(
        table.columns[0]!.typeName,
        table.columns[0]!.typeOid,
        a.domains,
        a.rangeTypes,
      ),
    ).toBe(encoded)
    expect(
      catalogMultirangeType(
        table.columns[1]!.typeName,
        table.columns[1]!.typeOid,
        a.domains,
        a.rangeTypes,
      ),
    ).toBe(profile.multirangeType)
    expect(catalogRangeType('span', undefined, a.domains, a.rangeTypes)).toBeNull()
    expect(catalogRangeType('"Types.A".span[]', undefined, a.domains, a.rangeTypes)).toBeNull()
    expect(catalogRangeType('"Types.A".span(1)', undefined, a.domains, a.rangeTypes)).toBeNull()
    const discrete = rangeTypeProfile(
      encode(a).find((r) => rangeTypeProfile(r)!.name === 'discrete')!,
    )!
    expect(rangeProfileSupport(discrete)).toEqual({ comparison: 2, canonical: 0 })
    const alternative = capturedRangeType(
      { ...info, comparator: 'function:["Types.A","compare"](pg_catalog.int4,pg_catalog.int4)' },
      'pg_catalog.int4',
    )!
    expect(rangeProfileSupport(rangeTypeProfile(alternative)!)).toEqual({
      comparison: 0,
      canonical: 1,
    })
    expect(capturedRangeType(info, 'pg_catalog.text')).toBeNull()
    for (const bad of [
      'range:',
      'range:{}',
      'range:[]',
      'multirange:null',
      encoded.replace('"elementType":"pg_catalog.int4"', '"elementType":"pg_catalog.text"'),
      encoded.replace('"elementType":', '"oid":42,"elementType":'),
    ]) {
      expect(rangeTypeProfile(bad)).toBeNull()
      expect(multirangeTypeProfile(bad)).toBeNull()
      expect(catalogScalarType(bad)).toBeNull()
    }
  } finally {
    await first.close()
    await second.close()
  }
}, 30_000)
