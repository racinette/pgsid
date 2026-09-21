import { functionMetadata, operatorMetadata } from '../postgres/builtins/inventory.js'
import type { CallableMetadata } from '../postgres/builtins/catalog.js'
import type { EnumInfo } from '../catalog/types.js'
import type { CallableEmitter, SqlBindingGroup, TypedSqlExpression } from './signatures.js'

export type IntegerType = 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8'

export type FloatType = 'pg_catalog.float4' | 'pg_catalog.float8'
export type DecimalType = 'pg_catalog."numeric"'
export type NumericType = IntegerType | FloatType | DecimalType

export type TextType = 'pg_catalog.text' | 'pg_catalog."varchar"' | 'pg_catalog.bpchar'
export type UuidType = 'pg_catalog.uuid'
export type JsonType = 'pg_catalog."json"'
export type JsonbType = 'pg_catalog.jsonb'
export type TemporalType =
  | 'pg_catalog.date'
  | 'pg_catalog."time"'
  | 'pg_catalog."timestamp"'
  | 'pg_catalog.timestamptz'
  | 'pg_catalog.timetz'
  | 'pg_catalog."interval"'
export type EnumType = `enum:${string}`
export const BUILTIN_ARRAY_ELEMENT_TYPES = [
  'pg_catalog.int2',
  'pg_catalog.int4',
  'pg_catalog.int8',
  'pg_catalog.float4',
  'pg_catalog.float8',
  'pg_catalog."numeric"',
  'pg_catalog.bool',
  'pg_catalog.text',
  'pg_catalog."varchar"',
  'pg_catalog.bpchar',
  'pg_catalog.uuid',
] as const
export type ArrayElementType = (typeof BUILTIN_ARRAY_ELEMENT_TYPES)[number] | EnumType
export type ArrayType = `array:${ArrayElementType}`
export type ScalarType =
  | NumericType
  | 'pg_catalog.bool'
  | TextType
  | UuidType
  | JsonType
  | JsonbType
  | TemporalType
  | EnumType
  | ArrayType
export type SyntaxKind = 'and' | 'or' | 'not' | 'is-null' | 'is-not-null' | 'case' | 'coalesce'

export type EnumDefinition = Readonly<Omit<EnumInfo, 'values'>> & {
  readonly values: readonly string[]
}

export function enumType(definition: Pick<EnumDefinition, 'schema' | 'name'>): EnumType {
  return `enum:${JSON.stringify([definition.schema, definition.name])}`
}

export function arrayType(elementType: ArrayElementType): ArrayType {
  return `array:${elementType}`
}

function isJsonConvertibleType(type: string): boolean {
  if (
    type === 'pg_catalog.bool' ||
    type === 'pg_catalog.uuid' ||
    type === 'pg_catalog."json"' ||
    type === 'pg_catalog.jsonb' ||
    type.startsWith('enum:')
  )
    return true
  if (/^pg_catalog\.(int[248]|float[48]|"numeric"|text|"varchar"|bpchar)$/.test(type)) return true
  return type.startsWith('array:') ? isJsonConvertibleType(type.slice('array:'.length)) : false
}

function operandMatchesDeclared(declared: string, actual: string): boolean {
  if (actual === declared) return true
  if (declared === 'pg_catalog._text' && actual === arrayType('pg_catalog.text')) return true
  if (declared === 'pg_catalog.anyelement' && isJsonConvertibleType(actual)) return true
  if (declared === 'pg_catalog."any"' && isJsonConvertibleType(actual)) return true
  return (
    declared === 'pg_catalog.anyarray' &&
    actual.startsWith('array:') &&
    isJsonConvertibleType(actual.slice('array:'.length))
  )
}

function isArrayElementType(type: string): type is ArrayElementType {
  return (
    (BUILTIN_ARRAY_ELEMENT_TYPES as readonly string[]).includes(type) || type.startsWith('enum:')
  )
}

export function resolveAnycompatibleElementType(
  types: readonly ArrayElementType[],
): ArrayElementType | null {
  if (types.length === 0) return null
  if (types.every((type) => type === types[0])) return types[0]!
  const numeric = [
    'pg_catalog.int2',
    'pg_catalog.int4',
    'pg_catalog.int8',
    'pg_catalog."numeric"',
    'pg_catalog.float4',
    'pg_catalog.float8',
  ] as const
  if (types.every((type) => (numeric as readonly string[]).includes(type)))
    return numeric[
      Math.max(...types.map((type) => numeric.indexOf(type as (typeof numeric)[number])))
    ]!
  const text = ['pg_catalog.bpchar', 'pg_catalog."varchar"', 'pg_catalog.text'] as const
  if (types.every((type) => (text as readonly string[]).includes(type)))
    return text[Math.max(...types.map((type) => text.indexOf(type as (typeof text)[number])))]!
  return null
}

type ArrayPseudoType =
  | 'pg_catalog.anyarray'
  | 'pg_catalog.anycompatiblearray'
  | 'pg_catalog.anyelement'
  | 'pg_catalog.anycompatible'

export function resolveArrayPolymorphicType(
  declaredArguments: readonly ArrayPseudoType[],
  declaredResult: ArrayPseudoType | ScalarType,
  concreteArguments: readonly ScalarType[],
): ScalarType | null {
  if (declaredArguments.length !== concreteArguments.length) return null
  let elementType: ArrayElementType | undefined
  for (let index = 0; index < declaredArguments.length; index++) {
    const declared = declaredArguments[index]!
    const concrete = concreteArguments[index]!
    const array = declared === 'pg_catalog.anyarray' || declared === 'pg_catalog.anycompatiblearray'
    const candidate = array
      ? concrete.startsWith('array:')
        ? concrete.slice('array:'.length)
        : null
      : concrete
    if (!candidate || !isArrayElementType(candidate)) return null
    if (elementType === undefined) elementType = candidate
    else if (candidate !== elementType) {
      if (
        declared.startsWith('pg_catalog.anycompatible') &&
        declaredArguments.every((argument) => argument.startsWith('pg_catalog.anycompatible'))
      ) {
        const compatible = resolveAnycompatibleElementType([elementType, candidate])
        if (!compatible) return null
        elementType = compatible
      } else return null
    }
  }
  if (!elementType) return null
  if (
    declaredResult === 'pg_catalog.anyarray' ||
    declaredResult === 'pg_catalog.anycompatiblearray'
  )
    return arrayType(elementType)
  if (declaredResult === 'pg_catalog.anyelement' || declaredResult === 'pg_catalog.anycompatible')
    return elementType
  return declaredResult
}

export type SqlExpression =
  | {
      kind: 'array-operation'
      type: ScalarType
      elementType: ArrayElementType
      collation?: string
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
        | 'sort'
      operands: readonly SqlExpression[]
    }
  | {
      kind: 'array-comparison'
      type: 'pg_catalog.bool'
      elementType: ArrayElementType
      collation?: string
      operation: '=' | '<>' | '<' | '<=' | '>' | '>='
      operands: readonly SqlExpression[]
    }
  | {
      kind: 'array-subscript'
      type: ArrayElementType
      elementType: ArrayElementType
      array: SqlExpression
      subscripts: readonly SqlExpression[]
    }
  | {
      kind: 'array-slice'
      type: ArrayType
      elementType: ArrayElementType
      array: SqlExpression
      bounds: readonly {
        lower: SqlExpression | null
        upper: SqlExpression | null
      }[]
    }
  | {
      kind: 'array-assign'
      type: ArrayType
      elementType: ArrayElementType
      array: SqlExpression
      subscripts: readonly SqlExpression[]
      value: SqlExpression
    }
  | {
      kind: 'enum-coercion'
      type: EnumType | 'pg_catalog.text'
      enum: EnumDefinition
      operand: SqlExpression
    }
  | {
      kind: 'enum-comparison'
      type: 'pg_catalog.bool'
      enum: EnumDefinition
      operation: '=' | '<>' | '<' | '<=' | '>' | '>='
      operands: readonly SqlExpression[]
    }
  | {
      kind: 'uuid-coercion'
      type: UuidType | 'pg_catalog.text'
      operand: SqlExpression
    }
  | {
      kind: 'json-coercion'
      type: JsonType | JsonbType | 'pg_catalog.text'
      operand: SqlExpression
    }
  | {
      kind: 'text-coercion'
      type: TextType
      length: number | null
      explicit: boolean
      operand: SqlExpression
    }
  | { kind: 'boolean'; type: 'pg_catalog.bool'; value: boolean | null }
  | { kind: 'text'; type: 'pg_catalog.text'; value: string | null }
  | { kind: 'name'; type: 'pg_catalog.name'; value: string | null }
  | { kind: 'bytea'; type: 'pg_catalog.bytea'; value: string | null }
  | { kind: 'bit'; type: 'pg_catalog."bit"' | 'pg_catalog.varbit'; value: string | null }
  | { kind: 'uuid'; type: UuidType; value: string | null }
  | { kind: 'json'; type: JsonType; value: string | null }
  | { kind: 'jsonb'; type: JsonbType; value: string | null }
  | { kind: 'temporal'; type: TemporalType; value: string | null }
  | { kind: 'enum'; type: EnumType; enum: EnumDefinition; value: string | null }
  | {
      kind: 'array'
      type: ArrayType
      elementType: ArrayElementType
      dimensions: readonly number[]
      lowerBounds: readonly number[]
      elements: readonly SqlExpression[] | null
    }
  | {
      kind: 'boolean-logic'
      type: 'pg_catalog.bool'
      operation: 'and' | 'or' | 'not'
      operands: readonly SqlExpression[]
    }
  | { kind: 'null-test'; type: 'pg_catalog.bool'; negated: boolean; operand: SqlExpression }
  | {
      kind: 'case'
      type: ScalarType
      branches: readonly { when: SqlExpression; then: SqlExpression }[]
      otherwise: SqlExpression
    }
  | { kind: 'coalesce'; type: ScalarType; operands: readonly SqlExpression[] }
  | { kind: 'integer'; type: IntegerType; value: string | null }
  | { kind: 'float'; type: FloatType; bits: string | null }
  | { kind: 'decimal'; type: DecimalType; value: string | null }
  | {
      kind: 'operator' | 'function'
      collation?: string
      signature: string
      type: string
      operands: readonly SqlExpression[]
    }
  | {
      kind: 'cast'
      signature: string | null
      type: NumericType | 'pg_catalog.text'
      operand: SqlExpression
    }

export interface ExpressionBackend<Ast> {
  bindings: readonly SqlBindingGroup<Ast>[]
  boolean: (value: boolean | null) => Ast
  text: (value: string | null) => Ast
  name: (value: string | null) => Ast
  bytea: (value: string | null) => Ast
  bit: (value: string | null) => Ast
  uuid: (value: string | null) => Ast
  json: (value: string | null) => Ast
  jsonb: (value: string | null) => Ast
  temporal: (type: TemporalType, value: string | null) => Ast
  enum: (definition: EnumDefinition, value: string | null) => Ast
  array: (
    elementType: ArrayElementType,
    dimensions: readonly number[],
    lowerBounds: readonly number[],
    elements: readonly TypedSqlExpression<Ast>[] | null,
  ) => { expression: Ast; helpers: readonly string[] }
  arrayOperation: (
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
      | 'sort'
      | '='
      | '<>'
      | '<'
      | '<='
      | '>'
      | '>=',
    elementType: ArrayElementType,
    operands: readonly TypedSqlExpression<Ast>[],
  ) => { expression: Ast; helpers: readonly string[] }
  arraySubscript: (
    elementType: ArrayElementType,
    array: TypedSqlExpression<Ast>,
    subscripts: readonly TypedSqlExpression<Ast>[],
  ) => { expression: Ast; helpers: readonly string[] }
  arraySlice: (
    array: TypedSqlExpression<Ast>,
    bounds: readonly {
      lower: TypedSqlExpression<Ast> | null
      upper: TypedSqlExpression<Ast> | null
    }[],
  ) => { expression: Ast; helpers: readonly string[] }
  arrayAssign: (
    elementType: ArrayElementType,
    array: TypedSqlExpression<Ast>,
    subscripts: readonly TypedSqlExpression<Ast>[],
    value: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  compareEnum: (
    operation: '=' | '<>' | '<' | '<=' | '>' | '>=',
    operands: readonly TypedSqlExpression<Ast>[],
  ) => { expression: Ast; helpers: readonly string[] }
  coerceEnum: (
    type: EnumType | 'pg_catalog.text',
    definition: EnumDefinition,
    operand: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  coerceUuid: (
    type: UuidType | 'pg_catalog.text',
    operand: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  coerceJson: (
    type: JsonType | JsonbType | 'pg_catalog.text',
    operand: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  coerceText: (
    type: TextType,
    length: number | null,
    explicit: boolean,
    operand: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  syntax: (
    kind: SyntaxKind,
    type: ScalarType,
    operands: readonly TypedSqlExpression<Ast>[],
  ) => { expression: Ast; helpers: readonly string[] }
  integer: (type: IntegerType, value: string | null) => Ast
  float: (type: FloatType, bits: string | null) => Ast
  decimal: (value: string | null) => Ast
}

export function emitSqlExpression<Ast>(
  expression: SqlExpression,
  backend: ExpressionBackend<Ast>,
): { value: TypedSqlExpression<Ast>; helpers: readonly string[] } {
  const helpers = new Set<string>()
  const validateEnum = (definition: EnumDefinition): EnumType => {
    const invalidUtf8 = (value: string): boolean =>
      value.includes('\0') ||
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)
    if (
      definition.schema.length === 0 ||
      definition.name.length === 0 ||
      invalidUtf8(definition.schema) ||
      invalidUtf8(definition.name) ||
      new TextEncoder().encode(definition.schema).length >= 64 ||
      new TextEncoder().encode(definition.name).length >= 64 ||
      definition.values.length === 0 ||
      new Set(definition.values).size !== definition.values.length ||
      definition.values.some(
        (value) => invalidUtf8(value) || new TextEncoder().encode(value).length >= 64,
      )
    )
      throw new Error('Invalid enum definition')
    return enumType(definition)
  }
  const emit = (node: SqlExpression): TypedSqlExpression<Ast> => {
    if (node.kind === 'array-operation' || node.kind === 'array-comparison') {
      const identity = arrayType(node.elementType)
      const metadataOperations = ['cardinality', 'ndims', 'dims'] as const
      const dimensionOperations = ['length', 'lower', 'upper'] as const
      const binaryOperations = [
        'contains',
        'contained',
        'overlap',
        'concat',
        '=',
        '<>',
        '<',
        '<=',
        '>',
        '>=',
      ] as const
      const expectedType =
        node.operation === 'dims'
          ? 'pg_catalog.text'
          : [
                'concat',
                'append',
                'prepend',
                'remove',
                'replace',
                'fill',
                'trim',
                'reverse',
                'sort',
              ].includes(node.operation)
            ? identity
            : node.operation === 'positions'
              ? arrayType('pg_catalog.int4')
              : metadataOperations.includes(
                    node.operation as (typeof metadataOperations)[number],
                  ) ||
                  dimensionOperations.includes(
                    node.operation as (typeof dimensionOperations)[number],
                  ) ||
                  node.operation === 'position'
                ? 'pg_catalog.int4'
                : 'pg_catalog.bool'
      const arrayElement = (type: string): ArrayElementType | null =>
        type.startsWith('array:') && isArrayElementType(type.slice('array:'.length))
          ? (type.slice('array:'.length) as ArrayElementType)
          : null
      const compatible = (types: readonly (ArrayElementType | null)[]): boolean =>
        types.every(
          (type): type is ArrayElementType => type !== null && isArrayElementType(type),
        ) && resolveAnycompatibleElementType(types) === node.elementType
      let validOperands =
        (metadataOperations.includes(node.operation as (typeof metadataOperations)[number]) &&
          node.operands.length === 1 &&
          node.operands[0]?.type === identity) ||
        (dimensionOperations.includes(node.operation as (typeof dimensionOperations)[number]) &&
          node.operands.length === 2 &&
          node.operands[0]?.type === identity &&
          node.operands[1]?.type === 'pg_catalog.int4') ||
        (binaryOperations.includes(node.operation as (typeof binaryOperations)[number]) &&
          node.operands.length === 2 &&
          (node.operation === 'concat'
            ? compatible(node.operands.map((operand) => arrayElement(operand.type)))
            : node.operands.every((operand) => operand.type === identity)))
      if (node.operation === 'append')
        validOperands =
          node.operands.length === 2 &&
          compatible([
            arrayElement(node.operands[0]!.type),
            node.operands[1]!.type as ArrayElementType,
          ])
      else if (node.operation === 'prepend')
        validOperands =
          node.operands.length === 2 &&
          compatible([
            node.operands[0]!.type as ArrayElementType,
            arrayElement(node.operands[1]!.type),
          ])
      else if (['position', 'positions', 'remove'].includes(node.operation))
        validOperands =
          node.operands.length >= 2 &&
          node.operands.length <= (node.operation === 'position' ? 3 : 2) &&
          compatible([
            arrayElement(node.operands[0]!.type),
            node.operands[1]!.type as ArrayElementType,
          ]) &&
          (node.operands.length < 3 || node.operands[2]!.type === 'pg_catalog.int4')
      else if (node.operation === 'replace')
        validOperands =
          node.operands.length === 3 &&
          compatible([
            arrayElement(node.operands[0]!.type),
            node.operands[1]!.type as ArrayElementType,
            node.operands[2]!.type as ArrayElementType,
          ])
      else if (node.operation === 'fill')
        validOperands =
          (node.operands.length === 2 || node.operands.length === 3) &&
          compatible([node.operands[0]!.type as ArrayElementType]) &&
          node.operands.slice(1).every((operand) => operand.type === arrayType('pg_catalog.int4'))
      else if (node.operation === 'trim')
        validOperands =
          node.operands.length === 2 &&
          node.operands[0]!.type === identity &&
          node.operands[1]!.type === 'pg_catalog.int4'
      else if (node.operation === 'reverse')
        validOperands = node.operands.length === 1 && node.operands[0]!.type === identity
      else if (node.operation === 'sort')
        validOperands =
          node.operands.length >= 1 &&
          node.operands.length <= 3 &&
          node.operands[0]!.type === identity &&
          node.operands.slice(1).every((operand) => operand.type === 'pg_catalog.bool')
      const comparesElements = [
        'contains',
        'contained',
        'overlap',
        '=',
        '<>',
        '<',
        '<=',
        '>',
        '>=',
        'position',
        'positions',
        'remove',
        'replace',
        'sort',
      ].includes(node.operation)
      const textElement = ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(
        node.elementType,
      )
      if (
        !validOperands ||
        node.type !== expectedType ||
        (comparesElements && textElement && node.collation !== 'C')
      )
        throw new Error(
          comparesElements && textElement && node.collation !== 'C'
            ? 'Unsupported array element collation: expected C'
            : 'Invalid array operation',
        )
      const operands = node.operands.map(emit)
      const result = backend.arrayOperation(node.operation, node.elementType, operands)
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'array-subscript') {
      const identity = arrayType(node.elementType)
      if (
        node.array.type !== identity ||
        resolveArrayPolymorphicType(['pg_catalog.anyarray'], 'pg_catalog.anyelement', [
          node.array.type,
        ]) !== node.type ||
        node.subscripts.length === 0 ||
        node.subscripts.some((subscript) => subscript.type !== 'pg_catalog.int4')
      )
        throw new Error('Invalid array subscript')
      const result = backend.arraySubscript(
        node.elementType,
        emit(node.array),
        node.subscripts.map(emit),
      )
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'array-slice') {
      const identity = arrayType(node.elementType)
      if (
        node.type !== identity ||
        node.array.type !== identity ||
        node.bounds.length === 0 ||
        node.bounds.length > 6 ||
        node.bounds.some(
          (bound) =>
            (bound.lower !== null && bound.lower.type !== 'pg_catalog.int4') ||
            (bound.upper !== null && bound.upper.type !== 'pg_catalog.int4'),
        )
      )
        throw new Error('Invalid array slice')
      const result = backend.arraySlice(
        emit(node.array),
        node.bounds.map((bound) => ({
          lower: bound.lower === null ? null : emit(bound.lower),
          upper: bound.upper === null ? null : emit(bound.upper),
        })),
      )
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'array-assign') {
      const identity = arrayType(node.elementType)
      if (
        node.type !== identity ||
        node.array.type !== identity ||
        node.subscripts.length === 0 ||
        node.subscripts.length > 6 ||
        node.subscripts.some((subscript) => subscript.type !== 'pg_catalog.int4') ||
        resolveAnycompatibleElementType([node.elementType, node.value.type as ArrayElementType]) !==
          node.elementType
      )
        throw new Error('Invalid array assignment')
      const result = backend.arrayAssign(
        node.elementType,
        emit(node.array),
        node.subscripts.map(emit),
        emit(node.value),
      )
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'enum-coercion') {
      const identity = validateEnum(node.enum)
      if (!(
        (node.type === identity && node.operand.type === 'pg_catalog.text') ||
        (node.type === 'pg_catalog.text' && node.operand.type === identity)
      ))
        throw new Error('Invalid enum coercion')
      const result = backend.coerceEnum(node.type, node.enum, emit(node.operand))
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'enum-comparison') {
      const identity = validateEnum(node.enum)
      if (node.operands.length !== 2 || node.operands.some((operand) => operand.type !== identity))
        throw new Error('Invalid enum comparison')
      const operands = node.operands.map(emit)
      const result = backend.compareEnum(node.operation, operands)
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'uuid-coercion') {
      if (!(
        (node.type === 'pg_catalog.uuid' && node.operand.type === 'pg_catalog.text') ||
        (node.type === 'pg_catalog.text' && node.operand.type === 'pg_catalog.uuid')
      ))
        throw new Error('Invalid UUID coercion')
      const result = backend.coerceUuid(node.type, emit(node.operand))
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'json-coercion') {
      const jsonTypes = ['pg_catalog."json"', 'pg_catalog.jsonb'] as const
      if (!(
        (jsonTypes.includes(node.type as (typeof jsonTypes)[number]) &&
          node.operand.type === 'pg_catalog.text') ||
        (node.type === 'pg_catalog.text' &&
          jsonTypes.includes(node.operand.type as (typeof jsonTypes)[number])) ||
        (jsonTypes.includes(node.type as (typeof jsonTypes)[number]) &&
          jsonTypes.includes(node.operand.type as (typeof jsonTypes)[number]) &&
          node.type !== node.operand.type)
      ))
        throw new Error('Invalid JSON coercion')
      const result = backend.coerceJson(node.type, emit(node.operand))
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'text-coercion') {
      if (
        !['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(node.type) ||
        !['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(
          node.operand.type,
        ) ||
        (node.length !== null &&
          (node.type === 'pg_catalog.text' ||
            !Number.isInteger(node.length) ||
            node.length < 1 ||
            node.length > 10485760))
      )
        throw new Error('Invalid text coercion')
      const result = backend.coerceText(node.type, node.length, node.explicit, emit(node.operand))
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'name' || node.kind === 'bytea') {
      const invalidUtf8 = (value: string): boolean =>
        value.includes('\0') ||
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)
      if (node.kind === 'name') {
        if (node.type !== 'pg_catalog.name') throw new Error('Invalid name literal')
        if (node.value !== null && invalidUtf8(node.value))
          throw new Error('Invalid PostgreSQL UTF8 name literal')
        helpers.add('nameInput')
        return { type: node.type, expression: backend.name(node.value) }
      }
      if (
        node.type !== 'pg_catalog.bytea' ||
        (node.value !== null && (node.value.length % 2 !== 0 || /[^0-9a-f]/i.test(node.value)))
      )
        throw new Error('Invalid bytea literal')
      helpers.add('byteaInput')
      return { type: node.type, expression: backend.bytea(node.value) }
    }
    if (node.kind === 'bit') {
      const validBitLiteral = (value: string): boolean => {
        if (value.length === 0) return true
        const lead = value[0]
        if (lead === 'x' || lead === 'X') return /^[0-9a-fA-F]*$/u.test(value.slice(1))
        const body = lead === 'b' || lead === 'B' ? value.slice(1) : value
        return /^[01]*$/u.test(body)
      }
      if (
        (node.type !== 'pg_catalog."bit"' && node.type !== 'pg_catalog.varbit') ||
        (node.value !== null && !validBitLiteral(node.value))
      )
        throw new Error('Invalid bit string')
      helpers.add('bitInput')
      return { type: node.type, expression: backend.bit(node.value) }
    }
    if (node.kind === 'boolean' || node.kind === 'text') {
      if (
        node.kind === 'text' &&
        node.value !== null &&
        (node.value.includes('\0') ||
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
            node.value,
          ))
      )
        throw new Error('Invalid PostgreSQL UTF8 text literal')
      const expression =
        node.kind === 'boolean' ? backend.boolean(node.value) : backend.text(node.value)
      helpers.add(node.kind === 'boolean' ? 'booleanInput' : 'textInput')
      return { type: node.type, expression }
    }
    if (node.kind === 'uuid') {
      helpers.add('uuidInput')
      return { type: node.type, expression: backend.uuid(node.value) }
    }
    if (node.kind === 'json' || node.kind === 'jsonb') {
      if (
        node.value !== null &&
        (node.value.includes('\0') ||
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
            node.value,
          ))
      )
        throw new Error('Invalid JSON literal')
      helpers.add(node.kind === 'json' ? 'jsonInput' : 'jsonbInput')
      return {
        type: node.type,
        expression: node.kind === 'json' ? backend.json(node.value) : backend.jsonb(node.value),
      }
    }
    if (node.kind === 'temporal') {
      if (
        node.value !== null &&
        (node.value.includes('\0') ||
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
            node.value,
          ))
      )
        throw new Error('Invalid temporal literal')
      const helper =
        node.type === 'pg_catalog.date'
          ? 'dateInput'
          : node.type === 'pg_catalog."time"'
            ? 'timeInput'
            : node.type === 'pg_catalog."timestamp"'
              ? 'timestampInput'
              : node.type === 'pg_catalog.timestamptz'
                ? 'timestamptzInput'
                : node.type === 'pg_catalog.timetz'
                  ? 'timetzInput'
                  : 'intervalInput'
      helpers.add(helper)
      return { type: node.type, expression: backend.temporal(node.type, node.value) }
    }
    if (node.kind === 'enum') {
      if (node.type !== validateEnum(node.enum)) throw new Error('Invalid enum literal')
      if (
        node.value !== null &&
        (node.value.includes('\0') ||
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
            node.value,
          ))
      )
        throw new Error('Invalid enum literal')
      helpers.add('enumInput')
      return { type: node.type, expression: backend.enum(node.enum, node.value) }
    }
    if (node.kind === 'array') {
      const identity = arrayType(node.elementType)
      const dimensionsValid =
        node.dimensions.length === node.lowerBounds.length &&
        node.dimensions.length <= 6 &&
        node.dimensions.every((dimension) => Number.isInteger(dimension) && dimension > 0) &&
        node.lowerBounds.every(
          (bound, index) =>
            Number.isInteger(bound) &&
            bound >= -2147483648 &&
            bound <= 2147483647 &&
            bound + node.dimensions[index]! - 1 <= 2147483647,
        )
      const count = node.dimensions.reduce((total, dimension) => total * dimension, 1)
      if (
        node.type !== identity ||
        (node.elements === null
          ? node.dimensions.length !== 0 || node.lowerBounds.length !== 0
          : !dimensionsValid ||
            node.elements.length !== (node.dimensions.length === 0 ? 0 : count) ||
            node.elements.some((element) => element.type !== node.elementType))
      )
        throw new Error('Invalid array literal')
      helpers.add('arrayInput')
      const result = backend.array(
        node.elementType,
        node.dimensions,
        node.lowerBounds,
        node.elements?.map(emit) ?? null,
      )
      for (const helper of result.helpers) helpers.add(helper)
      return {
        type: node.type,
        expression: result.expression,
      }
    }
    if (
      node.kind === 'boolean-logic' ||
      node.kind === 'null-test' ||
      node.kind === 'case' ||
      node.kind === 'coalesce'
    ) {
      let kind: SyntaxKind
      let operands: readonly SqlExpression[]
      if (node.kind === 'boolean-logic') {
        kind = node.operation
        operands = node.operands
        if (
          operands.length !== (kind === 'not' ? 1 : 2) ||
          operands.some((operand) => operand.type !== 'pg_catalog.bool')
        )
          throw new Error('Invalid boolean expression')
      } else if (node.kind === 'null-test') {
        kind = node.negated ? 'is-not-null' : 'is-null'
        operands = [node.operand]
      } else if (node.kind === 'case') {
        kind = 'case'
        if (
          node.branches.length === 0 ||
          node.otherwise.type !== node.type ||
          node.branches.some(
            (branch) => branch.when.type !== 'pg_catalog.bool' || branch.then.type !== node.type,
          )
        )
          throw new Error('Invalid CASE expression')
        operands = [
          ...node.branches.flatMap((branch) => [branch.when, branch.then]),
          node.otherwise,
        ]
      } else {
        kind = 'coalesce'
        operands = node.operands
        if (operands.length === 0 || operands.some((operand) => operand.type !== node.type))
          throw new Error('Invalid COALESCE expression')
      }
      const result = backend.syntax(kind, node.type, operands.map(emit))
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'decimal') {
      if (
        node.value !== null &&
        !/^(?:NaN|[+-]?Infinity|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/.test(node.value)
      )
        throw new Error(`Invalid decimal literal: ${node.value}`)
      helpers.add('decimalInput')
      return { type: node.type, expression: backend.decimal(node.value) }
    }
    if (node.kind === 'float') {
      const length = node.type === 'pg_catalog.float4' ? 8 : 16
      if (node.bits !== null && (node.bits.length !== length || !/^[0-9a-f]+$/i.test(node.bits)))
        throw new Error(`Invalid float literal bits: ${node.bits}`)
      helpers.add(node.type === 'pg_catalog.float4' ? 'float4Input' : 'float8Input')
      return { type: node.type, expression: backend.float(node.type, node.bits) }
    }
    if (node.kind === 'integer') {
      if (node.value !== null && !/^-?\d+$/.test(node.value))
        throw new Error(`Invalid integer literal: ${node.value}`)
      const helper =
        node.type === 'pg_catalog.int2'
          ? 'int2Input'
          : node.type === 'pg_catalog.int4'
            ? 'int4Input'
            : 'int8Input'
      helpers.add(helper)
      return { type: node.type, expression: backend.integer(node.type, node.value) }
    }
    if (node.kind === 'cast' && node.signature === null) {
      if (node.operand.type !== node.type) throw new Error('Invalid relabel cast')
      return emit(node.operand)
    }
    const signature = node.signature!
    const operator = node.kind === 'operator'
    const metadata = operator ? operatorMetadata(signature) : functionMetadata(signature)
    if ((metadata.kind !== 'operator' && metadata.kind !== 'function') || metadata.returnsSet) {
      throw new Error(`Unsupported execution shape: ${signature}`)
    }
    const operands = node.kind === 'cast' ? [node.operand] : node.operands
    if (
      node.kind === 'cast' &&
      (metadata.schema !== 'pg_catalog' ||
        metadata.name !== node.type.slice('pg_catalog.'.length).replaceAll('"', '') ||
        operands.length !== 1 ||
        (node.type === 'pg_catalog.text'
          ? !['pg_catalog.bool', 'pg_catalog.bpchar'].includes(node.operand.type)
          : !/^pg_catalog\.(int[248]|float[48]|"numeric")$/.test(node.operand.type)))
    ) {
      throw new Error(`Invalid cast function: ${signature}`)
    }
    const variadicAny = metadata.kind === 'function' && metadata.variadic === 'pg_catalog."any"'
    if (node.type !== metadata.result) throw new Error(`Invalid resolved expression: ${signature}`)
    if (variadicAny) {
      if (operands.length < 1) throw new Error(`Invalid resolved expression: ${signature}`)
    } else if (operands.length !== metadata.args.length) {
      throw new Error(`Invalid resolved expression: ${signature}`)
    }
    for (let i = 0; i < operands.length; i++) {
      const declared = variadicAny ? 'pg_catalog."any"' : metadata.args[i]!
      const actual = operands[i]!.type
      if (!operandMatchesDeclared(declared, actual))
        throw new Error(`Operand type mismatch: ${signature}, argument ${i}`)
    }
    const binding = backend.bindings
      .map((group) => (operator ? group.operators : group.functions)[signature])
      .find((binding) => binding !== undefined)
    if (!binding) throw new Error(`Unsupported overload: ${signature}`)
    const emitter = binding as unknown as CallableEmitter<CallableMetadata, Ast>
    if (
      operands.some((operand) =>
        [
          'pg_catalog.text',
          'pg_catalog.bpchar',
          'pg_catalog."varchar"',
          'pg_catalog.name',
        ].includes(operand.type),
      ) &&
      ((operator &&
        ['=', '<>', '<', '<=', '>', '>=', '~~', '!~~', '~~*', '!~~*'].includes(metadata.name)) ||
        (!operator &&
          [
            'texteq',
            'textne',
            'text_lt',
            'text_le',
            'text_gt',
            'text_ge',
            'bpchareq',
            'bpcharne',
            'bpcharlt',
            'bpcharle',
            'bpchargt',
            'bpcharge',
            'strpos',
            'replace',
            'split_part',
            'starts_with',
            'textlike',
            'textnlike',
            'bpcharlike',
            'bpcharnlike',
            'like',
            'notlike',
            'lower',
            'upper',
            'initcap',
            'casefold',
            'texticlike',
            'texticnlike',
            'bpchariclike',
            'bpcharicnlike',
            'namelike',
            'namenlike',
            'nameiclike',
            'nameicnlike',
          ].includes(metadata.name))) &&
      node.kind !== 'cast' &&
      node.collation !== 'C'
    )
      throw new Error('Unsupported text collation: expected C')
    const emittedOperands = operands.map(emit)
    for (const helper of emitter.helpers) helpers.add(helper)
    const result = emitter.emit(metadata, emittedOperands)
    if (result.type !== metadata.result)
      throw new Error(`Emitter result type mismatch: ${signature}`)
    return result
  }
  return { value: emit(expression), helpers: [...helpers] }
}
