import type { StoredArrayConstructorContext } from '../catalog/types.js'
import { isCatalogVectorType, arrayLikeElementType, type CatalogVectorType } from './expressions.js'
import { walkStoredExpression } from './row-coercion-sites.js'

export type ArrayConstructorBindings = ReadonlyMap<
  unknown,
  { type: CatalogVectorType; multidimensional: boolean }
>

export function alignStoredArrayConstructors(
  root: unknown,
  context: StoredArrayConstructorContext,
): ArrayConstructorBindings {
  const result = new Map<unknown, { type: CatalogVectorType; multidimensional: boolean }>()
  if (!context.complete) return result
  walkStoredExpression(root, (node, site) => {
    const wrapper = node as Record<string, unknown>
    const value = wrapper['A_ArrayExpr'] as { elements?: unknown[] } | undefined
    if (!value) return
    const matches = context.constructors.filter((c) => c.site === site)
    if (matches.length !== 1) return
    const selected = matches[0]!
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
