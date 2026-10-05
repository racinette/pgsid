import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'

export function checkUnknownMessage(expression: EvalBoolExpression, reason?: string): string {
  if (expression.kind === 'uncertain')
    return 'This CHECK expression is not supported by the local evaluator.'
  if (reason) return `Local evaluation is incomplete: ${reason}`
  return 'A required input is unavailable, or its value or an evaluated expression is not supported.'
}
