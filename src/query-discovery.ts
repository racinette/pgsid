import fg from 'fast-glob'
import { isAbsolute, posix, resolve, sep } from 'node:path'
import { createCodegenTargets } from './codegen/registry.js'
import type { CodegenTarget, QueryCodegenRoute } from './codegen/target.js'
import type { Config } from './config/schema.js'

export interface DiscoverQueryFilesOptions {
  baseDirectory?: string
  targets?: readonly CodegenTarget[]
}

export interface DiscoveredQueryFile {
  path: string
  absolutePath: string
  routes: readonly QueryCodegenRoute[]
}

export class QueryDiscoveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueryDiscoveryError'
  }
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
  const targets = options.targets ?? createCodegenTargets(config, {}, { baseDirectory })
  const files = paths
    .map(normalizePath)
    .sort()
    .map((path) => ({
      path,
      absolutePath: resolve(baseDirectory, path),
      routes: targets.flatMap((target) => target.routeQuery(path) ?? []),
    }))
  assertNoOutputCollisions(files)
  return files
}

const assertNoOutputCollisions = (files: readonly DiscoveredQueryFile[]): void => {
  const owners = new Map<string, string>()
  for (const file of files) {
    for (const route of file.routes) {
      for (const output of route.outputs) {
        const owner = owners.get(output.path)
        if (owner) {
          throw new QueryDiscoveryError(
            `Query files ${JSON.stringify(owner)} and ${JSON.stringify(file.path)} both emit ${JSON.stringify(output.path)}`,
          )
        }
        owners.set(output.path, file.path)
      }
    }
  }
}

const normalizePath = (path: string): string => {
  const normalized = sep === '/' ? path : path.replaceAll(sep, '/')
  return isAbsolute(normalized) ? normalized : posix.normalize(normalized).replace(/^\.\//u, '')
}
