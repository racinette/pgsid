import { go } from '../ast.js'
import type { GoExpression } from '../ast.js'
import type { ScalarType, SyntaxKind } from '../../../sql-semantics/expressions.js'
import type { TypedSqlExpression } from '../../../sql-semantics/signatures.js'

function suffix(type: string): string {
  if (/^pg_catalog.int[248]$/.test(type)) return 'Integer'
  if (/^pg_catalog.float[48]$/.test(type)) return 'Float'
  if (type === 'pg_catalog."numeric"') return 'Decimal'
  if (type === 'pg_catalog.bool') return 'Boolean'
  if (['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type)) return 'Text'
  if (type === 'pg_catalog.uuid') return 'Uuid'
  if (type === 'pg_catalog."json"') return 'Json'
  if (type === 'pg_catalog.jsonb') return 'Jsonb'
  if (type.startsWith('enum:')) return 'Enum'
  if (type.startsWith('array:')) return 'Array'
  throw new Error(`Unsupported conditional value type: ${type}`)
}
export function goSqlSyntax(
  kind: SyntaxKind,
  type: ScalarType,
  operands: readonly TypedSqlExpression<GoExpression>[],
) {
  const thunk = (operand: TypedSqlExpression<GoExpression>): GoExpression => ({
    kind: 'function-literal',
    parameters: [],
    results: [{ type: go.ident('Sql' + suffix(operand.type)) }],
    body: [{ kind: 'return', expressions: [operand.expression] }],
  })
  const base = {
    and: 'sqlBooleanAnd',
    or: 'sqlBooleanOr',
    not: 'sqlBooleanNot',
    'is-null': 'sqlIsNull',
    'is-not-null': 'sqlIsNotNull',
    case: 'sqlCase',
    coalesce: 'sqlCoalesce',
  }[kind]
  const helper =
    base +
    (kind === 'case' || kind === 'coalesce'
      ? suffix(type)
      : kind === 'is-null' || kind === 'is-not-null'
        ? suffix(operands[0]!.type)
        : '')
  let args: GoExpression[]
  if (kind === 'case') {
    const conditions = operands.slice(0, -1).filter((_, i) => i % 2 === 0)
    const branches = operands.slice(0, -1).filter((_, i) => i % 2 === 1)
    const functions = (
      values: readonly TypedSqlExpression<GoExpression>[],
      result: string,
    ): GoExpression => ({
      kind: 'composite',
      type: go.slice(go.functionType([], [{ type: go.ident('Sql' + result) }])),
      elements: values.map(thunk),
    })
    args = [
      thunk(operands.at(-1)!),
      functions(conditions, 'Boolean'),
      functions(branches, suffix(type)),
    ]
  } else
    args = operands.map((operand) =>
      ['and', 'or', 'coalesce'].includes(kind) ? thunk(operand) : operand.expression,
    )
  return { expression: go.call(go.ident(helper), args), helpers: [helper] }
}
