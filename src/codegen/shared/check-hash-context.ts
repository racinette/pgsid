import { callableIdentity } from '../../postgres/builtins/catalog.js'
import { builtinTypeComparison } from '../../postgres/builtins/inventory.js'
import type { BuiltinCallable } from '../../postgres/builtins/taxonomy.js'

export function nativeHashContext(item: BuiltinCallable): 'text' | 'bytes' | null {
  if (item.kind !== 'function' || item.schema !== 'pg_catalog') return null
  const type = item.args[0]
  if (
    !type ||
    ![
      'pg_catalog.text',
      'pg_catalog.bpchar',
      'pg_catalog.name',
      'pg_catalog.bytea',
      'pg_catalog.float4',
      'pg_catalog.float8',
      'pg_catalog.jsonb',
      'pg_catalog."numeric"',
      'pg_catalog.inet',
      'pg_catalog.macaddr',
      'pg_catalog.macaddr8',
      'pg_catalog.uuid',
      'pg_catalog.tid',
    ].includes(type)
  )
    return null
  const support = builtinTypeComparison(type),
    signature = callableIdentity(item)
  if (support?.hash !== signature && support?.hashExtended !== signature) return null
  return ['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog.name', 'pg_catalog.jsonb'].includes(
    type,
  )
    ? 'text'
    : 'bytes'
}

export function isArrayHash(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args[0] === 'pg_catalog.anyarray' &&
    ((item.name === 'hash_array' && item.args.length === 1 && item.result === 'pg_catalog.int4') ||
      (item.name === 'hash_array_extended' &&
        item.args.length === 2 &&
        item.args[1] === 'pg_catalog.int8' &&
        item.result === 'pg_catalog.int8'))
  )
}

export function isRangeHash(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args[0] === 'pg_catalog.anyrange' &&
    ((item.name === 'hash_range' && item.args.length === 1 && item.result === 'pg_catalog.int4') ||
      (item.name === 'hash_range_extended' &&
        item.args.length === 2 &&
        item.args[1] === 'pg_catalog.int8' &&
        item.result === 'pg_catalog.int8'))
  )
}
