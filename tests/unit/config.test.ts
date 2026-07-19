import { describe, it, expect } from 'vitest'
import { parseConfigString } from '../../src/config/loader.js'

describe('config schema', () => {
  it('parses a minimal config with defaults', () => {
    const cfg = parseConfigString(`
      schema: migrations/*.up.sql
    `)
    expect(cfg.schema).toEqual(['migrations/*.up.sql'])
    expect(cfg.preprocess.strip.dml).toBe(true)
    expect(cfg.preprocess.strip.do).toBe(true)
    expect(cfg.engine.poolSize).toBe(2)
    expect(cfg.sql.searchPath).toEqual(['public'])
    expect(cfg.sql.typecheck.plpgsql).toBe(true)
  })

  it('parses a full config', () => {
    const cfg = parseConfigString(`
      schema:
        - migrations/*.up.sql
        - "!migrations/*_test.up.sql"

      preprocess:
        strip:
          dml: false
          do: true

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
            target: pg
            schema:
              outDir: packages/db-types/src/schema
            queries:
              exclude:
                - "**/*_test.sql"
              out:
                sql/queries:
                  types: packages/db-types/src/queries
                  wrappers: apps/api/src/db/queries
    `)
    expect(cfg.schema).toEqual(['migrations/*.up.sql', '!migrations/*_test.up.sql'])
    expect(cfg.preprocess.strip.dml).toBe(false)
    expect(cfg.preprocess.strip.do).toBe(true)
    expect(cfg.engine.poolSize).toBe(4)
    expect(cfg.sql.paths).toEqual(['sql/queries/**/*.sql'])
    expect(cfg.sql.searchPath).toEqual(['public', 'app'])
    expect(cfg.sql.typecheck.plpgsql).toBe(false)
    expect(cfg.sql.codegen?.typescript?.target).toBe('pg')
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
    expect(cfg.sql.codegen?.typescript?.target).toBe('pg')
    expect(cfg.sql.codegen?.typescript?.convention).toBe('sqlc')
    expect(cfg.sql.codegen?.typescript?.brands).toEqual(['__brand'])
  })

  it('rejects invalid target', () => {
    expect(() =>
      parseConfigString(`
        schema: schema.sql
        sql:
          paths: []
          codegen:
            typescript:
              target: postgres
              queries: {}
      `),
    ).toThrow()
  })

  it('rejects missing schema', () => {
    expect(() => parseConfigString(`sql: { paths: [] }`)).toThrow()
  })
})
