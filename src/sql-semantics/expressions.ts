import { functionMetadata, operatorMetadata } from '../postgres/builtins/inventory.js'
import type { CallableMetadata } from '../postgres/builtins/catalog.js'
import type { CallableEmitter, SqlBindingGroup, TypedSqlExpression } from './signatures.js'

export type IntegerType = 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8'

export type FloatType = 'pg_catalog.float4' | 'pg_catalog.float8'
export type DecimalType = 'pg_catalog."numeric"'
export type NumericType = IntegerType | FloatType | DecimalType

export type SqlExpression =
  | { kind: 'integer'; type: IntegerType; value: string | null }
  | { kind: 'float'; type: FloatType; bits: string | null }
  | { kind: 'decimal'; type: DecimalType; value: string | null }
  | {
      kind: 'operator' | 'function'
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
    const emittedOperands = operands.map(emit)
    for (const helper of emitter.helpers) helpers.add(helper)
    const result = emitter.emit(metadata, emittedOperands)
    if (result.type !== metadata.result)
      throw new Error(`Emitter result type mismatch: ${signature}`)
    return result
  }
  return { value: emit(expression), helpers: [...helpers] }
}
