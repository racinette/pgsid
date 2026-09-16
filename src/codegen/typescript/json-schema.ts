import ts from 'typescript'
import type { JsonSchemaDocument, JsonValue } from '../../config/schema.js'
import type { JsonSchemaLineage } from '../shared/json-schema-lineage.js'
import { factory, intersectionType, parseType, printNode, unionType } from './ast.js'

export interface RenderTypescriptJsonSchemaOptions {
  document?: JsonSchemaDocument
  rootName?: string
  referenceType?: (schema: JsonSchemaDocument) => ts.TypeNode | undefined
  containerType?: (
    schema: JsonSchemaDocument,
    kind: 'object' | 'array',
    build: () => ts.TypeNode,
  ) => ts.TypeNode
}

export interface RenderTypescriptJsonSchemaLineageOptions {
  fallbackType?: string
}

export function typescriptTypeFromJsonSchema(
  schema: JsonSchemaDocument,
  options: RenderTypescriptJsonSchemaOptions = {},
): ts.TypeNode {
  return compile(schema, options.document ?? schema, new Set(), options)
}

export function typescriptTypeFromJsonSchemaLineage(
  lineage: JsonSchemaLineage,
  options: RenderTypescriptJsonSchemaLineageOptions = {},
): ts.TypeNode {
  const alternatives = lineage.alternatives.map((alternative) =>
    alternative.representation === 'text'
      ? factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      : typescriptTypeFromJsonSchema(alternative.schema, { document: alternative.document }),
  )
  if (!lineage.complete) alternatives.push(parseType(options.fallbackType ?? 'unknown'))
  return unionType(alternatives)
}

export function renderTypescriptJsonSchema(
  schema: JsonSchemaDocument,
  options: RenderTypescriptJsonSchemaOptions = {},
): string {
  return printNode(typescriptTypeFromJsonSchema(schema, options))
}

export function renderTypescriptJsonSchemaLineage(
  lineage: JsonSchemaLineage,
  options: RenderTypescriptJsonSchemaLineageOptions = {},
): string {
  return printNode(typescriptTypeFromJsonSchemaLineage(lineage, options))
}

const compile = (
  schema: JsonSchemaDocument,
  document: JsonSchemaDocument,
  seen: ReadonlySet<string>,
  options: RenderTypescriptJsonSchemaOptions,
): ts.TypeNode => {
  if (schema === true) return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  if (schema === false) return factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)

  const constraints: ts.TypeNode[] = []
  const reference = typeof schema['$ref'] === 'string' ? schema['$ref'] : null
  if (reference) {
    const target = localReference(reference, document)
    const named = target === null ? undefined : options.referenceType?.(target)
    if (named) constraints.push(named)
    else if (seen.has(reference)) {
      constraints.push(
        reference === '#' && options.rootName
          ? factory.createTypeReferenceNode(options.rootName)
          : factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
      )
    } else if (target === null)
      constraints.push(factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword))
    else constraints.push(compile(target, document, new Set([...seen, reference]), options))
  }

  constraints.push(
    ...schemas(schema['allOf']).map((item) => compile(item, document, new Set(seen), options)),
  )
  for (const keyword of ['anyOf', 'oneOf'] as const) {
    const alternatives = schemas(schema[keyword])
    if (alternatives.length) {
      constraints.push(
        unionType(alternatives.map((item) => compile(item, document, new Set(seen), options))),
      )
    }
  }
  const direct = compileDirect(schema, document, seen, options)
  if (direct) constraints.push(direct)
  return constraints.length
    ? intersectionType(constraints)
    : factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
}

const compileDirect = (
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  seen: ReadonlySet<string>,
  options: RenderTypescriptJsonSchemaOptions,
): ts.TypeNode | null => {
  if (schema['const'] !== undefined) return literalType(schema['const'])
  const enumValues = Array.isArray(schema['enum']) ? schema['enum'] : []
  if (enumValues.length) return unionType(enumValues.map(literalType))

  const declared = schema['type']
  if (Array.isArray(declared)) {
    return unionType(
      declared
        .filter((type): type is string => typeof type === 'string')
        .map((type) => compileDeclared(type, schema, document, seen, options)),
    )
  }
  if (typeof declared === 'string')
    return compileDeclared(declared, schema, document, seen, options)
  const objectKeywords = [
    'properties',
    'required',
    'additionalProperties',
    'patternProperties',
    'unevaluatedProperties',
  ]
  const arrayKeywords = ['items', 'prefixItems', 'contains', 'minItems', 'maxItems', 'uniqueItems']
  const object = objectKeywords.some((keyword) => schema[keyword] !== undefined)
  const array = arrayKeywords.some((keyword) => schema[keyword] !== undefined)
  if (object || array)
    return unionType([
      compileDeclared('string', schema, document, seen, options),
      compileDeclared('number', schema, document, seen, options),
      compileDeclared('boolean', schema, document, seen, options),
      compileDeclared('null', schema, document, seen, options),
      object
        ? compileObject(schema, document, seen, options)
        : parseType('Record<string, unknown>'),
      array ? compileArray(schema, document, seen, options) : parseType('unknown[]'),
    ])
  return null
}

const compileDeclared = (
  type: string,
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  seen: ReadonlySet<string>,
  options: RenderTypescriptJsonSchemaOptions,
): ts.TypeNode => {
  if (type === 'null') return factory.createLiteralTypeNode(factory.createNull())
  if (type === 'boolean') return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
  if (type === 'number' || type === 'integer')
    return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
  if (type === 'string') return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
  if (type === 'object') return compileObject(schema, document, seen, options)
  if (type === 'array') return compileArray(schema, document, seen, options)
  return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
}

const compileObject = (
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  seen: ReadonlySet<string>,
  options: RenderTypescriptJsonSchemaOptions,
): ts.TypeNode => {
  const build = (): ts.TypeNode => {
    const properties = isRecord(schema['properties']) ? schema['properties'] : {}
    const required = new Set(
      Array.isArray(schema['required'])
        ? schema['required'].filter((name): name is string => typeof name === 'string')
        : [],
    )
    const entries = new Map<string, ts.TypeNode>()
    for (const [name, property] of Object.entries(properties)) {
      if (typeof property === 'boolean' || isRecord(property)) {
        entries.set(name, compile(property, document, new Set(seen), options))
      }
    }
    for (const name of required) {
      if (!entries.has(name))
        entries.set(name, factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword))
    }

    const members: ts.TypeElement[] = [...entries].map(([name, type]) =>
      factory.createPropertySignature(
        undefined,
        factory.createStringLiteral(name),
        required.has(name) ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
        type,
      ),
    )
    const patternTypes = isRecord(schema['patternProperties'])
      ? Object.values(schema['patternProperties'])
          .filter((item): item is JsonSchemaDocument => typeof item === 'boolean' || isRecord(item))
          .map((item) => compile(item, document, new Set(seen), options))
      : []
    const additional = schema['additionalProperties'] ?? schema['unevaluatedProperties'] ?? true
    if (additional !== false || patternTypes.length > 0) {
      const extraType =
        additional === false
          ? factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
          : typeof additional === 'boolean' || isRecord(additional)
            ? compile(additional, document, new Set(seen), options)
            : factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
      const alternatives = [extraType, ...entries.values(), ...patternTypes]
      if ([...entries].some(([name]) => !required.has(name))) {
        alternatives.push(factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword))
      }
      members.push(
        factory.createIndexSignature(
          undefined,
          [
            factory.createParameterDeclaration(
              undefined,
              undefined,
              'key',
              undefined,
              factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ),
          ],
          unionType(alternatives),
        ),
      )
    } else if (members.length === 0) {
      return factory.createTypeReferenceNode('Record', [
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
      ])
    }
    return factory.createTypeLiteralNode(members)
  }
  return options.containerType?.(schema, 'object', build) ?? build()
}

const compileArray = (
  schema: { [key: string]: JsonValue },
  document: JsonSchemaDocument,
  seen: ReadonlySet<string>,
  options: RenderTypescriptJsonSchemaOptions,
): ts.TypeNode => {
  const build = (): ts.TypeNode => {
    const prefix = schemas(schema['prefixItems'])
    const items = schema['items']
    if (prefix.length === 0) {
      const itemType =
        typeof items === 'boolean' || isRecord(items)
          ? compile(items, document, new Set(seen), options)
          : factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
      return factory.createArrayTypeNode(parenthesized(itemType))
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
      return factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
    }
    const visible = maximum === null ? prefix : prefix.slice(0, maximum)
    const members: ts.TypeNode[] = visible.map((item, index) => {
      const type = compile(item, document, new Set(seen), options)
      return index < minimum ? type : factory.createOptionalTypeNode(parenthesized(type))
    })
    if (items !== false) {
      const itemType =
        typeof items === 'boolean' || isRecord(items)
          ? compile(items, document, new Set(seen), options)
          : factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
      members.push(factory.createRestTypeNode(factory.createArrayTypeNode(parenthesized(itemType))))
    }
    return factory.createTupleTypeNode(members)
  }
  return options.containerType?.(schema, 'array', build) ?? build()
}

const literalType = (value: JsonValue): ts.TypeNode => {
  if (value === null) return factory.createLiteralTypeNode(factory.createNull())
  if (typeof value === 'string')
    return factory.createLiteralTypeNode(factory.createStringLiteral(value))
  if (typeof value === 'number') {
    const literal =
      value < 0
        ? factory.createPrefixUnaryExpression(
            ts.SyntaxKind.MinusToken,
            factory.createNumericLiteral(-value),
          )
        : factory.createNumericLiteral(value)
    return factory.createLiteralTypeNode(literal)
  }
  if (typeof value === 'boolean') {
    return factory.createLiteralTypeNode(value ? factory.createTrue() : factory.createFalse())
  }
  if (Array.isArray(value)) return factory.createTupleTypeNode(value.map(literalType))
  return factory.createTypeLiteralNode(
    Object.entries(value).map(([name, item]) =>
      factory.createPropertySignature(
        undefined,
        factory.createStringLiteral(name),
        undefined,
        literalType(item),
      ),
    ),
  )
}

const parenthesized = (type: ts.TypeNode): ts.TypeNode =>
  ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)
    ? factory.createParenthesizedType(type)
    : type

const isRecord = (value: JsonValue | undefined): value is { [key: string]: JsonValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const schemas = (value: JsonValue | undefined): JsonSchemaDocument[] =>
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
