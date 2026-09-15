import ts from 'typescript'
import type {
  Config,
  JsonSchemaDocument,
  TargetTypeMapping,
  TypeImport,
} from '../../config/schema.js'
import type { CatalogSnapshot, ColumnInfo, DomainInfo, EnumInfo } from '../../catalog/types.js'
import { factory, intersectionType, parseType } from './ast.js'
import { typescriptTypeFromJsonSchema } from './json-schema.js'

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
): ResolvedTypescriptType {
  const mapping =
    config.sql.codegen?.typescript?.mappings.column[`${schema}.${relation}.${column.name}`]
  if (mapping) {
    if (typeof mapping === 'object' && 'jsonSchema' in mapping) {
      return {
        type: typescriptTypeFromJsonSchema(schemas[mapping.jsonSchema]!),
        imports: [],
      }
    }
    return mapped(mapping)
  }
  const array = column.typeName.endsWith('[]')
  const baseName = array ? column.typeName.slice(0, -2) : column.typeName
  const normalized = normalizeTypeName(baseName, schema)
  const domain = catalog.domains.find(
    (item) => item.oid === column.typeOid || qualifiedTypeName(item) === normalized,
  )
  if (domain) return arrayReference(domainReference(domain), array)
  const enumeration = catalog.enums.find((item) => qualifiedTypeName(item) === normalized)
  if (enumeration) return arrayReference(enumReference(enumeration), array)
  return resolveTypescriptPgType(column.typeName, config)
}

export function resolveTypescriptPgType(pgType: string, config: Config): ResolvedTypescriptType {
  const mappings = config.sql.codegen?.typescript?.mappings.pgType ?? {}
  const array = pgType.endsWith('[]')
  const base = array ? pgType.slice(0, -2) : pgType
  const unmodified = base.replace(/\([^)]*\)$/u, '')
  const unqualified = unmodified.split('.').at(-1)?.replaceAll('"', '') ?? unmodified
  const alias = TYPE_ALIASES[unqualified] ?? unqualified
  const mapping =
    mappings[pgType] ?? mappings[base] ?? mappings[unmodified] ?? mappings[`pg_catalog.${alias}`]
  const resolved = mapping
    ? mapped(mapping)
    : {
        type: parseType(DEFAULT_TYPES[alias] ?? DEFAULT_TYPES[unmodified] ?? 'unknown'),
        imports: [],
      }
  return array
    ? { ...resolved, type: factory.createArrayTypeNode(parenthesized(resolved.type)) }
    : resolved
}

export function resolveTypescriptDomainBase(
  domain: DomainInfo,
  catalog: CatalogSnapshot,
  config: Config,
): ResolvedTypescriptType {
  const nestedDomain = catalog.domains.find((item) => item.oid === domain.baseTypeOid)
  const enumeration = catalog.enums.find(
    (item) => qualifiedTypeName(item) === normalizeTypeName(domain.baseTypeName, domain.schema),
  )
  const base = nestedDomain
    ? domainReference(nestedDomain)
    : enumeration
      ? enumReference(enumeration)
      : resolveTypescriptPgType(domain.baseTypeName, config)
  const keys = config.sql.codegen?.typescript?.brands ?? ['__brand']
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
): ResolvedTypescriptType =>
  array ? { ...resolved, type: factory.createArrayTypeNode(resolved.type) } : resolved

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
  return result || 'Unnamed'
}
