import { describe, expect, it } from 'vitest'
import {
  EMPTY_QUERY_BATCH_STATE,
  QueryBatchError,
  reconcileQueryBatch,
  type QuerySourceInput,
} from '../../src/query-batch.js'

const source = (
  path: string,
  content: string,
  output = `/generated/${path}.ts`,
): QuerySourceInput => ({
  path,
  content,
  output: { types: output },
})

describe('reconcileQueryBatch', () => {
  it('emits the initial query set in deterministic order', async () => {
    const update = await reconcileQueryBatch([
      source('z.sql', '-- name: Zed :one\nSELECT 1;'),
      source('a.sql', '-- name: Alpha :many\nSELECT @tenant;'),
    ])

    expect(update.events.map((event) => event.kind)).toEqual(['query-added', 'query-added'])
    expect(
      update.events.map((event) => (event.kind === 'query-added' ? event.query.id : '')),
    ).toEqual(['a.sql#Alpha', 'z.sql#Zed'])
    expect(update.stats).toEqual({ cacheHits: 0, cacheMisses: 2 })
  })

  it('reuses unchanged parses and emits nothing', async () => {
    const inputs = [source('query.sql', '-- name: Get :one\nSELECT @id;')]
    const first = await reconcileQueryBatch(inputs)
    const second = await reconcileQueryBatch(inputs, first.state)

    expect(second.events).toEqual([])
    expect(second.stats).toEqual({ cacheHits: 1, cacheMisses: 0 })
    expect(second.state.parseCache[Object.keys(second.state.parseCache)[0]!]).toBe(
      first.state.parseCache[Object.keys(first.state.parseCache)[0]!],
    )
  })

  it('does not emit semantic changes for formatting-only edits', async () => {
    const first = await reconcileQueryBatch([source('query.sql', '-- name: Get :one\nSELECT @id;')])
    const second = await reconcileQueryBatch(
      [source('query.sql', '-- name: Get :one\n-- explanation\n  select   @id ;')],
      first.state,
    )

    expect(second.events).toEqual([])
    expect(second.stats).toEqual({ cacheHits: 0, cacheMisses: 1 })
  })

  it('emits changes for SQL, parameter names, commands, and output routes', async () => {
    const first = await reconcileQueryBatch([
      source('query.sql', '-- name: Get :one\nSELECT @id;', '/generated/old.ts'),
    ])
    const variants = [
      source('query.sql', '-- name: Get :one\nSELECT @id + 1;', '/generated/old.ts'),
      source('query.sql', '-- name: Get :one\nSELECT @account_id;', '/generated/old.ts'),
      source('query.sql', '-- name: Get :many\nSELECT @id;', '/generated/old.ts'),
      source('query.sql', '-- name: Get :one\nSELECT @id;', '/generated/new.ts'),
    ]

    for (const variant of variants) {
      const update = await reconcileQueryBatch([variant], first.state)
      expect(update.events.map((event) => event.kind)).toEqual(['query-changed'])
    }
    const rerouted = await reconcileQueryBatch([variants[3]!], first.state)
    expect(rerouted.state.files['query.sql']!.queries[0]!.analysisHash).toBe(
      first.state.files['query.sql']!.queries[0]!.analysisHash,
    )
  })

  it('accepts files that are checked without an output route', async () => {
    const update = await reconcileQueryBatch([
      { path: 'check-only.sql', content: '-- name: Check :one\nSELECT 1;' },
    ])

    expect(update.state.files['check-only.sql']).toMatchObject({ output: undefined })
    expect(update.state.files['check-only.sql']!.queries[0]).toMatchObject({ output: undefined })
    expect(update.events.map((event) => event.kind)).toEqual(['query-added'])
  })

  it('models renames and deletion against the previous state', async () => {
    const first = await reconcileQueryBatch([
      source('query.sql', '-- name: Before :one\nSELECT 1;'),
    ])
    const renamed = await reconcileQueryBatch(
      [source('query.sql', '-- name: After :one\nSELECT 1;')],
      first.state,
    )
    expect(renamed.events.map((event) => event.kind)).toEqual(['query-added', 'query-removed'])

    const removed = await reconcileQueryBatch([], renamed.state)
    expect(removed.events.map((event) => event.kind)).toEqual(['query-removed'])
  })

  it('turns parse failures and recovery into state changes', async () => {
    const first = await reconcileQueryBatch([source('query.sql', '-- name: Get :one\nSELECT 1;')])
    const broken = await reconcileQueryBatch(
      [source('query.sql', '-- name: Get :one\nSELECT +;')],
      first.state,
    )
    expect(broken.events.map((event) => event.kind)).toEqual([
      'diagnostics-changed',
      'query-removed',
    ])
    expect(broken.state.files['query.sql']!.diagnostics[0]).toMatchObject({
      code: 'parse-error',
    })

    const fixed = await reconcileQueryBatch(
      [source('query.sql', '-- name: Get :one\nSELECT 2;')],
      broken.state,
    )
    expect(fixed.events.map((event) => event.kind)).toEqual(['diagnostics-changed', 'query-added'])
  })

  it('shares parses by content and rejects duplicate paths', async () => {
    const content = '-- name: Same :one\nSELECT 1;'
    const update = await reconcileQueryBatch([source('a.sql', content), source('b.sql', content)])
    expect(update.stats).toEqual({ cacheHits: 1, cacheMisses: 1 })

    await expect(
      reconcileQueryBatch([source('same.sql', content), source('same.sql', content)]),
    ).rejects.toBeInstanceOf(QueryBatchError)
    expect(EMPTY_QUERY_BATCH_STATE).toEqual({ files: {}, parseCache: {} })
  })
})
