import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { plpgsql_check } from '@electric-sql/pglite-plpgsql-check'
import { snapshotCatalog } from './catalog/snapshot.js'
import type { CatalogSnapshot } from './catalog/types.js'
import { createCodegenTargets } from './codegen/registry.js'
import { loadJsonSchemaDocuments } from './codegen/shared/json-schema-loader.js'
import { ConfigError, findConfigPath, loadConfig } from './config/loader.js'
import type { Config } from './config/schema.js'
import type { SqlDiagnostic } from './errors.js'
import { discoverMigrationFiles, type DiscoveredMigrationFile } from './migration-discovery.js'
import { ProjectBuildCoordinator, type ProjectBuildRequest } from './project-coordinator.js'
import {
  type ProjectBuildState,
  type ProjectBuildUpdate,
  type ProjectSchemaDiagnostic,
} from './project-build.js'
import { ProjectBuildWatcher, type ProjectBuildWatcherOptions } from './project-watcher.js'
import { buildNullabilityCatalog } from './query/catalog-adapter.js'
import type { QueryAnalysisCatalog } from './query-analysis.js'
import { loadQuerySources } from './query-source-loader.js'
import { analyzeSchemaRelations, type SchemaRelationAnalyses } from './schema-analysis.js'
import { SchemaBuilder } from './schema-builder.js'

export interface ProjectRuntimeOptions {
  baseDirectory?: string
  configPath?: string
}

export interface ProjectRuntimeWatchOptions {
  debounceMs?: number
  onUpdate?: ProjectBuildWatcherOptions['onUpdate']
  onError?: ProjectBuildWatcherOptions['onError']
  allowInitialError?: boolean
}

export interface WatchProjectOptions extends ProjectRuntimeOptions, ProjectRuntimeWatchOptions {}

export class ProjectSchemaError extends Error {
  constructor(
    public readonly path: string,
    public readonly diagnostics: readonly SqlDiagnostic[],
    public readonly content?: Buffer,
  ) {
    super(
      `Could not apply migration ${JSON.stringify(path)}: ${diagnostics.map((item) => item.message).join('; ')}`,
    )
    this.name = 'ProjectSchemaError'
  }
}

interface LoadedMigration extends DiscoveredMigrationFile {
  content: Buffer
  hash: string
}

interface SchemaGeneration {
  key: string
  pg: PGlite
  snapshot: CatalogSnapshot
  diagnostics: readonly ProjectSchemaDiagnostic[]
  catalogKey?: string
  catalog?: QueryAnalysisCatalog
  relationAnalysisKey?: string
  relationAnalyses?: SchemaRelationAnalyses
  typeNames: Map<number, string>
  delegateCounter: number
}

export class ProjectRuntime {
  readonly baseDirectory: string
  readonly configPath: string
  readonly #coordinator = new ProjectBuildCoordinator()
  readonly #fileOverlays = new Map<string, Buffer>()
  #generation: SchemaGeneration | undefined
  #watcher: ProjectBuildWatcher | undefined
  #ignoredRoots: readonly string[] = []
  #closed = false

  constructor(options: ProjectRuntimeOptions = {}) {
    if (options.baseDirectory) {
      this.baseDirectory = resolve(options.baseDirectory)
      this.configPath = resolve(
        this.baseDirectory,
        options.configPath ?? findConfigPath(this.baseDirectory),
      )
    } else if (options.configPath) {
      this.configPath = resolve(options.configPath)
      this.baseDirectory = dirname(this.configPath)
    } else {
      this.baseDirectory = resolve(process.cwd())
      this.configPath = resolve(findConfigPath(this.baseDirectory))
    }
  }

  get state(): ProjectBuildState {
    return this.#coordinator.state
  }

  async build(): Promise<ProjectBuildUpdate> {
    if (this.#closed) throw new Error('Project runtime is closed')
    if (this.#watcher) throw new Error('Project runtime is already watching')
    return this.#coordinator.submit(await this.#acquire())
  }

  async watch(options: ProjectRuntimeWatchOptions = {}): Promise<ProjectBuildWatcher> {
    if (this.#closed) throw new Error('Project runtime is closed')
    if (this.#watcher) return this.#watcher
    const watcher = await ProjectBuildWatcher.start({
      paths: this.baseDirectory,
      acquire: () => this.#acquire(),
      coordinator: this.#coordinator,
      debounceMs: options.debounceMs,
      onUpdate: options.onUpdate,
      onError: options.onError,
      allowInitialError: options.allowInitialError,
      watchOptions: { ignored: (path) => this.#ignore(path) },
    })
    this.#watcher = watcher
    return watcher
  }

  invalidate(): void {
    this.#watcher?.invalidate()
  }

  setFileOverlay(path: string, content: string | Buffer | undefined): void {
    const absolutePath = resolve(this.baseDirectory, path)
    if (content === undefined) this.#fileOverlays.delete(absolutePath)
    else
      this.#fileOverlays.set(
        absolutePath,
        Buffer.isBuffer(content) ? Buffer.from(content) : Buffer.from(content, 'utf8'),
      )
    this.invalidate()
  }

  async drain(): Promise<void> {
    await this.#watcher?.drain()
    await this.#coordinator.drain()
  }

  async close(): Promise<void> {
    if (this.#closed) return
    this.#closed = true
    await this.#watcher?.close()
    if (this.#generation && !this.#generation.pg.closed) await this.#generation.pg.close()
  }

  async #acquire(): Promise<ProjectBuildRequest> {
    const config = loadConfig({ configPath: this.configPath })
    const migrations = await loadMigrations(config, this.baseDirectory, (path) => this.#read(path))
    const schemaKey = hash(
      stableJson([
        config.sql.typecheck.plpgsql,
        migrations.map((migration) => [migration.path, migration.hash]),
      ]),
    )
    if (this.#generation?.key !== schemaKey) {
      const candidate = await buildGeneration(migrations, schemaKey, config)
      const previous = this.#generation
      this.#generation = candidate
      if (previous && !previous.pg.closed) await previous.pg.close()
    }
    const generation = this.#generation!
    validateMaterializedViewOverrides(config, generation.snapshot)
    const catalogKey = hash(stableJson([schemaKey, config.sql.searchPath]))
    if (generation.catalogKey !== catalogKey) {
      generation.catalog = await buildNullabilityCatalog(generation.snapshot, {
        searchPath: config.sql.searchPath,
      })
      generation.catalogKey = catalogKey
    }
    await setSearchPath(generation.pg, config.sql.searchPath)
    const schemas = loadJsonSchemaDocuments(config, { baseDirectory: this.baseDirectory })
    const targets = createCodegenTargets(config, schemas, { baseDirectory: this.baseDirectory })
    this.#ignoredRoots = targets.flatMap((target) => target.outputRoots)
    const walkOptions = {
      materializedViews: config.sql.analysis.nullability.materializedViews,
      resolveColumnTypes: (sql: string) => resolveColumnTypes(generation, sql),
    }
    const relationAnalysisKey = hash(
      stableJson([
        catalogKey,
        config.sql.analysis.nullability.materializedViews,
        targets.some((target) => target.renderSchema),
      ]),
    )
    if (
      targets.some((target) => target.renderSchema) &&
      generation.relationAnalysisKey !== relationAnalysisKey
    ) {
      generation.relationAnalyses = await analyzeSchemaRelations(
        generation.snapshot,
        generation.catalog!,
        walkOptions,
      )
      generation.relationAnalysisKey = relationAnalysisKey
    }
    const sources = await loadQuerySources(config, {
      baseDirectory: this.baseDirectory,
      targets,
      readFile: (path) => this.#read(path),
    })
    return {
      sources,
      options: {
        targets,
        schemaDiagnostics: generation.diagnostics,
        schema: targets.some((target) => target.renderSchema)
          ? {
              catalog: generation.snapshot,
              relations: generation.relationAnalyses!,
              key: relationAnalysisKey,
              sourcePath: this.configPath,
            }
          : undefined,
        analysis: {
          schemaKey,
          analysisKey: 'query-analysis-v2',
          catalog: generation.catalog!,
          searchPath: config.sql.searchPath,
          describe: (sql) => describe(generation, sql),
          walkOptions,
        },
      },
    }
  }

  #ignore(path: string): boolean {
    const absolutePath = resolve(path)
    const local = normalizePath(relative(this.baseDirectory, absolutePath))
    if (local === '.git' || local.startsWith('.git/')) return true
    if (local === 'node_modules' || local.startsWith('node_modules/')) return true
    return this.#ignoredRoots.some((root) => within(root, absolutePath))
  }

  #read(path: string): Promise<Buffer> {
    const content = this.#fileOverlays.get(resolve(path))
    return content ? Promise.resolve(Buffer.from(content)) : readFile(path)
  }
}

const validateMaterializedViewOverrides = (config: Config, snapshot: CatalogSnapshot): void => {
  const overrides = config.sql.analysis.nullability.materializedViews.overrides
  if (Object.keys(overrides).length === 0) return
  const materializedViews = new Set(
    snapshot.materializedViews.map((relation) => `${relation.schema}.${relation.name}`),
  )
  const ordinaryRelations = new Map<string, string>()
  for (const relation of snapshot.tables) {
    ordinaryRelations.set(`${relation.schema}.${relation.name}`, 'a table')
  }
  for (const relation of snapshot.views) {
    ordinaryRelations.set(`${relation.schema}.${relation.name}`, 'an ordinary view')
  }
  for (const name of Object.keys(overrides)) {
    if (materializedViews.has(name)) continue
    const kind = ordinaryRelations.get(name)
    throw new ConfigError(
      kind
        ? `Materialized-view nullability override ${JSON.stringify(name)} names ${kind}`
        : `Materialized-view nullability override ${JSON.stringify(name)} names no materialized view`,
    )
  }
}

export async function buildProject(
  options: ProjectRuntimeOptions = {},
): Promise<ProjectBuildUpdate> {
  const runtime = new ProjectRuntime(options)
  try {
    return await runtime.build()
  } finally {
    await runtime.close()
  }
}

export async function watchProject(options: WatchProjectOptions = {}): Promise<ProjectRuntime> {
  const runtime = new ProjectRuntime(options)
  try {
    await runtime.watch(options)
    return runtime
  } catch (error) {
    await runtime.close()
    throw error
  }
}

const loadMigrations = async (
  config: Config,
  baseDirectory: string,
  read: (path: string) => Promise<Buffer> = readFile,
): Promise<readonly LoadedMigration[]> => {
  const discovered = await discoverMigrationFiles(config, { baseDirectory })
  return Promise.all(
    discovered.map(async (migration) => {
      const content = await read(migration.absolutePath)
      return { ...migration, content, hash: hash(content) }
    }),
  )
}

const buildGeneration = async (
  migrations: readonly LoadedMigration[],
  key: string,
  config: Config,
): Promise<SchemaGeneration> => {
  const checkPlpgsql = config.sql.typecheck.plpgsql
  const pg = checkPlpgsql
    ? await PGlite.create({ extensions: { plpgsql_check } })
    : await PGlite.create()
  try {
    if (checkPlpgsql) await pg.exec('CREATE EXTENSION plpgsql_check')
    const builder = new SchemaBuilder({ checkPlpgsql })
    await builder.snapshotBeforeMigrations(pg)
    for (const migration of migrations) {
      const result = await builder.applyMigration(pg, migration.content, migration.index)
      if (!result.success) {
        throw new ProjectSchemaError(
          migration.path,
          result.diagnostics.map((diagnostic) => ({
            ...diagnostic,
            migrationIndex: migration.index,
          })),
          migration.content,
        )
      }
    }
    const diagnostics = (await builder.validate(pg)).map((diagnostic) => {
      const migration =
        diagnostic.migrationIndex === undefined ? undefined : migrations[diagnostic.migrationIndex]
      return {
        path: migration?.path ?? null,
        ...(migration ? { content: migration.content } : {}),
        diagnostic,
      }
    })
    return {
      key,
      pg,
      snapshot: await snapshotCatalog(pg),
      diagnostics,
      typeNames: new Map(),
      delegateCounter: 0,
    }
  } catch (error) {
    await pg.close()
    throw error
  }
}

const describe = async (generation: SchemaGeneration, sql: string) => {
  const described = await generation.pg.describeQuery(sql)
  return {
    columns: described.resultFields.map((field) => field.name),
    columnTypes: await Promise.all(
      described.resultFields.map((field) => typeName(generation, field.dataTypeID)),
    ),
    params: described.queryParams.length,
    parameterTypes: await Promise.all(
      described.queryParams.map((parameter) => typeName(generation, parameter.dataTypeID)),
    ),
  }
}

const typeName = async (generation: SchemaGeneration, oid: number): Promise<string> => {
  const cached = generation.typeNames.get(oid)
  if (cached) return cached
  const result = await generation.pg.query<{ name: string }>(
    'SELECT format_type($1::oid, NULL) AS name',
    [oid],
  )
  const name = result.rows[0]!.name
  generation.typeNames.set(oid, name)
  return name
}

const resolveColumnTypes = async (generation: SchemaGeneration, sql: string): Promise<string[]> => {
  const name = `pgsid_types_${generation.delegateCounter++}`
  try {
    await generation.pg.exec(`PREPARE ${name} AS ${sql}`)
    const result = await generation.pg.query<{ types: string[] }>(
      `SELECT result_types::text[] AS types FROM pg_prepared_statements WHERE name = $1`,
      [name],
    )
    return result.rows[0]?.types ?? []
  } catch {
    return []
  } finally {
    try {
      await generation.pg.exec(`DEALLOCATE ${name}`)
    } catch {
      // The preparation failed, so there is nothing to release.
    }
  }
}

const setSearchPath = async (pg: PGlite, searchPath: readonly string[]): Promise<void> => {
  const value = searchPath.map((name) => `"${name.replaceAll('"', '""')}"`).join(', ')
  await pg.query("SELECT set_config('search_path', $1, false)", [value])
}

const within = (root: string, path: string): boolean => {
  const local = relative(root, path)
  return local === '' || (!local.startsWith('..') && !isAbsolute(local))
}

const stableJson = (value: unknown): string => JSON.stringify(canonical(value))
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, item]) => [key, canonical(item)]),
    )
  }
  return value
}

const hash = (content: string | Buffer): string =>
  createHash('sha256').update(content).digest('hex')
const normalizePath = (path: string): string => (sep === '/' ? path : path.replaceAll(sep, '/'))
const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0
