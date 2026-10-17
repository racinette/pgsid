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
  return ['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog.name'].includes(type)
    ? 'text'
    : 'bytes'
}
