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

export function isTemporalExplicitZoneArithmetic(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    ['date_add', 'date_subtract'].includes(item.name) &&
    item.result === 'pg_catalog.timestamptz' &&
    item.args.length === 3 &&
    item.args[0] === 'pg_catalog.timestamptz' &&
    item.args[1] === 'pg_catalog."interval"' &&
    item.args[2] === 'pg_catalog.text'
  )
}

export function isTemporalClockZoneLookup(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 's' &&
    !item.returnsSet &&
    item.name === 'timezone' &&
    item.args.length === 2 &&
    item.args[0] === 'pg_catalog.text' &&
    item.args[1] === 'pg_catalog.timetz' &&
    item.result === 'pg_catalog.timetz'
  )
}

export function isTemporalExplicitZoneLookup(item: BuiltinCallable): boolean {
  if (
    isTemporalClockZoneLookup(item) ||
    (isTemporalInstantConstructor(item) && item.args.length === 7)
  )
    return true
  return (
    isTemporalExplicitZoneArithmetic(item) ||
    (item.kind === 'function' &&
      item.schema === 'pg_catalog' &&
      item.strict &&
      item.volatility === 'i' &&
      !item.returnsSet &&
      item.name === 'timezone' &&
      item.args.length === 2 &&
      item.args[0] === 'pg_catalog.text' &&
      ((item.args[1] === 'pg_catalog."timestamp"' && item.result === 'pg_catalog.timestamptz') ||
        (item.args[1] === 'pg_catalog.timestamptz' && item.result === 'pg_catalog."timestamp"'))) ||
    (item.kind === 'function' &&
      item.schema === 'pg_catalog' &&
      item.strict &&
      item.volatility === 'i' &&
      !item.returnsSet &&
      item.name === 'date_trunc' &&
      item.result === 'pg_catalog.timestamptz' &&
      item.args.length === 3 &&
      item.args[0] === 'pg_catalog.text' &&
      item.args[1] === 'pg_catalog.timestamptz' &&
      item.args[2] === 'pg_catalog.text')
  )
}

export function isTemporalSessionTruncation(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 's' &&
    !item.returnsSet &&
    item.name === 'date_trunc' &&
    item.args.length === 2 &&
    item.args[0] === 'pg_catalog.text' &&
    item.args[1] === 'pg_catalog.timestamptz' &&
    item.result === 'pg_catalog.timestamptz'
  )
}

export function isTemporalSessionExtraction(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 's' &&
    !item.returnsSet &&
    item.args.length === 2 &&
    item.args[0] === 'pg_catalog.text' &&
    item.args[1] === 'pg_catalog.timestamptz' &&
    ((item.name === 'extract' && item.result === 'pg_catalog."numeric"') ||
      (item.name === 'date_part' && item.result === 'pg_catalog.float8'))
  )
}

export function isTemporalContextComparison(item: BuiltinCallable): boolean {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 's' ||
    item.returnsSet ||
    item.args.length !== 2
  )
    return false
  const [left, right] = item.args
  if (!(
    (left === 'pg_catalog.timestamptz' &&
      ['pg_catalog.date', 'pg_catalog."timestamp"'].includes(right!)) ||
    (right === 'pg_catalog.timestamptz' &&
      ['pg_catalog.date', 'pg_catalog."timestamp"'].includes(left!))
  ))
    return false
  const name = (type: string) => type.slice('pg_catalog.'.length).replaceAll('"', '')
  return (
    (item.result === 'pg_catalog.int4' && item.name === `${name(left!)}_cmp_${name(right!)}`) ||
    (item.result === 'pg_catalog.bool' &&
      ['eq', 'ne', 'lt', 'le', 'gt', 'ge'].some(
        (op) => item.name === `${name(left!)}_${op}_${name(right!)}`,
      ))
  )
}

export function isTemporalLocalTimezone(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'timezone' &&
    item.strict &&
    item.volatility === 's' &&
    !item.returnsSet &&
    item.args.length === 1 &&
    ((item.args[0] === 'pg_catalog."timestamp"' && item.result === 'pg_catalog.timestamptz') ||
      (item.args[0] === 'pg_catalog.timestamptz' && item.result === 'pg_catalog."timestamp"') ||
      (item.args[0] === 'pg_catalog.timetz' && item.result === 'pg_catalog.timetz'))
  )
}

export function isTemporalInstantConstructor(item: BuiltinCallable): boolean {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 's' ||
    item.returnsSet ||
    item.result !== 'pg_catalog.timestamptz'
  )
    return false
  if (item.name === 'timestamptz')
    return (
      item.args.length === 2 &&
      item.args[0] === 'pg_catalog.date' &&
      item.args[1] === 'pg_catalog."time"'
    )
  return (
    item.name === 'make_timestamptz' &&
    [6, 7].includes(item.args.length) &&
    item.args.slice(0, 5).every((type) => type === 'pg_catalog.int4') &&
    item.args[5] === 'pg_catalog.float8' &&
    (item.args.length === 6 || item.args[6] === 'pg_catalog.text')
  )
}

export function isTemporalInstantPeriod(item: BuiltinCallable): boolean {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    item.volatility !== 's' ||
    item.returnsSet ||
    item.result !== 'pg_catalog.bool'
  )
    return false
  if (item.name === 'in_range')
    return (
      item.strict &&
      item.args.length === 5 &&
      item.args[0] === 'pg_catalog.timestamptz' &&
      item.args[1] === 'pg_catalog.timestamptz' &&
      item.args[2] === 'pg_catalog."interval"' &&
      item.args[3] === 'pg_catalog.bool' &&
      item.args[4] === 'pg_catalog.bool'
    )
  return (
    item.name === 'overlaps' &&
    !item.strict &&
    item.args.length === 4 &&
    item.args[0] === 'pg_catalog.timestamptz' &&
    item.args[2] === 'pg_catalog.timestamptz' &&
    ['pg_catalog.timestamptz', 'pg_catalog."interval"'].includes(item.args[1]!) &&
    ['pg_catalog.timestamptz', 'pg_catalog."interval"'].includes(item.args[3]!) &&
    (item.args[1] === 'pg_catalog."interval"' || item.args[3] === 'pg_catalog."interval"')
  )
}

export function isTemporalIntervalFormatting(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'to_char' &&
    item.volatility === 's' &&
    item.strict &&
    !item.returnsSet &&
    item.result === 'pg_catalog.text' &&
    item.args.join(',') === 'pg_catalog."interval",pg_catalog.text'
  )
}

export function isTemporalTimestampFormatting(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'to_char' &&
    item.volatility === 's' &&
    item.strict &&
    !item.returnsSet &&
    item.result === 'pg_catalog.text' &&
    item.args.length === 2 &&
    item.args[1] === 'pg_catalog.text' &&
    ['pg_catalog."timestamp"', 'pg_catalog.timestamptz'].includes(item.args[0]!)
  )
}

export function isTemporalTemplateParsing(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.volatility === 's' &&
    item.strict &&
    !item.returnsSet &&
    item.args.join(',') === 'pg_catalog.text,pg_catalog.text' &&
    ((item.name === 'to_date' && item.result === 'pg_catalog.date') ||
      (item.name === 'to_timestamp' && item.result === 'pg_catalog.timestamptz'))
  )
}

export function isTemporalInstantAge(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'age' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.join(',') === 'pg_catalog.timestamptz,pg_catalog.timestamptz' &&
    item.result === 'pg_catalog."interval"'
  )
}

export function isTemporalDatePart(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'date_part' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.join(',') === 'pg_catalog.text,pg_catalog.date' &&
    item.result === 'pg_catalog.float8'
  )
}
