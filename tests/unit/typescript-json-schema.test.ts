import { describe, expect, it } from 'vitest'
import {
  renderTypescriptJsonSchema,
  renderTypescriptJsonSchemaLineage,
} from '../../src/codegen/typescript/json-schema.js'
import type { JsonSchemaLineage } from '../../src/codegen/shared/json-schema-lineage.js'
import type { JsonSchemaDocument } from '../../src/config/schema.js'
import ts from 'typescript'

describe('TypeScript JSON Schema rendering', () => {
  it('renders primitives, constants, enums, and unions', () => {
    expect(renderTypescriptJsonSchema(true)).toBe('unknown')
    expect(renderTypescriptJsonSchema(false)).toBe('never')
    expect(renderTypescriptJsonSchema({ type: ['string', 'null'] })).toBe('string | null')
    expect(renderTypescriptJsonSchema({ const: 'ready' })).toBe('"ready"')
    expect(renderTypescriptJsonSchema({ enum: ['ready', 'failed', null] })).toBe(
      '"ready" | "failed" | null',
    )
  })

  it('renders required, optional, and additional object properties', () => {
    expect(
      renderTypescriptJsonSchema({
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
          label: { type: 'string' },
        },
        additionalProperties: false,
      }),
    ).toSatisfy((source: string) => compact(source) === '{ "id": number; "label"?: string; }')
    expect(
      renderTypescriptJsonSchema({
        type: 'object',
        properties: { id: { type: 'integer' } },
      }),
    ).toSatisfy(
      (source: string) => compact(source) === '{ "id"?: number; [key: string]: unknown; }',
    )
    expect(renderTypescriptJsonSchema({ type: 'object', additionalProperties: false })).toBe(
      'Record<string, never>',
    )
  })

  it('renders homogeneous arrays and bounded prefix tuples', () => {
    expect(renderTypescriptJsonSchema({ type: 'array', items: { type: 'string' } })).toBe(
      'string[]',
    )
    expect(
      renderTypescriptJsonSchema({
        type: 'array',
        prefixItems: [{ type: 'integer' }, { type: 'string' }],
        minItems: 1,
        items: false,
      }),
    ).toSatisfy((source: string) => compact(source) === '[ number, string? ]')
    expect(
      renderTypescriptJsonSchema({
        type: 'array',
        prefixItems: [{ type: 'integer' }],
        minItems: 2,
        items: false,
      }),
    ).toBe('never')
    expect(
      renderTypescriptJsonSchema({
        type: 'array',
        prefixItems: [{ type: ['string', 'null'] }],
        items: false,
      }),
    ).toSatisfy((source: string) => compact(source) === '[ (string | null)? ]')
  })

  it('renders local references and schema composition', () => {
    const document: JsonSchemaDocument = {
      $ref: '#/$defs/value',
      $defs: {
        value: {
          allOf: [{ type: 'number' }, { anyOf: [{ const: 1 }, { const: 2 }] }],
        },
      },
    }
    expect(renderTypescriptJsonSchema(document)).toBe('number & (1 | 2)')
  })

  it('uses text representation and the PostgreSQL fallback for incomplete lineage', () => {
    const document: JsonSchemaDocument = { type: 'integer' }
    const lineage: JsonSchemaLineage = {
      alternatives: [
        {
          schemaName: 'Value',
          root: { schema: 'public', relation: 'events', column: 'payload' },
          path: ['value'],
          document,
          schema: document,
          representation: 'text',
          runtimeValidation: true,
        },
      ],
      complete: false,
    }
    expect(renderTypescriptJsonSchemaLineage(lineage, { fallbackType: 'Buffer' })).toBe(
      'string | Buffer',
    )
    expect(renderTypescriptJsonSchemaLineage({ alternatives: [], complete: false })).toBe('unknown')
  })

  it('only emits syntactically valid TypeScript type expressions', () => {
    const cases: JsonSchemaDocument[] = [
      { type: ['object', 'array', 'null'] },
      {
        type: 'object',
        required: ['hyphenated-name'],
        properties: { 'hyphenated-name': { enum: ['x', 1, null] } },
        patternProperties: { '^x-': { type: 'boolean' } },
        additionalProperties: false,
      },
      {
        type: 'array',
        prefixItems: [{ anyOf: [{ type: 'string' }, { type: 'number' }] }],
        items: { type: ['boolean', 'null'] },
      },
    ]
    for (const schema of cases) {
      const type = renderTypescriptJsonSchema(schema)
      const result = ts.transpileModule(`type Generated = ${type}`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
        reportDiagnostics: true,
      })
      expect(result.diagnostics, type).toEqual([])
    }
  })
})

const compact = (source: string): string => source.replace(/\s+/gu, ' ').trim()
