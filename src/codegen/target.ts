import type { CatalogSnapshot } from '../catalog/types.js'
import type { QueryAnalysisItem } from '../query-analysis.js'
import type { SchemaRelationAnalyses } from '../schema-analysis.js'

export interface CodegenSchemaInput {
  catalog: CatalogSnapshot
  relations: SchemaRelationAnalyses
}

export interface CodegenOutput {
  kind: string
  path: string
}

export interface QueryCodegenRoute {
  target: string
  outputs: readonly CodegenOutput[]
}

export interface CodegenArtifact extends CodegenOutput {
  content: string
}

export interface CodegenDiagnostic {
  code: string
  severity: 'warning' | 'error'
  queryId: string
  message: string
}

export interface CodegenRenderResult {
  artifacts: readonly CodegenArtifact[]
  diagnostics: readonly CodegenDiagnostic[]
}

export interface CodegenTarget {
  id: string
  key: string
  outputRoots: readonly string[]
  routeQuery(path: string): QueryCodegenRoute | undefined
  renderQueries(
    analyses: readonly QueryAnalysisItem[],
    route: QueryCodegenRoute,
  ): CodegenRenderResult
  renderSchema?(input: CodegenSchemaInput): CodegenRenderResult
}
