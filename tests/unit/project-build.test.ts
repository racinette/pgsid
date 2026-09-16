import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { createCodegenTargets } from '../../src/codegen/registry.js'
import type { CodegenTarget } from '../../src/codegen/target.js'
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
              out:
                queries:
                  types: /generated
                  runtime: /app
    `)
    options = {
      targets: createCodegenTargets(config, {}, { baseDirectory: '/' }),
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
      routes: [options.targets[0]!.routeQuery('queries/events.sql')!],
    })
    const initial = await reconcileProjectBuild(
      [source('-- name: GetEvent :one\nSELECT id, note FROM events WHERE id = @id;')],
      options,
    )
    expect(initial.events.map((event) => event.kind)).toEqual([
      'artifact-added',
      'artifact-added',
      'artifact-added',
    ])
    expect(initial.state.artifacts['/generated/events/GetEvent.d.ts']?.content).toContain(
      '"id": string;',
    )
    expect(initial.state.artifacts['/generated/events/GetEvent.d.ts']?.content).toContain(
      '"note": string | null;',
    )
    expect(initial.state.artifacts['/app/events/GetEvent.ts']?.content).toContain(
      'from "../../generated/events/GetEvent.js"',
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
      'artifact-removed',
      'project-diagnostics-changed',
    ])

    const removed = await reconcileProjectBuild([], options, broken.state)
    expect(removed.events.map((event) => event.kind)).toEqual(['project-diagnostics-changed'])
    expect(removed.state.artifacts).toEqual({})
  })

  it('splits bundles for both targets and removes renamed queries without affecting another bundle', async () => {
    const config = parseConfigString(`
      schema: schema.sql
      sql:
        codegen:
          typescript:
            queries:
              out:
                queries: /typescript
          go:
            queries:
              out:
                queries: {outDir: /go, importPath: example.com/app/go}
    `)
    const targets = createCodegenTargets(config, {}, { baseDirectory: '/' })
    const input = (path: string, content: string) => ({
      path,
      content,
      routes: targets.map((target) => target.routeQuery(path)!),
    })
    const read = '-- name: GetEvent :one\nSELECT id FROM events;'
    const other = input('queries/admin/events.sql', read)
    const first = await reconcileProjectBuild(
      [
        input(
          'queries/events.sql',
          `${read}\n-- name: UpdateEvent :exec\nUPDATE events SET note = NULL;`,
        ),
        other,
      ],
      { ...options, targets },
    )
    expect(first.state.diagnostics).toEqual([])
    expect(Object.keys(first.state.artifacts).sort()).toEqual([
      '/go/admin/events/getevent.go',
      '/go/admin/events/queries.go',
      '/go/events/getevent.go',
      '/go/events/queries.go',
      '/go/events/updateevent.go',
      '/go/pgsid/pgx/db.go',
      '/typescript/admin/events/GetEvent.d.ts',
      '/typescript/events/GetEvent.d.ts',
      '/typescript/events/UpdateEvent.d.ts',
    ])
    const renamed = await reconcileProjectBuild(
      [
        input(
          'queries/events.sql',
          `${read}\n-- name: RenameEvent :exec\nUPDATE events SET note = NULL;`,
        ),
        other,
      ],
      { ...options, targets },
      first.state,
    )
    expect(
      renamed.events
        .filter((event) => event.kind === 'artifact-removed')
        .map((event) => event.artifact.path),
    ).toEqual(['/go/events/updateevent.go', '/typescript/events/UpdateEvent.d.ts'])
    expect(
      renamed.events
        .filter((event) => event.kind === 'artifact-added')
        .map((event) => event.artifact.path),
    ).toEqual(['/go/events/renameevent.go', '/typescript/events/RenameEvent.d.ts'])
    expect(renamed.state.artifacts['/go/admin/events/getevent.go']).toEqual(
      first.state.artifacts['/go/admin/events/getevent.go'],
    )
    const removed = await reconcileProjectBuild([other], { ...options, targets }, renamed.state)
    expect(Object.keys(removed.state.artifacts).sort()).toEqual([
      '/go/admin/events/getevent.go',
      '/go/admin/events/queries.go',
      '/go/pgsid/pgx/db.go',
      '/typescript/admin/events/GetEvent.d.ts',
    ])
  })

  it('caches default executor support and removes it when the Go target is removed', async () => {
    const targets = () =>
      createCodegenTargets(
        parseConfigString(`
      schema: schema.sql
      sql:
        codegen:
          go:
            queries:
              out:
                queries: {outDir: /go, importPath: example.com/app/go}
    `),
        {},
        { baseDirectory: '/' },
      )
    const enabled = targets()
    const sources = [
      {
        path: 'queries/events.sql',
        content: '-- name: GetEvent :one\nSELECT id FROM events;',
        routes: [enabled[0]!.routeQuery('queries/events.sql')!],
      },
    ]
    const first = await reconcileProjectBuild(sources, { ...options, targets: enabled })
    const second = await reconcileProjectBuild(
      sources,
      { ...options, targets: enabled },
      first.state,
    )
    expect(first.state.diagnostics).toEqual([])
    expect(second.events).toEqual([])
    expect(second.stats.renderCacheHits).toBe(2)
    expect(Object.keys(first.state.artifacts).sort()).toEqual([
      '/go/events/getevent.go',
      '/go/events/queries.go',
      '/go/pgsid/pgx/db.go',
    ])
    expect(first.state.artifacts['/go/events/getevent.go']?.content).toContain(
      'func (q *Queries) GetEvent',
    )
    const removed = await reconcileProjectBuild([], { ...options, targets: [] }, second.state)
    expect(removed.state.artifacts).toEqual({})
    expect(removed.events.filter((event) => event.kind === 'artifact-removed')).toHaveLength(3)
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

  it('renders multiple registered targets without language-specific build logic', async () => {
    const target: CodegenTarget = {
      id: 'go',
      key: 'go-1',
      outputRoots: ['/generated'],
      routeQuery: () => undefined,
      renderQueries: (analyses, route) => ({
        artifacts: [
          {
            ...route.outputs[0]!,
            content: `package queries\n// ${analyses[0]!.query.name}\n`,
          },
        ],
        diagnostics: [],
      }),
    }
    const route = {
      target: 'go',
      outputs: [{ kind: 'queries', path: '/generated/events.go' }],
    }
    const update = await reconcileProjectBuild(
      [
        {
          path: 'queries/events.sql',
          content: '-- name: GetEvent :one\nSELECT id FROM events;',
          routes: [options.targets[0]!.routeQuery('queries/events.sql')!, route],
        },
      ],
      { ...options, targets: [...options.targets, target] },
    )

    expect(update.state.artifacts['/generated/events/GetEvent.d.ts']).toMatchObject({
      target: 'typescript',
      kind: 'types',
    })
    expect(update.state.artifacts['/generated/events.go']).toMatchObject({
      target: 'go',
      kind: 'queries',
      content: 'package queries\n// GetEvent\n',
    })
    expect(update.stats.renderCacheMisses).toBe(2)
  })
})
