import {
  emitSqlCallable,
  emitSqlExpression,
  type ExpressionBackend,
  type SqlCallableExpression,
  type SqlExpression,
  type ScalarType,
} from './expressions.js'
import type { EvalBoolExpression } from './check-expressions.js'
import type { TypedSqlExpression } from './signatures.js'
import { builtinMetadata } from '../postgres/builtins/inventory.js'

export type EvalExpression =
  | { kind: 'check'; type: 'pg_catalog.bool'; expression: EvalBoolExpression }
  | { kind: 'input'; type: ScalarType; name: string }
  | { kind: 'certain'; expression: SqlExpression }
  | { kind: 'uncertain'; type: string }
  | {
      kind: 'boolean-logic'
      type: 'pg_catalog.bool'
      operation: 'and' | 'or' | 'not'
      operands: readonly EvalExpression[]
    }
  | {
      kind: 'membership'
      type: 'pg_catalog.bool'
      subject: EvalExpression
      groups: readonly (readonly EvalExpression[])[]
      comparison: SqlCallableExpression
      operation: 'and' | 'or'
    }
  | { kind: 'null-test'; type: 'pg_catalog.bool'; negated: boolean; operand: EvalExpression }
  | { kind: 'input-null-test'; type: 'pg_catalog.bool'; negated: boolean; name: string }
  | { kind: 'coalesce'; type: ScalarType; operands: readonly EvalExpression[] }
  | {
      kind: 'case'
      type: ScalarType
      scrutinee?: { expression: EvalExpression }
      branches: readonly {
        when: EvalExpression
        then: EvalExpression
        equality?: SqlCallableExpression
      }[]
      otherwise: EvalExpression
    }
  | {
      kind: 'call'
      call: SqlCallableExpression
      operands: readonly EvalExpression[]
    }
  | {
      kind: 'regex-count'
      signature: string
      collation: 'C'
      operands: readonly EvalExpression[]
    }

export interface EmittedEvalExpression<Ast> extends TypedSqlExpression<Ast> {
  effect: 'total' | 'partial'
}

export interface EvalExpressionBackend<Ast> {
  input?: (type: ScalarType, name: string) => { expression: Ast; helpers: readonly string[] }
  fromBool: (expression: Ast) => { expression: Ast; helpers: readonly string[] }
  certain: (type: string, expression: Ast) => { expression: Ast; helpers: readonly string[] }
  uncertain: (type: string) => { expression: Ast; helpers: readonly string[] }
  call: (
    type: string,
    operands: readonly EmittedEvalExpression<Ast>[],
    emitTotal: (operands: readonly TypedSqlExpression<Ast>[]) => {
      value: TypedSqlExpression<Ast>
      helpers: readonly string[]
    },
  ) => { expression: Ast; helpers: readonly string[] }
  logic: (
    operation: 'and' | 'or' | 'not',
    operands: readonly EmittedEvalExpression<Ast>[],
  ) => { expression: Ast; helpers: readonly string[] }
  nullTest: (
    operand: EmittedEvalExpression<Ast>,
    negated: boolean,
  ) => { expression: Ast; helpers: readonly string[] }
  inputNullTest?: (
    name: string,
    negated: boolean,
  ) => { expression: Ast; helpers: readonly string[] }
  coalesce: (
    type: string,
    operands: readonly EmittedEvalExpression<Ast>[],
  ) => { expression: Ast; helpers: readonly string[] }
  case: (
    type: string,
    branches: readonly { when: EmittedEvalExpression<Ast>; then: EmittedEvalExpression<Ast> }[],
    otherwise: EmittedEvalExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  bind: (
    type: string,
    operand: EmittedEvalExpression<Ast>,
    body: (bound: EmittedEvalExpression<Ast>) => EmittedEvalExpression<Ast>,
    name?: string,
  ) => { expression: Ast; helpers: readonly string[] }
  bindList: (
    type: string,
    operands: readonly EmittedEvalExpression<Ast>[],
    names: readonly string[],
    body: (bound: readonly EmittedEvalExpression<Ast>[]) => EmittedEvalExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  regexCount: (
    operands: readonly EmittedEvalExpression<Ast>[],
    pattern: string | undefined,
    flags: string | undefined,
  ) => { expression: Ast; helpers: readonly string[] }
}

export function emitEvalExpression<Ast>(
  expression: EvalExpression,
  scalarBackend: ExpressionBackend<Ast>,
  backend: EvalExpressionBackend<Ast>,
  emitBoolean?: (expression: EvalBoolExpression) => Ast,
): { value: TypedSqlExpression<Ast>; helpers: readonly string[] } {
  let nextBinding = 0
  const helpers = new Set<string>()
  const include = (names: readonly string[]): void => {
    for (const name of names) helpers.add(name)
  }
  const emitCall = (
    call: SqlCallableExpression,
    operands: readonly EmittedEvalExpression<Ast>[],
  ): EmittedEvalExpression<Ast> => {
    if (call.kind === 'cast' && call.signature === null) {
      if (operands.length !== 1 || operands[0]!.type !== call.type)
        throw new Error('Invalid partial relabel cast')
      return operands[0]!
    }
    const emitTotal = (raw: readonly TypedSqlExpression<Ast>[]) =>
      emitSqlCallable(call, raw, scalarBackend)
    if (operands.every((operand) => operand.effect === 'total')) {
      const result = emitTotal(operands)
      include(result.helpers)
      return { ...result.value, effect: 'total' }
    }
    const result = backend.call(call.type, operands, emitTotal)
    include(result.helpers)
    return { type: call.type, expression: result.expression, effect: 'partial' }
  }
  const emit = (node: EvalExpression): EmittedEvalExpression<Ast> => {
    if (node.kind === 'check') {
      if (!emitBoolean) throw new Error('A CHECK Boolean binding is required')
      const result = backend.fromBool(emitBoolean(node.expression))
      include(result.helpers)
      return { type: 'pg_catalog.bool', expression: result.expression, effect: 'partial' }
    }
    if (node.kind === 'input') {
      if (!backend.input) throw new Error(`No partial SQL input binding for ${node.name}`)
      const result = backend.input(node.type, node.name)
      include(result.helpers)
      return { type: node.type, expression: result.expression, effect: 'partial' }
    }
    if (node.kind === 'certain') {
      const result = emitSqlExpression(node.expression, scalarBackend)
      include(result.helpers)
      return { ...result.value, effect: 'total' }
    }
    if (node.kind === 'uncertain') {
      const result = backend.uncertain(node.type)
      include(result.helpers)
      return { type: node.type, expression: result.expression, effect: 'partial' }
    }
    if (node.kind === 'boolean-logic') {
      const operands = node.operands.map(emit)
      if (
        operands.length !== (node.operation === 'not' ? 1 : 2) ||
        operands.some((operand) => operand.type !== 'pg_catalog.bool')
      )
        throw new Error('Invalid partial boolean expression')
      if (operands.every((operand) => operand.effect === 'total')) {
        const result = scalarBackend.syntax(node.operation, node.type, operands)
        include(result.helpers)
        return { type: node.type, expression: result.expression, effect: 'total' }
      }
      const result = backend.logic(node.operation, operands)
      include(result.helpers)
      return { type: node.type, expression: result.expression, effect: 'partial' }
    }
    if (node.kind === 'membership') {
      if (!node.groups.length || node.groups.some((group) => !group.length))
        throw new Error('Invalid membership expression')
      const combine = (
        operands: readonly EmittedEvalExpression<Ast>[],
      ): EmittedEvalExpression<Ast> =>
        operands.slice(1).reduce((left, right) => {
          const result = backend.logic(node.operation, [left, right])
          include(result.helpers)
          return { type: node.type, expression: result.expression, effect: 'partial' }
        }, operands[0]!)
      const result = backend.bind(
        node.type,
        emit(node.subject),
        (subject) =>
          combine(
            node.groups.map((group) => {
              const result = backend.bindList(
                node.type,
                group.map(emit),
                group.map(() => `membership_member_${nextBinding++}`),
                (members) =>
                  combine(members.map((member) => emitCall(node.comparison, [subject, member]))),
              )
              include(result.helpers)
              return { type: node.type, expression: result.expression, effect: 'partial' }
            }),
          ),
        `membership_subject_${nextBinding++}`,
      )
      include(result.helpers)
      return { type: node.type, expression: result.expression, effect: 'partial' }
    }
    if (node.kind === 'input-null-test') {
      if (!backend.inputNullTest) throw new Error(`No NULL input binding for ${node.name}`)
      const result = backend.inputNullTest(node.name, node.negated)
      include(result.helpers)
      return { type: node.type, expression: result.expression, effect: 'partial' }
    }
    if (node.kind === 'null-test') {
      const operand = emit(node.operand)
      if (operand.effect === 'total') {
        const result = scalarBackend.syntax(node.negated ? 'is-not-null' : 'is-null', node.type, [
          operand,
        ])
        include(result.helpers)
        return { type: node.type, expression: result.expression, effect: 'total' }
      }
      const result = backend.nullTest(operand, node.negated)
      include(result.helpers)
      return { type: node.type, expression: result.expression, effect: 'partial' }
    }
    if (node.kind === 'coalesce') {
      const operands = node.operands.map(emit)
      if (operands.length === 0 || operands.some((operand) => operand.type !== node.type))
        throw new Error('Invalid partial COALESCE expression')
      if (operands.every((operand) => operand.effect === 'total')) {
        const result = scalarBackend.syntax('coalesce', node.type, operands)
        include(result.helpers)
        return { type: node.type, expression: result.expression, effect: 'total' }
      }
      const result = backend.coalesce(node.type, operands)
      include(result.helpers)
      return { type: node.type, expression: result.expression, effect: 'partial' }
    }
    if (node.kind === 'case') {
      const emitCase = (scrutinee?: EmittedEvalExpression<Ast>): EmittedEvalExpression<Ast> => {
        if (node.branches.length === 0) throw new Error('Invalid partial CASE expression')
        const branches = node.branches.map((branch) => ({
          when:
            scrutinee && node.scrutinee
              ? emitCall(branch.equality!, [scrutinee, emit(branch.when)])
              : emit(branch.when),
          then: emit(branch.then),
        }))
        const otherwise = emit(node.otherwise)
        if (
          branches.some(
            (branch) => branch.when.type !== 'pg_catalog.bool' || branch.then.type !== node.type,
          ) ||
          otherwise.type !== node.type
        )
          throw new Error('Invalid partial CASE expression')
        if (
          branches.every(
            (branch) => branch.when.effect === 'total' && branch.then.effect === 'total',
          ) &&
          otherwise.effect === 'total'
        ) {
          const result = scalarBackend.syntax('case', node.type, [
            ...branches.flatMap((branch) => [branch.when, branch.then]),
            otherwise,
          ])
          include(result.helpers)
          return { type: node.type, expression: result.expression, effect: 'total' }
        }
        const result = backend.case(node.type, branches, otherwise)
        include(result.helpers)
        return { type: node.type, expression: result.expression, effect: 'partial' }
      }
      if (!node.scrutinee) return emitCase()
      const result = backend.bind(node.type, emit(node.scrutinee.expression), emitCase)
      include(result.helpers)
      return { type: node.type, expression: result.expression, effect: 'partial' }
    }
    if (node.kind === 'regex-count') {
      const metadata = builtinMetadata(node.signature)
      const operands = node.operands.map(emit)
      if (
        metadata.kind !== 'function' ||
        metadata.schema !== 'pg_catalog' ||
        metadata.name !== 'regexp_count' ||
        metadata.result !== 'pg_catalog.int4' ||
        !metadata.strict ||
        metadata.returnsSet ||
        metadata.args.length !== operands.length ||
        metadata.args.length < 2 ||
        metadata.args.length > 4 ||
        metadata.args.some((type, index) => operands[index]?.type !== type) ||
        node.collation !== 'C'
      )
        throw new Error(`Unsupported partial regex count signature: ${node.signature}`)
      const literal = (index: number): string | undefined => {
        const operand = node.operands[index]
        return operand?.kind === 'certain' &&
          operand.expression.kind === 'text' &&
          operand.expression.value !== null
          ? operand.expression.value
          : undefined
      }
      const result = backend.regexCount(operands, literal(1), literal(3))
      include(result.helpers)
      return { type: 'pg_catalog.int4', expression: result.expression, effect: 'partial' }
    }
    return emitCall(node.call, node.operands.map(emit))
  }
  const result = emit(expression)
  if (result.effect === 'partial') return { value: result, helpers: [...helpers] }
  const lifted = backend.certain(result.type, result.expression)
  include(lifted.helpers)
  return { value: { type: result.type, expression: lifted.expression }, helpers: [...helpers] }
}
