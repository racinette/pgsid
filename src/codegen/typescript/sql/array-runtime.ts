export const typescriptArrayHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  SqlArrayElement: {
    dependencies: [],
    source: `class SqlArrayElement {
  constructor(readonly type: string, readonly value: any) {}
}`,
  },
  arrayElementInput: {
    dependencies: ['SqlArrayElement'],
    source: `function arrayElementInput(type: string, value: any): SqlArrayElement {
  return new SqlArrayElement(type, value)
}`,
  },
  arrayCoerceElement: {
    dependencies: [
      'SqlArrayElement',
      'arrayElementInput',
      'decimalFromInteger',
      'float4FromDecimal',
      'float8FromDecimal',
      'bpcharText',
    ],
    source: `function arrayCoerceElement(target: string, element: SqlArrayElement): SqlArrayElement {
  if (element.type === target || element.value === null)
    return new SqlArrayElement(target, element.value)
  const source = element.type
  let value = element.value
  if (target === 'pg_catalog."numeric"' && /^pg_catalog\\.int[248]$/.test(source))
    value = decimalFromInteger(value)
  else if (target === 'pg_catalog.float4') {
    if (source === 'pg_catalog."numeric"') value = float4FromDecimal(value)
    else value = Math.fround(typeof value === 'bigint' ? Number(value) : value)
  } else if (target === 'pg_catalog.float8') {
    if (source === 'pg_catalog."numeric"') value = float8FromDecimal(value)
    else value = typeof value === 'bigint' ? Number(value) : value
  } else if (
    ['pg_catalog.text', 'pg_catalog."varchar"'].includes(target) &&
    source === 'pg_catalog.bpchar'
  ) value = bpcharText(value)
  else if (
    !(
      /^pg_catalog\\.int[248]$/.test(target) &&
      /^pg_catalog\\.int[248]$/.test(source)
    ) &&
    !(
      ['pg_catalog.text', 'pg_catalog."varchar"'].includes(target) &&
      ['pg_catalog.text', 'pg_catalog."varchar"'].includes(source)
    )
  ) throw new Error('unsupported PostgreSQL anycompatible coercion')
  return arrayElementInput(target, value)
}`,
  },
  arrayCoerce: {
    dependencies: ['SqlArray', 'arrayCoerceElement'],
    source: `function arrayCoerce(target: string, value: SqlArray | null): SqlArray | null {
  if (value === null || value.elementType === target) return value
  return new SqlArray(
    target,
    value.dimensions,
    value.lowerBounds,
    value.elements.map((element) => arrayCoerceElement(target, element)),
  )
}`,
  },
  arrayFloatText: {
    dependencies: [],
    source: `function arrayFloatText(value: number, float4: boolean): string {
  if (Number.isNaN(value)) return 'NaN'
  if (value === Infinity) return 'Infinity'
  if (value === -Infinity) return '-Infinity'
  if (Object.is(value, -0)) return '-0'
  if (!float4) return value.toString()
  const rounded = Math.fround(value)
  for (let precision = 1; precision <= 9; precision++) {
    const candidate = rounded.toPrecision(precision)
    if (Object.is(Math.fround(Number(candidate)), rounded))
      return candidate
        .replace(/(\\.\\d*?[1-9])0+(?=e|$)|\\.0+(?=e|$)/u, '$1')
  }
  return rounded.toString()
}`,
  },
  arrayElementText: {
    dependencies: ['SqlDecimal', 'SqlUuid', 'SqlEnum', 'arrayFloatText'],
    source: `function arrayElementText(elementType: string, value: any): string {
  let output: string
  if (elementType === 'pg_catalog.bool') output = value ? 't' : 'f'
  else if (elementType === 'pg_catalog.float4' || elementType === 'pg_catalog.float8')
    output = arrayFloatText(value, elementType === 'pg_catalog.float4')
  else output = value.toString()
  if (
    ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(elementType) &&
    (output === '' || /^NULL$/i.test(output) || /[,"\\\\{}\\s]/u.test(output))
  )
    return '"' + output.replace(/[\\\\"]/gu, '\\\\$&') + '"'
  return output
}`,
  },
  arrayElementCompare: {
    dependencies: [
      'floatEq',
      'floatLt',
      'decimalEq',
      'decimalLt',
      'sqlTextCompare',
      'bpcharText',
      'uuidCompare',
      'enumCompare',
    ],
    source: `function arrayElementCompare(elementType: string, left: any, right: any): number {
  if (/^pg_catalog\\.int[248]$/.test(elementType))
    return left < right ? -1 : left > right ? 1 : 0
  if (/^pg_catalog\\.float[48]$/.test(elementType))
    return floatEq(left, right) ? 0 : floatLt(left, right) ? -1 : 1
  if (elementType === 'pg_catalog."numeric"')
    return decimalEq(left, right) ? 0 : decimalLt(left, right) ? -1 : 1
  if (elementType === 'pg_catalog.bool')
    return Number(left) - Number(right)
  if (['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(elementType))
    return sqlTextCompare(
      elementType === 'pg_catalog.bpchar' ? bpcharText(left)! : left,
      elementType === 'pg_catalog.bpchar' ? bpcharText(right)! : right,
    )
  if (elementType === 'pg_catalog.uuid') return Number(uuidCompare(left, right)!)
  if (elementType.startsWith('enum:')) return enumCompare(left, right)!
  throw new Error('unsupported PostgreSQL array element type')
}`,
  },
  SqlArray: {
    dependencies: ['SqlArrayElement', 'arrayElementText'],
    source: `class SqlArray {
  constructor(
    readonly elementType: string,
    readonly dimensions: readonly number[],
    readonly lowerBounds: readonly number[],
    readonly elements: readonly SqlArrayElement[],
  ) {}
  toString(): string {
    if (this.dimensions.length === 0) return '{}'
    let offset = 0
    const render = (depth: number): string => {
      const values: string[] = []
      for (let index = 0; index < this.dimensions[depth]!; index++)
        values.push(
          depth === this.dimensions.length - 1
            ? this.elements[offset++]!.value === null
              ? 'NULL'
              : arrayElementText(this.elementType, this.elements[offset - 1]!.value)
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
  elements: readonly SqlArrayElement[] | null,
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
    dependencies: ['SqlArray', 'arrayElementCompare'],
    source: `function arrayCompare(left: SqlArray | null, right: SqlArray | null): number | null {
  if (left === null || right === null) return null
  if (left.elementType !== right.elementType)
    throw Object.assign(new Error('cannot compare arrays of different element types'), { code: '42804' })
  const count = Math.min(left.elements.length, right.elements.length)
  for (let index = 0; index < count; index++) {
    const a = left.elements[index]!.value, b = right.elements[index]!.value
    if (a === null && b === null) continue
    if (a === null) return 1
    if (b === null) return -1
    const comparison = arrayElementCompare(left.elementType, a, b)
    if (comparison !== 0) return comparison
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
    dependencies: ['SqlArray', 'arrayElementCompare'],
    source: `function arrayEq(left: SqlArray | null, right: SqlArray | null): boolean | null {
  if (left === null || right === null) return null
  if (
    left.elementType !== right.elementType ||
    left.dimensions.length !== right.dimensions.length ||
    left.dimensions.some((dimension, index) => dimension !== right.dimensions[index]) ||
    left.lowerBounds.some((bound, index) => bound !== right.lowerBounds[index]) ||
    left.elements.length !== right.elements.length
  ) return false
  return left.elements.every((element, index) => {
    const a = element.value, b = right.elements[index]!.value
    return a === null || b === null
      ? a === null && b === null
      : arrayElementCompare(left.elementType, a, b) === 0
  })
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
    dependencies: ['SqlArray', 'arrayElementCompare'],
    source: `function arrayContains(left: SqlArray | null, right: SqlArray | null): boolean | null {
  if (left === null || right === null) return null
  return right.elements.every((candidate) =>
    candidate.value !== null &&
    left.elements.some(
      (element) =>
        element.value !== null &&
        arrayElementCompare(left.elementType, element.value, candidate.value) === 0,
    ),
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
    dependencies: ['SqlArray', 'arrayElementCompare'],
    source: `function arrayOverlap(left: SqlArray | null, right: SqlArray | null): boolean | null {
  if (left === null || right === null) return null
  return left.elements.some((candidate) =>
    candidate.value !== null &&
    right.elements.some(
      (element) =>
        element.value !== null &&
        arrayElementCompare(left.elementType, element.value, candidate.value) === 0,
    ),
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
    source: `function arraySubscript(value: SqlArray | null, ...subscripts: readonly (bigint | null)[]): any {
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
  return value.elements[offset]!.value
}`,
  },
  arrayElementNotDistinct: {
    dependencies: ['SqlArrayElement', 'arrayElementCompare'],
    source: `function arrayElementNotDistinct(
  elementType: string,
  left: SqlArrayElement,
  right: SqlArrayElement,
): boolean {
  if (left.value === null || right.value === null)
    return left.value === null && right.value === null
  return arrayElementCompare(elementType, left.value, right.value) === 0
}`,
  },
  arrayAppend: {
    dependencies: ['SqlArray', 'SqlArrayElement', 'arrayError'],
    source: `function arrayAppend(value: SqlArray | null, element: SqlArrayElement): SqlArray {
  if (value === null || value.dimensions.length === 0)
    return new SqlArray(element.type, [1], [1], [element])
  if (value.dimensions.length !== 1) arrayError('22000')
  const dimensions = [value.dimensions[0]! + 1]
  if (value.lowerBounds[0]! + dimensions[0]! - 1 > 2147483647) arrayError('22003')
  return new SqlArray(value.elementType, dimensions, value.lowerBounds, [...value.elements, element])
}`,
  },
  arrayPrepend: {
    dependencies: ['SqlArray', 'SqlArrayElement', 'arrayError'],
    source: `function arrayPrepend(element: SqlArrayElement, value: SqlArray | null): SqlArray {
  if (value === null || value.dimensions.length === 0)
    return new SqlArray(element.type, [1], [1], [element])
  if (value.dimensions.length !== 1) arrayError('22000')
  if (value.lowerBounds[0] === -2147483648) arrayError('22003')
  return new SqlArray(
    value.elementType,
    [value.dimensions[0]! + 1],
    value.lowerBounds,
    [element, ...value.elements],
  )
}`,
  },
  arrayPosition: {
    dependencies: ['SqlArray', 'SqlArrayElement', 'arrayElementNotDistinct', 'arrayError'],
    source: `function arrayPosition(
  value: SqlArray | null,
  search: SqlArrayElement,
  start?: bigint | null,
): bigint | null {
  if (value === null) return null
  if (value.dimensions.length > 1) arrayError('0A000')
  if (value.dimensions.length === 0) return null
  if (arguments.length >= 3 && start === null) arrayError('22004')
  const minimum = start === undefined ? value.lowerBounds[0]! : Number(start)
  for (let index = Math.max(0, minimum - value.lowerBounds[0]!); index < value.elements.length; index++)
    if (arrayElementNotDistinct(value.elementType, value.elements[index]!, search))
      return BigInt(value.lowerBounds[0]! + index)
  return null
}`,
  },
  arrayPositions: {
    dependencies: [
      'SqlArray',
      'SqlArrayElement',
      'arrayElementNotDistinct',
      'arrayElementInput',
      'arrayError',
    ],
    source: `function arrayPositions(value: SqlArray | null, search: SqlArrayElement): SqlArray | null {
  if (value === null) return null
  if (value.dimensions.length > 1) arrayError('0A000')
  const elements: SqlArrayElement[] = []
  if (value.dimensions.length === 1)
    for (let index = 0; index < value.elements.length; index++)
      if (arrayElementNotDistinct(value.elementType, value.elements[index]!, search))
        elements.push(arrayElementInput('pg_catalog.int4', BigInt(value.lowerBounds[0]! + index)))
  return elements.length === 0
    ? new SqlArray('pg_catalog.int4', [], [], [])
    : new SqlArray('pg_catalog.int4', [elements.length], [1], elements)
}`,
  },
  arrayRemove: {
    dependencies: ['SqlArray', 'SqlArrayElement', 'arrayElementNotDistinct', 'arrayError'],
    source: `function arrayRemove(value: SqlArray | null, search: SqlArrayElement): SqlArray | null {
  if (value === null) return null
  if (value.dimensions.length > 1) arrayError('0A000')
  if (value.dimensions.length === 0) return value
  const elements = value.elements.filter(
    (element) => !arrayElementNotDistinct(value.elementType, element, search),
  )
  return elements.length === 0
    ? new SqlArray(value.elementType, [], [], [])
    : new SqlArray(value.elementType, [elements.length], value.lowerBounds, elements)
}`,
  },
  arrayReplace: {
    dependencies: ['SqlArray', 'SqlArrayElement', 'arrayElementNotDistinct'],
    source: `function arrayReplace(
  value: SqlArray | null,
  search: SqlArrayElement,
  replacement: SqlArrayElement,
): SqlArray | null {
  if (value === null) return null
  return new SqlArray(
    value.elementType,
    value.dimensions,
    value.lowerBounds,
    value.elements.map((element) =>
      arrayElementNotDistinct(value.elementType, element, search) ? replacement : element,
    ),
  )
}`,
  },
  arrayFill: {
    dependencies: ['SqlArray', 'SqlArrayElement', 'arrayError'],
    source: `function arrayFill(
  element: SqlArrayElement,
  dimensions: SqlArray | null,
  lowerBounds?: SqlArray | null,
): SqlArray {
  if (dimensions === null || (arguments.length >= 3 && lowerBounds === null)) arrayError('22004')
  if (dimensions.dimensions.length > 1 || (lowerBounds && lowerBounds.dimensions.length > 1))
    arrayError('2202E')
  if (dimensions.elements.some((value) => value.value === null) ||
      lowerBounds?.elements.some((value) => value.value === null)) arrayError('22004')
  const dims = dimensions.elements.map((value) => Number(value.value))
  if (dims.length > 6) arrayError('54000')
  if (dims.some((dimension) => dimension < 0)) arrayError('54000')
  const lbs = lowerBounds
    ? lowerBounds.elements.map((value) => Number(value.value))
    : dims.map(() => 1)
  if (lbs.length !== dims.length) arrayError('2202E')
  const count = dims.reduce((total, dimension) => total * dimension, 1)
  if (dims.length === 0 || count === 0) return new SqlArray(element.type, [], [], [])
  return new SqlArray(element.type, dims, lbs, Array.from({ length: count }, () => element))
}`,
  },
  arrayTrim: {
    dependencies: ['SqlArray', 'arrayError'],
    source: `function arrayTrim(value: SqlArray | null, count: bigint | null): SqlArray | null {
  if (value === null || count === null) return null
  const amount = Number(count), outer = value.dimensions[0] ?? 0
  if (amount < 0 || amount > outer) arrayError('2202E')
  if (amount === outer) return new SqlArray(value.elementType, [], [], [])
  if (value.dimensions.length === 0 || amount === 0) return value
  const chunk = value.elements.length / outer
  const dimensions = [...value.dimensions]
  dimensions[0] = outer - amount
  return new SqlArray(
    value.elementType,
    dimensions,
    dimensions.map(() => 1),
    value.elements.slice(0, value.elements.length - amount * chunk),
  )
}`,
  },
  arrayReverse: {
    dependencies: ['SqlArray'],
    source: `function arrayReverse(value: SqlArray | null): SqlArray | null {
  if (value === null || value.dimensions.length === 0 || value.dimensions[0]! < 2) return value
  const outer = value.dimensions[0]!, chunk = value.elements.length / outer
  const elements: SqlArrayElement[] = []
  for (let index = outer - 1; index >= 0; index--)
    elements.push(...value.elements.slice(index * chunk, (index + 1) * chunk))
  return new SqlArray(value.elementType, value.dimensions, value.lowerBounds, elements)
}`,
  },
  arraySort: {
    dependencies: ['SqlArray', 'arrayElementCompare'],
    source: `function arraySort(
  value: SqlArray | null,
  descending: boolean | null = false,
  nullsFirst: boolean | null = descending,
): SqlArray | null {
  if (value === null || descending === null || nullsFirst === null) return null
  if (value.dimensions.length === 0 || value.dimensions[0]! < 2) return value
  const outer = value.dimensions[0]!, chunk = value.elements.length / outer
  const slices = Array.from({ length: outer }, (_, index) =>
    value.elements.slice(index * chunk, (index + 1) * chunk),
  )
  slices.sort((left, right) => {
    for (let index = 0; index < chunk; index++) {
      const a = left[index]!, b = right[index]!
      if (a.value === null || b.value === null) {
        if (a.value === null && b.value === null) continue
        if (value.dimensions.length === 1)
          return a.value === null ? (nullsFirst ? -1 : 1) : nullsFirst ? 1 : -1
        const comparison = a.value === null ? 1 : -1
        return descending ? -comparison : comparison
      }
      const comparison = arrayElementCompare(value.elementType, a.value, b.value)
      if (comparison !== 0) return descending ? -comparison : comparison
    }
    return 0
  })
  return new SqlArray(value.elementType, value.dimensions, value.lowerBounds, slices.flat())
}`,
  },
  arraySlice: {
    dependencies: ['SqlArray'],
    source: `function arraySlice(
  value: SqlArray | null,
  bounds: readonly (readonly [bigint | null, bigint | null])[],
): SqlArray | null {
  if (value === null || value.dimensions.length === 0 || bounds.length !== value.dimensions.length)
    return value === null ? null : new SqlArray(value.elementType, [], [], [])
  const lowers = bounds.map((bound, index) =>
    Math.max(value.lowerBounds[index]!, Number(bound[0] ?? BigInt(value.lowerBounds[index]!))),
  )
  const uppers = bounds.map((bound, index) =>
    Math.min(
      value.lowerBounds[index]! + value.dimensions[index]! - 1,
      Number(bound[1] ?? BigInt(value.lowerBounds[index]! + value.dimensions[index]! - 1)),
    ),
  )
  if (lowers.some((lower, index) => lower > uppers[index]!))
    return new SqlArray(value.elementType, [], [], [])
  const dimensions = lowers.map((lower, index) => uppers[index]! - lower + 1)
  const elements: SqlArrayElement[] = []
  const visit = (depth: number, offset: number): void => {
    if (depth === value.dimensions.length) { elements.push(value.elements[offset]!); return }
    const stride = value.dimensions.slice(depth + 1).reduce((total, dimension) => total * dimension, 1)
    for (let coordinate = lowers[depth]!; coordinate <= uppers[depth]!; coordinate++)
      visit(depth + 1, offset + (coordinate - value.lowerBounds[depth]!) * stride)
  }
  visit(0, 0)
  return new SqlArray(value.elementType, dimensions, dimensions.map(() => 1), elements)
}`,
  },
  arrayAssign: {
    dependencies: ['SqlArray', 'SqlArrayElement', 'arrayError'],
    source: `function arrayAssign(
  value: SqlArray | null,
  subscripts: readonly (bigint | null)[],
  element: SqlArrayElement,
): SqlArray {
  if (subscripts.some((subscript) => subscript === null)) arrayError('22004')
  const indexes = subscripts.map(Number)
  if (value === null || value.dimensions.length === 0)
    return new SqlArray(
      element.type,
      indexes.map(() => 1),
      indexes,
      [element],
    )
  if (indexes.length !== value.dimensions.length) arrayError('2202E')
  if (value.dimensions.length === 1) {
    const oldLower = value.lowerBounds[0]!, oldUpper = oldLower + value.dimensions[0]! - 1
    const lower = Math.min(oldLower, indexes[0]!), upper = Math.max(oldUpper, indexes[0]!)
    const elements = Array.from(
      { length: upper - lower + 1 },
      (_, index) => {
        const coordinate = lower + index
        return coordinate < oldLower || coordinate > oldUpper
          ? new SqlArrayElement(value.elementType, null)
          : value.elements[coordinate - oldLower]!
      },
    )
    elements[indexes[0]! - lower] = element
    return new SqlArray(value.elementType, [elements.length], [lower], elements)
  }
  let offset = 0
  for (let index = 0; index < indexes.length; index++) {
    const position = indexes[index]! - value.lowerBounds[index]!
    if (position < 0 || position >= value.dimensions[index]!) arrayError('2202E')
    offset = offset * value.dimensions[index]! + position
  }
  const elements = [...value.elements]
  elements[offset] = element
  return new SqlArray(value.elementType, value.dimensions, value.lowerBounds, elements)
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
