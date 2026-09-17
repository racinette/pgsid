import { describe, expect, it } from 'vitest'
import { planJsonSchemaInputs } from '../../src/codegen/shared/json-schema-inputs.js'
import type { JsonSchemaBindings } from '../../src/codegen/shared/json-schema-lineage.js'
import type { ValueLineage, WriteValueLineage } from '../../src/query/value-lineage.js'

const target = { schema: 'public', relation: 'items', column: 'payload' }
const parameter = (number = 1, resolvedType = 'jsonb'): ValueLineage => ({
  kind: 'parameter',
  number,
  resolvedType,
})
const write = (
  value: ValueLineage,
  options: Partial<WriteValueLineage> = {},
): WriteValueLineage => ({ target, value, source: 'insert', partial: false, ...options })
const bindings: JsonSchemaBindings = {
  schemas: { Event: { type: 'object' } },
  columns: { 'public.items.payload': { schemaName: 'Event', runtimeValidation: true } },
}

describe('JSON Schema write inputs', () => {
  it('deduplicates a parameter reaching the same column through repeated writes', () => {
    const plan = planJsonSchemaInputs(
      [write(parameter()), write(parameter(), { source: 'update' })],
      bindings,
    )
    expect([...plan.parameters]).toEqual([
      [1, [{ kind: 'column', column: target, resolvedType: 'jsonb' }]],
    ])
    expect(plan.unsupported).toEqual([])
  })
  it('retains independent contracts when one parameter writes multiple columns', () => {
    const second = { ...target, column: 'audit' }
    const plan = planJsonSchemaInputs(
      [write(parameter()), write(parameter(), { target: second })],
      {
        ...bindings,
        columns: {
          ...bindings.columns,
          'public.items.audit': { schemaName: 'Event', runtimeValidation: false },
        },
      },
    )
    expect(plan.parameters.get(1)).toHaveLength(2)
  })
  it('follows JSON casts, VALUES branches, and excluded assignment lineage', () => {
    const cast: ValueLineage = {
      kind: 'transform',
      operation: { kind: 'cast', target: { name: 'jsonb' } },
      inputs: [parameter(1, 'json')],
      resolvedType: 'jsonb',
    }
    const assignment: ValueLineage = {
      kind: 'transform',
      operation: { kind: 'assignment', target, source: 'insert' },
      inputs: [parameter(2)],
      resolvedType: 'jsonb',
    }
    const choice: ValueLineage = {
      kind: 'transform',
      operation: { kind: 'choice', form: 'values' },
      inputs: [cast, assignment, parameter(1)],
      resolvedType: 'jsonb',
    }
    expect([...planJsonSchemaInputs([write(choice)], bindings).parameters.keys()]).toEqual([1, 2])
  })
  it.each(['case', 'coalesce'] as const)(
    'does not impose a whole-document contract on %s branches',
    (form) => {
      const value: ValueLineage = {
        kind: 'transform',
        operation: { kind: 'choice', form },
        inputs: [parameter(), parameter(2)],
        resolvedType: 'jsonb',
      }
      const plan = planJsonSchemaInputs([write(value)], bindings)
      expect([...plan.parameters]).toEqual([])
      expect(plan.unsupported).toEqual([{ column: 'public.items.payload', parameters: [1, 2] }])
    },
  )
  it('reports transformed, text-cast, and partial assignments without assigning a false type', () => {
    const transformed: ValueLineage = {
      kind: 'transform',
      operation: {
        kind: 'function',
        function: { schema: 'pg_catalog', name: 'jsonb_set' },
        resolution: null,
      },
      inputs: [parameter()],
      resolvedType: 'jsonb',
    }
    const cast: ValueLineage = {
      kind: 'transform',
      operation: { kind: 'cast', target: { name: 'jsonb' } },
      inputs: [parameter(2, 'text')],
      resolvedType: 'jsonb',
    }
    const plan = planJsonSchemaInputs(
      [write(transformed), write(cast), write(parameter(3), { partial: true })],
      bindings,
    )
    expect([...plan.parameters]).toEqual([])
    expect(plan.unsupported.map((item) => item.parameters)).toEqual([[1], [2], [3]])
  })
  it('does not report a function or an unmapped write with no relevant input contract', () => {
    const literal: ValueLineage = { kind: 'literal', value: null, resolvedType: 'jsonb' }
    expect(
      planJsonSchemaInputs(
        [write(literal), write(parameter(), { target: { ...target, column: 'other' } })],
        bindings,
      ).unsupported,
    ).toEqual([])
  })
})
