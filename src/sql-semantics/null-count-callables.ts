import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import type { FunctionMetadata } from '../postgres/builtins/catalog.js'

export const isNullCountCallable = (
  item: BuiltinCallable,
): item is FunctionMetadata & { name: 'num_nulls' | 'num_nonnulls' } =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  ['num_nulls', 'num_nonnulls'].includes(item.name) &&
  item.args.length === 1 &&
  item.args[0] === 'pg_catalog."any"' &&
  item.variadic === 'pg_catalog."any"' &&
  item.result === 'pg_catalog.int4' &&
  !item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet
