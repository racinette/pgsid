export const typescriptDecimalHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  decimalLibrary: {
    dependencies: [],
    source: `import Decimal from 'decimal.js'`,
  },
  sqlDecimalIntegerSpecialError: {
    dependencies: [],
    source: `class SqlDecimalIntegerSpecialError extends Error {
      readonly code = '0A000'
      constructor() { super('cannot convert special numeric value to integer') }
    }`,
  },
  SqlDecimal: {
    dependencies: ['decimalLibrary', 'sqlIntegerError'],
    source: `class SqlDecimal {
      constructor(readonly value: Decimal, readonly scale: number) {
        if (value.isFinite() && (scale > 16383 || (!value.isZero() && value.e >= 131072))) throw new SqlIntegerError()
      }
      toString(): string { return this.value.isFinite() ? this.value.toFixed(this.scale) : this.value.toString() }
    }`,
  },
  decimalInput: {
    dependencies: ['SqlDecimal'],
    source: `function decimalInput(text: string | null): SqlDecimal | null {
      if (text === null) return null
      const match = /^(?:[+-]?)(?:\\d*)(?:\\.(\\d*))?(?:[eE]([+-]?\\d+))?$/.exec(text)
      const exponent = Number(match?.[2] ?? 0)
      if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1073741823) throw new SqlIntegerError()
      const scale = Math.max(0, (match?.[1]?.length ?? 0) - exponent)
      if (scale > 16383) throw new SqlIntegerError()
      const Constructor = Decimal.clone({ minE: -1000000000, maxE: 1000000000 })
      const value = new Constructor(text)
      if (match && !value.isFinite()) throw new SqlIntegerError()
      return new SqlDecimal(value, value.isFinite() ? scale : 0)
    }`,
  },
  sqlDecimalContext: {
    dependencies: ['SqlDecimal'],
    source: `function sqlDecimalContext(left: Decimal, right: Decimal): typeof Decimal {
      const precision = left.isFinite() && right.isFinite()
        ? Math.max(1, Math.max(left.e, right.e) + Math.max(left.dp(), right.dp()) + 3, left.sd() + right.sd() + 3)
        : 34
      return Decimal.clone({ precision, rounding: Decimal.ROUND_HALF_UP, modulo: Decimal.ROUND_DOWN, minE: -1000000000, maxE: 1000000000 })
    }`,
  },
  sqlDecimalWeight: {
    dependencies: ['decimalLibrary'],
    source: `function sqlDecimalWeight(value: Decimal): { weight: number; first: number } {
      if (value.isZero()) return { weight: 0, first: 0 }
      const weight = Math.floor(value.e / 4)
      const length = value.e - weight * 4 + 1
      const digits = value.abs().toExponential().split('e')[0]!.replace('.', '')
      return { weight, first: Number(digits.slice(0, length).padEnd(length, '0')) }
    }`,
  },
  sqlDecimalBinary: {
    dependencies: ['sqlDecimalContext', 'sqlDecimalWeight', 'sqlDivisionByZeroError'],
    source: `function sqlDecimalBinary(left: SqlDecimal | null, right: SqlDecimal | null, op: string): SqlDecimal | null {
      if (left === null || right === null) return null
      const a = left.value, b = right.value
      if (a.isNaN() || b.isNaN()) return new SqlDecimal(new Decimal(NaN), 0)
      if (['div', 'quotient', 'mod'].includes(op) && b.isZero()) throw new SqlDivisionByZeroError()
      if (op === 'mod' && !b.isFinite() && a.isFinite()) return left
      let scale = Math.max(left.scale, right.scale)
      let Constructor = sqlDecimalContext(a, b)
      if (op === 'mul') scale = Math.min(16383, left.scale + right.scale)
      if (op === 'div' || op === 'quotient') {
        if (a.isFinite() && !b.isFinite()) return new SqlDecimal(new Decimal(0), 0)
        if (a.isFinite() && b.isFinite()) {
          const x = sqlDecimalWeight(a), y = sqlDecimalWeight(b)
          const weight = x.weight - y.weight - (x.first <= y.first ? 1 : 0)
          scale = op === 'quotient' ? 0 : Math.min(1000, Math.max(left.scale, right.scale, 16 - weight * 4, 0))
          Constructor = Decimal.clone({ precision: Math.max(1, a.e - b.e + scale + 3), rounding: Decimal.ROUND_DOWN, minE: -1000000000, maxE: 1000000000 })
        }
      }
      const x = new Constructor(a), y = new Constructor(b)
      let value: Decimal
      switch (op) {
        case 'add': value = x.add(y); break
        case 'sub': value = x.sub(y); break
        case 'mul': value = x.mul(y).toDP(scale, Decimal.ROUND_HALF_UP); break
        case 'div': value = x.div(y).toDP(scale, Decimal.ROUND_HALF_UP); break
        case 'quotient': value = x.div(y).trunc(); scale = 0; break
        case 'mod': value = x.mod(y); break
        default: throw new Error('Unknown decimal operation')
      }
      return new SqlDecimal(value, value.isFinite() ? scale : 0)
    }`,
  },
  sqlDecimalRound: {
    dependencies: ['sqlDecimalContext'],
    source: `function sqlDecimalRound(value: SqlDecimal | null, digits: bigint | null, truncate: boolean): SqlDecimal | null {
      if (value === null || digits === null) return null
      if (!value.value.isFinite()) return value
      const scale = Math.min(16383, Math.max(truncate ? -131072 : -131073, Number(digits)))
      const Constructor = sqlDecimalContext(value.value, value.value)
      const x = new Constructor(value.value), mode = truncate ? Decimal.ROUND_DOWN : Decimal.ROUND_HALF_UP
      const rounded = scale < 0 ? x.toNearest(new Constructor('1e' + -scale), mode) : x.toDP(scale, mode)
      return new SqlDecimal(rounded, Math.max(0, scale))
    }`,
  },
  decimalTypmod: {
    dependencies: ['sqlDecimalRound', 'sqlIntegerError'],
    source: `function decimalTypmod(value: SqlDecimal | null, typmod: bigint | null): SqlDecimal | null {
      if (value === null || typmod === null) return null
      if (typmod < 4n || value.value.isNaN()) return value
      if (!value.value.isFinite()) throw new SqlIntegerError()
      const encoded = Number(typmod) - 4
      const precision = (encoded >>> 16) & 65535, scale = ((encoded & 2047) ^ 1024) - 1024
      const result = sqlDecimalRound(value, BigInt(scale), false)!
      if (!result.value.isZero() && result.value.e >= precision - scale) throw new SqlIntegerError()
      return result
    }`,
  },
  decimalFromInteger: {
    dependencies: ['decimalInput'],
    source: `function decimalFromInteger(value: bigint | null): SqlDecimal | null { return decimalInput(value === null ? null : value.toString()) }`,
  },
  sqlDecimalExactFloat: {
    dependencies: ['decimalLibrary'],
    source: `function sqlDecimalExactFloat(value: number): Decimal {
      const Constructor = Decimal.clone({ precision: 1100, rounding: Decimal.ROUND_HALF_EVEN })
      if (!Number.isFinite(value) || value === 0) return new Constructor(value)
      const view = new DataView(new ArrayBuffer(8)); view.setFloat64(0, value)
      const bits = view.getBigUint64(0), exponent = Number((bits >> 52n) & 2047n)
      const mantissa = (bits & ((1n << 52n) - 1n)) | (exponent === 0 ? 0n : 1n << 52n)
      const result = new Constructor(mantissa.toString()).mul(new Constructor(2).pow(exponent === 0 ? -1074 : exponent - 1075))
      return value < 0 ? result.neg() : result
    }`,
  },
  sqlDecimalFromFloat: {
    dependencies: ['sqlDecimalExactFloat', 'decimalInput'],
    source: `function sqlDecimalFromFloat(value: number | null, digits: number): SqlDecimal | null {
      return value === null ? null : decimalInput(sqlDecimalExactFloat(value).toSD(digits, Decimal.ROUND_HALF_EVEN).toString())
    }`,
  },
  float8FromDecimal: {
    dependencies: ['SqlDecimal', 'sqlIntegerError'],
    source: `function float8FromDecimal(value: SqlDecimal | null): number | null {
      if (value === null) return null
      const result = Number(value.value.toString())
      if (value.value.isFinite() && (!Number.isFinite(result) || (result === 0 && !value.value.isZero()))) throw new SqlIntegerError()
      return result
    }`,
  },
  float4FromDecimal: {
    dependencies: ['SqlDecimal', 'sqlDecimalExactFloat', 'sqlIntegerError'],
    source: `function float4FromDecimal(value: SqlDecimal | null): number | null {
      if (value === null) return null
      if (!value.value.isFinite()) return Number(value.value.toString())
      if (value.value.isZero()) return 0
      const magnitude = value.value.abs()
      const Constructor = Decimal.clone({ precision: 1100 })
      const maximum = new Constructor(2).pow(128).sub(new Constructor(2).pow(103))
      if (magnitude.gte(maximum) || magnitude.lte(new Constructor(2).pow(-150))) throw new SqlIntegerError()
      const view = new DataView(new ArrayBuffer(4))
      view.setFloat32(0, Number(magnitude.toString()))
      let bits = view.getUint32(0)
      if (bits === 0) bits = 1
      if (bits === 0x7f800000) bits = 0x7f7fffff
      const at = (raw: number): Decimal => { view.setUint32(0, raw); return sqlDecimalExactFloat(view.getFloat32(0)) }
      const center = at(bits)
      const lower = center.add(at(bits - 1)).div(2)
      const upper = bits === 0x7f7fffff ? maximum : center.add(at(bits + 1)).div(2)
      if (magnitude.lt(lower) || (magnitude.eq(lower) && (bits & 1) !== 0)) bits--
      else if (magnitude.gt(upper) || (magnitude.eq(upper) && (bits & 1) !== 0)) bits++
      view.setUint32(0, bits)
      const result = view.getFloat32(0)
      return value.value.isNegative() ? -result : result
    }`,
  },
  sqlDecimalGcd: {
    dependencies: ['sqlDecimalContext'],
    source: `function sqlDecimalGcd(left: SqlDecimal | null, right: SqlDecimal | null, lcm: boolean): SqlDecimal | null {
      if (left === null || right === null) return null
      if (!left.value.isFinite() || !right.value.isFinite()) return new SqlDecimal(new Decimal(NaN), 0)
      const Constructor = sqlDecimalContext(left.value, right.value)
      const x = new Constructor(left.value).abs(), y = new Constructor(right.value).abs()
      let a = x, b = y
      while (!b.isZero()) { const remainder = a.mod(b); a = b; b = remainder }
      const result = lcm ? (x.isZero() || y.isZero() ? new Constructor(0) : x.div(a).trunc().mul(y)) : a
      return new SqlDecimal(result, Math.max(left.scale, right.scale))
    }`,
  },
  sqlDecimalCompare: {
    dependencies: ['SqlDecimal'],
    source: `function sqlDecimalCompare(left: Decimal, right: Decimal): number {
      if (left.isNaN()) return right.isNaN() ? 0 : 1
      if (right.isNaN()) return -1
      return left.cmp(right)
    }`,
  },
}

for (const [name, operation] of [
  ['Add', 'add'],
  ['Sub', 'sub'],
  ['Mul', 'mul'],
  ['Div', 'div'],
  ['Quotient', 'quotient'],
  ['Mod', 'mod'],
] as const) {
  typescriptDecimalHelpers[`decimal${name}`] = {
    dependencies: ['sqlDecimalBinary'],
    source: `function decimal${name}(left: SqlDecimal | null, right: SqlDecimal | null): SqlDecimal | null { return sqlDecimalBinary(left, right, '${operation}') }`,
  }
}
for (const [name, operation, scale] of [
  ['Identity', 'value.value', 'value.scale'],
  ['Neg', 'value.value.neg()', 'value.scale'],
  ['Abs', 'value.value.abs()', 'value.scale'],
  ['Ceil', 'value.value.ceil()', '0'],
  ['Floor', 'value.value.floor()', '0'],
  [
    'Sign',
    'new Decimal(value.value.isNaN() ? NaN : value.value.isZero() ? 0 : value.value.isNegative() ? -1 : 1)',
    '0',
  ],
] as const) {
  typescriptDecimalHelpers[`decimal${name}`] = {
    dependencies: ['SqlDecimal'],
    source: `function decimal${name}(value: SqlDecimal | null): SqlDecimal | null { return value === null ? null : new SqlDecimal(${operation}, ${scale}) }`,
  }
}
for (const name of ['Round', 'Trunc']) {
  typescriptDecimalHelpers[`decimal${name}`] = {
    dependencies: ['sqlDecimalRound'],
    source: `function decimal${name}(value: SqlDecimal | null, scale: bigint | null = 0n): SqlDecimal | null { return sqlDecimalRound(value, scale, ${name === 'Trunc'}) }`,
  }
}
for (const name of ['Gcd', 'Lcm']) {
  typescriptDecimalHelpers[`decimal${name}`] = {
    dependencies: ['sqlDecimalGcd'],
    source: `function decimal${name}(left: SqlDecimal | null, right: SqlDecimal | null): SqlDecimal | null { return sqlDecimalGcd(left, right, ${name === 'Lcm'}) }`,
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
  typescriptDecimalHelpers[`decimal${name}`] = {
    dependencies: ['sqlDecimalCompare'],
    source: `function decimal${name}(left: SqlDecimal | null, right: SqlDecimal | null): boolean | null { return left === null || right === null ? null : sqlDecimalCompare(left.value, right.value) ${operator} 0 }`,
  }
}
for (const [width, min, max] of [
  ['int2', '-32768n', '32767n'],
  ['int4', '-2147483648n', '2147483647n'],
  ['int8', '-9223372036854775808n', '9223372036854775807n'],
] as const) {
  typescriptDecimalHelpers[`${width}FromDecimal`] = {
    dependencies: ['sqlDecimalRound', 'sqlIntegerRange', 'sqlDecimalIntegerSpecialError'],
    source: `function ${width}FromDecimal(value: SqlDecimal | null): bigint | null {
      if (value === null) return null
      if (!value.value.isFinite()) throw new SqlDecimalIntegerSpecialError()
      const rounded = sqlDecimalRound(value, 0n, false)!.value
      if (rounded.lt('${min.slice(0, -1)}') || rounded.gt('${max.slice(0, -1)}')) throw new SqlIntegerError()
      return sqlIntegerRange(BigInt(rounded.toFixed(0)), ${min}, ${max})
    }`,
  }
}
for (const [width, digits] of [
  ['Float4', 6],
  ['Float8', 15],
] as const) {
  typescriptDecimalHelpers[`decimalFrom${width}`] = {
    dependencies: ['sqlDecimalFromFloat'],
    source: `function decimalFrom${width}(value: number | null): SqlDecimal | null { return sqlDecimalFromFloat(value, ${digits}) }`,
  }
}
