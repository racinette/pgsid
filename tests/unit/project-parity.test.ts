import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { createCodegenTargets } from '../../src/codegen/registry.js'
import { parseConfigString } from '../../src/config/loader.js'
import type { JsonSchemaDocument } from '../../src/config/schema.js'
import {
  reconcileProjectBuild,
  type ProjectBuildState,
  type ReconcileProjectBuildOptions,
} from '../../src/project-build.js'
import { buildNullabilityCatalog } from '../../src/query/catalog-adapter.js'
import type { QuerySourceInput } from '../../src/query-batch.js'

interface BuildInput {
  sources: readonly QuerySourceInput[]
  options: ReconcileProjectBuildOptions
}

const generated = (
  path: string,
  content: string,
  directory = '/generated/v1',
): QuerySourceInput => ({
  path,
  content,
  routes: [
    {
      target: 'typescript',
      outputs: [
        { kind: 'types', path: `${directory}/${path.replace(/\.sql$/u, '')}` },
        {
          kind: 'runtime',
          path: `${directory}/runtime/${path.replace(/\.sql$/u, '')}`,
        },
      ],
    },
  ],
})

const observed = (state: ProjectBuildState) => ({
  artifacts: Object.fromEntries(
    Object.entries(state.artifacts).map(([path, artifact]) => [
      path,
      {
        sourcePath: artifact.sourcePath,
        target: artifact.target,
        kind: artifact.kind,
        content: artifact.content,
        hash: artifact.hash,
      },
    ]),
  ),
  diagnostics: state.diagnostics,
})

describe('project build parity', () => {
  let pg: PGlite
  let analysis: ReconcileProjectBuildOptions['analysis']

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(`
      CREATE TABLE events (
        id bigint PRIMARY KEY,
        payload jsonb NOT NULL,
        note text
      )
    `)
    const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
    const typeName = async (oid: number): Promise<string> => {
      const result = await pg.query<{ name: string }>('SELECT format_type($1::oid, NULL) AS name', [
        oid,
      ])
      return result.rows[0]!.name
    }
    analysis = {
      schemaKey: 'schema-1',
      analysisKey: 'analysis-1',
      catalog,
      searchPath: ['public'],
      describe: async (sql) => {
        const described = await pg.describeQuery(sql)
        return {
          columns: described.resultFields.map((field) => field.name),
          columnTypes: await Promise.all(
            described.resultFields.map((field) => typeName(field.dataTypeID)),
          ),
          params: described.queryParams.length,
          parameterTypes: await Promise.all(
            described.queryParams.map((parameter) => typeName(parameter.dataTypeID)),
          ),
        }
      },
    }
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  const options = (payload: JsonSchemaDocument): ReconcileProjectBuildOptions => {
    const config = parseConfigString(`
      schema: migrations/*.sql
      types:
        jsonSchemas:
          Payload:
            schema: true
      sql:
        codegen:
          typescript:
            mappings:
              pgType:
                pg_catalog.int8: bigint
              column:
                public.events.payload:
                  jsonSchema: Payload
            jsonSchemas:
              types: /generated/shared/jsonschemas
              runtime: {outDir: generated/validation, validate: true}
    `)
    return {
      analysis,
      targets: createCodegenTargets(config, { Payload: payload }, { baseDirectory: '/' }),
    }
  }

  const replay = async (steps: readonly BuildInput[]): Promise<ProjectBuildState> => {
    let state: ProjectBuildState | undefined
    for (const step of steps) {
      state = (await reconcileProjectBuild(step.sources, step.options, state)).state
    }
    return state!
  }

  it('converges after edits, failures, removals, rerouting, and schema rotation', async () => {
    const integerPayload = { type: 'object', properties: { actor: { type: 'integer' } } }
    const stringPayload = { type: 'object', properties: { actor: { type: 'string' } } }
    const firstOptions = options(integerPayload)
    const finalOptions = options(stringPayload)
    const initialSources = [
      generated(
        'events.sql',
        '-- name: GetEvent :one\nSELECT id, payload FROM events WHERE id = @id;',
      ),
      generated('legacy.sql', '-- name: Legacy :many\nSELECT note FROM events;'),
    ]
    const brokenSources = [
      generated('events.sql', '-- name: GetEvent :one\nSELECT +;'),
      ...initialSources.slice(1),
    ]
    const finalSources = [
      generated(
        'events.sql',
        `-- name: GetEvent :one
         WITH selected AS (
           SELECT id, payload FROM events WHERE id = @id
         )
         SELECT id, payload FROM selected;`,
        '/generated/v2',
      ),
      {
        path: 'health.sql',
        content: '-- name: ShowPath :many\nSHOW search_path;',
      },
    ]
    const incremental = await replay([
      { sources: initialSources, options: firstOptions },
      { sources: brokenSources, options: firstOptions },
      { sources: finalSources, options: firstOptions },
      { sources: finalSources, options: finalOptions },
    ])
    const batch = (await reconcileProjectBuild(finalSources, finalOptions)).state

    expect(observed(incremental)).toEqual(observed(batch))
    expect(batch.artifacts['/generated/shared/jsonschemas/Payload.d.ts']?.content).toContain(
      '"actor"?: string;',
    )
    expect(batch.diagnostics.map((diagnostic) => diagnostic.source)).toEqual([
      'analysis',
      'analysis',
    ])
  })

  it('converges when the final edit is invalid', async () => {
    const buildOptions = options(true)
    const valid = [generated('events.sql', '-- name: GetEvent :one\nSELECT id FROM events;')]
    const invalid = [generated('events.sql', '-- name: GetEvent :one\nSELECT +;')]
    const incremental = await replay([
      { sources: valid, options: buildOptions },
      { sources: invalid, options: buildOptions },
    ])
    const batch = (await reconcileProjectBuild(invalid, buildOptions)).state

    expect(observed(incremental)).toEqual(observed(batch))
  })

  it('is deterministic for repeated one-shot builds', async () => {
    const buildOptions = options(true)
    const sources = [generated('events.sql', '-- name: GetEvent :one\nSELECT id FROM events;')]
    const first = await reconcileProjectBuild(sources, buildOptions)
    const second = await reconcileProjectBuild([...sources].reverse(), buildOptions)

    expect(observed(second.state)).toEqual(observed(first.state))
    expect(second.events).toEqual(first.events)
  })
})
