import { emitSqlExpression, type ExpressionBackend, type SqlExpression } from './expressions.js'
import { builtinMetadata } from '../postgres/builtins/inventory.js'
import type { PostgresRegexOptions } from './regex/ast.js'
import { parseRegexpLikeFlags } from './regex/flags.js'
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
  | {
      kind: 'eval-regex'
      subject: SqlExpression
      pattern: string | SqlExpression
      options?: PostgresRegexOptions
      flags?: SqlExpression
      invalidFlags?: boolean
      negated: boolean
      collation: 'C'
    }
  | { kind: 'eval-call'; call: Extract<SqlExpression, { kind: 'operator' | 'function' }> }

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
  regex: (
    subject: TypedSqlExpression<Ast>,
    pattern: string | TypedSqlExpression<Ast>,
    options: PostgresRegexOptions,
    negated: boolean,
  ) => { expression: Ast; helpers: readonly string[] }
  regexWithFlags: (
    subject: TypedSqlExpression<Ast>,
    pattern: TypedSqlExpression<Ast>,
    flags: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  regexInvalidFlags: (
    subject: TypedSqlExpression<Ast>,
    pattern: TypedSqlExpression<Ast>,
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
    if (node.kind === 'eval-call') {
      const { call } = node
      const metadata = builtinMetadata(call.signature)
      const validSignature =
        metadata.kind === call.kind &&
        metadata.schema === 'pg_catalog' &&
        metadata.result === 'pg_catalog.bool' &&
        call.type === metadata.result &&
        metadata.strict &&
        metadata.args.length === call.operands.length &&
        metadata.args.every((type, index) => call.operands[index]?.type === type)
      const subjectType = metadata.args[0]
      const patternType = metadata.args[1]
      const regexpOperator =
        metadata.kind === 'operator' &&
        ['~', '!~', '~*', '!~*'].includes(metadata.name) &&
        ['pg_catalog.text', 'pg_catalog.name', 'pg_catalog.bpchar'].includes(subjectType ?? '') &&
        patternType === 'pg_catalog.text' &&
        metadata.args.length === 2
      const functionMatch =
        metadata.kind === 'function'
          ? /^(name|text|bpchar)(ic)?regex(eq|ne)$/u.exec(metadata.name)
          : null
      const regexpFunction =
        functionMatch !== null &&
        subjectType === `pg_catalog.${functionMatch[1]}` &&
        patternType === 'pg_catalog.text' &&
        metadata.args.length === 2
      const regexpLike =
        metadata.kind === 'function' &&
        metadata.name === 'regexp_like' &&
        metadata.args.length >= 2 &&
        metadata.args.length <= 3 &&
        metadata.args.every((type) => type === 'pg_catalog.text')
      if (!validSignature || (!regexpOperator && !regexpFunction && !regexpLike))
        throw new Error(`Unsupported regex CHECK signature: ${call.signature}`)
      if (call.collation !== 'C')
        throw new Error('A regex CHECK atom requires a C-collated text subject')
      const subject = call.operands[0]!
      const patternExpression = call.operands[1]!
      const pattern =
        patternExpression.kind === 'text' && patternExpression.value !== null
          ? patternExpression.value
          : patternExpression
      const negated = regexpOperator
        ? metadata.name.startsWith('!')
        : regexpFunction
          ? functionMatch![3] === 'ne'
          : false
      const caseSensitive = regexpOperator
        ? !metadata.name.endsWith('*')
        : regexpFunction
          ? functionMatch![2] !== 'ic'
          : true
      let options: PostgresRegexOptions = { caseSensitive }
      let flags: SqlExpression | undefined
      let invalidFlags = false
      if (regexpLike && call.operands.length === 3) {
        const flagExpression = call.operands[2]!
        if (flagExpression.kind === 'text' && flagExpression.value !== null) {
          const parsed = parseRegexpLikeFlags(flagExpression.value)
          if (parsed.kind === 'valid') options = parsed.options
          else invalidFlags = true
        } else flags = flagExpression
      }
      return emit({
        kind: 'eval-regex',
        subject,
        pattern,
        options,
        flags,
        invalidFlags,
        negated,
        collation: 'C',
      })
    }
    if (node.kind === 'eval-regex') {
      if (
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(node.subject.type) ||
        node.collation !== 'C'
      )
        throw new Error('A regex CHECK atom requires a C-collated text subject')
      const emitted = emitSqlExpression(node.subject, scalarBackend)
      include(emitted.helpers)
      let pattern: string | TypedSqlExpression<Ast>
      if (typeof node.pattern === 'string') pattern = node.pattern
      else {
        if (node.pattern.type !== 'pg_catalog.text')
          throw new Error('A dynamic regex CHECK pattern must have text type')
        const emittedPattern = emitSqlExpression(node.pattern, scalarBackend)
        include(emittedPattern.helpers)
        pattern = emittedPattern.value
      }
      if (node.invalidFlags) {
        if (typeof pattern === 'string') {
          const emittedPattern = emitSqlExpression(
            { kind: 'text', type: 'pg_catalog.text', value: pattern },
            scalarBackend,
          )
          include(emittedPattern.helpers)
          pattern = emittedPattern.value
        }
        const result = backend.regexInvalidFlags(emitted.value, pattern)
        include(result.helpers)
        return result.expression
      }
      if (node.flags) {
        if (node.flags.type !== 'pg_catalog.text')
          throw new Error('Regex CHECK flags must have text type')
        const emittedFlags = emitSqlExpression(node.flags, scalarBackend)
        include(emittedFlags.helpers)
        if (typeof pattern === 'string') {
          const emittedPattern = emitSqlExpression(
            { kind: 'text', type: 'pg_catalog.text', value: pattern },
            scalarBackend,
          )
          include(emittedPattern.helpers)
          pattern = emittedPattern.value
        }
        const result = backend.regexWithFlags(emitted.value, pattern, emittedFlags.value)
        include(result.helpers)
        return result.expression
      }
      const result = backend.regex(emitted.value, pattern, node.options ?? {}, node.negated)
      include(result.helpers)
      return result.expression
    }
    const result = backend.compare(node.operation, [emit(node.operands[0]), emit(node.operands[1])])
    include(result.helpers)
    return result.expression
  }
  return { value: { type: 'eval-bool', expression: emit(expression) }, helpers: [...helpers] }
}
