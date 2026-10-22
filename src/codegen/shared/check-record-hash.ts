import { anonymousRecordProfile } from '../../sql-semantics/anonymous-records.js'
import {
  compositeProfile,
  compositeFieldType,
  compositePhysicalType,
  type CompositeProfile,
} from '../../sql-semantics/composite-profiles.js'
import { arrayElementBaseType } from '../../sql-semantics/expressions.js'
import { arrayElementComparison } from './check-array-types.js'
import { rangeTypeProfile, multirangeTypeProfile } from '../../sql-semantics/range-profiles.js'
import { builtinCallables } from '../../postgres/builtins/inventory.js'
import { callableIdentity } from '../../postgres/builtins/catalog.js'
import { isRangeHash, isMultirangeHash, rangeHashSupport } from './check-hash-context.js'

export interface RecordHashField {
  type: string | null
  signature: string | null
  availability: number
  collation: 'C' | 'deterministic' | 'other' | 'default'
}
export interface RecordHashLayout {
  identity: string
  fields: RecordHashField[]
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
  if (profile) {
    const support = profile.graph.definitions.find(
        (n) => n.identity === profile.identity,
      )?.comparison,
      available = extended ? support?.hashExtendedAvailable : support?.hashAvailable
    return {
      signature: selected(support, extended),
      availability:
        available === true ? 1 : knownMissing(profile, profile.identity, extended) ? 0 : -1,
    }
  }
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

export function recordHashLayouts(type: string, extended: boolean): RecordHashLayout[] | null {
  const anonymous = anonymousRecordProfile(type)
  if (anonymous)
    return anonymous.map((layout) => ({
      identity: layout.identity,
      fields: layout.fields.map((field) => {
        const support = recordFieldHashSupport(field.type, extended)
        return {
          type: field.type,
          signature: field.unknown ? null : support.signature,
          availability: field.unknown ? 0 : support.availability,
          collation: field.collation ?? 'default',
        }
      }),
    }))
  const profile = compositeProfile(type),
    definition = profile?.graph.definitions.find((n) => n.identity === profile.identity)
  if (!profile || !definition) return null
  return [
    {
      identity: profile.identity,
      fields: definition.fields.map((field) => {
        const support = profile.graph.definitions.find(
            (n) => n.identity === field.type,
          )?.comparison,
          availability = extended ? support?.hashExtendedAvailable : support?.hashAvailable
        return {
          type: compositeFieldType(profile, field.type),
          signature: selected(support, extended),
          availability:
            availability === true ? 1 : knownMissing(profile, field.type, extended) ? 0 : -1,
          collation: field.collationIsC
            ? 'C'
            : field.collationIsDefault
              ? 'default'
              : field.collationDeterministic
                ? 'deterministic'
                : 'other',
        }
      }),
    },
  ]
}
