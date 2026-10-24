import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'

export function isMoneyNumericConversion(item: BuiltinCallable): boolean {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 's' ||
    item.returnsSet ||
    item.args.length !== 1
  )
    return false
  return (
    (item.name === 'money' &&
      item.result === 'pg_catalog.money' &&
      ['pg_catalog.int4', 'pg_catalog.int8', 'pg_catalog."numeric"'].includes(item.args[0]!)) ||
    (item.name === 'numeric' &&
      item.result === 'pg_catalog."numeric"' &&
      item.args[0] === 'pg_catalog.money')
  )
}
