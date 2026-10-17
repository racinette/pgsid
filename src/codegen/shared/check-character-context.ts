import type { BuiltinCallable } from '../../postgres/builtins/taxonomy.js'

export function characterEncodingContext(item: BuiltinCallable): 'ascii' | 'chr' | null {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 'i' ||
    item.returnsSet ||
    item.args.length !== 1
  )
    return null
  if (
    item.name === 'ascii' &&
    item.args[0] === 'pg_catalog.text' &&
    item.result === 'pg_catalog.int4'
  )
    return 'ascii'
  if (
    item.name === 'chr' &&
    item.args[0] === 'pg_catalog.int4' &&
    item.result === 'pg_catalog.text'
  )
    return 'chr'
  return null
}
