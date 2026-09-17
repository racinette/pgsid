import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, posix, resolve, sep, relative, join } from 'node:path'
import picomatch from 'picomatch'
import type { CatalogSnapshot } from '../../catalog/types.js'
import type { Config, JsonSchemaDocument } from '../../config/schema.js'
import type { CodegenOutput, CodegenRenderResult, CodegenTarget } from '../target.js'
import { normalizeQueryName } from '../../query-file.js'
import {
  goPackageName,
  goName,
  assertUniqueGoNames,
  GeneratedGoNameCollisionError,
} from './names.js'
import { goJsonSchemaBindings } from './json-schema-bindings.js'
import { renderGoValidation } from './json-schema-validation.js'
import { renderGoExecutorBundle, renderGoExecutorInterface } from './executor.js'
import { renderGoQueryArtifacts } from './query.js'
import {
  goNullsOutDir,
  usesGoNullStructs,
  renderGoNulls,
  goJsonNulls,
  runtimeSource,
} from './nulls.js'
import {
  goJsonSchemasOutDir,
  referencedGoJsonSchemas,
  renderGoJsonSchemaArtifacts,
  runtimeGoJsonSchemas,
  goJsonSchemasImportPath,
} from './jsonschemas.js'
import { createGoTypeContext } from './type-mapping.js'
import { renderGoSchemaArtifacts } from './schema.js'

export interface CreateGoCodegenTargetOptions {
  baseDirectory: string
  key: string
  catalog?: CatalogSnapshot
}

interface OutputRoute {
  source: string
  output: string
  importPath?: string
}

export function createGoCodegenTarget(
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  options: CreateGoCodegenTargetOptions,
): CodegenTarget | undefined {
  const target = config.sql.codegen?.go
  if (!target) return undefined
  const baseDirectory = resolve(options.baseDirectory)
  const excluded = picomatch(target.queries.exclude, { dot: true })
  const routes = outputRoutes(config)
  const schemaOutDir = target.schema ? resolve(baseDirectory, target.schema.outDir) : undefined
  const roots = outputRoots(config, baseDirectory)
  const jsonOutDir =
    schemaOutDir && referencedGoJsonSchemas(config).length
      ? goJsonSchemasOutDir(schemaOutDir)
      : undefined
  if (jsonOutDir) roots.push(jsonOutDir)
  if (schemaOutDir && usesGoNullStructs(config)) roots.push(goNullsOutDir(schemaOutDir))
  const schemaImportPath = schemaOutDir
    ? (target.schema?.importPath ?? discoverGoImportPath(schemaOutDir))
    : undefined
  const typeContext = schemaImportPath
    ? createGoTypeContext(schemaImportPath, config, options.catalog)
    : undefined

  const helpers = new Map<string, { path: string; importPath: string }>()
  for (const route of routes) {
    const root = resolve(baseDirectory, route.output)
    const importPath = `${(route.importPath ?? discoverGoImportPath(root)).replace(/\/$/u, '')}/pgsid/pgx`
    const previous = helpers.get(root)
    if (previous && previous.importPath !== importPath)
      throw new Error(`Go query output ${root} has conflicting import paths`)
    helpers.set(root, { path: join(root, 'pgsid', 'pgx', 'db.go'), importPath })
  }

  return {
    id: 'go',
    key: JSON.stringify([options.key, typeContext, [...helpers]]),
    outputRoots: roots,
    routeQuery(path) {
      if (excluded(path)) return undefined
      const output = outputFor(path, routes, baseDirectory)
      return output ? { target: 'go', outputs: [output] } : undefined
    },
    ...(helpers.size
      ? {
          renderSupport() {
            try {
              return {
                artifacts: [...helpers.values()].flatMap((helper) => [
                  {
                    kind: 'helpers',
                    path: helper.path,
                    content: renderGoExecutorInterface(options.catalog, target.nulls === 'structs'),
                  },
                  ...(Object.values(target.mappings.column).some(
                    (mapping) => typeof mapping === 'object' && 'dimensions' in mapping,
                  )
                    ? [
                        {
                          kind: 'helpers' as const,
                          path: join(dirname(helper.path), 'array.go'),
                          content: runtimeSource('array.go'),
                        },
                      ]
                    : []),
                  ...(Object.values(goJsonSchemaBindings(config, schemas).columns).some(
                    (binding) => binding.runtimeValidation,
                  )
                    ? [
                        {
                          kind: 'helpers',
                          path: join(dirname(helper.path), 'validation.go'),
                          content: renderGoValidation(
                            schemaImportPath
                              ? `${goJsonSchemasImportPath(schemaImportPath)}/pgsid`
                              : `${helper.importPath.replace(/\/pgsid\/pgx$/u, '')}/jsonschemas/pgsid`,
                          ),
                        },
                      ]
                    : []),
                  ...(!schemaOutDir && usesGoNullStructs(config)
                    ? [
                        {
                          kind: 'helpers',
                          path: join(dirname(dirname(helper.path)), 'null.go'),
                          content: renderGoNulls(),
                        },
                      ]
                    : []),
                  ...(!schemaOutDir
                    ? renderGoJsonSchemaArtifacts(
                        referencedGoJsonSchemas(config),
                        schemas,
                        join(dirname(dirname(dirname(helper.path))), 'jsonschemas'),
                        {
                          nulls: goJsonNulls(config),
                          nullsImportPath: helper.importPath.replace(/\/pgx$/u, ''),
                          validationNames: runtimeGoJsonSchemas(config),
                          validationImportPath: `${helper.importPath.replace(/\/pgsid\/pgx$/u, '')}/jsonschemas/pgsid`,
                        },
                      ).map((item) => ({ ...item, kind: 'helpers' }))
                    : []),
                ]),
                diagnostics: [],
              }
            } catch (error) {
              return {
                artifacts: [],
                diagnostics: [
                  {
                    code:
                      error instanceof GeneratedGoNameCollisionError
                        ? 'generated-name-collision'
                        : 'invalid-type-mapping',
                    severity: 'error',
                    queryId: '<helpers>',
                    message: error instanceof Error ? error.message : String(error),
                  },
                ],
              }
            }
          },
        }
      : {}),
    renderQueries(analyses, route) {
      const directory = outputPath(route.outputs)
      const reserved = [...helpers.values()]
        .map((helper) => dirname(dirname(helper.path)))
        .concat(jsonOutDir ? [jsonOutDir] : [])
        .concat(schemaOutDir && usesGoNullStructs(config) ? [goNullsOutDir(schemaOutDir)] : [])
        .concat(
          !schemaOutDir && referencedGoJsonSchemas(config).length
            ? [...helpers.values()].map((helper) =>
                join(dirname(dirname(dirname(helper.path))), 'jsonschemas'),
              )
            : [],
        )
        .find((namespace) => {
          const tail = relative(namespace, directory)
          return tail === '' || (tail !== '..' && !tail.startsWith(`..${sep}`) && !isAbsolute(tail))
        })
      if (reserved) {
        return {
          artifacts: [],
          diagnostics: [
            {
              code: 'reserved-output-path',
              severity: 'error',
              queryId: analyses[0]?.query.id ?? '<queries>',
              message: `Go query output ${directory} occupies the reserved generated namespace ${reserved}`,
            },
          ],
        }
      }
      try {
        assertUniqueGoNames(
          analyses.map((analysis) => ({
            source: analysis.query.name,
            generated: goName(analysis.query.name),
          })),
          'query',
        )
      } catch (error) {
        return {
          artifacts: [],
          diagnostics: [
            {
              code: 'generated-name-collision',
              severity: 'error',
              queryId: analyses[0]?.query.id ?? '<queries>',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        }
      }
      const helper = [...helpers.entries()]
        .filter(([root]) => {
          const tail = relative(root, directory)
          return tail === '' || (tail !== '..' && !tail.startsWith(`..${sep}`) && !isAbsolute(tail))
        })
        .sort(([left], [right]) => right.length - left.length)[0]?.[1]
      const queryContext =
        typeContext ??
        ((usesGoNullStructs(config) || referencedGoJsonSchemas(config).length > 0) && helper
          ? createGoTypeContext(`${helper.importPath.replace(/\/pgsid\/pgx$/u, '')}/schema`, config)
          : undefined)
      const results = analyses.map((analysis) => {
        const rendered = renderGoQueryArtifacts(
          [analysis],
          config,
          schemas,
          schemaOutDir ? options.catalog : undefined,
          target.package ?? goPackageName(basename(directory)),
          queryContext,
          { executor: true, helperImportPath: helper?.importPath },
        )
        return {
          artifacts: rendered.types
            ? [
                {
                  kind: 'types',
                  path: join(directory, `${normalizeQueryName(analysis.query.name)}.go`),
                  content: rendered.types,
                },
              ]
            : [],
          diagnostics: rendered.diagnostics,
        }
      })
      return {
        artifacts: [
          ...results.flatMap((result) => result.artifacts),
          ...(analyses.length
            ? [
                {
                  kind: 'executor',
                  path: join(directory, 'queries.go'),
                  content: renderGoExecutorBundle(
                    target.package ?? goPackageName(basename(directory)),
                    helpers.get(
                      resolve(
                        baseDirectory,
                        routes.find(
                          (route) =>
                            route.source === '' ||
                            analyses[0]!.query.path === route.source ||
                            analyses[0]!.query.path.startsWith(`${route.source}/`),
                        )!.output,
                      ),
                    )!.importPath,
                    target.nulls === 'structs',
                  ),
                },
              ]
            : []),
        ],
        diagnostics: results.flatMap((result) => result.diagnostics),
      }
    },
    ...(schemaOutDir
      ? {
          renderSchema(input): CodegenRenderResult {
            const rendered = renderGoSchemaArtifacts(
              input.catalog,
              config,
              schemas,
              schemaOutDir,
              schemaImportPath!,
              input.relations,
            )
            return {
              artifacts: rendered.artifacts.map((artifact) => ({
                ...artifact,
                kind: 'schema',
              })),
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

const outputRoutes = (config: Config): OutputRoute[] =>
  Object.entries(config.sql.codegen?.go?.queries.out ?? {})
    .map(([source, output]) => ({
      source: normalizePath(source).replace(/^\.$|\/$/gu, ''),
      output: typeof output === 'string' ? output : output.outDir,
      importPath: typeof output === 'string' ? undefined : output.importPath,
    }))
    .sort((left, right) => right.source.length - left.source.length)

const outputFor = (
  path: string,
  routes: readonly OutputRoute[],
  baseDirectory: string,
): CodegenOutput | undefined => {
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
  return { kind: 'types', path: resolve(baseDirectory, normalizePath(route.output), outputTail) }
}

const outputPath = (outputs: readonly CodegenOutput[]): string => {
  const path = outputs.find((output) => output.kind === 'types')?.path
  if (!path) throw new Error('Go codegen route has no types output')
  return path
}

const outputRoots = (config: Config, baseDirectory: string): string[] => {
  const target = config.sql.codegen?.go
  if (!target) return []
  const roots = new Set<string>()
  if (target.schema) roots.add(resolve(baseDirectory, target.schema.outDir))
  for (const output of Object.values(target.queries.out)) {
    roots.add(resolve(baseDirectory, typeof output === 'string' ? output : output.outDir))
  }
  return [...roots]
}

const normalizePath = (path: string): string => {
  const normalized = sep === '/' ? path : path.replaceAll(sep, '/')
  return isAbsolute(normalized) ? normalized : posix.normalize(normalized).replace(/^\.\//u, '')
}

const discoverGoImportPath = (outputDirectory: string): string => {
  let directory = outputDirectory
  while (true) {
    const file = join(directory, 'go.mod')
    if (existsSync(file)) {
      const source = readFileSync(file, 'utf8')
      const module = /^\s*module\s+(?:"([^"\n]+)"|([^\s]+))/mu.exec(source)
      const modulePath = module?.[1] ?? module?.[2]
      if (!modulePath) throw new Error(`Cannot read a module path from ${file}`)
      const tail = relative(directory, outputDirectory).split(sep).join('/')
      return tail ? `${modulePath}/${tail}` : modulePath
    }
    const parent = dirname(directory)
    if (parent === directory)
      throw new Error(
        'Go output needs an enclosing go.mod or an explicit importPath in its schema or query output configuration',
      )
    directory = parent
  }
}
