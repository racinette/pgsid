import type { RangeTypeInfo, RangeTypeMetadata } from '../catalog/types.js'
import type { PG18_RANGE_TYPES } from '../postgres/builtins/type-ranges.generated.js'
import { parseSync } from 'libpg-query'
import {
  builtinRangeType,
  builtinMultirangeType,
  builtinTypeComparison,
  builtinTypeIO,
  builtinMetadata,
} from '../postgres/builtins/inventory.js'

export type BuiltinRangeType = keyof typeof PG18_RANGE_TYPES
export type BuiltinMultirangeType = (typeof PG18_RANGE_TYPES)[BuiltinRangeType]['multirange']
export type CapturedRangeType = `range:${string}`
export type CapturedMultirangeType = `multirange:${string}`
export type RangeType = BuiltinRangeType | CapturedRangeType
export type MultirangeType = BuiltinMultirangeType | CapturedMultirangeType

const subtypeKinds = {
  'pg_catalog.int2': 1,
  'pg_catalog.int4': 2,
  'pg_catalog.int8': 3,
  'pg_catalog."timestamp"': 4,
  'pg_catalog.timestamptz': 5,
  'pg_catalog.date': 7,
  'pg_catalog.text': 8,
  'pg_catalog."varchar"': 8,
  'pg_catalog.bpchar': 8,
  'pg_catalog.name': 8,
  'pg_catalog.bool': 9,
  'pg_catalog."numeric"': 10,
  'pg_catalog.jsonb': 12,
  'pg_catalog.inet': 13,
  'pg_catalog.cidr': 13,
  'pg_catalog."bit"': 14,
  'pg_catalog.varbit': 14,
  'pg_catalog.bytea': 15,
  'pg_catalog.macaddr': 16,
  'pg_catalog.macaddr8': 17,
  'pg_catalog.uuid': 18,
  'pg_catalog.float4': 19,
  'pg_catalog.float8': 20,
  'pg_catalog."time"': 21,
  'pg_catalog.timetz': 22,
  'pg_catalog."interval"': 23,
  'pg_catalog.money': 31,
  'pg_catalog."char"': 32,
  'pg_catalog.oid': 33,
  'pg_catalog.regclass': 33,
  'pg_catalog.regcollation': 33,
  'pg_catalog.regconfig': 33,
  'pg_catalog.regdictionary': 33,
  'pg_catalog.regnamespace': 33,
  'pg_catalog.regoper': 33,
  'pg_catalog.regoperator': 33,
  'pg_catalog.regproc': 33,
  'pg_catalog.regprocedure': 33,
  'pg_catalog.regrole': 33,
  'pg_catalog.regtype': 33,
  'pg_catalog.xid8': 37,
  'pg_catalog.pg_lsn': 38,
  'pg_catalog.tid': 39,
} as const
export type RangeSubtype = keyof typeof subtypeKinds | `enum:${string}`

export interface RangeProfile extends RangeTypeInfo {
  elementType: RangeSubtype
  rangeType: RangeType
  multirangeType: MultirangeType
  captured: boolean
}

const textFields = [
  'identity',
  'array',
  'subtype',
  'multirange',
  'multirangeArray',
  'subtypeClass',
  'schema',
  'name',
  'multirangeSchema',
  'multirangeName',
] as const
const nullableTextFields = [
  'collation',
  'comparator',
  'canonical',
  'subtypeDiff',
  'output',
  'multirangeOutput',
  'subtypeOutput',
  'input',
  'multirangeInput',
  'subtypeInput',
  'send',
  'multirangeSend',
  'subtypeSend',
  'subtypeHash',
  'subtypeHashExtended',
  'rangeEquality',
  'rangeComparator',
  'rangeHash',
  'rangeHashExtended',
  'multirangeEquality',
  'multirangeComparator',
  'multirangeHash',
  'multirangeHashExtended',
  'jsonCast',
  'multirangeJsonCast',
] as const
const jsonCategoryFields = ['jsonConversion', 'multirangeJsonConversion'] as const
const nullableFlags = [
  'collationDeterministic',
  'collationIsC',
  'collationIsDefault',
  'subtypeHashEqualityCompatible',
  'rangeHashEqualityCompatible',
  'multirangeHashEqualityCompatible',
] as const
const validText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && !value.includes('\0')

export const rangeEnumType = (
  definition: NonNullable<RangeTypeInfo['subtypeEnum']>,
): `enum:${string}` => `enum:${JSON.stringify([definition.schema, definition.name])}`

export function rangeSubtypeIsDomain(profile: RangeProfile): boolean {
  if (!profile.subtypeEnum) return profile.subtype !== profile.elementType
  const fields = (value: unknown): Record<string, unknown> | undefined =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined
  try {
    const select = fields(
      fields(parseSync(`SELECT NULL::${profile.subtype}`).stmts?.[0]?.stmt)?.['SelectStmt'],
    )
    const targets = select?.['targetList']
    const target = Array.isArray(targets) ? fields(fields(targets[0])?.['ResTarget']) : undefined
    const names = fields(fields(fields(target?.['val'])?.['TypeCast'])?.['typeName'])?.['names']
    return (
      !Array.isArray(names) ||
      names.length !== 2 ||
      fields(fields(names[0])?.['String'])?.['sval'] !== profile.subtypeEnum.schema ||
      fields(fields(names[1])?.['String'])?.['sval'] !== profile.subtypeEnum.name
    )
  } catch {
    return true
  }
}

export function rangeSubtypeOutput(profile: RangeProfile): string | undefined {
  if (!profile.subtypeEnum) return builtinTypeIO(profile.elementType)?.output ?? undefined
  const output = profile.subtypeOutput ? builtinMetadata(profile.subtypeOutput) : null
  return output?.kind === 'function' &&
    output.schema === 'pg_catalog' &&
    output.name === 'enum_out' &&
    output.strict &&
    !output.returnsSet &&
    output.volatility === 's' &&
    output.args.join(',') === 'pg_catalog.anyenum' &&
    output.result === 'pg_catalog.cstring'
    ? profile.subtypeOutput!
    : undefined
}

function validEnumDefinition(value: unknown): value is NonNullable<RangeTypeInfo['subtypeEnum']> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const data = value as Record<string, unknown>
  const utf8 = (text: unknown): text is string =>
    typeof text === 'string' &&
    !text.includes('\0') &&
    !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(text)
  return (
    Object.keys(data).length === 3 &&
    validText(data['schema']) &&
    utf8(data['schema']) &&
    validText(data['name']) &&
    utf8(data['name']) &&
    Array.isArray(data['values']) &&
    data['values'].length <= 2147483647 &&
    data['values'].every(utf8) &&
    new Set(data['values']).size === data['values'].length
  )
}

function capturedDefinition(type: string): (RangeTypeInfo & { elementType: RangeSubtype }) | null {
  const prefix = type.startsWith('range:') ? 6 : type.startsWith('multirange:') ? 11 : 0
  if (!prefix) return null
  try {
    const value: unknown = JSON.parse(type.slice(prefix))
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const data = value as Record<string, unknown>
    const keys = [
      'elementType',
      ...textFields,
      ...nullableTextFields,
      ...nullableFlags,
      ...jsonCategoryFields,
      ...(typeof data['elementType'] === 'string' && data['elementType'].startsWith('enum:')
        ? ['subtypeEnum']
        : []),
    ]
    if (Object.keys(data).length !== keys.length || keys.some((key) => !Object.hasOwn(data, key)))
      return null
    if (textFields.some((key) => !validText(data[key]))) return null
    if (nullableTextFields.some((key) => data[key] !== null && !validText(data[key]))) return null
    if (nullableFlags.some((key) => data[key] !== null && typeof data[key] !== 'boolean'))
      return null
    if (
      jsonCategoryFields.some(
        (key) => data[key] !== null && data[key] !== 'output' && data[key] !== 'cast',
      )
    )
      return null
    if (
      typeof data['elementType'] !== 'string' ||
      !(
        Object.hasOwn(subtypeKinds, data['elementType']) ||
        (validEnumDefinition(data['subtypeEnum']) &&
          data['elementType'] === rangeEnumType(data['subtypeEnum']))
      )
    )
      return null
    if (
      Object.hasOwn(subtypeKinds, data['subtype'] as string) &&
      data['subtype'] !== data['elementType']
    )
      return null
    if (
      builtinRangeType(data['identity'] as string) ||
      builtinMultirangeType(data['multirange'] as string)
    )
      return null
    return data as unknown as RangeTypeInfo & { elementType: RangeSubtype }
  } catch {
    return null
  }
}

export function capturedRangeType(
  profile: RangeTypeInfo,
  elementType: string,
): CapturedRangeType | null {
  if (
    !Object.hasOwn(subtypeKinds, elementType) &&
    !(
      validEnumDefinition(profile.subtypeEnum) && elementType === rangeEnumType(profile.subtypeEnum)
    )
  )
    return null
  const fields: Record<string, unknown> = { elementType }
  for (const key of [...textFields, ...nullableTextFields, ...nullableFlags, ...jsonCategoryFields])
    fields[key] = profile[key]
  if (elementType.startsWith('enum:')) fields['subtypeEnum'] = profile.subtypeEnum
  const result: CapturedRangeType = `range:${JSON.stringify(fields)}`
  return capturedDefinition(result) ? result : null
}

export const isCapturedRangeType = (type: string): type is CapturedRangeType =>
  type.startsWith('range:') && capturedDefinition(type) !== null
export const isCapturedMultirangeType = (type: string): type is CapturedMultirangeType =>
  type.startsWith('multirange:') && capturedDefinition(type) !== null

function builtinProfile(profile: RangeTypeMetadata): RangeProfile {
  return {
    ...profile,
    schema: 'pg_catalog',
    name: profile.identity.slice(11),
    multirangeSchema: 'pg_catalog',
    multirangeName: profile.multirange.slice(11),
    collationDeterministic: null,
    collationIsC: null,
    collationIsDefault: null,
    output: builtinTypeIO(profile.identity)?.output ?? null,
    multirangeOutput: builtinTypeIO(profile.multirange)?.output ?? null,
    subtypeOutput: builtinTypeIO(profile.subtype)?.output ?? null,
    input: builtinTypeIO(profile.identity)?.input ?? null,
    multirangeInput: builtinTypeIO(profile.multirange)?.input ?? null,
    subtypeInput: builtinTypeIO(profile.subtype)?.input ?? null,
    send: builtinTypeIO(profile.identity)?.send ?? null,
    multirangeSend: builtinTypeIO(profile.multirange)?.send ?? null,
    subtypeSend: builtinTypeIO(profile.subtype)?.send ?? null,
    subtypeHash: builtinTypeComparison(profile.subtype)?.hash ?? null,
    subtypeHashExtended: builtinTypeComparison(profile.subtype)?.hashExtended ?? null,
    rangeEquality: builtinTypeComparison(profile.identity)?.equality ?? null,
    rangeComparator: builtinTypeComparison(profile.identity)?.comparator ?? null,
    rangeHash: builtinTypeComparison(profile.identity)?.hash ?? null,
    rangeHashExtended: builtinTypeComparison(profile.identity)?.hashExtended ?? null,
    multirangeEquality: builtinTypeComparison(profile.multirange)?.equality ?? null,
    multirangeComparator: builtinTypeComparison(profile.multirange)?.comparator ?? null,
    multirangeHash: builtinTypeComparison(profile.multirange)?.hash ?? null,
    multirangeHashExtended: builtinTypeComparison(profile.multirange)?.hashExtended ?? null,
    subtypeHashEqualityCompatible: true,
    rangeHashEqualityCompatible: true,
    multirangeHashEqualityCompatible: true,
    jsonConversion: 'output',
    multirangeJsonConversion: 'output',
    jsonCast: null,
    multirangeJsonCast: null,
    elementType: profile.subtype as RangeSubtype,
    rangeType: profile.identity as BuiltinRangeType,
    multirangeType: profile.multirange as BuiltinMultirangeType,
    captured: false,
  }
}

export function rangeTypeProfile(type: string): RangeProfile | null {
  const builtin = builtinRangeType(type)
  if (builtin) return builtinProfile(builtin)
  if (!type.startsWith('range:')) return null
  const profile = capturedDefinition(type)
  return profile
    ? {
        ...profile,
        rangeType: type as CapturedRangeType,
        multirangeType: `multirange:${type.slice(6)}`,
        captured: true,
      }
    : null
}

export function multirangeTypeProfile(type: string): RangeProfile | null {
  const builtin = builtinMultirangeType(type)
  if (builtin) return builtinProfile(builtin)
  if (!type.startsWith('multirange:')) return null
  const profile = capturedDefinition(type)
  return profile
    ? {
        ...profile,
        rangeType: `range:${type.slice(11)}`,
        multirangeType: type as CapturedMultirangeType,
        captured: true,
      }
    : null
}

export function rangeTypeOutput(type: string): string | null {
  return rangeTypeProfile(type)?.output ?? multirangeTypeProfile(type)?.multirangeOutput ?? null
}

export function rangeTypeInput(type: string): string | null {
  return rangeTypeProfile(type)?.input ?? multirangeTypeProfile(type)?.multirangeInput ?? null
}

export function rangeProfileSupport(
  profile: RangeProfile,
  context: { defaultCollation?: 'C'; serverEncoding?: 'UTF8' } = {},
): {
  comparison: number
  canonical: number
} {
  const kind = profile.subtypeEnum
    ? 6
    : subtypeKinds[profile.elementType as keyof typeof subtypeKinds]
  const comparison =
    profile.comparator !== null &&
    profile.comparator ===
      builtinTypeComparison(profile.subtypeEnum ? 'pg_catalog.anyenum' : profile.elementType)
        ?.comparator &&
    (kind !== 12 || (context.defaultCollation === 'C' && context.serverEncoding === 'UTF8')) &&
    (kind !== 8 ||
      (context.serverEncoding === 'UTF8' &&
        (profile.collationIsC === true ||
          (profile.collationIsDefault === true && context.defaultCollation === 'C'))))
      ? kind
      : 0
  const canonical =
    profile.canonical === null
      ? 1
      : !profile.captured && (kind === 2 || kind === 3 || kind === 7)
        ? kind
        : 0
  const aliasMode =
    profile.elementType === 'pg_catalog.regoper'
      ? 2
      : profile.elementType === 'pg_catalog.regoperator'
        ? 4
        : profile.elementType === 'pg_catalog.regprocedure'
          ? 3
          : profile.elementType === 'pg_catalog.regtype'
            ? 5
            : profile.elementType.startsWith('pg_catalog.reg')
              ? 1
              : 0
  return {
    comparison:
      kind === 12
        ? context.serverEncoding === 'UTF8'
          ? comparison === 12
            ? 12
            : 120
          : 0
        : aliasMode
          ? (comparison === 33 ? 330 : 300) + aliasMode
          : profile.elementType === 'pg_catalog.cidr'
            ? comparison === 13
              ? 113
              : 100
            : profile.elementType === 'pg_catalog.bpchar'
              ? comparison === 8
                ? 108
                : 0
              : profile.elementType === 'pg_catalog.name'
                ? comparison === 8
                  ? 208
                  : 200
                : comparison,
    canonical,
  }
}
