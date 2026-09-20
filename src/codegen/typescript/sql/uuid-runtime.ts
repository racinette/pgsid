export const typescriptUuidHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  SqlUuid: {
    dependencies: [],
    source: `class SqlUuid {
  constructor(readonly bytes: Uint8Array) {}
  toString(): string {
    const hex = Array.from(this.bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' +
      hex.slice(16, 20) + '-' + hex.slice(20)
  }
}`,
  },
  uuidInput: {
    dependencies: ['SqlUuid'],
    source: `function uuidInput(value: string | null): SqlUuid | null {
  if (value === null) return null
  let index = 0
  const braces = value[0] === '{'
  if (braces) index++
  const bytes = new Uint8Array(16)
  for (let i = 0; i < bytes.length; i++) {
    const pair = value.slice(index, index + 2)
    if (!/^[0-9a-f]{2}$/i.test(pair)) throw Object.assign(new Error('invalid input syntax for type uuid'), { code: '22P02' })
    bytes[i] = Number.parseInt(pair, 16)
    index += 2
    if (value[index] === '-' && i % 2 === 1 && i < bytes.length - 1) index++
  }
  if (braces) {
    if (value[index] !== '}') throw Object.assign(new Error('invalid input syntax for type uuid'), { code: '22P02' })
    index++
  }
  if (index !== value.length) throw Object.assign(new Error('invalid input syntax for type uuid'), { code: '22P02' })
  return new SqlUuid(bytes)
}`,
  },
  uuidText: {
    dependencies: ['SqlUuid'],
    source: `function uuidText(value: SqlUuid | null): string | null {
  return value === null ? null : value.toString()
}`,
  },
  uuidFromText: {
    dependencies: ['uuidInput'],
    source: `function uuidFromText(value: string | null): SqlUuid | null {
  return uuidInput(value)
}`,
  },
  uuidCompare: {
    dependencies: ['SqlUuid'],
    source: `function uuidCompare(left: SqlUuid | null, right: SqlUuid | null): bigint | null {
  if (left === null || right === null) return null
  for (let i = 0; i < 16; i++) {
    const difference = left.bytes[i]! - right.bytes[i]!
    if (difference !== 0) return BigInt(difference)
  }
  return 0n
}`,
  },
  uuidExtractVersion: {
    dependencies: ['SqlUuid'],
    source: `function uuidExtractVersion(value: SqlUuid | null): bigint | null {
  if (value === null || (value.bytes[8]! & 0xc0) !== 0x80) return null
  return BigInt(value.bytes[6]! >> 4)
}`,
  },
}

for (const [name, operator] of [
  ['Eq', '==='],
  ['Ne', '!=='],
  ['Lt', '<'],
  ['Le', '<='],
  ['Gt', '>'],
  ['Ge', '>='],
] as const) {
  typescriptUuidHelpers[`uuid${name}`] = {
    dependencies: ['uuidCompare'],
    source: `function uuid${name}(left: SqlUuid | null, right: SqlUuid | null): boolean | null {
  const comparison = uuidCompare(left, right)
  return comparison === null ? null : comparison ${operator} 0n
}`,
  }
}
