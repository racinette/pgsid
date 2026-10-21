import { callableIdentity } from '../../postgres/builtins/catalog.js'
import { builtinTypeComparison, builtinCallables } from '../../postgres/builtins/inventory.js'
import type { BuiltinCallable } from '../../postgres/builtins/taxonomy.js'
import {
  rangeTypeProfile,
  multirangeTypeProfile,
  rangeNestedProfile,
  rangeSubtypeIsDomain,
  type RangeProfile,
} from '../../sql-semantics/range-profiles.js'
import { rangeArrayHashPlan, arrayElementComparison } from './check-array-types.js'
import { arrayElementBaseType } from '../../sql-semantics/expressions.js'

export function rangeHashSupport(
  profile: RangeProfile,
  extended: boolean,
): {
  available: boolean
  compatible: boolean
  safe: boolean
  context: ReturnType<typeof nativeHashContext>
} {
  let selected = extended ? profile.subtypeHashExtended : profile.subtypeHash
  let available = selected !== null
  let compatible = profile.subtypeHashEqualityCompatible === true
  let type: string = profile.elementType
  let domain = rangeSubtypeIsDomain(profile)
  const matches = () => {
    const support = arrayElementComparison(type)
    return selected !== null && selected === (extended ? support?.hashExtended : support?.hash)
  }
  let safe = matches()
  for (let node = rangeArrayHashPlan(profile); node; node = node.child) {
    const callback = selected
      ? builtinCallables().find((item) => callableIdentity(item) === selected)
      : null
    if (!callback || !isArrayHash(callback)) break
    selected = extended ? node.element.hashExtended : node.element.hash
    domain = node.element.kind === 'd'
    available &&= selected !== null
    compatible &&= node.element.hashEqualityCompatible
    type = arrayElementBaseType(type.slice(6))
    safe &&= matches()
  }
  const scalar = selected
    ? builtinCallables().find((item) => callableIdentity(item) === selected)
    : null
  if (domain && scalar && (isRangeHash(scalar) || isMultirangeHash(scalar))) available = false
  const childType =
    scalar && isRangeHash(scalar)
      ? rangeTypeProfile(type)
      : scalar && isMultirangeHash(scalar)
        ? multirangeTypeProfile(type)
        : null
  if (childType) {
    const child = rangeNestedProfile(profile, childType.identity) ?? childType
    const nested = rangeHashSupport(child, extended)
    const equality =
      scalar && isRangeHash(scalar)
        ? child.rangeHashEqualityCompatible
        : child.multirangeHashEqualityCompatible
    return {
      available: available && nested.available,
      compatible: compatible && nested.compatible && equality === true,
      safe: safe && available && compatible && nested.safe && equality === true,
      context: nested.context,
    }
  }
  return {
    available,
    compatible,
    safe: safe && available && compatible && scalar != null,
    context: scalar ? nativeHashContext(scalar) : null,
  }
}

export function nativeHashContext(item: BuiltinCallable): 'text' | 'bytes' | null {
  if (item.kind !== 'function' || item.schema !== 'pg_catalog') return null
  const type = item.args[0]
  if (
    !type ||
    ![
      'pg_catalog.text',
      'pg_catalog.bpchar',
      'pg_catalog.name',
      'pg_catalog.bytea',
      'pg_catalog.float4',
      'pg_catalog.float8',
      'pg_catalog.jsonb',
      'pg_catalog."numeric"',
      'pg_catalog.inet',
      'pg_catalog.macaddr',
      'pg_catalog.macaddr8',
      'pg_catalog.uuid',
      'pg_catalog.tid',
    ].includes(type)
  )
    return null
  const support = builtinTypeComparison(type),
    signature = callableIdentity(item)
  if (support?.hash !== signature && support?.hashExtended !== signature) return null
  return ['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog.name', 'pg_catalog.jsonb'].includes(
    type,
  )
    ? 'text'
    : 'bytes'
}

export function isArrayHash(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args[0] === 'pg_catalog.anyarray' &&
    ((item.name === 'hash_array' && item.args.length === 1 && item.result === 'pg_catalog.int4') ||
      (item.name === 'hash_array_extended' &&
        item.args.length === 2 &&
        item.args[1] === 'pg_catalog.int8' &&
        item.result === 'pg_catalog.int8'))
  )
}

export function isRangeHash(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args[0] === 'pg_catalog.anyrange' &&
    ((item.name === 'hash_range' && item.args.length === 1 && item.result === 'pg_catalog.int4') ||
      (item.name === 'hash_range_extended' &&
        item.args.length === 2 &&
        item.args[1] === 'pg_catalog.int8' &&
        item.result === 'pg_catalog.int8'))
  )
}

export function isMultirangeHash(item: BuiltinCallable): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args[0] === 'pg_catalog.anymultirange' &&
    ((item.name === 'hash_multirange' &&
      item.args.length === 1 &&
      item.result === 'pg_catalog.int4') ||
      (item.name === 'hash_multirange_extended' &&
        item.args.length === 2 &&
        item.args[1] === 'pg_catalog.int8' &&
        item.result === 'pg_catalog.int8'))
  )
}
