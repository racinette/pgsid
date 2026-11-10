import {
  projectCases,
  tableCheckCases,
  type OutputCaseGroup,
  type OutputCheckCases,
  type OutputLiterals,
} from '../../query/check-cases.js'
import type { CheckCaseCatalog } from '../../query/types.js'
import type { Node } from 'libpg-query'
import type { CatalogSnapshot, ColumnInfo, TableInfo } from '../../catalog/types.js'
import type { WriteValueLineage } from '../../query/value-lineage.js'
import { catalogCheckGroups } from '../../sql-semantics/catalog-checks.js'
import {
  catalogCompositeArrayType,
  catalogCompositeType,
} from '../../sql-semantics/composite-profiles.js'
import {
  catalogPointType,
  catalogLineType,
  catalogLsegType,
  catalogMoneyType,
  catalogTsvectorType,
  catalogTsqueryType,
  catalogAclitemType,
  catalogXidType,
  catalogCidType,
  catalogPgLsnType,
  catalogTidType,
  catalogInternalCharType,
  catalogXid8Type,
  catalogSnapshotType,
  catalogRangeType,
  catalogMultirangeType,
  catalogJsonType,
  catalogJsonbType,
  catalogJsonpathType,
  catalogXmlType,
  catalogOidType,
  catalogPolygonType,
  catalogPathType,
  catalogCircleType,
  catalogBoxType,
  catalogScalarType,
  catalogTemporalType,
  catalogArrayType,
  catalogVectorType,
} from '../../sql-semantics/catalog-check-binder.js'

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
  operation: 'insert' | 'update'
  columns: readonly { name: string; parameter: number }[]
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

type Assignment =
  { kind: 'value'; node: Node } | { kind: 'default' } | { kind: 'previous' } | { kind: 'unknown' }

interface CandidateRow {
  operation: 'insert' | 'update'
  rewritten: boolean
  identityDefaults: boolean
  assignment(name: string): Assignment
  excluded?: CandidateRow
}

interface ResTargetNode {
  name?: string
  val?: Node
  indirection?: unknown[]
}

const resTarget = (node: Node): ResTargetNode | undefined =>
  (node as { ResTarget?: ResTargetNode }).ResTarget

const isDefault = (node: Node | undefined): boolean =>
  Boolean((node as { SetToDefault?: unknown } | undefined)?.SetToDefault)

const insertRow = (
  names: readonly string[],
  partial: ReadonlySet<string>,
  values: readonly (Node | undefined)[] | 'defaults' | 'unknown',
  rewritten: boolean,
  identityDefaults: boolean,
): CandidateRow => ({
  operation: 'insert',
  rewritten,
  identityDefaults,
  assignment(name) {
    const index = names.indexOf(name)
    if (index < 0 || values === 'defaults') return { kind: 'default' }
    if (values === 'unknown' || partial.has(name)) return { kind: 'unknown' }
    const node = values[index]
    if (!node) return { kind: 'unknown' }
    return isDefault(node) ? { kind: 'default' } : { kind: 'value', node }
  },
})

const updateRow = (
  targets: readonly Node[],
  rewritten: boolean,
  excluded?: CandidateRow,
): CandidateRow => ({
  operation: 'update',
  rewritten,
  identityDefaults: false,
  ...(excluded ? { excluded } : {}),
  assignment(name) {
    const matches = targets.flatMap((node) => {
      const target = resTarget(node)
      return target?.name === name ? [target] : []
    })
    if (!matches.length) return { kind: 'previous' }
    const target = matches[0]!
    if (matches.length > 1 || target.indirection?.length || !target.val) return { kind: 'unknown' }
    if (isDefault(target.val)) return { kind: 'default' }
    const multi = (target.val as { MultiAssignRef?: { source?: Node; colno?: number } })
      .MultiAssignRef
    if (!multi) return { kind: 'value', node: target.val }
    const value = (multi.source as { RowExpr?: { args?: Node[] } } | undefined)?.RowExpr?.args?.[
      (multi.colno ?? 0) - 1
    ]
    if (!value) return { kind: 'unknown' }
    return isDefault(value) ? { kind: 'default' } : { kind: 'value', node: value }
  },
})

// The server names a user-defined type without its schema where the search path finds it. Such a
// name is qualified when it is no built-in type's and exactly one user-defined type has it.
const qualifiedParameterType = (name: string, catalog: CatalogSnapshot): string => {
  const base = name.replace(/(?:\[\])+$/u, '')
  if (base.includes('.') || catalogScalarType(base) !== null) return name
  const matches = [
    ...[
      ...catalog.enums,
      ...catalog.domains,
      ...catalog.compositeTypes,
      ...catalog.rangeTypes,
      ...catalog.tables,
      ...catalog.views,
      ...catalog.materializedViews,
    ].map((item) => `${item.schema}.${item.name}`),
    ...catalog.rangeTypes.map((item) => item.multirange),
  ].filter((qualified) => qualified.slice(qualified.indexOf('.') + 1) === base)
  return new Set(matches).size === 1 ? matches[0]! + name.slice(base.length) : name
}

const parameterSource = (
  number: number,
  column: ColumnInfo,
  parameterTypes: readonly string[] | undefined,
  catalog: CatalogSnapshot,
): CheckColumnSource => {
  const parameterType = qualifiedParameterType(parameterTypes?.[number - 1] ?? '', catalog)
  const type = catalogScalarType(column.typeName)
  // Composites are the same type when their definitions are.
  const composite = (name: string) =>
    catalogCompositeType(name, catalog.compositeTypeGraph, catalog.rangeTypes) ??
    catalogCompositeArrayType(name, catalog.compositeTypeGraph, catalog.rangeTypes)
  const same =
    type !== null
      ? type === catalogScalarType(parameterType)
      : column.typeName === parameterType ||
        (composite(column.typeName) !== null &&
          composite(column.typeName) === composite(parameterType))
  return same ? { kind: 'parameter', number } : { kind: 'unknown' }
}

const columnSource = (
  table: TableInfo,
  column: ColumnInfo,
  row: CandidateRow,
  catalog: CatalogSnapshot,
  parameterTypes: readonly string[] | undefined,
): CheckColumnSource => {
  if (row.rewritten) return { kind: 'unknown' }
  if (column.generated !== 'none') return { kind: 'generated' }
  if (row.identityDefaults && column.identity !== null) return defaultSource(column, catalog)
  const assignment = row.assignment(column.name)
  if (assignment.kind === 'default') return defaultSource(column, catalog)
  if (assignment.kind !== 'value') return { kind: assignment.kind }
  const node = assignment.node as {
    ParamRef?: { number?: number }
    A_Const?: { isnull?: boolean }
    ColumnRef?: { fields?: Node[] }
  }
  if (node.ParamRef?.number)
    return parameterSource(node.ParamRef.number, column, parameterTypes, catalog)
  if (node.A_Const?.isnull) return { kind: 'sql-null' }
  const fields = (node.ColumnRef?.fields ?? []).map(
    (field) => (field as { String?: { sval?: string } }).String?.sval,
  )
  const proposed = fields.length === 2 && fields[0] === 'excluded' ? fields[1] : undefined
  const proposedColumn = table.columns.find((item) => item.name === proposed)
  if (!row.excluded || !proposedColumn) return { kind: 'unknown' }
  const source = columnSource(table, proposedColumn, row.excluded, catalog, parameterTypes)
  if (source.kind === 'parameter')
    return parameterSource(source.number, column, parameterTypes, catalog)
  return source.kind === 'sql-null' ? source : { kind: 'unknown' }
}

const inputNeedsCoercion = (column: ColumnInfo, catalog: CatalogSnapshot): boolean => {
  let name = column.typeName
  let oid = column.typeOid
  let typeMod = column.typeMod ?? -1
  let unknownModifier = false
  const seen = new Set<number>()
  while (!seen.has(oid)) {
    seen.add(oid)
    const domain = catalog.domains.find((domain) => domain.oid === oid)
    if (!domain) break
    if (domain.baseTypeMod === undefined) unknownModifier = true
    else if (domain.baseTypeMod >= 0) typeMod = domain.baseTypeMod
    name = domain.baseTypeName
    oid = domain.baseTypeOid
  }
  const type = catalogScalarType(name)
  return (
    catalogRangeType(name, oid, catalog.domains, catalog.rangeTypes) !== null ||
    catalogMultirangeType(name, oid, catalog.domains, catalog.rangeTypes) !== null ||
    type === 'pg_catalog.name' ||
    type === 'pg_catalog."bit"' ||
    type === 'pg_catalog.varbit' ||
    type === 'pg_catalog.float4' ||
    type === 'pg_catalog.bpchar' ||
    ((type === 'pg_catalog."varchar"' || type === 'pg_catalog."numeric"') &&
      (unknownModifier || typeMod >= 0 || name.includes('(')))
  )
}

export function planCheckWrite(
  statement: Node,
  writes: readonly WriteValueLineage[],
  catalog: CatalogSnapshot | undefined,
  parameterTypes: readonly string[] | undefined,
): CheckWritePlan | null {
  return planCheckWrites(statement, writes, catalog, parameterTypes)[0] ?? null
}

// Every row a statement can write is checked, even one it may never reach: a value that violates
// a CHECK is rejected before the server decides whether a row matched or an action fired.
export function planCheckWrites(
  statement: Node,
  writes: readonly WriteValueLineage[],
  catalog: CatalogSnapshot | undefined,
  parameterTypes: readonly string[] | undefined,
): CheckWritePlan[] {
  if (!catalog) return []
  const insert = (
    statement as {
      InsertStmt?: {
        relation?: { relname?: string; schemaname?: string }
        cols?: Node[]
        selectStmt?: Node
        override?: string
        onConflictClause?: { action?: string; targetList?: Node[] }
      }
    }
  ).InsertStmt
  const update = (
    statement as {
      UpdateStmt?: { relation?: { relname?: string; schemaname?: string }; targetList?: Node[] }
    }
  ).UpdateStmt
  const merge = (
    statement as {
      MergeStmt?: {
        relation?: { relname?: string; schemaname?: string }
        mergeWhenClauses?: Node[]
      }
    }
  ).MergeStmt
  const relation = insert?.relation ?? update?.relation ?? merge?.relation
  if (!relation?.relname) return []
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
  if (resolved.length !== 1) return []
  const table = resolved[0]!
  const groups = catalogCheckGroups(
    [table],
    catalog.domains,
    [],
    catalog.enums,
    catalog.rangeTypes,
    catalog.compositeTypeGraph,
  )
  const used = new Set(groups.flatMap((group) => group.checks.flatMap(({ plan }) => plan.inputs)))
  if (!used.size) return []

  const rewrites = table.writeRewritesTree
  const rewritten = (operation: 'insert' | 'update') =>
    rewrites.insteadOf.includes(operation) || rewrites.insteadRules.includes(operation)
  const insertNames = (cols: readonly Node[] | undefined) => {
    const explicit = (cols ?? []).flatMap((node) => {
      const name = resTarget(node)?.name
      return name ? [name] : []
    })
    return explicit.length ? explicit : table.columns.map((column) => column.name)
  }
  const partialNames = (cols: readonly Node[] | undefined) =>
    new Set(
      (cols ?? []).flatMap((node) => {
        const target = resTarget(node)
        return target?.name && target.indirection?.length ? [target.name] : []
      }),
    )
  const rows: CandidateRow[] = []
  if (insert) {
    const names = insertNames(insert.cols)
    const partial = partialNames(insert.cols)
    const identityDefaults = insert.override === 'OVERRIDING_USER_VALUE'
    const select = (
      insert.selectStmt as
        | {
            SelectStmt?: {
              valuesLists?: Node[]
              targetList?: Node[]
              op?: string
            }
          }
        | undefined
    )?.SelectStmt
    const row = (values: Parameters<typeof insertRow>[2]) =>
      insertRow(names, partial, values, rewritten('insert'), identityDefaults)
    const proposed = !insert.selectStmt
      ? [row('defaults')]
      : select?.valuesLists?.length
        ? select.valuesLists.map((list) =>
            row((list as { List?: { items?: Node[] } }).List?.items ?? []),
          )
        : select?.op === 'SETOP_NONE' &&
            select.targetList?.every((node) => {
              const value = resTarget(node)?.val as { ColumnRef?: { fields?: Node[] } } | undefined
              return !value?.ColumnRef?.fields?.some((field) => 'A_Star' in field)
            })
          ? [row(select.targetList.map((node) => resTarget(node)?.val))]
          : [row('unknown')]
    rows.push(...proposed)
    if (insert.onConflictClause?.action === 'ONCONFLICT_UPDATE')
      for (const excluded of proposed)
        rows.push(
          updateRow(
            insert.onConflictClause.targetList ?? [],
            rewritten('insert') || rewritten('update'),
            excluded,
          ),
        )
  } else if (update) rows.push(updateRow(update.targetList ?? [], rewritten('update')))
  else if (merge)
    for (const node of merge.mergeWhenClauses ?? []) {
      const arm = (
        node as {
          MergeWhenClause?: {
            commandType?: string
            override?: string
            targetList?: Node[]
            values?: Node[]
          }
        }
      ).MergeWhenClause
      if (arm?.commandType === 'CMD_UPDATE')
        rows.push(updateRow(arm.targetList ?? [], rewritten('update')))
      else if (arm?.commandType === 'CMD_INSERT')
        rows.push(
          insertRow(
            insertNames(arm.targetList),
            partialNames(arm.targetList),
            arm.values?.length ? arm.values : 'defaults',
            rewritten('insert'),
            arm.override === 'OVERRIDING_USER_VALUE',
          ),
        )
    }
  return rows.map((row) => ({
    table,
    operation: row.operation,
    columns: [...used].map((name) => ({
      name,
      source: columnSource(
        table,
        table.columns.find((item) => item.name === name)!,
        row,
        catalog,
        parameterTypes,
      ),
    })),
    canPrevalidate: !row.rewritten,
  }))
}

export function planCheckInputs(
  statement: Node,
  writes: readonly WriteValueLineage[],
  catalog: CatalogSnapshot | undefined,
  parameterTypes: readonly string[] | undefined,
  inputMode: (column: ColumnInfo) => 'public' | 'skip' | undefined = () => undefined,
): CheckInputPlan[] {
  const plans = new Map<string, CheckInputPlan>()
  for (const plan of planCheckWrites(statement, writes, catalog, parameterTypes)) {
    if (!plan.canPrevalidate) continue
    const columns = parameterColumns(plan, catalog, inputMode)
    if (!columns.length) continue
    const key = JSON.stringify([plan.operation, columns])
    if (!plans.has(key)) plans.set(key, { table: plan.table, operation: plan.operation, columns })
  }
  return [...plans.values()]
}

const parameterColumns = (
  plan: CheckWritePlan,
  catalog: CatalogSnapshot | undefined,
  inputMode: (column: ColumnInfo) => 'public' | 'skip' | undefined,
): CheckInputPlan['columns'] =>
  plan.columns.flatMap(({ name, source }) => {
    if (source.kind !== 'parameter') return []
    const column = plan.table.columns.find((column) => column.name === name)!
    // A target whose parameters take a public value converts it for the evaluator itself, and
    // leaves to the database a column whose public value its CHECK adapter does not read yet.
    const mode = inputMode(column)
    if (mode === 'public') return [{ name, parameter: source.number }]
    if (mode === 'skip') return []
    if (
      catalogArrayType(
        column.typeName,
        column.typeOid,
        catalog?.domains ?? [],
        catalog?.enums ?? [],
        catalog?.rangeTypes ?? [],
        undefined,
        catalog?.compositeTypeGraph,
      )
    )
      return []
    if (catalogVectorType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogTemporalType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogPointType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogLineType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogLsegType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogMoneyType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogTsvectorType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogTsqueryType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogAclitemType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogXidType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogCidType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogPgLsnType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogInternalCharType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogTidType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogXid8Type(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogSnapshotType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogRangeType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogMultirangeType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogJsonType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogJsonbType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogXmlType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogJsonpathType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogOidType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogPolygonType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogPathType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogCircleType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalogBoxType(column.typeName, column.typeOid, catalog?.domains ?? [])) return []
    if (catalog && inputNeedsCoercion(column, catalog)) return []
    return [{ name, parameter: source.number }]
  })

/**
 * What the enforced CHECKs of the written tables say about a statement's
 * parameters, by parameter index: a parameter written to a column takes the
 * literals the column admits, and parameters written to one row together
 * take the cases of that row, projected onto the columns they supply. The
 * columns they leave to defaults or to the stored row may hold anything, so
 * dropping them only widens the cases.
 */
export function checkInputCases(
  plans: readonly CheckInputPlan[],
  catalog: CheckCaseCatalog,
  parameterCount: number,
): OutputCheckCases | undefined {
  const restrictions = new Map<number, OutputLiterals[]>()
  const groups: OutputCaseGroup[] = []
  for (const plan of plans) {
    const cases = tableCheckCases(catalog, plan.table.schema, plan.table.name, 'written')
    for (const { name, parameter } of plan.columns) {
      const column = cases.columns.get(name)
      if (!column?.kind || column.summary.values === null) continue
      const list = restrictions.get(parameter - 1) ?? []
      list.push({ kind: column.kind, values: column.summary.values })
      restrictions.set(parameter - 1, list)
    }
    for (const group of cases.groups) {
      const selected = plan.columns.flatMap(({ name, parameter }) => {
        const position = group.columns.indexOf(name)
        return position < 0 ? [] : [{ index: parameter - 1, position }]
      })
      const indices = new Set(selected.map(({ index }) => index))
      if (selected.length < 2 || indices.size < selected.length) continue
      selected.sort((left, right) => left.index - right.index)
      const merged = projectCases(
        group,
        selected.map(({ position }) => position),
        cases,
      )
      if (merged.length < 2) continue
      groups.push({
        columns: selected.map(({ index }) => index),
        kinds: selected.map(({ position }) => cases.columns.get(group.columns[position]!)!.kind),
        cases: merged,
      })
    }
  }
  // A parameter written to several columns must pass each one's CHECKs.
  const literals = Array.from({ length: parameterCount }, (_, index): OutputLiterals | null => {
    const list = restrictions.get(index)
    if (!list?.length || list.some((item) => item.kind !== list[0]!.kind)) return null
    const values = list
      .slice(1)
      .reduce<readonly string[]>(
        (kept, item) => kept.filter((value) => item.values.includes(value)),
        list[0]!.values,
      )
    return { kind: list[0]!.kind, values }
  })
  if (groups.length === 0 && literals.every((item) => item === null)) return undefined
  return { literals, groups }
}
