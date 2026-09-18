export const typescriptTextHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  sqlTextError: {
    dependencies: [],
    source: `function sqlTextError(code: string): never {
  throw Object.assign(new Error('PostgreSQL text operation failed'), { code })
}`,
  },
  bpcharText: {
    dependencies: [],
    source: `function bpcharText(value: string | null): string | null {
  if (value === null) return null
  return value.replace(/ +$/u, '')
}`,
  },
  booleanText: {
    dependencies: [],
    source: `function booleanText(value: boolean | null): string | null {
  if (value === null) return null
  return value ? 'true' : 'false'
}`,
  },
  varcharCoerce: {
    dependencies: ['sqlTextError'],
    source: `function varcharCoerce(
  value: string | null,
  typmod: bigint | null,
  explicit: boolean | null,
): string | null {
  if (value === null || typmod === null || explicit === null) return null
  const limit = Number(typmod) - 4
  if (limit < 0) return value
  const characters = Array.from(value)
  if (
    characters.length > limit &&
    !explicit &&
    characters.slice(limit).some((character) => character !== ' ')
  )
    sqlTextError('22001')
  return characters.slice(0, limit).join('')
}`,
  },
  bpcharCoerce: {
    dependencies: ['sqlTextError', 'textOctetLength'],
    source: `function bpcharCoerce(
  value: string | null,
  typmod: bigint | null,
  explicit: boolean | null,
): string | null {
  if (value === null || typmod === null || explicit === null) return null
  const limit = Number(typmod) - 4
  if (limit < 0) return value
  const characters = Array.from(value)
  if (
    characters.length < limit &&
    Number(textOctetLength(value)!) + limit - characters.length > 1073741819
  )
    sqlTextError('XX000')
  if (
    characters.length > limit &&
    !explicit &&
    characters.slice(limit).some((character) => character !== ' ')
  )
    sqlTextError('22001')
  return (
    characters.slice(0, limit).join('') + ' '.repeat(Math.max(0, limit - characters.length))
  )
}`,
  },
  bpcharLength: {
    dependencies: [],
    source: `function bpcharLength(value: string | null): bigint | null {
  if (value === null) return null
  return BigInt(Array.from(value.replace(/ +$/u, '')).length)
}`,
  },
  bpcharEq: {
    dependencies: ['bpcharText', 'textEq'],
    source: `function bpcharEq(left: string | null, right: string | null): boolean | null {
  return textEq(bpcharText(left), bpcharText(right))
}`,
  },
  bpcharNe: {
    dependencies: ['bpcharText', 'textNe'],
    source: `function bpcharNe(left: string | null, right: string | null): boolean | null {
  return textNe(bpcharText(left), bpcharText(right))
}`,
  },
  bpcharLt: {
    dependencies: ['bpcharText', 'textLt'],
    source: `function bpcharLt(left: string | null, right: string | null): boolean | null {
  return textLt(bpcharText(left), bpcharText(right))
}`,
  },
  bpcharLe: {
    dependencies: ['bpcharText', 'textLe'],
    source: `function bpcharLe(left: string | null, right: string | null): boolean | null {
  return textLe(bpcharText(left), bpcharText(right))
}`,
  },
  bpcharGt: {
    dependencies: ['bpcharText', 'textGt'],
    source: `function bpcharGt(left: string | null, right: string | null): boolean | null {
  return textGt(bpcharText(left), bpcharText(right))
}`,
  },
  bpcharGe: {
    dependencies: ['bpcharText', 'textGe'],
    source: `function bpcharGe(left: string | null, right: string | null): boolean | null {
  return textGe(bpcharText(left), bpcharText(right))
}`,
  },
  sqlTextSubstring: {
    dependencies: ['sqlTextError'],
    source: `function sqlTextSubstring(value: string, start: number, length: number | null): string {
  if (length !== null && length < 0) sqlTextError('22011')
  const characters = Array.from(value)
  const first = Math.max(start, 1) - 1
  const end =
    length === null || start + length > 2147483647
      ? characters.length
      : Math.max(0, start + length - 1)
  return characters.slice(first, Math.max(first, end)).join('')
}`,
  },
  textSubstring: {
    dependencies: ['sqlTextSubstring'],
    source: `function textSubstring(value: string | null, start: bigint | null): string | null {
  if (value === null || start === null) return null
  return sqlTextSubstring(value, Number(start), null)
}`,
  },
  textSubstringLength: {
    dependencies: ['sqlTextSubstring'],
    source: `function textSubstringLength(
  value: string | null,
  start: bigint | null,
  length: bigint | null,
): string | null {
  if (value === null || start === null || length === null) return null
  return sqlTextSubstring(value, Number(start), Number(length))
}`,
  },
  textLeft: {
    dependencies: [],
    source: `function textLeft(value: string | null, count: bigint | null): string | null {
  if (value === null || count === null) return null
  const characters = Array.from(value),
    size = characters.length,
    n = Number(count)
  const amount = n < 0 ? Math.max(0, size + n) : Math.min(n, size)
  return characters.slice(0, amount).join('')
}`,
  },
  textRight: {
    dependencies: [],
    source: `function textRight(value: string | null, count: bigint | null): string | null {
  if (value === null || count === null) return null
  if (count === -2147483648n) return value
  const characters = Array.from(value),
    size = characters.length,
    n = Number(count)
  const amount = n < 0 ? Math.max(0, size + n) : Math.min(n, size)
  return characters.slice(size - amount).join('')
}`,
  },
  textTrimBoth: {
    dependencies: [],
    source: `function textTrimBoth(value: string | null, charactersToTrim: string | null): string | null {
  if (value === null || charactersToTrim === null) return null
  const characters = Array.from(value),
    trim = new Set(Array.from(charactersToTrim))
  let first = 0,
    last = characters.length
  while (first < last && trim.has(characters[first]!)) first++
  while (last > first && trim.has(characters[last - 1]!)) last--
  return characters.slice(first, last).join('')
}`,
  },
  textTrimBothSpace: {
    dependencies: ['textTrimBoth'],
    source: `function textTrimBothSpace(value: string | null): string | null {
  return textTrimBoth(value, ' ')
}`,
  },
  textTrimLeft: {
    dependencies: [],
    source: `function textTrimLeft(value: string | null, charactersToTrim: string | null): string | null {
  if (value === null || charactersToTrim === null) return null
  const characters = Array.from(value),
    trim = new Set(Array.from(charactersToTrim))
  let first = 0,
    last = characters.length
  while (first < last && trim.has(characters[first]!)) first++

  return characters.slice(first, last).join('')
}`,
  },
  textTrimLeftSpace: {
    dependencies: ['textTrimLeft'],
    source: `function textTrimLeftSpace(value: string | null): string | null {
  return textTrimLeft(value, ' ')
}`,
  },
  textTrimRight: {
    dependencies: [],
    source: `function textTrimRight(value: string | null, charactersToTrim: string | null): string | null {
  if (value === null || charactersToTrim === null) return null
  const characters = Array.from(value),
    trim = new Set(Array.from(charactersToTrim))
  let first = 0,
    last = characters.length

  while (last > first && trim.has(characters[last - 1]!)) last--
  return characters.slice(first, last).join('')
}`,
  },
  textTrimRightSpace: {
    dependencies: ['textTrimRight'],
    source: `function textTrimRightSpace(value: string | null): string | null {
  return textTrimRight(value, ' ')
}`,
  },
  textReplace: {
    dependencies: [],
    source: `function textReplace(
  value: string | null,
  search: string | null,
  replacement: string | null,
): string | null {
  if (value === null || search === null || replacement === null) return null
  return search === '' ? value : value.split(search).join(replacement)
}`,
  },
  textTranslate: {
    dependencies: [],
    source: `function textTranslate(
  value: string | null,
  from: string | null,
  to: string | null,
): string | null {
  if (value === null || from === null || to === null) return null
  const source = Array.from(from),
    target = Array.from(to)
  return Array.from(value, (character) => {
    const index = source.indexOf(character)
    return index < 0 ? character : (target[index] ?? '')
  }).join('')
}`,
  },
  textPosition: {
    dependencies: [],
    source: `function textPosition(value: string | null, search: string | null): bigint | null {
  if (value === null || search === null) return null
  const index = value.indexOf(search)
  return index < 0 ? 0n : BigInt(Array.from(value.slice(0, index)).length + 1)
}`,
  },
  textStartsWith: {
    dependencies: [],
    source: `function textStartsWith(value: string | null, prefix: string | null): boolean | null {
  if (value === null || prefix === null) return null
  return value.startsWith(prefix)
}`,
  },
  textSplitPart: {
    dependencies: ['sqlTextError'],
    source: `function textSplitPart(
  value: string | null,
  separator: string | null,
  field: bigint | null,
): string | null {
  if (value === null || separator === null || field === null) return null
  if (field === 0n) sqlTextError('22023')
  const fields = separator === '' ? [value] : value.split(separator)
  const index = field > 0n ? Number(field) - 1 : fields.length + Number(field)
  return fields[index] ?? ''
}`,
  },
  textReverse: {
    dependencies: [],
    source: `function textReverse(value: string | null): string | null {
  if (value === null) return null
  return Array.from(value).reverse().join('')
}`,
  },
  textAscii: {
    dependencies: [],
    source: `function textAscii(value: string | null): bigint | null {
  if (value === null) return null
  return BigInt(value.codePointAt(0) ?? 0)
}`,
  },
  textBitLength: {
    dependencies: ['textOctetLength', 'sqlTextError'],
    source: `function textBitLength(value: string | null): bigint | null {
  if (value === null) return null
  const length = textOctetLength(value)! * 8n
  if (length > 2147483647n) sqlTextError('22003')
  return length
}`,
  },
  textRepeat: {
    dependencies: ['textOctetLength', 'sqlTextError'],
    source: `function textRepeat(value: string | null, count: bigint | null): string | null {
  if (value === null || count === null) return null
  const times = Math.max(0, Number(count))
  if (Number(textOctetLength(value)!) * times > 1073741819) sqlTextError('54000')
  return value === '' ? '' : value.repeat(times)
}`,
  },
  textPadLeft: {
    dependencies: ['sqlTextError'],
    source: `function textPadLeft(
  value: string | null,
  count: bigint | null,
  fill: string | null,
): string | null {
  if (value === null || count === null || fill === null) return null
  const characters = Array.from(value),
    padding = Array.from(fill)
  let size = Math.max(0, Number(count))
  if (padding.length === 0) size = Math.min(size, characters.length)
  if (size * 4 > 1073741819) sqlTextError('54000')
  const source = characters.slice(0, size).join('')
  const needed = Math.max(0, size - characters.length)
  const extra =
    padding.length === 0
      ? ''
      : fill.repeat(Math.floor(needed / padding.length)) +
        padding.slice(0, needed % padding.length).join('')
  return extra + source
}`,
  },
  textPadLeftSpace: {
    dependencies: ['textPadLeft'],
    source: `function textPadLeftSpace(value: string | null, count: bigint | null): string | null {
  return textPadLeft(value, count, ' ')
}`,
  },
  textPadRight: {
    dependencies: ['sqlTextError'],
    source: `function textPadRight(
  value: string | null,
  count: bigint | null,
  fill: string | null,
): string | null {
  if (value === null || count === null || fill === null) return null
  const characters = Array.from(value),
    padding = Array.from(fill)
  let size = Math.max(0, Number(count))
  if (padding.length === 0) size = Math.min(size, characters.length)
  if (size * 4 > 1073741819) sqlTextError('54000')
  const source = characters.slice(0, size).join('')
  const needed = Math.max(0, size - characters.length)
  const extra =
    padding.length === 0
      ? ''
      : fill.repeat(Math.floor(needed / padding.length)) +
        padding.slice(0, needed % padding.length).join('')
  return source + extra
}`,
  },
  textPadRightSpace: {
    dependencies: ['textPadRight'],
    source: `function textPadRightSpace(value: string | null, count: bigint | null): string | null {
  return textPadRight(value, count, ' ')
}`,
  },
  textOverlayLength: {
    dependencies: ['sqlTextSubstring', 'sqlTextError'],
    source: `function textOverlayLength(
  value: string | null,
  replacement: string | null,
  start: bigint | null,
  length: bigint | null,
): string | null {
  if (value === null || replacement === null || start === null || length === null) return null
  if (start <= 0n) sqlTextError('22011')
  const end = start + length
  if (end > 2147483647n || end < -2147483648n) sqlTextError('22003')
  return (
    sqlTextSubstring(value, 1, Number(start) - 1) +
    replacement +
    sqlTextSubstring(value, Number(end), null)
  )
}`,
  },
  textOverlay: {
    dependencies: ['textOverlayLength', 'textLength'],
    source: `function textOverlay(
  value: string | null,
  replacement: string | null,
  start: bigint | null,
): string | null {
  return textOverlayLength(value, replacement, start, textLength(replacement))
}`,
  },
}
