import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import { builtinCast } from '../postgres/builtins/inventory.js'
import { callableIdentity } from '../postgres/builtins/catalog.js'

export function isTemporalContextCast(item: BuiltinCallable): boolean {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 's' ||
    item.returnsSet ||
    item.args.length !== 1
  )
    return false
  const source = item.args[0]!,
    target = item.result
  const temporal =
    (source === 'pg_catalog.timestamptz' &&
      [
        'pg_catalog.date',
        'pg_catalog."timestamp"',
        'pg_catalog."time"',
        'pg_catalog.timetz',
      ].includes(target)) ||
    (target === 'pg_catalog.timestamptz' &&
      ['pg_catalog.date', 'pg_catalog."timestamp"'].includes(source)) ||
    (source === 'pg_catalog."time"' && target === 'pg_catalog.timetz')
  return temporal && builtinCast(source, target)?.implementation === callableIdentity(item)
}

export function isTemporalContextArithmetic(item: BuiltinCallable): boolean {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 's' ||
    item.returnsSet ||
    item.result !== 'pg_catalog.timestamptz' ||
    item.args.length !== 2
  )
    return false
  return item.name === 'interval_pl_timestamptz'
    ? item.args[0] === 'pg_catalog."interval"' && item.args[1] === 'pg_catalog.timestamptz'
    : ['timestamptz_pl_interval', 'timestamptz_mi_interval', 'date_add', 'date_subtract'].includes(
        item.name,
      ) &&
        item.args[0] === 'pg_catalog.timestamptz' &&
        item.args[1] === 'pg_catalog."interval"'
}
