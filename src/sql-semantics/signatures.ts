import type { CallableMetadata } from '../postgres/builtins/catalog.js'
import type { BuiltinDomain } from '../postgres/builtins/taxonomy.js'

type CallableInventory = Readonly<Record<string, CallableMetadata>>

export type CallableSignatures<
  Inventory extends CallableInventory,
  Kind extends CallableMetadata['kind'],
> = {
  [K in keyof Inventory]: Inventory[K]['kind'] extends Kind ? K : never
}[keyof Inventory]

export type OperatorSignatures<Inventory extends CallableInventory> = CallableSignatures<
  Inventory,
  'operator'
>
export type FunctionSignatures<Inventory extends CallableInventory> = CallableSignatures<
  Inventory,
  'function' | 'aggregate' | 'window'
>

export interface TypedSqlExpression<Ast, Type extends string = string> {
  type: Type
  expression: Ast
}

type OperandTuple<Args extends readonly string[], Ast> = {
  readonly [I in keyof Args]: TypedSqlExpression<Ast, Args[I]>
}

export type CallableOperands<M extends CallableMetadata, Ast> = OperandTuple<M['args'], Ast>

export interface CallableEmitter<M extends CallableMetadata, Ast> {
  emit: (metadata: M, operands: CallableOperands<M, Ast>) => TypedSqlExpression<Ast, M['result']>
  helpers: readonly string[]
}

export type OperatorBindings<Inventory extends CallableInventory, Ast> = Partial<{
  [K in OperatorSignatures<Inventory>]: CallableEmitter<Inventory[K], Ast>
}>

export type FunctionBindings<Inventory extends CallableInventory, Ast> = Partial<{
  [K in FunctionSignatures<Inventory>]: CallableEmitter<Inventory[K], Ast>
}>

export type RuntimeBindings<Ast> = Readonly<
  Record<
    string,
    | {
        helpers: readonly string[]
        emit: (...args: never[]) => TypedSqlExpression<Ast>
      }
    | undefined
  >
>

export interface SqlBindingGroup<Ast> {
  domain: BuiltinDomain
  operators: RuntimeBindings<Ast>
  functions: RuntimeBindings<Ast>
}
