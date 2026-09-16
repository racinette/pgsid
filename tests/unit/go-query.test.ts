import { describe, expect, it } from 'vitest'
import type { CatalogSnapshot } from '../../src/catalog/types.js'
import type { JsonSchemaDocument } from '../../src/config/schema.js'
import { renderGoQueryArtifacts } from '../../src/codegen/go/query.js'
import { createGoTypeContext } from '../../src/codegen/go/type-mapping.js'
import { parseConfigString } from '../../src/config/loader.js'
import type { QueryAnalysisItem } from '../../src/query-analysis.js'
import type { QueryParameter } from '../../src/query-file.js'
import type { OutputValueLineage } from '../../src/query/value-lineage.js'

const parameter = (name: string, index: number): QueryParameter => ({
  name,
  index,
  occurrences: [],
})

const analysis = (options: {
  name?: string
  columns: string[]
  columnTypes: string[]
  parameterTypes?: string[]
  parameters?: QueryParameter[]
  notNull?: boolean[]
  paramNotNull?: boolean[]
  lineage?: OutputValueLineage[]
}): QueryAnalysisItem => {
  const name = options.name ?? 'GetEvent'
  return {
    query: {
      id: `queries.sql#${name}`,
      path: 'queries.sql',
      name,
      routes: [],
      analysisHash: name,
      semanticHash: name,
      definition: {
        name,
        command: 'one',
        hash: name,
        sql: "SELECT id, payload->'actor' AS actor FROM events WHERE id = $1",
        stmt: {} as never,
        parameters: options.parameters ?? [],
        replacements: [],
        annotationStart: 0,
        annotationEnd: 0,
        sourceStart: 0,
        sourceEnd: 1,
      },
    },
    description: {
      columns: options.columns,
      columnTypes: options.columnTypes,
      params: options.parameterTypes?.length ?? 0,
      parameterTypes: options.parameterTypes ?? [],
    },
    contract: {
      outputs: options.columns.map((name, index) => ({
        name,
        notNull: options.notNull?.[index] ?? false,
      })),
      params: (options.parameterTypes ?? []).map((_, index) => ({
        number: index + 1,
        notNull: options.paramNotNull?.[index] ?? false,
      })),
      paramRejectionSets: [],
      outputPresenceGroups: [],
      alwaysRaises: false,
    },
    contractGate: { kind: 'agreed' },
    rawLineage: options.lineage ?? null,
    lineageGate: options.lineage ? { kind: 'agreed' } : null,
    dependencies: [],
    diagnostics: [],
    cacheKey: name,
    resultHash: name,
  }
}

const column = (name: string, type: string) => ({
  kind: 'column' as const,
  column: { schema: 'public', relation: 'events', column: name },
  resolvedType: type,
})

describe('renderGoQueryArtifacts', () => {
  it('emits named params, native domains, and JSON Schema lineage types', () => {
    const eventPayload: JsonSchemaDocument = {
      type: 'object',
      required: ['actor'],
      properties: { actor: { type: 'integer' } },
    }
    const config = parseConfigString(`
      schema: migrations/*.sql
      types:
        jsonSchemas:
          EventPayload:
            schema:
              type: object
              required: [actor]
              properties:
                actor: { type: integer }
      sql:
        codegen:
          go:
            mappings:
              column:
                public.events.payload:
                  jsonSchema: EventPayload
    `)
    const payload = column('payload', 'jsonb')
    const lineage: OutputValueLineage[] = [
      { name: 'id', value: column('id', 'event_id') },
      {
        name: 'actor',
        value: {
          kind: 'transform',
          operation: {
            kind: 'operator',
            operator: { name: '->' },
            resolution: {
              schema: 'pg_catalog',
              name: '->',
              leftType: 'jsonb',
              rightType: 'text',
              resultType: 'jsonb',
            },
          },
          inputs: [payload, { kind: 'literal', value: 'actor', resolvedType: 'text' }],
          resolvedType: 'jsonb',
        },
      },
    ]
    const catalog = {
      domains: [
        {
          schema: 'public',
          name: 'event_id',
          oid: 9000,
          baseTypeOid: 20,
          baseTypeName: 'bigint',
          notNull: true,
          default: null,
          checks: [],
        },
      ],
      enums: [],
      compositeTypes: [],
    } as unknown as CatalogSnapshot
    const result = renderGoQueryArtifacts(
      [
        analysis({
          columns: ['id', 'actor'],
          columnTypes: ['event_id', 'jsonb'],
          parameterTypes: ['event_id'],
          parameters: [parameter('id', 1)],
          notNull: [true, false],
          paramNotNull: [true],
          lineage,
        }),
      ],
      config,
      { EventPayload: eventPayload },
      catalog,
      'db',
    )

    expect(result.diagnostics).toEqual([])
    expect(result.types).toContain('const GetEventSQL =')
    expect(result.types).toContain('type GetEventParams struct {')
    expect(result.types).toContain('Id EventId `db:"id"`')
    expect(result.types).toContain('type GetEventRow struct {')
    expect(result.types).toMatch(/Actor\s+\*int64\s+`db:"actor"`/u)
  })

  it.each(['pointers', 'structs'] as const)(
    'reuses named JSON schemas through direct columns, row absence, casts, and choices: %s',
    (nulls) => {
      const config = parseConfigString(`
        schema: schema.sql
        types:
          jsonSchemas:
            Payload: {schema: {type: object, properties: {name: {type: string}}}}
        sql:
          codegen:
            go:
              nulls: ${nulls}
              mappings:
                column:
                  public.events.payload: {jsonSchema: Payload}
                  public.events.copy: {jsonSchema: Payload}
      `)
      const payload = column('payload', 'jsonb')
      const values: OutputValueLineage[] = [
        { name: 'payload', value: payload },
        {
          name: 'joined',
          value: { kind: 'row-absence', image: 'source', origin: payload, resolvedType: 'jsonb' },
        },
        {
          name: 'casted',
          value: {
            kind: 'transform',
            operation: { kind: 'cast', target: { schema: 'pg_catalog', name: 'json' } },
            inputs: [payload],
            resolvedType: 'json',
          },
        },
        {
          name: 'chosen',
          value: {
            kind: 'transform',
            operation: { kind: 'choice', form: 'coalesce' },
            inputs: [payload, column('copy', 'jsonb')],
            resolvedType: 'jsonb',
          },
        },
      ]
      const result = renderGoQueryArtifacts(
        [
          analysis({
            columns: values.map((value) => value.name),
            columnTypes: ['jsonb', 'jsonb', 'json', 'jsonb'],
            notNull: [false, false, true, false],
            lineage: values,
          }),
        ],
        config,
        { Payload: { type: 'object', properties: { name: { type: 'string' } } } },
        undefined,
        'events',
        createGoTypeContext('example.com/app/schema', config),
      )
      expect(result.diagnostics).toEqual([])
      expect(result.types).toContain('jsonschemas "example.com/app/jsonschemas"')
      expect(result.types).toMatch(/Casted\s+jsonschemas.Payload\s+`db:"casted"`/u)
      for (const name of ['Payload', 'Joined', 'Chosen']) {
        if (nulls === 'structs')
          expect(result.types).toMatch(
            new RegExp(`${name}\\s+pgsid\\.Null\\[jsonschemas\\.Payload\\]`),
          )
        else expect(result.types).toMatch(new RegExp(`${name}\\s+\\*jsonschemas\\.Payload`))
      }
      expect(result.types).not.toContain('json:"name')
    },
  )

  it.each(['pointers', 'structs'] as const)(
    'reuses nested object types through JSON extractions and choices: %s',
    (nulls) => {
      const schema: JsonSchemaDocument = {
        type: 'object',
        required: ['actor', 'members', 'lookup'],
        properties: {
          actor: {
            type: 'object',
            required: ['profile'],
            properties: { profile: { type: 'object', properties: { id: { type: 'integer' } } } },
          },
          members: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'integer' } } },
          },
          lookup: {
            type: 'object',
            additionalProperties: { type: 'object', properties: { id: { type: 'integer' } } },
          },
          node: { $ref: '#/$defs/Node' },
        },
        $defs: { Node: { type: 'object', properties: { next: { $ref: '#/$defs/Node' } } } },
      }
      const config = parseConfigString(`
      schema: schema.sql
      types:
        jsonSchemas:
          Payload: {schema: ${JSON.stringify(schema)}}
      sql:
        codegen:
          go:
            nulls: ${nulls}
            mappings:
              column:
                public.events.payload: {jsonSchema: Payload}
                public.events.copy: {jsonSchema: Payload}
    `)
      const access = (
        path: readonly (string | number)[],
        source = 'payload',
        result: 'json' | 'text' = 'json',
      ): OutputValueLineage['value'] => ({
        kind: 'transform',
        operation: { kind: 'json-access', path, result, syntax: 'operator' },
        inputs: [column(source, 'jsonb')],
        resolvedType: result === 'json' ? 'jsonb' : 'text',
      })
      const values: OutputValueLineage[] = [
        { name: 'actor', value: access(['actor']) },
        { name: 'profile', value: access(['actor', 'profile']) },
        { name: 'member', value: access(['members', 0]) },
        { name: 'lastMember', value: access(['members', -1]) },
        { name: 'members', value: access(['members']) },
        { name: 'lookup', value: access(['lookup']) },
        { name: 'lookupValue', value: access(['lookup', 'key']) },
        { name: 'node', value: access(['node']) },
        { name: 'nextNode', value: access(['node', 'next']) },
        { name: 'textActor', value: access(['actor'], 'payload', 'text') },
        {
          name: 'chosen',
          value: {
            kind: 'transform',
            operation: { kind: 'choice', form: 'coalesce' },
            inputs: [access(['actor']), access(['actor'], 'copy')],
            resolvedType: 'jsonb',
          },
        },
      ]
      const result = renderGoQueryArtifacts(
        [
          analysis({
            columns: values.map((value) => value.name),
            columnTypes: values.map((value) => value.value.resolvedType!),
            lineage: values,
          }),
        ],
        config,
        { Payload: schema },
        undefined,
        'events',
        createGoTypeContext('example.com/app/schema', config),
      )
      expect(result.diagnostics).toEqual([])
      for (const name of [
        'PayloadActor',
        'PayloadActorProfile',
        'PayloadMembersItem',
        'PayloadLookup',
        'PayloadLookupValue',
        'PayloadNode',
      ])
        expect(result.types).toContain(`jsonschemas.${name}`)
      expect(result.types).not.toContain('struct {\n\t\t')
      expect(result.types).toMatch(/TextActor\s+(?:\*string|pgsid.Null\[string\])/u)
      expect(result.types).toMatch(
        /Chosen\s+(?:\*jsonschemas.PayloadActor|pgsid.Null\[jsonschemas.PayloadActor\])/u,
      )
      expect(result.types).toContain('[]jsonschemas.PayloadMembersItem')
    },
  )

  it('rejects duplicate output fields after Go name conversion', () => {
    const config = parseConfigString('schema: migrations/*.sql\nsql:\n  codegen:\n    go: {}')
    const result = renderGoQueryArtifacts(
      [analysis({ columns: ['user_id', 'user-id'], columnTypes: ['int8', 'int8'] })],
      config,
      {},
      undefined,
      'db',
    )
    expect(result.types).toBeNull()
    expect(result.diagnostics[0]?.code).toBe('generated-name-collision')
  })
})
