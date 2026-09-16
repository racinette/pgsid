import ts from 'typescript'
import type { JsonSchemaDocument, JsonValue } from '../../config/schema.js'
import { factory } from './ast.js'
import {
  typescriptTypeFromJsonSchema,
  type RenderTypescriptJsonSchemaOptions,
} from './json-schema.js'
import { typeName } from './type-mapping.js'

export interface TypescriptJsonSchemaDeclaration {
  name: string
  type: ts.TypeNode
  schema: JsonSchemaDocument
  sourceSchema: JsonSchemaDocument
}
export interface TypescriptJsonSchemaTypes {
  declarations: readonly TypescriptJsonSchemaDeclaration[]
  resolve(schema: JsonSchemaDocument, reference: (name: string) => ts.TypeNode): ts.TypeNode
}

export function createTypescriptJsonSchemaTypes(
  document: JsonSchemaDocument,
  rootName: string,
): TypescriptJsonSchemaTypes {
  const locations = new Map<JsonSchemaDocument, string>()
  const visit = (schema: JsonValue, suffix: string): void => {
    if (
      schema === null ||
      typeof schema !== 'object' ||
      Array.isArray(schema) ||
      locations.has(schema)
    )
      return
    locations.set(schema, suffix)
    for (const keyword of ['properties', '$defs', 'definitions', 'patternProperties']) {
      const children = schema[keyword]
      if (children && typeof children === 'object' && !Array.isArray(children)) {
        for (const [name, child] of Object.entries(children)) visit(child, suffix + typeName(name))
      }
    }
    for (const [keyword, name] of [
      ['items', 'Item'],
      ['additionalProperties', 'Value'],
      ['unevaluatedProperties', 'Value'],
    ] as const) {
      const child = schema[keyword]
      if (child !== undefined) visit(child, suffix + name)
    }
    for (const keyword of ['anyOf', 'oneOf', 'allOf', 'prefixItems']) {
      const children = schema[keyword]
      if (Array.isArray(children))
        children.forEach((child, index) =>
          visit(child, `${suffix}${typeName(keyword)}${index + 1}`),
        )
    }
  }
  visit(document, '')
  const entries = new Map<JsonSchemaDocument, Map<string, TypescriptJsonSchemaDeclaration>>()
  const plainRoot =
    typeof document === 'object' &&
    (document['type'] === 'object' || document['type'] === 'array') &&
    !['allOf', 'anyOf', 'oneOf', '$ref', 'const', 'enum'].some(
      (keyword) => document[keyword] !== undefined,
    )
  const resolvingReferences = new Set<JsonSchemaDocument>()
  const options: RenderTypescriptJsonSchemaOptions = {
    document,
    containerType(schema, kind, build) {
      const kinds = entries.get(schema) ?? new Map<string, TypescriptJsonSchemaDeclaration>()
      entries.set(schema, kinds)
      const existing = kinds.get(kind)
      if (existing) return factory.createTypeReferenceNode(existing.name)
      const suffix = locations.get(schema) ?? 'Value'
      const inferred =
        typeof schema === 'object' &&
        (schema['type'] === undefined ||
          (Array.isArray(schema['type']) &&
            schema['type'].includes('object') &&
            schema['type'].includes('array')))
      const name = suffix
        ? `${rootName}${suffix}${inferred ? typeName(kind) : ''}`
        : plainRoot
          ? rootName
          : `${rootName}${typeName(kind)}`
      const entry = {
        name,
        sourceSchema: schema,
        schema: typeof schema === 'object' ? { ...schema, type: kind } : schema,
        type: factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword) as ts.TypeNode,
      }
      kinds.set(kind, entry)
      entry.type = build()
      return factory.createTypeReferenceNode(name)
    },
    referenceType(schema) {
      if (!entries.has(schema) || resolvingReferences.has(schema)) return undefined
      if (schema === document) return factory.createTypeReferenceNode(rootName)
      resolvingReferences.add(schema)
      try {
        return typescriptTypeFromJsonSchema(schema, options)
      } finally {
        resolvingReferences.delete(schema)
      }
    },
  }
  const compiled = typescriptTypeFromJsonSchema(document, options)
  const containers = [...entries.values()].flatMap((kinds) => [...kinds.values()])
  const root = containers.find((entry) => entry.name === rootName)
  const declarations = [
    {
      name: rootName,
      schema: document,
      sourceSchema: document,
      type:
        root &&
        ts.isTypeReferenceNode(compiled) &&
        ts.isIdentifier(compiled.typeName) &&
        compiled.typeName.text === rootName
          ? root.type
          : compiled,
    },
    ...containers.filter((entry) => entry !== root),
  ]
  assertUniqueTypescriptJsonSchemaNames(declarations)
  return {
    declarations,
    resolve(schema, reference) {
      if (schema === document) return reference(rootName)
      const resolving = new Set<JsonSchemaDocument>()
      const resolvingOptions: RenderTypescriptJsonSchemaOptions = {
        document,
        containerType(value, kind, build) {
          const entry = entries.get(value)?.get(kind)
          return entry ? reference(entry.name) : build()
        },
        referenceType(value) {
          if (value === document) return reference(rootName)
          if (!entries.has(value) || resolving.has(value)) return undefined
          resolving.add(value)
          try {
            return typescriptTypeFromJsonSchema(value, resolvingOptions)
          } finally {
            resolving.delete(value)
          }
        },
      }
      return typescriptTypeFromJsonSchema(schema, resolvingOptions)
    },
  }
}

export function assertUniqueTypescriptJsonSchemaNames(
  declarations: readonly { name: string }[],
): void {
  const names = new Set<string>()
  for (const { name } of declarations) {
    if (names.has(name)) throw new Error(`JSON Schema declarations collide as ${name}`)
    names.add(name)
  }
}
