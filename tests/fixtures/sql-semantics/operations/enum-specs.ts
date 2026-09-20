import {
  enumType,
  type EnumDefinition,
  type SqlExpression,
} from '../../../../src/sql-semantics/expressions.js'
import type { ExpressionSpec } from './expression-spec.js'

interface Operand {
  sql: string
  expression: SqlExpression
}

const setupSql = `
CREATE SCHEMA enum_alpha;
CREATE SCHEMA enum_beta;
CREATE TYPE enum_alpha.state AS ENUM ('zebra', 'apple', 'middle', 'quote''s', 'é');
CREATE TYPE enum_beta.state AS ENUM ('middle', 'apple', 'zebra');
`
const alpha = {
  schema: 'enum_alpha',
  name: 'state',
  values: ['zebra', 'apple', 'middle', "quote's", 'é'],
} as const satisfies EnumDefinition
const beta = {
  schema: 'enum_beta',
  name: 'state',
  values: ['middle', 'apple', 'zebra'],
} as const satisfies EnumDefinition
const specs: ExpressionSpec[] = []
const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`
const sqlType = (definition: EnumDefinition): string => `${definition.schema}.${definition.name}`
const enumValue = (definition: EnumDefinition, value: string | null): Operand => ({
  sql: value === null ? `NULL::${sqlType(definition)}` : `${quote(value)}::${sqlType(definition)}`,
  expression: {
    kind: 'enum',
    type: enumType(definition),
    enum: definition,
    value,
  },
})
const text = (value: string | null): Operand => ({
  sql: value === null ? 'NULL::text' : `${quote(value)}::text`,
  expression: { kind: 'text', type: 'pg_catalog.text', value },
})
function add(name: string, operand: Operand): Operand {
  specs.push({ name, setupSql, ...operand })
  return operand
}
function compare(
  name: string,
  definition: EnumDefinition,
  operation: '=' | '<>' | '<' | '<=' | '>' | '>=',
  left: Operand,
  right: Operand,
): Operand {
  return add(name, {
    sql: `((${left.sql}) ${operation} (${right.sql}))`,
    expression: {
      kind: 'enum-comparison',
      type: 'pg_catalog.bool',
      enum: definition,
      operation,
      operands: [left.expression, right.expression],
    },
  })
}

for (const [index, [definition, value]] of (
  [
    [alpha, null],
    [alpha, 'zebra'],
    [alpha, 'apple'],
    [alpha, "quote's"],
    [alpha, 'é'],
    [beta, 'middle'],
    [beta, 'zebra'],
  ] as const
).entries())
  add(`enum input ${index}`, enumValue(definition, value))

for (const [index, value] of ['', 'missing', 'ZEBRA', 'zebra '].entries())
  add(`enum invalid input ${index}`, enumValue(alpha, value))

const alphaNil = enumValue(alpha, null)
const alphaFirst = enumValue(alpha, 'zebra')
const alphaSecond = enumValue(alpha, 'apple')
const alphaLast = enumValue(alpha, 'é')
for (const [index, [left, right]] of (
  [
    [alphaFirst, alphaSecond],
    [alphaSecond, alphaFirst],
    [alphaFirst, alphaFirst],
    [alphaLast, alphaFirst],
    [alphaNil, alphaFirst],
  ] as const
).entries())
  for (const operation of ['=', '<>', '<', '<=', '>', '>='] as const)
    compare(`enum operator ${operation} ${index}`, alpha, operation, left, right)

compare(
  'enum declaration order differs from lexical order alpha',
  alpha,
  '<',
  alphaFirst,
  alphaSecond,
)
compare(
  'enum declaration order differs from lexical order beta',
  beta,
  '<',
  enumValue(beta, 'middle'),
  enumValue(beta, 'apple'),
)

for (const [index, value] of ([null, 'zebra', 'missing'] as const).entries()) {
  const operand = text(value)
  add(`enum from text ${index}`, {
    sql: `(${operand.sql})::${sqlType(alpha)}`,
    expression: {
      kind: 'enum-coercion',
      type: enumType(alpha),
      enum: alpha,
      operand: operand.expression,
    },
  })
}
for (const [index, value] of ([null, 'zebra', "quote's", 'é'] as const).entries()) {
  const operand = enumValue(alpha, value)
  add(`enum to text ${index}`, {
    sql: `(${operand.sql})::text`,
    expression: {
      kind: 'enum-coercion',
      type: 'pg_catalog.text',
      enum: alpha,
      operand: operand.expression,
    },
  })
}

add('enum null test', {
  sql: `(${alphaNil.sql}) IS NULL`,
  expression: {
    kind: 'null-test',
    type: 'pg_catalog.bool',
    negated: false,
    operand: alphaNil.expression,
  },
})
add('enum case', {
  sql: `CASE WHEN true THEN (${alphaSecond.sql}) ELSE (${alphaFirst.sql}) END`,
  expression: {
    kind: 'case',
    type: enumType(alpha),
    branches: [
      {
        when: { kind: 'boolean', type: 'pg_catalog.bool', value: true },
        then: alphaSecond.expression,
      },
    ],
    otherwise: alphaFirst.expression,
  },
})
add('enum coalesce', {
  sql: `COALESCE((${alphaNil.sql}), (${alphaLast.sql}))`,
  expression: {
    kind: 'coalesce',
    type: enumType(alpha),
    operands: [alphaNil.expression, alphaLast.expression],
  },
})

export const enumSpecs: readonly ExpressionSpec[] = specs
export { alpha as enumAlpha, beta as enumBeta, setupSql as enumSetupSql }
