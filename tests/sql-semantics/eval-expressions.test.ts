import { describe, expect, it } from 'vitest'
import {
  emitEvalExpression,
  type EvalExpression,
} from '../../src/sql-semantics/eval-expressions.js'
import type { SqlExpression } from '../../src/sql-semantics/expressions.js'
import { typescriptSqlBackend } from '../../src/codegen/typescript/sql/registry.js'
import { typescriptEvalBackend } from '../../src/codegen/typescript/sql/eval.js'
import { goSqlBackend } from '../../src/codegen/go/sql/registry.js'
import { goEvalBackend } from '../../src/codegen/go/sql/eval.js'
import { scalarSpecs } from '../fixtures/sql-semantics/operations/scalar-specs.js'
import { numericSpecs } from '../fixtures/sql-semantics/operations/numeric-specs.js'
import { integerOperationCases } from '../fixtures/sql-semantics/operations/integer-operations.js'

const callables = new Map<string, Extract<SqlExpression, { kind: 'operator' | 'function' }>>()
const casts = new Map<string, Extract<SqlExpression, { kind: 'cast' }>>()
for (const fixture of [...scalarSpecs, ...numericSpecs, ...integerOperationCases]) {
  const expression = fixture.expression
  if (expression.kind === 'cast' && expression.signature !== null)
    casts.set(expression.signature, expression)
  if (
    (expression.kind === 'operator' || expression.kind === 'function') &&
    expression.operands.length > 0 &&
    !callables.has(expression.signature)
  )
    callables.set(expression.signature, expression)
}

describe('typed partial SQL expression emission', () => {
  it('lifts every fixture-backed callable with operands in both targets', () => {
    expect(callables.size).toBe(892)
    for (const [signature, expression] of callables) {
      const partial: EvalExpression = {
        kind: 'call',
        call: {
          kind: expression.kind,
          type: expression.type,
          signature,
          collation: expression.collation,
        },
        operands: expression.operands.map((operand, index) =>
          index === 0
            ? { kind: 'uncertain', type: operand.type }
            : { kind: 'certain', expression: operand },
        ),
      }
      expect(
        () => emitEvalExpression(partial, typescriptSqlBackend, typescriptEvalBackend),
        signature,
      ).not.toThrow()
      expect(
        () => emitEvalExpression(partial, goSqlBackend, goEvalBackend),
        signature,
      ).not.toThrow()
    }
  })

  it('lifts catalog-backed casts through the same exact signature path', () => {
    expect(casts.size).toBe(32)
    for (const [signature, expression] of casts) {
      const partial: EvalExpression = {
        kind: 'call',
        call: { kind: 'cast', signature, type: expression.type },
        operands: [{ kind: 'uncertain', type: expression.operand.type }],
      }
      expect(
        () => emitEvalExpression(partial, typescriptSqlBackend, typescriptEvalBackend),
        signature,
      ).not.toThrow()
      expect(
        () => emitEvalExpression(partial, goSqlBackend, goEvalBackend),
        signature,
      ).not.toThrow()
    }
  })

  it('rejects mismatched operands and result types before generation', () => {
    const operand: EvalExpression = { kind: 'uncertain', type: 'pg_catalog.text' }
    const call = {
      kind: 'function' as const,
      signature: 'function:["pg_catalog","length"](pg_catalog.text)',
      type: 'pg_catalog.int4',
      collation: 'C',
    }
    expect(() =>
      emitEvalExpression(
        { kind: 'call', call, operands: [{ kind: 'uncertain', type: 'pg_catalog.int4' }] },
        typescriptSqlBackend,
        typescriptEvalBackend,
      ),
    ).toThrow('Operand type mismatch')
    expect(() =>
      emitEvalExpression(
        { kind: 'call', call: { ...call, type: 'pg_catalog.bool' }, operands: [operand] },
        goSqlBackend,
        goEvalBackend,
      ),
    ).toThrow('Invalid resolved expression')
  })
})
