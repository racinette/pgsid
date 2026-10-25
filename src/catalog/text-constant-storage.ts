import { scalar, type Tree } from './expression-tree.js'

export function storedTextConstant(
  node: Tree,
  utf8: boolean,
  byteOrder?: 'little' | 'big',
): string | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  if (
    scalar(node, 'constisnull') !== 'false' ||
    scalar(node, 'constbyval') !== 'false' ||
    scalar(node, 'constlen') !== '-1'
  )
    return undefined
  const stored = node.fields['constvalue']
  if (
    stored?.length !== 2 ||
    typeof stored[0] !== 'string' ||
    !/^\d+$/u.test(stored[0]) ||
    !Array.isArray(stored[1])
  )
    return undefined
  const length = Number(stored[0]),
    raw = stored[1]
  if (
    length < 1 ||
    raw.length !== length ||
    raw.some(
      (v) => typeof v !== 'string' || !/^-?\d+$/u.test(v) || Number(v) < -128 || Number(v) > 255,
    )
  )
    return undefined
  const bytes = Buffer.from(raw.map((v) => Number(v) & 255))
  let header = 0
  if (
    length >= 4 &&
    ((byteOrder !== 'big' &&
      (bytes.readUInt32LE(0) & 3) === 0 &&
      bytes.readUInt32LE(0) / 4 === length) ||
      (byteOrder !== 'little' &&
        bytes.readUInt32BE(0) < 1073741824 &&
        bytes.readUInt32BE(0) === length))
  )
    header = 4
  else if (
    length <= 127 &&
    ((byteOrder !== 'big' && (bytes[0]! & 1) === 1 && bytes[0]! >>> 1 === length) ||
      (byteOrder !== 'little' && (bytes[0]! & 128) !== 0 && (bytes[0]! & 127) === length))
  )
    header = 1
  if (!header) return undefined
  const body = bytes.subarray(header)
  if (!utf8 && body.some((byte) => byte > 127)) return undefined
  const text = body.toString('utf8')
  return text.includes('\0') || !Buffer.from(text, 'utf8').equals(body) ? undefined : text
}
