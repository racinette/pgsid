import type { CheckRustSource } from './check-rust-source.js'

export function checkRustSourceCallables(source: CheckRustSource): Set<string> {
  return new Set(
    source.modules.flatMap((module) =>
      module.files.flatMap((file) =>
        [...file.source.matchAll(/\bfn (sql__[a-z0-9_]+)\s*\(/gu)].map((match) => match[1]!),
      ),
    ),
  )
}

function copySource(source: CheckRustSource): CheckRustSource {
  return {
    ...source,
    modules: source.modules.map((module) => ({
      ...module,
      dependencies: [...module.dependencies],
      files: module.files.map((file) => ({ ...file })),
    })),
  }
}

export function createCheckRustSourceCache(
  read: () => Buffer,
  parse: (text: string) => CheckRustSource = (text) => JSON.parse(text) as CheckRustSource,
): { source(): CheckRustSource; callables(): Set<string> } {
  let cached: { bytes: Buffer; source: CheckRustSource; callables: ReadonlySet<string> } | undefined
  const current = () => {
    const bytes = read()
    if (!cached || !bytes.equals(cached.bytes)) {
      const key = Buffer.from(bytes)
      const source = copySource(parse(key.toString('utf8')))
      cached = { bytes: key, source, callables: checkRustSourceCallables(source) }
    }
    return cached
  }
  return {
    source: () => copySource(current().source),
    callables: () => new Set(current().callables),
  }
}
