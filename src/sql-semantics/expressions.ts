import type { TsqueryConstantStorage } from '../catalog/tsquery-constant-storage.js'
import type { TemporalConstantStorage } from '../catalog/temporal-constant-storage.js'
import type { ArrayConstantStorage } from '../catalog/array-constant-storage.js'
import {
  builtinCast,
  builtinTypeResolution,
  builtinRangeType,
  builtinMultirangeType,
  functionMetadata,
  operatorMetadata,
} from '../postgres/builtins/inventory.js'
import type { CallableMetadata } from '../postgres/builtins/catalog.js'
import type { TsvectorConstantStorage } from '../catalog/tsvector-constant-storage.js'
import type { EnumInfo } from '../catalog/types.js'
import { compositeProfile, type CompositeType } from './composite-profiles.js'
import { anonymousRecordProfile, type AnonymousRecordType } from './anonymous-records.js'
export type { CompositeType } from './composite-profiles.js'
import {
  isCapturedRangeType,
  isCapturedMultirangeType,
  type RangeType,
  type MultirangeType,
} from './range-profiles.js'
export type { RangeType, MultirangeType } from './range-profiles.js'
import type { CallableEmitter, SqlBindingGroup, TypedSqlExpression } from './signatures.js'
import { equalityOperation, supportsTextCallableCollation } from './collation.js'

export const catalogScalarType = (name: string): ScalarType | null => {
  if (name.startsWith('anonymous-record:'))
    return anonymousRecordProfile(name) ? (name as AnonymousRecordType) : null
  if (name.startsWith('composite:')) return compositeProfile(name) ? (name as CompositeType) : null
  if (isCapturedRangeType(name) || isCapturedMultirangeType(name)) return name
  const range = builtinRangeType(name.startsWith('pg_catalog.') ? name : 'pg_catalog.' + name)
  if (range) return range.identity as RangeType
  const multirange = builtinMultirangeType(
    name.startsWith('pg_catalog.') ? name : 'pg_catalog.' + name,
  )
  if (multirange) return multirange.multirange as MultirangeType
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
    int2vector: 'pg_catalog.int2vector',
    oidvector: 'pg_catalog.oidvector',
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
    aclitem: 'pg_catalog.aclitem',
    tsvector: 'pg_catalog.tsvector',
    tsquery: 'pg_catalog.tsquery',
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
    xml: 'pg_catalog.xml',
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

export type IntegerType = 'pg_catalog.int2' | 'pg_catalog.int4' | 'pg_catalog.int8'

export type FloatType = 'pg_catalog.float4' | 'pg_catalog.float8'
export type DecimalType = 'pg_catalog."numeric"'
export type NumericType = IntegerType | FloatType | DecimalType

export type TextType = 'pg_catalog.text' | 'pg_catalog."varchar"' | 'pg_catalog.bpchar'
export type NetworkType = 'pg_catalog.inet' | 'pg_catalog.cidr'
export type MacType = 'pg_catalog.macaddr' | 'pg_catalog.macaddr8'
export type BitType = 'pg_catalog."bit"' | 'pg_catalog.varbit'
export type RefcursorType = 'pg_catalog.refcursor'
export type PointType = 'pg_catalog.point'
export type LineType = 'pg_catalog.line'
export type LsegType = 'pg_catalog.lseg'
export type TsvectorType = 'pg_catalog.tsvector'
export type TsqueryType = 'pg_catalog.tsquery'
export type AclitemType = 'pg_catalog.aclitem'
export type MoneyType = 'pg_catalog.money'
export type XidType = 'pg_catalog.xid'
export type CidType = 'pg_catalog.cid'
export type PgLsnType = 'pg_catalog.pg_lsn'
export type TidType = 'pg_catalog.tid'
export type Xid8Type = 'pg_catalog.xid8'
export type SnapshotType = 'pg_catalog.pg_snapshot' | 'pg_catalog.txid_snapshot'
export const isMultirangeType = (type: string | null | undefined): type is MultirangeType =>
  typeof type === 'string' &&
  (builtinMultirangeType(type) !== null || isCapturedMultirangeType(type))
export const isRangeType = (type: string | null | undefined): type is RangeType =>
  typeof type === 'string' && (builtinRangeType(type) !== null || isCapturedRangeType(type))
export const isSnapshotType = (type: string | null | undefined): type is SnapshotType =>
  type === 'pg_catalog.pg_snapshot' || type === 'pg_catalog.txid_snapshot'
export const oidAliasTypes = [
  'pg_catalog.regclass',
  'pg_catalog.regcollation',
  'pg_catalog.regconfig',
  'pg_catalog.regdictionary',
  'pg_catalog.regnamespace',
  'pg_catalog.regoper',
  'pg_catalog.regoperator',
  'pg_catalog.regproc',
  'pg_catalog.regprocedure',
  'pg_catalog.regrole',
  'pg_catalog.regtype',
] as const
export type OidAliasType = (typeof oidAliasTypes)[number]
export type OidType = 'pg_catalog.oid' | OidAliasType
export const isOidAliasType = (type: string | null | undefined): type is OidAliasType =>
  oidAliasTypes.some((candidate) => candidate === type)
export const isOidType = (type: string | null | undefined): type is OidType =>
  type === 'pg_catalog.oid' || isOidAliasType(type)
export type PolygonType = 'pg_catalog.polygon'
export type PathType = 'pg_catalog.path'
export type CircleType = 'pg_catalog.circle'
export type BoxType = 'pg_catalog.box'
export type UuidType = 'pg_catalog.uuid'
export type JsonType = 'pg_catalog."json"'
export type JsonbType = 'pg_catalog.jsonb'
export type JsonpathType = 'pg_catalog.jsonpath'
export type XmlType = 'pg_catalog.xml'
export type TemporalType =
  | 'pg_catalog.date'
  | 'pg_catalog."time"'
  | 'pg_catalog."timestamp"'
  | 'pg_catalog.timestamptz'
  | 'pg_catalog.timetz'
  | 'pg_catalog."interval"'
export type EnumType = `enum:${string}`
export const BUILTIN_ARRAY_ELEMENT_TYPES = [
  'pg_catalog.int2',
  'pg_catalog.int4',
  'pg_catalog.int8',
  'pg_catalog.float4',
  'pg_catalog.float8',
  'pg_catalog."numeric"',
  'pg_catalog.bool',
  'pg_catalog.text',
  'pg_catalog."varchar"',
  'pg_catalog.bpchar',
  'pg_catalog.uuid',
] as const
export type ArrayElementType = NonArrayScalarType
export type ArrayType = `array:${ArrayElementType}`
export type CatalogVectorType = 'pg_catalog.int2vector' | 'pg_catalog.oidvector'
export type DomainElementType = `domain:${string}`
export type NonArrayScalarType =
  | CatalogVectorType
  | AnonymousRecordType
  | CompositeType
  | DomainElementType
  | RefcursorType
  | 'pg_catalog.name'
  | 'pg_catalog."char"'
  | NumericType
  | PointType
  | LineType
  | LsegType
  | MoneyType
  | AclitemType
  | TsvectorType
  | TsqueryType
  | XidType
  | CidType
  | PgLsnType
  | TidType
  | Xid8Type
  | SnapshotType
  | RangeType
  | MultirangeType
  | OidType
  | PolygonType
  | PathType
  | CircleType
  | BoxType
  | 'pg_catalog.bool'
  | TextType
  | NetworkType
  | MacType
  | 'pg_catalog.bytea'
  | UuidType
  | BitType
  | JsonType
  | JsonbType
  | JsonpathType
  | XmlType
  | TemporalType
  | EnumType
export type ScalarType = NonArrayScalarType | ArrayType
export type SyntaxKind = 'and' | 'or' | 'not' | 'is-null' | 'is-not-null' | 'case' | 'coalesce'

export type EnumDefinition = Readonly<Omit<EnumInfo, 'values' | 'valueOids'>> & {
  readonly values: readonly string[]
  readonly valueOids?: readonly number[]
}

export function enumType(definition: Pick<EnumDefinition, 'schema' | 'name'>): EnumType {
  return `enum:${JSON.stringify([definition.schema, definition.name])}`
}

export function enumLabelOid(definition: EnumDefinition, ordinal: number): number | null {
  if (definition.valueOids?.length !== definition.values.length) return null
  const oid = definition.valueOids[ordinal]
  return oid !== undefined && Number.isInteger(oid) && oid > 0 && oid <= 4294967295 ? oid : null
}

export function enumEqualityOperation(signature: string): '=' | '<>' | null {
  return equalityOperation(signature, 'pg_catalog.anyenum')
}

export function capturedEnumSupport(item: CallableMetadata): boolean {
  return (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    !item.strict &&
    item.volatility === 's' &&
    !item.returnsSet &&
    item.args.every((type) => type === 'pg_catalog.anyenum') &&
    (item.name === 'enum_range'
      ? (item.args.length === 1 || item.args.length === 2) && item.result === 'pg_catalog.anyarray'
      : ['enum_first', 'enum_last'].includes(item.name) &&
        item.args.length === 1 &&
        item.result === 'pg_catalog.anyenum')
  )
}

export function arrayType(elementType: ArrayElementType): ArrayType {
  return `array:${elementType}`
}

export function isCatalogVectorType(type: string | null | undefined): type is CatalogVectorType {
  return type === 'pg_catalog.int2vector' || type === 'pg_catalog.oidvector'
}

export function arrayLikeElementType(type: string | null | undefined): ArrayElementType | null {
  if (type === 'pg_catalog.int2vector') return 'pg_catalog.int2'
  if (type === 'pg_catalog.oidvector') return 'pg_catalog.oid'
  return type?.startsWith('array:') ? (type.slice(6) as ArrayElementType) : null
}

export function isArrayLikeType(
  type: string | null | undefined,
): type is ArrayType | CatalogVectorType {
  return arrayLikeElementType(type) !== null
}

export function arrayPhysicalType(type: string): ArrayType | null {
  const element = arrayLikeElementType(type)
  return element === null ? null : arrayType(element)
}

export function domainElementType(
  definition: { schema: string; name: string },
  base: Exclude<ScalarType, DomainElementType>,
): DomainElementType {
  return `domain:${JSON.stringify([definition.schema, definition.name, base])}`
}

export function domainElementDefinition(
  type: string,
): { schema: string; name: string; base: Exclude<ScalarType, DomainElementType> } | null {
  if (!type.startsWith('domain:')) return null
  try {
    const parts: unknown = JSON.parse(type.slice(7))
    if (
      !Array.isArray(parts) ||
      parts.length !== 3 ||
      !parts.every(
        (part): part is string =>
          typeof part === 'string' && part.length > 0 && !part.includes('\0'),
      )
    )
      return null
    const [schema, name, base] = parts as [string, string, string]
    if (base.startsWith('domain:')) return null
    const element = base.startsWith('array:') ? base.slice(6) : base
    if (element.startsWith('array:')) return null
    if (element.startsWith('domain:')) {
      if (!base.startsWith('array:') || !domainElementDefinition(element)) return null
    } else if (!element.startsWith('enum:') && catalogScalarType(element) !== element) return null
    if (element.startsWith('enum:')) {
      const identity: unknown = JSON.parse(element.slice(5))
      if (
        !Array.isArray(identity) ||
        identity.length !== 2 ||
        !identity.every(
          (part) => typeof part === 'string' && part.length > 0 && !part.includes('\0'),
        )
      )
        return null
    }
    return { schema, name, base: base as Exclude<ScalarType, DomainElementType> }
  } catch {
    return null
  }
}

export function arrayElementBaseType(type: string): string {
  return domainElementDefinition(type)?.base ?? type
}

function isJsonConvertibleType(type: string): boolean {
  if (
    type === 'pg_catalog.bool' ||
    type === 'pg_catalog.uuid' ||
    type === 'pg_catalog."json"' ||
    type === 'pg_catalog.jsonb' ||
    type === 'pg_catalog.jsonpath' ||
    type.startsWith('enum:')
  )
    return true
  if (/^pg_catalog\.(int[248]|float[48]|"numeric"|text|"varchar"|bpchar)$/.test(type)) return true
  return type.startsWith('array:') ? isJsonConvertibleType(type.slice('array:'.length)) : false
}

function operandMatchesDeclared(declared: string, actual: string): boolean {
  if (actual === declared) return true
  if (declared === 'pg_catalog.anyenum' && actual.startsWith('enum:')) return true
  if (declared === 'pg_catalog._text' && actual === arrayType('pg_catalog.text')) return true
  if (declared === 'pg_catalog.anyelement' && isJsonConvertibleType(actual)) return true
  if (declared === 'pg_catalog."any"' && isJsonConvertibleType(actual)) return true
  return (
    declared === 'pg_catalog.anyarray' &&
    actual.startsWith('array:') &&
    isJsonConvertibleType(actual.slice('array:'.length))
  )
}

function isArrayElementType(type: string): type is ArrayElementType {
  return (
    catalogScalarType(type) === type ||
    isRangeType(type) ||
    isMultirangeType(type) ||
    type.startsWith('enum:') ||
    domainElementDefinition(type) !== null
  )
}

export function resolveAnycompatibleElementType(
  types: readonly ArrayElementType[],
): ArrayElementType | null {
  if (types.length === 0) return null
  if (types.every((type) => type === types[0])) return types[0]!
  const numeric = [
    'pg_catalog.int2',
    'pg_catalog.int4',
    'pg_catalog.int8',
    'pg_catalog."numeric"',
    'pg_catalog.float4',
    'pg_catalog.float8',
  ] as const
  if (types.every((type) => (numeric as readonly string[]).includes(type)))
    return numeric[
      Math.max(...types.map((type) => numeric.indexOf(type as (typeof numeric)[number])))
    ]!
  const text = ['pg_catalog.bpchar', 'pg_catalog."varchar"', 'pg_catalog.text'] as const
  if (types.every((type) => (text as readonly string[]).includes(type)))
    return text[Math.max(...types.map((type) => text.indexOf(type as (typeof text)[number])))]!
  return null
}

type ArrayPseudoType =
  | 'pg_catalog.anyarray'
  | 'pg_catalog.anycompatiblearray'
  | 'pg_catalog.anyelement'
  | 'pg_catalog.anycompatible'

export function resolveArrayPolymorphicType(
  declaredArguments: readonly ArrayPseudoType[],
  declaredResult: ArrayPseudoType | ScalarType,
  concreteArguments: readonly ScalarType[],
): ScalarType | null {
  if (declaredArguments.length !== concreteArguments.length) return null
  let elementType: ArrayElementType | undefined
  let arrayIdentity: ArrayType | CatalogVectorType | undefined
  for (let index = 0; index < declaredArguments.length; index++) {
    const declared = declaredArguments[index]!
    const concrete = concreteArguments[index]!
    const array = declared === 'pg_catalog.anyarray' || declared === 'pg_catalog.anycompatiblearray'
    if (declared === 'pg_catalog.anyarray') {
      if (!isArrayLikeType(concrete) || (arrayIdentity && arrayIdentity !== concrete)) return null
      arrayIdentity = concrete
    }
    const candidate = array ? arrayLikeElementType(concrete) : concrete
    if (!candidate || !isArrayElementType(candidate)) return null
    if (elementType === undefined) elementType = candidate
    else if (candidate !== elementType) {
      if (
        declared.startsWith('pg_catalog.anycompatible') &&
        declaredArguments.every((argument) => argument.startsWith('pg_catalog.anycompatible'))
      ) {
        const compatible = resolveAnycompatibleElementType([elementType, candidate])
        if (!compatible) return null
        elementType = compatible
      } else return null
    }
  }
  if (!elementType) return null
  if (
    declaredResult === 'pg_catalog.anyarray' ||
    declaredResult === 'pg_catalog.anycompatiblearray'
  )
    return declaredResult === 'pg_catalog.anyarray'
      ? (arrayIdentity ?? arrayType(elementType))
      : arrayType(elementType)
  if (declaredResult === 'pg_catalog.anyelement' || declaredResult === 'pg_catalog.anycompatible')
    return elementType
  return declaredResult
}

export type SqlExpression =
  | { kind: 'input'; type: ScalarType; name: string }
  | {
      kind: 'array-operation'
      type: ScalarType
      elementType: ArrayElementType
      collation?: string
      operation:
        | 'cardinality'
        | 'ndims'
        | 'dims'
        | 'length'
        | 'lower'
        | 'upper'
        | 'contains'
        | 'contained'
        | 'overlap'
        | 'concat'
        | 'append'
        | 'prepend'
        | 'position'
        | 'positions'
        | 'remove'
        | 'replace'
        | 'fill'
        | 'trim'
        | 'reverse'
        | 'sort'
      operands: readonly SqlExpression[]
    }
  | {
      kind: 'array-comparison'
      type: 'pg_catalog.bool'
      elementType: ArrayElementType
      collation?: string
      operation: '=' | '<>' | '<' | '<=' | '>' | '>='
      operands: readonly SqlExpression[]
    }
  | {
      kind: 'array-subscript'
      type: ArrayElementType
      elementType: ArrayElementType
      array: SqlExpression
      subscripts: readonly SqlExpression[]
    }
  | {
      kind: 'array-slice'
      type: ArrayType
      elementType: ArrayElementType
      array: SqlExpression
      bounds: readonly {
        lower: SqlExpression | null
        upper: SqlExpression | null
      }[]
    }
  | {
      kind: 'array-assign'
      type: ArrayType
      elementType: ArrayElementType
      array: SqlExpression
      subscripts: readonly SqlExpression[]
      value: SqlExpression
    }
  | {
      kind: 'enum-coercion'
      type: EnumType | 'pg_catalog.text'
      enum: EnumDefinition
      operand: SqlExpression
    }
  | {
      kind: 'enum-comparison'
      type: 'pg_catalog.bool'
      enum: EnumDefinition
      operation: '=' | '<>' | '<' | '<=' | '>' | '>='
      operands: readonly SqlExpression[]
    }
  | {
      kind: 'uuid-coercion'
      type: UuidType | 'pg_catalog.text'
      operand: SqlExpression
    }
  | {
      kind: 'json-coercion'
      type: JsonType | JsonbType | 'pg_catalog.text'
      operand: SqlExpression
    }
  | {
      kind: 'text-coercion'
      type: TextType
      length: number | null
      explicit: boolean
      operand: SqlExpression
    }
  | { kind: 'boolean'; type: 'pg_catalog.bool'; value: boolean | null }
  | { kind: 'text'; type: TextType; value: string | null }
  | { kind: 'refcursor'; type: RefcursorType; value: string | null }
  | { kind: 'name'; type: 'pg_catalog.name'; value: string | null }
  | { kind: 'internal-char'; type: 'pg_catalog."char"'; value: string | null }
  | { kind: 'bytea'; type: 'pg_catalog.bytea'; value: string | null }
  | { kind: 'bit'; type: 'pg_catalog."bit"' | 'pg_catalog.varbit'; value: string | null }
  | { kind: 'point'; type: PointType; value: string | null }
  | { kind: 'line'; type: LineType; value: string | null }
  | { kind: 'lseg'; type: LsegType; value: string | null }
  | { kind: 'money'; type: MoneyType; value: string | null; units?: string }
  | {
      kind: 'tsvector'
      type: TsvectorType
      value: string | null
      stored?: boolean
      storage?: TsvectorConstantStorage
    }
  | {
      kind: 'tsquery'
      type: TsqueryType
      value: string | null
      stored?: boolean
      storage?: TsqueryConstantStorage
    }
  | { kind: 'aclitem'; type: AclitemType; value: string | null }
  | { kind: 'xid'; type: XidType; value: string | null }
  | { kind: 'cid'; type: CidType; value: string | null }
  | { kind: 'pg_lsn'; type: PgLsnType; value: string | null }
  | { kind: 'tid'; type: TidType; value: string | null }
  | { kind: 'xid8'; type: Xid8Type; value: string | null }
  | { kind: 'snapshot'; type: SnapshotType; value: string | null }
  | {
      kind: 'multirange'
      type: MultirangeType
      value: string | null
      arrayStorage?: readonly ArrayConstantStorage[]
      tsvectorStorage?: readonly TsvectorConstantStorage[]
      tsqueryStorage?: readonly TsqueryConstantStorage[]
    }
  | {
      kind: 'range'
      type: RangeType
      value: string | null
      arrayStorage?: readonly ArrayConstantStorage[]
      tsvectorStorage?: readonly TsvectorConstantStorage[]
      tsqueryStorage?: readonly TsqueryConstantStorage[]
    }
  | { kind: 'oid'; type: OidType; value: string | null }
  | { kind: 'polygon'; type: PolygonType; value: string | null }
  | { kind: 'path'; type: PathType; value: string | null }
  | { kind: 'circle'; type: CircleType; value: string | null }
  | { kind: 'box'; type: BoxType; value: string | null }
  | { kind: 'uuid'; type: UuidType; value: string | null }
  | { kind: 'json'; type: JsonType; value: string | null }
  | { kind: 'jsonb'; type: JsonbType; value: string | null }
  | { kind: 'jsonpath'; type: JsonpathType; value: string | null; origin?: 'source' | 'stored' }
  | {
      kind: 'xml'
      type: XmlType
      value: string | null
      origin?: 'source' | 'stored'
      storage?: string
    }
  | { kind: 'temporal'; type: TemporalType; value: string | null }
  | ({ kind: 'temporal-storage' } & TemporalConstantStorage)
  | { kind: 'enum'; type: EnumType; enum: EnumDefinition; value: string | null }
  | {
      kind: 'array'
      type: ArrayType
      elementType: ArrayElementType
      dimensions: readonly number[]
      lowerBounds: readonly number[]
      elements: readonly SqlExpression[] | null
    }
  | {
      kind: 'boolean-logic'
      type: 'pg_catalog.bool'
      operation: 'and' | 'or' | 'not'
      operands: readonly SqlExpression[]
    }
  | { kind: 'null-test'; type: 'pg_catalog.bool'; negated: boolean; operand: SqlExpression }
  | {
      kind: 'case'
      type: ScalarType
      branches: readonly { when: SqlExpression; then: SqlExpression }[]
      otherwise: SqlExpression
    }
  | { kind: 'coalesce'; type: ScalarType; operands: readonly SqlExpression[] }
  | { kind: 'integer'; type: IntegerType; value: string | null }
  | { kind: 'float'; type: FloatType; bits: string | null; exact?: true }
  | { kind: 'network'; type: NetworkType; value: string | null }
  | { kind: 'mac'; type: MacType; value: string | null }
  | { kind: 'decimal'; type: DecimalType; value: string | null }
  | {
      kind: 'operator' | 'function'
      collation?: string
      signature: string
      type: string
      operands: readonly SqlExpression[]
    }
  | {
      kind: 'cast'
      signature: string | null
      type: ScalarType
      operand: SqlExpression
    }

export interface ExpressionBackend<Ast> {
  bindings: readonly SqlBindingGroup<Ast>[]
  input?: (name: string, type: ScalarType) => Ast
  boolean: (value: boolean | null) => Ast
  text: (value: string | null) => Ast
  name: (value: string | null) => Ast
  internalChar: (value: string | null) => Ast
  bytea: (value: string | null) => Ast
  bit: (value: string | null) => Ast
  uuid: (value: string | null) => Ast
  json: (value: string | null) => Ast
  jsonb: (value: string | null) => Ast
  temporal: (type: TemporalType, value: string | null) => Ast
  enum: (definition: EnumDefinition, value: string | null) => Ast
  array: (
    elementType: ArrayElementType,
    dimensions: readonly number[],
    lowerBounds: readonly number[],
    elements: readonly TypedSqlExpression<Ast>[] | null,
  ) => { expression: Ast; helpers: readonly string[] }
  arrayOperation: (
    operation:
      | 'cardinality'
      | 'ndims'
      | 'dims'
      | 'length'
      | 'lower'
      | 'upper'
      | 'contains'
      | 'contained'
      | 'overlap'
      | 'concat'
      | 'append'
      | 'prepend'
      | 'position'
      | 'positions'
      | 'remove'
      | 'replace'
      | 'fill'
      | 'trim'
      | 'reverse'
      | 'sort'
      | '='
      | '<>'
      | '<'
      | '<='
      | '>'
      | '>=',
    elementType: ArrayElementType,
    operands: readonly TypedSqlExpression<Ast>[],
  ) => { expression: Ast; helpers: readonly string[] }
  arraySubscript: (
    elementType: ArrayElementType,
    array: TypedSqlExpression<Ast>,
    subscripts: readonly TypedSqlExpression<Ast>[],
  ) => { expression: Ast; helpers: readonly string[] }
  arraySlice: (
    array: TypedSqlExpression<Ast>,
    bounds: readonly {
      lower: TypedSqlExpression<Ast> | null
      upper: TypedSqlExpression<Ast> | null
    }[],
  ) => { expression: Ast; helpers: readonly string[] }
  arrayAssign: (
    elementType: ArrayElementType,
    array: TypedSqlExpression<Ast>,
    subscripts: readonly TypedSqlExpression<Ast>[],
    value: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  compareEnum: (
    operation: '=' | '<>' | '<' | '<=' | '>' | '>=',
    operands: readonly TypedSqlExpression<Ast>[],
  ) => { expression: Ast; helpers: readonly string[] }
  coerceEnum: (
    type: EnumType | 'pg_catalog.text',
    definition: EnumDefinition,
    operand: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  coerceUuid: (
    type: UuidType | 'pg_catalog.text',
    operand: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  coerceJson: (
    type: JsonType | JsonbType | 'pg_catalog.text',
    operand: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  coerceText: (
    type: TextType,
    length: number | null,
    explicit: boolean,
    operand: TypedSqlExpression<Ast>,
  ) => { expression: Ast; helpers: readonly string[] }
  syntax: (
    kind: SyntaxKind,
    type: ScalarType,
    operands: readonly TypedSqlExpression<Ast>[],
  ) => { expression: Ast; helpers: readonly string[] }
  integer: (type: IntegerType, value: string | null) => Ast
  float: (type: FloatType, bits: string | null) => Ast
  decimal: (value: string | null) => Ast
}

export function isBinaryBitRelabel(source: string, target: string): boolean {
  const types = ['pg_catalog."bit"', 'pg_catalog.varbit']
  return types.includes(source) && types.includes(target)
}

export function isBinaryTextRelabel(source: string, target: string): boolean {
  return (
    ['pg_catalog.text', 'pg_catalog."varchar"'].includes(source) &&
    ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(target)
  )
}

export type SqlCallableExpression =
  | {
      kind: 'operator' | 'function'
      signature: string
      type: string
      collation?: string
      collationDefault?: boolean
      variadic?: true
      enum?: EnumDefinition
      inputEnums?: readonly EnumDefinition[]
    }
  | { kind: 'cast'; signature: string | null; type: string }

export function emitSqlCallable<Ast>(
  node: SqlCallableExpression,
  operands: readonly TypedSqlExpression<Ast>[],
  backend: ExpressionBackend<Ast>,
): { value: TypedSqlExpression<Ast>; helpers: readonly string[] } {
  const signature = node.signature
  if (signature === null) throw new Error('A relabel cast has no callable signature')
  const operator = node.kind === 'operator'
  const metadata = operator ? operatorMetadata(signature) : functionMetadata(signature)
  if ((metadata.kind !== 'operator' && metadata.kind !== 'function') || metadata.returnsSet)
    throw new Error(`Unsupported execution shape: ${signature}`)
  if (node.kind === 'cast') {
    const conversion = builtinCast(operands[0]?.type ?? '', node.type)
    if (
      operands.length !== 1 ||
      conversion?.method !== 'f' ||
      conversion.implementation !== signature
    )
      throw new Error(`Invalid cast function: ${signature}`)
  }
  const variadicAny = metadata.kind === 'function' && metadata.variadic === 'pg_catalog."any"'
  if (node.type !== metadata.result) throw new Error(`Invalid resolved expression: ${signature}`)
  if (variadicAny) {
    if (operands.length < 1) throw new Error(`Invalid resolved expression: ${signature}`)
  } else if (operands.length !== metadata.args.length)
    throw new Error(`Invalid resolved expression: ${signature}`)
  for (let index = 0; index < operands.length; index++) {
    const declared = variadicAny ? 'pg_catalog."any"' : metadata.args[index]!
    if (!operandMatchesDeclared(declared, operands[index]!.type))
      throw new Error(`Operand type mismatch: ${signature}, argument ${index}`)
  }
  const enumOperation = enumEqualityOperation(signature)
  if (enumOperation) {
    if (operands[0]!.type !== operands[1]!.type || !operands[0]!.type.startsWith('enum:'))
      throw new Error(`Enum identity mismatch: ${signature}`)
    const result = backend.compareEnum(enumOperation, operands)
    return { value: { type: node.type, expression: result.expression }, helpers: result.helpers }
  }
  const binding = backend.bindings
    .map((group) => (operator ? group.operators : group.functions)[signature])
    .find((candidate) => candidate !== undefined)
  if (!binding) throw new Error(`Unsupported overload: ${signature}`)
  if (
    operands.some((operand) =>
      ['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog."varchar"', 'pg_catalog.name'].includes(
        operand.type,
      ),
    ) &&
    ((operator &&
      ['=', '<>', '<', '<=', '>', '>=', '~~', '!~~', '~~*', '!~~*'].includes(metadata.name)) ||
      (!operator &&
        [
          'texteq',
          'textne',
          'text_lt',
          'text_le',
          'text_gt',
          'text_ge',
          'bpchareq',
          'bpcharne',
          'bpcharlt',
          'bpcharle',
          'bpchargt',
          'bpcharge',
          'strpos',
          'replace',
          'split_part',
          'starts_with',
          'textlike',
          'textnlike',
          'bpcharlike',
          'bpcharnlike',
          'like',
          'notlike',
          'lower',
          'upper',
          'initcap',
          'casefold',
          'texticlike',
          'texticnlike',
          'bpchariclike',
          'bpcharicnlike',
          'namelike',
          'namenlike',
          'nameiclike',
          'nameicnlike',
          'nameeq',
          'namene',
          'namelt',
          'namele',
          'namegt',
          'namege',
          'nameeqtext',
          'namenetext',
          'namelttext',
          'nameletext',
          'namegttext',
          'namegetext',
          'texteqname',
          'textnename',
          'textltname',
          'textlename',
          'textgtname',
          'textgename',
        ].includes(metadata.name))) &&
    node.kind !== 'cast' &&
    !supportsTextCallableCollation(signature, node.collation)
  )
    throw new Error('Unsupported text collation: expected C')
  const emitter = binding as unknown as CallableEmitter<CallableMetadata, Ast>
  const value = emitter.emit(metadata, operands)
  if (value.type !== metadata.result) throw new Error(`Emitter result type mismatch: ${signature}`)
  return { value, helpers: emitter.helpers }
}

export function emitSqlExpression<Ast>(
  expression: SqlExpression,
  backend: ExpressionBackend<Ast>,
): { value: TypedSqlExpression<Ast>; helpers: readonly string[] } {
  const helpers = new Set<string>()
  const validateEnum = (definition: EnumDefinition): EnumType => {
    const invalidUtf8 = (value: string): boolean =>
      value.includes('\0') ||
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)
    if (
      definition.schema.length === 0 ||
      definition.name.length === 0 ||
      invalidUtf8(definition.schema) ||
      invalidUtf8(definition.name) ||
      new Set(definition.values).size !== definition.values.length ||
      definition.values.some(invalidUtf8)
    )
      throw new Error('Invalid enum definition')
    return enumType(definition)
  }
  const emit = (node: SqlExpression): TypedSqlExpression<Ast> => {
    if (node.kind === 'input') {
      if (!backend.input) throw new Error(`No SQL input binding for ${node.name}`)
      return { type: node.type, expression: backend.input(node.name, node.type) }
    }
    if (node.kind === 'array-operation' || node.kind === 'array-comparison') {
      const identity = arrayType(node.elementType)
      const metadataOperations = ['cardinality', 'ndims', 'dims'] as const
      const dimensionOperations = ['length', 'lower', 'upper'] as const
      const binaryOperations = [
        'contains',
        'contained',
        'overlap',
        'concat',
        '=',
        '<>',
        '<',
        '<=',
        '>',
        '>=',
      ] as const
      const expectedType =
        node.operation === 'dims'
          ? 'pg_catalog.text'
          : [
                'concat',
                'append',
                'prepend',
                'remove',
                'replace',
                'fill',
                'trim',
                'reverse',
                'sort',
              ].includes(node.operation)
            ? identity
            : node.operation === 'positions'
              ? arrayType('pg_catalog.int4')
              : metadataOperations.includes(
                    node.operation as (typeof metadataOperations)[number],
                  ) ||
                  dimensionOperations.includes(
                    node.operation as (typeof dimensionOperations)[number],
                  ) ||
                  node.operation === 'position'
                ? 'pg_catalog.int4'
                : 'pg_catalog.bool'
      const arrayElement = (type: string): ArrayElementType | null =>
        type.startsWith('array:') && isArrayElementType(type.slice('array:'.length))
          ? (type.slice('array:'.length) as ArrayElementType)
          : null
      const compatible = (types: readonly (ArrayElementType | null)[]): boolean =>
        types.every(
          (type): type is ArrayElementType => type !== null && isArrayElementType(type),
        ) && resolveAnycompatibleElementType(types) === node.elementType
      let validOperands =
        (metadataOperations.includes(node.operation as (typeof metadataOperations)[number]) &&
          node.operands.length === 1 &&
          node.operands[0]?.type === identity) ||
        (dimensionOperations.includes(node.operation as (typeof dimensionOperations)[number]) &&
          node.operands.length === 2 &&
          node.operands[0]?.type === identity &&
          node.operands[1]?.type === 'pg_catalog.int4') ||
        (binaryOperations.includes(node.operation as (typeof binaryOperations)[number]) &&
          node.operands.length === 2 &&
          (node.operation === 'concat'
            ? compatible(node.operands.map((operand) => arrayElement(operand.type)))
            : node.operands.every((operand) => operand.type === identity)))
      if (node.operation === 'append')
        validOperands =
          node.operands.length === 2 &&
          compatible([
            arrayElement(node.operands[0]!.type),
            node.operands[1]!.type as ArrayElementType,
          ])
      else if (node.operation === 'prepend')
        validOperands =
          node.operands.length === 2 &&
          compatible([
            node.operands[0]!.type as ArrayElementType,
            arrayElement(node.operands[1]!.type),
          ])
      else if (['position', 'positions', 'remove'].includes(node.operation))
        validOperands =
          node.operands.length >= 2 &&
          node.operands.length <= (node.operation === 'position' ? 3 : 2) &&
          compatible([
            arrayElement(node.operands[0]!.type),
            node.operands[1]!.type as ArrayElementType,
          ]) &&
          (node.operands.length < 3 || node.operands[2]!.type === 'pg_catalog.int4')
      else if (node.operation === 'replace')
        validOperands =
          node.operands.length === 3 &&
          compatible([
            arrayElement(node.operands[0]!.type),
            node.operands[1]!.type as ArrayElementType,
            node.operands[2]!.type as ArrayElementType,
          ])
      else if (node.operation === 'fill')
        validOperands =
          (node.operands.length === 2 || node.operands.length === 3) &&
          compatible([node.operands[0]!.type as ArrayElementType]) &&
          node.operands.slice(1).every((operand) => operand.type === arrayType('pg_catalog.int4'))
      else if (node.operation === 'trim')
        validOperands =
          node.operands.length === 2 &&
          node.operands[0]!.type === identity &&
          node.operands[1]!.type === 'pg_catalog.int4'
      else if (node.operation === 'reverse')
        validOperands = node.operands.length === 1 && node.operands[0]!.type === identity
      else if (node.operation === 'sort')
        validOperands =
          node.operands.length >= 1 &&
          node.operands.length <= 3 &&
          node.operands[0]!.type === identity &&
          node.operands.slice(1).every((operand) => operand.type === 'pg_catalog.bool')
      const comparesElements = [
        'contains',
        'contained',
        'overlap',
        '=',
        '<>',
        '<',
        '<=',
        '>',
        '>=',
        'position',
        'positions',
        'remove',
        'replace',
        'sort',
      ].includes(node.operation)
      const textElement = ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(
        node.elementType,
      )
      if (
        !validOperands ||
        node.type !== expectedType ||
        (comparesElements && textElement && node.collation !== 'C')
      )
        throw new Error(
          comparesElements && textElement && node.collation !== 'C'
            ? 'Unsupported array element collation: expected C'
            : 'Invalid array operation',
        )
      const operands = node.operands.map(emit)
      const result = backend.arrayOperation(node.operation, node.elementType, operands)
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'array-subscript') {
      const identity = arrayType(node.elementType)
      if (
        node.array.type !== identity ||
        resolveArrayPolymorphicType(['pg_catalog.anyarray'], 'pg_catalog.anyelement', [
          node.array.type,
        ]) !== node.type ||
        node.subscripts.length === 0 ||
        node.subscripts.some((subscript) => subscript.type !== 'pg_catalog.int4')
      )
        throw new Error('Invalid array subscript')
      const result = backend.arraySubscript(
        node.elementType,
        emit(node.array),
        node.subscripts.map(emit),
      )
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'array-slice') {
      const identity = arrayType(node.elementType)
      if (
        node.type !== identity ||
        node.array.type !== identity ||
        node.bounds.length === 0 ||
        node.bounds.length > 6 ||
        node.bounds.some(
          (bound) =>
            (bound.lower !== null && bound.lower.type !== 'pg_catalog.int4') ||
            (bound.upper !== null && bound.upper.type !== 'pg_catalog.int4'),
        )
      )
        throw new Error('Invalid array slice')
      const result = backend.arraySlice(
        emit(node.array),
        node.bounds.map((bound) => ({
          lower: bound.lower === null ? null : emit(bound.lower),
          upper: bound.upper === null ? null : emit(bound.upper),
        })),
      )
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'array-assign') {
      const identity = arrayType(node.elementType)
      if (
        node.type !== identity ||
        node.array.type !== identity ||
        node.subscripts.length === 0 ||
        node.subscripts.length > 6 ||
        node.subscripts.some((subscript) => subscript.type !== 'pg_catalog.int4') ||
        resolveAnycompatibleElementType([node.elementType, node.value.type as ArrayElementType]) !==
          node.elementType
      )
        throw new Error('Invalid array assignment')
      const result = backend.arrayAssign(
        node.elementType,
        emit(node.array),
        node.subscripts.map(emit),
        emit(node.value),
      )
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'enum-coercion') {
      const identity = validateEnum(node.enum)
      if (!(
        (node.type === identity && node.operand.type === 'pg_catalog.text') ||
        (node.type === 'pg_catalog.text' && node.operand.type === identity)
      ))
        throw new Error('Invalid enum coercion')
      const result = backend.coerceEnum(node.type, node.enum, emit(node.operand))
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'enum-comparison') {
      const identity = validateEnum(node.enum)
      if (node.operands.length !== 2 || node.operands.some((operand) => operand.type !== identity))
        throw new Error('Invalid enum comparison')
      const operands = node.operands.map(emit)
      const result = backend.compareEnum(node.operation, operands)
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'uuid-coercion') {
      if (!(
        (node.type === 'pg_catalog.uuid' && node.operand.type === 'pg_catalog.text') ||
        (node.type === 'pg_catalog.text' && node.operand.type === 'pg_catalog.uuid')
      ))
        throw new Error('Invalid UUID coercion')
      const result = backend.coerceUuid(node.type, emit(node.operand))
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'json-coercion') {
      const jsonTypes = ['pg_catalog."json"', 'pg_catalog.jsonb'] as const
      if (!(
        (jsonTypes.includes(node.type as (typeof jsonTypes)[number]) &&
          node.operand.type === 'pg_catalog.text') ||
        (node.type === 'pg_catalog.text' &&
          jsonTypes.includes(node.operand.type as (typeof jsonTypes)[number])) ||
        (jsonTypes.includes(node.type as (typeof jsonTypes)[number]) &&
          jsonTypes.includes(node.operand.type as (typeof jsonTypes)[number]) &&
          node.type !== node.operand.type)
      ))
        throw new Error('Invalid JSON coercion')
      const result = backend.coerceJson(node.type, emit(node.operand))
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'text-coercion') {
      if (
        !['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(node.type) ||
        !['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(
          node.operand.type,
        ) ||
        (node.length !== null &&
          (node.type === 'pg_catalog.text' ||
            !Number.isInteger(node.length) ||
            node.length < 1 ||
            node.length > 10485760))
      )
        throw new Error('Invalid text coercion')
      const result = backend.coerceText(node.type, node.length, node.explicit, emit(node.operand))
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'name' || node.kind === 'internal-char' || node.kind === 'bytea') {
      const invalidUtf8 = (value: string): boolean =>
        value.includes('\0') ||
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)
      if (node.kind === 'name') {
        if (node.type !== 'pg_catalog.name') throw new Error('Invalid name literal')
        if (node.value !== null && invalidUtf8(node.value))
          throw new Error('Invalid PostgreSQL UTF8 name literal')
        helpers.add('nameInput')
        return { type: node.type, expression: backend.name(node.value) }
      }
      if (node.kind === 'internal-char') {
        if (node.type !== 'pg_catalog."char"') throw new Error('Invalid internal char literal')
        if (node.value !== null && invalidUtf8(node.value))
          throw new Error('Invalid PostgreSQL UTF8 internal char literal')
        helpers.add('charInput')
        return { type: node.type, expression: backend.internalChar(node.value) }
      }
      if (
        node.type !== 'pg_catalog.bytea' ||
        (node.value !== null && (node.value.length % 2 !== 0 || /[^0-9a-f]/i.test(node.value)))
      )
        throw new Error('Invalid bytea literal')
      helpers.add('byteaInput')
      return { type: node.type, expression: backend.bytea(node.value) }
    }
    if (node.kind === 'bit') {
      const validBitLiteral = (value: string): boolean => {
        if (value.length === 0) return true
        const lead = value[0]
        if (lead === 'x' || lead === 'X') return /^[0-9a-fA-F]*$/u.test(value.slice(1))
        const body = lead === 'b' || lead === 'B' ? value.slice(1) : value
        return /^[01]*$/u.test(body)
      }
      if (
        (node.type !== 'pg_catalog."bit"' && node.type !== 'pg_catalog.varbit') ||
        (node.value !== null && !validBitLiteral(node.value))
      )
        throw new Error('Invalid bit string')
      helpers.add('bitInput')
      return { type: node.type, expression: backend.bit(node.value) }
    }
    if (node.kind === 'boolean' || node.kind === 'text' || node.kind === 'refcursor') {
      if (
        node.kind !== 'boolean' &&
        node.value !== null &&
        (node.value.includes('\0') ||
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
            node.value,
          ))
      )
        throw new Error('Invalid PostgreSQL UTF8 text literal')
      const expression =
        node.kind === 'boolean' ? backend.boolean(node.value) : backend.text(node.value)
      helpers.add(node.kind === 'boolean' ? 'booleanInput' : 'textInput')
      return { type: node.type, expression }
    }
    if (node.kind === 'line') {
      if (node.value !== null) throw new Error('Line literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'lseg') {
      if (node.value !== null) throw new Error('Lseg literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'tsvector') {
      if (node.value !== null) throw new Error('Tsvector literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'tsquery') {
      if (node.value !== null) throw new Error('Tsquery literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'aclitem') {
      if (node.value !== null) throw new Error('ACL literals require a deployment role catalog')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'money') {
      if (node.value !== null) throw new Error('Money literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'xid') {
      if (node.value !== null) throw new Error('Xid literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'cid') {
      if (node.value !== null) throw new Error('Cid literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'pg_lsn') {
      if (node.value !== null) throw new Error('PgLsn literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'tid') {
      if (node.value !== null) throw new Error('Tid literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'xid8') {
      if (node.value !== null) throw new Error('Xid8 literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'snapshot') {
      if (node.value !== null) throw new Error('Snapshot literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'multirange') {
      if (node.value !== null)
        throw new Error('Multirange literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'range') {
      if (node.value !== null) throw new Error('Range literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'oid') {
      if (node.value !== null) throw new Error('Oid literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'polygon') {
      if (node.value !== null) throw new Error('Polygon literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'path') {
      if (node.value !== null) throw new Error('Path literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'circle') {
      if (node.value !== null) throw new Error('Circle literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'box') {
      if (node.value !== null) throw new Error('Box literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'point') {
      if (node.value !== null) throw new Error('Point literals require the Rust CHECK evaluator')
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'uuid') {
      helpers.add('uuidInput')
      return { type: node.type, expression: backend.uuid(node.value) }
    }
    if (node.kind === 'jsonpath' || node.kind === 'xml') {
      if (node.value !== null)
        throw new Error(
          `${node.kind === 'xml' ? 'XML' : 'JSONPath'} literals require the Rust CHECK evaluator`,
        )
      return { type: node.type, expression: backend.text(null) }
    }
    if (node.kind === 'json' || node.kind === 'jsonb') {
      if (
        node.value !== null &&
        (node.value.includes('\0') ||
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
            node.value,
          ))
      )
        throw new Error('Invalid JSON literal')
      helpers.add(node.kind === 'json' ? 'jsonInput' : 'jsonbInput')
      return {
        type: node.type,
        expression: node.kind === 'json' ? backend.json(node.value) : backend.jsonb(node.value),
      }
    }
    if (node.kind === 'network' || node.kind === 'mac')
      return { type: node.type, expression: backend.text(node.value) }
    if (node.kind === 'temporal-storage')
      throw new Error('Captured temporal literals require the Rust CHECK evaluator')
    if (node.kind === 'temporal') {
      if (
        node.value !== null &&
        (node.value.includes('\0') ||
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
            node.value,
          ))
      )
        throw new Error('Invalid temporal literal')
      const helper =
        node.type === 'pg_catalog.date'
          ? 'dateInput'
          : node.type === 'pg_catalog."time"'
            ? 'timeInput'
            : node.type === 'pg_catalog."timestamp"'
              ? 'timestampInput'
              : node.type === 'pg_catalog.timestamptz'
                ? 'timestamptzInput'
                : node.type === 'pg_catalog.timetz'
                  ? 'timetzInput'
                  : 'intervalInput'
      helpers.add(helper)
      return { type: node.type, expression: backend.temporal(node.type, node.value) }
    }
    if (node.kind === 'enum') {
      if (node.type !== validateEnum(node.enum)) throw new Error('Invalid enum literal')
      if (
        node.value !== null &&
        (node.value.includes('\0') ||
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
            node.value,
          ))
      )
        throw new Error('Invalid enum literal')
      helpers.add('enumInput')
      return { type: node.type, expression: backend.enum(node.enum, node.value) }
    }
    if (node.kind === 'array') {
      const identity = arrayType(node.elementType)
      const dimensionsValid =
        node.dimensions.length === node.lowerBounds.length &&
        node.dimensions.length <= 6 &&
        node.dimensions.every((dimension) => Number.isInteger(dimension) && dimension > 0) &&
        node.lowerBounds.every(
          (bound, index) =>
            Number.isInteger(bound) &&
            bound >= -2147483648 &&
            bound <= 2147483647 &&
            bound + node.dimensions[index]! - 1 <= 2147483647,
        )
      const count = node.dimensions.reduce((total, dimension) => total * dimension, 1)
      if (
        node.type !== identity ||
        (node.elements === null
          ? node.dimensions.length !== 0 || node.lowerBounds.length !== 0
          : !dimensionsValid ||
            node.elements.length !== (node.dimensions.length === 0 ? 0 : count) ||
            node.elements.some((element) => element.type !== node.elementType))
      )
        throw new Error('Invalid array literal')
      helpers.add('arrayInput')
      const result = backend.array(
        node.elementType,
        node.dimensions,
        node.lowerBounds,
        node.elements?.map(emit) ?? null,
      )
      for (const helper of result.helpers) helpers.add(helper)
      return {
        type: node.type,
        expression: result.expression,
      }
    }
    if (
      node.kind === 'boolean-logic' ||
      node.kind === 'null-test' ||
      node.kind === 'case' ||
      node.kind === 'coalesce'
    ) {
      let kind: SyntaxKind
      let operands: readonly SqlExpression[]
      if (node.kind === 'boolean-logic') {
        kind = node.operation
        operands = node.operands
        if (
          operands.length !== (kind === 'not' ? 1 : 2) ||
          operands.some((operand) => operand.type !== 'pg_catalog.bool')
        )
          throw new Error('Invalid boolean expression')
      } else if (node.kind === 'null-test') {
        kind = node.negated ? 'is-not-null' : 'is-null'
        operands = [node.operand]
      } else if (node.kind === 'case') {
        kind = 'case'
        if (
          node.branches.length === 0 ||
          node.otherwise.type !== node.type ||
          node.branches.some(
            (branch) => branch.when.type !== 'pg_catalog.bool' || branch.then.type !== node.type,
          )
        )
          throw new Error('Invalid CASE expression')
        operands = [
          ...node.branches.flatMap((branch) => [branch.when, branch.then]),
          node.otherwise,
        ]
      } else {
        kind = 'coalesce'
        operands = node.operands
        if (operands.length === 0 || operands.some((operand) => operand.type !== node.type))
          throw new Error('Invalid COALESCE expression')
      }
      const result = backend.syntax(kind, node.type, operands.map(emit))
      for (const helper of result.helpers) helpers.add(helper)
      return { type: node.type, expression: result.expression }
    }
    if (node.kind === 'decimal') {
      if (
        node.value !== null &&
        !/^(?:NaN|[+-]?Infinity|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/.test(node.value)
      )
        throw new Error(`Invalid decimal literal: ${node.value}`)
      helpers.add('decimalInput')
      return { type: node.type, expression: backend.decimal(node.value) }
    }
    if (node.kind === 'float') {
      const length = node.type === 'pg_catalog.float4' ? 8 : 16
      if (node.bits !== null && (node.bits.length !== length || !/^[0-9a-f]+$/i.test(node.bits)))
        throw new Error(`Invalid float literal bits: ${node.bits}`)
      helpers.add(node.type === 'pg_catalog.float4' ? 'float4Input' : 'float8Input')
      return { type: node.type, expression: backend.float(node.type, node.bits) }
    }
    if (node.kind === 'integer') {
      if (node.value !== null && !/^-?\d+$/.test(node.value))
        throw new Error(`Invalid integer literal: ${node.value}`)
      const helper =
        node.type === 'pg_catalog.int2'
          ? 'int2Input'
          : node.type === 'pg_catalog.int4'
            ? 'int4Input'
            : 'int8Input'
      helpers.add(helper)
      return { type: node.type, expression: backend.integer(node.type, node.value) }
    }
    if (node.kind === 'cast' && node.signature === null) {
      if (node.operand.type !== node.type && !isBinaryTextRelabel(node.operand.type, node.type))
        throw new Error('Invalid relabel cast')
      return { ...emit(node.operand), type: node.type }
    }
    const operands = node.kind === 'cast' ? [node.operand] : node.operands
    const result = emitSqlCallable(node, operands.map(emit), backend)
    for (const helper of result.helpers) helpers.add(helper)
    return result.value
  }
  return { value: emit(expression), helpers: [...helpers] }
}
