import type { JsonSchemaDocument } from '../../src/config/schema.js'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { factory, printFile, printNode } from '../../src/codegen/typescript/ast.js'
import { createTypescriptJsonSchemaTypes } from '../../src/codegen/typescript/json-schema-types.js'
import { createTypescriptJsonSchemaGraphs } from '../../src/codegen/typescript/jsonschemas.js'
import { parseConfigString } from '../../src/config/loader.js'

const errors = (source: string) => {
  const path = '/tmp/pgsid-json-schema-type-usage.ts'
  const options = {
    strict: true,
    noEmit: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
  }
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile.bind(host)
  host.getSourceFile = (name, version, onError, createNew) =>
    name === path
      ? ts.createSourceFile(name, 'export {};\n' + source, version, true)
      : original(name, version, onError, createNew)
  return ts
    .getPreEmitDiagnostics(ts.createProgram([path], options, host))
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

const declarations = (schema: JsonSchemaDocument) => {
  const graph = createTypescriptJsonSchemaTypes(schema, 'Document')
  const source = printFile(
    graph.declarations.map((entry) =>
      factory.createTypeAliasDeclaration(undefined, entry.name, undefined, entry.type),
    ),
  )
  return { graph, source }
}

describe('named TypeScript JSON Schema types', () => {
  it('reuses nested objects, array members, dictionary values, and canonical definitions', () => {
    const child = {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer' } },
      additionalProperties: false,
    }
    const schema: JsonSchemaDocument = {
      type: 'object',
      properties: {
        actor: child,
        members: {
          type: 'array',
          items: {
            type: 'object',
            required: ['label'],
            properties: { label: { type: 'string' } },
            additionalProperties: false,
          },
        },
        lookup: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            required: ['active'],
            properties: { active: { type: 'boolean' } },
            additionalProperties: false,
          },
        },
        node: { $ref: '#/$defs/Node' },
      },
      $defs: {
        Node: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' }, next: { $ref: '#/$defs/Node' } },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    }
    const { graph, source } = declarations(schema)
    expect(printNode(graph.resolve(child, (name) => factory.createTypeReferenceNode(name)))).toBe(
      'DocumentActor',
    )
    expect(
      errors(
        source +
          `
      declare const doc: Document;
      const actor: DocumentActor | undefined = doc.actor;
      const members: DocumentMembersItem[] | undefined = doc.members;
      const lookup: Record<string, DocumentLookupValue> | undefined = doc.lookup;
      const node: DocumentNode = {id: 1, next: {id: 2, next: {id: 3}}};
      // @ts-expect-error Deep recursive values retain their constraints.
      const invalid: DocumentNode = {id: 1, next: {id: 2, next: {id: 'bad'}}};
    `,
      ),
    ).toEqual([])
  })

  it('preserves null in recursive references and permits recursive arrays', () => {
    const schema: JsonSchemaDocument = {
      anyOf: [{ type: 'null' }, { type: 'array', items: { $ref: '#' } }],
    }
    const { source } = declarations(schema)
    expect(errors(source + 'const doc: Document = [null, [null, []]];')).toEqual([])
    expect(errors(source + "const doc: Document = [null, ['bad']];")).not.toEqual([])
  })

  it('names separate object branches and preserves constrained roots', () => {
    const schema: JsonSchemaDocument = {
      type: 'object',
      properties: { id: { type: 'integer' } },
      anyOf: [
        { type: 'object', required: ['kind'], properties: { kind: { const: 'a' } } },
        { type: 'object', required: ['kind'], properties: { kind: { const: 'b' } } },
      ],
    }
    const { source } = declarations(schema)
    expect(
      errors(source + "const a: Document = {id: 1, kind: 'a'}; const b: Document = {kind: 'b'};"),
    ).toEqual([])
    expect(errors(source + "const a: Document = {kind: 'c'};")).not.toEqual([])
  })

  it('supports nested unions of objects and arrays without alias collisions', () => {
    const { source } = declarations({
      type: 'object',
      required: ['value'],
      properties: {
        value: {
          type: ['object', 'array'],
          properties: { id: { type: 'integer' } },
          additionalProperties: false,
          items: { type: 'integer' },
        },
      },
      additionalProperties: false,
    })
    expect(
      errors(
        source +
          'const object: Document = {value: {id: 1}}; const array: Document = {value: [1, 2]};',
      ),
    ).toEqual([])
    expect(errors(source + "const invalid: Document = {value: ['bad']};")).not.toEqual([])
  })

  it('terminates reference cycles in compositions as well as recursive properties', () => {
    const schema: JsonSchemaDocument = {
      type: 'object',
      properties: {
        first: { $ref: '#/$defs/Node' },
        second: { $ref: '#/$defs/Node' },
      },
      $defs: {
        Node: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
          allOf: [{ $ref: '#/$defs/Node' }],
        },
      },
    }
    const { graph, source } = declarations(schema)
    expect(errors(source + 'const doc: Document = {first: {id: 1}, second: {id: 2}};')).toEqual([])
    expect(() =>
      graph.resolve({ $ref: '#/$defs/Node' }, (name) => factory.createTypeReferenceNode(name)),
    ).not.toThrow()
  })

  it('rejects nested type collisions and case-insensitive schema filenames', () => {
    expect(() =>
      declarations({
        type: 'object',
        properties: { actor_id: { type: 'object' }, actorId: { type: 'object' } },
      }),
    ).toThrow('collide')
    const config = parseConfigString(`schema: schema.sql
types:
  jsonSchemas:
    Payload: {schema: {type: string}}
    PAYLOAD: {schema: {type: string}}
sql:
  codegen:
    typescript:
      mappings:
        column:
          public.events.payload: {jsonSchema: Payload}
          public.events.audit: {jsonSchema: PAYLOAD}
`)
    expect(() =>
      createTypescriptJsonSchemaGraphs(config, {
        Payload: { type: 'string' },
        PAYLOAD: { type: 'string' },
      }),
    ).toThrow('filenames collide')
  })
})
