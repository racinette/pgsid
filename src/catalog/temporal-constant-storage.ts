import { scalar, type Tree } from './expression-tree.js'

export type TemporalConstantStorage =
  | {
      type:
        | 'pg_catalog.date'
        | 'pg_catalog."timestamp"'
        | 'pg_catalog.timestamptz'
        | 'pg_catalog."time"'
      value: string
    }
  | { type: 'pg_catalog.timetz'; value: string; zone: number }
  | { type: 'pg_catalog."interval"'; value: string; days: number; months: number }

export function validTemporalConstantStorage(value: unknown): value is TemporalConstantStorage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const object = value as Record<string, unknown>,
    raw = object['value']
  if (typeof raw !== 'string' || raw.length > 20 || !/^(?:0|-?[1-9][0-9]*)$/u.test(raw))
    return false
  const number = BigInt(raw),
    integer = (key: string) =>
      Number.isInteger(object[key]) &&
      Number(object[key]) >= -2147483648 &&
      Number(object[key]) <= 2147483647
  switch (object['type']) {
    case 'pg_catalog.date':
      return (
        number === -2147483648n ||
        number === 2147483647n ||
        (number >= -2451552n && number < 2145031949n)
      )
    case 'pg_catalog."timestamp"':
      return (
        number === -9223372036854775808n ||
        number === 9223372036854775807n ||
        (number >= -211814092800000000n && number <= 9223371331200000000n)
      )
    case 'pg_catalog.timestamptz':
      return (
        number === -9223372036854775808n ||
        number === 9223372036854775807n ||
        (number >= -211813488000000000n && number <= 9223371331200000000n)
      )
    case 'pg_catalog."time"':
      return number >= 0n && number <= 86400000000n
    case 'pg_catalog.timetz':
      return number >= 0n && number <= 86400000000n && integer('zone')
    case 'pg_catalog."interval"':
      return (
        number >= -9223372036854775808n &&
        number <= 9223372036854775807n &&
        integer('days') &&
        integer('months')
      )
    default:
      return false
  }
}

export function storedTemporalConstant(
  node: Tree,
  type: string,
  byteOrder: 'little' | 'big',
): TemporalConstantStorage | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  const types: Record<string, TemporalConstantStorage['type']> = {
      'pg_catalog.date': 'pg_catalog.date',
      'pg_catalog.timestamp': 'pg_catalog."timestamp"',
      'pg_catalog.timestamptz': 'pg_catalog.timestamptz',
      'pg_catalog.time': 'pg_catalog."time"',
      'pg_catalog.timetz': 'pg_catalog.timetz',
      'pg_catalog.interval': 'pg_catalog."interval"',
    },
    identity = types[type.replaceAll('"', '')]
  if (!identity || scalar(node, 'constisnull') !== 'false') return undefined
  const length =
      identity === 'pg_catalog.date'
        ? 4
        : identity === 'pg_catalog.timetz'
          ? 12
          : identity === 'pg_catalog."interval"'
            ? 16
            : 8,
    raw = node.fields['constvalue'],
    data = raw?.[1],
    byval = scalar(node, 'constbyval')
  if (
    scalar(node, 'constlen') !== String(length) ||
    raw?.length !== 2 ||
    typeof raw[0] !== 'string' ||
    !/^\d+$/u.test(raw[0]) ||
    Number(raw[0]) !== length ||
    !Array.isArray(data) ||
    (byval === 'true'
      ? length > 8 || (data.length !== 4 && data.length !== 8) || data.length < length
      : byval !== 'false' || length === 4 || data.length !== length) ||
    data.some((v) => typeof v !== 'string' || !/^-?\d+$/u.test(v) || +v < -128 || +v > 255)
  )
    return undefined
  const stored = Buffer.from(data.map((v) => Number(v) & 255)),
    little = byteOrder === 'little',
    bytes = byval === 'true' && !little ? stored.subarray(stored.length - length) : stored,
    int = (offset: number) => (little ? bytes.readInt32LE(offset) : bytes.readInt32BE(offset)),
    value =
      length === 4
        ? String(int(0))
        : (little ? bytes.readBigInt64LE(0) : bytes.readBigInt64BE(0)).toString(),
    result = {
      type: identity,
      value,
      ...(identity === 'pg_catalog.timetz' ? { zone: int(8) } : {}),
      ...(identity === 'pg_catalog."interval"' ? { days: int(8), months: int(12) } : {}),
    }
  return validTemporalConstantStorage(result) ? result : undefined
}
