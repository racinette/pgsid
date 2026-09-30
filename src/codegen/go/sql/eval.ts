import { go, type GoExpression, type GoStatement } from '../ast.js'
import type { EvalExpressionBackend } from '../../../sql-semantics/eval-expressions.js'
import type { EmittedEvalExpression } from '../../../sql-semantics/eval-expressions.js'

function sqlValueType(type: string): string {
  if (type === 'pg_catalog.bool') return 'SqlBoolean'
  if (/^pg_catalog\.int[248]$/.test(type) || type === 'pg_catalog."char"') return 'SqlInteger'
  if (/^pg_catalog\.float[48]$/.test(type)) return 'SqlFloat'
  if (type === 'pg_catalog."numeric"') return 'SqlDecimal'
  if (type === 'pg_catalog.uuid') return 'SqlUuid'
  if (type === 'pg_catalog."json"') return 'SqlJson'
  if (type === 'pg_catalog.jsonb') return 'SqlJsonb'
  if (type === 'pg_catalog.date') return 'SqlDate'
  if (type === 'pg_catalog."time"') return 'SqlTime'
  if (type === 'pg_catalog."timestamp"') return 'SqlTimestamp'
  if (type === 'pg_catalog.timestamptz') return 'SqlTimestamptz'
  if (type === 'pg_catalog.timetz') return 'SqlTimeTz'
  if (type === 'pg_catalog."interval"') return 'SqlInterval'
  if (type.startsWith('enum:')) return 'SqlEnum'
  if (type.startsWith('array:')) return 'SqlArray'
  if (
    [
      'pg_catalog.text',
      'pg_catalog."varchar"',
      'pg_catalog.bpchar',
      'pg_catalog.name',
      'pg_catalog.bytea',
      'pg_catalog."bit"',
      'pg_catalog.varbit',
    ].includes(type)
  )
    return 'SqlText'
  throw new Error(`Unsupported partial SQL value type: ${type}`)
}

const evalType = (type: string): GoExpression =>
  go.index(go.ident('EvalValue'), go.ident(sqlValueType(type)))

const known = (type: string, value: GoExpression): GoExpression =>
  go.composite(evalType(type), [
    go.keyValue('Certain', go.ident('true')),
    go.keyValue('Value', value),
  ])

const uncertain = (type: string): GoExpression => go.composite(evalType(type))

const lifted = (operand: EmittedEvalExpression<GoExpression>): GoExpression =>
  operand.effect === 'partial' ? operand.expression : known(operand.type, operand.expression)

const iife = (type: string, body: GoStatement[]): GoExpression =>
  go.call({
    kind: 'function-literal',
    parameters: [],
    results: [{ type: evalType(type) }],
    body,
  })

function errorGuard(
  type: string,
  variable: string,
  operand: EmittedEvalExpression<GoExpression>,
): GoStatement {
  const value = go.ident(variable)
  const error =
    operand.effect === 'partial'
      ? go.selector(go.selector(value, 'Value'), 'Error')
      : go.selector(value, 'Error')
  const condition =
    operand.effect === 'partial'
      ? go.parsed(`${variable}.Certain && ${variable}.Value.Error != ""`)
      : go.notEqual(error, go.string(''))
  return go.if(condition, [
    go.return(
      known(type, go.composite(go.ident(sqlValueType(type)), [go.keyValue('Error', error)])),
    ),
  ])
}

export const goEvalBackend: EvalExpressionBackend<GoExpression> = {
  fromBool: (expression) => ({
    expression: go.call(go.ident('evalValueFromBool'), [expression]),
    helpers: ['evalValueFromBool'],
  }),
  certain: (type, expression) => ({
    expression: known(type, expression),
    helpers: ['EvalValue', sqlValueType(type)],
  }),
  uncertain: (type) => ({
    expression: uncertain(type),
    helpers: ['EvalValue', sqlValueType(type)],
  }),
  call: (type, operands, emitTotal) => {
    const body: GoStatement[] = operands.map((operand, index) =>
      go.assign([go.ident(`argument${index}`)], [operand.expression]),
    )
    for (const [index, operand] of operands.entries()) {
      body.push(errorGuard(type, `argument${index}`, operand))
    }
    for (const [index, operand] of operands.entries())
      if (operand.effect === 'partial')
        body.push(go.if(go.parsed(`!argument${index}.Certain`), [go.return(uncertain(type))]))
    const raw = operands.map((operand, index) => ({
      type: operand.type,
      expression:
        operand.effect === 'partial'
          ? go.selector(go.ident(`argument${index}`), 'Value')
          : go.ident(`argument${index}`),
    }))
    const result = emitTotal(raw)
    if (result.value.type !== type) throw new Error('Partial callable result type mismatch')
    body.push(go.return(known(type, result.value.expression)))
    return {
      expression: iife(type, body),
      helpers: ['EvalValue', sqlValueType(type), ...result.helpers],
    }
  },
  logic: (operation, operands) => {
    const helper =
      operation === 'and' ? 'evalBoolAnd' : operation === 'or' ? 'evalBoolOr' : 'evalBoolNot'
    const arguments_ =
      operation === 'not'
        ? [go.call(go.ident('evalBoolFromValue'), [lifted(operands[0]!)])]
        : operands.map((operand) => ({
            kind: 'function-literal' as const,
            parameters: [],
            results: [{ type: go.ident('EvalBool') }],
            body: [go.return(go.call(go.ident('evalBoolFromValue'), [lifted(operand)]))],
          }))
    return {
      expression: go.call(go.ident('evalValueFromBool'), [go.call(go.ident(helper), arguments_)]),
      helpers: ['EvalValue', 'SqlBoolean', 'evalBoolFromValue', 'evalValueFromBool', helper],
    }
  },
  nullTest: (operand, negated) => {
    const variable = 'argument0'
    const body: GoStatement[] = [go.assign([go.ident(variable)], [operand.expression])]
    body.push(errorGuard('pg_catalog.bool', variable, operand))
    if (operand.effect === 'partial')
      body.push(go.if(go.parsed(`!${variable}.Certain`), [go.return(uncertain('pg_catalog.bool'))]))
    const valid = operand.effect === 'partial' ? `${variable}.Value.Valid` : `${variable}.Valid`
    body.push(
      go.return(
        known(
          'pg_catalog.bool',
          go.composite(go.ident('SqlBoolean'), [
            go.keyValue('Value', go.parsed(negated ? valid : `!${valid}`)),
            go.keyValue('Valid', go.ident('true')),
          ]),
        ),
      ),
    )
    return { expression: iife('pg_catalog.bool', body), helpers: ['EvalValue', 'SqlBoolean'] }
  },
  coalesce: (type, operands) => {
    const body: GoStatement[] = []
    for (const [index, operand] of operands.entries()) {
      const variable = `argument${index}`
      body.push(go.assign([go.ident(variable)], [operand.expression]))
      body.push(errorGuard(type, variable, operand))
      if (operand.effect === 'partial')
        body.push(go.if(go.parsed(`!${variable}.Certain`), [go.return(uncertain(type))]))
      const valid = operand.effect === 'partial' ? `${variable}.Value.Valid` : `${variable}.Valid`
      body.push(
        go.if(go.parsed(valid), [
          go.return(lifted({ ...operand, expression: go.ident(variable) })),
        ]),
      )
    }
    body.push(go.return(known(type, go.composite(go.ident(sqlValueType(type))))))
    return { expression: iife(type, body), helpers: ['EvalValue', sqlValueType(type)] }
  },
  case: (type, branches, otherwise) => {
    const body: GoStatement[] = []
    for (const [index, branch] of branches.entries()) {
      const variable = `condition${index}`
      body.push(go.assign([go.ident(variable)], [branch.when.expression]))
      body.push(errorGuard(type, variable, branch.when))
      if (branch.when.effect === 'partial')
        body.push(go.if(go.parsed(`!${variable}.Certain`), [go.return(uncertain(type))]))
      const value = branch.when.effect === 'partial' ? `${variable}.Value` : variable
      body.push(
        go.if(go.parsed(`${value}.Valid && ${value}.Value`), [go.return(lifted(branch.then))]),
      )
    }
    body.push(go.return(lifted(otherwise)))
    return {
      expression: iife(type, body),
      helpers: ['EvalValue', 'SqlBoolean', sqlValueType(type)],
    }
  },
  bind: (type, operand, body, name = 'scrutinee') => {
    const result = body({ ...operand, expression: go.ident(name) })
    return {
      expression: iife(type, [
        go.assign([go.ident(name)], [operand.expression]),
        errorGuard(type, name, operand),
        go.return(lifted(result)),
      ]),
      helpers: ['EvalValue', sqlValueType(type)],
    }
  },
  bindList: (type, operands, names, body) => {
    const result = body(
      operands.map((operand, index) => ({ ...operand, expression: go.ident(names[index]!) })),
    )
    const statements = operands.map((operand, index) =>
      go.assign([go.ident(names[index]!)], [operand.expression]),
    )
    statements.push(...operands.map((operand, index) => errorGuard(type, names[index]!, operand)))
    statements.push(go.return(lifted(result)))
    return { expression: iife(type, statements), helpers: ['EvalValue', sqlValueType(type)] }
  },
  regexCount: (operands, pattern, flags) => {
    void pattern
    void flags
    const body: GoStatement[] = operands.map((operand, index) =>
      go.assign([go.ident(`argument${index}`)], [operand.expression]),
    )
    for (const [index, operand] of operands.entries())
      body.push(errorGuard('pg_catalog.int4', `argument${index}`, operand))
    for (const [index, operand] of operands.entries())
      if (operand.effect === 'partial')
        body.push(
          go.if(go.parsed(`!argument${index}.Certain`), [go.return(uncertain('pg_catalog.int4'))]),
        )
    const raw = (index: number): GoExpression => {
      const operand = operands[index]
      if (!operand)
        return index === 2
          ? go.composite(go.ident('SqlInteger'), [
              go.keyValue('Value', go.parsed('1')),
              go.keyValue('Valid', go.ident('true')),
            ])
          : go.composite(go.ident('SqlText'), [
              go.keyValue('Value', go.string('')),
              go.keyValue('Valid', go.ident('true')),
            ])
      const value = go.ident(`argument${index}`)
      return operand.effect === 'partial' ? go.selector(value, 'Value') : value
    }
    body.push(
      go.return(go.call(go.ident('evalRegexCountEngine'), [raw(0), raw(1), raw(2), raw(3)])),
    )
    return {
      expression: iife('pg_catalog.int4', body),
      helpers: ['EvalValue', 'SqlInteger', 'SqlText', 'evalRegexCountEngine'],
    }
  },
}
