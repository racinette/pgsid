const MAX_SHARED_INDEX = 2147483647

function checkedIndex(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_SHARED_INDEX)
    throw new RangeError('index outside shared numeric range')
  return value
}

function checkedI32(value: number): number {
  if (!Number.isInteger(value) || value < -2147483648 || value > MAX_SHARED_INDEX)
    throw new RangeError('signed integer outside shared numeric range')
  return value
}

function checkedAdd(left: number, right: number): number {
  checkedIndex(left)
  checkedIndex(right)
  if (right > MAX_SHARED_INDEX - left) throw new RangeError('shared numeric overflow')
  return left + right
}

function checkedSubtract(left: number, right: number): number {
  checkedIndex(left)
  checkedIndex(right)
  if (right > left) throw new RangeError('shared numeric underflow')
  return left - right
}

function checkedChar(value: string): string {
  const points = Array.from(value)
  if (points.length !== 1 || (value.codePointAt(0)! >= 0xd800 && value.codePointAt(0)! <= 0xdfff))
    throw new RangeError('invalid Unicode scalar')
  return value
}

function asciiLowercase(value: string): string {
  const codepoint = checkedChar(value).codePointAt(0)!
  return codepoint >= 65 && codepoint <= 90 ? String.fromCodePoint(codepoint + 32) : value
}

function checkedString(value: string): string {
  if (value.length > MAX_SHARED_INDEX) throw new RangeError('string outside shared numeric range')
  for (const character of value) checkedChar(character)
  return value
}

function checkedChars(value: string[]): string[] {
  if (value.length > MAX_SHARED_INDEX) throw new RangeError('vector outside shared numeric range')
  return Array.from(value, checkedChar)
}

function checkedIndices(value: number[]): number[] {
  if (value.length > MAX_SHARED_INDEX) throw new RangeError('vector outside shared numeric range')
  return Array.from(value, checkedIndex)
}

function checkedIndexIn<T>(values: T[], index: number): number {
  checkedIndex(index)
  if (index >= values.length) throw new RangeError('index out of bounds')
  return index
}

function indexNumber(values: number[], index: number): number {
  return checkedIndex(values[checkedIndexIn(values, index)]!)
}

function pushIndex(values: number[], value: number): void {
  checkedAdd(values.length, 1)
  values.push(checkedIndex(value))
}

function pushChar(values: string[], value: string): void {
  checkedAdd(values.length, 1)
  values.push(checkedChar(value))
}

function indexChar(values: string[], index: number): string {
  if (!Number.isSafeInteger(index) || index < 0 || index >= values.length)
    throw new RangeError('index out of bounds')
  return values[index]!
}
