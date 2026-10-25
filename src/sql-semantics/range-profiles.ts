import { catalogCompositeType, compositeProfile, type CompositeType } from './composite-profiles.js'
import type { RangeTypeInfo, RangeTypeMetadata, RangeSubtypeDefinition } from '../catalog/types.js'
import type { PG18_RANGE_TYPES } from '../postgres/builtins/type-ranges.generated.js'
import { parseSync } from 'libpg-query'
import {
  arrayType,
  domainElementType,
  catalogScalarType,
  isCatalogVectorType,
  arrayLikeElementType,
  type ArrayType,
  type ArrayElementType,
  type ScalarType,
  type DomainElementType,
  type CatalogVectorType,
} from './expressions.js'
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
  'pg_catalog.tsvector': 47,
  'pg_catalog.tsquery': 48,
} as const
export type RangeSubtype =
  | keyof typeof subtypeKinds
  | CatalogVectorType
  | `enum:${string}`
  | ArrayType
  | RangeType
  | MultirangeType
  | CompositeType

export function rangeContainerKind(type: string): 41 | 42 | 43 | 44 | null {
  if (type.startsWith('composite:') && compositeProfile(type)) return 44
  if (type.startsWith('array:') || isCatalogVectorType(type)) return 41
  if (type.startsWith('range:') || builtinRangeType(type)) return 42
  if (type.startsWith('multirange:') || builtinMultirangeType(type)) return 43
  return null
}

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
  if (rangeContainerKind(profile.elementType))
    return (
      profile.subtypeDefinitions?.find((node) => node.identity === profile.subtype)?.kind === 'd'
    )
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
  const container = rangeContainerKind(profile.elementType)
  if (container) {
    if (!rangeContainerSubtype(profile)) return undefined
    if (container === 44) return builtinTypeIO('pg_catalog.record')?.output ?? undefined
    const nodes = new Map(profile.subtypeDefinitions!.map((node) => [node.identity, node]))
    for (const item of nodes.values()) {
      let node = item
      while (node.kind === 'd') node = nodes.get(node.base!)!
      const expected = isCatalogVectorType(node.identity)
        ? builtinTypeIO(node.identity)?.output
        : node.element !== null
          ? builtinTypeIO('pg_catalog._int4')?.output
          : node.kind === 'r'
            ? builtinTypeIO('pg_catalog.int4range')?.output
            : node.kind === 'm'
              ? builtinTypeIO('pg_catalog.int4multirange')?.output
              : node.kind === 'c'
                ? builtinTypeIO('pg_catalog.record')?.output
                : node.kind === 'e'
                  ? 'function:["pg_catalog","enum_out"](pg_catalog.anyenum)'
                  : builtinTypeIO(node.identity)?.output
      if (!expected || item.output !== expected) return undefined
    }
    if (isCatalogVectorType(profile.elementType))
      return builtinTypeIO(profile.elementType)?.output ?? undefined
    return (
      builtinTypeIO(
        { 41: 'pg_catalog._int4', 42: 'pg_catalog.int4range', 43: 'pg_catalog.int4multirange' }[
          container
        ],
      )?.output ?? undefined
    )
  }
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

export function rangeContainerSubtype(
  profile: Pick<
    RangeTypeInfo,
    'subtype' | 'subtypeDefinitions' | 'subtypeRanges' | 'subtypeCompositeGraph'
  >,
): ArrayType | CatalogVectorType | RangeType | MultirangeType | CompositeType | null {
  const definitions = profile.subtypeDefinitions
  if (!Array.isArray(definitions) || !definitions.length || definitions.length > 2147483647)
    return null
  const nodes = new Map<string, RangeSubtypeDefinition>()
  const keys = [
    'identity',
    'schema',
    'name',
    'kind',
    'base',
    'element',
    'subtype',
    'member',
    'enumValues',
    'input',
    'output',
    'send',
    'equality',
    'comparator',
    'hash',
    'hashExtended',
    'hashEqualityCompatible',
  ]
  for (const node of definitions) {
    if (
      !node ||
      typeof node !== 'object' ||
      Object.keys(node).length !== keys.length ||
      keys.some((key) => !Object.hasOwn(node, key))
    )
      return null
    if (
      ![node.identity, node.schema, node.name].every(validText) ||
      nodes.has(node.identity) ||
      !['b', 'd', 'e', 'r', 'm', 'c'].includes(node.kind) ||
      typeof node.hashEqualityCompatible !== 'boolean'
    )
      return null
    if (
      [
        node.base,
        node.element,
        node.subtype,
        node.member,
        node.input,
        node.output,
        node.send,
        node.equality,
        node.comparator,
        node.hash,
        node.hashExtended,
      ].some((value) => value !== null && !validText(value))
    )
      return null
    if (
      (node.kind === 'r') !== (node.subtype !== null) ||
      (node.kind === 'm') !== (node.member !== null)
    )
      return null
    if ((node.kind === 'r' || node.kind === 'm') && (node.base !== null || node.element !== null))
      return null
    if (node.kind === 'e') {
      if (
        !validEnumDefinition({ schema: node.schema, name: node.name, values: node.enumValues }) ||
        node.base !== null ||
        node.element !== null
      )
        return null
    } else if (node.enumValues !== null) return null
    if (node.kind === 'd' ? node.base === null || node.element !== null : node.base !== null)
      return null
    try {
      const select = parseSync(`SELECT NULL::${node.identity}`).stmts![0]!.stmt as {
        SelectStmt?: {
          targetList?: {
            ResTarget?: {
              val?: {
                TypeCast?: {
                  typeName?: {
                    names?: { String?: { sval?: string } }[]
                    arrayBounds?: unknown[]
                    typmods?: unknown[]
                  }
                }
              }
            }
          }[]
        }
      }
      const type = select.SelectStmt?.targetList?.[0]?.ResTarget?.val?.TypeCast?.typeName
      if (
        type?.arrayBounds?.length ||
        type?.typmods?.length ||
        type?.names?.length !== 2 ||
        type.names[0]?.String?.sval !== node.schema ||
        type.names[1]?.String?.sval !== node.name
      )
        return null
    } catch {
      return null
    }
    nodes.set(node.identity, node)
  }
  const visiting = new Set<string>()
  const build = (identity: string, nominal: boolean): ScalarType | null => {
    const node = nodes.get(identity)
    if (!node || visiting.has(identity)) return null
    visiting.add(identity)
    let result: ScalarType | null = null
    if (node.kind === 'd') {
      const base = build(node.base!, false)
      if (base && !base.startsWith('domain:'))
        result = nominal
          ? domainElementType(node, base as Exclude<ScalarType, DomainElementType>)
          : base
    } else if (isCatalogVectorType(node.identity)) {
      const element = arrayLikeElementType(node.identity)!
      if (node.kind === 'b' && node.element === element && build(element, false) === element)
        result = node.identity
    } else if (node.element !== null) {
      const element = build(node.element, true)
      if (element && !element.startsWith('array:')) result = arrayType(element as ArrayElementType)
    } else if (node.kind === 'r' || node.kind === 'm') {
      const child = rangeNestedProfile(profile, node.kind === 'r' ? node.identity : node.member!)
      const multi = node.kind === 'm'
      let enumSubtype = child ? nodes.get(child.subtype) : undefined
      const enumDomains = new Set<string>()
      while (enumSubtype?.kind === 'd') {
        if (enumDomains.has(enumSubtype.identity)) return null
        enumDomains.add(enumSubtype.identity)
        enumSubtype = nodes.get(enumSubtype.base!)
      }
      if (
        child?.subtypeEnum &&
        (enumSubtype?.kind !== 'e' ||
          enumSubtype.schema !== child.subtypeEnum.schema ||
          enumSubtype.name !== child.subtypeEnum.name ||
          JSON.stringify(enumSubtype.enumValues) !== JSON.stringify(child.subtypeEnum.values))
      )
        return null
      const compatible =
        child &&
        node.input === (multi ? child.multirangeInput : child.input) &&
        node.output === (multi ? child.multirangeOutput : child.output) &&
        node.send === (multi ? child.multirangeSend : child.send) &&
        node.comparator === (multi ? child.multirangeComparator : child.rangeComparator) &&
        node.equality === (multi ? child.multirangeEquality : child.rangeEquality) &&
        node.hash === (multi ? child.multirangeHash : child.rangeHash) &&
        node.hashExtended === (multi ? child.multirangeHashExtended : child.rangeHashExtended) &&
        node.hashEqualityCompatible ===
          (multi ? child.multirangeHashEqualityCompatible : child.rangeHashEqualityCompatible)
      if (
        child &&
        compatible &&
        (node.kind === 'r' ? child.subtype === node.subtype : child.multirange === node.identity)
      )
        result = node.kind === 'r' ? child.rangeType : child.multirangeType
    } else if (node.kind === 'c')
      result = catalogCompositeType(
        node.identity,
        profile.subtypeCompositeGraph,
        profile.subtypeRanges,
      )
    else if (node.kind === 'e')
      result = rangeEnumType({ schema: node.schema, name: node.name, values: node.enumValues! })
    else {
      const scalar = catalogScalarType(node.identity)
      if (
        scalar &&
        !scalar.startsWith('array:') &&
        !scalar.startsWith('range:') &&
        !scalar.startsWith('multirange:') &&
        !builtinRangeType(scalar) &&
        !builtinMultirangeType(scalar)
      )
        result = scalar
    }
    visiting.delete(identity)
    return result
  }
  for (const node of definitions) if (!build(node.identity, false)) return null
  const root = build(profile.subtype, false)
  return root && rangeContainerKind(root)
    ? (root as ArrayType | CatalogVectorType | RangeType | MultirangeType | CompositeType)
    : null
}

export function rangeArraySubtype(
  profile: Pick<
    RangeTypeInfo,
    'subtype' | 'subtypeDefinitions' | 'subtypeRanges' | 'subtypeCompositeGraph'
  >,
): ArrayType | null {
  const type = rangeContainerSubtype(profile)
  return type?.startsWith('array:') ? (type as ArrayType) : null
}

function projectedRangeDefinition(profile: RangeTypeInfo): RangeTypeInfo {
  const fields: Record<string, unknown> = {}
  for (const key of [...textFields, ...nullableTextFields, ...nullableFlags, ...jsonCategoryFields])
    fields[key] = profile[key]
  if (profile.subtypeEnum) fields['subtypeEnum'] = structuredClone(profile.subtypeEnum)
  if (profile.subtypeDefinitions)
    fields['subtypeDefinitions'] = structuredClone(profile.subtypeDefinitions)
  if (profile.subtypeCompositeGraph) fields['subtypeCompositeGraph'] = profile.subtypeCompositeGraph
  if (profile.subtypeRanges)
    fields['subtypeRanges'] = profile.subtypeRanges.map(projectedRangeDefinition)
  return fields as unknown as RangeTypeInfo
}

function validRangeDefinition(value: unknown): value is RangeTypeInfo {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  const keys = [
    ...textFields,
    ...nullableTextFields,
    ...nullableFlags,
    ...jsonCategoryFields,
    ...['subtypeEnum', 'subtypeDefinitions', 'subtypeRanges', 'subtypeCompositeGraph'].filter(
      (key) => Object.hasOwn(item, key),
    ),
  ]
  if (Object.keys(item).length !== keys.length || keys.some((key) => !Object.hasOwn(item, key)))
    return false
  if (
    textFields.some((key) => !validText(item[key])) ||
    nullableTextFields.some((key) => item[key] !== null && !validText(item[key])) ||
    nullableFlags.some((key) => item[key] !== null && typeof item[key] !== 'boolean') ||
    jsonCategoryFields.some(
      (key) => item[key] !== null && item[key] !== 'output' && item[key] !== 'cast',
    )
  )
    return false
  if (Object.hasOwn(item, 'subtypeEnum') && !validEnumDefinition(item['subtypeEnum'])) return false
  if (Object.hasOwn(item, 'subtypeDefinitions') && !Array.isArray(item['subtypeDefinitions']))
    return false
  return (
    !Object.hasOwn(item, 'subtypeRanges') ||
    (Array.isArray(item['subtypeRanges']) &&
      item['subtypeRanges'].length > 0 &&
      item['subtypeRanges'].every(validRangeDefinition))
  )
}

export function rangeNestedProfile(
  profile: Pick<RangeTypeInfo, 'subtypeRanges' | 'subtypeDefinitions'>,
  identity: string,
): RangeProfile | null {
  for (const child of profile.subtypeRanges ?? []) {
    if (child.identity === identity) {
      if (!validRangeDefinition(projectedRangeDefinition(child))) return null
      const nodes = new Map(profile.subtypeDefinitions?.map((node) => [node.identity, node]))
      let base = nodes.get(child.subtype)
      const seen = new Set<string>()
      while (base?.kind === 'd') {
        if (seen.has(base.identity)) return null
        seen.add(base.identity)
        base = nodes.get(base.base!)
      }
      const scalar = base?.identity ?? child.subtype
      const elementType = Object.hasOwn(subtypeKinds, scalar)
        ? (scalar as RangeSubtype)
        : child.subtypeEnum
          ? rangeEnumType(child.subtypeEnum)
          : rangeContainerSubtype(child)
      if (!elementType) return null
      const builtin = builtinRangeType(child.identity)
      const type = builtin
        ? (child.identity as BuiltinRangeType)
        : capturedRangeType(child, elementType)
      const result = type ? rangeTypeProfile(type) : null
      return result ? { ...result, ...projectedRangeDefinition(child), elementType } : null
    }
    const nested = rangeNestedProfile(child, identity)
    if (nested) return nested
  }
  return null
}

export function rangeSubtypeCarrierIdentity(profile: RangeProfile): string {
  if (!rangeContainerKind(profile.elementType)) return profile.elementType
  const nodes = new Map(profile.subtypeDefinitions!.map((node) => [node.identity, node]))
  let node = nodes.get(profile.subtype)!
  while (node.kind === 'd') node = nodes.get(node.base!)!
  return node.identity
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
        : typeof data['elementType'] === 'string' && rangeContainerKind(data['elementType'])
          ? ['subtypeDefinitions']
          : []),
      ...(Object.hasOwn(data, 'subtypeRanges') ? ['subtypeRanges'] : []),
      ...(Object.hasOwn(data, 'subtypeCompositeGraph') ? ['subtypeCompositeGraph'] : []),
    ]
    if (Object.keys(data).length !== keys.length || keys.some((key) => !Object.hasOwn(data, key)))
      return null
    if (textFields.some((key) => !validText(data[key]))) return null
    if (nullableTextFields.some((key) => data[key] !== null && !validText(data[key]))) return null
    if (nullableFlags.some((key) => data[key] !== null && typeof data[key] !== 'boolean'))
      return null
    if (
      Object.hasOwn(data, 'subtypeRanges') &&
      (!Array.isArray(data['subtypeRanges']) ||
        !data['subtypeRanges'].length ||
        !data['subtypeRanges'].every(validRangeDefinition))
    )
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
          data['elementType'] === rangeEnumType(data['subtypeEnum'])) ||
        (rangeContainerKind(data['elementType']) &&
          rangeContainerSubtype(data as unknown as RangeTypeInfo) === data['elementType'])
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
    if (
      Array.isArray(data['subtypeDefinitions']) &&
      data['subtypeDefinitions'].some(
        (node) => node.identity === data['identity'] || node.identity === data['multirange'],
      )
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
    ) &&
    !(rangeContainerKind(elementType) && rangeContainerSubtype(profile) === elementType)
  )
    return null
  const fields: Record<string, unknown> = { elementType }
  for (const key of [...textFields, ...nullableTextFields, ...nullableFlags, ...jsonCategoryFields])
    fields[key] = profile[key]
  if (elementType.startsWith('enum:')) fields['subtypeEnum'] = profile.subtypeEnum
  if (rangeContainerKind(elementType)) fields['subtypeDefinitions'] = profile.subtypeDefinitions
  if (profile.subtypeCompositeGraph) fields['subtypeCompositeGraph'] = profile.subtypeCompositeGraph
  if (profile.subtypeRanges)
    fields['subtypeRanges'] = profile.subtypeRanges.map(projectedRangeDefinition)
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
  const container = rangeContainerKind(profile.elementType)
  const kind = container
    ? container
    : profile.subtypeEnum
      ? 6
      : subtypeKinds[profile.elementType as keyof typeof subtypeKinds]
  const oidVector =
    profile.elementType === 'pg_catalog.oidvector' &&
    profile.comparator === builtinTypeComparison('pg_catalog.oidvector')?.comparator
  const comparison =
    profile.comparator !== null &&
    profile.comparator ===
      (container === 44
        ? 'function:["pg_catalog","btrecordcmp"](pg_catalog.record,pg_catalog.record)'
        : builtinTypeComparison(
            container
              ? {
                  41: 'pg_catalog.anyarray',
                  42: 'pg_catalog.int4range',
                  43: 'pg_catalog.int4multirange',
                  44: 'pg_catalog.record',
                }[container]
              : profile.subtypeEnum
                ? 'pg_catalog.anyenum'
                : profile.elementType,
          )?.comparator) &&
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
      kind === 48 && comparison === 48 && context.serverEncoding === 'UTF8'
        ? 148
        : kind === 12
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
                  : oidVector
                    ? 441
                    : comparison,
    canonical,
  }
}
