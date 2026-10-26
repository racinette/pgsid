import { scalar, type Tree } from './expression-tree.js'
import { storedReferenceBytes, storedVarlenaBody } from './constant-storage-bytes.js'

const types = [
  'pg_catalog.point',
  'pg_catalog.line',
  'pg_catalog.lseg',
  'pg_catalog.box',
  'pg_catalog.circle',
  'pg_catalog.path',
  'pg_catalog.polygon',
] as const
export type GeometryConstantType = (typeof types)[number]
export type GeometryConstantStorage = {
  type: GeometryConstantType
  words: readonly string[]
  closed?: boolean
  bounds?: readonly string[]
}
export const isGeometryConstantType = (value: unknown): value is GeometryConstantType =>
  typeof value === 'string' && (types as readonly string[]).includes(value)
export function validGeometryConstantStorage(value: unknown): value is GeometryConstantStorage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const object = value as Record<string, unknown>,
    type = object['type'],
    words = object['words'],
    bounds = object['bounds'],
    closed = object['closed'],
    validWords = (words: unknown): words is readonly string[] =>
      Array.isArray(words) && words.every((w) => typeof w === 'string' && /^[0-9a-f]{16}$/u.test(w))
  if (!isGeometryConstantType(type) || !validWords(words)) return false
  if (type === 'pg_catalog.path' || type === 'pg_catalog.polygon')
    return (
      words.length >= 2 &&
      words.length % 2 === 0 &&
      (type === 'pg_catalog.path'
        ? typeof closed === 'boolean' && bounds === undefined
        : closed === undefined && validWords(bounds) && bounds.length === 4)
    )
  const count =
    type === 'pg_catalog.point'
      ? 2
      : type === 'pg_catalog.line' || type === 'pg_catalog.circle'
        ? 3
        : 4
  return words.length === count && bounds === undefined && closed === undefined
}
export function storedGeometryConstant(
  node: Tree,
  type: GeometryConstantType,
  byteOrder: 'little' | 'big',
): GeometryConstantStorage | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  const vector = type === 'pg_catalog.path' || type === 'pg_catalog.polygon',
    width =
      type === 'pg_catalog.point'
        ? 16
        : type === 'pg_catalog.line' || type === 'pg_catalog.circle'
          ? 24
          : 32,
    body = vector ? storedVarlenaBody(node, byteOrder) : storedReferenceBytes(node, width)
  if (!body) return undefined
  const read32 = (at: number) =>
      byteOrder === 'little' ? body.readInt32LE(at) : body.readInt32BE(at),
    word = (at: number) =>
      (byteOrder === 'little' ? body.readBigUInt64LE(at) : body.readBigUInt64BE(at))
        .toString(16)
        .padStart(16, '0'),
    words = (at: number, count: number) => Array.from({ length: count }, (_, i) => word(at + i * 8))
  if (!vector) return { type, words: words(0, width / 8) }
  const offset = type === 'pg_catalog.path' ? 12 : 36
  if (body.length < offset) return undefined
  const count = read32(0)
  if (count <= 0 || body.length !== offset + count * 16) return undefined
  if (type === 'pg_catalog.path') {
    const closed = read32(4)
    return closed === 0 || closed === 1
      ? { type, words: words(offset, count * 2), closed: closed === 1 }
      : undefined
  }
  return { type, words: words(offset, count * 2), bounds: words(4, 4) }
}
