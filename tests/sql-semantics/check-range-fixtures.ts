import type { PGlite } from '@electric-sql/pglite'
import { rangeTypeProfile } from '../../src/sql-semantics/range-profiles.js'
import type { RangeType } from '../../src/sql-semantics/expressions.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import type { RangeInputCell, RangeInputPayload } from '../../tools/check-rust/range-input.js'

export function rangeCoreSamples(type: RangeType): {
  ranges: (string | null)[]
  elements: (string | null)[]
} {
  const subtype = rangeTypeProfile(type)!.elementType
  const temporal =
    subtype === 'pg_catalog.date' ||
    subtype === 'pg_catalog."timestamp"' ||
    subtype === 'pg_catalog.timestamptz'
  const offset = subtype === 'pg_catalog.timestamptz' ? ' 00:00:00+00' : ''
  const [a, b, c] = temporal
    ? ['2000-01-01' + offset, '2000-01-03' + offset, '2000-01-05' + offset]
    : ['1', '3', '5']
  const ranges: (string | null)[] = [
    null,
    'empty',
    '(,)',
    `(,${b})`,
    `[${a},)`,
    `[${a},${b})`,
    `(${a},${b})`,
    `[${a},${b}]`,
    `(${a},${b}]`,
    `[${b},${c})`,
    `(${b},${c}]`,
    `[${b},${b}]`,
    `[${a},${a})`,
  ]
  const elements: (string | null)[] = [null, a!, b!, c!]
  if (temporal) {
    ranges.push(
      '[-infinity,infinity]',
      '[infinity,infinity]',
      '[-infinity,-infinity]',
      '(,infinity)',
    )
    elements.push('-infinity', 'infinity')
  } else if (subtype === 'pg_catalog."numeric"') {
    ranges.push(
      '[1.0000,3.0000)',
      '[-0.00,1.2300]',
      '[NaN,NaN]',
      '[-Infinity,Infinity]',
      '[Infinity,NaN]',
    )
    elements.push('-0.00', '1.2300', 'NaN', '-Infinity', 'Infinity')
  } else if (subtype === 'pg_catalog.int8') {
    ranges.push('[-9223372036854775808,9223372036854775807)', '[9007199254740993,9007199254740999)')
    elements.push('-9223372036854775808', '9223372036854775807', '9007199254740993')
  } else {
    ranges.push('[-2147483648,2147483647)', '[2147483647,)')
    elements.push('-2147483648', '2147483647')
  }
  return { ranges, elements }
}

export function rangeBoundProjection(bound: string, subtype: string): string {
  if (subtype === 'pg_catalog.date')
    return `CASE WHEN ${bound}='-infinity'::date THEN '-2147483648' WHEN ${bound}='infinity'::date THEN '2147483647' ELSE (${bound}-DATE '2000-01-01')::text END`
  if (subtype === 'pg_catalog."timestamp"' || subtype === 'pg_catalog.timestamptz') {
    const send = subtype === 'pg_catalog.timestamptz' ? 'timestamptz_send' : 'timestamp_send'
    return `(('x'||encode(${send}(${bound}),'hex'))::bit(64)::bigint)::text`
  }
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
  const metadata = rangeTypeProfile(type)!
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
    ${rangeBoundProjection(`lower(${column})`, metadata.elementType)} AS lo,
    ${rangeBoundProjection(`upper(${column})`, metadata.elementType)} AS hi FROM (${select}) candidate`,
      parameters,
    )
  ).rows[0]!
  if (row.is_null) return null
  return {
    typeName: metadata.identity,
    elementType: metadata.subtype,
    elementKind: arrayElementFamily(metadata.elementType)!,
    empty: row.empty,
    lowerInclusive: row.lower_inc,
    upperInclusive: row.upper_inc,
    bounds: row.empty
      ? []
      : [
          rangeBoundCell(metadata.elementType, row.lo),
          rangeBoundCell(metadata.elementType, row.hi),
        ],
  }
}
