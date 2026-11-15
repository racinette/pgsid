import type { AclitemConstantKnowledge } from '../catalog/aclitem-constant-storage.js'
import type { JsonpathConstantStorage } from '../catalog/jsonpath-constant-storage.js'
import { isOidAliasType, type OidAliasType } from '../catalog/oid-alias-constant-storage.js'
export {
  isOidAliasType,
  oidAliasTypes,
  type OidAliasType,
} from '../catalog/oid-alias-constant-storage.js'
import type { TsqueryConstantStorage } from '../catalog/tsquery-constant-storage.js'
import type { TemporalConstantStorage } from '../catalog/temporal-constant-storage.js'
import type { GeometryConstantStorage } from '../catalog/geometry-constant-storage.js'
import type { SystemConstantStorage } from '../catalog/system-constant-storage.js'
import type { SnapshotConstantStorage } from '../catalog/snapshot-constant-storage.js'
import type { ArrayConstantStorage } from '../catalog/array-constant-storage.js'
import {
  builtinTypeResolution,
  builtinRangeType,
  builtinMultirangeType,
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
import { equalityOperation } from './collation.js'

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
export type OidType = 'pg_catalog.oid' | OidAliasType
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
  | { kind: 'name'; type: 'pg_catalog.name'; value: string | null; stored?: true }
  | { kind: 'internal-char'; type: 'pg_catalog."char"'; value: string | null; byte?: number }
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
  | { kind: 'aclitem'; type: AclitemType; value: string | null; storage?: AclitemConstantKnowledge }
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
  | { kind: 'oid'; type: OidType; value: string | null; stored?: true }
  | { kind: 'polygon'; type: PolygonType; value: string | null }
  | { kind: 'path'; type: PathType; value: string | null }
  | { kind: 'circle'; type: CircleType; value: string | null }
  | { kind: 'box'; type: BoxType; value: string | null }
  | { kind: 'uuid'; type: UuidType; value: string | null }
  | { kind: 'json'; type: JsonType; value: string | null }
  | { kind: 'jsonb'; type: JsonbType; value: string | null }
  | {
      kind: 'jsonpath'
      type: JsonpathType
      value: string | null
      origin?: 'source' | 'stored'
      storage?: JsonpathConstantStorage
    }
  | {
      kind: 'xml'
      type: XmlType
      value: string | null
      origin?: 'source' | 'stored'
      storage?: string
    }
  | { kind: 'temporal'; type: TemporalType; value: string | null }
  | ({ kind: 'temporal-storage' } & TemporalConstantStorage)
  | ({ kind: 'geometry-storage' } & GeometryConstantStorage)
  | ({ kind: 'system-storage' } & SystemConstantStorage)
  | ({ kind: 'snapshot-storage' } & SnapshotConstantStorage)
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
      collationResolved?: boolean
      collationAbsent?: boolean
      collationConflict?: boolean
      collationNondeterministic?: boolean
      variadic?: true
      enum?: EnumDefinition
      inputEnums?: readonly EnumDefinition[]
    }
  | { kind: 'cast'; signature: string | null; type: string }
