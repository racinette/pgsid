import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { loadJsonSchemaDocuments } from '../../src/codegen/shared/json-schema-loader.js'
import { renderTypescriptSchemaArtifacts } from '../../src/codegen/typescript/schema.js'
import { parseConfigString } from '../../src/config/loader.js'

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
    const result = renderTypescriptSchemaArtifacts(catalog, config, schemas, '/generated')

    expect(result.diagnostics).toEqual([])
    const artifacts = Object.fromEntries(
      result.artifacts.map((artifact) => [artifact.path, artifact.content]),
    )
    expect(Object.keys(artifacts)).toEqual([
      '/generated/helpers.d.ts',
      '/generated/billing/domains.d.ts',
      '/generated/billing/index.ts',
      '/generated/public/tables.d.ts',
      '/generated/public/enums.d.ts',
      '/generated/public/domains.d.ts',
      '/generated/public/index.ts',
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
      'export type DefaultEventId = EventId &',
    )
    const tables = artifacts['/generated/public/tables.d.ts']!
    expect(tables).toContain('export type Events = TableTypes<')
    expect(tables).toContain('"payload"?: {')
    expect(tables).toContain('"label": string;')
    expect(tables.match(/"external_id": EventId;/gu)).toHaveLength(2)
    expect(tables).toContain('"default_id"?: DefaultEventId;')
    expect(tables).toContain('"state"?: EventState;')
    expect(tables).toContain('"invoice_ids"?: InvoiceId[] | null;')
    expect(tables.match(/"normalized"/gu)).toHaveLength(1)
    expect(tables.match(/"id"/gu)).toHaveLength(2)
    expect(tables).toContain('export type EventLabels = TableTypes<')
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
