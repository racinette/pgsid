import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'

export const isLegacySimilarCallable = (item: BuiltinCallable): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'similar_escape' &&
  item.args.join(',') === 'pg_catalog.text,pg_catalog.text' &&
  item.result === 'pg_catalog.text' &&
  !item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet
