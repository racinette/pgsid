import type { CatalogSnapshot } from '../../catalog/types.js'
import type { Config } from '../../config/schema.js'
import type { DatabaseColumn, ValueLineage } from '../../query/value-lineage.js'
import {
  resolveJsonSchemaLineage,
  type JsonSchemaBindings,
  type JsonSchemaLineage,
} from '../shared/json-schema-lineage.js'
import { factory, parseType, unionType } from './ast.js'
import { typescriptTypeFromJsonSchemaLineage } from './json-schema.js'
import {
  resolveTypescriptColumnType,
  resolveTypescriptPgType,
  type ResolvedTypescriptType,
  type TypescriptTypeContext,
} from './type-mapping.js'
import { typescriptTypeFromJsonSchema } from './json-schema.js'
import ts from 'typescript'

export interface ResolvedTypescriptValueType extends ResolvedTypescriptType {
  lineage?: JsonSchemaLineage
}

export function resolveTypescriptValueType(
  value: ValueLineage | undefined,
  config: Config,
  bindings: JsonSchemaBindings,
  catalog?: CatalogSnapshot,
  context?: TypescriptTypeContext,
): ResolvedTypescriptValueType | null {
  if (!value) return null
  const lineage = resolveJsonSchemaLineage(value, bindings)
  if (lineage.alternatives.length || lineage.complete) {
    const type =
      context?.jsonSchemaReference && context.jsonSchemaTypes
        ? unionType([
            ...lineage.alternatives.map((alternative) =>
              alternative.representation === 'text'
                ? factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                : (context
                    .jsonSchemaTypes!.get(alternative.schemaName)
                    ?.resolve(alternative.schema, context.jsonSchemaReference!) ??
                  typescriptTypeFromJsonSchema(alternative.schema, {
                    document: alternative.document,
                  })),
            ),
            ...(!lineage.complete ? [parseType('unknown')] : []),
          ])
        : typescriptTypeFromJsonSchemaLineage(lineage)
    return { type, imports: [], lineage }
  }
  const column = directColumn(value)
  if (!column)
    return catalog && value.resolvedType
      ? resolveTypescriptPgType(value.resolvedType, config, catalog, undefined, undefined, context)
      : null
  const mapping = config.sql.codegen?.typescript?.mappings.column[columnKey(column)]
  if (!mapping) {
    const relation = [
      ...(catalog?.tables ?? []),
      ...(catalog?.views ?? []),
      ...(catalog?.materializedViews ?? []),
    ].find((item) => item.schema === column.schema && item.name === column.relation)
    const info = relation?.columns.find((item) => item.name === column.column)
    return info && catalog
      ? resolveTypescriptColumnType(
          column.schema,
          column.relation,
          info,
          catalog,
          config,
          bindings.schemas,
          context,
        )
      : null
  }
  if (typeof mapping === 'object' && 'jsonSchema' in mapping) return null
  return typeof mapping === 'string'
    ? { type: parseType(mapping), imports: [] }
    : { type: parseType(mapping.type), imports: [...(mapping.imports ?? [])] }
}

const directColumn = (value: ValueLineage): DatabaseColumn | null =>
  value.kind === 'column'
    ? value.column
    : value.kind === 'row-absence'
      ? directColumn(value.origin)
      : null

const columnKey = (column: DatabaseColumn): string =>
  `${column.schema}.${column.relation}.${column.column}`
