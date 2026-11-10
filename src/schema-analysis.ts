import { parseSql } from './ast.js'
import type { CatalogSnapshot, TableInfo, ViewInfo } from './catalog/types.js'
import {
  domainCheckLiterals,
  tableColumnCases,
  type OutputCheckCases,
  type OutputLiterals,
} from './query/check-cases.js'
import type { CheckCaseCatalog } from './query/types.js'
import type { QueryAnalysisCatalog } from './query-analysis.js'
import {
  inferQueryContract,
  type QueryContract,
  type WalkOptions,
} from './query/nullability-walk.js'
import {
  traceValueLineage,
  type OutputValueLineage,
  type ValueLineage,
} from './query/value-lineage.js'

export interface SchemaColumnAnalysis {
  name: string
  notNull: boolean
  alwaysNull?: boolean
  value: ValueLineage | null
}

export interface SchemaRelationAnalysis {
  schema: string
  name: string
  kind: 'view' | 'materialized-view' | 'table'
  columns: readonly SchemaColumnAnalysis[]
  outputPresenceGroups: QueryContract['outputPresenceGroups']
  /** What CHECKs say about the rows read, by column position. */
  outputCases?: OutputCheckCases
  /** What a table's enforced CHECKs say about the rows a write may store. */
  writeCases?: OutputCheckCases
}

export type SchemaRelationAnalyses = Readonly<Record<string, SchemaRelationAnalysis>>

export async function analyzeSchemaRelations(
  snapshot: CatalogSnapshot,
  catalog: QueryAnalysisCatalog,
  options: Pick<WalkOptions, 'evaluate' | 'materializedViews' | 'resolveColumnTypes'> = {},
): Promise<SchemaRelationAnalyses> {
  const relations = [
    ...snapshot.views.map((relation) => ({ relation, kind: 'view' as const })),
    ...snapshot.materializedViews.map((relation) => ({
      relation,
      kind: 'materialized-view' as const,
    })),
  ].sort((left, right) => compareText(relationKey(left.relation), relationKey(right.relation)))
  const analyses: Record<string, SchemaRelationAnalysis> = {}
  for (const { relation, kind } of relations) {
    analyses[relationKey(relation)] = await analyzeRelation(relation, kind, catalog, options)
  }
  if ('resolveColumnEnumLabels' in catalog)
    for (const table of [...snapshot.tables].sort((left, right) =>
      compareText(relationKey(left), relationKey(right)),
    ))
      analyses[relationKey(table)] = analyzeTable(
        table,
        catalog as QueryAnalysisCatalog & CheckCaseCatalog,
      )
  return analyses
}

/** The literals each domain's CHECKs admit, keyed `schema.name`, where they narrow it. */
export type SchemaDomainLiterals = Readonly<Record<string, OutputLiterals>>

export function analyzeSchemaDomains(
  snapshot: CatalogSnapshot,
  catalog: QueryAnalysisCatalog,
): SchemaDomainLiterals {
  if (!('resolveDomainCheckFacts' in catalog)) return {}
  const literals: Record<string, OutputLiterals> = {}
  for (const domain of snapshot.domains) {
    const found = domainCheckLiterals(
      catalog as QueryAnalysisCatalog & CheckCaseCatalog,
      domain.schema,
      domain.name,
    )
    if (found) literals[relationKey(domain)] = found
  }
  return literals
}

// A table's rows need no walk: its stored rows satisfy its validated CHECKs
// (and those of its inheritance tree), and the rows a write stores its
// enforced ones.
const analyzeTable = (table: TableInfo, catalog: CheckCaseCatalog): SchemaRelationAnalysis => {
  const names = table.columns.map((column) => column.name)
  const outputCases = tableColumnCases(catalog, table.schema, table.name, names, 'stored')
  const writeCases = tableColumnCases(catalog, table.schema, table.name, names, 'written')
  return {
    schema: table.schema,
    name: table.name,
    kind: 'table',
    columns: table.columns.map((column) => ({
      name: column.name,
      notNull: column.notNull,
      value: null,
    })),
    outputPresenceGroups: [],
    ...(outputCases ? { outputCases } : {}),
    ...(writeCases ? { writeCases } : {}),
  }
}

const analyzeRelation = async (
  relation: ViewInfo,
  kind: SchemaRelationAnalysis['kind'],
  catalog: QueryAnalysisCatalog,
  options: Pick<WalkOptions, 'evaluate' | 'materializedViews' | 'resolveColumnTypes'>,
): Promise<SchemaRelationAnalysis> => {
  const parsed = await parseSql(
    `SELECT * FROM ${quoteIdentifier(relation.schema)}.${quoteIdentifier(relation.name)}`,
  )
  const statement = parsed.stmts?.[0]?.stmt
  if (!statement) return fallback(relation, kind)

  let contract: QueryContract | null = null
  try {
    const inferred = await inferQueryContract(statement, catalog, options)
    if (matchesColumns(inferred.outputs, relation)) contract = inferred
  } catch {
    contract = null
  }

  let lineage: readonly OutputValueLineage[] | null = null
  try {
    const traced = traceValueLineage(statement, catalog)
    if (matchesColumns(traced, relation)) lineage = traced
  } catch {
    lineage = null
  }

  return {
    schema: relation.schema,
    name: relation.name,
    kind,
    columns: relation.columns.map((column, index) => ({
      name: column.name,
      notNull: contract?.outputs[index]?.notNull ?? false,
      ...(contract?.outputs[index]?.alwaysNull ? { alwaysNull: true } : {}),
      value: lineage?.[index]?.value ?? null,
    })),
    outputPresenceGroups: contract?.outputPresenceGroups ?? [],
    ...(contract?.outputCases ? { outputCases: contract.outputCases } : {}),
  }
}

const fallback = (
  relation: ViewInfo,
  kind: SchemaRelationAnalysis['kind'],
): SchemaRelationAnalysis => ({
  schema: relation.schema,
  name: relation.name,
  kind,
  columns: relation.columns.map((column) => ({
    name: column.name,
    notNull: false,
    value: null,
  })),
  outputPresenceGroups: [],
})

const matchesColumns = (outputs: readonly { name: string }[], relation: ViewInfo): boolean =>
  outputs.length === relation.columns.length &&
  outputs.every((output, index) => output.name === relation.columns[index]!.name)

const relationKey = (relation: Pick<ViewInfo, 'schema' | 'name'>): string =>
  `${relation.schema}.${relation.name}`

const quoteIdentifier = (value: string): string => `"${value.replaceAll('"', '""')}"`

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0
