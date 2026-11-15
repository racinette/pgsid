import { describe, expect, it } from 'vitest'
import type { EvalExpression } from '../../src/sql-semantics/eval-expressions.js'
import type { SqlExpression } from '../../src/sql-semantics/expressions.js'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'
import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'
import { prepareCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { scalarSpecs } from '../fixtures/sql-semantics/operations/scalar-specs.js'
import { numericSpecs } from '../fixtures/sql-semantics/operations/numeric-specs.js'
import { integerOperationCases } from '../fixtures/sql-semantics/operations/integer-operations.js'

// A CHECK that evaluates the expression and tests its result for NULL.
const nullTest = (operand: EvalExpression): EvalBoolExpression => ({
  kind: 'eval-scalar',
  expression: { kind: 'null-test', type: 'pg_catalog.bool', operand, negated: false },
})

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

describe('typed partial SQL expressions in the CHECK evaluator', () => {
  it('emits stored name values and char bytes directly', () => {
    for (const expression of [
      { kind: 'name', type: 'pg_catalog.name', value: 'é😊'.repeat(40), stored: true },
      { kind: 'internal-char', type: 'pg_catalog."char"', value: '\\377', byte: 255 },
      { kind: 'internal-char', type: 'pg_catalog."char"', value: '\\000', byte: 0 },
    ] as const) {
      const node: EvalExpression = { kind: 'certain', expression }
      const prepared = prepareCheckRust(nullTest(node))
      expect(prepared.kind).toBe('supported')
      if (prepared.kind === 'supported')
        expect(prepared.evaluator.source).not.toMatch(/sql__pg_catalog__(namein|charin)_/u)
    }
  })
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
    expect(emitCheckRustEvaluator({ kind: 'eval-scalar', expression }).inputs).toEqual([])
    expect(
      emitCheckRustEvaluator({
        kind: 'eval-scalar',
        expression: equal('outerCase', '1'),
      }).inputs.map((input) => input.name),
    ).toEqual(['outerCase'])
  })
  it('lifts every fixture-backed callable with operands', () => {
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
        operands: expression.operands.map(
          (operand, index) =>
            ({ kind: 'input', type: operand.type, name: 'operand' + index }) as EvalExpression,
        ),
      }
      const prepared = prepareCheckRust(nullTest(partial))
      expect(prepared.kind === 'unsupported' ? prepared.reason : prepared.kind, signature).toBe(
        'supported',
      )
    }
  })

  it('lifts catalog-backed casts through the same exact signature path', () => {
    expect(casts.size).toBe(32)
    for (const [signature, expression] of casts) {
      const partial: EvalExpression = {
        kind: 'call',
        call: { kind: 'cast', signature, type: expression.type },
        operands: [
          { kind: 'input', type: expression.operand.type, name: 'operand' } as EvalExpression,
        ],
      }
      const prepared = prepareCheckRust(nullTest(partial))
      expect(prepared.kind === 'unsupported' ? prepared.reason : prepared.kind, signature).toBe(
        'supported',
      )
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
      emitCheckRustEvaluator(
        nullTest({
          kind: 'call',
          call,
          operands: [{ kind: 'uncertain', type: 'pg_catalog.int4' }],
        }),
      ),
    ).toThrow('Unsupported Rust CHECK callable arguments')
    expect(() =>
      emitCheckRustEvaluator(
        nullTest({ kind: 'call', call: { ...call, type: 'pg_catalog.bool' }, operands: [operand] }),
      ),
    ).toThrow('Unsupported Rust CHECK callable')
  })
})
