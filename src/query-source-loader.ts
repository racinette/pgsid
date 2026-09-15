import { readFile as readSourceFile } from 'node:fs/promises'
import type { Config } from './config/schema.js'
import {
  discoverQueryFiles,
  type DiscoverQueryFilesOptions,
  type DiscoveredQueryFile,
} from './query-discovery.js'
import type { QuerySourceInput } from './query-batch.js'

export interface LoadQuerySourcesOptions extends DiscoverQueryFilesOptions {
  readFile?: (path: string) => Promise<string | Buffer>
}

export async function loadQuerySources(
  config: Config,
  options: LoadQuerySourcesOptions = {},
): Promise<readonly QuerySourceInput[]> {
  const files = await discoverQueryFiles(config, options)
  const read = options.readFile ?? readSourceFile
  const loaded = await Promise.all(files.map((file) => loadSource(file, read)))
  return loaded.filter((source): source is QuerySourceInput => source !== undefined)
}

const loadSource = async (
  file: DiscoveredQueryFile,
  read: (path: string) => Promise<string | Buffer>,
): Promise<QuerySourceInput | undefined> => {
  try {
    return {
      path: file.path,
      content: await read(file.absolutePath),
      routes: file.routes,
    }
  } catch (error) {
    if (isMissing(error)) return undefined
    throw error
  }
}

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'
