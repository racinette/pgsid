import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readCatalogRangeTypes } from '../../../src/postgres/range-types.js'
import {
  rangeContainerSubtype,
  capturedRangeType,
  rangeTypeProfile,
} from '../../../src/sql-semantics/range-profiles.js'
import {
  compositeProfile,
  compositeFieldType,
} from '../../../src/sql-semantics/composite-profiles.js'
import { rangeBoundProfiles } from '../../../src/codegen/shared/check-array-types.js'

const schema = `CREATE SCHEMA "Hidden.Types";CREATE SCHEMA "Outer.Types";
CREATE TYPE "Hidden.Types".phase AS ENUM('z','a');CREATE TYPE "Hidden.Types".phase_span AS RANGE(subtype="Hidden.Types".phase);
CREATE TYPE "Hidden.Types".small_span AS RANGE(subtype=int2);CREATE TYPE "Hidden.Types".unused AS RANGE(subtype=int8);
CREATE DOMAIN "Hidden.Types".checked_span AS "Hidden.Types".small_span CHECK(NOT isempty(VALUE));
CREATE DOMAIN "Hidden.Types".batch AS "Hidden.Types".checked_span[];
CREATE TYPE "Hidden.Types".child AS(parts "Hidden.Types".small_span_multirange);
CREATE TYPE "Hidden.Types".leaf AS(n int2,part "Hidden.Types".small_span,checked "Hidden.Types".checked_span,batch "Hidden.Types".batch,history "Hidden.Types".child[],standard int4range,phase "Hidden.Types".phase_span,obsolete "Hidden.Types".unused);
ALTER TYPE "Hidden.Types".leaf DROP ATTRIBUTE obsolete;
CREATE TYPE "Outer.Types".record_span AS RANGE(subtype="Hidden.Types".leaf);
CREATE TYPE "Outer.Types".array_span AS RANGE(subtype="Hidden.Types".leaf[]);
CREATE TYPE "Outer.Types".wrapped_span AS RANGE(subtype="Outer.Types".record_span);`

it('captures selected range profiles reached through record fields across schemas, domains, arrays and multiranges', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  try {
    await first.exec(schema)
    await second.exec(
      "CREATE TYPE padding AS ENUM('unused');" + schema + 'SET search_path=pg_catalog;',
    )
    const left = await readCatalogRangeTypes(first, ['Outer.Types']),
      right = await readCatalogRangeTypes(second, ['Outer.Types'])
    expect(left).toHaveLength(3)
    expect(left).toEqual(right)
    const saved = structuredClone(right)
    const oid = async (pg: PGlite) =>
      (
        await pg.query<{ value: number }>(
          `SELECT '"Hidden.Types".small_span'::regtype::oid::int4 value`,
        )
      ).rows[0]!.value
    expect(await oid(first)).not.toBe(await oid(second))
    const expected = [
      '"Hidden.Types".phase_span',
      '"Hidden.Types".small_span',
      'pg_catalog.int4range',
    ]
    for (const name of ['record_span', 'array_span']) {
      const raw = left.find((p) => p.name === name)!
      expect(raw.subtypeRanges!.map((p) => p.identity)).toEqual(expected)
      expect(raw.subtypeRanges!.some((p) => p.name === 'unused')).toBe(false)
      const subtype = rangeContainerSubtype(raw)!,
        type = capturedRangeType(raw, subtype)!,
        profile = rangeTypeProfile(type)!
      expect(subtype).toBeTruthy()
      expect(profile).not.toBeNull()
      const nodes = rangeBoundProfiles(profile, { defaultCollation: 'C', serverEncoding: 'UTF8' })!
      expect(nodes).not.toBeNull()
      expect(
        nodes
          .filter((n) => n.typeName === '"Hidden.Types".small_span')
          .every((n) => n.kind === 42 && n.canonical === 1),
      ).toBe(true)
      expect(
        nodes.some((n) => n.typeName === '"Hidden.Types".small_span_multirange' && n.kind === 43),
      ).toBe(true)
      expect(nodes.find((n) => n.typeName === '"Hidden.Types".phase')!).toMatchObject({
        kind: 6,
        enumLabels: 'z\0a',
        enumCount: 2,
      })
      expect(nodes.find((n) => n.typeName === 'pg_catalog.int4range')!).toMatchObject({
        kind: 42,
        canonical: 2,
      })
      for (const [i, n] of nodes.entries()) {
        if (n.kind >= 41 && n.kind <= 43) expect(n.child).toBeGreaterThan(i)
        for (const field of n.fields ?? []) expect(field.child).toBeGreaterThan(i)
      }
      const record = compositeProfile(name === 'array_span' ? subtype.slice(6) : subtype)!
      expect(record).not.toBeNull()
      for (const id of [
        '"Hidden.Types".small_span',
        '"Hidden.Types".small_span_multirange',
        '"Hidden.Types".phase_span',
      ])
        expect(compositeFieldType(record, id), id).toBeTruthy()
    }
    expect(
      left
        .find((p) => p.name === 'wrapped_span')!
        .subtypeRanges![0]!.subtypeRanges!.map((p) => p.identity),
    ).toEqual(expected)
    const inner = left
      .find((p) => p.name === 'record_span')!
      .subtypeRanges!.find((p) => p.name === 'phase_span')!
    inner.subtypeEnum!.values.push('mutation')
    expect(
      left
        .find((p) => p.name === 'array_span')!
        .subtypeRanges!.find((p) => p.name === 'phase_span')!.subtypeEnum!.values,
    ).toEqual(['z', 'a'])
    expect(right).toEqual(saved)
    await first.exec(`ALTER TYPE "Hidden.Types".phase ADD VALUE 'mid' BEFORE 'a'`)
    const current = await readCatalogRangeTypes(first, ['Outer.Types'])
    for (const r of current.filter((p) => p.name !== 'wrapped_span'))
      expect(r.subtypeRanges!.find((p) => p.name === 'phase_span')!.subtypeEnum!.values).toEqual([
        'z',
        'mid',
        'a',
      ])
    expect(right).toEqual(saved)
    await second.exec('SET quote_all_identifiers=on')
    expect(await readCatalogRangeTypes(second, ['Outer.Types'])).toEqual(saved)
  } finally {
    await first.close()
    await second.close()
  }
}, 120_000)
