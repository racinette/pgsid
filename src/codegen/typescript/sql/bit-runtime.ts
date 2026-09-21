export const typescriptBitHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  bitInput: {
    dependencies: ['sqlTextError'],
    source: `function bitInput(value: string | null): string | null {
  if (value === null) return null
  if (value.length === 0) return ''
  const lead = value[0]!
  if (lead === 'x' || lead === 'X') {
    let out = ''
    for (let index = 1; index < value.length; index++) {
      const code = value.charCodeAt(index)
      const nibble =
        code >= 48 && code <= 57
          ? code - 48
          : code >= 65 && code <= 70
            ? code - 55
            : code >= 97 && code <= 102
              ? code - 87
              : -1
      if (nibble < 0) sqlTextError('22P02')
      out +=
        (nibble & 8 ? '1' : '0') +
        (nibble & 4 ? '1' : '0') +
        (nibble & 2 ? '1' : '0') +
        (nibble & 1 ? '1' : '0')
    }
    return out
  }
  const body = lead === 'b' || lead === 'B' ? value.slice(1) : value
  for (const bit of body) if (bit !== '0' && bit !== '1') sqlTextError('22P02')
  return body
}`,
  },
  bitPack: {
    dependencies: [],
    source: `function bitPack(value: string): Uint8Array {
  const out = new Uint8Array(Math.ceil(value.length / 8))
  for (let index = 0; index < value.length; index++)
    if (value[index] === '1') out[index >> 3]! |= 128 >> (index & 7)
  return out
}`,
  },
  bitCompare: {
    dependencies: ['bitPack'],
    source: `function bitCompare(left: string | null, right: string | null): bigint | null {
  if (left === null || right === null) return null
  const leftBytes = bitPack(left)
  const rightBytes = bitPack(right)
  const length = Math.min(leftBytes.length, rightBytes.length)
  for (let index = 0; index < length; index++) {
    const difference = leftBytes[index]! - rightBytes[index]!
    if (difference !== 0) return BigInt(difference)
  }
  if (left.length === right.length) return 0n
  return BigInt(left.length < right.length ? -1 : 1)
}`,
  },
  bitEq: {
    dependencies: ['bitCompare'],
    source: `function bitEq(left: string | null, right: string | null): boolean | null {
  const comparison = bitCompare(left, right)
  return comparison === null ? null : left!.length === right!.length && comparison === 0n
}`,
  },
  bitNe: {
    dependencies: ['bitCompare'],
    source: `function bitNe(left: string | null, right: string | null): boolean | null {
  const comparison = bitCompare(left, right)
  return comparison === null ? null : left!.length !== right!.length || comparison !== 0n
}`,
  },
  bitLt: {
    dependencies: ['bitCompare'],
    source: `function bitLt(left: string | null, right: string | null): boolean | null {
  const comparison = bitCompare(left, right)
  return comparison === null ? null : comparison < 0n
}`,
  },
  bitLe: {
    dependencies: ['bitCompare'],
    source: `function bitLe(left: string | null, right: string | null): boolean | null {
  const comparison = bitCompare(left, right)
  return comparison === null ? null : comparison <= 0n
}`,
  },
  bitGt: {
    dependencies: ['bitCompare'],
    source: `function bitGt(left: string | null, right: string | null): boolean | null {
  const comparison = bitCompare(left, right)
  return comparison === null ? null : comparison > 0n
}`,
  },
  bitGe: {
    dependencies: ['bitCompare'],
    source: `function bitGe(left: string | null, right: string | null): boolean | null {
  const comparison = bitCompare(left, right)
  return comparison === null ? null : comparison >= 0n
}`,
  },
  bitLength: {
    dependencies: [],
    source: `function bitLength(value: string | null): bigint | null {
  return value === null ? null : BigInt(value.length)
}`,
  },
  bitOctetLength: {
    dependencies: [],
    source: `function bitOctetLength(value: string | null): bigint | null {
  return value === null ? null : BigInt(Math.ceil(value.length / 8))
}`,
  },
  bitCount: {
    dependencies: [],
    source: `function bitCount(value: string | null): bigint | null {
  if (value === null) return null
  let count = 0
  for (const bit of value) if (bit === '1') count++
  return BigInt(count)
}`,
  },
  bitSameWidth: {
    dependencies: ['sqlTextError'],
    source: `function bitSameWidth(left: string, right: string): void {
  if (left.length !== right.length) sqlTextError('22026')
}`,
  },
  bitAnd: {
    dependencies: ['bitSameWidth'],
    source: `function bitAnd(left: string | null, right: string | null): string | null {
  if (left === null || right === null) return null
  bitSameWidth(left, right)
  let out = ''
  for (let index = 0; index < left.length; index++) out += left[index] === '1' && right[index] === '1' ? '1' : '0'
  return out
}`,
  },
  bitOr: {
    dependencies: ['bitSameWidth'],
    source: `function bitOr(left: string | null, right: string | null): string | null {
  if (left === null || right === null) return null
  bitSameWidth(left, right)
  let out = ''
  for (let index = 0; index < left.length; index++) out += left[index] === '1' || right[index] === '1' ? '1' : '0'
  return out
}`,
  },
  bitXor: {
    dependencies: ['bitSameWidth'],
    source: `function bitXor(left: string | null, right: string | null): string | null {
  if (left === null || right === null) return null
  bitSameWidth(left, right)
  let out = ''
  for (let index = 0; index < left.length; index++) out += left[index] === right[index] ? '0' : '1'
  return out
}`,
  },
  bitNot: {
    dependencies: [],
    source: `function bitNot(value: string | null): string | null {
  if (value === null) return null
  let out = ''
  for (const bit of value) out += bit === '1' ? '0' : '1'
  return out
}`,
  },
  bitShift: {
    dependencies: [],
    source: `function bitShift(value: string | null, amount: bigint | null, right: boolean): string | null {
  if (value === null || amount === null) return null
  let shift = Number(amount)
  if (shift < 0) {
    const magnitude = shift < -2147483640 ? 2147483640 : -shift
    return bitShift(value, BigInt(magnitude), !right)
  }
  if (shift >= value.length) return '0'.repeat(value.length)
  return right
    ? '0'.repeat(shift) + value.slice(0, value.length - shift)
    : value.slice(shift) + '0'.repeat(shift)
}`,
  },
  bitShiftLeft: {
    dependencies: ['bitShift'],
    source: `function bitShiftLeft(value: string | null, amount: bigint | null): string | null {
  return bitShift(value, amount, false)
}`,
  },
  bitShiftRight: {
    dependencies: ['bitShift'],
    source: `function bitShiftRight(value: string | null, amount: bigint | null): string | null {
  return bitShift(value, amount, true)
}`,
  },
  bitCat: {
    dependencies: [],
    source: `function bitCat(left: string | null, right: string | null): string | null {
  if (left === null || right === null) return null
  return left + right
}`,
  },
  bitSubstring: {
    dependencies: ['sqlTextError'],
    source: `function bitSubstring(value: string, start: number, length: number | null): string {
  if (length !== null && length < 0) sqlTextError('22011')
  const first = Math.max(start, 1)
  let end: number
  if (length === null) end = value.length + 1
  else {
    const sum = start + length
    end = sum > 2147483647 || sum < -2147483648 ? value.length + 1 : Math.min(sum, value.length + 1)
  }
  if (first > value.length || end <= first) return ''
  return value.slice(first - 1, end - 1)
}`,
  },
  bitSubstr: {
    dependencies: ['bitSubstring'],
    source: `function bitSubstr(value: string | null, start: bigint | null): string | null {
  if (value === null || start === null) return null
  return bitSubstring(value, Number(start), null)
}`,
  },
  bitSubstrLength: {
    dependencies: ['bitSubstring'],
    source: `function bitSubstrLength(value: string | null, start: bigint | null, length: bigint | null): string | null {
  if (value === null || start === null || length === null) return null
  return bitSubstring(value, Number(start), Number(length))
}`,
  },
  bitOverlayLength: {
    dependencies: ['bitSubstring', 'sqlTextError'],
    source: `function bitOverlayLength(
  value: string | null,
  replacement: string | null,
  start: bigint | null,
  length: bigint | null,
): string | null {
  if (value === null || replacement === null || start === null || length === null) return null
  if (start <= 0n) sqlTextError('22011')
  const end = start + length
  if (end > 2147483647n || end < -2147483648n) sqlTextError('22003')
  return bitSubstring(value, 1, Number(start) - 1) + replacement + bitSubstring(value, Number(end), null)
}`,
  },
  bitOverlay: {
    dependencies: ['bitOverlayLength', 'bitLength'],
    source: `function bitOverlay(value: string | null, replacement: string | null, start: bigint | null): string | null {
  return bitOverlayLength(value, replacement, start, bitLength(replacement))
}`,
  },
  bitPosition: {
    dependencies: [],
    source: `function bitPosition(value: string | null, search: string | null): bigint | null {
  if (value === null || search === null) return null
  if (value.length === 0 || search.length > value.length) return 0n
  if (search.length === 0) return 1n
  const index = value.indexOf(search)
  return index < 0 ? 0n : BigInt(index + 1)
}`,
  },
  bitGet: {
    dependencies: ['sqlTextError'],
    source: `function bitGet(value: string | null, index: bigint | null): bigint | null {
  if (value === null || index === null) return null
  const position = Number(index)
  if (position < 0 || position >= value.length) sqlTextError('2202E')
  return value[position] === '1' ? 1n : 0n
}`,
  },
  bitSet: {
    dependencies: ['sqlTextError'],
    source: `function bitSet(value: string | null, index: bigint | null, next: bigint | null): string | null {
  if (value === null || index === null || next === null) return null
  const position = Number(index)
  if (position < 0 || position >= value.length) sqlTextError('2202E')
  if (next !== 0n && next !== 1n) sqlTextError('22023')
  return value.slice(0, position) + (next === 1n ? '1' : '0') + value.slice(position + 1)
}`,
  },
  bitTypmod: {
    dependencies: ['sqlTextError'],
    source: `function bitTypmod(value: string | null, length: bigint | null, explicit: boolean | null): string | null {
  if (value === null || length === null || explicit === null) return null
  const limit = Number(length)
  if (limit <= 0 || limit > 2147483640 || limit === value.length) return value
  if (!explicit) sqlTextError('22026')
  return value.length > limit ? value.slice(0, limit) : value + '0'.repeat(limit - value.length)
}`,
  },
  varbitTypmod: {
    dependencies: ['sqlTextError'],
    source: `function varbitTypmod(value: string | null, length: bigint | null, explicit: boolean | null): string | null {
  if (value === null || length === null || explicit === null) return null
  const limit = Number(length)
  if (limit <= 0 || limit >= value.length) return value
  if (!explicit) sqlTextError('22001')
  return value.slice(0, limit)
}`,
  },
  bitFromInt: {
    dependencies: [],
    source: `function bitFromInt(value: bigint | null, width: bigint | null, sourceBits: number): string | null {
  if (value === null || width === null) return null
  let size = Number(width)
  if (size <= 0 || size > 2147483640) size = 1
  const kept = Math.min(size, sourceBits)
  let bits = ''
  for (let index = kept - 1; index >= 0; index--) bits += (value >> BigInt(index)) & 1n ? '1' : '0'
  if (size > kept) bits = (value < 0n ? '1' : '0').repeat(size - kept) + bits
  return bits
}`,
  },
  bitFromInt4: {
    dependencies: ['bitFromInt'],
    source: `function bitFromInt4(value: bigint | null, width: bigint | null): string | null {
  return bitFromInt(value, width, 32)
}`,
  },
  bitFromInt8: {
    dependencies: ['bitFromInt'],
    source: `function bitFromInt8(value: bigint | null, width: bigint | null): string | null {
  return bitFromInt(value, width, 64)
}`,
  },
  bitToInt: {
    dependencies: ['sqlTextError'],
    source: `function bitToInt(value: string | null, width: number): bigint | null {
  if (value === null) return null
  if (value.length > width) sqlTextError('22003')
  let result = 0n
  for (const bit of value) result = (result << 1n) | (bit === '1' ? 1n : 0n)
  const sign = 1n << BigInt(width - 1)
  return result >= sign ? result - (sign << 1n) : result
}`,
  },
  bitToInt4: {
    dependencies: ['bitToInt'],
    source: `function bitToInt4(value: string | null): bigint | null {
  return bitToInt(value, 32)
}`,
  },
  bitToInt8: {
    dependencies: ['bitToInt'],
    source: `function bitToInt8(value: string | null): bigint | null {
  return bitToInt(value, 64)
}`,
  },
}
