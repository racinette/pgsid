import type { PGlite } from '@electric-sql/pglite'
import type { CatalogSnapshot } from '../../src/catalog/types.js'
import { catalogRangeType } from '../../src/sql-semantics/catalog-check-binder.js'
import { rangeTypeProfile, type RangeProfile } from '../../src/sql-semantics/range-profiles.js'
import type { Row, Outcome } from '../../tools/check-rust/parity.js'
import { readRangeFixture, rangeBoundCell, rangeBoundProjection } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

export const customRangeSchema = `
CREATE SCHEMA "Custom.Range";
CREATE TYPE "Custom.Range".integer_span AS RANGE(subtype=int4,multirange_type_name=integer_set);
CREATE TYPE "Custom.Range".big_span AS RANGE(subtype=int8,multirange_type_name=big_set);
CREATE TYPE "Custom.Range".decimal_span AS RANGE(subtype=numeric,multirange_type_name=decimal_set);
CREATE TYPE "Custom.Range".day_span AS RANGE(subtype=date,multirange_type_name=day_set);
CREATE TYPE "Custom.Range".clock_span AS RANGE(subtype=timestamp,multirange_type_name=clock_set);
CREATE TYPE "Custom.Range".instant_span AS RANGE(subtype=timestamptz,multirange_type_name=instant_set);
CREATE DOMAIN "Custom.Range".positive AS int4 CHECK(VALUE>0);
CREATE TYPE "Custom.Range".positive_span AS RANGE(subtype="Custom.Range".positive,multirange_type_name=positive_set);
CREATE TYPE "Custom.Range".discrete_span;
CREATE FUNCTION "Custom.Range".canonical("Custom.Range".discrete_span) RETURNS "Custom.Range".discrete_span AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
CREATE TYPE "Custom.Range".discrete_span AS RANGE(subtype=int4,canonical="Custom.Range".canonical,multirange_type_name=discrete_set);
CREATE FUNCTION "Custom.Range".reverse(int4,int4) RETURNS int4 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT btint4cmp($2,$1)';
CREATE OPERATOR CLASS "Custom.Range".reverse_ops FOR TYPE int4 USING btree AS
OPERATOR 1 >,OPERATOR 2 >=,OPERATOR 3 =,OPERATOR 4 <=,OPERATOR 5 <,FUNCTION 1 "Custom.Range".reverse(int4,int4);
CREATE TYPE "Custom.Range".reverse_span AS RANGE(subtype=int4,subtype_opclass="Custom.Range".reverse_ops,multirange_type_name=reverse_set);
CREATE TYPE "Custom.Range".opaque_span;
CREATE FUNCTION "Custom.Range".opaque_canonical("Custom.Range".opaque_span) RETURNS "Custom.Range".opaque_span AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
CREATE TYPE "Custom.Range".opaque_span AS RANGE(subtype=int4,canonical="Custom.Range".opaque_canonical,multirange_type_name=opaque_set);
CREATE OR REPLACE FUNCTION "Custom.Range".opaque_canonical("Custom.Range".opaque_span) RETURNS "Custom.Range".opaque_span LANGUAGE plpgsql IMMUTABLE STRICT AS $$
BEGIN
 IF upper($1)-lower($1)>4 THEN RAISE EXCEPTION 'wide hull' USING ERRCODE='22000'; END IF;
 RETURN $1;
END
$$;
CREATE TYPE "Custom.Range".words AS RANGE(subtype=text,collation="C");
`

export function customRangeProfiles(catalog: CatalogSnapshot): RangeProfile[] {
  return catalog.rangeTypes.flatMap((info) => {
    const type = catalogRangeType(info.identity, undefined, catalog.domains, catalog.rangeTypes)
    return type ? [rangeTypeProfile(type)!] : []
  })
}

export type CustomRangeSample = {
  v: string | null
  w: string | null
  m: string | null
  n: string | null
  e: string | null
  bypass: boolean
}

export function customRangeSamples(profile: RangeProfile): CustomRangeSample[] {
  const temporal = ['pg_catalog.date', 'pg_catalog."timestamp"', 'pg_catalog.timestamptz'].includes(
    profile.elementType,
  )
  const suffix = profile.elementType === 'pg_catalog.timestamptz' ? ' 00:00:00+00' : ''
  const [a, b, c] = temporal
    ? ['2000-01-01', '2000-01-03', '2000-01-05'].map((v) => v + suffix)
    : ['1', '3', '5']
  return [
    { v: null, w: null, m: null, n: null, e: null, bypass: false },
    { v: 'empty', w: '(,)', m: '{}', n: '{(,)}', e: a!, bypass: false },
    { v: '(,)', w: 'empty', m: '{(,)}', n: '{}', e: null, bypass: true },
    {
      v: `[${a},${b}]`,
      w: `[${b},${c})`,
      m: `{[${a},${b}],[${c},${c}]}`,
      n: `{[${b},${c})}`,
      e: b!,
      bypass: false,
    },
    {
      v: `[${a},${c}]`,
      w: `(${a},${b})`,
      m: `{[${a},${c}]}`,
      n: `{(${a},${b})}`,
      e: a!,
      bypass: false,
    },
    {
      v: `[${a},${b})`,
      w: `[${a},${b})`,
      m: `{[${a},${b})}`,
      n: `{[${a},${b})}`,
      e: c!,
      bypass: true,
    },
    {
      v: `[${a},${a})`,
      w: `[${b},${c})`,
      m: `{[${a},${a}),[${b},${c})}`,
      n: '{}',
      e: a!,
      bypass: false,
    },
  ]
}

export async function customRangeRow(
  pg: PGlite,
  profile: RangeProfile,
  sample: CustomRangeSample,
): Promise<Row> {
  const v = await readRangeFixture(
    pg,
    `SELECT $1::${profile.identity} span`,
    'span',
    profile.rangeType,
    [sample.v],
  )
  const w = await readRangeFixture(
    pg,
    `SELECT $1::${profile.identity} span`,
    'span',
    profile.rangeType,
    [sample.w],
  )
  const m = await readMultirangeFixture(pg, profile.multirangeType, sample.m)
  const n = await readMultirangeFixture(pg, profile.multirangeType, sample.n)
  const projected = (
    await pg.query<{ value: string | null }>(
      `SELECT ${rangeBoundProjection('$1::' + profile.elementType, profile.elementType)} AS value`,
      [sample.e],
    )
  ).rows[0]!.value
  const cell = rangeBoundCell(profile.elementType, projected)
  return {
    v: v === null ? { kind: 'Null' } : { kind: 'Value', value: v },
    w: w === null ? { kind: 'Null' } : { kind: 'Value', value: w },
    m: m === null ? { kind: 'Null' } : { kind: 'Value', value: m },
    n: n === null ? { kind: 'Null' } : { kind: 'Value', value: n },
    e:
      cell.kind === 'Null' || cell.kind === 'Unknown'
        ? { kind: cell.kind }
        : cell.kind === 'Error'
          ? cell
          : { kind: 'Value', value: 'value' in cell ? cell.value : '' },
    bypass: { kind: 'Value', value: sample.bypass },
  }
}

export async function nativeCustomRangeOutcome(
  pg: PGlite,
  sql: string,
  parameters: unknown[],
): Promise<Outcome> {
  try {
    const value = (await pg.query<{ value: boolean | null }>(sql, parameters)).rows[0]!.value
    return { kind: value === null ? 'Null' : value ? 'True' : 'False' }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string')
      return { kind: 'Error', value: { state: parseInt(error.code, 36) } }
    throw error
  }
}
