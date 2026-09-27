import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import type { EvalBoolBackend } from '../../../sql-semantics/check-expressions.js'
import { typescriptEvalBackend } from './eval.js'

const thunk = (expression: ts.Expression): ts.ArrowFunction =>
  factory.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    expression,
  )

export const typescriptEvalBoolBackend: EvalBoolBackend<ts.Expression> = {
  scalar: typescriptEvalBackend,
  partialScalar: (value) => ({ expression: value, helpers: [] }),
  certain: (value) =>
    factory.createCallExpression(identifier('evalBoolCertain'), undefined, [value.expression]),
  uncertain: () => factory.createCallExpression(identifier('evalBoolUncertain'), undefined, []),
  logic: (operation, operands) => ({
    expression: factory.createCallExpression(
      identifier(
        operation === 'and' ? 'evalBoolAnd' : operation === 'or' ? 'evalBoolOr' : 'evalBoolNot',
      ),
      undefined,
      operation === 'not' ? operands : operands.map(thunk),
    ),
    helpers: [
      operation === 'and' ? 'evalBoolAnd' : operation === 'or' ? 'evalBoolOr' : 'evalBoolNot',
    ],
  }),
  case: (branches, otherwise) => ({
    expression: factory.createCallExpression(identifier('evalBoolCase'), undefined, [
      thunk(otherwise),
      ...branches.map((branch) =>
        factory.createArrayLiteralExpression([thunk(branch.when), thunk(branch.then)]),
      ),
    ]),
    helpers: ['evalBoolCase'],
  }),
  test: (test, negated, operand) => ({
    expression: factory.createCallExpression(identifier('evalBoolTest'), undefined, [
      operand,
      factory.createStringLiteral(test),
      negated ? factory.createTrue() : factory.createFalse(),
    ]),
    helpers: ['evalBoolTest'],
  }),
  compare: (operation, operands) => ({
    expression: factory.createCallExpression(identifier('evalBoolCompare'), undefined, [
      operands[0],
      operands[1],
      factory.createStringLiteral(operation),
    ]),
    helpers: ['evalBoolCompare'],
  }),
  regex: (subject, pattern, options, negated) => {
    return {
      expression: factory.createCallExpression(identifier('evalBoolRegexEngine'), undefined, [
        subject.expression,
        typeof pattern === 'string' ? factory.createStringLiteral(pattern) : pattern.expression,
        factory.createObjectLiteralExpression(
          Object.entries(options).map(([name, value]) =>
            factory.createPropertyAssignment(
              factory.createStringLiteral(name),
              typeof value === 'boolean'
                ? value
                  ? factory.createTrue()
                  : factory.createFalse()
                : factory.createStringLiteral(value),
            ),
          ),
        ),
        negated ? factory.createTrue() : factory.createFalse(),
      ]),
      helpers: ['evalBoolRegexEngine'],
    }
  },
  regexWithFlags: (subject, pattern, flags) => ({
    expression: factory.createCallExpression(identifier('evalBoolRegexpLikeEngine'), undefined, [
      subject.expression,
      pattern.expression,
      flags.expression,
    ]),
    helpers: ['evalBoolRegexpLikeEngine'],
  }),
  regexInvalidFlags: (subject, pattern) => ({
    expression: factory.createCallExpression(identifier('evalBoolRegexInvalidFlags'), undefined, [
      subject.expression,
      pattern.expression,
    ]),
    helpers: ['evalBoolRegexInvalidFlags'],
  }),
}
