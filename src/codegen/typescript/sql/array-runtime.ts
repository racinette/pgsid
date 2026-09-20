export const typescriptArrayHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  SqlArray: {
    dependencies: [],
    source: `class SqlArray {
  constructor(
    readonly elementType: string,
    readonly dimensions: readonly number[],
    readonly lowerBounds: readonly number[],
    readonly elements: readonly (bigint | null)[],
  ) {}
  toString(): string {
    if (this.dimensions.length === 0) return '{}'
    let offset = 0
    const render = (depth: number): string => {
      const values: string[] = []
      for (let index = 0; index < this.dimensions[depth]!; index++)
        values.push(
          depth === this.dimensions.length - 1
            ? this.elements[offset++] === null
              ? 'NULL'
              : this.elements[offset - 1]!.toString()
            : render(depth + 1),
        )
      return '{' + values.join(',') + '}'
    }
    const value = render(0)
    return this.lowerBounds.some((bound) => bound !== 1)
      ? this.dimensions
          .map((dimension, index) => '[' + this.lowerBounds[index]! + ':' + (this.lowerBounds[index]! + dimension - 1) + ']')
          .join('') + '=' + value
      : value
  }
}`,
  },
  arrayInput: {
    dependencies: ['SqlArray'],
    source: `function arrayInput(
  elementType: string,
  dimensions: readonly number[],
  lowerBounds: readonly number[],
  elements: readonly (bigint | null)[] | null,
): SqlArray | null {
  return elements === null
    ? null
    : new SqlArray(elementType, [...dimensions], [...lowerBounds], [...elements])
}`,
  },
  arrayCardinality: {
    dependencies: ['SqlArray'],
    source: `function arrayCardinality(value: SqlArray | null): bigint | null {
  return value === null ? null : BigInt(value.elements.length)
}`,
  },
  arrayNdims: {
    dependencies: ['SqlArray'],
    source: `function arrayNdims(value: SqlArray | null): bigint | null {
  return value === null || value.dimensions.length === 0 ? null : BigInt(value.dimensions.length)
}`,
  },
  arrayDims: {
    dependencies: ['SqlArray'],
    source: `function arrayDims(value: SqlArray | null): string | null {
  return value === null || value.dimensions.length === 0
    ? null
    : value.dimensions
        .map((dimension, index) => '[' + value.lowerBounds[index]! + ':' + (value.lowerBounds[index]! + dimension - 1) + ']')
        .join('')
}`,
  },
  arrayLength: {
    dependencies: ['SqlArray'],
    source: `function arrayLength(value: SqlArray | null, dimension: bigint | null): bigint | null {
  if (value === null || dimension === null || dimension <= 0n || dimension > BigInt(value.dimensions.length)) return null
  return BigInt(value.dimensions[Number(dimension) - 1]!)
}`,
  },
  arrayLower: {
    dependencies: ['SqlArray'],
    source: `function arrayLower(value: SqlArray | null, dimension: bigint | null): bigint | null {
  if (value === null || dimension === null || dimension <= 0n || dimension > BigInt(value.dimensions.length)) return null
  return BigInt(value.lowerBounds[Number(dimension) - 1]!)
}`,
  },
  arrayUpper: {
    dependencies: ['SqlArray'],
    source: `function arrayUpper(value: SqlArray | null, dimension: bigint | null): bigint | null {
  if (value === null || dimension === null || dimension <= 0n || dimension > BigInt(value.dimensions.length)) return null
  const index = Number(dimension) - 1
  return BigInt(value.lowerBounds[index]! + value.dimensions[index]! - 1)
}`,
  },
  arrayCompare: {
    dependencies: ['SqlArray'],
    source: `function arrayCompare(left: SqlArray | null, right: SqlArray | null): number | null {
  if (left === null || right === null) return null
  if (left.elementType !== right.elementType)
    throw Object.assign(new Error('cannot compare arrays of different element types'), { code: '42804' })
  const count = Math.min(left.elements.length, right.elements.length)
  for (let index = 0; index < count; index++) {
    const a = left.elements[index]!, b = right.elements[index]!
    if (a === null && b === null) continue
    if (a === null) return 1
    if (b === null) return -1
    if (a < b) return -1
    if (a > b) return 1
  }
  if (left.elements.length !== right.elements.length)
    return left.elements.length < right.elements.length ? -1 : 1
  if (left.dimensions.length !== right.dimensions.length)
    return left.dimensions.length < right.dimensions.length ? -1 : 1
  for (let index = 0; index < left.dimensions.length; index++) {
    if (left.dimensions[index] !== right.dimensions[index])
      return left.dimensions[index]! < right.dimensions[index]! ? -1 : 1
  }
  for (let index = 0; index < left.lowerBounds.length; index++) {
    if (left.lowerBounds[index] !== right.lowerBounds[index])
      return left.lowerBounds[index]! < right.lowerBounds[index]! ? -1 : 1
  }
  return 0
}`,
  },
  arrayEq: {
    dependencies: ['SqlArray'],
    source: `function arrayEq(left: SqlArray | null, right: SqlArray | null): boolean | null {
  if (left === null || right === null) return null
  if (
    left.elementType !== right.elementType ||
    left.dimensions.length !== right.dimensions.length ||
    left.dimensions.some((dimension, index) => dimension !== right.dimensions[index]) ||
    left.lowerBounds.some((bound, index) => bound !== right.lowerBounds[index]) ||
    left.elements.length !== right.elements.length
  ) return false
  return left.elements.every((element, index) => element === right.elements[index])
}`,
  },
  arrayNe: {
    dependencies: ['arrayEq'],
    source: `function arrayNe(left: SqlArray | null, right: SqlArray | null): boolean | null {
  const equal = arrayEq(left, right)
  return equal === null ? null : !equal
}`,
  },
  arrayContains: {
    dependencies: ['SqlArray'],
    source: `function arrayContains(left: SqlArray | null, right: SqlArray | null): boolean | null {
  if (left === null || right === null) return null
  return right.elements.every((candidate) =>
    candidate !== null && left.elements.some((element) => element !== null && element === candidate),
  )
}`,
  },
  arrayContained: {
    dependencies: ['arrayContains'],
    source: `function arrayContained(left: SqlArray | null, right: SqlArray | null): boolean | null {
  return arrayContains(right, left)
}`,
  },
  arrayOverlap: {
    dependencies: ['SqlArray'],
    source: `function arrayOverlap(left: SqlArray | null, right: SqlArray | null): boolean | null {
  if (left === null || right === null) return null
  return left.elements.some((candidate) =>
    candidate !== null && right.elements.some((element) => element !== null && element === candidate),
  )
}`,
  },
  arrayError: {
    dependencies: [],
    source: `function arrayError(code: string): never {
  throw Object.assign(new Error('PostgreSQL array operation failed'), { code })
}`,
  },
  arrayConcat: {
    dependencies: ['SqlArray', 'arrayError'],
    source: `function arrayConcat(left: SqlArray | null, right: SqlArray | null): SqlArray | null {
  if (left === null) return right
  if (right === null) return left
  if (left.elementType !== right.elementType) arrayError('42804')
  if (left.dimensions.length === 0) return right
  if (right.dimensions.length === 0) return left
  const difference = left.dimensions.length - right.dimensions.length
  if (Math.abs(difference) > 1) arrayError('2202E')
  let dimensions: number[], lowerBounds: number[]
  if (difference === 0) {
    for (let index = 1; index < left.dimensions.length; index++)
      if (
        left.dimensions[index] !== right.dimensions[index] ||
        left.lowerBounds[index] !== right.lowerBounds[index]
      ) arrayError('2202E')
    dimensions = [...left.dimensions]
    dimensions[0] = dimensions[0]! + right.dimensions[0]!
    lowerBounds = [...left.lowerBounds]
  } else {
    const outer = difference > 0 ? left : right
    const inner = difference > 0 ? right : left
    for (let index = 0; index < inner.dimensions.length; index++)
      if (
        inner.dimensions[index] !== outer.dimensions[index + 1] ||
        inner.lowerBounds[index] !== outer.lowerBounds[index + 1]
      ) arrayError('2202E')
    dimensions = [...outer.dimensions]
    dimensions[0] = dimensions[0]! + 1
    lowerBounds = [...outer.lowerBounds]
  }
  return new SqlArray(left.elementType, dimensions, lowerBounds, [...left.elements, ...right.elements])
}`,
  },
  arraySubscript: {
    dependencies: ['SqlArray'],
    source: `function arraySubscript(value: SqlArray | null, ...subscripts: readonly (bigint | null)[]): bigint | null {
  if (
    value === null ||
    subscripts.length !== value.dimensions.length ||
    subscripts.some((subscript) => subscript === null)
  ) return null
  let offset = 0
  for (let index = 0; index < subscripts.length; index++) {
    const position = Number(subscripts[index]!) - value.lowerBounds[index]!
    if (position < 0 || position >= value.dimensions[index]!) return null
    offset = offset * value.dimensions[index]! + position
  }
  return value.elements[offset]!
}`,
  },
}

for (const [name, operator] of [
  ['Lt', '<'],
  ['Le', '<='],
  ['Gt', '>'],
  ['Ge', '>='],
] as const) {
  typescriptArrayHelpers[`array${name}`] = {
    dependencies: ['arrayCompare'],
    source: `function array${name}(left: SqlArray | null, right: SqlArray | null): boolean | null {
  const comparison = arrayCompare(left, right)
  return comparison === null ? null : comparison ${operator} 0
}`,
  }
}
