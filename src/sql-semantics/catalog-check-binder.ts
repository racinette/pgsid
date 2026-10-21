import {
  capturedRangeType,
  rangeTypeProfile,
  multirangeTypeProfile,
  rangeTypeOutput,
  rangeTypeInput,
  type RangeProfile,
} from './range-profiles.js'
import { alignStoredDomainCoercions } from './stored-coercions.js'
import {
  rangeConstructorImplementation,
  rangeCallTypeKey,
  resolveRangeCall,
} from './range-callables.js'
import { parseSync } from 'libpg-query'
import type {
  ColumnInfo,
  DomainInfo,
  RangeTypeInfo,
  RangeCallInfo,
  EnumInfo,
  StoredDomainCoercionContext,
} from '../catalog/types.js'
import { PG18_BUILTIN_GROUPS } from '../postgres/builtins/groups.generated.js'
import {
  builtinCast,
  builtinMetadata,
  builtinTypeResolution,
  builtinBtreeComparisons,
  builtinTypeIO,
  builtinTypeComparison,
} from '../postgres/builtins/inventory.js'
import { builtinDefaultArguments } from '../postgres/builtins/default-arguments.js'
import type { BuiltinCallable } from '../postgres/builtins/taxonomy.js'
import type { EvalExpression } from './eval-expressions.js'
import type { EvalBoolExpression } from './check-expressions.js'
import {
  combineCollations,
  defaultCollation,
  isRegexArrayCallable,
  supportsTextCallableCollation,
  type BoundCollation,
} from './collation.js'
import {
  enumType,
  capturedEnumSupport,
  catalogScalarType,
  arrayType,
  domainElementType,
  domainElementDefinition,
  arrayElementBaseType,
  type ArrayType,
  type ArrayElementType,
  isOidType,
  isOidAliasType,
  isSnapshotType,
  isRangeType,
  isMultirangeType,
  type MultirangeType,
  type RangeType,
  isBinaryTextRelabel,
  isBinaryBitRelabel,
  type ScalarType,
  type SnapshotType,
  type SqlExpression,
} from './expressions.js'

type Fields = Record<string, unknown>
const fields = (value: unknown): Fields | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Fields) : null
const strings = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null
  const names = value.map((entry) => fields(fields(entry)?.['String'])?.['sval'])
  return names.every((name): name is string => typeof name === 'string') ? names : null
}

export type CheckColumn = Pick<ColumnInfo, 'name' | 'typeName' | 'collationIsC' | 'isRowType'> &
  Partial<
    Pick<ColumnInfo, 'typeOid' | 'collationDeterministic' | 'collationIsDefault' | 'collationOid'>
  >

export function catalogEnumDefinition(
  name: string,
  enums: readonly EnumInfo[],
  oid?: number,
  domains: readonly DomainInfo[] = [],
): EnumInfo | null {
  const seen = new Set<number>()
  while (oid !== undefined && !seen.has(oid)) {
    seen.add(oid)
    const definition = enums.find((item) => item.oid === oid)
    if (definition) return definition
    const domain = domains.find((item) => item.oid === oid)
    if (!domain) break
    oid = domain.baseTypeOid
  }
  if (oid !== undefined) return null
  try {
    const parsed = parseSync(`SELECT NULL::${name}`)
    const select = fields(fields(parsed.stmts?.[0]?.stmt)?.['SelectStmt'])
    const targets = select?.['targetList']
    const target = Array.isArray(targets) ? fields(fields(targets[0])?.['ResTarget']) : null
    const cast = fields(fields(target?.['val'])?.['TypeCast'])
    const type = fields(cast?.['typeName'])
    if (Array.isArray(type?.['arrayBounds']) && type['arrayBounds'].length) return null
    const names = strings(type?.['names'])
    const matches = enums.filter((item) =>
      names?.length === 2
        ? item.schema === names[0] && item.name === names[1]
        : names?.length === 1 && item.name === names[0],
    )
    return matches.length === 1 ? matches[0]! : null
  } catch {
    return null
  }
}

export { catalogScalarType } from './expressions.js'

export function catalogArrayType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
  enums: readonly EnumInfo[] = [],
  rangeTypes: readonly RangeTypeInfo[] = [],
  elementDomains: ReadonlySet<number> = new Set(),
): ArrayType | null {
  const seen = new Set<number>()
  while (oid !== undefined && !seen.has(oid)) {
    seen.add(oid)
    const domain = domains.find((item) => item.oid === oid)
    if (!domain) break
    name = domain.baseTypeName
    oid = domain.baseTypeOid
  }
  const builtin = catalogScalarType(name)
  if (builtin?.startsWith('array:')) return builtin as ArrayType
  const relative =
    !name.endsWith('[]') &&
    rangeTypes.find(
      (p) =>
        rangeCallTypeKey(p.array) === rangeCallTypeKey(name) ||
        rangeCallTypeKey(p.multirangeArray) === rangeCallTypeKey(name),
    )
  if (relative) {
    const scalar = catalogBaseScalarType(
      rangeCallTypeKey(relative.array) === rangeCallTypeKey(name)
        ? relative.identity
        : relative.multirange,
      undefined,
      domains,
      rangeTypes,
    )
    return scalar ? arrayType(scalar as ArrayElementType) : null
  }
  if (!name.endsWith('[]')) return null
  const scalar = catalogBaseScalarType(
    name.replace(/(?:\[\])+$/u, ''),
    undefined,
    domains,
    rangeTypes,
  )
  if (isRangeType(scalar) || isMultirangeType(scalar)) return arrayType(scalar)
  const definition = catalogEnumDefinition(name.replace(/(?:\[\])+$/u, ''), enums)
  if (definition) return arrayType(enumType(definition))
  try {
    const parsed = parseSync(`SELECT NULL::${name}`)
    const select = fields(fields(parsed.stmts?.[0]?.stmt)?.['SelectStmt'])
    const targets = select?.['targetList']
    const target = Array.isArray(targets) ? fields(fields(targets[0])?.['ResTarget']) : null
    const cast = fields(fields(target?.['val'])?.['TypeCast'])
    const typeName = fields(cast?.['typeName'])
    const names = strings(typeName?.['names'])
    const matches = domains.filter((item) =>
      names?.length === 2
        ? item.schema === names[0] && item.name === names[1]
        : names?.length === 1 && item.name === names[0],
    )
    if (matches.length !== 1) return null
    const domain = matches[0]!
    if (elementDomains.has(domain.oid)) return null
    const base =
      catalogArrayType(
        domain.baseTypeName,
        domain.baseTypeOid,
        domains,
        enums,
        rangeTypes,
        new Set([...elementDomains, domain.oid]),
      ) ?? catalogBaseScalarType(domain.baseTypeName, domain.baseTypeOid, domains, rangeTypes)
    const enumBase = catalogEnumDefinition(domain.baseTypeName, enums, domain.baseTypeOid, domains)
    const carrier = enumBase ? enumType(enumBase) : base
    return carrier && !carrier.startsWith('domain:')
      ? arrayType(domainElementType(domain, carrier as Exclude<ScalarType, `domain:${string}`>))
      : null
  } catch {
    return null
  }
}

export function catalogDateType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogTemporalType(name, oid, domains) === 'pg_catalog.date'
}

function capturedCatalogRange(
  name: string,
  domains: readonly DomainInfo[],
  rangeTypes: readonly RangeTypeInfo[],
  multi: boolean,
): RangeType | MultirangeType | null {
  if (!rangeTypes.length) return null
  const names = catalogTypeNames(name)
  if (!names) return null
  const matches = rangeTypes.filter((profile) => {
    const schema = multi ? profile.multirangeSchema : profile.schema
    const typeName = multi ? profile.multirangeName : profile.name
    return names.length === 2
      ? names[0] === schema && names[1] === typeName
      : names.length === 1 && names[0] === typeName
  })
  if (matches.length !== 1) return null
  const profile = matches[0]!
  const subtypeNames = catalogTypeNames(profile.subtype)
  const subtypeDomain = domains.find(
    (domain) =>
      subtypeNames?.length === 2 &&
      domain.schema === subtypeNames[0] &&
      domain.name === subtypeNames[1],
  )
  const element = profile.subtypeEnum
    ? enumType(profile.subtypeEnum)
    : catalogBaseScalarType(profile.subtype, subtypeDomain?.oid, domains)
  const type = element ? capturedRangeType(profile, element) : null
  return type && multi ? multirangeTypeProfile(`multirange:${type.slice(6)}`)!.multirangeType : type
}

function rangeSubtypeIdentity(profile: RangeProfile): ScalarType {
  if (profile.subtype === profile.elementType) return profile.elementType
  const names = catalogTypeNames(profile.subtype)
  if (
    profile.subtypeEnum &&
    names?.length === 2 &&
    names[0] === profile.subtypeEnum.schema &&
    names[1] === profile.subtypeEnum.name
  )
    return profile.elementType
  return names?.length === 2
    ? domainElementType({ schema: names[0]!, name: names[1]! }, profile.elementType)
    : profile.elementType
}

function catalogTypeNames(name: string): string[] | null {
  try {
    const parsed = parseSync(`SELECT NULL::${name}`)
    if (parsed.stmts?.length !== 1) return null
    const select = fields(fields(parsed.stmts[0]?.stmt)?.['SelectStmt'])
    const targets = select?.['targetList']
    const target = Array.isArray(targets) ? fields(fields(targets[0])?.['ResTarget']) : null
    const cast = fields(fields(target?.['val'])?.['TypeCast'])
    const type = fields(cast?.['typeName'])
    if (Array.isArray(type?.['arrayBounds']) && type['arrayBounds'].length) return null
    if (Array.isArray(type?.['typmods']) && type['typmods'].length) return null
    return strings(type?.['names'])
  } catch {
    return null
  }
}

function catalogBaseScalarType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
  rangeTypes: readonly RangeTypeInfo[] = [],
): ScalarType | null {
  const seen = new Set<number>()
  while (oid !== undefined && !seen.has(oid)) {
    seen.add(oid)
    const domain = domains.find((domain) => domain.oid === oid)
    if (!domain) break
    name = domain.baseTypeName
    oid = domain.baseTypeOid
  }
  return (
    catalogScalarType(name) ??
    capturedCatalogRange(name, domains, rangeTypes, false) ??
    capturedCatalogRange(name, domains, rangeTypes, true)
  )
}

export function catalogPointType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.point'
}

export function catalogLineType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.line'
}
export function catalogLsegType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.lseg'
}
export function catalogMoneyType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.money'
}

export function catalogXidType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.xid'
}

export function catalogCidType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.cid'
}

export function catalogPgLsnType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.pg_lsn'
}

export function catalogInternalCharType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog."char"'
}

export function catalogTidType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.tid'
}

export function catalogXid8Type(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.xid8'
}

export function catalogOidType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return isOidType(catalogBaseScalarType(name, oid, domains))
}

export function catalogSnapshotType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): SnapshotType | null {
  const type = catalogBaseScalarType(name, oid, domains)
  return isSnapshotType(type) ? type : null
}

export function catalogMultirangeType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
  rangeTypes: readonly RangeTypeInfo[] = [],
): MultirangeType | null {
  const type = catalogBaseScalarType(name, oid, domains, rangeTypes)
  return isMultirangeType(type) ? type : null
}

export function catalogRangeType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
  rangeTypes: readonly RangeTypeInfo[] = [],
): RangeType | null {
  const type = catalogBaseScalarType(name, oid, domains, rangeTypes)
  return isRangeType(type) ? type : null
}

export function catalogJsonType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog."json"'
}

export function catalogJsonbType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.jsonb'
}

export function catalogJsonpathType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.jsonpath'
}

export function catalogPolygonType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.polygon'
}

export function catalogPathType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.path'
}

export function catalogCircleType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.circle'
}

export function catalogBoxType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog.box'
}

export function catalogNumericType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogBaseScalarType(name, oid, domains) === 'pg_catalog."numeric"'
}

export function catalogFloatType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): 'pg_catalog.float4' | 'pg_catalog.float8' | null {
  const type = catalogBaseScalarType(name, oid, domains)
  return type === 'pg_catalog.float4' || type === 'pg_catalog.float8' ? type : null
}

export function catalogTemporalType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
):
  | 'pg_catalog.date'
  | 'pg_catalog."timestamp"'
  | 'pg_catalog.timestamptz'
  | 'pg_catalog."time"'
  | 'pg_catalog.timetz'
  | 'pg_catalog."interval"'
  | null {
  const type = catalogBaseScalarType(name, oid, domains)
  return type === 'pg_catalog."time"' ||
    type === 'pg_catalog.timetz' ||
    type === 'pg_catalog."interval"' ||
    type === 'pg_catalog.date' ||
    type === 'pg_catalog."timestamp"' ||
    type === 'pg_catalog.timestamptz'
    ? type
    : null
}

const callables = PG18_BUILTIN_GROUPS.flatMap(({ inventory }) =>
  Object.entries(inventory)
    .filter(([, item]) => !item.returnsSet)
    .map(([signature, item]) => ({ signature, item })),
)

type Literal = {
  kind: 'string' | 'integer' | 'null'
  value: string | null
  moneyUnits?: string
}
type Bound = {
  type: ScalarType | null
  value: EvalExpression | null
  literal?: Literal
  collation?: BoundCollation
  enum?: EnumInfo
  enumDomain?: number
  nominalDomain?: string
}

const nominalScalarType = (arg: Bound): ScalarType | null => {
  const type = boundType(arg)
  if (!arg.nominalDomain || !type) return type
  const [schema, name] = JSON.parse(arg.nominalDomain) as [string, string]
  return domainElementType(
    { schema, name },
    arrayElementBaseType(type) as Exclude<ScalarType, `domain:${string}`>,
  )
}

const implicitTypeCast = (source: string, target: string): boolean => {
  if (source === target) return true
  if (source.startsWith('array:') && target.startsWith('array:'))
    return implicitTypeCast(source.slice(6), target.slice(6))
  const from = arrayElementBaseType(source),
    to = arrayElementBaseType(target)
  return from === to || builtinCast(from, to)?.context === 'i'
}

const commonNominalDomain = (args: readonly Bound[]): string | undefined => {
  const domain = args[0]?.nominalDomain
  return domain !== undefined && args.every((arg) => arg.nominalDomain === domain)
    ? domain
    : undefined
}
const commonEnumDomain = (args: readonly Bound[]): number | undefined => {
  const domain = args[0]?.enumDomain
  return domain !== undefined && args.every((arg) => arg.enumDomain === domain) ? domain : undefined
}
const unknown: Bound = { type: null, value: null }

const literalValue = (literal: Literal, type: ScalarType): SqlExpression | null => {
  if (isMultirangeType(type) && (literal.kind === 'null' || literal.kind === 'string'))
    return { kind: 'multirange', type, value: literal.value }
  if (isRangeType(type) && (literal.kind === 'null' || literal.kind === 'string'))
    return { kind: 'range', type, value: literal.value }
  if (type === 'pg_catalog.jsonpath' && (literal.kind === 'null' || literal.kind === 'string'))
    return { kind: 'jsonpath', type, value: literal.value }
  if (type === 'pg_catalog.jsonb' && (literal.kind === 'null' || literal.kind === 'string'))
    return { kind: 'jsonb', type, value: literal.value }
  if (type === 'pg_catalog."json"' && (literal.kind === 'null' || literal.kind === 'string'))
    return { kind: 'json', type, value: literal.value }
  if (
    (type === 'pg_catalog."bit"' || type === 'pg_catalog.varbit') &&
    (literal.kind === 'string' || literal.kind === 'null')
  )
    return { kind: 'bit', type, value: literal.value }
  if ((type === 'pg_catalog.float4' || type === 'pg_catalog.float8') && literal.kind === 'null')
    return { kind: 'float', type, bits: null }
  if (type === 'pg_catalog.point' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'point', type, value: literal.value }
  if (type === 'pg_catalog.line' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'line', type, value: literal.value }
  if (type === 'pg_catalog.lseg' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'lseg', type, value: literal.value }
  if (type === 'pg_catalog.money' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'money', type, value: literal.value, units: literal.moneyUnits }
  if (type === 'pg_catalog.xid' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'xid', type, value: literal.value }
  if (type === 'pg_catalog.cid' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'cid', type, value: literal.value }
  if (type === 'pg_catalog.pg_lsn' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'pg_lsn', type, value: literal.value }
  if (type === 'pg_catalog.refcursor' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'refcursor', type, value: literal.value }
  if (type === 'pg_catalog.name' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'name', type, value: literal.value }
  if (type === 'pg_catalog."char"' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'internal-char', type, value: literal.value }
  if (type === 'pg_catalog.tid' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'tid', type, value: literal.value }
  if (type === 'pg_catalog.xid8' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'xid8', type, value: literal.value }
  if (isSnapshotType(type) && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'snapshot', type, value: literal.value }
  if (isOidAliasType(type) && (literal.kind === 'string' || literal.kind === 'null'))
    return {
      kind: 'oid',
      type,
      value: literal.value,
    }
  if (
    type === 'pg_catalog.oid' &&
    (literal.kind === 'string' || literal.kind === 'integer' || literal.kind === 'null')
  )
    return { kind: 'oid', type, value: literal.value }
  if (type === 'pg_catalog.polygon' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'polygon', type, value: literal.value }
  if (type === 'pg_catalog.path' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'path', type, value: literal.value }
  if (type === 'pg_catalog.circle' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'circle', type, value: literal.value }
  if (type === 'pg_catalog.box' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'box', type, value: literal.value }
  if (type === 'pg_catalog.uuid' && (literal.kind === 'string' || literal.kind === 'null'))
    return { kind: 'uuid', type, value: literal.value }
  if (type === 'pg_catalog.bytea') {
    if (literal.kind === 'null') return { kind: 'bytea', type, value: null }
    return null
  }
  if (
    (type === 'pg_catalog."time"' ||
      type === 'pg_catalog.timetz' ||
      type === 'pg_catalog."interval"' ||
      type === 'pg_catalog.date' ||
      type === 'pg_catalog."timestamp"' ||
      type === 'pg_catalog.timestamptz') &&
    (literal.kind === 'null' || literal.kind === 'string')
  ) {
    return { kind: 'temporal', type, value: literal.value }
  }
  if (
    (type === 'pg_catalog.inet' || type === 'pg_catalog.cidr') &&
    (literal.kind === 'string' || literal.kind === 'null')
  )
    return { kind: 'network', type, value: literal.value }
  if (
    (type === 'pg_catalog.macaddr' || type === 'pg_catalog.macaddr8') &&
    (literal.kind === 'string' || literal.kind === 'null')
  )
    return { kind: 'mac', type, value: literal.value }
  if (type === 'pg_catalog."numeric"') return { kind: 'decimal', type, value: literal.value }
  if (literal.kind === 'null') {
    if (type.startsWith('array:'))
      return {
        kind: 'array',
        type: type as ArrayType,
        elementType: type.slice(6) as Exclude<ScalarType, ArrayType>,
        dimensions: [],
        lowerBounds: [],
        elements: null,
      }
    if (type === 'pg_catalog.bool') return { kind: 'boolean', type, value: null }
    if (
      type === 'pg_catalog.text' ||
      type === 'pg_catalog."varchar"' ||
      type === 'pg_catalog.bpchar'
    )
      return { kind: 'text', type, value: null }
    if (/^pg_catalog\.int[248]$/u.test(type))
      return {
        kind: 'integer',
        type: type as 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8',
        value: null,
      }
    return null
  }
  if (
    literal.kind === 'string' &&
    (type === 'pg_catalog.text' || type === 'pg_catalog."varchar"' || type === 'pg_catalog.bpchar')
  )
    return { kind: 'text', type, value: literal.value }
  if (
    literal.kind === 'integer' &&
    (type === 'pg_catalog.int2' || type === 'pg_catalog.int4' || type === 'pg_catalog.int8')
  ) {
    const integer = BigInt(literal.value!)
    const limit =
      type === 'pg_catalog.int2'
        ? 32767n
        : type === 'pg_catalog.int4'
          ? 2147483647n
          : 9223372036854775807n
    return integer >= -limit - 1n && integer <= limit
      ? { kind: 'integer', type, value: literal.value }
      : null
  }
  return null
}
const materialize = (
  bound: Bound,
  type: ScalarType,
  definition = bound.enum,
): EvalExpression | null => {
  if (
    type === 'pg_catalog."numeric"' &&
    bound.value?.kind === 'certain' &&
    bound.value.expression.kind === 'integer'
  ) {
    const constant = bound.value.expression
    if (
      constant.type === 'pg_catalog.int2' ||
      constant.type === 'pg_catalog.int4' ||
      constant.type === 'pg_catalog.int8'
    ) {
      const checked = literalValue(
        { kind: constant.value === null ? 'null' : 'integer', value: constant.value },
        constant.type,
      )
      return checked
        ? { kind: 'certain', expression: { kind: 'decimal', type, value: constant.value } }
        : null
    }
  }
  if (bound.literal) {
    if (type === 'pg_catalog.bool' && bound.literal.kind === 'string')
      return {
        kind: 'text-to-boolean',
        type,
        literal: true,
        operand: {
          kind: 'certain',
          expression: { kind: 'text', type: 'pg_catalog.text', value: bound.literal.value },
        },
      }
    if (isIntegerType(type) && bound.literal.kind === 'string')
      return {
        kind: 'text-to-integer',
        type,
        literal: true,
        operand: {
          kind: 'certain',
          expression: { kind: 'text', type: 'pg_catalog.text', value: bound.literal.value },
        },
      }
    if (type === 'pg_catalog."numeric"' && bound.literal.kind === 'string')
      return {
        kind: 'text-to-numeric',
        type,
        literal: true,
        operand: {
          kind: 'certain',
          expression: { kind: 'text', type: 'pg_catalog.text', value: bound.literal.value },
        },
      }
    if (
      type.startsWith('array:') &&
      bound.literal.kind === 'string' &&
      bound.literal.value !== null
    )
      return {
        kind: 'array-text-literal',
        type: type as ArrayType,
        elementType: type.slice(6) as ArrayElementType,
        value: bound.literal.value,
        ...(definition ? { enum: definition } : {}),
      }
    if (
      (type === 'pg_catalog.float4' || type === 'pg_catalog.float8') &&
      bound.literal.kind !== 'null'
    )
      return {
        kind: 'text-to-float',
        type,
        operand: {
          kind: 'certain',
          expression: { kind: 'text', type: 'pg_catalog.text', value: bound.literal.value },
        },
      }

    if (type === 'pg_catalog.bytea' && bound.literal.kind === 'string')
      return {
        kind: 'text-to-bytea',
        type,
        operand: {
          kind: 'certain',
          expression: { kind: 'text', type: 'pg_catalog.text', value: bound.literal.value },
        },
      }
    if (type.startsWith('enum:') && definition && enumType(definition) === type) {
      const value = bound.literal.value
      return bound.literal.kind === 'null' ||
        (bound.literal.kind === 'string' && value !== null && definition.values.includes(value))
        ? {
            kind: 'certain',
            expression: { kind: 'enum', type: enumType(definition), enum: definition, value },
          }
        : null
    }
    const expression = literalValue(bound.literal, type)
    return expression ? { kind: 'certain', expression } : null
  }
  if (
    bound.type !== null &&
    bound.type !== type &&
    bound.value &&
    isBinaryBitRelabel(bound.type, type)
  )
    return { kind: 'call', call: { kind: 'cast', signature: null, type }, operands: [bound.value] }
  if (
    bound.value &&
    ((bound.type === 'pg_catalog.int4' && isOidType(type)) ||
      (isOidType(bound.type) && type === 'pg_catalog.int4') ||
      (isOidType(bound.type) && isOidType(type))) &&
    builtinCast(bound.type, type)?.method === 'b'
  )
    return { kind: 'call', call: { kind: 'cast', signature: null, type }, operands: [bound.value] }
  if (
    bound.type === 'pg_catalog.cidr' &&
    type === 'pg_catalog.inet' &&
    bound.value &&
    builtinCast(bound.type, type)?.method === 'b'
  )
    return { kind: 'call', call: { kind: 'cast', signature: null, type }, operands: [bound.value] }
  if (
    bound.type !== null &&
    bound.type !== type &&
    bound.value &&
    ['pg_catalog.text', 'pg_catalog."varchar"'].includes(bound.type) &&
    ['pg_catalog.text', 'pg_catalog."varchar"'].includes(type) &&
    builtinCast(bound.type, type)?.context === 'i'
  )
    return { kind: 'call', call: { kind: 'cast', signature: null, type }, operands: [bound.value] }
  if (
    bound.type !== null &&
    bound.type !== type &&
    bound.value &&
    isMacType(bound.type) &&
    isMacType(type)
  ) {
    const cast = builtinCast(bound.type, type)
    if (cast?.context === 'i' && cast.method === 'f' && cast.implementation !== null)
      return {
        kind: 'call',
        call: { kind: 'cast', signature: cast.implementation, type },
        operands: [bound.value],
      }
  }
  return bound.type === type ? bound.value : null
}

type ResolvedCallable = {
  signature: string
  item: BuiltinCallable
  operands: EvalExpression[]
  collation?: BoundCollation
  enum?: EnumInfo
  resultType?: ScalarType
  resultNominalDomain?: string
  matchingArgs?: readonly string[]
}
const boundType = (arg: Bound): ScalarType | null =>
  arg.type ?? (arg.literal?.kind === 'integer' ? 'pg_catalog.int4' : null)
const isIntegerType = (
  type: string | null,
): type is 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8' =>
  type !== null && /^pg_catalog\.int[248]$/u.test(type)

const materializeInteger = (arg: Bound, target: ScalarType): EvalExpression | null => {
  const source = boundType(arg)
  const value = materialize(arg, source ?? target)
  if (!value || source === null || source === target) return value
  const cast = builtinCast(source, target)
  return cast?.context === 'i' && cast.method === 'f' && cast.implementation !== null
    ? {
        kind: 'call',
        call: { kind: 'cast', signature: cast.implementation, type: target },
        operands: [value],
      }
    : null
}

const isMacType = (type: string | null): boolean =>
  type === 'pg_catalog.macaddr' || type === 'pg_catalog.macaddr8'

const macCommonType = (arms: readonly Bound[]): ScalarType | undefined => {
  const types = arms.flatMap((arm) => (arm.type ? [arm.type] : []))
  return types.length && types.every(isMacType) ? types[0] : undefined
}

const bitCommonType = (arms: readonly Bound[]): ScalarType | undefined => {
  const types = arms.flatMap((arm) => (arm.type ? [arm.type] : []))
  return types.length && types.every((type) => isBinaryBitRelabel(type, type))
    ? types[0]
    : undefined
}

const networkCommonType = (arms: readonly Bound[]): ScalarType | undefined => {
  const types = arms.flatMap((arm) => (arm.type ? [arm.type] : []))
  if (
    !types.length ||
    types.some((type) => type !== 'pg_catalog.inet' && type !== 'pg_catalog.cidr')
  )
    return undefined
  return types.includes('pg_catalog.inet') ? 'pg_catalog.inet' : 'pg_catalog.cidr'
}

const integerCommonType = (arms: readonly Bound[]): ScalarType | undefined => {
  const types = arms.map(boundType)
  if (!types.some(isIntegerType)) return undefined
  if (types.some((type) => type !== null && !isIntegerType(type))) return undefined
  let selected: ScalarType | null = null
  for (const type of types) {
    if (type === null || type === selected) continue
    if (
      selected === null ||
      (builtinCast(selected, type)?.context === 'i' && builtinCast(type, selected)?.context !== 'i')
    )
      selected = type
  }
  return selected ?? undefined
}

const integerCandidate = (
  kind: 'operator' | 'function',
  name: string,
  args: readonly Bound[],
): ResolvedCallable | null | undefined => {
  const types = args.map(boundType)
  if (
    !types.some(isIntegerType) ||
    types.some((type) => type !== null && !isIntegerType(type)) ||
    args.some((arg, index) => types[index] === null && arg.literal?.kind !== 'null')
  )
    return undefined
  const matches = callables.filter(
    ({ item }) =>
      item.kind === kind &&
      item.schema === 'pg_catalog' &&
      item.name === name &&
      item.args.length === args.length &&
      item.args.every((target, index) => {
        const source = types[index]!
        return source === null || source === target || builtinCast(source, target)?.context === 'i'
      }),
  )
  let exactTypes = types
  if (kind === 'operator' && types.length === 2 && types.includes(null)) {
    const known = types.find((type) => type !== null)!
    exactTypes = types.map((type) => type ?? known)
  }
  const exact = matches.filter(({ item }) =>
    item.args.every((type, index) => type === exactTypes[index]),
  )
  const scores = matches.map(
    ({ item }) => item.args.filter((type, index) => type === types[index]).length,
  )
  const maximum = Math.max(-1, ...scores)
  const best = exact.length ? exact : matches.filter((_, index) => scores[index] === maximum)
  if (best.length !== 1) return null
  const selected = best[0]!
  if (
    !selected.item.args.every((type) => catalogScalarType(type)) ||
    !catalogScalarType(selected.item.result)
  )
    return null
  const operands = args.map((arg, index): EvalExpression | null => {
    const target = selected.item.args[index]! as ScalarType
    return isIntegerType(target) ? materializeInteger(arg, target) : implicitOperand(arg, target)
  })
  return operands.every((value): value is EvalExpression => value !== null)
    ? { ...selected, operands }
    : null
}

const candidate = (
  kind: 'operator' | 'function',
  name: string,
  args: readonly Bound[],
  bindDefault?: (node: unknown) => Bound,
  explicitVariadic = false,
  coerce: (
    arg: Bound,
    target: ScalarType,
    definition?: EnumInfo,
  ) => EvalExpression | null = implicitOperand,
): ResolvedCallable | null => {
  const hasOmittedDefaults =
    kind === 'function' &&
    callables.some(
      ({ item }) =>
        item.kind === 'function' &&
        item.schema === 'pg_catalog' &&
        item.name === name &&
        item.args.length > args.length &&
        item.args.length - args.length <= item.numArgDefaults,
    )
  const hasAnyElement = callables.some(
    ({ item }) =>
      item.kind === kind &&
      item.schema === 'pg_catalog' &&
      item.name === name &&
      (item.args.includes('pg_catalog.anyelement') ||
        (item.args.length === args.length &&
          item.args.some((type) =>
            ['pg_catalog.anycompatiblearray', 'pg_catalog.anycompatible'].includes(type),
          ))),
  )
  const hasVariadicAny = callables.some(
    ({ item }) =>
      item.kind === kind &&
      item.schema === 'pg_catalog' &&
      item.name === name &&
      item.kind === 'function' &&
      item.variadic === 'pg_catalog."any"',
  )
  const hasTypedVariadic =
    explicitVariadic ||
    callables.some(
      ({ item }) =>
        item.kind === kind &&
        item.kind === 'function' &&
        item.name === name &&
        item.variadic !== null &&
        item.variadic !== 'pg_catalog."any"',
    )
  if (
    !hasAnyElement &&
    !hasVariadicAny &&
    !hasTypedVariadic &&
    !hasOmittedDefaults &&
    ((kind === 'function' && name === 'char') ||
      args.some(
        (arg) =>
          arg.type === 'pg_catalog.float4' ||
          arg.type === 'pg_catalog.float8' ||
          arg.type === 'pg_catalog."numeric"' ||
          isOidType(arg.type),
      ))
  )
    return comparisonCandidate(args, name, true, kind, false)
  const integer =
    hasOmittedDefaults || hasAnyElement || hasVariadicAny || hasTypedVariadic
      ? undefined
      : integerCandidate(kind, name, args)
  if (integer !== undefined) return integer
  const expandedMatches = callables.flatMap(({ signature, item }) => {
    const variadicAny =
      !explicitVariadic && item.kind === 'function' && item.variadic === 'pg_catalog."any"'
    const typedVariadic =
      !explicitVariadic &&
      item.kind === 'function' &&
      item.variadic !== null &&
      item.variadic !== 'pg_catalog."any"'
    const explicitAny =
      explicitVariadic && item.kind === 'function' && item.variadic === 'pg_catalog."any"'
    if (
      explicitVariadic &&
      (item.kind !== 'function' || (item.variadic !== null && item.args.length !== args.length))
    )
      return []
    if (
      item.kind !== kind ||
      item.schema !== 'pg_catalog' ||
      item.name !== name ||
      (variadicAny
        ? args.length < item.args.length
        : typedVariadic
          ? args.length < item.args.length
          : item.args.length < args.length) ||
      (!catalogScalarType(item.result) &&
        ![
          'pg_catalog.anyenum',
          'pg_catalog.anyarray',
          'pg_catalog.anycompatiblearray',
          'pg_catalog.anycompatible',
          'pg_catalog.anyrange',
          'pg_catalog.anymultirange',
          'pg_catalog.anyelement',
        ].includes(item.result))
    )
      return []
    let fullArgs = args
    if (typedVariadic && item.kind === 'function') {
      const array = catalogScalarType(item.args.at(-1)!)
      const element = catalogScalarType(item.variadic!)
      if (!array?.startsWith('array:') || !element || array !== `array:${element}`) return []
      const fixed = item.args.length - 1
      const tail = args.slice(fixed)
      const values = tail.map((arg) => implicitOperand(arg, element, arg.enum))
      if (!values.every((value): value is EvalExpression => value !== null)) return []
      fullArgs = [
        ...args.slice(0, fixed),
        {
          type: array as ArrayType,
          value: {
            kind: 'array-constructor',
            type: array as ArrayType,
            elementType: element as ArrayElementType,
            multidimensional: false,
            operands: values,
          },
          collation:
            combineCollations(tail.map((arg) => arg.collation)) ??
            arrayElementCollation(element as ArrayElementType),
        },
      ]
    }
    const matchingArgs =
      typedVariadic && item.kind === 'function'
        ? [...item.args.slice(0, -1), ...args.slice(item.args.length - 1).map(() => item.variadic!)]
        : item.args
    if (!variadicAny && item.args.length > args.length) {
      if (item.kind !== 'function' || !bindDefault) return []
      const missing = item.args.length - args.length
      if (missing > item.numArgDefaults) return []
      const defaults = builtinDefaultArguments(item)
      if (!defaults) return []
      const expanded = defaults.slice(defaults.length - missing).map((node, index) => {
        const bound = bindDefault(node)
        const type = catalogScalarType(item.args[args.length + index]!)
        const value = type ? implicitOperand(bound, type) : null
        return value && type ? { ...bound, type, value, literal: undefined } : bound
      })
      if (expanded.some((arg) => !arg.value && !arg.literal)) return []
      fullArgs = [...args, ...expanded]
    }
    const collation = item.args.some(
      (type) => type === 'pg_catalog.anyarray' || type === 'pg_catalog.anycompatiblearray',
    )
      ? arrayCollations(fullArgs.map((arg) => arg.collation))
      : combineCollations(fullArgs.map((arg) => arg.collation))
    if (collation?.explicit && collation.identity === 'conflict') return []
    if (
      item.args.some((type) =>
        [
          'pg_catalog.name',
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
        ].includes(type),
      ) &&
      !supportsTextCallableCollation(signature, collation?.kind) &&
      !isRegexArrayCallable(signature)
    )
      return []
    const multirangeTypes = fullArgs.flatMap((arg, index) =>
      item.args[index] === 'pg_catalog.anymultirange' && isMultirangeType(arg.type)
        ? [arg.type]
        : [],
    )
    const multirangeIdentity = multirangeTypes[0]
    if (
      item.args.includes('pg_catalog.anymultirange') &&
      (!multirangeIdentity || multirangeTypes.some((type) => type !== multirangeIdentity))
    )
      return []
    const rangeTypes = [
      ...multirangeTypes.map((type) => multirangeTypeProfile(type)!.rangeType),
      ...fullArgs.flatMap((arg, index) =>
        item.args[index] === 'pg_catalog.anyrange' && isRangeType(arg.type) ? [arg.type] : [],
      ),
    ]
    const rangeIdentity = rangeTypes[0]
    if (
      item.args.includes('pg_catalog.anyrange') &&
      (!rangeIdentity || rangeTypes.some((type) => type !== rangeIdentity))
    )
      return []
    const rangeElement = rangeIdentity
      ? rangeSubtypeIdentity(rangeTypeProfile(rangeIdentity)!)
      : null
    const elementTypes = [
      ...(rangeElement ? [rangeElement] : []),
      ...fullArgs.flatMap((arg, index) =>
        item.args[index] === 'pg_catalog.anyelement' ? [nominalScalarType(arg)] : [],
      ),
    ]
    const elementType = elementTypes[0]
    if (elementTypes.length && (!elementType || elementTypes.some((type) => type !== elementType)))
      return []
    const arrayTypes = fullArgs.flatMap((arg, index) =>
      item.args[index] === 'pg_catalog.anyarray' && arg.type?.startsWith('array:')
        ? [arg.type]
        : [],
    )
    const arrayIdentity = arrayTypes[0]
    if (
      item.args.includes('pg_catalog.anyarray') &&
      (!arrayIdentity || arrayTypes.some((type) => type !== arrayIdentity))
    )
      return []
    if (arrayIdentity && elementType && arrayIdentity !== `array:${elementType}`) return []
    const capturedEnum = capturedEnumSupport(item)
      ? fullArgs.find((arg) => arg.enum)?.enum
      : undefined
    const resultArray =
      item.result === 'pg_catalog.anyarray'
        ? (arrayIdentity ??
          (capturedEnum ? arrayType(enumType(capturedEnum)) : null) ??
          (elementType &&
          !elementType.startsWith('array:') &&
          fullArgs.every(
            (arg, index) =>
              item.args[index] !== 'pg_catalog.anyelement' ||
              !arg.type?.startsWith('array:') ||
              arg.nominalDomain !== undefined,
          )
            ? arrayType(elementType as ArrayElementType)
            : null))
        : null
    if (item.result === 'pg_catalog.anyarray' && !resultArray) return []
    const enumCall = item.args.includes('pg_catalog.anyenum')
    const compatible = item.args.some(
      (type) => type === 'pg_catalog.anycompatiblearray' || type === 'pg_catalog.anycompatible',
    )
    const compatibleArgs = fullArgs.flatMap((arg, index) => {
      const type = item.args[index]
      if (type === 'pg_catalog.anycompatible') return [{ ...arg, type: nominalScalarType(arg) }]
      if (type !== 'pg_catalog.anycompatiblearray') return []
      const source = boundType(arg)
      return [
        {
          ...arg,
          type: source?.startsWith('array:') ? (source.slice(6) as ArrayElementType) : null,
        },
      ]
    })
    if (
      compatible &&
      fullArgs.some(
        (arg, index) =>
          item.args[index] === 'pg_catalog.anycompatiblearray' &&
          boundType(arg) !== null &&
          !boundType(arg)!.startsWith('array:'),
      )
    )
      return []
    const compatibleType = compatible
      ? commonType(compatibleArgs.filter((arg) => boundType(arg) !== null))
      : null
    if (compatible && (!compatibleType || compatibleType.startsWith('array:'))) return []
    const compatibleArray = compatibleType ? arrayType(compatibleType as ArrayElementType) : null
    const definition = fullArgs.find(
      (arg, index) =>
        (['pg_catalog.anyenum', 'pg_catalog.anyelement', 'pg_catalog.anyarray'].includes(
          item.args[index]!,
        ) ||
          compatible) &&
        arg.enum,
    )?.enum
    if (
      (item.result === 'pg_catalog.anyenum' && !enumCall) ||
      (enumCall &&
        (!definition ||
          (!item.strict && !capturedEnumSupport(item)) ||
          (item.volatility !== 'i' && !capturedEnumSupport(item)) ||
          fullArgs.some(
            (arg, index) =>
              item.args[index] === 'pg_catalog.anyenum' && arg.enumDomain !== undefined,
          )))
    )
      return []
    const concreteArrayParameters = item.args.some((type) =>
      catalogScalarType(type)?.startsWith('array:'),
    )
    const operands = fullArgs.map((arg, index) =>
      explicitAny && index === item.args.length - 1
        ? boundType(arg)?.startsWith('array:')
          ? materialize(arg, boundType(arg)!, arg.enum)
          : null
        : variadicAny
          ? materialize(arg, boundType(arg) ?? 'pg_catalog.text', arg.enum)
          : item.args[index] === 'pg_catalog.anycompatiblearray'
            ? coerce(arg, compatibleArray!, definition)
            : item.args[index] === 'pg_catalog.anycompatible'
              ? coerce(arg, compatibleType!, definition)
              : item.args[index] === 'pg_catalog.anyarray'
                ? materialize(arg, arrayIdentity!)
                : item.args[index] === 'pg_catalog.anymultirange'
                  ? materialize(arg, multirangeIdentity!)
                  : item.args[index] === 'pg_catalog.anyrange'
                    ? materialize(arg, rangeIdentity!)
                    : item.args[index] === 'pg_catalog.anyelement'
                      ? coerce(arg, elementType!, arg.enum)
                      : catalogScalarType(item.args[index]!)?.startsWith('array:')
                        ? implicitOperand(arg, catalogScalarType(item.args[index]!)!, definition)
                        : isIntegerType(item.args[index]!)
                          ? materializeInteger(arg, item.args[index]! as ScalarType)
                          : concreteArrayParameters && catalogScalarType(item.args[index]!)
                            ? implicitOperand(
                                arg,
                                catalogScalarType(item.args[index]!)!,
                                definition,
                              )
                            : materialize(
                                arg,
                                item.args[index] === 'pg_catalog.anyenum'
                                  ? enumType(definition!)
                                  : (item.args[index]! as ScalarType),
                                definition,
                              ),
    )
    return operands.every((value): value is EvalExpression => value !== null)
      ? [
          {
            signature,
            item,
            matchingArgs,
            operands: operands as EvalExpression[],
            collation,
            enum: definition,
            resultNominalDomain:
              item.result === 'pg_catalog.anyelement' &&
              rangeElement &&
              domainElementDefinition(rangeElement)
                ? JSON.stringify([
                    domainElementDefinition(rangeElement)!.schema,
                    domainElementDefinition(rangeElement)!.name,
                  ])
                : undefined,
            resultType:
              item.result === 'pg_catalog.anymultirange'
                ? multirangeIdentity
                : item.result === 'pg_catalog.anyrange'
                  ? rangeIdentity
                  : item.result === 'pg_catalog.anyelement'
                    ? rangeElement
                      ? (arrayElementBaseType(elementType!) as ScalarType)
                      : (elementType ?? undefined)
                    : item.result === 'pg_catalog.anycompatiblearray'
                      ? compatibleArray!
                      : item.result === 'pg_catalog.anycompatible'
                        ? compatibleType!
                        : (resultArray ?? undefined),
          },
        ]
      : []
  })
  const matches = expandedMatches.filter(
    ({ item, matchingArgs }) =>
      item.kind !== 'function' ||
      item.variadic === null ||
      explicitVariadic ||
      !expandedMatches.some(
        (other) =>
          other.item.kind === 'function' &&
          other.item.variadic === null &&
          other.item.schema === item.schema &&
          other.item.args.length === (matchingArgs ?? item.args).length &&
          other.item.args.every(
            (type, index) =>
              (catalogScalarType(type) ?? type) ===
              (catalogScalarType((matchingArgs ?? item.args)[index]!) ??
                (matchingArgs ?? item.args)[index]),
          ),
      ),
  )
  const types = args.map(boundType)
  const exact = matches.filter(({ item, matchingArgs }) =>
    (matchingArgs ?? item.args)
      .slice(0, args.length)
      .every((type, index) => (catalogScalarType(type) ?? type) === types[index]),
  )
  if (exact.length === 1) return exact[0]!
  if (kind === 'operator' && args.length === 2) {
    const known = types.filter((type) => type !== null)
    if (known.length === 1 && args.some((arg, index) => types[index] === null && arg.literal)) {
      const assumed = matches.filter(({ item }) =>
        item.args.every(
          (type) =>
            type === known[0] ||
            (isMultirangeType(known[0]) && type === 'pg_catalog.anymultirange'),
        ),
      )
      if (assumed.length === 1) return assumed[0]!
    }
  }
  if (
    kind === 'operator' &&
    types.includes('pg_catalog.varbit') &&
    types.every((type) => type !== null && isBinaryBitRelabel(type, type))
  ) {
    const preferred = matches.filter(({ item }) =>
      item.args.every((type) => type === 'pg_catalog.varbit'),
    )
    if (preferred.length === 1) return preferred[0]!
  }
  const unknownPositions = types.flatMap((type, index) =>
    type === null && args[index]!.literal ? [index] : [],
  )
  if (
    matches.length > 1 &&
    unknownPositions.length &&
    matches.every(({ item, matchingArgs }) =>
      args.every((_, index) => {
        const type = (matchingArgs ?? item.args)[index]
        return type === undefined
          ? false
          : types[index] === null
            ? builtinTypeResolution(type) !== null
            : (catalogScalarType(type) ?? type) === types[index]
      }),
    )
  ) {
    const preferences = unknownPositions.map((index) => {
      const resolutions = matches.map(({ item, matchingArgs }) =>
        builtinTypeResolution((matchingArgs ?? item.args)[index]!)!,
      )
      const categories = new Set(resolutions.map((resolution) => resolution.category))
      const category = categories.has('S') ? 'S' : categories.size === 1 ? [...categories][0] : null
      const hasPreferred = resolutions.some(
        (resolution) => resolution.category === category && resolution.preferred,
      )
      return { resolutions, category, hasPreferred }
    })
    if (preferences.some(({ category }) => category === null)) return null
    const preferred = matches.filter((_, position) =>
      preferences.every(({ resolutions, category, hasPreferred }) => {
        const resolution = resolutions[position]!
        return resolution.category === category && (!hasPreferred || resolution.preferred)
      }),
    )
    if (preferred.length === 1) return preferred[0]!
  }
  return matches.length === 1 ? matches[0]! : null
}

const commonType = (args: readonly Bound[]): ScalarType | null => {
  let types = args.map(boundType).filter((type): type is ScalarType => type !== null)
  if (!types.length) return 'pg_catalog.text'
  if (types.every((type) => type === types[0])) return types[0]!
  types = types.map((type) => arrayElementBaseType(type) as ScalarType)
  const resolution = (type: ScalarType) =>
    type.startsWith('array:') ? { category: 'A', preferred: false } : builtinTypeResolution(type)
  let selected = types[0]!
  for (const type of types.slice(1)) {
    if (type === selected) continue
    const current = resolution(selected)
    const next = resolution(type)
    if (!current || !next || current.category !== next.category) return null
    if (!current.preferred && implicitTypeCast(selected, type) && !implicitTypeCast(type, selected))
      selected = type
  }
  return types.every((type) => implicitTypeCast(type, selected)) ? selected : null
}

const implicitOperand = (
  arg: Bound,
  target: ScalarType,
  definition = arg.enum,
): EvalExpression | null => {
  const source = boundType(arg)
  const value = materialize(arg, source ?? target, definition)
  if (!value || source === null || source === target) return value
  if (source.startsWith('array:') && target.startsWith('array:'))
    return coerceArray(value, source as ArrayType, target as ArrayType, 'i')
  const conversion = builtinCast(source, target)
  if (conversion?.context !== 'i') return null
  if (conversion.method === 'b')
    return {
      kind: 'call',
      call: { kind: 'cast', signature: null, type: target },
      operands: [value],
    }
  if (conversion.method === 'f' && conversion.implementation) {
    const implementation = builtinMetadata(conversion.implementation)
    const result = catalogScalarType(implementation.result)
    if (!result || implementation.args.length !== 1 || implementation.args[0] !== source)
      return null
    if (result !== target) {
      if (builtinCast(result, target)?.method !== 'b') return null
      return {
        kind: 'call',
        call: { kind: 'cast', signature: null, type: target },
        operands: [
          {
            kind: 'call',
            call: { kind: 'function', signature: conversion.implementation, type: result },
            operands: [value],
          },
        ],
      }
    }
    return {
      kind: 'call',
      call: { kind: 'cast', signature: conversion.implementation, type: target },
      operands: [value],
    }
  }
  return null
}

const coerceArray = (
  operand: EvalExpression,
  source: ArrayType,
  target: ArrayType,
  context: 'i' | 'e',
  modifier = -1,
  enums: readonly EnumInfo[] = [],
): EvalExpression | null => {
  if (source === target) return operand
  const from = source.slice(6) as ArrayElementType,
    to = target.slice(6) as ArrayElementType,
    conversion = builtinCast(from, to)
  const sourceBase = arrayElementBaseType(from)
  if (from.startsWith('domain:') && sourceBase !== from && !sourceBase.startsWith('array:')) {
    const definition = enums.find((item) => enumType(item) === sourceBase)
    if (sourceBase.startsWith('enum:') && !definition) return null
    const baseArray = arrayType(sourceBase as ArrayElementType)
    const stripped: EvalExpression = {
      kind: 'array-domain-coerce',
      type: baseArray,
      sourceElementType: from,
      elementType: sourceBase as ArrayElementType,
      operand,
      conversion: {
        kind: 'input',
        name: '__pgsid_domain_element',
        type: sourceBase as ScalarType,
        ...(definition ? { enum: definition } : {}),
      },
    }
    return sourceBase === to
      ? stripped
      : coerceArray(stripped, baseArray, target, context, modifier, enums)
  }
  if (
    context === 'e' &&
    (conversion?.method === 'i' ||
      (!conversion && [from, to].some((type) => builtinTypeResolution(type)?.category === 'S')))
  ) {
    const sourceEnum = enums.find((item) => enumType(item) === from)
    const definition = enums.find((item) => enumType(item) === to)
    const output =
      sourceEnum?.outputFunction ?? rangeTypeOutput(from) ?? builtinTypeIO(from)?.output
    const input = definition
      ? callables.find(
          ({ item }) =>
            item.kind === 'function' &&
            item.schema === 'pg_catalog' &&
            item.name === 'enum_in' &&
            item.args.join(',') === 'pg_catalog.cstring,pg_catalog.oid' &&
            item.result === 'pg_catalog.anyenum',
        )?.signature
      : (rangeTypeInput(to) ?? builtinTypeIO(to)?.input)
    if (!input || !output) return null
    return {
      kind: 'array-io-coerce',
      type: target,
      sourceElementType: from,
      elementType: to,
      input,
      output,
      sourceEnum,
      enum: definition,
      modifier,
      operand,
    }
  }
  if (!conversion || (context === 'i' && conversion.context !== 'i')) return null
  const signature =
    conversion.method === 'b'
      ? null
      : conversion.method === 'f'
        ? conversion.implementation
        : undefined
  if (signature === undefined) return null
  if (signature !== null) {
    const callable = builtinMetadata(signature)
    if (
      callable.kind !== 'function' ||
      !['', 'pg_catalog.int4', 'pg_catalog.int4,pg_catalog.bool'].includes(
        callable.args.slice(1).join(','),
      )
    )
      return null
    const argument = catalogScalarType(callable.args[0]!)
    const result = catalogScalarType(callable.result)
    if (!argument || !result || argument.startsWith('array:') || result.startsWith('array:'))
      return null
    if (argument !== from) {
      const argumentArray = arrayType(argument as ArrayElementType)
      const coerced = coerceArray(operand, source, argumentArray, 'i', -1, enums)
      return coerced ? coerceArray(coerced, argumentArray, target, context, modifier, enums) : null
    }
    if (result !== to) {
      if (builtinCast(result, to)?.method !== 'b') return null
      const resultArray = arrayType(result as ArrayElementType)
      const coerced = coerceArray(operand, source, resultArray, context, -1, enums)
      return coerced ? coerceArray(coerced, resultArray, target, context, modifier, enums) : null
    }
  }
  return {
    kind: 'array-coerce',
    type: target,
    sourceElementType: from,
    elementType: to,
    conversion: { kind: 'cast', signature, type: to },
    explicit: context === 'e',
    modifier,
    operand,
  }
}

const comparisonCandidate = (
  args: readonly Bound[],
  name = '=',
  requireCollation = true,
  kind: 'operator' | 'function' = 'operator',
  predicate = true,
): ResolvedCallable | null => {
  if ((predicate && args.length !== 2) || args.some((arg) => !arg.value && !arg.literal))
    return null
  let types = args.map(boundType)
  if (types.every((type) => type === null)) {
    args = args.map((arg) => ({
      ...arg,
      type: 'pg_catalog.text',
      value: materialize(arg, 'pg_catalog.text'),
      literal: undefined,
      collation: arg.collation ?? defaultCollation,
    }))
    if (args.some((arg) => !arg.value)) return null
    types = args.map(boundType)
  }
  const definition = args.find((arg) => arg.enum)?.enum
  const enumIdentity = definition ? enumType(definition) : null
  const arrayTypes = types.filter((type): type is ArrayType => type?.startsWith('array:') === true)
  const arrayIdentity =
    arrayTypes.length && arrayTypes.every((type) => type === arrayTypes[0]) ? arrayTypes[0]! : null
  const multirangeTypes = types.filter(isMultirangeType)
  const multirangeIdentity =
    multirangeTypes.length && multirangeTypes.every((type) => type === multirangeTypes[0])
      ? multirangeTypes[0]!
      : null
  const rangeTypes = [
    ...types.filter(isRangeType),
    ...(multirangeIdentity ? [multirangeTypeProfile(multirangeIdentity)!.rangeType] : []),
  ]
  const rangeIdentity =
    rangeTypes.length && rangeTypes.every((type) => type === rangeTypes[0]) ? rangeTypes[0]! : null
  const concrete = (type: string): string | null =>
    type === 'pg_catalog.anyenum'
      ? enumIdentity
      : type === 'pg_catalog.anyarray'
        ? arrayIdentity
        : type === 'pg_catalog.anymultirange'
          ? multirangeIdentity
          : type === 'pg_catalog.anyelement' && rangeIdentity
            ? rangeSubtypeIdentity(rangeTypeProfile(rangeIdentity)!)
            : type === 'pg_catalog.anyrange'
              ? rangeIdentity
              : (catalogScalarType(type) ?? type)
  const viable = callables.filter(
    ({ item }) =>
      item.kind === kind &&
      item.schema === 'pg_catalog' &&
      item.name === name &&
      (!predicate || item.result === 'pg_catalog.bool') &&
      item.args.length === args.length &&
      item.args.every((type, index) => {
        const target = concrete(type)
        const source =
          type === 'pg_catalog.anyelement' && rangeIdentity
            ? nominalScalarType(args[index]!)
            : types[index]!
        if (!target || (type === 'pg_catalog.anyenum' && args[index]!.enumDomain !== undefined))
          return false
        if (
          type === 'pg_catalog.anyelement' &&
          rangeIdentity &&
          source !== null &&
          source !== target
        )
          return false
        return (
          source === null ||
          source === target ||
          builtinCast(source, target)?.context === 'i' ||
          (source.startsWith('array:') &&
            target.startsWith('array:') &&
            builtinCast(source.slice(6), target.slice(6))?.context === 'i')
        )
      }),
  )
  const assumed =
    kind === 'operator' && types.length === 2 && types.includes(null)
      ? types.map((type) => type ?? types.find((type) => type !== null)!)
      : types
  const exact = viable.filter(({ item }) =>
    item.args.every((type, index) => concrete(type) === assumed[index]),
  )
  const scores = viable.map(
    ({ item }) => item.args.filter((type, index) => concrete(type) === types[index]).length,
  )
  const maximum = Math.max(-1, ...scores)
  let best = exact.length ? exact : viable.filter((_, index) => scores[index] === maximum)
  if (best.length > 1) {
    const preferred = best.map(
      ({ item }) =>
        item.args.filter((type, index) => {
          const source = types[index]
          const target = builtinTypeResolution(type)
          return (
            source !== null &&
            source !== type &&
            target?.preferred &&
            builtinTypeResolution(source!)?.category === target.category
          )
        }).length,
    )
    const maximum = Math.max(...preferred)
    best = best.filter((_, index) => preferred[index] === maximum)
  }
  for (const index of types.keys()) {
    if (types[index] !== null || best.length < 2) continue
    const categories = best.map(({ item }) => builtinTypeResolution(item.args[index]!)?.category)
    const category = categories.includes('S')
      ? 'S'
      : categories.every((category) => category === categories[0])
        ? categories[0]
        : null
    if (!category) return null
    best = best.filter((_, index) => categories[index] === category)
    if (best.some(({ item }) => builtinTypeResolution(item.args[index]!)?.preferred))
      best = best.filter(({ item }) => builtinTypeResolution(item.args[index]!)?.preferred)
  }
  if (best.length !== 1) return null
  const selected = best[0]!
  if (!catalogScalarType(selected.item.result)) return null
  const collation = selected.item.args.some((type) => type === 'pg_catalog.anyarray')
    ? arrayCollations(args.map((arg) => arg.collation))
    : combineCollations(args.map((arg) => arg.collation))
  if (collation?.explicit && collation.identity === 'conflict') return null
  if (
    requireCollation &&
    selected.item.args.some((type) =>
      ['pg_catalog.name', 'pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(
        type,
      ),
    ) &&
    !supportsTextCallableCollation(selected.signature, collation?.kind)
  )
    return null
  const operands = args.map((arg, index) =>
    implicitOperand(
      arg,
      arrayElementBaseType(concrete(selected.item.args[index]!)!) as ScalarType,
      definition,
    ),
  )
  return operands.every((value): value is EvalExpression => value !== null)
    ? { ...selected, operands, collation, enum: definition }
    : null
}

const arrayDefaultCollation = (
  signature: string,
  collation?: BoundCollation,
): { collationDefault?: true } => {
  const metadata = builtinMetadata(signature)
  return collation?.default &&
    (metadata.args.includes('pg_catalog.anyarray') ||
      metadata.args.includes('pg_catalog.anycompatiblearray') ||
      isRegexArrayCallable(signature))
    ? { collationDefault: true }
    : {}
}

const arrayCollations = (
  values: readonly (BoundCollation | undefined)[],
): BoundCollation | undefined => {
  const normalized = values.map((value) =>
    value?.default ? { ...value, identity: 'default' } : value,
  )
  const combined = combineCollations(normalized)
  return combined?.default &&
    combined.identity !== 'conflict' &&
    normalized.some((value) => value?.default && value.kind === 'C')
    ? { ...combined, kind: 'C' }
    : combined
}

const arrayElementCollation = (
  type: ArrayElementType,
  operand?: Bound,
): BoundCollation | undefined => {
  let base = arrayElementBaseType(type)
  while (base.startsWith('array:')) base = arrayElementBaseType(base.slice(6))
  const collation = builtinTypeComparison(
    base.startsWith('enum:') ? 'pg_catalog.anyenum' : base,
  )?.collation
  if (!collation) return undefined
  const inherited =
    operand?.type !== null || operand?.collation?.explicit ? operand?.collation : undefined
  if (inherited) return inherited
  return collation === 'pg_catalog."C"' ? { kind: 'C', identity: 'C' } : defaultCollation
}

const containsColumn = (node: unknown): boolean => {
  if (Array.isArray(node)) return node.some(containsColumn)
  const wrapper = fields(node)
  return (
    wrapper !== null &&
    (wrapper['ColumnRef'] !== undefined || Object.values(wrapper).some(containsColumn))
  )
}

export function bindCatalogCheck(
  columns: readonly CheckColumn[],
  root: unknown,
  specialForms: readonly ((node: unknown) => {
    expression: EvalBoolExpression
    inputs: readonly string[]
  } | null)[],
  enums: readonly EnumInfo[] = [],
  domains: readonly DomainInfo[] = [],
  moneyLiterals: readonly { text: string; units: string }[] = [],
  literalOrigin: 'source' | 'stored' = 'source',
  domainStack: ReadonlySet<string> = new Set(),
  domainInput?: boolean,
  coercionContext?: StoredDomainCoercionContext,
  preparedArrayDomainInput?: string,
  rangeTypes: readonly RangeTypeInfo[] = [],
): { expression: EvalBoolExpression; inputs: readonly string[] } {
  const storedCoercions =
    literalOrigin === 'stored' && coercionContext
      ? alignStoredDomainCoercions(root, coercionContext, domains)
      : undefined
  if (storedCoercions === null) return { expression: { kind: 'uncertain' }, inputs: [] }
  const modifierNeedsContext = (type: string): boolean => {
    const base = arrayElementBaseType(type.startsWith('array:') ? type.slice(6) : type)
    const conversion = builtinCast(base, base)
    return (
      conversion?.implementation !== null &&
      conversion?.implementation !== undefined &&
      builtinMetadata(conversion.implementation).args[2] === 'pg_catalog.bool'
    )
  }
  const domainNeedsContext = (domain: DomainInfo): boolean => {
    const seen = new Set<number>()
    let layer: DomainInfo | undefined = domain
    while (layer && !seen.has(layer.oid)) {
      seen.add(layer.oid)
      const carrier =
        catalogArrayType(layer.baseTypeName, layer.baseTypeOid, domains, enums, rangeTypes) ??
        catalogBaseScalarType(layer.baseTypeName, layer.baseTypeOid, domains, rangeTypes)
      if (
        layer.baseTypeMod !== undefined &&
        layer.baseTypeMod !== -1 &&
        carrier &&
        modifierNeedsContext(carrier)
      )
        return true
      const baseOid: number = layer.baseTypeOid
      layer = domains.find((item) => item.oid === baseOid)
    }
    return false
  }
  const moneyUnits = new Map<string, string>()
  for (const literal of moneyLiterals) {
    if (!/^-?(?:0|[1-9]\d*)$/u.test(literal.units)) continue
    const value = BigInt(literal.units)
    if (value >= -9223372036854775808n && value <= 9223372036854775807n)
      moneyUnits.set(literal.text, value.toString())
  }
  const inputs = new Set<string>()
  const elementTypeName = (type: ScalarType): Fields =>
    type.startsWith('array:')
      ? {
          ...elementTypeName(type.slice(6) as ArrayElementType),
          arrayBounds: [{ Integer: { ival: -1 } }],
        }
      : rangeTypeProfile(type)?.captured || multirangeTypeProfile(type)?.captured
        ? (() => {
            const profile = rangeTypeProfile(type) ?? multirangeTypeProfile(type)!
            return {
              names: (isRangeType(type)
                ? [profile.schema, profile.name]
                : [profile.multirangeSchema, profile.multirangeName]
              ).map((sval) => ({ String: { sval } })),
            }
          })()
        : {
            names: type.startsWith('domain:')
              ? (() => {
                  const domain = domainElementDefinition(type)!
                  return [domain.schema, domain.name].map((sval) => ({ String: { sval } }))
                })()
              : type.startsWith('enum:')
                ? (JSON.parse(type.slice(5)) as string[]).map((sval) => ({ String: { sval } }))
                : [
                    { String: { sval: 'pg_catalog' } },
                    { String: { sval: type.slice('pg_catalog.'.length).replaceAll('"', '') } },
                  ],
          }
  const bindArrayElementCoercion = (
    operand: Bound,
    type: ArrayType,
    element: ArrayElementType,
    targetName: Fields,
    inputContext = false,
    preparedInput?: string,
  ): Bound => {
    if (!operand.type?.startsWith('array:') || !operand.value) return unknown
    const sourceElementType = operand.type.slice(6) as ArrayElementType
    const sourceNames = strings(elementTypeName(sourceElementType)['names'])!
    const sourceDomain = domainElementDefinition(sourceElementType)
    const sourceDefinition = sourceDomain
      ? domains.find(
          (item) => item.schema === sourceDomain.schema && item.name === sourceDomain.name,
        )
      : undefined
    const converted = bindCatalogCheck(
      [
        {
          name: '__pgsid_domain_element',
          typeName: sourceElementType.startsWith('array:')
            ? sourceNames
                .map((name, index) =>
                  index === 0 && name === 'pg_catalog'
                    ? name
                    : '"' + name.replaceAll('"', '""') + '"',
                )
                .join('.') + '[]'
            : sourceNames[0] === 'pg_catalog'
              ? arrayElementBaseType(sourceElementType)
              : sourceNames.map((name) => '"' + name.replaceAll('"', '""') + '"').join('.'),
          ...(sourceDefinition ? { typeOid: sourceDefinition.oid } : {}),
          collationIsC: true,
          isRowType: false,
        },
      ],
      {
        NullTest: {
          nulltesttype: 'IS_NOT_NULL',
          arg: {
            TypeCast: {
              arg: {
                ColumnRef: { fields: [{ String: { sval: '__pgsid_domain_element' } }] },
              },
              typeName: { ...targetName, arrayBounds: [] },
            },
          },
        },
      },
      [],
      enums,
      domains,
      moneyLiterals,
      literalOrigin,
      domainStack,
      inputContext,
      undefined,
      preparedInput,
      rangeTypes,
    ).expression
    if (converted.kind !== 'eval-scalar' || converted.expression.kind !== 'null-test')
      return unknown
    const conversion = converted.expression.operand
    return {
      type,
      collation: operand.collation ?? arrayElementCollation(element as ArrayElementType),
      value: {
        kind: 'array-domain-coerce',
        type,
        sourceElementType,
        elementType: element,
        conversion,
        operand: operand.value,
      },
    }
  }
  const coerceBound = (
    arg: Bound,
    target: ScalarType,
    node?: unknown,
    definition = arg.enum,
  ): EvalExpression | null => {
    const domain = domainElementDefinition(target)
    if (domain) {
      if (nominalScalarType(arg) === target) return implicitOperand(arg, domain.base, definition)
      if (node === undefined) return null
      return bind(
        { TypeCast: { arg: node, typeName: elementTypeName(target as ArrayElementType) } },
        undefined,
        true,
      ).value
    }
    if (
      target.startsWith('array:') &&
      arg.type !== target &&
      (domainElementDefinition(target.slice(6)) || arg.type?.startsWith('array:domain:'))
    ) {
      const element = target.slice(6) as ArrayElementType
      if (arg.type?.startsWith('array:'))
        return bindArrayElementCoercion(
          arg,
          target as ArrayType,
          element,
          elementTypeName(element),
          true,
        ).value
      if (node === undefined) return null
      return bind(
        {
          TypeCast: {
            arg: node,
            typeName: { ...elementTypeName(element), arrayBounds: [{ Integer: { ival: -1 } }] },
          },
        },
        undefined,
        true,
      ).value
    }
    return implicitOperand(arg, target, definition)
  }
  const modifyScalar = (
    operand: EvalExpression,
    type: ScalarType,
    modifier: number,
    explicit: boolean,
  ): EvalExpression | null => {
    if (!Number.isInteger(modifier) || modifier < 0 || modifier > 2147483647) return null
    const conversion = builtinCast(type, type)
    if (conversion?.method !== 'f' || !conversion.implementation) return null
    const callable = builtinMetadata(conversion.implementation)
    if (
      callable.kind !== 'function' ||
      ![2, 3].includes(callable.args.length) ||
      callable.args[1] !== 'pg_catalog.int4' ||
      (callable.args.length === 3 && callable.args[2] !== 'pg_catalog.bool')
    )
      return null
    return {
      kind: 'call',
      call: { kind: 'function', signature: conversion.implementation, type },
      operands: [
        operand,
        {
          kind: 'certain',
          expression: { kind: 'integer', type: 'pg_catalog.int4', value: String(modifier) },
        },
        ...(callable.args.length === 3
          ? [
              {
                kind: 'certain' as const,
                expression: {
                  kind: 'boolean' as const,
                  type: 'pg_catalog.bool' as const,
                  value: explicit,
                },
              },
            ]
          : []),
      ],
    }
  }
  const bindArray = (
    node: unknown,
    target?: { type: ArrayElementType; name: Fields; modifiers?: readonly number[] },
  ): Bound => {
    const array = fields(fields(node)?.['A_ArrayExpr'])
    if (!array) return unknown
    const members = Array.isArray(array['elements']) ? array['elements'] : []
    if (members.length === 0 && !target) return unknown
    const args = members.map((member) =>
      fields(fields(member)?.['A_ArrayExpr']) ? bindArray(member, target) : bind(member),
    )
    const multidimensional =
      args.some((arg) => arg.nominalDomain === undefined && arg.type?.startsWith('array:')) ||
      members.some((member) => fields(fields(member)?.['A_ArrayExpr']))
    const candidates = multidimensional
      ? args.map((arg) => ({
          ...arg,
          type: arg.type?.startsWith('array:') ? (arg.type.slice(6) as ArrayElementType) : null,
        }))
      : args
    if (multidimensional && !target && candidates.every((arg) => arg.type === null)) return unknown
    const inferred =
      target?.type ??
      (multidimensional
        ? (commonType(args)?.slice(6) as ArrayElementType | undefined)
        : commonType(candidates))
    const nominal = !target && !multidimensional ? commonNominalDomain(args) : undefined
    if (!inferred || (inferred.startsWith('array:') && !nominal)) return unknown
    const identity = nominal ? (JSON.parse(nominal) as [string, string]) : null
    const element =
      identity && !inferred.startsWith('domain:')
        ? domainElementType(
            { schema: identity[0], name: identity[1] },
            inferred as Exclude<ScalarType, `domain:${string}`>,
          )
        : (inferred as ArrayElementType)
    const type = arrayType(element)
    const definition = element.startsWith('enum:')
      ? enums.find((item) => enumType(item) === element)
      : undefined
    const operands = members.map((member, index) => {
      let arg = args[index]!
      if (multidimensional) {
        if (target?.modifiers?.length) {
          if (fields(fields(member)?.['A_ArrayExpr'])) return arg.value
          let value = bind({
            TypeCast: {
              arg: member,
              typeName: { ...target.name, arrayBounds: [{ Integer: { ival: -1 } }] },
            },
          }).value
          for (const modifier of target.modifiers) {
            if (!value) return null
            value = { kind: 'array-typmod', type, elementType: element, modifier, operand: value }
          }
          return value
        }
        if (!arg.value && fields(fields(member)?.['A_ArrayExpr']))
          arg = bindArray(member, { type: element, name: elementTypeName(element) })
        return target
          ? bind({
              TypeCast: {
                arg: member,
                typeName: { ...target.name, arrayBounds: [{ Integer: { ival: -1 } }] },
              },
            }).value
          : coerceBound(arg, type, member)
      }
      if (target) arg = bind({ TypeCast: { arg: member, typeName: target.name } })
      if (arg.literal?.kind === 'string' && element !== 'pg_catalog.text')
        arg = bind({ TypeCast: { arg: member, typeName: elementTypeName(element) } })
      let value = implicitOperand(arg, arrayElementBaseType(element) as ScalarType, definition)
      for (const modifier of target?.modifiers ?? []) {
        if (!value) return null
        value = modifyScalar(value, arrayElementBaseType(element) as ScalarType, modifier, true)
      }
      return value
    })
    if (!operands.every((operand): operand is EvalExpression => operand !== null)) return unknown
    return {
      type,
      collation:
        (multidimensional
          ? arrayCollations(args.map((arg) => arg.collation))
          : combineCollations(args.map((arg) => arg.collation))) ?? arrayElementCollation(element),
      value: { kind: 'array-constructor', type, elementType: element, multidimensional, operands },
    }
  }
  const arrayOutputEnum = (type: string): EnumInfo | undefined => {
    type = arrayElementBaseType(type)
    while (type.startsWith('array:')) type = arrayElementBaseType(type.slice(6))
    return type.startsWith('enum:') ? enums.find((item) => enumType(item) === type) : undefined
  }
  const resultEnum = (type: ScalarType, args: readonly Bound[]): EnumInfo | undefined =>
    type.startsWith('array:enum:')
      ? enums.find((item) => enumType(item) === type.slice(6))
      : args.find((arg) => arg.enum)?.enum
  const bind = (node: unknown, expectedType?: ScalarType, implicitDomainInput?: boolean): Bound => {
    const wrapper = fields(node)
    if (!wrapper) return unknown
    const indirection = fields(wrapper['A_Indirection'])
    if (indirection) {
      const operand = bind(indirection['arg'])
      if (!operand.type?.startsWith('array:') || !operand.value) return unknown
      const items = indirection['indirection']
      if (!Array.isArray(items) || items.length === 0 || items.length > 6) return unknown
      const indices = items.map((item) => fields(fields(item)?.['A_Indices']))
      if (indices.some((item) => !item)) return unknown
      const slice = indices.some((item) => item!['is_slice'] === true)
      const coerceIndex = (node: unknown): EvalExpression | null => {
        const bound = bind(node),
          source = boundType(bound)
        const value = materialize(bound, source ?? 'pg_catalog.int4')
        if (!value || source === 'pg_catalog.int4' || source === null) return value
        const conversion = builtinCast(source, 'pg_catalog.int4')
        if (!conversion || conversion.context === 'e') return null
        if (conversion.method === 'b')
          return {
            kind: 'call',
            call: { kind: 'cast', signature: null, type: 'pg_catalog.int4' },
            operands: [value],
          }
        if (conversion.method !== 'f' || !conversion.implementation) return null
        const implementation = builtinMetadata(conversion.implementation)
        if (
          implementation.kind !== 'function' ||
          implementation.args.length !== 1 ||
          implementation.args[0] !== source ||
          implementation.result !== 'pg_catalog.int4'
        )
          return null
        return {
          kind: 'call',
          call: { kind: 'cast', signature: conversion.implementation, type: 'pg_catalog.int4' },
          operands: [value],
        }
      }
      const upper: (EvalExpression | null)[] = [],
        lower: (EvalExpression | null)[] = []
      for (const item of indices) {
        if (!item) return unknown
        const high = item['uidx'] ? coerceIndex(item['uidx']) : null
        if ((item['uidx'] && !high) || (!slice && !high)) return unknown
        upper.push(high)
        if (slice) {
          const low = item['lidx']
            ? coerceIndex(item['lidx'])
            : item['is_slice'] === true
              ? null
              : {
                  kind: 'certain' as const,
                  expression: {
                    kind: 'integer' as const,
                    type: 'pg_catalog.int4' as const,
                    value: '1',
                  },
                }
          if (item['lidx'] && !low) return unknown
          lower.push(low)
        }
      }
      const elementType = operand.type.slice(6) as ArrayElementType
      const definition = arrayElementBaseType(elementType).startsWith('enum:')
        ? enums.find((item) => enumType(item) === arrayElementBaseType(elementType))
        : undefined
      const domain = domainElementDefinition(elementType)
      const type = slice
        ? (operand.type as ArrayType)
        : (arrayElementBaseType(elementType) as ScalarType)
      return {
        type,
        ...(!slice && domain
          ? { nominalDomain: JSON.stringify([domain.schema, domain.name]) }
          : {}),
        ...(!slice && domain && definition
          ? {
              enumDomain: domains.find(
                (item) => item.schema === domain.schema && item.name === domain.name,
              )?.oid,
            }
          : {}),
        collation: operand.collation,
        ...(!slice && definition ? { enum: definition } : {}),
        value: {
          kind: 'array-subscript',
          type,
          elementType,
          operand: operand.value,
          slice,
          upper,
          lower,
        },
      }
    }
    if (fields(wrapper['A_ArrayExpr']))
      return bindArray(
        node,
        expectedType?.startsWith('array:')
          ? {
              type: expectedType.slice(6) as ArrayElementType,
              name: elementTypeName(expectedType.slice(6) as ArrayElementType),
            }
          : undefined,
      )
    const minmax = fields(wrapper['MinMaxExpr'])
    if (minmax) {
      const nodes = minmax['args']
      const operation =
        minmax['op'] === 'IS_GREATEST' ? 'greatest' : minmax['op'] === 'IS_LEAST' ? 'least' : null
      if (!operation || !Array.isArray(nodes) || !nodes.length) return unknown
      const args = nodes.map((arg) => bind(arg))
      if (args.some((arg) => !arg.value && !arg.literal)) return unknown
      const type = commonType(args)
      if (!type) return unknown
      const definition = resultEnum(type, args)
      const operands = args.map((arg, index) =>
        type === 'pg_catalog.bool' && arg.type === 'pg_catalog.bool'
          ? { kind: 'check' as const, type, expression: lower(nodes[index]) }
          : coerceBound(arg, type, nodes[index], definition),
      )
      if (!operands.every((value): value is EvalExpression => value !== null)) return unknown
      const collation = type.startsWith('array:')
        ? arrayCollations(args.map((arg) => arg.collation))
        : combineCollations(args.map((arg) => arg.collation))
      const allNull = operands.every(
        (operand) =>
          operand.kind === 'certain' &&
          'value' in operand.expression &&
          operand.expression.value === null,
      )
      const subject: Bound = { type, value: operands[0]!, enum: definition, collation }
      const resolved = comparisonCandidate(
        [subject, subject],
        operation === 'greatest' ? '<' : '>',
        operands.length > 1 && !allNull,
      )
      if (!resolved || resolved.item.args[0] !== resolved.item.args[1]) return unknown
      const comparisonType = [
        'pg_catalog.anyenum',
        'pg_catalog.anyarray',
        'pg_catalog.anyrange',
        'pg_catalog.anymultirange',
      ].includes(resolved.item.args[0]!)
        ? type
        : resolved.item.args[0]!
      if (comparisonType !== type && builtinCast(type, comparisonType)?.method !== 'b')
        return unknown
      return {
        type,
        enum: type.startsWith('enum:') ? definition : undefined,
        enumDomain: commonEnumDomain(args),
        nominalDomain: commonNominalDomain(args),
        collation,
        value: allNull
          ? operands[0]!
          : {
              kind: 'minmax',
              type,
              operation,
              operands,
              comparison: {
                kind: 'operator',
                signature: resolved.signature,
                type: 'pg_catalog.bool',
                collation: resolved.collation?.kind,
                ...arrayDefaultCollation(resolved.signature, resolved.collation),
              },
            },
      }
    }
    const coalesce = fields(wrapper['CoalesceExpr'])
    if (coalesce) {
      const nodes = coalesce['args']
      if (!Array.isArray(nodes) || !nodes.length) return unknown
      const args = nodes.map((arg) => bind(arg))
      if (args.some((arg) => !arg.value && !arg.literal)) return unknown
      const coercedType = args.some(
        (arg) =>
          arg.type?.startsWith('array:') ||
          arg.type === 'pg_catalog.float4' ||
          arg.type === 'pg_catalog.float8' ||
          arg.type === 'pg_catalog."numeric"' ||
          isOidType(arg.type),
      )
        ? (commonType(args) ?? undefined)
        : undefined
      const integerType = integerCommonType(args)
      const typed = args.flatMap((arg) => (arg.type ? [arg.type] : []))
      const textTypes = ['pg_catalog.text', 'pg_catalog."varchar"']
      const networkType = networkCommonType(args)
      const bitType = bitCommonType(args)
      const macType = macCommonType(args)
      const type =
        coercedType ??
        integerType ??
        networkType ??
        macType ??
        bitType ??
        typed[0] ??
        'pg_catalog.text'
      if (
        coercedType === undefined &&
        integerType === undefined &&
        networkType === undefined &&
        macType === undefined &&
        bitType === undefined &&
        typed.some(
          (other) => other !== type && !(textTypes.includes(type) && textTypes.includes(other)),
        )
      )
        return unknown
      const definition = resultEnum(type, args)
      const operands = args.map((arg, index): EvalExpression | null =>
        type === 'pg_catalog.bool' && arg.type === 'pg_catalog.bool'
          ? { kind: 'check', type, expression: lower(nodes[index]) }
          : coercedType !== undefined
            ? coerceBound(arg, type, nodes[index], definition)
            : integerType === undefined
              ? materialize(arg, type, definition)
              : materializeInteger(arg, type),
      )
      if (!operands.every((value): value is EvalExpression => value !== null)) return unknown
      return {
        type,
        ...(definition && type.startsWith('enum:') ? { enum: definition } : {}),
        enumDomain: commonEnumDomain(args),
        nominalDomain: commonNominalDomain(args),
        ...(type.startsWith('array:')
          ? { collation: arrayCollations(args.map((arg) => arg.collation)) }
          : [
                'pg_catalog.name',
                'pg_catalog.text',
                'pg_catalog."varchar"',
                'pg_catalog.bpchar',
              ].includes(type)
            ? { collation: combineCollations(args.map((arg) => arg.collation)) }
            : {}),
        value: { kind: 'coalesce', type, operands },
      }
    }
    const caseExpression = fields(wrapper['CaseExpr'])
    if (caseExpression) {
      const args = caseExpression['args']
      if (!Array.isArray(args) || !args.length) return unknown
      const branches = args.map((item) => fields(fields(item)?.['CaseWhen']))
      if (branches.some((branch) => !branch || !branch['expr'] || !branch['result'])) return unknown
      const results = branches.map((branch) => bind(branch!['result']))
      const otherwise = caseExpression['defresult']
        ? bind(caseExpression['defresult'])
        : ({ type: null, value: null, literal: { kind: 'null', value: null } } as Bound)
      const arms = [...results, otherwise]
      const coercedType = arms.some(
        (arm) =>
          arm.type?.startsWith('array:') ||
          arm.type === 'pg_catalog.float4' ||
          arm.type === 'pg_catalog.float8' ||
          arm.type === 'pg_catalog."numeric"' ||
          isOidType(arm.type),
      )
        ? (commonType([otherwise, ...results]) ?? undefined)
        : undefined
      const integerType = integerCommonType([otherwise, ...results])
      const typed = arms.flatMap((arm) => (arm.type ? [arm.type] : []))
      const networkType = networkCommonType(arms)
      const bitType = bitCommonType([otherwise, ...results])
      const macType = macCommonType([otherwise, ...results])
      const type =
        coercedType ??
        integerType ??
        networkType ??
        macType ??
        bitType ??
        expectedType ??
        typed[0] ??
        (arms.some((arm) => arm.literal?.kind === 'integer')
          ? 'pg_catalog.int4'
          : 'pg_catalog.text')
      if (
        coercedType === undefined &&
        integerType === undefined &&
        networkType === undefined &&
        macType === undefined &&
        bitType === undefined &&
        typed.some((other) => other !== type)
      )
        return unknown
      const definition = resultEnum(type, arms)
      const values = arms.map((arm, index) =>
        coercedType !== undefined
          ? coerceBound(
              arm,
              type,
              index < branches.length ? branches[index]!['result'] : caseExpression['defresult'],
              definition,
            )
          : integerType === undefined
            ? materialize(arm, type, definition)
            : materializeInteger(arm, type),
      )
      if (type !== 'pg_catalog.bool' && values.some((value) => !value)) return unknown
      const collation = type.startsWith('array:')
        ? arrayCollations(arms.map((arm) => arm.collation))
        : [
              'pg_catalog.name',
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
            ].includes(type)
          ? combineCollations(arms.map((arm) => arm.collation))
          : undefined
      const scrutinee = caseExpression['arg'] === undefined ? null : bind(caseExpression['arg'])
      let simple: Extract<EvalExpression, { kind: 'case' }>['scrutinee']
      let equalities: Extract<EvalExpression, { kind: 'case' }>['branches'][number]['equality'][] =
        []
      let conditions: EvalExpression[]
      if (scrutinee) {
        const matches = branches.map((branch) => bind(branch!['expr'], scrutinee.type ?? undefined))
        const compareType =
          scrutinee.type ??
          matches.find((match) => match.type)?.type ??
          (scrutinee.literal?.kind === 'integer' ? 'pg_catalog.int4' : 'pg_catalog.text')
        const value = materialize(scrutinee, compareType)
        if (!value) return unknown
        const resolved = matches.map((match) =>
          candidate('operator', '=', [
            { ...scrutinee, type: compareType, value, literal: undefined },
            match,
          ]),
        )
        if (resolved.some((match) => !match)) return unknown
        simple = { expression: resolved[0]!.operands[0]! }
        equalities = resolved.map((match) => ({
          kind: 'operator',
          signature: match!.signature,
          type: 'pg_catalog.bool',
          collation: match!.collation?.kind,
          ...arrayDefaultCollation(match!.signature, match!.collation),
        }))
        conditions = resolved.map((match) => match!.operands[1]!)
      } else {
        conditions = branches.map((branch) => ({
          kind: 'check',
          type: 'pg_catalog.bool',
          expression: lower(branch!['expr']),
        }))
      }
      return {
        type,
        ...(definition && type.startsWith('enum:') ? { enum: definition } : {}),
        enumDomain: commonEnumDomain(arms),
        nominalDomain: commonNominalDomain(arms),
        collation,
        value: {
          kind: 'case',
          type,
          ...(simple ? { scrutinee: simple } : {}),
          branches: results.map((_, index) => ({
            ...(simple ? { equality: equalities[index]! } : {}),
            when: conditions[index]!,
            then:
              type === 'pg_catalog.bool'
                ? {
                    kind: 'check',
                    type: 'pg_catalog.bool',
                    expression: lower(branches[index]!['result']),
                  }
                : values[index]!,
          })),
          otherwise:
            type === 'pg_catalog.bool'
              ? caseExpression['defresult']
                ? {
                    kind: 'check',
                    type: 'pg_catalog.bool',
                    expression: lower(caseExpression['defresult']),
                  }
                : {
                    kind: 'certain',
                    expression: { kind: 'boolean', type: 'pg_catalog.bool', value: null },
                  }
              : values.at(-1)!,
        },
      }
    }
    if (fields(wrapper['BoolExpr']) || fields(wrapper['BooleanTest']))
      return {
        type: 'pg_catalog.bool',
        value: { kind: 'check', type: 'pg_catalog.bool', expression: lower(node) },
      }
    const cast = fields(wrapper['TypeCast'])
    if (cast) {
      const capturedCoercion = storedCoercions?.get(wrapper)
      const castInput = implicitDomainInput ?? domainInput ?? capturedCoercion?.input
      let castType = fields(cast['typeName'])
      let names = strings(castType?.['names'])
      let bounds = castType?.['arrayBounds']
      if (names?.length === 2 && (!Array.isArray(bounds) || bounds.length === 0)) {
        const catalogType =
          (names[0] === 'pg_catalog' ? catalogScalarType(names.join('.')) : null) ??
          catalogArrayType(
            names.map((n) => '"' + n.replaceAll('"', '""') + '"').join('.'),
            undefined,
            domains,
            enums,
            rangeTypes,
          )
        if (catalogType?.startsWith('array:')) {
          castType = { ...castType, ...elementTypeName(catalogType) }
          names = strings(castType['names'])
          bounds = castType['arrayBounds']
        }
      }
      if (Array.isArray(bounds) && bounds.length) {
        if (!names) return unknown
        const definitions = enums.filter((item) =>
          names.length === 2
            ? item.schema === names[0] && item.name === names[1]
            : names.length === 1 && item.name === names[0],
        )
        const definition = definitions.length === 1 ? definitions[0] : undefined
        const domainArray = catalogArrayType(
          names.map((name) => '"' + name.replaceAll('"', '""') + '"').join('.') + '[]',
          undefined,
          domains,
          enums,
          rangeTypes,
        )
        const element =
          (names.length === 1 || (names.length === 2 && names[0] === 'pg_catalog')
            ? catalogScalarType(names.at(-1)!)
            : null) ??
          (definition ? enumType(definition) : null) ??
          catalogBaseScalarType(
            names.map((n) => '"' + n.replaceAll('"', '""') + '"').join('.'),
            undefined,
            domains,
            rangeTypes,
          ) ??
          domainArray?.slice(6)
        if (!element || element.startsWith('array:')) return unknown
        const type = arrayType(element as ArrayElementType)
        if (element.startsWith('domain:')) {
          if (Array.isArray(castType?.['typmods']) && castType['typmods'].length) return unknown
          const constructor = fields(fields(cast['arg'])?.['A_ArrayExpr'])
          if (
            constructor &&
            (literalOrigin === 'source' ||
              !Array.isArray(constructor['elements']) ||
              constructor['elements'].length === 0)
          )
            return bindArray(cast['arg'], {
              type: element as ArrayElementType,
              name: { ...castType, arrayBounds: [] },
            })
          const operand = bind(cast['arg'])
          if (operand.type === type && operand.value) return operand
          if (operand.literal?.kind === 'null') return { type, value: materialize(operand, type) }
          if (
            operand.literal?.kind === 'string' ||
            [
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
              'pg_catalog.name',
            ].includes(operand.type ?? '')
          ) {
            const baseType = arrayElementBaseType(element) as ArrayElementType
            const baseArray = arrayType(baseType)
            let inputConversion: EvalExpression | undefined
            if (baseType.startsWith('array:')) {
              const parsed = bindCatalogCheck(
                [
                  {
                    name: '__pgsid_array_text_element',
                    typeName: 'pg_catalog.text',
                    collationIsC: true,
                    isRowType: false,
                  },
                ],
                {
                  NullTest: {
                    nulltesttype: 'IS_NOT_NULL',
                    arg: {
                      TypeCast: {
                        arg: {
                          ColumnRef: {
                            fields: [{ String: { sval: '__pgsid_array_text_element' } }],
                          },
                        },
                        typeName: elementTypeName(baseType),
                      },
                    },
                  },
                },
                [],
                enums,
                domains,
                moneyLiterals,
                literalOrigin,
                domainStack,
                true,
                undefined,
                undefined,
                rangeTypes,
              ).expression
              if (parsed.kind !== 'eval-scalar' || parsed.expression.kind !== 'null-test')
                return unknown
              inputConversion = parsed.expression.operand
              const nominal = domainElementDefinition(element)!
              const targetDomain = domains.find(
                (item) => item.schema === nominal.schema && item.name === nominal.name,
              )
              const layers: DomainInfo[] = []
              const visited = new Set<number>()
              let layer = targetDomain
              while (layer) {
                if (visited.has(layer.oid)) return unknown
                visited.add(layer.oid)
                layers.push(layer)
                layer = domains.find((item) => item.oid === layer!.baseTypeOid)
              }
              const modifiers = layers
                .reverse()
                .map((item) => item.baseTypeMod)
                .filter((modifier) => modifier !== -1)
              if (modifiers.some((modifier) => modifier === undefined)) return unknown
              if (modifiers.length) {
                if (inputConversion.kind !== 'text-to-array' || inputConversion.conversion)
                  return unknown
                const scalarType = baseType.slice(6) as ScalarType
                let converted: EvalExpression = {
                  kind: 'input',
                  type: scalarType,
                  name: '__pgsid_domain_element',
                }
                for (const modifier of modifiers) {
                  const modified = modifyScalar(converted, scalarType, modifier!, false)
                  if (!modified) return unknown
                  converted = modified
                }
                inputConversion = { ...inputConversion, conversion: converted }
              }
            }
            const mapping = bindArrayElementCoercion(
              { type: baseArray, value: { kind: 'uncertain', type: baseArray } },
              type,
              element as ArrayElementType,
              { ...castType, arrayBounds: [] },
              true,
              baseType.startsWith('array:')
                ? JSON.stringify([
                    domainElementDefinition(element)!.schema,
                    domainElementDefinition(element)!.name,
                  ])
                : undefined,
            ).value
            if (mapping?.kind !== 'array-domain-coerce') return unknown
            const baseEnum = baseType.startsWith('enum:')
              ? enums.find((item) => enumType(item) === baseType)
              : undefined
            const text = operand.literal?.kind === 'string' ? undefined : operand.value
            const value: EvalExpression | null =
              operand.literal?.kind === 'string'
                ? {
                    kind: 'array-text-literal',
                    type,
                    elementType: element as ArrayElementType,
                    value: operand.literal.value!,
                    ...(inputConversion ? { inputConversion } : {}),
                    ...(literalOrigin === 'stored' ? {} : { conversion: mapping.conversion }),
                    ...(baseEnum ? { enum: baseEnum } : {}),
                  }
                : text
                  ? {
                      kind: 'text-to-array',
                      type,
                      elementType: element as ArrayElementType,
                      operand: text,
                      ...(inputConversion ? { inputConversion } : {}),
                      conversion: mapping.conversion,
                      ...(baseEnum ? { enum: baseEnum } : {}),
                    }
                  : null
            return value
              ? {
                  type,
                  value,
                  collation: arrayElementCollation(element as ArrayElementType, operand),
                }
              : unknown
          }
          if (!operand.type?.startsWith('array:') || !operand.value) return unknown
          const domain = domainElementDefinition(element)!
          const targetDomain = domains.find(
            (item) => item.schema === domain.schema && item.name === domain.name,
          )
          if (
            literalOrigin === 'stored' &&
            castInput === undefined &&
            targetDomain &&
            domainNeedsContext(targetDomain)
          )
            return unknown
          return bindArrayElementCoercion(
            operand,
            type,
            element as ArrayElementType,
            {
              ...castType,
              arrayBounds: [],
            },
            castInput ?? false,
          )
        }
        const modifiers = castType?.['typmods']
        const values = Array.isArray(modifiers)
          ? modifiers.map((modifier) => {
              const integer = fields(fields(fields(modifier)?.['A_Const'])?.['ival'])
              return integer ? (integer['ival'] ?? 0) : undefined
            })
          : []
        let modifier = -1
        if (values.length) {
          if (!values.every((value) => typeof value === 'number' && Number.isInteger(value)))
            return unknown
          const width = values[0] as number
          if (element === 'pg_catalog."varchar"' || element === 'pg_catalog.bpchar') {
            if (values.length !== 1 || width < 1 || width > 10485760) return unknown
            modifier = width + 4
          } else if (element === 'pg_catalog."bit"' || element === 'pg_catalog.varbit') {
            if (values.length !== 1 || width < 1 || width > 2147483640) return unknown
            modifier = width
          } else if (element === 'pg_catalog."numeric"') {
            const scale = (values[1] ?? 0) as number
            if (values.length > 2 || width < 1 || width > 1000 || scale < -1000 || scale > 1000)
              return unknown
            modifier = width * 65536 + (scale < 0 ? scale + 2048 : scale) + 4
          } else if (
            [
              'pg_catalog."time"',
              'pg_catalog.timetz',
              'pg_catalog."timestamp"',
              'pg_catalog.timestamptz',
            ].includes(element)
          ) {
            if (values.length !== 1 || width < 0) return unknown
            modifier = Math.min(width, 6)
          } else if (element === 'pg_catalog."interval"') {
            const precision = (values[1] ?? 65535) as number
            if (
              values.length > 2 ||
              ![4, 2, 6, 8, 1024, 1032, 2048, 3072, 3080, 32767, 4096, 6144, 7168, 7176].includes(
                width,
              ) ||
              precision < 0
            )
              return unknown
            modifier = width * 65536 + (precision === 65535 ? 65535 : Math.min(precision, 6))
          } else return unknown
        }
        let bound: Bound
        const constructor = fields(fields(cast['arg'])?.['A_ArrayExpr'])
        if (
          constructor &&
          (literalOrigin === 'source' ||
            constructor['elements'] === undefined ||
            (Array.isArray(constructor['elements']) && constructor['elements'].length === 0))
        )
          return bindArray(cast['arg'], {
            type: element as ArrayElementType,
            name: { ...castType, arrayBounds: [] },
          })
        else {
          const operand = bind(cast['arg'])
          let value = materialize(operand, type, definition)
          if (!value && operand.type?.startsWith('array:domain:'))
            value = bindArrayElementCoercion(
              operand,
              type,
              element as ArrayElementType,
              elementTypeName(element as ArrayElementType),
            ).value
          if (!value && operand.value && operand.type?.startsWith('array:'))
            value = coerceArray(
              operand.value,
              operand.type as ArrayType,
              type,
              'e',
              modifier,
              enums,
            )
          if (
            !value &&
            operand.value &&
            [
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
              'pg_catalog.name',
            ].includes(operand.type ?? '')
          ) {
            const text =
              operand.type === 'pg_catalog.bpchar' || operand.type === 'pg_catalog.name'
                ? operand.value
                : materialize(operand, 'pg_catalog.text')
            if (text)
              value = {
                kind: 'text-to-array',
                type,
                elementType: element as ArrayElementType,
                operand: text,
                ...(definition ? { enum: definition } : {}),
              }
          }
          bound = value
            ? {
                type,
                value,
                collation: arrayElementCollation(element as ArrayElementType, operand),
                ...(definition ? { enum: definition } : {}),
              }
            : unknown
        }
        if (!bound.value || modifier < 0) return bound
        return {
          ...bound,
          type,
          value: {
            kind: 'array-typmod',
            type,
            elementType: element as ArrayElementType,
            modifier,
            operand: bound.value,
          },
        }
      }
      if (
        names?.at(-1) === 'unknown' &&
        (names.length === 1 || (names.length === 2 && names[0] === 'pg_catalog')) &&
        fields(fields(cast['arg'])?.['A_Const'])?.['isnull'] === true
      )
        return bind(cast['arg'])
      const definitions = enums.filter((item) =>
        names?.length === 2
          ? item.schema === names[0] && item.name === names[1]
          : names?.length === 1 && item.name === names[0],
      )
      const definition =
        definitions.length === 1
          ? definitions[0]
          : definitions.find((item) => enumType(item) === expectedType)
      if (definition) {
        const type = enumType(definition)
        const operand = bind(cast['arg'])
        let value = materialize(operand, type, definition)
        if (
          !value &&
          (operand.literal?.kind === 'string' ||
            [
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
              'pg_catalog.name',
            ].includes(operand.type ?? ''))
        ) {
          const text =
            operand.literal?.kind === 'string'
              ? materialize(operand, 'pg_catalog.text')
              : operand.value
          if (
            text &&
            (operand.literal?.kind === 'string' || definition.inputSources?.includes(operand.type!))
          )
            value = {
              kind: 'text-to-enum',
              type,
              enum: definition,
              literal: operand.literal?.kind === 'string',
              operand: text,
            }
        }
        return value ? { type, value, enum: definition } : unknown
      }
      const castDomains = domains.filter((domain) =>
        names?.length === 2
          ? domain.schema === names[0] && domain.name === names[1]
          : names?.length === 1 && domain.name === names[0],
      )
      if (castDomains.length && !(names?.length === 1 && catalogScalarType(names[0]!) !== null)) {
        if (castDomains.length !== 1) return unknown
        const target = castDomains[0]!
        const identity = JSON.stringify([target.schema, target.name])
        if (
          domainStack.has(identity) ||
          (Array.isArray(castType?.['typmods']) && castType['typmods'].length)
        )
          return unknown
        const operand = bind(cast['arg'])
        if (operand.nominalDomain === identity) return operand
        const chain: DomainInfo[] = []
        let layer: DomainInfo | undefined = target
        const visited = new Set<number>()
        while (layer) {
          if (visited.has(layer.oid)) return unknown
          visited.add(layer.oid)
          chain.push(layer)
          layer = domains.find((item) => item.oid === layer!.baseTypeOid)
        }
        const enumBase = catalogEnumDefinition(
          target.baseTypeName,
          enums,
          target.baseTypeOid,
          domains,
        )
        const scalarType = enumBase
          ? enumType(enumBase)
          : (catalogArrayType(
              target.baseTypeName,
              target.baseTypeOid,
              domains,
              enums,
              rangeTypes,
            ) ??
            catalogBaseScalarType(target.baseTypeName, target.baseTypeOid, domains, rangeTypes))
        if (scalarType) {
          if (chain.some((item) => item.baseTypeMod === undefined)) return unknown
          if (
            literalOrigin === 'stored' &&
            castInput === undefined &&
            modifierNeedsContext(scalarType) &&
            chain.some((item) => item.baseTypeMod !== -1)
          )
            return unknown
          const memberModifiers = [...chain]
            .reverse()
            .map((item) => item.baseTypeMod!)
            .filter((modifier) => modifier !== -1)
          const pushModifiers =
            scalarType.startsWith('array:') &&
            literalOrigin === 'source' &&
            !!fields(fields(cast['arg'])?.['A_ArrayExpr']) &&
            memberModifiers.length > 0
          const base = pushModifiers
            ? bindArray(cast['arg'], {
                type: scalarType.slice(6) as ArrayElementType,
                name: elementTypeName(scalarType.slice(6) as ArrayElementType),
                modifiers: memberModifiers,
              })
            : bind({
                TypeCast: {
                  ...cast,
                  typeName: scalarType.startsWith('array:')
                    ? {
                        ...elementTypeName(scalarType.slice(6) as ArrayElementType),
                        arrayBounds: [{ Integer: { ival: -1 } }],
                      }
                    : elementTypeName(scalarType as ArrayElementType),
                },
              })
          if (!base.value || base.type !== scalarType) return unknown
          let value: EvalExpression = base.value
          for (const item of [...chain].reverse()) {
            const modifier = item.baseTypeMod!
            if (modifier === -1) continue
            if (scalarType.startsWith('array:')) {
              if (pushModifiers) continue
              if (castInput) {
                if (preparedArrayDomainInput === identity) continue
                return unknown
              }
              value = {
                kind: 'array-typmod',
                type: scalarType as ArrayType,
                elementType: scalarType.slice(6) as ArrayElementType,
                modifier,
                operand: value,
              }
              continue
            }
            const modified = modifyScalar(value, scalarType, modifier, !(castInput ?? false))
            if (!modified) return unknown
            value = modified
          }
          const checks: { name: string; expression: EvalBoolExpression }[] = []
          for (const item of [...chain].reverse())
            for (const check of item.checks) {
              let expression: EvalBoolExpression = { kind: 'uncertain' }
              try {
                const parsed = parseSync(
                  `ALTER TABLE _pgsid_domain ADD CONSTRAINT _pgsid_domain_check ${check.definition}`,
                )
                const alter = fields(fields(parsed.stmts?.[0]?.stmt)?.['AlterTableStmt'])
                const commands = alter?.['cmds']
                const command = Array.isArray(commands) ? fields(commands[0]) : null
                const body = fields(command?.['AlterTableCmd'])?.['def']
                const constraint = fields(fields(body)?.['Constraint'])
                if (constraint?.['contype'] === 'CONSTR_CHECK')
                  expression = bindCatalogCheck(
                    [
                      {
                        name: 'value',
                        typeName: item.baseTypeName,
                        typeOid: item.baseTypeOid,
                        isRowType: item.isRowType,
                        collationIsC: item.collationIsC,
                        collationDeterministic: item.collationDeterministic,
                        collationIsDefault: item.collationIsDefault,
                        collationOid: item.collationOid,
                      },
                    ],
                    constraint['raw_expr'],
                    [],
                    enums,
                    domains,
                    check.moneyLiterals,
                    'stored',
                    new Set([...domainStack, identity]),
                    undefined,
                    check.coercionContext?.definition === check.definition
                      ? check.coercionContext
                      : undefined,
                    undefined,
                    rangeTypes,
                  ).expression
              } catch {
                expression = { kind: 'uncertain' }
              }
              checks.push({ name: check.name, expression })
            }
          const notNull = chain.some((item) => item.notNull)
          return {
            ...base,
            type: scalarType,
            nominalDomain: identity,
            ...(enumBase ? { enum: enumBase, enumDomain: target.oid } : {}),
            value:
              notNull || checks.length
                ? {
                    kind: 'domain-cast',
                    type: scalarType,
                    schema: target.schema,
                    name: target.name,
                    notNull,
                    checks,
                    operand: value,
                  }
                : value,
          }
        }
        return unknown
      }
      const capturedName = names?.map((part) => '"' + part.replaceAll('"', '""') + '"').join('.')
      const captured = capturedName
        ? catalogBaseScalarType(capturedName, undefined, domains, rangeTypes)
        : null
      if (!captured && names && names.length > 1 && names[0] !== 'pg_catalog') return unknown
      const type = captured ?? (names ? catalogScalarType(names.at(-1)!) : null)
      if (!type) return unknown
      const modifiers = castType?.['typmods']
      if (
        (type === 'pg_catalog."json"' ||
          type === 'pg_catalog.jsonb' ||
          type === 'pg_catalog.jsonpath') &&
        Array.isArray(modifiers) &&
        modifiers.length
      )
        return unknown
      if (type === 'pg_catalog."numeric"' && Array.isArray(modifiers) && modifiers.length) {
        if (modifiers.length > 2) return unknown
        const values = modifiers.map((modifier) => {
          const integer = fields(fields(fields(modifier)?.['A_Const'])?.['ival'])
          return integer ? (integer['ival'] ?? 0) : undefined
        })
        const precision = values[0]
        const scale = values.length === 2 ? values[1] : 0
        if (
          typeof precision !== 'number' ||
          !Number.isInteger(precision) ||
          precision < 1 ||
          precision > 1000 ||
          typeof scale !== 'number' ||
          !Number.isInteger(scale) ||
          scale < -1000 ||
          scale > 1000
        )
          return unknown
        const operand = bind({ TypeCast: { ...cast, typeName: { ...castType, typmods: [] } } })
        const conversion = builtinCast(type, type)
        if (!operand.value || conversion?.method !== 'f' || !conversion.implementation)
          return unknown
        const modifier = precision * 65536 + (scale < 0 ? scale + 2048 : scale) + 4
        return {
          type,
          value: {
            kind: 'call',
            call: { kind: 'function', signature: conversion.implementation, type },
            operands: [
              operand.value,
              {
                kind: 'certain',
                expression: { kind: 'integer', type: 'pg_catalog.int4', value: String(modifier) },
              },
            ],
          },
        }
      }
      if (type === 'pg_catalog."interval"' && Array.isArray(modifiers) && modifiers.length) {
        if (modifiers.length > 2) return unknown
        const values = modifiers.map((modifier) => {
          const integer = fields(fields(fields(modifier)?.['A_Const'])?.['ival'])
          return integer ? (integer['ival'] ?? 0) : undefined
        })
        const range = values[0]
        const precision = values.length === 2 ? values[1] : 65535
        if (
          typeof range !== 'number' ||
          !Number.isInteger(range) ||
          ![4, 2, 6, 8, 1024, 1032, 2048, 3072, 3080, 32767, 4096, 6144, 7168, 7176].includes(
            range,
          ) ||
          typeof precision !== 'number' ||
          !Number.isInteger(precision) ||
          precision < 0
        )
          return unknown
        const modifier = range * 65536 + (precision === 65535 ? 65535 : Math.min(precision, 6))
        const original = bind(cast['arg'])
        if (original.literal?.kind === 'string' && original.literal.value !== null)
          return {
            type,
            value: { kind: 'interval-literal', type, value: original.literal.value, modifier },
          }
        const operand = bind({ TypeCast: { ...cast, typeName: { ...castType, typmods: [] } } })
        const conversion = builtinCast(type, type)
        if (!operand.value || conversion?.method !== 'f' || !conversion.implementation)
          return unknown
        return {
          type,
          value: {
            kind: 'call',
            call: { kind: 'function', signature: conversion.implementation, type },
            operands: [
              operand.value,
              {
                kind: 'certain',
                expression: { kind: 'integer', type: 'pg_catalog.int4', value: String(modifier) },
              },
            ],
          },
        }
      }
      if (
        (type === 'pg_catalog."time"' || type === 'pg_catalog.timetz') &&
        Array.isArray(modifiers) &&
        modifiers.length
      ) {
        if (modifiers.length !== 1) return unknown
        const constant = fields(fields(modifiers[0])?.['A_Const'])
        const integer = fields(constant?.['ival'])
        const precision = integer ? (integer['ival'] ?? 0) : undefined
        if (typeof precision !== 'number' || !Number.isInteger(precision) || precision < 0)
          return unknown
        const operand = bind({
          TypeCast: {
            ...cast,
            typeName: { ...castType, typmods: [] },
          },
        })
        const conversion = builtinCast(type, type)
        if (!operand.value || conversion?.method !== 'f' || !conversion.implementation)
          return unknown
        return {
          type,
          value: {
            kind: 'call',
            call: { kind: 'function', signature: conversion.implementation, type },
            operands: [
              operand.value,
              {
                kind: 'certain',
                expression: {
                  kind: 'integer',
                  type: 'pg_catalog.int4',
                  value: String(Math.min(precision, 6)),
                },
              },
            ],
          },
        }
      }
      if (
        (type === 'pg_catalog."interval"' ||
          type === 'pg_catalog.timestamptz' ||
          type === 'pg_catalog."timestamp"') &&
        Array.isArray(castType?.['typmods']) &&
        castType['typmods'].length
      )
        return unknown
      let operand = bind(cast['arg'])
      const source = boundType(operand)
      if (
        source?.startsWith('array:') &&
        ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type) &&
        operand.value
      ) {
        const output = callables.find(
          ({ item }) =>
            item.kind === 'function' &&
            item.schema === 'pg_catalog' &&
            item.name === 'array_out' &&
            item.strict &&
            !item.returnsSet &&
            item.args.length === 1 &&
            item.args[0] === 'pg_catalog.anyarray' &&
            item.result === 'pg_catalog.cstring',
        )
        if (!output) return unknown
        const definition = arrayOutputEnum(source)
        operand = {
          type: 'pg_catalog.text',
          collation: defaultCollation,
          value: {
            kind: 'array-to-text',
            type: 'pg_catalog.text',
            elementType: source.slice(6) as ArrayElementType,
            operand: operand.value,
            output: output.signature,
            ...(definition ? { enum: definition } : {}),
          },
        }
      }
      if (
        ((source === 'pg_catalog."json"' && type === 'pg_catalog.jsonb') ||
          (source === 'pg_catalog.jsonb' && type === 'pg_catalog."json"')) &&
        operand.value
      ) {
        const conversion = builtinCast(source, type)
        const output = builtinTypeIO(source)?.output
        const metadata = output ? builtinMetadata(output) : null
        if (
          conversion?.method !== 'i' ||
          !output ||
          metadata?.kind !== 'function' ||
          metadata.args.length !== 1 ||
          metadata.args[0] !== source ||
          metadata.result !== 'pg_catalog.cstring' ||
          !metadata.strict ||
          metadata.volatility !== 'i'
        )
          return unknown
        return {
          type,
          value: {
            kind: 'text-to-json',
            type,
            operand: {
              kind: 'io-to-text',
              type: 'pg_catalog.text',
              operand: operand.value,
              output,
            },
          },
        }
      }
      if (
        source === 'pg_catalog.refcursor' &&
        [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(type) &&
        operand.value
      )
        operand = {
          type: 'pg_catalog.text',
          collation: defaultCollation,
          value: {
            kind: 'refcursor-text-coercion',
            type: 'pg_catalog.text',
            operand: operand.value,
          },
        }
      if (
        type === 'pg_catalog.refcursor' &&
        [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(source ?? '') &&
        operand.value
      )
        return { type, value: { kind: 'refcursor-text-coercion', type, operand: operand.value } }
      if (
        ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type) &&
        (source === 'pg_catalog."time"' || source === 'pg_catalog.timetz') &&
        operand.value
      )
        operand = {
          type: 'pg_catalog.text',
          collation: defaultCollation,
          value: { kind: 'clock-to-text', type: 'pg_catalog.text', operand: operand.value },
        }
      if (
        (['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type) ||
          (type === 'pg_catalog.name' && isSnapshotType(source))) &&
        (isIntegerType(source) ||
          source === 'pg_catalog."numeric"' ||
          source === 'pg_catalog."json"' ||
          source === 'pg_catalog.jsonb' ||
          source === 'pg_catalog.jsonpath' ||
          isSnapshotType(source) ||
          isRangeType(source) ||
          isMultirangeType(source) ||
          isOidAliasType(source) ||
          [
            'pg_catalog.oid',
            'pg_catalog.xid',
            'pg_catalog.cid',
            'pg_catalog.tid',
            'pg_catalog.xid8',
            'pg_catalog.pg_lsn',
          ].includes(source ?? '') ||
          operand.enum)
      ) {
        const value = source ? materialize(operand, source) : null
        const output =
          operand.enum?.outputFunction ??
          (source ? (rangeTypeOutput(source) ?? builtinTypeIO(source)?.output) : null)
        const metadata = output ? callables.find((item) => item.signature === output)?.item : null
        if (
          !value ||
          !output ||
          !metadata ||
          metadata.kind !== 'function' ||
          metadata.result !== 'pg_catalog.cstring' ||
          !metadata.strict ||
          metadata.args.length !== 1 ||
          metadata.args[0] !==
            (operand.enum
              ? 'pg_catalog.anyenum'
              : isRangeType(source)
                ? 'pg_catalog.anyrange'
                : isMultirangeType(source)
                  ? 'pg_catalog.anymultirange'
                  : source) ||
          (!operand.enum &&
            metadata.volatility !== 'i' &&
            !isOidAliasType(source) &&
            !isRangeType(source) &&
            !isMultirangeType(source))
        )
          return unknown
        operand = {
          type: 'pg_catalog.text',
          collation: defaultCollation,
          value: {
            kind: 'io-to-text',
            type: 'pg_catalog.text',
            operand: value,
            output,
            enum: operand.enum,
          },
        }
      }
      if (type === 'pg_catalog."varchar"' || type === 'pg_catalog.bpchar') {
        const modifiers = castType?.['typmods']
        let width: number | null = null
        if (Array.isArray(modifiers) && modifiers.length) {
          if (modifiers.length !== 1) return unknown
          const constant = fields(fields(modifiers[0])?.['A_Const'])
          const length = fields(constant?.['ival'])?.['ival']
          if (
            typeof length !== 'number' ||
            !Number.isInteger(length) ||
            length <= 0 ||
            length > 10485760
          )
            return unknown
          width = length
        }
        let value = materialize(operand, type)
        const source = operand.type
        if (!value && source && operand.value) {
          const conversion = builtinCast(source, type)
          if (conversion?.method === 'b')
            value = {
              kind: 'call',
              call: { kind: 'cast', signature: null, type },
              operands: [operand.value],
            }
          else if (conversion?.method === 'f' && conversion.implementation) {
            const implementation = builtinMetadata(conversion.implementation)
            if (
              implementation.kind !== 'function' ||
              implementation.args.length !== 1 ||
              implementation.volatility !== 'i'
            )
              return unknown
            const argument = catalogScalarType(implementation.args[0]!)
            const result = catalogScalarType(implementation.result)
            const converted = argument ? implicitOperand(operand, argument) : null
            if (!result || !converted) return unknown
            value = {
              kind: 'call',
              call: { kind: 'function', signature: conversion.implementation, type: result },
              operands: [converted],
            }
            if (result !== type) {
              if (!isBinaryTextRelabel(result, type) || builtinCast(result, type)?.method !== 'b')
                return unknown
              value = {
                kind: 'call',
                call: { kind: 'cast', signature: null, type },
                operands: [value],
              }
            }
          }
        }
        if (!value) return unknown
        const collation = operand.collation ?? defaultCollation
        if (width === null) return { type, value, collation }
        const conversion = builtinCast(type, type)
        if (conversion?.method !== 'f' || !conversion.implementation) return unknown
        return {
          type,
          collation,
          value: {
            kind: 'call',
            call: { kind: 'function', signature: conversion.implementation, type },
            operands: [
              value,
              {
                kind: 'certain',
                expression: { kind: 'integer', type: 'pg_catalog.int4', value: String(width + 4) },
              },
              {
                kind: 'certain',
                expression: { kind: 'boolean', type: 'pg_catalog.bool', value: true },
              },
            ],
          },
        }
      }
      if (type === 'pg_catalog."bit"' || type === 'pg_catalog.varbit') {
        const modifiers = castType?.['typmods']
        let width = -1
        if (Array.isArray(modifiers) && modifiers.length) {
          if (modifiers.length !== 1) return unknown
          const constant = fields(fields(modifiers[0])?.['A_Const'])
          const length = fields(constant?.['ival'])?.['ival']
          if (
            typeof length !== 'number' ||
            !Number.isInteger(length) ||
            length <= 0 ||
            length > 2147483640
          )
            return unknown
          width = length
        }
        let value: EvalExpression | null = null
        const source = boundType(operand)
        if (isIntegerType(source)) {
          const conversion = source ? builtinCast(source, type) : null
          if (conversion?.method !== 'f' || !conversion.implementation) return unknown
          const input = materialize(operand, source!)
          if (!input) return unknown
          return {
            type,
            value: {
              kind: 'call',
              call: { kind: 'function', signature: conversion.implementation, type },
              operands: [
                input,
                {
                  kind: 'certain',
                  expression: { kind: 'integer', type: 'pg_catalog.int4', value: String(width) },
                },
              ],
            },
          }
        }
        if (
          (!operand.type && operand.literal) ||
          operand.type === 'pg_catalog.text' ||
          operand.type === 'pg_catalog."varchar"'
        ) {
          const text = materialize(operand, 'pg_catalog.text')
          if (text) value = { kind: 'text-to-bit', type, operand: text }
        } else if (operand.type === 'pg_catalog."bit"' || operand.type === 'pg_catalog.varbit') {
          value = materialize(operand, type)
        }
        if (!value) return unknown
        if (width === -1) return { type, value }
        const conversion = builtinCast(type, type)
        if (conversion?.method !== 'f' || !conversion.implementation) return unknown
        return {
          type,
          value: {
            kind: 'call',
            call: { kind: 'function', signature: conversion.implementation, type },
            operands: [
              value,
              {
                kind: 'certain',
                expression: { kind: 'integer', type: 'pg_catalog.int4', value: String(width) },
              },
              {
                kind: 'certain',
                expression: { kind: 'boolean', type: 'pg_catalog.bool', value: true },
              },
            ],
          },
        }
      }
      if (
        operand.type === 'pg_catalog."bit"' &&
        (type === 'pg_catalog.int4' || type === 'pg_catalog.int8') &&
        operand.value
      ) {
        const conversion = builtinCast(operand.type, type)
        return conversion?.method === 'f' && conversion.implementation
          ? {
              type,
              value: {
                kind: 'call',
                call: { kind: 'cast', signature: conversion.implementation, type },
                operands: [operand.value],
              },
            }
          : unknown
      }
      if (
        (operand.type === 'pg_catalog."bit"' || operand.type === 'pg_catalog.varbit') &&
        type === 'pg_catalog.text' &&
        operand.value
      )
        return {
          type,
          collation: defaultCollation,
          value: { kind: 'bit-to-text', type, operand: operand.value },
        }
      if (
        (operand.type === 'pg_catalog.inet' || operand.type === 'pg_catalog.cidr') &&
        type === 'pg_catalog.text' &&
        operand.value
      ) {
        const conversion = builtinCast(operand.type, type)
        if (conversion?.method !== 'f' || !conversion.implementation) return unknown
        const implementation = builtinMetadata(conversion.implementation)
        if (implementation.kind !== 'function' || implementation.args.length !== 1) return unknown
        const value = materialize(operand, implementation.args[0]! as ScalarType)
        return value
          ? {
              type,
              collation: defaultCollation,
              value: {
                kind: 'call',
                call: { kind: 'cast', signature: conversion.implementation, type },
                operands: [value],
              },
            }
          : unknown
      }
      if (operand.type === 'pg_catalog.uuid' && type === 'pg_catalog.text' && operand.value)
        return {
          type,
          collation: defaultCollation,
          value: { kind: 'uuid-to-text', type, operand: operand.value },
        }
      if (
        type === 'pg_catalog.bytea' &&
        (operand.type === 'pg_catalog.text' ||
          operand.type === 'pg_catalog."varchar"' ||
          operand.type === 'pg_catalog.bpchar') &&
        operand.value
      ) {
        const text =
          operand.type === 'pg_catalog.bpchar'
            ? operand.value
            : materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-bytea', type, operand: text } } : unknown
      }
      if (
        isIntegerType(type) &&
        operand.value &&
        [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type ?? '')
      )
        return { type, value: { kind: 'text-to-integer', type, operand: operand.value } }
      if (
        type === 'pg_catalog.bool' &&
        operand.value &&
        [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type ?? '')
      )
        return { type, value: { kind: 'text-to-boolean', type, operand: operand.value } }
      if (
        type === 'pg_catalog."numeric"' &&
        operand.value &&
        [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type ?? '')
      )
        return { type, value: { kind: 'text-to-numeric', type, operand: operand.value } }
      if (
        (type === 'pg_catalog.float4' || type === 'pg_catalog.float8') &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-float', type, operand: text } } : unknown
      }
      if (
        (isRangeType(type) || isMultirangeType(type)) &&
        operand.value &&
        [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type ?? '')
      )
        return isMultirangeType(type)
          ? { type, value: { kind: 'text-to-multirange', type, operand: operand.value } }
          : { type, value: { kind: 'text-to-range', type, operand: operand.value } }
      if (
        type === 'pg_catalog.point' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-point', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.line' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-line', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.lseg' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-lseg', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.money' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-money', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.xid' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-xid', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.cid' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-cid', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.pg_lsn' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-pg_lsn', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.tid' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-tid', type, operand: text } } : unknown
      }
      if (
        (type === 'pg_catalog."json"' ||
          type === 'pg_catalog.jsonb' ||
          type === 'pg_catalog.jsonpath') &&
        operand.value &&
        [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type ?? '')
      ) {
        const text =
          operand.type === 'pg_catalog.bpchar' || operand.type === 'pg_catalog.name'
            ? operand.value
            : materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-json', type, operand: text } } : unknown
      }
      if (
        isSnapshotType(type) &&
        operand.value &&
        [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type ?? '')
      ) {
        const text =
          operand.type === 'pg_catalog.bpchar' || operand.type === 'pg_catalog.name'
            ? operand.value
            : materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-snapshot', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.xid8' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-xid8', type, operand: text } } : unknown
      }
      if (
        isOidType(type) &&
        (castInput === true || builtinCast('pg_catalog.text', type)?.method !== 'f') &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-oid', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.polygon' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-polygon', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.path' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-path', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.circle' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-circle', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.box' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-box', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog.uuid' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-uuid', type, operand: text } } : unknown
      }
      if (isMacType(operand.type) && type === 'pg_catalog.text' && operand.value)
        return {
          type,
          collation: defaultCollation,
          value: { kind: 'mac-to-text', type, operand: operand.value },
        }
      if (isMacType(operand.type) && isMacType(type) && operand.type !== type && operand.value) {
        const cast = builtinCast(operand.type!, type)
        return cast?.method === 'f' && cast.implementation !== null
          ? {
              type,
              value: {
                kind: 'call',
                call: { kind: 'cast', signature: cast.implementation, type },
                operands: [operand.value],
              },
            }
          : unknown
      }
      if (
        (type === 'pg_catalog.macaddr' || type === 'pg_catalog.macaddr8') &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-mac', type, operand: text } } : unknown
      }
      if (operand.type === 'pg_catalog.cidr' && type === 'pg_catalog.inet' && operand.value)
        return { type, value: materialize(operand, type) }
      if (operand.type === 'pg_catalog.inet' && type === 'pg_catalog.cidr' && operand.value) {
        const conversion = builtinCast(operand.type, type)
        return conversion?.method === 'f' && conversion.implementation !== null
          ? {
              type,
              value: {
                kind: 'call',
                call: { kind: 'cast', signature: conversion.implementation, type },
                operands: [operand.value],
              },
            }
          : unknown
      }
      if (operand.type && operand.value && isBinaryBitRelabel(operand.type, type))
        return { type, value: materialize(operand, type) }
      if (operand.type && operand.value && isBinaryTextRelabel(operand.type, type))
        return {
          type,
          value: {
            kind: 'call',
            call: { kind: 'cast', signature: null, type },
            operands: [operand.value],
          },
          collation: operand.collation ?? defaultCollation,
        }
      if (
        (type === 'pg_catalog.inet' || type === 'pg_catalog.cidr') &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-network', type, operand: text } } : unknown
      }
      if (
        (type === 'pg_catalog."time"' || type === 'pg_catalog.timetz') &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-clock', type, operand: text } } : unknown
      }
      if (
        type === 'pg_catalog."interval"' &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-interval', type, operand: text } } : unknown
      }
      if (type === 'pg_catalog.date' && operand.type === 'pg_catalog.text' && operand.value)
        return {
          type,
          value: { kind: 'text-to-date', type, operand: operand.value },
        }
      if (type === 'pg_catalog."timestamp"' && operand.type === 'pg_catalog.text' && operand.value)
        return {
          type,
          value: { kind: 'text-to-timestamp', type, operand: operand.value },
        }
      if (type === 'pg_catalog.timestamptz' && operand.type === 'pg_catalog.text' && operand.value)
        return {
          type,
          value: { kind: 'text-to-timestamptz', type, operand: operand.value },
        }
      if (
        (type === 'pg_catalog.int2' || type === 'pg_catalog.int4' || type === 'pg_catalog.int8') &&
        operand.literal?.kind === 'string' &&
        typeof operand.literal.value === 'string' &&
        /^-?(?:0|[1-9][0-9]*)$/u.test(operand.literal.value)
      ) {
        const integer = BigInt(operand.literal.value)
        const limit =
          type === 'pg_catalog.int2'
            ? 32767n
            : type === 'pg_catalog.int4'
              ? 2147483647n
              : 9223372036854775807n
        if (integer >= -limit - 1n && integer <= limit)
          return {
            type,
            value: {
              kind: 'certain',
              expression: { kind: 'integer', type, value: integer.toString() },
            },
          }
      }
      const expression = materialize(operand, type)
      if (expression)
        return {
          type,
          value: expression,
          ...([
            'pg_catalog.name',
            'pg_catalog.text',
            'pg_catalog."varchar"',
            'pg_catalog.bpchar',
          ].includes(type)
            ? { collation: operand.collation ?? defaultCollation }
            : {}),
        }
      const conversionSource =
        operand.type ?? (operand.literal?.kind === 'integer' ? 'pg_catalog.int4' : null)
      if (conversionSource) {
        const value = materialize(operand, conversionSource)
        if (!value) return unknown
        const conversion = builtinCast(conversionSource, type)
        if (conversion?.method === 'b' && (isOidType(conversionSource) || isOidType(type)))
          return {
            type,
            value: {
              kind: 'call',
              call: { kind: 'cast', signature: null, type },
              operands: [value],
            },
          }
        if (conversion?.method === 'f' && conversion.implementation !== null) {
          const implementation = builtinMetadata(conversion.implementation)
          const result = catalogScalarType(implementation.result)
          if (
            implementation.kind !== 'function' ||
            implementation.args.length !== 1 ||
            (implementation.volatility !== 'i' && !isOidAliasType(result)) ||
            !result
          )
            return unknown
          const argumentType = catalogScalarType(implementation.args[0]!)
          const internalCharPhysicalCast =
            conversionSource === 'pg_catalog.bpchar' &&
            type === 'pg_catalog."char"' &&
            argumentType === 'pg_catalog.text' &&
            result === type
          const argument =
            internalCharPhysicalCast || argumentType === conversionSource
              ? value
              : argumentType
                ? implicitOperand(operand, argumentType)
                : null
          if (!argument) return unknown
          let converted: EvalExpression = {
            kind: 'call',
            call: {
              kind: internalCharPhysicalCast ? 'cast' : 'function',
              signature: conversion.implementation,
              type: result,
            },
            operands: [argument],
          }
          if (result !== type) {
            if (builtinCast(result, type)?.method !== 'b') return unknown
            converted = {
              kind: 'call',
              call: { kind: 'cast', signature: null, type },
              operands: [converted],
            }
          }
          return {
            type,
            value: converted,
            ...(['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type)
              ? { collation: operand.collation ?? defaultCollation }
              : {}),
          }
        }
      }
      return unknown
    }
    const constant = fields(wrapper['A_Const'])
    if (constant) {
      if (constant['isnull'] === true)
        return { type: null, value: null, literal: { kind: 'null', value: null } }
      const bitNode = fields(constant['bsval'])
      const bit = bitNode?.['bsval']
      if (typeof bit === 'string')
        return {
          type: 'pg_catalog."bit"',
          value: {
            kind: 'certain',
            expression: { kind: 'bit', type: 'pg_catalog."bit"', value: bit },
          },
        }
      const stringNode = fields(constant['sval'])
      if (stringNode) {
        const string = stringNode['sval'] ?? ''
        if (typeof string === 'string')
          return {
            type: null,
            value: null,
            literal: {
              kind: 'string',
              value: string,
              moneyUnits: moneyUnits.get(string),
            },
            collation: defaultCollation,
          }
      }
      const integerNode = fields(constant['ival'])
      if (integerNode) {
        const integer = integerNode['ival'] ?? 0
        if (typeof integer === 'number')
          return { type: null, value: null, literal: { kind: 'integer', value: String(integer) } }
      }
      const floatNode = fields(constant['fval'])
      const float = floatNode?.['fval']
      if (typeof float === 'string' && /^-?(?:0|[1-9][0-9]*)$/u.test(float)) {
        const integer = BigInt(float)
        if (integer >= -2147483648n && integer <= 2147483647n)
          return { type: null, value: null, literal: { kind: 'integer', value: float } }
        if (integer >= -9223372036854775808n && integer <= 9223372036854775807n)
          return {
            type: 'pg_catalog.int8',
            literal: { kind: 'integer', value: float },
            value: {
              kind: 'certain',
              expression: { kind: 'integer', type: 'pg_catalog.int8', value: float },
            },
          }
      }
      if (typeof float === 'string')
        return {
          type: 'pg_catalog."numeric"',
          value: {
            kind: 'certain',
            expression: { kind: 'decimal', type: 'pg_catalog."numeric"', value: float },
          },
        }
      const booleanNode = fields(constant['boolval'])
      if (booleanNode) {
        const boolean = booleanNode['boolval'] ?? false
        if (typeof boolean !== 'boolean') return unknown
        return {
          type: 'pg_catalog.bool',
          value: {
            kind: 'certain',
            expression: {
              kind: 'boolean',
              type: 'pg_catalog.bool',
              value: boolean,
            },
          },
        }
      }
      return unknown
    }
    const names = strings(fields(wrapper['ColumnRef'])?.['fields'])
    if (names?.length === 1) {
      const column = columns.find((item) => item.name === names[0])
      const domain = column && domains.find((item) => item.oid === column.typeOid)
      const nominalDomain = domain ? JSON.stringify([domain.schema, domain.name]) : undefined
      const definition =
        column && catalogEnumDefinition(column.typeName, enums, column.typeOid, domains)
      if (definition) {
        inputs.add(column.name)
        const type = enumType(definition)
        return {
          type,
          enum: definition,
          enumDomain: domains.find((domain) => domain.oid === column.typeOid)?.oid,
          nominalDomain,
          value: { kind: 'input', type, name: column.name, enum: definition },
        }
      }
      const type =
        column &&
        (catalogArrayType(column.typeName, column.typeOid, domains, enums, rangeTypes) ??
          catalogBaseScalarType(column.typeName, column.typeOid, domains, rangeTypes))
      if (type) {
        inputs.add(column.name)
        const element = type.startsWith('array:') ? arrayElementBaseType(type.slice(6)) : null
        const enumDefinition = element?.startsWith('enum:')
          ? enums.find((item) => enumType(item) === element)
          : undefined
        return {
          type,
          value: { kind: 'input', type, name: column.name },
          nominalDomain,
          ...(enumDefinition ? { enum: enumDefinition } : {}),
          ...(type === 'pg_catalog.name' ||
          type === 'pg_catalog.text' ||
          type === 'pg_catalog."varchar"' ||
          type === 'pg_catalog.bpchar' ||
          (type.startsWith('array:') &&
            arrayElementCollation(type.slice(6) as ArrayElementType) !== undefined)
            ? {
                collation: {
                  kind:
                    column.collationIsC === true
                      ? ('C' as const)
                      : column.collationDeterministic === true
                        ? ('deterministic' as const)
                        : ('other' as const),
                  identity:
                    column.collationIsC === true
                      ? 'C'
                      : column.collationIsDefault === true
                        ? 'default'
                        : (column.collationOid ?? `column:${column.name}`),
                  ...(column.collationIsDefault === true ? { default: true as const } : {}),
                },
              }
            : {}),
        }
      }
    }
    const collate = fields(wrapper['CollateClause'])
    if (collate) {
      const inner = bind(collate['arg'])
      const names = strings(collate['collname'])
      return {
        ...inner,
        collation: {
          kind:
            (names?.length === 1 || names?.[0] === 'pg_catalog') && names.at(-1) === 'C'
              ? 'C'
              : 'other',
          identity:
            (names?.length === 1 || names?.[0] === 'pg_catalog') && names.at(-1) === 'C'
              ? 'C'
              : `explicit:${JSON.stringify(names)}`,
          explicit: true,
        },
      }
    }
    const operator = fields(wrapper['A_Expr'])
    if (
      operator &&
      ['AEXPR_OP', 'AEXPR_DISTINCT', 'AEXPR_NOT_DISTINCT'].includes(String(operator['kind']))
    ) {
      const left = fields(fields(operator['lexpr'])?.['RowExpr'])?.['args']
      const right = fields(fields(operator['rexpr'])?.['RowExpr'])?.['args']
      if (left !== undefined || right !== undefined) {
        if (
          !Array.isArray(left) ||
          !Array.isArray(right) ||
          !left.length ||
          left.length !== right.length
        )
          return unknown
        if ([...left, ...right].some((value) => fields(value)?.['RowExpr'] !== undefined))
          return unknown
        const names = strings(operator['name'])
        if (!names || (names.length > 1 && names[0] !== 'pg_catalog')) return unknown
        const name = names.at(-1)!
        if (left.length === 1)
          return bind({ A_Expr: { ...operator, lexpr: left[0], rexpr: right[0] } })
        const distinct = operator['kind'] !== 'AEXPR_OP'
        if (!distinct && !['=', '<>', '<', '<=', '>', '>='].includes(name)) return unknown
        const pairs = left.map((node, index) =>
          comparisonCandidate([bind(node), bind(right[index])], distinct ? '=' : name),
        )
        if (pairs.some((pair) => !pair)) return unknown
        if (distinct || name === '=' || name === '<>') {
          const operands = pairs.map((pair, index): EvalExpression =>
            distinct
              ? (bind({
                  A_Expr: {
                    ...operator,
                    kind: 'AEXPR_DISTINCT',
                    lexpr: left[index],
                    rexpr: right[index],
                  },
                }).value ?? { kind: 'uncertain', type: 'pg_catalog.bool' })
              : {
                  kind: 'call',
                  call: {
                    kind: 'operator',
                    signature: pair!.signature,
                    type: 'pg_catalog.bool',
                    collation: pair!.collation?.kind,
                    ...arrayDefaultCollation(pair!.signature, pair!.collation),
                  },
                  operands: pair!.operands,
                  strictNull: true,
                },
          )
          const value: EvalExpression = {
            kind: 'boolean-logic',
            type: 'pg_catalog.bool',
            operation: !distinct && name === '=' ? 'and' : 'or',
            operands,
          }
          return {
            type: 'pg_catalog.bool',
            value:
              operator['kind'] === 'AEXPR_NOT_DISTINCT'
                ? {
                    kind: 'boolean-logic',
                    type: 'pg_catalog.bool',
                    operation: 'not',
                    operands: [value],
                  }
                : value,
          }
        }
        let strategy: 1 | 2 | 4 | 5 | undefined
        const comparisons: Extract<EvalExpression, { kind: 'row-compare' }>['pairs'][number][] = []
        for (const pair of pairs) {
          const entries = builtinBtreeComparisons(pair!.signature).filter(
            (entry) => entry.strategy !== 3,
          )
          if (
            !entries.length ||
            entries.some(
              (entry) =>
                entry.comparator === null ||
                entry.comparator !== entries[0]!.comparator ||
                entry.strategy !== entries[0]!.strategy,
            )
          )
            return unknown
          const entry = entries[0]!
          if (entry.strategy === 3 || (strategy !== undefined && strategy !== entry.strategy))
            return unknown
          strategy = entry.strategy
          const comparator = builtinMetadata(entry.comparator!)
          if (
            comparator.kind !== 'function' ||
            comparator.result !== 'pg_catalog.int4' ||
            comparator.args.some((type, index) => type !== pair!.item.args[index])
          )
            return unknown
          comparisons.push({
            operands: [pair!.operands[0]!, pair!.operands[1]!],
            comparison: {
              kind: 'function',
              signature: entry.comparator!,
              type: 'pg_catalog.int4',
              collation: pair!.collation?.kind,
              ...arrayDefaultCollation(pair!.signature, pair!.collation),
            },
          })
        }
        return strategy === undefined
          ? unknown
          : {
              type: 'pg_catalog.bool',
              value: { kind: 'row-compare', type: 'pg_catalog.bool', strategy, pairs: comparisons },
            }
      }
    }
    if (
      operator &&
      ['AEXPR_BETWEEN', 'AEXPR_NOT_BETWEEN', 'AEXPR_BETWEEN_SYM', 'AEXPR_NOT_BETWEEN_SYM'].includes(
        String(operator['kind']),
      )
    ) {
      const bounds = fields(fields(operator['rexpr'])?.['List'])?.['items']
      if (!Array.isArray(bounds) || bounds.length !== 2 || operator['lexpr'] === undefined)
        return unknown
      const negated = String(operator['kind']).startsWith('AEXPR_NOT_')
      const symmetric = String(operator['kind']).endsWith('_SYM')
      const compare = (name: string, bound: unknown): unknown => ({
        A_Expr: {
          kind: 'AEXPR_OP',
          name: [{ String: { sval: name } }],
          lexpr: operator['lexpr'],
          rexpr: bound,
        },
      })
      const range = (low: unknown, high: unknown): unknown => ({
        BoolExpr: {
          boolop: negated ? 'OR_EXPR' : 'AND_EXPR',
          args: [compare(negated ? '<' : '>=', low), compare(negated ? '>' : '<=', high)],
        },
      })
      const forward = range(bounds[0], bounds[1])
      return {
        type: 'pg_catalog.bool',
        value: {
          kind: 'check',
          type: 'pg_catalog.bool',
          expression: lower(
            symmetric
              ? {
                  BoolExpr: {
                    boolop: negated ? 'AND_EXPR' : 'OR_EXPR',
                    args: [forward, range(bounds[1], bounds[0])],
                  },
                }
              : forward,
          ),
        },
      }
    }
    if (operator && ['AEXPR_OP_ANY', 'AEXPR_OP_ALL'].includes(String(operator['kind']))) {
      const names = strings(operator['name'])
      if (!names || (names.length > 1 && names[0] !== 'pg_catalog')) return unknown
      const name = names.at(-1)
      if (!name) return unknown
      const subject = bind(operator['lexpr'])
      const array = bind(operator['rexpr'])
      const inferred = boundType(subject) ?? 'pg_catalog.text'
      const sourceType =
        array.type ??
        (array.literal && !inferred.startsWith('array:')
          ? arrayType(inferred as ArrayElementType)
          : null)
      if (!sourceType?.startsWith('array:')) return unknown
      const sourceElement = sourceType.slice(6) as ArrayElementType
      const baseElement = arrayElementBaseType(sourceElement) as ScalarType
      const definition = array.enum ?? subject.enum
      const value = materialize(array, sourceType, definition)
      const dummy = materialize(
        { type: null, value: null, literal: { kind: 'null', value: null } },
        baseElement,
        definition,
      )
      if (!value || !dummy) return unknown
      const collation =
        arrayCollations([subject.collation, array.collation]) ??
        arrayElementCollation(sourceElement)
      const resolved = comparisonCandidate(
        [
          { ...subject, collation },
          { type: baseElement, value: dummy, enum: array.enum, collation },
        ],
        name,
        false,
      )
      if (!resolved || resolved.item.result !== 'pg_catalog.bool') return unknown
      const element =
        resolved.item.args[1] === 'pg_catalog.anyenum'
          ? resolved.enum && enumType(resolved.enum)
          : resolved.item.args[1] === 'pg_catalog.anyarray'
            ? baseElement.startsWith('array:') && baseElement
            : resolved.item.args[1] === 'pg_catalog.anymultirange'
              ? isMultirangeType(baseElement) && baseElement
              : resolved.item.args[1] === 'pg_catalog.anyrange'
                ? isRangeType(baseElement) && baseElement
                : catalogScalarType(resolved.item.args[1]!)
      if (!element || (element.startsWith('array:') && element !== baseElement)) return unknown
      const targetElement = element === baseElement ? sourceElement : (element as ArrayElementType)
      const operand =
        element === baseElement
          ? value
          : coerceBound(
              { ...array, type: sourceType, value },
              arrayType(targetElement),
              operator['rexpr'],
              definition,
            )
      if (!operand) return unknown
      return {
        type: 'pg_catalog.bool',
        value: {
          kind: 'array-quantifier',
          type: 'pg_catalog.bool',
          elementType: targetElement,
          operands: [resolved.operands[0]!, operand],
          comparison: {
            kind: 'operator',
            signature: resolved.signature,
            type: 'pg_catalog.bool',
            collation: collation?.kind,
            ...(collation?.default ? { collationDefault: true as const } : {}),
          },
          any: operator['kind'] === 'AEXPR_OP_ANY',
        },
      }
    }
    if (operator && operator['kind'] === 'AEXPR_IN') {
      const names = strings(operator['name'])
      if (!names || (names.length > 1 && names[0] !== 'pg_catalog')) return unknown
      const name = names.at(-1)
      const operation = name === '=' ? 'or' : name === '<>' ? 'and' : null
      if (!operation) return unknown
      const list = fields(fields(operator['rexpr'])?.['List'])?.['items']
      if (!Array.isArray(list) || list.length === 0) return unknown
      const array = { members: list }
      const subject = bind(operator['lexpr'])
      const members = array.members.map((member) => bind(member))
      const type =
        subject.type ??
        members.find((member) => member.type)?.type ??
        ([subject, ...members].some((member) => member.literal?.kind === 'integer')
          ? 'pg_catalog.int4'
          : 'pg_catalog.text')
      const definition = subject.enum ?? members.find((member) => member.enum)?.enum
      const value = materialize(subject, type, definition)
      if (!value) return unknown
      const collation = type.startsWith('array:')
        ? arrayCollations([subject, ...members].map((member) => member.collation))
        : combineCollations([subject, ...members].map((member) => member.collation))
      const resolved = members.map((member) =>
        candidate('operator', name!, [
          { ...subject, type, value, literal: undefined, collation },
          {
            ...member,
            type,
            value: materialize(member, type, definition),
            literal: undefined,
            collation,
            enum: member.enum ?? definition,
          },
        ]),
      )
      if (resolved.some((member) => !member)) return unknown
      const first = resolved[0]!
      if (resolved.some((member) => member!.signature !== first.signature)) return unknown
      const withColumns = array.members.map(containsColumn)
      const constants = resolved.flatMap((member, index) =>
        !withColumns[index] ? [member!.operands[1]!] : [],
      )
      const groups =
        constants.length > 1
          ? [
              constants,
              ...resolved.flatMap((member, index) =>
                withColumns[index] ? [[member!.operands[1]!]] : [],
              ),
            ]
          : resolved.map((member) => [member!.operands[1]!])
      return {
        type: 'pg_catalog.bool',
        value: {
          kind: 'membership',
          type: 'pg_catalog.bool',
          subject: first.operands[0]!,
          groups,
          operation,
          comparison: {
            kind: 'operator',
            signature: first.signature,
            type: 'pg_catalog.bool',
            collation: collation?.kind,
            ...arrayDefaultCollation(first.signature, collation),
          },
        },
      }
    }
    if (
      operator &&
      ['AEXPR_DISTINCT', 'AEXPR_NOT_DISTINCT', 'AEXPR_NULLIF'].includes(String(operator['kind']))
    ) {
      const nodes = [operator['lexpr'], operator['rexpr']]
      const negated = operator['kind'] === 'AEXPR_NOT_DISTINCT'
      const nullIndex = nodes.findIndex(
        (node) => fields(fields(node)?.['A_Const'])?.['isnull'] === true,
      )
      if (nullIndex !== -1 && operator['kind'] !== 'AEXPR_NULLIF')
        return bind({
          NullTest: {
            arg: nodes[1 - nullIndex],
            nulltesttype: negated ? 'IS_NULL' : 'IS_NOT_NULL',
          },
        })
      const resolved = comparisonCandidate(nodes.map((node) => bind(node)))
      if (!resolved || resolved.item.result !== 'pg_catalog.bool' || resolved.operands.length !== 2)
        return unknown
      const comparison = {
        kind: 'operator' as const,
        signature: resolved.signature,
        type: 'pg_catalog.bool' as const,
        collation: resolved.collation?.kind,
        ...arrayDefaultCollation(resolved.signature, resolved.collation),
      }
      if (operator['kind'] === 'AEXPR_NULLIF') {
        const type =
          resolved.item.args[0] === 'pg_catalog.anyenum'
            ? resolved.enum && enumType(resolved.enum)
            : ['pg_catalog.anyarray', 'pg_catalog.anyrange', 'pg_catalog.anymultirange'].includes(
                  resolved.item.args[0]!,
                )
              ? resolved.operands[0]!.kind === 'certain'
                ? resolved.operands[0]!.expression.type
                : resolved.operands[0]!.kind === 'call'
                  ? resolved.operands[0]!.call.type
                  : 'type' in resolved.operands[0]!
                    ? resolved.operands[0]!.type
                    : null
              : catalogScalarType(resolved.item.args[0]!)
        if (!type) return unknown
        const resultType = type as ScalarType
        return {
          type: resultType,
          enum: resolved.enum,
          collation: resolved.collation,
          value: {
            kind: 'nullif',
            type: resultType,
            operands: [resolved.operands[0]!, resolved.operands[1]!],
            comparison,
          },
        }
      }
      return {
        type: 'pg_catalog.bool',
        value: {
          kind: 'distinct',
          type: 'pg_catalog.bool',
          negated,
          operands: [resolved.operands[0]!, resolved.operands[1]!],
          comparison,
        },
      }
    }
    if (operator && ['AEXPR_OP', 'AEXPR_LIKE', 'AEXPR_ILIKE'].includes(String(operator['kind']))) {
      const names = strings(operator['name'])
      if (names && names.length > 1 && names[0] !== 'pg_catalog') return unknown
      const name = names?.at(-1)
      if (!name || operator['rexpr'] === undefined) return unknown
      if (operator['lexpr'] === undefined) return bindCall('operator', name, [operator['rexpr']])
      return bindCall('operator', name, [operator['lexpr'], operator['rexpr']])
    }
    const call = fields(wrapper['FuncCall'])
    if (call) {
      const names = strings(call['funcname'])
      if (names?.length === 2 && Array.isArray(call['args'] ?? [])) {
        const captured = bindRangeCall(
          names,
          (call['args'] ?? []) as unknown[],
          call['func_variadic'] === true,
        )
        if (captured) return captured
      }
      if (names && names.length > 1 && names[0] !== 'pg_catalog') return unknown
      const name = names?.at(-1)
      const args = call['args'] ?? []
      if (name && Array.isArray(args))
        return bindCall('function', name, args, call['func_variadic'] === true)
    }
    const nullTest = fields(wrapper['NullTest'])
    if (nullTest) {
      if (nullTest['nulltesttype'] !== 'IS_NULL' && nullTest['nulltesttype'] !== 'IS_NOT_NULL')
        return unknown
      const names = strings(fields(fields(nullTest['arg'])?.['ColumnRef'])?.['fields'])
      const column = names?.length === 1 ? columns.find((item) => item.name === names[0]) : null
      if (
        column?.isRowType === false &&
        !catalogBaseScalarType(column.typeName, column.typeOid, domains, rangeTypes) &&
        !catalogArrayType(column.typeName, column.typeOid, domains, enums, rangeTypes)
      ) {
        inputs.add(column.name)
        return {
          type: 'pg_catalog.bool',
          value: {
            kind: 'input-null-test',
            type: 'pg_catalog.bool',
            name: column.name,
            negated: nullTest['nulltesttype'] === 'IS_NOT_NULL',
          },
        }
      }
      const operand = bind(nullTest['arg'])
      const value = operand.value ?? materialize(operand, boundType(operand) ?? 'pg_catalog.text')
      if (!value) return unknown
      return {
        type: 'pg_catalog.bool',
        value: {
          kind: 'null-test',
          type: 'pg_catalog.bool',
          negated: nullTest['nulltesttype'] === 'IS_NOT_NULL',
          operand: value,
        },
      }
    }
    return unknown
  }
  const bindRangeCall = (
    names: readonly string[],
    nodes: readonly unknown[],
    explicitVariadic: boolean,
  ): Bound | null => {
    const candidates = new Map<string, RangeCallInfo>()
    for (const profile of rangeTypes)
      for (const callable of profile.callables ?? [])
        if (callable.schema === names[0] && callable.name === names[1])
          candidates.set(JSON.stringify([callable.schema, callable.name, callable.args]), callable)
    const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'
    const sqlName = names.map(quote).join('.')
    const castType = catalogBaseScalarType(sqlName, undefined, domains, rangeTypes)
    if (!candidates.size && !isRangeType(castType) && !isMultirangeType(castType)) return null
    if (!rangeTypes.some((p) => p.callables !== undefined)) return unknown
    const actualNodes = nodes.map((node) => fields(fields(node)?.['NamedArgExpr'])?.['arg'] ?? node)
    const args = actualNodes.map((node) => bind(node))
    if (args.some((arg) => !arg.value && !arg.literal)) return unknown
    const rawType = (type: string): string => {
      const domain = domainElementDefinition(type)
      if (domain) return [domain.schema, domain.name].map(quote).join('.')
      if (type.startsWith('array:')) return 'array:' + rawType(type.slice(6))
      const range = rangeTypeProfile(type),
        multi = multirangeTypeProfile(type)
      if (range) return range.identity
      if (multi) return multi.multirange
      if (type.startsWith('enum:'))
        return (JSON.parse(type.slice(5)) as string[]).map(quote).join('.')
      return type
    }
    const castBase = castType ? rawType(castType) : null
    const selection = resolveRangeCall(
      [...candidates.values()],
      args.map((arg, i) => {
        const type = boundType(arg),
          nominal = nominalScalarType(arg)
        const named = fields(fields(nodes[i])?.['NamedArgExpr'])?.['name']
        return {
          type: nominal ? rawType(nominal) : type ? rawType(type) : null,
          base: type ? rawType(type) : null,
          ...(typeof named === 'string' ? { name: named } : {}),
        }
      }),
      explicitVariadic,
      castBase && (isRangeType(castType) || isMultirangeType(castType))
        ? { type: sqlName, base: castBase }
        : null,
      rangeTypes.find((p) => p.callResolution)?.callResolution,
    )
    if (selection.kind === 'cast')
      return bind({
        TypeCast: {
          arg: actualNodes[0],
          typeName: { names: names.map((sval) => ({ String: { sval } })) },
        },
      })
    if (selection.kind !== 'call') return unknown
    const callable = selection.callable,
      profile = rangeTypes.find(
        (p) => p.identity === callable.result || p.multirange === callable.result,
      )
    const type = catalogBaseScalarType(callable.result, undefined, domains, rangeTypes)
    const unavailable: Bound = unknown
    const implementation = profile ? rangeConstructorImplementation(profile, callable) : null
    if (!implementation || !type || (!isRangeType(type) && !isMultirangeType(type)))
      return unavailable
    if (
      implementation === 'multirange_constructor2' &&
      !selection.expanded &&
      selection.order[0]! >= 0
    ) {
      const array = args[selection.order[0]!]!.value,
        profile = multirangeTypeProfile(type)
      if (
        array?.kind === 'array-constructor' &&
        !array.multidimensional &&
        array.elementType === profile?.rangeType
      )
        return {
          type,
          value: {
            kind: 'captured-range-call',
            type,
            callable,
            operands: array.operands,
            expanded: true,
          },
        }
    }
    const operands = selection.order.map((index, position) => {
      const target = selection.targets[position]!
      const domain = domains.find(
        (d) =>
          rangeCallTypeKey([d.schema, d.name].map(quote).join('.')) === rangeCallTypeKey(target),
      )
      const enumDefinition = catalogEnumDefinition(target, enums, domain?.oid, domains)
      const carrier =
        (enumDefinition ? enumType(enumDefinition) : null) ??
        catalogArrayType(target, domain?.oid, domains, enums, rangeTypes) ??
        catalogBaseScalarType(target, domain?.oid, domains, rangeTypes)
      const scalar =
        domain && carrier
          ? domainElementType(domain, carrier as Exclude<ScalarType, `domain:${string}`>)
          : carrier
      if (!scalar) return null
      if (index >= 0)
        return coerceBound(
          args[index]!,
          scalar,
          actualNodes[index],
          enumDefinition ?? args[index]!.enum,
        )
      const unavailableDefault: EvalExpression = {
        kind: 'uncertain',
        type: arrayElementBaseType(scalar),
        preparation: 'constant',
      }
      const expression = callable.defaultExprs?.[position]
      const identity = JSON.stringify([
        'function-default',
        callable.schema,
        callable.name,
        callable.args,
        position,
      ])
      if (typeof expression !== 'string' || !expression || domainStack.has(identity))
        return unavailableDefault
      try {
        const parsed = parseSync(`SELECT (${expression})`)
        const select = fields(fields(parsed.stmts?.[0]?.stmt)?.['SelectStmt'])
        const targets = select?.['targetList']
        const node =
          Array.isArray(targets) && targets.length === 1
            ? fields(fields(targets[0])?.['ResTarget'])?.['val']
            : undefined
        if (parsed.stmts?.length !== 1 || !node || containsColumn(node)) return unavailableDefault
        const converted = bindCatalogCheck(
          [],
          {
            NullTest: {
              nulltesttype: 'IS_NOT_NULL',
              arg: {
                TypeCast: { arg: node, typeName: elementTypeName(scalar as ArrayElementType) },
              },
            },
          },
          [],
          enums,
          domains,
          [],
          'stored',
          new Set([...domainStack, identity]),
          undefined,
          undefined,
          undefined,
          rangeTypes,
        )
        return converted.inputs.length === 0 &&
          converted.expression.kind === 'eval-scalar' &&
          converted.expression.expression.kind === 'null-test'
          ? converted.expression.expression.operand
          : unavailableDefault
      } catch {
        return unavailableDefault
      }
    })
    if (!operands.every((operand): operand is EvalExpression => operand !== null))
      return unavailable
    return {
      type,
      value: {
        kind: 'captured-range-call',
        type,
        callable,
        operands,
        expanded: selection.expanded,
      },
    }
  }
  const bindCall = (
    kind: 'operator' | 'function',
    name: string,
    nodes: readonly unknown[],
    explicitVariadic = false,
  ): Bound => {
    let args = nodes.map((node) => bind(node))
    const enumArgument = args.find((arg) => arg.enum)
    if (enumArgument?.type)
      args = args.map((arg, index) =>
        arg.value || arg.literal ? arg : bind(nodes[index], enumArgument.type!),
      )
    if (args.some((arg) => !arg.value && !arg.literal)) return unknown
    args = args.map((arg) =>
      arg.type?.startsWith('array:enum:') ? { ...arg, enum: resultEnum(arg.type, [arg]) } : arg,
    )
    const aliasType = catalogScalarType(name)
    if (
      kind === 'function' &&
      nodes.length === 1 &&
      (aliasType === 'pg_catalog."numeric"' ||
        aliasType === 'pg_catalog.refcursor' ||
        aliasType === 'pg_catalog."json"' ||
        aliasType === 'pg_catalog.jsonb' ||
        aliasType === 'pg_catalog.jsonpath' ||
        isRangeType(aliasType) ||
        (isMultirangeType(aliasType) &&
          !explicitVariadic &&
          (args[0]?.literal !== undefined ||
            [
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
              'pg_catalog.name',
            ].includes(args[0]?.type ?? ''))) ||
        isSnapshotType(aliasType) ||
        ((args[0]?.type === 'pg_catalog."numeric"' ||
          args[0]?.type === 'pg_catalog.refcursor' ||
          args[0]?.type === 'pg_catalog."json"' ||
          args[0]?.type === 'pg_catalog.jsonb' ||
          args[0]?.type === 'pg_catalog.jsonpath' ||
          isSnapshotType(args[0]?.type) ||
          isRangeType(args[0]?.type) ||
          isMultirangeType(args[0]?.type)) &&
          [
            'pg_catalog.text',
            'pg_catalog."varchar"',
            'pg_catalog.bpchar',
            'pg_catalog.name',
          ].includes(aliasType ?? '')))
    )
      return bind({
        TypeCast: {
          arg: nodes[0],
          typeName: {
            names: [
              { String: { sval: 'pg_catalog' } },
              { String: { sval: aliasType!.slice('pg_catalog.'.length).replaceAll('"', '') } },
            ],
          },
        },
      })
    if (kind === 'function' && isOidAliasType(aliasType) && nodes.length === 1)
      return bind({
        TypeCast: {
          arg: nodes[0],
          typeName: {
            names: [
              { String: { sval: 'pg_catalog' } },
              { String: { sval: aliasType.slice('pg_catalog.'.length) } },
            ],
          },
        },
      })
    if (
      kind === 'function' &&
      (name === 'macaddr' ||
        name === 'macaddr8' ||
        name === 'uuid' ||
        name === 'point' ||
        name === 'line' ||
        name === 'lseg' ||
        name === 'money' ||
        name === 'xid' ||
        name === 'cid' ||
        name === 'pg_lsn' ||
        name === 'tid' ||
        name === 'xid8' ||
        name === 'pg_snapshot' ||
        name === 'txid_snapshot' ||
        name === 'oid' ||
        name === 'path' ||
        name === 'circle' ||
        name === 'box') &&
      args.length === 1 &&
      args[0]!.literal &&
      (name !== 'pg_lsn' || args[0]!.literal.kind === 'string' || args[0]!.literal.kind === 'null')
    ) {
      const type = ('pg_catalog.' + name) as
        | 'pg_catalog.macaddr'
        | 'pg_catalog.macaddr8'
        | 'pg_catalog.uuid'
        | 'pg_catalog.point'
        | 'pg_catalog.line'
        | 'pg_catalog.lseg'
        | 'pg_catalog.money'
        | 'pg_catalog.xid'
        | 'pg_catalog.cid'
        | 'pg_catalog.pg_lsn'
        | 'pg_catalog.tid'
        | 'pg_catalog.xid8'
        | 'pg_catalog.pg_snapshot'
        | 'pg_catalog.txid_snapshot'
        | 'pg_catalog.oid'
        | 'pg_catalog.polygon'
        | 'pg_catalog.path'
        | 'pg_catalog.circle'
        | 'pg_catalog.box'
      const value = materialize(args[0]!, type)
      return value ? { type, value } : unknown
    }
    if (
      kind === 'function' &&
      name === 'text' &&
      args.length === 1 &&
      (isMacType(args[0]!.type) ||
        args[0]!.type === 'pg_catalog.uuid' ||
        args[0]!.type === 'pg_catalog."bit"' ||
        args[0]!.type === 'pg_catalog.varbit') &&
      args[0]!.value
    )
      return {
        type: 'pg_catalog.text',
        collation: defaultCollation,
        value: {
          kind:
            args[0]!.type === 'pg_catalog.uuid'
              ? 'uuid-to-text'
              : isMacType(args[0]!.type)
                ? 'mac-to-text'
                : 'bit-to-text',
          type: 'pg_catalog.text',
          operand: args[0]!.value,
        },
      }
    const resolved = candidate(
      kind,
      name,
      args,
      bind,
      explicitVariadic,
      (arg, target, definition) => coerceBound(arg, target, nodes[args.indexOf(arg)], definition),
    )
    if (!resolved) {
      if (
        kind === 'function' &&
        [
          'inet',
          'cidr',
          'macaddr',
          'macaddr8',
          'uuid',
          'point',
          'line',
          'lseg',
          'money',
          'xid',
          'cid',
          'pg_lsn',
          'tid',
          'xid8',
          'pg_snapshot',
          'txid_snapshot',
          'oid',
          'polygon',
          'path',
          'circle',
          'box',
          'bit',
          'varbit',
          'bytea',
        ].includes(name) &&
        args.length === 1
      ) {
        const type = (name === 'bit' ? 'pg_catalog."bit"' : 'pg_catalog.' + name) as
          | 'pg_catalog.inet'
          | 'pg_catalog.cidr'
          | 'pg_catalog.macaddr'
          | 'pg_catalog.macaddr8'
          | 'pg_catalog.uuid'
          | 'pg_catalog.point'
          | 'pg_catalog.line'
          | 'pg_catalog.lseg'
          | 'pg_catalog.money'
          | 'pg_catalog.xid'
          | 'pg_catalog.cid'
          | 'pg_catalog.pg_lsn'
          | 'pg_catalog.tid'
          | 'pg_catalog.xid8'
          | 'pg_catalog.pg_snapshot'
          | 'pg_catalog.txid_snapshot'
          | 'pg_catalog.oid'
          | 'pg_catalog.polygon'
          | 'pg_catalog.path'
          | 'pg_catalog.circle'
          | 'pg_catalog.box'
          | 'pg_catalog.bytea'
          | 'pg_catalog."bit"'
          | 'pg_catalog.varbit'
        const operand = args[0]!
        if (
          operand.type === 'pg_catalog.text' ||
          operand.type === 'pg_catalog."varchar"' ||
          ((type === 'pg_catalog.bytea' || isSnapshotType(type)) &&
            operand.type === 'pg_catalog.bpchar')
        ) {
          const text =
            operand.type === 'pg_catalog.bpchar'
              ? operand.value
              : materialize(operand, 'pg_catalog.text')
          if (isSnapshotType(type))
            return text
              ? { type, value: { kind: 'text-to-snapshot', type, operand: text } }
              : unknown
          return text
            ? type === 'pg_catalog.bytea'
              ? { type, value: { kind: 'text-to-bytea', type, operand: text } }
              : type === 'pg_catalog."bit"' || type === 'pg_catalog.varbit'
                ? { type, value: { kind: 'text-to-bit', type, operand: text } }
                : type === 'pg_catalog.money'
                  ? { type, value: { kind: 'text-to-money', type, operand: text } }
                  : type === 'pg_catalog.xid'
                    ? { type, value: { kind: 'text-to-xid', type, operand: text } }
                    : type === 'pg_catalog.cid'
                      ? { type, value: { kind: 'text-to-cid', type, operand: text } }
                      : type === 'pg_catalog.pg_lsn'
                        ? { type, value: { kind: 'text-to-pg_lsn', type, operand: text } }
                        : type === 'pg_catalog.tid'
                          ? { type, value: { kind: 'text-to-tid', type, operand: text } }
                          : type === 'pg_catalog.xid8'
                            ? { type, value: { kind: 'text-to-xid8', type, operand: text } }
                            : type === 'pg_catalog.oid'
                              ? { type, value: { kind: 'text-to-oid', type, operand: text } }
                              : type === 'pg_catalog.polygon'
                                ? { type, value: { kind: 'text-to-polygon', type, operand: text } }
                                : type === 'pg_catalog.path'
                                  ? { type, value: { kind: 'text-to-path', type, operand: text } }
                                  : type === 'pg_catalog.circle'
                                    ? {
                                        type,
                                        value: { kind: 'text-to-circle', type, operand: text },
                                      }
                                    : type === 'pg_catalog.box'
                                      ? {
                                          type,
                                          value: { kind: 'text-to-box', type, operand: text },
                                        }
                                      : type === 'pg_catalog.lseg'
                                        ? {
                                            type,
                                            value: { kind: 'text-to-lseg', type, operand: text },
                                          }
                                        : type === 'pg_catalog.line'
                                          ? {
                                              type,
                                              value: { kind: 'text-to-line', type, operand: text },
                                            }
                                          : type === 'pg_catalog.point'
                                            ? {
                                                type,
                                                value: {
                                                  kind: 'text-to-point',
                                                  type,
                                                  operand: text,
                                                },
                                              }
                                            : type === 'pg_catalog.uuid'
                                              ? {
                                                  type,
                                                  value: {
                                                    kind: 'text-to-uuid',
                                                    type,
                                                    operand: text,
                                                  },
                                                }
                                              : type === 'pg_catalog.macaddr' ||
                                                  type === 'pg_catalog.macaddr8'
                                                ? {
                                                    type,
                                                    value: {
                                                      kind: 'text-to-mac',
                                                      type,
                                                      operand: text,
                                                    },
                                                  }
                                                : {
                                                    type,
                                                    value: {
                                                      kind: 'text-to-network',
                                                      type,
                                                      operand: text,
                                                    },
                                                  }
            : unknown
        }
        const value = materialize(operand, type)
        return value ? { type, value } : unknown
      }
      return unknown
    }
    const type =
      resolved.resultType ??
      (resolved.item.result === 'pg_catalog.anyenum'
        ? enumType(resolved.enum!)
        : (catalogScalarType(resolved.item.result) ?? (resolved.item.result as ScalarType)))
    const collation = resolved.collation
    const outputEnum =
      resolved.item.schema === 'pg_catalog' && resolved.item.name === 'array_to_string'
        ? arrayOutputEnum(boundType(args[0]!) ?? '')
        : (resolved.enum ??
          (type.startsWith('enum:') ? enums.find((item) => enumType(item) === type) : undefined))
    const inputEnums =
      resolved.item.kind === 'function' &&
      resolved.item.schema === 'pg_catalog' &&
      [
        'to_json',
        'to_jsonb',
        'array_to_json',
        'json_build_array',
        'jsonb_build_array',
        'json_build_object',
        'jsonb_build_object',
      ].includes(resolved.item.name)
        ? [
            ...new Map(
              args.flatMap((arg) => {
                const definition = arrayOutputEnum(boundType(arg) ?? '')
                return definition ? [[enumType(definition), definition] as const] : []
              }),
            ).values(),
          ]
        : []
    return {
      type,
      ...(resolved.resultNominalDomain ? { nominalDomain: resolved.resultNominalDomain } : {}),
      ...(type.startsWith('enum:') || type.startsWith('array:enum:') ? { enum: outputEnum } : {}),
      collation: type.startsWith('array:')
        ? (collation ?? arrayElementCollation(type.slice(6) as ArrayElementType))
        : [
              'pg_catalog.name',
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
            ].includes(type)
          ? (collation ?? defaultCollation)
          : undefined,
      value: {
        kind: 'call',
        call: {
          kind,
          signature: resolved.signature,
          type,
          ...(explicitVariadic &&
          resolved.item.kind === 'function' &&
          resolved.item.variadic !== null
            ? { variadic: true as const }
            : {}),
          ...(outputEnum ? { enum: outputEnum } : {}),
          ...(inputEnums.length ? { inputEnums } : {}),
          collation: collation?.kind,
          ...arrayDefaultCollation(resolved.signature, collation),
        },
        operands: resolved.operands,
      },
    }
  }
  const runtimeOpaque = (node: unknown): boolean => {
    const wrapper = fields(node)
    const subject = fields(wrapper?.['NullTest'])?.['arg'] ?? node
    const call = fields(fields(subject)?.['FuncCall'])
    const names = strings(call?.['funcname'])
    if (!call || !names || names.length > 2 || (names.length === 2 && names[0] !== 'pg_catalog'))
      return false
    const args = call['args'] ?? []
    if (!Array.isArray(args)) return false
    const atomic = (arg: unknown): boolean => {
      const item = fields(arg)
      if (fields(item?.['A_Const']) || fields(item?.['ColumnRef'])) return true
      const cast = fields(item?.['TypeCast']),
        type = fields(cast?.['typeName'])
      const typeNames = strings(type?.['names'])
      return (
        !!cast &&
        !!fields(fields(cast['arg'])?.['A_Const']) &&
        (typeNames?.join('.') === 'pg_catalog.text' || typeNames?.join('.') === 'text') &&
        (!Array.isArray(type?.['typmods']) || type['typmods'].length === 0) &&
        (!Array.isArray(type?.['arrayBounds']) || type['arrayBounds'].length === 0)
      )
    }
    if (!args.every(atomic)) return false
    const candidates = callables.filter(
      ({ item }) =>
        item.kind === 'function' &&
        item.schema === 'pg_catalog' &&
        item.name === names.at(-1) &&
        (item.args.length === args.length ||
          (item.numArgDefaults > 0 &&
            args.length >= item.args.length - item.numArgDefaults &&
            args.length <= item.args.length) ||
          (item.variadic !== null && args.length >= item.args.length - 1)),
    )
    return candidates.length > 0 && candidates.every(({ item }) => item.volatility !== 'i')
  }
  const lower = (node: unknown): EvalBoolExpression => {
    const wrapper = fields(node)
    if (!wrapper) return { kind: 'uncertain' }
    if (fields(wrapper['A_Const'])?.['isnull'] === true)
      return {
        kind: 'certain',
        expression: { kind: 'boolean', type: 'pg_catalog.bool', value: null },
      }
    const booleanTest = fields(wrapper['BooleanTest'])
    if (booleanTest) {
      const forms = {
        IS_TRUE: ['true', false],
        IS_NOT_TRUE: ['true', true],
        IS_FALSE: ['false', false],
        IS_NOT_FALSE: ['false', true],
        IS_UNKNOWN: ['unknown', false],
        IS_NOT_UNKNOWN: ['unknown', true],
      } as const
      const form = forms[booleanTest['booltesttype'] as keyof typeof forms]
      if (!form || booleanTest['arg'] === undefined) return { kind: 'uncertain' }
      return {
        kind: 'eval-test',
        test: form[0],
        negated: form[1],
        operand: lower(booleanTest['arg']),
      }
    }
    const caseExpression = fields(wrapper['CaseExpr'])
    if (caseExpression) {
      if (caseExpression['arg'] !== undefined) {
        const value = bind(node, 'pg_catalog.bool')
        return value.type === 'pg_catalog.bool' && value.value
          ? { kind: 'eval-scalar', expression: value.value }
          : { kind: 'uncertain' }
      }
      const args = caseExpression['args']
      if (!Array.isArray(args) || args.length === 0) return { kind: 'uncertain' }
      const branches = args.map((item) => fields(fields(item)?.['CaseWhen']))
      if (branches.some((branch) => !branch || !branch['expr'] || !branch['result']))
        return { kind: 'uncertain' }
      return {
        kind: 'eval-case',
        branches: branches.map((branch) => ({
          when: lower(branch!['expr']),
          then: lower(branch!['result']),
        })),
        otherwise: caseExpression['defresult']
          ? lower(caseExpression['defresult'])
          : {
              kind: 'certain',
              expression: { kind: 'boolean', type: 'pg_catalog.bool', value: null },
            },
      }
    }
    const bool = fields(wrapper['BoolExpr'])
    if (bool) {
      const args = bool['args']
      if (!Array.isArray(args) || !args.length) return { kind: 'uncertain' }
      if (bool['boolop'] === 'NOT_EXPR')
        return args.length === 1
          ? { kind: 'eval-boolean-logic', operation: 'not', operands: [lower(args[0])] }
          : { kind: 'uncertain' }
      const operation =
        bool['boolop'] === 'AND_EXPR' ? 'and' : bool['boolop'] === 'OR_EXPR' ? 'or' : null
      if (!operation) return { kind: 'uncertain' }
      return args.slice(1).reduce<EvalBoolExpression>(
        (left, right) => ({
          kind: 'eval-boolean-logic',
          operation,
          operands: [left, lower(right)],
        }),
        lower(args[0]),
      )
    }
    for (const form of specialForms) {
      const result = form(node)
      if (result) {
        for (const name of result.inputs) inputs.add(name)
        return result.expression
      }
    }
    const value = bind(node)
    return value.type === 'pg_catalog.bool' && value.value
      ? { kind: 'eval-scalar', expression: value.value }
      : { kind: 'uncertain', ...(runtimeOpaque(node) ? { preparation: 'runtime' as const } : {}) }
  }
  const hasMoneyArrayElement = (type: string): boolean => {
    let base = arrayElementBaseType(type)
    while (base.startsWith('array:')) base = arrayElementBaseType(base.slice(6))
    return base === 'pg_catalog.money'
  }
  const annotate = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      const mapped = value.map(annotate)
      return mapped.every((item, index) => item === value[index]) ? value : mapped
    }
    if (!value || typeof value !== 'object') return value
    const record = value as Record<string, unknown>
    const entries = Object.entries(record).map(([key, item]) => [key, annotate(item)] as const)
    const isJsonpath =
      (record['kind'] === 'jsonpath' && record['type'] === 'pg_catalog.jsonpath') ||
      record['kind'] === 'array-text-literal'
    if (!isJsonpath && entries.every(([key, item]) => item === record[key])) return value
    return {
      ...Object.fromEntries(entries),
      ...(isJsonpath ? { origin: literalOrigin } : {}),
      ...(record['kind'] === 'array-text-literal' &&
      typeof record['elementType'] === 'string' &&
      hasMoneyArrayElement(record['elementType'])
        ? { moneyLiterals: [...moneyUnits].map(([text, units]) => ({ text, units })) }
        : {}),
    }
  }
  const rangeConversions = new Map<string, EvalExpression | null>()
  const rangeConversion = (type: string, stored = false): EvalExpression | null => {
    const key = JSON.stringify([type, stored])
    if (rangeConversions.has(key)) return rangeConversions.get(key)!
    rangeConversions.set(key, null)
    const profile = rangeTypeProfile(type) ?? multirangeTypeProfile(type)
    if (!profile?.captured) return null
    const names =
      stored && profile.subtypeEnum
        ? [profile.subtypeEnum.schema, profile.subtypeEnum.name]
        : catalogTypeNames(stored ? profile.elementType : profile.subtype)
    if (!names) return null
    const converted = bindCatalogCheck(
      [
        {
          name: '__pgsid_range_text_bound',
          typeName: 'pg_catalog.text',
          collationIsC: true,
          isRowType: false,
        },
      ],
      {
        NullTest: {
          nulltesttype: 'IS_NOT_NULL',
          arg: {
            TypeCast: {
              arg: { ColumnRef: { fields: [{ String: { sval: '__pgsid_range_text_bound' } }] } },
              typeName: { names: names.map((sval) => ({ String: { sval } })) },
            },
          },
        },
      },
      [],
      enums,
      domains,
      moneyLiterals,
      literalOrigin,
      domainStack,
      true,
      undefined,
      undefined,
      rangeTypes,
    ).expression
    const operand =
      converted.kind === 'eval-scalar' && converted.expression.kind === 'null-test'
        ? converted.expression.operand
        : null
    const result =
      stored && operand?.kind === 'text-to-money' && moneyUnits.size
        ? { ...operand, moneyLiterals: [...moneyUnits].map(([text, units]) => ({ text, units })) }
        : operand
    rangeConversions.set(key, result)
    return result
  }
  const attachRangeInput = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      const items = value.map(attachRangeInput)
      return items.every((item, index) => item === value[index]) ? value : items
    }
    const record = fields(value)
    if (!record) return value
    const entries = Object.entries(record).map(
      ([key, item]) => [key, attachRangeInput(item)] as const,
    )
    const result = entries.every(([key, item]) => item === record[key])
      ? record
      : Object.fromEntries(entries)
    if (
      ['array-text-literal', 'text-to-array', 'array-io-coerce'].includes(String(result['kind'])) &&
      typeof result['elementType'] === 'string'
    ) {
      const element = arrayElementBaseType(result['elementType'])
      const profile = rangeTypeProfile(element) ?? multirangeTypeProfile(element)
      if (profile?.captured) {
        const conversion = rangeConversion(element),
          stored = rangeConversion(element, true)
        const input = (converted: EvalExpression, saved: boolean): EvalExpression => {
          const shared = {
            operand: {
              kind: 'input' as const,
              name: '__pgsid_array_text_element',
              type: 'pg_catalog.text' as const,
            },
            conversion: converted,
            ...(saved ? { origin: 'stored' as const } : {}),
          }
          return isRangeType(element)
            ? { kind: 'text-to-range', type: element, ...shared }
            : { kind: 'text-to-multirange', type: element as MultirangeType, ...shared }
        }
        return {
          ...result,
          ...(conversion ? { inputConversion: input(conversion, false) } : {}),
          ...(stored ? { storedInputConversion: input(stored, true) } : {}),
        }
      }
    }
    const literal = result['kind'] === 'certain' ? fields(result['expression']) : null
    const type =
      literal?.['kind'] === 'range' || literal?.['kind'] === 'multirange'
        ? literal['type']
        : result['kind'] === 'text-to-range' || result['kind'] === 'text-to-multirange'
          ? result['type']
          : null
    if (
      typeof type !== 'string' ||
      !(rangeTypeProfile(type) ?? multirangeTypeProfile(type))?.captured
    )
      return result
    if (literal && typeof literal['value'] === 'string') {
      const conversion = rangeConversion(type, literalOrigin === 'stored')
      return {
        kind: literal['kind'] === 'multirange' ? 'text-to-multirange' : 'text-to-range',
        type,
        literal: true,
        origin: literalOrigin,
        operand: {
          kind: 'certain',
          expression: { kind: 'text', type: 'pg_catalog.text', value: literal['value'] },
        },
        ...(conversion ? { conversion } : {}),
      }
    }
    if (!literal && !result['conversion']) {
      const conversion = rangeConversion(type)
      return conversion ? { ...result, conversion } : result
    }
    return result
  }
  const lowered = lower(root)
  const expression = rangeTypes.length ? (attachRangeInput(lowered) as EvalBoolExpression) : lowered
  return {
    expression:
      literalOrigin === 'stored' ? (annotate(expression) as EvalBoolExpression) : expression,
    inputs: [...inputs].sort(),
  }
}
