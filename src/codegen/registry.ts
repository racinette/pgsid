import { createHash } from 'node:crypto'
import type { Config, JsonSchemaDocument } from '../config/schema.js'
import type { CatalogSnapshot } from '../catalog/types.js'
import type { CodegenTarget } from './target.js'
import { createGoCodegenTarget } from './go/target.js'
import { createTypescriptCodegenTarget } from './typescript/target.js'

export interface CreateCodegenTargetsOptions {
  baseDirectory?: string
  catalog?: CatalogSnapshot
}

export function createCodegenTargets(
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  options: CreateCodegenTargetsOptions = {},
): readonly CodegenTarget[] {
  const targets = [
    createTypescriptCodegenTarget(config, schemas, {
      baseDirectory: options.baseDirectory ?? process.cwd(),
      key: hash(
        stableJson([
          config.sql.codegen?.typescript ?? null,
          schemas,
          options.catalog?.domains ?? null,
          options.catalog?.enums ?? null,
          options.catalog
            ? [
                ...options.catalog.tables,
                ...options.catalog.views,
                ...options.catalog.materializedViews,
              ].map(({ schema, name, columns }) => ({
                schema,
                name,
                columns: columns.map(({ name, typeOid, typeName }) => ({
                  name,
                  typeOid,
                  typeName,
                })),
              }))
            : null,
        ]),
      ),
      catalog: options.catalog,
    }),
    createGoCodegenTarget(config, schemas, {
      baseDirectory: options.baseDirectory ?? process.cwd(),
      key: hash(
        stableJson([
          config.sql.codegen?.go ?? null,
          schemas,
          options.catalog?.domains ?? null,
          options.catalog?.enums ?? null,
          options.catalog?.compositeTypes ?? null,
        ]),
      ),
      catalog: options.catalog,
    }),
  ].filter((target): target is CodegenTarget => target !== undefined)
  assertUniqueTargetIds(targets)
  return targets
}

const assertUniqueTargetIds = (targets: readonly CodegenTarget[]): void => {
  const ids = new Set<string>()
  for (const target of targets) {
    if (ids.has(target.id)) throw new Error(`Duplicate codegen target ${JSON.stringify(target.id)}`)
    ids.add(target.id)
  }
}

const stableJson = (value: unknown): string => JSON.stringify(canonical(value))
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, item]) => [key, canonical(item)]),
    )
  }
  return value
}

const hash = (content: string): string => createHash('sha256').update(content).digest('hex')
const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0
