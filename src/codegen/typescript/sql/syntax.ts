import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import type { ScalarType, SyntaxKind } from '../../../sql-semantics/expressions.js'
import type { TypedSqlExpression } from '../../../sql-semantics/signatures.js'

export function typescriptSqlSyntax(
  kind: SyntaxKind,
  _type: ScalarType,
  operands: readonly TypedSqlExpression<ts.Expression>[],
) {
  const thunk = (operand: TypedSqlExpression<ts.Expression>) =>
    factory.createArrowFunction(
      undefined,
      undefined,
      [],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      operand.expression,
    )
  const helper = {
    and: 'sqlBooleanAnd',
    or: 'sqlBooleanOr',
    not: 'sqlBooleanNot',
    'is-null': 'sqlIsNull',
    'is-not-null': 'sqlIsNotNull',
    case: 'sqlCase',
    coalesce: 'sqlCoalesce',
  }[kind]
  let args: ts.Expression[]
  if (kind === 'case') {
    args = [
      thunk(operands.at(-1)!),
      ...operands
        .slice(0, -1)
        .filter((_, i) => i % 2 === 0)
        .map((when, i) =>
          factory.createArrayLiteralExpression([thunk(when), thunk(operands[i * 2 + 1]!)]),
        ),
    ]
  } else
    args = operands.map((operand) =>
      ['and', 'or', 'coalesce'].includes(kind) ? thunk(operand) : operand.expression,
    )
  return {
    expression: factory.createCallExpression(identifier(helper), undefined, args),
    helpers: [helper],
  }
}
