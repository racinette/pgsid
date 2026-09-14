import type { JsonSchemaDocument, JsonValue } from '../config/schema.js'
import type { JsonSchemaLineage } from './json-schema-lineage.js'

export interface RenderTypescriptJsonSchemaOptions {
  document?: JsonSchemaDocument
}

export interface RenderTypescriptJsonSchemaLineageOptions {
  fallbackType?: string
}

export function renderTypescriptJsonSchema(
  schema: JsonSchemaDocument,
  options: RenderTypescriptJsonSchemaOptions = {},
): string {
  return render(schema, options.document ?? schema, new Set())
}

export function renderTypescriptJsonSchemaLineage(
  lineage: JsonSchemaLineage,
  options: RenderTypescriptJsonSchemaLineageOptions = {},
): string {
  const alternatives = lineage.alternatives.map((alternative) =>
    alternative.representation === 'text'
      ? 'string'
      : renderTypescriptJsonSchema(alternative.schema, { document: alternative.document }),
  )
  if (!lineage.complete) alternatives.push(options.fallbackType ?? 'unknown')
  return union(alternatives)
}

const isRecord = (value: JsonValue | undefined): value is { [key: string]: JsonValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const schemas = (value: JsonValue | undefined): JsonSchemaDocument[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is JsonSchemaDocument => typeof item === 'boolean' || isRecord(item),
      )
    : []

const unique = (types: readonly string[]): string[] => [...new Set(types)]

const union = (types: readonly string[]): string => {
  const members = unique(types).filter((type) => type !== 'never')
  if (members.includes('unknown') || members.length === 0)
    return members.length ? 'unknown' : 'never'
  return members.length === 1 ? members[0]! : members.map(parenthesize).join(' | ')
}

const intersection = (types: readonly string[]): string => {
  if (types.includes('never')) return 'never'
  const members = unique(types).filter((type) => type !== 'unknown')
  if (members.length === 0) return 'unknown'
  return members.length === 1 ? members[0]! : members.map(parenthesize).join(' & ')
}

const parenthesize = (type: string): string =>
  type.includes(' | ') || type.includes(' & ') ? `(${type})` : type

const literal = (value: JsonValue): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`
  const fields = Object.entries(value).map(
    ([key, item]) => `${JSON.stringify(key)}: ${literal(item)}`,
  )
  return `{ ${fields.join('; ')} }`
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

const render = (
  schema: JsonSchemaDocument,
  document: JsonSchemaDocument,
  seen: Set<string>,
): string => {
  if (schema === true) return 'unknown'
  if (schema === false) return 'never'

  const constraints: string[] = []
  const reference = typeof schema['$ref'] === 'string' ? schema['$ref'] : null
  if (reference) {
    if (seen.has(reference)) constraints.push('unknown')
    else {
      const target = localReference(reference, document)
      if (target === null) constraints.push('unknown')
      else {
        const nextSeen = new Set(seen)
        nextSeen.add(reference)
        constraints.push(render(target, document, nextSeen))
      }
    }
  }

  const allOf = schemas(schema['allOf'])
  constraints.push(...allOf.map((candidate) => render(candidate, document, new Set(seen))))
  for (const keyword of ['anyOf', 'oneOf'] as const) {
    const alternatives = schemas(schema[keyword])
    if (alternatives.length) {
      constraints.push(
        union(alternatives.map((candidate) => render(candidate, document, new Set(seen)))),
      )
    }
  }

  const direct = renderDirect(schema, document, seen)
  if (direct !== null) constraints.push(direct)
  return constraints.length ? intersection(constraints) : 'unknown'
}

const renderDirect = (
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  seen: Set<string>,
): string | null => {
  if (schema['const'] !== undefined) return literal(schema['const'])
  const enumValues = Array.isArray(schema['enum']) ? schema['enum'] : []
  if (enumValues.length) return union(enumValues.map(literal))

  const declared = schema['type']
  if (Array.isArray(declared)) {
    const types = declared.filter((type): type is string => typeof type === 'string')
    return union(types.map((type) => renderDeclared(type, schema, document, seen)))
  }
  if (typeof declared === 'string') return renderDeclared(declared, schema, document, seen)
  if (
    schema['properties'] !== undefined ||
    schema['additionalProperties'] !== undefined ||
    schema['patternProperties'] !== undefined
  ) {
    return renderObject(schema, document, seen)
  }
  if (schema['items'] !== undefined || schema['prefixItems'] !== undefined) {
    return renderArray(schema, document, seen)
  }
  return null
}

const renderDeclared = (
  type: string,
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  seen: Set<string>,
): string => {
  if (type === 'null') return 'null'
  if (type === 'boolean') return 'boolean'
  if (type === 'number' || type === 'integer') return 'number'
  if (type === 'string') return 'string'
  if (type === 'object') return renderObject(schema, document, seen)
  if (type === 'array') return renderArray(schema, document, seen)
  return 'unknown'
}

const renderObject = (
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  seen: Set<string>,
): string => {
  const properties = isRecord(schema['properties']) ? schema['properties'] : {}
  const required = new Set(
    Array.isArray(schema['required'])
      ? schema['required'].filter((name): name is string => typeof name === 'string')
      : [],
  )
  const entries = new Map<string, string>()
  for (const [name, property] of Object.entries(properties)) {
    if (typeof property !== 'boolean' && !isRecord(property)) continue
    entries.set(name, render(property, document, new Set(seen)))
  }
  for (const name of required) if (!entries.has(name)) entries.set(name, 'unknown')

  const fields = [...entries].map(
    ([name, type]) => `${JSON.stringify(name)}${required.has(name) ? '' : '?'}: ${type}`,
  )
  const patternTypes = isRecord(schema['patternProperties'])
    ? Object.values(schema['patternProperties'])
        .filter(
          (candidate): candidate is JsonSchemaDocument =>
            typeof candidate === 'boolean' || isRecord(candidate),
        )
        .map((candidate) => render(candidate, document, new Set(seen)))
    : []
  const additional = schema['additionalProperties'] ?? schema['unevaluatedProperties'] ?? true
  if (additional !== false || patternTypes.length > 0) {
    const extraType =
      additional === false
        ? 'never'
        : typeof additional === 'boolean' || isRecord(additional)
          ? render(additional, document, new Set(seen))
          : 'unknown'
    const optional = [...entries].some(([name]) => !required.has(name)) ? ['undefined'] : []
    fields.push(
      `[key: string]: ${union([extraType, ...entries.values(), ...patternTypes, ...optional])}`,
    )
  } else if (fields.length === 0) {
    return 'Record<string, never>'
  }
  return `{ ${fields.join('; ')} }`
}

const renderArray = (
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  seen: Set<string>,
): string => {
  const prefix = schemas(schema['prefixItems'])
  const items = schema['items']
  if (prefix.length === 0) {
    const itemType =
      typeof items === 'boolean' || isRecord(items)
        ? render(items, document, new Set(seen))
        : 'unknown'
    return `${parenthesize(itemType)}[]`
  }

  const minimum =
    typeof schema['minItems'] === 'number' && Number.isInteger(schema['minItems'])
      ? Math.max(0, schema['minItems'])
      : 0
  const maximum =
    typeof schema['maxItems'] === 'number' && Number.isInteger(schema['maxItems'])
      ? Math.max(0, schema['maxItems'])
      : null
  if (items === false && (minimum > prefix.length || (maximum !== null && maximum < minimum))) {
    return 'never'
  }
  const visiblePrefix = maximum === null ? prefix : prefix.slice(0, maximum)
  const members = visiblePrefix.map((candidate, index) => {
    const type = render(candidate, document, new Set(seen))
    return index < minimum ? type : `${parenthesize(type)}?`
  })
  if (items !== false) {
    const itemType =
      typeof items === 'boolean' || isRecord(items)
        ? render(items, document, new Set(seen))
        : 'unknown'
    members.push(`...${parenthesize(itemType)}[]`)
  }
  return `[${members.join(', ')}]`
}
