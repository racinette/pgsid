import { decimalMathSpecs } from './decimal-math-specs.js'
import { decimalSpecs } from './decimal-specs.js'
import type {
  FloatType,
  NumericType,
  SqlExpression,
} from '../../../../src/sql-semantics/expressions.js'
import { functionMetadata, operatorMetadata } from '../../../../src/postgres/builtins/inventory.js'
import { integer, integerWidths } from './integer-addition.js'

export interface NumericSpec {
  stress?: boolean
  name: string
  sql: string
  expression: SqlExpression
}
interface Operand {
  sql: string
  expression: SqlExpression
}
const specs: NumericSpec[] = []
const sqlInteger = (
  type: (typeof integerWidths)[number]['type'],
  value: string | null,
): Operand => ({
  sql: `${value === null ? 'NULL' : `'${value}'`}::${type}`,
  expression: integer(type, value),
})
function binary(name: string, op: string, left: Operand, right: Operand, fn = false): Operand {
  const signature = `${fn ? 'function' : 'operator'}:["pg_catalog","${op}"](${left.expression.type},${right.expression.type})`
  const metadata = fn ? functionMetadata(signature) : operatorMetadata(signature)
  const operand: Operand = {
    sql: fn
      ? `pg_catalog.${op}((${left.sql}), (${right.sql}))`
      : `((${left.sql}) ${op} (${right.sql}))`,
    expression: {
      kind: fn ? 'function' : 'operator',
      signature,
      type: metadata.result,
      operands: [left.expression, right.expression],
    },
  }
  specs.push({ name, ...operand })
  return operand
}
function unary(name: string, op: string, value: Operand, fn = false): Operand {
  const signature = `${fn ? 'function' : 'operator'}:["pg_catalog","${op}"](${fn ? '' : ','}${value.expression.type})`
  const metadata = fn ? functionMetadata(signature) : operatorMetadata(signature)
  const operand: Operand = {
    sql: fn ? `pg_catalog.${op}((${value.sql}))` : `(${op} (${value.sql}))`,
    expression: {
      kind: fn ? 'function' : 'operator',
      signature,
      type: metadata.result,
      operands: [value.expression],
    },
  }
  specs.push({ name, ...operand })
  return operand
}
function cast(name: string, type: NumericType, value: Operand): Operand {
  const operand: Operand = {
    sql: `((${value.sql})::${type})`,
    expression: {
      kind: 'cast',
      signature:
        type === value.expression.type
          ? null
          : `function:["pg_catalog","${type.slice('pg_catalog.'.length)}"](${value.expression.type})`,
      type,
      operand: value.expression,
    },
  }
  specs.push({ name, ...operand })
  return operand
}
for (const left of integerWidths) {
  for (const right of integerWidths) {
    const values: readonly (readonly [string | null, string | null])[] = [
      ['7', '3'],
      ['-7', '3'],
      ['7', '-3'],
      ['-7', '-3'],
      ['0', '1'],
      ['1', '0'],
      ['0', '0'],
      [left.min, '-1'],
      [left.max, '-1'],
      [left.min, '1'],
      [left.max, '1'],
      [left.min, right.min],
      [left.max, right.max],
      [null, '0'],
      ['0', null],
      [null, null],
    ]
    for (const [a, b] of values)
      binary(
        `${left.type}/${right.type} division ${a}/${b}`,
        '/',
        sqlInteger(left.type, a),
        sqlInteger(right.type, b),
      )
    if (left.type !== right.type) continue
    for (const [a, b] of values) {
      binary(
        `${left.type} remainder ${a}/${b}`,
        '%',
        sqlInteger(left.type, a),
        sqlInteger(left.type, b),
      )
      binary(
        `${left.type} mod ${a}/${b}`,
        'mod',
        sqlInteger(left.type, a),
        sqlInteger(left.type, b),
        true,
      )
    }
    if (left.type === 'pg_catalog.int2') continue
    for (const fn of ['gcd', 'lcm']) {
      for (const [a, b] of [
        ['12', '18'],
        ['-12', '18'],
        ['12', '-18'],
        ['-12', '-18'],
        ['0', '0'],
        ['0', '7'],
        ['7', '0'],
        [left.min, '0'],
        ['0', left.min],
        [left.min, '1'],
        [left.min, '2'],
        [left.min, left.min],
        [left.min, left.max],
        [left.max, left.max],
        [left.max, '2'],
        [left.max, '1'],
        ['0', null],
        [null, left.min],
        [left.max, null],
        [null, null],
      ] as const)
        binary(
          `${left.type} ${fn} ${a}/${b}`,
          fn,
          sqlInteger(left.type, a),
          sqlInteger(left.type, b),
          true,
        )
    }
  }
}
const floatWidths: readonly FloatType[] = ['pg_catalog.float4', 'pg_catalog.float8']
const f = (type: FloatType, value: number | null, sqlValue?: string): Operand => {
  const single = type === 'pg_catalog.float4'
  const view = new DataView(new ArrayBuffer(single ? 4 : 8))
  if (value !== null) {
    if (single) view.setFloat32(0, value)
    else view.setFloat64(0, value)
  }
  return {
    sql: `${value === null ? 'NULL' : `'${sqlValue ?? (Object.is(value, -0) ? '-0' : value.toString())}'`}::${type}`,
    expression: {
      kind: 'float',
      type,
      bits:
        value === null
          ? null
          : Array.from(new Uint8Array(view.buffer), (byte) =>
              byte.toString(16).padStart(2, '0'),
            ).join(''),
    },
  }
}
const max = (type: FloatType) =>
  type === 'pg_catalog.float4' ? 3.4028234663852886e38 : Number.MAX_VALUE
const tiny = (type: FloatType) => (type === 'pg_catalog.float4' ? 2 ** -149 : Number.MIN_VALUE)
const normal = (type: FloatType) => (type === 'pg_catalog.float4' ? 2 ** -126 : 2 ** -1022)
const values = (type: FloatType): readonly (number | null)[] => [
  null,
  0,
  -0,
  1,
  -1,
  2,
  3,
  0.5,
  0.1,
  max(type),
  -max(type),
  normal(type),
  tiny(type),
  -tiny(type),
  NaN,
  Infinity,
  -Infinity,
]
for (const type of floatWidths) {
  values(type).forEach((value, index) =>
    specs.push({ name: `${type} literal ${index}`, ...f(type, value) }),
  )
  for (const op of ['-', '+', '@', 'abs'])
    values(type).forEach((value, index) =>
      unary(`${type} unary ${op} ${index}`, op, f(type, value), op === 'abs'),
    )
  values(type).forEach((value, index) => cast(`${type} relabel ${index}`, type, f(type, value)))
  const other = type === 'pg_catalog.float4' ? 'pg_catalog.float8' : 'pg_catalog.float4'
  values(type).forEach((value, index) =>
    cast(`${type} to ${other} ${index}`, other, f(type, value)),
  )
  if (type === 'pg_catalog.float8') {
    for (const value of [1e39, -1e39, 1e-46, -1e-46, 16777217, 16777219, 2 ** -150, 3 * 2 ** -150])
      cast(`float8 narrowing ${value}`, 'pg_catalog.float4', f(type, value))
  }
  for (const width of integerWidths) {
    const intValues: readonly (string | null)[] = [
      null,
      '0',
      '1',
      '-1',
      width.min,
      width.max,
      ...(width.type === 'pg_catalog.int4' ? ['16777217', '-16777217', '16777219'] : []),
      ...(width.type === 'pg_catalog.int8'
        ? [
            '9007199254740993',
            ...[-1n, 0n, 1n].flatMap((offset) => {
              const midpoint = (1n << 62n) + (1n << 38n) + offset
              return [midpoint.toString(), (-midpoint).toString()]
            }),
          ]
        : []),
    ]
    for (const value of intValues)
      cast(`${width.type} to ${type} ${value}`, type, sqlInteger(width.type, value))
    const floatValues = [
      null,
      0,
      -0,
      0.5,
      -0.5,
      1.5,
      -1.5,
      2.5,
      -2.5,
      1.4,
      -1.4,
      NaN,
      Infinity,
      -Infinity,
      Number(width.min),
      Number(width.max),
      Number(width.min) - 1,
      Number(width.max) + 1,
      ...(width.type === 'pg_catalog.int2' ? [32766.5, 32767.4, 32767.5, -32768.5, -32768.6] : []),
      ...(width.type === 'pg_catalog.int4'
        ? [2147483646.5, 2147483647.4, 2147483647.5, -2147483648.5, -2147483648.6]
        : []),
      ...(width.type === 'pg_catalog.int8' ? [9223372036854774784, -9223372036854774784] : []),
    ]
    floatValues.forEach((value, index) =>
      cast(
        `${type} to ${width.type} ${index}`,
        width.type,
        f(
          type,
          value,
          type === 'pg_catalog.float4' && value !== null
            ? Math.fround(value).toString()
            : undefined,
        ),
      ),
    )
  }
  for (const rightType of floatWidths) {
    const pairs: readonly (readonly [number | null, number | null])[] = [
      [1, 2],
      [0.1, 0.1],
      [3, 2],
      [-3, 2],
      [3, -2],
      [0, 0],
      [-0, 0],
      [0, -0],
      [-0, -0],
      [1, 0],
      [0, 1],
      [1, -0],
      [max(type), max(rightType)],
      [-max(type), max(rightType)],
      [max(type), 2],
      [max(type), tiny(rightType)],
      [normal(type), 0.5],
      [tiny(type), 0.5],
      [tiny(type), 2],
      [tiny(type), tiny(rightType)],
      [Infinity, 1],
      [-Infinity, 1],
      [1, Infinity],
      [1, -Infinity],
      [Infinity, Infinity],
      [Infinity, -Infinity],
      [Infinity, 0],
      [NaN, NaN],
      [NaN, Infinity],
      [Infinity, NaN],
      [NaN, 0],
      [0, NaN],
      [NaN, 1],
      [1, NaN],
      [null, 0],
      [0, null],
      [null, null],
      [null, Infinity],
      [NaN, null],
    ]
    for (const op of ['+', '-', '*', '/', '=', '<>', '<', '<=', '>', '>='])
      pairs.forEach(([a, b], index) =>
        binary(`${type}/${rightType} ${op} ${index}`, op, f(type, a), f(rightType, b)),
      )
    for (const op of ['=', '<>', '<', '<=', '>', '>=']) {
      for (const [a, b] of [
        [16777216, 16777217],
        [9007199254740992, 9007199254740994],
        [-Infinity, 0],
        [NaN, -Infinity],
      ] as const)
        binary(
          `${type}/${rightType} precision ${op} ${a}/${b}`,
          op,
          f(type, a, type === 'pg_catalog.float4' ? Math.fround(a).toString() : undefined),
          f(
            rightType,
            b,
            rightType === 'pg_catalog.float4' ? Math.fround(b).toString() : undefined,
          ),
        )
    }
  }
}
const intZero = sqlInteger('pg_catalog.int8', '0')
const intOne = sqlInteger('pg_catalog.int8', '1')
const failedDivision = binary('nested integer zero divisor', '/', intOne, intZero)
const failedCast = cast(
  'integer division error through float cast',
  'pg_catalog.float8',
  failedDivision,
)
binary(
  'integer division error through float comparison',
  '=',
  failedCast,
  f('pg_catalog.float8', null),
)
unary('integer division error through float abs', 'abs', failedCast, true)
const failedFloat = binary(
  'nested float zero divisor',
  '/',
  f('pg_catalog.float4', 1),
  f('pg_catalog.float4', 0),
)
const failedFloatCast = cast(
  'float division error through integer cast',
  'pg_catalog.int4',
  failedFloat,
)
binary(
  'float division error through integer remainder',
  '%',
  failedFloatCast,
  sqlInteger('pg_catalog.int4', null),
)
const rounded = binary(
  'float4 rounds intermediate addition',
  '+',
  f('pg_catalog.float4', 16777216),
  f('pg_catalog.float4', 1),
)
const widened = cast('widen rounded float4 intermediate', 'pg_catalog.float8', rounded)
binary('widening preserves intermediate rounding', '-', widened, f('pg_catalog.float8', 16777216))
const minDivide = binary(
  'integer modulo minimum by negative one',
  '%',
  sqlInteger('pg_catalog.int8', integerWidths[2].min),
  sqlInteger('pg_catalog.int8', '-1'),
)
cast('minimum remainder to float', 'pg_catalog.float4', minDivide)
specs.push({
  name: 'float4 decimal parsing double rounding boundary',
  sql: "'7.038531e-26'::pg_catalog.float4",
  expression: { kind: 'float', type: 'pg_catalog.float4', bits: '15ae43fd' },
})
for (const width of integerWidths) {
  const operands = [null, '0', '1', '-1', '3', '-3', width.min, width.max]
  for (const op of ['&', '|', '#'])
    for (const left of operands)
      for (const right of operands)
        binary(
          `${width.type} bitwise ${op} ${left}/${right}`,
          op,
          sqlInteger(width.type, left),
          sqlInteger(width.type, right),
        )
  for (const op of ['~', '+', '@'])
    for (const value of operands)
      unary(`${width.type} integer unary ${op} ${value}`, op, sqlInteger(width.type, value))
  for (const op of ['<<', '>>'])
    for (const left of operands)
      for (const count of [
        null,
        '-2147483648',
        '-65',
        '-64',
        '-33',
        '-32',
        '-17',
        '-16',
        '-1',
        '0',
        '1',
        '15',
        '16',
        '17',
        '31',
        '32',
        '33',
        '63',
        '64',
        '65',
        '2147483647',
      ])
        binary(
          `${width.type} shift ${op} ${left}/${count}`,
          op,
          sqlInteger(width.type, left),
          sqlInteger('pg_catalog.int4', count),
        )
}
const utilityValues: readonly (number | null)[] = [
  ...values('pg_catalog.float8'),
  0.25,
  -0.25,
  -0.5,
  1.5,
  -1.5,
  2.5,
  -2.5,
  3.5,
  -3.5,
  0.49999999999999994,
  0.5000000000000001,
  1.4999999999999998,
  1.5000000000000002,
  -0.49999999999999994,
  -0.5000000000000001,
  4,
  8,
  -8,
  27,
  -27,
  64,
  -64,
  1e-300,
  -1e-300,
  1e300,
  -1e300,
  4503599627370495.5,
  -4503599627370495.5,
  4503599627370496,
  9007199254740992,
]
for (const fn of ['ceil', 'ceiling', 'floor', 'round', 'trunc', 'sign', 'sqrt', 'cbrt'])
  utilityValues.forEach((value, index) =>
    unary(`float8 utility ${fn} ${index}`, fn, f('pg_catalog.float8', value), true),
  )
for (const op of ['|/', '||/'])
  utilityValues.forEach((value, index) =>
    unary(`float8 root operator ${op} ${index}`, op, f('pg_catalog.float8', value)),
  )
let rootSeed = 0x6a09e667
for (let index = 0; index < 96; index++) {
  rootSeed = (Math.imul(rootSeed, 1664525) + 1013904223) >>> 0
  const magnitude = (1 + rootSeed / 2 ** 32) * 2 ** (((index * 23) % 2097) - 1074)
  for (const [suffix, value] of [
    ['positive', magnitude],
    ['negative', -magnitude],
  ] as const) {
    const operand = f('pg_catalog.float8', value)
    unary(`float8 sampled cbrt ${index} ${suffix}`, 'cbrt', operand, true)
    unary(`float8 sampled sqrt ${index} ${suffix}`, 'sqrt', operand, true)
  }
}
for (const fn of ['ceil', 'ceiling', 'floor', 'round', 'trunc', 'sign', 'sqrt', 'cbrt']) {
  const widened = cast(
    `utility ${fn} widen float4`,
    'pg_catalog.float8',
    f('pg_catalog.float4', 2.5),
  )
  unary(`utility ${fn} accepts widened float4`, fn, widened, true)
  unary(`utility ${fn} propagates division error`, fn, failedCast, true)
}
const rootFailure = unary('nested negative square root', 'sqrt', f('pg_catalog.float8', -1), true)
unary('negative square root error through round', 'round', rootFailure, true)
binary(
  'negative square root error through null comparison',
  '=',
  rootFailure,
  f('pg_catalog.float8', null),
)
const shifted = binary(
  'shift wraps int2 before cast',
  '<<',
  sqlInteger('pg_catalog.int2', '1'),
  sqlInteger('pg_catalog.int4', '15'),
)
cast('shift wrapping preserved when widened', 'pg_catalog.int8', shifted)
binary(
  'division error through null bitwise operand',
  '&',
  failedDivision,
  sqlInteger('pg_catalog.int8', null),
)
export const numericSpecs: readonly NumericSpec[] = [...specs, ...decimalSpecs, ...decimalMathSpecs]
