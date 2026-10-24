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

export function isXmlValidationCallable(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'xmlvalidate' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.join(',') === 'pg_catalog.xml,pg_catalog.text' &&
    item.result === 'pg_catalog.bool'
  )
}

export function isXmlPreparationCallable(item: BuiltinCallable): boolean {
  return isXmlXPathCallable(item) || isXmlValidationCallable(item)
}

export function isXmlOptionPredicate(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'xml_is_well_formed' &&
    item.args.join(',') === 'pg_catalog.text' &&
    item.result === 'pg_catalog.bool' &&
    item.strict &&
    item.volatility === 's' &&
    !item.returnsSet
  )
}
