import picomatch from 'picomatch'
import { dirname, extname, isAbsolute, posix, relative, resolve, sep } from 'node:path'
import type { Config, JsonSchemaDocument } from '../../config/schema.js'
import type { CodegenOutput, CodegenRenderResult, CodegenTarget } from '../target.js'
import { renderTypescriptQueryArtifacts } from './query.js'
import { renderTypescriptSchemaArtifacts } from './schema.js'

export interface CreateTypescriptCodegenTargetOptions {
  baseDirectory: string
  key: string
}

interface OutputRoute {
  source: string
  types: string
  wrappers?: string
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

  return {
    id: 'typescript',
    key: options.key,
    outputRoots: outputRoots(target, baseDirectory),
    routeQuery(path) {
      if (excluded(path)) return undefined
      const output = outputFor(path, routes, baseDirectory)
      if (!output) return undefined
      return {
        target: 'typescript',
        outputs: output,
      }
    },
    renderQueries(analyses, route) {
      const types = outputPath(route.outputs, 'types')
      const wrappers = route.outputs.find((output) => output.kind === 'wrappers')?.path
      const rendered = renderTypescriptQueryArtifacts(analyses, config, schemas, {
        typesModuleSpecifier: wrappers ? moduleSpecifier(wrappers, types) : undefined,
      })
      return {
        artifacts: [
          ...(rendered.types === null
            ? []
            : [{ kind: 'types', path: types, content: rendered.types }]),
          ...(wrappers && rendered.wrappers !== null
            ? [{ kind: 'wrappers', path: wrappers, content: rendered.wrappers }]
            : []),
        ],
        diagnostics: rendered.diagnostics,
      }
    },
    ...(schemaOutDir
      ? {
          renderSchema(input): CodegenRenderResult {
            const rendered = renderTypescriptSchemaArtifacts(
              input.catalog,
              config,
              schemas,
              schemaOutDir,
              { relations: input.relations },
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
  Object.entries(config.sql.codegen?.typescript?.queries.out ?? {})
    .map(([source, output]) => ({
      source: normalizePath(source).replace(/^\.$|\/$/gu, ''),
      types: typeof output === 'string' ? output : output.types,
      wrappers: typeof output === 'string' ? undefined : output.wrappers,
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
  const outputTail = tail.endsWith('.sql') ? `${tail.slice(0, -4)}.ts` : `${tail}.ts`
  return [
    { kind: 'types', path: resolveOutput(baseDirectory, route.types, outputTail) },
    ...(route.wrappers
      ? [{ kind: 'wrappers', path: resolveOutput(baseDirectory, route.wrappers, outputTail) }]
      : []),
  ]
}

const outputPath = (outputs: readonly CodegenOutput[], kind: string): string => {
  const path = outputs.find((output) => output.kind === kind)?.path
  if (!path) throw new Error(`TypeScript codegen route has no ${JSON.stringify(kind)} output`)
  return path
}

const resolveOutput = (baseDirectory: string, directory: string, tail: string): string =>
  resolve(baseDirectory, normalizePath(directory), tail)

const outputRoots = (
  target: NonNullable<NonNullable<Config['sql']['codegen']>['typescript']>,
  baseDirectory: string,
): string[] => {
  const roots = new Set<string>()
  if (target.schema) roots.add(resolve(baseDirectory, target.schema.outDir))
  for (const output of Object.values(target.queries.out)) {
    roots.add(resolve(baseDirectory, typeof output === 'string' ? output : output.types))
    if (typeof output !== 'string' && output.wrappers) {
      roots.add(resolve(baseDirectory, output.wrappers))
    }
  }
  return [...roots]
}

const moduleSpecifier = (wrapperPath: string, typesPath: string): string => {
  let path = relative(dirname(wrapperPath), typesPath).split(sep).join('/')
  const extension = extname(path)
  if (extension) path = `${path.slice(0, -extension.length)}.js`
  if (!path.startsWith('.')) path = `./${path}`
  return path
}

const normalizePath = (path: string): string => {
  const normalized = sep === '/' ? path : path.replaceAll(sep, '/')
  return isAbsolute(normalized) ? normalized : posix.normalize(normalized).replace(/^\.\//u, '')
}
