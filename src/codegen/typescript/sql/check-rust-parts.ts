import { assembleCheckRust, type CheckRustSource } from '../../shared/check-rust-source.js'
import { splitRustItems } from '../../rust/evaluator.js'
import type { CheckRustParts } from './catalog-checks.js'

/**
 * One evaluator source for several groups' checks: an entry two groups both evaluate, such as a
 * table's check that two queries write, is declared once.
 */
export function combineCheckRustParts(parts: readonly CheckRustParts[]): CheckRustSource {
  const entries = new Map<string, string>()
  for (const part of parts)
    for (const item of splitRustItems(part.evaluatorSource))
      if (!entries.has(item.name ?? item.text)) entries.set(item.name ?? item.text, item.text)
  const declarations = new Map(parts.flatMap((part) => part.sharedDeclarations.map((item) => [item.name, item] as const)))
  return assembleCheckRust({
    source: [...entries.values()].join('\n\n'),
    callables: [...new Set(parts.flatMap((part) => part.callables))],
    requiresRegex: parts.some((part) => part.requiresRegex),
    sharedDeclarations: [...declarations.values()],
  })
}
