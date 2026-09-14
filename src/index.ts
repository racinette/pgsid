// ---------------------------------------------------------------------------
// The package entry point.
//
// `tsup` builds this file and `pnpm dev` runs it, and for a long time it did
// not exist: nothing under `src/` called `inferNullability`, so the engine
// had no boundary, and a manifest that could not resolve `pgsql-deparser` at
// runtime went unnoticed for the same reason.
//
// WHAT THIS EXPORTS IS THE BOUNDARY, NOT THE ENGINE. The engine's internal
// modules stay internal: a consumer gets the contract, the gate that makes
// the contract safe to zip, and the two steps needed to obtain one — parse a
// statement, build a catalog from a live schema. `src/query/*` is not
// re-exported wholesale, because every symbol exported here is a promise the
// package has to keep.
//
// The ORDER of a consumer's calls is the whole design:
//
//     snapshotCatalog(pg)                    →  a schema, captured
//     buildNullabilityCatalog(snapshot)      →  the engine's view of it
//     parseSql(sql)                          →  one statement
//     inferQueryContract(stmt, catalog, …)   →  positional claims
//     analyzeValueLineage(stmt, catalog)     →  positional value transformations
//     gateContract(sql, contract, describe)  →  the same claims, or none
//
// The last step is not optional in spirit. A contract that has not been
// gated is a positional array nobody has checked against the positions it
// will be zipped into.
// ---------------------------------------------------------------------------

// --- One statement's contract, and the gate that makes it usable ------------
export {
  compareShapes,
  gateAgreed,
  gateContract,
  type DescribeStatement,
  type DescribedShape,
  type GateOutcome,
  type GatedContract,
} from './contract-gate.js'

export {
  inferNullability,
  inferPresenceGroups,
  inferQueryContract,
  UnsupportedNodeError,
  type EvalWarning,
  type ParamNullability,
  type QueryContract,
  type WalkOptions,
} from './query/nullability-walk.js'

export type {
  ColumnOrigin,
  NullabilityCatalog,
  OutputNullability,
  OutputPresenceGroup,
  ResolveColumnTypes,
} from './query/types.js'

export type { Evaluate, EvaluateRow } from './query/subtree-evaluator.js'

export {
  analyzeValueLineage,
  interpretValueLineage,
  traceValueLineage,
  UnsupportedValueLineageError,
  type DatabaseColumn,
  type DatabaseType,
  type OutputValueLineage,
  type QualifiedName,
  type ResolvedFunctionIdentity,
  type ResolvedOperatorIdentity,
  type ValueLineage,
  type ValueLineageCatalog,
  type ValueLineageOptions,
  type ValueOperation,
} from './query/value-lineage.js'

// --- Getting a catalog and a statement --------------------------------------
export { buildNullabilityCatalog } from './query/catalog-adapter.js'
export { snapshotCatalog } from './catalog/snapshot.js'
export type { CatalogSnapshot } from './catalog/types.js'
export { parseSql } from './ast.js'
export {
  mapRewrittenOffset,
  parseQueryFile,
  QueryFileError,
  rewriteNamedParameters,
  type NamedParameterRewrite,
  type ParsedQueryFile,
  type QueryCommand,
  type QueryDefinition,
  type QueryFileErrorCode,
  type QueryParameter,
  type QueryParameterOccurrence,
} from './query-file.js'
export {
  discoverQueryFiles,
  QueryDiscoveryError,
  type DiscoveredQueryFile,
  type DiscoverQueryFilesOptions,
  type QueryOutputPaths,
} from './query-discovery.js'
export { loadQuerySources } from './query-source-loader.js'
export {
  discoverMigrationFiles,
  MigrationDiscoveryError,
  type DiscoveredMigrationFile,
  type DiscoverMigrationFilesOptions,
} from './migration-discovery.js'
export {
  EMPTY_QUERY_BATCH_STATE,
  QueryBatchError,
  reconcileQueryBatch,
  type QueryBatchDiagnostic,
  type QueryBatchEvent,
  type QueryBatchFileState,
  type QueryBatchItem,
  type QueryParseCacheEntry,
  type QueryParseFailure,
  type QueryParseSuccess,
  type QueryBatchState,
  type QueryBatchStats,
  type QueryBatchUpdate,
  type QuerySourceInput,
} from './query-batch.js'
export {
  EMPTY_QUERY_ANALYSIS_STATE,
  reconcileQueryAnalysis,
  type QueryAnalysisCacheEntry,
  type QueryAnalysisCatalog,
  type QueryAnalysisDiagnostic,
  type QueryAnalysisDiagnosticCode,
  type QueryAnalysisEvent,
  type QueryAnalysisItem,
  type QueryAnalysisResult,
  type QueryAnalysisState,
  type QueryAnalysisStats,
  type QueryAnalysisUpdate,
  type ReconcileQueryAnalysisOptions,
} from './query-analysis.js'

// --- Building the schema a catalog is captured from -------------------------
export { SchemaBuilder } from './schema-builder.js'

// --- Configuration ----------------------------------------------------------
export { ConfigError, findConfigPath, loadConfig, parseConfigString } from './config/loader.js'
export type { Config, JsonSchemaDocument } from './config/schema.js'

export {
  resolveJsonSchemaLineage,
  typescriptJsonSchemaBindings,
  type ColumnJsonSchemaBinding,
  type JsonSchemaAlternative,
  type JsonSchemaBindings,
  type JsonSchemaLineage,
} from './codegen/json-schema-lineage.js'
export {
  loadJsonSchemaDocuments,
  type LoadJsonSchemaDocumentsOptions,
} from './codegen/json-schema-loader.js'
export {
  renderTypescriptJsonSchema,
  renderTypescriptJsonSchemaLineage,
  type RenderTypescriptJsonSchemaLineageOptions,
  type RenderTypescriptJsonSchemaOptions,
} from './codegen/typescript-json-schema.js'
export {
  generateTypescriptJsonSchemaLineageValidator,
  generateTypescriptJsonSchemaValidator,
  UnsupportedJsonSchemaError,
  type GenerateTypescriptJsonSchemaValidatorOptions,
} from './codegen/typescript-json-schema-validator.js'
export {
  renderTypescriptQueryArtifacts,
  type RenderTypescriptQueryArtifactsOptions,
  type TypescriptQueryArtifacts,
  type TypescriptQueryDiagnostic,
  type TypescriptQueryDiagnosticCode,
} from './codegen/typescript-query.js'
export {
  EMPTY_PROJECT_BUILD_STATE,
  reconcileProjectBuild,
  type ProjectArtifact,
  type ProjectBuildEvent,
  type ProjectBuildState,
  type ProjectBuildStats,
  type ProjectBuildUpdate,
  type ProjectDiagnostic,
  type ProjectRenderCacheEntry,
  type ProjectSchemaDiagnostic,
  type ReconcileProjectBuildOptions,
} from './project-build.js'
export {
  applyProjectBuildEvents,
  type ArtifactWriteResult,
  type ArtifactWriteUpdate,
} from './artifact-writer.js'
export {
  ProjectBuildCoordinator,
  type ProjectBuildCoordinatorOptions,
  type ProjectBuildRequest,
} from './project-coordinator.js'
export { ProjectBuildWatcher, type ProjectBuildWatcherOptions } from './project-watcher.js'
export {
  buildProject,
  ProjectRuntime,
  ProjectSchemaError,
  watchProject,
  type ProjectRuntimeOptions,
  type ProjectRuntimeWatchOptions,
  type WatchProjectOptions,
} from './project-runtime.js'
