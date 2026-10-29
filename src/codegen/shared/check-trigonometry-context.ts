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

// sin, cos and their degree variants come from the deployment's libm, which only the declared
// fdlibm profile pins down.
export function floatTrigonometry(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    ['sin', 'cos', 'sind', 'cosd'].includes(item.name) &&
    item.result === 'pg_catalog.float8' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.join(',') === 'pg_catalog.float8'
  )
}

export function trigonometryContext(item: BuiltinCallable): boolean {
  return circlePolygonTrigonometry(item) || floatTrigonometry(item)
}
