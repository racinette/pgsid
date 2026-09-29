import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import { checkRustAsset } from './check-rust-assets.js'
import { emitCheckRustEvaluator, UnsupportedCheckRustExpression } from './check-rust-evaluator.js'

export function assembleCheckRust(evaluator: {
  source: string
  callables: readonly string[]
  requiresRegex?: boolean
}): string {
  const asset = (name: string): string => {
    return checkRustAsset(name).toString('utf8')
  }
  const operations = asset('check-rust-integer.rs')
  const available = new Set(
    [...operations.matchAll(/\bfn (sql__[a-z0-9_]+)\s*\(/gu)].map((match) => match[1]!),
  )
  for (const name of evaluator.callables)
    if (!available.has(name))
      throw new UnsupportedCheckRustExpression(`Rust CHECK callable has no implementation: ${name}`)
  return `${evaluator.requiresRegex ? asset('check-rust-regex.rs') : ''}\n${operations}\n${evaluator.source}`
}

export function prepareCheckRust(
  expression: EvalBoolExpression,
  index?: number,
):
  | { kind: 'supported'; evaluator: ReturnType<typeof emitCheckRustEvaluator>; source: string }
  | { kind: 'unsupported'; reason: string } {
  try {
    const evaluator = emitCheckRustEvaluator(expression, index)
    return { kind: 'supported', evaluator, source: assembleCheckRust(evaluator) }
  } catch (error) {
    if (error instanceof UnsupportedCheckRustExpression)
      return { kind: 'unsupported', reason: error.message }
    throw error
  }
}

export function prepareCheckRustGroup(expressions: readonly EvalBoolExpression[]): {
  checks: readonly (
    | {
        kind: 'supported'
        entryName: string
        inputs: ReturnType<typeof emitCheckRustEvaluator>['inputs']
      }
    | { kind: 'unsupported'; reason: string }
  )[]
  evaluatorSource: string | null
  source: string | null
} {
  const prepared = expressions.map((expression, index) => prepareCheckRust(expression, index))
  const supported = prepared.flatMap((item) => (item.kind === 'supported' ? [item.evaluator] : []))
  const evaluatorSource = supported.length ? supported.map((item) => item.source).join('\n') : null
  return {
    checks: prepared.map((item) =>
      item.kind === 'supported'
        ? { kind: 'supported', entryName: item.evaluator.entryName, inputs: item.evaluator.inputs }
        : item,
    ),
    evaluatorSource,
    source: evaluatorSource
      ? assembleCheckRust({
          source: evaluatorSource,
          callables: [...new Set(supported.flatMap((item) => item.callables))],
          requiresRegex: supported.some((item) => item.requiresRegex),
        })
      : null,
  }
}
