import type { BuiltinCallable } from '../../postgres/builtins/taxonomy.js'

export function jsonScalarExtractionContext(item: BuiltinCallable): boolean {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 'i' ||
    item.returnsSet ||
    item.args.length !== 2 ||
    item.args[0] !== 'pg_catalog."json"'
  )
    return false
  const field = ['json_object_field', 'json_object_field_text'].includes(item.name),
    element = ['json_array_element', 'json_array_element_text'].includes(item.name)
  return (
    (field || element) &&
    item.args[1] === (field ? 'pg_catalog.text' : 'pg_catalog.int4') &&
    item.result === (item.name.endsWith('_text') ? 'pg_catalog.text' : 'pg_catalog."json"')
  )
}

export function jsonbTextRenderingContext(item: BuiltinCallable): boolean {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 'i' ||
    item.returnsSet ||
    item.args[0] !== 'pg_catalog.jsonb' ||
    item.result !== 'pg_catalog.text'
  )
    return false
  if (item.name === 'jsonb_pretty') return item.args.length === 1
  if (item.args.length !== 2) return false
  return (
    (item.name === 'jsonb_object_field_text' && item.args[1] === 'pg_catalog.text') ||
    (item.name === 'jsonb_array_element_text' && item.args[1] === 'pg_catalog.int4') ||
    (item.name === 'jsonb_extract_path_text' && item.args[1] === 'pg_catalog._text')
  )
}
