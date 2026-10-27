import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import type { FunctionMetadata } from '../postgres/builtins/catalog.js'

export const isJsonPopulateCallable = (
  item: BuiltinCallable,
): item is FunctionMetadata & {
  name: 'json_populate_record' | 'jsonb_populate_record' | 'jsonb_populate_record_valid'
} =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  !item.strict &&
  item.volatility === 's' &&
  !item.returnsSet &&
  item.variadic === null &&
  ((item.name === 'json_populate_record' &&
    item.args.join(',') === 'pg_catalog.anyelement,pg_catalog."json",pg_catalog.bool' &&
    item.result === 'pg_catalog.anyelement') ||
    (['jsonb_populate_record', 'jsonb_populate_record_valid'].includes(item.name) &&
      item.args.join(',') === 'pg_catalog.anyelement,pg_catalog.jsonb' &&
      item.result ===
        (item.name === 'jsonb_populate_record_valid'
          ? 'pg_catalog.bool'
          : 'pg_catalog.anyelement')))
