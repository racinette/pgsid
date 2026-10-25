import { catalogScalarType, type EnumDefinition, type ScalarType } from './expressions.js'
import { builtinTypeComparison } from '../postgres/builtins/inventory.js'
import type { CompositeTypeGraph } from '../catalog/types.js'

export type AnonymousRecordType = `anonymous-record:${string}`
export interface AnonymousRecordField {
  type: ScalarType
  unknown?: true
  collation?: 'C' | 'deterministic' | 'other' | 'default'
  collationIdentity?: string
  comparisonContext?: CompositeTypeGraph
  enum?: Pick<EnumDefinition, 'schema' | 'name' | 'values' | 'outputFunction' | 'jsonConversion'>
}
export interface AnonymousRecordLayout {
  identity: string
  fields: readonly AnonymousRecordField[]
}

function encodedFields(fields: readonly AnonymousRecordField[]): unknown[] {
  return fields.map((field) => {
    let base: string = field.type,
      arrays = 0
    while (base.startsWith('array:')) {
      arrays++
      base = base.slice(6)
    }
    if (!anonymousRecordProfile(base)) return field
    return { ...field, type: { record: JSON.parse(base.slice(17)) as unknown, arrays } }
  })
}

export function anonymousRecordType(fields: readonly AnonymousRecordField[]): AnonymousRecordType {
  return `anonymous-record:${JSON.stringify([encodedFields(fields)])}`
}

export function anonymousRecordProfile(type: string): readonly AnonymousRecordLayout[] | null {
  if (!type.startsWith('anonymous-record:')) return null
  try {
    const layouts = JSON.parse(type.slice(17)) as unknown
    if (!Array.isArray(layouts)) return null
    const result: AnonymousRecordLayout[] = []
    for (const layout of layouts) {
      if (!Array.isArray(layout)) return null
      const fields: AnonymousRecordField[] = []
      for (const raw of layout as AnonymousRecordField[]) {
        if (!raw || (raw.unknown !== undefined && raw.unknown !== true)) return null
        if (
          raw.collation !== undefined &&
          !['C', 'deterministic', 'other', 'default'].includes(raw.collation)
        )
          return null
        if (
          raw.collationIdentity !== undefined &&
          (typeof raw.collationIdentity !== 'string' ||
            !raw.collationIdentity ||
            raw.collationIdentity.includes('\0'))
        )
          return null
        if (
          raw.comparisonContext !== undefined &&
          (!raw.comparisonContext ||
            !Array.isArray(raw.comparisonContext.roots) ||
            !Array.isArray(raw.comparisonContext.definitions) ||
            raw.comparisonContext.definitions.some(
              (n) =>
                !n ||
                typeof n.identity !== 'string' ||
                !['e', 'd', 'b', 'c', 'r', 'm'].includes(n.kind) ||
                !Array.isArray(n.fields) ||
                'oid' in n,
            ))
        )
          return null
        let fieldType: unknown = raw.type
        if (fieldType && typeof fieldType === 'object') {
          const nested = fieldType as { record?: unknown; arrays?: unknown }
          if (
            !Number.isInteger(nested.arrays) ||
            (nested.arrays as number) < 0 ||
            (nested.arrays as number) > 6
          )
            return null
          const child = `anonymous-record:${JSON.stringify(nested.record)}`
          if (!anonymousRecordProfile(child)) return null
          fieldType = 'array:'.repeat(nested.arrays as number) + child
        }
        if (typeof fieldType !== 'string' || !fieldType.length) return null
        const definition = raw.enum
        if (
          definition !== undefined &&
          (!definition ||
            typeof definition.schema !== 'string' ||
            typeof definition.name !== 'string' ||
            !Array.isArray(definition.values) ||
            !definition.values.every((label) => typeof label === 'string') ||
            'oid' in definition ||
            'valueOids' in definition ||
            (definition.outputFunction !== undefined &&
              typeof definition.outputFunction !== 'string') ||
            (definition.jsonConversion !== undefined &&
              !['label', 'cast'].includes(definition.jsonConversion)))
        )
          return null
        fields.push({ ...raw, type: fieldType as ScalarType })
      }
      result.push({ identity: `anonymous-record-layout:${JSON.stringify(layout)}`, fields })
    }
    return result
  } catch {
    return null
  }
}

export function anonymousComparisonContext(
  type: string,
  graph?: CompositeTypeGraph,
): CompositeTypeGraph | undefined {
  if (!graph) return undefined
  const nodes = new Map(graph.definitions.map((n) => [n.identity, n]))
  const selected = (type: string): string | null => {
    if (type.startsWith('domain:')) {
      const [schema, name] = JSON.parse(type.slice(7)) as string[]
      return (
        graph.definitions.find((n) => n.kind === 'd' && n.schema === schema && n.name === name)
          ?.identity ?? null
      )
    }
    if (type.startsWith('array:')) {
      const child = selected(type.slice(6))
      return child ? (nodes.get(child)?.array ?? null) : null
    }
    if (type.startsWith('enum:')) {
      const [schema, name] = JSON.parse(type.slice(5)) as string[]
      return (
        graph.definitions.find((n) => n.kind === 'e' && n.schema === schema && n.name === name)
          ?.identity ?? null
      )
    }
    if (type.startsWith('composite:'))
      return (JSON.parse(type.slice(10)) as { identity: string }).identity
    if (type.startsWith('range:'))
      return (JSON.parse(type.slice(6)) as { identity: string }).identity
    if (type.startsWith('multirange:'))
      return (JSON.parse(type.slice(11)) as { multirange: string }).multirange
    return graph.definitions.find((n) => catalogScalarType(n.identity) === type)?.identity ?? null
  }
  const identity = selected(type)
  if (!identity || !nodes.has(identity)) return undefined
  const needed = new Set<string>()
  const visit = (identity: string): void => {
    if (needed.has(identity)) return
    needed.add(identity)
    const node = nodes.get(identity)
    for (const child of [
      node?.base,
      node?.element,
      node?.subtype,
      node?.member,
      node?.typedOf,
      ...(node?.parents ?? []),
      ...(node?.fields.map((field) => field.type) ?? []),
      ...(node?.rowCasts?.map((cast) => cast.target) ?? []),
    ])
      if (child) visit(child)
  }
  visit(identity)
  const definitions = graph.definitions.filter((n) => needed.has(n.identity))
  const defaults = (
    node: (typeof definitions)[number],
  ): ReturnType<typeof builtinTypeComparison> | typeof node.comparison => {
    if (node.kind === 'd' && node.base && nodes.has(node.base))
      return defaults(nodes.get(node.base)!)
    if (node.kind === 'c') return node.comparison
    return builtinTypeComparison(
      node.element
        ? 'pg_catalog.anyarray'
        : node.kind === 'e'
          ? 'pg_catalog.anyenum'
          : node.kind === 'r'
            ? 'pg_catalog.int4range'
            : node.kind === 'm'
              ? 'pg_catalog.int4multirange'
              : (catalogScalarType(node.identity) ?? node.identity),
    )
  }
  const differs = definitions.some((node) => {
    const expected = defaults(node),
      actual = node.comparison
    return (
      !actual ||
      actual.btreeClass !== (expected?.btreeClass ?? null) ||
      actual.equality !== (expected?.equality ?? null) ||
      actual.comparator !== (expected?.comparator ?? null) ||
      actual.equalityAvailable !==
        Boolean(
          expected &&
          ('equalityAvailable' in expected ? expected.equalityAvailable : expected.equality),
        ) ||
      actual.comparisonAvailable !==
        Boolean(
          expected &&
          ('comparisonAvailable' in expected ? expected.comparisonAvailable : expected.comparator),
        )
    )
  })
  return differs ? { roots: [identity], definitions } : undefined
}

export function commonAnonymousRecordType(types: readonly string[]): ScalarType | null {
  if (!types.length) return null
  if (types.every((type) => type.startsWith('array:'))) {
    const element = commonAnonymousRecordType(types.map((type) => type.slice(6)))
    return element ? (`array:${element}` as ScalarType) : null
  }
  const profiles = types.map(anonymousRecordProfile)
  if (profiles.some((profile) => profile === null)) return null
  const layouts = [
    ...new Set(
      profiles.flatMap((profile) => profile!.map((p) => JSON.stringify(encodedFields(p.fields)))),
    ),
  ].sort()
  return `anonymous-record:[${layouts.join(',')}]`
}

export function canRelabelAnonymousRecords(source: string, target: string): boolean {
  if (source.startsWith('array:') && target.startsWith('array:'))
    return canRelabelAnonymousRecords(source.slice(6), target.slice(6))
  const from = anonymousRecordProfile(source),
    to = anonymousRecordProfile(target)
  return (
    !!from && !!to && from.every((layout) => to.some((other) => other.identity === layout.identity))
  )
}
