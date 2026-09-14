import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadJsonSchemaDocuments } from '../../src/codegen/json-schema-loader.js'
import { parseConfigString } from '../../src/config/loader.js'

describe('JSON Schema document loading', () => {
  const directories: string[] = []

  afterEach(() => {
    for (const directory of directories.splice(0))
      rmSync(directory, { recursive: true, force: true })
  })

  const directory = (): string => {
    const path = mkdtempSync(join(tmpdir(), 'pgsid-json-schema-'))
    directories.push(path)
    return path
  }

  it('combines inline and config-relative file definitions', () => {
    const baseDirectory = directory()
    writeFileSync(
      join(baseDirectory, 'event.schema.json'),
      JSON.stringify({
        type: 'object',
        properties: { id: { type: 'integer' } },
        additionalProperties: false,
      }),
    )
    const config = parseConfigString(`
      schema: migrations/*.sql
      types:
        jsonSchemas:
          Anything:
            schema: true
          EventPayload:
            file: event.schema.json
    `)
    expect(loadJsonSchemaDocuments(config, { baseDirectory })).toEqual({
      Anything: true,
      EventPayload: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        additionalProperties: false,
      },
    })
  })

  it('reports the schema variable and resolved path for unreadable files', () => {
    const baseDirectory = directory()
    const config = parseConfigString(`
      schema: schema.sql
      types:
        jsonSchemas:
          EventPayload:
            file: missing.schema.json
    `)
    expect(() => loadJsonSchemaDocuments(config, { baseDirectory })).toThrow(
      `Could not load JSON Schema "EventPayload" from ${join(baseDirectory, 'missing.schema.json')}`,
    )
  })

  it('rejects JSON values that are not schema documents', () => {
    const baseDirectory = directory()
    writeFileSync(join(baseDirectory, 'invalid.schema.json'), '["not", "a", "schema"]')
    const config = parseConfigString(`
      schema: schema.sql
      types:
        jsonSchemas:
          Invalid:
            file: invalid.schema.json
    `)
    expect(() => loadJsonSchemaDocuments(config, { baseDirectory })).toThrow(
      `Invalid JSON Schema "Invalid" in ${join(baseDirectory, 'invalid.schema.json')}`,
    )
  })

  it('reports malformed JSON as a load failure', () => {
    const baseDirectory = directory()
    writeFileSync(join(baseDirectory, 'broken.schema.json'), '{')
    const config = parseConfigString(`
      schema: schema.sql
      types:
        jsonSchemas:
          Broken:
            file: broken.schema.json
    `)
    expect(() => loadJsonSchemaDocuments(config, { baseDirectory })).toThrow(
      `Could not load JSON Schema "Broken" from ${join(baseDirectory, 'broken.schema.json')}`,
    )
  })
})
