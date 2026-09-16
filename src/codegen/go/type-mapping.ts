import type {
  CatalogSnapshot,
  ColumnInfo,
  CompositeTypeInfo,
  DomainInfo,
  EnumInfo,
} from '../../catalog/types.js'
import type {
  Config,
  GoTargetTypeMapping,
  GoTypeImport,
  JsonSchemaDocument,
} from '../../config/schema.js'
import type { DatabaseColumn, ValueLineage } from '../../query/value-lineage.js'
import { resolveJsonSchemaLineage } from '../shared/json-schema-lineage.js'
import { goJsonSchemaBindings } from './json-schema-bindings.js'
import { go, type GoExpression } from './ast.js'
import { goJsonNulls, nullStruct, goNullsImportPath, hasNullStruct } from './nulls.js'
import { goJsonSchemasImportPath } from './jsonschemas.js'
import { createGoJsonSchemaTypes } from './json-schema-types.js'
import { goName, goPackageName, goSchemaDirectory } from './names.js'

export interface GoTypeContext {
  importPath: string
  schema?: string
  aliases?: Readonly<Record<string, string>>
  directories?: Readonly<Record<string, string>>
  nullsImportPath?: string
}

export interface ResolvedGoType {
  type: GoExpression
  imports: GoTypeImport[]
}

const defaultTypes: Readonly<Record<string, { type: string; imports?: GoTypeImport[] }>> = {
  bool: { type: 'bool' },
  bpchar: { type: 'string' },
  bytea: { type: '[]byte' },
  char: { type: 'string' },
  cidr: { type: 'string' },
  date: { type: 'time.Time', imports: [{ path: 'time' }] },
  float4: { type: 'float32' },
  float8: { type: 'float64' },
  inet: { type: 'string' },
  int2: { type: 'int16' },
  int4: { type: 'int32' },
  int8: { type: 'int64' },
  interval: { type: 'string' },
  json: { type: 'json.RawMessage', imports: [{ path: 'encoding/json' }] },
  jsonb: { type: 'json.RawMessage', imports: [{ path: 'encoding/json' }] },
  macaddr: { type: 'string' },
  macaddr8: { type: 'string' },
  money: { type: 'string' },
  name: { type: 'string' },
  numeric: { type: 'string' },
  oid: { type: 'uint32' },
  text: { type: 'string' },
  time: { type: 'string' },
  timestamp: { type: 'time.Time', imports: [{ path: 'time' }] },
  timestamptz: { type: 'time.Time', imports: [{ path: 'time' }] },
  timetz: { type: 'string' },
  uuid: { type: 'string' },
  varbit: { type: 'string' },
  varchar: { type: 'string' },
  xml: { type: 'string' },
}

const aliases: Readonly<Record<string, string>> = {
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

export function resolveGoColumnType(
  schema: string,
  relation: string,
  column: ColumnInfo,
  catalog: CatalogSnapshot,
  config: Config,
  context?: GoTypeContext,
): ResolvedGoType {
  const mapping = config.sql.codegen?.go?.mappings.column[`${schema}.${relation}.${column.name}`]
  if (mapping) {
    if (typeof mapping === 'object' && 'jsonSchema' in mapping) {
      return namedType(mapping.jsonSchema, undefined, context)
    }
    return mapped(mapping)
  }
  return resolveGoPgType(column.typeName, config, catalog, schema, column.typeOid, context)
}

export function resolveGoPgType(
  pgType: string,
  config: Config,
  catalog?: CatalogSnapshot,
  defaultSchema?: string,
  typeOid?: number,
  context?: GoTypeContext,
): ResolvedGoType {
  const array = pgType.endsWith('[]')
  const base = array ? pgType.slice(0, -2) : pgType
  const mappings = config.sql.codegen?.go?.mappings.pgType ?? {}
  const unmodified = base.replace(/\([^)]*\)$/u, '')
  const unqualified = unmodified.split('.').at(-1)?.replaceAll('"', '') ?? unmodified
  const alias = aliases[unqualified] ?? unqualified
  const mapping =
    mappings[pgType] ?? mappings[base] ?? mappings[unmodified] ?? mappings[`pg_catalog.${alias}`]
  if (mapping) {
    const resolved = mapped(mapping)
    return array
      ? {
          ...resolved,
          type: go.slice(
            config.sql.codegen?.go?.nulls === 'structs'
              ? nullStruct('Null', resolved.type)
              : resolved.type,
          ),
        }
      : resolved
  }
  const visibleSchema =
    catalog && !unmodified.includes('.')
      ? config.sql.searchPath.find((schema) =>
          [...catalog.domains, ...catalog.enums, ...catalog.compositeTypes].some(
            (item) => item.schema === schema && item.name === unqualified,
          ),
        )
      : undefined
  const sourceSchema = defaultSchema ?? visibleSchema
  const domain = catalog ? findDomain(base, catalog, sourceSchema, typeOid) : undefined
  const enumeration = catalog ? findEnum(base, catalog, sourceSchema) : undefined
  const composite = catalog ? findComposite(base, catalog, sourceSchema) : undefined
  let resolved: ResolvedGoType
  if (domain) {
    resolved = config.sql.codegen?.go?.domains
      ? namedType(domain.name, domain.schema, context)
      : resolveGoDomainBase(domain, catalog!, config, context)
  } else if (enumeration) {
    resolved = namedType(enumeration.name, enumeration.schema, context)
  } else if (composite) {
    resolved = namedType(composite.name, composite.schema, context)
  } else {
    resolved = mapped(defaultTypes[alias] ?? defaultTypes[unmodified] ?? { type: 'any' })
  }
  return array
    ? {
        ...resolved,
        type: go.slice(
          config.sql.codegen?.go?.nulls === 'structs'
            ? nullStruct('Null', resolved.type)
            : resolved.type,
        ),
      }
    : resolved
}

export function resolveGoDomainBase(
  domain: DomainInfo,
  catalog: CatalogSnapshot,
  config: Config,
  context?: GoTypeContext,
): ResolvedGoType {
  const nested = catalog.domains.find((item) => item.oid === domain.baseTypeOid)
  if (nested) {
    return config.sql.codegen?.go?.domains
      ? namedType(nested.name, nested.schema, context)
      : resolveGoDomainBase(nested, catalog, config, context)
  }
  return resolveGoPgType(
    domain.baseTypeName,
    config,
    catalog,
    domain.schema,
    domain.baseTypeOid,
    context,
  )
}

export function resolveGoValueType(
  value: ValueLineage | undefined,
  config: Config,
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  catalog?: CatalogSnapshot,
  context?: GoTypeContext,
): ResolvedGoType | null {
  if (!value) return null
  const bindings = goJsonSchemaBindings(config, schemas)
  const lineage = resolveJsonSchemaLineage(value, bindings)
  const root = lineage.alternatives[0]
  if (
    lineage.complete &&
    root &&
    lineage.alternatives.every(
      (alternative) =>
        alternative.representation === 'json' &&
        alternative.path.length === 0 &&
        alternative.schemaName === root.schemaName,
    )
  ) {
    return namedType(root.schemaName, undefined, context)
  }
  if (
    lineage.complete &&
    root &&
    lineage.alternatives.every((alternative) => alternative.schemaName === root.schemaName)
  ) {
    if (lineage.alternatives.every((alternative) => alternative.representation === 'text'))
      return { type: go.ident('string'), imports: [] }
    const types = createGoJsonSchemaTypes(
      root.document,
      goName(root.schemaName),
      goJsonNulls(config),
    )
    const imports: GoTypeImport[] = []
    const candidates = lineage.alternatives.map((alternative) =>
      alternative.representation === 'text'
        ? go.ident('string')
        : types.resolve(alternative.schema, (name) => {
            const resolved = namedType(name, undefined, context)
            imports.push(...resolved.imports)
            return resolved.type
          }),
    )
    const type = candidates[0]!
    if (candidates.every((candidate) => JSON.stringify(candidate) === JSON.stringify(type)))
      return { type, imports }
  }
  const column = directColumn(value)
  if (!column) return null
  const mapping = config.sql.codegen?.go?.mappings.column[columnKey(column)]
  if (mapping && !(typeof mapping === 'object' && 'jsonSchema' in mapping)) {
    return mapped(mapping)
  }
  return value.resolvedType
    ? resolveGoPgType(value.resolvedType, config, catalog, column.schema, undefined, context)
    : null
}

export const nullableGoType = (
  type: GoExpression,
  notNull: boolean,
  config?: Config,
): GoExpression =>
  notNull
    ? type
    : config?.sql.codegen?.go?.nulls === 'structs'
      ? nullStruct('Null', type)
      : isNilable(type)
        ? type
        : go.pointer(type)

export const addGoNullImport = (
  imports: GoTypeImport[],
  config: Config,
  context?: GoTypeContext,
  type?: GoExpression,
): void => {
  if (type && !hasNullStruct(type)) return
  if (config.sql.codegen?.go?.nulls !== 'structs' && goJsonNulls(config) !== 'structs') return
  if (!context?.nullsImportPath) throw new Error('Go struct nulls require an import path context')
  imports.push({ path: context.nullsImportPath, as: 'pgsid' })
}

const mapped = (
  mapping: GoTargetTypeMapping | { type: string; imports?: GoTypeImport[] },
): ResolvedGoType =>
  typeof mapping === 'string'
    ? { type: go.parsed(mapping), imports: [] }
    : { type: go.parsed(mapping.type), imports: [...(mapping.imports ?? [])] }

const findDomain = (
  name: string,
  catalog: CatalogSnapshot,
  defaultSchema?: string,
  oid?: number,
): DomainInfo | undefined => {
  if (oid !== undefined) {
    const exact = catalog.domains.find((item) => item.oid === oid)
    if (exact) return exact
  }
  const qualified = normalizeTypeName(name, defaultSchema)
  if (qualified.includes('.')) {
    return catalog.domains.find((item) => qualifiedTypeName(item) === qualified)
  }
  const matches = catalog.domains.filter((item) => item.name === qualified)
  return matches.length === 1 ? matches[0] : undefined
}

const findEnum = (
  name: string,
  catalog: CatalogSnapshot,
  defaultSchema?: string,
): EnumInfo | undefined => {
  const qualified = normalizeTypeName(name, defaultSchema)
  if (qualified.includes('.')) {
    return catalog.enums.find((item) => qualifiedTypeName(item) === qualified)
  }
  const matches = catalog.enums.filter((item) => item.name === qualified)
  return matches.length === 1 ? matches[0] : undefined
}

const findComposite = (
  name: string,
  catalog: CatalogSnapshot,
  defaultSchema?: string,
): CompositeTypeInfo | undefined => {
  const qualified = normalizeTypeName(name, defaultSchema)
  if (qualified.includes('.')) {
    return catalog.compositeTypes.find((item) => qualifiedTypeName(item) === qualified)
  }
  const matches = catalog.compositeTypes.filter((item) => item.name === qualified)
  return matches.length === 1 ? matches[0] : undefined
}

const normalizeTypeName = (name: string, defaultSchema?: string): string => {
  const normalized = name.replaceAll('"', '')
  return normalized.includes('.') || !defaultSchema ? normalized : `${defaultSchema}.${normalized}`
}

const qualifiedTypeName = (value: { schema: string; name: string }): string =>
  `${value.schema}.${value.name}`

const directColumn = (value: ValueLineage): DatabaseColumn | null =>
  value.kind === 'column'
    ? value.column
    : value.kind === 'row-absence'
      ? directColumn(value.origin)
      : null

const columnKey = (column: DatabaseColumn): string =>
  `${column.schema}.${column.relation}.${column.column}`

const isNilable = (type: GoExpression): boolean =>
  type.kind === 'pointer' ||
  type.kind === 'slice' ||
  type.kind === 'map' ||
  type.kind === 'interface'

const namedType = (
  name: string,
  schema: string | undefined,
  context?: GoTypeContext,
): ResolvedGoType => {
  if (!context || (schema !== undefined && schema === context.schema))
    return { type: go.ident(goName(name)), imports: [] }
  const directory =
    schema === undefined
      ? 'jsonschemas'
      : (context.directories?.[schema] ?? goSchemaDirectory(schema))
  const preferred = schema === undefined ? 'jsonschemas' : goPackageName(directory)
  const alias = context.aliases?.[schema ?? ''] ?? preferred
  return {
    type: go.selector(go.ident(alias), goName(name)),
    imports: [
      {
        path:
          schema === undefined
            ? goJsonSchemasImportPath(context.importPath)
            : `${context.importPath.replace(/\/$/u, '')}/${directory}`,
        as: alias,
      },
    ],
  }
}

export const createGoTypeContext = (
  importPath: string,
  config: Config,
  catalog?: CatalogSnapshot,
  schema?: string,
): GoTypeContext => {
  const customImports = [
    ...Object.values(config.sql.codegen?.go?.mappings.pgType ?? {}),
    ...Object.values(config.sql.codegen?.go?.mappings.column ?? {}),
  ].flatMap((mapping) =>
    typeof mapping === 'object' && 'imports' in mapping ? (mapping.imports ?? []) : [],
  )
  const occupied = new Set([
    'time',
    'json',
    'context',
    'pgx',
    'pgconn',
    'pgsid',
    'pgsidpgx',
    ...customImports.map((item) => item.as ?? item.path.split('/').at(-1)!),
  ])
  const names = [
    ...new Set(
      catalog
        ? [
            ...catalog.domains,
            ...catalog.enums,
            ...catalog.compositeTypes,
            ...catalog.tables,
            ...catalog.views,
            ...catalog.materializedViews,
          ].map((item) => item.schema)
        : [],
    ),
  ].sort(
    (left, right) =>
      Number(right === goPackageName(right)) - Number(left === goPackageName(left)) ||
      (left < right ? -1 : left > right ? 1 : 0),
  )
  const directories = Object.fromEntries(
    names.map((name) => [name, goSchemaDirectory(name, config.sql.codegen?.go?.schema?.names)]),
  )
  const aliases: Record<string, string> = Object.create(null) as Record<string, string>
  for (const name of [...names, '']) {
    const preferred = name === '' ? 'jsonschemas' : goPackageName(directories[name]!)
    let alias = preferred
    let suffix = 2
    while (occupied.has(alias)) alias = `${preferred}${suffix++}`
    occupied.add(alias)
    aliases[name] = alias
  }
  return {
    importPath,
    schema,
    aliases,
    directories,
    nullsImportPath: goNullsImportPath(importPath),
  }
}
