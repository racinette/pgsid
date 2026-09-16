import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { loadJsonSchemaDocuments } from '../../src/codegen/shared/json-schema-loader.js'
import { renderTypescriptSchemaArtifacts } from '../../src/codegen/typescript/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { buildNullabilityCatalog } from '../../src/query/catalog-adapter.js'
import { analyzeSchemaRelations } from '../../src/schema-analysis.js'

describe('renderTypescriptSchemaArtifacts', () => {
  let pg: PGlite

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(`
      CREATE SCHEMA billing;
      CREATE TYPE public.event_state AS ENUM ('ready', 'in-progress');
      CREATE DOMAIN public.event_id AS bigint NOT NULL CHECK (VALUE > 0);
      CREATE DOMAIN public.default_event_id AS public.event_id DEFAULT 1;
      CREATE DOMAIN billing.invoice_id AS uuid;
      CREATE TABLE public.events (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        external_id public.event_id,
        default_id public.default_event_id,
        state public.event_state NOT NULL DEFAULT 'ready',
        payload jsonb,
        label text NOT NULL,
        normalized text GENERATED ALWAYS AS (lower(label)) STORED,
        invoice_ids billing.invoice_id[]
      );
      CREATE VIEW public.event_labels AS SELECT id, label FROM public.events;
      CREATE VIEW public.event_kinds AS SELECT payload->'kind' AS kind FROM public.events;
      CREATE VIEW public.event_nothings AS SELECT NULL::text AS nothing;
      CREATE MATERIALIZED VIEW public.event_snapshot AS SELECT label FROM public.events;
    `)
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  it('emits helpers, relation operations, enums, domains, and barrels from the catalog', async () => {
    const config = parseConfigString(`
      schema: migrations/*.sql
      types:
        jsonSchemas:
          EventPayload:
            schema:
              type: object
              required: [kind]
              properties:
                kind: { type: string }
              additionalProperties: false
      sql:
        analysis:
          nullability:
            materializedViews:
              default: conservative
        codegen:
          typescript:
            brands: [__brand, __pgType]
            mappings:
              column:
                public.events.payload:
                  jsonSchema: EventPayload
            schema:
              outDir: generated
    `)
    const catalog = await snapshotCatalog(pg)
    const schemas = loadJsonSchemaDocuments(config)
    const analysisCatalog = await buildNullabilityCatalog(catalog)
    const relations = await analyzeSchemaRelations(catalog, analysisCatalog, {
      materializedViews: config.sql.analysis.nullability.materializedViews,
    })
    const result = renderTypescriptSchemaArtifacts(catalog, config, schemas, '/generated', {
      relations,
    })

    expect(result.diagnostics).toEqual([])
    const artifacts = Object.fromEntries(
      result.artifacts.map((artifact) => [artifact.path, artifact.content]),
    )
    expect(Object.keys(artifacts)).toEqual([
      '/generated/helpers.d.ts',
      '/jsonschemas/EventPayload.d.ts',
      '/jsonschemas/index.d.ts',
      '/generated/billing/domains.d.ts',
      '/generated/billing/index.d.ts',
      '/generated/public/tables.d.ts',
      '/generated/public/enums.d.ts',
      '/generated/public/domains.d.ts',
      '/generated/public/index.d.ts',
    ])
    expect(artifacts['/generated/helpers.d.ts']).toContain('export type InferInsert')
    expect(artifacts['/generated/public/enums.d.ts']).toContain(
      'export type EventState = "ready" | "in-progress";',
    )
    expect(artifacts['/generated/public/domains.d.ts']).toContain(
      'readonly "__brand": "public.event_id";',
    )
    expect(artifacts['/generated/public/domains.d.ts']).toContain(
      'readonly "__pgType": "public.event_id";',
    )
    expect(artifacts['/generated/public/domains.d.ts']).toContain(
      'export type DefaultEventId = string &',
    )
    const tables = artifacts['/generated/public/tables.d.ts']!
    expect(tables).toContain('export type Events = TableTypes<')
    expect(tables).toContain(
      '"payload"?: import("../../jsonschemas/index.js").EventPayload | null;',
    )
    expect(tables).toContain('"label": string;')
    expect(tables.match(/"external_id": import\("\.\/domains\.js"\)\.EventId;/gu)).toHaveLength(2)
    expect(tables).toContain('"default_id"?: import("./domains.js").DefaultEventId;')
    expect(tables).toContain('"state"?: import("./enums.js").EventState;')
    expect(tables).toContain(
      '"invoice_ids"?: (import("../billing/domains.js").InvoiceId | null)[] | null;',
    )
    expect(tables.match(/"normalized"/gu)).toHaveLength(1)
    expect(tables.match(/"id"/gu)).toHaveLength(2)
    expect(tables).toContain('export type EventLabels = TableTypes<')
    expect(tables.replace(/\s+/gu, ' ')).toContain(
      'export type EventLabels = TableTypes<{ "id": string; "label": string; }, never, never>;',
    )
    expect(tables.replace(/\s+/gu, ' ')).toContain(
      'export type EventKinds = TableTypes<{ "kind": string | null; }, never, never>;',
    )
    expect(tables.replace(/\s+/gu, ' ')).toContain(
      'export type EventSnapshot = TableTypes<{ "label": string | null; }, never, never>;',
    )
    expect(tables.replace(/\s+/gu, ' ')).toContain(
      'export type EventNothings = TableTypes<{ "nothing": null; }, never, never>;',
    )
    expect(tables.replace(/\s+/gu, ' ')).toContain('}, never, never>;')
    for (const source of Object.values(artifacts)) expectSyntax(source)
  })
})

const expectSyntax = (source: string): void => {
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  })
  expect(result.diagnostics).toEqual([])
}
