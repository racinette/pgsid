import type { CompositeTypeGraph } from './types.js'

export function compositeTypeDependencies(
  graph: CompositeTypeGraph,
  roots: readonly string[],
): CompositeTypeGraph | null {
  const definitions = new Map(graph.definitions.map((node) => [node.identity, node])),
    needed = new Set<string>()
  const visit = (identity: string): boolean => {
    if (needed.has(identity)) return true
    const node = definitions.get(identity)
    if (!node) return false
    needed.add(identity)
    for (const ref of [
      node.array,
      node.base,
      node.element,
      node.subtype,
      node.member,
      node.typedOf,
      ...(node.parents ?? []),
      ...(node.rowCasts ?? []).map((cast) => cast.target),
      ...node.fields.map((field) => field.type),
    ])
      if (ref && !visit(ref)) return false
    for (const multi of graph.definitions)
      if (multi.kind === 'm' && multi.member === identity && !visit(multi.identity)) return false
    return true
  }
  if (!roots.every((identity) => definitions.get(identity)?.kind === 'c' && visit(identity)))
    return null
  return structuredClone({
    roots: [...new Set(roots)].sort(),
    definitions: graph.definitions
      .filter((node) => needed.has(node.identity))
      .sort((a, b) => (a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0)),
  })
}
