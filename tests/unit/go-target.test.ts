import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCodegenTargets } from '../../src/codegen/registry.js'
import { parseConfigString } from '../../src/config/loader.js'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('Go codegen target', () => {
  it('routes SQL files to package directories while preserving nested paths', () => {
    const config = parseConfigString(`
      schema: migrations/*.sql
      sql:
        codegen:
          go:
            queries:
              exclude: ["**/ignored.sql"]
              out:
                sql/queries: {outDir: internal/database, importPath: example.com/app/internal/database}
    `)
    const target = createCodegenTargets(config, {}, { baseDirectory: '/workspace' })[0]!
    expect(target.id).toBe('go')
    expect(target.outputRoots).toEqual(['/workspace/internal/database'])
    expect(target.routeQuery('sql/queries/ignored.sql')).toBeUndefined()
    expect(target.routeQuery('sql/queries/events.sql')).toEqual({
      target: 'go',
      outputs: [{ kind: 'types', path: '/workspace/internal/database/events' }],
    })
    expect(target.routeQuery('sql/queries/admin/events.sql')).toEqual({
      target: 'go',
      outputs: [{ kind: 'types', path: '/workspace/internal/database/admin/events' }],
    })
    expect(
      target.renderQueries([], target.routeQuery('sql/queries/events.sql')!).artifacts,
    ).toEqual([])
  })

  it('allows separate schema and query roots with an explicit schema import path', () => {
    const config = parseConfigString(`
      schema: migrations/*.sql
      sql:
        codegen:
          go:
            schema:
              outDir: internal/db
              importPath: example.com/app/internal/db
            queries:
              out:
                sql/queries: {outDir: internal/queries, importPath: example.com/app/internal/queries}
    `)
    const target = createCodegenTargets(config, {}, { baseDirectory: '/workspace' })[0]!
    expect(target.outputRoots).toEqual(['/workspace/internal/db', '/workspace/internal/queries'])
  })

  it('routes executable queries and emits shared helpers with explicit query import paths', () => {
    const config = parseConfigString(`
      schema: schema.sql
      sql:
        codegen:
          go:
            queries:
              out:
                queries:
                  outDir: internal/queries
                  importPath: example.com/app/internal/queries
    `)
    const target = createCodegenTargets(config, {}, { baseDirectory: '/workspace' })[0]!
    expect(target.routeQuery('queries/admin/events.sql')?.outputs).toEqual([
      { kind: 'types', path: '/workspace/internal/queries/admin/events' },
    ])
    const support = target.renderSupport!()
    expect(support.diagnostics).toEqual([])
    expect(support.artifacts[0]?.path).toBe('/workspace/internal/queries/pgsid/pgx/db.go')
    expect(support.artifacts[0]?.content).toContain(
      'QueryRow(ctx context.Context, sql string, args ...any) pgx.Row',
    )
    expect(target.renderSchema).toBeUndefined()
  })

  it.each(['pgsid.sql', 'pgsid/pgx.sql', 'pgsid/pgx/nested.sql'])(
    'reports SQL path %s occupying the helper namespace',
    (path) => {
      const config = parseConfigString(`
        schema: schema.sql
        sql:
          codegen:
            go:
              queries:
                out:
                  queries: {outDir: internal/queries, importPath: example.com/app/internal/queries}
      `)
      const target = createCodegenTargets(config, {}, { baseDirectory: '/workspace' })[0]!
      const result = target.renderQueries([], target.routeQuery(`queries/${path}`)!)
      expect(result.artifacts).toEqual([])
      expect(result.diagnostics).toMatchObject([
        { code: 'reserved-output-path', severity: 'error' },
      ])
    },
  )

  it('owns the sibling JSON Schema package and rejects SQL output in that directory', () => {
    const config = parseConfigString(`
      schema: schema.sql
      types:
        jsonSchemas:
          Payload: {schema: {type: object}}
      sql:
        codegen:
          go:
            schema: {outDir: internal/schema, importPath: example.com/app/internal/schema}
            mappings:
              column:
                public.events.payload: {jsonSchema: Payload}
            queries:
              out:
                queries: {outDir: internal, importPath: example.com/app/internal}
    `)
    const target = createCodegenTargets(config, {}, { baseDirectory: '/workspace' })[0]!
    expect(target.outputRoots).toContain('/workspace/internal/jsonschemas')
    expect(
      target.renderQueries([], target.routeQuery('queries/jsonschemas.sql')!).diagnostics,
    ).toMatchObject([{ code: 'reserved-output-path', severity: 'error' }])
  })

  it('emits null and JSON helpers without schema output and reserves their namespaces', () => {
    const config = parseConfigString(`
      schema: schema.sql
      types:
        jsonSchemas:
          Payload: {schema: {type: object, properties: {name: {type: string}}}}
      sql:
        codegen:
          go:
            nulls: structs
            mappings:
              column:
                public.events.payload: {jsonSchema: Payload}
            queries:
              out:
                queries: {outDir: internal/queries, importPath: example.com/app/internal/queries}
    `)
    const target = createCodegenTargets(
      config,
      {
        Payload: { type: 'object', properties: { name: { type: 'string' } } },
      },
      { baseDirectory: '/workspace' },
    )[0]!
    const support = target.renderSupport!()
    expect(support.diagnostics).toEqual([])
    expect(support.artifacts.map((item) => item.path)).toEqual([
      '/workspace/internal/queries/pgsid/pgx/db.go',
      '/workspace/internal/queries/pgsid/null.go',
      '/workspace/internal/queries/jsonschemas/payload.go',
    ])
    expect(support.artifacts[2]!.content).toContain(
      'pgsid "example.com/app/internal/queries/pgsid"',
    )
    for (const path of ['pgsid.sql', 'jsonschemas.sql', 'jsonschemas/nested.sql'])
      expect(
        target.renderQueries([], target.routeQuery(`queries/${path}`)!).diagnostics,
      ).toMatchObject([{ code: 'reserved-output-path', severity: 'error' }])
  })

  it('emits named JSON schemas for query-only output with the default pointer policy', () => {
    const config = parseConfigString(`
      schema: schema.sql
      types:
        jsonSchemas:
          Payload: {schema: {type: object, properties: {name: {type: string}}}}
      sql:
        codegen:
          go:
            mappings:
              column:
                public.events.payload: {jsonSchema: Payload}
            queries:
              out:
                queries: {outDir: internal/queries, importPath: example.com/app/internal/queries}
    `)
    const target = createCodegenTargets(
      config,
      {
        Payload: { type: 'object', properties: { name: { type: 'string' } } },
      },
      { baseDirectory: '/workspace' },
    )[0]!
    const support = target.renderSupport!()
    expect(support.diagnostics).toEqual([])
    expect(support.artifacts.map((item) => item.path)).toEqual([
      '/workspace/internal/queries/pgsid/pgx/db.go',
      '/workspace/internal/queries/jsonschemas/payload.go',
    ])
    expect(
      target.renderQueries([], target.routeQuery('queries/jsonschemas.sql')!).diagnostics,
    ).toMatchObject([{ code: 'reserved-output-path', severity: 'error' }])
  })

  it('reports colliding JSON names in query-only support without partial artifacts', () => {
    const config = parseConfigString(`
      schema: schema.sql
      types:
        jsonSchemas:
          PayloadA: {schema: {type: object}}
          payload_a: {schema: {type: object}}
      sql:
        codegen:
          go:
            nulls: structs
            mappings:
              column:
                public.events.a: {jsonSchema: PayloadA}
                public.events.b: {jsonSchema: payload_a}
            queries:
              out:
                queries: {outDir: internal/queries, importPath: example.com/app/internal/queries}
    `)
    const target = createCodegenTargets(
      config,
      {
        PayloadA: { type: 'object' },
        payload_a: { type: 'object' },
      },
      { baseDirectory: '/workspace' },
    )[0]!
    const result = target.renderSupport!()
    expect(result.artifacts).toEqual([])
    expect(result.diagnostics).toMatchObject([
      { code: 'generated-name-collision', severity: 'error' },
    ])
  })

  it('discovers schema import paths from an enclosing Go module and includes them in the cache key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-go-module-'))
    roots.push(root)
    await mkdir(join(root, 'internal'), { recursive: true })
    const config = parseConfigString(`
      schema: schema.sql
      sql:
        codegen:
          go:
            schema: {outDir: internal/db}
    `)
    await writeFile(join(root, 'go.mod'), 'module "example.com/first"\n\ngo 1.25\n')
    const first = createCodegenTargets(config, {}, { baseDirectory: root })[0]!
    expect(first.key).toContain('example.com/first/internal/db')
    await writeFile(join(root, 'go.mod'), 'module example.com/second\n\ngo 1.25\n')
    const second = createCodegenTargets(config, {}, { baseDirectory: root })[0]!
    expect(second.key).not.toBe(first.key)
    expect(second.key).toContain('example.com/second/internal/db')
  })

  it('reports missing Go module information for schema imports', () => {
    const config = parseConfigString(`
      schema: schema.sql
      sql:
        codegen:
          go:
            schema: {outDir: internal/db}
    `)
    expect(() => createCodegenTargets(config, {}, { baseDirectory: '/workspace' })).toThrow(
      'Go output needs an enclosing go.mod or an explicit importPath in its schema or query output configuration',
    )
  })
})
