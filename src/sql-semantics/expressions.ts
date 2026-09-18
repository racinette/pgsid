import { functionMetadata, operatorMetadata } from '../postgres/builtins/inventory.js'
import type { CallableMetadata } from '../postgres/builtins/catalog.js'
import type { CallableEmitter, SqlBindingGroup, TypedSqlExpression } from './signatures.js'

export type IntegerType = 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8'

export type FloatType = 'pg_catalog.float4' | 'pg_catalog.float8'
export type DecimalType = 'pg_catalog."numeric"'
export type NumericType = IntegerType | FloatType | DecimalType

export type ScalarType = NumericType | 'pg_catalog.bool' | 'pg_catalog.text'
export type SyntaxKind = 'and' | 'or' | 'not' | 'is-null' | 'is-not-null' | 'case' | 'coalesce'

export type SqlExpression =
  | { kind: 'boolean'; type: 'pg_catalog.bool'; value: boolean | null }
  | { kind: 'text'; type: 'pg_catalog.text'; value: string | null }
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
      type: NumericType
      operand: SqlExpression
    }

export interface ExpressionBackend<Ast> {
  bindings: readonly SqlBindingGroup<Ast>[]
  boolean: (value: boolean | null) => Ast
  text: (value: string | null) => Ast
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
  const emit = (node: SqlExpression): TypedSqlExpression<Ast> => {
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
      if (node.operand.type !== node.type) throw new Error('Invalid numeric relabel cast')
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
        !/^pg_catalog\.(int[248]|float[48]|"numeric")$/.test(node.operand.type))
    ) {
      throw new Error(`Invalid numeric cast function: ${signature}`)
    }
    if (node.type !== metadata.result || operands.length !== metadata.args.length)
      throw new Error(`Invalid resolved expression: ${signature}`)
    for (let i = 0; i < operands.length; i++) {
      if (operands[i]!.type !== metadata.args[i])
        throw new Error(`Operand type mismatch: ${signature}, argument ${i}`)
    }
    const binding = backend.bindings
      .map((group) => (operator ? group.operators : group.functions)[signature])
      .find((binding) => binding !== undefined)
    if (!binding) throw new Error(`Unsupported overload: ${signature}`)
    const emitter = binding as unknown as CallableEmitter<CallableMetadata, Ast>
    if (
      operands.some((operand) => operand.type === 'pg_catalog.text') &&
      ((operator && ['=', '<>', '<', '<=', '>', '>='].includes(metadata.name)) ||
        (!operator &&
          ['texteq', 'textne', 'text_lt', 'text_le', 'text_gt', 'text_ge'].includes(
            metadata.name,
          ))) &&
      node.kind !== 'cast' &&
      node.collation !== 'C'
    )
      throw new Error('Unsupported text comparison collation: expected C')
    const emittedOperands = operands.map(emit)
    for (const helper of emitter.helpers) helpers.add(helper)
    const result = emitter.emit(metadata, emittedOperands)
    if (result.type !== metadata.result)
      throw new Error(`Emitter result type mismatch: ${signature}`)
    return result
  }
  return { value: emit(expression), helpers: [...helpers] }
}
