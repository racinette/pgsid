import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import type { CheckRustSource } from '../../src/codegen/shared/check-rust-source.js'

// Each parity run records the runtime source files its generated checks can reach, so the fast
// tier can select the suites a source change affects. Reach follows identifier references from
// the checks module to the files defining them, transitively; it over-approximates, which only
// selects more suites.
export const checkReachDirectory = 'artifacts/check-gate/reach'

const definitionPattern = /\b(?:fn|const|static|struct|enum|type)\s+([A-Za-z_][A-Za-z0-9_]*)/gu
const identifierPattern = /[A-Za-z_][A-Za-z0-9_]*/gu

let cached: { key: string; edges: Map<string, Set<string>>; owners: Map<string, string> } | null =
  null

function runtimeGraph(source: CheckRustSource) {
  const files = source.modules
    .filter((module) => module.name !== 'checks')
    .flatMap((module) => module.files)
  const key = files.map((file) => file.path + ':' + file.source.length).join('|')
  if (cached?.key === key) return cached
  const owners = new Map<string, string>()
  for (const file of files)
    for (const match of file.source.matchAll(definitionPattern))
      if (!owners.has(match[1]!)) owners.set(match[1]!, file.path)
  const edges = new Map<string, Set<string>>()
  for (const file of files) {
    const targets = new Set<string>()
    for (const match of file.source.matchAll(identifierPattern)) {
      const owner = owners.get(match[0])
      if (owner && owner !== file.path) targets.add(owner)
    }
    edges.set(file.path, targets)
  }
  cached = { key, edges, owners }
  return cached
}

export function checkRustReach(source: CheckRustSource): string[] {
  const { edges, owners } = runtimeGraph(source)
  const reached = new Set<string>()
  const pending: string[] = []
  for (const file of source.modules.find((module) => module.name === 'checks')?.files ?? [])
    for (const match of file.source.matchAll(identifierPattern)) {
      const owner = owners.get(match[0])
      if (owner && !reached.has(owner)) {
        reached.add(owner)
        pending.push(owner)
      }
    }
  while (pending.length) {
    for (const target of edges.get(pending.pop()!) ?? [])
      if (!reached.has(target)) {
        reached.add(target)
        pending.push(target)
      }
  }
  return [...reached].sort()
}

// Merges with earlier runs of the same suite: a suite may run several parity groups, and a
// stale extra file only selects the suite once more.
export function recordCheckRustReach(source: CheckRustSource, testPath: string | undefined): void {
  if (!testPath) return
  const suite = relative(process.cwd(), testPath)
  const path = join(checkReachDirectory, basename(suite) + '.json')
  let previous: string[] = []
  try {
    previous = (JSON.parse(readFileSync(path, 'utf8')) as { files: string[] }).files
  } catch {
    // First record for this suite.
  }
  const files = [...new Set([...previous, ...checkRustReach(source)])].sort()
  mkdirSync(checkReachDirectory, { recursive: true })
  writeFileSync(path, JSON.stringify({ suite, files }, null, 1) + '\n')
}
