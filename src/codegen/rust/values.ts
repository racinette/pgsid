import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// The values module's files: fixed source, the same for every project.
const files = ['mod.rs', 'json.rs', 'range.rs', 'temporal.rs'] as const

const source = (name: string): string => {
  const asset = new URL(`./assets/values/${name}`, import.meta.url)
  return readFileSync(existsSync(asset) ? asset : new URL(`./values/${name}`, import.meta.url), 'utf8')
}

export const rustValueArtifacts = (directory: string): { path: string; content: string }[] =>
  files.map((name) => ({ path: join(directory, name), content: source(name) }))
