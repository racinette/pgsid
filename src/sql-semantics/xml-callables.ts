import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'

export function isXmlXPathCallable(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args[0] === 'pg_catalog.text' &&
    item.args[1] === 'pg_catalog.xml' &&
    ((item.name === 'xmlexists' && item.args.length === 2 && item.result === 'pg_catalog.bool') ||
      (['xpath', 'xpath_exists'].includes(item.name) &&
        (item.args.length === 2 ||
          (item.args.length === 3 && item.args[2] === 'pg_catalog._text')) &&
        item.result === (item.name === 'xpath' ? 'pg_catalog._xml' : 'pg_catalog.bool')))
  )
}
