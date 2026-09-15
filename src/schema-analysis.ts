import { parseSql } from './ast.js'
import type { CatalogSnapshot, ViewInfo } from './catalog/types.js'
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
  kind: 'view' | 'materialized-view'
  columns: readonly SchemaColumnAnalysis[]
  outputPresenceGroups: QueryContract['outputPresenceGroups']
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
  return analyses
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
