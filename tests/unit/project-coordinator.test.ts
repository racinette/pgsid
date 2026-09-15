import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { createCodegenTargets } from '../../src/codegen/registry.js'
import { parseConfigString } from '../../src/config/loader.js'
import { ProjectBuildCoordinator } from '../../src/project-coordinator.js'
import {
  EMPTY_PROJECT_BUILD_STATE,
  reconcileProjectBuild,
  type ReconcileProjectBuildOptions,
} from '../../src/project-build.js'
import { buildNullabilityCatalog } from '../../src/query/catalog-adapter.js'
import type { QuerySourceInput } from '../../src/query-batch.js'

const source = (value: number): QuerySourceInput => ({
  path: 'query.sql',
  content: `-- name: Value :one\nSELECT ${value} AS value;`,
  routes: [
    {
      target: 'typescript',
      outputs: [{ kind: 'types', path: '/virtual/query.ts' }],
    },
  ],
})

describe('ProjectBuildCoordinator', () => {
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
        describe: async () => ({
          columns: ['value'],
          columnTypes: ['integer'],
          params: 0,
          parameterTypes: [],
        }),
      },
    }
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  it('commits state only after applying artifact events', async () => {
    let signalApply: (() => void) | undefined
    let releaseApply: (() => void) | undefined
    const applying = new Promise<void>((resolve) => {
      signalApply = resolve
    })
    const release = new Promise<void>((resolve) => {
      releaseApply = resolve
    })
    const coordinator = new ProjectBuildCoordinator({
      apply: async () => {
        signalApply!()
        await release
      },
    })

    const submitted = coordinator.submit({ sources: [source(1)], options })
    await applying
    expect(coordinator.state).toBe(EMPTY_PROJECT_BUILD_STATE)
    releaseApply!()
    const update = await submitted

    expect(coordinator.state).toBe(update.state)
    expect(Object.keys(coordinator.state.artifacts)).toEqual(['/virtual/query.ts'])
  })

  it('coalesces queued snapshots and converges with a one-shot build', async () => {
    let signalDescribe: (() => void) | undefined
    let releaseDescribe: (() => void) | undefined
    const describing = new Promise<void>((resolve) => {
      signalDescribe = resolve
    })
    const release = new Promise<void>((resolve) => {
      releaseDescribe = resolve
    })
    let blocked = true
    const delayedOptions: ReconcileProjectBuildOptions = {
      ...options,
      analysis: {
        ...options.analysis,
        describe: async (sql) => {
          if (blocked) {
            blocked = false
            signalDescribe!()
            await release
          }
          return options.analysis.describe(sql)
        },
      },
    }
    const applied: string[][] = []
    const coordinator = new ProjectBuildCoordinator({
      apply: async (events) => {
        applied.push(events.map((event) => event.kind))
      },
    })

    const first = coordinator.submit({ sources: [source(1)], options: delayedOptions })
    await describing
    const superseded = coordinator.submit({ sources: [source(2)], options })
    const final = coordinator.submit({ sources: [source(3)], options })
    releaseDescribe!()
    const [firstUpdate, supersededUpdate, finalUpdate] = await Promise.all([
      first,
      superseded,
      final,
    ])
    await coordinator.drain()
    const batch = await reconcileProjectBuild([source(3)], options)

    expect(firstUpdate).not.toBe(finalUpdate)
    expect(supersededUpdate).toBe(finalUpdate)
    expect(applied).toHaveLength(2)
    expect(coordinator.state.artifacts).toEqual(batch.state.artifacts)
    expect(coordinator.state.diagnostics).toEqual(batch.state.diagnostics)
  })

  it('keeps the prior state when artifact application fails', async () => {
    let fail = true
    const coordinator = new ProjectBuildCoordinator({
      apply: async () => {
        if (fail) {
          fail = false
          throw new Error('disk unavailable')
        }
      },
    })

    await expect(coordinator.submit({ sources: [source(1)], options })).rejects.toThrow(
      'disk unavailable',
    )
    expect(coordinator.state).toBe(EMPTY_PROJECT_BUILD_STATE)

    const recovered = await coordinator.submit({ sources: [source(1)], options })
    expect(coordinator.state).toBe(recovered.state)
  })
})
