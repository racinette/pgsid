import { scalar, type Tree } from './expression-tree.js'

export type BinaryConstantStorage =
  { type: 'pg_catalog.bytea'; value: string } | { type: 'pg_catalog.uuid'; value: string }

export function validBinaryConstantStorage(value: unknown): value is BinaryConstantStorage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const object = value as Record<string, unknown>,
    text = object['value']
  if (typeof text !== 'string') return false
  return object['type'] === 'pg_catalog.bytea'
    ? text.length % 2 === 0 && !/[^0-9a-f]/u.test(text)
    : object['type'] === 'pg_catalog.uuid' &&
        /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u.test(text)
}

export function storedBinaryConstant(
  node: Tree,
  type: BinaryConstantStorage['type'],
  byteOrder: 'little' | 'big',
): BinaryConstantStorage | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  if (
    scalar(node, 'constisnull') !== 'false' ||
    scalar(node, 'constbyval') !== 'false' ||
    scalar(node, 'constlen') !== (type === 'pg_catalog.uuid' ? '16' : '-1')
  )
    return undefined
  const raw = node.fields['constvalue'],
    data = raw?.[1]
  if (
    raw?.length !== 2 ||
    typeof raw[0] !== 'string' ||
    !/^\d+$/u.test(raw[0]) ||
    !Array.isArray(data) ||
    Number(raw[0]) !== data.length ||
    data.some((v) => typeof v !== 'string' || !/^-?\d+$/u.test(v) || +v < -128 || +v > 255)
  )
    return undefined
  const bytes = Buffer.from(data.map((v) => Number(v) & 255))
  if (type === 'pg_catalog.uuid') {
    if (bytes.length !== 16) return undefined
    const hex = bytes.toString('hex')
    return {
      type,
      value: [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
      ].join('-'),
    }
  }
  let header = 0
  if (
    bytes.length >= 4 &&
    (byteOrder === 'little'
      ? (bytes.readUInt32LE(0) & 3) === 0 && bytes.readUInt32LE(0) / 4 === bytes.length
      : bytes.readUInt32BE(0) < 1073741824 && bytes.readUInt32BE(0) === bytes.length)
  )
    header = 4
  else if (
    bytes.length > 0 &&
    bytes.length <= 127 &&
    (byteOrder === 'little'
      ? (bytes[0]! & 1) === 1 && bytes[0]! >>> 1 === bytes.length
      : (bytes[0]! & 128) !== 0 && (bytes[0]! & 127) === bytes.length)
  )
    header = 1
  return header ? { type, value: bytes.subarray(header).toString('hex') } : undefined
}
