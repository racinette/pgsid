import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { parseConfigString } from '../../src/config/loader.js'
import {
  reconcileProjectBuild,
  type ReconcileProjectBuildOptions,
} from '../../src/project-build.js'
import { buildNullabilityCatalog } from '../../src/query/catalog-adapter.js'

describe('reconcileProjectBuild', () => {
  let pg: PGlite
  let options: ReconcileProjectBuildOptions

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec('CREATE TABLE events (id bigint PRIMARY KEY, note text)')
    const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
    const config = parseConfigString(`
      schema: migrations/*.sql
      sql:
        codegen:
          typescript:
            queries:
              out: {}
    `)
    options = {
      config,
      schemas: {},
      codegenKey: 'codegen-1',
      analysis: {
        schemaKey: 'schema-1',
        analysisKey: 'analysis-1',
        catalog,
        searchPath: ['public'],
        describe: async (sql) => {
          const described = await pg.describeQuery(sql)
          const typeName = async (oid: number): Promise<string> => {
            const result = await pg.query<{ name: string }>(
              'SELECT format_type($1::oid, NULL) AS name',
              [oid],
            )
            return result.rows[0]!.name
          }
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
      },
    }
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  it('caches artifacts and removes them through errors or source removal', async () => {
    const source = (content: string) => ({
      path: 'queries/events.sql',
      content,
      output: {
        types: '/generated/events.ts',
        wrappers: '/app/events.ts',
      },
    })
    const initial = await reconcileProjectBuild(
      [source('-- name: GetEvent :one\nSELECT id, note FROM events WHERE id = @id;')],
      options,
    )
    expect(initial.events.map((event) => event.kind)).toEqual(['artifact-added', 'artifact-added'])
    expect(initial.state.artifacts['/generated/events.ts']?.content).toContain('"id": string;')
    expect(initial.state.artifacts['/generated/events.ts']?.content).toContain(
      '"note": string | null;',
    )
    expect(initial.state.artifacts['/app/events.ts']?.content).toContain(
      'from "../generated/events.js"',
    )

    const unchanged = await reconcileProjectBuild(
      [source('-- name: GetEvent :one\nSELECT id, note FROM events WHERE id = @id;')],
      options,
      initial.state,
    )
    expect(unchanged.events).toEqual([])
    expect(unchanged.stats).toMatchObject({
      parseCacheHits: 1,
      analysisCacheHits: 1,
      renderCacheHits: 1,
    })

    const broken = await reconcileProjectBuild(
      [source('-- name: GetEvent :one\nSELECT +;')],
      options,
      unchanged.state,
    )
    expect(broken.state.artifacts).toEqual({})
    expect(broken.events.map((event) => event.kind)).toEqual([
      'artifact-removed',
      'artifact-removed',
      'project-diagnostics-changed',
    ])

    const removed = await reconcileProjectBuild([], options, broken.state)
    expect(removed.events.map((event) => event.kind)).toEqual(['project-diagnostics-changed'])
    expect(removed.state.artifacts).toEqual({})
  })

  it('analyzes check-only files without rendering artifacts', async () => {
    const update = await reconcileProjectBuild(
      [
        {
          path: 'queries/check.sql',
          content: '-- name: CheckEvent :one\nSELECT id FROM events WHERE id = @id;',
        },
      ],
      options,
    )

    expect(Object.keys(update.state.queryAnalysis.analyses)).toEqual([
      'queries/check.sql#CheckEvent',
    ])
    expect(update.state.artifacts).toEqual({})
    expect(update.stats).toMatchObject({ analysisCacheMisses: 1, renderCacheMisses: 0 })
  })
})
