import {
  arrayType,
  type ArrayElementType,
  type ScalarType,
  type SqlExpression,
} from '../../../../src/sql-semantics/expressions.js'
import type { ExpressionSpec } from './expression-spec.js'

interface Operand {
  sql: string
  expression: SqlExpression
}

const elementType: ArrayElementType = 'pg_catalog.int4'
const type = arrayType(elementType)
const specs: ExpressionSpec[] = []
const integer = (value: string | null): Operand => ({
  sql: `${value === null ? 'NULL' : value}::int4`,
  expression: { kind: 'integer', type: 'pg_catalog.int4', value },
})
const array = (
  sql: string,
  dimensions: readonly number[],
  lowerBounds: readonly number[],
  values: readonly (string | null)[] | null,
): Operand => ({
  sql: values === null ? 'NULL::int4[]' : `'${sql}'::int4[]`,
  expression: {
    kind: 'array',
    type,
    elementType,
    dimensions,
    lowerBounds,
    elements: values?.map((value) => integer(value).expression) ?? null,
  },
})
function add(name: string, operand: Operand): Operand {
  specs.push({ name, ...operand })
  return operand
}
function operation(
  name: string,
  operation:
    | 'cardinality'
    | 'ndims'
    | 'dims'
    | 'length'
    | 'lower'
    | 'upper'
    | 'contains'
    | 'contained'
    | 'overlap'
    | 'concat',
  operands: Operand[],
): Operand {
  const resultType: ScalarType =
    operation === 'dims'
      ? 'pg_catalog.text'
      : operation === 'concat'
        ? type
        : ['contains', 'contained', 'overlap'].includes(operation)
          ? 'pg_catalog.bool'
          : 'pg_catalog.int4'
  const sql =
    operation === 'contains'
      ? `((${operands[0]!.sql}) @> (${operands[1]!.sql}))`
      : operation === 'contained'
        ? `((${operands[0]!.sql}) <@ (${operands[1]!.sql}))`
        : operation === 'overlap'
          ? `((${operands[0]!.sql}) && (${operands[1]!.sql}))`
          : operation === 'concat'
            ? `((${operands[0]!.sql}) || (${operands[1]!.sql}))`
            : `pg_catalog.${operation === 'ndims' ? 'array_ndims' : operation === 'dims' ? 'array_dims' : operation === 'length' ? 'array_length' : operation === 'lower' ? 'array_lower' : operation === 'upper' ? 'array_upper' : 'cardinality'}(${operands.map((operand) => `(${operand.sql})`).join(',')})`
  return add(name, {
    sql,
    expression: {
      kind: 'array-operation',
      type: resultType,
      elementType,
      operation,
      operands: operands.map((operand) => operand.expression),
    },
  })
}
function compare(
  name: string,
  comparison: '=' | '<>' | '<' | '<=' | '>' | '>=',
  left: Operand,
  right: Operand,
): Operand {
  return add(name, {
    sql: `((${left.sql}) ${comparison} (${right.sql}))`,
    expression: {
      kind: 'array-comparison',
      type: 'pg_catalog.bool',
      elementType,
      operation: comparison,
      operands: [left.expression, right.expression],
    },
  })
}
function subscript(name: string, operand: Operand, indexes: (string | null)[]): Operand {
  const subscripts = indexes.map(integer)
  return add(name, {
    sql: `(${operand.sql})${subscripts.map((index) => `[${index.sql}]`).join('')}`,
    expression: {
      kind: 'array-subscript',
      type: elementType,
      elementType,
      array: operand.expression,
      subscripts: subscripts.map((index) => index.expression),
    },
  })
}

const nil = array('', [], [], null)
const empty = array('{}', [], [], [])
const one = array('{1,2,3}', [3], [1], ['1', '2', '3'])
const withNull = array('{1,NULL,3}', [3], [1], ['1', null, '3'])
const lowerZero = array('[0:2]={7,8,9}', [3], [0], ['7', '8', '9'])
const matrix = array('{{1,2},{3,4}}', [2, 2], [1, 1], ['1', '2', '3', '4'])
const customMatrix = array('[0:1][3:4]={{1,2},{3,4}}', [2, 2], [0, 3], ['1', '2', '3', '4'])
for (const [index, operand] of [
  nil,
  empty,
  one,
  withNull,
  lowerZero,
  matrix,
  customMatrix,
].entries())
  add(`array input ${index}`, operand)

for (const [index, operand] of [nil, empty, one, matrix, customMatrix].entries()) {
  operation(`array cardinality ${index}`, 'cardinality', [operand])
  operation(`array ndims ${index}`, 'ndims', [operand])
  operation(`array dims ${index}`, 'dims', [operand])
  for (const dimension of [null, '-1', '0', '1', '2', '3']) {
    const requested = integer(dimension)
    for (const name of ['length', 'lower', 'upper'] as const)
      operation(`array ${name} ${index}/${dimension}`, name, [operand, requested])
  }
}

for (const [index, [left, right]] of (
  [
    [one, one],
    [one, withNull],
    [withNull, one],
    [lowerZero, array('{7,8,9}', [3], [1], ['7', '8', '9'])],
    [matrix, one],
    [nil, one],
  ] as const
).entries())
  for (const comparison of ['=', '<>', '<', '<=', '>', '>='] as const)
    compare(`array comparison ${comparison} ${index}`, comparison, left, right)

const duplicates = array('{1,1}', [2], [1], ['1', '1'])
const singleton = array('{1}', [1], [1], ['1'])
const nullOnly = array('{NULL}', [1], [1], [null])
for (const [index, [left, right]] of (
  [
    [one, singleton],
    [singleton, duplicates],
    [nullOnly, nullOnly],
    [empty, empty],
    [nil, one],
  ] as const
).entries())
  for (const name of ['contains', 'contained', 'overlap'] as const)
    operation(`array ${name} ${index}`, name, [left, right])

const rowA = array('{1,2}', [2], [1], ['1', '2'])
const rowB = array('{3,4}', [2], [1], ['3', '4'])
const incompatibleMatrix = array('{{1,2,3}}', [1, 3], [1, 1], ['1', '2', '3'])
for (const [index, [left, right]] of (
  [
    [nil, one],
    [one, nil],
    [nil, nil],
    [empty, lowerZero],
    [lowerZero, empty],
    [rowA, rowB],
    [matrix, matrix],
    [rowA, matrix],
    [matrix, rowA],
    [matrix, incompatibleMatrix],
  ] as const
).entries())
  operation(`array concat ${index}`, 'concat', [left, right])

for (const [index, [operand, indexes]] of (
  [
    [one, ['1']],
    [one, ['3']],
    [one, ['4']],
    [withNull, ['2']],
    [lowerZero, ['0']],
    [matrix, ['2', '1']],
    [matrix, ['2']],
    [matrix, ['1', null]],
    [nil, ['1']],
  ] as const
).entries())
  subscript(`array subscript ${index}`, operand, [...indexes])

add('array null test', {
  sql: `(${nil.sql}) IS NULL`,
  expression: {
    kind: 'null-test',
    type: 'pg_catalog.bool',
    negated: false,
    operand: nil.expression,
  },
})
add('array case', {
  sql: `CASE WHEN true THEN (${one.sql}) ELSE (${empty.sql}) END`,
  expression: {
    kind: 'case',
    type,
    branches: [
      { when: { kind: 'boolean', type: 'pg_catalog.bool', value: true }, then: one.expression },
    ],
    otherwise: empty.expression,
  },
})
add('array coalesce', {
  sql: `COALESCE((${nil.sql}), (${matrix.sql}))`,
  expression: {
    kind: 'coalesce',
    type,
    operands: [nil.expression, matrix.expression],
  },
})

export const arraySpecs: readonly ExpressionSpec[] = specs
