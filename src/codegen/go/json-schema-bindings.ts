import type { Config, JsonSchemaDocument } from '../../config/schema.js'
import type { JsonSchemaBindings } from '../shared/json-schema-lineage.js'

export const goJsonSchemaBindings = (
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
): JsonSchemaBindings => ({
  schemas,
  columns: Object.fromEntries(
    Object.entries(config.sql.codegen?.go?.mappings.column ?? {}).flatMap(([column, mapping]) =>
      typeof mapping === 'object' && 'jsonSchema' in mapping
        ? [
            [
              column,
              {
                schemaName: mapping.jsonSchema,
                runtimeValidation:
                  mapping.runtime?.validate ??
                  config.sql.codegen?.go?.jsonSchemas.runtime?.validate ??
                  false,
              },
            ],
          ]
        : [],
    ),
  ),
})
