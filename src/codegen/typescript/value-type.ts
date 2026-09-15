import type { Config } from '../../config/schema.js'
import type { DatabaseColumn, ValueLineage } from '../../query/value-lineage.js'
import {
  resolveJsonSchemaLineage,
  type JsonSchemaBindings,
  type JsonSchemaLineage,
} from '../shared/json-schema-lineage.js'
import { parseType } from './ast.js'
import { typescriptTypeFromJsonSchemaLineage } from './json-schema.js'
import type { ResolvedTypescriptType } from './type-mapping.js'

export interface ResolvedTypescriptValueType extends ResolvedTypescriptType {
  lineage?: JsonSchemaLineage
}

export function resolveTypescriptValueType(
  value: ValueLineage | undefined,
  config: Config,
  bindings: JsonSchemaBindings,
): ResolvedTypescriptValueType | null {
  if (!value) return null
  const lineage = resolveJsonSchemaLineage(value, bindings)
  if (lineage.alternatives.length || lineage.complete) {
    return { type: typescriptTypeFromJsonSchemaLineage(lineage), imports: [], lineage }
  }
  const column = directColumn(value)
  if (!column) return null
  const mapping = config.sql.codegen?.typescript?.mappings.column[columnKey(column)]
  if (!mapping || (typeof mapping === 'object' && 'jsonSchema' in mapping)) return null
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
