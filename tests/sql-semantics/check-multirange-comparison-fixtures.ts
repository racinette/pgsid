import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'

const argumentTypes = ['pg_catalog.anymultirange', 'pg_catalog.anyrange', 'pg_catalog.anyelement']
export const multirangeComparisonCallables = builtinCallables().filter(
  (c): c is FunctionMetadata =>
    c.kind === 'function' &&
    c.args.length === 2 &&
    c.args.includes('pg_catalog.anymultirange') &&
    c.args.every((t) => argumentTypes.includes(t)) &&
    ['pg_catalog.bool', 'pg_catalog.int4'].includes(c.result),
)
