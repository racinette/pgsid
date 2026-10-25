import { scalar, type Tree } from './expression-tree.js'
import { storedReferenceBytes, storedVarlenaBody } from './constant-storage-bytes.js'

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
  const bytes =
    type === 'pg_catalog.uuid' ? storedReferenceBytes(node, 16) : storedVarlenaBody(node, byteOrder)
  if (!bytes) return undefined
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
  return { type, value: bytes.toString('hex') }
}
