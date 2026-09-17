import { z } from 'zod'
import { isPortableGoSchemaDirectory } from '../codegen/go/names.js'

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

export const materializedViewNullabilityModeSchema = z.enum(['definition', 'conservative'])

export const materializedViewsNullabilitySchema = z
  .object({
    default: materializedViewNullabilityModeSchema.default('definition'),
    overrides: z.record(z.string().min(1), materializedViewNullabilityModeSchema).default({}),
  })
  .strict()
  .default({})

export const nullabilityAnalysisSchema = z
  .object({
    materializedViews: materializedViewsNullabilitySchema,
  })
  .strict()
  .default({})

export const analysisSchema = z
  .object({
    nullability: nullabilityAnalysisSchema,
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

export const arrayDimensionsMappingSchema = z
  .object({
    dimensions: z.union([
      z.number().int().positive().max(6),
      z
        .array(z.number().int().positive().max(6))
        .min(1)
        .refine(
          (values) => new Set(values).size === values.length,
          'Array dimensions must be unique',
        ),
    ]),
  })
  .strict()

export const columnMappingSchema = z.union([
  targetTypeMappingSchema,
  arrayDimensionsMappingSchema,
  z
    .object({
      jsonSchema: z.string().min(1),
      runtime: z.object({ validate: z.boolean().optional() }).strict().optional(),
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
    types: z.string().min(1).optional(),
    runtime: z
      .union([
        z
          .string()
          .min(1)
          .transform((outDir) => ({ outDir, validate: true })),
        z.object({ outDir: z.string().min(1), validate: z.boolean().default(true) }).strict(),
      ])
      .optional(),
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
      runtime: z.string().optional(),
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

export const goTypeImportSchema = z
  .object({
    path: z.string().min(1),
    as: z.string().min(1).optional(),
  })
  .strict()

export const goTargetTypeMappingSchema = z.union([
  z.string().min(1),
  z
    .object({
      type: z.string().min(1),
      imports: z.array(goTypeImportSchema).min(1).optional(),
    })
    .strict(),
])

export const goColumnMappingSchema = z.union([
  goTargetTypeMappingSchema,
  arrayDimensionsMappingSchema,
  z
    .object({
      jsonSchema: z.string().min(1),
      runtime: z.object({ validate: z.boolean().optional() }).strict().optional(),
    })
    .strict(),
])

export const goMappingsSchema = z
  .object({
    pgType: z.record(z.string(), goTargetTypeMappingSchema).default({}),
    column: z.record(z.string(), goColumnMappingSchema).default({}),
  })
  .strict()
  .default({})

export const goQueriesCodegenSchema = z
  .object({
    exclude: z.array(z.string()).default([]),
    out: z
      .record(
        z.string(),
        z.union([
          z.string(),
          z.object({ outDir: z.string(), importPath: z.string().min(1).optional() }).strict(),
        ]),
      )
      .default({}),
  })
  .strict()
  .default({})

const goKeywords = new Set([
  'break',
  'case',
  'chan',
  'const',
  'continue',
  'default',
  'defer',
  'else',
  'fallthrough',
  'for',
  'func',
  'go',
  'goto',
  'if',
  'import',
  'interface',
  'map',
  'package',
  'range',
  'return',
  'select',
  'struct',
  'switch',
  'type',
  'var',
])

const goPackageSchema = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/u)
  .refine((name) => !goKeywords.has(name), 'Go package name cannot be a keyword')

export const goCodegenSchema = z
  .object({
    package: goPackageSchema.optional(),
    domains: z.boolean().default(true),
    driver: z.enum(['pgx']).default('pgx'),
    nulls: z.enum(['pointers', 'structs']).default('pointers'),
    jsonSchemas: z
      .object({
        nulls: z.enum(['pointers', 'structs']).optional(),
        runtime: z
          .object({ validate: z.boolean().default(true) })
          .strict()
          .optional(),
      })
      .strict()
      .default({}),
    mappings: goMappingsSchema,
    schema: schemaCodegenSchema
      .extend({
        importPath: z.string().min(1).optional(),
        names: z
          .record(
            z.string(),
            z
              .string()
              .refine(
                isPortableGoSchemaDirectory,
                'Go schema directory must be a portable lowercase ASCII path segment',
              ),
          )
          .default({}),
      })
      .optional(),
    queries: goQueriesCodegenSchema,
  })
  .strict()
  .default({})

export const codegenSchema = z
  .object({
    typescript: typescriptCodegenSchema.optional(),
    go: goCodegenSchema.optional(),
  })
  .strict()

export const sqlSchema = z
  .object({
    paths: z.array(z.string()).default([]),
    searchPath: z.array(z.string()).default(['public']),
    typecheck: typecheckSchema,
    analysis: analysisSchema,
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
    const typescript = config.sql.codegen?.typescript
    if (
      typescript &&
      !typescript.jsonSchemas.runtime &&
      Object.values(typescript.queries.out).some(
        (output) => typeof output === 'object' && output.runtime !== undefined,
      )
    ) {
      for (const [column, mapping] of Object.entries(typescript.mappings.column)) {
        if (
          typeof mapping === 'object' &&
          'jsonSchema' in mapping &&
          mapping.runtime?.validate === true
        )
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Automatic JSON Schema validation requires jsonSchemas.runtime output',
            path: [
              'sql',
              'codegen',
              'typescript',
              'mappings',
              'column',
              column,
              'runtime',
              'validate',
            ],
          })
      }
    }
    for (const target of ['typescript', 'go'] as const) {
      const columns = config.sql.codegen?.[target]?.mappings.column ?? {}
      for (const [column, mapping] of Object.entries(columns)) {
        if (typeof mapping === 'string' || !('jsonSchema' in mapping)) continue
        if (Object.prototype.hasOwnProperty.call(config.types.jsonSchemas, mapping.jsonSchema))
          continue

        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown JSON Schema ${JSON.stringify(mapping.jsonSchema)}`,
          path: ['sql', 'codegen', target, 'mappings', 'column', column, 'jsonSchema'],
        })
      }
    }
  })

export type Config = z.infer<typeof configSchema>
export type TypesConfig = z.infer<typeof typesSchema>
export type JsonSchemaDefinition = z.infer<typeof jsonSchemaDefinitionSchema>
export type JsonSchemaDocument = z.infer<typeof jsonSchemaDocumentSchema>
export type EngineConfig = z.infer<typeof engineSchema>
export type TypecheckConfig = z.infer<typeof typecheckSchema>
export type MaterializedViewNullabilityMode = z.infer<typeof materializedViewNullabilityModeSchema>
export type MaterializedViewsNullabilityConfig = z.infer<typeof materializedViewsNullabilitySchema>
export type NullabilityAnalysisConfig = z.infer<typeof nullabilityAnalysisSchema>
export type AnalysisConfig = z.infer<typeof analysisSchema>
export type TypeImport = z.infer<typeof typeImportSchema>
export type TargetTypeMapping = z.infer<typeof targetTypeMappingSchema>
export type ColumnMapping = z.infer<typeof columnMappingSchema>
export type ArrayDimensionsMapping = z.infer<typeof arrayDimensionsMappingSchema>
export type MappingsConfig = z.infer<typeof mappingsSchema>
export type TypescriptJsonSchemasConfig = z.infer<typeof typescriptJsonSchemasSchema>
export type TypescriptCodegenConfig = z.infer<typeof typescriptCodegenSchema>
export type GoTypeImport = z.infer<typeof goTypeImportSchema>
export type GoTargetTypeMapping = z.infer<typeof goTargetTypeMappingSchema>
export type GoColumnMapping = z.infer<typeof goColumnMappingSchema>
export type GoMappingsConfig = z.infer<typeof goMappingsSchema>
export type GoCodegenConfig = z.infer<typeof goCodegenSchema>
export type CodegenConfig = z.infer<typeof codegenSchema>
export type SqlConfig = z.infer<typeof sqlSchema>
export type QueryOutEntry = z.infer<typeof queryOutEntrySchema>
