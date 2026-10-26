import { scalar, type Tree } from './expression-tree.js'
import { storedVarlenaBody } from './constant-storage-bytes.js'

export interface TsvectorConstantLexeme {
  text: string
  positions: readonly { position: number; weight: number }[]
}

export interface TsvectorConstantStorage {
  nativeBytes: number
  lexemeCount: number
  lexemes?: readonly TsvectorConstantLexeme[]
}

export function tsvectorConstantStorage(bytes: Buffer): TsvectorConstantStorage | undefined {
  const candidates: TsvectorConstantStorage[] = []
  for (const little of [true, false]) {
    let header = 0
    if (bytes.length >= 4) {
      const word = little ? bytes.readUInt32LE(0) : bytes.readUInt32BE(0)
      if (little ? (word & 3) === 0 && word / 4 === bytes.length : word === bytes.length) header = 4
    }
    if (!header && bytes.length <= 127 && bytes.length > 0) {
      const first = bytes[0]!
      if (
        little
          ? (first & 1) !== 0 && first >>> 1 === bytes.length
          : (first & 128) !== 0 && (first & 127) === bytes.length
      )
        header = 1
    }
    if (!header || bytes.length < header + 4) continue
    const count = little ? bytes.readInt32LE(header) : bytes.readInt32BE(header)
    const nativeBytes = bytes.length - header + 4
    if (count < 0 || count > 1048575 || nativeBytes < 8 + count * 4 || nativeBytes > 1073741823)
      continue
    candidates.push({ nativeBytes, lexemeCount: count })
  }
  return candidates.length &&
    candidates.every(
      (c) =>
        c.nativeBytes === candidates[0]!.nativeBytes &&
        c.lexemeCount === candidates[0]!.lexemeCount,
    )
    ? candidates[0]
    : undefined
}

export function validStoredTsvectorValue(
  input: unknown,
): input is TsvectorConstantStorage & { lexemes: readonly TsvectorConstantLexeme[] } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  const value = input as TsvectorConstantStorage
  if (
    !Array.isArray(value.lexemes) ||
    !Number.isInteger(value.nativeBytes) ||
    value.nativeBytes < 8 + value.lexemes.length * 4 ||
    value.nativeBytes > 1073741823 ||
    value.lexemes.length > 1048575 ||
    value.lexemeCount !== value.lexemes.length
  )
    return false
  let previous: Buffer | undefined,
    size = 0
  for (const lexeme of value.lexemes) {
    if (
      !lexeme ||
      typeof lexeme.text !== 'string' ||
      lexeme.text.includes('\0') ||
      !Array.isArray(lexeme.positions) ||
      lexeme.positions.length > 256
    )
      return false
    const text = Buffer.from(lexeme.text, 'utf8')
    if (
      !text.length ||
      text.length > 2047 ||
      text.toString('utf8') !== lexeme.text ||
      (previous && Buffer.compare(previous, text) > 0)
    )
      return false
    size += text.length
    if (lexeme.positions.length) size = Math.ceil(size / 2) * 2 + 2 + lexeme.positions.length * 2
    if (size > 1048575) return false
    previous = text
    let position = -1
    for (const word of lexeme.positions) {
      if (
        !word ||
        !Number.isInteger(word.position) ||
        word.position < position ||
        word.position < 0 ||
        word.position > 16383 ||
        !Number.isInteger(word.weight) ||
        word.weight < 0 ||
        word.weight > 3
      )
        return false
      position = word.position
    }
  }
  return true
}

export function storedTsvectorValue(
  node: Tree,
  byteOrder: 'little' | 'big',
  utf8: boolean,
): TsvectorConstantStorage | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  const body = storedVarlenaBody(node, byteOrder)
  if (!body || body.length < 4) return undefined
  const little = byteOrder === 'little',
    word = (at: number) => (little ? body.readUInt32LE(at) : body.readUInt32BE(at)),
    short = (at: number) => (little ? body.readUInt16LE(at) : body.readUInt16BE(at)),
    count = word(0),
    pool = 4 + count * 4
  if (count > 1048575 || pool > body.length) return undefined
  const lexemes: TsvectorConstantLexeme[] = []
  for (let i = 0; i < count; i++) {
    const bits = word(4 + i * 4),
      positioned = little ? (bits & 1) !== 0 : bits >= 2147483648,
      length = little ? (bits >>> 1) & 2047 : (bits >>> 20) & 2047,
      offset = little ? bits >>> 12 : bits & 1048575,
      end = pool + offset + length
    if (!length || end > body.length) return undefined
    const text = body.subarray(pool + offset, end)
    if (
      text.includes(0) ||
      (!utf8 && text.some((byte) => byte > 127)) ||
      !Buffer.from(text.toString('utf8')).equals(text)
    )
      return undefined
    const positions: { position: number; weight: number }[] = []
    if (positioned) {
      const start = pool + Math.ceil((offset + length) / 2) * 2
      if (start + 2 > body.length) return undefined
      const count = short(start)
      if (!count || count > 256 || start + 2 + count * 2 > body.length) return undefined
      for (let j = 0; j < count; j++) {
        const bits = short(start + 2 + j * 2)
        positions.push({ position: bits & 16383, weight: bits >>> 14 })
      }
    }
    lexemes.push({ text: text.toString('utf8'), positions })
  }
  const value = { nativeBytes: body.length + 4, lexemeCount: count, lexemes }
  return validStoredTsvectorValue(value) ? value : undefined
}
