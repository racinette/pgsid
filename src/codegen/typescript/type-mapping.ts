import ts from 'typescript'
import type {
  Config,
  JsonSchemaDocument,
  TargetTypeMapping,
  TypeImport,
} from '../../config/schema.js'
import type { CatalogSnapshot, ColumnInfo, DomainInfo, EnumInfo } from '../../catalog/types.js'
import { factory, intersectionType, parseType, nullableType, unionType } from './ast.js'
import { typescriptTypeFromJsonSchema } from './json-schema.js'
import type { TypescriptJsonSchemaTypes } from './json-schema-types.js'
import { arrayDimensionsMapping, assertArrayDimensions } from '../shared/array-dimensions.js'

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

const DEFAULT_TYPES: Readonly<Record<string, string>> = {
  bool: 'boolean',
  boolean: 'boolean',
  bpchar: 'string',
  char: 'string',
  bytea: 'Buffer',
  cidr: 'string',
  date: 'Date',
  float4: 'number',
  float8: 'number',
  int2: 'number',
  int4: 'number',
  int8: 'string',
  integer: 'number',
  inet: 'string',
  interval: 'string',
  json: 'unknown',
  jsonb: 'unknown',
  macaddr: 'string',
  macaddr8: 'string',
  money: 'string',
  name: 'string',
  numeric: 'string',
  oid: 'number',
  real: 'number',
  smallint: 'number',
  text: 'string',
  time: 'string',
  timetz: 'string',
  timestamp: 'Date',
  timestamptz: 'Date',
  uuid: 'string',
  varbit: 'string',
  varchar: 'string',
  xml: 'string',
}

const TYPE_ALIASES: Readonly<Record<string, string>> = {
  bigint: 'int8',
  boolean: 'bool',
  'character varying': 'varchar',
  'double precision': 'float8',
  integer: 'int4',
  real: 'float4',
  smallint: 'int2',
  'timestamp with time zone': 'timestamptz',
  'timestamp without time zone': 'timestamp',
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
    if (typeof mapping === 'object' && 'jsonSchema' in mapping) {
      return {
        type:
          context?.jsonSchemaReference?.(typeName(mapping.jsonSchema)) ??
          typescriptTypeFromJsonSchema(schemas[mapping.jsonSchema]!),
        imports: [],
      }
    }
    return mapped(mapping as TargetTypeMapping)
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
  const mappings = config.sql.codegen?.typescript?.mappings.pgType ?? {}
  const array = pgType.endsWith('[]')
  const base = array ? pgType.slice(0, -2) : pgType
  const unmodified = base.replace(/\([^)]*\)$/u, '')
  const unqualified = unmodified.split('.').at(-1)?.replaceAll('"', '') ?? unmodified
  const alias = TYPE_ALIASES[unqualified] ?? unqualified
  if (mappings[pgType]) {
    if (array && dimensions !== undefined)
      throw new Error(
        `Array dimensions cannot accompany a complete ${pgType} type mapping; map the element type instead`,
      )
    return mapped(mappings[pgType]!)
  }
  const mapping = mappings[base] ?? mappings[unmodified] ?? mappings[`pg_catalog.${alias}`]
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
  const resolved = mapping
    ? mapped(mapping)
    : native && catalog
      ? contextualReference(native, domain, enumeration, catalog, config, context)
      : {
          type: parseType(DEFAULT_TYPES[alias] ?? DEFAULT_TYPES[unmodified] ?? 'unknown'),
          imports: [],
        }
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

const mapped = (mapping: TargetTypeMapping): ResolvedTypescriptType =>
  typeof mapping === 'string'
    ? { type: parseType(mapping), imports: [] }
    : { type: parseType(mapping.type), imports: [...(mapping.imports ?? [])] }

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
        type: unionType(
          (typeof dimensions === 'number' ? [dimensions] : dimensions).map((depth) => {
            let type = nullableType(resolved.type, false)
            for (let index = 0; index < depth; index++)
              type = factory.createArrayTypeNode(parenthesized(type))
            return type
          }),
        ),
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
