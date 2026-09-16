import { describe, expect, it } from 'vitest'
import { go, printGoFile } from '../../src/codegen/go/ast.js'
import { renderGoJsonSchemaArtifacts } from '../../src/codegen/go/jsonschemas.js'
import { goTypeFromJsonSchema } from '../../src/codegen/go/json-schema.js'
import type { JsonSchemaDocument } from '../../src/config/schema.js'

describe('goTypeFromJsonSchema', () => {
  it('renders nested objects, arrays, optional properties, and recursion', () => {
    const schema: JsonSchemaDocument = {
      type: 'object',
      required: ['id', 'items'],
      properties: {
        id: { type: 'integer' },
        note: { type: ['string', 'null'] },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['active'],
            properties: { active: { type: 'boolean' } },
          },
        },
        parent: { $ref: '#' },
      },
      additionalProperties: false,
    }
    const source = printGoFile({
      package: 'db',
      imports: [],
      declarations: [
        go.type('Payload', goTypeFromJsonSchema(schema, { document: schema, rootName: 'Payload' })),
      ],
    })

    expect(source).toMatch(/Id\s+int64/u)
    expect(source).toMatch(/Note\s+\*string/u)
    expect(source).toMatch(/Items\s+\[\]struct \{/u)
    expect(source).toContain('Active bool `json:"active"`')
    expect(source).toMatch(/Parent\s+\*Payload/u)
  })

  it.each([
    [['EventPayload', 'eventpayload'], 'JSON Schema filename'],
    [['event_payload', 'EventPayload'], 'JSON Schema type'],
  ] as const)('rejects colliding JSON Schema names %s', (names, collision) => {
    expect(() => renderGoJsonSchemaArtifacts(names, {}, '/jsonschemas')).toThrow(collision)
  })

  it('emits recursive schema definitions in individual files', () => {
    const definitions = renderGoJsonSchemaArtifacts(
      ['Node', 'Flag'],
      {
        Node: { type: 'object', properties: { next: { $ref: '#' } } },
        Flag: { type: 'boolean' },
      },
      '/jsonschemas',
    )
    expect(definitions.map((item) => item.path)).toEqual([
      '/jsonschemas/node.go',
      '/jsonschemas/flag.go',
    ])
    expect(definitions[0]?.content).toContain('Next *Node')
    expect(definitions[1]?.content).toBe('package jsonschemas\n\ntype Flag bool\n')
  })

  it.each(['pointers', 'structs'] as const)(
    'names nested objects, array items, maps, and shared recursive refs: %s',
    (nulls) => {
      const source = renderGoJsonSchemaArtifacts(
        ['Payload'],
        {
          Payload: {
            type: 'object',
            required: ['actor', 'members', 'lookup', 'nullable'],
            properties: {
              actor: {
                type: 'object',
                required: ['profile'],
                properties: {
                  profile: { type: 'object', properties: { id: { type: 'integer' } } },
                },
              },
              members: {
                type: 'array',
                items: { type: 'object', properties: { id: { type: 'integer' } } },
              },
              lookup: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: { active: { type: 'boolean' } },
                },
              },
              nullable: { type: ['object', 'null'], properties: { name: { type: 'string' } } },
              first: { $ref: '#/$defs/Node' },
              second: { $ref: '#/$defs/Node' },
            },
            $defs: { Node: { type: 'object', properties: { next: { $ref: '#/$defs/Node' } } } },
          },
        },
        '/jsonschemas',
        { nulls, nullsImportPath: 'example.com/app/pgsid' },
      )[0]!.content
      for (const name of [
        'PayloadActor',
        'PayloadActorProfile',
        'PayloadMembersItem',
        'PayloadLookup',
        'PayloadLookupValue',
        'PayloadNullable',
        'PayloadNode',
      ])
        expect(source).toContain(`type ${name} `)
      expect(source).toMatch(/Actor\s+PayloadActor\s/u)
      expect(source).toMatch(/Members\s+\[\]PayloadMembersItem/u)
      expect(source).toContain('type PayloadLookup map[string]PayloadLookupValue')
      expect(source.match(/type PayloadNode struct/g)).toHaveLength(1)
      expect(source).toContain('*PayloadNode')
      expect(source).not.toContain('pgsid.Null[struct')
      expect(source).not.toContain('[]struct')
      expect(source).not.toContain('any')
    },
  )

  it.each([
    {
      Payload: { type: 'object', properties: { actor: { type: 'object' } } },
      PayloadActor: { type: 'string' },
    },
    {
      Payload: {
        type: 'object',
        properties: {
          actorProfile: { type: 'object' },
          actor: { type: 'object', properties: { profile: { type: 'object' } } },
        },
      },
    },
    {
      Payload: {
        type: 'object',
        properties: {
          membersItem: { type: 'object' },
          members: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      Payload: {
        type: 'object',
        properties: {
          lookupValue: { type: 'object' },
          lookup: { type: 'object', additionalProperties: { type: 'object' } },
        },
      },
    },
  ] as Record<string, JsonSchemaDocument>[])(
    'rejects nested type name collisions without emitting files',
    (schemas) => {
      expect(() =>
        renderGoJsonSchemaArtifacts(Object.keys(schemas), schemas, '/jsonschemas'),
      ).toThrow('JSON Schema type')
    },
  )

  it('uses any for JSON unions Go cannot express', () => {
    const type = goTypeFromJsonSchema({ oneOf: [{ type: 'string' }, { type: 'integer' }] })
    expect(
      printGoFile({ package: 'db', imports: [], declarations: [go.type('Value', type)] }),
    ).toBe('package db\n\ntype Value any\n')
  })
})
