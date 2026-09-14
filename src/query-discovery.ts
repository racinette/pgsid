import fg from 'fast-glob'
import picomatch from 'picomatch'
import { isAbsolute, posix, resolve, sep } from 'node:path'
import type { Config } from './config/schema.js'

export interface DiscoverQueryFilesOptions {
  baseDirectory?: string
}

export interface QueryOutputPaths {
  types: string
  wrappers?: string
}

export interface DiscoveredQueryFile {
  path: string
  absolutePath: string
  output?: QueryOutputPaths
}

export class QueryDiscoveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueryDiscoveryError'
  }
}

interface OutputRoute {
  source: string
  types: string
  wrappers?: string
}

export async function discoverQueryFiles(
  config: Config,
  options: DiscoverQueryFilesOptions = {},
): Promise<readonly DiscoveredQueryFile[]> {
  const baseDirectory = resolve(options.baseDirectory ?? process.cwd())
  const paths = await fg(config.sql.paths, {
    cwd: baseDirectory,
    absolute: false,
    onlyFiles: true,
    unique: true,
    dot: true,
    followSymbolicLinks: false,
  })
  const excluded = picomatch(config.sql.codegen?.typescript?.queries.exclude ?? [], { dot: true })
  const routes = outputRoutes(config)
  const files = paths
    .map(normalizePath)
    .sort()
    .map((path) => ({
      path,
      absolutePath: resolve(baseDirectory, path),
      output: excluded(path) ? undefined : outputFor(path, routes, baseDirectory),
    }))
  assertNoOutputCollisions(files)
  return files
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
): QueryOutputPaths | undefined => {
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
  return {
    types: resolveOutput(baseDirectory, route.types, outputTail),
    ...(route.wrappers
      ? { wrappers: resolveOutput(baseDirectory, route.wrappers, outputTail) }
      : {}),
  }
}

const resolveOutput = (baseDirectory: string, directory: string, tail: string): string =>
  resolve(baseDirectory, normalizePath(directory), tail)

const assertNoOutputCollisions = (files: readonly DiscoveredQueryFile[]): void => {
  const owners = new Map<string, string>()
  for (const file of files) {
    if (!file.output) continue
    for (const output of [file.output.types, file.output.wrappers]) {
      if (!output) continue
      const owner = owners.get(output)
      if (owner) {
        throw new QueryDiscoveryError(
          `Query files ${JSON.stringify(owner)} and ${JSON.stringify(file.path)} both emit ${JSON.stringify(output)}`,
        )
      }
      owners.set(output, file.path)
    }
  }
}

const normalizePath = (path: string): string => {
  const normalized = sep === '/' ? path : path.replaceAll(sep, '/')
  return isAbsolute(normalized) ? normalized : posix.normalize(normalized).replace(/^\.\//u, '')
}
