import { builtinTypeComparison } from '../../postgres/builtins/inventory.js'
import { anonymousRecordProfile } from '../../sql-semantics/anonymous-records.js'
import {
  compositeProfile,
  compositeFieldType,
  compositePhysicalType,
} from '../../sql-semantics/composite-profiles.js'
import type { RangeSubtypeDefinition } from '../../catalog/types.js'
import {
  isRangeType,
  isMultirangeType,
  isArrayLikeType,
  arrayLikeElementType,
  isCatalogVectorType,
} from '../../sql-semantics/expressions.js'
import { arrayElementBaseType, domainElementDefinition } from '../../sql-semantics/expressions.js'
import {
  rangeTypeProfile,
  multirangeTypeProfile,
  rangeProfileSupport,
  rangeContainerKind,
  rangeNestedProfile,
  type RangeProfile,
  type RangeSubtype,
} from '../../sql-semantics/range-profiles.js'

const capturedArrayLeaf = (type: string): boolean => {
  type = arrayElementBaseType(type)
  while (type.startsWith('array:')) type = arrayElementBaseType(type.slice(6))
  return (
    compositeProfile(type) !== null ||
    rangeTypeProfile(type)?.captured === true ||
    multirangeTypeProfile(type)?.captured === true
  )
}

export function arrayElementIdentity(type: string): string {
  if (anonymousRecordProfile(type)) return 'pg_catalog.record'
  const composite = compositeProfile(type)
  if (composite) return composite.identity
  const domain = domainElementDefinition(type)
  if (domain && capturedArrayLeaf(domain.base))
    return [domain.schema, domain.name].map((n) => '"' + n.replaceAll('"', '""') + '"').join('.')
  const span = rangeTypeProfile(type),
    multi = multirangeTypeProfile(type)
  return span?.captured ? span.identity : multi?.captured ? multi.multirange : type
}

export function arrayElementFamily(type: string): number | null {
  type = arrayElementBaseType(type)
  if (isArrayLikeType(type)) return 41
  if (compositeProfile(type) || anonymousRecordProfile(type)) return 44
  if (type.startsWith('enum:')) return 6
  if (rangeTypeProfile(type)) return 42
  if (multirangeTypeProfile(type)) return 43
  const families: Readonly<Record<string, number>> = {
    'pg_catalog.int2': 1,
    'pg_catalog.int4': 2,
    'pg_catalog.int8': 3,
    'pg_catalog."timestamp"': 4,
    'pg_catalog.timestamptz': 5,
    'pg_catalog.date': 7,
    'pg_catalog.text': 8,
    'pg_catalog."varchar"': 8,
    'pg_catalog.bpchar': 8,
    'pg_catalog.name': 8,
    'pg_catalog.refcursor': 8,
    'pg_catalog.bool': 9,
    'pg_catalog."numeric"': 10,
    'pg_catalog."json"': 11,
    'pg_catalog.jsonb': 12,
    'pg_catalog.inet': 13,
    'pg_catalog.cidr': 13,
    'pg_catalog."bit"': 14,
    'pg_catalog.varbit': 14,
    'pg_catalog.bytea': 15,
    'pg_catalog.macaddr': 16,
    'pg_catalog.macaddr8': 17,
    'pg_catalog.uuid': 18,
    'pg_catalog.float4': 19,
    'pg_catalog.float8': 20,
    'pg_catalog."time"': 21,
    'pg_catalog.timetz': 22,
    'pg_catalog."interval"': 23,
    'pg_catalog.point': 24,
    'pg_catalog.line': 25,
    'pg_catalog.lseg': 26,
    'pg_catalog.box': 27,
    'pg_catalog.path': 28,
    'pg_catalog.polygon': 29,
    'pg_catalog.circle': 30,
    'pg_catalog.money': 31,
    'pg_catalog."char"': 32,
    'pg_catalog.oid': 33,
    'pg_catalog.regclass': 33,
    'pg_catalog.regcollation': 33,
    'pg_catalog.regconfig': 33,
    'pg_catalog.regdictionary': 33,
    'pg_catalog.regnamespace': 33,
    'pg_catalog.regoper': 33,
    'pg_catalog.regoperator': 33,
    'pg_catalog.regproc': 33,
    'pg_catalog.regprocedure': 33,
    'pg_catalog.regrole': 33,
    'pg_catalog.regtype': 33,
    'pg_catalog.xid': 34,
    'pg_catalog.cid': 35,
    'pg_catalog.pg_snapshot': 36,
    'pg_catalog.txid_snapshot': 36,
    'pg_catalog.xid8': 37,
    'pg_catalog.pg_lsn': 38,
    'pg_catalog.tid': 39,
    'pg_catalog.jsonpath': 40,
    'pg_catalog.xml': 45,
    'pg_catalog.aclitem': 46,
    'pg_catalog.tsvector': 47,
  }
  return families[type] ?? null
}

export interface RangeBoundProfilePlan {
  typeName: string
  kind: number
  comparison: number
  canonical: number
  missingComparison: boolean
  elementType: string
  child: number
  enumLabels: string
  enumCount: number
  fields?: { typeName: string; child: number; comparisonAvailable: boolean }[]
}

export interface RangeArrayHashPlan {
  element: RangeSubtypeDefinition
  child: RangeArrayHashPlan | null
  range?: RangeProfile | null
}

export function rangeArrayHashPlan(profile: RangeProfile): RangeArrayHashPlan | null {
  if (!isArrayLikeType(profile.elementType) || !profile.subtypeDefinitions) return null
  const definitions = new Map(profile.subtypeDefinitions.map((node) => [node.identity, node]))
  const build = (identity: string): RangeArrayHashPlan | null => {
    let node = definitions.get(identity)!
    while (node.kind === 'd') node = definitions.get(node.base!)!
    if (node.element === null) return null
    const element = definitions.get(node.element)!
    let physical = element
    while (physical.kind === 'd') physical = definitions.get(physical.base!)!
    const range =
      physical.kind === 'r' || physical.kind === 'm'
        ? rangeNestedProfile(profile, physical.kind === 'r' ? physical.identity : physical.member!)
        : null
    return { element, child: build(element.identity), range }
  }
  return build(profile.subtype)
}

export function rangeBoundProfiles(
  profile: RangeProfile,
  context: { defaultCollation?: 'C'; serverEncoding?: 'UTF8' } = {},
): RangeBoundProfilePlan[] | null {
  if (!rangeContainerKind(profile.elementType)) return []
  if (!profile.subtypeDefinitions) return null
  const definitions = new Map(profile.subtypeDefinitions.map((node) => [node.identity, node]))
  const composite = profile.subtypeCompositeGraph
  for (const node of composite?.definitions ?? []) {
    if (!definitions.has(node.identity))
      definitions.set(node.identity, {
        identity: node.identity,
        schema: node.schema,
        name: node.name,
        kind: node.kind,
        base: node.base,
        element: node.element,
        subtype: node.subtype,
        member: node.member,
        enumValues: node.enumLabels,
        input: node.input,
        output: node.output,
        send: node.send,
        equality: node.comparison?.equality ?? null,
        comparator: node.comparison?.comparator ?? null,
        hash: null,
        hashExtended: null,
        hashEqualityCompatible: false,
      })
  }
  const visiting = new Set<string>()
  const result: RangeBoundProfilePlan[] = []
  const append = (
    identity: string,
    type: string,
    owner: RangeProfile,
    override?: { comparison: number; missing: boolean },
  ): boolean => {
    const selected = definitions.get(identity)
    if (!selected) return false
    let node = selected
    const seen = new Set<string>()
    while (node.kind === 'd') {
      if (seen.has(node.identity) || !node.base || !definitions.has(node.base)) return false
      seen.add(node.identity)
      node = definitions.get(node.base)!
    }
    const base = arrayElementBaseType(type),
      kind = arrayElementFamily(base) ?? 0
    if (visiting.has(node.identity)) return false
    visiting.add(node.identity)
    const support = rangeProfileSupport(
      {
        ...owner,
        elementType: base as RangeSubtype,
        subtype: node.identity,
        subtypeEnum:
          node.kind === 'e'
            ? { schema: node.schema, name: node.name, values: node.enumValues! }
            : undefined,
        comparator: selected.comparator,
        canonical: null,
      },
      context,
    )
    const index = result.length
    const nested =
      kind === 42 || kind === 43
        ? ((kind === 42 ? rangeTypeProfile(base) : multirangeTypeProfile(base)) ??
          rangeNestedProfile(profile, kind === 42 ? node.identity : node.member!))
        : null
    if ((kind === 42 || kind === 43) && !nested) return false
    const nestedSupport = nested ? rangeProfileSupport(nested, context) : null
    const labels =
      node.kind === 'e'
        ? owner.subtypeEnum?.schema === node.schema && owner.subtypeEnum.name === node.name
          ? owner.subtypeEnum.values
          : node.enumValues!
        : null
    result.push({
      typeName: node.identity,
      kind,
      comparison:
        index === 0
          ? isCatalogVectorType(base)
            ? rangeProfileSupport(owner, context).comparison
            : kind
          : (override?.comparison ?? support.comparison),
      canonical: kind === 42 ? nestedSupport!.canonical : 1,
      missingComparison:
        index !== 0 &&
        (override?.missing ??
          (composite?.definitions.find((n) => n.identity === selected.identity)?.comparison
            ?.comparisonAvailable === false ||
            selected.comparator === null)),
      elementType:
        kind === 41
          ? arrayElementIdentity(arrayLikeElementType(base)!)
          : kind === 42
            ? nested!.subtype
            : kind === 43
              ? nested!.identity
              : '',
      child: kind >= 41 && kind <= 43 ? index + 1 : 0,
      enumLabels: labels?.join('\0') ?? '',
      enumCount: labels?.length ?? -1,
    })
    if (kind === 44) {
      const p = compositeProfile(base)
      const record = p ? compositePhysicalType(p, node.identity) : null
      if (!p || record?.kind !== 'c') return false
      const fields: NonNullable<RangeBoundProfilePlan['fields']> = []
      result[index]!.fields = fields
      for (const field of record.fields) {
        const logical = compositeFieldType(p, field.type, true)
        const definition = p.graph.definitions.find((n) => n.identity === field.type)
        if (!definition?.comparison) return false
        const child = result.length
        fields.push({
          typeName: field.type,
          child,
          comparisonAvailable: definition.comparison.comparisonAvailable,
        })
        const fieldOwner = {
          ...owner,
          collation: field.collation,
          collationIsC: field.collationIsC,
          collationIsDefault: field.collationIsDefault,
          collationDeterministic: field.collationDeterministic,
        }
        if (!append(field.type, logical ?? field.type, fieldOwner)) return false
      }
      visiting.delete(node.identity)
      return true
    }
    visiting.delete(node.identity)
    if (kind === 41)
      return node.element !== null && append(node.element, arrayLikeElementType(base)!, owner)
    if (kind === 42)
      return append(nested!.subtype, nested!.elementType, nested!, {
        comparison: nestedSupport!.comparison,
        missing: nested!.comparator === null,
      })
    if (kind === 43) return append(nested!.identity, nested!.rangeType, owner)
    return true
  }
  return append(profile.subtype, profile.elementType, profile) ? result : null
}

export function arrayElementDelimiter(type: string): ',' | ';' {
  type = arrayElementBaseType(type)
  while (type.startsWith('array:')) type = arrayElementBaseType(type.slice(6))
  return type === 'pg_catalog.box' ? ';' : ','
}

export function arrayIdentityPlan(type: string): { types: string; kinds: string } | null {
  const types: string[] = [],
    kinds: number[] = []
  while (isArrayLikeType(type)) {
    const element = arrayLikeElementType(type)!,
      family = arrayElementFamily(element)
    if (family === null) return null
    types.push(arrayElementIdentity(element))
    kinds.push(family)
    type = arrayElementBaseType(element)
  }
  return types.length ? { types: types.join('\0'), kinds: String.fromCharCode(...kinds) } : null
}

export function arrayRangeProfile(type: string) {
  while (type.startsWith('array:')) type = arrayElementBaseType(type.slice(6))
  return rangeTypeProfile(type)
}

export function arrayMultirangeProfile(type: string) {
  while (type.startsWith('array:')) type = arrayElementBaseType(type.slice(6))
  return multirangeTypeProfile(type)
}

export function arrayInputPlan(type: string): string[] {
  const plan = arrayIdentityPlan(type)
  if (!plan) return []
  const multi = arrayMultirangeProfile(type)
  if (multi)
    return [
      plan.types,
      plan.kinds,
      multi.multirange,
      multi.identity,
      multi.subtype,
      String.fromCharCode(arrayElementFamily(multi.elementType)!),
      ...(multi.captured
        ? [
            String.fromCharCode(rangeProfileSupport(multi).comparison),
            String.fromCharCode(rangeProfileSupport(multi).canonical),
            ...(multi.subtypeEnum
              ? [multi.subtypeEnum.values.join('\0'), String(multi.subtypeEnum.values.length)]
              : []),
          ]
        : []),
    ]
  const range = arrayRangeProfile(type)
  return range
    ? [
        plan.types,
        plan.kinds,
        range.identity,
        range.subtype,
        String.fromCharCode(arrayElementFamily(range.elementType)!),
        ...(range.captured
          ? [
              String.fromCharCode(rangeProfileSupport(range).comparison),
              String.fromCharCode(rangeProfileSupport(range).canonical),
              ...(range.subtypeEnum
                ? [range.subtypeEnum.values.join('\0'), String(range.subtypeEnum.values.length)]
                : []),
            ]
          : []),
      ]
    : arrayElementFamily(type.slice(6)) === 41
      ? [plan.types, plan.kinds]
      : []
}

export const arrayElementComparison = (type: string) => {
  const domain = domainElementDefinition(type)
  type = arrayElementBaseType(type)
  const composite = compositeProfile(type)
  if (composite) {
    const support = composite.graph.definitions.find(
      (n) => n.identity === composite.identity,
    )?.comparison
    return support
      ? {
          identity: composite.identity,
          collation: null,
          btreeClass: support.btreeClass,
          hashClass: support.hashClass,
          equality: support.equalityImplementation,
          comparator: support.comparator,
          hash: support.hash ?? null,
          hashExtended: support.hashExtended ?? null,
        }
      : null
  }
  const range = rangeTypeProfile(type),
    multi = multirangeTypeProfile(type),
    profile = range ?? multi
  if (profile) {
    const defaults = builtinTypeComparison(
      range ? 'pg_catalog.int4range' : 'pg_catalog.int4multirange',
    )!
    const equality = range ? profile.rangeEquality : profile.multirangeEquality,
      comparator = range ? profile.rangeComparator : profile.multirangeComparator,
      hash = range ? profile.rangeHash : profile.multirangeHash,
      extended = range ? profile.rangeHashExtended : profile.multirangeHashExtended,
      unavailable = domain !== null,
      hashAvailable = hash !== defaults.hash || (profile.subtypeHash !== null && !unavailable),
      extendedAvailable =
        extended !== defaults.hashExtended || (profile.subtypeHashExtended !== null && !unavailable)
    return {
      ...defaults,
      identity: range ? profile.identity : profile.multirange,
      equality,
      comparator,
      hash: hashAvailable ? hash : null,
      hashExtended: extendedAvailable ? extended : null,
    }
  }
  return builtinTypeComparison(
    type.startsWith('array:')
      ? 'pg_catalog.anyarray'
      : type.startsWith('enum:')
        ? 'pg_catalog.anyenum'
        : isRangeType(type)
          ? 'pg_catalog.int4range'
          : isMultirangeType(type)
            ? 'pg_catalog.int4multirange'
            : type,
  )
}

export const arrayElementComparisonAvailable = (type: string, equality: boolean): boolean => {
  while (true) {
    const composite = compositeProfile(arrayElementBaseType(type))
    if (composite) {
      const support = composite.graph.definitions.find(
        (n) => n.identity === composite.identity,
      )?.comparison
      return (equality ? support?.equalityAvailable : support?.comparisonAvailable) === true
    }
    const support = arrayElementComparison(type)
    if (!(equality ? support?.equality : support?.comparator)) return false
    type = arrayElementBaseType(type)
    if (!type.startsWith('array:')) return true
    type = type.slice(6)
  }
}
