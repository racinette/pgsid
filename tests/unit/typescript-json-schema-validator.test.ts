import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  generateTypescriptJsonSchemaLineageValidator,
  generateTypescriptJsonSchemaValidator,
  UnsupportedJsonSchemaError,
} from '../../src/codegen/typescript/json-schema-validator.js'
import type { JsonSchemaLineage } from '../../src/codegen/shared/json-schema-lineage.js'

const evaluateValidator = (source: string, name: string): ((value: unknown) => boolean) => {
  const executable = `${source.replace('export function', 'function')}\nreturn ${name}`
  const javascript = ts.transpileModule(executable, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  })
  expect(javascript.diagnostics).toEqual([])
  return Function(javascript.outputText)() as (value: unknown) => boolean
}

describe('generateTypescriptJsonSchemaValidator', () => {
  it('checks object properties, patterns, required keys, and additional keys', () => {
    const source = generateTypescriptJsonSchemaValidator('isEvent', 'Event', {
      type: 'object',
      required: ['id', 'tag'],
      properties: {
        id: { type: 'integer', minimum: 1 },
        tag: { type: 'string', minLength: 2, pattern: '^[a-z]+$' },
      },
      patternProperties: { '^x-': { type: 'boolean' } },
      additionalProperties: false,
    })
    const isEvent = evaluateValidator(source, 'isEvent')

    expect(isEvent({ id: 1, tag: 'ok', 'x-live': true })).toBe(true)
    expect(isEvent({ id: 0, tag: 'ok' })).toBe(false)
    expect(isEvent({ id: 1, tag: 'X' })).toBe(false)
    expect(isEvent({ id: 1, tag: 'ok', 'x-live': 1 })).toBe(false)
    expect(isEvent({ id: 1, tag: 'ok', extra: true })).toBe(false)
    expect(isEvent({ id: 1 })).toBe(false)
  })

  it('checks tuple tails, contains bounds, and structural uniqueness', () => {
    const source = generateTypescriptJsonSchemaValidator('isSequence', 'Sequence', {
      type: 'array',
      prefixItems: [{ type: 'integer' }],
      items: { type: 'object', required: ['kind'], properties: { kind: { const: 'item' } } },
      minItems: 2,
      maxItems: 3,
      contains: { type: 'object', required: ['kind'], properties: { kind: { const: 'item' } } },
      minContains: 1,
      maxContains: 2,
      uniqueItems: true,
    })
    const isSequence = evaluateValidator(source, 'isSequence')

    expect(isSequence([1, { kind: 'item' }, { kind: 'item', id: 2 }])).toBe(true)
    expect(isSequence(['1', { kind: 'item' }])).toBe(false)
    expect(isSequence([1, { kind: 'other' }])).toBe(false)
    expect(isSequence([1, { kind: 'item' }, { kind: 'item' }, { kind: 'item' }])).toBe(false)
    expect(isSequence([1, { kind: 'item' }, { kind: 'item' }])).toBe(false)
  })

  it('checks references, compositions, conditionals, const, enum, and nullability', () => {
    const document = {
      $defs: {
        payload: {
          type: 'object',
          required: ['kind', 'value'],
          properties: {
            kind: { enum: ['count', 'label'] },
            value: {},
          },
          if: { properties: { kind: { const: 'count' } }, required: ['kind'] },
          then: { properties: { value: { type: 'integer' } } },
          else: { properties: { value: { type: 'string' } } },
          not: { properties: { value: { const: '' } }, required: ['value'] },
        },
      },
    }
    const source = generateTypescriptJsonSchemaValidator(
      'isPayload',
      'Payload | null',
      { $ref: '#/$defs/payload' },
      { document, nullable: true },
    )
    const isPayload = evaluateValidator(source, 'isPayload')

    expect(isPayload(null)).toBe(true)
    expect(isPayload({ kind: 'count', value: 2 })).toBe(true)
    expect(isPayload({ kind: 'label', value: 'two' })).toBe(true)
    expect(isPayload({ kind: 'count', value: 'two' })).toBe(false)
    expect(isPayload({ kind: 'label', value: '' })).toBe(false)
    expect(isPayload({ kind: 'other', value: 'two' })).toBe(false)
  })

  it('requires exactly one oneOf branch', () => {
    const source = generateTypescriptJsonSchemaValidator('isOne', 'One', {
      oneOf: [{ type: 'number' }, { type: 'integer' }],
    })
    const isOne = evaluateValidator(source, 'isOne')

    expect(isOne(1.5)).toBe(true)
    expect(isOne(1)).toBe(false)
    expect(isOne('1')).toBe(false)
  })

  it('rejects unsupported assertions and recursive references', () => {
    expect(() =>
      generateTypescriptJsonSchemaValidator('isClosed', 'Closed', {
        unevaluatedProperties: false,
      }),
    ).toThrowError(UnsupportedJsonSchemaError)
    expect(() =>
      generateTypescriptJsonSchemaValidator('isRecursive', 'Recursive', {
        $ref: '#',
      }),
    ).toThrowError('Unsupported JSON Schema assertion: recursive #')
  })
})

describe('generateTypescriptJsonSchemaLineageValidator', () => {
  const alternative = {
    schemaName: 'Event',
    root: { schema: 'public', relation: 'events', column: 'payload' },
    path: ['id'],
    document: { type: 'object' },
    schema: { type: 'integer' },
    representation: 'json' as const,
    runtimeValidation: true,
  }

  it('generates only for complete, fully opted-in lineage', () => {
    const enabled: JsonSchemaLineage = { alternatives: [alternative], complete: true }
    const source = generateTypescriptJsonSchemaLineageValidator('isId', 'number', enabled)
    expect(source).not.toBeNull()
    const isId = evaluateValidator(source!, 'isId')
    expect(isId(1)).toBe(true)
    expect(isId(1.5)).toBe(false)

    expect(
      generateTypescriptJsonSchemaLineageValidator('isId', 'number', {
        alternatives: [alternative],
        complete: false,
      }),
    ).toBeNull()
    expect(
      generateTypescriptJsonSchemaLineageValidator('isId', 'number', {
        alternatives: [{ ...alternative, runtimeValidation: false }],
        complete: true,
      }),
    ).toBeNull()
  })

  it('validates text extraction as PostgreSQL text', () => {
    const source = generateTypescriptJsonSchemaLineageValidator('isTextId', 'string', {
      alternatives: [{ ...alternative, representation: 'text' }],
      complete: true,
    })
    const isTextId = evaluateValidator(source!, 'isTextId')

    expect(isTextId('42')).toBe(true)
    expect(isTextId(42)).toBe(false)
  })
})
