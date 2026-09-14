import { readFile } from 'node:fs/promises'
import type { Config } from './config/schema.js'
import {
  discoverQueryFiles,
  type DiscoverQueryFilesOptions,
  type DiscoveredQueryFile,
} from './query-discovery.js'
import type { QuerySourceInput } from './query-batch.js'

export async function loadQuerySources(
  config: Config,
  options: DiscoverQueryFilesOptions = {},
): Promise<readonly QuerySourceInput[]> {
  const files = await discoverQueryFiles(config, options)
  const loaded = await Promise.all(files.map(loadSource))
  return loaded.filter((source): source is QuerySourceInput => source !== undefined)
}

const loadSource = async (file: DiscoveredQueryFile): Promise<QuerySourceInput | undefined> => {
  try {
    return {
      path: file.path,
      content: await readFile(file.absolutePath),
      ...(file.output ? { output: file.output } : {}),
    }
  } catch (error) {
    if (isMissing(error)) return undefined
    throw error
  }
}

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'
