import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import type { FunctionMetadata } from '../postgres/builtins/catalog.js'

export const isIntegerSumCallable = (
  item: BuiltinCallable,
): item is FunctionMetadata & { name: 'int2_sum' | 'int4_sum' | 'int8_sum' } =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  !item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.variadic === null &&
  ((item.name === 'int2_sum' &&
    item.args.join(',') === 'pg_catalog.int8,pg_catalog.int2' &&
    item.result === 'pg_catalog.int8') ||
    (item.name === 'int4_sum' &&
      item.args.join(',') === 'pg_catalog.int8,pg_catalog.int4' &&
      item.result === 'pg_catalog.int8') ||
    (item.name === 'int8_sum' &&
      item.args.join(',') === 'pg_catalog."numeric",pg_catalog.int8' &&
      item.result === 'pg_catalog."numeric"'))
