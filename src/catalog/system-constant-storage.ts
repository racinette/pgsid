import { scalar, type Tree } from './expression-tree.js'
import { storedReferenceBytes } from './constant-storage-bytes.js'

const types = [
  'pg_catalog.oid',
  'pg_catalog.xid',
  'pg_catalog.cid',
  'pg_catalog.xid8',
  'pg_catalog.pg_lsn',
  'pg_catalog.tid',
] as const
export type SystemConstantType = (typeof types)[number]
export type SystemConstantStorage = { type: SystemConstantType; value: string }
export const isSystemConstantType = (type: unknown): type is SystemConstantType =>
  typeof type === 'string' && (types as readonly string[]).includes(type)
export function validSystemConstantStorage(value: unknown): value is SystemConstantStorage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const object = value as Record<string, unknown>,
    type = object['type'],
    word = object['value']
  if (
    !isSystemConstantType(type) ||
    typeof word !== 'string' ||
    word.length > 20 ||
    !/^(?:0|[1-9][0-9]*)$/u.test(word)
  )
    return false
  return (
    BigInt(word) <=
    (type === 'pg_catalog.xid8' || type === 'pg_catalog.pg_lsn'
      ? 18446744073709551615n
      : type === 'pg_catalog.tid'
        ? 281474976710655n
        : 4294967295n)
  )
}
export function storedSystemConstant(
  node: Tree,
  type: SystemConstantType,
  byteOrder: 'little' | 'big',
): SystemConstantStorage | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  if (type === 'pg_catalog.tid') {
    const bytes = storedReferenceBytes(node, 6)
    if (!bytes) return undefined
    const word = (at: number) =>
      byteOrder === 'little' ? bytes.readUInt16LE(at) : bytes.readUInt16BE(at)
    return {
      type,
      value: ((BigInt(word(0)) * 65536n + BigInt(word(2))) * 65536n + BigInt(word(4))).toString(),
    }
  }
  const width = type === 'pg_catalog.xid8' || type === 'pg_catalog.pg_lsn' ? 8 : 4,
    raw = node.fields['constvalue'],
    data = raw?.[1]
  let bytes: Buffer | undefined
  if (scalar(node, 'constbyval') === 'true') {
    if (
      scalar(node, 'constisnull') !== 'false' ||
      scalar(node, 'constlen') !== String(width) ||
      raw?.length !== 2 ||
      raw[0] !== String(width) ||
      !Array.isArray(data) ||
      ![4, 8].includes(data.length) ||
      data.length < width ||
      data.some((v) => typeof v !== 'string' || !/^[-]?\d+$/u.test(v) || +v < -128 || +v > 255)
    )
      return undefined
    const datum = Buffer.from(data.map((v) => Number(v) & 255))
    bytes = byteOrder === 'little' ? datum.subarray(0, width) : datum.subarray(datum.length - width)
  } else if (width === 8) bytes = storedReferenceBytes(node, 8)
  if (!bytes) return undefined
  const value =
    width === 8
      ? byteOrder === 'little'
        ? bytes.readBigUInt64LE()
        : bytes.readBigUInt64BE()
      : BigInt(byteOrder === 'little' ? bytes.readUInt32LE() : bytes.readUInt32BE())
  return { type, value: value.toString() }
}
