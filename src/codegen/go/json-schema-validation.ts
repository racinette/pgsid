import type { JsonSchemaDocument, JsonValue } from '../../config/schema.js'
import type { ValueLineage } from '../../query/value-lineage.js'
import {
  resolveJsonSchemaLineage,
  type JsonSchemaBindings,
  type JsonSchemaLineage,
} from '../shared/json-schema-lineage.js'
import { go, printGoFile } from './ast.js'
import { runtimeSource } from './nulls.js'

export const goJsonSchemaResourceUri = (name: string): string =>
  `pgsid:///jsonschemas/${encodeURIComponent(name)}.json`

export const goValidationContract = (schema: JsonSchemaDocument): string =>
  typeof schema === 'object' && typeof schema.$ref === 'string' && Object.keys(schema).length === 1
    ? schema.$ref
    : JSON.stringify(schema)

export const renderGoValidationRuntime = (
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
): string =>
  printGoFile({
    package: 'pgsidvalidation',
    imports: [],
    declarations: [
      go.const(
        'schemaResources',
        go.string(
          JSON.stringify(
            Object.fromEntries(
              Object.keys(schemas)
                .sort()
                .map((name) => [goJsonSchemaResourceUri(name), schemas[name]]),
            ),
          ),
        ),
      ),
    ],
    source: runtimeSource('validation.go').replace('package pgsidpgx', 'package pgsidvalidation'),
  })

export const renderGoValidation = (importPath: string): string =>
  printGoFile({
    package: 'pgsidpgx',
    imports: [{ path: importPath, alias: 'validation' }],
    declarations: [],
    source: `package pgsidpgx
type QueryValidationError = validation.QueryValidationError
func ValidatedJSON(target any, contract, query, column string, nullable bool) any {
  return validation.ValidatedJSON(target, contract, query, column, nullable)
}
func ValidateJSONInput(value any, contract, query, column string, nullable bool) (any, error) {
  return validation.ValidateJSONInput(value, contract, query, column, nullable)
}`,
  })

export function goValidationSchema(
  value: ValueLineage | undefined,
  bindings: JsonSchemaBindings,
): { schema: JsonSchemaDocument } | undefined {
  if (!value) return undefined
  const lineage = resolveJsonSchemaLineage(value, bindings)
  if (
    !lineage.complete ||
    !lineage.alternatives.length ||
    lineage.alternatives.some((item) => !item.runtimeValidation || item.representation !== 'json')
  )
    return undefined
  return goValidationFromLineage(lineage)
}

export function goValidationFromLineage(lineage: JsonSchemaLineage): {
  schema: JsonSchemaDocument
} {
  const alternatives = lineage.alternatives.map((item) => {
    const url = goJsonSchemaResourceUri(item.schemaName)
    if (!item.path.length) return { $ref: `${url}#` }
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
    schema: alternatives.length === 1 ? alternatives[0]! : { anyOf: alternatives },
  }
}
