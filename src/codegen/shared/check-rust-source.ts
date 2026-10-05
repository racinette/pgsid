import { assertUniqueCheckEntryNames, type CheckConstraintIdentity } from './check-rust-names.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import { checkRustAsset } from './check-rust-assets.js'
import { emitCheckRustEvaluator, UnsupportedCheckRustExpression } from './check-rust-evaluator.js'

export type CheckRustSource = {
  schemaVersion: 1
  modules: {
    name: string
    dependencies: string[]
    files: { path: string; source: string }[]
  }[]
}

export function checkRustCallableNames(source?: CheckRustSource): Set<string> {
  const maintained =
    source ??
    (JSON.parse(checkRustAsset('check-rust-sources.json').toString('utf8')) as CheckRustSource)
  return new Set(
    maintained.modules.flatMap((module) =>
      module.files.flatMap((file) =>
        [...file.source.matchAll(/\bfn (sql__[a-z0-9_]+)\s*\(/gu)].map((match) => match[1]!),
      ),
    ),
  )
}

export function assembleCheckRust(evaluator: {
  source: string
  callables: readonly string[]
  requiresRegex?: boolean
}): CheckRustSource {
  const maintained = JSON.parse(
    checkRustAsset('check-rust-sources.json').toString('utf8'),
  ) as CheckRustSource
  const requiresTimezone = evaluator.callables.some((name) =>
    name.startsWith('sql__pg_catalog__timezone__'),
  )
  const modules = maintained.modules.flatMap((module) => {
    if (module.name === 'regex_engine' && !evaluator.requiresRegex) return []
    return [
      {
        ...module,
        dependencies: module.dependencies.filter(
          (name) => evaluator.requiresRegex || name !== 'regex_engine',
        ),
        files: module.files.filter((file) => {
          if (!evaluator.requiresRegex && file.path.endsWith('/regex.rs')) return false
          if (
            module.name === 'pg_catalog' &&
            !requiresTimezone &&
            /\/timezone(?:_|\.rs$)/u.test(file.path)
          )
            return false
          return true
        }),
      },
    ]
  })
  const available = checkRustCallableNames({ schemaVersion: 1, modules })
  for (const name of evaluator.callables)
    if (!available.has(name))
      throw new UnsupportedCheckRustExpression(`Rust CHECK callable has no implementation: ${name}`)
  return {
    schemaVersion: 1,
    modules: [
      ...modules,
      {
        name: 'checks',
        dependencies: ['checkruntime', 'pg_catalog'],
        files: [{ path: 'evaluators.rs', source: evaluator.source }],
      },
    ],
  }
}

export function prepareCheckRust(
  expression: EvalBoolExpression,
  identity?: CheckConstraintIdentity,
):
  | {
      kind: 'supported'
      evaluator: ReturnType<typeof emitCheckRustEvaluator>
      source: CheckRustSource
    }
  | { kind: 'unsupported'; reason: string } {
  try {
    const evaluator = emitCheckRustEvaluator(expression, identity)
    return { kind: 'supported', evaluator, source: assembleCheckRust(evaluator) }
  } catch (error) {
    if (error instanceof UnsupportedCheckRustExpression)
      return { kind: 'unsupported', reason: error.message }
    throw error
  }
}

export function prepareCheckRustGroup(
  constraints: readonly { expression: EvalBoolExpression; identity: CheckConstraintIdentity }[],
): {
  checks: readonly (
    | {
        kind: 'supported'
        entryName: string
        inputs: ReturnType<typeof emitCheckRustEvaluator>['inputs']
      }
    | { kind: 'unsupported'; reason: string }
  )[]
  evaluatorSource: string | null
  source: CheckRustSource | null
  requiresRegex: boolean
} {
  assertUniqueCheckEntryNames(constraints.map((constraint) => constraint.identity))
  const prepared = constraints.map(({ expression, identity }) =>
    prepareCheckRust(expression, identity),
  )
  const supported = prepared.flatMap((item) => (item.kind === 'supported' ? [item.evaluator] : []))
  const evaluatorSource = supported.length ? supported.map((item) => item.source).join('\n') : null
  return {
    checks: prepared.map((item) =>
      item.kind === 'supported'
        ? { kind: 'supported', entryName: item.evaluator.entryName, inputs: item.evaluator.inputs }
        : item,
    ),
    evaluatorSource,
    requiresRegex: supported.some((item) => item.requiresRegex),
    source: evaluatorSource
      ? assembleCheckRust({
          source: evaluatorSource,
          callables: [...new Set(supported.flatMap((item) => item.callables))],
          requiresRegex: supported.some((item) => item.requiresRegex),
        })
      : null,
  }
}
