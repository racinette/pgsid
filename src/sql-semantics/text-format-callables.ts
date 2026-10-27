import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import type { FunctionMetadata } from '../postgres/builtins/catalog.js'

export const isTextFormatCallable = (
  item: BuiltinCallable,
): item is FunctionMetadata & { name: 'format' } =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'format' &&
  ((item.args.join(',') === 'pg_catalog.text' && item.variadic === null) ||
    (item.args.join(',') === 'pg_catalog.text,pg_catalog."any"' &&
      item.variadic === 'pg_catalog."any"')) &&
  item.result === 'pg_catalog.text' &&
  !item.strict &&
  item.volatility === 's' &&
  !item.returnsSet
