import { describe, expect, it } from 'vitest'
import { parseConfigString } from '../../src/config/loader.js'
import { goJsonSchemaBindings } from '../../src/codegen/go/json-schema-bindings.js'
import { goValidationSchema } from '../../src/codegen/go/json-schema-validation.js'
import type { JsonSchemaBindings } from '../../src/codegen/shared/json-schema-lineage.js'
import type { JsonSchemaDocument } from '../../src/config/schema.js'
import type { ValueLineage } from '../../src/query/value-lineage.js'

const column = (name = 'payload'): ValueLineage => ({
  kind: 'column',
  column: { schema: 'public', relation: 'documents', column: name },
  resolvedType: 'jsonb',
})
const access = (path: (string | number)[], result: 'json' | 'text' = 'json'): ValueLineage => ({
  kind: 'transform',
  operation: { kind: 'json-access', syntax: 'operator', path, result },
  inputs: [column()],
  resolvedType: result === 'json' ? 'jsonb' : 'text',
})
const bindings = (document: JsonSchemaDocument): JsonSchemaBindings => ({
  schemas: { Document: document },
  columns: { 'public.documents.payload': { schemaName: 'Document', runtimeValidation: true } },
})

describe('Go JSON Schema validation', () => {
  it.each([
    [undefined, undefined, false],
    [false, undefined, false],
    [true, undefined, true],
    [true, false, false],
    [false, true, true],
    [undefined, true, true],
  ])('resolves global %s and column %s as %s', (global, override, expected) => {
    const config = parseConfigString(`
schema: schema.sql
types:
  jsonSchemas:
    Document: {schema: {type: object}}
sql:
  codegen:
    go:
      ${global === undefined ? '' : `jsonSchemas: {runtime: {validate: ${global}}}`}
      mappings:
        column:
          public.documents.payload:
            jsonSchema: Document
            ${override === undefined ? '' : `runtime: {validate: ${override}}`}
`)
    expect(
      goJsonSchemaBindings(config, { Document: { type: 'object' } }).columns[
        'public.documents.payload'
      ]?.runtimeValidation,
    ).toBe(expected)
  })

  it('enables validation when the runtime object is requested', () => {
    const config = parseConfigString(
      'schema: schema.sql\nsql: {codegen: {go: {jsonSchemas: {runtime: {}}}}}',
    )
    expect(config.sql.codegen?.go?.jsonSchemas.runtime?.validate).toBe(true)
  })

  it.each([
    'jsonSchemas: {runtime: true}',
    'jsonSchemas: {runtime: {validate: yes}}',
    'jsonSchemas: {runtime: {unknown: true}}',
  ])('rejects invalid runtime config %s', (option) => {
    expect(() =>
      parseConfigString(`schema: schema.sql\nsql:\n  codegen:\n    go:\n      ${option}`),
    ).toThrow()
  })

  it('keeps recursive references, identifiers, and literal annotation values in their original document', () => {
    const document: JsonSchemaDocument = {
      $id: 'https://example.com/document.json',
      properties: { node: { $ref: '#/$defs/Node' } },
      $defs: {
        Node: { properties: { next: { $ref: '#/$defs/Node' } }, default: { $ref: 'literal' } },
      },
    }
    const result = goValidationSchema(access(['node']), bindings(document))!
    expect(document.$id).toBe('https://example.com/document.json')
    expect(result.schema).toEqual({
      $ref: 'pgsid:///jsonschemas/Document.json#/properties/node',
    })
    expect(document.$defs).toEqual({
      Node: { properties: { next: { $ref: '#/$defs/Node' } }, default: { $ref: 'literal' } },
    })
  })

  it('escapes JSON pointers and URL fragments for unusual property names', () => {
    const key = 'a/b~#?% 空'
    const result = goValidationSchema(
      access([key]),
      bindings({ properties: { [key]: { type: 'integer' } } }),
    )!
    const reference = (result.schema as Record<string, unknown>).$ref as string
    expect(decodeURIComponent(reference.split('#')[1]!)).toBe('/properties/a~1b~0#?% 空')
  })

  it('projects synthetic combinators back into original document scopes', () => {
    const document: JsonSchemaDocument = {
      anyOf: [
        { properties: { node: { type: 'integer' } } },
        { properties: { node: { type: 'string' } } },
      ],
    }
    expect(goValidationSchema(access(['node']), bindings(document))?.schema).toEqual({
      anyOf: [
        { $ref: 'pgsid:///jsonschemas/Document.json#/anyOf/0/properties/node' },
        { $ref: 'pgsid:///jsonschemas/Document.json#/anyOf/1/properties/node' },
      ],
    })
  })

  it.each([false, true])('references boolean root schema %s by identity', (schema) => {
    expect(goValidationSchema(column(), bindings(schema))?.schema).toEqual({
      $ref: 'pgsid:///jsonschemas/Document.json#',
    })
  })

  it('skips text, missing lineage, unmapped columns, and partially opted-out choices', () => {
    const binding = bindings({ type: 'object' })
    expect(goValidationSchema(undefined, binding)).toBeUndefined()
    expect(goValidationSchema(column('unknown'), binding)).toBeUndefined()
    expect(goValidationSchema(access(['id'], 'text'), binding)).toBeUndefined()
    const choice: ValueLineage = {
      kind: 'transform',
      operation: { kind: 'choice', form: 'case' },
      inputs: [column(), column('unchecked')],
      resolvedType: 'jsonb',
    }
    expect(goValidationSchema(choice, binding)).toBeUndefined()
    expect(
      goValidationSchema(choice, {
        ...binding,
        columns: {
          ...binding.columns,
          'public.documents.unchecked': { schemaName: 'Document', runtimeValidation: false },
        },
      }),
    ).toBeUndefined()
    expect(
      goValidationSchema(choice, {
        ...binding,
        columns: {
          ...binding.columns,
          'public.documents.unchecked': { schemaName: 'Document', runtimeValidation: true },
        },
      })?.schema,
    ).toEqual({
      anyOf: [
        { $ref: 'pgsid:///jsonschemas/Document.json#' },
        { $ref: 'pgsid:///jsonschemas/Document.json#' },
      ],
    })
  })
})
