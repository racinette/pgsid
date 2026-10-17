import type { BuiltinCallable } from '../../postgres/builtins/taxonomy.js'

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
