import type { JsonSchemaDocument, JsonValue } from '../../config/schema.js'
import type { ValueLineage } from '../../query/value-lineage.js'
import { resolveJsonSchemaLineage, type JsonSchemaBindings } from '../shared/json-schema-lineage.js'
import { printGoFile } from './ast.js'
import { runtimeSource } from './nulls.js'

export const renderGoValidation = (): string =>
  printGoFile({
    package: 'pgsidpgx',
    imports: [],
    declarations: [],
    source: runtimeSource('validation.go'),
  })

export function goValidationSchema(
  value: ValueLineage | undefined,
  bindings: JsonSchemaBindings,
): { resources: Record<string, JsonSchemaDocument>; schema: JsonSchemaDocument } | undefined {
  if (!value) return undefined
  const lineage = resolveJsonSchemaLineage(value, bindings)
  if (
    !lineage.complete ||
    !lineage.alternatives.length ||
    lineage.alternatives.some((item) => !item.runtimeValidation || item.representation !== 'json')
  )
    return undefined
  const resources: Record<string, JsonSchemaDocument> = {}
  const alternatives = lineage.alternatives.map((item) => {
    const url = `https://pgsid.invalid/jsonschemas/${encodeURIComponent(item.schemaName)}.json`
    resources[url] = item.document
    const locations = new Map<object, string>()
    const index = (node: JsonValue, pointer: string): void => {
      if (node === null || typeof node !== 'object') return
      locations.set(node, pointer)
      for (const [key, child] of Object.entries(node))
        index(child as JsonValue, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`)
    }
    index(item.document, '')
    const project = (schema: JsonSchemaDocument): JsonSchemaDocument => {
      if (typeof schema === 'boolean') return schema
      const pointer = locations.get(schema)
      if (pointer !== undefined)
        return {
          $ref: `${url}#${encodeURI(pointer).replaceAll('#', '%23').replaceAll('?', '%3F')}`,
        }
      return Object.fromEntries(
        Object.entries(schema).map(([key, value]) => [
          key,
          Array.isArray(value)
            ? value.map((branch) => project(branch as JsonSchemaDocument))
            : value,
        ]),
      )
    }
    return project(item.schema)
  })
  return {
    resources,
    schema: alternatives.length === 1 ? alternatives[0]! : { anyOf: alternatives },
  }
}
