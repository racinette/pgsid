import type { SqlExpression } from '../../../../src/sql-semantics/expressions.js'
import { functionMetadata, operatorMetadata } from '../../../../src/postgres/builtins/inventory.js'
import type { NumericSpec } from './numeric-specs.js'

interface Operand {
  sql: string
  expression: SqlExpression
}
const specs: NumericSpec[] = []
const decimal = (value: string | null): Operand => ({
  sql: `${value === null ? 'NULL' : `'${value}'`}::numeric`,
  expression: { kind: 'decimal', type: 'pg_catalog."numeric"', value },
})
const integer = (value: string | null): Operand => ({
  sql: `${value === null ? 'NULL' : `'${value}'`}::int4`,
  expression: { kind: 'integer', type: 'pg_catalog.int4', value },
})
const float = (value: number | null): Operand => {
  const view = new DataView(new ArrayBuffer(8))
  if (value !== null) view.setFloat64(0, value)
  return {
    sql: `${value === null ? 'NULL' : `'${Object.is(value, -0) ? '-0' : String(value)}'`}::float8`,
    expression: {
      kind: 'float',
      type: 'pg_catalog.float8',
      bits: value === null ? null : view.getBigUint64(0).toString(16).padStart(16, '0'),
    },
  }
}
function add(name: string, fn: string, operands: Operand[], operator = false): Operand {
  const signature = `${operator ? 'operator' : 'function'}:["pg_catalog","${fn}"](${operands.map((o) => o.expression.type).join(',')})`
  const metadata = operator ? operatorMetadata(signature) : functionMetadata(signature)
  const result: Operand = {
    sql: operator
      ? `((${operands[0]!.sql}) ${fn} (${operands[1]!.sql}))`
      : `pg_catalog.${fn}(${operands.map((o) => `(${o.sql})`).join(',')})`,
    expression: {
      kind: operator ? 'operator' : 'function',
      signature,
      type: metadata.result,
      operands: operands.map((o) => o.expression),
    },
  }
  specs.push({ name, ...result })
  return result
}
for (const value of [
  null,
  '0',
  '-0.0000',
  '1.2300',
  '1200.00',
  '1e-1000',
  '1e1000',
  '0.0000000012000',
  'NaN',
  'Infinity',
  '-Infinity',
])
  for (const fn of ['scale', 'min_scale', 'trim_scale'])
    add(`numeric utility ${fn} ${value}`, fn, [decimal(value)])
const scalarValues = [
  null,
  0,
  -0,
  1,
  -1,
  2,
  3,
  0.1,
  0.5,
  10,
  1e-300,
  1e300,
  Number.MIN_VALUE,
  Number.MAX_VALUE,
  NaN,
  Infinity,
  -Infinity,
]
for (const fn of ['exp', 'ln', 'log', 'log10']) {
  scalarValues.forEach((x, i) => add(`float math ${fn} ${i}`, fn, [float(x)]))
  for (let i = 0; i < 128; i++) {
    const x =
      fn === 'exp'
        ? (i - 64) * 11.71
        : (1 + ((i * 331) % 997) / 997) * 2 ** (((i * 17) % 2097) - 1074)
    add(`float math sampled ${fn} ${i}`, fn, [float(x)])
  }
  for (const x of [
    -745.1332191019412, -744.4400719213812, -710, -709, -6.66, -4.4399999999999995,
    -2.2199999999999998, 0.37, 0.9375, 0.9999999999999999, 1.0000000000000002, 1.064697265625,
    709.782712893384, 709.7827128933841,
  ])
    add(`float math boundary ${fn} ${x}`, fn, [float(x)])
}
for (const fn of ['power', 'pow', '^']) {
  scalarValues.forEach((x, i) =>
    scalarValues.forEach((y, j) =>
      add(`float math ${fn} ${i}/${j}`, fn, [float(x!), float(y!)], fn === '^'),
    ),
  )
  for (let i = 0; i < 128; i++)
    add(
      `float math sampled ${fn} ${i}`,
      fn,
      [float(1.1 + i * 0.17), float((i - 64) * 0.31)],
      fn === '^',
    )
  for (const [x, y] of [
    [-Number.MIN_VALUE, 1],
    [-Number.MIN_VALUE, 3],
    [1, 2 ** 64],
    [0.5, 2 ** 64],
    [2, -(2 ** 64)],
    [1.0000000000000002, 2 ** 62],
    [0.9999999999999999, 2 ** 62],
    [1e-300, 0.5],
    [1e300, 0.5],
    [2, -1074],
    [2, -1075],
    [Number.MAX_VALUE, 1],
    [-2, -1073],
    [2, 2 ** -66],
  ])
    add(`float math boundary ${fn} ${x}/${y}`, fn, [float(x!), float(y!)], fn === '^')
}
for (const numeric of [false, true]) {
  const literal = (value: number | null) =>
    numeric ? decimal(value === null ? null : String(value)) : float(value)
  for (const [b, c] of [
    [0, 10],
    [10, 0],
    [-Number.MAX_VALUE, Number.MAX_VALUE],
    [Number.MAX_VALUE, -Number.MAX_VALUE],
    [1, 1],
    [NaN, 2],
    [0, Infinity],
    [-Infinity, 0],
  ])
    for (const count of [null, '-1', '0', '1', '10', '2147483647'])
      scalarValues.forEach((x, i) =>
        add(
          `${numeric ? 'numeric' : 'float'} width_bucket ${b}/${c}/${count}/${i}`,
          'width_bucket',
          [literal(x), literal(b!), literal(c!), integer(count)],
        ),
      )
  for (let i = 0; i <= 100; i++)
    add(`${numeric ? 'numeric' : 'float'} width_bucket boundary ${i}`, 'width_bucket', [
      literal(i / 10),
      literal(0),
      literal(10),
      integer('10'),
    ])
}
export const numericUtilitySpecs: readonly NumericSpec[] = specs
