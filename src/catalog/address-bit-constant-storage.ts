import { scalar, type Tree } from './expression-tree.js'
import { storedReferenceBytes, storedVarlenaBody } from './constant-storage-bytes.js'

export interface NetworkStorageFamilies {
  ipv4: number
  ipv6: number
}
export type AddressBitConstantStorage =
  | { type: 'pg_catalog.inet' | 'pg_catalog.cidr'; value: string }
  | { type: 'pg_catalog.macaddr' | 'pg_catalog.macaddr8'; value: string }
  | { type: 'pg_catalog."bit"' | 'pg_catalog.varbit'; value: string }

const hostBitsZero = (bytes: Buffer, prefix: number): boolean => {
  for (let bit = prefix; bit < bytes.length * 8; bit++)
    if (bytes[Math.floor(bit / 8)]! & (128 >>> (bit % 8))) return false
  return true
}
export function validAddressBitConstantStorage(value: unknown): value is AddressBitConstantStorage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const object = value as Record<string, unknown>,
    type = object['type'],
    text = object['value']
  if (typeof text !== 'string') return false
  if (type === 'pg_catalog."bit"' || type === 'pg_catalog.varbit')
    return text.length <= 2147483640 && !/[^01]/u.test(text)
  if (type === 'pg_catalog.macaddr' || type === 'pg_catalog.macaddr8')
    return (
      type === 'pg_catalog.macaddr'
        ? /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/u
        : /^[0-9a-f]{2}(?::[0-9a-f]{2}){7}$/u
    ).test(text)
  if (type !== 'pg_catalog.inet' && type !== 'pg_catalog.cidr') return false
  const parts = text.split('/'),
    address = parts[0]!,
    prefix = Number(parts[1])
  if (parts.length !== 2 || !/^(?:0|[1-9][0-9]*)$/u.test(parts[1]!) || prefix > 128) return false
  let bytes: Buffer
  if (address.includes('.')) {
    const octets = address.split('.')
    if (
      prefix > 32 ||
      octets.length !== 4 ||
      octets.some((s) => !/^(?:0|[1-9][0-9]{0,2})$/u.test(s) || +s > 255)
    )
      return false
    bytes = Buffer.from(octets.map(Number))
  } else {
    if (!/^[0-9a-f]{4}(?::[0-9a-f]{4}){7}$/u.test(address)) return false
    bytes = Buffer.from(address.replaceAll(':', ''), 'hex')
  }
  return type === 'pg_catalog.inet' || hostBitsZero(bytes, prefix)
}

export function storedAddressBitConstant(
  node: Tree,
  type: AddressBitConstantStorage['type'],
  byteOrder: 'little' | 'big',
  families?: NetworkStorageFamilies,
): AddressBitConstantStorage | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  if (type === 'pg_catalog.macaddr' || type === 'pg_catalog.macaddr8') {
    const bytes = storedReferenceBytes(node, type === 'pg_catalog.macaddr' ? 6 : 8)
    return bytes
      ? { type, value: [...bytes].map((n) => n.toString(16).padStart(2, '0')).join(':') }
      : undefined
  }
  const body = storedVarlenaBody(node, byteOrder)
  if (!body) return undefined
  if (type === 'pg_catalog."bit"' || type === 'pg_catalog.varbit') {
    if (body.length < 4) return undefined
    const count = byteOrder === 'little' ? body.readInt32LE() : body.readInt32BE(),
      bytes = body.subarray(4)
    if (
      count < 0 ||
      count > 2147483640 ||
      Math.ceil(count / 8) !== bytes.length ||
      (count % 8 !== 0 && (bytes.at(-1)! & ((1 << (8 - (count % 8))) - 1)) !== 0)
    )
      return undefined
    const value = [...bytes]
      .map((n) => n.toString(2).padStart(8, '0'))
      .join('')
      .slice(0, count)
    return { type, value }
  }
  if (
    !families ||
    ![families.ipv4, families.ipv6].every((v) => Number.isInteger(v) && v >= 0 && v <= 255) ||
    families.ipv4 === families.ipv6 ||
    body.length < 2
  )
    return undefined
  const width = body[0] === families.ipv4 ? 4 : body[0] === families.ipv6 ? 16 : 0,
    prefix = body[1]!
  if (!width || body.length !== 2 + width || prefix > width * 8) return undefined
  const bytes = body.subarray(2)
  if (type === 'pg_catalog.cidr' && !hostBitsZero(bytes, prefix)) return undefined
  const address =
    width === 4
      ? [...bytes].join('.')
      : Array.from({ length: 8 }, (_, i) =>
          bytes
            .readUInt16BE(i * 2)
            .toString(16)
            .padStart(4, '0'),
        ).join(':')
  return { type, value: address + '/' + prefix }
}
