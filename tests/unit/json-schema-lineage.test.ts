import { describe, expect, it } from 'vitest'
import {
  resolveJsonSchemaLineage,
  type JsonSchemaBindings,
} from '../../src/codegen/shared/json-schema-lineage.js'
import { typescriptJsonSchemaBindings } from '../../src/codegen/typescript/json-schema-bindings.js'
import { parseConfigString } from '../../src/config/loader.js'
import type { JsonSchemaDocument } from '../../src/config/schema.js'
import type { DatabaseColumn, ValueLineage, ValueOperation } from '../../src/query/value-lineage.js'

const databaseColumn = (column: string, relation = 'events'): DatabaseColumn => ({
  schema: 'public',
  relation,
  column,
})

const column = (name: string, relation = 'events'): ValueLineage => ({
  kind: 'column',
  column: databaseColumn(name, relation),
  resolvedType: 'jsonb',
})

const transform = (
  operation: ValueOperation,
  inputs: ValueLineage[],
  resolvedType = 'jsonb',
): ValueLineage => ({ kind: 'transform', operation, inputs, resolvedType })

const access = (
  input: ValueLineage,
  path: (string | number)[],
  result: 'json' | 'text' = 'json',
): ValueLineage =>
  transform(
    { kind: 'json-access', path, result, syntax: 'operator' },
    [input],
    result === 'text' ? 'text' : 'jsonb',
  )

const eventSchema: JsonSchemaDocument = {
  type: 'object',
  properties: {
    actor: { $ref: '#/$defs/actor' },
    items: {
      type: 'array',
      prefixItems: [{ type: 'string' }],
      items: {
        type: 'object',
        properties: { sku: { type: 'string' } },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
  $defs: {
    actor: {
      type: 'object',
      properties: { id: { type: 'integer' } },
      additionalProperties: false,
    },
  },
}

const bindings: JsonSchemaBindings = {
  schemas: {
    EventPayload: eventSchema,
    AuditPayload: {
      type: 'object',
      properties: { actor: { type: 'string' } },
      additionalProperties: false,
    },
  },
  columns: {
    'public.events.payload': { schemaName: 'EventPayload', runtimeValidation: true },
    'public.audit.payload': { schemaName: 'AuditPayload', runtimeValidation: false },
  },
}

describe('JSON Schema lineage', () => {
  it('walks object properties through local references', () => {
    expect(resolveJsonSchemaLineage(access(column('payload'), ['actor', 'id']), bindings)).toEqual({
      alternatives: [
        {
          schemaName: 'EventPayload',
          root: databaseColumn('payload'),
          path: ['actor', 'id'],
          document: eventSchema,
          schema: { type: 'integer' },
          representation: 'json',
          runtimeValidation: true,
        },
      ],
      complete: true,
    })
  })

  it('walks tuple and repeated array items', () => {
    expect(
      resolveJsonSchemaLineage(access(column('payload'), ['items', 0]), bindings).alternatives[0]
        ?.schema,
    ).toEqual({ type: 'string' })
    expect(
      resolveJsonSchemaLineage(access(column('payload'), ['items', -1]), bindings).alternatives[0]
        ?.schema,
    ).toEqual({
      anyOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: { sku: { type: 'string' } },
          additionalProperties: false,
        },
      ],
    })
    expect(
      resolveJsonSchemaLineage(access(column('payload'), ['items', 4, 'sku']), bindings)
        .alternatives[0]?.schema,
    ).toEqual({ type: 'string' })
  })

  it('retains the selected schema when PostgreSQL renders it as text', () => {
    expect(
      resolveJsonSchemaLineage(access(column('payload'), ['actor', 'id'], 'text'), bindings)
        .alternatives[0],
    ).toMatchObject({
      schema: { type: 'integer' },
      representation: 'text',
    })
  })

  it('resets provenance at a mapped assignment target', () => {
    const assigned = transform(
      {
        kind: 'assignment',
        target: databaseColumn('payload', 'audit'),
        source: 'insert',
      },
      [column('payload')],
    )
    expect(resolveJsonSchemaLineage(access(assigned, ['actor']), bindings)).toMatchObject({
      alternatives: [
        {
          schemaName: 'AuditPayload',
          root: databaseColumn('payload', 'audit'),
          path: ['actor'],
          schema: { type: 'string' },
          runtimeValidation: false,
        },
      ],
      complete: true,
    })
  })

  it('does not bypass an authoritative mapping whose document is unavailable', () => {
    const assigned = transform(
      {
        kind: 'assignment',
        target: databaseColumn('payload', 'audit'),
        source: 'insert',
      },
      [column('payload')],
    )
    const missing: JsonSchemaBindings = {
      schemas: { EventPayload: eventSchema },
      columns: {
        ...bindings.columns,
        'public.audit.payload': { schemaName: 'Missing', runtimeValidation: true },
      },
    }
    expect(resolveJsonSchemaLineage(assigned, missing)).toEqual({
      alternatives: [],
      complete: false,
    })
  })

  it('propagates through an unmapped assignment target', () => {
    const assigned = transform(
      {
        kind: 'assignment',
        target: databaseColumn('archived_payload'),
        source: 'update',
      },
      [column('payload')],
    )
    expect(resolveJsonSchemaLineage(access(assigned, ['actor']), bindings)).toMatchObject({
      alternatives: [
        {
          schemaName: 'EventPayload',
          root: databaseColumn('payload'),
          path: ['actor'],
        },
      ],
      complete: true,
    })
  })

  it('preserves alternatives and reports an unmapped choice as incomplete', () => {
    const choice = transform({ kind: 'choice', form: 'coalesce' }, [
      column('payload'),
      column('fallback_payload'),
    ])
    expect(resolveJsonSchemaLineage(access(choice, ['actor']), bindings)).toMatchObject({
      alternatives: [{ schemaName: 'EventPayload', path: ['actor'] }],
      complete: false,
    })
  })

  it('deduplicates equivalent write paths and follows row-absence origins', () => {
    const absent: ValueLineage = {
      kind: 'row-absence',
      image: 'old',
      origin: column('payload'),
      resolvedType: 'jsonb',
    }
    const choice = transform({ kind: 'choice', form: 'write-path' }, [column('payload'), absent])
    const resolved = resolveJsonSchemaLineage(access(choice, ['actor']), bindings)
    expect(resolved.alternatives).toHaveLength(1)
    expect(resolved).toMatchObject({ complete: true, alternatives: [{ path: ['actor'] }] })
  })

  it('distinguishes a known-missing path from an unresolved reference', () => {
    expect(
      resolveJsonSchemaLineage(access(column('payload'), ['missing']), bindings),
    ).toMatchObject({ complete: true, alternatives: [{ schema: false }] })

    const unresolved: JsonSchemaBindings = {
      schemas: { External: { $ref: 'https://example.com/schema.json' } },
      columns: {
        'public.events.payload': { schemaName: 'External', runtimeValidation: false },
      },
    }
    expect(resolveJsonSchemaLineage(access(column('payload'), ['value']), unresolved)).toEqual({
      alternatives: [],
      complete: false,
    })
  })

  it('combines JSON Schema alternatives and sibling constraints', () => {
    const composed: JsonSchemaBindings = {
      schemas: {
        Composed: {
          allOf: [
            {
              type: 'object',
              properties: { value: { type: 'integer' } },
            },
          ],
          type: 'object',
          properties: { value: { minimum: 0 } },
        },
        Union: {
          anyOf: [
            { type: 'object', properties: { value: { type: 'integer' } } },
            { type: 'object', properties: { value: { type: 'string' } } },
          ],
        },
      },
      columns: {
        'public.events.payload': { schemaName: 'Composed', runtimeValidation: false },
        'public.events.fallback_payload': { schemaName: 'Union', runtimeValidation: false },
      },
    }
    expect(
      resolveJsonSchemaLineage(access(column('payload'), ['value']), composed).alternatives[0]
        ?.schema,
    ).toEqual({ allOf: [{ type: 'integer' }, { minimum: 0 }] })
    expect(
      resolveJsonSchemaLineage(access(column('fallback_payload'), ['value']), composed)
        .alternatives[0]?.schema,
    ).toEqual({ anyOf: [{ type: 'integer' }, { type: 'string' }] })
  })

  it('applies the target runtime-validation default and column override', () => {
    const config = parseConfigString(`
      schema: schema.sql
      types:
        jsonSchemas:
          EventPayload:
            schema: true
      sql:
        codegen:
          typescript:
            mappings:
              column:
                public.events.payload:
                  jsonSchema: EventPayload
                public.events.fallback_payload:
                  jsonSchema: EventPayload
                  runtime: {validate: false}
            jsonSchemas:
              runtime: {outDir: generated/validation, validate: true}
    `)
    expect(typescriptJsonSchemaBindings(config, { EventPayload: true }).columns).toEqual({
      'public.events.payload': { schemaName: 'EventPayload', runtimeValidation: true },
      'public.events.fallback_payload': {
        schemaName: 'EventPayload',
        runtimeValidation: false,
      },
    })
  })
})
