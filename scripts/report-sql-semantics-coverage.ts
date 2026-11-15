import { scalarCases } from '../tests/fixtures/sql-semantics/operations/scalar.js'
import { numericCases } from '../tests/fixtures/sql-semantics/operations/numeric.js'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import type { EvaluationCase } from '../tests/fixtures/sql-semantics/operations/integer-addition.js'
import { PG18_BUILTIN_GROUPS } from '../src/postgres/builtins/groups.generated.js'
import { functionNullability, operatorNullability } from '../src/sql-semantics/nullability.js'
import {
  integerAdditionCases,
  integerCompositionCases,
} from '../tests/fixtures/sql-semantics/operations/integer-addition.js'
import { integerOperationCases } from '../tests/fixtures/sql-semantics/operations/integer-operations.js'
import type { SqlExpression } from '../src/sql-semantics/expressions.js'
import { builtinMetadata } from '../src/postgres/builtins/inventory.js'
import { checkRustCallableNames } from '../src/codegen/shared/check-rust-source.js'

// Each catalog callable, whether the CHECK evaluator implements it, and the fixtures that call it.
export function sqlSemanticsCoverage(
  fixtures: readonly EvaluationCase[] = [
    ...integerAdditionCases,
    ...integerCompositionCases,
    ...integerOperationCases,
    ...numericCases,
    ...scalarCases,
  ],
  callables: ReadonlySet<string> = checkRustCallableNames(),
) {
  const evidence = new Map<string, string[]>()
  const record = (expression: SqlExpression, name: string): void => {
    if (
      expression.kind === 'integer' ||
      expression.kind === 'float' ||
      expression.kind === 'point' ||
      expression.kind === 'line' ||
      expression.kind === 'lseg' ||
      expression.kind === 'money' ||
      expression.kind === 'aclitem' ||
      expression.kind === 'xid' ||
      expression.kind === 'cid' ||
      expression.kind === 'pg_lsn' ||
      expression.kind === 'tid' ||
      expression.kind === 'xid8' ||
      expression.kind === 'snapshot' ||
      expression.kind === 'range' ||
      expression.kind === 'oid' ||
      expression.kind === 'polygon' ||
      expression.kind === 'path' ||
      expression.kind === 'circle' ||
      expression.kind === 'box' ||
      expression.kind === 'decimal' ||
      expression.kind === 'boolean' ||
      expression.kind === 'text' ||
      expression.kind === 'refcursor' ||
      expression.kind === 'name' ||
      expression.kind === 'internal-char' ||
      expression.kind === 'bytea' ||
      expression.kind === 'bit' ||
      expression.kind === 'uuid' ||
      expression.kind === 'json' ||
      expression.kind === 'jsonb' ||
      expression.kind === 'jsonpath' ||
      expression.kind === 'temporal' ||
      expression.kind === 'temporal-storage' ||
      expression.kind === 'enum'
    )
      return
    if (expression.kind === 'case') {
      expression.branches.forEach((branch) => {
        record(branch.when, name)
        record(branch.then, name)
      })
      record(expression.otherwise, name)
      return
    }
    if (expression.kind === 'boolean-logic' || expression.kind === 'coalesce') {
      expression.operands.forEach((operand) => record(operand, name))
      return
    }
    if (expression.kind === 'enum-comparison') {
      expression.operands.forEach((operand) => record(operand, name))
      return
    }
    if (expression.kind === 'array') {
      expression.elements?.forEach((element) => record(element, name))
      return
    }
    if (expression.kind === 'array-operation' || expression.kind === 'array-comparison') {
      expression.operands.forEach((operand) => record(operand, name))
      return
    }
    if (expression.kind === 'array-subscript') {
      record(expression.array, name)
      expression.subscripts.forEach((subscript) => record(subscript, name))
      return
    }
    if (expression.kind === 'array-slice') {
      record(expression.array, name)
      expression.bounds.forEach((bound) => {
        if (bound.lower) record(bound.lower, name)
        if (bound.upper) record(bound.upper, name)
      })
      return
    }
    if (expression.kind === 'array-assign') {
      record(expression.array, name)
      expression.subscripts.forEach((subscript) => record(subscript, name))
      record(expression.value, name)
      return
    }
    if (
      expression.kind === 'input' ||
      expression.kind === 'geometry-storage' ||
      expression.kind === 'system-storage' ||
      expression.kind === 'snapshot-storage' ||
      expression.kind === 'network' ||
      expression.kind === 'xml' ||
      expression.kind === 'tsvector' ||
      expression.kind === 'tsquery' ||
      expression.kind === 'mac' ||
      expression.kind === 'multirange'
    )
      return
    if (
      expression.kind === 'null-test' ||
      expression.kind === 'text-coercion' ||
      expression.kind === 'uuid-coercion' ||
      expression.kind === 'json-coercion' ||
      expression.kind === 'enum-coercion'
    ) {
      record(expression.operand, name)
      return
    }
    if (expression.signature !== null) {
      evidence.set(expression.signature, [...(evidence.get(expression.signature) ?? []), name])
    }
    if (expression.kind === 'cast') record(expression.operand, name)
    else expression.operands.forEach((operand) => record(operand, name))
  }
  for (const fixture of fixtures) record(fixture.expression, fixture.name)

  const evaluated = (signature: string): boolean => {
    const metadata = builtinMetadata(signature)
    const implementation =
      metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
    return implementation.kind === 'function' && callables.has(implementation.rustName)
  }

  const rows = PG18_BUILTIN_GROUPS.flatMap(({ domain, inventory }) =>
    Object.entries(inventory).map(([signature, metadata]) => {
      const operator = metadata.kind === 'operator'
      return {
        domain,
        signature,
        nullability: operator ? operatorNullability(signature) : functionNullability(signature),
        evaluator: evaluated(signature),
        fixtures: [...new Set(evidence.get(signature) ?? [])],
      }
    }),
  )
  for (const row of rows) {
    if (row.fixtures.length > 0 && !row.evaluator)
      throw new Error(`Fixture evidence without evaluator support: ${row.signature}`)
  }
  return rows
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const rows = sqlSemanticsCoverage()
  await new Promise<void>((resolve, reject) => {
    process.stdout.write(JSON.stringify(rows, null, 2) + '\n', (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}
