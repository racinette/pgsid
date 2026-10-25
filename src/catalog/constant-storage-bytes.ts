import { scalar, type Tree } from './expression-tree.js'

export function storedReferenceBytes(node: Tree, length: number): Buffer | undefined {
  if (
    scalar(node, 'constisnull') !== 'false' ||
    scalar(node, 'constbyval') !== 'false' ||
    scalar(node, 'constlen') !== String(length)
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
    (length >= 0 && data.length !== length) ||
    data.some((v) => typeof v !== 'string' || !/^-?\d+$/u.test(v) || +v < -128 || +v > 255)
  )
    return undefined
  return Buffer.from(data.map((v) => Number(v) & 255))
}

export function storedVarlenaBody(node: Tree, byteOrder: 'little' | 'big'): Buffer | undefined {
  const bytes = storedReferenceBytes(node, -1)
  if (!bytes) return undefined
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
  return header ? bytes.subarray(header) : undefined
}
