import { scalar, type Tree } from './expression-tree.js'

export function storedNumericConstant(
  node: Tree,
  byteOrder: 'little' | 'big',
): string | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  if (
    scalar(node, 'constisnull') !== 'false' ||
    scalar(node, 'constbyval') !== 'false' ||
    scalar(node, 'constlen') !== '-1'
  )
    return undefined
  const stored = node.fields['constvalue'],
    raw = stored?.[1]
  if (
    stored?.length !== 2 ||
    typeof stored[0] !== 'string' ||
    !/^\d+$/u.test(stored[0]) ||
    !Array.isArray(raw) ||
    Number(stored[0]) !== raw.length ||
    raw.some(
      (v) => typeof v !== 'string' || !/^-?\d+$/u.test(v) || Number(v) < -128 || Number(v) > 255,
    )
  )
    return undefined
  return numericStorageText(Buffer.from(raw.map((v) => Number(v) & 255)), byteOrder)
}

export function numericStorageText(bytes: Buffer, byteOrder: 'little' | 'big'): string | undefined {
  const little = byteOrder === 'little'
  let start = 0
  if (
    bytes.length >= 4 &&
    (little
      ? (bytes.readUInt32LE(0) & 3) === 0 && bytes.readUInt32LE(0) / 4 === bytes.length
      : bytes.readUInt32BE(0) < 1073741824 && bytes.readUInt32BE(0) === bytes.length)
  )
    start = 4
  else if (
    bytes.length > 0 &&
    bytes.length <= 127 &&
    (little
      ? (bytes[0]! & 1) === 1 && bytes[0]! >>> 1 === bytes.length
      : (bytes[0]! & 128) !== 0 && (bytes[0]! & 127) === bytes.length)
  )
    start = 1
  const body = bytes.subarray(start)
  if (!start || body.length < 2 || body.length % 2) return undefined
  const word = (at: number) => (little ? body.readUInt16LE(at) : body.readUInt16BE(at)),
    header = word(0),
    flags = header & 0xc000
  if (flags === 0xc000) {
    if (body.length !== 2 && !(header === 0xc000 && body.length === 4)) return undefined
    return { [0xc000]: 'NaN', [0xd000]: 'Infinity', [0xf000]: '-Infinity' }[header]
  }
  const short = flags === 0x8000,
    offset = short ? 2 : 4
  if (body.length < offset) return undefined
  const negative = (header & (short ? 0x2000 : 0x4000)) !== 0,
    scale = short ? (header & 0x1f80) >>> 7 : header & 0x3fff,
    weight = short
      ? (header & 0x3f) - (header & 0x40 ? 64 : 0)
      : little
        ? body.readInt16LE(2)
        : body.readInt16BE(2),
    digits: number[] = []
  for (let at = offset; at < body.length; at += 2) {
    const digit = word(at)
    if (digit > 9999) return undefined
    digits.push(digit)
  }
  if (digits.length && (!digits[0] || !digits.at(-1))) return undefined
  if (!digits.length) return '0' + (scale ? '.' + '0'.repeat(scale) : '')
  const coefficient = digits.map((digit) => digit.toString().padStart(4, '0')).join(''),
    point = (weight + 1) * 4,
    integer = point <= 0 ? '0' : coefficient.slice(0, point).padEnd(point, '0'),
    fraction = point < 0 ? '0'.repeat(-point) + coefficient : coefficient.slice(point)
  if (fraction.length > scale && /[1-9]/u.test(fraction.slice(scale))) return undefined
  return (
    (negative ? '-' : '') +
    integer.replace(/^0+(?=.)/u, '') +
    (scale ? '.' + fraction.slice(0, scale).padEnd(scale, '0') : '')
  )
}
