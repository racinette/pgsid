import { parseSync } from 'libpg-query'
import type { ColumnInfo, DomainInfo, EnumInfo } from '../catalog/types.js'
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
  supportsTextCallableCollation,
  type BoundCollation,
} from './collation.js'
import {
  enumType,
  arrayType,
  type ArrayType,
  type ArrayElementType,
  isOidType,
  isOidAliasType,
  isSnapshotType,
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

export const catalogScalarType = (name: string): ScalarType | null => {
  if (name.endsWith('[]')) {
    const element = catalogScalarType(name.replace(/(?:\[\])+$/u, ''))
    return element && !element.startsWith('array:')
      ? arrayType(element as Exclude<ScalarType, ArrayType>)
      : null
  }
  if (
    name.startsWith('pg_catalog._') ||
    (name.startsWith('_') && builtinTypeResolution('pg_catalog.' + name)?.category === 'A')
  ) {
    const internal = name.replace(/^pg_catalog\./u, '')
    if (builtinTypeResolution('pg_catalog.' + internal)?.category !== 'A') return null
    const element = catalogScalarType(internal.slice(1))
    return element && !element.startsWith('array:')
      ? arrayType(element as Exclude<ScalarType, ArrayType>)
      : null
  }
  if (name.startsWith('pg_catalog.'))
    return catalogScalarType(name.slice('pg_catalog.'.length).replaceAll('"', ''))
  const names: Record<string, ScalarType> = {
    boolean: 'pg_catalog.bool',
    bool: 'pg_catalog.bool',
    smallint: 'pg_catalog.int2',
    int2: 'pg_catalog.int2',
    integer: 'pg_catalog.int4',
    int4: 'pg_catalog.int4',
    bigint: 'pg_catalog.int8',
    int8: 'pg_catalog.int8',
    real: 'pg_catalog.float4',
    float4: 'pg_catalog.float4',
    'double precision': 'pg_catalog.float8',
    float8: 'pg_catalog.float8',
    numeric: 'pg_catalog."numeric"',
    decimal: 'pg_catalog."numeric"',
    inet: 'pg_catalog.inet',
    cidr: 'pg_catalog.cidr',
    point: 'pg_catalog.point',
    line: 'pg_catalog.line',
    lseg: 'pg_catalog.lseg',
    money: 'pg_catalog.money',
    xid: 'pg_catalog.xid',
    cid: 'pg_catalog.cid',
    pg_lsn: 'pg_catalog.pg_lsn',
    tid: 'pg_catalog.tid',
    refcursor: 'pg_catalog.refcursor',
    name: 'pg_catalog.name',
    char: 'pg_catalog."char"',
    '"char"': 'pg_catalog."char"',
    xid8: 'pg_catalog.xid8',
    pg_snapshot: 'pg_catalog.pg_snapshot',
    txid_snapshot: 'pg_catalog.txid_snapshot',
    regclass: 'pg_catalog.regclass',
    regcollation: 'pg_catalog.regcollation',
    regconfig: 'pg_catalog.regconfig',
    regdictionary: 'pg_catalog.regdictionary',
    regnamespace: 'pg_catalog.regnamespace',
    regoper: 'pg_catalog.regoper',
    regoperator: 'pg_catalog.regoperator',
    regproc: 'pg_catalog.regproc',
    regprocedure: 'pg_catalog.regprocedure',
    regrole: 'pg_catalog.regrole',
    regtype: 'pg_catalog.regtype',
    oid: 'pg_catalog.oid',
    polygon: 'pg_catalog.polygon',
    path: 'pg_catalog.path',
    circle: 'pg_catalog.circle',
    box: 'pg_catalog.box',
    uuid: 'pg_catalog.uuid',
    macaddr: 'pg_catalog.macaddr',
    macaddr8: 'pg_catalog.macaddr8',
    bytea: 'pg_catalog.bytea',
    json: 'pg_catalog."json"',
    jsonb: 'pg_catalog.jsonb',
    jsonpath: 'pg_catalog.jsonpath',
    '"json"': 'pg_catalog."json"',
    bit: 'pg_catalog."bit"',
    '"bit"': 'pg_catalog."bit"',
    varbit: 'pg_catalog.varbit',
    'bit varying': 'pg_catalog.varbit',
    time: 'pg_catalog."time"',
    'time without time zone': 'pg_catalog."time"',
    timetz: 'pg_catalog.timetz',
    'time with time zone': 'pg_catalog.timetz',
    interval: 'pg_catalog."interval"',
    date: 'pg_catalog.date',
    timestamp: 'pg_catalog."timestamp"',
    'timestamp without time zone': 'pg_catalog."timestamp"',
    timestamptz: 'pg_catalog.timestamptz',
    'timestamp with time zone': 'pg_catalog.timestamptz',
    text: 'pg_catalog.text',
    'character varying': 'pg_catalog."varchar"',
    varchar: 'pg_catalog."varchar"',
    character: 'pg_catalog.bpchar',
    bpchar: 'pg_catalog.bpchar',
  }
  if (/^(?:numeric|decimal)\(/u.test(name)) return 'pg_catalog."numeric"'
  if (/^bit\(\d+\)$/u.test(name)) return 'pg_catalog."bit"'
  if (/^(?:bit varying|varbit)\(\d+\)$/u.test(name)) return 'pg_catalog.varbit'
  if (name.startsWith('character varying(')) return 'pg_catalog."varchar"'
  if (name.startsWith('character(')) return 'pg_catalog.bpchar'
  if (/^time\(\d+\) without time zone$/u.test(name)) return 'pg_catalog."time"'
  if (/^time\(\d+\) with time zone$/u.test(name)) return 'pg_catalog.timetz'
  if (/^interval(?:\(| )/u.test(name)) return 'pg_catalog."interval"'
  if (/^timestamp\(\d+\) without time zone$/u.test(name)) return 'pg_catalog."timestamp"'
  if (/^timestamp\(\d+\) with time zone$/u.test(name)) return 'pg_catalog.timestamptz'
  return names[name] ?? null
}

export function catalogArrayType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
  enums: readonly EnumInfo[] = [],
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
  if (!name.endsWith('[]')) return null
  const definition = catalogEnumDefinition(name.replace(/(?:\[\])+$/u, ''), enums)
  return definition ? arrayType(enumType(definition)) : null
}

export function catalogDateType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): boolean {
  return catalogTemporalType(name, oid, domains) === 'pg_catalog.date'
}

function catalogBaseScalarType(
  name: string,
  oid: number | undefined,
  domains: readonly DomainInfo[],
): ScalarType | null {
  const seen = new Set<number>()
  while (oid !== undefined && !seen.has(oid)) {
    seen.add(oid)
    const domain = domains.find((domain) => domain.oid === oid)
    if (!domain) break
    name = domain.baseTypeName
    oid = domain.baseTypeOid
  }
  return catalogScalarType(name)
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
}
const boundType = (arg: Bound): ScalarType | null =>
  arg.type ?? (arg.literal?.kind === 'integer' ? 'pg_catalog.int4' : null)
const isIntegerType = (type: string | null): boolean =>
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
  if (
    !hasAnyElement &&
    !hasVariadicAny &&
    !hasOmittedDefaults &&
    ((kind === 'function' && name === 'char') ||
      args.some(
        (arg) =>
          arg.type === 'pg_catalog.float4' ||
          arg.type === 'pg_catalog.float8' ||
          isOidType(arg.type),
      ))
  )
    return comparisonCandidate(args, name, true, kind, false)
  const integer =
    hasOmittedDefaults || hasAnyElement || hasVariadicAny
      ? undefined
      : integerCandidate(kind, name, args)
  if (integer !== undefined) return integer
  const matches = callables.flatMap(({ signature, item }) => {
    const variadicAny = item.kind === 'function' && item.variadic === 'pg_catalog."any"'
    if (
      item.kind !== kind ||
      item.schema !== 'pg_catalog' ||
      item.name !== name ||
      (variadicAny ? args.length < 1 : item.args.length < args.length) ||
      (!catalogScalarType(item.result) &&
        ![
          'pg_catalog.anyenum',
          'pg_catalog.anycompatiblearray',
          'pg_catalog.anycompatible',
        ].includes(item.result))
    )
      return []
    let fullArgs = args
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
      !supportsTextCallableCollation(signature, collation?.kind)
    )
      return []
    const elementTypes = fullArgs.flatMap((arg, index) =>
      item.args[index] === 'pg_catalog.anyelement' ? [boundType(arg)] : [],
    )
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
    const enumCall = item.args.includes('pg_catalog.anyenum')
    const compatible = item.args.some(
      (type) => type === 'pg_catalog.anycompatiblearray' || type === 'pg_catalog.anycompatible',
    )
    const compatibleArgs = fullArgs.flatMap((arg, index) => {
      const type = item.args[index]
      if (type === 'pg_catalog.anycompatible') return [arg]
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
    const compatibleType = compatible ? commonType(compatibleArgs) : null
    if (compatible && (!compatibleType || compatibleType.startsWith('array:'))) return []
    const compatibleArray = compatibleType ? arrayType(compatibleType as ArrayElementType) : null
    const definition = fullArgs.find(
      (arg, index) => (item.args[index] === 'pg_catalog.anyenum' || compatible) && arg.enum,
    )?.enum
    if (
      (item.result === 'pg_catalog.anyenum' && !enumCall) ||
      (enumCall &&
        (!definition ||
          !item.strict ||
          item.volatility !== 'i' ||
          fullArgs.some(
            (arg, index) =>
              item.args[index] === 'pg_catalog.anyenum' && arg.enumDomain !== undefined,
          )))
    )
      return []
    const operands = fullArgs.map((arg, index) =>
      variadicAny
        ? materialize(arg, boundType(arg) ?? 'pg_catalog.text', arg.enum)
        : item.args[index] === 'pg_catalog.anycompatiblearray'
          ? implicitOperand(arg, compatibleArray!, definition)
          : item.args[index] === 'pg_catalog.anycompatible'
            ? implicitOperand(arg, compatibleType!, definition)
            : item.args[index] === 'pg_catalog.anyarray'
              ? materialize(arg, arrayIdentity!)
              : item.args[index] === 'pg_catalog.anyelement'
                ? materialize(arg, elementType!, arg.enum)
                : isIntegerType(item.args[index]!)
                  ? materializeInteger(arg, item.args[index]! as ScalarType)
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
            operands: operands as EvalExpression[],
            collation,
            enum: definition,
            resultType:
              item.result === 'pg_catalog.anycompatiblearray'
                ? compatibleArray!
                : item.result === 'pg_catalog.anycompatible'
                  ? compatibleType!
                  : undefined,
          },
        ]
      : []
  })
  const types = args.map(boundType)
  const exact = matches.filter(({ item }) =>
    item.args.slice(0, args.length).every((type, index) => type === types[index]),
  )
  if (exact.length === 1) return exact[0]!
  if (kind === 'operator' && args.length === 2) {
    const known = types.filter((type) => type !== null)
    if (known.length === 1 && args.some((arg, index) => types[index] === null && arg.literal)) {
      const assumed = matches.filter(({ item }) => item.args.every((type) => type === known[0]))
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
  return matches.length === 1 ? matches[0]! : null
}

const commonType = (args: readonly Bound[]): ScalarType | null => {
  const types = args.map(boundType).filter((type): type is ScalarType => type !== null)
  if (!types.length) return 'pg_catalog.text'
  if (types.every((type) => type.startsWith('array:'))) {
    const element = commonType(
      types.map((type) => ({ ...unknown, type: type.slice(6) as ArrayElementType })),
    )
    return element && !element.startsWith('array:') ? arrayType(element as ArrayElementType) : null
  }
  let selected = types[0]!
  for (const type of types.slice(1)) {
    if (type === selected) continue
    const current = builtinTypeResolution(selected)
    const next = builtinTypeResolution(type)
    if (!current || !next || current.category !== next.category) return null
    if (
      !current.preferred &&
      builtinCast(selected, type)?.context === 'i' &&
      builtinCast(type, selected)?.context !== 'i'
    )
      selected = type
  }
  return types.every((type) => type === selected || builtinCast(type, selected)?.context === 'i')
    ? selected
    : null
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
): EvalExpression | null => {
  if (source === target) return operand
  const from = source.slice(6) as ArrayElementType,
    to = target.slice(6) as ArrayElementType,
    conversion = builtinCast(from, to)
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
      ) ||
      callable.args[0] !== from ||
      callable.result !== to
    )
      return null
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
  const concrete = (type: string): string | null =>
    type === 'pg_catalog.anyenum'
      ? enumIdentity
      : type === 'pg_catalog.anyarray'
        ? arrayIdentity
        : type
  const viable = callables.filter(
    ({ item }) =>
      item.kind === kind &&
      item.schema === 'pg_catalog' &&
      item.name === name &&
      (predicate ? item.result === 'pg_catalog.bool' : catalogScalarType(item.result) !== null) &&
      item.args.length === args.length &&
      item.args.every((type, index) => {
        const target = concrete(type)
        const source = types[index]!
        if (!target || (type === 'pg_catalog.anyenum' && args[index]!.enumDomain !== undefined))
          return false
        return source === null || source === target || builtinCast(source, target)?.context === 'i'
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
    implicitOperand(arg, concrete(selected.item.args[index]!)! as ScalarType, definition),
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
    ((metadata.args.length === 2 &&
      metadata.args.every((type) => type === 'pg_catalog.anyarray')) ||
      metadata.args.includes('pg_catalog.anycompatiblearray'))
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
  const collation = builtinTypeComparison(
    type.startsWith('enum:') ? 'pg_catalog.anyenum' : type,
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
const arrayConstructor = (
  node: unknown,
): { members: unknown[]; type: ScalarType | null } | null => {
  const wrapper = fields(node)
  if (!wrapper) return null
  const cast = fields(wrapper['TypeCast'])
  if (cast) {
    const typeName = fields(cast['typeName'])
    const names = strings(typeName?.['names'])
    const bounds = typeName?.['arrayBounds']
    if (
      !names ||
      (names.length > 1 && names[0] !== 'pg_catalog') ||
      !Array.isArray(bounds) ||
      bounds.length !== 1
    )
      return null
    const type = catalogScalarType(names.at(-1)!)
    const inner = arrayConstructor(cast['arg'])
    return type && inner && (!inner.type || inner.type === type) ? { ...inner, type } : null
  }
  const array = fields(wrapper['A_ArrayExpr'])
  const members = array?.['elements']
  return Array.isArray(members) && members.length > 0 ? { members, type: null } : null
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
): { expression: EvalBoolExpression; inputs: readonly string[] } {
  const moneyUnits = new Map<string, string>()
  for (const literal of moneyLiterals) {
    if (!/^-?(?:0|[1-9]\d*)$/u.test(literal.units)) continue
    const value = BigInt(literal.units)
    if (value >= -9223372036854775808n && value <= 9223372036854775807n)
      moneyUnits.set(literal.text, value.toString())
  }
  const inputs = new Set<string>()
  const elementTypeName = (type: ArrayElementType): Fields => ({
    names: type.startsWith('enum:')
      ? (JSON.parse(type.slice(5)) as string[]).map((sval) => ({ String: { sval } }))
      : [
          { String: { sval: 'pg_catalog' } },
          { String: { sval: type.slice('pg_catalog.'.length).replaceAll('"', '') } },
        ],
  })
  const bindArray = (node: unknown, target?: { type: ArrayElementType; name: Fields }): Bound => {
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
    if (
      !multidimensional &&
      (args.some((arg) => arg.type?.startsWith('array:')) ||
        (!target && commonNominalDomain(args) !== undefined))
    )
      return unknown
    const candidates = multidimensional
      ? args.map((arg) => ({
          ...arg,
          type: arg.type?.startsWith('array:') ? (arg.type.slice(6) as ArrayElementType) : null,
        }))
      : args
    if (multidimensional && !target && candidates.every((arg) => arg.type === null)) return unknown
    const inferred = target?.type ?? commonType(candidates)
    if (!inferred || inferred.startsWith('array:')) return unknown
    const element = inferred as ArrayElementType
    const type = arrayType(element)
    const definition = element.startsWith('enum:')
      ? enums.find((item) => enumType(item) === element)
      : undefined
    const operands = members.map((member, index) => {
      let arg = args[index]!
      if (multidimensional) {
        if (!arg.value && fields(fields(member)?.['A_ArrayExpr']))
          arg = bindArray(member, { type: element, name: elementTypeName(element) })
        return target
          ? bind({
              TypeCast: {
                arg: member,
                typeName: { ...target.name, arrayBounds: [{ Integer: { ival: -1 } }] },
              },
            }).value
          : implicitOperand(arg, type)
      }
      if (target) arg = bind({ TypeCast: { arg: member, typeName: target.name } })
      if (arg.literal?.kind === 'string' && element !== 'pg_catalog.text')
        arg = bind({ TypeCast: { arg: member, typeName: elementTypeName(element) } })
      return implicitOperand(arg, element, definition)
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
  const resultEnum = (type: ScalarType, args: readonly Bound[]): EnumInfo | undefined =>
    type.startsWith('array:enum:')
      ? enums.find((item) => enumType(item) === type.slice(6))
      : args.find((arg) => arg.enum)?.enum
  const bind = (node: unknown, expectedType?: ScalarType): Bound => {
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
      const definition = elementType.startsWith('enum:')
        ? enums.find((item) => enumType(item) === elementType)
        : undefined
      const type = slice ? (operand.type as ArrayType) : elementType
      return {
        type,
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
          : implicitOperand(arg, type, definition),
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
      const comparisonType = ['pg_catalog.anyenum', 'pg_catalog.anyarray'].includes(
        resolved.item.args[0]!,
      )
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
            ? implicitOperand(arg, type, definition)
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
      const values = arms.map((arm) =>
        coercedType !== undefined
          ? implicitOperand(arm, type, definition)
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
      const castType = fields(cast['typeName'])
      const names = strings(castType?.['names'])
      const bounds = castType?.['arrayBounds']
      if (Array.isArray(bounds) && bounds.length) {
        if (!names) return unknown
        const definitions = enums.filter((item) =>
          names.length === 2
            ? item.schema === names[0] && item.name === names[1]
            : names.length === 1 && item.name === names[0],
        )
        const definition = definitions.length === 1 ? definitions[0] : undefined
        const element =
          (names.length === 1 || (names.length === 2 && names[0] === 'pg_catalog')
            ? catalogScalarType(names.at(-1)!)
            : null) ?? (definition ? enumType(definition) : null)
        if (!element || element.startsWith('array:')) return unknown
        const type = arrayType(element as ArrayElementType)
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
        if (fields(fields(cast['arg'])?.['A_ArrayExpr']))
          return bindArray(cast['arg'], {
            type: element as ArrayElementType,
            name: { ...castType, arrayBounds: [] },
          })
        else {
          const operand = bind(cast['arg'])
          let value = materialize(operand, type, definition)
          if (!value && operand.value && operand.type?.startsWith('array:'))
            value = coerceArray(operand.value, operand.type as ArrayType, type, 'e', modifier)
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
        const value = materialize(operand, type, definition)
        return value ? { type, value, enum: definition } : unknown
      }
      const castDomains = domains.filter((domain) =>
        names?.length === 2
          ? domain.schema === names[0] && domain.name === names[1]
          : names?.length === 1 && domain.name === names[0],
      )
      if (castDomains.length && !(names?.length === 1 && catalogScalarType(names[0]!) !== null)) {
        if (castDomains.length !== 1) return unknown
        let domain: DomainInfo | undefined = castDomains[0]!
        const domainType =
          catalogArrayType(domain.baseTypeName, domain.baseTypeOid, domains, enums) ??
          catalogBaseScalarType(domain.baseTypeName, domain.baseTypeOid, domains)
        if (!domainType) return unknown
        if (
          domainType !== 'pg_catalog.bool' &&
          domainType !== 'pg_catalog.int2' &&
          domainType !== 'pg_catalog.int4' &&
          domainType !== 'pg_catalog.int8' &&
          domainType !== 'pg_catalog.float4' &&
          domainType !== 'pg_catalog.float8' &&
          domainType !== 'pg_catalog."numeric"' &&
          domainType !== 'pg_catalog.refcursor' &&
          domainType !== 'pg_catalog."json"' &&
          domainType !== 'pg_catalog.jsonb' &&
          domainType !== 'pg_catalog.jsonpath' &&
          domainType !== 'pg_catalog.point' &&
          domainType !== 'pg_catalog.line' &&
          domainType !== 'pg_catalog.lseg' &&
          domainType !== 'pg_catalog.money' &&
          domainType !== 'pg_catalog.xid' &&
          domainType !== 'pg_catalog.cid' &&
          domainType !== 'pg_catalog.pg_lsn' &&
          domainType !== 'pg_catalog.tid' &&
          domainType !== 'pg_catalog."char"' &&
          domainType !== 'pg_catalog.xid8' &&
          !isSnapshotType(domainType) &&
          !isOidType(domainType) &&
          domainType !== 'pg_catalog.polygon' &&
          domainType !== 'pg_catalog.path' &&
          domainType !== 'pg_catalog.circle' &&
          domainType !== 'pg_catalog.box' &&
          !domainType.startsWith('array:')
        )
          return unknown
        const seen = new Set<number>()
        while (domain) {
          if (
            seen.has(domain.oid) ||
            domain.notNull ||
            domain.checks.length ||
            domain.baseTypeMod !== -1
          )
            return unknown
          seen.add(domain.oid)
          if (
            (catalogArrayType(domain.baseTypeName, domain.baseTypeOid, domains, enums) ??
              catalogBaseScalarType(domain.baseTypeName, domain.baseTypeOid, domains)) !==
            domainType
          )
            return unknown
          domain = domains.find((item) => item.oid === domain!.baseTypeOid)
        }
        const base = bind({
          TypeCast: {
            ...cast,
            typeName: domainType.startsWith('array:')
              ? {
                  ...elementTypeName(domainType.slice(6) as ArrayElementType),
                  arrayBounds: [{ Integer: { ival: -1 } }],
                }
              : {
                  ...castType,
                  names: [
                    { String: { sval: 'pg_catalog' } },
                    {
                      String: { sval: domainType.slice('pg_catalog.'.length).replaceAll('"', '') },
                    },
                  ],
                },
          },
        })
        return {
          ...base,
          nominalDomain: JSON.stringify([castDomains[0]!.schema, castDomains[0]!.name]),
        }
      }
      if (names && names.length > 1 && names[0] !== 'pg_catalog') return unknown
      const type = names ? catalogScalarType(names.at(-1)!) : null
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
        const definition = resultEnum(source as ArrayType, [operand])
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
          source === 'pg_catalog."json"' ||
          source === 'pg_catalog.jsonb' ||
          source === 'pg_catalog.jsonpath' ||
          isSnapshotType(source) ||
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
          operand.enum?.outputFunction ?? (source ? builtinTypeIO(source)?.output : null)
        const metadata = output ? callables.find((item) => item.signature === output)?.item : null
        if (
          !value ||
          !output ||
          !metadata ||
          metadata.kind !== 'function' ||
          metadata.result !== 'pg_catalog.cstring' ||
          !metadata.strict ||
          metadata.args.length !== 1 ||
          metadata.args[0] !== (operand.enum ? 'pg_catalog.anyenum' : source) ||
          (!operand.enum && metadata.volatility !== 'i' && !isOidAliasType(source))
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
        (type === 'pg_catalog.float4' || type === 'pg_catalog.float8') &&
        (operand.type === 'pg_catalog.text' || operand.type === 'pg_catalog."varchar"') &&
        operand.value
      ) {
        const text = materialize(operand, 'pg_catalog.text')
        return text ? { type, value: { kind: 'text-to-float', type, operand: text } } : unknown
      }
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
        builtinCast('pg_catalog.text', type)?.method !== 'f' &&
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
        (catalogArrayType(column.typeName, column.typeOid, domains, enums) ??
          catalogBaseScalarType(column.typeName, column.typeOid, domains))
      if (type) {
        inputs.add(column.name)
        return {
          type,
          value: { kind: 'input', type, name: column.name },
          nominalDomain,
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
    if (
      operator &&
      ['AEXPR_IN', 'AEXPR_OP_ANY', 'AEXPR_OP_ALL'].includes(String(operator['kind']))
    ) {
      const names = strings(operator['name'])
      if (!names || (names.length > 1 && names[0] !== 'pg_catalog')) return unknown
      const name = names.at(-1)
      const operation = name === '=' ? 'or' : name === '<>' ? 'and' : null
      if (
        !operation ||
        (operator['kind'] === 'AEXPR_OP_ANY' && name !== '=') ||
        (operator['kind'] === 'AEXPR_OP_ALL' && name !== '<>')
      )
        return unknown
      const list = fields(fields(operator['rexpr'])?.['List'])?.['items']
      const array =
        operator['kind'] === 'AEXPR_IN'
          ? Array.isArray(list) && list.length > 0
            ? { members: list, type: null }
            : null
          : arrayConstructor(operator['rexpr'])
      if (!array) return unknown
      const subject = bind(operator['lexpr'])
      const members = array.members.map((member) => bind(member))
      const type =
        array.type ??
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
      let groups: EvalExpression[][]
      if (operator['kind'] === 'AEXPR_IN') {
        const withColumns = array.members.map(containsColumn)
        const constants = resolved.flatMap((member, index) =>
          !withColumns[index] ? [member!.operands[1]!] : [],
        )
        groups =
          constants.length > 1
            ? [
                constants,
                ...resolved.flatMap((member, index) =>
                  withColumns[index] ? [[member!.operands[1]!]] : [],
                ),
              ]
            : resolved.map((member) => [member!.operands[1]!])
      } else {
        groups = [resolved.map((member) => member!.operands[1]!)]
      }
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
            : resolved.item.args[0] === 'pg_catalog.anyarray'
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
      if (names && names.length > 1 && names[0] !== 'pg_catalog') return unknown
      const name = names?.at(-1)
      const args = call['args'] ?? []
      if (call['func_variadic'] === true) return unknown
      if (name && Array.isArray(args)) return bindCall('function', name, args)
    }
    const nullTest = fields(wrapper['NullTest'])
    if (nullTest) {
      if (nullTest['nulltesttype'] !== 'IS_NULL' && nullTest['nulltesttype'] !== 'IS_NOT_NULL')
        return unknown
      const names = strings(fields(fields(nullTest['arg'])?.['ColumnRef'])?.['fields'])
      const column = names?.length === 1 ? columns.find((item) => item.name === names[0]) : null
      if (
        column?.isRowType === false &&
        !catalogBaseScalarType(column.typeName, column.typeOid, domains)
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
  const bindCall = (
    kind: 'operator' | 'function',
    name: string,
    nodes: readonly unknown[],
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
      (aliasType === 'pg_catalog.refcursor' ||
        aliasType === 'pg_catalog."json"' ||
        aliasType === 'pg_catalog.jsonb' ||
        aliasType === 'pg_catalog.jsonpath' ||
        isSnapshotType(aliasType) ||
        ((args[0]?.type === 'pg_catalog.refcursor' ||
          args[0]?.type === 'pg_catalog."json"' ||
          args[0]?.type === 'pg_catalog.jsonb' ||
          args[0]?.type === 'pg_catalog.jsonpath' ||
          isSnapshotType(args[0]?.type)) &&
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
    const resolved = candidate(kind, name, args, bind)
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
    return {
      type,
      ...(type.startsWith('enum:') || type.startsWith('array:enum:')
        ? { enum: resolved.enum }
        : {}),
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
          collation: collation?.kind,
          ...arrayDefaultCollation(resolved.signature, collation),
        },
        operands: resolved.operands,
      },
    }
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
      : { kind: 'uncertain' }
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
      ...(record['kind'] === 'array-text-literal' && record['elementType'] === 'pg_catalog.money'
        ? { moneyLiterals: [...moneyUnits].map(([text, units]) => ({ text, units })) }
        : {}),
    }
  }
  const expression = lower(root)
  return {
    expression:
      literalOrigin === 'stored' ? (annotate(expression) as EvalBoolExpression) : expression,
    inputs: [...inputs].sort(),
  }
}
