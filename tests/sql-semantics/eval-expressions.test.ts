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
import { emitEvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'
import { typescriptEvalBoolBackend } from '../../src/codegen/typescript/sql/check.js'
import { goEvalBoolBackend } from '../../src/codegen/go/sql/check.js'

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
  it('shares lexical CASE operands through nested scalar and Boolean emission without external inputs', () => {
    const integer = (value: string): EvalExpression => ({
        kind: 'certain',
        expression: { kind: 'integer', type: 'pg_catalog.int4', value },
      }),
      equal = (binding: string, value: string): EvalExpression => ({
        kind: 'call',
        call: {
          kind: 'operator',
          signature: 'operator:["pg_catalog","="](pg_catalog.int4,pg_catalog.int4)',
          type: 'pg_catalog.bool',
        },
        operands: [{ kind: 'input', type: 'pg_catalog.int4', name: binding }, integer(value)],
      }),
      certain = (value: boolean): EvalExpression => ({
        kind: 'certain',
        expression: { kind: 'boolean', type: 'pg_catalog.bool', value },
      }),
      nested: EvalExpression = {
        kind: 'case',
        type: 'pg_catalog.bool',
        scrutinee: { expression: integer('2'), binding: 'innerCase' },
        branches: [
          {
            when: {
              kind: 'check',
              type: 'pg_catalog.bool',
              expression: {
                kind: 'eval-boolean-logic',
                operation: 'and',
                operands: [
                  { kind: 'eval-scalar', expression: equal('outerCase', '1') },
                  { kind: 'eval-scalar', expression: equal('innerCase', '2') },
                ],
              },
            },
            then: certain(true),
          },
        ],
        otherwise: certain(false),
      },
      expression: EvalExpression = {
        kind: 'case',
        type: 'pg_catalog.bool',
        scrutinee: { expression: integer('1'), binding: 'outerCase' },
        branches: [{ when: equal('outerCase', '1'), then: nested }],
        otherwise: certain(false),
      }
    const inputs: string[] = [],
      typescript = {
        ...typescriptEvalBoolBackend,
        scalar: {
          ...typescriptEvalBackend,
          input: (
            type: Parameters<NonNullable<typeof typescriptEvalBackend.input>>[0],
            name: string,
          ) => {
            inputs.push(name)
            return typescriptEvalBackend.uncertain(type)
          },
        },
      },
      go = {
        ...goEvalBoolBackend,
        scalar: {
          ...goEvalBackend,
          input: (type: Parameters<NonNullable<typeof goEvalBackend.input>>[0], name: string) => {
            inputs.push(name)
            return goEvalBackend.uncertain(type)
          },
        },
      }
    expect(() =>
      emitEvalBoolExpression({ kind: 'eval-scalar', expression }, typescriptSqlBackend, typescript),
    ).not.toThrow()
    expect(() =>
      emitEvalBoolExpression({ kind: 'eval-scalar', expression }, goSqlBackend, go),
    ).not.toThrow()
    expect(inputs).toEqual([])
    expect(() =>
      emitEvalBoolExpression(
        { kind: 'eval-scalar', expression: equal('outerCase', '1') },
        typescriptSqlBackend,
        typescript,
      ),
    ).not.toThrow()
    expect(inputs).toEqual(['outerCase'])
  })
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
