import type { Config, JsonSchemaDocument } from '../../config/schema.js'
import type { ColumnJsonSchemaBinding, JsonSchemaBindings } from '../shared/json-schema-lineage.js'

export function typescriptJsonSchemaBindings(
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
): JsonSchemaBindings {
  const target = config.sql.codegen?.typescript
  const columns: Record<string, ColumnJsonSchemaBinding> = {}
  for (const [column, mapping] of Object.entries(target?.mappings.column ?? {})) {
    if (typeof mapping === 'string' || !('jsonSchema' in mapping)) continue
    columns[column] = {
      schemaName: mapping.jsonSchema,
      runtimeValidation:
        mapping.runtime?.validate ?? target?.jsonSchemas.runtime?.validate ?? false,
    }
  }
  return { schemas, columns }
}
