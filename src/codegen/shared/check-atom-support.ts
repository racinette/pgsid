import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import type { EvalExpression } from '../../sql-semantics/eval-expressions.js'
import type { SqlBindingGroup } from '../../sql-semantics/signatures.js'
import { checkRustCallableNames } from './check-rust-source.js'
import { builtinMetadata } from '../../postgres/builtins/inventory.js'
import { enumEqualityOperation } from '../../sql-semantics/expressions.js'
import { goSqlBackend } from '../go/sql/registry.js'
import { typescriptSqlBackend } from '../typescript/sql/registry.js'

const signatures = <Ast>(bindings: readonly SqlBindingGroup<Ast>[]): Set<string> =>
  new Set(
    bindings.flatMap((group) => [
      ...Object.keys(group.operators).filter((key) => group.operators[key] !== undefined),
      ...Object.keys(group.functions).filter((key) => group.functions[key] !== undefined),
    ]),
  )
const go = signatures(goSqlBackend.bindings)
const typescript = signatures(typescriptSqlBackend.bindings)
const portable = (signature: string, rustNames: ReadonlySet<string>): boolean => {
  if (enumEqualityOperation(signature) !== null) return true
  const metadata = builtinMetadata(signature)
  const implementation =
    metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
  return (
    metadata.volatility === 'i' &&
    ((go.has(signature) && typescript.has(signature)) ||
      (implementation.kind === 'function' && rustNames.has(implementation.rustName)))
  )
}

export function portableCheckAtoms(expression: EvalBoolExpression): EvalBoolExpression {
  const rustNames = checkRustCallableNames()
  const scalar = (value: EvalExpression): EvalExpression => {
    if (
      value.kind === 'text-to-date' ||
      value.kind === 'text-to-timestamp' ||
      value.kind === 'text-to-timestamptz' ||
      value.kind === 'text-to-network' ||
      value.kind === 'text-to-mac' ||
      value.kind === 'mac-to-text' ||
      value.kind === 'text-to-uuid' ||
      value.kind === 'uuid-to-text'
    )
      return { ...value, operand: scalar(value.operand) }
    if (value.kind === 'check') return { ...value, expression: bool(value.expression) }
    if (value.kind === 'call' && value.call.kind === 'cast' && value.call.signature === null)
      return { ...value, operands: value.operands.map(scalar) }
    if (value.kind === 'call')
      return value.call.signature !== null && portable(value.call.signature, rustNames)
        ? { ...value, operands: value.operands.map(scalar) }
        : { kind: 'uncertain', type: value.call.type }
    if (value.kind === 'boolean-logic' || value.kind === 'coalesce')
      return { ...value, operands: value.operands.map(scalar) }
    if (value.kind === 'membership')
      return {
        ...value,
        subject: scalar(value.subject),
        groups: value.groups.map((group) => group.map(scalar)),
      }
    if (value.kind === 'null-test') return { ...value, operand: scalar(value.operand) }
    if (value.kind === 'case')
      return {
        ...value,
        ...(value.scrutinee
          ? { scrutinee: { ...value.scrutinee, expression: scalar(value.scrutinee.expression) } }
          : {}),
        branches: value.branches.map((branch) => ({
          ...branch,
          when: scalar(branch.when),
          then: scalar(branch.then),
        })),
        otherwise: scalar(value.otherwise),
      }
    if (value.kind === 'regex-count') return { ...value, operands: value.operands.map(scalar) }
    return value
  }
  const bool = (value: EvalBoolExpression): EvalBoolExpression => {
    if (value.kind === 'eval-scalar') return { ...value, expression: scalar(value.expression) }
    if (value.kind === 'eval-boolean-logic') return { ...value, operands: value.operands.map(bool) }
    if (value.kind === 'eval-case')
      return {
        ...value,
        branches: value.branches.map((branch) => ({
          when: bool(branch.when),
          then: bool(branch.then),
        })),
        otherwise: bool(value.otherwise),
      }
    if (value.kind === 'eval-test') return { ...value, operand: bool(value.operand) }
    if (value.kind === 'eval-comparison')
      return {
        ...value,
        operands: value.operands.map(bool) as [EvalBoolExpression, EvalBoolExpression],
      }
    return value
  }
  return bool(expression)
}
