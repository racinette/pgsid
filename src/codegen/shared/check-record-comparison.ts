import type { CompositeTypeDefinition } from '../../catalog/types.js'
import { anonymousRecordProfile } from '../../sql-semantics/anonymous-records.js'
import {
  compositeProfile,
  compositeFieldType,
  type CompositeProfile,
} from '../../sql-semantics/composite-profiles.js'
import { arrayElementBaseType, domainElementDefinition } from '../../sql-semantics/expressions.js'
import { rangeCallTypeKey } from '../../sql-semantics/range-callables.js'
import { rangeTypeProfile, multirangeTypeProfile } from '../../sql-semantics/range-profiles.js'
import { builtinCallables, builtinMetadata } from '../../postgres/builtins/inventory.js'
import { callableIdentity } from '../../postgres/builtins/catalog.js'
import {
  arrayElementComparison,
  arrayElementComparisonAvailable,
  arrayElementIdentity,
} from './check-array-types.js'

export interface RecordComparisonField {
  identity: string
  type: string | null
  support: CompositeTypeDefinition['comparison']
  collationIdentity: string | null
  collation: 'C' | 'default' | 'deterministic' | 'other'
}
export interface RecordComparisonLayout {
  identity: string
  profile: CompositeProfile | null
  fields: RecordComparisonField[]
}

const typeIdentity = (type: string): string => {
  const domain = domainElementDefinition(type)
  const qualified = (schema: string, name: string) =>
    rangeCallTypeKey([schema, name].map((v) => '"' + v.replaceAll('"', '""') + '"').join('.'))
  if (domain) return qualified(domain.schema, domain.name)
  if (type.startsWith('array:')) return 'array:' + typeIdentity(type.slice(6))
  if (type.startsWith('enum:')) {
    const [schema, name] = JSON.parse(type.slice(5)) as string[]
    return qualified(schema!, name!)
  }
  return rangeCallTypeKey(arrayElementIdentity(type))
}

const comparisonRanges = (type: string): Record<string, string> => {
  type = arrayElementBaseType(type)
  if (type.startsWith('array:')) return comparisonRanges(type.slice(6))
  const composite = compositeProfile(type)
  if (composite) return composite.ranges
  const range = rangeTypeProfile(type) ?? multirangeTypeProfile(type)
  return range ? { [range.identity]: range.rangeType, ...comparisonRanges(range.elementType) } : {}
}

export function recordComparisonLayouts(type: string): RecordComparisonLayout[] | null {
  const anonymous = anonymousRecordProfile(type)
  if (anonymous)
    return anonymous.map((layout) =>
      layout.namedType
        ? recordComparisonLayouts(layout.namedType)![0]!
        : {
            identity: layout.identity,
            profile: layout.fields.some((field) => field.comparisonContext)
              ? {
                  identity: layout.identity,
                  ranges: Object.assign(
                    {},
                    ...layout.fields.map((field) => comparisonRanges(field.type)),
                  ),
                  graph: {
                    roots: [
                      ...new Set(
                        layout.fields.flatMap((field) => field.comparisonContext?.roots ?? []),
                      ),
                    ],
                    definitions: [
                      ...new Map(
                        layout.fields
                          .flatMap((field) => field.comparisonContext?.definitions ?? [])
                          .map((node) => [node.identity, node]),
                      ).values(),
                    ],
                  },
                }
              : null,
            fields: layout.fields.map((field) => {
              const selected = field.unknown ? null : arrayElementComparison(field.type)
              const equality = selected?.equality
                ? builtinCallables().find((item) => callableIdentity(item) === selected.equality)
                : null
              const implementation =
                equality?.kind === 'operator' ? builtinMetadata(equality.implementation) : equality
              return {
                identity: typeIdentity(field.unknown ? 'pg_catalog.unknown' : field.type),
                type: arrayElementBaseType(field.type),
                support: field.comparisonContext
                  ? field.comparisonContext.definitions.find(
                      (node) => node.identity === field.comparisonContext!.roots[0],
                    )?.comparison
                  : {
                      btreeClass: selected?.btreeClass ?? null,
                      hashClass: selected?.hashClass ?? null,
                      equality: selected?.equality ?? null,
                      equalityImplementation: implementation
                        ? callableIdentity(implementation)
                        : null,
                      comparator: selected?.comparator ?? null,
                      equalityAvailable:
                        !field.unknown && arrayElementComparisonAvailable(field.type, true),
                      comparisonAvailable:
                        !field.unknown && arrayElementComparisonAvailable(field.type, false),
                    },
                collationIdentity: field.collationIdentity ?? field.collation ?? 'default',
                collation: field.collation ?? 'default',
              }
            }),
          },
    )
  const profile = compositeProfile(type),
    definition = profile?.graph.definitions.find((n) => n.identity === profile.identity)
  if (!profile || !definition) return null
  return [
    {
      identity: profile.identity,
      profile,
      fields: definition.fields.map((field) => {
        const type = compositeFieldType(profile, field.type)
        return {
          identity: typeIdentity(compositeFieldType(profile, field.type, true) ?? field.type),
          type,
          support: profile.graph.definitions.find((n) => n.identity === field.type)?.comparison,
          collationIdentity: field.collationIsC
            ? 'C'
            : field.collationIsDefault
              ? 'default'
              : field.collation,
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

export const isRecordComparison = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.args.length === 2 &&
  item.args.every((type) => type === 'pg_catalog.record') &&
  (item.name === 'btrecordcmp'
    ? item.result === 'pg_catalog.int4'
    : ['record_eq', 'record_ne', 'record_lt', 'record_le', 'record_gt', 'record_ge'].includes(
        item.name,
      ) && item.result === 'pg_catalog.bool')
