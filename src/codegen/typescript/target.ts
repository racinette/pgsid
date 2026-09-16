import picomatch from 'picomatch'
import { dirname, isAbsolute, posix, resolve, sep, join } from 'node:path'
import type { CatalogSnapshot } from '../../catalog/types.js'
import type { Config, JsonSchemaDocument } from '../../config/schema.js'
import type { CodegenOutput, CodegenRenderResult, CodegenTarget } from '../target.js'
import type { JsonSchemaAlternative } from '../shared/json-schema-lineage.js'
import { renderTypescriptQueryArtifacts, renderTypescriptQueryHelpers } from './query.js'
import { renderTypescriptSchemaArtifacts } from './schema.js'
import {
  createTypescriptJsonSchemaGraphs,
  renderTypescriptJsonSchemaArtifacts,
  renderTypescriptJsonSchemaRuntimeArtifacts,
} from './jsonschemas.js'
import { typescriptModuleSpecifier, typescriptSchemaDirectory } from './paths.js'

export interface CreateTypescriptCodegenTargetOptions {
  baseDirectory: string
  key: string
  catalog?: CatalogSnapshot
}
interface OutputRoute {
  source: string
  types: string
  runtime?: string
}

export function createTypescriptCodegenTarget(
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  options: CreateTypescriptCodegenTargetOptions,
): CodegenTarget | undefined {
  const target = config.sql.codegen?.typescript
  if (!target) return undefined
  const baseDirectory = resolve(options.baseDirectory)
  const excluded = picomatch(target.queries.exclude, { dot: true })
  const routes = outputRoutes(config)
  const schemaOutDir = target.schema ? resolve(baseDirectory, target.schema.outDir) : undefined
  const jsonRuntime = target.jsonSchemas.runtime
    ? resolve(baseDirectory, target.jsonSchemas.runtime.outDir)
    : undefined
  const jsonTypes = target.jsonSchemas.types
    ? resolve(baseDirectory, target.jsonSchemas.types)
    : schemaOutDir
      ? join(dirname(schemaOutDir), 'jsonschemas')
      : jsonRuntime && routes[0]
        ? resolve(baseDirectory, routes[0].types, 'jsonschemas')
        : undefined
  const sharedJsonOutput = !!(target.jsonSchemas.types || jsonRuntime)
  const roots = new Set<string>([
    ...routes.flatMap((route) => [
      resolve(baseDirectory, route.types),
      ...(route.runtime ? [resolve(baseDirectory, route.runtime)] : []),
    ]),
    ...(schemaOutDir ? [schemaOutDir] : []),
    ...(jsonTypes ? [jsonTypes] : []),
    ...(jsonRuntime ? [jsonRuntime] : []),
  ])
  let sharedResult: CodegenRenderResult | undefined
  const renderShared = (): CodegenRenderResult => {
    if (sharedResult) return sharedResult
    sharedResult = buildShared()
    return sharedResult
  }
  const buildShared = (): CodegenRenderResult => {
    try {
      if (!jsonTypes) return failure('JSON Schema runtime output requires a types destination')
      if (jsonRuntime === jsonTypes)
        return failure('JSON Schema types and runtime must use different module destinations')
      return {
        artifacts: [
          ...renderTypescriptJsonSchemaArtifacts(config, schemas, jsonTypes).map((artifact) => ({
            ...artifact,
            kind: 'types',
          })),
          ...(jsonRuntime
            ? renderTypescriptJsonSchemaRuntimeArtifacts(
                config,
                schemas,
                jsonTypes,
                jsonRuntime,
              ).map((artifact) => ({ ...artifact, kind: 'runtime' }))
            : []),
        ],
        diagnostics: [],
      }
    } catch (error) {
      return failure(error instanceof Error ? error.message : String(error))
    }
  }
  return {
    id: 'typescript',
    key: options.key,
    outputRoots: [...roots],
    routeQuery(path) {
      if (excluded(path)) return undefined
      const outputs = outputFor(path, routes, baseDirectory)
      return outputs ? { target: 'typescript', outputs } : undefined
    },
    renderQueries(analyses, route) {
      if (
        sharedJsonOutput &&
        renderShared().diagnostics.some((diagnostic) => diagnostic.severity === 'error')
      )
        return { artifacts: [], diagnostics: renderShared().diagnostics }
      const typesDirectory = outputPath(route.outputs, 'types')
      const runtimeDirectory = route.outputs.find((output) => output.kind === 'runtime')?.path
      const configured = routes.find(
        (item) =>
          analyses[0]?.query.path === item.source ||
          analyses[0]?.query.path.startsWith(`${item.source}/`) ||
          item.source === '',
      )
      const jsonTypesDirectory =
        jsonTypes ??
        (configured
          ? resolve(baseDirectory, configured.types, 'jsonschemas')
          : join(typesDirectory, 'jsonschemas'))
      if (runtimeDirectory && resolve(typesDirectory) === resolve(runtimeDirectory))
        return failure('TypeScript types and runtime must use different module destinations')
      const helper = runtimeDirectory ? join(runtimeDirectory, 'pgsid', 'queryable.ts') : undefined
      try {
        const graphs = createTypescriptJsonSchemaGraphs(config, schemas)
        const jsonSchemaName = (alternative: JsonSchemaAlternative) => {
          const graph = graphs.get(alternative.schemaName)
          return graph?.declarations.find(
            (declaration) =>
              declaration.sourceSchema === alternative.schema &&
              (declaration.schema === alternative.document ||
                (typeof alternative.schema === 'object' &&
                  (alternative.schema['type'] === 'object' ||
                    alternative.schema['type'] === 'array'))),
          )?.name
        }
        const results = analyses.map((analysis) => {
          const types = join(typesDirectory, `${analysis.query.name}.d.ts`)
          const runtime = runtimeDirectory
            ? join(runtimeDirectory, `${analysis.query.name}.ts`)
            : undefined
          const rendered = renderTypescriptQueryArtifacts([analysis], config, schemas, {
            emitRuntime: !!runtime,
            catalog: options.catalog,
            nativeModuleSpecifier: schemaOutDir
              ? (schema, kind) =>
                  typescriptModuleSpecifier(
                    types,
                    join(
                      schemaOutDir,
                      typescriptSchemaDirectory(schema),
                      `${kind === 'domain' ? 'domains' : 'enums'}.d.ts`,
                    ),
                  )
              : undefined,
            jsonSchemasModuleSpecifier: typescriptModuleSpecifier(
              types,
              join(jsonTypesDirectory, 'index.d.ts'),
            ),
            typesModuleSpecifier: runtime ? typescriptModuleSpecifier(runtime, types) : undefined,
            queryableModuleSpecifier:
              runtime && helper ? typescriptModuleSpecifier(runtime, helper) : undefined,
            jsonSchemaRuntimeModuleSpecifier:
              runtime && jsonRuntime
                ? typescriptModuleSpecifier(runtime, join(jsonRuntime, 'index.ts'))
                : undefined,
            jsonSchemaValidator(alternative) {
              const name = jsonSchemaName(alternative)
              return name ? `is${name}` : undefined
            },
            jsonSchemaValidation(alternative) {
              const name = jsonSchemaName(alternative)
              return name ? `validate${name}` : undefined
            },
          })
          return {
            artifacts: [
              ...(rendered.types === null
                ? []
                : [{ kind: 'types', path: types, content: rendered.types }]),
              ...(runtime && rendered.runtime !== null
                ? [{ kind: 'runtime', path: runtime, content: rendered.runtime }]
                : []),
            ],
            diagnostics: rendered.diagnostics,
          }
        })
        return {
          artifacts: [
            ...results.flatMap((result) => result.artifacts),
            ...(!sharedJsonOutput && !schemaOutDir && analyses.length
              ? renderTypescriptJsonSchemaArtifacts(config, schemas, jsonTypesDirectory).map(
                  (artifact) => ({ ...artifact, kind: 'types' }),
                )
              : []),
            ...(helper && analyses.length
              ? [
                  {
                    kind: 'runtime',
                    path: helper,
                    content: renderTypescriptQueryHelpers(
                      jsonRuntime && graphs.size
                        ? typescriptModuleSpecifier(
                            helper,
                            join(jsonRuntime, 'pgsid', 'validation.ts'),
                          )
                        : undefined,
                    ),
                  },
                ]
              : []),
          ],
          diagnostics: results.flatMap((result) => result.diagnostics),
        }
      } catch (error) {
        return failure(error instanceof Error ? error.message : String(error))
      }
    },
    ...(sharedJsonOutput ? { renderSupport: renderShared } : {}),
    ...(schemaOutDir
      ? {
          renderSchema(input): CodegenRenderResult {
            if (
              sharedJsonOutput &&
              renderShared().diagnostics.some((diagnostic) => diagnostic.severity === 'error')
            )
              return { artifacts: [], diagnostics: renderShared().diagnostics }
            const rendered = renderTypescriptSchemaArtifacts(
              input.catalog,
              config,
              schemas,
              schemaOutDir,
              {
                relations: input.relations,
                jsonSchemasDirectory: jsonTypes,
                emitJsonSchemaTypes: !sharedJsonOutput,
              },
            )
            return {
              artifacts: rendered.artifacts.map((artifact) => ({ ...artifact, kind: 'schema' })),
              diagnostics: rendered.diagnostics.map((diagnostic) => ({
                ...diagnostic,
                queryId: '<schema>',
              })),
            }
          },
        }
      : {}),
  }
}
const failure = (message: string): CodegenRenderResult => ({
  artifacts: [],
  diagnostics: [
    { code: 'invalid-type-mapping', severity: 'error', queryId: '<typescript>', message },
  ],
})
const outputRoutes = (config: Config): OutputRoute[] =>
  Object.entries(config.sql.codegen?.typescript?.queries.out ?? {})
    .map(([source, output]) => ({
      source: normalizePath(source).replace(/^\.$|\/$/gu, ''),
      types: typeof output === 'string' ? output : output.types,
      runtime: typeof output === 'string' ? undefined : output.runtime,
    }))
    .sort((left, right) => right.source.length - left.source.length)
const outputFor = (
  path: string,
  routes: readonly OutputRoute[],
  baseDirectory: string,
): CodegenOutput[] | undefined => {
  const route = routes.find(
    ({ source }) => source === '' || path === source || path.startsWith(`${source}/`),
  )
  if (!route) return undefined
  const tail =
    route.source === ''
      ? path
      : path === route.source
        ? posix.basename(path)
        : path.slice(route.source.length + 1)
  const outputTail = tail.endsWith('.sql') ? tail.slice(0, -4) : tail
  return [
    { kind: 'types', path: resolve(baseDirectory, normalizePath(route.types), outputTail) },
    ...(route.runtime
      ? [
          {
            kind: 'runtime',
            path: resolve(baseDirectory, normalizePath(route.runtime), outputTail),
          },
        ]
      : []),
  ]
}
const outputPath = (outputs: readonly CodegenOutput[], kind: string): string => {
  const path = outputs.find((output) => output.kind === kind)?.path
  if (!path) throw new Error(`TypeScript codegen route has no ${JSON.stringify(kind)} output`)
  return path
}
const normalizePath = (path: string): string => {
  const normalized = sep === '/' ? path : path.replaceAll(sep, '/')
  return isAbsolute(normalized) ? normalized : posix.normalize(normalized).replace(/^\.\//u, '')
}
