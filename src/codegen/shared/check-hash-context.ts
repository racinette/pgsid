import { callableIdentity } from '../../postgres/builtins/catalog.js'
import {
  compositeProfile,
  compositeFieldType,
  compositePhysicalType,
  type CompositeProfile,
} from '../../sql-semantics/composite-profiles.js'
import { anonymousRecordProfile } from '../../sql-semantics/anonymous-records.js'
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
import { arrayElementBaseType, arrayLikeElementType } from '../../sql-semantics/expressions.js'

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
    type = arrayElementBaseType(arrayLikeElementType(type)!)
    safe &&= matches()
  }
  const scalar = selected
    ? builtinCallables().find((item) => callableIdentity(item) === selected)
    : null
  if (domain && scalar && (isRangeHash(scalar) || isMultirangeHash(scalar))) available = false
  if (compositeProfile(type)) {
    const record = recordFieldHashSupport(type, extended)
    if (selected === record.signature && record.availability === 0) available = false
  }
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
    safe: safe && available && compatible && scalar != null && compositeProfile(type) === null,
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

export function recordFieldHashSupport(
  type: string,
  extended: boolean,
): {
  signature: string | null
  availability: number
} {
  const base = arrayElementBaseType(type),
    profile = compositeProfile(base)
  if (profile) return recordPhysicalHashSupport(profile, profile.identity, extended)
  if (anonymousRecordProfile(base))
    return {
      signature: `function:["pg_catalog","${extended ? 'hash_record_extended' : 'hash_record'}"](pg_catalog.record${extended ? ',pg_catalog.int8' : ''})`,
      availability: 0,
    }
  const signature = selected(arrayElementComparison(base) ?? undefined, extended)
  const range = rangeTypeProfile(base),
    multi = multirangeTypeProfile(base),
    span = range ?? multi
  if (span) {
    const ownSignature = range
      ? extended
        ? span.rangeHashExtended
        : span.rangeHash
      : extended
        ? span.multirangeHashExtended
        : span.multirangeHash
    if (ownSignature === null) return { signature: null, availability: 0 }
    const own = range ? span.rangeHashEqualityCompatible : span.multirangeHashEqualityCompatible
    if (own !== true) return { signature, availability: own === false ? 0 : -1 }
    const callback = signature
      ? builtinCallables().find((item) => callableIdentity(item) === signature)
      : null
    if (!signature || (callback && (isRangeHash(callback) || isMultirangeHash(callback)))) {
      const flags = [
        span.subtypeHashEqualityCompatible,
        ...(multi ? [span.rangeHashEqualityCompatible] : []),
      ]
      if (flags.some((flag) => flag === false)) return { signature, availability: 0 }
      const support = rangeHashSupport(span, extended)
      return {
        signature,
        availability:
          flags.some((flag) => flag !== true) || !support.compatible
            ? -1
            : support.available
              ? 1
              : 0,
      }
    }
  }
  if (base.startsWith('array:'))
    return { signature, availability: recordFieldHashSupport(base.slice(6), extended).availability }
  return { signature, availability: signature ? 1 : base.startsWith('pg_catalog.') ? 0 : -1 }
}

const selected = (
  support: { hash?: string | null; hashExtended?: string | null } | undefined,
  extended: boolean,
) => (extended ? support?.hashExtended : support?.hash) ?? null

export function recordPhysicalHashSupport(
  profile: CompositeProfile,
  identity: string,
  extended: boolean,
) {
  const support = profile.graph.definitions.find((node) => node.identity === identity)?.comparison,
    available = extended ? support?.hashExtendedAvailable : support?.hashAvailable
  return {
    signature: selected(support, extended),
    availability: available === true ? 1 : knownMissing(profile, identity, extended) ? 0 : -1,
  }
}

function knownMissing(
  profile: CompositeProfile,
  identity: string,
  extended: boolean,
  visiting = new Set<string>(),
): boolean {
  if (visiting.has(identity)) return false
  const node = profile.graph.definitions.find((n) => n.identity === identity),
    support = node?.comparison
  if (!node || !support) return false
  const availability = extended ? support.hashExtendedAvailable : support.hashAvailable,
    signature = selected(support, extended)
  if (availability !== false) return false
  if (signature === null) return true
  const next = new Set(visiting).add(identity),
    physical = compositePhysicalType(profile, identity)
  if (physical?.kind === 'r' || physical?.kind === 'm') {
    const type = compositeFieldType(profile, identity)
    return type !== null && recordFieldHashSupport(type, extended).availability === 0
  }
  if (
    signature ===
    `function:["pg_catalog","${extended ? 'hash_record_extended' : 'hash_record'}"](pg_catalog.record${extended ? ',pg_catalog.int8' : ''})`
  )
    return (
      physical?.fields.some((field) => knownMissing(profile, field.type, extended, next)) === true
    )
  if (
    signature ===
    `function:["pg_catalog","${extended ? 'hash_array_extended' : 'hash_array'}"](pg_catalog.anyarray${extended ? ',pg_catalog.int8' : ''})`
  )
    return !!physical?.element && knownMissing(profile, physical.element, extended, next)
  return false
}
