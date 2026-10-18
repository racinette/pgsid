import type { PGlite } from '@electric-sql/pglite'
import { builtinRangeType } from '../../src/postgres/builtins/inventory.js'
import type { RangeType } from '../../src/sql-semantics/expressions.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import type { RangeInputCell, RangeInputPayload } from '../../tools/check-rust/range-input.js'

export function rangeBoundProjection(bound: string, subtype: string): string {
  if (subtype === 'pg_catalog.date')
    return `CASE WHEN ${bound}='-infinity'::date THEN '-2147483648' WHEN ${bound}='infinity'::date THEN '2147483647' ELSE (${bound}-DATE '2000-01-01')::text END`
  if (subtype === 'pg_catalog."timestamp"' || subtype === 'pg_catalog.timestamptz')
    return `CASE WHEN ${bound}='-infinity'::${subtype} THEN '-9223372036854775808' WHEN ${bound}='infinity'::${subtype} THEN '9223372036854775807' ELSE (extract(epoch FROM ${bound})*1000000-946684800000000)::numeric(30,0)::text END`
  return `${bound}::text`
}

export function rangeBoundCell(subtype: string, value: string | null): RangeInputCell {
  if (value === null) return { kind: 'Null' }
  if (subtype === 'pg_catalog.int4') return { kind: 'Int4', value: Number(value) }
  if (subtype === 'pg_catalog.date') return { kind: 'Date', value: Number(value) }
  if (subtype === 'pg_catalog.int8') return { kind: 'Int8', value: BigInt(value) }
  if (subtype === 'pg_catalog."timestamp"') return { kind: 'Timestamp', value: BigInt(value) }
  if (subtype === 'pg_catalog.timestamptz') return { kind: 'Timestamptz', value: BigInt(value) }
  if (subtype === 'pg_catalog."numeric"') return { kind: 'Numeric', value }
  throw new Error('Unsupported range fixture subtype: ' + subtype)
}

export async function readRangeFixture(
  pg: PGlite,
  select: string,
  name: string,
  type: RangeType,
  parameters: unknown[] = [],
): Promise<RangeInputPayload | null> {
  const metadata = builtinRangeType(type)!
  const column = '"' + name.replaceAll('"', '""') + '"'
  const row = (
    await pg.query<{
      is_null: boolean
      empty: boolean
      lower_inc: boolean
      upper_inc: boolean
      lo: string | null
      hi: string | null
    }>(
      `SELECT ${column} IS NULL AS is_null,isempty(${column}) AS empty,lower_inc(${column}) AS lower_inc,upper_inc(${column}) AS upper_inc,
    ${rangeBoundProjection(`lower(${column})`, metadata.subtype)} AS lo,
    ${rangeBoundProjection(`upper(${column})`, metadata.subtype)} AS hi FROM (${select}) candidate`,
      parameters,
    )
  ).rows[0]!
  if (row.is_null) return null
  return {
    typeName: type,
    elementType: metadata.subtype,
    elementKind: arrayElementFamily(metadata.subtype)!,
    empty: row.empty,
    lowerInclusive: row.lower_inc,
    upperInclusive: row.upper_inc,
    bounds: row.empty
      ? []
      : [rangeBoundCell(metadata.subtype, row.lo), rangeBoundCell(metadata.subtype, row.hi)],
  }
}
