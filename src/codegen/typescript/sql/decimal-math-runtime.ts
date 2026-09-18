/*
PostgreSQL Database Management System
(also known as Postgres, formerly known as Postgres95)

Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group

Portions Copyright (c) 1994, The Regents of the University of California

Permission to use, copy, modify, and distribute this software and its
documentation for any purpose, without fee, and without a written agreement
is hereby granted, provided that the above copyright notice and this
paragraph and the following two paragraphs appear in all copies.

IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
*/

export const typescriptDecimalMathHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  SqlDecimalMath: {
    dependencies: ['decimalLibrary'],
    source: `type SqlDecimalMath = { value: Decimal; scale: number }`,
  },
  sqlDecimalMathError: {
    dependencies: [],
    source: `class SqlDecimalMathError extends Error {
  constructor(readonly code: string) { super('invalid numeric math argument') }
}`,
  },
  sqlDecimalMathRound: {
    dependencies: ['SqlDecimalMath'],
    source: `function sqlDecimalMathRound(value: Decimal, scale: number): SqlDecimalMath {
  const Constructor = Decimal.clone({ precision: Math.max(1, value.e + Math.max(0, scale) + 4, value.sd() + 2), rounding: Decimal.ROUND_HALF_UP, minE: -1000000000, maxE: 1000000000 })
  const x = new Constructor(value)
  return { value: scale < 0 ? x.toNearest(new Constructor('1e' + -scale), Decimal.ROUND_HALF_UP) : x.toDP(scale, Decimal.ROUND_HALF_UP), scale }
}`,
  },
  sqlDecimalMathDigits: {
    dependencies: ['decimalLibrary'],
    source: `function sqlDecimalMathDigits(value: Decimal): { digits: number[]; weight: number } {
  if (value.isZero()) return { digits: [], weight: 0 }
  const weight = Math.floor(value.e / 4), length = value.e - weight * 4 + 1
  let text = value.abs().toExponential().split('e')[0]!.replace('.', '')
  text = text.padEnd(length, '0')
  text = text.padStart(text.length + 4 - length, '0')
  text = text.padEnd(Math.ceil(text.length / 4) * 4, '0')
  const digits = Array.from({ length: text.length / 4 }, (_, i) => Number(text.slice(i * 4, i * 4 + 4)))
  while (digits.at(-1) === 0) digits.pop()
  return { digits, weight }
}`,
  },
  sqlDecimalMathFromPairs: {
    dependencies: ['decimalLibrary'],
    source: `function sqlDecimalMathFromPairs(pairs: readonly bigint[], weight: number, negative: boolean): Decimal {
  const text = pairs.map(x => x.toString().padStart(8, '0')).join('')
  return new Decimal((negative ? '-' : '') + (text || '0') + 'e' + (4 * (weight + 1 - 2 * pairs.length)))
}`,
  },
  sqlDecimalMathAdd: {
    dependencies: ['SqlDecimalMath', 'sqlDecimalContext'],
    source: `function sqlDecimalMathAdd(a: SqlDecimalMath, b: SqlDecimalMath, subtract = false): SqlDecimalMath {
  const Constructor = sqlDecimalContext(a.value, b.value), x = new Constructor(a.value)
  return { value: subtract ? x.sub(b.value) : x.add(b.value), scale: Math.max(a.scale, b.scale) }
}`,
  },
  sqlDecimalMathMul: {
    dependencies: [
      'sqlDecimalMathDigits',
      'sqlDecimalMathFromPairs',
      'sqlDecimalMathRound',
      'sqlDecimalContext',
    ],
    source: `function sqlDecimalMathMul(a: SqlDecimalMath, b: SqlDecimalMath, scale: number): SqlDecimalMath {
  let x = sqlDecimalMathDigits(a.value), y = sqlDecimalMathDigits(b.value)
  if (x.digits.length > y.digits.length) [x, y] = [y, x]
  if (!x.digits.length) return { value: new Decimal(0), scale }
  const nx = x.digits.length, ny = y.digits.length, px = Math.ceil(nx / 2), py = Math.ceil(ny / 2)
  const full = Math.floor((nx + ny) / 2) + 1, offset = full - px - py + 1
  const weight = x.weight + y.weight + 1 + 2 * full - nx - ny - nx % 2 - ny % 2
  const maxdigits = weight + 1 + Math.trunc((scale + 3) / 4) + 2
  const count = Math.min(full, Math.trunc(maxdigits / 2) + 1)
  if (count >= full || (nx <= 6 && scale === a.scale + b.scale)) {
    const Constructor = sqlDecimalContext(a.value, b.value)
    return sqlDecimalMathRound(new Constructor(a.value).mul(b.value), scale)
  }
  if (count <= offset) return { value: new Decimal(0), scale }
  if (count - offset >= 64) {
    const coefficient = (v: Decimal) => { const text = v.abs().toExponential().split('e')[0]!.replace('.', ''); return { integer: BigInt(text), exponent: v.e + 1 - text.length } }
    const ca = coefficient(a.value), cb = coefficient(b.value)
    const exact = new Decimal((ca.integer * cb.integer).toString() + 'e' + (ca.exponent + cb.exponent))
    const bound = new Decimal(String(Math.min(px, py) * 99999999) + 'e' + (4 * (weight + 1 - 2 * count)))
    const Constructor = sqlDecimalContext(exact, bound)
    const lower = Decimal.max(0, new Constructor(exact).sub(bound))
    const high = sqlDecimalMathRound(exact, scale), low = sqlDecimalMathRound(lower, scale)
    // Omitted convolution terms lie within this interval; equal rounded endpoints certify the result.
    if (high.value.eq(low.value)) { if (a.value.isNegative() !== b.value.isNegative()) high.value = high.value.neg(); return high }
  }
  const pairs = Array<bigint>(count).fill(0n)
  if (count - offset >= 64) {
    // Each field holds a convolution coefficient without carrying into its neighbor.
    const pack = (digits: number[], length: number) => BigInt('0x' + Array.from({ length }, (_, i) => (digits[2 * i]! * 10000 + (digits[2 * i + 1] ?? 0)).toString(16).padStart(18, '0')).join(''))
    const lx = Math.min(px, count - offset), ly = Math.min(py, count - offset)
    const product = (pack(x.digits, lx) * pack(y.digits, ly)).toString(16).padStart((lx + ly - 1) * 18, '0')
    for (let i = 0; i < Math.min(count - offset, lx + ly - 1); i++) pairs[i + offset] = BigInt('0x' + product.slice(i * 18, (i + 1) * 18))
  } else {
  for (let i = 0; i < Math.min(px, count - offset); i++) {
    const p = BigInt(x.digits[2 * i]! * 10000 + (x.digits[2 * i + 1] ?? 0))
    for (let j = 0; j < Math.min(py, count - i - offset); j++)
      pairs[i + j + offset]! += p * BigInt(y.digits[2 * j]! * 10000 + (y.digits[2 * j + 1] ?? 0))
  }
  }
  let carry = 0n
  for (let i = count - 1; i >= 0; i--) { const v = pairs[i]! + carry; pairs[i] = v % 100000000n; carry = v / 100000000n }
  return sqlDecimalMathRound(sqlDecimalMathFromPairs(pairs, weight, a.value.isNegative() !== b.value.isNegative()), scale)
}`,
  },
  sqlDecimalMathDiv: {
    dependencies: [
      'sqlDecimalMathDigits',
      'sqlDecimalMathFromPairs',
      'sqlDecimalMathRound',
      'sqlDecimalMathError',
    ],
    source: `function sqlDecimalMathDiv(a: SqlDecimalMath, b: SqlDecimalMath, scale: number, exact = true): SqlDecimalMath {
  if (b.value.isZero()) throw new SqlDecimalMathError('22012')
  if (a.value.isZero()) return { value: new Decimal(0), scale }
  const x = sqlDecimalMathDigits(a.value), y = sqlDecimalMathDigits(b.value)
  if (exact || y.digits.length <= 12) {
    const Constructor = Decimal.clone({ precision: Math.max(1, a.value.e - b.value.e + scale + 4), rounding: Decimal.ROUND_DOWN, minE: -1000000000, maxE: 1000000000 })
    return sqlDecimalMathRound(new Constructor(a.value).div(b.value), scale)
  }
  const weight = x.weight - y.weight + 1
  const ndigits = Math.max(weight + 1 + Math.trunc((scale + 3) / 4), 1) + 4
  const count = Math.ceil(ndigits / 2), divisorCount = Math.min(Math.ceil(y.digits.length / 2), count)
  const dividend = Array<bigint>(count + 1).fill(0n)
  const divisor = Array.from({ length: divisorCount }, (_, i) => BigInt(y.digits[2 * i]! * 10000 + (y.digits[2 * i + 1] ?? 0)))
  for (let i = 0; i < Math.min(Math.ceil(x.digits.length / 2), count); i++) dividend[i] = BigInt(x.digits[2 * i]! * 10000 + (x.digits[2 * i + 1] ?? 0))
  const inverse = 1 / (Number(divisor[0]!) * 100000000 + Number(divisor[1] ?? 0n))
  const digit = (q: number) => { const f = (Number(dividend[q]!) * 100000000 + Number(dividend[q + 1]!)) * inverse; return Math.trunc(f) - (f < 0 ? 1 : 0) }
  const floor = (v: bigint) => v >= 0n ? v / 100000000n : -((-v - 1n) / 100000000n) - 1n
  let maxdiv = 1
  for (let q = 0; q < count; q++) {
    let d = digit(q)
    if (d !== 0) {
      maxdiv += Math.abs(d)
      if (maxdiv > 92233720368) {
        let carry = 0n
        for (let i = Math.min(q + divisorCount - 2, count - 1); i > q; i--) { const v = dividend[i]! + carry; carry = floor(v); dividend[i] = v - carry * 100000000n }
        dividend[q]! += carry; d = digit(q); maxdiv = 1 + Math.abs(d)
      }
      for (let i = 0; i < Math.min(divisorCount, count - q); i++) dividend[q + i]! -= BigInt(d) * divisor[i]!
    }
    dividend[q + 1]! += dividend[q]! * 100000000n; dividend[q] = BigInt(d)
  }
  let carry = 0n
  for (let i = count - 1; i >= 0; i--) { const v = dividend[i]! + carry; carry = floor(v); dividend[i] = v - carry * 100000000n }
  return sqlDecimalMathRound(sqlDecimalMathFromPairs(dividend.slice(0, count), weight, a.value.isNegative() !== b.value.isNegative()), scale)
}`,
  },
  sqlDecimalMathSqrt: {
    dependencies: ['sqlDecimalMathDigits', 'sqlDecimalMathError', 'sqlDecimalMathRound'],
    source: `function sqlDecimalMathSqrt(a: SqlDecimalMath, scale: number): SqlDecimalMath {
  if (a.value.isNegative() && !a.value.isZero()) throw new SqlDecimalMathError('2201F')
  if (a.value.isZero()) return { value: new Decimal(0), scale }
  const text = a.value.toExponential().split('e')[0]!.replace('.', '')
  const coefficient = BigInt(text), exponent = a.value.e + 1 - text.length + 2 * scale
  const numerator = exponent >= 0 ? coefficient * 10n ** BigInt(exponent) : coefficient
  const denominator = exponent < 0 ? 10n ** BigInt(-exponent) : 1n
  const n = numerator / denominator
  let q = n === 0n ? 0n : 1n << BigInt(Math.ceil(n.toString(2).length / 2))
  if (q !== 0n) { for (;;) { const next = (q + n / q) / 2n; if (next >= q) break; q = next } }
  if (4n * numerator >= denominator * (2n * q + 1n) ** 2n) q++
  return { value: new Decimal(q.toString() + 'e' + -scale), scale }
}`,
  },
  sqlDecimalMathExp: {
    dependencies: [
      'sqlDecimalMathMul',
      'sqlDecimalMathDiv',
      'sqlDecimalMathAdd',
      'sqlDecimalMathRound',
      'sqlDecimalMathError',
      'sqlDecimalMathDigits',
    ],
    source: `function sqlDecimalMathExp(a: SqlDecimalMath, scale: number): SqlDecimalMath {
  let val = Number(a.value.toString()), x = a, ndiv = 0
  if (Math.abs(val) >= 6000) { if (val > 0) throw new SqlDecimalMathError('22003'); return { value: new Decimal(0), scale } }
  const dweight = Math.trunc(val * 0.434294481903252)
  while (Math.abs(val) > 0.01) { ndiv++; val /= 2 }
  if (ndiv) x = sqlDecimalMathDiv(x, { value: new Decimal(2 ** ndiv), scale: 0 }, x.scale + ndiv)
  const sig = Math.max(1 + dweight + scale + Math.trunc(ndiv * 0.301029995663981), 0) + 8
  const local = sig - 1
  let result = sqlDecimalMathAdd({ value: new Decimal(1), scale: 0 }, x)
  let term = sqlDecimalMathDiv(sqlDecimalMathMul(x, x, local), { value: new Decimal(2), scale: 0 }, local), ni = 2
  while (!term.value.isZero()) { result = sqlDecimalMathAdd(result, term); term = sqlDecimalMathDiv(sqlDecimalMathMul(term, x, local), { value: new Decimal(++ni), scale: 0 }, local) }
  while (ndiv-- > 0) result = sqlDecimalMathMul(result, result, Math.max(0, sig - sqlDecimalMathDigits(result.value).weight * 8))
  return sqlDecimalMathRound(result.value, scale)
}`,
  },
  sqlDecimalMathLnWeight: {
    dependencies: ['sqlDecimalMathDigits', 'sqlDecimalMathAdd'],
    source: `function sqlDecimalMathLnWeight(value: Decimal): number {
  if (value.lte(0)) return 0
  if (value.gte('0.9') && value.lte('1.1')) {
    const delta = sqlDecimalMathAdd({ value, scale: 0 }, { value: new Decimal(1), scale: 0 }, true).value
    const { digits, weight } = sqlDecimalMathDigits(delta)
    return digits.length ? weight * 4 + Math.trunc(Math.log10(digits[0]!)) : 0
  }
  const { digits, weight } = sqlDecimalMathDigits(value)
  let d = digits[0]!, w = weight * 4
  if (digits.length > 1) { d = d * 10000 + digits[1]!; w -= 4 }
  return Math.trunc(Math.log10(Math.abs(Math.log(d) + w * 2.302585092994046)))
}`,
  },
  sqlDecimalMathLn: {
    dependencies: [
      'sqlDecimalMathSqrt',
      'sqlDecimalMathAdd',
      'sqlDecimalMathMul',
      'sqlDecimalMathDiv',
      'sqlDecimalMathDigits',
      'sqlDecimalMathError',
    ],
    source: `function sqlDecimalMathLn(a: SqlDecimalMath, scale: number): SqlDecimalMath {
  if (a.value.lte(0)) throw new SqlDecimalMathError('2201E')
  let x = a, factor = 2, nsqrt = 0
  while (x.value.lte('0.9') || x.value.gte('1.1')) {
    x = sqlDecimalMathSqrt(x, scale - Math.trunc(sqlDecimalMathDigits(x.value).weight * 4 / 2) + 8)
    factor *= 2; nsqrt++
  }
  const local = scale + Math.trunc((nsqrt + 1) * 0.301029995663981) + 8
  let result = sqlDecimalMathDiv(sqlDecimalMathAdd(x, { value: new Decimal(1), scale: 0 }, true), sqlDecimalMathAdd(x, { value: new Decimal(1), scale: 0 }), local, false)
  let xx = result; x = sqlDecimalMathMul(result, result, local); let ni = 1
  for (;;) {
    ni += 2; xx = sqlDecimalMathMul(xx, x, local)
    const term = sqlDecimalMathDiv(xx, { value: new Decimal(ni), scale: 0 }, local)
    if (term.value.isZero()) break
    result = sqlDecimalMathAdd(result, term)
    if (sqlDecimalMathDigits(term.value).weight < sqlDecimalMathDigits(result.value).weight - Math.trunc(local * 2 / 4)) break
  }
  return sqlDecimalMathMul(result, { value: new Decimal(factor), scale: 0 }, scale)
}`,
  },
  sqlDecimalMathScale: {
    dependencies: [],
    source: `function sqlDecimalMathScale(estimate: number, ...scales: number[]): number { return Math.min(1000, Math.max(0, 16 - Math.trunc(estimate), ...scales)) }`,
  },
  sqlDecimalMathPowerInt: {
    dependencies: [
      'sqlDecimalMathScale',
      'sqlDecimalMathDigits',
      'sqlDecimalMathRound',
      'sqlDecimalMathMul',
      'sqlDecimalMathDiv',
      'sqlDecimalMathError',
    ],
    source: `function sqlDecimalMathPowerInt(a: SqlDecimalMath, exponent: number, exponentScale: number): SqlDecimalMath {
  const { digits, weight } = sqlDecimalMathDigits(a.value)
  let f = 0
  if (digits.length) { f = digits[0]!; let p = weight * 4; for (let i = 1; i < digits.length && i < 4; i++) { f = f * 10000 + digits[i]!; p -= 4 } f = exponent * (Math.log10(f) + p) }
  if (f > 131072) throw new SqlDecimalMathError('22003')
  if (f + 1 < -1000) return { value: new Decimal(0), scale: 1000 }
  const scale = sqlDecimalMathScale(f, a.scale, exponentScale), one = { value: new Decimal(1), scale: 0 }
  if (exponent === 0) return { value: one.value, scale }
  if (exponent === 1) return sqlDecimalMathRound(a.value, scale)
  if (exponent === -1) return sqlDecimalMathDiv(one, a, scale)
  if (exponent === 2) return sqlDecimalMathMul(a, a, scale)
  if (!digits.length) return { value: new Decimal(0), scale }
  const sig = 1 + scale + Math.trunc(f) + Math.trunc(Math.log(Math.abs(exponent))) + 8
  let mask = Math.abs(exponent), base = a, result = mask % 2 ? a : one
  while ((mask = Math.floor(mask / 2)) > 0) {
    let local = Math.max(0, Math.min(sig - sqlDecimalMathDigits(base.value).weight * 8, 2 * base.scale))
    base = sqlDecimalMathMul(base, base, local)
    if (mask % 2) { local = Math.max(0, Math.min(sig - (sqlDecimalMathDigits(base.value).weight + sqlDecimalMathDigits(result.value).weight) * 4, base.scale + result.scale)); result = sqlDecimalMathMul(base, result, local) }
    if (sqlDecimalMathDigits(base.value).weight > 32767 || sqlDecimalMathDigits(result.value).weight > 32767) { if (exponent > 0) throw new SqlDecimalMathError('22003'); return { value: new Decimal(0), scale } }
  }
  return exponent < 0 ? sqlDecimalMathDiv(one, result, scale, false) : sqlDecimalMathRound(result.value, scale)
}`,
  },
  sqlDecimalMathPower: {
    dependencies: [
      'sqlDecimalMathPowerInt',
      'sqlDecimalMathLnWeight',
      'sqlDecimalMathLn',
      'sqlDecimalMathMul',
      'sqlDecimalMathExp',
      'sqlDecimalMathScale',
      'sqlDecimalMathError',
    ],
    source: `function sqlDecimalMathPower(a: SqlDecimalMath, b: SqlDecimalMath): SqlDecimalMath {
  if (b.value.isInteger() && b.value.gte(-2147483648) && b.value.lte(2147483647)) return sqlDecimalMathPowerInt(a, Number(b.value.toString()), b.scale)
  if (a.value.isZero()) return { value: new Decimal(0), scale: 16 }
  const negative = a.value.isNegative()
  if (negative && !b.value.isInteger()) throw new SqlDecimalMathError('2201F')
  const base = { value: a.value.abs(), scale: a.scale }, lw = sqlDecimalMathLnWeight(base.value)
  let local = Math.max(0, 8 - lw)
  let product = sqlDecimalMathMul(sqlDecimalMathLn(base, local), b, local)
  let val = Number(product.value.toString())
  if (Math.abs(val) > 2000 * 3.01) { if (val > 0) throw new SqlDecimalMathError('22003'); return { value: new Decimal(0), scale: 1000 } }
  val *= 0.434294481903252
  const scale = sqlDecimalMathScale(val, a.scale, b.scale), sig = Math.max(0, scale + Math.trunc(val))
  local = Math.max(0, sig - lw + 8)
  product = sqlDecimalMathMul(sqlDecimalMathLn(base, local), b, local)
  const result = sqlDecimalMathExp(product, scale)
  if (negative && !b.value.mod(2).isZero()) result.value = result.value.neg()
  return result
}`,
  },
  sqlDecimalMathUnary: {
    dependencies: [
      'SqlDecimal',
      'sqlDecimalMathError',
      'sqlDecimalMathScale',
      'sqlDecimalMathDigits',
      'sqlDecimalMathSqrt',
      'sqlDecimalMathExp',
      'sqlDecimalMathLnWeight',
      'sqlDecimalMathLn',
    ],
    source: `function sqlDecimalMathUnary(a: SqlDecimal | null, operation: string): SqlDecimal | null {
  if (a === null) return null
  if (!a.value.isFinite()) {
    if (a.value.eq(-Infinity)) { if (operation === 'exp') return new SqlDecimal(new Decimal(0), 0); throw new SqlDecimalMathError(operation === 'sqrt' ? '2201F' : '2201E') }
    return a
  }
  let result: SqlDecimalMath
  if (operation === 'sqrt') result = sqlDecimalMathSqrt(a, sqlDecimalMathScale(sqlDecimalMathDigits(a.value).weight * 2 + 1, a.scale))
  else if (operation === 'exp') result = sqlDecimalMathExp(a, sqlDecimalMathScale(Math.max(-2000, Math.min(2000, Number(a.value.toString()) * 0.434294481903252)), a.scale))
  else result = sqlDecimalMathLn(a, sqlDecimalMathScale(sqlDecimalMathLnWeight(a.value), a.scale))
  return new SqlDecimal(result.value, Math.max(0, result.scale))
}`,
  },
  decimalPower: {
    dependencies: ['SqlDecimal', 'sqlDecimalMathPower', 'sqlDecimalMathError'],
    source: `function decimalPower(a: SqlDecimal | null, b: SqlDecimal | null): SqlDecimal | null {
  if (a === null || b === null) return null
  const x = a.value, y = b.value
  if (x.isNaN() || y.isNaN()) return new SqlDecimal(new Decimal((x.isNaN() && y.isZero()) || (y.isNaN() && x.eq(1)) ? 1 : NaN), 0)
  if (x.isZero() && y.lt(0) || x.lt(0) && y.isFinite() && !y.isInteger()) throw new SqlDecimalMathError('2201F')
  if (!x.isFinite() || !y.isFinite()) {
    if (x.eq(1) || y.isZero()) return new SqlDecimal(new Decimal(1), 0)
    if (x.isZero()) return new SqlDecimal(new Decimal(0), 0)
    if (!y.isFinite() && x.eq(-1)) return new SqlDecimal(new Decimal(1), 0)
  if (!y.isFinite()) return new SqlDecimal(new Decimal(x.abs().gt(1) === y.gt(0) ? Infinity : 0), 0)
    return new SqlDecimal(new Decimal(y.lt(0) ? 0 : x.lt(0) && !y.mod(2).isZero() ? -Infinity : Infinity), 0)
  }
  const result = sqlDecimalMathPower(a, b)
  return new SqlDecimal(result.value, result.scale)
}`,
  },
  decimalLog: {
    dependencies: [
      'SqlDecimal',
      'sqlDecimalMathLnWeight',
      'sqlDecimalMathLn',
      'sqlDecimalMathDiv',
      'sqlDecimalMathScale',
      'sqlDecimalMathError',
    ],
    source: `function decimalLog(base: SqlDecimal | null, a: SqlDecimal | null): SqlDecimal | null {
  if (base === null || a === null) return null
  if (base.value.isNaN() || a.value.isNaN()) return new SqlDecimal(new Decimal(NaN), 0)
  if (!base.value.isFinite() || !a.value.isFinite()) {
    if (base.value.lte(0) || a.value.lte(0)) throw new SqlDecimalMathError('2201E')
    return new SqlDecimal(new Decimal(!base.value.isFinite() ? !a.value.isFinite() ? NaN : 0 : Infinity), 0)
  }
  const bw = sqlDecimalMathLnWeight(base.value), aw = sqlDecimalMathLnWeight(a.value), dw = aw - bw
  const scale = sqlDecimalMathScale(dw, base.scale, a.scale)
  const denominator = sqlDecimalMathLn(base, Math.max(0, scale + dw - bw + 8)), numerator = sqlDecimalMathLn(a, Math.max(0, scale + dw - aw + 8))
  const result = sqlDecimalMathDiv(numerator, denominator, scale, false)
  return new SqlDecimal(result.value, result.scale)
}`,
  },
  decimalSqrt: {
    dependencies: ['sqlDecimalMathUnary'],
    source: `function decimalSqrt(a: SqlDecimal | null): SqlDecimal | null { return sqlDecimalMathUnary(a, 'sqrt') }`,
  },
  decimalExp: {
    dependencies: ['sqlDecimalMathUnary'],
    source: `function decimalExp(a: SqlDecimal | null): SqlDecimal | null { return sqlDecimalMathUnary(a, 'exp') }`,
  },
  decimalLn: {
    dependencies: ['sqlDecimalMathUnary'],
    source: `function decimalLn(a: SqlDecimal | null): SqlDecimal | null { return sqlDecimalMathUnary(a, 'ln') }`,
  },
  decimalLog10: {
    dependencies: ['decimalLog'],
    source: `function decimalLog10(a: SqlDecimal | null): SqlDecimal | null { return decimalLog(new SqlDecimal(new Decimal(10), 0), a) }`,
  },
}
