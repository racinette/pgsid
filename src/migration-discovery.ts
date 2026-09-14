import fg from 'fast-glob'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import type { Config } from './config/schema.js'

export interface DiscoveredMigrationFile {
  path: string
  absolutePath: string
  index: number
}

export interface DiscoverMigrationFilesOptions {
  baseDirectory?: string
}

export class MigrationDiscoveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MigrationDiscoveryError'
  }
}

export async function discoverMigrationFiles(
  config: Config,
  options: DiscoverMigrationFilesOptions = {},
): Promise<readonly DiscoveredMigrationFile[]> {
  const baseDirectory = resolve(options.baseDirectory ?? process.cwd())
  const exclusions = config.schema.filter((entry) => entry.startsWith('!'))
  const entries = config.schema.filter((entry) => !entry.startsWith('!'))
  if (!entries.length) throw new MigrationDiscoveryError('Schema contains no migration sources')

  const discovered: DiscoveredMigrationFile[] = []
  const owners = new Map<string, string>()
  for (const entry of entries) {
    const matches = (
      await fg([entry, ...exclusions], {
        cwd: baseDirectory,
        absolute: true,
        onlyFiles: true,
        unique: true,
        dot: true,
        followSymbolicLinks: false,
      })
    ).sort(compareText)
    if (!matches.length) {
      throw new MigrationDiscoveryError(
        `Migration source ${JSON.stringify(entry)} matched no files`,
      )
    }
    for (const match of matches) {
      const absolutePath = resolve(match)
      const owner = owners.get(absolutePath)
      if (owner) {
        throw new MigrationDiscoveryError(
          `Migration sources ${JSON.stringify(owner)} and ${JSON.stringify(entry)} both include ${JSON.stringify(displayPath(baseDirectory, absolutePath))}`,
        )
      }
      owners.set(absolutePath, entry)
      discovered.push({
        path: displayPath(baseDirectory, absolutePath),
        absolutePath,
        index: discovered.length,
      })
    }
  }
  return discovered
}

const displayPath = (baseDirectory: string, absolutePath: string): string => {
  const local = relative(baseDirectory, absolutePath)
  return normalizePath(local.startsWith('..') || isAbsolute(local) ? absolutePath : local)
}

const normalizePath = (path: string): string => (sep === '/' ? path : path.replaceAll(sep, '/'))
const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0
