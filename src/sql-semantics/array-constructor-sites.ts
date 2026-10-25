import type {
  StoredArrayConstructorContext,
  CompositeTypeGraph,
  RangeTypeInfo,
} from '../catalog/types.js'
import { catalogCompositeArrayType, compositeProfile } from './composite-profiles.js'
import {
  isCatalogVectorType,
  arrayLikeElementType,
  arrayElementBaseType,
  type CatalogVectorType,
  type ArrayType,
} from './expressions.js'
import { walkStoredExpression } from './row-coercion-sites.js'

export type ArrayConstructorBindings = ReadonlyMap<
  unknown,
  { type: CatalogVectorType | ArrayType; multidimensional: boolean }
>

export function alignStoredArrayConstructors(
  root: unknown,
  context: StoredArrayConstructorContext,
  graph?: CompositeTypeGraph,
  ranges: readonly RangeTypeInfo[] = [],
): ArrayConstructorBindings {
  const result = new Map<
    unknown,
    { type: CatalogVectorType | ArrayType; multidimensional: boolean }
  >()
  if (!context.complete) return result
  walkStoredExpression(root, (node, site) => {
    const wrapper = node as Record<string, unknown>
    const value = wrapper['A_ArrayExpr'] as { elements?: unknown[] } | undefined
    if (!value) return
    const matches = context.constructors.filter((c) => c.site === site)
    if (matches.length !== 1) return
    const selected = matches[0]!
    if (
      selected.type === 'pg_catalog._record' &&
      selected.elementType === 'pg_catalog.record' &&
      selected.members === (value.elements?.length ?? 0)
    ) {
      result.set(node, {
        type: 'array:anonymous-record:[]',
        multidimensional: selected.multidimensional,
      })
      return
    }
    const named = catalogCompositeArrayType(selected.type, graph, ranges)
    if (
      named &&
      compositeProfile(arrayElementBaseType(arrayLikeElementType(named)!)) &&
      graph?.definitions.find((node) => node.identity === selected.type)?.element ===
        selected.elementType &&
      selected.members === (value.elements?.length ?? 0)
    ) {
      result.set(node, { type: named, multidimensional: selected.multidimensional })
      return
    }
    if (
      !isCatalogVectorType(selected.type) ||
      selected.elementType !== arrayLikeElementType(selected.type) ||
      selected.members !== (value.elements?.length ?? 0)
    )
      return
    result.set(node, { type: selected.type, multidimensional: selected.multidimensional })
  })
  return result
}
