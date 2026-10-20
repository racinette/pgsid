import type { RangeTypeInfo, RangeTypeMetadata } from '../catalog/types.js'
import type { PG18_RANGE_TYPES } from '../postgres/builtins/type-ranges.generated.js'
import {
  builtinRangeType,
  builtinMultirangeType,
  builtinTypeComparison,
  builtinTypeIO,
} from '../postgres/builtins/inventory.js'

export type BuiltinRangeType = keyof typeof PG18_RANGE_TYPES
export type BuiltinMultirangeType = (typeof PG18_RANGE_TYPES)[BuiltinRangeType]['multirange']
export type CapturedRangeType = `range:${string}`
export type CapturedMultirangeType = `multirange:${string}`
export type RangeType = BuiltinRangeType | CapturedRangeType
export type MultirangeType = BuiltinMultirangeType | CapturedMultirangeType

const subtypeKinds = {
  'pg_catalog.int4': 2,
  'pg_catalog.int8': 3,
  'pg_catalog."timestamp"': 4,
  'pg_catalog.timestamptz': 5,
  'pg_catalog.date': 7,
  'pg_catalog."numeric"': 10,
} as const
export type RangeSubtype = keyof typeof subtypeKinds

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
] as const
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

function capturedDefinition(type: string): (RangeTypeInfo & { elementType: RangeSubtype }) | null {
  const prefix = type.startsWith('range:') ? 6 : type.startsWith('multirange:') ? 11 : 0
  if (!prefix) return null
  try {
    const value: unknown = JSON.parse(type.slice(prefix))
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const data = value as Record<string, unknown>
    const keys = ['elementType', ...textFields, ...nullableTextFields, ...nullableFlags]
    if (Object.keys(data).length !== keys.length || keys.some((key) => !Object.hasOwn(data, key)))
      return null
    if (textFields.some((key) => !validText(data[key]))) return null
    if (nullableTextFields.some((key) => data[key] !== null && !validText(data[key]))) return null
    if (nullableFlags.some((key) => data[key] !== null && typeof data[key] !== 'boolean'))
      return null
    if (
      typeof data['elementType'] !== 'string' ||
      !Object.hasOwn(subtypeKinds, data['elementType'])
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
  if (!Object.hasOwn(subtypeKinds, elementType)) return null
  const fields: Record<string, unknown> = { elementType }
  for (const key of [...textFields, ...nullableTextFields, ...nullableFlags])
    fields[key] = profile[key]
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

export function rangeProfileSupport(profile: RangeProfile): {
  comparison: number
  canonical: number
} {
  const kind = subtypeKinds[profile.elementType]
  const comparison =
    profile.comparator !== null &&
    profile.comparator === builtinTypeComparison(profile.elementType)?.comparator
      ? kind
      : 0
  const canonical =
    profile.canonical === null
      ? 1
      : !profile.captured && (kind === 2 || kind === 3 || kind === 7)
        ? kind
        : 0
  return { comparison, canonical }
}
