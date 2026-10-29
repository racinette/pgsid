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

// Exponentials, logarithms, roots, powers and hyperbolic functions come from musl's Arm-derived routines, so only a
// PostgreSQL built against musl, as PGlite is, reproduces their exact bits.
const unaryMathLibrary = new Set([
  'exp',
  'dexp',
  'ln',
  'dlog1',
  'log',
  'log10',
  'dlog10',
  'cbrt',
  'dcbrt',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
])
const binaryMathLibrary = new Set(['pow', 'power', 'dpow'])

export function floatMathLibrary(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.result === 'pg_catalog.float8' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    ((unaryMathLibrary.has(item.name) && item.args.join(',') === 'pg_catalog.float8') ||
      (binaryMathLibrary.has(item.name) &&
        item.args.join(',') === 'pg_catalog.float8,pg_catalog.float8'))
  )
}
