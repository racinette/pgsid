import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../src/query/catalog-adapter.js'
import {
  EMPTY_QUERY_ANALYSIS_STATE,
  reconcileQueryAnalysis,
  type ReconcileQueryAnalysisOptions,
} from '../../src/query-analysis.js'
import { reconcileQueryBatch, type QuerySourceInput } from '../../src/query-batch.js'

const source = (content: string, path = 'queries.sql'): QuerySourceInput => ({
  path,
  content,
  output: { types: '/generated/queries.ts' },
})

describe('reconcileQueryAnalysis', () => {
  let pg: PGlite
  let options: ReconcileQueryAnalysisOptions
  let describeCalls: number

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(`
      CREATE TABLE events (
        id bigint PRIMARY KEY,
        payload jsonb NOT NULL,
        note text
      )
    `)
    const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), {
      searchPath: ['public'],
    })
    describeCalls = 0
    options = {
      schemaKey: 'schema-1',
      analysisKey: 'analysis-1',
      catalog,
      searchPath: ['public'],
      describe: async (sql) => {
        describeCalls++
        const described = await pg.describeQuery(sql)
        const parameterTypes = await Promise.all(
          described.queryParams.map(async ({ dataTypeID }) => {
            const result = await pg.query<{ name: string }>(
              'SELECT format_type($1::oid, NULL) AS name',
              [dataTypeID],
            )
            return result.rows[0]!.name
          }),
        )
        return {
          columns: described.resultFields.map((field) => field.name),
          params: described.queryParams.length,
          parameterTypes,
        }
      },
    }
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  it('combines gated nullability, dependencies, and raw lineage for nested queries and DML', async () => {
    const batch = await reconcileQueryBatch([
      source(`
        -- name: ReadPayload :many
        WITH chosen AS (
          SELECT e.payload
          FROM events AS e
          WHERE e.id = @id
        ), nested AS (
          SELECT chosen.payload FROM chosen
        )
        SELECT nested.payload->'actor' AS actor FROM nested;

        -- name: UpdatePayload :one
        UPDATE events
        SET payload = @payload
        WHERE id = @id
        RETURNING payload->>'actor' AS actor;
      `),
    ])
    const update = await reconcileQueryAnalysis(batch.state, options)

    expect(update.stats).toEqual({ cacheHits: 0, cacheMisses: 2 })
    expect(update.events.map((event) => event.kind)).toEqual(['analysis-added', 'analysis-added'])

    const read = update.state.analyses['queries.sql#ReadPayload']!
    expect(read.contractGate).toEqual({ kind: 'agreed' })
    expect(read.lineageGate).toEqual({ kind: 'agreed' })
    expect(read.diagnostics).toEqual([])
    expect(read.dependencies).toEqual(
      expect.arrayContaining(['public.events.id', 'public.events.payload']),
    )
    expect(read.rawLineage?.[0]).toMatchObject({
      name: 'actor',
      value: {
        kind: 'transform',
        operation: { kind: 'operator', operator: { name: '->' } },
      },
    })

    const mutation = update.state.analyses['queries.sql#UpdatePayload']!
    expect(mutation.contractGate).toEqual({ kind: 'agreed' })
    expect(mutation.lineageGate).toEqual({ kind: 'agreed' })
    expect(mutation.rawLineage?.[0]).toMatchObject({
      value: {
        kind: 'transform',
        operation: { kind: 'operator', operator: { name: '->>' } },
      },
    })
  })

  it('reuses an analysis until a cache identity changes', async () => {
    const batch = await reconcileQueryBatch([
      source('-- name: Read :one\nSELECT payload FROM events WHERE id = @id;'),
    ])
    describeCalls = 0
    const first = await reconcileQueryAnalysis(batch.state, options)
    const second = await reconcileQueryAnalysis(batch.state, options, first.state)
    const nextSchema = await reconcileQueryAnalysis(
      batch.state,
      { ...options, schemaKey: 'schema-2' },
      second.state,
    )
    const nextPolicy = await reconcileQueryAnalysis(
      batch.state,
      { ...options, schemaKey: 'schema-2', analysisKey: 'analysis-2' },
      nextSchema.state,
    )

    expect(first.stats).toEqual({ cacheHits: 0, cacheMisses: 1 })
    expect(second.stats).toEqual({ cacheHits: 1, cacheMisses: 0 })
    expect(nextSchema.stats).toEqual({ cacheHits: 0, cacheMisses: 1 })
    expect(nextPolicy.stats).toEqual({ cacheHits: 0, cacheMisses: 1 })
    expect(describeCalls).toBe(3)
    expect(second.events).toEqual([])
    expect(nextSchema.events).toEqual([])
    expect(nextPolicy.events).toEqual([])
  })

  it('reuses semantic analysis across cosmetic SQL edits', async () => {
    const firstBatch = await reconcileQueryBatch([
      source('-- name: Read :one\nSELECT payload FROM events WHERE id = @id;'),
    ])
    const first = await reconcileQueryAnalysis(firstBatch.state, options)
    const secondBatch = await reconcileQueryBatch(
      [source('-- name: Read :one\n\n SELECT payload\nFROM events WHERE id  =  @id;')],
      firstBatch.state,
    )
    describeCalls = 0
    const second = await reconcileQueryAnalysis(secondBatch.state, options, first.state)

    expect(second.stats).toEqual({ cacheHits: 1, cacheMisses: 0 })
    expect(second.events).toEqual([])
    expect(describeCalls).toBe(0)
  })

  it('reuses semantic analysis when only the output route changes', async () => {
    const content = '-- name: Read :one\nSELECT payload FROM events WHERE id = @id;'
    const firstBatch = await reconcileQueryBatch([source(content)])
    const first = await reconcileQueryAnalysis(firstBatch.state, options)
    const reroutedBatch = await reconcileQueryBatch(
      [{ ...source(content), output: { types: '/generated/elsewhere.ts' } }],
      firstBatch.state,
    )
    describeCalls = 0
    const rerouted = await reconcileQueryAnalysis(reroutedBatch.state, options, first.state)

    expect(reroutedBatch.events.map((event) => event.kind)).toEqual(['query-changed'])
    expect(rerouted.stats).toEqual({ cacheHits: 1, cacheMisses: 0 })
    expect(describeCalls).toBe(0)
  })

  it('shares one cache entry between equivalent queries', async () => {
    const batch = await reconcileQueryBatch([
      source(`
        -- name: First :one
        SELECT payload FROM events WHERE id = @id;

        -- name: Second :one
        SELECT payload FROM events WHERE id = @id;
      `),
    ])
    describeCalls = 0
    const update = await reconcileQueryAnalysis(batch.state, options)

    expect(update.stats).toEqual({ cacheHits: 1, cacheMisses: 1 })
    expect(describeCalls).toBe(1)
    expect(Object.keys(update.state.cache)).toHaveLength(1)
    expect(Object.keys(update.state.analyses)).toEqual(['queries.sql#First', 'queries.sql#Second'])
  })

  it('emits result changes and removals against previous state', async () => {
    const firstBatch = await reconcileQueryBatch([
      source('-- name: Read :one\nSELECT note FROM events WHERE id = @id;'),
    ])
    const first = await reconcileQueryAnalysis(firstBatch.state, options)
    const changedBatch = await reconcileQueryBatch([
      source("-- name: Read :one\nSELECT coalesce(note, '') AS note FROM events WHERE id = @id;"),
    ])
    const changed = await reconcileQueryAnalysis(changedBatch.state, options, first.state)
    const emptyBatch = await reconcileQueryBatch([])
    const removed = await reconcileQueryAnalysis(emptyBatch.state, options, changed.state)

    expect(changed.events.map((event) => event.kind)).toEqual(['analysis-changed'])
    expect(changed.state.analyses['queries.sql#Read']!.contract.outputs[0]!.notNull).toBe(true)
    expect(removed.events.map((event) => event.kind)).toEqual(['analysis-removed'])
    expect(removed.state).toEqual(EMPTY_QUERY_ANALYSIS_STATE)
  })

  it('degrades refused analyses to the database shape without losing diagnostics', async () => {
    const batch = await reconcileQueryBatch([source('-- name: ShowPath :many\nSHOW search_path;')])
    const update = await reconcileQueryAnalysis(batch.state, options)
    const analysis = update.state.analyses['queries.sql#ShowPath']!

    expect(analysis.contract).toEqual({
      outputs: [{ name: 'search_path', notNull: false }],
      params: [],
      paramRejectionSets: [],
      outputPresenceGroups: [],
      alwaysRaises: false,
    })
    expect(analysis.contractGate).toBeNull()
    expect(analysis.rawLineage).toBeNull()
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'nullability-unsupported',
      'lineage-unsupported',
    ])
    expect(update.events.map((event) => event.kind)).toEqual([
      'analysis-added',
      'analysis-diagnostics-changed',
    ])
  })

  it("refuses positional lineage when its output order is not PostgreSQL's", async () => {
    const batch = await reconcileQueryBatch([
      source('-- name: Read :one\nSELECT id, payload FROM events;'),
    ])
    const update = await reconcileQueryAnalysis(batch.state, {
      ...options,
      analysisKey: 'bad-description',
      describe: async () => ({ columns: ['payload', 'id'], params: 0 }),
    })
    const analysis = update.state.analyses['queries.sql#Read']!

    expect(analysis.contract.outputs).toEqual([
      { name: 'payload', notNull: false },
      { name: 'id', notNull: false },
    ])
    expect(analysis.rawLineage).toBeNull()
    expect(analysis.contractGate?.kind).toBe('column-order')
    expect(analysis.lineageGate?.kind).toBe('column-order')
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'contract-shape',
      'lineage-shape',
    ])
  })

  it('emits contract and diagnostic recovery after a failed gate is invalidated', async () => {
    const batch = await reconcileQueryBatch([
      source('-- name: Read :one\nSELECT id, payload FROM events;'),
    ])
    const failed = await reconcileQueryAnalysis(batch.state, {
      ...options,
      analysisKey: 'bad-description',
      describe: async () => ({ columns: ['payload', 'id'], params: 0 }),
    })
    const recovered = await reconcileQueryAnalysis(
      batch.state,
      { ...options, analysisKey: 'recovered-description' },
      failed.state,
    )

    expect(recovered.events.map((event) => event.kind)).toEqual([
      'analysis-changed',
      'analysis-diagnostics-changed',
    ])
    expect(recovered.state.analyses['queries.sql#Read']).toMatchObject({
      contractGate: { kind: 'agreed' },
      lineageGate: { kind: 'agreed' },
      diagnostics: [],
    })
  })
})
