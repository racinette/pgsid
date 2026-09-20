export const typescriptEnumHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  SqlEnum: {
    dependencies: [],
    source: `class SqlEnum {
  constructor(
    readonly type: string,
    readonly label: string,
    readonly order: number,
  ) {}
  toString(): string { return this.label }
}`,
  },
  enumInput: {
    dependencies: ['SqlEnum'],
    source: `function enumInput(
  value: string | null,
  type: string,
  labels: readonly string[],
): SqlEnum | null {
  if (value === null) return null
  const order = labels.indexOf(value)
  if (order < 0) throw Object.assign(new Error('invalid input value for enum'), { code: '22P02' })
  return new SqlEnum(type, value, order)
}`,
  },
  enumText: {
    dependencies: ['SqlEnum'],
    source: `function enumText(value: SqlEnum | null): string | null {
  return value === null ? null : value.label
}`,
  },
  enumCompare: {
    dependencies: ['SqlEnum'],
    source: `function enumCompare(left: SqlEnum | null, right: SqlEnum | null): number | null {
  if (left === null || right === null) return null
  if (left.type !== right.type)
    throw Object.assign(new Error('operator does not exist for distinct enum types'), { code: '42883' })
  return left.order - right.order
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
  typescriptEnumHelpers[`enum${name}`] = {
    dependencies: ['enumCompare'],
    source: `function enum${name}(left: SqlEnum | null, right: SqlEnum | null): boolean | null {
  const comparison = enumCompare(left, right)
  return comparison === null ? null : comparison ${operator} 0
}`,
  }
}
