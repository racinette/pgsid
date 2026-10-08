import { builtinMetadata } from '../../postgres/builtins/inventory.js'
import type { EvalExpression } from '../../sql-semantics/eval-expressions.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'

export function constantCheckExpression(expression: EvalBoolExpression): boolean {
  if (expression.kind === 'eval-scalar') return constantScalarExpression(expression.expression)
  if (expression.kind === 'certain') return 'value' in expression.expression
  if (expression.kind === 'eval-boolean-logic')
    return expression.operands.every(constantCheckExpression)
  if (expression.kind === 'eval-case')
    return (
      expression.branches.every(
        (branch) => constantCheckExpression(branch.when) && constantCheckExpression(branch.then),
      ) && constantCheckExpression(expression.otherwise)
    )
  if (expression.kind === 'eval-test') return constantCheckExpression(expression.operand)
  if (expression.kind === 'eval-comparison')
    return expression.operands.every(constantCheckExpression)
  return false
}

export function constantScalarExpression(expression: EvalExpression): boolean {
  if (expression.kind === 'check') return constantCheckExpression(expression.expression)
  if (expression.kind === 'null-test') return constantScalarExpression(expression.operand)
  if (expression.kind === 'boolean-logic' || expression.kind === 'coalesce')
    return expression.operands.every(constantScalarExpression)
  if (expression.kind === 'case')
    return (
      (!expression.scrutinee || constantScalarExpression(expression.scrutinee.expression)) &&
      expression.branches.every(
        (branch) => constantScalarExpression(branch.when) && constantScalarExpression(branch.then),
      ) &&
      constantScalarExpression(expression.otherwise)
    )
  return prepare(expression)?.constant ?? false
}

export type ConstantPreparation =
  | { kind: 'value'; expression: EvalExpression }
  | {
      kind: 'guard'
      expression: EvalExpression
      test: 'true' | 'null' | 'and' | 'or'
      selected: readonly ConstantPreparation[]
      otherwise: readonly ConstantPreparation[]
    }

type Preparation = {
  constant: boolean
  null: boolean
  expressions: readonly ConstantPreparation[]
}

const constant = (expression: EvalExpression, nullValue = false): Preparation => ({
  constant: true,
  null: nullValue,
  expressions: [{ kind: 'value', expression }],
})

function prepareAll(expressions: readonly EvalExpression[]): Preparation[] | null {
  const prepared = expressions.map(prepare)
  return prepared.every((operand): operand is Preparation => operand !== null) ? prepared : null
}

function prepare(expression: EvalExpression): Preparation | null {
  if (expression.kind === 'input' || expression.kind === 'input-null-test')
    return { constant: false, null: false, expressions: [] }
  if (expression.kind === 'regex-count')
    return prepare({
      kind: 'call',
      call: {
        kind: 'function',
        signature: expression.signature,
        type: 'pg_catalog.int4',
        collation: expression.collation,
      },
      operands: expression.operands,
    })
  if (expression.kind === 'membership') {
    const operands = prepareAll([expression.subject, ...expression.groups.flat()])
    if (!operands) return null
    return operands.every((operand) => operand.constant)
      ? constant(expression)
      : {
          constant: false,
          null: false,
          expressions: operands.flatMap((operand) => operand.expressions),
        }
  }
  if (expression.kind === 'check') {
    if (expression.expression.kind === 'eval-scalar')
      return prepare(expression.expression.expression)
    if (expression.expression.kind === 'certain')
      return prepare({ kind: 'certain', expression: expression.expression.expression })
    return constantCheckExpression(expression.expression) ? constant(expression) : null
  }
  if (
    expression.kind === 'certain' &&
    'value' in expression.expression &&
    (expression.expression.value === null ||
      typeof expression.expression.value === 'string' ||
      typeof expression.expression.value === 'boolean')
  )
    return constant(expression, expression.expression.value === null)
  if (expression.kind === 'null-test') {
    const operand = prepare(expression.operand)
    if (!operand) return null
    return operand.constant ? constant(expression) : { ...operand, null: false }
  }
  if (
    expression.kind === 'text-to-network' ||
    expression.kind === 'text-to-mac' ||
    expression.kind === 'mac-to-text' ||
    expression.kind === 'text-to-uuid' ||
    expression.kind === 'text-to-bytea' ||
    expression.kind === 'uuid-to-text' ||
    expression.kind === 'bit-to-text' ||
    expression.kind === 'text-to-bit' ||
    expression.kind === 'text-to-date' ||
    expression.kind === 'text-to-timestamp' ||
    expression.kind === 'text-to-timestamptz'
  ) {
    const operand = prepare(expression.operand)
    if (!operand) return null
    return operand.constant ? constant(expression, operand.null) : operand
  }
  if (expression.kind === 'case') {
    const scrutinee = expression.scrutinee ? prepare(expression.scrutinee.expression) : null
    if (expression.scrutinee && !scrutinee) return null
    const operands = prepareAll([
      ...expression.branches.flatMap((branch) => [branch.when, branch.then]),
      expression.otherwise,
    ])
    if (!operands) return null
    if ((!scrutinee || scrutinee.constant) && operands.every((operand) => operand.constant))
      return constant(expression)
    let steps = operands.at(-1)!.expressions
    for (let index = expression.branches.length - 1; index >= 0; index--) {
      const branch = expression.branches[index]!
      const when = operands[index * 2]!
      const selected = operands[index * 2 + 1]!.expressions
      if (when.constant && (!scrutinee || scrutinee.constant)) {
        const condition: EvalExpression = expression.scrutinee
          ? {
              kind: 'call',
              call: branch.equality!,
              operands: [expression.scrutinee.expression, branch.when],
            }
          : branch.when
        steps = [{ kind: 'guard', expression: condition, test: 'true', selected, otherwise: steps }]
      } else steps = [...when.expressions, ...selected, ...steps]
    }
    return {
      constant: false,
      null: false,
      expressions: [...(scrutinee?.expressions ?? []), ...steps],
    }
  }
  if (expression.kind === 'coalesce') {
    const operands = prepareAll(expression.operands)
    if (!operands) return null
    if (operands.every((operand) => operand.constant)) return constant(expression)
    let steps: readonly ConstantPreparation[] = []
    for (let index = operands.length - 1; index >= 0; index--) {
      const operand = operands[index]!
      steps = operand.constant
        ? [
            {
              kind: 'guard',
              expression: expression.operands[index]!,
              test: 'null',
              selected: steps,
              otherwise: [],
            },
          ]
        : [...operand.expressions, ...steps]
    }
    return { constant: false, null: false, expressions: steps }
  }
  if (expression.kind === 'boolean-logic') {
    const operands = prepareAll(expression.operands)
    if (!operands) return null
    if (operands.every((operand) => operand.constant)) return constant(expression)
    const first = operands[0]!
    const remaining = operands.slice(1).flatMap((operand) => operand.expressions)
    return {
      constant: false,
      null: false,
      expressions:
        first.constant && expression.operation !== 'not'
          ? [
              {
                kind: 'guard',
                expression: expression.operands[0]!,
                test: expression.operation,
                selected: remaining,
                otherwise: [],
              },
            ]
          : [...first.expressions, ...remaining],
    }
  }
  if (expression.kind !== 'call') return null
  const operands = expression.operands.map(prepare)
  if (operands.some((operand) => operand === null)) return null
  const prepared = operands as Preparation[]
  let strict = false
  let immutable = false
  if (expression.call.kind === 'cast' && expression.call.signature === null) {
    strict = true
    immutable = true
  } else if (expression.call.signature !== null) {
    const metadata = builtinMetadata(expression.call.signature)
    const implementation =
      metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
    if (implementation.kind !== 'function' || implementation.returnsSet) return null
    strict = implementation.strict
    immutable = implementation.volatility === 'i'
  }
  if (!immutable) return null
  const nullResult = strict && prepared.some((operand) => operand.null)
  const isConstant = nullResult || prepared.every((operand) => operand.constant)
  return {
    constant: isConstant,
    null: nullResult,
    expressions: isConstant
      ? [{ kind: 'value', expression }]
      : prepared.flatMap((operand) => operand.expressions),
  }
}

export function strictNullPreparation(
  expression: Extract<EvalExpression, { kind: 'call' }>,
): readonly ConstantPreparation[] | null {
  const operands = expression.operands.map(prepare)
  if (operands.some((operand) => operand === null)) return null
  const prepared = operands as Preparation[]
  if (!prepared.some((operand) => operand.null)) return null
  if (expression.call.signature !== null) {
    const metadata = builtinMetadata(expression.call.signature)
    const implementation =
      metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
    if (implementation.kind !== 'function' || !implementation.strict || implementation.returnsSet)
      return null
  } else if (expression.call.kind !== 'cast') return null
  return prepared.flatMap((operand) => operand.expressions)
}
