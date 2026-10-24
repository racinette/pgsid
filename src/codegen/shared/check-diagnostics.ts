import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import type { CheckExecutionContext } from './check-rust-evaluator.js'
import { circlePolygonTrigonometry } from './check-trigonometry-context.js'
import { builtinCallables } from '../../postgres/builtins/inventory.js'
import { callableIdentity } from '../../postgres/builtins/catalog.js'

const trigonometry = new Set(
  builtinCallables().filter(circlePolygonTrigonometry).map(callableIdentity),
)
function needsTrigonometry(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(
    ([key, item]) =>
      (key === 'signature' && typeof item === 'string' && trigonometry.has(item)) ||
      needsTrigonometry(item),
  )
}

function needsAclRoleCatalog(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if (
    'kind' in value &&
    (value.kind === 'text-to-aclitem' ||
      (value.kind === 'aclitem' && 'value' in value && typeof value.value === 'string') ||
      (value.kind === 'io-to-text' &&
        'operand' in value &&
        value.operand !== null &&
        typeof value.operand === 'object' &&
        'type' in value.operand &&
        value.operand.type === 'pg_catalog.aclitem'))
  )
    return true
  return Object.values(value).some(needsAclRoleCatalog)
}

export function checkUnknownMessage(
  expression: EvalBoolExpression,
  reason?: string,
  context: CheckExecutionContext = {},
): string {
  if (expression.kind === 'uncertain')
    return 'This CHECK expression is not supported by the local evaluator.'
  if (reason) return `Local evaluation is incomplete: ${reason}`
  let message =
    'A required input is unavailable, or its value or an evaluated expression is not supported.'
  if (needsAclRoleCatalog(expression))
    message += ' ACL text input and rendered role names also require the deployment role catalog.'
  return context.trigonometry !== 'fdlibm' && needsTrigonometry(expression)
    ? message +
        ' Circle-to-polygon coordinate generation also requires sql.codegen.checks.trigonometry: fdlibm.'
    : message
}
