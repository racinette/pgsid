import { numericCases } from '../tests/fixtures/sql-semantics/operations/numeric.js'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import type { EvaluationCase } from '../tests/fixtures/sql-semantics/operations/integer-addition.js'
import { PG18_BUILTIN_GROUPS } from '../src/postgres/builtins/groups.generated.js'
import { typescriptSqlBackend } from '../src/codegen/typescript/sql/registry.js'
import { goSqlBackend } from '../src/codegen/go/sql/registry.js'
import { functionNullability, operatorNullability } from '../src/sql-semantics/nullability.js'
import {
  integerAdditionCases,
  integerCompositionCases,
} from '../tests/fixtures/sql-semantics/operations/integer-addition.js'
import { integerOperationCases } from '../tests/fixtures/sql-semantics/operations/integer-operations.js'
import type { SqlExpression } from '../src/sql-semantics/expressions.js'
import { typescriptSqlRuntime } from '../src/codegen/typescript/sql/runtime.js'
import { goSqlRuntime } from '../src/codegen/go/sql/runtime.js'

export function sqlSemanticsCoverage(
  fixtures: readonly EvaluationCase[] = [
    ...integerAdditionCases,
    ...integerCompositionCases,
    ...integerOperationCases,
    ...numericCases,
  ],
) {
  const evidence = new Map<string, string[]>()
  const record = (expression: SqlExpression, name: string): void => {
    if (
      expression.kind === 'integer' ||
      expression.kind === 'float' ||
      expression.kind === 'decimal'
    )
      return
    if (expression.signature !== null) {
      evidence.set(expression.signature, [...(evidence.get(expression.signature) ?? []), name])
    }
    if (expression.kind === 'cast') record(expression.operand, name)
    else expression.operands.forEach((operand) => record(operand, name))
  }
  for (const fixture of fixtures) record(fixture.expression, fixture.name)

  const typescriptSupported = new Set<string>()
  const goSupported = new Set<string>()
  for (const [backend, runtime, supported] of [
    [typescriptSqlBackend, typescriptSqlRuntime, typescriptSupported],
    [goSqlBackend, goSqlRuntime, goSupported],
  ] as const) {
    for (const group of backend.bindings) {
      const inventory = PG18_BUILTIN_GROUPS.find(({ domain }) => domain === group.domain)?.inventory
      if (!inventory) throw new Error(`Unknown support domain: ${group.domain}`)
      for (const [bindings, operator] of [
        [group.operators, true],
        [group.functions, false],
      ] as const) {
        for (const [signature, binding] of Object.entries(bindings)) {
          if (!binding) continue
          if (!Object.hasOwn(inventory, signature))
            throw new Error(`Unknown support signature in ${group.domain}: ${signature}`)
          if ((inventory[signature]!.kind === 'operator') !== operator)
            throw new Error(`Incorrect support kind: ${signature}`)
          if (supported.has(signature)) throw new Error(`Duplicate support signature: ${signature}`)
          runtime(binding.helpers)
          supported.add(signature)
        }
      }
    }
  }

  const rows = PG18_BUILTIN_GROUPS.flatMap(({ domain, inventory }) =>
    Object.entries(inventory).map(([signature, metadata]) => {
      const operator = metadata.kind === 'operator'
      return {
        domain,
        signature,
        nullability: operator ? operatorNullability(signature) : functionNullability(signature),
        typescript: typescriptSupported.has(signature),
        go: goSupported.has(signature),
        fixtures: [...new Set(evidence.get(signature) ?? [])],
      }
    }),
  )
  for (const row of rows) {
    if ((row.typescript || row.go) && row.fixtures.length === 0)
      throw new Error(`Support without fixture evidence: ${row.signature}`)
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
