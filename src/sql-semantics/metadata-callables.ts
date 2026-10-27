import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import type { FunctionMetadata } from '../postgres/builtins/catalog.js'

const metadataShape = (item: BuiltinCallable): item is FunctionMetadata =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  !item.strict &&
  item.volatility === 's' &&
  !item.returnsSet &&
  item.variadic === null &&
  item.result === 'pg_catalog.text'

export const isTypeFormatCallable = (
  item: BuiltinCallable,
): item is FunctionMetadata & { name: 'format_type' } =>
  metadataShape(item) &&
  item.name === 'format_type' &&
  item.args.join(',') === 'pg_catalog.oid,pg_catalog.int4'

export const isCollationMetadataCallable = (
  item: BuiltinCallable,
): item is FunctionMetadata & { name: 'pg_collation_for' } =>
  metadataShape(item) &&
  item.name === 'pg_collation_for' &&
  item.args.join(',') === 'pg_catalog."any"'
