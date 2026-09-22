import { emitSqlExpression, type ExpressionBackend, type SqlExpression } from './expressions.js'
import type { TypedSqlExpression } from './signatures.js'

export type EvalBoolExpression =
  | { kind: 'certain'; expression: SqlExpression }
  | { kind: 'uncertain' }
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
  | {
      kind: 'eval-comparison'
      operation: '=' | '<>' | '<' | '<=' | '>' | '>='
      operands: readonly [EvalBoolExpression, EvalBoolExpression]
    }

export interface EvalBoolBackend<Ast> {
  certain: (value: TypedSqlExpression<Ast, 'pg_catalog.bool'>) => Ast
  uncertain: () => Ast
  logic: (
    operation: 'and' | 'or' | 'not',
    operands: readonly Ast[],
  ) => { expression: Ast; helpers: readonly string[] }
  case: (
    branches: readonly { when: Ast; then: Ast }[],
    otherwise: Ast,
  ) => { expression: Ast; helpers: readonly string[] }
  test: (
    test: 'true' | 'false' | 'unknown',
    negated: boolean,
    operand: Ast,
  ) => { expression: Ast; helpers: readonly string[] }
  compare: (
    operation: '=' | '<>' | '<' | '<=' | '>' | '>=',
    operands: readonly [Ast, Ast],
  ) => { expression: Ast; helpers: readonly string[] }
}

export function emitEvalBoolExpression<Ast>(
  expression: EvalBoolExpression,
  scalarBackend: ExpressionBackend<Ast>,
  backend: EvalBoolBackend<Ast>,
): { value: TypedSqlExpression<Ast, 'eval-bool'>; helpers: readonly string[] } {
  const helpers = new Set<string>()
  const include = (names: readonly string[]): void => {
    for (const name of names) helpers.add(name)
  }
  const emit = (node: EvalBoolExpression): Ast => {
    if (node.kind === 'certain') {
      if (node.expression.type !== 'pg_catalog.bool')
        throw new Error('A certain CHECK atom must be boolean')
      const emitted = emitSqlExpression(node.expression, scalarBackend)
      include(emitted.helpers)
      helpers.add('evalBoolCertain')
      return backend.certain(emitted.value as TypedSqlExpression<Ast, 'pg_catalog.bool'>)
    }
    if (node.kind === 'uncertain') {
      helpers.add('evalBoolUncertain')
      return backend.uncertain()
    }
    if (node.kind === 'eval-boolean-logic') {
      if (node.operands.length !== (node.operation === 'not' ? 1 : 2))
        throw new Error('Invalid EvalBool expression')
      const result = backend.logic(node.operation, node.operands.map(emit))
      include(result.helpers)
      return result.expression
    }
    if (node.kind === 'eval-case') {
      if (node.branches.length === 0) throw new Error('Invalid EvalBool CASE expression')
      const result = backend.case(
        node.branches.map((branch) => ({ when: emit(branch.when), then: emit(branch.then) })),
        emit(node.otherwise),
      )
      include(result.helpers)
      return result.expression
    }
    if (node.kind === 'eval-test') {
      const result = backend.test(node.test, node.negated, emit(node.operand))
      include(result.helpers)
      return result.expression
    }
    const result = backend.compare(node.operation, [emit(node.operands[0]), emit(node.operands[1])])
    include(result.helpers)
    return result.expression
  }
  return { value: { type: 'eval-bool', expression: emit(expression) }, helpers: [...helpers] }
}
