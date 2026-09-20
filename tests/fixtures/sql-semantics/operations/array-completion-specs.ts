import {
  arrayType,
  type ArrayElementType,
  type FloatType,
  type ScalarType,
  type SqlExpression,
  type TextType,
} from '../../../../src/sql-semantics/expressions.js'
import type { ExpressionSpec } from './expression-spec.js'

interface Element {
  sql: string
  expression: SqlExpression
}
interface Operand {
  sql: string
  expression: SqlExpression
  setupSql?: string
}

const assignmentSetupSql = `
CREATE FUNCTION public.assign_int4_element(value int4[], index int4, replacement int4)
RETURNS int4[] LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN value[index] := replacement; RETURN value; END
$$;
CREATE FUNCTION public.assign_int4_matrix(value int4[], first_index int4, second_index int4, replacement int4)
RETURNS int4[] LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN value[first_index][second_index] := replacement; RETURN value; END
$$;
`
const specs: ExpressionSpec[] = []
const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`
const integer = (
  type: 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8',
  value: string | null,
): Element => ({
  sql: `${value === null ? 'NULL' : value}::${type}`,
  expression: { kind: 'integer', type, value },
})
const decimal = (value: string | null): Element => ({
  sql: `${value === null ? 'NULL' : quote(value)}::numeric`,
  expression: { kind: 'decimal', type: 'pg_catalog."numeric"', value },
})
const float = (type: FloatType, value: number | null): Element => {
  const single = type === 'pg_catalog.float4'
  const view = new DataView(new ArrayBuffer(single ? 4 : 8))
  if (value !== null) {
    if (single) view.setFloat32(0, value)
    else view.setFloat64(0, value)
  }
  return {
    sql: `${value === null ? 'NULL' : quote(String(value))}::${type}`,
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
const boolean = (value: boolean | null): Element => ({
  sql: `${value === null ? 'NULL' : String(value)}::bool`,
  expression: { kind: 'boolean', type: 'pg_catalog.bool', value },
})
const text = (type: TextType, value: string | null): Element => {
  const base: SqlExpression = { kind: 'text', type: 'pg_catalog.text', value }
  return {
    sql: `${value === null ? 'NULL' : quote(value)}::${type}`,
    expression:
      type === 'pg_catalog.text'
        ? base
        : { kind: 'text-coercion', type, length: null, explicit: true, operand: base },
  }
}
const sqlType = (type: ArrayElementType): string => `${type}[]`
const array = (
  elementType: ArrayElementType,
  sql: string,
  dimensions: readonly number[],
  lowerBounds: readonly number[],
  elements: readonly Element[] | null,
  setupSql?: string,
): Operand => ({
  sql:
    elements === null ? `NULL::${sqlType(elementType)}` : `${quote(sql)}::${sqlType(elementType)}`,
  expression: {
    kind: 'array',
    type: arrayType(elementType),
    elementType,
    dimensions,
    lowerBounds,
    elements: elements?.map((element) => element.expression) ?? null,
  },
  setupSql,
})
function add(name: string, operand: Operand): Operand {
  specs.push({ name, ...(operand.setupSql ? { setupSql: operand.setupSql } : {}), ...operand })
  return operand
}
function operation(
  name: string,
  operation:
    | 'concat'
    | 'append'
    | 'prepend'
    | 'position'
    | 'positions'
    | 'remove'
    | 'replace'
    | 'fill'
    | 'trim'
    | 'reverse'
    | 'sort',
  elementType: ArrayElementType,
  operands: Operand[],
  sql: string,
  collation?: string,
): Operand {
  const resultType: ScalarType =
    operation === 'position'
      ? 'pg_catalog.int4'
      : operation === 'positions'
        ? arrayType('pg_catalog.int4')
        : arrayType(elementType)
  return add(name, {
    sql,
    expression: {
      kind: 'array-operation',
      type: resultType,
      elementType,
      ...(collation ? { collation } : {}),
      operation,
      operands: operands.map((operand) => operand.expression),
    },
    setupSql: operands.find((operand) => operand.setupSql)?.setupSql,
  })
}
const scalar = (element: Element): Operand => ({ sql: element.sql, expression: element.expression })
const int4 = (value: string | null): Element => integer('pg_catalog.int4', value)
const intArray = (
  sql: string,
  dimensions: readonly number[],
  lowerBounds: readonly number[],
  values: readonly (string | null)[],
): Operand => array('pg_catalog.int4', sql, dimensions, lowerBounds, values.map(int4))

const one = intArray('{1,2,3}', [3], [1], ['1', '2', '3'])
const withNulls = intArray('{1,NULL,2,NULL}', [4], [1], ['1', null, '2', null])
const custom = intArray('[0:2]={1,2,3}', [3], [0], ['1', '2', '3'])
const matrix = intArray('{{1,2},{3,4},{5,6}}', [3, 2], [1, 1], ['1', '2', '3', '4', '5', '6'])
const empty = intArray('{}', [], [], [])
const nil = array('pg_catalog.int4', '', [], [], null)

for (const [index, [value, lower, upper]] of (
  [
    [one, '1', '2'],
    [custom, '0', '1'],
    [one, null, '2'],
    [one, '2', null],
    [one, '9', '10'],
  ] as const
).entries()) {
  const lowerExpr = lower === null ? null : int4(lower).expression
  const upperExpr = upper === null ? null : int4(upper).expression
  add(`array slice ${index}`, {
    sql: `(${value.sql})[${lower ?? ''}:${upper ?? ''}]`,
    expression: {
      kind: 'array-slice',
      type: arrayType('pg_catalog.int4'),
      elementType: 'pg_catalog.int4',
      array: value.expression,
      bounds: [{ lower: lowerExpr, upper: upperExpr }],
    },
  })
}
add('array slice multidimensional', {
  sql: `(${matrix.sql})[2:3][1:2]`,
  expression: {
    kind: 'array-slice',
    type: arrayType('pg_catalog.int4'),
    elementType: 'pg_catalog.int4',
    array: matrix.expression,
    bounds: [
      { lower: int4('2').expression, upper: int4('3').expression },
      { lower: int4('1').expression, upper: int4('2').expression },
    ],
  },
})

for (const [index, [value, position, replacement]] of (
  [
    [one, '2', '9'],
    [one, '5', '9'],
    [custom, '-2', '9'],
    [empty, '4', '9'],
    [nil, '4', '9'],
  ] as const
).entries())
  add(`array assign ${index}`, {
    sql: `public.assign_int4_element(${value.sql}, ${position}, ${replacement})`,
    expression: {
      kind: 'array-assign',
      type: arrayType('pg_catalog.int4'),
      elementType: 'pg_catalog.int4',
      array: value.expression,
      subscripts: [int4(position).expression],
      value: int4(replacement).expression,
    },
    setupSql: assignmentSetupSql,
  })
add('array assign multidimensional', {
  sql: `public.assign_int4_matrix(${matrix.sql}, 2, 1, 9)`,
  expression: {
    kind: 'array-assign',
    type: arrayType('pg_catalog.int4'),
    elementType: 'pg_catalog.int4',
    array: matrix.expression,
    subscripts: [int4('2').expression, int4('1').expression],
    value: int4('9').expression,
  },
  setupSql: assignmentSetupSql,
})

for (const [index, value] of [one, custom, empty, nil, matrix].entries()) {
  operation(
    `array append ${index}`,
    'append',
    'pg_catalog.int4',
    [value, scalar(int4(null))],
    `pg_catalog.array_append(${value.sql}, NULL::int4)`,
  )
  operation(
    `array prepend ${index}`,
    'prepend',
    'pg_catalog.int4',
    [scalar(int4('9')), value],
    `pg_catalog.array_prepend(9::int4, ${value.sql})`,
  )
}
operation(
  'array scalar concat append',
  'append',
  'pg_catalog.int4',
  [one, scalar(int4('4'))],
  `((${one.sql}) || 4::int4)`,
)
operation(
  'array scalar concat prepend',
  'prepend',
  'pg_catalog.int4',
  [scalar(int4('0')), one],
  `(0::int4 || (${one.sql}))`,
)

for (const [index, [value, search, start]] of (
  [
    [withNulls, null, undefined],
    [withNulls, '2', undefined],
    [custom, '2', '1'],
    [one, '9', undefined],
    [matrix, '2', undefined],
  ] as const
).entries()) {
  const searchOperand = scalar(int4(search))
  const operands = [value, searchOperand]
  if (start !== undefined) operands.push(scalar(int4(start)))
  operation(
    `array position ${index}`,
    'position',
    'pg_catalog.int4',
    operands,
    `pg_catalog.array_position(${value.sql}, ${searchOperand.sql}${start === undefined ? '' : `, ${start}::int4`})`,
  )
  if (start === undefined)
    operation(
      `array positions ${index}`,
      'positions',
      'pg_catalog.int4',
      [value, searchOperand],
      `pg_catalog.array_positions(${value.sql}, ${searchOperand.sql})`,
    )
}

for (const [index, search] of [null, '1', '9'].entries()) {
  const searched = scalar(int4(search))
  operation(
    `array remove ${index}`,
    'remove',
    'pg_catalog.int4',
    [withNulls, searched],
    `pg_catalog.array_remove(${withNulls.sql}, ${searched.sql})`,
  )
  operation(
    `array replace ${index}`,
    'replace',
    'pg_catalog.int4',
    [withNulls, searched, scalar(int4('7'))],
    `pg_catalog.array_replace(${withNulls.sql}, ${searched.sql}, 7::int4)`,
  )
}

const dimensions = intArray('{2,3}', [2], [1], ['2', '3'])
const lowerBounds = intArray('{0,-1}', [2], [1], ['0', '-1'])
operation(
  'array fill default bounds',
  'fill',
  'pg_catalog.int4',
  [scalar(int4('5')), dimensions],
  `pg_catalog.array_fill(5::int4, ${dimensions.sql})`,
)
operation(
  'array fill custom bounds',
  'fill',
  'pg_catalog.int4',
  [scalar(int4(null)), dimensions, lowerBounds],
  `pg_catalog.array_fill(NULL::int4, ${dimensions.sql}, ${lowerBounds.sql})`,
)

for (const [index, count] of ['0', '1', '3', '4', '-1'].entries())
  operation(
    `array trim ${index}`,
    'trim',
    'pg_catalog.int4',
    [matrix, scalar(int4(count))],
    `pg_catalog.trim_array(${matrix.sql}, ${count}::int4)`,
  )
operation(
  'array reverse one dimensional',
  'reverse',
  'pg_catalog.int4',
  [custom],
  `pg_catalog.array_reverse(${custom.sql})`,
)
operation(
  'array reverse multidimensional',
  'reverse',
  'pg_catalog.int4',
  [matrix],
  `pg_catalog.array_reverse(${matrix.sql})`,
)

const unsorted = intArray('[0:3]={3,NULL,1,2}', [4], [0], ['3', null, '1', '2'])
for (const [index, args] of (
  [[] as const, [true] as const, [false, true] as const, [true, false] as const] as const
).entries()) {
  const operands = [unsorted, ...args.map((value) => scalar(boolean(value)))]
  operation(
    `array sort ${index}`,
    'sort',
    'pg_catalog.int4',
    operands,
    `pg_catalog.array_sort(${unsorted.sql}${args.map((value) => `, ${value}::bool`).join('')})`,
  )
}
const unsortedMatrix = intArray(
  '[0:2][1:2]={{3,4},{1,9},{1,2}}',
  [3, 2],
  [0, 1],
  ['3', '4', '1', '9', '1', '2'],
)
operation(
  'array sort multidimensional',
  'sort',
  'pg_catalog.int4',
  [unsortedMatrix],
  `pg_catalog.array_sort(${unsortedMatrix.sql})`,
)

const crossCases: readonly [string, ArrayElementType, Operand, Operand][] = [
  [
    'int2 int4',
    'pg_catalog.int4',
    array('pg_catalog.int2', '{1}', [1], [1], [integer('pg_catalog.int2', '1')]),
    array('pg_catalog.int4', '{2}', [1], [1], [integer('pg_catalog.int4', '2')]),
  ],
  [
    'int4 int8',
    'pg_catalog.int8',
    array('pg_catalog.int4', '{1}', [1], [1], [integer('pg_catalog.int4', '1')]),
    array('pg_catalog.int8', '{2}', [1], [1], [integer('pg_catalog.int8', '2')]),
  ],
  [
    'int8 numeric',
    'pg_catalog."numeric"',
    array('pg_catalog.int8', '{1}', [1], [1], [integer('pg_catalog.int8', '1')]),
    array('pg_catalog."numeric"', '{2.5}', [1], [1], [decimal('2.5')]),
  ],
  [
    'int4 float4',
    'pg_catalog.float4',
    array('pg_catalog.int4', '{1}', [1], [1], [integer('pg_catalog.int4', '1')]),
    array('pg_catalog.float4', '{2.5}', [1], [1], [float('pg_catalog.float4', 2.5)]),
  ],
  [
    'float4 float8',
    'pg_catalog.float8',
    array('pg_catalog.float4', '{1.5}', [1], [1], [float('pg_catalog.float4', 1.5)]),
    array('pg_catalog.float8', '{2.5}', [1], [1], [float('pg_catalog.float8', 2.5)]),
  ],
  [
    'text varchar',
    'pg_catalog.text',
    array('pg_catalog.text', '{a}', [1], [1], [text('pg_catalog.text', 'a')]),
    array('pg_catalog."varchar"', '{b}', [1], [1], [text('pg_catalog."varchar"', 'b')]),
  ],
  [
    'varchar bpchar',
    'pg_catalog."varchar"',
    array('pg_catalog."varchar"', '{a}', [1], [1], [text('pg_catalog."varchar"', 'a')]),
    array('pg_catalog.bpchar', '{"b "}', [1], [1], [text('pg_catalog.bpchar', 'b ')]),
  ],
]
for (const [name, resultType, left, right] of crossCases)
  operation(
    `array anycompatible ${name}`,
    'concat',
    resultType,
    [left, right],
    `((${left.sql}) || (${right.sql}))`,
  )

export const arrayCompletionSpecs: readonly ExpressionSpec[] = specs
