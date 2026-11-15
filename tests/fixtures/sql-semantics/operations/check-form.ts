import type { EvaluationCase } from './integer-addition.js'

const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`

// The CHECK that holds exactly when the case's expression yields what PostgreSQL observed, read
// back as the observation read it. An error leaves any predicate failing with its SQLSTATE.
export function operationCheck(fixture: Pick<EvaluationCase, 'sql' | 'expression' | 'expected'>): {
  sql: string
  expected: { kind: 'True' } | { kind: 'Error'; value: { state: number } }
} {
  const value = `(${fixture.sql})`
  const observed = fixture.expected
  if (observed.kind === 'error')
    return {
      sql: `${value} IS NULL`,
      expected: { kind: 'Error', value: { state: Number.parseInt(observed.code, 36) } },
    }
  if (observed.kind === 'null') return { sql: `${value} IS NULL`, expected: { kind: 'True' } }
  if (observed.kind === 'float') {
    const type = observed.type === 'pg_catalog.float4' ? 'float4' : 'float8'
    return {
      sql: ['NaN', 'Infinity', '-Infinity'].includes(observed.value)
        ? `${value} = ${quote(observed.value)}::pg_catalog.${type}`
        : `pg_catalog.encode(pg_catalog.${type}send(${value}), 'hex') = ${quote(observed.value)}`,
      expected: { kind: 'True' },
    }
  }
  return {
    sql:
      fixture.expression.type === 'pg_catalog.bpchar'
        ? `pg_catalog.encode(pg_catalog.bpcharsend(${value}), 'hex') = ${quote(Buffer.from(observed.value, 'utf8').toString('hex'))}`
        : `${value}::text = ${quote(observed.value)}`,
    expected: { kind: 'True' },
  }
}
