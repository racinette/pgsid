import type { DomainInfo, StoredDomainCoercionContext } from '../catalog/types.js'
import { catalogScalarType } from './expressions.js'

type Fields = Record<string, unknown>
const fields = (value: unknown): Fields | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Fields) : null

export function alignStoredDomainCoercions(
  root: unknown,
  context: StoredDomainCoercionContext,
  domains: readonly DomainInfo[],
): ReadonlyMap<object, StoredDomainCoercionContext['casts'][number]> | null {
  if (!context.complete) return null
  const nodes: { node: object; schema: string; name: string; array: boolean }[] = []
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    const wrapper = fields(node)
    if (!wrapper) return
    const cast = fields(wrapper['TypeCast']),
      type = fields(cast?.['typeName']),
      array = Array.isArray(type?.['arrayBounds']) && type['arrayBounds'].length > 0,
      constructor = fields(fields(cast?.['arg'])?.['A_ArrayExpr']),
      elements = constructor?.['elements'],
      emptyConstructor =
        array &&
        constructor !== null &&
        (elements === undefined || (Array.isArray(elements) && elements.length === 0))
    const parts = type?.['names']
    const names = Array.isArray(parts)
      ? parts.map((part) => fields(fields(part)?.['String'])?.['sval'])
      : []
    if (
      !emptyConstructor &&
      names.every((name) => typeof name === 'string') &&
      names.length &&
      !(names.length === 1 && catalogScalarType(names[0] as string))
    ) {
      const matches = domains.filter((domain) =>
        names.length === 2
          ? domain.schema === names[0] && domain.name === names[1]
          : names.length === 1 && domain.name === names[0],
      )
      if (matches.length === 1)
        nodes.push({
          node: wrapper,
          schema: matches[0]!.schema,
          name: matches[0]!.name,
          array,
        })
    }
    Object.values(wrapper).forEach(visit)
  }
  visit(root)
  if (nodes.length !== context.casts.length) return null
  const result = new Map<object, StoredDomainCoercionContext['casts'][number]>()
  for (const [index, node] of nodes.entries()) {
    const captured = context.casts[index]!
    if (
      node.schema !== captured.schema ||
      node.name !== captured.name ||
      node.array !== captured.array
    )
      return null
    result.set(node.node, captured)
  }
  return result
}
