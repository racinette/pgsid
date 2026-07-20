import { z } from 'zod'

export const engineSchema = z
  .object({
    poolSize: z.number().int().min(1).max(16).default(2),
  })
  .default({})

export const typecheckSchema = z
  .object({
    plpgsql: z.boolean().default(true),
  })
  .default({})

export const typeMappingsSchema = z
  .object({
    pgType: z.record(z.string(), z.string()).default({}),
    column: z.record(z.string(), z.string()).default({}),
  })
  .default({})

export const schemaCodegenSchema = z.object({
  outDir: z.string(),
})

export const queryOutEntrySchema = z.union([
  z.string(),
  z.object({
    types: z.string(),
    wrappers: z.string().optional(),
  }),
])

export const queriesCodegenSchema = z
  .object({
    exclude: z.array(z.string()).default([]),
    out: z.record(z.string(), queryOutEntrySchema).default({}),
  })
  .default({})

export const typescriptCodegenSchema = z
  .object({
    target: z.enum(['pg']).default('pg'),
    convention: z.enum(['sqlc']).default('sqlc'),
    brands: z.array(z.string()).default(['__brand']),
    typeMappings: typeMappingsSchema,
    schema: schemaCodegenSchema.optional(),
    queries: queriesCodegenSchema,
  })
  .default({})

export const codegenSchema = z.object({
  typescript: typescriptCodegenSchema.optional(),
})

export const sqlSchema = z.object({
  paths: z.array(z.string()).default([]),
  searchPath: z.array(z.string()).default(['public']),
  typecheck: typecheckSchema,
  codegen: codegenSchema.optional(),
})

export const configSchema = z.object({
  schema: z.union([z.string(), z.array(z.string())]).transform((v) => (Array.isArray(v) ? v : [v])),
  engine: engineSchema,
  sql: sqlSchema.default({}),
})

export type Config = z.infer<typeof configSchema>
export type EngineConfig = z.infer<typeof engineSchema>
export type TypecheckConfig = z.infer<typeof typecheckSchema>
export type TypeMappingsConfig = z.infer<typeof typeMappingsSchema>
export type TypescriptCodegenConfig = z.infer<typeof typescriptCodegenSchema>
export type CodegenConfig = z.infer<typeof codegenSchema>
export type SqlConfig = z.infer<typeof sqlSchema>
export type QueryOutEntry = z.infer<typeof queryOutEntrySchema>
