import { join } from 'node:path'
import type { Config, JsonSchemaDocument } from '../../config/schema.js'
import { exportModifier, factory, printFile } from './ast.js'
import {
  createTypescriptJsonSchemaTypes,
  assertUniqueTypescriptJsonSchemaNames,
} from './json-schema-types.js'
import { typescriptJsonSchemaValidatorDeclaration } from './json-schema-validator.js'
import { typescriptModuleSpecifier } from './paths.js'
import { importedTypescriptType } from './type-mapping.js'
import { typeName } from './type-mapping.js'
import { queryValidationErrorDeclarations } from './validation-diagnostics.js'

export const createTypescriptJsonSchemaGraphs = (
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
) => {
  const names = new Set(
    Object.values(config.sql.codegen?.typescript?.mappings.column ?? {}).flatMap((mapping) =>
      typeof mapping === 'object' && 'jsonSchema' in mapping ? [mapping.jsonSchema] : [],
    ),
  )
  const graphs = new Map(
    [...names].sort().map((name) => {
      const schema = schemas[name]
      if (schema === undefined) throw new Error(`Missing JSON Schema ${JSON.stringify(name)}`)
      return [name, createTypescriptJsonSchemaTypes(schema, typeName(name))] as const
    }),
  )
  assertUniqueTypescriptJsonSchemaNames([...graphs.values()].flatMap((graph) => graph.declarations))
  const filenames = new Set<string>()
  for (const name of graphs.keys()) {
    const file = typeName(name)
    if (file.toLowerCase() === 'index' || filenames.has(file.toLowerCase()))
      throw new Error(`JSON Schema filenames collide as ${file}`)
    filenames.add(file.toLowerCase())
  }
  return graphs
}

export const renderTypescriptJsonSchemaArtifacts = (
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  directory: string,
) => {
  const graphs = createTypescriptJsonSchemaGraphs(config, schemas)
  if (!graphs.size) return []
  return [
    ...[...graphs].map(([name, graph]) => ({
      path: join(directory, `${typeName(name)}.d.ts`),
      content: printFile(
        graph.declarations.map((entry) =>
          factory.createTypeAliasDeclaration([exportModifier], entry.name, undefined, entry.type),
        ),
      ),
    })),
    {
      path: join(directory, 'index.d.ts'),
      content: printFile(
        [...graphs.keys()].map((name) =>
          factory.createExportDeclaration(
            undefined,
            true,
            undefined,
            factory.createStringLiteral(`./${typeName(name)}.js`),
          ),
        ),
      ),
    },
  ]
}

export const renderTypescriptJsonSchemaRuntimeArtifacts = (
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  typesDirectory: string,
  directory: string,
) => {
  const graphs = createTypescriptJsonSchemaGraphs(config, schemas)
  if (!graphs.size) return []
  return [
    {
      path: join(directory, 'pgsid', 'validation.ts'),
      content: printFile(queryValidationErrorDeclarations()),
    },
    ...[...graphs].map(([name, graph]) => {
      const path = join(directory, `${typeName(name)}.ts`)
      const typesModule = typescriptModuleSpecifier(
        path,
        join(typesDirectory, `${typeName(name)}.d.ts`),
      )
      return {
        path,
        content: printFile(
          graph.declarations.flatMap((entry) =>
            [false, true].map((diagnostic) =>
              typescriptJsonSchemaValidatorDeclaration(
                `${diagnostic ? 'validate' : 'is'}${entry.name}`,
                importedTypescriptType(typesModule, entry.name),
                entry.schema,
                { document: schemas[name]!, diagnostic },
              ),
            ),
          ),
        ),
      }
    }),
    {
      path: join(directory, 'index.ts'),
      content: printFile(
        [...graphs.keys()]
          .map((name) =>
            factory.createExportDeclaration(
              undefined,
              false,
              undefined,
              factory.createStringLiteral(`./${typeName(name)}.js`),
            ),
          )
          .concat([
            factory.createExportDeclaration(
              undefined,
              false,
              undefined,
              factory.createStringLiteral('./pgsid/validation.js'),
            ),
          ]),
      ),
    },
  ]
}
