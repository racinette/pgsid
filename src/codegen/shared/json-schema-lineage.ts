import type { Config, JsonSchemaDocument, JsonValue } from '../../config/schema.js'
import type { DatabaseColumn, ValueLineage } from '../../query/value-lineage.js'

export interface ColumnJsonSchemaBinding {
  schemaName: string
  runtimeValidation: boolean
}

export interface JsonSchemaBindings {
  schemas: Readonly<Record<string, JsonSchemaDocument>>
  columns: Readonly<Record<string, ColumnJsonSchemaBinding>>
}

export interface JsonSchemaAlternative {
  schemaName: string
  root: DatabaseColumn
  path: readonly (string | number)[]
  document: JsonSchemaDocument
  schema: JsonSchemaDocument
  representation: 'json' | 'text'
  runtimeValidation: boolean
}

export interface JsonSchemaLineage {
  alternatives: readonly JsonSchemaAlternative[]
  /** False when at least one runtime value flows through an unsupported or unmapped path. */
  complete: boolean
}

const columnKey = (column: DatabaseColumn): string =>
  `${column.schema}.${column.relation}.${column.column}`

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
        mapping.runtimeValidation ?? target?.jsonSchemas.runtimeValidation ?? false,
    }
  }
  return { schemas, columns }
}

export function resolveJsonSchemaLineage(
  value: ValueLineage,
  bindings: JsonSchemaBindings,
): JsonSchemaLineage {
  return deduplicate(resolve(value, bindings))
}

const resolve = (value: ValueLineage, bindings: JsonSchemaBindings): JsonSchemaLineage => {
  if (value.kind === 'column') return mappedColumn(value.column, bindings)
  if (value.kind === 'row-absence') return resolve(value.origin, bindings)
  if (value.kind !== 'transform') return { alternatives: [], complete: false }

  if (value.operation.kind === 'assignment') {
    const mapped = mappedColumn(value.operation.target, bindings)
    return bindings.columns[columnKey(value.operation.target)]
      ? mapped
      : resolve(value.inputs[0]!, bindings)
  }

  if (value.operation.kind === 'choice') {
    const inputs = value.inputs.map((input) => resolve(input, bindings))
    return {
      alternatives: inputs.flatMap((input) => input.alternatives),
      complete: inputs.every((input) => input.complete),
    }
  }

  if (value.operation.kind === 'json-access') {
    const operation = value.operation
    const input = resolve(value.inputs[0]!, bindings)
    let complete = input.complete
    const alternatives = input.alternatives.flatMap((alternative) => {
      if (alternative.representation !== 'json') {
        complete = false
        return []
      }
      const resolved = schemaAtPath(alternative.schema, operation.path, alternative.document)
      if (resolved === null) {
        complete = false
        return []
      }
      return [
        {
          ...alternative,
          path: [...alternative.path, ...operation.path],
          schema: resolved,
          representation: operation.result,
        } satisfies JsonSchemaAlternative,
      ]
    })
    return { alternatives, complete }
  }

  if (
    value.operation.kind === 'cast' &&
    (value.resolvedType === 'json' || value.resolvedType === 'jsonb')
  ) {
    const input = resolve(value.inputs[0]!, bindings)
    return {
      alternatives: input.alternatives.map((alternative) => ({
        ...alternative,
        representation: 'json',
      })),
      complete: input.complete,
    }
  }

  return { alternatives: [], complete: false }
}

const mappedColumn = (column: DatabaseColumn, bindings: JsonSchemaBindings): JsonSchemaLineage => {
  const binding = bindings.columns[columnKey(column)]
  const document = binding ? bindings.schemas[binding.schemaName] : undefined
  if (!binding || document === undefined) return { alternatives: [], complete: false }
  return {
    alternatives: [
      {
        schemaName: binding.schemaName,
        root: column,
        path: [],
        document,
        schema: document,
        representation: 'json',
        runtimeValidation: binding.runtimeValidation,
      },
    ],
    complete: true,
  }
}

const deduplicate = (lineage: JsonSchemaLineage): JsonSchemaLineage => {
  const alternatives = new Map<string, JsonSchemaAlternative>()
  for (const alternative of lineage.alternatives) {
    const key = JSON.stringify([
      alternative.schemaName,
      columnKey(alternative.root),
      alternative.path,
      alternative.representation,
      alternative.runtimeValidation,
      alternative.schema,
    ])
    if (!alternatives.has(key)) alternatives.set(key, alternative)
  }
  return { alternatives: [...alternatives.values()], complete: lineage.complete }
}

const isRecord = (value: JsonValue | undefined): value is { [key: string]: JsonValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const schemaArray = (value: JsonValue | undefined): JsonSchemaDocument[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is JsonSchemaDocument => typeof item === 'boolean' || isRecord(item),
      )
    : []

const combine = (
  keyword: 'allOf' | 'anyOf' | 'oneOf',
  schemas: JsonSchemaDocument[],
): JsonSchemaDocument | null => {
  let reduced = schemas
  if (keyword === 'allOf') {
    if (schemas.includes(false)) return false
    reduced = schemas.filter((schema) => schema !== true)
    if (reduced.length === 0) return true
  } else {
    reduced = schemas.filter((schema) => schema !== false)
    if (keyword === 'anyOf' && reduced.includes(true)) return true
    if (reduced.length === 0) return false
  }
  if (reduced.length === 1) return reduced[0]!
  return { [keyword]: reduced }
}

const allowsType = (schema: { [key: string]: JsonValue }, type: 'object' | 'array'): boolean => {
  const declared = schema['type']
  if (typeof declared === 'string') return declared === type
  if (Array.isArray(declared)) return declared.includes(type)
  return true
}

const localReference = (
  reference: string,
  document: JsonSchemaDocument,
): JsonSchemaDocument | null => {
  if (reference === '#') return document
  if (!reference.startsWith('#/')) return null
  let current: JsonValue = document
  for (const encoded of reference.slice(2).split('/')) {
    if (!isRecord(current)) return null
    const segment = encoded.replaceAll('~1', '/').replaceAll('~0', '~')
    const next: JsonValue | undefined = current[segment]
    if (next === undefined) return null
    current = next
  }
  return typeof current === 'boolean' || isRecord(current) ? current : null
}

const schemaAtPath = (
  schema: JsonSchemaDocument,
  path: readonly (string | number)[],
  document: JsonSchemaDocument,
  seen = new Set<string>(),
): JsonSchemaDocument | null => {
  if (path.length === 0 || typeof schema === 'boolean') return schema
  const constraints: JsonSchemaDocument[] = []
  const reference = typeof schema['$ref'] === 'string' ? schema['$ref'] : null
  if (reference) {
    const visit = `${reference}\u0000${JSON.stringify(path)}`
    if (seen.has(visit)) return null
    const target = localReference(reference, document)
    if (target === null) return null
    const nextSeen = new Set(seen)
    nextSeen.add(visit)
    const resolved = schemaAtPath(target, path, document, nextSeen)
    if (resolved === null) return null
    constraints.push(resolved)
  }

  const segment = path[0]!
  const rest = path.slice(1)
  for (const keyword of ['anyOf', 'oneOf'] as const) {
    const branches = schemaArray(schema[keyword])
    if (branches.length) {
      const resolved = branches.map((branch) => schemaAtPath(branch, path, document, new Set(seen)))
      if (resolved.some((branch) => branch === null)) return null
      constraints.push(combine(keyword, resolved as JsonSchemaDocument[])!)
    }
  }
  const allOf = schemaArray(schema['allOf'])
  if (allOf.length) {
    const resolved = allOf.map((branch) => schemaAtPath(branch, path, document, new Set(seen)))
    if (resolved.some((branch) => branch === null)) return null
    constraints.push(...(resolved as JsonSchemaDocument[]))
  }

  let direct: JsonSchemaDocument

  if (typeof segment === 'number') {
    if (!allowsType(schema, 'array')) {
      direct = false
    } else {
      const prefixItems = schemaArray(schema['prefixItems'])
      const items = schema['items']
      if (segment < 0) {
        const candidates = [
          ...prefixItems,
          ...(typeof items === 'boolean' || isRecord(items) ? [items] : []),
        ]
        const resolved = (candidates.length ? candidates : [true]).map((candidate) =>
          schemaAtPath(candidate, rest, document, new Set(seen)),
        )
        if (resolved.some((candidate) => candidate === null)) return null
        direct = combine('anyOf', resolved as JsonSchemaDocument[])!
      } else {
        const selected = prefixItems[segment]
        const candidate =
          selected !== undefined
            ? selected
            : typeof items === 'boolean' || isRecord(items)
              ? items
              : true
        const resolved = schemaAtPath(candidate, rest, document, seen)
        if (resolved === null) return null
        direct = resolved
      }
    }
  } else if (!allowsType(schema, 'object')) {
    direct = false
  } else {
    const selected: JsonSchemaDocument[] = []
    const properties = schema['properties']
    if (isRecord(properties)) {
      const property = properties[segment]
      if (typeof property === 'boolean' || isRecord(property)) selected.push(property)
    }
    const patterns = schema['patternProperties']
    if (isRecord(patterns)) {
      for (const [pattern, candidate] of Object.entries(patterns)) {
        if (typeof candidate !== 'boolean' && !isRecord(candidate)) continue
        let matches: boolean
        try {
          matches = new RegExp(pattern, 'u').test(segment)
        } catch {
          return null
        }
        if (matches) selected.push(candidate)
      }
    }
    if (selected.length === 0) {
      const additional = schema['additionalProperties'] ?? schema['unevaluatedProperties']
      if (typeof additional === 'boolean' || isRecord(additional)) selected.push(additional)
      else selected.push(true)
    }
    const resolved = selected.map((candidate) =>
      schemaAtPath(candidate, rest, document, new Set(seen)),
    )
    if (resolved.some((candidate) => candidate === null)) return null
    direct = combine('allOf', resolved as JsonSchemaDocument[])!
  }
  constraints.push(direct)
  return combine('allOf', constraints)
}
