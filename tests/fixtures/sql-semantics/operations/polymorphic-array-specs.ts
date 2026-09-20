import {
  arrayType,
  enumType,
  type ArrayElementType,
  type EnumDefinition,
  type FloatType,
  type SqlExpression,
  type TextType,
} from '../../../../src/sql-semantics/expressions.js'
import type { ExpressionSpec } from './expression-spec.js'
import { enumAlpha, enumSetupSql } from './enum-specs.js'

interface Element {
  sql: string
  expression: SqlExpression
}
interface Operand {
  sql: string
  expression: SqlExpression
  setupSql?: string
}

const specs: ExpressionSpec[] = []
const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`
const integer = (
  type: 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8',
  value: string | null,
): Element => ({
  sql: `${value === null ? 'NULL' : value}::${type}`,
  expression: { kind: 'integer', type, value },
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
const decimal = (value: string | null): Element => ({
  sql: `${value === null ? 'NULL' : quote(value)}::numeric`,
  expression: { kind: 'decimal', type: 'pg_catalog."numeric"', value },
})
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
const uuid = (value: string | null): Element => ({
  sql: `${value === null ? 'NULL' : quote(value)}::uuid`,
  expression: { kind: 'uuid', type: 'pg_catalog.uuid', value },
})
const enumValue = (definition: EnumDefinition, value: string | null): Element => ({
  sql: `${value === null ? 'NULL' : quote(value)}::${definition.schema}.${definition.name}`,
  expression: {
    kind: 'enum',
    type: enumType(definition),
    enum: definition,
    value,
  },
})
const sqlArrayType = (elementType: ArrayElementType): string => {
  if (elementType.startsWith('enum:')) return `${enumAlpha.schema}.${enumAlpha.name}[]`
  return `${elementType}[]`
}
const array = (
  elementType: ArrayElementType,
  elements: readonly Element[] | null,
  setupSql?: string,
): Operand => ({
  sql:
    elements === null
      ? `NULL::${sqlArrayType(elementType)}`
      : `ARRAY[${elements.map((element) => `(${element.sql})`).join(',')}]::${sqlArrayType(elementType)}`,
  expression: {
    kind: 'array',
    type: arrayType(elementType),
    elementType,
    dimensions: elements === null || elements.length === 0 ? [] : [elements.length],
    lowerBounds: elements === null || elements.length === 0 ? [] : [1],
    elements: elements?.map((element) => element.expression) ?? null,
  },
  setupSql,
})
function add(name: string, operand: Operand): Operand {
  specs.push({ name, ...(operand.setupSql ? { setupSql: operand.setupSql } : {}), ...operand })
  return operand
}
function binary(
  name: string,
  operation: '=' | '<' | 'contains' | 'overlap' | 'concat',
  elementType: ArrayElementType,
  left: Operand,
  right: Operand,
): Operand {
  const textElement = ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(
    elementType,
  )
  const sql =
    operation === 'contains'
      ? `((${left.sql}) @> (${right.sql}))`
      : operation === 'overlap'
        ? `((${left.sql}) && (${right.sql}))`
        : operation === 'concat'
          ? `((${left.sql}) || (${right.sql}))`
          : `((${left.sql})${textElement ? ' COLLATE "C"' : ''} ${operation} (${right.sql})${textElement ? ' COLLATE "C"' : ''})`
  const operands = [left.expression, right.expression]
  const expression: SqlExpression =
    operation === '=' || operation === '<'
      ? {
          kind: 'array-comparison',
          type: 'pg_catalog.bool',
          elementType,
          ...(textElement ? { collation: 'C' } : {}),
          operation,
          operands,
        }
      : {
          kind: 'array-operation',
          type:
            operation === 'contains' || operation === 'overlap'
              ? 'pg_catalog.bool'
              : arrayType(elementType),
          elementType,
          ...(textElement ? { collation: 'C' } : {}),
          operation,
          operands,
        }
  return add(name, {
    sql,
    expression,
    setupSql: left.setupSql ?? right.setupSql,
  })
}
function subscript(
  name: string,
  elementType: ArrayElementType,
  operand: Operand,
  index: number,
): Operand {
  return add(name, {
    sql: `(${operand.sql})[${index}]`,
    expression: {
      kind: 'array-subscript',
      type: elementType,
      elementType,
      array: operand.expression,
      subscripts: [integer('pg_catalog.int4', String(index)).expression],
    },
    setupSql: operand.setupSql,
  })
}
function cardinality(name: string, elementType: ArrayElementType, operand: Operand): Operand {
  return add(name, {
    sql: `pg_catalog.cardinality(${operand.sql})`,
    expression: {
      kind: 'array-operation',
      type: 'pg_catalog.int4',
      elementType,
      operation: 'cardinality',
      operands: [operand.expression],
    },
    setupSql: operand.setupSql,
  })
}

const families: readonly {
  name: string
  type: ArrayElementType
  values: readonly [Element, Element, Element]
  setupSql?: string
}[] = [
  {
    name: 'int2',
    type: 'pg_catalog.int2',
    values: [
      integer('pg_catalog.int2', '1'),
      integer('pg_catalog.int2', '2'),
      integer('pg_catalog.int2', null),
    ],
  },
  {
    name: 'int8',
    type: 'pg_catalog.int8',
    values: [
      integer('pg_catalog.int8', '1'),
      integer('pg_catalog.int8', '2'),
      integer('pg_catalog.int8', null),
    ],
  },
  {
    name: 'float4',
    type: 'pg_catalog.float4',
    values: [
      float('pg_catalog.float4', 0.1),
      float('pg_catalog.float4', NaN),
      float('pg_catalog.float4', null),
    ],
  },
  {
    name: 'float8',
    type: 'pg_catalog.float8',
    values: [
      float('pg_catalog.float8', 0.1),
      float('pg_catalog.float8', NaN),
      float('pg_catalog.float8', null),
    ],
  },
  {
    name: 'numeric',
    type: 'pg_catalog."numeric"',
    values: [decimal('1.20'), decimal('2.30'), decimal(null)],
  },
  {
    name: 'boolean',
    type: 'pg_catalog.bool',
    values: [boolean(false), boolean(true), boolean(null)],
  },
  {
    name: 'text',
    type: 'pg_catalog.text',
    values: [
      text('pg_catalog.text', 'a,b'),
      text('pg_catalog.text', 'NULL'),
      text('pg_catalog.text', null),
    ],
  },
  {
    name: 'varchar',
    type: 'pg_catalog."varchar"',
    values: [
      text('pg_catalog."varchar"', 'a'),
      text('pg_catalog."varchar"', 'b'),
      text('pg_catalog."varchar"', null),
    ],
  },
  {
    name: 'bpchar',
    type: 'pg_catalog.bpchar',
    values: [
      text('pg_catalog.bpchar', 'a '),
      text('pg_catalog.bpchar', 'b'),
      text('pg_catalog.bpchar', null),
    ],
  },
  {
    name: 'uuid',
    type: 'pg_catalog.uuid',
    values: [
      uuid('00000000-0000-0000-0000-000000000001'),
      uuid('00000000-0000-0000-0000-000000000002'),
      uuid(null),
    ],
  },
  {
    name: 'enum',
    type: enumType(enumAlpha),
    values: [
      enumValue(enumAlpha, 'zebra'),
      enumValue(enumAlpha, 'apple'),
      enumValue(enumAlpha, null),
    ],
    setupSql: enumSetupSql,
  },
]

for (const family of families) {
  const left = array(family.type, family.values, family.setupSql)
  const right = array(family.type, [family.values[1], family.values[0]], family.setupSql)
  const singleton = array(family.type, [family.values[0]], family.setupSql)
  add(`polymorphic array ${family.name} input`, left)
  cardinality(`polymorphic array ${family.name} cardinality`, family.type, left)
  binary(`polymorphic array ${family.name} equality`, '=', family.type, left, left)
  binary(`polymorphic array ${family.name} ordering`, '<', family.type, left, right)
  binary(`polymorphic array ${family.name} contains`, 'contains', family.type, left, singleton)
  binary(`polymorphic array ${family.name} overlap`, 'overlap', family.type, left, right)
  binary(`polymorphic array ${family.name} concat`, 'concat', family.type, singleton, right)
  subscript(`polymorphic array ${family.name} subscript`, family.type, left, 2)
}

export const polymorphicArraySpecs: readonly ExpressionSpec[] = specs
