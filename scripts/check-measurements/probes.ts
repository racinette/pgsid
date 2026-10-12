import { parseSync } from 'libpg-query'
import type { EnumInfo } from '../../src/catalog/types.js'
import {
  bindCatalogCheck,
  catalogScalarType,
  type CheckColumn,
} from '../../src/sql-semantics/catalog-check-binder.js'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'
import {
  emitCheckRustEvaluator,
  UnsupportedCheckRustExpression,
} from '../../src/codegen/shared/check-rust-evaluator.js'
import { prepareCheckRust } from '../../src/codegen/shared/check-rust-source.js'

export const quote = (name: string): string => '"' + name.replaceAll('"', '""') + '"'

export function hasUncertain(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if ('kind' in value && value.kind === 'uncertain') return true
  return Object.values(value).some(hasUncertain)
}

export function inspectExpression(expression: EvalBoolExpression) {
  const prepared = prepareCheckRust(expression)
  return {
    fullyBound: !hasUncertain(expression),
    preparation:
      prepared.kind === 'supported'
        ? {
            kind: prepared.kind,
            callables: prepared.evaluator.callables,
            inputs: prepared.evaluator.inputs,
          }
        : prepared,
    expression,
  }
}

export function bindProbe(
  sql: string,
  columns: readonly CheckColumn[],
  enums: readonly EnumInfo[] = [],
) {
  const parsed = parseSync(`SELECT 1 WHERE ${sql}`)
  const statement = parsed.stmts?.[0]?.stmt
  if (!statement || !('SelectStmt' in statement)) throw new Error('Expected a SELECT probe')
  return inspectExpression(
    bindCatalogCheck(columns, statement.SelectStmt.whereClause, [], enums).expression,
  )
}

export function valueRepresentation(typeName: string) {
  const type = catalogScalarType(typeName)
  if (!type) return { represented: false, reason: 'No scalar binding type' }
  try {
    emitCheckRustEvaluator({
      kind: 'eval-scalar',
      expression: {
        kind: 'null-test',
        type: 'pg_catalog.bool',
        negated: false,
        // A relabel forces a value read instead of the input-nullness shortcut.
        operand: {
          kind: 'call',
          call: { kind: 'cast', signature: null, type },
          operands: [{ kind: 'input', name: 'value', type }],
        },
      },
    })
    return { represented: true, type }
  } catch (error) {
    if (!(error instanceof UnsupportedCheckRustExpression)) throw error
    return { represented: false, type, reason: error.message }
  }
}
