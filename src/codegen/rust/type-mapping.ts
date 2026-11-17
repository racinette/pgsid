import type { CatalogSnapshot, DomainInfo } from '../../catalog/types.js'
import { rangeSubtype } from '../shared/range-subtype.js'
import { rust, type RustType } from './ast.js'
import { rustFieldName, rustTypeName } from './names.js'

// Where generated code stands relative to the generated module root, so that a type of another
// module is named by a relative path and the tree can be mounted anywhere in a crate.
export interface RustTypeContext {
  // The number of module levels between the code and the generated root.
  depth: number
  // The schema whose module the code is in, whose own types it names unqualified.
  schema?: string
  // The generated root's path from the crate, for code outside the generated tree.
  root?: readonly string[]
  // Module names given to schemas in place of their own.
  modules?: Readonly<Record<string, string>>
  // The schemas an unqualified type name is looked up in, in order.
  searchPath?: readonly string[]
}

// The module a schema's types are declared in.
export const rustSchemaModule = (
  schema: string,
  context: Pick<RustTypeContext, 'modules'>,
): string => context.modules?.[schema] ?? rustFieldName(schema)

const rootPath = (context: RustTypeContext): string[] =>
  context.root ? [...context.root] : Array.from({ length: context.depth }, () => 'super')

const builtin: Readonly<Record<string, RustType>> = {
  bool: rust.path('bool'),
  int2: rust.path('i16'),
  int4: rust.path('i32'),
  int8: rust.path('i64'),
  float4: rust.path('f32'),
  float8: rust.path('f64'),
  text: rust.path('String'),
  varchar: rust.path('String'),
  bpchar: rust.path('String'),
  name: rust.path('String'),
  bytea: rust.vec(rust.path('u8')),
  oid: rust.path('u32'),
  int2vector: rust.vec(rust.path('i16')),
  oidvector: rust.vec(rust.path('u32')),
}
const values: Readonly<Record<string, string>> = {
  numeric: 'Numeric',
  time: 'Time',
  timetz: 'Timetz',
  point: 'Point',
  line: 'Line',
  lseg: 'Lseg',
  box: 'PgBox',
  path: 'Path',
  polygon: 'Polygon',
  circle: 'Circle',
  uuid: 'Uuid',
  xid: 'Xid',
  cid: 'Cid',
  xid8: 'Xid8',
  money: 'Money',
  char: 'Char',
  tid: 'Tid',
  pg_lsn: 'PgLsn',
  pg_snapshot: 'Snapshot',
  txid_snapshot: 'Snapshot',
  inet: 'Inet',
  cidr: 'Cidr',
  macaddr: 'Macaddr',
  macaddr8: 'Macaddr8',
  bit: 'BitString',
  varbit: 'BitString',
  xml: 'Xml',
  jsonpath: 'Jsonpath',
  tsvector: 'Tsvector',
  tsquery: 'Tsquery',
  aclitem: 'Aclitem',
  refcursor: 'Refcursor',
  regproc: 'OidAlias',
  regprocedure: 'OidAlias',
  regoper: 'OidAlias',
  regoperator: 'OidAlias',
  regclass: 'OidAlias',
  regtype: 'OidAlias',
  regconfig: 'OidAlias',
  regdictionary: 'OidAlias',
  regnamespace: 'OidAlias',
  regrole: 'OidAlias',
  regcollation: 'OidAlias',
  date: 'Date',
  timestamp: 'Timestamp',
  timestamptz: 'Timestamptz',
  interval: 'Interval',
}
// Long SQL spellings of built-in types.
const aliases: Readonly<Record<string, string>> = {
  bigint: 'int8',
  boolean: 'bool',
  'character varying': 'varchar',
  character: 'bpchar',
  'double precision': 'float8',
  integer: 'int4',
  real: 'float4',
  smallint: 'int2',
  decimal: 'numeric',
  'bit varying': 'varbit',
  '"char"': 'char',
  'timestamp with time zone': 'timestamptz',
  'timestamp without time zone': 'timestamp',
  'time with time zone': 'timetz',
  'time without time zone': 'time',
}

// The type modifiers inside a name, as in timestamp(3) with time zone, and an interval's fields
// do not change the value.
const builtinName = (name: string): string => {
  const plain = name
    .replace(/\([^)]*\)/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
  if (/^interval(?: |$)/u.test(plain)) return 'interval'
  return aliases[plain] ?? plain
}

const relative = (context: RustTypeContext, ...path: string[]): RustType =>
  rust.path(...rootPath(context), ...path)

// The generated values module, from the code's place.
export const rustValues = (
  context: RustTypeContext,
  name: string,
  ...generics: RustType[]
): RustType => ({
  kind: 'path',
  path: [...rootPath(context), 'pgsid', name],
  ...(generics.length ? { generics } : {}),
})

// A type the generated schema modules declare: by name in its own module, else through its
// schema's module.
export const rustDeclaredType = (
  schema: string,
  name: string,
  context: RustTypeContext,
): RustType =>
  schema === context.schema
    ? rust.path(rustTypeName(name))
    : relative(context, rustSchemaModule(schema, context), rustTypeName(name))

/**
 * The Rust type of a SQL type, not counting nullability. `pgType` is the catalog's spelling,
 * possibly schema-qualified and with `[]` for an array.
 */
export function resolveRustType(
  pgType: string,
  catalog: CatalogSnapshot,
  context: RustTypeContext,
  typeOid?: number,
): RustType {
  if (pgType.endsWith('[]')) {
    const element = resolveRustType(pgType.slice(0, -2), catalog, context)
    return rust.vec(rust.option(element))
  }
  const unmodified = pgType.replace(/\([^)]*\)$/u, '')
  // The dots between names, outside the quotes a name with a dot is written in.
  const parts = (unmodified.match(/(?:"(?:[^"]|"")*"|[^."])+/gu) ?? []).map((part) =>
    part.startsWith('"') ? part.slice(1, -1).replaceAll('""', '"') : part,
  )
  const [schema, name] =
    parts.length > 1 ? [parts[0], parts.slice(1).join('.')] : [undefined, parts[0]!]
  // An unqualified name is the type of the first schema on the search path that has one, as the
  // server names a type it would find there unqualified.
  const visible =
    schema ??
    (context.searchPath ?? ['public']).find((item) =>
      [...catalog.domains, ...catalog.enums, ...catalog.compositeTypes].some(
        (type) => type.schema === item && type.name === name,
      ),
    )
  const matches = (item: { schema: string; name: string; oid?: number }) =>
    (typeOid !== undefined && item.oid === typeOid) ||
    (item.name === name && item.schema === visible)
  const domain = catalog.domains.find(matches)
  if (domain) return rustDeclaredType(domain.schema, domain.name, context)
  const enumeration = catalog.enums.find(matches)
  if (enumeration) return rustDeclaredType(enumeration.schema, enumeration.name, context)
  const composite = catalog.compositeTypes.find(matches)
  if (composite) return rustDeclaredType(composite.schema, composite.name, context)
  const range = rangeSubtype(schema, name, catalog)
  if (range) {
    const subtype = resolveRustType(range.subtype, catalog, context)
    return rustValues(context, range.kind === 'range' ? 'Range' : 'Multirange', subtype)
  }
  const alias = builtinName(name)
  if (alias === 'json' || alias === 'jsonb') return rustValues(context, 'Json')
  if (values[alias]) return rustValues(context, values[alias])
  const type = builtin[alias]
  if (type) return type
  throw new UnsupportedRustTypeError(`Rust has no mapping for PostgreSQL type ${pgType}`)
}

export class UnsupportedRustTypeError extends Error {}

// A domain's base type, as the domain's newtype holds it.
export const rustDomainBase = (
  domain: DomainInfo,
  catalog: CatalogSnapshot,
  context: RustTypeContext,
): RustType => resolveRustType(domain.baseTypeName, catalog, context, domain.baseTypeOid)

export const nullableRustType = (type: RustType, notNull: boolean): RustType =>
  notNull ? type : rust.option(type)

/**
 * A column's Rust type, not counting nullability: an array has the dimension counts its
 * mapping declares, one unless it declares others. One count is nested vectors of that depth,
 * several the dimension enum of those counts.
 */
export function resolveRustColumnType(
  column: { typeName: string; typeOid: number },
  dimensions: number | readonly number[] | undefined,
  catalog: CatalogSnapshot,
  context: RustTypeContext,
): RustType {
  if (dimensions === undefined || !column.typeName.endsWith('[]'))
    return resolveRustType(column.typeName, catalog, context, column.typeOid)
  const counts = [...new Set(typeof dimensions === 'number' ? [dimensions] : dimensions)].sort(
    (left, right) => left - right,
  )
  const element = rust.option(resolveRustType(column.typeName.slice(0, -2), catalog, context))
  if (counts.length > 1) return rustValues(context, `Array${counts.join('Or')}`, element)
  if (counts[0] === 1) return rust.vec(element)
  return rustValues(context, `D${counts[0]}`, element)
}
