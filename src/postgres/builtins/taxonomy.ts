import { splitQualifiedName } from '../../catalog/qualified-name.js'
import type { FunctionMetadata, OperatorMetadata } from './catalog.js'

export type BuiltinCallable = FunctionMetadata | OperatorMetadata
export type TypeNames = Readonly<Record<string, string>>

export const TYPE_FAMILIES = {
  integer: ['int2', 'int4', 'int8'],
  float: ['float4', 'float8'],
  text: ['text', 'varchar', 'bpchar', 'name'],
  temporal: ['date', 'time', 'timetz', 'timestamp', 'timestamptz', 'interval'],
  geometry: ['point', 'line', 'lseg', 'box', 'path', 'polygon', 'circle'],
  'network-address': ['inet', 'cidr'],
  'mac-address': ['macaddr', 'macaddr8'],
  'text-search': ['tsvector', 'tsquery'],
  'bit-string': ['bit', 'varbit'],
  boolean: ['bool'],
} as const

export const DOMAIN_FAMILIES = {
  numeric: ['integer', 'float', 'numeric', 'money'],
  text: ['text', 'char'],
  temporal: ['temporal'],
  binary: ['bytea', 'bit-string'],
  json: ['json', 'jsonb', 'jsonpath'],
  xml: ['xml'],
  arrays: ['array', 'int2vector', 'oidvector'],
  ranges: ['range', 'multirange'],
  geometry: ['geometry'],
  network: ['network-address', 'mac-address'],
  'text-search': ['text-search', 'gtsvector'],
  uuid: ['uuid'],
  catalog: [
    'oid',
    'aclitem',
    'regclass',
    'regtype',
    'regconfig',
    'regcollation',
    'regnamespace',
    'regoperator',
    'regoper',
    'regprocedure',
    'regproc',
    'regrole',
    'regdictionary',
  ],
  transaction: ['xid', 'xid8', 'cid', 'tid', 'pg_lsn', 'pg_snapshot', 'txid_snapshot'],
  boolean: ['boolean'],
  generic: [
    'record',
    'anyelement',
    'anyenum',
    'any',
    'anycompatible',
    'anycompatiblenonarray',
    'anynonarray',
  ],
} as const

export type BuiltinDomain = keyof typeof DOMAIN_FAMILIES | 'support' | 'aggregates' | 'windows'

export const GROUPING_RULES = [
  'Aggregates and window functions belong to aggregates and windows respectively.',
  'Other signatures involving internal or cstring belong to support.',
  'A domain-specific result selects its domain; numeric, text, Boolean, generic, and support results defer to arguments.',
  'Otherwise select the first domain-specific argument, then the first numeric/text argument, then the first generic argument, then the result domain.',
  'Type families and domains use explicit alias lists, catalog-rendered arrays, and range/multirange names; unmapped families belong to support.',
  'Comparison/predicate/value classification, exact ordered signatures, and execution shape remain member metadata and do not split domains.',
] as const

const aliases = new Map<string, string>(
  Object.entries(TYPE_FAMILIES).flatMap(([family, names]) =>
    names.map((name) => [name, family] as const),
  ),
)
const domains = new Map<string, BuiltinDomain>(
  Object.entries(DOMAIN_FAMILIES).flatMap(([domain, families]) =>
    families.map((family) => [family, domain as BuiltinDomain] as const),
  ),
)
const scalarDomains = new Set<BuiltinDomain>(['numeric', 'text', 'boolean', 'generic', 'support'])

export function typeFamily(type: string, typeNames: TypeNames): string {
  const { schema, name } = splitQualifiedName(type)
  if (schema !== 'pg_catalog') return type
  const alias = aliases.get(name)
  if (alias) return alias
  const display = typeNames[type]
  if (display?.endsWith('[]') || name === 'anyarray' || name === 'anycompatiblearray')
    return 'array'
  if (name.endsWith('multirange')) return 'multirange'
  if (name.endsWith('range')) return 'range'
  return display === undefined ? type : name
}

export function builtinDomain(callable: BuiltinCallable, typeNames: TypeNames): BuiltinDomain {
  if (callable.kind === 'aggregate') return 'aggregates'
  if (callable.kind === 'window') return 'windows'
  const families = [callable.result, ...callable.args].map((type) => typeFamily(type, typeNames))
  if (families.some((family) => family === 'internal' || family === 'cstring')) return 'support'
  const result = domains.get(families[0]!) ?? 'support'
  const args = families.slice(1).map((family) => domains.get(family) ?? 'support')
  if (!scalarDomains.has(result)) return result
  return (
    args.find((domain) => !scalarDomains.has(domain)) ??
    args.find((domain) => domain === 'numeric' || domain === 'text') ??
    args.find((domain) => domain === 'generic') ??
    result
  )
}

export interface BuiltinInventoryGroup {
  domain: BuiltinDomain
  inventory: Readonly<Record<string, BuiltinCallable>>
}

export const domainExportName = (domain: BuiltinDomain): string =>
  `PG18_${domain.replaceAll('-', '_').toUpperCase()}`
