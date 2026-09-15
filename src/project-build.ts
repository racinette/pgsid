import { createHash } from 'node:crypto'
import type { SqlDiagnostic } from './errors.js'
import type { CatalogSnapshot } from './catalog/types.js'
import {
  type CodegenArtifact,
  type CodegenDiagnostic,
  type CodegenTarget,
} from './codegen/target.js'
import {
  EMPTY_QUERY_ANALYSIS_STATE,
  reconcileQueryAnalysis,
  type QueryAnalysisDiagnostic,
  type QueryAnalysisState,
  type ReconcileQueryAnalysisOptions,
} from './query-analysis.js'
import {
  EMPTY_QUERY_BATCH_STATE,
  reconcileQueryBatch,
  type QueryBatchDiagnostic,
  type QueryBatchState,
  type QuerySourceInput,
} from './query-batch.js'

export interface ProjectArtifact {
  path: string
  sourcePath: string
  target: string
  kind: string
  content: string
  hash: string
}

export type ProjectDiagnostic =
  | { source: 'schema'; path: string | null; diagnostic: SqlDiagnostic }
  | { source: 'query'; path: string; diagnostic: QueryBatchDiagnostic }
  | { source: 'analysis'; queryId: string; diagnostic: QueryAnalysisDiagnostic }
  | {
      source: 'codegen'
      target: string
      queryId: string
      diagnostic: CodegenDiagnostic
    }

export interface ProjectRenderCacheEntry {
  artifacts: readonly CodegenArtifact[]
  diagnostics: readonly CodegenDiagnostic[]
}

export interface ProjectSchemaRenderCacheEntry {
  key: string
  artifacts: readonly CodegenArtifact[]
  diagnostics: readonly CodegenDiagnostic[]
}

export interface ProjectBuildState {
  queryBatch: QueryBatchState
  queryAnalysis: QueryAnalysisState
  artifacts: Readonly<Record<string, ProjectArtifact>>
  renderCache: Readonly<Record<string, ProjectRenderCacheEntry>>
  schemaRenderCache: Readonly<Record<string, ProjectSchemaRenderCacheEntry>>
  diagnostics: readonly ProjectDiagnostic[]
}

export type ProjectBuildEvent =
  | { kind: 'artifact-added'; artifact: ProjectArtifact }
  | { kind: 'artifact-changed'; previous: ProjectArtifact; artifact: ProjectArtifact }
  | { kind: 'artifact-removed'; artifact: ProjectArtifact }
  | {
      kind: 'project-diagnostics-changed'
      previous: readonly ProjectDiagnostic[]
      diagnostics: readonly ProjectDiagnostic[]
    }

export interface ProjectBuildStats {
  parseCacheHits: number
  parseCacheMisses: number
  analysisCacheHits: number
  analysisCacheMisses: number
  renderCacheHits: number
  renderCacheMisses: number
}

export interface ProjectBuildUpdate {
  state: ProjectBuildState
  events: readonly ProjectBuildEvent[]
  stats: ProjectBuildStats
}

export interface ReconcileProjectBuildOptions {
  targets: readonly CodegenTarget[]
  analysis: ReconcileQueryAnalysisOptions
  schemaDiagnostics?: readonly ProjectSchemaDiagnostic[]
  schema?: {
    catalog: CatalogSnapshot
    key: string
    sourcePath: string
  }
}

export interface ProjectSchemaDiagnostic {
  path: string | null
  diagnostic: SqlDiagnostic
}

export const EMPTY_PROJECT_BUILD_STATE: ProjectBuildState = {
  queryBatch: EMPTY_QUERY_BATCH_STATE,
  queryAnalysis: EMPTY_QUERY_ANALYSIS_STATE,
  artifacts: {},
  renderCache: {},
  schemaRenderCache: {},
  diagnostics: [],
}

export async function reconcileProjectBuild(
  sources: readonly QuerySourceInput[],
  options: ReconcileProjectBuildOptions,
  previous: ProjectBuildState = EMPTY_PROJECT_BUILD_STATE,
): Promise<ProjectBuildUpdate> {
  const batch = await reconcileQueryBatch(sources, previous.queryBatch)
  const analysis = await reconcileQueryAnalysis(
    batch.state,
    options.analysis,
    previous.queryAnalysis,
  )
  const diagnostics = collectDiagnostics(
    batch.state,
    analysis.state,
    options.schemaDiagnostics ?? [],
  )
  const artifacts: Record<string, ProjectArtifact> = {}
  const renderCache: Record<string, ProjectRenderCacheEntry> = {}
  let renderCacheHits = 0
  let renderCacheMisses = 0
  const schemaRenderCache: Record<string, ProjectSchemaRenderCacheEntry> = {}
  const targets = targetIndex(options.targets)

  if (options.schema) {
    for (const target of options.targets) {
      if (!target.renderSchema) continue
      const renderKey = hash(JSON.stringify([target.key, options.schema.key]))
      let rendered = previous.schemaRenderCache[target.id]
      if (rendered?.key === renderKey) renderCacheHits++
      else {
        rendered = { key: renderKey, ...target.renderSchema(options.schema.catalog) }
        renderCacheMisses++
      }
      schemaRenderCache[target.id] = rendered
      diagnostics.push(
        ...rendered.diagnostics.map((diagnostic) => ({
          source: 'codegen' as const,
          target: target.id,
          queryId: diagnostic.queryId,
          diagnostic,
        })),
      )
      if (rendered.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) continue
      for (const artifact of rendered.artifacts) {
        addArtifact(artifacts, artifact, options.schema.sourcePath, target.id)
      }
    }
  }

  for (const file of Object.values(batch.state.files).sort((a, b) => compareText(a.path, b.path))) {
    const fileAnalyses = file.queries
      .map((query) => analysis.state.analyses[query.id]!)
      .filter(Boolean)
    const hasErrors =
      file.diagnostics.length > 0 ||
      fileAnalyses.some((item) =>
        item.diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
      )
    if (hasErrors) continue

    for (const route of file.routes) {
      const target = targets[route.target]
      if (!target) throw new Error(`Unknown codegen target ${JSON.stringify(route.target)}`)
      const renderKey = hash(
        JSON.stringify([
          target.key,
          route,
          fileAnalyses.map((item) => [item.query.analysisHash, item.resultHash]),
        ]),
      )
      let rendered = renderCache[renderKey] ?? previous.renderCache[renderKey]
      if (rendered) renderCacheHits++
      else {
        rendered = target.renderQueries(fileAnalyses, route)
        renderCacheMisses++
      }
      renderCache[renderKey] = rendered
      diagnostics.push(
        ...rendered.diagnostics.map((diagnostic) => ({
          source: 'codegen' as const,
          target: target.id,
          queryId: diagnostic.queryId,
          diagnostic,
        })),
      )
      if (rendered.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) continue
      for (const artifact of rendered.artifacts) {
        addArtifact(artifacts, artifact, file.path, target.id)
      }
    }
  }

  diagnostics.sort((left, right) => compareText(diagnosticKey(left), diagnosticKey(right)))
  const state = {
    queryBatch: batch.state,
    queryAnalysis: analysis.state,
    artifacts,
    renderCache,
    schemaRenderCache,
    diagnostics,
  }
  return {
    state,
    events: diffProject(previous, state),
    stats: {
      parseCacheHits: batch.stats.cacheHits,
      parseCacheMisses: batch.stats.cacheMisses,
      analysisCacheHits: analysis.stats.cacheHits,
      analysisCacheMisses: analysis.stats.cacheMisses,
      renderCacheHits,
      renderCacheMisses,
    },
  }
}

const collectDiagnostics = (
  batch: QueryBatchState,
  analysis: QueryAnalysisState,
  schema: readonly ProjectSchemaDiagnostic[],
): ProjectDiagnostic[] => [
  ...schema.map(({ path, diagnostic }) => ({ source: 'schema' as const, path, diagnostic })),
  ...Object.values(batch.files).flatMap((file) =>
    file.diagnostics.map((diagnostic) => ({
      source: 'query' as const,
      path: file.path,
      diagnostic,
    })),
  ),
  ...Object.values(analysis.analyses).flatMap((item) =>
    item.diagnostics.map((diagnostic) => ({
      source: 'analysis' as const,
      queryId: item.query.id,
      diagnostic,
    })),
  ),
]

const addArtifact = (
  artifacts: Record<string, ProjectArtifact>,
  artifact: CodegenArtifact,
  sourcePath: string,
  target: string,
): void => {
  const owner = artifacts[artifact.path]
  if (owner) {
    throw new Error(
      `Codegen targets ${JSON.stringify(owner.target)} and ${JSON.stringify(target)} both emit ${JSON.stringify(artifact.path)}`,
    )
  }
  artifacts[artifact.path] = {
    ...artifact,
    sourcePath,
    target,
    hash: hash(artifact.content),
  }
}

const targetIndex = (targets: readonly CodegenTarget[]): Record<string, CodegenTarget> => {
  const result: Record<string, CodegenTarget> = {}
  for (const target of targets) {
    if (result[target.id]) throw new Error(`Duplicate codegen target ${JSON.stringify(target.id)}`)
    result[target.id] = target
  }
  return result
}

const diffProject = (
  previous: ProjectBuildState,
  current: ProjectBuildState,
): ProjectBuildEvent[] => {
  const events: ProjectBuildEvent[] = []
  for (const path of new Set([
    ...Object.keys(previous.artifacts),
    ...Object.keys(current.artifacts),
  ])) {
    const before = previous.artifacts[path]
    const artifact = current.artifacts[path]
    if (!before && artifact) events.push({ kind: 'artifact-added', artifact })
    else if (before && !artifact) events.push({ kind: 'artifact-removed', artifact: before })
    else if (before && artifact && before.hash !== artifact.hash) {
      events.push({ kind: 'artifact-changed', previous: before, artifact })
    }
  }
  if (JSON.stringify(previous.diagnostics) !== JSON.stringify(current.diagnostics)) {
    events.push({
      kind: 'project-diagnostics-changed',
      previous: previous.diagnostics,
      diagnostics: current.diagnostics,
    })
  }
  return events.sort((left, right) => compareText(eventKey(left), eventKey(right)))
}

const eventKey = (event: ProjectBuildEvent): string =>
  event.kind === 'project-diagnostics-changed'
    ? '\uffffdiagnostics'
    : `${event.artifact.path}\u0000${event.kind}`

const diagnosticKey = (diagnostic: ProjectDiagnostic): string =>
  diagnostic.source === 'query' || diagnostic.source === 'schema'
    ? `${diagnostic.path ?? ''}\u0000${diagnostic.source}\u0000${diagnostic.diagnostic.code ?? ''}`
    : `${diagnostic.queryId}\u0000${diagnostic.source}\u0000${diagnostic.source === 'codegen' ? diagnostic.target : ''}\u0000${diagnostic.diagnostic.code}`

const hash = (content: string): string => createHash('sha256').update(content).digest('hex')
const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0
