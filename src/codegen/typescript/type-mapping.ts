import ts from 'typescript'
import type { Config, JsonSchemaDocument, TypeImport } from '../../config/schema.js'
import type { CatalogSnapshot, ColumnInfo, DomainInfo, EnumInfo } from '../../catalog/types.js'
import { factory, intersectionType, parseType, nullableType, unionType } from './ast.js'
import { typescriptTypeFromJsonSchema } from './json-schema.js'
import type { TypescriptJsonSchemaTypes } from './json-schema-types.js'
import { arrayDimensionsMapping, assertArrayDimensions } from '../shared/array-dimensions.js'
import { typescriptBuiltinName, typescriptCodec, typescriptCodecType } from './sql/codecs.js'

export interface TypescriptTypeContext {
  inlineNative?: boolean
  nativeModuleSpecifier?: (schema: string, kind: 'domain' | 'enum') => string
  jsonSchemaReference?: (name: string) => ts.TypeNode
  jsonSchemaTypes?: ReadonlyMap<string, TypescriptJsonSchemaTypes>
}

export const importedTypescriptType = (module: string, name: string): ts.TypeNode =>
  factory.createImportTypeNode(
    factory.createLiteralTypeNode(factory.createStringLiteral(module)),
    undefined,
    factory.createIdentifier(name),
    undefined,
    false,
  )

export interface ResolvedTypescriptType {
  type: ts.TypeNode
  imports: TypeImport[]
  reference?: { kind: 'domain' | 'enum'; schema: string; name: string }
}

export function resolveTypescriptColumnType(
  schema: string,
  relation: string,
  column: ColumnInfo,
  catalog: CatalogSnapshot,
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  context?: TypescriptTypeContext,
): ResolvedTypescriptType {
  const mapping =
    config.sql.codegen?.typescript?.mappings.column[`${schema}.${relation}.${column.name}`]
  if (mapping) {
    const arrayMapping = arrayDimensionsMapping(mapping)
    if (arrayMapping) {
      assertArrayDimensions(column.typeName, `${schema}.${relation}.${column.name}`)
      return resolveTypescriptPgType(
        column.typeName,
        config,
        catalog,
        schema,
        column.typeOid,
        context,
        arrayMapping.dimensions,
      )
    }
    if ('jsonSchema' in mapping)
      return {
        type:
          context?.jsonSchemaReference?.(typeName(mapping.jsonSchema)) ??
          typescriptTypeFromJsonSchema(schemas[mapping.jsonSchema]!),
        imports: [],
      }
  }
  return resolveTypescriptPgType(column.typeName, config, catalog, schema, column.typeOid, context)
}

export function resolveTypescriptPgType(
  pgType: string,
  config: Config,
  catalog?: CatalogSnapshot,
  defaultSchema?: string,
  typeOid?: number,
  context?: TypescriptTypeContext,
  dimensions?: number | readonly number[],
): ResolvedTypescriptType {
  const array = pgType.endsWith('[]')
  const base = array ? pgType.slice(0, -2) : pgType
  const unmodified = base.replace(/\([^)]*\)$/u, '')
  const unqualified = typescriptBuiltinName(unmodified)
  const sourceSchema =
    defaultSchema ??
    config.sql.searchPath.find((schema) =>
      [...(catalog?.domains ?? []), ...(catalog?.enums ?? [])].some(
        (item) => item.schema === schema && item.name === unqualified,
      ),
    )
  const normalized = normalizeTypeName(unmodified, sourceSchema ?? 'public')
  const domain = catalog?.domains.find(
    (item) => (!array && item.oid === typeOid) || qualifiedTypeName(item) === normalized,
  )
  const enumeration = catalog?.enums.find((item) => qualifiedTypeName(item) === normalized)
  const native = domain
    ? domainReference(domain)
    : enumeration
      ? enumReference(enumeration)
      : undefined
  const resolved =
    native && catalog
      ? contextualReference(native, domain, enumeration, catalog, config, context)
      : { type: parseType(typescriptCodecType(typescriptCodec(unmodified, catalog))), imports: [] }
  return arrayReference(resolved, array, dimensions ?? 1)
}

const contextualReference = (
  native: ResolvedTypescriptType,
  domain: DomainInfo | undefined,
  enumeration: EnumInfo | undefined,
  catalog: CatalogSnapshot,
  config: Config,
  context?: TypescriptTypeContext,
): ResolvedTypescriptType => {
  if (context?.nativeModuleSpecifier && native.reference)
    return {
      type: importedTypescriptType(
        context.nativeModuleSpecifier(native.reference.schema, native.reference.kind),
        typeName(native.reference.name),
      ),
      imports: [],
    }
  if (context?.inlineNative)
    return domain
      ? resolveTypescriptDomainBase(domain, catalog, config, context)
      : {
          type: unionType(
            enumeration!.values.map((value) =>
              factory.createLiteralTypeNode(factory.createStringLiteral(value)),
            ),
          ),
          imports: [],
        }
  return native
}

export function resolveTypescriptDomainBase(
  domain: DomainInfo,
  catalog: CatalogSnapshot,
  config: Config,
  context?: TypescriptTypeContext,
): ResolvedTypescriptType {
  const nestedDomain = catalog.domains.find((item) => item.oid === domain.baseTypeOid)
  const enumeration = catalog.enums.find(
    (item) => qualifiedTypeName(item) === normalizeTypeName(domain.baseTypeName, domain.schema),
  )
  const keys = config.sql.codegen?.typescript?.brands ?? ['__brand']
  const base = nestedDomain
    ? keys.length === 0
      ? contextualReference(
          domainReference(nestedDomain),
          nestedDomain,
          undefined,
          catalog,
          config,
          context,
        )
      : domainRepresentation(nestedDomain, catalog, config, context)
    : enumeration
      ? contextualReference(
          enumReference(enumeration),
          undefined,
          enumeration,
          catalog,
          config,
          context,
        )
      : resolveTypescriptPgType(
          domain.baseTypeName,
          config,
          catalog,
          domain.schema,
          undefined,
          context,
        )
  if (keys.length === 0) return base
  const brand = factory.createTypeLiteralNode(
    keys.map((key) =>
      factory.createPropertySignature(
        [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
        factory.createStringLiteral(key),
        undefined,
        factory.createLiteralTypeNode(
          factory.createStringLiteral(`${domain.schema}.${domain.name}`),
        ),
      ),
    ),
  )
  return { ...base, type: intersectionType([base.type, brand]) }
}
// A child domain brands the underlying value: intersecting parent and child brand literals would make it uninhabitable.
const domainRepresentation = (
  domain: DomainInfo,
  catalog: CatalogSnapshot,
  config: Config,
  context?: TypescriptTypeContext,
): ResolvedTypescriptType => {
  const nested = catalog.domains.find((item) => item.oid === domain.baseTypeOid)
  return nested
    ? domainRepresentation(nested, catalog, config, context)
    : resolveTypescriptPgType(
        domain.baseTypeName,
        config,
        catalog,
        domain.schema,
        domain.baseTypeOid,
        context,
      )
}

const domainReference = (domain: DomainInfo): ResolvedTypescriptType => ({
  type: factory.createTypeReferenceNode(typeName(domain.name)),
  imports: [],
  reference: { kind: 'domain', schema: domain.schema, name: domain.name },
})

const enumReference = (enumeration: EnumInfo): ResolvedTypescriptType => ({
  type: factory.createTypeReferenceNode(typeName(enumeration.name)),
  imports: [],
  reference: { kind: 'enum', schema: enumeration.schema, name: enumeration.name },
})

const arrayReference = (
  resolved: ResolvedTypescriptType,
  array: boolean,
  dimensions: number | readonly number[],
): ResolvedTypescriptType =>
  array
    ? {
        ...resolved,
        type: (() => {
          // One declared dimension count is a plain nested list; several are told apart by their
          // count, since nesting alone cannot tell a dimension from an element that is a list.
          const counts = [
            ...new Set(typeof dimensions === 'number' ? [dimensions] : dimensions),
          ].sort((left, right) => left - right)
          const nested = (depth: number) => {
            let type = nullableType(resolved.type, false)
            for (let index = 0; index < depth; index++)
              type = factory.createArrayTypeNode(parenthesized(type))
            return type
          }
          return counts.length === 1
            ? nested(counts[0]!)
            : unionType(
                counts.map((depth) =>
                  factory.createTypeLiteralNode([
                    factory.createPropertySignature(
                      [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
                      'dimensions',
                      undefined,
                      factory.createLiteralTypeNode(factory.createNumericLiteral(depth)),
                    ),
                    factory.createPropertySignature(
                      [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
                      'elements',
                      undefined,
                      nested(depth),
                    ),
                  ]),
                ),
              )
        })(),
      }
    : resolved

const qualifiedTypeName = (value: { schema: string; name: string }): string =>
  `${value.schema}.${value.name}`

const normalizeTypeName = (name: string, schema: string): string => {
  const normalized = name.replaceAll('"', '')
  return normalized.includes('.') ? normalized : `${schema}.${normalized}`
}

const parenthesized = (type: ts.TypeNode): ts.TypeNode =>
  ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)
    ? factory.createParenthesizedType(type)
    : type

export const typeName = (name: string): string => {
  const words = name.split(/[^A-Za-z0-9]+/u).filter(Boolean)
  const result = words.map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`).join('')
  return /^\d/u.test(result) ? `N${result}` : result || 'Unnamed'
}
