import { assertUniqueCheckEntryNames, type CheckConstraintIdentity } from './check-rust-names.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import { checkRustAsset } from './check-rust-assets.js'
import {
  emitCheckRustEvaluator,
  UnsupportedCheckRustExpression,
  type CheckExecutionContext,
} from './check-rust-evaluator.js'
import { createCheckRustSourceCache, checkRustSourceCallables } from './check-rust-source-cache.js'

export type CheckRustSource = {
  schemaVersion: 1
  modules: {
    name: string
    dependencies: string[]
    files: { path: string; source: string }[]
  }[]
}

const maintainedSources = createCheckRustSourceCache(() =>
  checkRustAsset('check-rust-sources.json'),
)

export function checkRustCallableNames(source?: CheckRustSource): Set<string> {
  return source ? checkRustSourceCallables(source) : maintainedSources.callables()
}

export function assembleCheckRust(evaluator: {
  source: string
  callables: readonly string[]
  requiresRegex?: boolean
}): CheckRustSource {
  const maintained = maintainedSources.source()
  const timezoneCallables = checkRustCallableNames({
    ...maintained,
    modules: maintained.modules.map((module) => ({
      ...module,
      files: module.files.filter(
        (file) => module.name === 'pg_catalog' && /\/timezone(?:_|\.rs$)/u.test(file.path),
      ),
    })),
  })
  const requiresTimezone = evaluator.callables.some((name) => timezoneCallables.has(name))
  const unicodeCallables = checkRustCallableNames({
    ...maintained,
    modules: maintained.modules.map((module) => ({
      ...module,
      files: module.files.filter(
        (file) => module.name === 'pg_catalog' && /\/text_unicode\.rs$/u.test(file.path),
      ),
    })),
  })
  const requiresUnicode = evaluator.callables.some((name) => unicodeCallables.has(name))
  const executionSource = /\/jsonpath_execute\.rs$/u
  const executionFiles =
    /\/jsonpath_(?:execute|arithmetic|conversions|keyvalue|methods|predicates|regex)\.rs$/u
  const executionCallables = checkRustCallableNames({
    ...maintained,
    modules: maintained.modules.map((module) => ({
      ...module,
      files: module.files.filter(
        (file) => module.name === 'pg_catalog' && executionSource.test(file.path),
      ),
    })),
  })
  const requiresJsonpathExecution = evaluator.callables.some((name) => executionCallables.has(name))
  const regexCallables = checkRustCallableNames({
    ...maintained,
    modules: maintained.modules.map((module) => ({
      ...module,
      files: module.files.filter(
        (file) => module.name === 'pg_catalog' && /\/regex(?:_|\.rs$)/u.test(file.path),
      ),
    })),
  })
  const requiresRegex =
    requiresJsonpathExecution ||
    evaluator.requiresRegex === true ||
    evaluator.callables.some((name) => regexCallables.has(name))
  const modules = maintained.modules.flatMap((module) => {
    if (module.name === 'regex_engine' && !requiresRegex) return []
    return [
      {
        ...module,
        dependencies: module.dependencies.filter(
          (name) => requiresRegex || name !== 'regex_engine',
        ),
        files: module.files.filter((file) => {
          if (
            module.name === 'pg_catalog' &&
            !requiresJsonpathExecution &&
            executionFiles.test(file.path)
          )
            return false
          if (
            module.name === 'checkruntime' &&
            !requiresUnicode &&
            /\/unicode(?:_tables)?\.rs$/u.test(file.path)
          )
            return false
          if (
            module.name === 'pg_catalog' &&
            !requiresUnicode &&
            /\/text_unicode\.rs$/u.test(file.path)
          )
            return false
          if (
            module.name === 'pg_catalog' &&
            !requiresRegex &&
            (/\/regex(?:_|\.rs$)/u.test(file.path) || /\/jsonpath_input\.rs$/u.test(file.path))
          )
            return false
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
  executionContext: CheckExecutionContext = {},
):
  | {
      kind: 'supported'
      evaluator: ReturnType<typeof emitCheckRustEvaluator>
      source: CheckRustSource
    }
  | { kind: 'unsupported'; reason: string } {
  try {
    const evaluator = emitCheckRustEvaluator(expression, identity, executionContext)
    const source = assembleCheckRust(evaluator)
    return {
      kind: 'supported',
      evaluator: {
        ...evaluator,
        requiresRegex: source.modules.some((module) => module.name === 'regex_engine'),
      },
      source,
    }
  } catch (error) {
    if (error instanceof UnsupportedCheckRustExpression)
      return { kind: 'unsupported', reason: error.message }
    throw error
  }
}

export function prepareCheckRustGroup(
  constraints: readonly { expression: EvalBoolExpression; identity: CheckConstraintIdentity }[],
  executionContext: CheckExecutionContext = {},
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
    prepareCheckRust(expression, identity, executionContext),
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
