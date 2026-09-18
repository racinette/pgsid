export const typescriptFloatHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  sqlFloatInput: {
    dependencies: [],
    source: `function sqlFloatInput(bits: string | null, single: boolean): number | null {
      if (bits === null) return null
      const view = new DataView(new ArrayBuffer(single ? 4 : 8))
      if (single) { view.setUint32(0, Number.parseInt(bits, 16)); return view.getFloat32(0) }
      view.setBigUint64(0, BigInt('0x' + bits)); return view.getFloat64(0)
    }`,
  },
  sqlFloatCompare: {
    dependencies: [],
    source: `function sqlFloatCompare(left: number, right: number): number {
      if (Number.isNaN(left)) return Number.isNaN(right) ? 0 : 1
      if (Number.isNaN(right)) return -1
      return left < right ? -1 : left > right ? 1 : 0
    }`,
  },
  sqlFloatToInteger: {
    dependencies: ['sqlIntegerRange', 'sqlIntegerError'],
    source: `function sqlFloatToInteger(value: number | null, min: bigint, max: bigint): bigint | null {
      if (value === null) return null
      if (!Number.isFinite(value)) throw new SqlIntegerError()
      const lower = Math.floor(value)
      const rounded = value - lower === 0.5 ? (lower % 2 === 0 ? lower : lower + 1) : Math.round(value)
      return sqlIntegerRange(BigInt(rounded), min, max)
    }`,
  },
  sqlIntegerToFloat4: {
    dependencies: [],
    source: `function sqlIntegerToFloat4(value: bigint | null): number | null {
      if (value === null) return null
      const magnitude = value < 0n ? -value : value
      const shift = magnitude.toString(2).length - 24
      if (shift <= 0) return Number(value)
      let significant = magnitude >> BigInt(shift)
      const remainder = magnitude - (significant << BigInt(shift))
      const half = 1n << BigInt(shift - 1)
      if (remainder > half || (remainder === half && significant % 2n !== 0n)) significant++
      const result = Number(significant) * 2 ** shift
      return value < 0n ? -result : result
    }`,
  },
  float4FromFloat8: {
    dependencies: ['sqlIntegerError'],
    source: `function float4FromFloat8(value: number | null): number | null {
      if (value === null) return null
      const result = Math.fround(value)
      if ((!Number.isFinite(result) && !Number.isNaN(result) && Number.isFinite(value)) || (result === 0 && value !== 0)) throw new SqlIntegerError()
      return result
    }`,
  },
  float8FromFloat4: {
    dependencies: [],
    source: `function float8FromFloat4(value: number | null): number | null { return value }`,
  },
  float4FromInteger: {
    dependencies: ['sqlIntegerToFloat4'],
    source: `function float4FromInteger(value: bigint | null): number | null { return sqlIntegerToFloat4(value) }`,
  },
  float8FromInteger: {
    dependencies: [],
    source: `function float8FromInteger(value: bigint | null): number | null { return value === null ? null : Number(value) }`,
  },
}

for (const [width, single] of [
  ['float4', true],
  ['float8', false],
] as const) {
  typescriptFloatHelpers[`${width}Input`] = {
    dependencies: ['sqlFloatInput'],
    source: `function ${width}Input(bits: string | null): number | null { return sqlFloatInput(bits, ${single}) }`,
  }
  for (const [name, operator] of [
    ['Add', '+'],
    ['Sub', '-'],
    ['Mul', '*'],
    ['Div', '/'],
  ] as const) {
    const rounded = single ? `Math.fround(left ${operator} right)` : `left ${operator} right`
    const infinite = `!Number.isFinite(result) && !Number.isNaN(result)`
    const inputInfinite =
      name === 'Div' ? `Number.isFinite(left)` : `Number.isFinite(left) && Number.isFinite(right)`
    const underflow =
      name === 'Mul'
        ? 'result === 0 && left !== 0 && right !== 0'
        : name === 'Div'
          ? 'result === 0 && left !== 0 && Number.isFinite(right)'
          : 'false'
    typescriptFloatHelpers[`${width}${name}`] = {
      dependencies:
        name === 'Div' ? ['sqlIntegerError', 'sqlDivisionByZeroError'] : ['sqlIntegerError'],
      source: `function ${width}${name}(left: number | null, right: number | null): number | null {
        if (left === null || right === null) return null
        ${name === 'Div' ? 'if (right === 0 && !Number.isNaN(left)) throw new SqlDivisionByZeroError()' : ''}
        const result = ${rounded}
        if ((${infinite} && ${inputInfinite}) || (${underflow})) throw new SqlIntegerError()
        return result
      }`,
    }
  }
  for (const [name, expression] of [
    ['Neg', '-value'],
    ['Abs', 'Math.abs(value)'],
    ['Identity', 'value'],
  ] as const) {
    typescriptFloatHelpers[`${width}${name}`] = {
      dependencies: [],
      source: `function ${width}${name}(value: number | null): number | null { return value === null ? null : ${expression} }`,
    }
  }
}
for (const [name, operator] of [
  ['Eq', '==='],
  ['Ne', '!=='],
  ['Lt', '<'],
  ['Le', '<='],
  ['Gt', '>'],
  ['Ge', '>='],
] as const) {
  typescriptFloatHelpers[`float${name}`] = {
    dependencies: ['sqlFloatCompare'],
    source: `function float${name}(left: number | null, right: number | null): boolean | null {
      return left === null || right === null ? null : sqlFloatCompare(left, right) ${operator} 0
    }`,
  }
}
for (const [width, min, max] of [
  ['int2', '-32768n', '32767n'],
  ['int4', '-2147483648n', '2147483647n'],
  ['int8', '-9223372036854775808n', '9223372036854775807n'],
] as const) {
  typescriptFloatHelpers[`${width}FromFloat`] = {
    dependencies: ['sqlFloatToInteger'],
    source: `function ${width}FromFloat(value: number | null): bigint | null { return sqlFloatToInteger(value, ${min}, ${max}) }`,
  }
}

typescriptFloatHelpers.sqlPowerArgumentError = {
  dependencies: [],
  source: `class SqlPowerArgumentError extends Error {
    readonly code = '2201F'
    constructor() { super('cannot take square root of a negative number') }
  }`,
}
for (const [name, expression] of [
  ['Ceil', 'Math.ceil(value)'],
  ['Floor', 'Math.floor(value)'],
  ['Trunc', 'Math.trunc(value)'],
  ['Sign', 'value > 0 ? 1 : value < 0 ? -1 : 0'],
  ['Cbrt', 'Math.cbrt(value)'],
  ['Sqrt', 'Math.sqrt(value)'],
]) {
  typescriptFloatHelpers[`float8${name}`] = {
    dependencies: name === 'Sqrt' ? ['sqlPowerArgumentError'] : [],
    source: `function float8${name}(value: number | null): number | null {
      if (value === null) return null
      ${name === 'Sqrt' ? 'if (value < 0) throw new SqlPowerArgumentError()' : ''}
      return ${expression}
    }`,
  }
}
typescriptFloatHelpers.float8Round = {
  dependencies: [],
  source: `function float8Round(value: number | null): number | null {
    if (value === null || !Number.isFinite(value) || value === 0) return value
    const magnitude = Math.abs(value)
    const lower = Math.floor(magnitude)
    const rounded = magnitude - lower === 0.5 ? (lower % 2 === 0 ? lower : lower + 1) : Math.round(magnitude)
    return value < 0 ? -rounded : rounded
  }`,
}
