import { describe, it, expect } from 'vitest'
import { parseConfigString } from '../../src/config/loader.js'

describe('config schema', () => {
  it('parses a minimal config with defaults', () => {
    const cfg = parseConfigString(`
      schema: migrations/*.up.sql
    `)
    expect(cfg.schema).toEqual(['migrations/*.up.sql'])
    expect(cfg.types.jsonSchemas).toEqual({})
    expect(cfg.engine.poolSize).toBe(2)
    expect(cfg.sql.searchPath).toEqual(['public'])
    expect(cfg.sql.typecheck.plpgsql).toBe(true)
  })

  it('parses every supported config section', () => {
    const cfg = parseConfigString(`
      schema:
        - migrations/*.up.sql
        - "!migrations/*_test.up.sql"

      types:
        jsonSchemas:
          EventPayload:
            file: schemas/event-payload.schema.json
          AuditContext:
            schema:
              type: object
              required: [actorId]
              properties:
                actorId:
                  type: integer
              additionalProperties: false
          Anything:
            schema: true

      engine:
        poolSize: 4

      sql:
        paths:
          - sql/queries/**/*.sql
        searchPath:
          - public
          - app
        typecheck:
          plpgsql: false

        codegen:
          typescript:
            driver: pg
            convention: sqlc
            brands: [__brand, brand]
            mappings:
              pgType:
                pg_catalog.int8: bigint
                pg_catalog.numeric:
                  type: Decimal
                  imports:
                    - from: decimal.js
                      default: Decimal
                public.uint256:
                  type: BigNumber
                  imports:
                    - from: bn.js
                      name: BN
                      as: BigNumber
              column:
                public.users.external_id: string
                public.events.payload:
                  jsonSchema: EventPayload
                  runtimeValidation: false
                public.audit_log.context:
                  jsonSchema: AuditContext
            jsonSchemas:
              runtimeValidation: true
            schema:
              outDir: packages/db-types/src/schema
            queries:
              exclude:
                - "**/*_test.sql"
              out:
                sql/queries/reporting: packages/db-types/src/queries/reporting
                sql/queries/accounts:
                  types: packages/db-types/src/queries/accounts
                  wrappers: apps/api/src/db/queries/accounts
    `)
    expect(cfg.schema).toEqual(['migrations/*.up.sql', '!migrations/*_test.up.sql'])
    expect(cfg.types.jsonSchemas.EventPayload).toEqual({
      file: 'schemas/event-payload.schema.json',
    })
    expect(cfg.types.jsonSchemas.AuditContext).toEqual({
      schema: {
        type: 'object',
        required: ['actorId'],
        properties: { actorId: { type: 'integer' } },
        additionalProperties: false,
      },
    })
    expect(cfg.engine.poolSize).toBe(4)
    expect(cfg.sql.paths).toEqual(['sql/queries/**/*.sql'])
    expect(cfg.sql.searchPath).toEqual(['public', 'app'])
    expect(cfg.sql.typecheck.plpgsql).toBe(false)
    expect(cfg.sql.codegen?.typescript?.driver).toBe('pg')
    expect(cfg.sql.codegen?.typescript?.mappings.pgType['pg_catalog.numeric']).toEqual({
      type: 'Decimal',
      imports: [{ from: 'decimal.js', default: 'Decimal' }],
    })
    expect(cfg.sql.codegen?.typescript?.mappings.column['public.events.payload']).toEqual({
      jsonSchema: 'EventPayload',
      runtimeValidation: false,
    })
    expect(cfg.sql.codegen?.typescript?.jsonSchemas.runtimeValidation).toBe(true)
    expect(cfg.sql.codegen?.typescript?.schema?.outDir).toBe('packages/db-types/src/schema')
    expect(cfg.sql.codegen?.typescript?.queries.exclude).toEqual(['**/*_test.sql'])
  })

  it('accepts string schema (single file)', () => {
    const cfg = parseConfigString(`schema: schema.sql`)
    expect(cfg.schema).toEqual(['schema.sql'])
  })

  it('accepts array schema', () => {
    const cfg = parseConfigString(`
      schema:
        - a.sql
        - b.sql
    `)
    expect(cfg.schema).toEqual(['a.sql', 'b.sql'])
  })

  it('uses default codegen typescript config', () => {
    const cfg = parseConfigString(`
      schema: schema.sql
      sql:
        paths: [queries/*.sql]
        codegen:
          typescript:
            queries: {}
    `)
    expect(cfg.sql.codegen?.typescript?.driver).toBe('pg')
    expect(cfg.sql.codegen?.typescript?.convention).toBe('sqlc')
    expect(cfg.sql.codegen?.typescript?.brands).toEqual(['__brand'])
    expect(cfg.sql.codegen?.typescript?.mappings).toEqual({ pgType: {}, column: {} })
    expect(cfg.sql.codegen?.typescript?.jsonSchemas.runtimeValidation).toBe(false)
  })

  it('rejects invalid driver', () => {
    expect(() =>
      parseConfigString(`
        schema: schema.sql
        sql:
          codegen:
            typescript:
              driver: postgres
      `),
    ).toThrow()
  })

  it('rejects obsolete and unknown options instead of silently stripping them', () => {
    expect(() =>
      parseConfigString(`
        schema: schema.sql
        sql:
          codegen:
            typescript:
              target: pg
              typeMappings: {}
      `),
    ).toThrow()
  })

  it('rejects references to undefined JSON Schemas', () => {
    expect(() =>
      parseConfigString(`
        schema: schema.sql
        sql:
          codegen:
            typescript:
              mappings:
                column:
                  public.events.payload:
                    jsonSchema: Missing
      `),
    ).toThrow('Unknown JSON Schema "Missing"')
  })

  it('only accepts runtime validation on JSON Schema column mappings', () => {
    expect(() =>
      parseConfigString(`
        schema: schema.sql
        sql:
          codegen:
            typescript:
              mappings:
                column:
                  public.events.payload:
                    type: EventPayload
                    runtimeValidation: true
      `),
    ).toThrow()
  })

  it('rejects missing schema', () => {
    expect(() => parseConfigString(`sql: { paths: [] }`)).toThrow()
  })
})
