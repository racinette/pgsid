import { resolve } from 'node:path'
import type { CatalogSnapshot } from '../../catalog/types.js'
import type { Config } from '../../config/schema.js'
import type { CodegenRenderResult, CodegenTarget } from '../target.js'
import { renderRustSchemaArtifacts } from './schema.js'

export interface CreateRustCodegenTargetOptions {
  baseDirectory: string
  key: string
  catalog?: CatalogSnapshot
}

export function createRustCodegenTarget(
  config: Config,
  options: CreateRustCodegenTargetOptions,
): CodegenTarget | undefined {
  const target = config.sql.codegen?.rust
  if (!target) return undefined
  const schemaOutDir = target.schema ? resolve(options.baseDirectory, target.schema.outDir) : undefined
  return {
    id: 'rust',
    key: JSON.stringify([options.key, schemaOutDir]),
    outputRoots: schemaOutDir ? [schemaOutDir] : [],
    routeQuery() {
      return undefined
    },
    renderQueries(): CodegenRenderResult {
      return { artifacts: [], diagnostics: [] }
    },
    ...(schemaOutDir
      ? {
          renderSchema(input): CodegenRenderResult {
            try {
              return {
                artifacts: renderRustSchemaArtifacts(input.catalog, schemaOutDir).map((artifact) => ({
                  ...artifact,
                  kind: 'schema',
                })),
                diagnostics: [],
              }
            } catch (error) {
              return {
                artifacts: [],
                diagnostics: [
                  {
                    code: 'rust-codegen',
                    severity: 'error',
                    queryId: '<schema>',
                    message: error instanceof Error ? error.message : String(error),
                  },
                ],
              }
            }
          },
        }
      : {}),
  }
}
