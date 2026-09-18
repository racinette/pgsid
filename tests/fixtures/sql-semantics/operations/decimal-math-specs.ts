import Decimal from 'decimal.js'
import type { NumericSpec } from './numeric-specs.js'
import type { SqlExpression } from '../../../../src/sql-semantics/expressions.js'
import { functionMetadata, operatorMetadata } from '../../../../src/postgres/builtins/inventory.js'

type Operation = 'power' | 'sqrt' | 'exp' | 'ln' | 'log10' | 'log'
const specs: NumericSpec[] = []
const literal = (value: string | null) => (value === null ? 'NULL::numeric' : `'${value}'::numeric`)
const operand = (value: string | null): SqlExpression => ({
  kind: 'decimal',
  type: 'pg_catalog."numeric"',
  value,
})
function add(
  operation: Operation,
  left: string | null,
  right: string | null = '0',
  label = '',
  stress = false,
) {
  const names =
    operation === 'power'
      ? ['power', 'pow', '^']
      : operation === 'log10'
        ? ['log10', 'log']
        : [operation]
  for (const fn of names) {
    const values =
      operation === 'log' ? [right, left] : operation === 'power' ? [left, right] : [left]
    const kind = fn === '^' ? 'operator' : 'function'
    const signature = `${kind}:["pg_catalog","${fn}"](${values.map(() => 'pg_catalog."numeric"').join(',')})`
    const metadata = kind === 'operator' ? operatorMetadata(signature) : functionMetadata(signature)
    specs.push({
      ...(stress ? { stress: true } : {}),
      name: `numeric math ${fn} ${left}${['power', 'log'].includes(operation) ? ` / ${right}` : ''}${label ? ` ${label}` : ''}`,
      sql:
        fn === '^'
          ? `(${literal(left)} ^ ${literal(right)})`
          : `${fn}(${values.map(literal).join(',')})`,
      expression: { kind, signature, type: metadata.result, operands: values.map(operand) },
    })
  }
}
for (const operation of ['sqrt', 'ln', 'log10'] as const)
  for (const value of [
    null,
    '0',
    '1',
    '2',
    '4',
    '10',
    '0.1',
    '0.9',
    '1.1',
    '1.2300',
    '1.00000000000000000001',
    '0.99999999999999999999',
    '-1',
    '-0.1',
    'NaN',
    'Infinity',
    '-Infinity',
    '1e100',
    '1e-100',
  ])
    add(operation, value)
for (const value of [
  null,
  '0',
  '1',
  '-1',
  '2',
  '-2',
  '0.1',
  '-0.1',
  '10',
  '-10',
  '100',
  '-100',
  '1e-20',
  'NaN',
  'Infinity',
  '-Infinity',
  '6000',
  '-6000',
])
  add('exp', value)
for (const [left, right] of [
  ['2', '10'],
  ['2', '-3'],
  ['2', '0.5'],
  ['4', '0.5'],
  ['9', '0.5'],
  ['27', '0.33333333333333333333'],
  ['1.2300', '2.0'],
  ['0', '0'],
  ['0', '2'],
  ['0', '0.5'],
  ['0', '-1'],
  ['-2', '3'],
  ['-2', '4'],
  ['-2', '-3'],
  ['-2', '0.5'],
  ['1', 'NaN'],
  ['NaN', '0'],
  ['NaN', '1'],
  ['Infinity', '0'],
  ['Infinity', '-1'],
  ['-Infinity', '3'],
  ['-Infinity', '0.5'],
  ['2', 'Infinity'],
  ['0.5', 'Infinity'],
  ['-1', 'Infinity'],
  ['1.00000000000000000001', '1000000'],
  ['1e100', '0.5'],
  ['1e-100', '0.5'],
  ['3', '-100'],
  [null, '0'],
] as const)
  add('power', left, right)
for (const [value, base] of [
  ['64', '2'],
  ['100', '10'],
  ['1', '10'],
  ['0.1', '10'],
  ['2', '0.5'],
  ['2', '1'],
  ['2', '0'],
  ['2', '-1'],
  ['0', '2'],
  ['-1', '2'],
  ['NaN', '0'],
  ['Infinity', 'Infinity'],
  ['2', 'Infinity'],
  ['Infinity', '2'],
  ['Infinity', '0.5'],
  ['1.00000000000000000001', '1.00000000000000000002'],
  ['2', '1.00000000000000000001'],
  [null, '1'],
] as const)
  add('log', value, base)
for (const operation of ['sqrt', 'ln', 'log10'] as const)
  for (const value of [
    '1e-1000',
    '1.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
    '1.' + '0'.repeat(999) + '1',
  ])
    add(operation, value, '0', 'high precision')
for (const [left, right] of [
  ['2.000' + '0'.repeat(995), '0.5'],
  ['3.000' + '0'.repeat(995), '-1'],
] as const)
  add('power', left, right, 'high precision')
let seed = 0x1f83d9ab
for (let index = 0; index < 16; index++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  const value = `${1 + (seed % 999)}.${seed.toString().padStart(10, '0')}`
  for (const operation of ['sqrt', 'ln', 'log10'] as const)
    add(operation, value, '0', `sample ${index}`)
  add('power', value, `${(index % 7) - 3}.125`, `sample ${index}`)
}

for (const left of [null, 'NaN', 'Infinity', '-Infinity', '-2', '-1', '-0.5', '0', '0.5', '1', '2'])
  for (const right of [
    null,
    'NaN',
    'Infinity',
    '-Infinity',
    '-3',
    '-2',
    '-0.5',
    '0',
    '0.5',
    '2',
    '3',
  ]) {
    add('power', left, right, 'special matrix')
    add('log', left, right, 'special matrix')
  }
for (const exponent of ['-2147483648', '2147483647', '2147483648', '-2147483649', '1e30', '-1e30'])
  for (const value of ['-1', '0', '1', '1.00000000000000000001', '0.99999999999999999999', '2'])
    add('power', value, exponent, 'integer boundary')
for (const scale of [21, 100, 1000, 16383]) {
  const above = '1.' + '0'.repeat(scale - 1) + '1'
  const below = '0.' + '9'.repeat(scale)
  for (const value of [above, below]) {
    add('sqrt', value, '0', `near one scale ${scale}`)
    add('ln', value, '0', `near one scale ${scale}`)
  }
  add('log', '2', above, `cancellation scale ${scale}`, scale === 16383)
  add('power', above, '1000000', `dense power scale ${scale}`)
}
for (const value of [
  '1e131071',
  '1e-16383',
  '9999',
  '10000',
  '10001',
  '0.00009999',
  '0.0001',
  '0.00010001',
])
  add('sqrt', value, '0', 'weight boundary')
for (const value of [
  '5999',
  '-5999',
  '5999.9999',
  '-5999.9999',
  '6000.0001',
  '-6000.0001',
  '0.01',
  '-0.01',
  '0.0100000000000000001',
])
  add('exp', value, '0', 'range reduction')
let sampleSeed = 0x9e3779b9
for (let i = 0; i < 64; i++) {
  sampleSeed = (Math.imul(sampleSeed, 1664525) + 1013904223) >>> 0
  const value = `${1 + (sampleSeed % 9999)}.${sampleSeed.toString().padStart(10, '0')}e${(i % 25) - 12}`
  for (const operation of ['sqrt', 'ln', 'log10'] as const)
    add(operation, value, '0', `boundary sample ${i}`)
  add('power', value, String((i % 13) - 6), `integer sample ${i}`)
  add('power', value, `${(i % 7) - 3}.125`, `fractional sample ${i}`)
  add('log', value, '1.00000000000000000001', `base sample ${i}`)
  add('exp', `${(i % 21) - 10}.${sampleSeed}`, '0', `exp sample ${i}`)
}
for (const base of ['1e131071', '1e-1000', '2', '1.01', '1.1', '0.99'])
  for (const scale of [1000, 16383])
    add('log', '1.' + '0'.repeat(scale - 1) + '1', base, `tiny result scale ${scale}`)
const BoundaryDecimal = Decimal.clone({ precision: 1600, rounding: Decimal.ROUND_DOWN })
for (const scale of [20, 1000]) {
  const midpoint = new BoundaryDecimal('1.' + '0'.repeat(scale) + '5')
  const below = midpoint.sqrt().toDP(scale + 500, Decimal.ROUND_DOWN)
  const above = below.add(new BoundaryDecimal('1e-' + (scale + 500)))
  for (const [side, value] of [
    ['below', below],
    ['above', above],
  ] as const)
    for (const sign of [1, -1])
      add(
        'power',
        value.mul(sign).toFixed(scale + 500),
        '2',
        `squared midpoint ${scale} ${side} ${sign}`,
      )
}
const failed: SqlExpression = {
  kind: 'operator',
  signature: 'operator:["pg_catalog","/"](pg_catalog."numeric",pg_catalog."numeric")',
  type: 'pg_catalog."numeric"',
  operands: [operand('1'), operand('0')],
}
for (const fn of ['sqrt', 'exp', 'ln', 'log10']) {
  const signature = `function:["pg_catalog","${fn}"](pg_catalog."numeric")`
  specs.push({
    name: `numeric math ${fn} propagates error`,
    sql: `${fn}(1::numeric/0::numeric)`,
    expression: { kind: 'function', signature, type: 'pg_catalog."numeric"', operands: [failed] },
  })
}
for (const fn of ['power', 'log']) {
  const signature = `function:["pg_catalog","${fn}"](pg_catalog."numeric",pg_catalog."numeric")`
  for (const reverse of [false, true])
    specs.push({
      name: `numeric math ${fn} error before null ${reverse}`,
      sql: `${fn}(${reverse ? 'NULL::numeric,1::numeric/0::numeric' : '1::numeric/0::numeric,NULL::numeric'})`,
      expression: {
        kind: 'function',
        signature,
        type: 'pg_catalog."numeric"',
        operands: reverse ? [operand(null), failed] : [failed, operand(null)],
      },
    })
}
export const decimalMathSpecs: readonly NumericSpec[] = specs
