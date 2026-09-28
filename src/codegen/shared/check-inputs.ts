import type { Node } from 'libpg-query'
import type { CatalogSnapshot, TableInfo } from '../../catalog/types.js'
import type { WriteValueLineage, ValueLineage } from '../../query/value-lineage.js'
import { catalogCheckGroups } from '../../sql-semantics/catalog-checks.js'
import { catalogScalarType } from '../../sql-semantics/catalog-check-binder.js'

export interface CheckInputPlan {
  table: TableInfo
  columns: readonly { name: string; parameter: number }[]
}

const directParameter = (value: ValueLineage): number | null => {
  if (value.kind === 'parameter') return value.number
  if (value.kind === 'transform' && value.operation.kind === 'assignment')
    return directParameter(value.inputs[0]!)
  return null
}

export function planCheckInputs(
  statement: Node,
  writes: readonly WriteValueLineage[],
  catalog: CatalogSnapshot | undefined,
  parameterTypes: readonly string[] | undefined,
): CheckInputPlan[] {
  if (!catalog) return []
  const insert = (
    statement as { InsertStmt?: { relation?: { relname?: string }; selectStmt?: Node } }
  ).InsertStmt
  const select = (insert?.selectStmt as { SelectStmt?: { valuesLists?: Node[] } } | undefined)
    ?.SelectStmt
  if (!insert?.relation?.relname || select?.valuesLists?.length !== 1) return []
  const table = catalog.tables.find(
    (item) =>
      item.name === insert.relation?.relname &&
      writes.some(
        (write) => write.target.schema === item.schema && write.target.relation === item.name,
      ),
  )
  if (
    !table ||
    table.writeRewritesTree.beforeRow.includes('insert') ||
    table.writeRewritesTree.insteadOf.includes('insert') ||
    table.writeRewritesTree.insteadRules.includes('insert')
  )
    return []
  const groups = catalogCheckGroups([table], [])
  const used = new Set(groups.flatMap((group) => group.checks.flatMap(({ plan }) => plan.inputs)))
  if (!used.size) return []
  const columns: { name: string; parameter: number }[] = []
  for (const name of used) {
    const column = table.columns.find((item) => item.name === name)
    const type = column && catalogScalarType(column.typeName)
    if (
      !type ||
      ![
        'pg_catalog.text',
        'pg_catalog.bool',
        'pg_catalog.int2',
        'pg_catalog.int4',
        'pg_catalog.int8',
      ].includes(type)
    )
      continue
    const assignments = writes.filter(
      (write) =>
        write.target.schema === table.schema &&
        write.target.relation === table.name &&
        write.target.column === name &&
        write.source === 'insert' &&
        !write.partial,
    )
    if (assignments.length !== 1) continue
    const parameter = directParameter(assignments[0]!.value)
    if (parameter === null || catalogScalarType(parameterTypes?.[parameter - 1] ?? '') !== type)
      continue
    columns.push({ name, parameter })
  }
  return columns.length ? [{ table, columns }] : []
}
