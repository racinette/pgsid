import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'

export function isIdentifierQuote(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'quote_ident' &&
    item.args.join(',') === 'pg_catalog.text' &&
    item.result === 'pg_catalog.text' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet
  )
}
