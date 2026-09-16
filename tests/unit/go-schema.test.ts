import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { loadJsonSchemaDocuments } from '../../src/codegen/shared/json-schema-loader.js'
import { parseConfigString } from '../../src/config/loader.js'
import { buildNullabilityCatalog } from '../../src/query/catalog-adapter.js'
import { analyzeSchemaRelations } from '../../src/schema-analysis.js'

describe('renderGoSchemaArtifacts', () => {
  let pg: PGlite

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(`
      CREATE TYPE public.event_state AS ENUM ('ready', 'in-progress');
      CREATE DOMAIN public.event_id AS bigint NOT NULL CHECK (VALUE > 0);
      CREATE DOMAIN public.default_event_id AS public.event_id DEFAULT 1;
      CREATE TYPE public.event_meta AS (source text, score integer);
      CREATE TABLE public.events (
        id public.event_id PRIMARY KEY,
        default_id public.default_event_id,
        state public.event_state NOT NULL DEFAULT 'ready',
        amount numeric NOT NULL,
        payload jsonb,
        meta public.event_meta,
        created_at timestamptz NOT NULL
      );
      CREATE VIEW public.event_actors AS
        SELECT id, payload->'actor' AS actor FROM public.events;
    `)
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  it('emits domains, enums, JSON Schema types, relations, and imports', async () => {
    const config = parseConfigString(`
      schema: migrations/*.sql
      types:
        jsonSchemas:
          EventPayload:
            schema:
              type: object
              required: [actor]
              properties:
                actor: { type: integer }
                note: { type: string }
              additionalProperties: false
          UnusedPayload:
            schema:
              type: object
              properties:
                ignored: { type: string }
      sql:
        codegen:
          go:
            package: db
            mappings:
              pgType:
                pg_catalog.numeric:
                  type: decimal.Decimal
                  imports:
                    - path: github.com/shopspring/decimal
                      as: decimal
              column:
                public.events.payload:
                  jsonSchema: EventPayload
            schema:
              outDir: generated
    `)
    const catalog = await snapshotCatalog(pg)
    const schemas = loadJsonSchemaDocuments(config)
    const analysisCatalog = await buildNullabilityCatalog(catalog)
    const relations = await analyzeSchemaRelations(catalog, analysisCatalog)
    const result = renderGoSchemaArtifacts(catalog, config, schemas, '/generated', 'db', relations)

    expect(result.diagnostics).toEqual([])
    expect(result.artifacts).toHaveLength(2)
    expect(result.artifacts.map((artifact) => artifact.path)).toEqual([
      '/generated/public/schema.go',
      '/jsonschemas/eventpayload.go',
    ])
    const source = result.artifacts.map((artifact) => artifact.content).join('\n')
    expect(source).toContain('"github.com/shopspring/decimal"')
    expect(source).toContain('"time"')
    expect(source).toContain('type EventPayload struct {')
    expect(source).not.toContain('type UnusedPayload')
    expect(source).toContain('Actor int64')
    expect(source).toContain('Note  *string')
    expect(source).toContain('type EventState string')
    expect(source).toContain('EventStateInProgress EventState = "in-progress"')
    expect(source).toContain('type EventId int64')
    expect(source).toContain('type DefaultEventId EventId')
    expect(source).toContain('type EventMeta struct {')
    expect(source).toMatch(/Source\s+\*string/u)
    expect(source).toMatch(/Score\s+\*int32/u)
    expect(source).toContain('Payload   *jsonschemas.EventPayload')
    expect(source).toContain('Amount    decimal.Decimal')
    expect(source).toMatch(/Meta\s+\*EventMeta/u)
    expect(source).toContain('CreatedAt time.Time')
    expect(source).toContain('Actor *int64')
  })

  it('diagnoses import cycles introduced by schema package boundaries', async () => {
    const database = await PGlite.create()
    try {
      await database.exec(`
        CREATE SCHEMA first;
        CREATE SCHEMA second;
        CREATE DOMAIN first.id AS bigint;
        CREATE DOMAIN second.id AS bigint;
        CREATE TYPE first.link AS (id second.id);
        CREATE TYPE second.link AS (id first.id);
      `)
      const config = parseConfigString(`
        schema: schema.sql
        sql:
          codegen:
            go:
              schema: {outDir: generated}
      `)
      const result = renderGoSchemaArtifacts(
        await snapshotCatalog(database),
        config,
        {},
        '/generated',
        'example.com/app/generated',
      )
      expect(result.artifacts).toEqual([])
      expect(result.diagnostics[0]?.message).toContain(
        'example.com/app/generated/first -> example.com/app/generated/second -> example.com/app/generated/first',
      )
    } finally {
      await database.close()
    }
  })

  it('flattens domains when native domain types are disabled', async () => {
    const config = parseConfigString(`
      schema: migrations/*.sql
      sql:
        codegen:
          go:
            domains: false
            schema:
              outDir: generated
    `)
    const catalog = await snapshotCatalog(pg)
    const result = renderGoSchemaArtifacts(catalog, config, {}, '/generated', 'db')
    const source = result.artifacts[0]!.content

    expect(source).not.toContain('type EventId')
    expect(source).not.toContain('type DefaultEventId')
    expect(source).toContain('Id        int64')
    expect(source).toContain('DefaultId int64')
  })
})
