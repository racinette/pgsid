import type { TableInfo } from '../../catalog/types.js'
import { catalogCheckGroups } from '../../sql-semantics/catalog-checks.js'

export function checkTriggerWarning(
  table: TableInfo,
  operation?: 'insert' | 'update',
): string | null {
  const operations = (operation ? [operation] : ['insert', 'update']).filter((operation) =>
    table.writeRewritesTree.beforeRow.includes(operation),
  )
  if (!operations.length || !catalogCheckGroups([table], []).length) return null
  return `Writes to ${table.schema}.${table.name} may encounter BEFORE ${operations.join('/').toUpperCase()} row trigger(s). Generated CHECK validation sees values before those triggers; review whether they can change the result.`
}
