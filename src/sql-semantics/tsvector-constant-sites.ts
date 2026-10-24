import type { StoredTsvectorConstantContext } from '../catalog/types.js'
import { walkStoredExpression } from './row-coercion-sites.js'

export function restoreStoredTsvectorConstants(
  root: unknown,
  definition: string,
  context?: StoredTsvectorConstantContext,
): void {
  if (!context?.complete || context.definition !== definition) return
  const literals = new Map<string, Record<string, unknown>[]>()
  walkStoredExpression(root, (node, site) => {
    if (node && typeof node === 'object' && 'A_Const' in node)
      literals.set(site, [...(literals.get(site) ?? []), node as Record<string, unknown>])
  })
  for (const constant of context.constants) {
    const matches = literals.get(constant.site)
    if (
      matches?.length === 1 &&
      context.constants.filter((c) => c.site === constant.site).length === 1 &&
      constant.storage
    )
      matches[0]!['__pgsid_tsvector_storage'] = constant.storage
  }
}
