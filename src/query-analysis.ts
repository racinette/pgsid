import { createHash } from 'node:crypto'
import {
  compareShapes,
  gateContract,
  type DescribeStatement,
  type DescribedShape,
  type GateOutcome,
} from './contract-gate.js'
import type { EntityId } from './catalog/types.js'
import type { QueryBatchItem, QueryBatchState } from './query-batch.js'
import {
  inferQueryContract,
  UnsupportedNodeError,
  type EvalWarning,
  type QueryContract,
  type WalkOptions,
} from './query/nullability-walk.js'
import { extractDeps } from './query/resolver.js'
import type { DepCatalog, NullabilityCatalog } from './query/types.js'
import {
  traceValueLineage,
  UnsupportedValueLineageError,
  type OutputValueLineage,
  type ValueLineageCatalog,
} from './query/value-lineage.js'

export type QueryAnalysisCatalog = NullabilityCatalog & DepCatalog & ValueLineageCatalog

export type QueryAnalysisDiagnosticCode =
  | 'contract-shape'
  | 'dependency-error'
  | 'describe-error'
  | 'evaluation-warning'
  | 'lineage-error'
  | 'lineage-shape'
  | 'lineage-unsupported'
  | 'nullability-error'
  | 'nullability-unsupported'
  | 'parameter-types-shape'

export interface QueryAnalysisDiagnostic {
  code: QueryAnalysisDiagnosticCode
  severity: 'warning' | 'error'
  message: string
}

export interface QueryAnalysisResult {
  description: DescribedShape | null
  contract: QueryContract
  contractGate: GateOutcome | null
  rawLineage: readonly OutputValueLineage[] | null
  lineageGate: GateOutcome | null
  dependencies: readonly EntityId[]
  diagnostics: readonly QueryAnalysisDiagnostic[]
}

export interface QueryAnalysisItem extends QueryAnalysisResult {
  query: QueryBatchItem
  cacheKey: string
  resultHash: string
}

export interface QueryAnalysisCacheEntry {
  result: QueryAnalysisResult
  resultHash: string
}

export interface QueryAnalysisState {
  analyses: Readonly<Record<string, QueryAnalysisItem>>
  cache: Readonly<Record<string, QueryAnalysisCacheEntry>>
}

export type QueryAnalysisEvent =
  | { kind: 'analysis-added'; analysis: QueryAnalysisItem }
  | { kind: 'analysis-changed'; previous: QueryAnalysisItem; analysis: QueryAnalysisItem }
  | { kind: 'analysis-removed'; analysis: QueryAnalysisItem }
  | {
      kind: 'analysis-diagnostics-changed'
      queryId: string
      previous: readonly QueryAnalysisDiagnostic[]
      diagnostics: readonly QueryAnalysisDiagnostic[]
    }

export interface QueryAnalysisStats {
  cacheHits: number
  cacheMisses: number
}

export interface QueryAnalysisUpdate {
  state: QueryAnalysisState
  events: readonly QueryAnalysisEvent[]
  stats: QueryAnalysisStats
}

export interface ReconcileQueryAnalysisOptions {
  schemaKey: string
  analysisKey: string
  catalog: QueryAnalysisCatalog
  searchPath: readonly string[]
  describe: DescribeStatement
  walkOptions?: Pick<WalkOptions, 'evaluate' | 'resolveColumnTypes'>
}

export const EMPTY_QUERY_ANALYSIS_STATE: QueryAnalysisState = { analyses: {}, cache: {} }

export async function reconcileQueryAnalysis(
  batch: QueryBatchState,
  options: ReconcileQueryAnalysisOptions,
  previous: QueryAnalysisState = EMPTY_QUERY_ANALYSIS_STATE,
): Promise<QueryAnalysisUpdate> {
  const queries = Object.values(batch.files)
    .flatMap((file) => file.queries)
    .sort((left, right) => compareText(left.id, right.id))
  const analyses: Record<string, QueryAnalysisItem> = {}
  const cache: Record<string, QueryAnalysisCacheEntry> = {}
  const stats: QueryAnalysisStats = { cacheHits: 0, cacheMisses: 0 }

  for (const query of queries) {
    const cacheKey = analysisCacheKey(query, options)
    let entry = cache[cacheKey] ?? previous.cache[cacheKey]
    if (entry) {
      stats.cacheHits++
    } else {
      const result = await analyzeQuery(query, options)
      entry = { result, resultHash: hash(JSON.stringify(semanticResult(result))) }
      stats.cacheMisses++
    }
    cache[cacheKey] = entry
    analyses[query.id] = { query, cacheKey, resultHash: entry.resultHash, ...entry.result }
  }

  const state = { analyses, cache }
  return { state, events: diffAnalysis(previous, state), stats }
}

const analyzeQuery = async (
  query: QueryBatchItem,
  options: ReconcileQueryAnalysisOptions,
): Promise<QueryAnalysisResult> => {
  const diagnostics: QueryAnalysisDiagnostic[] = []
  const description = await describe(query, options.describe, diagnostics)
  const parameterTypes = validParameterTypes(description, diagnostics)
  const dependencies = dependenciesOf(query, options, diagnostics)
  const evalWarnings: EvalWarning[] = []
  const walkOptions: WalkOptions = {
    ...options.walkOptions,
    ...(parameterTypes ? { paramTypes: parameterTypes } : {}),
    evalWarnings,
  }

  let contract: QueryContract
  let contractGate: GateOutcome | null = null
  try {
    const inferred = await inferQueryContract(query.definition.stmt, options.catalog, walkOptions)
    const gated = await gateContract(query.definition.sql, inferred, fixedDescription(description))
    contractGate = gated.gate
    contract = withoutGate(gated)
    if (gated.gate.kind !== 'agreed' && gated.gate.kind !== 'undescribed') {
      diagnostics.push({
        code: 'contract-shape',
        severity: 'error',
        message: gateMessage('Nullability contract', gated.gate),
      })
    }
  } catch (error) {
    contract = degradedContract(description)
    diagnostics.push(
      error instanceof UnsupportedNodeError
        ? {
            code: 'nullability-unsupported',
            severity: 'warning',
            message: error.message,
          }
        : {
            code: 'nullability-error',
            severity: 'error',
            message: errorMessage(error),
          },
    )
  }

  for (const warning of evalWarnings) {
    diagnostics.push({
      code: 'evaluation-warning',
      severity: 'warning',
      message: `${warning.round}: ${warning.detail}`,
    })
  }

  let rawLineage: readonly OutputValueLineage[] | null = null
  let lineageGate: GateOutcome | null = null
  try {
    const traced = traceValueLineage(query.definition.stmt, options.catalog, {
      parameterTypes,
    })
    if (description) {
      lineageGate = compareShapes(
        { columns: traced.map((output) => output.name), params: description.params },
        description,
      )
      if (lineageGate.kind === 'agreed') rawLineage = traced
      else {
        diagnostics.push({
          code: 'lineage-shape',
          severity: 'warning',
          message: gateMessage('Value lineage', lineageGate),
        })
      }
    }
  } catch (error) {
    diagnostics.push(
      error instanceof UnsupportedValueLineageError
        ? {
            code: 'lineage-unsupported',
            severity: 'warning',
            message: error.message,
          }
        : {
            code: 'lineage-error',
            severity: 'error',
            message: errorMessage(error),
          },
    )
  }

  return {
    description,
    contract,
    contractGate,
    rawLineage,
    lineageGate,
    dependencies,
    diagnostics,
  }
}

const describe = async (
  query: QueryBatchItem,
  describeStatement: DescribeStatement,
  diagnostics: QueryAnalysisDiagnostic[],
): Promise<DescribedShape | null> => {
  try {
    return await describeStatement(query.definition.sql)
  } catch (error) {
    diagnostics.push({ code: 'describe-error', severity: 'error', message: errorMessage(error) })
    return null
  }
}

const validParameterTypes = (
  description: DescribedShape | null,
  diagnostics: QueryAnalysisDiagnostic[],
): readonly string[] | undefined => {
  const types = description?.parameterTypes
  if (!types) return undefined
  if (types.length === description.params) return types
  diagnostics.push({
    code: 'parameter-types-shape',
    severity: 'error',
    message: `Description reported ${description.params} parameters but ${types.length} parameter types`,
  })
  return undefined
}

const dependenciesOf = (
  query: QueryBatchItem,
  options: ReconcileQueryAnalysisOptions,
  diagnostics: QueryAnalysisDiagnostic[],
): readonly EntityId[] => {
  try {
    return extractDeps(query.definition.stmt, options.catalog, [...options.searchPath])
  } catch (error) {
    diagnostics.push({ code: 'dependency-error', severity: 'error', message: errorMessage(error) })
    return []
  }
}

const fixedDescription =
  (description: DescribedShape | null): DescribeStatement =>
  async () => {
    if (!description) throw new Error('PostgreSQL did not describe the statement')
    return description
  }

const degradedContract = (description: DescribedShape | null): QueryContract => ({
  outputs: (description?.columns ?? []).map((name) => ({ name, notNull: false })),
  params: Array.from({ length: description?.params ?? 0 }, (_, index) => ({
    number: index + 1,
    notNull: false,
  })),
  paramRejectionSets: [],
  outputPresenceGroups: [],
  alwaysRaises: false,
})

const withoutGate = <T extends QueryContract & { gate: GateOutcome }>({
  gate: _gate,
  ...contract
}: T): QueryContract => contract

const analysisCacheKey = (query: QueryBatchItem, options: ReconcileQueryAnalysisOptions): string =>
  hash(
    JSON.stringify([
      query.analysisHash,
      options.schemaKey,
      options.analysisKey,
      options.searchPath,
    ]),
  )

const semanticResult = (result: QueryAnalysisResult): unknown => ({
  description: result.description,
  contract: result.contract,
  contractGate: result.contractGate,
  rawLineage: result.rawLineage,
  lineageGate: result.lineageGate,
  dependencies: result.dependencies,
})

const diffAnalysis = (
  previous: QueryAnalysisState,
  current: QueryAnalysisState,
): QueryAnalysisEvent[] => {
  const events: QueryAnalysisEvent[] = []
  for (const id of new Set([...Object.keys(previous.analyses), ...Object.keys(current.analyses)])) {
    const before = previous.analyses[id]
    const analysis = current.analyses[id]
    if (!before && analysis) events.push({ kind: 'analysis-added', analysis })
    else if (before && !analysis) events.push({ kind: 'analysis-removed', analysis: before })
    else if (before && analysis && before.resultHash !== analysis.resultHash) {
      events.push({ kind: 'analysis-changed', previous: before, analysis })
    }
    const beforeDiagnostics = before?.diagnostics ?? []
    const diagnostics = analysis?.diagnostics ?? []
    if (JSON.stringify(beforeDiagnostics) !== JSON.stringify(diagnostics)) {
      events.push({
        kind: 'analysis-diagnostics-changed',
        queryId: id,
        previous: beforeDiagnostics,
        diagnostics,
      })
    }
  }
  return events.sort((left, right) => compareText(eventKey(left), eventKey(right)))
}

const eventKey = (event: QueryAnalysisEvent): string =>
  event.kind === 'analysis-diagnostics-changed'
    ? `${event.queryId}\u0000diagnostics`
    : `${event.analysis.query.id}\u0000${event.kind}`

const gateMessage = (
  subject: string,
  outcome: Exclude<GateOutcome, { kind: 'agreed' }>,
): string => {
  if (outcome.kind === 'undescribed') return `${subject} was not described: ${outcome.detail}`
  if (outcome.kind === 'param-arity') {
    return `${subject} has ${outcome.engine} parameters; PostgreSQL described ${outcome.database}`
  }
  if (outcome.kind === 'column-order') {
    return `${subject} column ${outcome.at + 1} disagrees with PostgreSQL`
  }
  return `${subject} has ${outcome.engine.length} columns; PostgreSQL described ${outcome.database.length}`
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const hash = (content: string): string => createHash('sha256').update(content).digest('hex')

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0
