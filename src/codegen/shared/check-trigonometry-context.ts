import type { BuiltinCallable } from '../../postgres/builtins/taxonomy.js'

export function circlePolygonTrigonometry(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'polygon' &&
    item.result === 'pg_catalog.polygon' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    ['pg_catalog.circle', 'pg_catalog.int4,pg_catalog.circle'].includes(item.args.join(','))
  )
}
