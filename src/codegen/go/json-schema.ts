import type { JsonSchemaDocument, JsonValue } from '../../config/schema.js'
import { go, type GoExpression, type GoField } from './ast.js'
import { nullStruct, type GoNulls } from './nulls.js'
import { assertUniqueGoNames, goName } from './names.js'

export interface GoJsonSchemaOptions {
  document?: JsonSchemaDocument
  rootName?: string
  rootType?: () => GoExpression
  nulls?: GoNulls
  objectType?: (
    schema: JsonSchemaDocument,
    path: readonly string[],
    build: () => GoExpression,
  ) => GoExpression
  referenceType?: (schema: JsonSchemaDocument) => GoExpression | undefined
}

export function goTypeFromJsonSchema(
  schema: JsonSchemaDocument,
  options: GoJsonSchemaOptions = {},
): GoExpression {
  return compile(
    schema,
    options.document ?? schema,
    options.rootName,
    new Set(),
    options.nulls ?? 'pointers',
    [],
    options,
  )
}

const compile = (
  schema: JsonSchemaDocument,
  document: JsonSchemaDocument,
  rootName: string | undefined,
  seen: ReadonlySet<string>,
  policy: GoNulls,
  path: readonly string[],
  options: GoJsonSchemaOptions,
): GoExpression => {
  if (typeof schema === 'boolean')
    return policy === 'structs' && schema ? nullStruct('Null', go.any()) : go.any()
  const reference = typeof schema['$ref'] === 'string' ? schema['$ref'] : undefined
  if (reference) {
    if (reference === '#' && rootName) return go.pointer(options.rootType?.() ?? go.ident(rootName))
    const target = localReference(reference, document)
    if (seen.has(reference))
      return target === null ? go.any() : (options.referenceType?.(target) ?? go.any())
    if (target !== null) {
      return compile(
        target,
        document,
        rootName,
        new Set([...seen, reference]),
        policy,
        reference === '#'
          ? []
          : reference
              .slice(2)
              .split('/')
              .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~')),
        options,
      )
    }
  }

  const alternatives = schemaArray(schema['oneOf']).length
    ? schemaArray(schema['oneOf'])
    : schemaArray(schema['anyOf'])
  if (alternatives.length)
    return compileAlternatives(alternatives, document, rootName, seen, policy, path, options)

  const all = schemaArray(schema['allOf'])
  if (all.length === 1 && directKind(schema) === undefined) {
    return compile(all[0]!, document, rootName, seen, policy, [...path, 'allOf', '0'], options)
  }
  if (all.length > 0) return go.any()

  const declared = schema['type']
  if (Array.isArray(declared)) {
    const types = declared.filter((item): item is string => typeof item === 'string')
    const nonNull = [...new Set(types.filter((item) => item !== 'null'))]
    if (nonNull.length !== 1)
      return policy === 'structs' && types.includes('null') ? nullable(go.any(), policy) : go.any()
    const type = compileDeclared(
      nonNull[0]!,
      schema,
      document,
      rootName,
      seen,
      policy,
      path,
      options,
    )
    return types.includes('null') ? nullable(type, policy) : type
  }
  if (typeof declared === 'string') {
    return compileDeclared(declared, schema, document, rootName, seen, policy, path, options)
  }
  const inferred = directKind(schema)
  const result = inferred
    ? compileDeclared(inferred, schema, document, rootName, seen, policy, path, options)
    : literal(schema)
  return policy === 'structs' && allowsNull(schema, document, new Set())
    ? nullable(result, policy)
    : result
}

const compileAlternatives = (
  alternatives: readonly JsonSchemaDocument[],
  document: JsonSchemaDocument,
  rootName: string | undefined,
  seen: ReadonlySet<string>,
  policy: GoNulls,
  path: readonly string[],
  options: GoJsonSchemaOptions,
): GoExpression => {
  const nonNull = alternatives.filter((item) => !isNullSchema(item))
  if (nonNull.length !== 1)
    return policy === 'structs' && nonNull.length !== alternatives.length
      ? nullable(go.any(), policy)
      : go.any()
  const type = compile(
    nonNull[0]!,
    document,
    rootName,
    seen,
    policy,
    [...path, 'alternatives', String(alternatives.indexOf(nonNull[0]!))],
    options,
  )
  return nonNull.length !== alternatives.length ? nullable(type, policy) : type
}

const compileDeclared = (
  type: string,
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  rootName: string | undefined,
  seen: ReadonlySet<string>,
  policy: GoNulls,
  path: readonly string[],
  options: GoJsonSchemaOptions,
): GoExpression => {
  if (type === 'null' && policy === 'structs') return nullStruct('Null', go.any())
  if (type === 'boolean') return go.ident('bool')
  if (type === 'integer') return go.ident('int64')
  if (type === 'number') return go.ident('float64')
  if (type === 'string') return go.ident('string')
  if (type === 'array') return compileArray(schema, document, rootName, seen, policy, path, options)
  if (type === 'object') {
    const build = () => compileObject(schema, document, rootName, seen, policy, path, options)
    return options.objectType?.(schema, path, build) ?? build()
  }
  return go.any()
}

const compileArray = (
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  rootName: string | undefined,
  seen: ReadonlySet<string>,
  policy: GoNulls,
  path: readonly string[],
  options: GoJsonSchemaOptions,
): GoExpression => {
  const prefix = schemaArray(schema['prefixItems'])
  if (prefix.length) return go.slice(go.any())
  const items = schema['items']
  return go.slice(
    typeof items === 'boolean' || isRecord(items)
      ? compile(items, document, rootName, new Set(seen), policy, [...path, 'items'], options)
      : go.any(),
  )
}

const compileObject = (
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  rootName: string | undefined,
  seen: ReadonlySet<string>,
  policy: GoNulls,
  path: readonly string[],
  options: GoJsonSchemaOptions,
): GoExpression => {
  const properties = isRecord(schema['properties']) ? schema['properties'] : {}
  const entries = Object.entries(properties).filter(
    (entry): entry is [string, JsonSchemaDocument] =>
      typeof entry[1] === 'boolean' || isRecord(entry[1]),
  )
  if (entries.length === 0) {
    const additional = schema['additionalProperties'] ?? schema['unevaluatedProperties']
    const value =
      typeof additional === 'boolean' || isRecord(additional)
        ? compile(
            additional,
            document,
            rootName,
            new Set(seen),
            policy,
            [...path, 'additionalProperties'],
            options,
          )
        : go.any()
    return go.map(go.ident('string'), value)
  }

  const required = new Set(
    Array.isArray(schema['required'])
      ? schema['required'].filter((name): name is string => typeof name === 'string')
      : [],
  )
  assertUniqueGoNames(
    entries.map(([name]) => ({ source: name, generated: goName(name) })),
    'JSON property',
  )
  const fields: GoField[] = entries.map(([name, property]) => {
    const isRequired = required.has(name)
    let type = compile(
      property,
      document,
      rootName,
      new Set(seen),
      policy,
      [...path, 'properties', name],
      options,
    )
    if (!isRequired && policy === 'structs') {
      const isNullable = allowsNull(property, document, new Set())
      if (type.kind === 'index' && type.left.kind === 'selector' && type.left.name === 'Null')
        type = type.right
      type = nullStruct(isNullable ? 'NullOrUndefined' : 'Undefined', type)
    }
    return {
      names: [goName(name)],
      type: isRequired || policy === 'structs' ? type : nullable(type, policy),
      tag: `json:${JSON.stringify(`${name}${isRequired ? '' : policy === 'structs' ? ',omitzero' : ',omitempty'}`)}`,
    }
  })
  return go.struct(fields)
}

const nullable = (type: GoExpression, policy: GoNulls): GoExpression =>
  policy === 'structs'
    ? nullStruct('Null', type)
    : type.kind === 'pointer' ||
        type.kind === 'slice' ||
        type.kind === 'map' ||
        type.kind === 'interface'
      ? type
      : go.pointer(type)

const literal = (schema: { [key: string]: JsonValue }): GoExpression => {
  const value = schema['const'] ?? (Array.isArray(schema['enum']) ? schema['enum'][0] : undefined)
  if (typeof value === 'boolean') return go.ident('bool')
  if (typeof value === 'number')
    return Number.isInteger(value) ? go.ident('int64') : go.ident('float64')
  if (typeof value === 'string') return go.ident('string')
  return go.any()
}

const directKind = (schema: { [key: string]: JsonValue }): string | undefined => {
  if (schema['properties'] !== undefined || schema['additionalProperties'] !== undefined)
    return 'object'
  if (schema['items'] !== undefined || schema['prefixItems'] !== undefined) return 'array'
  return undefined
}

const isNullSchema = (schema: JsonSchemaDocument): boolean =>
  schema !== true && schema !== false && schema['type'] === 'null'

const isRecord = (value: JsonValue | undefined): value is { [key: string]: JsonValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const schemaArray = (value: JsonValue | undefined): JsonSchemaDocument[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is JsonSchemaDocument => typeof item === 'boolean' || isRecord(item),
      )
    : []

const localReference = (
  reference: string,
  document: JsonSchemaDocument,
): JsonSchemaDocument | null => {
  if (reference === '#') return document
  if (!reference.startsWith('#/')) return null
  let current: JsonValue = document
  for (const encoded of reference.slice(2).split('/')) {
    if (!isRecord(current)) return null
    const next: JsonValue | undefined = current[encoded.replaceAll('~1', '/').replaceAll('~0', '~')]
    if (next === undefined) return null
    current = next
  }
  return typeof current === 'boolean' || isRecord(current) ? current : null
}

const allowsNull = (
  schema: JsonSchemaDocument,
  document: JsonSchemaDocument,
  seen: Set<string>,
): boolean => {
  if (typeof schema === 'boolean') return schema
  if (typeof schema['$ref'] === 'string') {
    const ref = schema['$ref']
    if (seen.has(ref)) return true
    const target = localReference(ref, document)
    if (target !== null) return allowsNull(target, document, new Set([...seen, ref]))
  }
  if (schema['const'] !== undefined) return schema['const'] === null
  if (Array.isArray(schema['enum'])) return schema['enum'].includes(null)
  const alternatives = schemaArray(schema['anyOf']).length
    ? schemaArray(schema['anyOf'])
    : schemaArray(schema['oneOf'])
  if (alternatives.length)
    return alternatives.some((item) => allowsNull(item, document, new Set(seen)))
  const all = schemaArray(schema['allOf'])
  if (all.length) return all.every((item) => allowsNull(item, document, new Set(seen)))
  if (typeof schema['type'] === 'string') return schema['type'] === 'null'
  if (Array.isArray(schema['type'])) return schema['type'].includes('null')
  return true
}
