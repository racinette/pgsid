import { go, type GoExpression } from '../ast.js'
import type { EvalBoolBackend } from '../../../sql-semantics/check-expressions.js'
import { goEvalBackend } from './eval.js'

const thunk = (expression: GoExpression): GoExpression => ({
  kind: 'function-literal',
  parameters: [],
  results: [{ type: go.ident('EvalBool') }],
  body: [{ kind: 'return', expressions: [expression] }],
})

export const goEvalBoolBackend: EvalBoolBackend<GoExpression> = {
  scalar: goEvalBackend,
  partialScalar: (value) => ({
    expression: go.call(go.ident('evalBoolFromValue'), [value]),
    helpers: ['evalBoolFromValue'],
  }),
  certain: (value) => go.call(go.ident('evalBoolCertain'), [value.expression]),
  uncertain: () => go.call(go.ident('evalBoolUncertain'), []),
  logic: (operation, operands) => ({
    expression: go.call(
      go.ident(
        operation === 'and' ? 'evalBoolAnd' : operation === 'or' ? 'evalBoolOr' : 'evalBoolNot',
      ),
      operation === 'not' ? [...operands] : operands.map(thunk),
    ),
    helpers: [
      operation === 'and' ? 'evalBoolAnd' : operation === 'or' ? 'evalBoolOr' : 'evalBoolNot',
    ],
  }),
  case: (branches, otherwise) => ({
    expression: go.call(go.ident('evalBoolCase'), [
      thunk(otherwise),
      go.composite(
        go.slice(go.functionType([], [{ type: go.ident('EvalBool') }])),
        branches.map((branch) => thunk(branch.when)),
      ),
      go.composite(
        go.slice(go.functionType([], [{ type: go.ident('EvalBool') }])),
        branches.map((branch) => thunk(branch.then)),
      ),
    ]),
    helpers: ['evalBoolCase'],
  }),
  test: (test, negated, operand) => ({
    expression: go.call(go.ident('evalBoolTest'), [
      operand,
      go.string(test),
      go.ident(negated ? 'true' : 'false'),
    ]),
    helpers: ['evalBoolTest'],
  }),
  compare: (operation, operands) => ({
    expression: go.call(go.ident('evalBoolCompare'), [
      operands[0],
      operands[1],
      go.string(operation),
    ]),
    helpers: ['evalBoolCompare'],
  }),
  regex: (subject, pattern, options, negated) => {
    return {
      expression: go.call(go.ident('evalBoolRegexEngine'), [
        subject.expression,
        typeof pattern === 'string'
          ? go.composite(go.ident('SqlText'), [
              go.keyValue('Value', go.string(pattern)),
              go.keyValue('Valid', go.ident('true')),
            ])
          : pattern.expression,
        go.string(options.syntax ?? 'advanced'),
        go.ident(options.caseSensitive === false ? 'false' : 'true'),
        go.ident(options.expanded === true ? 'true' : 'false'),
        go.string(options.newline ?? 'ordinary'),
        go.ident(negated ? 'true' : 'false'),
      ]),
      helpers: ['evalBoolRegexEngine'],
    }
  },
  regexWithFlags: (subject, pattern, flags) => ({
    expression: go.call(go.ident('evalBoolRegexpLikeEngine'), [
      subject.expression,
      pattern.expression,
      flags.expression,
    ]),
    helpers: ['evalBoolRegexpLikeEngine'],
  }),
  regexInvalidFlags: (subject, pattern) => ({
    expression: go.call(go.ident('evalBoolRegexInvalidFlags'), [
      subject.expression,
      pattern.expression,
    ]),
    helpers: ['evalBoolRegexInvalidFlags'],
  }),
}
