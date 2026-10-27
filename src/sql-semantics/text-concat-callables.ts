import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import type { FunctionMetadata } from '../postgres/builtins/catalog.js'

export const isTextConcatCallable = (
  item: BuiltinCallable,
): item is FunctionMetadata & { name: 'concat' | 'concat_ws' } =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  ['concat', 'concat_ws'].includes(item.name) &&
  item.args.join(',') ===
    (item.name === 'concat' ? 'pg_catalog."any"' : 'pg_catalog.text,pg_catalog."any"') &&
  item.variadic === 'pg_catalog."any"' &&
  item.result === 'pg_catalog.text' &&
  !item.strict &&
  item.volatility === 's' &&
  !item.returnsSet
