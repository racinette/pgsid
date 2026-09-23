import { go, type GoExpression } from '../ast.js'
import type { EvalBoolBackend } from '../../../sql-semantics/check-expressions.js'
import { compilePostgresRegex } from '../../../sql-semantics/regex/compiler.js'
import { REGEX_ENGINE_PROFILES } from '../../../sql-semantics/regex/profiles.generated.js'

const thunk = (expression: GoExpression): GoExpression => ({
  kind: 'function-literal',
  parameters: [],
  results: [{ type: go.ident('EvalBool') }],
  body: [{ kind: 'return', expressions: [expression] }],
})

export const goEvalBoolBackend: EvalBoolBackend<GoExpression> = {
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
    if (typeof pattern !== 'string')
      return {
        expression: go.call(go.ident('evalBoolRegexDynamic'), [
          subject.expression,
          pattern.expression,
          go.string(options.syntax ?? 'advanced'),
          go.ident(options.caseSensitive === false ? 'false' : 'true'),
          go.ident(options.expanded === true ? 'true' : 'false'),
          go.string(options.newline ?? 'ordinary'),
          go.ident(negated ? 'true' : 'false'),
        ]),
        helpers: ['evalBoolRegexDynamic'],
      }
    const compiled = compilePostgresRegex(pattern, REGEX_ENGINE_PROFILES.re2, options)
    if (compiled.kind === 'invalid')
      return {
        expression: go.call(go.ident('evalBoolRegexInvalid'), [subject.expression]),
        helpers: ['evalBoolRegexInvalid'],
      }
    if (compiled.kind === 'unsupported')
      return {
        expression: go.call(go.ident('evalBoolRegexUnsupported'), [subject.expression]),
        helpers: ['evalBoolRegexUnsupported'],
      }
    if (compiled.flags.length > 0) throw new Error('RE2 lowering emitted unsupported runtime flags')
    return {
      expression: go.call(go.ident('evalBoolRegex'), [
        subject.expression,
        go.string(compiled.source),
        go.ident(negated ? 'true' : 'false'),
      ]),
      helpers: ['evalBoolRegex'],
    }
  },
}
