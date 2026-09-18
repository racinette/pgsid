import { textSpecs } from './text-specs.js'
import type { ScalarType, SqlExpression } from '../../../../src/sql-semantics/expressions.js'
import { functionMetadata, operatorMetadata } from '../../../../src/postgres/builtins/inventory.js'
import type { ExpressionSpec } from './expression-spec.js'

interface Operand {
  sql: string
  expression: SqlExpression
}
const specs: ExpressionSpec[] = []
const boolean = (value: boolean | null): Operand => ({
  sql: `${value === null ? 'NULL' : String(value)}::bool`,
  expression: { kind: 'boolean', type: 'pg_catalog.bool', value },
})
const text = (value: string | null): Operand => ({
  sql: value === null ? 'NULL::text' : `'${value.replaceAll("'", "''")}'::text`,
  expression: { kind: 'text', type: 'pg_catalog.text', value },
})
const integer = (
  value: string | null,
  type: 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8' = 'pg_catalog.int4',
): Operand => ({
  sql: `${value === null ? 'NULL' : value}::${type}`,
  expression: { kind: 'integer', type, value },
})
const float = (value: number | null, type: 'pg_catalog.float4' | 'pg_catalog.float8'): Operand => {
  const single = type === 'pg_catalog.float4'
  const view = new DataView(new ArrayBuffer(single ? 4 : 8))
  if (value !== null) {
    if (single) view.setFloat32(0, value)
    else view.setFloat64(0, value)
  }
  return {
    sql: `${value === null ? 'NULL' : `'${value}'`}::${type}`,
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
const decimal = (value: string | null): Operand => ({
  sql: `${value === null ? 'NULL' : `'${value}'`}::numeric`,
  expression: { kind: 'decimal', type: 'pg_catalog."numeric"', value },
})
function add(name: string, result: Operand): Operand {
  specs.push({ name, ...result })
  return result
}
function callable(name: string, fn: string, operands: Operand[], operator = false): Operand {
  const signature = `${operator ? 'operator' : 'function'}:["pg_catalog","${fn}"](${operands.map((o) => o.expression.type).join(',')})`
  const metadata = operator ? operatorMetadata(signature) : functionMetadata(signature)
  const collation = operands[0]!.expression.type === 'pg_catalog.text' ? ' COLLATE "C"' : ''
  return add(name, {
    sql: operator
      ? `((${operands[0]!.sql})${collation} ${fn} (${operands[1]!.sql})${collation})`
      : `pg_catalog.${fn}(${operands.map((o) => `(${o.sql})`).join(',')})`,
    expression: {
      kind: operator ? 'operator' : 'function',
      signature,
      type: metadata.result,
      collation: 'C',
      operands: operands.map((o) => o.expression),
    },
  })
}
function logic(name: string, operation: 'and' | 'or' | 'not', operands: Operand[]): Operand {
  return add(name, {
    sql:
      operation === 'not'
        ? `NOT (${operands[0]!.sql})`
        : `((${operands[0]!.sql}) ${operation.toUpperCase()} (${operands[1]!.sql}))`,
    expression: {
      kind: 'boolean-logic',
      type: 'pg_catalog.bool',
      operation,
      operands: operands.map((o) => o.expression),
    },
  })
}
function conditional(
  name: string,
  branches: { when: Operand; then: Operand }[],
  otherwise: Operand,
): Operand {
  return add(name, {
    sql: `CASE ${branches.map((b) => `WHEN (${b.when.sql}) THEN (${b.then.sql})`).join(' ')} ELSE (${otherwise.sql}) END`,
    expression: {
      kind: 'case',
      type: otherwise.expression.type as ScalarType,
      branches: branches.map((b) => ({ when: b.when.expression, then: b.then.expression })),
      otherwise: otherwise.expression,
    },
  })
}
function coalesce(name: string, operands: Operand[]): Operand {
  return add(name, {
    sql: `COALESCE(${operands.map((o) => `(${o.sql})`).join(',')})`,
    expression: {
      kind: 'coalesce',
      type: operands[0]!.expression.type as ScalarType,
      operands: operands.map((o) => o.expression),
    },
  })
}
const truthValues = [false, true, null] as const
for (const a of truthValues) {
  add(`boolean literal ${a}`, boolean(a))
  logic(`boolean not ${a}`, 'not', [boolean(a)])
  for (const b of truthValues) {
    for (const operation of ['and', 'or'] as const)
      logic(`boolean ${operation} ${a}/${b}`, operation, [boolean(a), boolean(b)])
    for (const op of ['=', '<>', '<', '<=', '>', '>=']) {
      callable(`boolean comparison ${op} ${a}/${b}`, op, [boolean(a), boolean(b)], true)
    }
  }
}
const texts = [
  null,
  '',
  'a',
  'aa',
  'b',
  'A',
  'é',
  'e\u0301',
  '😀',
  '\uE000',
  '\u{10000}',
  "O'Brien",
  'a\\b',
  'a\nb',
  '中文',
] as const
for (const [i, value] of texts.entries()) {
  const operand = text(value)
  add(`text literal ${i}`, operand)
  for (const fn of ['length', 'char_length', 'character_length', 'octet_length'])
    callable(`text ${fn} ${i}`, fn, [operand])
  for (const [j, right] of texts.entries()) {
    const other = text(right)
    for (const op of ['=', '<>', '<', '<=', '>', '>=', '||'])
      callable(`text comparison ${op} ${i}/${j}`, op, [operand, other], true)
    callable(`text textcat ${i}/${j}`, 'textcat', [operand, other])
  }
}
const samples: [Operand, Operand, Operand][] = [
  ...(['pg_catalog.int2', 'pg_catalog.int4', 'pg_catalog.int8'] as const).map(
    (type) =>
      [integer(null, type), integer('0', type), integer('7', type)] as [Operand, Operand, Operand],
  ),
  [float(null, 'pg_catalog.float4'), float(0, 'pg_catalog.float4'), float(7, 'pg_catalog.float4')],
  [
    float(null, 'pg_catalog.float8'),
    float(0, 'pg_catalog.float8'),
    float(NaN, 'pg_catalog.float8'),
  ],
  [decimal(null), decimal('0.000'), decimal('1.2300')],
  [boolean(null), boolean(false), boolean(true)],
  [text(null), text(''), text('😀')],
]
for (const [nil, zero, value] of samples) {
  const type = value.expression.type
  for (const [i, operand] of [nil, zero, value].entries())
    for (const negated of [false, true])
      add(`null-test ${type} ${i}/${negated}`, {
        sql: `(${operand.sql}) IS ${negated ? 'NOT ' : ''}NULL`,
        expression: {
          kind: 'null-test',
          type: 'pg_catalog.bool',
          negated,
          operand: operand.expression,
        },
      })
  for (const condition of truthValues)
    conditional(`case ${type} ${condition}`, [{ when: boolean(condition), then: zero }], value)
  conditional(
    `case ${type} first match`,
    [
      { when: boolean(null), then: nil },
      { when: boolean(true), then: zero },
      { when: boolean(true), then: value },
    ],
    nil,
  )
  for (const [i, operands] of [
    [zero, value],
    [nil, value],
    [nil, nil],
    [nil, zero, value],
    [value, nil],
    [nil],
  ].entries())
    coalesce(`coalesce ${type} ${i}`, operands)
}
const failure: Operand = {
  sql: '(1::int4 / 0::int4)',
  expression: {
    kind: 'operator',
    type: 'pg_catalog.int4',
    signature: 'operator:["pg_catalog","/"](pg_catalog.int4,pg_catalog.int4)',
    operands: [integer('1').expression, integer('0').expression],
  },
}
const predicate: Operand = {
  sql: `(${failure.sql}) = 0`,
  expression: {
    kind: 'operator',
    type: 'pg_catalog.bool',
    signature: 'operator:["pg_catalog","="](pg_catalog.int4,pg_catalog.int4)',
    operands: [failure.expression, integer('0').expression],
  },
}
conditional('case skips failing fallback', [{ when: boolean(true), then: integer('7') }], failure)
conditional('case skips failing branch', [{ when: boolean(false), then: failure }], integer('7'))
conditional('case selected branch errors', [{ when: boolean(true), then: failure }], integer('7'))
conditional('case condition errors', [{ when: predicate, then: integer('7') }], integer('0'))
conditional(
  'case skips later condition error',
  [
    { when: boolean(true), then: integer('7') },
    { when: predicate, then: failure },
  ],
  integer('0'),
)
coalesce('coalesce skips error after zero', [integer('0'), failure])
coalesce('coalesce selected argument errors', [integer(null), failure])
for (const operation of ['and', 'or'] as const)
  for (const value of truthValues)
    logic(`boolean ${operation} error after ${value}`, operation, [boolean(value), predicate])
for (const negated of [false, true])
  add(`null-test propagates error ${negated}`, {
    sql: `(${failure.sql}) IS ${negated ? 'NOT ' : ''}NULL`,
    expression: {
      kind: 'null-test',
      type: 'pg_catalog.bool',
      negated,
      operand: failure.expression,
    },
  })
export const scalarSpecs: readonly ExpressionSpec[] = [...specs, ...textSpecs]
