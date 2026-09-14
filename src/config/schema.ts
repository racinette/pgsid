import { z } from 'zod'

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
)

export const jsonSchemaDocumentSchema = z.union([
  z.boolean(),
  z.record(z.string(), jsonValueSchema),
])

export const jsonSchemaDefinitionSchema = z.union([
  z.object({ file: z.string().min(1) }).strict(),
  z.object({ schema: jsonSchemaDocumentSchema }).strict(),
])

export const typesSchema = z
  .object({
    jsonSchemas: z.record(z.string().min(1), jsonSchemaDefinitionSchema).default({}),
  })
  .strict()
  .default({})

export const engineSchema = z
  .object({
    poolSize: z.number().int().min(1).max(16).default(2),
  })
  .strict()
  .default({})

export const typecheckSchema = z
  .object({
    plpgsql: z.boolean().default(true),
  })
  .strict()
  .default({})

export const typeImportSchema = z.union([
  z.object({ from: z.string().min(1), default: z.string().min(1) }).strict(),
  z
    .object({
      from: z.string().min(1),
      name: z.string().min(1),
      as: z.string().min(1).optional(),
    })
    .strict(),
  z.object({ from: z.string().min(1), namespace: z.string().min(1) }).strict(),
])

export const targetTypeMappingSchema = z.union([
  z.string().min(1),
  z
    .object({
      type: z.string().min(1),
      imports: z.array(typeImportSchema).min(1).optional(),
    })
    .strict(),
])

export const columnMappingSchema = z.union([
  targetTypeMappingSchema,
  z
    .object({
      jsonSchema: z.string().min(1),
      runtimeValidation: z.boolean().optional(),
    })
    .strict(),
])

export const mappingsSchema = z
  .object({
    pgType: z.record(z.string(), targetTypeMappingSchema).default({}),
    column: z.record(z.string(), columnMappingSchema).default({}),
  })
  .strict()
  .default({})

export const typescriptJsonSchemasSchema = z
  .object({
    runtimeValidation: z.boolean().default(false),
  })
  .strict()
  .default({})

export const schemaCodegenSchema = z
  .object({
    outDir: z.string(),
  })
  .strict()

export const queryOutEntrySchema = z.union([
  z.string(),
  z
    .object({
      types: z.string(),
      wrappers: z.string().optional(),
    })
    .strict(),
])

export const queriesCodegenSchema = z
  .object({
    exclude: z.array(z.string()).default([]),
    out: z.record(z.string(), queryOutEntrySchema).default({}),
  })
  .strict()
  .default({})

export const typescriptCodegenSchema = z
  .object({
    driver: z.enum(['pg']).default('pg'),
    convention: z.enum(['sqlc']).default('sqlc'),
    brands: z.array(z.string()).default(['__brand']),
    mappings: mappingsSchema,
    jsonSchemas: typescriptJsonSchemasSchema,
    schema: schemaCodegenSchema.optional(),
    queries: queriesCodegenSchema,
  })
  .strict()
  .default({})

export const codegenSchema = z
  .object({
    typescript: typescriptCodegenSchema.optional(),
  })
  .strict()

export const sqlSchema = z
  .object({
    paths: z.array(z.string()).default([]),
    searchPath: z.array(z.string()).default(['public']),
    typecheck: typecheckSchema,
    codegen: codegenSchema.optional(),
  })
  .strict()

export const configSchema = z
  .object({
    schema: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : [v])),
    types: typesSchema,
    engine: engineSchema,
    sql: sqlSchema.default({}),
  })
  .strict()
  .superRefine((config, context) => {
    const columns = config.sql.codegen?.typescript?.mappings.column ?? {}

    for (const [column, mapping] of Object.entries(columns)) {
      if (typeof mapping === 'string' || !('jsonSchema' in mapping)) continue
      if (Object.prototype.hasOwnProperty.call(config.types.jsonSchemas, mapping.jsonSchema))
        continue

      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown JSON Schema ${JSON.stringify(mapping.jsonSchema)}`,
        path: ['sql', 'codegen', 'typescript', 'mappings', 'column', column, 'jsonSchema'],
      })
    }
  })

export type Config = z.infer<typeof configSchema>
export type TypesConfig = z.infer<typeof typesSchema>
export type JsonSchemaDefinition = z.infer<typeof jsonSchemaDefinitionSchema>
export type JsonSchemaDocument = z.infer<typeof jsonSchemaDocumentSchema>
export type EngineConfig = z.infer<typeof engineSchema>
export type TypecheckConfig = z.infer<typeof typecheckSchema>
export type TypeImport = z.infer<typeof typeImportSchema>
export type TargetTypeMapping = z.infer<typeof targetTypeMappingSchema>
export type ColumnMapping = z.infer<typeof columnMappingSchema>
export type MappingsConfig = z.infer<typeof mappingsSchema>
export type TypescriptJsonSchemasConfig = z.infer<typeof typescriptJsonSchemasSchema>
export type TypescriptCodegenConfig = z.infer<typeof typescriptCodegenSchema>
export type CodegenConfig = z.infer<typeof codegenSchema>
export type SqlConfig = z.infer<typeof sqlSchema>
export type QueryOutEntry = z.infer<typeof queryOutEntrySchema>
