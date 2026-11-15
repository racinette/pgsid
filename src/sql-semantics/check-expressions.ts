import type { SqlExpression } from './expressions.js'
import type { EvalExpression } from './eval-expressions.js'

export type EvalBoolExpression =
  | { kind: 'eval-scalar'; expression: EvalExpression }
  | { kind: 'certain'; expression: SqlExpression }
  | { kind: 'uncertain'; preparation?: 'runtime'; reason?: 'context' }
  | {
      kind: 'eval-boolean-logic'
      operation: 'and' | 'or' | 'not'
      operands: readonly EvalBoolExpression[]
    }
  | {
      kind: 'eval-case'
      branches: readonly { when: EvalBoolExpression; then: EvalBoolExpression }[]
      otherwise: EvalBoolExpression
    }
  | {
      kind: 'eval-test'
      test: 'true' | 'false' | 'unknown'
      negated: boolean
      operand: EvalBoolExpression
    }
