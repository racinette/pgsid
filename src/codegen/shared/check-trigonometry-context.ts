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

// Trigonometric float8 results come from the deployment's libm, which only the declared fdlibm
// profile pins down.
const unaryTrigonometry = new Set([
  'sin',
  'cos',
  'tan',
  'cot',
  'sind',
  'cosd',
  'tand',
  'cotd',
  'asin',
  'acos',
  'atan',
  'asind',
  'acosd',
  'atand',
])
const binaryTrigonometry = new Set(['atan2', 'atan2d'])

export function floatTrigonometry(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.result === 'pg_catalog.float8' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    ((unaryTrigonometry.has(item.name) && item.args.join(',') === 'pg_catalog.float8') ||
      (binaryTrigonometry.has(item.name) &&
        item.args.join(',') === 'pg_catalog.float8,pg_catalog.float8'))
  )
}

export function trigonometryContext(item: BuiltinCallable): boolean {
  return circlePolygonTrigonometry(item) || floatTrigonometry(item)
}
