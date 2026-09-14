import { createHash } from 'node:crypto'
import { dirname, extname, relative, sep } from 'node:path'
import type { JsonSchemaDocument, Config } from './config/schema.js'
import {
  renderTypescriptQueryArtifacts,
  type TypescriptQueryDiagnostic,
} from './codegen/typescript-query.js'
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
  kind: 'types' | 'wrappers'
  content: string
  hash: string
}

export type ProjectDiagnostic =
  | { source: 'query'; path: string; diagnostic: QueryBatchDiagnostic }
  | { source: 'analysis'; queryId: string; diagnostic: QueryAnalysisDiagnostic }
  | { source: 'codegen'; queryId: string; diagnostic: TypescriptQueryDiagnostic }

export interface ProjectRenderCacheEntry {
  types: string
  wrappers: string
  diagnostics: readonly TypescriptQueryDiagnostic[]
}

export interface ProjectBuildState {
  queryBatch: QueryBatchState
  queryAnalysis: QueryAnalysisState
  artifacts: Readonly<Record<string, ProjectArtifact>>
  renderCache: Readonly<Record<string, ProjectRenderCacheEntry>>
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
  config: Config
  schemas: Readonly<Record<string, JsonSchemaDocument>>
  codegenKey: string
  analysis: ReconcileQueryAnalysisOptions
}

export const EMPTY_PROJECT_BUILD_STATE: ProjectBuildState = {
  queryBatch: EMPTY_QUERY_BATCH_STATE,
  queryAnalysis: EMPTY_QUERY_ANALYSIS_STATE,
  artifacts: {},
  renderCache: {},
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
  const diagnostics = collectDiagnostics(batch.state, analysis.state)
  const artifacts: Record<string, ProjectArtifact> = {}
  const renderCache: Record<string, ProjectRenderCacheEntry> = {}
  let renderCacheHits = 0
  let renderCacheMisses = 0

  for (const file of Object.values(batch.state.files).sort((a, b) => compareText(a.path, b.path))) {
    const fileAnalyses = file.queries
      .map((query) => analysis.state.analyses[query.id]!)
      .filter(Boolean)
    if (!file.output) continue
    const hasErrors =
      file.diagnostics.length > 0 ||
      fileAnalyses.some((item) =>
        item.diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
      )
    if (hasErrors) continue

    const renderKey = hash(
      JSON.stringify([
        options.codegenKey,
        file.output,
        fileAnalyses.map((item) => [item.query.semanticHash, item.resultHash]),
      ]),
    )
    let rendered = renderCache[renderKey] ?? previous.renderCache[renderKey]
    if (rendered) renderCacheHits++
    else {
      const result = renderTypescriptQueryArtifacts(fileAnalyses, options.config, options.schemas, {
        typesModuleSpecifier: file.output.wrappers
          ? moduleSpecifier(file.output.wrappers, file.output.types)
          : undefined,
      })
      rendered = {
        types: result.types ?? '',
        wrappers: result.wrappers ?? '',
        diagnostics: result.diagnostics,
      }
      renderCacheMisses++
    }
    renderCache[renderKey] = rendered
    diagnostics.push(
      ...rendered.diagnostics.map((diagnostic) => ({
        source: 'codegen' as const,
        queryId: diagnostic.queryId,
        diagnostic,
      })),
    )
    if (rendered.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) continue
    addArtifact(artifacts, file.output.types, file.path, 'types', rendered.types)
    if (file.output.wrappers) {
      addArtifact(artifacts, file.output.wrappers, file.path, 'wrappers', rendered.wrappers)
    }
  }

  diagnostics.sort((left, right) => compareText(diagnosticKey(left), diagnosticKey(right)))
  const state = {
    queryBatch: batch.state,
    queryAnalysis: analysis.state,
    artifacts,
    renderCache,
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
): ProjectDiagnostic[] => [
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
  path: string,
  sourcePath: string,
  kind: ProjectArtifact['kind'],
  content: string,
): void => {
  artifacts[path] = { path, sourcePath, kind, content, hash: hash(content) }
}

const moduleSpecifier = (wrapperPath: string, typesPath: string): string => {
  let path = relative(dirname(wrapperPath), typesPath).split(sep).join('/')
  const extension = extname(path)
  if (extension) path = `${path.slice(0, -extension.length)}.js`
  if (!path.startsWith('.')) path = `./${path}`
  return path
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
  diagnostic.source === 'query'
    ? `${diagnostic.path}\u0000query\u0000${diagnostic.diagnostic.code}`
    : `${diagnostic.queryId}\u0000${diagnostic.source}\u0000${diagnostic.diagnostic.code}`

const hash = (content: string): string => createHash('sha256').update(content).digest('hex')
const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0
