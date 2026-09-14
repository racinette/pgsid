import type { JsonSchemaDocument, JsonValue } from '../config/schema.js'
import type { JsonSchemaLineage } from './json-schema-lineage.js'

export interface GenerateTypescriptJsonSchemaValidatorOptions {
  document?: JsonSchemaDocument
  nullable?: boolean
}

export class UnsupportedJsonSchemaError extends Error {
  constructor(readonly keyword: string) {
    super(`Unsupported JSON Schema assertion: ${keyword}`)
    this.name = 'UnsupportedJsonSchemaError'
  }
}

export function generateTypescriptJsonSchemaValidator(
  name: string,
  type: string,
  schema: JsonSchemaDocument,
  options: GenerateTypescriptJsonSchemaValidatorOptions = {},
): string {
  assertIdentifier(name)
  const predicate = compile(schema, 'value', options.document ?? schema, new Set())
  return validatorSource(
    name,
    type,
    options.nullable ? `(value === null || ${predicate})` : predicate,
  )
}

export function generateTypescriptJsonSchemaLineageValidator(
  name: string,
  type: string,
  lineage: JsonSchemaLineage,
  options: Pick<GenerateTypescriptJsonSchemaValidatorOptions, 'nullable'> = {},
): string | null {
  if (
    !lineage.complete ||
    lineage.alternatives.length === 0 ||
    lineage.alternatives.some((alternative) => !alternative.runtimeValidation)
  ) {
    return null
  }
  assertIdentifier(name)
  const predicates = lineage.alternatives.map((alternative) =>
    alternative.representation === 'text'
      ? 'typeof value === "string"'
      : compile(alternative.schema, 'value', alternative.document, new Set()),
  )
  const predicate = predicates.length === 1 ? predicates[0]! : `(${predicates.join(' || ')})`
  return validatorSource(
    name,
    type,
    options.nullable ? `(value === null || ${predicate})` : predicate,
  )
}

const validatorSource = (
  name: string,
  type: string,
  predicate: string,
): string => `export function ${name}(value: unknown): value is ${type} {
  const _hasOwn = (object: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(object, key)
  const _deepEqual = (left: unknown, right: unknown): boolean => {
    if (Object.is(left, right)) return true
    if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) return false
    if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => _deepEqual(item, right[index]))
    const leftRecord = left as Record<string, unknown>
    const rightRecord = right as Record<string, unknown>
    const keys = Object.keys(leftRecord)
    return keys.length === Object.keys(rightRecord).length && keys.every((key) => _hasOwn(rightRecord, key) && _deepEqual(leftRecord[key], rightRecord[key]))
  }
  return ${predicate}
}`

const assertIdentifier = (name: string): void => {
  if (!/^[$A-Z_a-z][$\w]*$/u.test(name)) throw new Error(`Invalid TypeScript identifier: ${name}`)
}

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
    const segment = encoded.replaceAll('~1', '/').replaceAll('~0', '~')
    const next: JsonValue | undefined = current[segment]
    if (next === undefined) return null
    current = next
  }
  return typeof current === 'boolean' || isRecord(current) ? current : null
}

const ANNOTATION_KEYWORDS = new Set([
  '$anchor',
  '$comment',
  '$defs',
  '$id',
  '$schema',
  'contentEncoding',
  'contentMediaType',
  'contentSchema',
  'default',
  'deprecated',
  'description',
  'examples',
  'format',
  'readOnly',
  'title',
  'writeOnly',
])

const ASSERTION_KEYWORDS = new Set([
  '$ref',
  'additionalProperties',
  'allOf',
  'anyOf',
  'const',
  'contains',
  'dependentRequired',
  'dependentSchemas',
  'else',
  'enum',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'if',
  'items',
  'maxContains',
  'maximum',
  'maxItems',
  'maxLength',
  'maxProperties',
  'minContains',
  'minimum',
  'minItems',
  'minLength',
  'minProperties',
  'multipleOf',
  'not',
  'oneOf',
  'pattern',
  'patternProperties',
  'prefixItems',
  'properties',
  'propertyNames',
  'required',
  'then',
  'type',
  'uniqueItems',
])

const assertKeywords = (schema: { [key: string]: JsonValue }): void => {
  for (const keyword of Object.keys(schema)) {
    if (ANNOTATION_KEYWORDS.has(keyword) || ASSERTION_KEYWORDS.has(keyword)) continue
    throw new UnsupportedJsonSchemaError(keyword)
  }
}

const and = (predicates: readonly string[]): string => {
  const useful = predicates.filter((predicate) => predicate !== 'true')
  if (useful.includes('false')) return 'false'
  if (useful.length === 0) return 'true'
  return useful.length === 1 ? useful[0]! : `(${useful.join(' && ')})`
}

const or = (predicates: readonly string[]): string => {
  const useful = predicates.filter((predicate) => predicate !== 'false')
  if (useful.includes('true')) return 'true'
  if (useful.length === 0) return 'false'
  return useful.length === 1 ? useful[0]! : `(${useful.join(' || ')})`
}

const objectExpression = (value: string): string => `(${value} as Record<string, unknown>)`
const arrayExpression = (value: string): string => `(${value} as unknown[])`

const compile = (
  schema: JsonSchemaDocument,
  value: string,
  document: JsonSchemaDocument,
  seen: Set<string>,
): string => {
  if (schema === true) return 'true'
  if (schema === false) return 'false'
  assertKeywords(schema)
  const predicates: string[] = []

  const reference = typeof schema['$ref'] === 'string' ? schema['$ref'] : null
  if (reference) {
    if (seen.has(reference)) throw new UnsupportedJsonSchemaError(`recursive ${reference}`)
    const target = localReference(reference, document)
    if (target === null) throw new UnsupportedJsonSchemaError(`$ref ${reference}`)
    const nextSeen = new Set(seen)
    nextSeen.add(reference)
    predicates.push(compile(target, value, document, nextSeen))
  }

  if (schema['const'] !== undefined) predicates.push(constantPredicate(value, schema['const']))
  if (Array.isArray(schema['enum'])) {
    predicates.push(or(schema['enum'].map((candidate) => constantPredicate(value, candidate))))
  }
  const declared = schema['type']
  if (typeof declared === 'string') predicates.push(typePredicate(value, declared))
  else if (Array.isArray(declared)) {
    predicates.push(
      or(
        declared
          .filter((type): type is string => typeof type === 'string')
          .map((type) => typePredicate(value, type)),
      ),
    )
  }

  const allOf = schemaArray(schema['allOf'])
  predicates.push(...allOf.map((candidate) => compile(candidate, value, document, new Set(seen))))
  const anyOf = schemaArray(schema['anyOf'])
  if (anyOf.length)
    predicates.push(
      or(anyOf.map((candidate) => compile(candidate, value, document, new Set(seen)))),
    )
  const oneOf = schemaArray(schema['oneOf'])
  if (oneOf.length) {
    const matches = oneOf.map(
      (candidate) => `Number(${compile(candidate, value, document, new Set(seen))})`,
    )
    predicates.push(`(${matches.join(' + ')} === 1)`)
  }
  const negated = schema['not']
  if (typeof negated === 'boolean' || isRecord(negated))
    predicates.push(`!(${compile(negated, value, document, new Set(seen))})`)
  const condition = schema['if']
  if (typeof condition === 'boolean' || isRecord(condition)) {
    const ifPredicate = compile(condition, value, document, new Set(seen))
    const thenSchema = schema['then']
    const elseSchema = schema['else']
    const thenPredicate =
      typeof thenSchema === 'boolean' || isRecord(thenSchema)
        ? compile(thenSchema, value, document, new Set(seen))
        : 'true'
    const elsePredicate =
      typeof elseSchema === 'boolean' || isRecord(elseSchema)
        ? compile(elseSchema, value, document, new Set(seen))
        : 'true'
    predicates.push(`((${ifPredicate}) ? (${thenPredicate}) : (${elsePredicate}))`)
  }

  predicates.push(...compileNumber(schema, value))
  predicates.push(...compileString(schema, value))
  predicates.push(...compileArray(schema, value, document, seen))
  predicates.push(...compileObject(schema, value, document, seen))
  return and(predicates)
}

const typePredicate = (value: string, type: string): string => {
  if (type === 'null') return `${value} === null`
  if (type === 'boolean' || type === 'string') return `typeof ${value} === "${type}"`
  if (type === 'number') return `(typeof ${value} === "number" && Number.isFinite(${value}))`
  if (type === 'integer') return `(typeof ${value} === "number" && Number.isInteger(${value}))`
  if (type === 'array') return `Array.isArray(${value})`
  if (type === 'object')
    return `(typeof ${value} === "object" && ${value} !== null && !Array.isArray(${value}))`
  throw new UnsupportedJsonSchemaError(`type ${type}`)
}

const constantPredicate = (value: string, constant: JsonValue): string =>
  constant !== null && typeof constant === 'object'
    ? `_deepEqual(${value}, ${JSON.stringify(constant)})`
    : `Object.is(${value}, ${JSON.stringify(constant)})`

const compileNumber = (schema: { [key: string]: JsonValue }, value: string): string[] => {
  const checks: string[] = []
  for (const [keyword, operator] of [
    ['minimum', '>='],
    ['maximum', '<='],
    ['exclusiveMinimum', '>'],
    ['exclusiveMaximum', '<'],
  ] as const) {
    const limit = schema[keyword]
    if (typeof limit === 'number') checks.push(`${value} ${operator} ${JSON.stringify(limit)}`)
  }
  const multiple = schema['multipleOf']
  if (typeof multiple === 'number')
    checks.push(`Number.isInteger(${value} / ${JSON.stringify(multiple)})`)
  return checks.length ? [`(typeof ${value} !== "number" || ${and(checks)})`] : []
}

const compileString = (schema: { [key: string]: JsonValue }, value: string): string[] => {
  const checks: string[] = []
  const minimum = schema['minLength']
  if (typeof minimum === 'number') checks.push(`[...${value}].length >= ${minimum}`)
  const maximum = schema['maxLength']
  if (typeof maximum === 'number') checks.push(`[...${value}].length <= ${maximum}`)
  const pattern = schema['pattern']
  if (typeof pattern === 'string') {
    try {
      new RegExp(pattern, 'u')
    } catch {
      throw new UnsupportedJsonSchemaError(`pattern ${pattern}`)
    }
    checks.push(`new RegExp(${JSON.stringify(pattern)}, "u").test(${value})`)
  }
  return checks.length ? [`(typeof ${value} !== "string" || ${and(checks)})`] : []
}

const compileArray = (
  schema: { [key: string]: JsonValue },
  value: string,
  document: JsonSchemaDocument,
  seen: Set<string>,
): string[] => {
  const hasArrayKeyword = [
    'prefixItems',
    'items',
    'contains',
    'minContains',
    'maxContains',
    'minItems',
    'maxItems',
    'uniqueItems',
  ].some((keyword) => schema[keyword] !== undefined)
  if (!hasArrayKeyword) return []
  const array = arrayExpression(value)
  const checks: string[] = []
  const minimum = schema['minItems']
  if (typeof minimum === 'number') checks.push(`${array}.length >= ${minimum}`)
  const maximum = schema['maxItems']
  if (typeof maximum === 'number') checks.push(`${array}.length <= ${maximum}`)
  if (schema['uniqueItems'] === true)
    checks.push(
      `${array}.every((item, index, all) => all.findIndex((candidate) => _deepEqual(item, candidate)) === index)`,
    )
  const prefix = schemaArray(schema['prefixItems'])
  prefix.forEach((candidate, index) =>
    checks.push(
      `(${array}.length <= ${index} || ${compile(candidate, `${array}[${index}]`, document, new Set(seen))})`,
    ),
  )
  const items = schema['items']
  if (typeof items === 'boolean' || isRecord(items))
    checks.push(
      `${array}.slice(${prefix.length}).every((item) => ${compile(items, 'item', document, new Set(seen))})`,
    )
  const contains = schema['contains']
  if (typeof contains === 'boolean' || isRecord(contains)) {
    const predicate = compile(contains, 'item', document, new Set(seen))
    const count = `${array}.filter((item) => ${predicate}).length`
    const minContains = typeof schema['minContains'] === 'number' ? schema['minContains'] : 1
    checks.push(`${count} >= ${minContains}`)
    if (typeof schema['maxContains'] === 'number')
      checks.push(`${count} <= ${schema['maxContains']}`)
  }
  return [`(!Array.isArray(${value}) || ${and(checks)})`]
}

const compileObject = (
  schema: { [key: string]: JsonValue },
  value: string,
  document: JsonSchemaDocument,
  seen: Set<string>,
): string[] => {
  const hasObjectKeyword = [
    'properties',
    'patternProperties',
    'additionalProperties',
    'required',
    'dependentRequired',
    'dependentSchemas',
    'propertyNames',
    'minProperties',
    'maxProperties',
  ].some((keyword) => schema[keyword] !== undefined)
  if (!hasObjectKeyword) return []
  const object = objectExpression(value)
  const checks: string[] = []
  const required = Array.isArray(schema['required'])
    ? schema['required'].filter((name): name is string => typeof name === 'string')
    : []
  checks.push(...required.map((name) => `_hasOwn(${object}, ${JSON.stringify(name)})`))
  const properties = isRecord(schema['properties']) ? schema['properties'] : {}
  for (const [name, property] of Object.entries(properties)) {
    if (typeof property !== 'boolean' && !isRecord(property)) continue
    checks.push(
      `(!_hasOwn(${object}, ${JSON.stringify(name)}) || ${compile(property, `${object}[${JSON.stringify(name)}]`, document, new Set(seen))})`,
    )
  }
  const patterns = isRecord(schema['patternProperties'])
    ? Object.entries(schema['patternProperties']).filter(
        (entry): entry is [string, JsonSchemaDocument] =>
          typeof entry[1] === 'boolean' || isRecord(entry[1]),
      )
    : []
  for (const [pattern] of patterns) {
    try {
      new RegExp(pattern, 'u')
    } catch {
      throw new UnsupportedJsonSchemaError(`patternProperties ${pattern}`)
    }
  }
  if (patterns.length)
    checks.push(
      `${objectEntries(object)}.every(([key, item]) => ${and(patterns.map(([pattern, candidate]) => `(!new RegExp(${JSON.stringify(pattern)}, "u").test(key) || ${compile(candidate, 'item', document, new Set(seen))})`))})`,
    )
  const additional = schema['additionalProperties']
  if (typeof additional === 'boolean' || isRecord(additional)) {
    const known = JSON.stringify(Object.keys(properties))
    const matched = patterns.length
      ? or(patterns.map(([pattern]) => `new RegExp(${JSON.stringify(pattern)}, "u").test(key)`))
      : 'false'
    checks.push(
      `${objectEntries(object)}.every(([key, item]) => ${known}.includes(key) || ${matched} || ${compile(additional, 'item', document, new Set(seen))})`,
    )
  }
  const propertyNames = schema['propertyNames']
  if (typeof propertyNames === 'boolean' || isRecord(propertyNames))
    checks.push(
      `Object.keys(${object}).every((key) => ${compile(propertyNames, 'key', document, new Set(seen))})`,
    )
  const dependentRequired = isRecord(schema['dependentRequired']) ? schema['dependentRequired'] : {}
  for (const [name, dependencies] of Object.entries(dependentRequired)) {
    if (!Array.isArray(dependencies)) continue
    const dependencyChecks = dependencies
      .filter((dependency): dependency is string => typeof dependency === 'string')
      .map((dependency) => `_hasOwn(${object}, ${JSON.stringify(dependency)})`)
    checks.push(`(!_hasOwn(${object}, ${JSON.stringify(name)}) || ${and(dependencyChecks)})`)
  }
  const dependentSchemas = isRecord(schema['dependentSchemas']) ? schema['dependentSchemas'] : {}
  for (const [name, dependent] of Object.entries(dependentSchemas)) {
    if (typeof dependent !== 'boolean' && !isRecord(dependent)) continue
    checks.push(
      `(!_hasOwn(${object}, ${JSON.stringify(name)}) || ${compile(dependent, value, document, new Set(seen))})`,
    )
  }
  const minimum = schema['minProperties']
  if (typeof minimum === 'number') checks.push(`Object.keys(${object}).length >= ${minimum}`)
  const maximum = schema['maxProperties']
  if (typeof maximum === 'number') checks.push(`Object.keys(${object}).length <= ${maximum}`)
  return [`(${typePredicate(value, 'object')} ? ${and(checks)} : true)`]
}

const objectEntries = (object: string): string => `Object.entries(${object})`
