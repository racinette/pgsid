import type { StoredXmlConstantContext } from '../catalog/types.js'
import { walkStoredExpression } from './row-coercion-sites.js'

export function alignStoredXmlConstants(
  root: unknown,
  definition: string,
  context?: StoredXmlConstantContext,
): ReadonlyMap<unknown, string | null> {
  const result = new Map<unknown, string | null>()
  if (!context?.complete || context.definition !== definition) return result
  const literals = new Map<string, unknown[]>()
  walkStoredExpression(root, (node, site) => {
    if (node && typeof node === 'object' && 'A_Const' in node)
      literals.set(site, [...(literals.get(site) ?? []), node])
  })
  for (const literal of context.constants) {
    const nodes = literals.get(literal.site)
    if (
      nodes?.length === 1 &&
      context.constants.filter((c) => c.site === literal.site).length === 1
    )
      result.set(nodes[0], literal.text)
  }
  return result
}
