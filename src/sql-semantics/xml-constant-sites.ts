import type { StoredXmlConstantContext } from '../catalog/types.js'
import { walkStoredExpression } from './row-coercion-sites.js'

export function restoreStoredXmlNames(
  root: unknown,
  definition: string,
  context?: StoredXmlConstantContext,
): void {
  if (!context?.complete || context.definition !== definition || !context.names) return
  const nodes = new Map<string, Record<string, unknown>[]>()
  walkStoredExpression(root, (node, site) => {
    if (!node || typeof node !== 'object' || !('XmlExpr' in node)) return
    const xml = node.XmlExpr
    if (xml && typeof xml === 'object')
      nodes.set(site, [...(nodes.get(site) ?? []), xml as Record<string, unknown>])
  })
  for (const entry of context.names) {
    const matches = nodes.get(entry.site)
    if (matches?.length === 1 && context.names.filter((n) => n.site === entry.site).length === 1)
      matches[0]!['__pgsid_mapped_name'] = entry.name
  }
}

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
