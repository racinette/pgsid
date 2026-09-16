import { describe, expect, it } from 'vitest'
import { parseConfigString } from '../../src/config/loader.js'
import { createTypescriptCodegenTarget } from '../../src/codegen/typescript/target.js'

const parse = (runtime: string) =>
  parseConfigString(`
schema: schema.sql
types:
  jsonSchemas:
    Payload: {schema: {type: object}}
sql:
  codegen:
    typescript:
      mappings:
        column:
          public.events.payload: {jsonSchema: Payload, runtime: {validate: false}}
      jsonSchemas:
        types: packages/types/jsonschemas
        ${runtime}
      queries:
        out:
          queries: {types: packages/types/queries, runtime: apps/api/db/queries}
          queries/reports: {types: packages/types/reports}
`)

describe('TypeScript declaration and runtime configuration', () => {
  it('normalizes validator runtime shorthand and inherits automatic checking by default', () => {
    const config = parse('runtime: packages/validation')
    expect(config.sql.codegen?.typescript?.jsonSchemas).toEqual({
      types: 'packages/types/jsonschemas',
      runtime: { outDir: 'packages/validation', validate: true },
    })
    expect(config.sql.codegen?.typescript?.mappings.column['public.events.payload']).toEqual({
      jsonSchema: 'Payload',
      runtime: { validate: false },
    })
  })

  it('retains manual validators when automatic checking is disabled', () => {
    expect(
      parse('runtime: {outDir: packages/validation, validate: false}').sql.codegen?.typescript
        ?.jsonSchemas.runtime,
    ).toEqual({ outDir: 'packages/validation', validate: false })
    expect(parse('').sql.codegen?.typescript?.jsonSchemas.runtime).toBeUndefined()
  })

  it('routes declarations and runtime independently, preserving SQL source layout', () => {
    const config = parse('')
    const target = createTypescriptCodegenTarget(
      config,
      {},
      { baseDirectory: '/workspace', key: 'layout' },
    )!
    expect(target.routeQuery('queries/admin/events.sql')?.outputs).toEqual([
      { kind: 'types', path: '/workspace/packages/types/queries/admin/events' },
      { kind: 'runtime', path: '/workspace/apps/api/db/queries/admin/events' },
    ])
    expect(target.routeQuery('queries/reports/Monthly.sql')?.outputs).toEqual([
      { kind: 'types', path: '/workspace/packages/types/reports/Monthly' },
    ])
  })
  it('emits shared declarations without a validator runtime or database implementation', () => {
    const target = createTypescriptCodegenTarget(
      parse(''),
      { Payload: { type: 'object' } },
      { baseDirectory: '/workspace', key: 'types' },
    )!
    const result = target.renderSupport!()
    expect(result.diagnostics).toEqual([])
    expect(result.artifacts.map((artifact) => artifact.path)).toEqual([
      '/workspace/packages/types/jsonschemas/Payload.d.ts',
      '/workspace/packages/types/jsonschemas/index.d.ts',
    ])
    expect(result.artifacts.every((artifact) => artifact.kind === 'types')).toBe(true)
  })

  it('rejects obsolete config keys and checking without a validator destination', () => {
    expect(() =>
      parseConfigString(
        'schema: schema.sql\nsql: {codegen: {typescript: {queries: {out: {queries: {types: types, wrappers: runtime}}}}}}',
      ),
    ).toThrow('wrappers')
    expect(() =>
      parseConfigString(
        'schema: schema.sql\nsql: {codegen: {typescript: {jsonSchemas: {runtimeValidation: true}}}}',
      ),
    ).toThrow('runtimeValidation')
    expect(() =>
      parseConfigString(`schema: schema.sql
types:
  jsonSchemas:
    Payload: {schema: true}
sql:
  codegen:
    typescript:
      queries:
        out:
          queries: {types: types, runtime: runtime}
      mappings:
        column:
          public.events.payload: {jsonSchema: Payload, runtime: {validate: true}}
`),
    ).toThrow('requires jsonSchemas.runtime output')
  })

  it('reports declaration/runtime module collisions and unsupported shared validators', () => {
    const config = parse('runtime: packages/types/jsonschemas')
    const target = createTypescriptCodegenTarget(
      config,
      { Payload: { type: 'object' } },
      { baseDirectory: '/workspace', key: 'collision' },
    )!
    expect(target.renderSupport!().diagnostics[0]?.message).toContain(
      'different module destinations',
    )
    const unsupported = createTypescriptCodegenTarget(
      parse('runtime: packages/validation'),
      { Payload: { unevaluatedProperties: false } },
      { baseDirectory: '/workspace', key: 'unsupported' },
    )!
    expect(unsupported.renderSupport!().diagnostics[0]?.message).toContain(
      'Unsupported JSON Schema assertion',
    )
    expect(
      unsupported.renderQueries([], {
        target: 'typescript',
        outputs: [{ kind: 'types', path: '/workspace/types' }],
      }).artifacts,
    ).toEqual([])
  })
})
