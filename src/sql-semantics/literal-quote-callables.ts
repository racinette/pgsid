import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import type { FunctionMetadata } from '../postgres/builtins/catalog.js'

export const isNullableQuote = (
  item: BuiltinCallable,
): item is FunctionMetadata & { name: 'quote_nullable' } =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'quote_nullable' &&
  item.args.length === 1 &&
  ((item.args[0] === 'pg_catalog.text' && item.volatility === 'i') ||
    (item.args[0] === 'pg_catalog.anyelement' && item.volatility === 's')) &&
  item.result === 'pg_catalog.text' &&
  !item.strict &&
  !item.returnsSet

export const isGenericLiteralQuote = (
  item: BuiltinCallable,
): item is FunctionMetadata & { name: 'quote_literal' } =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'quote_literal' &&
  item.args.length === 1 &&
  item.args[0] === 'pg_catalog.anyelement' &&
  item.result === 'pg_catalog.text' &&
  item.strict &&
  item.volatility === 's' &&
  !item.returnsSet
