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
  const sends: Record<string, readonly [string, number]> = {
    'pg_catalog.float4': ['float4send', 32],
    'pg_catalog.float8': ['float8send', 64],
    'pg_catalog."time"': ['time_send', 64],
    'pg_catalog.money': ['cash_send', 64],
    'pg_catalog.pg_lsn': ['pg_lsn_send', 64],
    'pg_catalog.tid': ['tidsend', 48],
  }
  const send = sends[subtype]
  if (send)
    return `(('x'||encode(${send[0]}(${bound}),'hex'))::bit(${send[1]})::${send[1] === 32 ? 'int4' : 'bigint'})::text`
  const records: Record<string, string> = {
    'pg_catalog.timetz': 'timetz_send',
    'pg_catalog."interval"': 'interval_send',
    'pg_catalog."char"': 'charsend',
    'pg_catalog.inet': 'inet_send',
    'pg_catalog.cidr': 'cidr_send',
    'pg_catalog.bpchar': 'bpcharsend',
    'pg_catalog.macaddr': 'macaddr_send',
    'pg_catalog.macaddr8': 'macaddr8_send',
    'pg_catalog.uuid': 'uuid_send',
  }
  if (records[subtype]) return `encode(${records[subtype]}(${bound}),'hex')`
  if (subtype === 'pg_catalog.bytea') return `encode(${bound},'hex')`
  return `${bound}::text`
}

export function rangeBoundCell(subtype: string, value: string | null): RangeInputCell {
  if (value === null) return { kind: 'Null' }
  if (['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.name'].includes(subtype))
    return { kind: 'Text', value }
  if (subtype === 'pg_catalog.bpchar')
    return { kind: 'Text', value: Buffer.from(value, 'hex').toString('utf8') }
  if (subtype === 'pg_catalog.int2') return { kind: 'Int2', value: Number(value) }
  if (subtype === 'pg_catalog.bool') return { kind: 'Bool', value: value === 'true' }
  if (subtype === 'pg_catalog."bit"' || subtype === 'pg_catalog.varbit')
    return { kind: 'Bit', value }
  if (subtype === 'pg_catalog.bytea') return { kind: 'Bytea', value }
  if (subtype === 'pg_catalog.float4') return { kind: 'Float4', value: Number(value) }
  if (subtype === 'pg_catalog.float8') return { kind: 'Float8', value: BigInt(value) }
  if (subtype === 'pg_catalog."time"') return { kind: 'Time', value: BigInt(value) }
  if (subtype === 'pg_catalog.money') return { kind: 'Money', value: BigInt(value) }
  if (subtype === 'pg_catalog.oid') return { kind: 'Oid', value: BigInt(value) }
  if (subtype === 'pg_catalog.xid8')
    return { kind: 'Xid8', value: BigInt.asIntN(64, BigInt(value)) }
  if (subtype === 'pg_catalog.pg_lsn') return { kind: 'PgLsn', value: BigInt(value) }
  if (subtype === 'pg_catalog.tid') return { kind: 'Tid', value: BigInt(value) }
  if (subtype === 'pg_catalog."char"') return { kind: 'InternalChar', value: parseInt(value, 16) }
  if (subtype === 'pg_catalog.timetz') {
    const bytes = Buffer.from(value, 'hex')
    return { kind: 'Timetz', value: { time: bytes.readBigInt64BE(0), zone: bytes.readInt32BE(8) } }
  }
  if (subtype === 'pg_catalog."interval"') {
    const bytes = Buffer.from(value, 'hex')
    return {
      kind: 'Interval',
      value: {
        time: bytes.readBigInt64BE(0),
        days: bytes.readInt32BE(8),
        months: bytes.readInt32BE(12),
      },
    }
  }
  if (
    [
      'pg_catalog.inet',
      'pg_catalog.cidr',
      'pg_catalog.macaddr',
      'pg_catalog.macaddr8',
      'pg_catalog.uuid',
    ].includes(subtype)
  ) {
    const source = Buffer.from(value, 'hex'),
      bytes = Buffer.alloc(16)
    source.copy(bytes, 0, subtype === 'pg_catalog.inet' || subtype === 'pg_catalog.cidr' ? 4 : 0)
    const words = {
      word0: bytes.readUInt16BE(0),
      word1: bytes.readUInt16BE(2),
      word2: bytes.readUInt16BE(4),
      word3: bytes.readUInt16BE(6),
      word4: bytes.readUInt16BE(8),
      word5: bytes.readUInt16BE(10),
      word6: bytes.readUInt16BE(12),
      word7: bytes.readUInt16BE(14),
    }
    if (subtype === 'pg_catalog.inet' || subtype === 'pg_catalog.cidr')
      return {
        kind: 'Network',
        value: { ...words, family: source[0] === 2 ? 4 : 6, prefix: source[1]! },
      }
    if (subtype === 'pg_catalog.uuid') return { kind: 'Uuid', value: words }
    return {
      kind: subtype === 'pg_catalog.macaddr' ? 'Macaddr' : 'Macaddr8',
      value: { word0: words.word0, word1: words.word1, word2: words.word2, word3: words.word3 },
    }
  }
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
