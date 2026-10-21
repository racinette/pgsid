import { parseSync } from 'libpg-query'
import type {
  CompositeTypeGraph,
  CompositeTypeDefinition,
  RangeTypeInfo,
} from '../catalog/types.js'
import {
  catalogScalarType,
  arrayType,
  domainElementType,
  arrayElementBaseType,
  enumType,
  type ScalarType,
  type ArrayElementType,
  type ArrayType,
} from './expressions.js'
import { capturedRangeType, rangeTypeProfile, multirangeTypeProfile } from './range-profiles.js'

export type CompositeType = `composite:${string}`
export interface CompositeProfile {
  identity: string
  graph: CompositeTypeGraph
  ranges: Record<string, string>
}

export function catalogCompositeArrayType(
  name: string,
  graph?: CompositeTypeGraph,
  rangeTypes: readonly RangeTypeInfo[] = [],
): ArrayType | null {
  if (!graph) return null
  const explicit = name.endsWith('[]'),
    parts = names(explicit ? name.replace(/(?:\[\])+$/u, '') : name)
  if (!parts) return null
  const matches = graph.definitions.filter((n) =>
    parts.length === 2
      ? n.schema === parts[0] && n.name === parts[1]
      : parts.length === 1 && n.name === parts[0],
  )
  if (matches.length !== 1) return null
  const element = explicit
    ? matches[0]
    : graph.definitions.find((n) => n.identity === matches[0]!.element)
  const visiting = new Set<string>()
  const build = (identity: string): ScalarType | null => {
    if (visiting.has(identity)) return null
    visiting.add(identity)
    const node = graph.definitions.find((n) => n.identity === identity)
    if (!node) return null
    if (node.kind === 'c') return catalogCompositeType(identity, graph, rangeTypes)
    if (node.kind === 'd' && node.base) {
      const base = build(node.base)
      return base
        ? domainElementType(
            node,
            arrayElementBaseType(base) as Exclude<ScalarType, `domain:${string}`>,
          )
        : null
    }
    if (node.element) {
      const child = build(node.element)
      return child && !child.startsWith('array:') ? arrayType(child as ArrayElementType) : null
    }
    return null
  }
  const type = element ? build(element.identity) : null
  return type && !type.startsWith('array:') ? arrayType(type as ArrayElementType) : null
}

function names(name: string): string[] | null {
  try {
    const parsed = parseSync(`SELECT NULL::${name}`) as {
      stmts?: {
        stmt?: {
          SelectStmt?: {
            targetList?: {
              ResTarget?: {
                val?: {
                  TypeCast?: {
                    typeName?: { names?: { String?: { sval?: string } }[]; arrayBounds?: unknown[] }
                  }
                }
              }
            }[]
          }
        }
      }[]
    }
    const t =
      parsed.stmts?.[0]?.stmt?.SelectStmt?.targetList?.[0]?.ResTarget?.val?.TypeCast?.typeName
    return t?.arrayBounds?.length ? null : (t?.names?.map((n) => n.String?.sval ?? '') ?? null)
  } catch {
    return null
  }
}

function closure(identity: string, graph: CompositeTypeGraph): CompositeTypeGraph | null {
  const definitions = new Map(graph.definitions.map((n) => [n.identity, n])),
    needed = new Set<string>()
  const visit = (id: string): boolean => {
    if (needed.has(id)) return true
    const n = definitions.get(id)
    if (!n) return false
    needed.add(id)
    for (const ref of [
      n.array,
      n.base,
      n.element,
      n.subtype,
      n.member,
      ...n.fields.map((f) => f.type),
    ])
      if (ref && !visit(ref)) return false
    for (const multi of graph.definitions)
      if (multi.kind === 'm' && multi.member === id && !visit(multi.identity)) return false
    return true
  }
  return visit(identity)
    ? {
        roots: [identity],
        definitions: graph.definitions
          .filter((n) => needed.has(n.identity))
          .sort((a, b) => (a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0)),
      }
    : null
}

export function compositeProfile(type: string): CompositeProfile | null {
  if (!type.startsWith('composite:')) return null
  try {
    const p = JSON.parse(type.slice(10)) as CompositeProfile
    if (
      !p ||
      typeof p.identity !== 'string' ||
      !p.graph ||
      !Array.isArray(p.graph.definitions) ||
      !p.ranges ||
      typeof p.ranges !== 'object'
    )
      return null
    const graph = closure(p.identity, p.graph)
    if (!graph || graph.definitions.find((n) => n.identity === p.identity)?.kind !== 'c')
      return null
    return { ...p, graph }
  } catch {
    return null
  }
}

export function compositeContainerProfile(type: string): CompositeProfile | null {
  type = arrayElementBaseType(type)
  while (type.startsWith('array:')) type = arrayElementBaseType(type.slice(6))
  return compositeProfile(type)
}

const encoded = (identity: string, p: CompositeProfile): CompositeType | null => {
  const graph = closure(identity, p.graph)
  if (!graph) return null
  const ids = new Set(graph.definitions.map((n) => n.identity))
  return `composite:${JSON.stringify({
    identity,
    graph,
    ranges: Object.fromEntries(
      Object.entries(p.ranges)
        .filter(([key]) => ids.has(key))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  })}`
}

export function compositePhysicalType(
  p: CompositeProfile,
  identity: string,
): CompositeTypeDefinition | null {
  const seen = new Set<string>()
  let node = p.graph.definitions.find((n) => n.identity === identity)
  while (node?.kind === 'd') {
    if (seen.has(node.identity) || !node.base) return null
    seen.add(node.identity)
    node = p.graph.definitions.find((n) => n.identity === node!.base)
  }
  return node ?? null
}

export function compositeFieldType(
  p: CompositeProfile,
  identity: string,
  nominal = false,
): ScalarType | null {
  const n = p.graph.definitions.find((n) => n.identity === identity)
  if (!n) return null
  if (n.kind === 'd') {
    const base = compositePhysicalType(p, n.identity)
    if (!base) return null
    const type = compositeFieldType(p, base.identity)
    return type && nominal
      ? domainElementType(n, type as Exclude<ScalarType, `domain:${string}`>)
      : type
  }
  if (n.element) {
    const element = compositeFieldType(p, n.element, true)
    return element && !element.startsWith('array:') ? arrayType(element as ArrayElementType) : null
  }
  if (n.kind === 'c') return encoded(n.identity, p)
  if (n.kind === 'e') return enumType({ schema: n.schema, name: n.name })
  if (n.kind === 'r' || n.kind === 'm')
    return (p.ranges[n.identity] as ScalarType | undefined) ?? catalogScalarType(n.identity)
  return catalogScalarType(n.identity)
}

export function catalogCompositeType(
  name: string,
  graph?: CompositeTypeGraph,
  rangeTypes: readonly RangeTypeInfo[] = [],
): CompositeType | null {
  if (!graph) return null
  const parts = names(name)
  if (!parts) return null
  const matches = graph.definitions.filter((n) =>
    parts.length === 2
      ? n.schema === parts[0] && n.name === parts[1]
      : parts.length === 1 && n.name === parts[0],
  )
  if (matches.length !== 1) return null
  const p: CompositeProfile = { identity: matches[0]!.identity, graph, ranges: {} }
  const node = compositePhysicalType(p, p.identity)
  if (node?.kind !== 'c') return null
  p.identity = node.identity
  const selected = closure(node.identity, graph)
  if (!selected) return null
  p.graph = selected
  const all = new Map<string, RangeTypeInfo>()
  const collect = (items: readonly RangeTypeInfo[]) => {
    for (const r of items) {
      all.set(r.identity, r)
      collect(r.subtypeRanges ?? [])
    }
  }
  collect(rangeTypes)
  const building = new Set<string>()
  const buildRange = (id: string): string | null => {
    if (p.ranges[id]) return p.ranges[id]!
    const builtin = catalogScalarType(id)
    if (builtin && (rangeTypeProfile(builtin) || multirangeTypeProfile(builtin)))
      return (p.ranges[id] = builtin)
    if (building.has(id)) return null
    building.add(id)
    const definition = p.graph.definitions.find((n) => n.identity === id)
    if (definition?.kind === 'm' && definition.member) {
      const member = buildRange(definition.member)
      if (member) return (p.ranges[id] = `multirange:${member.slice(6)}`)
    }
    const r = all.get(id)
    if (r) {
      const child = compositePhysicalType(p, r.subtype)
      if (child?.kind === 'r' || child?.kind === 'm') buildRange(child.identity)
      for (const candidate of p.graph.definitions)
        if (
          candidate.kind === 'r' &&
          candidate.identity !== id &&
          !building.has(candidate.identity)
        )
          buildRange(candidate.identity)
      const element = compositeFieldType(p, r.subtype)
      const type = element ? capturedRangeType(r, element) : null
      if (type) p.ranges[id] = type
    }
    building.delete(id)
    return p.ranges[id] ?? null
  }
  for (const n of p.graph.definitions) if (n.kind === 'r' || n.kind === 'm') buildRange(n.identity)
  return encoded(p.identity, p)
}
