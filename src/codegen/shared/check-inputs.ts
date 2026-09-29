import type { Node } from 'libpg-query'
import type { CatalogSnapshot, ColumnInfo, TableInfo } from '../../catalog/types.js'
import type { WriteValueLineage, ValueLineage } from '../../query/value-lineage.js'
import { catalogCheckGroups } from '../../sql-semantics/catalog-checks.js'
import { catalogScalarType } from '../../sql-semantics/catalog-check-binder.js'

export type CheckColumnSource =
  | { kind: 'parameter'; number: number }
  | { kind: 'sql-null' }
  | { kind: 'default' }
  | { kind: 'previous' }
  | { kind: 'generated' }
  | { kind: 'unknown' }

export interface CheckWritePlan {
  table: TableInfo
  operation: 'insert' | 'update'
  columns: readonly { name: string; source: CheckColumnSource }[]
  canPrevalidate: boolean
}

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

const directNull = (value: ValueLineage): boolean => {
  if (value.kind === 'literal') return value.value === null
  if (value.kind === 'transform' && value.operation.kind === 'assignment')
    return directNull(value.inputs[0]!)
  return false
}

const hasDefault = (column: ColumnInfo, catalog: CatalogSnapshot): boolean => {
  if (column.hasDefault || column.identity !== null) return true
  let oid = column.typeOid
  const seen = new Set<number>()
  while (!seen.has(oid)) {
    seen.add(oid)
    const domain = catalog.domains.find((item) => item.oid === oid)
    if (!domain) break
    if (domain.default !== null) return true
    oid = domain.baseTypeOid
  }
  return false
}

const defaultSource = (column: ColumnInfo, catalog: CatalogSnapshot): CheckColumnSource =>
  hasDefault(column, catalog) ? { kind: 'default' } : { kind: 'sql-null' }

const assignedSource = (
  table: TableInfo,
  column: ColumnInfo,
  operation: 'insert' | 'update',
  writes: readonly WriteValueLineage[],
  parameterTypes: readonly string[] | undefined,
): CheckColumnSource => {
  const assignments = writes.filter(
    (write) =>
      write.target.schema === table.schema &&
      write.target.relation === table.name &&
      write.target.column === column.name &&
      write.source === operation,
  )
  if (assignments.length !== 1 || assignments[0]!.partial) return { kind: 'unknown' }
  const value = assignments[0]!.value
  if (directNull(value)) return { kind: 'sql-null' }
  const number = directParameter(value)
  if (
    number !== null &&
    catalogScalarType(column.typeName) === catalogScalarType(parameterTypes?.[number - 1] ?? '')
  )
    return { kind: 'parameter', number }
  return { kind: 'unknown' }
}

const targetNames = (nodes: readonly Node[] | undefined): string[] =>
  (nodes ?? []).flatMap((node) => {
    const name = (node as { ResTarget?: { name?: string } }).ResTarget?.name
    return name ? [name] : []
  })

export function planCheckWrite(
  statement: Node,
  writes: readonly WriteValueLineage[],
  catalog: CatalogSnapshot | undefined,
  parameterTypes: readonly string[] | undefined,
): CheckWritePlan | null {
  if (!catalog) return null
  const insert = (
    statement as {
      InsertStmt?: {
        relation?: { relname?: string; schemaname?: string }
        cols?: Node[]
        selectStmt?: Node
        override?: string
      }
    }
  ).InsertStmt
  const update = (
    statement as {
      UpdateStmt?: { relation?: { relname?: string; schemaname?: string }; targetList?: Node[] }
    }
  ).UpdateStmt
  const operation = insert ? 'insert' : update ? 'update' : null
  const relation = insert?.relation ?? update?.relation
  if (!operation || !relation?.relname) return null
  const matches = catalog.tables.filter(
    (item) =>
      item.name === relation.relname &&
      (relation.schemaname === undefined || item.schema === relation.schemaname),
  )
  const writtenMatches = matches.filter((item) =>
    writes.some(
      (write) => write.target.schema === item.schema && write.target.relation === item.name,
    ),
  )
  const resolved = writtenMatches.length === 1 ? writtenMatches : matches
  if (resolved.length !== 1) return null
  const table = resolved[0]!
  const groups = catalogCheckGroups([table], [])
  const used = new Set(groups.flatMap((group) => group.checks.flatMap(({ plan }) => plan.inputs)))
  if (!used.size) return null

  const select = (insert?.selectStmt as { SelectStmt?: { valuesLists?: Node[] } } | undefined)
    ?.SelectStmt
  const rows = select?.valuesLists ?? []
  const values =
    rows.length === 1 ? ((rows[0] as { List?: { items?: Node[] } }).List?.items ?? []) : []
  const explicitNames = targetNames(insert?.cols)
  const insertNames = insert
    ? explicitNames.length
      ? explicitNames
      : table.columns.map((column) => column.name)
    : []
  const updateTargets = new Map(
    (update?.targetList ?? []).flatMap((node) => {
      const target = (node as { ResTarget?: { name?: string; val?: Node } }).ResTarget
      return target?.name ? [[target.name, target.val] as const] : []
    }),
  )
  const rewrites = table.writeRewritesTree
  const rowRewritten =
    rewrites.insteadOf.includes(operation) || rewrites.insteadRules.includes(operation)
  const columns = [...used].map((name) => {
    const column = table.columns.find((item) => item.name === name)!
    let source: CheckColumnSource
    if (rowRewritten) source = { kind: 'unknown' }
    else if (column.generated !== 'none') source = { kind: 'generated' }
    else if (operation === 'update') {
      if (!updateTargets.has(name)) source = { kind: 'previous' }
      else if (
        Boolean((updateTargets.get(name) as { SetToDefault?: unknown } | undefined)?.SetToDefault)
      )
        source = defaultSource(column, catalog)
      else source = assignedSource(table, column, operation, writes, parameterTypes)
    } else {
      const index = insertNames.indexOf(name)
      if (
        (column.identity !== null && insert?.override === 'OVERRIDING_USER_VALUE') ||
        index < 0 ||
        (!insert?.selectStmt && rows.length === 0) ||
        (rows.length === 1 &&
          (!values[index] || Boolean((values[index] as { SetToDefault?: unknown }).SetToDefault)))
      )
        source = defaultSource(column, catalog)
      else source = assignedSource(table, column, operation, writes, parameterTypes)
    }
    return { name, source }
  })
  const canPrevalidate = operation === 'insert' && rows.length === 1 && !rowRewritten
  return { table, operation, columns, canPrevalidate }
}

export function planCheckInputs(
  statement: Node,
  writes: readonly WriteValueLineage[],
  catalog: CatalogSnapshot | undefined,
  parameterTypes: readonly string[] | undefined,
): CheckInputPlan[] {
  const plan = planCheckWrite(statement, writes, catalog, parameterTypes)
  if (!plan?.canPrevalidate) return []
  const columns = plan.columns.flatMap(({ name, source }) => {
    if (source.kind !== 'parameter') return []
    const column = plan.table.columns.find((item) => item.name === name)!
    const type = catalogScalarType(column.typeName)
    return type &&
      [
        'pg_catalog.text',
        'pg_catalog.bool',
        'pg_catalog.int2',
        'pg_catalog.int4',
        'pg_catalog.int8',
      ].includes(type)
      ? [{ name, parameter: source.number }]
      : []
  })
  return columns.length ? [{ table: plan.table, columns }] : []
}
