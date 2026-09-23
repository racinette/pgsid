import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import type { EvalBoolBackend } from '../../../sql-semantics/check-expressions.js'
import { compilePostgresRegex } from '../../../sql-semantics/regex/compiler.js'
import { REGEX_ENGINE_PROFILES } from '../../../sql-semantics/regex/profiles.generated.js'
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
    if (typeof pattern !== 'string')
      return {
        expression: factory.createCallExpression(identifier('evalBoolRegexDynamic'), undefined, [
          subject.expression,
          pattern.expression,
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
        helpers: ['evalBoolRegexDynamic'],
      }
    const compiled = compilePostgresRegex(pattern, REGEX_ENGINE_PROFILES.ecmascript, options)
    if (compiled.kind === 'invalid')
      return {
        expression: factory.createCallExpression(identifier('evalBoolRegexInvalid'), undefined, [
          subject.expression,
        ]),
        helpers: ['evalBoolRegexInvalid'],
      }
    if (compiled.kind === 'unsupported')
      return {
        expression: factory.createCallExpression(
          identifier('evalBoolRegexUnsupported'),
          undefined,
          [subject.expression],
        ),
        helpers: ['evalBoolRegexUnsupported'],
      }
    return {
      expression: factory.createCallExpression(identifier('evalBoolRegex'), undefined, [
        subject.expression,
        factory.createStringLiteral(compiled.source),
        factory.createStringLiteral(compiled.flags.join('')),
        negated ? factory.createTrue() : factory.createFalse(),
      ]),
      helpers: ['evalBoolRegex'],
    }
  },
  regexWithFlags: (subject, pattern, flags) => ({
    expression: factory.createCallExpression(identifier('evalBoolRegexpLike'), undefined, [
      subject.expression,
      pattern.expression,
      flags.expression,
    ]),
    helpers: ['evalBoolRegexpLike'],
  }),
  regexInvalidFlags: (subject, pattern) => ({
    expression: factory.createCallExpression(identifier('evalBoolRegexInvalidFlags'), undefined, [
      subject.expression,
      pattern.expression,
    ]),
    helpers: ['evalBoolRegexInvalidFlags'],
  }),
}
