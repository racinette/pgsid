import type { SqlExpression } from '../../../../src/sql-semantics/expressions.js'

export interface ExpressionSpec {
  stress?: boolean
  setupSql?: string
  name: string
  sql: string
  expression: SqlExpression
}
