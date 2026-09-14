import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { renderTypescriptQueryArtifacts } from '../../src/codegen/typescript-query.js'
import { parseConfigString } from '../../src/config/loader.js'
import type { JsonSchemaDocument } from '../../src/config/schema.js'
import type { QueryAnalysisItem } from '../../src/query-analysis.js'
import type { QueryCommand, QueryParameter } from '../../src/query-file.js'
import type { OutputValueLineage } from '../../src/query/value-lineage.js'

const parameter = (name: string, index: number): QueryParameter => ({
  name,
  index,
  occurrences: [],
})

const analysis = (options: {
  name?: string
  command?: QueryCommand
  sql?: string
  columns: string[]
  columnTypes: string[]
  parameterTypes?: string[]
  parameters?: QueryParameter[]
  notNull?: boolean[]
  paramNotNull?: boolean[]
  rejectionSets?: number[][]
  presenceGroups?: { columns: number[]; discriminants: number[] }[]
  lineage?: OutputValueLineage[]
}): QueryAnalysisItem => {
  const name = options.name ?? 'GetEvent'
  const parameters = options.parameters ?? []
  return {
    query: {
      id: `queries.sql#${name}`,
      path: 'queries.sql',
      name,
      output: { types: '/generated/queries.ts', wrappers: '/generated/wrappers.ts' },
      analysisHash: name,
      semanticHash: name,
      definition: {
        name,
        command: options.command ?? 'one',
        hash: name,
        sql: options.sql ?? 'SELECT 1',
        stmt: {} as never,
        parameters,
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
      paramRejectionSets: options.rejectionSets ?? [],
      outputPresenceGroups: options.presenceGroups ?? [],
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

const config = parseConfigString(`
  schema: migrations/*.sql
  types:
    jsonSchemas:
      EventPayload:
        schema:
          type: object
          required: [actor]
          properties:
            actor: { type: integer, minimum: 1 }
          additionalProperties: false
  sql:
    codegen:
      typescript:
        mappings:
          pgType:
            pg_catalog.int8: bigint
          column:
            public.events.id:
              type: EventId
              imports:
                - { from: ./ids.js, name: EventId }
            public.events.payload:
              jsonSchema: EventPayload
        jsonSchemas:
          runtimeValidation: true
`)

const eventPayloadSchema: JsonSchemaDocument = {
  type: 'object',
  required: ['actor'],
  properties: { actor: { type: 'integer', minimum: 1 } },
  additionalProperties: false,
}

const column = (name: string, type: string) => ({
  kind: 'column' as const,
  column: { schema: 'public', relation: 'events', column: name },
  resolvedType: type,
})

describe('renderTypescriptQueryArtifacts', () => {
  it('renders mappings, JSON Schema paths, validators, named parameters, and a one-row wrapper', () => {
    const payload = column('payload', 'jsonb')
    const lineage: OutputValueLineage[] = [
      { name: 'id', value: column('id', 'bigint') },
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
    const rendered = renderTypescriptQueryArtifacts(
      [
        analysis({
          sql: "SELECT id, payload->'actor' AS actor FROM events WHERE id = $1",
          columns: ['id', 'actor'],
          columnTypes: ['bigint', 'jsonb'],
          parameterTypes: ['bigint'],
          parameters: [parameter('id', 1)],
          notNull: [true, false],
          paramNotNull: [true],
          lineage,
        }),
      ],
      config,
      { EventPayload: eventPayloadSchema },
      { typesModuleSpecifier: './queries.js' },
    )

    expect(rendered.diagnostics).toEqual([])
    expect(rendered.types).toContain('import { EventId } from "./ids.js"')
    expect(rendered.types).toContain('export type GetEventParams = { "id": bigint }')
    expect(rendered.types).toContain(
      'export type GetEventRow = { "id": EventId; "actor": number | null }',
    )
    expect(rendered.types).toContain('export function isGetEventActor2')
    expect(rendered.wrappers).toContain(
      'export async function getEvent(db: Queryable, params: GetEventParams)',
    )
    expect(rendered.wrappers).toContain('db.query(getEventSql, [params["id"]])')
    expect(rendered.wrappers).toContain('if (!isGetEventActor2(row["actor"]))')

    for (const source of [rendered.types!, rendered.wrappers!]) {
      expect(
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
          reportDiagnostics: true,
        }).diagnostics,
      ).toEqual([])
    }
  })

  it('factors parameter rejection sets and optional output groups', () => {
    const rendered = renderTypescriptQueryArtifacts(
      [
        analysis({
          name: 'Grouped',
          command: 'many',
          columns: ['root', 'child_id', 'child_note'],
          columnTypes: ['int4', 'int4', 'text'],
          parameterTypes: ['text', 'text'],
          parameters: [parameter('left', 1), parameter('right', 2)],
          notNull: [true, false, false],
          rejectionSets: [[1, 2]],
          presenceGroups: [{ columns: [1, 2], discriminants: [1] }],
        }),
      ],
      config,
      { EventPayload: eventPayloadSchema },
    )

    expect(rendered.types).toContain(
      '({ "left": string | null; "right": string | null }) & (({ "left": string; "right": string | null }) | ({ "left": string | null; "right": string }))',
    )
    expect(rendered.types).toContain(
      '({ "child_id": number; "child_note": string | null }) | ({ "child_id": null; "child_note": null })',
    )
    expect(rendered.wrappers).toContain('Promise<GroupedRow[]>')
  })

  it('refuses duplicate result names and generated identifier collisions', () => {
    const duplicate = renderTypescriptQueryArtifacts(
      [analysis({ columns: ['id', 'id'], columnTypes: ['int4', 'int4'] })],
      config,
      {},
    )
    expect(duplicate.types).toBeNull()
    expect(duplicate.diagnostics[0]?.code).toBe('duplicate-output-name')

    const collision = renderTypescriptQueryArtifacts(
      [
        analysis({ name: 'Get_Event', columns: ['id'], columnTypes: ['int4'] }),
        analysis({ name: 'GetEvent', columns: ['id'], columnTypes: ['int4'] }),
      ],
      config,
      {},
    )
    expect(collision.wrappers).toBeNull()
    expect(collision.diagnostics[0]?.code).toBe('generated-name-collision')
  })

  it('renders positional parameters and execution result commands', () => {
    const rendered = renderTypescriptQueryArtifacts(
      [
        analysis({
          name: 'DeleteOld',
          command: 'execrows',
          columns: [],
          columnTypes: [],
          parameterTypes: ['timestamp', 'text'],
          paramNotNull: [false, false],
          rejectionSets: [[1, 2]],
        }),
      ],
      config,
      {},
    )

    expect(rendered.types).toContain(
      '(readonly [Date, string | null]) | (readonly [Date | null, string])',
    )
    expect(rendered.wrappers).toContain('db: Queryable, ...params: DeleteOldParams')
    expect(rendered.wrappers).toContain('return result.rowCount ?? 0')
  })
})
