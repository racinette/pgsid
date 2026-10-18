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
  if (
    expression.kind === 'boolean-logic' ||
    expression.kind === 'coalesce' ||
    expression.kind === 'array-constructor'
  )
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
  if (expression.kind === 'text-to-enum') {
    const operand = prepare(expression.operand)
    return expression.literal
      ? constant(expression)
      : operand
        ? { constant: false, null: operand.null, expressions: operand.expressions }
        : null
  }
  if (expression.kind === 'array-domain-coerce') {
    const operand = prepare(expression.operand)
    return operand
      ? { constant: false, null: operand.null, expressions: operand.expressions }
      : null
  }
  if (expression.kind === 'domain-cast') {
    const operand = prepare(expression.operand)
    return operand ? { constant: false, null: false, expressions: operand.expressions } : null
  }
  if (expression.kind === 'array-io-coerce') {
    const operand = prepare(expression.operand)
    if (!operand) return null
    const immutable = [expression.input, expression.output].every((signature) => {
      const metadata = builtinMetadata(signature)
      return metadata.kind === 'function' && metadata.volatility === 'i'
    })
    return immutable && operand.constant
      ? constant(expression, operand.null)
      : { constant: false, null: operand.null, expressions: operand.expressions }
  }
  if (expression.kind === 'array-coerce') {
    const operand = prepare(expression.operand)
    if (!operand) return null
    const metadata =
      expression.conversion.signature === null
        ? null
        : builtinMetadata(expression.conversion.signature)
    const immutable =
      metadata === null || (metadata.kind === 'function' && metadata.volatility === 'i')
    return immutable && operand.constant
      ? constant(expression, operand.null)
      : { constant: false, null: operand.null, expressions: operand.expressions }
  }
  if (expression.kind === 'array-subscript') {
    const operands = prepareAll([
      expression.operand,
      ...expression.upper.filter((bound): bound is EvalExpression => bound !== null),
      ...expression.lower.filter((bound): bound is EvalExpression => bound !== null),
    ])
    return operands
      ? operands.every((operand) => operand.constant)
        ? constant(expression)
        : {
            constant: false,
            null: false,
            expressions: operands.flatMap((operand) => operand.expressions),
          }
      : null
  }
  if (expression.kind === 'array-text-literal') return constant(expression)
  if (
    expression.kind === 'certain' &&
    expression.expression.kind === 'array' &&
    expression.expression.elements === null
  )
    return constant(expression, true)
  if (expression.kind === 'text-to-array' || expression.kind === 'array-to-text') {
    const operand = prepare(expression.operand)
    return operand
      ? { constant: false, null: operand.null, expressions: operand.expressions }
      : null
  }
  if (expression.kind === 'array-constructor') {
    const operands = prepareAll(expression.operands)
    if (!operands) return null
    return operands.every((operand) => operand.constant)
      ? constant(expression)
      : {
          constant: false,
          null: false,
          expressions: operands.flatMap((operand) => operand.expressions),
        }
  }
  if (expression.kind === 'interval-literal') return constant(expression)
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
  if (expression.kind === 'nullif') {
    const operands = prepareAll(expression.operands)
    if (!operands) return null
    const nullResult = operands[0]!.null
    return nullResult || operands.every((operand) => operand.constant)
      ? constant(expression, nullResult)
      : {
          constant: false,
          null: false,
          expressions: operands.flatMap((operand) => operand.expressions),
        }
  }
  if (
    expression.kind === 'membership' ||
    expression.kind === 'array-quantifier' ||
    expression.kind === 'distinct' ||
    expression.kind === 'minmax' ||
    expression.kind === 'row-compare'
  ) {
    const operands = prepareAll(
      expression.kind === 'row-compare'
        ? expression.pairs.flatMap((pair) => pair.operands)
        : expression.kind !== 'membership'
          ? expression.operands
          : [expression.subject, ...expression.groups.flat()],
    )
    if (!operands) return null
    const immutable =
      expression.kind !== 'array-quantifier' ||
      (expression.comparison.signature !== null &&
        builtinMetadata(expression.comparison.signature).volatility === 'i')
    return immutable && operands.every((operand) => operand.constant)
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
  if (expression.kind === 'certain' && expression.expression.kind === 'float')
    return constant(expression, expression.expression.bits === null)
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
    expression.kind === 'array-typmod' ||
    expression.kind === 'text-to-network' ||
    expression.kind === 'text-to-mac' ||
    expression.kind === 'mac-to-text' ||
    expression.kind === 'io-to-text' ||
    expression.kind === 'refcursor-text-coercion' ||
    expression.kind === 'text-to-point' ||
    expression.kind === 'text-to-line' ||
    expression.kind === 'text-to-lseg' ||
    expression.kind === 'text-to-money' ||
    expression.kind === 'text-to-xid' ||
    expression.kind === 'text-to-cid' ||
    expression.kind === 'text-to-pg_lsn' ||
    expression.kind === 'text-to-tid' ||
    expression.kind === 'text-to-xid8' ||
    expression.kind === 'text-to-snapshot' ||
    expression.kind === 'text-to-json' ||
    expression.kind === 'text-to-oid' ||
    expression.kind === 'text-to-polygon' ||
    expression.kind === 'text-to-path' ||
    expression.kind === 'text-to-circle' ||
    expression.kind === 'text-to-box' ||
    expression.kind === 'text-to-uuid' ||
    expression.kind === 'text-to-bytea' ||
    expression.kind === 'uuid-to-text' ||
    expression.kind === 'bit-to-text' ||
    expression.kind === 'text-to-float' ||
    expression.kind === 'text-to-integer' ||
    expression.kind === 'text-to-numeric' ||
    expression.kind === 'text-to-boolean' ||
    expression.kind === 'text-to-bit' ||
    expression.kind === 'clock-to-text' ||
    expression.kind === 'text-to-interval' ||
    expression.kind === 'text-to-clock' ||
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

export function nullifNullPreparation(
  expression: Extract<EvalExpression, { kind: 'nullif' }>,
): readonly ConstantPreparation[] | null {
  const operands = prepareAll(expression.operands)
  return operands?.[0]?.null ? operands.flatMap((operand) => operand.expressions) : null
}
