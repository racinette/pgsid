export const typescriptScalarHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  booleanInput: {
    dependencies: [],
    source: `function booleanInput(value: boolean | null): boolean | null { return value }`,
  },
  textInput: {
    dependencies: [],
    source: `function textInput(value: string | null): string | null { return value }`,
  },
  sqlBooleanNot: {
    dependencies: [],
    source: `function sqlBooleanNot(value: boolean | null): boolean | null { return value === null ? null : !value }`,
  },
  sqlBooleanAnd: {
    dependencies: [],
    source: `function sqlBooleanAnd(left: () => boolean | null, right: () => boolean | null): boolean | null {
  const a = left()
  if (a === false) return false
  const b = right()
  if (b === false) return false
  return a === null || b === null ? null : true
}`,
  },
  sqlBooleanOr: {
    dependencies: [],
    source: `function sqlBooleanOr(left: () => boolean | null, right: () => boolean | null): boolean | null {
  const a = left()
  if (a === true) return true
  const b = right()
  if (b === true) return true
  return a === null || b === null ? null : false
}`,
  },
  sqlIsNull: {
    dependencies: [],
    source: `function sqlIsNull(value: unknown): boolean { return value === null }`,
  },
  sqlIsNotNull: {
    dependencies: [],
    source: `function sqlIsNotNull(value: unknown): boolean { return value !== null }`,
  },
  sqlCase: {
    dependencies: [],
    source: `function sqlCase<T>(otherwise: () => T, ...branches: readonly (readonly [() => boolean | null, () => T])[]): T {
  for (const [when, then] of branches) if (when() === true) return then()
  return otherwise()
}`,
  },
  sqlCoalesce: {
    dependencies: [],
    source: `function sqlCoalesce<T>(...operands: readonly (() => T)[]): T | null {
  for (const operand of operands) { const value = operand(); if (value !== null) return value }
  return null
}`,
  },
  booleanEq: {
    dependencies: [],
    source: `function booleanEq(left: boolean | null, right: boolean | null): boolean | null { return left === null || right === null ? null : Number(left) === Number(right) }`,
  },
  textEq: {
    dependencies: ['sqlTextCompare'],
    source: `function textEq(left: string | null, right: string | null): boolean | null { return left === null || right === null ? null : sqlTextCompare(left, right) === 0 }`,
  },
  booleanNe: {
    dependencies: [],
    source: `function booleanNe(left: boolean | null, right: boolean | null): boolean | null { return left === null || right === null ? null : Number(left) !== Number(right) }`,
  },
  textNe: {
    dependencies: ['sqlTextCompare'],
    source: `function textNe(left: string | null, right: string | null): boolean | null { return left === null || right === null ? null : sqlTextCompare(left, right) !== 0 }`,
  },
  booleanLt: {
    dependencies: [],
    source: `function booleanLt(left: boolean | null, right: boolean | null): boolean | null { return left === null || right === null ? null : Number(left) < Number(right) }`,
  },
  textLt: {
    dependencies: ['sqlTextCompare'],
    source: `function textLt(left: string | null, right: string | null): boolean | null { return left === null || right === null ? null : sqlTextCompare(left, right) < 0 }`,
  },
  booleanLe: {
    dependencies: [],
    source: `function booleanLe(left: boolean | null, right: boolean | null): boolean | null { return left === null || right === null ? null : Number(left) <= Number(right) }`,
  },
  textLe: {
    dependencies: ['sqlTextCompare'],
    source: `function textLe(left: string | null, right: string | null): boolean | null { return left === null || right === null ? null : sqlTextCompare(left, right) <= 0 }`,
  },
  booleanGt: {
    dependencies: [],
    source: `function booleanGt(left: boolean | null, right: boolean | null): boolean | null { return left === null || right === null ? null : Number(left) > Number(right) }`,
  },
  textGt: {
    dependencies: ['sqlTextCompare'],
    source: `function textGt(left: string | null, right: string | null): boolean | null { return left === null || right === null ? null : sqlTextCompare(left, right) > 0 }`,
  },
  booleanGe: {
    dependencies: [],
    source: `function booleanGe(left: boolean | null, right: boolean | null): boolean | null { return left === null || right === null ? null : Number(left) >= Number(right) }`,
  },
  textGe: {
    dependencies: ['sqlTextCompare'],
    source: `function textGe(left: string | null, right: string | null): boolean | null { return left === null || right === null ? null : sqlTextCompare(left, right) >= 0 }`,
  },
  sqlTextCompare: {
    dependencies: [],
    source: `function sqlTextCompare(left: string, right: string): number {
  const a = Array.from(left), b = Array.from(right)
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const difference = a[i]!.codePointAt(0)! - b[i]!.codePointAt(0)!
    if (difference !== 0) return difference
  }
  return a.length - b.length
}`,
  },
  textLength: {
    dependencies: [],
    source: `function textLength(value: string | null): bigint | null { return value === null ? null : BigInt(Array.from(value).length) }`,
  },
  textOctetLength: {
    dependencies: [],
    source: `function textOctetLength(value: string | null): bigint | null {
  if (value === null) return null
  let length = 0
  for (const character of value) { const point = character.codePointAt(0)!; length += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4 }
  return BigInt(length)
}`,
  },
  textConcat: {
    dependencies: [],
    source: `function textConcat(left: string | null, right: string | null): string | null { return left === null || right === null ? null : left + right }`,
  },
}
