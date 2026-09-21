import type { SqlExpression } from '../../../../src/sql-semantics/expressions.js'
import { functionMetadata, operatorMetadata } from '../../../../src/postgres/builtins/inventory.js'
import { bitSignatures } from './bit-signatures.js'
import type { ExpressionSpec } from './expression-spec.js'

interface Operand {
  sql: string
  expression: SqlExpression
}
const specs: ExpressionSpec[] = []
const bit = (
  value: string | null,
  type: 'pg_catalog."bit"' | 'pg_catalog.varbit' = 'pg_catalog."bit"',
): Operand => ({
  sql: value === null ? `NULL::${type}` : `B'${value}'::${type}`,
  expression: { kind: 'bit', type, value },
})
const integer = (
  value: string | null,
  type: 'pg_catalog.int4' | 'pg_catalog.int8' = 'pg_catalog.int4',
): Operand => ({
  sql: value === null ? `NULL::${type}` : `'${value}'::${type}`,
  expression: { kind: 'integer', type, value },
})
const boolean = (value: boolean | null): Operand => ({
  sql: `${value ?? 'NULL'}::bool`,
  expression: { kind: 'boolean', type: 'pg_catalog.bool', value },
})
function call(signature: string, operands: readonly Operand[]): Operand {
  const operator = signature.startsWith('operator:')
  const metadata = operator ? operatorMetadata(signature) : functionMetadata(signature)
  return {
    sql: operator
      ? operands.length === 1
        ? `(${metadata.name} (${operands[0]!.sql}))`
        : `((${operands[0]!.sql}) ${metadata.name} (${operands[1]!.sql}))`
      : `pg_catalog."${metadata.name}"(${operands.map((operand) => operand.sql).join(',')})`,
    expression: {
      kind: operator ? 'operator' : 'function',
      type: metadata.result,
      signature,
      operands: operands.map((operand) => operand.expression),
    },
  }
}
const comparePairs: readonly (readonly [string | null, string | null])[] = [
  ['101', '101'],
  ['101', '100'],
  ['1', '10'],
  ['0', '00'],
  ['', '0'],
  [null, '1'],
  ['1', null],
]
for (const signature of bitSignatures)
  if (
    /"(?:varbit|bit)(?:eq|ne|lt|le|gt|ge|cmp)"/.test(signature) ||
    /operator:\["pg_catalog","(?:<>|<=|>=|=|<|>)"\]/.test(signature)
  ) {
    const type = signature.includes('varbit') ? 'pg_catalog.varbit' : 'pg_catalog."bit"'
    for (const [index, [left, right]] of comparePairs.entries())
      specs.push({
        name: `bit compare ${signature} ${index}`,
        ...call(signature, [bit(left, type), bit(right, type)]),
      })
  }
const logicPairs: readonly (readonly [string | null, string | null])[] = [
  ['1010', '1100'],
  ['1111', '0000'],
  ['101', '10'],
  [null, '1010'],
  ['1010', null],
]
for (const signature of [
  'function:["pg_catalog","bitand"](pg_catalog."bit",pg_catalog."bit")',
  'function:["pg_catalog","bitor"](pg_catalog."bit",pg_catalog."bit")',
  'function:["pg_catalog","bitxor"](pg_catalog."bit",pg_catalog."bit")',
  'operator:["pg_catalog","&"](pg_catalog."bit",pg_catalog."bit")',
  'operator:["pg_catalog","|"](pg_catalog."bit",pg_catalog."bit")',
  'operator:["pg_catalog","#"](pg_catalog."bit",pg_catalog."bit")',
] as const)
  for (const [index, [left, right]] of logicPairs.entries())
    specs.push({
      name: `bit logic ${signature} ${index}`,
      ...call(signature, [bit(left), bit(right)]),
    })
for (const [index, value] of [null, '', '1010', '0'].entries())
  specs.push({
    name: `bit not ${index}`,
    ...call('operator:["pg_catalog","~"](,pg_catalog."bit")', [bit(value)]),
  })
specs.push({
  name: 'bit not function',
  ...call('function:["pg_catalog","bitnot"](pg_catalog."bit")', [bit('1010')]),
})
for (const signature of [
  'operator:["pg_catalog","<<"](pg_catalog."bit",pg_catalog.int4)',
  'operator:["pg_catalog",">>"](pg_catalog."bit",pg_catalog.int4)',
  'function:["pg_catalog","bitshiftleft"](pg_catalog."bit",pg_catalog.int4)',
  'function:["pg_catalog","bitshiftright"](pg_catalog."bit",pg_catalog.int4)',
] as const)
  for (const [index, amount] of [null, '0', '1', '-1', '8', '-2147483648'].entries())
    specs.push({
      name: `bit shift ${signature} ${index}`,
      ...call(signature, [bit('10110001'), integer(amount)]),
    })
const concatPairs: readonly (readonly [string | null, string | null])[] = [
  ['10', '11'],
  ['', '1'],
  ['1', ''],
  [null, '1'],
]
for (const signature of [
  'function:["pg_catalog","bitcat"](pg_catalog.varbit,pg_catalog.varbit)',
  'operator:["pg_catalog","||"](pg_catalog.varbit,pg_catalog.varbit)',
] as const)
  for (const [index, [left, right]] of concatPairs.entries())
    specs.push({
      name: `bit concat ${signature} ${index}`,
      ...call(signature, [bit(left, 'pg_catalog.varbit'), bit(right, 'pg_catalog.varbit')]),
    })
for (const signature of [
  'function:["pg_catalog","length"](pg_catalog."bit")',
  'function:["pg_catalog","octet_length"](pg_catalog."bit")',
  'function:["pg_catalog","bit_length"](pg_catalog."bit")',
  'function:["pg_catalog","bit_count"](pg_catalog."bit")',
] as const)
  for (const [index, value] of [null, '', '1', '101010011'].entries()) {
    specs.push({ name: `bit size ${signature} ${index}`, ...call(signature, [bit(value)]) })
  }
const bitSubstringCases: readonly (readonly [string | null, string | null])[] = [
  ['1', '2'],
  ['0', '3'],
  ['-1', '4'],
  ['2', '-1'],
  ['2', null],
  ['8', '2'],
  [null, '1'],
]
for (const [index, [start, length]] of bitSubstringCases.entries())
  specs.push({
    name: `bit substring ${index}`,
    ...call(
      length === null
        ? 'function:["pg_catalog","substring"](pg_catalog."bit",pg_catalog.int4)'
        : 'function:["pg_catalog","substring"](pg_catalog."bit",pg_catalog.int4,pg_catalog.int4)',
      length === null
        ? [bit('10110'), integer(start)]
        : [bit('10110'), integer(start), integer(length)],
    ),
  })
for (const [index, [replacement, start, length]] of (
  [
    ['11', '2', null],
    ['0', '2', '2'],
    ['1', '0', '1'],
    ['1', '2', '-1'],
  ] as const
).entries())
  specs.push({
    name: `bit overlay ${index}`,
    ...call(
      length === null
        ? 'function:["pg_catalog","overlay"](pg_catalog."bit",pg_catalog."bit",pg_catalog.int4)'
        : 'function:["pg_catalog","overlay"](pg_catalog."bit",pg_catalog."bit",pg_catalog.int4,pg_catalog.int4)',
      length === null
        ? [bit('10110'), bit(replacement), integer(start)]
        : [bit('10110'), bit(replacement), integer(start), integer(length)],
    ),
  })
for (const [index, [value, search]] of (
  [
    ['101101', '011'],
    ['101101', ''],
    ['', ''],
    ['', '1'],
    ['101', '111'],
    [null, '1'],
  ] as const
).entries())
  specs.push({
    name: `bit position ${index}`,
    ...call('function:["pg_catalog","position"](pg_catalog."bit",pg_catalog."bit")', [
      bit(value),
      bit(search),
    ]),
  })
for (const [index, position] of [null, '0', '1', '4', '-1'].entries())
  specs.push({
    name: `bit get ${index}`,
    ...call('function:["pg_catalog","get_bit"](pg_catalog."bit",pg_catalog.int4)', [
      bit('1011'),
      integer(position),
    ]),
  })
for (const [index, [position, next]] of (
  [
    ['0', '0'],
    ['3', '1'],
    ['-1', '1'],
    ['1', '2'],
    [null, '1'],
  ] as const
).entries())
  specs.push({
    name: `bit set ${index}`,
    ...call('function:["pg_catalog","set_bit"](pg_catalog."bit",pg_catalog.int4,pg_catalog.int4)', [
      bit('1011'),
      integer(position),
      integer(next),
    ]),
  })
for (const [index, [value, length, explicit]] of (
  [
    ['101', '3', true],
    ['101', '5', true],
    ['10110', '3', true],
    ['101', '5', false],
    ['101', '0', true],
    [null, '4', true],
  ] as const
).entries())
  specs.push({
    name: `bit typmod ${index}`,
    ...call('function:["pg_catalog","bit"](pg_catalog."bit",pg_catalog.int4,pg_catalog.bool)', [
      bit(value),
      integer(length),
      boolean(explicit),
    ]),
  })
for (const [index, [value, length, explicit]] of (
  [
    ['101', '5', false],
    ['10110', '3', false],
    ['10110', '3', true],
    ['101', '0', true],
    [null, '3', true],
  ] as const
).entries())
  specs.push({
    name: `varbit typmod ${index}`,
    ...call('function:["pg_catalog","varbit"](pg_catalog.varbit,pg_catalog.int4,pg_catalog.bool)', [
      bit(value, 'pg_catalog.varbit'),
      integer(length),
      boolean(explicit),
    ]),
  })
for (const [index, [value, width]] of (
  [
    ['5', '4'],
    ['-1', '4'],
    ['1', '8'],
    ['-1', '40'],
    ['5', '0'],
    [null, '4'],
    ['1', null],
  ] as const
).entries())
  specs.push({
    name: `bit from int4 ${index}`,
    ...call('function:["pg_catalog","bit"](pg_catalog.int4,pg_catalog.int4)', [
      integer(value),
      integer(width),
    ]),
  })
for (const [index, [value, width]] of (
  [
    ['-1', '8'],
    ['1', '70'],
    ['9223372036854775807', '64'],
    ['-9223372036854775808', '64'],
  ] as const
).entries())
  specs.push({
    name: `bit from int8 ${index}`,
    ...call('function:["pg_catalog","bit"](pg_catalog.int8,pg_catalog.int4)', [
      integer(value, 'pg_catalog.int8'),
      integer(width),
    ]),
  })
for (const [index, value] of [
  '',
  '1',
  '101',
  '10000000',
  '1'.repeat(32),
  '1'.repeat(33),
  null,
].entries())
  specs.push({
    name: `bit to int4 ${index}`,
    ...call('function:["pg_catalog","int4"](pg_catalog."bit")', [bit(value)]),
  })
for (const [index, value] of ['1'.repeat(64), '1'.repeat(65), '1'].entries())
  specs.push({
    name: `bit to int8 ${index}`,
    ...call('function:["pg_catalog","int8"](pg_catalog."bit")', [bit(value)]),
  })
const bitInputs: readonly {
  sql: string
  value: string
  type: 'pg_catalog."bit"' | 'pg_catalog.varbit'
}[] = [
  { sql: `X'FF'`, value: 'xFF', type: 'pg_catalog."bit"' },
  { sql: `'xFF'`, value: 'xFF', type: 'pg_catalog.varbit' },
  { sql: `'Xff'`, value: 'Xff', type: 'pg_catalog."bit"' },
  { sql: `X'F'`, value: 'xF', type: 'pg_catalog.varbit' },
  { sql: `X'A'`, value: 'xA', type: 'pg_catalog.varbit' },
  { sql: `X'ab'`, value: 'xab', type: 'pg_catalog.varbit' },
  { sql: `'b1010'`, value: 'b1010', type: 'pg_catalog."bit"' },
  { sql: `'B1010'`, value: 'B1010', type: 'pg_catalog.varbit' },
  { sql: `X''`, value: 'x', type: 'pg_catalog.varbit' },
  { sql: `'b'`, value: 'b', type: 'pg_catalog.varbit' },
]
for (const [index, input] of bitInputs.entries())
  specs.push({
    name: `bit input ${index}`,
    sql: `${input.sql}::${input.type}`,
    expression: { kind: 'bit', type: input.type, value: input.value },
  })
specs.push({
  name: 'bit hex equals binary',
  ...call('operator:["pg_catalog","="](pg_catalog."bit",pg_catalog."bit")', [
    {
      sql: `X'A'::pg_catalog."bit"`,
      expression: { kind: 'bit', type: 'pg_catalog."bit"', value: 'xA' },
    },
    bit('1010'),
  ]),
})
export const bitSpecs: readonly ExpressionSpec[] = specs
