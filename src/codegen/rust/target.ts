import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path'
import picomatch from 'picomatch'
import type { CatalogSnapshot } from '../../catalog/types.js'
import type { Config } from '../../config/schema.js'
import type { CodegenOutput, CodegenRenderResult, CodegenTarget } from '../target.js'
import { normalizeQueryName } from '../../query-file.js'
import { renderRustQueryModule, rustDimensionUnions } from './query.js'
import { renderRustSchemaArtifacts } from './schema.js'

export interface CreateRustCodegenTargetOptions {
  baseDirectory: string
  key: string
  catalog?: CatalogSnapshot
}

interface OutputRoute {
  source: string
  output: string
}

export function createRustCodegenTarget(
  config: Config,
  options: CreateRustCodegenTargetOptions,
): CodegenTarget | undefined {
  const target = config.sql.codegen?.rust
  if (!target) return undefined
  const baseDirectory = resolve(options.baseDirectory)
  const schemaOutDir = target.schema ? resolve(baseDirectory, target.schema.outDir) : undefined
  const excluded = picomatch(target.queries.exclude, { dot: true })
  const routes = Object.entries(target.queries.out)
    .map(([source, output]) => ({ source: normalizePath(source).replace(/^\.$|\/$/gu, ''), output }))
    .sort((left, right) => right.source.length - left.source.length)
  const queries = routes.length > 0
  const error = (queryId: string, message: string): CodegenRenderResult => ({
    artifacts: [],
    diagnostics: [{ code: 'rust-codegen', severity: 'error', queryId, message }],
  })
  let root: string[] | Error | undefined
  try {
    root = schemaOutDir ? (target.schema?.module?.split('::') ?? discoverModulePath(schemaOutDir)) : undefined
  } catch (cause) {
    root = cause instanceof Error ? cause : new Error(String(cause))
  }
  return {
    id: 'rust',
    key: JSON.stringify([options.key, schemaOutDir, root instanceof Error ? root.message : root]),
    outputRoots: [
      ...(schemaOutDir ? [schemaOutDir] : []),
      ...routes.map((route) => resolve(baseDirectory, route.output)),
    ],
    routeQuery(path) {
      if (excluded(path)) return undefined
      const output = outputFor(path, routes, baseDirectory)
      return output ? { target: 'rust', outputs: [output] } : undefined
    },
    renderQueries(analyses, route): CodegenRenderResult {
      const queryId = analyses[0]?.query.id ?? '<queries>'
      if (!options.catalog || !root) return error(queryId, 'Rust queries name the generated schema tree, so they need sql.codegen.rust.schema')
      if (root instanceof Error) return error(queryId, root.message)
      const path = route.outputs.find((output) => output.kind === 'types')!.path
      const rendered = renderRustQueryModule(analyses, options.catalog, config, root)
      return {
        artifacts: rendered.content ? [{ kind: 'types', path, content: rendered.content }] : [],
        diagnostics: rendered.diagnostics,
      }
    },
    ...(schemaOutDir
      ? {
          renderSchema(input): CodegenRenderResult {
            try {
              return {
                artifacts: renderRustSchemaArtifacts(
                  input.catalog,
                  schemaOutDir,
                  config,
                  input.relations,
                  input.domains,
                  // Queries are rendered apart, so the values module holds whatever they may name.
                  queries ? { evaluator: true, unions: rustDimensionUnions(config) } : undefined,
                ).map((artifact) => ({ ...artifact, kind: 'schema' })),
                diagnostics: [],
              }
            } catch (cause) {
              return error('<schema>', cause instanceof Error ? cause.message : String(cause))
            }
          },
        }
      : {}),
  }
}

// A query file's module: its path under the route's output, named as its file normalized.
const outputFor = (path: string, routes: readonly OutputRoute[], baseDirectory: string): CodegenOutput | undefined => {
  const route = routes.find(({ source }) => source === '' || path === source || path.startsWith(`${source}/`))
  if (!route) return undefined
  const tail = route.source === '' ? path : path === route.source ? posix.basename(path) : path.slice(route.source.length + 1)
  const directory = posix.dirname(tail)
  const file = `${normalizeQueryName(posix.basename(tail).replace(/\.sql$/u, ''))}.rs`
  return {
    kind: 'types',
    path: resolve(baseDirectory, normalizePath(route.output), directory === '.' ? file : posix.join(directory, file)),
  }
}

const normalizePath = (path: string): string => {
  const normalized = sep === '/' ? path : path.replaceAll(sep, '/')
  return isAbsolute(normalized) ? normalized : posix.normalize(normalized).replace(/^\.\//u, '')
}

// The schema tree's path in its crate: the directories under the crate's source directory.
const discoverModulePath = (outputDirectory: string): string[] => {
  for (let directory = outputDirectory; ; directory = dirname(directory)) {
    if (existsSync(join(directory, 'Cargo.toml'))) {
      const tail = relative(join(directory, 'src'), outputDirectory)
      if (tail === '' || tail.startsWith('..') || isAbsolute(tail))
        break
      return ['crate', ...tail.split(sep)]
    }
    if (dirname(directory) === directory) break
  }
  throw new Error(
    'Rust queries need the schema tree inside a crate source directory, or its path in sql.codegen.rust.schema.module',
  )
}
