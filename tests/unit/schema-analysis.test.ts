import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot } from '../../src/catalog/types.js'
import { buildNullabilityCatalog } from '../../src/query/catalog-adapter.js'
import type { QueryAnalysisCatalog } from '../../src/query-analysis.js'
import { interpretValueLineage } from '../../src/query/value-lineage.js'
import { analyzeSchemaRelations } from '../../src/schema-analysis.js'

describe('analyzeSchemaRelations', () => {
  let pg: PGlite
  let snapshot: CatalogSnapshot
  let catalog: QueryAnalysisCatalog

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(`
      CREATE TABLE events (
        id integer PRIMARY KEY,
        payload jsonb NOT NULL
      );
      CREATE VIEW event_actors AS
        SELECT id, payload->'actor' AS actor FROM events;
      CREATE VIEW required_event_actors AS
        SELECT actor FROM event_actors WHERE actor IS NOT NULL;
      CREATE MATERIALIZED VIEW event_snapshot AS
        SELECT id, payload FROM events;
    `)
    snapshot = await snapshotCatalog(pg)
    catalog = await buildNullabilityCatalog(snapshot)
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  it('analyzes ordinary view chains positionally through their definitions', async () => {
    const analyses = await analyzeSchemaRelations(snapshot, catalog)

    expect(
      analyses['public.event_actors']?.columns.map(({ name, notNull }) => [name, notNull]),
    ).toEqual([
      ['id', true],
      ['actor', false],
    ])
    expect(analyses['public.required_event_actors']?.columns[0]).toMatchObject({
      name: 'actor',
      notNull: true,
    })
    expect(
      interpretValueLineage(analyses['public.required_event_actors']!.columns[0]!.value!),
    ).toMatchObject({
      kind: 'transform',
      operation: { kind: 'json-access', path: ['actor'], result: 'json' },
    })
  })

  it('applies materialized-view defaults and exact overrides', async () => {
    const conservative = await analyzeSchemaRelations(snapshot, catalog, {
      materializedViews: { default: 'conservative', overrides: {} },
    })
    const overridden = await analyzeSchemaRelations(snapshot, catalog, {
      materializedViews: {
        default: 'conservative',
        overrides: { 'public.event_snapshot': 'definition' },
      },
    })

    expect(conservative['public.event_snapshot']?.columns.map((column) => column.notNull)).toEqual([
      false,
      false,
    ])
    expect(overridden['public.event_snapshot']?.columns.map((column) => column.notNull)).toEqual([
      true,
      true,
    ])
  })
})
