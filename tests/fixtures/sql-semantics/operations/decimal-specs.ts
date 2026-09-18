import type {
  SqlExpression,
  NumericType,
  FloatType,
} from '../../../../src/sql-semantics/expressions.js'
import { functionMetadata, operatorMetadata } from '../../../../src/postgres/builtins/inventory.js'
import type { NumericSpec } from './numeric-specs.js'
import { integerWidths } from './integer-addition.js'

type DecimalOperation =
  | 'parse'
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'mod'
  | 'round'
  | 'cancel'
  | 'eq'
  | 'ne'
  | 'lt'
  | 'le'
  | 'gt'
  | 'ge'

interface DecimalCase {
  name: string
  group: string
  op: DecimalOperation
  left: string | null
  right?: string | null
  scale: number
}

const cases: DecimalCase[] = []
const literal = (value: string | null) => (value === null ? 'NULL::numeric' : `'${value}'::numeric`)
const add = (
  group: string,
  op: DecimalOperation,
  left: string | null,
  right?: string | null,
  scale = 0,
) => {
  cases.push({
    name: `${group}: ${op} ${left}${right === undefined ? '' : ` / ${right}`}${op === 'round' ? ` at ${scale}` : ''}`,
    group,
    op,
    left,
    ...(right === undefined ? {} : { right }),
    scale,
  })
}

for (const value of [
  '0',
  '-0.0000',
  '1.2300',
  '1.00e-3',
  '1e40',
  '1e-100',
  '9007199254740993.0001',
  '9'.repeat(100),
  'NaN',
  'Infinity',
  '-Infinity',
])
  add('parsing', 'parse', value)
for (const [left, right] of [
  ['0.1', '0.2'],
  ['1.2300', '2.1'],
  ['-1.2300', '2.1'],
  ['-7.00', '3.0'],
  ['7.00', '-3.0'],
  ['0.00000000000000000001', '3'],
  ['123456789012345678901234567890', '1'],
  ['1e100', '1'],
  ['9'.repeat(100), '9'.repeat(80)],
  ['1.2345678901234567890123456789', '9.8765432109876543210987654321'],
] as const)
  for (const op of ['add', 'sub', 'mul', 'mod'] as const) add('finite arithmetic', op, left, right)
for (const [left, right] of [
  ['0', '3'],
  ['1', '3'],
  ['2', '3'],
  ['1.00', '2'],
  ['10', '3'],
  ['10000', '3'],
  ['1e20', '3'],
  ['1e-100', '3'],
  ['1', '1e100'],
  ['1.000000000000000000000000', '3'],
  ['-7.00', '3.0'],
  ['7.00', '-3.0'],
  ['123456789012345678901234567890', '7'],
  ['1.2345', '0.9876'],
  ['1.0000', '1.0001'],
  ['9999', '10000'],
  ['10000', '9999'],
  ['1.0000000000000000000050000000000000000000000000000000000000001', '1'],
] as const)
  add('division', 'div', left, right)
for (const value of [
  '2.5',
  '-2.5',
  '1.005',
  '-1.005',
  '999.995',
  '-999.995',
  '0.0005',
  '-0.0005',
  '123456789012345678901234567890.5',
])
  for (const scale of [-3, -1, 0, 2, 3, 8]) add('rounding', 'round', value, undefined, scale)
for (const [left, right] of [
  ['1.00', '1'],
  ['-0.00', '0'],
  ['NaN', 'NaN'],
  ['NaN', 'Infinity'],
  ['Infinity', 'NaN'],
  ['-Infinity', '0'],
] as const)
  for (const op of ['eq', 'ne', 'lt', 'le', 'gt', 'ge'] as const)
    add('comparisons', op, left, right)
for (const [left, right] of [
  ['NaN', '0'],
  ['0', 'NaN'],
  ['Infinity', 'Infinity'],
  ['Infinity', '-Infinity'],
  ['Infinity', '0'],
  ['0', 'Infinity'],
  ['1', 'Infinity'],
  ['-1', 'Infinity'],
  ['Infinity', '2'],
  ['-Infinity', '2'],
] as const)
  for (const op of ['add', 'sub', 'mul', 'div', 'mod'] as const)
    add('special values', op, left, right)
for (const op of ['div', 'mod'] as const)
  for (const left of ['0', '1', '-1', 'NaN', 'Infinity']) add('zero divisor', op, left, '0')
for (const op of ['add', 'sub', 'mul', 'div', 'mod', 'eq', 'round'] as const)
  add('null', op, null, '0')
for (const value of ['123456789012345678901234567890', '1e100'])
  add('composition', 'cancel', value, '1')

for (const value of ['1e100000', '1e100001', '1e131071', '1e131072', '1e-16383', '1e-16384'])
  add('range limits', 'parse', value)
add('range limits', 'add', '1e100001', '1')
add('range limits', 'mul', '1e131071', '10')
for (const value of ['NaN', 'Infinity', '-Infinity'])
  add('special values', 'round', value, undefined, 2)

const numeric = 'pg_catalog."numeric"' as const
interface Operand {
  sql: string
  expression: SqlExpression
}
const specs: NumericSpec[] = []
const d = (value: string | null): Operand => ({
  sql: literal(value),
  expression: { kind: 'decimal', type: numeric, value },
})
const i = (
  value: string | null,
  type: 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8' = 'pg_catalog.int4',
): Operand => ({
  sql: `${value === null ? 'NULL' : `'${value}'`}::${type}`,
  expression: { kind: 'integer', type, value },
})
function operation(name: string, op: string, operands: Operand[], fn = false): Operand {
  const signature = `${fn ? 'function' : 'operator'}:["pg_catalog","${op}"](${!fn && operands.length === 1 ? ',' : ''}${operands.map((x) => x.expression.type).join(',')})`
  const metadata = fn ? functionMetadata(signature) : operatorMetadata(signature)
  const result: Operand = {
    sql: fn
      ? `pg_catalog.${op}(${operands.map((x) => `(${x.sql})`).join(',')})`
      : operands.length === 1
        ? `(${op} (${operands[0]!.sql}))`
        : `((${operands[0]!.sql}) ${op} (${operands[1]!.sql}))`,
    expression: {
      kind: fn ? 'function' : 'operator',
      signature,
      type: metadata.result,
      operands: operands.map((x) => x.expression),
    },
  }
  specs.push({ name, ...result })
  return result
}
function cast(name: string, type: NumericType, value: Operand): Operand {
  const signature =
    type === value.expression.type
      ? null
      : `function:["pg_catalog","${type.slice('pg_catalog.'.length).replaceAll('"', '')}"](${value.expression.type})`
  const result: Operand = {
    sql: `((${value.sql})::${type})`,
    expression: { kind: 'cast', signature, type, operand: value.expression },
  }
  specs.push({ name, ...result })
  return result
}
const operators: Record<string, string> = {
  add: '+',
  sub: '-',
  mul: '*',
  div: '/',
  mod: '%',
  eq: '=',
  ne: '<>',
  lt: '<',
  le: '<=',
  gt: '>',
  ge: '>=',
}
for (const fixture of cases) {
  const name = `numeric ${fixture.name}`
  if (fixture.op === 'parse') {
    if (
      fixture.group === 'range limits' &&
      fixture.left !== null &&
      ['1e100000', '1e100001', '1e131071', '1e-16383'].includes(fixture.left)
    )
      operation(name, '=', [d(fixture.left), d(fixture.left)])
    else specs.push({ name, ...d(fixture.left) })
  } else if (fixture.op === 'round')
    operation(name, 'round', [d(fixture.left), i(fixture.scale.toString())], true)
  else if (fixture.op === 'cancel') {
    const sum = operation(name + ' sum', '+', [d(fixture.left), d(fixture.right!)])
    operation(name, '-', [sum, d(fixture.left)])
  } else if (fixture.group === 'range limits' && fixture.op === 'add') {
    const sum: Operand = {
      sql: `(${literal(fixture.left)} + ${literal(fixture.right!)})`,
      expression: {
        kind: 'operator',
        signature: `operator:["pg_catalog","+"](${numeric},${numeric})`,
        type: numeric,
        operands: [d(fixture.left).expression, d(fixture.right!).expression],
      },
    }
    operation(name, '>', [sum, d(fixture.left)])
  } else operation(name, operators[fixture.op]!, [d(fixture.left), d(fixture.right!)])
}
const values = [
  null,
  '0',
  '-0.000',
  '1.2300',
  '-1.2300',
  '2.5',
  '-2.5',
  '1e100',
  '1e-100',
  'NaN',
  'Infinity',
  '-Infinity',
]
for (const fn of ['+', '-', '@', 'abs', 'ceil', 'ceiling', 'floor', 'sign', 'round', 'trunc']) {
  for (const value of values)
    operation(`numeric unary ${fn} ${value}`, fn, [d(value)], !['+', '-', '@'].includes(fn))
}
for (const fn of ['round', 'trunc']) {
  for (const value of [
    '2.5',
    '-2.5',
    '999.995',
    '-999.995',
    '0.0005',
    '-0.0005',
    '1e-16383',
    '0',
    'NaN',
    'Infinity',
    '-Infinity',
    null,
  ]) {
    for (const scale of [
      null,
      '-2147483648',
      '-131073',
      '-3',
      '-1',
      '0',
      '2',
      '8',
      '16383',
      '2147483647',
    ]) {
      const result = operation(
        `numeric ${fn} extreme ${value}/${scale}`,
        fn,
        [d(value), i(scale)],
        true,
      )
      if (
        scale !== null &&
        Number(scale) >= 16383 &&
        value !== null &&
        !['NaN', 'Infinity', '-Infinity'].includes(value)
      ) {
        specs.pop()
        operation(`numeric ${fn} extreme ${value}/${scale}`, '=', [result, d(value)])
      }
    }
  }
}
for (const fn of ['mod', 'div', 'gcd', 'lcm']) {
  for (const [left, right] of [
    ['12.00', '18.0'],
    ['-12.00', '18.0'],
    ['1.2300', '0.030'],
    ['0', '3.000'],
    ['0', '0'],
    ['7', '0'],
    ['NaN', '0'],
    ['Infinity', '0'],
    ['Infinity', '1'],
    ['1', 'Infinity'],
    ['-Infinity', '-2'],
    ['NaN', 'NaN'],
    [null, '0'],
    ['0', null],
    [null, null],
  ] as const)
    operation(`numeric function ${fn} ${left}/${right}`, fn, [d(left), d(right)], true)
}
for (const width of integerWidths) {
  for (const value of [null, '0', '1', '-1', width.min, width.max])
    cast(`${width.type} to numeric ${value}`, numeric, i(value, width.type))
  for (const value of [
    null,
    '0.000',
    '1.5',
    '-1.5',
    '2.5',
    '-2.5',
    'NaN',
    'Infinity',
    '-Infinity',
    width.min,
    width.max,
    `${width.max}.4`,
    `${width.max}.5`,
    `${width.min}.5`,
    '1e100',
  ])
    cast(`numeric to ${width.type} ${value}`, width.type, d(value))
}
const float = (type: FloatType, value: number | null): Operand => {
  const view = new DataView(new ArrayBuffer(type === 'pg_catalog.float4' ? 4 : 8))
  if (type === 'pg_catalog.float4') view.setFloat32(0, value ?? 0)
  else view.setFloat64(0, value ?? 0)
  const resolved = type === 'pg_catalog.float4' && value !== null ? view.getFloat32(0) : value
  return {
    sql: `${value === null ? 'NULL' : `'${Object.is(resolved, -0) ? '-0' : resolved}'`}::${type}`,
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
for (const type of ['pg_catalog.float4', 'pg_catalog.float8'] as const) {
  for (const value of [
    null,
    0,
    -0,
    0.1,
    1.23456789,
    -1.23456789,
    16777217,
    9007199254740992,
    3.4028234663852886e38,
    2 ** -149,
    NaN,
    Infinity,
    -Infinity,
    ...(type === 'pg_catalog.float8'
      ? [Number.MAX_VALUE, Number.MIN_VALUE, 1e-300, 1e300, 1.234565, 1.234575]
      : [1.234565, 1.234575]),
  ])
    cast(`${type} to numeric ${Object.is(value, -0) ? '-0' : value}`, numeric, float(type, value))
  for (const value of [
    null,
    '0.000',
    '-0.000',
    '0.1',
    '1.234567890123456789',
    'NaN',
    'Infinity',
    '-Infinity',
    '1e1000',
    '1e-1000',
    '7.038531e-26',
    '-7.038531e-26',
    '16777217',
    '16777219',
    '3.4028234663852886e38',
    '3.4028236e38',
    '1.401298464324817e-45',
    '7.006492321624085e-46',
    '7.006492321624086e-46',
    '4.9406564584124654e-324',
    '2.4703282292062327e-324',
    '2.4703282292062328e-324',
    '1.7976931348623157e308',
    '1.7976931348623159e308',
  ])
    cast(`numeric to ${type} ${value}`, type, d(value))
}
for (const [precision, scale] of [
  [3, 2],
  [2, -3],
  [3, 5],
  [1, 0],
  [1000, 1000],
  [1000, -1000],
] as const) {
  for (const value of [
    null,
    '0',
    '1.2345',
    '9.994',
    '9.995',
    '99.5',
    '-99.5',
    '1499',
    '1500',
    '99999',
    '0.0012345',
    '0.009995',
    'NaN',
    'Infinity',
    '-Infinity',
  ]) {
    const result = operation(
      `numeric typmod ${precision}/${scale} ${value}`,
      'numeric',
      [d(value), i((((precision << 16) | (scale & 2047)) + 4).toString())],
      true,
    )
    result.sql = `((${literal(value)})::numeric(${precision},${scale}))`
    specs[specs.length - 1]!.sql = result.sql
  }
}
for (const value of values) {
  cast(`numeric relabel ${value}`, numeric, d(value))
  operation(`numeric unconstrained typmod ${value}`, 'numeric', [d(value), i('-1')], true)
}
const failure = operation('numeric nested zero divisor', '/', [d('1'), d('0')])
operation('numeric error through null comparison', '=', [failure, d(null)])
operation('numeric error through null rounding', 'round', [failure, i(null)], true)
const intFailure: Operand = {
  sql: '(1::int8 / 0::int8)',
  expression: {
    kind: 'operator',
    signature: 'operator:["pg_catalog","/"](pg_catalog.int8,pg_catalog.int8)',
    type: 'pg_catalog.int8',
    operands: [i('1', 'pg_catalog.int8').expression, i('0', 'pg_catalog.int8').expression],
  },
}
cast('integer error through numeric cast', numeric, intFailure)
cast('numeric error through integer cast', 'pg_catalog.int4', failure)
cast('numeric error through float cast', 'pg_catalog.float8', failure)
operation('numeric scale capped multiplication', '=', [
  {
    sql: "('1e-16383'::numeric * '1e-16383'::numeric)",
    expression: {
      kind: 'operator',
      signature: `operator:["pg_catalog","*"](${numeric},${numeric})`,
      type: numeric,
      operands: [d('1e-16383').expression, d('1e-16383').expression],
    },
  },
  d('0'),
])
let seed = 0x510e527f
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed
}
for (let index = 0; index < 64; index++) {
  const left = `${index % 2 === 0 ? '-' : ''}${random()}.${random().toString().padStart(10, '0')}e${(index % 41) - 20}`
  const right = `${index % 3 === 0 ? '-' : ''}${random() || 1}.${random().toString().padStart(10, '0')}e${(index % 29) - 14}`
  for (const op of ['+', '-', '*', '/', '%'])
    operation(`numeric sampled ${op} ${index}`, op, [d(left), d(right)])
  for (const type of ['pg_catalog.float4', 'pg_catalog.float8'] as const) {
    const value =
      (1 + random() / 2 ** 32) *
      2 **
        (((index * 31) % (type === 'pg_catalog.float4' ? 276 : 2097)) -
          (type === 'pg_catalog.float4' ? 149 : 1074))
    cast(`numeric sampled to ${type} ${index}`, type, d(left))
    cast(`${type} sampled to numeric ${index}`, numeric, float(type, value))
  }
}
for (const value of [
  '+1.2300',
  '.00100',
  '123.',
  '0001.0000',
  '0e131072',
  '1e1073741824',
  '1e-1073741824',
])
  specs.push({ name: `numeric alternate literal ${value}`, ...d(value) })
export const decimalSpecs: readonly NumericSpec[] = specs
