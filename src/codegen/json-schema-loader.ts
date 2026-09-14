import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ConfigError } from '../config/loader.js'
import { jsonSchemaDocumentSchema, type Config, type JsonSchemaDocument } from '../config/schema.js'

export interface LoadJsonSchemaDocumentsOptions {
  /** Directory used to resolve file-backed definitions. Defaults to the process cwd. */
  baseDirectory?: string
}

export function loadJsonSchemaDocuments(
  config: Config,
  options: LoadJsonSchemaDocumentsOptions = {},
): Record<string, JsonSchemaDocument> {
  const baseDirectory = options.baseDirectory ?? process.cwd()
  const documents: Record<string, JsonSchemaDocument> = {}
  for (const [name, definition] of Object.entries(config.types.jsonSchemas)) {
    if ('schema' in definition) {
      documents[name] = definition.schema
      continue
    }

    const path = resolve(baseDirectory, definition.file)
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8'))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new ConfigError(
        `Could not load JSON Schema ${JSON.stringify(name)} from ${path}: ${reason}`,
      )
    }
    const result = jsonSchemaDocumentSchema.safeParse(parsed)
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `at ${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; ')
      throw new ConfigError(`Invalid JSON Schema ${JSON.stringify(name)} in ${path}: ${issues}`)
    }
    documents[name] = result.data
  }
  return documents
}
