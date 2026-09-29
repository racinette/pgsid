import { existsSync, readFileSync } from 'node:fs'

export function assembleCheckRust(evaluator: {
  source: string
  callables: readonly string[]
}): string {
  const source = new URL('../go/assets/check-rust-integer.rs', import.meta.url)
  const bundled = new URL('./check-rust-integer.rs', import.meta.url)
  const operations = readFileSync(existsSync(source) ? source : bundled, 'utf8')
  const available = new Set(
    [...operations.matchAll(/\bfn (sql__[a-z0-9_]+)\s*\(/gu)].map((match) => match[1]!),
  )
  for (const name of evaluator.callables)
    if (!available.has(name)) throw new Error(`Rust CHECK callable has no implementation: ${name}`)
  return `${operations}\n${evaluator.source}`
}
