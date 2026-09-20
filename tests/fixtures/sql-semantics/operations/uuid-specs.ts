import { functionMetadata, operatorMetadata } from '../../../../src/postgres/builtins/inventory.js'
import type { SqlExpression } from '../../../../src/sql-semantics/expressions.js'
import type { ExpressionSpec } from './expression-spec.js'

interface Operand {
  sql: string
  expression: SqlExpression
}

const specs: ExpressionSpec[] = []
const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`
const uuid = (value: string | null): Operand => ({
  sql: value === null ? 'NULL::uuid' : `${quote(value)}::uuid`,
  expression: { kind: 'uuid', type: 'pg_catalog.uuid', value },
})
const text = (value: string | null): Operand => ({
  sql: value === null ? 'NULL::text' : `${quote(value)}::text`,
  expression: { kind: 'text', type: 'pg_catalog.text', value },
})
function add(name: string, operand: Operand): Operand {
  specs.push({ name, ...operand })
  return operand
}
function callable(
  name: string,
  callableName: string,
  operands: Operand[],
  operator = false,
): Operand {
  const signature = `${operator ? 'operator' : 'function'}:["pg_catalog","${callableName}"](${operands.map((operand) => operand.expression.type).join(',')})`
  const metadata = operator ? operatorMetadata(signature) : functionMetadata(signature)
  return add(name, {
    sql: operator
      ? `((${operands[0]!.sql}) ${callableName} (${operands[1]!.sql}))`
      : `pg_catalog.${callableName}(${operands.map((operand) => `(${operand.sql})`).join(',')})`,
    expression: {
      kind: operator ? 'operator' : 'function',
      signature,
      type: metadata.result,
      operands: operands.map((operand) => operand.expression),
    },
  })
}

const accepted = [
  null,
  '00000000-0000-0000-0000-000000000000',
  'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
  '{a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11}',
  'a0eebc999c0b4ef8bb6d6bb9bd380a11',
  'a0ee-bc99-9c0b-4ef8-bb6d-6bb9-bd38-0a11',
  'a0eebc99-9c0b4ef8-bb6d6bb9bd380a11',
] as const
for (const [index, value] of accepted.entries()) add(`uuid input ${index}`, uuid(value))

for (const [index, value] of [
  '',
  '0',
  '00000000-0000-0000-0000-00000000000',
  '00000000-0000-0000-0000-0000000000000',
  '00000000-0000-0000-0000-00000000000g',
  '0000000-00000-0000-0000-000000000000',
  '{00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000}',
  ' 00000000-0000-0000-0000-000000000000',
].entries())
  add(`uuid invalid input ${index}`, uuid(value))

const zero = uuid('00000000-0000-0000-0000-000000000000')
const one = uuid('00000000-0000-0000-0000-000000000001')
const maximum = uuid('ffffffff-ffff-ffff-ffff-ffffffffffff')
const nil = uuid(null)
for (const [index, [left, right]] of (
  [
    [zero, one],
    [one, zero],
    [zero, zero],
    [maximum, zero],
    [nil, zero],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries()) {
  for (const operation of ['=', '<>', '<', '<=', '>', '>='])
    callable(`uuid operator ${operation} ${index}`, operation, [left, right], true)
}
for (const [operation, name] of [
  ['eq', '='],
  ['ne', '<>'],
  ['lt', '<'],
  ['le', '<='],
  ['gt', '>'],
  ['ge', '>='],
] as const) {
  callable(`uuid function ${operation}`, `uuid_${operation}`, [zero, one])
  callable(`uuid function ${operation} null`, `uuid_${operation}`, [nil, one])
  callable(`uuid operator boundary ${name}`, name, [maximum, zero], true)
}
for (const [index, [left, right]] of (
  [
    [zero, zero],
    [zero, maximum],
    [maximum, zero],
    [nil, zero],
  ] satisfies readonly (readonly [Operand, Operand])[]
).entries())
  callable(`uuid cmp ${index}`, 'uuid_cmp', [left, right])

for (const [index, value] of (
  [
    null,
    '00000000-0000-0000-8000-000000000000',
    '00000000-0000-4000-8000-000000000000',
    '00000000-0000-7000-8000-000000000000',
    '00000000-0000-f000-b000-000000000000',
    '00000000-0000-4000-0000-000000000000',
    '00000000-0000-4000-c000-000000000000',
  ] as const
).entries())
  callable(`uuid extract version ${index}`, 'uuid_extract_version', [uuid(value)])

for (const [index, value] of [null, 'A0EEBC999C0B4EF8BB6D6BB9BD380A11', 'not-a-uuid'].entries()) {
  const operand = text(value)
  add(`uuid from text ${index}`, {
    sql: `(${operand.sql})::uuid`,
    expression: {
      kind: 'uuid-coercion',
      type: 'pg_catalog.uuid',
      operand: operand.expression,
    },
  })
}
for (const [index, value] of [null, 'a0eebc999c0b4ef8bb6d6bb9bd380a11'].entries()) {
  const operand = uuid(value)
  add(`uuid to text ${index}`, {
    sql: `(${operand.sql})::text`,
    expression: {
      kind: 'uuid-coercion',
      type: 'pg_catalog.text',
      operand: operand.expression,
    },
  })
}

add('uuid null test', {
  sql: `(${nil.sql}) IS NULL`,
  expression: {
    kind: 'null-test',
    type: 'pg_catalog.bool',
    negated: false,
    operand: nil.expression,
  },
})
add('uuid case', {
  sql: `CASE WHEN true THEN (${one.sql}) ELSE (${zero.sql}) END`,
  expression: {
    kind: 'case',
    type: 'pg_catalog.uuid',
    branches: [
      { when: { kind: 'boolean', type: 'pg_catalog.bool', value: true }, then: one.expression },
    ],
    otherwise: zero.expression,
  },
})
add('uuid coalesce', {
  sql: `COALESCE((${nil.sql}), (${one.sql}))`,
  expression: {
    kind: 'coalesce',
    type: 'pg_catalog.uuid',
    operands: [nil.expression, one.expression],
  },
})

export const uuidSpecs: readonly ExpressionSpec[] = specs
