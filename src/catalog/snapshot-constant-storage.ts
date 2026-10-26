import { scalar, type Tree } from './expression-tree.js'
import { storedVarlenaBody } from './constant-storage-bytes.js'

const types = ['pg_catalog.pg_snapshot', 'pg_catalog.txid_snapshot'] as const
export type SnapshotConstantType = (typeof types)[number]
export type SnapshotConstantStorage = {
  type: SnapshotConstantType
  xmin: string
  xmax: string
  xip: readonly string[]
}
export const isSnapshotConstantType = (type: unknown): type is SnapshotConstantType =>
  typeof type === 'string' && (types as readonly string[]).includes(type)
export function validSnapshotConstantStorage(value: unknown): value is SnapshotConstantStorage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const object = value as Record<string, unknown>,
    xmin = object['xmin'],
    xmax = object['xmax'],
    xip = object['xip'],
    word = (value: unknown): value is string =>
      typeof value === 'string' &&
      value.length <= 20 &&
      /^[1-9][0-9]*$/u.test(value) &&
      BigInt(value) <= 18446744073709551615n
  if (
    !isSnapshotConstantType(object['type']) ||
    !word(xmin) ||
    !word(xmax) ||
    BigInt(xmin) % 4294967296n === 0n ||
    BigInt(xmax) % 4294967296n === 0n ||
    BigInt(xmin) > BigInt(xmax) ||
    !Array.isArray(xip) ||
    xip.length > 134217724
  )
    return false
  let previous = 0n
  for (const value of xip) {
    if (
      !word(value) ||
      BigInt(value) < BigInt(xmin) ||
      BigInt(value) > BigInt(xmax) ||
      BigInt(value) <= previous
    )
      return false
    previous = BigInt(value)
  }
  return true
}
export function storedSnapshotConstant(
  node: Tree,
  type: SnapshotConstantType,
  byteOrder: 'little' | 'big',
): SnapshotConstantStorage | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  const body = storedVarlenaBody(node, byteOrder)
  if (!body || body.length < 20) return undefined
  const count = byteOrder === 'little' ? body.readUInt32LE(0) : body.readUInt32BE(0)
  if (count > 134217724 || body.length !== 20 + count * 8) return undefined
  const word = (at: number) =>
      (byteOrder === 'little' ? body.readBigUInt64LE(at) : body.readBigUInt64BE(at)).toString(),
    value = {
      type,
      xmin: word(4),
      xmax: word(12),
      xip: Array.from({ length: count }, (_, i) => word(20 + i * 8)),
    }
  return validSnapshotConstantStorage(value) ? value : undefined
}
