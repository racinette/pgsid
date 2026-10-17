import { nativeHashContext, isArrayHash } from './check-hash-context.js'
import { characterEncodingContext } from './check-character-context.js'
import {
  rustCallCanFail,
  rustArrayCastAlwaysValid,
  rustScalarOwnCanFail,
  rustExpressionCanFail,
  rustExpressionValidityProbes,
} from './check-rust-validity.js'
import { arrayElementFamily } from './check-array-types.js'
import { checkRustEntryName, type CheckConstraintIdentity } from './check-rust-names.js'
import {
  builtinCast,
  builtinMetadata,
  builtinTypeIO,
  builtinTypeComparison,
  builtinTypeResolution,
} from '../../postgres/builtins/inventory.js'
import { checkRustCallableNames } from './check-rust-source.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import type { EvalExpression } from '../../sql-semantics/eval-expressions.js'
import {
  isRegexArrayCallable,
  isIdentifierParseCallable,
  supportsTextCallableCollation,
} from '../../sql-semantics/collation.js'
import { rustStringLiteral } from './rust-literals.js'
import {
  constantCheckExpression,
  constantScalarExpression,
  strictNullPreparation,
  nullifNullPreparation,
  type ConstantPreparation,
} from './check-rust-constants.js'
import {
  enumType,
  capturedEnumSupport,
  catalogScalarType,
  isOidType,
  isOidAliasType,
  isSnapshotType,
  isBinaryTextRelabel,
  isBinaryBitRelabel,
  type EnumDefinition,
} from '../../sql-semantics/expressions.js'

type Input = {
  name: string
  type: string
  rustName: string
  rustType: string
  nullness?: true
  enum?: EnumDefinition
}

const rustValuePrefix = (kind: string): string =>
  kind
    .slice(0, -'Value'.length)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()

const jsonbConversionHelpers = new Map<string, string>(
  (
    [
      [['pg_catalog.bool'], 'bool'],
      [
        ['pg_catalog.int2', 'pg_catalog.int4', 'pg_catalog.int8', 'pg_catalog."numeric"'],
        'numeric',
      ],
      [
        [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
          'pg_catalog.refcursor',
        ],
        'text',
      ],
      [['pg_catalog."json"'], 'json'],
      [['pg_catalog.jsonb'], 'jsonb'],
      [['pg_catalog.jsonpath'], 'jsonpath'],
      [['pg_catalog.float4'], 'float4'],
      [['pg_catalog.float8'], 'float8'],
      [['pg_catalog.uuid'], 'uuid'],
      [['pg_catalog.oid'], 'oid'],
      [['pg_catalog.inet'], 'inet'],
      [['pg_catalog.cidr'], 'cidr'],
      [['pg_catalog.macaddr'], 'macaddr'],
      [['pg_catalog.macaddr8'], 'macaddr8'],
      [['pg_catalog."bit"', 'pg_catalog.varbit'], 'bit'],
      [['pg_catalog."time"'], 'time'],
      [['pg_catalog.timetz'], 'timetz'],
      [['pg_catalog.date'], 'date'],
      [['pg_catalog."timestamp"'], 'timestamp'],
      [['pg_catalog.timestamptz'], 'timestamptz'],
      [['pg_catalog.xid'], 'xid'],
      [['pg_catalog.cid'], 'cid'],
      [['pg_catalog.xid8'], 'xid8'],
      [['pg_catalog.pg_lsn'], 'pg_lsn'],
      [['pg_catalog.tid'], 'tid'],
      [['pg_catalog.pg_snapshot', 'pg_catalog.txid_snapshot'], 'snapshot'],
      [['pg_catalog."char"'], 'internal_char'],
      [
        [
          'pg_catalog.regclass',
          'pg_catalog.regcollation',
          'pg_catalog.regconfig',
          'pg_catalog.regdictionary',
          'pg_catalog.regnamespace',
          'pg_catalog.regproc',
          'pg_catalog.regprocedure',
          'pg_catalog.regrole',
          'pg_catalog.regtype',
        ],
        'oid_alias',
      ],
      [['pg_catalog.regoper', 'pg_catalog.regoperator'], 'operator_alias'],
      [['pg_catalog.bytea'], 'bytea'],
      [['pg_catalog.money'], 'money'],
      [['pg_catalog."interval"'], 'interval'],
      [['pg_catalog.point'], 'point'],
      [['pg_catalog.line'], 'line'],
      [['pg_catalog.lseg'], 'lseg'],
      [['pg_catalog.box'], 'box'],
      [['pg_catalog.circle'], 'circle'],
      [['pg_catalog.path'], 'path'],
      [['pg_catalog.polygon'], 'polygon'],
    ] as const
  ).flatMap(([types, suffix]) =>
    types.map((type) => [type, 'jsonb_input_from_' + suffix] as const),
  ),
)

export const jsonbConversionHelper = (type: string): string | undefined =>
  type.startsWith('enum:') ? 'jsonb_input_from_enum' : jsonbConversionHelpers.get(type)

export const supportsJsonbConversion = (type: string): boolean =>
  type.startsWith('array:')
    ? arrayElementFamily(type.slice(6)) !== null &&
      jsonbConversionHelper(type.slice(6)) !== undefined
    : jsonbConversionHelper(type) !== undefined

export const isJsonConversion = (
  item: ReturnType<typeof builtinMetadata>,
): item is ReturnType<typeof builtinMetadata> & {
  kind: 'function'
  name: 'to_json' | 'array_to_json'
} =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.result === 'pg_catalog."json"' &&
  item.strict &&
  !item.returnsSet &&
  item.volatility === 's' &&
  ((item.name === 'to_json' && item.args.join(',') === 'pg_catalog.anyelement') ||
    (item.name === 'array_to_json' &&
      ['pg_catalog.anyarray', 'pg_catalog.anyarray,pg_catalog.bool'].includes(item.args.join(','))))

export const isJsonbBuilder = (
  item: ReturnType<typeof builtinMetadata>,
): item is ReturnType<typeof builtinMetadata> & {
  kind: 'function'
  name: 'jsonb_build_array' | 'jsonb_build_object'
} =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  ['jsonb_build_array', 'jsonb_build_object'].includes(item.name) &&
  item.result === 'pg_catalog.jsonb' &&
  !item.strict &&
  !item.returnsSet &&
  item.volatility === 's' &&
  ((item.args.length === 0 && item.variadic === null) ||
    (item.args.length === 1 &&
      item.args[0] === 'pg_catalog."any"' &&
      item.variadic === 'pg_catalog."any"'))

export const isJsonBuilder = (
  item: ReturnType<typeof builtinMetadata>,
): item is ReturnType<typeof builtinMetadata> & {
  kind: 'function'
  name: 'json_build_array' | 'json_build_object'
} =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  ['json_build_array', 'json_build_object'].includes(item.name) &&
  item.result === 'pg_catalog."json"' &&
  !item.strict &&
  !item.returnsSet &&
  item.volatility === 's' &&
  ((item.args.length === 0 && item.variadic === null) ||
    (item.args.length === 1 &&
      item.args[0] === 'pg_catalog."any"' &&
      item.variadic === 'pg_catalog."any"'))

export class UnsupportedCheckRustExpression extends Error {}

export const isJsonbSetLax = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'jsonb_set_lax' &&
  item.args.join(',') ===
    'pg_catalog.jsonb,pg_catalog._text,pg_catalog.jsonb,pg_catalog.bool,pg_catalog.text' &&
  item.result === 'pg_catalog.jsonb' &&
  !item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet

const arrayElementOutput = (
  elementType: string,
  definition: EnumDefinition | undefined,
  element: string,
  scalar: string,
): { prefix: string; conversion: string; scalarRequired: boolean } => {
  const family = arrayElementFamily(elementType)
  if (family === null)
    throw new UnsupportedCheckRustExpression('Missing array output element carrier')
  const elementOutput = definition?.outputFunction ?? builtinTypeIO(elementType)?.output
  const metadata = elementOutput ? builtinMetadata(elementOutput) : null
  if (
    !metadata ||
    metadata.kind !== 'function' ||
    !metadata.strict ||
    metadata.returnsSet ||
    metadata.args.length !== 1 ||
    metadata.args[0] !==
      (definition
        ? 'pg_catalog.anyenum'
        : elementType === 'pg_catalog.refcursor' &&
            elementOutput === builtinTypeIO('pg_catalog.text')?.output
          ? 'pg_catalog.text'
          : elementType) ||
    metadata.result !== 'pg_catalog.cstring' ||
    (definition && enumType(definition) !== elementType)
  )
    throw new UnsupportedCheckRustExpression('Array output requires its element catalog identity')
  const prefix = rustValuePrefix(rustType(elementType))
  let conversion: string | null = null
  if (family <= 3) conversion = `${prefix}_to_text(${scalar})`
  else if (family === 6) {
    if (!definition || definition.values.some((label) => label.includes('\0')))
      throw new UnsupportedCheckRustExpression('Array enum output requires captured labels')
    conversion = `enum_to_text(${scalar}, ${rustStringLiteral(definition.values.join('\0'))}, ${definition.values.length})`
  } else if (family === 8) conversion = scalar
  else if (family === 9) conversion = `array_boolean_output(${scalar})`
  else if (family === 10) conversion = `array_numeric_output(${scalar})`
  else if ([11, 12, 14, 16, 17, 18, 34, 35, 37, 38, 39, 40].includes(family))
    conversion = `${prefix}_to_text(${scalar})`
  else if (family === 13)
    conversion = `array_network_output(${scalar}, ${elementType === 'pg_catalog.cidr'})`
  else if (family === 19 || family === 20) conversion = `array_${prefix}_output(${scalar})`
  else if (family === 21 || family === 22) conversion = `clock_${prefix}_to_text(${scalar})`
  else if (family === 32) {
    const cast = builtinCast(elementType, 'pg_catalog.text')
    if (!cast?.implementation)
      throw new UnsupportedCheckRustExpression(
        'Internal char output requires its catalog conversion',
      )
    const implementation = builtinMetadata(cast.implementation)
    if (implementation.kind !== 'function')
      throw new UnsupportedCheckRustExpression('Internal char output requires a catalog function')
    conversion = `${implementation.rustName}(${scalar})`
  } else if (family === 33)
    conversion = isOidAliasType(elementType)
      ? `oid_alias_to_text(${scalar}, ${!['pg_catalog.regoper', 'pg_catalog.regoperator'].includes(elementType)})`
      : `oid_to_text(${scalar})`
  else if (family === 36) conversion = `snapshot_to_text(${scalar})`
  return {
    prefix,
    conversion: conversion ?? `array_contextual_output(${element})`,
    scalarRequired: conversion !== null,
  }
}

export const isArrayStringIO = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  !item.returnsSet &&
  [2, 3].includes(item.args.length) &&
  item.args.slice(1).every((type) => type === 'pg_catalog.text') &&
  ((item.name === 'string_to_array' &&
    item.args[0] === 'pg_catalog.text' &&
    item.result === 'pg_catalog._text' &&
    !item.strict &&
    item.volatility === 'i') ||
    (item.name === 'array_to_string' &&
      item.args[0] === 'pg_catalog.anyarray' &&
      item.result === 'pg_catalog.text' &&
      item.strict === (item.args.length === 2) &&
      item.volatility === 's'))

export const isArrayComparison = (
  item: ReturnType<typeof builtinMetadata>,
): item is ReturnType<typeof builtinMetadata> & { kind: 'function' } =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.args.length === 2 &&
  item.args.every((type) => type === 'pg_catalog.anyarray') &&
  (item.name === 'btarraycmp'
    ? item.result === 'pg_catalog.int4'
    : [
        'array_eq',
        'array_ne',
        'array_lt',
        'array_le',
        'array_gt',
        'array_ge',
        'arraycontains',
        'arraycontained',
        'arrayoverlap',
      ].includes(item.name) && item.result === 'pg_catalog.bool')

const isArrayExtremum = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  ['array_larger', 'array_smaller'].includes(item.name) &&
  item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.args.length === 2 &&
  item.args.every((type) => type === 'pg_catalog.anyarray') &&
  item.result === 'pg_catalog.anyarray'

const isArrayBucket = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'width_bucket' &&
  item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.args.length === 2 &&
  item.args[0] === 'pg_catalog.anycompatible' &&
  item.args[1] === 'pg_catalog.anycompatiblearray' &&
  item.result === 'pg_catalog.int4'

export const isArraySearch = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  !item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.args[0] === 'pg_catalog.anycompatiblearray' &&
  item.args[1] === 'pg_catalog.anycompatible' &&
  ((item.name === 'array_position' &&
    item.result === 'pg_catalog.int4' &&
    (item.args.length === 2 || (item.args.length === 3 && item.args[2] === 'pg_catalog.int4'))) ||
    (item.name === 'array_positions' &&
      item.result === 'pg_catalog._int4' &&
      item.args.length === 2))

export const isArrayFill = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'array_fill' &&
  !item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.result === 'pg_catalog.anyarray' &&
  item.args[0] === 'pg_catalog.anyelement' &&
  (item.args.length === 2 || item.args.length === 3) &&
  item.args.slice(1).every((type) => type === 'pg_catalog._int4')

export const isArrayTrim = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'trim_array' &&
  item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.result === 'pg_catalog.anyarray' &&
  item.args.length === 2 &&
  item.args[0] === 'pg_catalog.anyarray' &&
  item.args[1] === 'pg_catalog.int4'

export const isArrayBinarySend = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'array_send' &&
  item.strict &&
  item.volatility === 's' &&
  !item.returnsSet &&
  item.args.length === 1 &&
  item.args[0] === 'pg_catalog.anyarray' &&
  item.result === 'pg_catalog.bytea'

const isArraySort = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'array_sort' &&
  item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  [1, 2, 3].includes(item.args.length) &&
  item.args[0] === 'pg_catalog.anyarray' &&
  item.args.slice(1).every((type) => type === 'pg_catalog.bool') &&
  item.result === 'pg_catalog.anyarray'

const isArrayReverse = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'array_reverse' &&
  item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.args.length === 1 &&
  item.args[0] === 'pg_catalog.anyarray' &&
  item.result === 'pg_catalog.anyarray'

export const isArrayRewrite = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  !item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.result === 'pg_catalog.anycompatiblearray' &&
  item.args[0] === 'pg_catalog.anycompatiblearray' &&
  item.args[1] === 'pg_catalog.anycompatible' &&
  ((item.name === 'array_remove' && item.args.length === 2) ||
    (item.name === 'array_replace' &&
      item.args.length === 3 &&
      item.args[2] === 'pg_catalog.anycompatible'))

export const isArrayTransform = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  !item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.result === 'pg_catalog.anycompatiblearray' &&
  item.args.length === 2 &&
  (item.name === 'array_cat'
    ? item.args.every((type) => type === 'pg_catalog.anycompatiblearray')
    : item.name === 'array_append'
      ? item.args[0] === 'pg_catalog.anycompatiblearray' &&
        item.args[1] === 'pg_catalog.anycompatible'
      : item.name === 'array_prepend' &&
        item.args[0] === 'pg_catalog.anycompatible' &&
        item.args[1] === 'pg_catalog.anycompatiblearray')

export const isJsonpathTimezoneCallable = (
  item: ReturnType<typeof builtinMetadata>,
): item is ReturnType<typeof builtinMetadata> & { kind: 'function' } =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  [
    'jsonb_path_exists_tz',
    'jsonb_path_match_tz',
    'jsonb_path_query_array_tz',
    'jsonb_path_query_first_tz',
  ].includes(item.name) &&
  item.volatility === 's' &&
  item.strict &&
  !item.returnsSet &&
  item.args.join(',') === 'pg_catalog.jsonb,pg_catalog.jsonpath,pg_catalog.jsonb,pg_catalog.bool'

const rustType = (type: string): string => {
  if (type === 'pg_catalog."json"') return 'JsonValue'
  if (type === 'pg_catalog.jsonb') return 'JsonbValue'
  if (type === 'pg_catalog.jsonpath') return 'JsonpathValue'
  if (type.startsWith('array:')) return 'ArrayValue'
  if (type === 'pg_catalog."bit"' || type === 'pg_catalog.varbit') return 'BitValue'
  if (type === 'pg_catalog.uuid') return 'UuidValue'
  if (type === 'pg_catalog.bytea') return 'ByteaValue'
  if (type === 'pg_catalog.macaddr') return 'MacaddrValue'
  if (type === 'pg_catalog.macaddr8') return 'Macaddr8Value'
  if (type === 'pg_catalog.int2') return 'Int2Value'
  if (type === 'pg_catalog.inet' || type === 'pg_catalog.cidr') return 'NetworkValue'
  if (type === 'pg_catalog.int4') return 'Int4Value'
  if (type === 'pg_catalog.int8') return 'Int8Value'
  if (type === 'pg_catalog.float4') return 'Float4Value'
  if (type === 'pg_catalog.float8') return 'Float8Value'
  if (type === 'pg_catalog.point') return 'PointValue'
  if (type === 'pg_catalog.line') return 'LineValue'
  if (type === 'pg_catalog.lseg') return 'LsegValue'
  if (type === 'pg_catalog.money') return 'MoneyValue'
  if (type === 'pg_catalog.xid') return 'XidValue'
  if (type === 'pg_catalog.cid') return 'CidValue'
  if (type === 'pg_catalog.pg_lsn') return 'PgLsnValue'
  if (type === 'pg_catalog."char"') return 'InternalCharValue'
  if (type === 'pg_catalog.tid') return 'TidValue'
  if (type === 'pg_catalog.xid8') return 'Xid8Value'
  if (isSnapshotType(type)) return 'SnapshotValue'
  if (isOidType(type)) return 'OidValue'
  if (type === 'pg_catalog.polygon') return 'PolygonValue'
  if (type === 'pg_catalog.path') return 'PathValue'
  if (type === 'pg_catalog.circle') return 'CircleValue'
  if (type === 'pg_catalog.box') return 'BoxValue'
  if (type === 'pg_catalog."numeric"') return 'NumericValue'
  if (type === 'pg_catalog."time"') return 'TimeValue'
  if (type === 'pg_catalog.timetz') return 'TimetzValue'
  if (type === 'pg_catalog."interval"') return 'IntervalValue'
  if (type === 'pg_catalog.date') return 'DateValue'
  if (type === 'pg_catalog."timestamp"') return 'TimestampValue'
  if (type === 'pg_catalog.timestamptz') return 'TimestamptzValue'
  if (
    [
      'pg_catalog.refcursor',
      'pg_catalog.name',
      'pg_catalog.text',
      'pg_catalog."varchar"',
      'pg_catalog.bpchar',
    ].includes(type)
  )
    return 'TextValue'
  if (type === 'pg_catalog.bool') return 'BoolValue'
  if (type.startsWith('enum:')) return 'EnumValue'
  throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK input type: ${type}`)
}

export type CheckExecutionContext = {
  defaultCollation?: 'C'
  defaultCtype?: 'C' | 'C.UTF-8'
  serverEncoding?: 'UTF8'
  nativeByteOrder?: 'little' | 'big'
  arrayNulls?: boolean
}

export function emitCheckRustEvaluator(
  expression: EvalBoolExpression,
  identity?: CheckConstraintIdentity,
  executionContext: CheckExecutionContext = {},
): {
  source: string
  entryName: string
  inputs: readonly Input[]
  callables: readonly string[]
  requiresRegex: boolean
} {
  const inputs = new Map<string, Input>()
  const callables = new Set<string>()
  let next = 0
  let requiresRegex = false
  const entryName = identity ? checkRustEntryName(identity) : 'evaluate_check'
  const fresh = (prefix: string): string => `${prefix}_${next++}`
  const indent = (lines: readonly string[]): string[] => lines.map((line) => `    ${line}`)
  const constantDeclarations: string[] = []
  const constantLines: string[] = []
  const literalLines: string[] = []
  let valueLiteralDepth = 0
  let preparationLines = constantLines
  const preparationState = 'constant_preparation'
  let preparationDepth = 0
  let constantOperandDepth = 0
  let arrayValidityScope: string | null = null
  const capturePreparation = <T>(emit: () => T): { value: T; lines: string[] } => {
    const outer = preparationLines
    const lines: string[] = []
    preparationLines = lines
    try {
      return { value: emit(), lines }
    } finally {
      preparationLines = outer
    }
  }
  const preparedGuard = (lines: readonly string[], name: string): string => {
    const guard = fresh('prepared_guard')
    constantDeclarations.push(`let mut ${guard}: CheckOutcome = check_unknown();`)
    preparationLines.push(
      ...lines,
      `${guard} = ${name};`,
      `${preparationState} = constant_finish(${preparationState}, ${guard});`,
    )
    return guard
  }
  const prepareBranches = (
    constant: boolean,
    lines: readonly string[],
    guardName: string,
    selected: readonly string[],
    otherwise: readonly string[],
  ): string | null => {
    if (!selected.length && !otherwise.length) return null
    if (!constant) {
      preparationLines.push(...selected, ...otherwise)
      return null
    }
    const guard = preparedGuard(lines, guardName)
    preparationLines.push(
      `if case_guard_stops(${guard}) == false {`,
      `    if case_guard_takes(${guard}) {`,
      ...indent(indent(selected)),
      '    } else {',
      ...indent(indent(otherwise)),
      '    };',
      '};',
    )
    return guard
  }
  const input = (
    name: string,
    type: string,
    nullness = false,
    definition?: EnumDefinition,
  ): Input => {
    if (type.startsWith('enum:') && !nullness && (!definition || enumType(definition) !== type))
      throw new UnsupportedCheckRustExpression(`Missing Rust CHECK enum definition: ${name}`)
    const key = JSON.stringify([name, nullness])
    const existing = inputs.get(key)
    if (existing) {
      if (existing.type !== type) throw new Error(`Conflicting CHECK input type: ${name}`)
      return existing
    }
    const baseName = /^[a-z][a-z0-9_]*$/u.test(name) ? `input_${name}` : `input_${inputs.size}`
    const preferred = nullness ? `${baseName}_nullness` : baseName
    let rustName = preferred
    let suffix = 0
    while (
      [...inputs.values()].some(
        (item) => item.rustName.replaceAll('_', '') === rustName.replaceAll('_', ''),
      )
    )
      rustName = `${preferred}_${++suffix}`
    const result: Input = {
      name,
      type,
      rustName,
      rustType: nullness ? 'BoolValue' : rustType(type),
      ...(nullness ? { nullness: true } : {}),
      ...(definition ? { enum: definition } : {}),
    }
    inputs.set(key, result)
    return result
  }
  const ordered = (names: ReadonlySet<string>): Input[] =>
    [...inputs.values()].filter((item) => names.has(item.name))
  const parameters = (names: ReadonlySet<string>): string =>
    ordered(names)
      .map((item) => `${item.rustName}: ${item.rustType}`)
      .join(', ')
  const ownedOperand = (operand: { name: string; type: string }): string =>
    [
      'JsonValue',
      'JsonbValue',
      'JsonpathValue',
      'ArrayValue',
      'SnapshotValue',
      'PolygonValue',
      'PathValue',
      'TextValue',
      'ByteaValue',
      'BitValue',
      'NumericValue',
    ].includes(rustType(operand.type))
      ? `${operand.name}.clone()`
      : operand.name
  const scalarType = (operand: EvalExpression): string =>
    operand.kind === 'certain'
      ? operand.expression.type
      : operand.kind === 'call'
        ? operand.call.type
        : operand.kind === 'regex-count'
          ? 'pg_catalog.int4'
          : operand.type

  const appendArrayValidity = (
    value: { name: string; type: string },
    unknownValid: boolean,
    destination: string[],
  ): void => {
    if (arrayValidityScope === null || preparationDepth > 0 || valueLiteralDepth > 0) return
    const nullness = fresh('array_value_nullness'),
      state = fresh('array_value_validity')
    destination.push(
      `let ${nullness} = ${rustValuePrefix(rustType(value.type))}_is_null(${ownedOperand(value)});`,
      `let ${state} = array_value_validity(${nullness}, ${unknownValid});`,
      `${arrayValidityScope} = array_validity_finish(${arrayValidityScope}, ${state});`,
    )
  }
  const unresolvedArrayChoice = (
    guard: string,
    nodes: readonly unknown[],
    destination: string[],
    used: Set<string>,
  ): void => {
    if (arrayValidityScope === null || preparationDepth > 0 || valueLiteralDepth > 0) return
    const lines: string[] = []
    const initial = fresh('array_choice_start'),
      potential = fresh('array_choice_potential')
    lines.push(
      `let ${initial} = make_bool_value(true);`,
      `let mut ${potential}: CheckOutcome = check_from_bool(${initial});`,
    )
    for (const probe of rustExpressionValidityProbes(nodes, executionContext)) {
      if (probe.kind === 'uncertain') {
        lines.push(`${potential} = check_unknown();`)
        continue
      }
      if (constantScalarExpression(probe)) continue
      const outer: string | null = arrayValidityScope
      arrayValidityScope = null
      let value: { name: string; type: string }
      try {
        value = emitScalar(probe, lines, used)
      } finally {
        arrayValidityScope = outer
      }
      const nullness = fresh('array_choice_nullness'),
        state = fresh('array_choice_input')
      lines.push(
        `let ${nullness} = ${rustValuePrefix(rustType(value.type))}_is_null(${ownedOperand(value)});`,
        `let ${state} = array_value_validity(${nullness}, ${!rustScalarOwnCanFail(probe, executionContext)});`,
        `${potential} = array_validity_finish(${potential}, ${state});`,
      )
    }
    const possible = fresh('array_choice_possible')
    lines.push(
      `let ${possible} = array_validity_possible(${potential});`,
      `${arrayValidityScope} = array_validity_finish(${arrayValidityScope}, ${possible});`,
    )
    destination.push(`if array_validity_unknown(${guard}) {`, ...indent(lines), '}')
  }

  const renderArrayOutput = (
    payload: string,
    elementType: string,
    definition: EnumDefinition | undefined,
    destination: string[],
  ): string => {
    const builder = fresh('array_builder'),
      index = fresh('array_index')
    const element = fresh('array_element'),
      scalar = fresh('array_scalar')
    const rendered = fresh('array_rendered'),
      converted = fresh('array_converted')
    const { prefix, conversion, scalarRequired } = arrayElementOutput(
      elementType,
      definition,
      element,
      scalar,
    )
    const initial = fresh('array_initial'),
      first = fresh('array_first')
    destination.push(
      `let ${initial} = make_array_conversion();`,
      `let ${first} = make_int4_value(0);`,
      `let mut ${builder}: ArrayOutputPayload = ${initial};`,
      `let mut ${index}: Int4Value = ${first};`,
      `while array_output_has_element(&${payload}, ${index}) {`,
      `    let ${element} = array_output_element_at(&${payload}, ${index});`,
    )
    if (scalarRequired)
      destination.push(`    let ${scalar} = array_element_to_${prefix}(${element});`)
    destination.push(
      `    let ${rendered} = ${conversion};`,
      `    let ${converted} = array_element_from_text(${rendered});`,
      `    ${builder} = append_array_conversion(${builder}, ${converted}, true);`,
      `    ${index} = array_text_next_index(${index});`,
      '}',
    )
    const arguments_ = fresh('array_output_arguments')
    destination.push(
      `let ${arguments_} = array_conversion_arguments(${builder}, "pg_catalog.text", 8);`,
    )
    return arguments_
  }

  const renderArrayInputElement = (
    elementType: string,
    definition: EnumDefinition | undefined,
    event: string,
    stored: boolean,
    destination: string[],
    moneyLiterals?: readonly { text: string; units: string }[],
    declaredEncoding = false,
  ): string => {
    const family = arrayElementFamily(elementType)
    if (family === null)
      throw new UnsupportedCheckRustExpression('Missing array input element carrier')
    const prefix = rustValuePrefix(rustType(elementType))
    const element = fresh('array_input_element')
    if (family <= 3) {
      destination.push(`let ${element} = array_integer_text_element(${event}, ${family});`)
      return element
    }
    let scalar: string
    if (family === 6)
      scalar = `scalar_enum_from_text(${event}, ${rustStringLiteral(definition!.values.join('\0'))}, ${definition!.values.length})`
    else if (family === 8)
      scalar = elementType === 'pg_catalog.name' && !stored ? `name_from_text(${event})` : event
    else if (family === 9) scalar = `scalar_boolean_from_text(${event})`
    else if (family === 10) scalar = `scalar_numeric_from_text(${event})`
    else if (family === 13)
      scalar = `${elementType === 'pg_catalog.cidr' ? 'cidr' : 'network'}_from_text(${event})`
    else if (family === 33 && isOidAliasType(elementType)) {
      const dash = !['pg_catalog.regoper', 'pg_catalog.regoperator'].includes(elementType)
      const grammar =
        elementType === 'pg_catalog.regtype'
          ? 2
          : ['pg_catalog.regprocedure', 'pg_catalog.regoperator'].includes(elementType)
            ? 1
            : 0
      scalar = `oid_alias_from_text(${event}, ${dash}, ${grammar})`
    } else if (family === 31 && stored && moneyLiterals?.length) {
      scalar = `money_from_captured_text(${event}, ${rustStringLiteral(moneyLiterals.map((value) => value.text).join('\0'))}, ${rustStringLiteral(moneyLiterals.map((value) => value.units).join('\0'))}, ${moneyLiterals.length})`
    } else if (family === 40) {
      if (!stored) requiresRegex = true
      scalar = stored
        ? `jsonpath_from_stored_text(${event})`
        : `jsonpath_from_text(${event}, ${executionContext.defaultCollation === 'C'}, ${executionContext.serverEncoding === 'UTF8'})`
    } else scalar = `${prefix}_from_text(${event})`

    if (declaredEncoding && family === 12)
      scalar = `jsonb_from_text_context(${event}, ${executionContext.serverEncoding === 'UTF8'})`
    const value = fresh('array_input_scalar')
    destination.push(
      `let ${value} = ${scalar};`,
      `let ${element} = array_element_from_${prefix}(${value});`,
    )
    return element
  }

  const emitScalar = (
    node: EvalExpression,
    bindings: string[],
    used: Set<string>,
  ): { name: string; type: string } => {
    const outer: string | null = arrayValidityScope
    if (outer !== null && constantScalarExpression(node)) arrayValidityScope = null
    try {
      return emitScalarWithValidity(node, bindings, used)
    } finally {
      arrayValidityScope = outer
    }
  }
  const emitScalarWithValidity = (
    node: EvalExpression,
    bindings: string[],
    used: Set<string>,
  ): { name: string; type: string } => {
    if (
      valueLiteralDepth === 0 &&
      (node.kind === 'interval-literal' ||
        node.kind === 'array-text-literal' ||
        (node.kind === 'text-to-numeric' && node.literal === true) ||
        (node.kind === 'text-to-integer' && node.literal === true) ||
        (node.kind === 'certain' &&
          (node.expression.kind === 'point' ||
            node.expression.kind === 'json' ||
            node.expression.kind === 'jsonb' ||
            node.expression.kind === 'jsonpath' ||
            (node.expression.kind === 'temporal' &&
              (node.expression.type === 'pg_catalog."interval"' ||
                node.expression.type === 'pg_catalog."time"' ||
                node.expression.type === 'pg_catalog.timetz'))) &&
          node.expression.value !== null))
    ) {
      valueLiteralDepth++
      preparationDepth++
      let value: { name: string; type: string }
      try {
        value = emitScalar(node, literalLines, used)
      } finally {
        preparationDepth--
        valueLiteralDepth--
      }
      const prefix = rustValuePrefix(rustType(value.type))
      const name = fresh(`${prefix}_literal`)
      constantDeclarations.push(`let mut ${name}: ${rustType(value.type)} = ${prefix}_unknown();`)
      literalLines.push(`${name} = ${value.name};`)
      return { name, type: value.type }
    }
    const callable =
      node.kind === 'call' && node.call.signature !== null
        ? builtinMetadata(node.call.signature)
        : null
    const implementation =
      callable?.kind === 'operator' ? builtinMetadata(callable.implementation) : callable
    if (
      (constantOperandDepth > 0 ||
        node.kind === 'array-quantifier' ||
        (implementation !== null &&
          (isArrayComparison(implementation) ||
            isArrayExtremum(implementation) ||
            isArrayBucket(implementation) ||
            isArrayHash(implementation)))) &&
      preparationDepth === 0 &&
      node.kind !== 'certain' &&
      constantScalarExpression(node)
    ) {
      preparationDepth++
      let value: { name: string; type: string }
      try {
        value = emitScalar(node, preparationLines, used)
      } finally {
        preparationDepth--
      }
      const kind = rustType(value.type)
      const prefix = rustValuePrefix(kind)
      const name = fresh('prepared_operand')
      constantDeclarations.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
      preparationLines.push(`${name} = ${ownedOperand(value)};`)
      return { name, type: value.type }
    }
    let value: { name: string; type: string }
    if (
      node.kind === 'call' &&
      implementation?.kind === 'function' &&
      implementation.schema === 'pg_catalog' &&
      (((implementation.name === 'int4_avg_combine' ||
        ['int2_avg_accum', 'int2_avg_accum_inv', 'int4_avg_accum', 'int4_avg_accum_inv'].includes(
          implementation.name,
        )) &&
        implementation.args.length === 2 &&
        implementation.args[0] === 'pg_catalog._int8' &&
        ['pg_catalog._int8', 'pg_catalog.int2', 'pg_catalog.int4'].includes(
          implementation.args[1]!,
        ) &&
        implementation.result === 'pg_catalog._int8') ||
        ([
          'float4_accum',
          'float8_accum',
          'float8_regr_accum',
          'float8_combine',
          'float8_regr_combine',
        ].includes(implementation.name) &&
          implementation.args[0] === 'pg_catalog._float8' &&
          implementation.result === 'pg_catalog._float8'))
    ) {
      const initial = fresh('aggregate_argument_valid'),
        validity = fresh('aggregate_argument_validity')
      bindings.push(
        `let ${initial} = make_bool_value(true);`,
        `let mut ${validity}: CheckOutcome = check_from_bool(${initial});`,
      )
      const outer: string | null = arrayValidityScope
      arrayValidityScope = validity
      let result: { name: string; type: string }
      try {
        result = emitScalarInner(node, bindings, used)
      } finally {
        arrayValidityScope = outer
      }
      const name = fresh('aggregate_context_result')
      bindings.push(
        `let ${name} = array_constructor_from_validity(${ownedOperand(result)}, ${validity});`,
      )
      if (outer !== null) bindings.push(`${outer} = array_validity_finish(${outer}, ${validity});`)
      value = { name, type: result.type }
    } else value = emitScalarInner(node, bindings, used)
    appendArrayValidity(
      value,
      node.kind === 'call'
        ? true
        : node.kind !== 'array-constructor' && !rustScalarOwnCanFail(node, executionContext),
      bindings,
    )
    if (preparationDepth > 0) {
      const prefix = rustValuePrefix(rustType(value.type))
      const nullness = fresh('prepared_value_nullness')
      const state = fresh('prepared_value_state')
      bindings.push(
        `let ${nullness} = ${prefix}_is_null(${ownedOperand(value)});`,
        `let ${state} = array_value_validity(${nullness}, ${node.kind !== 'certain' && valueLiteralDepth === 0 && !rustScalarOwnCanFail(node, executionContext)});`,
        `${preparationState} = constant_finish(${preparationState}, ${state});`,
      )
    }
    return value
  }
  const emitPreparedOperand = (
    node: EvalExpression,
    bindings: string[],
    used: Set<string>,
  ): { name: string; type: string } => {
    constantOperandDepth++
    try {
      return emitScalar(node, bindings, used)
    } finally {
      constantOperandDepth--
    }
  }
  const emitScalarInner = (
    node: EvalExpression,
    bindings: string[],
    used: Set<string>,
  ): { name: string; type: string } => {
    const bind = (call: string): string => {
      const name = fresh('value')
      bindings.push(`let ${name} = ${call};`)
      return name
    }
    if (node.kind === 'array-subscript') {
      const operand = emitScalar(node.operand, bindings, used)
      const family = arrayElementFamily(node.elementType)
      if (
        family === null ||
        operand.type !== 'array:' + node.elementType ||
        node.upper.length === 0 ||
        node.upper.length > 6 ||
        node.lower.length !== (node.slice ? node.upper.length : 0) ||
        node.type !== (node.slice ? operand.type : node.elementType) ||
        (!node.slice && node.upper.some((bound) => bound === null))
      )
        throw new UnsupportedCheckRustExpression(
          'Array subscripts require matching concrete array and integer bounds',
        )
      const prefix = rustValuePrefix(rustType(node.type))
      const initial = node.slice
        ? operand.name
        : bind(`array_subscript_initial(${ownedOperand(operand)})`)
      const first = node.slice ? `${initial}.clone()` : `array_element_to_${prefix}(${initial})`
      const result = fresh('array_subscript_result')
      bindings.push(`let mut ${result}: ${rustType(node.type)} = ${first};`)
      const inner: string[] = []
      const call = (expression: string): string => {
        const name = fresh('array_bound')
        inner.push(`let ${name} = ${expression};`)
        return name
      }
      let builder = call('make_array_subscripts()')
      const omitted =
        node.upper.includes(null) || node.lower.includes(null) ? call('make_int4_value(0)') : ''
      for (const [lower, bounds] of [
        [false, node.upper],
        [true, node.lower],
      ] as const)
        for (const bound of bounds) {
          const destination =
            bound && preparationDepth > 0 && constantScalarExpression(bound) ? bindings : inner
          const value = bound
            ? emitPreparedOperand(bound, destination, used)
            : { name: omitted, type: 'pg_catalog.int4' }
          if (value.type !== 'pg_catalog.int4')
            throw new UnsupportedCheckRustExpression('Array bound must be SQL-coerced to int4')
          builder = call(
            `append_array_subscript(${builder}, ${value.name}, ${lower}, ${bound !== null})`,
          )
        }
      if (node.slice)
        inner.push(`${result} = array_slice_subscript(${ownedOperand(operand)}, ${builder});`)
      else {
        const element = call(`array_fetch_subscript(${ownedOperand(operand)}, ${builder})`)
        inner.push(`${result} = array_element_to_${prefix}(${element});`)
      }
      bindings.push(
        `if array_subscript_continues(${ownedOperand(operand)}) {`,
        ...indent(inner),
        '};',
      )
      return { name: result, type: node.type }
    }
    if (node.kind === 'array-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      const family = arrayElementFamily(node.elementType)
      const output = builtinMetadata(node.output)
      if (
        operand.type !== 'array:' + node.elementType ||
        family === null ||
        output.kind !== 'function' ||
        output.schema !== 'pg_catalog' ||
        output.name !== 'array_out' ||
        !output.strict ||
        output.returnsSet ||
        output.args.length !== 1 ||
        output.args[0] !== 'pg_catalog.anyarray' ||
        output.result !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression('Array output requires its catalog I/O identity')
      const payload = bind(`prepare_array_output(${ownedOperand(operand)})`)
      const builder = renderArrayOutput(payload, node.elementType, node.enum, bindings)
      return {
        name: bind(`finish_array_output(${payload}, ${builder}, ${family === 27})`),
        type: node.type,
      }
    }

    if (node.kind === 'array-typmod') {
      const conversion = builtinCast(node.elementType, node.elementType)
      if (conversion?.method !== 'f' || !conversion.implementation)
        throw new UnsupportedCheckRustExpression(
          'Array precision requires its element catalog cast',
        )
      const operand = emitScalar(node.operand, bindings, used)
      if (
        operand.type !== node.type ||
        !Number.isInteger(node.modifier) ||
        node.modifier < 0 ||
        node.modifier > 2147483647
      )
        throw new UnsupportedCheckRustExpression(
          'Array precision requires a matching typed array and int4 modifier',
        )
      return {
        name: bind(`array_with_typmod(${ownedOperand(operand)}, ${node.modifier})`),
        type: node.type,
      }
    }
    if (node.kind === 'array-text-literal' || node.kind === 'text-to-array') {
      const family = arrayElementFamily(node.elementType)
      const input = node.elementType.startsWith('enum:')
        ? null
        : builtinTypeIO(node.elementType)?.input
      if (
        family === null ||
        (!node.elementType.startsWith('enum:') &&
          (!input || builtinMetadata(input).args[0] !== 'pg_catalog.cstring'))
      )
        throw new UnsupportedCheckRustExpression(
          'Array input requires its catalog element I/O identity',
        )
      if (family === 6 && (!node.enum || enumType(node.enum) !== node.elementType))
        throw new UnsupportedCheckRustExpression('Array enum input requires captured labels')
      const operand =
        node.kind === 'array-text-literal'
          ? {
              name: bind(`make_text_value(${rustStringLiteral(node.value)})`),
              type: 'pg_catalog.text',
            }
          : emitScalar(node.operand, bindings, used)
      if (
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type)
      )
        throw new UnsupportedCheckRustExpression('Array input requires a character value')
      const stored = node.kind === 'array-text-literal' && node.origin === 'stored'
      const nulls = stored
        ? 1
        : executionContext.arrayNulls === true
          ? 1
          : executionContext.arrayNulls === false
            ? 0
            : -1
      const payload = bind(
        `prepare_array_text(${ownedOperand(operand)}, ${family === 27}, ${nulls})`,
      )
      const initial = bind(`make_array_conversion()`)
      const builder = fresh('array_builder')
      const first = bind('make_int4_value(0)')
      const index = fresh('array_index')
      const event = fresh('array_event')
      const element = fresh('array_element')
      bindings.push(
        `let mut ${builder}: ArrayOutputPayload = ${initial};`,
        `let mut ${index}: Int4Value = ${first};`,
      )
      const lines: string[] = []
      const converted = renderArrayInputElement(
        node.elementType,
        node.enum,
        event,
        stored,
        lines,
        node.kind === 'array-text-literal' ? node.moneyLiterals : undefined,
      )
      bindings.push(
        `while array_text_has_event(&${payload}, ${index}) {`,
        `    let ${event} = array_text_event_at(&${payload}, ${index});`,
        ...indent(lines),
        `    let ${element} = ${converted};`,
      )
      bindings.push(
        `    ${builder} = append_array_conversion(${builder}, ${element}, true);`,
        `    ${index} = array_text_next_index(${index});`,
        '}',
      )
      const arguments_ = bind(
        `array_conversion_arguments(${builder}, ${rustStringLiteral(node.elementType)}, ${family})`,
      )
      return {
        name: bind(`finish_prepared_array_text(${payload}, ${arguments_})`),
        type: node.type,
      }
    }
    const emitConstantNull = (
      type: string,
      preparation: readonly ConstantPreparation[],
    ): { name: string; type: string } => {
      const kind = rustType(type)
      const prefix = rustValuePrefix(kind)
      const guard = fresh('constant_guard')
      const initial = fresh('constant_start')
      preparationLines.push(`let ${initial} = make_bool_value(true);`)
      preparationLines.push(`let mut ${guard}: CheckOutcome = check_from_bool(${initial});`)
      const prepareExpression = (step: ConstantPreparation): void => {
        let value: { name: string; type: string }
        preparationDepth++
        try {
          value = emitScalar(step.expression, preparationLines, used)
        } finally {
          preparationDepth--
        }
        const operandPrefix = rustValuePrefix(rustType(value.type))
        const state = fresh('constant_state')
        if (step.kind === 'value' || step.test === 'null') {
          const nullness = fresh('constant_nullness')
          preparationLines.push(
            `let ${nullness} = ${operandPrefix}_is_null(${ownedOperand(value)});`,
            `let ${state} = check_from_bool(${nullness});`,
          )
        } else {
          if (value.type !== 'pg_catalog.bool')
            throw new UnsupportedCheckRustExpression('Constant preparation guard must return bool')
          preparationLines.push(`let ${state} = check_from_bool(${value.name});`)
        }
        preparationLines.push(`${guard} = constant_finish(${guard}, ${state});`)
        if (step.kind === 'guard') {
          const selected = capturePreparation(() => step.selected.forEach(prepareExpression))
          const otherwise = capturePreparation(() => step.otherwise.forEach(prepareExpression))
          const condition =
            step.test === 'and'
              ? `and_stops(${state}) == false`
              : step.test === 'or'
                ? `or_stops(${state}) == false`
                : `case_guard_takes(${state})`
          preparationLines.push(
            `if case_guard_stops(${state}) == false {`,
            `    if ${condition} {`,
            ...indent(indent(selected.lines)),
            '    } else {',
            ...indent(indent(otherwise.lines)),
            '    };',
            '};',
          )
        }
      }
      preparation.forEach(prepareExpression)
      const name = fresh('constant_null')
      constantDeclarations.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
      preparationLines.push(
        `${name} = ${prefix}_null();`,
        `if case_guard_stops(${guard}) {`,
        `    ${name} = ${prefix === 'bool' ? 'bool_from_check' : `${prefix}_from_case_guard`}(${guard});`,
        '};',
        `${preparationState} = constant_finish(${preparationState}, ${guard});`,
      )
      return { name, type }
    }
    const emitCall = (
      call: Extract<EvalExpression, { kind: 'call' }>['call'],
      operands: readonly { name: string; type: string }[],
      destination = bindings,
      folded?: { name: string; type: string },
    ): { name: string; type: string } => {
      if (node.kind === 'call' && node.strictNull && call === node.call && !folded) {
        const metadata = call.signature === null ? null : builtinMetadata(call.signature)
        const implementation =
          metadata?.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
        if (implementation?.kind === 'function' && implementation.strict) {
          const guard = fresh('strict_call_null')
          const initial = fresh('strict_call_start')
          destination.push(
            `let ${initial} = make_bool_value(false);`,
            `let mut ${guard}: CheckOutcome = check_from_bool(${initial});`,
          )
          for (const operand of operands) {
            const nullness = fresh('strict_argument_null')
            const outcome = fresh('strict_argument_state')
            destination.push(
              `let ${nullness} = ${rustValuePrefix(rustType(operand.type))}_is_null(${ownedOperand(operand)});`,
              `let ${outcome} = check_from_bool(${nullness});`,
              `${guard} = or_finish(${guard}, ${outcome});`,
            )
          }
          const lines: string[] = []
          const value = emitCallInner(call, operands, lines)
          appendArrayValidity(value, !rustScalarOwnCanFail(node, executionContext), lines)
          const name = fresh('strict_call')
          destination.push(
            `let mut ${name}: ${rustType(value.type)} = ${rustValuePrefix(rustType(value.type))}_null();`,
            `if case_guard_takes(${guard}) == false {`,
            ...indent(lines),
            `    ${name} = ${ownedOperand(value)};`,
            '};',
          )
          return { name, type: value.type }
        }
      }
      const value = emitCallInner(call, operands, destination, folded)
      if (!folded)
        appendArrayValidity(
          value,
          !rustCallCanFail(
            call,
            operands.map((operand) => operand.type),
            executionContext,
          ) ||
            (node.kind === 'call' &&
              call === node.call &&
              !rustScalarOwnCanFail(node, executionContext)),
          destination,
        )
      return value
    }
    const emitCallInner = (
      call: Extract<EvalExpression, { kind: 'call' }>['call'],
      operands: readonly { name: string; type: string }[],
      destination = bindings,
      folded?: { name: string; type: string },
    ): { name: string; type: string } => {
      if (call.kind === 'cast' && call.signature === null) {
        if (operands.length === 1 && builtinCast(operands[0]!.type, call.type)?.method === 'b') {
          const input = operands[0]!
          const helper =
            input.type === 'pg_catalog.int4' && isOidType(call.type)
              ? 'oid_from_int4'
              : isOidType(input.type) && call.type === 'pg_catalog.int4'
                ? 'oid_to_int4'
                : null
          if (helper) {
            if (folded) return folded
            const name = fresh('value')
            destination.push(`let ${name} = ${helper}(${input.name});`)
            return { name, type: call.type }
          }
        }
        if (
          operands.length !== 1 ||
          (operands[0]!.type !== call.type &&
            !isBinaryTextRelabel(operands[0]!.type, call.type) &&
            !isBinaryBitRelabel(operands[0]!.type, call.type) &&
            !(
              isOidType(operands[0]!.type) &&
              isOidType(call.type) &&
              builtinCast(operands[0]!.type, call.type)?.method === 'b'
            ) &&
            !(
              operands[0]!.type === 'pg_catalog.cidr' &&
              call.type === 'pg_catalog.inet' &&
              builtinCast(operands[0]!.type, call.type)?.method === 'b'
            ))
        )
          throw new UnsupportedCheckRustExpression('Invalid Rust CHECK relabel cast')
        return folded ?? { ...operands[0]!, type: call.type }
      }
      if (call.signature === null)
        throw new UnsupportedCheckRustExpression('Unsupported Rust CHECK callable kind')
      if (call.kind === 'cast') {
        const conversion = operands.length === 1 ? builtinCast(operands[0]!.type, call.type) : null
        if (conversion?.method !== 'f' || conversion.implementation !== call.signature)
          throw new UnsupportedCheckRustExpression('Invalid Rust CHECK cast function')
      }
      const metadata = builtinMetadata(call.signature)
      const implementation =
        metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
      const arrayRegex = isRegexArrayCallable(call.signature)
      if (
        implementation.kind === 'function' &&
        implementation.schema === 'pg_catalog' &&
        ['jsonb_cmp', 'jsonb_lt', 'jsonb_le', 'jsonb_gt', 'jsonb_ge'].includes(
          implementation.name,
        ) &&
        implementation.args.length === 2 &&
        implementation.args.every((type) => type === 'pg_catalog.jsonb') &&
        (executionContext.defaultCollation !== 'C' || executionContext.serverEncoding !== 'UTF8')
      )
        throw new UnsupportedCheckRustExpression(
          'JSONB ordering requires declared database default collation C and server encoding UTF8',
        )
      const jsonbConversion =
        implementation.kind === 'function' &&
        implementation.schema === 'pg_catalog' &&
        implementation.name === 'to_jsonb' &&
        implementation.args.length === 1 &&
        implementation.args[0] === 'pg_catalog.anyelement' &&
        implementation.result === 'pg_catalog.jsonb' &&
        implementation.strict &&
        implementation.volatility === 's'
      const jsonConversion = isJsonConversion(implementation)
      const jsonbBuilder =
        isJsonbBuilder(implementation) &&
        (implementation.args.length === 0 ? operands.length === 0 : operands.length > 0)
      const jsonBuilder =
        isJsonBuilder(implementation) &&
        (implementation.args.length === 0 ? operands.length === 0 : operands.length > 0)
      const builder = jsonbBuilder || jsonBuilder
      const rawJson = jsonConversion || jsonBuilder
      const jsonpathTimezone = isJsonpathTimezoneCallable(implementation)
      const arraySearch = isArraySearch(implementation)
      const arrayStringIO = isArrayStringIO(implementation)
      const arrayFill = isArrayFill(implementation)
      const arrayTrim = isArrayTrim(implementation)
      const arrayReverse = isArrayReverse(implementation)
      const arraySort = isArraySort(implementation)
      const arrayExtremum = isArrayExtremum(implementation)
      const arrayBucket = isArrayBucket(implementation)
      const arrayBinarySend = isArrayBinarySend(implementation)
      const arrayRewrite = isArrayRewrite(implementation)
      const arrayTransform = isArrayTransform(implementation)
      const enumSupport = capturedEnumSupport(implementation)
      const transformArray =
        arrayTransform || arrayRewrite
          ? operands[implementation.name === 'array_prepend' ? 1 : 0]?.type
          : undefined
      const enumOperands = implementation.args.flatMap((type, index) =>
        type === 'pg_catalog.anyenum' ? [operands[index]?.type] : [],
      )
      const enumCall = enumOperands.length > 0
      const enumIdentity = enumOperands[0]
      const resultType =
        arraySearch && implementation.name === 'array_positions'
          ? 'array:pg_catalog.int4'
          : arrayTransform || arrayRewrite
            ? transformArray
            : enumSupport && implementation.result === 'pg_catalog.anyarray'
              ? `array:${enumIdentity}`
              : implementation.result === 'pg_catalog.anyenum'
                ? enumIdentity
                : arrayFill
                  ? `array:${operands[0]?.type}`
                  : arrayTrim || arrayReverse || arraySort || arrayExtremum
                    ? operands[0]?.type
                    : arrayStringIO && implementation.name === 'string_to_array'
                      ? 'array:pg_catalog.text'
                      : (catalogScalarType(implementation.result) ?? implementation.result)
      if (
        metadata.kind !== (call.kind === 'cast' ? 'function' : call.kind) ||
        implementation.kind !== 'function' ||
        resultType !== call.type ||
        (!implementation.strict &&
          !enumSupport &&
          !arraySearch &&
          !arrayTransform &&
          !arrayRewrite &&
          !arrayFill &&
          !arrayStringIO &&
          !jsonbBuilder &&
          !jsonBuilder &&
          !isJsonbSetLax(implementation) &&
          !(implementation.schema === 'pg_catalog' && implementation.name === 'overlaps')) ||
        (implementation.volatility !== 'i' &&
          !enumSupport &&
          !arrayBinarySend &&
          !arrayStringIO &&
          !jsonbConversion &&
          !jsonConversion &&
          !jsonbBuilder &&
          !jsonBuilder &&
          !jsonpathTimezone &&
          !(
            (['namesend', 'textsend'].includes(implementation.name) &&
              implementation.schema === 'pg_catalog' &&
              implementation.args.length === 1 &&
              implementation.args[0] ===
                (implementation.name === 'namesend' ? 'pg_catalog.name' : 'pg_catalog.text') &&
              implementation.result === 'pg_catalog.bytea') ||
            (isOidAliasType(implementation.result) &&
              (implementation.name === 'to_' + implementation.result.slice('pg_catalog.'.length) ||
                builtinCast('pg_catalog.text', implementation.result)?.implementation ===
                  call.signature))
          )) ||
        implementation.returnsSet ||
        (!builder && implementation.args.length !== operands.length)
      )
        throw new UnsupportedCheckRustExpression(
          `Unsupported Rust CHECK callable: ${call.signature}`,
        )
      if (
        implementation.args.some((type) =>
          [
            'pg_catalog.name',
            'pg_catalog.text',
            'pg_catalog."varchar"',
            'pg_catalog.bpchar',
          ].includes(type),
        ) &&
        !arrayRegex &&
        !supportsTextCallableCollation(
          call.signature,
          call.kind === 'cast' ? undefined : call.collation,
        )
      )
        throw new UnsupportedCheckRustExpression(
          `Unsupported Rust CHECK text collation: ${call.signature}`,
        )
      rustType(call.type)
      if (
        enumCall &&
        (!enumIdentity?.startsWith('enum:') || enumOperands.some((type) => type !== enumIdentity))
      )
        throw new UnsupportedCheckRustExpression(
          `Rust CHECK enum identity mismatch: ${call.signature}`,
        )
      if (enumSupport) {
        const definition = call.kind === 'cast' ? undefined : call.enum
        if (
          !definition ||
          !enumIdentity ||
          enumType(definition) !== enumIdentity ||
          definition.values.length > 2147483647 ||
          definition.values.some((label) => label.includes('\0'))
        )
          throw new UnsupportedCheckRustExpression('Enum support requires captured label order')
        const safeArguments = operands.map((_, index) =>
          String(
            node.kind === 'call' &&
              node.call === call &&
              !rustExpressionCanFail(node.operands[index], executionContext),
          ),
        )
        const args = [
          ...operands.map(ownedOperand),
          String(definition.values.length),
          ...(implementation.name === 'enum_range' ? [rustStringLiteral(enumIdentity)] : []),
          ...safeArguments,
        ]
        const name = fresh('enum_support')
        destination.push(`let ${name} = ${implementation.rustName}(${args.join(', ')});`)
        callables.add(implementation.rustName)
        return { name, type: call.type }
      }
      if (
        !builder &&
        implementation.args.some((type, index) =>
          (arraySearch || arrayTransform || arrayRewrite || arrayBucket) &&
          type === 'pg_catalog.anycompatiblearray' &&
          operands[index]?.type.startsWith('array:')
            ? false
            : (arraySearch || arrayTransform || arrayRewrite || arrayBucket) &&
                type === 'pg_catalog.anycompatible' &&
                operands[
                  arrayBucket || (arrayTransform && implementation.name === 'array_prepend') ? 1 : 0
                ]?.type === `array:${operands[index]?.type}`
              ? false
              : type === 'pg_catalog.anyarray' && operands[index]?.type.startsWith('array:')
                ? false
                : type === 'pg_catalog.anyenum' && enumCall
                  ? !operands[index]?.type.startsWith('enum:')
                  : type === 'pg_catalog.anyelement' &&
                      (jsonbConversion || jsonConversion || arrayFill)
                    ? false
                    : catalogScalarType(type)?.startsWith('array:') &&
                        operands[index]?.type === catalogScalarType(type)
                      ? false
                      : operands[index]?.type !== type &&
                        !(
                          call.kind === 'cast' &&
                          call.type === 'pg_catalog."char"' &&
                          type === 'pg_catalog.text' &&
                          operands[index]?.type === 'pg_catalog.bpchar'
                        ),
        )
      )
        throw new UnsupportedCheckRustExpression(
          `Unsupported Rust CHECK callable arguments: ${call.signature}`,
        )
      for (const operand of operands) rustType(operand.type)
      if (folded) return folded
      if (isArrayHash(implementation)) {
        const arrayType = operands[0]?.type
        if (!arrayType?.startsWith('array:'))
          throw new UnsupportedCheckRustExpression(
            'Array hashing requires one concrete array identity',
          )
        const elementType = arrayType.slice(6),
          family = arrayElementFamily(elementType)
        const defaults = builtinTypeComparison(
          elementType.startsWith('enum:') ? 'pg_catalog.anyenum' : elementType,
        )
        if (family === null || !defaults)
          throw new UnsupportedCheckRustExpression(
            'Array hashing requires captured element support metadata',
          )
        const extended = implementation.args.length === 2,
          width = extended ? '64' : '32'
        const selected = extended ? defaults.hashExtended : defaults.hash
        const scalar = selected ? builtinMetadata(selected) : null
        const effectiveCollation =
          call.kind === 'cast'
            ? undefined
            : call.collationDefault && executionContext.defaultCollation === 'C'
              ? 'C'
              : (call.collation ?? executionContext.defaultCollation)
        const hashContext = scalar ? nativeHashContext(scalar) : null
        const deferred =
          !scalar ||
          scalar.kind !== 'function' ||
          !scalar.strict ||
          scalar.returnsSet ||
          scalar.volatility !== 'i' ||
          scalar.result !== call.type ||
          !checkRustCallableNames().has(scalar.rustName) ||
          (['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog.name'].includes(
            scalar.args[0] ?? '',
          ) &&
            !supportsTextCallableCollation(selected!, effectiveCollation))
        const orders =
          hashContext && executionContext.nativeByteOrder === undefined
            ? [1, 2]
            : [
                executionContext.nativeByteOrder === 'big'
                  ? 2
                  : executionContext.nativeByteOrder === 'little'
                    ? 1
                    : 0,
              ]
        const seed = extended ? ownedOperand(operands[1]!) : fresh('array_hash_seed')
        if (!extended) destination.push(`let ${seed} = make_int8_value(0i64);`)
        const payload = fresh('array_hash_plan'),
          initial = fresh('array_hash_initial'),
          index = fresh('array_hash_index'),
          start = fresh('array_hash_start')
        const results = orders.map(() => fresh('array_hash_result'))
        destination.push(
          `let ${payload} = prepare_array_hash(${ownedOperand(operands[0]!)}, ${seed}, ${selected !== null});`,
          `let ${initial} = ${extended ? 'array_hash_initial64' : 'array_comparison_initial'}(&${payload});`,
          `let ${start} = make_int4_value(0);`,
          `let mut ${index}: Int4Value = ${start};`,
          ...results.map(
            (result) => `let mut ${result}: ${extended ? 'Int8Value' : 'Int4Value'} = ${initial};`,
          ),
        )
        const element = fresh('array_hash_element'),
          value = fresh('array_hash_scalar'),
          nullness = fresh('array_hash_nullness')
        const prefix = rustValuePrefix(rustType(elementType))
        const body: string[] = [
          `let ${element} = array_comparison_element_at(&${payload}, ${index}, false);`,
          `let ${value} = array_element_to_${prefix}(${element});`,
          `let ${nullness} = ${prefix}_is_null(${ownedOperand({ name: value, type: elementType })});`,
        ]
        let argument = { name: value, type: elementType }
        if (
          !deferred &&
          scalar &&
          scalar.args[0] !== elementType &&
          scalar.args[0] !== 'pg_catalog.anyenum'
        ) {
          const target = scalar.args[0]
          if (!target || builtinCast(elementType, target)?.method !== 'b')
            throw new UnsupportedCheckRustExpression(
              'Array element hash requires its catalog binary relabel',
            )
          argument = emitCall({ kind: 'cast', signature: null, type: target }, [argument], body)
        }
        for (const [position, order] of orders.entries()) {
          const hash = fresh('array_element_hash')
          body.push(
            `let mut ${hash}: ${extended ? 'Int8Value' : 'Int4Value'} = array_hash_cell${width}(${nullness});`,
            `if array_hash_requires_scalar${width}(${hash}) {`,
          )
          if (!deferred && scalar) {
            const args = [ownedOperand(argument), ...(extended ? [seed] : [])]
            if (hashContext) args.push(String(order))
            if (hashContext === 'text')
              args.push(String(executionContext.serverEncoding === 'UTF8'))
            body.push(`    ${hash} = ${scalar.rustName}(${args.join(', ')});`)
            callables.add(scalar.rustName)
          } else body.push(`    ${hash} = ${extended ? 'int8' : 'int4'}_unknown();`)
          body.push(
            '};',
            `${results[position]} = array_hash_step${width}(${results[position]}, ${hash});`,
          )
        }
        body.push(`${index} = array_text_next_index(${index});`)
        const first = results[0]!,
          second = results[1] ?? first
        const finished = fresh('array_hash_finished'),
          name = fresh('value')
        destination.push(
          `while array_hash_continues${width}(&${payload}, ${index}, ${first}, ${second}) {`,
          ...indent(body),
          '}',
          `let ${finished} = array_hash_finish${width}(${first}, ${second});`,
          `let ${name} = ${implementation.rustName}(${finished});`,
        )
        callables.add(implementation.rustName)
        return { name, type: call.type }
      }
      if (arrayStringIO) {
        callables.add(implementation.rustName)
        const name = fresh('array_string_io')
        const args = operands.map(ownedOperand)
        if (implementation.name === 'string_to_array') {
          args.push(
            String(call.kind !== 'cast' && ['C', 'deterministic'].includes(call.collation ?? '')),
            String(executionContext.serverEncoding === 'UTF8'),
          )
        } else {
          const elementType = operands[0]!.type.slice(6)
          const payload = fresh('array_string_output')
          const marker = args[2] ?? fresh('array_null_marker')
          if (!args[2]) destination.push(`let ${marker} = text_null();`)
          destination.push(
            `let ${payload} = prepare_array_string_output(${args[0]}, ${args[1]}, ${marker});`,
          )
          const rendered = renderArrayOutput(
            payload,
            elementType,
            call.kind === 'cast' ? undefined : call.enum,
            destination,
          )
          args.splice(1, 0, rendered)
        }
        destination.push(`let ${name} = ${implementation.rustName}(${args.join(', ')});`)
        return { name, type: call.type }
      }
      if (arrayFill) {
        const elementType = operands[0]?.type,
          family = elementType ? arrayElementFamily(elementType) : null
        if (family === null || !elementType || call.type !== `array:${elementType}`)
          throw new UnsupportedCheckRustExpression(
            'Array fill requires one concrete scalar identity',
          )
        const element = fresh('array_fill_element'),
          name = fresh('array_fill'),
          prefix = rustValuePrefix(rustType(elementType))
        destination.push(
          `let ${element} = array_element_from_${prefix}(${ownedOperand(operands[0]!)});`,
        )
        const args = [
          element,
          ...operands.slice(1).map(ownedOperand),
          rustStringLiteral(elementType),
          String(family),
        ]
        destination.push(`let ${name} = ${implementation.rustName}(${args.join(', ')});`)
        callables.add(implementation.rustName)
        return { name, type: call.type }
      }
      if (arrayTransform) {
        callables.add(implementation.rustName)
        if (
          !transformArray?.startsWith('array:') ||
          operands.some(
            (operand, index) =>
              operand.type !==
              (implementation.args[index] === 'pg_catalog.anycompatiblearray'
                ? transformArray
                : transformArray.slice(6)),
          )
        )
          throw new UnsupportedCheckRustExpression(
            'Array transform requires one concrete element identity',
          )
        const name = fresh('array_transform')
        if (implementation.name === 'array_cat') {
          destination.push(
            `let ${name} = ${implementation.rustName}(${ownedOperand(operands[0]!)}, ${ownedOperand(operands[1]!)});`,
          )
        } else {
          const arrayIndex = implementation.name === 'array_prepend' ? 1 : 0,
            elementIndex = 1 - arrayIndex,
            elementType = transformArray.slice(6),
            family = arrayElementFamily(elementType)
          if (family === null)
            throw new UnsupportedCheckRustExpression('Unsupported array element family')
          const element = fresh('array_transform_element'),
            prefix = rustValuePrefix(rustType(elementType))
          destination.push(
            `let ${element} = array_element_from_${prefix}(${ownedOperand(operands[elementIndex]!)});`,
          )
          const args =
            arrayIndex === 0
              ? [ownedOperand(operands[arrayIndex]!), element]
              : [element, ownedOperand(operands[arrayIndex]!)]
          destination.push(
            `let ${name} = ${implementation.rustName}(${args.join(', ')}, ${rustStringLiteral(elementType)}, ${family});`,
          )
        }
        return { name, type: call.type }
      }
      if (
        isArrayComparison(implementation) ||
        arrayExtremum ||
        arrayBucket ||
        arraySearch ||
        arrayRewrite ||
        arraySort
      ) {
        const arrayType = operands[arrayBucket ? 1 : 0]?.type
        if (
          !arrayType?.startsWith('array:') ||
          (arrayBucket
            ? operands.length !== 2 || operands[0]?.type !== arrayType.slice(6)
            : arraySort
              ? operands.slice(1).some((operand) => operand.type !== 'pg_catalog.bool')
              : arrayRewrite
                ? operands.slice(1).some((operand) => operand.type !== arrayType.slice(6))
                : arraySearch
                  ? operands[1]?.type !== arrayType.slice(6)
                  : operands.length !== 2 || operands[1]?.type !== arrayType)
        )
          throw new UnsupportedCheckRustExpression(
            'Array comparison requires one concrete array identity',
          )
        const elementType = arrayType.slice(6),
          family = arrayElementFamily(elementType)
        const membership = ['arraycontains', 'arraycontained', 'arrayoverlap'].includes(
          implementation.name,
        )
        const equality =
          arraySearch ||
          arrayRewrite ||
          membership ||
          ['array_eq', 'array_ne'].includes(implementation.name)
        const defaults = builtinTypeComparison(
          elementType.startsWith('enum:') ? 'pg_catalog.anyenum' : elementType,
        )
        if (family === null || !defaults)
          throw new UnsupportedCheckRustExpression(
            'Array comparison requires captured element comparison metadata',
          )
        const selected = equality ? defaults.equality : defaults.comparator
        const emitPair = (
          left: string,
          right: string,
          result: string,
          scalarLines: string[],
        ): void => {
          const effectiveCollation =
            call.kind === 'cast'
              ? undefined
              : call.collationDefault && executionContext.defaultCollation === 'C'
                ? 'C'
                : (call.collation ?? executionContext.defaultCollation)
          const scalar = selected ? builtinMetadata(selected) : null
          const actual =
            scalar?.kind === 'operator' ? builtinMetadata(scalar.implementation) : scalar
          const text = scalar?.args.some((type) =>
            [
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
              'pg_catalog.name',
            ].includes(type),
          )
          const deferred =
            !actual ||
            actual.kind !== 'function' ||
            !actual.strict ||
            actual.returnsSet ||
            actual.volatility !== 'i' ||
            !checkRustCallableNames().has(actual.rustName) ||
            (text && !supportsTextCallableCollation(selected!, effectiveCollation)) ||
            (!equality &&
              elementType === 'pg_catalog.jsonb' &&
              (executionContext.defaultCollation !== 'C' ||
                executionContext.serverEncoding !== 'UTF8'))
          const emitElement = (selected: string, scalar: ReturnType<typeof builtinMetadata>) => {
            const prefix = rustValuePrefix(rustType(elementType))
            const args = [left, right].map((element, position) => {
              const name = fresh('array_comparison_scalar')
              scalarLines.push(`let ${name} = array_element_to_${prefix}(${element});`)
              const target = scalar.args[position]
              if (target === elementType || target === 'pg_catalog.anyenum')
                return { name, type: elementType }
              if (!target || builtinCast(elementType, target)?.method !== 'b')
                throw new UnsupportedCheckRustExpression(
                  'Array element comparison requires its catalog binary relabel',
                )
              return emitCall(
                { kind: 'cast', signature: null, type: target },
                [{ name, type: elementType }],
                scalarLines,
              )
            })
            return emitCall(
              {
                kind: scalar.kind as 'operator' | 'function',
                signature: selected,
                type: scalar.result,
                collation: effectiveCollation,
              },
              args,
              scalarLines,
            )
          }
          if (!deferred && scalar && selected) {
            const compared = emitElement(selected, scalar)
            scalarLines.push(
              `${result} = ${equality ? 'array_equality_step' : 'array_order_step'}(${compared.name});`,
            )
          } else {
            const eq = defaults.equality ? builtinMetadata(defaults.equality) : null
            const eqActual = eq?.kind === 'operator' ? builtinMetadata(eq.implementation) : eq
            if (
              !equality &&
              selected &&
              eq &&
              defaults.equality &&
              eqActual?.kind === 'function' &&
              eqActual.strict &&
              !eqActual.returnsSet &&
              eqActual.volatility === 'i' &&
              checkRustCallableNames().has(eqActual.rustName) &&
              (!text || supportsTextCallableCollation(defaults.equality, effectiveCollation))
            ) {
              const compared = emitElement(defaults.equality, eq)
              scalarLines.push(`${result} = array_order_from_equality(${compared.name});`)
            } else scalarLines.push(`${result} = int4_unknown();`)
          }
        }
        if (arrayBucket) {
          const needle = fresh('array_bucket_needle'),
            prefix = rustValuePrefix(rustType(elementType)),
            payload = fresh('array_bucket'),
            low = fresh('array_bucket_low'),
            high = fresh('array_bucket_high'),
            midpoint = fresh('array_bucket_midpoint'),
            left = fresh('array_bucket_operand'),
            right = fresh('array_bucket_threshold'),
            compared = fresh('array_bucket_compared')
          destination.push(
            `let ${needle} = array_element_from_${prefix}(${ownedOperand(operands[0]!)});`,
            `let ${payload} = prepare_array_bucket(${needle}, ${ownedOperand(operands[1]!)}, ${selected !== null});`,
            `let mut ${low}: Int4Value = array_comparison_initial(&${payload});`,
            `let mut ${high}: Int4Value = array_bucket_limit(&${payload});`,
          )
          const scalarLines: string[] = []
          emitPair(left, right, compared, scalarLines)
          const pair = fresh('array_bucket_pair')
          const body = [
            `let ${midpoint} = array_bucket_midpoint(${low}, ${high});`,
            `let ${left} = array_bucket_operand(&${payload});`,
            `let ${right} = array_comparison_element_at(&${payload}, ${midpoint}, false);`,
            `let ${pair} = array_comparison_pair(${left}.clone(), ${right}.clone(), false);`,
            `let mut ${compared}: Int4Value = ${pair};`,
            `if array_pair_requires_scalar(${pair}) {`,
            ...indent(scalarLines),
            '};',
            `${low} = array_bucket_lower(${low}, ${high}, ${compared});`,
            `${high} = array_bucket_upper(${low}, ${high}, ${compared});`,
          ]
          const name = fresh('value')
          destination.push(
            `while array_bucket_continues(${low}, ${high}) {`,
            ...indent(body),
            '}',
            `let ${name} = ${implementation.rustName}(${low});`,
          )
          callables.add(implementation.rustName)
          return { name, type: call.type }
        }
        if (arraySort) {
          const initial = fresh('array_sort_initial'),
            plan = fresh('array_sort_plan')
          const zero = fresh('array_sort_zero'),
            result = fresh('array_sort_result')
          const index = fresh('array_sort_index'),
            left = fresh('array_sort_left'),
            right = fresh('array_sort_right')
          const pair = fresh('array_sort_pair'),
            compared = fresh('array_sort_compared')
          const direction = operands[1]?.name ?? fresh('array_sort_direction')
          if (!operands[1]) destination.push(`let ${direction} = make_bool_value(false);`)
          const nullsFirst = operands[2]?.name ?? direction
          destination.push(
            `let ${initial} = prepare_array_sort(${ownedOperand(operands[0]!)}, ${direction}, ${nullsFirst}, ${selected !== null});`,
            `let mut ${plan}: ArraySortPayload = ${initial};`,
            `let ${zero} = make_int4_value(0);`,
            `while array_sort_continues(&${plan}) {`,
            `    let mut ${result}: Int4Value = ${zero};`,
            `    if array_sort_needs_pair(&${plan}) {`,
            `        let mut ${index}: Int4Value = ${zero};`,
            `        while array_sort_pair_continues(&${plan}, ${index}, ${result}) {`,
            `            let ${left} = array_sort_element_at(&${plan}, ${index}, false);`,
            `            let ${right} = array_sort_element_at(&${plan}, ${index}, true);`,
            `            let ${pair} = array_sort_cell_pair(&${plan}, ${left}.clone(), ${right}.clone());`,
            `            let mut ${compared}: Int4Value = ${pair};`,
            `            if array_pair_requires_scalar(${pair}) {`,
          )
          const scalarLines: string[] = []
          emitPair(left, right, compared, scalarLines)
          destination.push(
            ...indent(indent(indent(indent(scalarLines)))),
            '            };',
            `            ${result} = ${compared};`,
            `            ${index} = array_text_next_index(${index});`,
            '        }',
            '    };',
            `    ${plan} = array_sort_step(${plan}, ${result});`,
            '}',
          )
          const sorted = fresh('array_sorted'),
            name = fresh('array_sort')
          destination.push(
            `let ${sorted} = finish_array_sort(${plan});`,
            `let ${name} = ${implementation.rustName}(${sorted});`,
          )
          callables.add(implementation.rustName)
          return { name, type: call.type }
        }
        if (arrayRewrite) {
          const remove = implementation.name === 'array_remove',
            prefix = rustValuePrefix(rustType(elementType)),
            needle = fresh('array_rewrite_needle'),
            replacement = fresh('array_rewrite_replacement')
          destination.push(
            `let ${needle} = array_element_from_${prefix}(${ownedOperand(operands[1]!)});`,
          )
          if (operands[2])
            destination.push(
              `let ${replacement} = array_element_from_${prefix}(${ownedOperand(operands[2])});`,
            )
          else {
            const empty = fresh('array_rewrite_null')
            destination.push(
              `let ${empty} = ${prefix}_null();`,
              `let ${replacement} = array_element_from_${prefix}(${empty});`,
            )
          }
          const payload = fresh('array_rewrite'),
            initial = fresh('array_rewrite_initial'),
            first = fresh('array_rewrite_first'),
            result = fresh('array_rewrite_result'),
            index = fresh('array_rewrite_index'),
            empty = fresh('array_rewrite_empty'),
            builder = fresh('array_rewrite_builder')
          const changed = fresh('array_rewrite_changed'),
            change = fresh('array_rewrite_change')
          destination.push(
            `let ${payload} = prepare_array_rewrite(${ownedOperand(operands[0]!)}, ${needle}, ${replacement}, ${remove}, ${selected !== null});`,
            `let ${initial} = array_search_initial(&${payload});`,
            `let ${first} = make_int4_value(0);`,
            `let mut ${result}: Int4Value = ${initial};`,
            `let mut ${index}: Int4Value = ${first};`,
            `let ${empty} = make_array_arguments(${rustStringLiteral(elementType)}, ${family});`,
            `let mut ${builder}: ArrayArguments = ${empty};`,
            `let mut ${changed}: BoolValue = make_bool_value(false);`,
          )
          const left = fresh('array_rewrite_cell'),
            right = fresh('array_rewrite_query'),
            pair = fresh('array_rewrite_pair'),
            compared = fresh('array_rewrite_compared'),
            scalarLines: string[] = []
          emitPair(left, right, compared, scalarLines)
          const body = [
            `let ${left} = array_membership_element_at(&${payload}, ${index}, false);`,
            `let ${right} = array_rewrite_needle(&${payload});`,
            `let ${pair} = array_comparison_pair(${left}.clone(), ${right}.clone(), true);`,
            `let mut ${compared}: Int4Value = ${pair};`,
            `if array_pair_requires_scalar(${pair}) {`,
            ...indent(scalarLines),
            '};',
            `${builder} = array_rewrite_step(${builder}, &${payload}, ${index}, ${compared}, ${remove});`,
            `let ${change} = array_rewrite_changed(&${payload}, ${compared}, ${remove});`,
            `${changed} = array_bitmap_union(${changed}, ${change});`,
            `${result} = ${compared};`,
            `${index} = array_text_next_index(${index});`,
          ]
          destination.push(
            `while array_rewrite_continues(&${payload}, ${index}, ${result}) {`,
            ...indent(body),
            '}',
          )
          const finished = fresh('array_rewrite_finished'),
            name = fresh('value')
          destination.push(
            `let ${finished} = finish_array_rewrite(${ownedOperand(operands[0]!)}, &${payload}, ${builder}, ${remove}, ${changed});`,
            `let ${name} = ${implementation.rustName}(${finished});`,
          )
          callables.add(implementation.rustName)
          return { name, type: call.type }
        }
        if (arraySearch) {
          const all = implementation.name === 'array_positions'
          const needle = fresh('array_search_needle')
          const prefix = rustValuePrefix(rustType(elementType))
          destination.push(
            `let ${needle} = array_element_from_${prefix}(${ownedOperand(operands[1]!)});`,
          )
          const start = operands[2] ?? {
            name: fresh('array_search_default_start'),
            type: 'pg_catalog.int4',
          }
          if (!operands[2]) destination.push(`let ${start.name} = make_int4_value(0);`)
          const payload = fresh('array_search'),
            initial = fresh('array_search_initial'),
            first = fresh('array_search_first'),
            result = fresh('array_search_result'),
            index = fresh('array_search_index')
          destination.push(
            `let ${payload} = prepare_array_search(${ownedOperand(operands[0]!)}, ${needle}, ${start.name}, ${operands.length === 3}, ${selected !== null});`,
            `let ${initial} = array_search_initial(&${payload});`,
            `let ${first} = array_search_start(&${payload});`,
            `let mut ${result}: Int4Value = ${initial};`,
            `let mut ${index}: Int4Value = ${first};`,
          )
          const builder = all ? fresh('array_search_positions') : null
          if (builder) {
            const empty = fresh('array_search_empty')
            destination.push(
              `let ${empty} = make_array_arguments("pg_catalog.int4", 2);`,
              `let mut ${builder}: ArrayArguments = ${empty};`,
            )
          }
          const left = fresh('array_search_query'),
            right = fresh('array_search_cell'),
            pair = fresh('array_search_pair'),
            compared = fresh('array_search_compared')
          const scalarLines: string[] = []
          emitPair(left, right, compared, scalarLines)
          const body = [
            `let ${left} = array_search_needle(&${payload});`,
            `let ${right} = array_membership_element_at(&${payload}, ${index}, false);`,
            `let ${pair} = array_comparison_pair(${left}.clone(), ${right}.clone(), true);`,
            `let mut ${compared}: Int4Value = ${pair};`,
            `if array_pair_requires_scalar(${pair}) {`,
            ...indent(scalarLines),
            '};',
            `${result} = array_search_result_step(&${payload}, ${index}, ${compared});`,
            ...(builder ? [`${builder} = array_search_append(${builder}, ${result});`] : []),
            `${index} = array_text_next_index(${index});`,
          ]
          destination.push(
            `while array_search_continues(&${payload}, ${index}, ${result}, ${all}) {`,
            ...indent(body),
            '}',
          )
          let finished = result
          if (builder) {
            finished = fresh('array_search_finished')
            destination.push(
              `let ${finished} = finish_array_search_positions(&${payload}, ${builder}, ${result});`,
            )
          }
          const name = fresh('value')
          destination.push(`let ${name} = ${implementation.rustName}(${finished});`)
          callables.add(implementation.rustName)
          return { name, type: call.type }
        }
        if (membership) {
          const all = implementation.name !== 'arrayoverlap',
            reverse = implementation.name === 'arraycontains'
          const payload = fresh('array_membership'),
            initial = fresh('array_membership_start'),
            first = fresh('array_membership_first'),
            result = fresh('array_membership_result'),
            index = fresh('array_membership_index'),
            scan = fresh('array_membership_scan'),
            matched = fresh('array_membership_matched')
          destination.push(
            `let ${payload} = prepare_array_membership(${ownedOperand(operands[0]!)}, ${ownedOperand(operands[1]!)}, ${reverse}, ${selected !== null});`,
            `let ${initial} = array_membership_initial(&${payload}, ${all});`,
            `let ${first} = make_int4_value(0);`,
            `let mut ${result}: BoolValue = ${initial};`,
            `let mut ${index}: Int4Value = ${first};`,
          )
          const left = fresh('array_membership_left'),
            right = fresh('array_membership_right'),
            pair = fresh('array_membership_pair'),
            comparison = fresh('array_membership_comparison')
          const scalarLines: string[] = []
          emitPair(left, right, comparison, scalarLines)
          const scanLines = [
            `let ${left} = array_membership_element_at(&${payload}, ${index}, false);`,
            `let ${right} = array_membership_element_at(&${payload}, ${scan}, true);`,
            `let ${pair} = array_membership_pair(${left}.clone(), ${right}.clone());`,
            `let mut ${comparison}: Int4Value = ${pair};`,
            `if array_pair_requires_scalar(${pair}) {`,
            ...indent(scalarLines),
            '};',
            `${matched} = array_membership_match_step(${matched}, ${comparison});`,
            `${scan} = array_text_next_index(${scan});`,
          ]
          const body = [
            `let mut ${scan}: Int4Value = ${first};`,
            `let mut ${matched}: BoolValue = array_membership_match_initial(&${payload}, ${index});`,
            `while array_membership_scan_continues(&${payload}, ${index}, ${scan}, ${matched}) {`,
            ...indent(scanLines),
            '}',
            `${result} = array_membership_finish_step(${result}, ${matched}, ${all});`,
            `${index} = array_text_next_index(${index});`,
          ]
          const name = fresh('value')
          destination.push(
            `while array_membership_continues(&${payload}, ${index}, ${result}, ${all}) {`,
            ...indent(body),
            '}',
            `let ${name} = ${implementation.rustName}(${result});`,
          )
          callables.add(implementation.rustName)
          return { name, type: call.type }
        }
        const payload = fresh('array_comparison')
        destination.push(
          `let ${payload} = prepare_array_comparison(${ownedOperand(operands[0]!)}, ${ownedOperand(operands[1]!)}, ${equality}, ${selected !== null});`,
        )
        const initial = fresh('array_comparison_start'),
          first = fresh('array_comparison_first')
        const result = fresh('array_comparison_result'),
          index = fresh('array_comparison_index')
        destination.push(
          `let ${initial} = array_comparison_initial(&${payload});`,
          `let ${first} = make_int4_value(0);`,
          `let mut ${result}: Int4Value = ${initial};`,
          `let mut ${index}: Int4Value = ${first};`,
        )
        const left = fresh('array_comparison_left'),
          right = fresh('array_comparison_right'),
          pair = fresh('array_comparison_pair')
        const body: string[] = [
          `let ${left} = array_comparison_element_at(&${payload}, ${index}, false);`,
          `let ${right} = array_comparison_element_at(&${payload}, ${index}, true);`,
          `let ${pair} = array_comparison_pair(${left}.clone(), ${right}.clone(), ${equality});`,
        ]
        const scalarLines: string[] = []
        emitPair(left, right, result, scalarLines)
        body.push(
          `if array_pair_requires_scalar(${pair}) {`,
          ...indent(scalarLines),
          '} else {',
          `    ${result} = ${pair};`,
          '};',
          `${index} = array_text_next_index(${index});`,
        )
        destination.push(
          `while array_comparison_continues(&${payload}, ${index}, ${result}) {`,
          ...indent(body),
          '}',
        )
        const completed = fresh('array_comparison_completed'),
          name = fresh('value')
        destination.push(
          `let ${completed} = finish_array_comparison(&${payload}, ${result});`,
          `let ${name} = ${implementation.rustName}(${arrayExtremum ? operands.map(ownedOperand).join(', ') + ', ' : ''}${completed});`,
        )
        callables.add(implementation.rustName)
        return { name, type: call.type }
      }
      let arguments_ = operands.map((operand) => ownedOperand(operand))
      if (isIdentifierParseCallable(call.signature))
        arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      if (arrayRegex)
        arguments_.push(
          String(
            call.kind !== 'cast' &&
              (call.collation === 'C' ||
                (call.collationDefault === true && executionContext.defaultCollation === 'C')),
          ),
        )
      if (jsonbConversion || jsonConversion || (builder && operands.length > 0)) {
        const scalarInput = (
          original: { name: string; type: string },
          key: boolean | string,
          lines: string[],
        ): string => {
          let operand = original
          if (['pg_catalog.int2', 'pg_catalog.int4', 'pg_catalog.int8'].includes(operand.type)) {
            const conversion = builtinCast(operand.type, 'pg_catalog."numeric"')
            if (conversion?.method !== 'f' || !conversion.implementation)
              throw new UnsupportedCheckRustExpression(
                'JSONB integer conversion requires its catalog numeric cast',
              )
            operand = emitCall(
              { kind: 'cast', signature: conversion.implementation, type: 'pg_catalog."numeric"' },
              [operand],
              lines,
            )
          }
          if (
            !operand.type.startsWith('enum:') &&
            ![
              'pg_catalog.bool',
              'pg_catalog."numeric"',
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
              'pg_catalog.name',
              'pg_catalog.refcursor',
              'pg_catalog."json"',
              'pg_catalog.jsonb',
              'pg_catalog.jsonpath',
              'pg_catalog.float4',
              'pg_catalog.float8',
            ].includes(operand.type)
          ) {
            const output = builtinTypeIO(operand.type)?.output
            const metadata = output ? builtinMetadata(output) : null
            if (
              !metadata ||
              metadata.kind !== 'function' ||
              !metadata.strict ||
              (metadata.volatility !== 'i' && metadata.volatility !== 's') ||
              metadata.returnsSet ||
              metadata.args.length !== 1 ||
              metadata.args[0] !== operand.type ||
              metadata.result !== 'pg_catalog.cstring'
            )
              throw new UnsupportedCheckRustExpression(
                'JSONB string conversion requires its catalog output identity',
              )
          }
          const helper =
            rawJson && operand.type === 'pg_catalog."numeric"'
              ? 'json_input_from_numeric'
              : rawJson && ['pg_catalog.float4', 'pg_catalog.float8'].includes(operand.type)
                ? 'jsonb_key_input_from_' + operand.type.slice('pg_catalog.'.length)
                : operand.type === 'pg_catalog."json"' && !rawJson
                  ? 'jsonb_input_from_json_context'
                  : typeof key === 'string' &&
                      ['pg_catalog.float4', 'pg_catalog.float8'].includes(operand.type)
                    ? 'jsonb_array_' + operand.type.slice('pg_catalog.'.length) + '_input'
                    : key && ['pg_catalog.float4', 'pg_catalog.float8'].includes(operand.type)
                      ? 'jsonb_key_input_from_' + operand.type.slice('pg_catalog.'.length)
                      : jsonbConversionHelper(operand.type)
          if (!helper)
            throw new UnsupportedCheckRustExpression(
              `JSONB conversion requires a supported concrete input category: ${operand.type}`,
            )
          const carrier = fresh('jsonb_input')
          const args = [ownedOperand(operand)]
          if (operand.type === 'pg_catalog."json"' && !rawJson)
            args.push(String(executionContext.serverEncoding === 'UTF8'))
          if (
            !rawJson &&
            typeof key === 'string' &&
            ['pg_catalog.float4', 'pg_catalog.float8'].includes(operand.type)
          )
            args.push(key)
          lines.push(`let ${carrier} = ${helper}(${args.join(', ')});`)
          return carrier
        }
        const arrayInputs = (operand: { name: string; type: string }, object: boolean): string => {
          const elementType = operand.type.slice(6)
          if (!operand.type.startsWith('array:') || arrayElementFamily(elementType) === null)
            throw new UnsupportedCheckRustExpression(
              'JSONB array conversion requires a concrete scalar element identity',
            )
          const initial = fresh('jsonb_array_initial'),
            cursor = fresh('jsonb_array_cursor'),
            element = fresh('jsonb_array_element'),
            scalar = fresh('jsonb_array_scalar')
          destination.push(
            `let ${initial} = prepare_jsonb_array_input(${ownedOperand(operand)});`,
            `let mut ${cursor}: JsonbArrayInputPayload = ${initial};`,
          )
          const body: string[] = [
            `let ${element} = jsonb_array_input_element(&${cursor});`,
            `let ${scalar} = array_element_to_${rustValuePrefix(rustType(elementType))}(${element});`,
          ]
          let key: boolean | string = false
          if (
            !rawJson &&
            object &&
            ['pg_catalog.float4', 'pg_catalog.float8'].includes(elementType)
          ) {
            key = fresh('jsonb_array_key')
            body.push(`let ${key} = jsonb_array_input_is_key(&${cursor});`)
          }
          const carrier = scalarInput({ name: scalar, type: elementType }, key, body)
          body.push(`${cursor} = append_jsonb_array_input(${cursor}, ${carrier});`)
          destination.push(`while jsonb_array_input_continues(&${cursor}) {`, ...indent(body), '}')
          return cursor
        }
        if (jsonConversion && implementation.name === 'array_to_json') {
          const cursor = arrayInputs(operands[0]!, false)
          const prepared = fresh('json_array_prepared')
          const name = fresh('value')
          destination.push(
            `let ${prepared} = json_array_input_plan(${cursor});`,
            `let ${name} = ${implementation.rustName}(${[prepared, ...operands.slice(1).map(ownedOperand), String(executionContext.serverEncoding === 'UTF8')].join(', ')});`,
          )
          callables.add(implementation.rustName)
          return { name, type: call.type }
        }
        const variadic = builder && call.kind !== 'cast' && call.variadic === true
        const carriers: string[] = []
        if (variadic) {
          if (operands.length !== 1 || !operands[0]!.type.startsWith('array:'))
            throw new UnsupportedCheckRustExpression(
              'Explicit JSONB VARIADIC calls require one concrete array',
            )
          const cursor = arrayInputs(
              operands[0]!,
              ['json_build_object', 'jsonb_build_object'].includes(implementation.name),
            ),
            batch = fresh('jsonb_array_arguments')
          destination.push(`let ${batch} = jsonb_array_input_arguments(${cursor});`)
          arguments_ = [batch]
        } else
          for (const [index, operand] of operands.entries()) {
            const key =
              builder &&
              ['json_build_object', 'jsonb_build_object'].includes(implementation.name) &&
              index % 2 === 0
            if (operand.type.startsWith('array:')) {
              const carrier = fresh('jsonb_array_input')
              if (key)
                destination.push(
                  `let ${carrier} = jsonb_array_key_input(${ownedOperand(operand)});`,
                )
              else {
                const cursor = arrayInputs(operand, false),
                  value = fresh('jsonb_array_value')
                if (rawJson) {
                  const compact = fresh('json_array_compact')
                  destination.push(
                    `let ${compact} = make_bool_value(false);`,
                    `let ${value} = json_array_input_value(${cursor}, ${compact}, ${executionContext.serverEncoding === 'UTF8'});`,
                    `let ${carrier} = json_array_value_input(${ownedOperand(operand)}, ${value});`,
                  )
                } else
                  destination.push(
                    `let ${value} = jsonb_array_input_value(${cursor});`,
                    `let ${carrier} = jsonb_array_value_input(${ownedOperand(operand)}, ${value});`,
                  )
              }
              carriers.push(carrier)
            } else carriers.push(scalarInput(operand, key, destination))
          }
        if (builder && !variadic) {
          let batch = fresh('jsonb_arguments')
          destination.push(`let ${batch} = make_jsonb_arguments();`)
          for (const carrier of carriers) {
            const next = fresh('jsonb_arguments')
            destination.push(`let ${next} = append_jsonb_argument(${batch}, ${carrier});`)
            batch = next
          }
          arguments_ = [batch]
        } else if (!variadic) arguments_ = carriers
        if (rawJson) arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      }
      callables.add(implementation.rustName)
      const name = fresh('value')
      const jsonpathExecution =
        jsonpathTimezone ||
        (implementation.schema === 'pg_catalog' &&
          [
            'jsonb_path_exists',
            'jsonb_path_exists_opr',
            'jsonb_path_match',
            'jsonb_path_match_opr',
            'jsonb_path_query_array',
            'jsonb_path_query_first',
          ].includes(implementation.name))
      const characterContext = characterEncodingContext(implementation)
      const callable = characterContext
        ? characterContext + '_context'
        : jsonpathExecution
          ? implementation.name.replace('jsonb_path_', 'jsonpath_') + '_context'
          : implementation.rustName
      if (characterContext) arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      if (
        implementation.schema === 'pg_catalog' &&
        ((['json_extract_path', 'json_extract_path_text'].includes(implementation.name) &&
          implementation.args.length === 2 &&
          implementation.args[0] === 'pg_catalog."json"' &&
          implementation.args[1] === 'pg_catalog._text') ||
          (implementation.name === 'json_strip_nulls' &&
            implementation.args.join(',') === 'pg_catalog."json",pg_catalog.bool'))
      )
        arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      if (jsonpathExecution)
        arguments_.push(
          String(executionContext.defaultCollation === 'C'),
          String(executionContext.serverEncoding === 'UTF8'),
          String(
            executionContext.defaultCtype === 'C'
              ? 1
              : executionContext.defaultCtype === 'C.UTF-8'
                ? 2
                : 0,
          ),
        )
      const hashContext = nativeHashContext(implementation)
      if (hashContext) {
        arguments_.push(
          String(
            executionContext.nativeByteOrder === 'little'
              ? 1
              : executionContext.nativeByteOrder === 'big'
                ? 2
                : 0,
          ),
        )
        if (hashContext === 'text')
          arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      }
      destination.push(`let ${name} = ${callable}(${arguments_.join(', ')});`)
      return { name, type: call.type }
    }
    if (node.kind === 'array-io-coerce') {
      const operand = emitScalar(node.operand, bindings, used)
      const family = arrayElementFamily(node.elementType)
      const castLink = builtinCast(node.sourceElementType, node.elementType)
      const input = builtinMetadata(node.input)
      const output =
        node.sourceEnum?.outputFunction ?? builtinTypeIO(node.sourceElementType)?.output
      const expectedInput = node.enum
        ? input.kind === 'function' &&
          input.schema === 'pg_catalog' &&
          input.name === 'enum_in' &&
          input.args.join(',') === 'pg_catalog.cstring,pg_catalog.oid'
        : builtinTypeIO(node.elementType)?.input === node.input
      if (
        operand.type !== `array:${node.sourceElementType}` ||
        node.type !== `array:${node.elementType}` ||
        family === null ||
        !Number.isInteger(node.modifier) ||
        node.modifier < -1 ||
        node.modifier > 2147483647 ||
        output !== node.output ||
        !expectedInput ||
        input.kind !== 'function' ||
        !input.strict ||
        input.args[0] !== 'pg_catalog.cstring' ||
        input.result !==
          (node.enum
            ? 'pg_catalog.anyenum'
            : node.elementType === 'pg_catalog.refcursor'
              ? 'pg_catalog.text'
              : node.elementType) ||
        (node.enum &&
          (enumType(node.enum) !== node.elementType ||
            node.enum.values.some((label) => label.includes('\0')))) ||
        !(
          castLink?.method === 'i' ||
          (!castLink &&
            [node.sourceElementType, node.elementType].some(
              (type) => builtinTypeResolution(type)?.category === 'S',
            ))
        )
      )
        throw new UnsupportedCheckRustExpression(
          'Array I/O coercion requires its concrete catalog identities',
        )
      const payload = bind(`prepare_array_output(${ownedOperand(operand)})`)
      const initial = bind(`make_array_conversion()`)
      const first = bind('make_int4_value(0)')
      const builder = fresh('array_io_builder'),
        index = fresh('array_io_index'),
        element = fresh('array_io_element'),
        scalar = fresh('array_io_scalar'),
        event = fresh('array_io_text')
      const rendered = arrayElementOutput(node.sourceElementType, node.sourceEnum, element, scalar)
      const lines: string[] = []
      if (rendered.scalarRequired)
        lines.push(`let ${scalar} = array_element_to_${rendered.prefix}(${element});`)
      const conversion =
        node.sourceElementType === 'pg_catalog.jsonb'
          ? `jsonb_text_context(${scalar}, ${executionContext.serverEncoding === 'UTF8'})`
          : rendered.conversion
      lines.push(`let ${event} = ${conversion};`)
      let converted = renderArrayInputElement(
        node.elementType,
        node.enum,
        event,
        false,
        lines,
        undefined,
        true,
      )
      if (node.modifier >= 0) {
        const modified = fresh('array_io_modified')
        lines.push(
          `let ${modified} = array_element_typmod(${converted}, ${rustStringLiteral(node.elementType)}, ${node.modifier});`,
        )
        converted = modified
      }
      const unknownValid =
        builtinTypeResolution(node.elementType)?.category === 'S' ||
        (node.sourceElementType === 'pg_catalog.jsonb' && node.elementType === 'pg_catalog."json"')
      bindings.push(
        `let mut ${builder}: ArrayOutputPayload = ${initial};`,
        `let mut ${index}: Int4Value = ${first};`,
        `while array_output_has_element(&${payload}, ${index}) {`,
        `    let ${element} = array_output_element_at(&${payload}, ${index});`,
        ...indent(lines),
        `    ${builder} = append_array_conversion(${builder}, ${converted}, ${unknownValid});`,
        `    ${index} = array_text_next_index(${index});`,
        '}',
      )
      const arguments_ = bind(
        `array_conversion_arguments(${builder}, ${rustStringLiteral(node.elementType)}, ${family})`,
      )
      return {
        name: bind(`finish_array_coercion(${payload}, ${arguments_}, false)`),
        type: node.type,
      }
    }
    if (node.kind === 'array-coerce') {
      const operand = emitScalar(node.operand, bindings, used)
      const sourceType = `array:${node.sourceElementType}`
      const family = arrayElementFamily(node.elementType)
      const castLink = builtinCast(node.sourceElementType, node.elementType)
      if (
        operand.type !== sourceType ||
        node.type !== `array:${node.elementType}` ||
        family === null ||
        node.conversion.kind !== 'cast' ||
        node.conversion.type !== node.elementType ||
        !Number.isInteger(node.modifier) ||
        node.modifier < -1 ||
        node.modifier > 2147483647 ||
        (node.conversion.signature === null
          ? castLink?.method !== 'b'
          : castLink?.method !== 'f' || castLink.implementation !== node.conversion.signature)
      )
        throw new UnsupportedCheckRustExpression(
          'Array coercion requires matching concrete element types',
        )
      const payload = bind(`prepare_array_output(${ownedOperand(operand)})`)
      const initial = bind(`make_array_conversion()`)
      const first = bind('make_int4_value(0)')
      const builder = fresh('array_coercion_builder'),
        index = fresh('array_coercion_index'),
        element = fresh('array_coercion_element')
      const scalar = fresh('array_coercion_scalar'),
        converted = fresh('array_coercion_converted')
      const lines: string[] = []
      let conversion: string
      const outerValidity: string | null = arrayValidityScope
      arrayValidityScope = null
      try {
        if (node.conversion.signature !== null) {
          const callable = builtinMetadata(node.conversion.signature)
          if (callable.kind !== 'function' || !checkRustCallableNames().has(callable.rustName))
            throw new UnsupportedCheckRustExpression(
              'Array element cast implementation is unavailable',
            )
        }
        const sourcePrefix = rustValuePrefix(rustType(node.sourceElementType))
        lines.push(`let ${scalar} = array_element_to_${sourcePrefix}(${element}.clone());`)
        const args = [{ name: scalar, type: node.sourceElementType as string }]
        const signature =
          node.conversion.signature === null ? null : builtinMetadata(node.conversion.signature)
        if (signature && signature.args.length > 1) {
          const modifier = fresh('array_coercion_modifier')
          lines.push(`let ${modifier} = make_int4_value(${node.modifier});`)
          args.push({ name: modifier, type: 'pg_catalog.int4' })
        }
        if (signature && signature.args.length > 2) {
          const explicit = fresh('array_coercion_explicit')
          lines.push(`let ${explicit} = make_bool_value(${node.explicit});`)
          args.push({ name: explicit, type: 'pg_catalog.bool' })
        }
        const call =
          signature && signature.args.length > 1
            ? {
                kind: 'function' as const,
                signature: node.conversion.signature!,
                type: node.elementType,
              }
            : node.conversion
        const value =
          castLink?.method === 'b' && arrayElementFamily(node.sourceElementType) === family
            ? { name: scalar, type: node.elementType }
            : emitCall(call, args, lines)
        const targetPrefix = rustValuePrefix(rustType(node.elementType))
        conversion = `array_element_from_${targetPrefix}(${ownedOperand(value)})`
      } catch (error) {
        if (!(error instanceof UnsupportedCheckRustExpression)) throw error
        lines.length = 0
        conversion = `array_coercion_deferred(${element}.clone())`
      } finally {
        arrayValidityScope = outerValidity
      }
      const validity = fresh('array_cast_validity')
      const alwaysValid = rustArrayCastAlwaysValid(node, executionContext)
      bindings.push(
        `let mut ${builder}: ArrayOutputPayload = ${initial};`,
        `let mut ${index}: Int4Value = ${first};`,
        `while array_output_has_element(&${payload}, ${index}) {`,
        `    let ${element} = array_output_element_at(&${payload}, ${index});`,
        ...indent(lines),
        `    let ${converted} = ${conversion};`,
        `    let ${validity} = array_cast_validity(${element}, ${rustStringLiteral(node.sourceElementType)}, ${rustStringLiteral(node.elementType)}, ${alwaysValid});`,
        `    ${builder} = append_array_cast_conversion(${builder}, ${converted}, ${validity});`,
        `    ${index} = array_text_next_index(${index});`,
        '}',
      )
      const arguments_ = bind(
        `array_conversion_arguments(${builder}, ${rustStringLiteral(node.elementType)}, ${family})`,
      )
      return {
        name: bind(
          `finish_array_coercion(${payload}, ${arguments_}, ${node.conversion.signature === null && node.modifier < 0})`,
        ),
        type: node.type,
      }
    }
    if (node.kind === 'check') {
      if (node.expression.kind === 'eval-scalar')
        return emitScalar(node.expression.expression, bindings, used)
      if (node.expression.kind === 'certain')
        return emitScalar(
          { kind: 'certain', expression: node.expression.expression },
          bindings,
          used,
        )
      if (node.expression.kind === 'uncertain')
        return { name: bind('bool_unknown()'), type: 'pg_catalog.bool' }
      const outcome = emit(node.expression)
      bindings.push(...outcome.lines)
      for (const input of outcome.inputs) used.add(input)
      return { name: bind(`bool_from_check(${outcome.name})`), type: 'pg_catalog.bool' }
    }
    if (node.kind === 'input') {
      const item = input(node.name, node.type, false, node.enum)
      used.add(item.name)
      return { name: item.rustName, type: node.type }
    }
    if (node.kind === 'uncertain') {
      const kind = rustType(node.type)
      const helper = rustValuePrefix(kind) + '_unknown'
      return { name: bind(`${helper}()`), type: node.type }
    }
    if (node.kind === 'bit-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog."bit"' && operand.type !== 'pg_catalog.varbit')
        throw new UnsupportedCheckRustExpression('A bit output cast requires a bit value')
      return { name: bind(`bit_to_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'refcursor-text-coercion') {
      const operand = emitScalar(node.operand, bindings, used)
      const cursorIO = builtinTypeIO('pg_catalog.refcursor'),
        textIO = builtinTypeIO('pg_catalog.text')
      if (
        !cursorIO ||
        !textIO ||
        cursorIO.input !== textIO.input ||
        cursorIO.output !== textIO.output ||
        !(
          (node.type === 'pg_catalog.text' && operand.type === 'pg_catalog.refcursor') ||
          (node.type === 'pg_catalog.refcursor' &&
            [
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
              'pg_catalog.name',
            ].includes(operand.type))
        )
      )
        throw new UnsupportedCheckRustExpression(
          'Refcursor conversion requires its shared text I/O identity',
        )
      return { ...operand, type: node.type }
    }
    if (node.kind === 'io-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      const output = node.enum?.outputFunction ?? builtinTypeIO(operand.type)?.output
      if (!output || output !== node.output)
        throw new UnsupportedCheckRustExpression('Text output needs its catalog I/O identity')
      const metadata = builtinMetadata(output)
      if (
        metadata.kind !== 'function' ||
        metadata.result !== 'pg_catalog.cstring' ||
        !metadata.strict ||
        metadata.args.length !== 1 ||
        metadata.args[0] !== (node.enum ? 'pg_catalog.anyenum' : operand.type)
      )
        throw new UnsupportedCheckRustExpression('Unsupported text output function')
      if (node.enum) {
        if (
          operand.type !== enumType(node.enum) ||
          node.enum.values.length > 2147483647 ||
          node.enum.values.some((label) => label.includes('\0'))
        )
          throw new UnsupportedCheckRustExpression(
            'Enum text output needs its concrete label definition',
          )
        return {
          name: bind(
            `enum_to_text(${operand.name}, ${rustStringLiteral(node.enum.values.join('\0'))}, ${node.enum.values.length})`,
          ),
          type: node.type,
        }
      }
      if (
        (!isOidAliasType(operand.type) &&
          ![
            'pg_catalog.int2',
            'pg_catalog.int4',
            'pg_catalog.int8',
            'pg_catalog."numeric"',
            'pg_catalog.oid',
            'pg_catalog.xid',
            'pg_catalog.cid',
            'pg_catalog.pg_lsn',
            'pg_catalog.tid',
            'pg_catalog."char"',
            'pg_catalog.xid8',
            'pg_catalog.pg_snapshot',
            'pg_catalog.txid_snapshot',
            'pg_catalog."json"',
            'pg_catalog.jsonb',
            'pg_catalog.jsonpath',
          ].includes(operand.type)) ||
        (metadata.volatility !== 'i' && !isOidAliasType(operand.type))
      )
        throw new UnsupportedCheckRustExpression('Unsupported scalar text output')
      if (isOidAliasType(operand.type))
        return {
          name: bind(
            `oid_alias_to_text(${operand.name}, ${!['pg_catalog.regoper', 'pg_catalog.regoperator'].includes(operand.type)})`,
          ),
          type: node.type,
        }
      if (isSnapshotType(operand.type))
        return { name: bind(`snapshot_to_text(${ownedOperand(operand)})`), type: node.type }
      if (operand.type === 'pg_catalog."numeric"')
        return { name: bind(`array_numeric_output(${ownedOperand(operand)})`), type: node.type }
      if (operand.type === 'pg_catalog.jsonpath')
        return { name: bind(`jsonpath_to_text(${ownedOperand(operand)})`), type: node.type }
      if (operand.type === 'pg_catalog.jsonb')
        return {
          name: bind(
            `jsonb_text_context(${ownedOperand(operand)}, ${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: node.type,
        }
      if (operand.type === 'pg_catalog."json"')
        return { name: bind(`json_to_text(${ownedOperand(operand)})`), type: node.type }
      const helper = operand.type.slice('pg_catalog.'.length) + '_to_text'
      return { name: bind(`${helper}(${operand.name})`), type: node.type }
    }
    if (node.kind === 'text-to-money') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Money input requires text and its catalog I/O identity',
        )
      return { name: bind(`money_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-xid') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Xid input requires text and its catalog I/O identity',
        )
      return { name: bind(`xid_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-cid') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Cid input requires text and its catalog I/O identity',
        )
      return { name: bind(`cid_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-pg_lsn') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'PgLsn input requires text and its catalog I/O identity',
        )
      return { name: bind(`pg_lsn_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-tid') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Tid input requires text and its catalog I/O identity',
        )
      return { name: bind(`tid_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-snapshot') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type) ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring' ||
        builtinMetadata(io).result !== node.type
      )
        throw new UnsupportedCheckRustExpression('Snapshot input requires its catalog I/O identity')
      return { name: bind(`snapshot_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-json') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type) ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring' ||
        builtinMetadata(io).result !== node.type
      )
        throw new UnsupportedCheckRustExpression('JSON input requires its catalog I/O identity')
      if (node.type === 'pg_catalog.jsonpath') {
        requiresRegex = true
        return {
          name: bind(
            `jsonpath_from_text(${ownedOperand(operand)}, ${executionContext.defaultCollation === 'C'}, ${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: node.type,
        }
      }
      return {
        name: bind(
          node.type === 'pg_catalog.jsonb'
            ? `jsonb_from_text_context(${ownedOperand(operand)}, ${executionContext.serverEncoding === 'UTF8'})`
            : `json_from_text(${ownedOperand(operand)})`,
        ),
        type: node.type,
      }
    }
    if (node.kind === 'text-to-xid8') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Xid8 input requires text and its catalog I/O identity',
        )
      return { name: bind(`xid8_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-oid') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Oid input requires text and its catalog I/O identity',
        )
      const dash = !['pg_catalog.regoper', 'pg_catalog.regoperator'].includes(node.type)
      const grammar =
        node.type === 'pg_catalog.regtype'
          ? 2
          : ['pg_catalog.regprocedure', 'pg_catalog.regoperator'].includes(node.type)
            ? 1
            : 0
      return {
        name: bind(
          isOidAliasType(node.type)
            ? `oid_alias_from_text(${ownedOperand(operand)}, ${dash}, ${grammar})`
            : `oid_from_text(${ownedOperand(operand)})`,
        ),
        type: node.type,
      }
    }
    if (
      node.kind === 'text-to-point' ||
      node.kind === 'text-to-line' ||
      node.kind === 'text-to-lseg' ||
      node.kind === 'text-to-polygon' ||
      node.kind === 'text-to-path' ||
      node.kind === 'text-to-circle' ||
      node.kind === 'text-to-box'
    ) {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Geometric input requires text and its catalog I/O identity',
        )
      const helper =
        node.kind === 'text-to-polygon'
          ? 'polygon_from_text'
          : node.kind === 'text-to-path'
            ? 'path_from_text'
            : node.kind === 'text-to-circle'
              ? 'circle_from_text'
              : node.kind === 'text-to-box'
                ? 'box_from_text'
                : node.kind === 'text-to-lseg'
                  ? 'lseg_from_text'
                  : node.kind === 'text-to-line'
                    ? 'line_from_text'
                    : 'point_from_text'
      return { name: bind(`${helper}(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-integer') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      const input = io ? builtinMetadata(io) : null
      const output = builtinTypeIO(operand.type)?.output
      const source = output ? builtinMetadata(output) : null
      if (
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type) ||
        input?.kind !== 'function' ||
        input.args.join(',') !== 'pg_catalog.cstring' ||
        input.result !== node.type ||
        !input.strict ||
        input.volatility !== 'i' ||
        source?.kind !== 'function' ||
        source.args.length !== 1 ||
        source.args[0] !== operand.type ||
        source.result !== 'pg_catalog.cstring' ||
        !source.strict ||
        source.volatility !== 'i'
      )
        throw new UnsupportedCheckRustExpression(
          'Integer input requires its catalog I/O identities',
        )
      const bits = node.type === 'pg_catalog.int2' ? 16 : node.type === 'pg_catalog.int4' ? 32 : 64
      const parsed = {
        name: bind(`scalar_integer_from_text(${ownedOperand(operand)}, ${bits})`),
        type: 'pg_catalog.int8',
      }
      if (node.type === 'pg_catalog.int8') return parsed
      const cast = builtinCast('pg_catalog.int8', node.type)
      if (cast?.method !== 'f' || !cast.implementation)
        throw new UnsupportedCheckRustExpression(
          'Integer input requires a catalog width conversion',
        )
      return emitCall({ kind: 'cast', signature: cast.implementation, type: node.type }, [parsed])
    }
    if (node.kind === 'text-to-numeric') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      const input = io ? builtinMetadata(io) : null
      const output = builtinTypeIO(operand.type)?.output
      const source = output ? builtinMetadata(output) : null
      if (
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type) ||
        input?.kind !== 'function' ||
        input.args.join(',') !== 'pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4' ||
        input.result !== node.type ||
        !input.strict ||
        input.volatility !== 'i' ||
        source?.kind !== 'function' ||
        source.args.length !== 1 ||
        source.args[0] !== operand.type ||
        source.result !== 'pg_catalog.cstring' ||
        !source.strict ||
        source.volatility !== 'i'
      )
        throw new UnsupportedCheckRustExpression(
          'Numeric input requires its catalog I/O identities',
        )
      return { name: bind(`scalar_numeric_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-float') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog.text')
        throw new UnsupportedCheckRustExpression('A floating-point input cast requires text')
      const io = builtinTypeIO(node.type)?.input
      if (!io || builtinMetadata(io).args[0] !== 'pg_catalog.cstring')
        throw new UnsupportedCheckRustExpression(
          'A floating-point input cast needs its catalog I/O identity',
        )
      const prefix = node.type === 'pg_catalog.float4' ? 'float4' : 'float8'
      return { name: bind(`${prefix}_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-bit') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog.text')
        throw new UnsupportedCheckRustExpression('A bit input cast requires text')
      return {
        name: bind(`bit_from_text(${ownedOperand(operand)})`),
        type: node.type,
      }
    }
    if (node.kind === 'interval-literal') {
      const type = node.type
      const conversion = builtinCast(type, type)
      if (conversion?.method !== 'f' || !conversion.implementation)
        throw new UnsupportedCheckRustExpression('Interval precision needs its catalog identity')
      const metadata = builtinMetadata(conversion.implementation)
      if (
        metadata.kind !== 'function' ||
        metadata.result !== type ||
        metadata.args[0] !== type ||
        metadata.args[1] !== 'pg_catalog.int4' ||
        metadata.args.length !== 2
      )
        throw new UnsupportedCheckRustExpression('Invalid interval precision identity')
      callables.add(metadata.rustName)
      const text = bind(`make_text_value(${rustStringLiteral(node.value)})`)
      const fields = bind(`make_int4_value(${Math.floor(node.modifier / 65536)})`)
      const parsed = bind(`interval_from_text_fields(${text}, ${fields})`)
      const modifier = bind(`make_int4_value(${node.modifier})`)
      return { name: bind(`${metadata.rustName}(${parsed}, ${modifier})`), type }
    }
    if (node.kind === 'clock-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog."time"' && operand.type !== 'pg_catalog.timetz')
        throw new UnsupportedCheckRustExpression('Clock output requires time or timetz')
      const helper =
        operand.type === 'pg_catalog."time"' ? 'clock_time_to_text' : 'clock_timetz_to_text'
      return { name: bind(`${helper}(${operand.name})`), type: node.type }
    }
    if (node.kind === 'uuid-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog.uuid')
        throw new UnsupportedCheckRustExpression('A UUID output cast requires a UUID value')
      return { name: bind(`uuid_to_text(${operand.name})`), type: node.type }
    }
    if (node.kind === 'mac-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog.macaddr' && operand.type !== 'pg_catalog.macaddr8')
        throw new UnsupportedCheckRustExpression('A MAC output cast requires a MAC value')
      const helper = operand.type === 'pg_catalog.macaddr' ? 'macaddr_to_text' : 'macaddr8_to_text'
      return { name: bind(`${helper}(${operand.name})`), type: node.type }
    }
    if (
      node.kind === 'text-to-interval' ||
      node.kind === 'text-to-clock' ||
      node.kind === 'text-to-date' ||
      node.kind === 'text-to-timestamp' ||
      node.kind === 'text-to-timestamptz' ||
      node.kind === 'text-to-network' ||
      node.kind === 'text-to-mac' ||
      node.kind === 'text-to-uuid' ||
      node.kind === 'text-to-bytea'
    ) {
      const operand = emitScalar(node.operand, bindings, used)
      if (
        operand.type !== 'pg_catalog.text' &&
        !(node.kind === 'text-to-bytea' && operand.type === 'pg_catalog.bpchar')
      )
        throw new UnsupportedCheckRustExpression('A SQL text cast requires text')
      const helper =
        node.kind === 'text-to-interval'
          ? 'interval_from_text'
          : node.kind === 'text-to-clock'
            ? node.type === 'pg_catalog."time"'
              ? 'time_from_text'
              : 'timetz_from_text'
            : node.kind === 'text-to-bytea'
              ? 'bytea_from_text'
              : node.kind === 'text-to-uuid'
                ? 'uuid_from_text'
                : node.kind === 'text-to-date'
                  ? 'date_from_text'
                  : node.kind === 'text-to-timestamp'
                    ? 'timestamp_from_text'
                    : node.kind === 'text-to-timestamptz'
                      ? 'timestamptz_from_text'
                      : node.kind === 'text-to-mac'
                        ? node.type === 'pg_catalog.macaddr'
                          ? 'macaddr_from_text'
                          : 'macaddr8_from_text'
                        : node.type === 'pg_catalog.cidr'
                          ? 'cidr_from_text'
                          : 'network_from_text'
      return { name: bind(`${helper}(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'certain') {
      const value = node.expression
      if (
        value.kind === 'temporal' &&
        (value.type === 'pg_catalog."time"' ||
          value.type === 'pg_catalog.timetz' ||
          value.type === 'pg_catalog."interval"' ||
          value.type === 'pg_catalog.date' ||
          value.type === 'pg_catalog."timestamp"' ||
          value.type === 'pg_catalog.timestamptz')
      ) {
        const prefix =
          value.type === 'pg_catalog."time"'
            ? 'time'
            : value.type === 'pg_catalog.timetz'
              ? 'timetz'
              : value.type === 'pg_catalog."interval"'
                ? 'interval'
                : value.type === 'pg_catalog.date'
                  ? 'date'
                  : value.type === 'pg_catalog."timestamp"'
                    ? 'timestamp'
                    : 'timestamptz'
        if (value.value === null) return { name: bind(`${prefix}_null()`), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`${prefix}_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'enum') {
        if (value.type !== enumType(value.enum))
          throw new UnsupportedCheckRustExpression('Rust CHECK enum literal identity mismatch')
        if (value.value === null) return { name: bind('enum_null()'), type: value.type }
        const order = value.enum.values.indexOf(value.value)
        if (order < 0 || order > 2147483647)
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK enum label: ${value.value}`,
          )
        return { name: bind(`make_enum_value(${order})`), type: value.type }
      }
      if (value.kind === 'boolean') {
        const helper =
          value.value === null
            ? 'bool_null()'
            : `make_bool_value(${value.value ? 'true' : 'false'})`
        return { name: bind(helper), type: value.type }
      }
      if (value.kind === 'line') {
        if (value.value === null) return { name: bind('line_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`line_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'lseg') {
        if (value.value === null) return { name: bind('lseg_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`lseg_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'money') {
        if (value.value === null) return { name: bind('money_null()'), type: value.type }
        if (value.units !== undefined)
          return { name: bind(`make_money_value(${value.units}i64)`), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`money_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'xid') {
        if (value.value === null) return { name: bind('xid_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`xid_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'cid') {
        if (value.value === null) return { name: bind('cid_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`cid_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'pg_lsn') {
        if (value.value === null) return { name: bind('pg_lsn_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`pg_lsn_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'name') {
        if (value.value === null) return { name: bind('text_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`name_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'internal-char') {
        if (value.value === null) return { name: bind('internal_char_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`internal_char_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'tid') {
        if (value.value === null) return { name: bind('tid_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`tid_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'xid8') {
        if (value.value === null) return { name: bind('xid8_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`xid8_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'snapshot') {
        if (value.value === null) return { name: bind('snapshot_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`snapshot_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'array' && value.elements === null)
        return { name: bind('array_null()'), type: value.type }
      if (value.kind === 'jsonpath') {
        if (value.value === null) return { name: bind('jsonpath_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        if (value.origin === 'stored')
          return { name: bind(`jsonpath_from_stored_text(${text})`), type: value.type }
        requiresRegex = true
        return {
          name: bind(
            `jsonpath_from_text(${text}, ${executionContext.defaultCollation === 'C'}, ${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: value.type,
        }
      }
      if (value.kind === 'jsonb') {
        if (value.value === null) return { name: bind('jsonb_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return {
          name: bind(
            `jsonb_from_text_context(${text}, ${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: value.type,
        }
      }
      if (value.kind === 'json') {
        if (value.value === null) return { name: bind('json_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`json_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'oid') {
        if (value.value === null) return { name: bind('oid_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        const dash = !['pg_catalog.regoper', 'pg_catalog.regoperator'].includes(value.type)
        const grammar =
          value.type === 'pg_catalog.regtype'
            ? 2
            : ['pg_catalog.regprocedure', 'pg_catalog.regoperator'].includes(value.type)
              ? 1
              : 0
        return {
          name: bind(
            isOidAliasType(value.type)
              ? `oid_alias_from_text(${text}, ${dash}, ${grammar})`
              : `oid_from_text(${text})`,
          ),
          type: value.type,
        }
      }
      if (value.kind === 'polygon') {
        if (value.value === null) return { name: bind('polygon_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`polygon_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'path') {
        if (value.value === null) return { name: bind('path_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`path_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'circle') {
        if (value.value === null) return { name: bind('circle_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`circle_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'box') {
        if (value.value === null) return { name: bind('box_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`box_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'point') {
        if (value.value === null) return { name: bind('point_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`point_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'uuid') {
        if (value.value === null) return { name: bind('uuid_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`uuid_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'mac') {
        const prefix = value.type === 'pg_catalog.macaddr' ? 'macaddr' : 'macaddr8'
        if (value.value === null) return { name: bind(`${prefix}_null()`), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`${prefix}_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'network')
        return {
          name: bind(
            value.value === null
              ? 'network_null()'
              : `${value.type === 'pg_catalog.cidr' ? 'make_cidr_value' : 'make_network_value'}(${rustStringLiteral(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'float') {
        const single = value.type === 'pg_catalog.float4'
        const prefix = single ? 'float4' : 'float8'
        if (value.bits === null) return { name: bind(`${prefix}_null()`), type: value.type }
        if (!(single ? /^[0-9a-f]{8}$/u : /^[0-9a-f]{16}$/u).test(value.bits))
          throw new UnsupportedCheckRustExpression('Invalid floating-point literal bits')
        const bits = BigInt.asIntN(single ? 32 : 64, BigInt('0x' + value.bits))
        const literal = single
          ? bits === -2147483648n
            ? '-2147483647 - 1'
            : String(bits)
          : `${bits}i64`
        return { name: bind(`make_${prefix}_literal_bits(${literal})`), type: value.type }
      }
      if (value.kind === 'decimal')
        return {
          name: bind(
            value.value === null
              ? 'numeric_null()'
              : `make_numeric_value(${rustStringLiteral(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'bit')
        return {
          name: bind(
            value.value === null
              ? 'bit_null()'
              : `bit_from_literal(${rustStringLiteral(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'bytea')
        return {
          name: bind(
            value.value === null
              ? 'bytea_null()'
              : `make_bytea_value(${rustStringLiteral(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'refcursor')
        return {
          name: bind(
            value.value === null
              ? 'text_null()'
              : `make_refcursor_text_value(${rustStringLiteral(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'text')
        return {
          name: bind(
            value.value === null
              ? 'text_null()'
              : `make_text_value(${rustStringLiteral(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'integer' && value.type === 'pg_catalog.int8') {
        if (value.value === null) return { name: bind('int8_null()'), type: value.type }
        if (!/^-?(?:0|[1-9][0-9]*)$/u.test(value.value))
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK int8 literal: ${value.value}`,
          )
        const integer = BigInt(value.value)
        if (integer < -9223372036854775808n || integer > 9223372036854775807n)
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK int8 literal: ${value.value}`,
          )
        return { name: bind(`make_int8_value(${integer}i64)`), type: value.type }
      }
      if (
        value.kind === 'integer' &&
        (value.type === 'pg_catalog.int2' || value.type === 'pg_catalog.int4')
      ) {
        const prefix = value.type === 'pg_catalog.int2' ? 'int2' : 'int4'
        const limit = value.type === 'pg_catalog.int2' ? 32767n : 2147483647n
        if (value.value === null) return { name: bind(`${prefix}_null()`), type: value.type }
        if (!/^-?(?:0|[1-9][0-9]*)$/u.test(value.value))
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK ${prefix} literal: ${value.value}`,
          )
        const integer = BigInt(value.value)
        if (integer < -limit - 1n || integer > limit)
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK ${prefix} literal: ${value.value}`,
          )
        const literal = integer === -2147483648n ? '-2147483647 - 1' : integer.toString()
        return { name: bind(`make_${prefix}_value(${literal})`), type: value.type }
      }
      throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK constant: ${value.kind}`)
    }
    if (node.kind === 'input-null-test') {
      const item = input(node.name, node.type, true)
      used.add(item.name)
      return {
        name: node.negated ? bind(`bool_not_value(${item.rustName})`) : item.rustName,
        type: node.type,
      }
    }
    if (node.kind === 'null-test') {
      if (
        node.operand.kind === 'input' &&
        !node.operand.type.startsWith('enum:') &&
        !isOidType(node.operand.type) &&
        ![
          'pg_catalog.inet',
          'pg_catalog.cidr',
          'pg_catalog.int2',
          'pg_catalog.int4',
          'pg_catalog.int8',
          'pg_catalog.float4',
          'pg_catalog.float8',
          'pg_catalog.point',
          'pg_catalog.line',
          'pg_catalog.lseg',
          'pg_catalog.money',
          'pg_catalog.xid',
          'pg_catalog.cid',
          'pg_catalog.pg_lsn',
          'pg_catalog.tid',
          'pg_catalog."char"',
          'pg_catalog.xid8',
          'pg_catalog.pg_snapshot',
          'pg_catalog.txid_snapshot',
          'pg_catalog."json"',
          'pg_catalog.jsonb',
          'pg_catalog.jsonpath',
          'pg_catalog.oid',
          'pg_catalog.polygon',
          'pg_catalog.path',
          'pg_catalog.circle',
          'pg_catalog.box',
          'pg_catalog."numeric"',
          'pg_catalog."time"',
          'pg_catalog.timetz',
          'pg_catalog."interval"',
          'pg_catalog.date',
          'pg_catalog."timestamp"',
          'pg_catalog.timestamptz',
          'pg_catalog.refcursor',
          'pg_catalog.name',
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.bool',
        ].includes(node.operand.type)
      ) {
        const item = input(node.operand.name, node.operand.type, true)
        used.add(item.name)
        return {
          name: node.negated ? bind(`bool_not_value(${item.rustName})`) : item.rustName,
          type: node.type,
        }
      }
      const operand = emitPreparedOperand(node.operand, bindings, used)
      const kind = rustType(operand.type)
      const helper = rustValuePrefix(kind) + '_is_null'
      const result = bind(`${helper}(${ownedOperand(operand)})`)
      return {
        name: node.negated ? bind(`bool_not_value(${result})`) : result,
        type: 'pg_catalog.bool',
      }
    }
    if (node.kind === 'call') {
      const preparation = strictNullPreparation(node)
      if (preparation) {
        const folded = emitConstantNull(node.call.type, preparation)
        return emitCall(
          node.call,
          node.operands.map((operand) => ({
            name: 'constant_operand',
            type: scalarType(operand),
          })),
          bindings,
          folded,
        )
      }
      if (
        preparationDepth === 0 &&
        node.operands.some(
          (operand) => operand.kind !== 'certain' && constantScalarExpression(operand),
        )
      ) {
        const callable = node.call.signature === null ? null : builtinMetadata(node.call.signature)
        const implementation =
          callable?.kind === 'operator' ? builtinMetadata(callable.implementation) : callable
        const strict =
          node.call.signature === null ||
          (implementation?.kind === 'function' && implementation.strict)
        const guard = fresh('constant_operand_null')
        constantDeclarations.push(`let mut ${guard}: CheckOutcome = check_unknown();`)
        const initial = fresh('constant_operand_start')
        preparationLines.push(
          `let ${initial} = make_bool_value(false);`,
          `${guard} = check_from_bool(${initial});`,
        )
        const lines: string[] = []
        const operands = node.operands.map((operand) => {
          if (!constantScalarExpression(operand)) return emitScalar(operand, lines, used)
          preparationDepth++
          let value: { name: string; type: string }
          try {
            value = emitScalar(operand, preparationLines, used)
          } finally {
            preparationDepth--
          }
          const kind = rustType(value.type)
          const prefix = rustValuePrefix(kind)
          const name = fresh('constant_argument')
          constantDeclarations.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
          preparationLines.push(`${name} = ${ownedOperand(value)};`)
          if (strict) {
            const nullness = fresh('constant_argument_nullness')
            const state = fresh('constant_argument_state')
            preparationLines.push(
              `let ${nullness} = ${prefix}_is_null(${ownedOperand({ name, type: value.type })});`,
              `let ${state} = check_from_bool(${nullness});`,
              `${guard} = or_finish(${guard}, ${state});`,
            )
          }
          return { name, type: value.type }
        })
        const value = emitCall(node.call, operands, lines)
        const kind = rustType(value.type)
        const prefix = rustValuePrefix(kind)
        const name = fresh('prepared_call')
        bindings.push(
          `let mut ${name}: ${kind} = ${prefix}_null();`,
          `if case_guard_takes(${guard}) == false {`,
          ...indent(lines),
          `    ${name} = ${ownedOperand(value)};`,
          '};',
        )
        return { name, type: value.type }
      }
      return emitCall(
        node.call,
        node.operands.map((operand) =>
          scalarType(operand).startsWith('array:')
            ? emitPreparedOperand(operand, bindings, used)
            : emitScalar(operand, bindings, used),
        ),
      )
    }
    if (node.kind === 'array-constructor') {
      const family = arrayElementFamily(node.elementType)
      if (family === null)
        throw new UnsupportedCheckRustExpression(
          'Missing array element carrier: ' + node.elementType,
        )
      const initial = bind('make_bool_value(true)'),
        validity = fresh('array_constructor_validity')
      bindings.push(`let mut ${validity}: CheckOutcome = check_from_bool(${initial});`)
      const outer: string | null = arrayValidityScope
      arrayValidityScope = validity
      let operands: { name: string; type: string }[]
      try {
        operands = node.operands.map((operand) => emitPreparedOperand(operand, bindings, used))
      } finally {
        arrayValidityScope = outer
      }
      let builder = bind(
        `${node.multidimensional ? 'make_array_children' : 'make_array_arguments'}(${rustStringLiteral(node.elementType)}, ${family})`,
      )
      for (const operand of operands) {
        if (node.multidimensional)
          builder = bind(`append_array_child(${builder}, ${ownedOperand(operand)})`)
        else {
          const prefix = rustValuePrefix(rustType(node.elementType))
          const element = bind(`array_element_from_${prefix}(${ownedOperand(operand)})`)
          builder = bind(`append_array_argument(${builder}, ${element})`)
        }
      }
      const finished = bind(
        `${node.multidimensional ? 'finish_array_children' : 'finish_array_constructor'}(${builder})`,
      )
      return {
        name: bind(`array_constructor_from_validity(${finished}, ${validity})`),
        type: node.type,
      }
    }
    if (node.kind === 'boolean-logic') {
      const outcome = emit({
        kind: 'eval-boolean-logic',
        operation: node.operation,
        operands: node.operands.map((expression) => ({ kind: 'eval-scalar', expression })),
      })
      bindings.push(...outcome.lines)
      for (const input of outcome.inputs) used.add(input)
      return { name: bind(`bool_from_check(${outcome.name})`), type: node.type }
    }
    if (node.kind === 'distinct') {
      const operands = node.operands.map((operand) => emitPreparedOperand(operand, bindings, used))
      const nulls = operands.map((operand) => {
        const helper = rustValuePrefix(rustType(operand.type)) + '_is_null'
        return bind(`${helper}(${ownedOperand(operand)})`)
      })
      const name = fresh('distinct_result')
      bindings.push(`let mut ${name}: CheckOutcome = distinct_nulls_finish(${nulls.join(', ')});`)
      const lines: string[] = []
      const comparison = emitCall(node.comparison, operands, lines)
      const outcome = fresh('distinct_comparison')
      bindings.push(
        `if distinct_needs_comparison(${nulls.join(', ')}) {`,
        ...indent(lines),
        `    let ${outcome} = check_from_bool(${comparison.name});`,
        `    ${name} = not_finish(${outcome});`,
        '}',
      )
      const result = node.negated ? bind(`not_finish(${name})`) : name
      return { name: bind(`bool_from_check(${result})`), type: node.type }
    }
    if (node.kind === 'nullif') {
      if (scalarType(node.operands[0]) !== node.type)
        throw new UnsupportedCheckRustExpression(
          'NULLIF result type must match its coerced first operand',
        )
      const preparation = nullifNullPreparation(node)
      if (preparation) {
        emitCall(
          node.comparison,
          node.operands.map((operand) => ({ name: 'constant_operand', type: scalarType(operand) })),
          [],
          { name: 'constant_comparison', type: 'pg_catalog.bool' },
        )
        return emitConstantNull(node.type, preparation)
      }
      const first = emitPreparedOperand(node.operands[0], bindings, used)
      const lines: string[] = []
      const second = emitPreparedOperand(node.operands[1], lines, used)
      const comparison = emitCall(node.comparison, [first, second], lines)
      const guard = fresh('nullif_comparison')
      lines.push(`let ${guard} = check_from_bool(${comparison.name});`)
      const kind = rustType(node.type)
      const prefix = rustValuePrefix(kind)
      const name = fresh('nullif_result')
      lines.push(
        `if case_guard_stops(${guard}) {`,
        `    ${name} = ${prefix === 'bool' ? 'bool_from_check' : `${prefix}_from_case_guard`}(${guard});`,
        `} else if case_guard_takes(${guard}) {`,
        `    ${name} = ${prefix}_null();`,
        '};',
      )
      bindings.push(`let mut ${name}: ${kind} = ${ownedOperand(first)};`)
      if (preparationDepth === 0 && constantScalarExpression(node.operands[0])) {
        const nullness = bind(`${prefix}_is_null(${ownedOperand(first)})`)
        const guard = bind(`check_from_bool(${nullness})`)
        bindings.push(`if case_guard_takes(${guard}) == false {`, ...indent(lines), '};')
      } else bindings.push(...lines)
      return { name, type: node.type }
    }
    if (node.kind === 'array-quantifier') {
      if (node.comparison.signature === null)
        throw new UnsupportedCheckRustExpression('Array quantifiers require a resolved operator')
      const metadata = builtinMetadata(node.comparison.signature)
      const implementation =
        metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
      if (
        metadata.kind !== 'operator' ||
        metadata.result !== 'pg_catalog.bool' ||
        implementation.kind !== 'function'
      )
        throw new UnsupportedCheckRustExpression('Array quantifiers require a Boolean operator')
      const initial = bind('make_bool_value(true)'),
        validity = fresh('array_quantifier_validity')
      bindings.push(`let mut ${validity}: CheckOutcome = check_from_bool(${initial});`)
      const outer: string | null = arrayValidityScope
      arrayValidityScope = validity
      let subject: { name: string; type: string }, array: { name: string; type: string }
      try {
        subject = emitPreparedOperand(node.operands[0], bindings, used)
        array = emitPreparedOperand(node.operands[1], bindings, used)
      } finally {
        arrayValidityScope = outer
      }
      if (array.type !== `array:${node.elementType}`)
        throw new UnsupportedCheckRustExpression('Array quantifier element identity differs')
      const nullness = bind(
        `${rustValuePrefix(rustType(subject.type))}_is_null(${ownedOperand(subject)})`,
      )
      const payload = bind(
        `prepare_array_quantifier(${nullness}, ${ownedOperand(array)}, ${metadata.strict})`,
      )
      const first = bind(`array_quantifier_initial(&${payload}, ${node.any})`)
      const start = bind('make_int4_value(0)'),
        index = fresh('array_quantifier_index'),
        result = fresh('array_quantifier_result')
      bindings.push(
        `let mut ${index}: Int4Value = ${start};`,
        `let mut ${result}: CheckOutcome = ${first};`,
      )
      const element = fresh('array_quantifier_element'),
        value = fresh('array_quantifier_value'),
        cellNull = fresh('array_quantifier_null'),
        pair = fresh('array_quantifier_pair')
      const prefix = rustValuePrefix(rustType(node.elementType))
      const body: string[] = [
        `let ${element} = array_comparison_element_at(&${payload}, ${index}, false);`,
        `let ${value} = array_element_to_${prefix}(${element});`,
        `let ${cellNull} = ${prefix}_is_null(${ownedOperand({ name: value, type: node.elementType })});`,
        `let mut ${pair}: BoolValue = array_quantifier_cell(${cellNull}, ${metadata.strict});`,
      ]
      const comparisonLines: string[] = []
      const safe = !rustCallCanFail(
        node.comparison,
        [subject.type, node.elementType],
        executionContext,
      )
      arrayValidityScope = validity
      try {
        if (!checkRustCallableNames().has(implementation.rustName))
          throw new UnsupportedCheckRustExpression(
            'Array quantifier scalar implementation unavailable',
          )
        const compared = emitCall(
          node.comparison.kind !== 'cast' &&
            node.comparison.collationDefault &&
            executionContext.defaultCollation === 'C'
            ? { ...node.comparison, collation: 'C' }
            : node.comparison,
          [subject, { name: value, type: node.elementType }],
          comparisonLines,
        )
        comparisonLines.push(`${pair} = ${compared.name};`)
      } catch (error) {
        if (!(error instanceof UnsupportedCheckRustExpression)) throw error
        comparisonLines.length = 0
        comparisonLines.push(`${pair} = bool_unknown();`)
        appendArrayValidity({ name: pair, type: node.type }, safe, comparisonLines)
      } finally {
        arrayValidityScope = outer
      }
      body.push(
        `if array_quantifier_needs_call(${pair}) {`,
        ...indent(comparisonLines),
        '};',
        `${result} = array_quantifier_step(${result}, ${pair}, ${node.any});`,
        `${index} = array_text_next_index(${index});`,
      )
      bindings.push(
        `while array_quantifier_continues(&${payload}, ${index}, ${result}, ${node.any}, ${safe}) {`,
        ...indent(body),
        '}',
      )
      if (outer && preparationDepth === 0)
        bindings.push(`${outer} = array_validity_finish(${outer}, ${validity});`)
      return { name: bind(`array_quantifier_finish(${result}, ${validity})`), type: node.type }
    }
    if (node.kind === 'membership') {
      if (!node.groups.length || node.groups.some((group) => !group.length))
        throw new UnsupportedCheckRustExpression('Expected a membership list')
      const subject = emitScalar(node.subject, bindings, used)
      const finish = node.operation === 'or' ? 'or_finish' : 'and_finish'
      const stop = node.operation === 'or' ? 'or_stops' : 'and_stops'
      const emitGroup = (group: readonly EvalExpression[], lines: string[]): string => {
        const members = group.map((member) => emitScalar(member, lines, used))
        let result: string | null = null
        for (const member of members) {
          const comparison = emitCall(node.comparison, [subject, member], lines)
          const outcome = fresh('membership_comparison')
          lines.push(`let ${outcome} = check_from_bool(${comparison.name});`)
          if (result === null) result = outcome
          else {
            const combined = fresh('membership_group')
            lines.push(`let ${combined} = ${finish}(${result}, ${outcome});`)
            result = combined
          }
        }
        return result!
      }
      const first = emitGroup(node.groups[0]!, bindings)
      if (node.groups.length === 1)
        return { name: bind(`bool_from_check(${first})`), type: node.type }
      const name = fresh('membership_result')
      bindings.push(`let mut ${name}: CheckOutcome = ${first};`)
      for (const group of node.groups.slice(1)) {
        const lines: string[] = []
        const outer: string | null = arrayValidityScope
        const validity = outer && preparationDepth === 0 ? fresh('array_member_validity') : null
        if (validity) {
          const initial = fresh('array_member_start')
          lines.push(
            `let ${initial} = make_bool_value(true);`,
            `let mut ${validity}: CheckOutcome = check_from_bool(${initial});`,
          )
          arrayValidityScope = validity
        }
        let selected: string
        try {
          selected = emitGroup(group, lines)
        } finally {
          arrayValidityScope = outer
        }
        if (validity && outer) {
          const possible = fresh('array_member_possible')
          lines.push(
            `if array_validity_unknown(${name}) {`,
            `    let ${possible} = array_validity_possible(${validity});`,
            `    ${outer} = array_validity_finish(${outer}, ${possible});`,
            `} else {`,
            `    ${outer} = array_validity_finish(${outer}, ${validity});`,
            '};',
          )
        }
        bindings.push(
          `if ${stop}(${name}) == false {`,
          ...indent(lines),
          `    ${name} = ${finish}(${name}, ${selected});`,
          '}',
        )
      }
      return { name: bind(`bool_from_check(${name})`), type: node.type }
    }
    if (node.kind === 'row-compare') {
      if (node.pairs.length < 2)
        throw new UnsupportedCheckRustExpression('Row ordering needs multiple fields')
      const pairs = node.pairs.map((pair) => ({
        ...pair,
        operands: pair.operands.map((operand) => {
          const lines: string[] = []
          const prepared = capturePreparation(() => emitPreparedOperand(operand, lines, used))
          preparationLines.push(...prepared.lines)
          if (constantScalarExpression(operand)) {
            bindings.push(...lines)
            lines.length = 0
          }
          return { value: prepared.value, lines }
        }),
      }))
      const name = fresh('row_ordering')
      bindings.push(`let mut ${name}: Int4Value = make_int4_value(0);`)
      for (const [index, pair] of pairs.entries()) {
        if (arrayValidityScope !== null && index > 0) {
          const nullness = bind(`int4_is_null(${name})`)
          const guard = bind(`check_from_bool(${nullness})`)
          unresolvedArrayChoice(
            guard,
            node.pairs.slice(index).map((remaining) => ({
              kind: 'call',
              call: remaining.comparison,
              operands: remaining.operands,
            })),
            bindings,
            used,
          )
        }
        const lines = pair.operands.flatMap((operand) => operand.lines)
        const comparison = emitCall(
          pair.comparison,
          pair.operands.map((operand) => operand.value),
          lines,
        )
        if (comparison.type !== 'pg_catalog.int4')
          throw new UnsupportedCheckRustExpression('Row comparator must return int4')
        bindings.push(
          `if row_compare_continues(${name}) {`,
          ...indent(lines),
          `    ${name} = ${comparison.name};`,
          '};',
        )
      }
      return { name: bind(`row_compare_finish(${name}, ${node.strategy})`), type: node.type }
    }
    if (node.kind === 'minmax') {
      if (
        !node.operands.length ||
        node.operands.some((operand) => scalarType(operand) !== node.type)
      )
        throw new UnsupportedCheckRustExpression('Invalid GREATEST/LEAST arguments')
      const kind = rustType(node.type)
      const prefix = rustValuePrefix(kind)
      const operands = node.operands.map((operand) => emitPreparedOperand(operand, bindings, used))
      if (operands.length === 1) return operands[0]!
      const name = fresh('minmax_result')
      const selected = { name, type: node.type }
      bindings.push(`let mut ${name}: ${kind} = ${ownedOperand(operands[0]!)};`)
      for (const operand of operands.slice(1)) {
        const leftNull = bind(`${prefix}_is_null(${ownedOperand(selected)})`)
        const rightNull = bind(`${prefix}_is_null(${ownedOperand(operand)})`)
        const guard = fresh('minmax_choice')
        bindings.push(
          `let mut ${guard}: CheckOutcome = minmax_nulls_choose_right(${leftNull}, ${rightNull});`,
        )
        const lines: string[] = []
        const metadata =
          node.comparison.signature === null ? null : builtinMetadata(node.comparison.signature)
        if (!metadata || metadata.args.length !== 2)
          throw new UnsupportedCheckRustExpression('GREATEST/LEAST needs catalog ordering')
        const compared = [selected, operand].map((value, index) => {
          const type = ['pg_catalog.anyenum', 'pg_catalog.anyarray'].includes(metadata.args[index]!)
            ? node.type
            : metadata.args[index]!
          return type === value.type
            ? value
            : emitCall(
                { kind: 'cast', signature: null, type: type as typeof node.type },
                [value],
                lines,
              )
        })
        const comparison = emitCall(node.comparison, compared, lines)
        bindings.push(
          `if distinct_needs_comparison(${leftNull}, ${rightNull}) {`,
          ...indent(lines),
          `    ${guard} = check_from_bool(${comparison.name});`,
          '};',
          `if case_guard_stops(${guard}) {`,
          `    ${name} = ${prefix === 'bool' ? 'bool_from_check' : `${prefix}_from_case_guard`}(${guard});`,
          `} else if case_guard_takes(${guard}) {`,
          `    ${name} = ${ownedOperand(operand)};`,
          '};',
        )
      }
      return selected
    }
    if (node.kind === 'coalesce') {
      if (!node.operands.length)
        throw new UnsupportedCheckRustExpression('Expected a COALESCE argument')
      const kind = rustType(node.type)
      const prefix = rustValuePrefix(kind)
      const operands = node.operands.map((operand) => {
        const lines: string[] = []
        const prepared = capturePreparation(() => emitScalar(operand, lines, used))
        if (prepared.value.type !== node.type)
          throw new UnsupportedCheckRustExpression('COALESCE argument type mismatch')
        return { value: prepared.value, lines, preparation: prepared.lines }
      })
      const prepareOperand = (position: number): string[] => {
        if (position === operands.length) return []
        const operand = operands[position]!
        const rest = prepareOperand(position + 1)
        if (!rest.length || !constantScalarExpression(node.operands[position]!))
          return [...operand.preparation, ...rest]
        const name = fresh('prepared_coalesce')
        constantDeclarations.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
        const nullness = fresh('prepared_nullness')
        const guard = fresh('prepared_null_guard')
        const lines = [
          ...operand.preparation,
          ...operand.lines,
          `${name} = ${ownedOperand(operand.value)};`,
          `let ${nullness} = ${prefix}_is_null(${ownedOperand({ name, type: node.type })});`,
          `let ${guard} = check_from_bool(${nullness});`,
          `${preparationState} = constant_finish(${preparationState}, ${guard});`,
          `if case_guard_takes(${guard}) {`,
          ...indent(rest),
          '};',
        ]
        operand.value = { name, type: node.type }
        operand.lines = []
        return lines
      }
      preparationLines.push(...prepareOperand(0))
      const first = operands[0]!.value
      bindings.push(...operands[0]!.lines)
      if (node.operands.length === 1) return first
      const name = fresh('coalesce_result')
      bindings.push(`let mut ${name}: ${kind} = ${ownedOperand(first)};`)
      for (const [index, operand] of operands.slice(1).entries()) {
        const nullness = bind(
          `${prefix}_is_null(${
            [
              'JsonValue',
              'JsonbValue',
              'JsonpathValue',
              'ArrayValue',
              'SnapshotValue',
              'PolygonValue',
              'PathValue',
              'TextValue',
              'ByteaValue',
              'BitValue',
              'NumericValue',
            ].includes(kind)
              ? `${name}.clone()`
              : name
          })`,
        )
        const guard = bind(`check_from_bool(${nullness})`)
        unresolvedArrayChoice(guard, node.operands.slice(index + 1), bindings, used)
        bindings.push(
          `if case_guard_takes(${guard}) {`,
          ...indent(operand.lines),
          `    ${name} = ${ownedOperand(operand.value)};`,
          '}',
        )
      }
      return { name, type: node.type }
    }
    if (node.kind === 'case') {
      if (!node.branches.length) throw new UnsupportedCheckRustExpression('Expected a CASE branch')
      const kind = rustType(node.type)
      const prefix = rustValuePrefix(kind)
      const scrutineeLines: string[] = []
      const scrutinee = node.scrutinee
        ? emitScalar(node.scrutinee.expression, scrutineeLines, used)
        : null
      const name = fresh('case_result')
      bindings.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
      const branchLines = (position: number): string[] => {
        const lines: string[] = []
        if (position === node.branches.length) {
          const otherwise = emitScalar(node.otherwise, lines, used)
          if (otherwise.type !== node.type)
            throw new UnsupportedCheckRustExpression('CASE result type mismatch')
          return [...lines, `${name} = ${ownedOperand(otherwise)};`]
        }
        const branch = node.branches[position]!
        let condition = emitScalar(branch.when, lines, used)
        if (scrutinee && node.scrutinee) {
          if (!branch.equality)
            throw new UnsupportedCheckRustExpression('Simple CASE needs equality for each WHEN')
          condition = emitCall(branch.equality, [scrutinee, condition], lines)
        }
        if (condition.type !== 'pg_catalog.bool')
          throw new UnsupportedCheckRustExpression('CASE guard must return bool')
        const guard = fresh('case_guard')
        lines.push(`let ${guard} = check_from_bool(${condition.name});`)
        const selectedLines: string[] = []
        const selectedPreparation = capturePreparation(() =>
          emitScalar(branch.then, selectedLines, used),
        )
        const selected = selectedPreparation.value
        if (selected.type !== node.type)
          throw new UnsupportedCheckRustExpression('CASE result type mismatch')
        const otherwise = capturePreparation(() => branchLines(position + 1))
        const prepared = prepareBranches(
          constantScalarExpression(branch.when) &&
            (!node.scrutinee || constantScalarExpression(node.scrutinee.expression)),
          lines,
          guard,
          selectedPreparation.lines,
          otherwise.lines,
        )
        const conditionGuard = prepared ?? guard
        const validityLines: string[] = []
        unresolvedArrayChoice(
          conditionGuard,
          [branch.then, ...node.branches.slice(position + 1), node.otherwise],
          validityLines,
          used,
        )
        return [
          ...(prepared ? [] : lines),
          ...validityLines,
          `if case_guard_stops(${conditionGuard}) {`,
          `    ${name} = ${prefix === 'bool' ? 'bool_from_check' : `${prefix}_from_case_guard`}(${conditionGuard});`,
          `} else if case_guard_takes(${conditionGuard}) {`,
          ...indent(selectedLines),
          `    ${name} = ${ownedOperand(selected)};`,
          '} else {',
          ...indent(otherwise.value),
          '};',
        ]
      }
      const branches = capturePreparation(() => branchLines(0))
      if (
        branches.lines.length &&
        node.scrutinee &&
        constantScalarExpression(node.scrutinee.expression)
      )
        preparationLines.push(...scrutineeLines)
      else bindings.push(...scrutineeLines)
      preparationLines.push(...branches.lines)
      bindings.push(...branches.value)
      return { name, type: node.type }
    }
    throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK scalar: ${node.kind}`)
  }

  type Emitted = { lines: string[]; name: string; inputs: Set<string> }
  const emit = (node: EvalBoolExpression): Emitted => {
    if (node.kind === 'eval-test') {
      const operand = emit(node.operand)
      const tested = fresh('test_result')
      const name = node.negated ? fresh('negated_test_result') : tested
      return {
        lines: [
          ...operand.lines,
          `let ${tested} = is_${node.test}_finish(${operand.name});`,
          ...(node.negated ? [`let ${name} = not_finish(${tested});`] : []),
        ],
        name,
        inputs: operand.inputs,
      }
    }
    if (node.kind === 'eval-boolean-logic') {
      if (node.operation === 'not') {
        if (node.operands.length !== 1)
          throw new UnsupportedCheckRustExpression('Expected unary NOT')
        const operand = emit(node.operands[0]!)
        const name = fresh('not_result')
        return {
          lines: [...operand.lines, `let ${name} = not_finish(${operand.name});`],
          name,
          inputs: operand.inputs,
        }
      }
      if (node.operands.length !== 2)
        throw new UnsupportedCheckRustExpression('Expected binary Boolean operation')
      const operand = (expression: EvalBoolExpression): Emitted =>
        expression.kind === 'eval-scalar' && expression.expression.kind === 'call'
          ? emit({
              ...expression,
              expression: { ...expression.expression, strictNull: true },
            })
          : emit(expression)
      const left = operand(node.operands[0]!)
      const name = fresh(node.operation === 'and' ? 'and_result' : 'or_result')
      const outerValidity: string | null = arrayValidityScope
      const rightValidity =
        outerValidity && preparationDepth === 0 ? fresh('array_right_validity') : null
      if (rightValidity) arrayValidityScope = rightValidity
      let rightPreparation: ReturnType<typeof capturePreparation<Emitted>>
      try {
        rightPreparation = capturePreparation(() => operand(node.operands[1]!))
      } finally {
        arrayValidityScope = outerValidity
      }
      const right = rightPreparation.value
      const stop = node.operation === 'and' ? 'and_stops' : 'or_stops'
      const finish = node.operation === 'and' ? 'and_finish' : 'or_finish'
      let leftName = left.name
      let leftLines = left.lines
      if (rightPreparation.lines.length && constantCheckExpression(node.operands[0]!)) {
        leftName = preparedGuard(left.lines, left.name)
        leftLines = []
        preparationLines.push(
          `if case_guard_stops(${leftName}) == false {`,
          `    if ${stop}(${leftName}) == false {`,
          ...indent(indent(rightPreparation.lines)),
          '    };',
          '};',
        )
      } else preparationLines.push(...rightPreparation.lines)
      const rightLines: string[] = []
      if (rightValidity) {
        const start = fresh('array_right_start')
        rightLines.push(
          `let ${start} = make_bool_value(true);`,
          `let mut ${rightValidity}: CheckOutcome = check_from_bool(${start});`,
        )
      }
      rightLines.push(...right.lines)
      if (rightValidity && outerValidity) {
        const possible = fresh('array_right_possible')
        rightLines.push(
          `if array_validity_unknown(${leftName}) {`,
          `    let ${possible} = array_validity_possible(${rightValidity});`,
          `    ${outerValidity} = array_validity_finish(${outerValidity}, ${possible});`,
          `} else {`,
          `    ${outerValidity} = array_validity_finish(${outerValidity}, ${rightValidity});`,
          '};',
        )
      }
      return {
        lines: [
          ...leftLines,
          `let mut ${name}: CheckOutcome = ${leftName};`,
          `if ${stop}(${leftName}) == false {`,
          ...indent(rightLines),
          `    ${name} = ${finish}(${leftName}, ${right.name});`,
          '}',
        ],
        name,
        inputs: new Set([...left.inputs, ...right.inputs]),
      }
    }
    if (node.kind === 'eval-case') {
      if (node.branches.length === 0)
        throw new UnsupportedCheckRustExpression('Expected a CASE branch')
      const name = fresh('case_result')
      const used = new Set<string>()
      const branchLines = (position: number): string[] => {
        if (position === node.branches.length) {
          const otherwise = emit(node.otherwise)
          for (const input of otherwise.inputs) used.add(input)
          return [...otherwise.lines, `${name} = ${otherwise.name};`]
        }
        const branch = node.branches[position]!
        const condition = emit(branch.when)
        const selectedPreparation = capturePreparation(() => emit(branch.then))
        const selected = selectedPreparation.value
        const otherwise = capturePreparation(() => branchLines(position + 1))
        for (const input of condition.inputs) used.add(input)
        for (const input of selected.inputs) used.add(input)
        const prepared = prepareBranches(
          constantCheckExpression(branch.when),
          condition.lines,
          condition.name,
          selectedPreparation.lines,
          otherwise.lines,
        )
        const guard = prepared ?? condition.name
        const validityLines: string[] = []
        unresolvedArrayChoice(
          guard,
          [branch.then, ...node.branches.slice(position + 1), node.otherwise],
          validityLines,
          used,
        )
        return [
          ...(prepared ? [] : condition.lines),
          ...validityLines,
          `if case_guard_stops(${guard}) {`,
          `    ${name} = ${guard};`,
          `} else if case_guard_takes(${guard}) {`,
          ...indent(selected.lines),
          `    ${name} = ${selected.name};`,
          '} else {',
          ...indent(otherwise.value),
          '};',
        ]
      }
      return {
        lines: [`let mut ${name}: CheckOutcome = check_unknown();`, ...branchLines(0)],
        name,
        inputs: used,
      }
    }
    if (node.kind === 'eval-scalar') {
      const used = new Set<string>()
      const bindings: string[] = []
      const result = emitScalar(node.expression, bindings, used)
      if (result.type !== 'pg_catalog.bool')
        throw new UnsupportedCheckRustExpression('A Rust CHECK scalar must return bool')
      const name = fresh('scalar_result')
      return {
        lines: [...bindings, `let ${name} = check_from_bool(${result.name});`],
        name,
        inputs: used,
      }
    }
    if (node.kind === 'certain') {
      const used = new Set<string>()
      const bindings: string[] = []
      const result = emitScalar({ kind: 'certain', expression: node.expression }, bindings, used)
      if (result.type !== 'pg_catalog.bool')
        throw new UnsupportedCheckRustExpression('A Rust CHECK constant must be bool')
      const name = fresh('constant_result')
      return {
        lines: [...bindings, `let ${name} = check_from_bool(${result.name});`],
        name,
        inputs: used,
      }
    }
    if (node.kind === 'uncertain') {
      const name = fresh('unknown_result')
      return { lines: [`let ${name} = check_unknown();`], name, inputs: new Set() }
    }
    if (node.kind === 'eval-regex') {
      if (
        node.subject.kind !== 'input' ||
        node.subject.type !== 'pg_catalog.text' ||
        node.negated ||
        node.collation !== 'C' ||
        (node.options?.syntax ?? 'advanced') !== 'advanced' ||
        (node.options?.caseSensitive ?? true) !== true ||
        (node.options?.expanded ?? false) !== false ||
        (node.options?.newline ?? 'ordinary') !== 'ordinary' ||
        node.flags !== undefined ||
        node.invalidFlags === true
      )
        throw new UnsupportedCheckRustExpression('Unsupported Rust CHECK regex expression')
      const subject = input(node.subject.name, node.subject.type)
      const pattern = node.pattern
      if (
        typeof pattern !== 'string' &&
        (pattern.kind !== 'input' || pattern.type !== 'pg_catalog.text')
      )
        throw new UnsupportedCheckRustExpression('Unsupported Rust CHECK regex pattern')
      const patternInput = typeof pattern === 'string' ? null : input(pattern.name, pattern.type)
      const used = new Set(patternInput ? [subject.name, patternInput.name] : [subject.name])
      const patternName = patternInput?.rustName ?? fresh('pattern')
      const result = fresh('regex_result')
      const name = fresh('regex_outcome')
      requiresRegex = true
      return {
        lines: [
          ...(typeof pattern === 'string'
            ? [`let ${patternName} = make_text_value(${rustStringLiteral(pattern)});`]
            : []),
          `let ${result} = eval_regex(${subject.rustName}.clone(), ${patternName}.clone());`,
          `let ${name} = check_from_bool(${result});`,
        ],
        name,
        inputs: used,
      }
    }
    throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK expression: ${node.kind}`)
  }

  const validityStart = fresh('expression_validity_start')
  const validity = fresh('expression_validity')
  arrayValidityScope = validity
  const emitted = emit(expression)
  arrayValidityScope = null
  const validated = fresh('validated_expression')
  const entry = {
    ...emitted,
    name: validated,
    lines: [
      `let ${validityStart} = make_bool_value(true);`,
      `let mut ${validity}: CheckOutcome = check_from_bool(${validityStart});`,
      ...emitted.lines,
      `let mut ${validated}: CheckOutcome = ${emitted.name};`,
      `if case_guard_stops(${validity}) {`,
      `    ${validated} = ${validity};`,
      '};',
    ],
  }
  let lines = entry.lines
  let resultName = entry.name
  if (constantLines.length || literalLines.length) {
    const start = fresh('preparation_start')
    resultName = fresh('prepared_result')
    lines = [
      ...constantDeclarations,
      `let ${start} = make_bool_value(true);`,
      `let mut ${preparationState}: CheckOutcome = check_from_bool(${start});`,
      ...literalLines,
      ...constantLines,
      `let mut ${resultName}: CheckOutcome = ${preparationState};`,
      `if case_guard_stops(${preparationState}) == false {`,
      ...indent(entry.lines),
      `    ${resultName} = ${entry.name};`,
      '}',
    ]
  }
  return {
    source: `pub fn ${entryName}(${parameters(entry.inputs)}) -> CheckOutcome {\n${indent(lines).join('\n')}\n    ${resultName}\n}\n`,
    entryName,
    inputs: ordered(entry.inputs),
    callables: [...callables],
    requiresRegex,
  }
}
