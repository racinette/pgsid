import { access, mkdtemp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { createCodegenTargets } from '../../src/codegen/registry.js'
import { parseConfigString } from '../../src/config/loader.js'
import { ProjectBuildWatcher } from '../../src/project-watcher.js'
import {
  reconcileProjectBuild,
  type ReconcileProjectBuildOptions,
} from '../../src/project-build.js'
import { buildNullabilityCatalog } from '../../src/query/catalog-adapter.js'
import { loadQuerySources } from '../../src/query-source-loader.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('ProjectBuildWatcher', () => {
  let pg: PGlite
  let options: ReconcileProjectBuildOptions

  beforeAll(async () => {
    pg = await PGlite.create()
    const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
    const config = parseConfigString(`
        schema: migrations/*.sql
        sql:
          codegen:
            typescript: {}
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
          const columnTypes = await Promise.all(
            described.resultFields.map(async (field) => {
              const result = await pg.query<{ name: string }>(
                'SELECT format_type($1::oid, NULL) AS name',
                [field.dataTypeID],
              )
              return result.rows[0]!.name
            }),
          )
          return {
            columns: described.resultFields.map((field) => field.name),
            columnTypes,
            params: described.queryParams.length,
            parameterTypes: [],
          }
        },
      },
    }
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  it('rebuilds real files to the same final state as a one-shot build', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-project-watch-'))
    roots.push(root)
    const sqlDirectory = join(root, 'sql')
    const queryPath = join(sqlDirectory, 'value.sql')
    const typesPath = join(root, 'generated/types/value/ReadValue.d.ts')
    const runtimePath = join(root, 'generated/runtime/value/ReadValue.ts')
    await mkdir(sqlDirectory, { recursive: true })
    await writeFile(queryPath, '-- name: ReadValue :one\nSELECT 1 AS value;')
    const config = parseConfigString(`
      schema: migrations/*.sql
      sql:
        paths: [sql/*.sql]
        codegen:
          typescript:
            queries:
              out:
                sql:
                  types: generated/types
                  runtime: generated/runtime
    `)
    const targets = createCodegenTargets(config, {}, { baseDirectory: root })
    const updates: string[][] = []
    const errors: unknown[] = []
    const watcher = await ProjectBuildWatcher.start({
      paths: sqlDirectory,
      debounceMs: 10,
      acquire: async () => ({
        sources: await loadQuerySources(config, { baseDirectory: root, targets }),
        options: { ...options, targets },
      }),
      onUpdate: (update) => updates.push(update.events.map((event) => event.kind)),
      onError: (error) => errors.push(error),
    })

    await expect(readFile(typesPath, 'utf8')).resolves.toContain('"value": number')
    await expect(readFile(runtimePath, 'utf8')).resolves.toContain('readValue')
    expect(updates).toHaveLength(1)

    await writeFile(queryPath, '-- name: ReadValue :one\nSELECT +;')
    await writeFile(queryPath, "-- name: ReadValue :one\nSELECT 'ready' AS value;")
    await vi.waitFor(
      async () => {
        await expect(readFile(typesPath, 'utf8')).resolves.toContain('"value": string')
      },
      { timeout: 5_000, interval: 20 },
    )

    await unlink(queryPath)
    await vi.waitFor(
      async () => {
        await expect(access(typesPath)).rejects.toMatchObject({ code: 'ENOENT' })
        await expect(access(runtimePath)).rejects.toMatchObject({ code: 'ENOENT' })
      },
      { timeout: 5_000, interval: 20 },
    )
    await watcher.drain()
    const batch = await reconcileProjectBuild([], { ...options, targets })

    expect(watcher.state.artifacts).toEqual(batch.state.artifacts)
    expect(watcher.state.diagnostics).toEqual(batch.state.diagnostics)
    expect(errors).toEqual([])
    await watcher.close()
  })

  it('buffers repeated invalidations into one acquisition', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-project-watch-'))
    roots.push(root)
    let acquisitions = 0
    const watcher = await ProjectBuildWatcher.start({
      paths: root,
      debounceMs: 50,
      coordinatorOptions: { apply: async () => {} },
      acquire: async () => {
        acquisitions++
        return { sources: [], options }
      },
    })

    watcher.invalidate()
    watcher.invalidate()
    watcher.invalidate()
    await watcher.drain()

    expect(acquisitions).toBe(2)
    await watcher.close()
  })

  it('does not finish draining while an update schedules another invalidation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-project-watch-'))
    roots.push(root)
    let acquisitions = 0
    let watcher: ProjectBuildWatcher
    watcher = await ProjectBuildWatcher.start({
      paths: root,
      debounceMs: 50,
      coordinatorOptions: { apply: async () => {} },
      acquire: async () => {
        acquisitions++
        return { sources: [], options }
      },
      onUpdate: () => {
        if (acquisitions === 2) queueMicrotask(() => watcher.invalidate())
      },
    })

    watcher.invalidate()
    await watcher.drain()

    expect(acquisitions).toBe(3)
    await watcher.close()
  })

  it('reports an acquisition failure and recovers on a later invalidation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-project-watch-'))
    roots.push(root)
    let fail = false
    const updates: unknown[] = []
    const errors: unknown[] = []
    const watcher = await ProjectBuildWatcher.start({
      paths: root,
      coordinatorOptions: { apply: async () => {} },
      acquire: async () => {
        if (fail) throw new Error('source unavailable')
        return { sources: [], options }
      },
      onUpdate: (update) => updates.push(update),
      onError: (error) => errors.push(error),
    })
    const initialState = watcher.state

    fail = true
    watcher.invalidate()
    await watcher.drain()
    expect(watcher.lastError).toMatchObject({ message: 'source unavailable' })
    expect(watcher.state).toBe(initialState)
    expect(errors).toHaveLength(1)

    fail = false
    watcher.invalidate()
    await watcher.drain()
    expect(watcher.lastError).toBeUndefined()
    expect(updates).toHaveLength(2)
    await watcher.close()
  })

  it('can remain active after its initial acquisition fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-project-watch-'))
    roots.push(root)
    let fail = true
    const updates: unknown[] = []
    const errors: unknown[] = []
    const watcher = await ProjectBuildWatcher.start({
      paths: root,
      allowInitialError: true,
      coordinatorOptions: { apply: async () => {} },
      acquire: async () => {
        if (fail) throw new Error('project is initially broken')
        return { sources: [], options }
      },
      onUpdate: (update) => updates.push(update),
      onError: (error) => errors.push(error),
    })

    expect(errors).toHaveLength(1)
    fail = false
    watcher.invalidate()
    await watcher.drain()
    expect(updates).toHaveLength(1)
    expect(watcher.lastError).toBeUndefined()
    await watcher.close()
  })
})
