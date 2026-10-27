import { isTextFormatCallable } from '../../sql-semantics/text-format-callables.js'
import { isJsonPopulateCallable } from '../../sql-semantics/json-populate-callables.js'
import { isIntegerSumCallable } from '../../sql-semantics/integer-sum-callables.js'
import {
  isCollationMetadataCallable,
  isTypeFormatCallable,
} from '../../sql-semantics/metadata-callables.js'
import { isLegacySimilarCallable } from '../../sql-semantics/text-similar-callables.js'
import { isTextConcatCallable } from '../../sql-semantics/text-concat-callables.js'
import { isIdentifierQuote } from '../../sql-semantics/identifier-quote.js'
import { isNullCountCallable } from '../../sql-semantics/null-count-callables.js'
import {
  isNullableQuote,
  isGenericLiteralQuote,
} from '../../sql-semantics/literal-quote-callables.js'
import { validAclitemConstantKnowledge } from '../../catalog/aclitem-constant-storage.js'
import { validJsonpathConstantStorage } from '../../catalog/jsonpath-constant-storage.js'
import { validTsqueryConstantStorage } from '../../catalog/tsquery-constant-storage.js'
import { validStoredTsvectorValue } from '../../catalog/tsvector-constant-storage.js'
import { validTemporalConstantStorage } from '../../catalog/temporal-constant-storage.js'
import { validSystemConstantStorage } from '../../catalog/system-constant-storage.js'
import { validSnapshotConstantStorage } from '../../catalog/snapshot-constant-storage.js'
import {
  isGeometryConstantType,
  validGeometryConstantStorage,
} from '../../catalog/geometry-constant-storage.js'
import { moneyTextCLocale, moneyContextFractionDigits } from './check-money-context.js'
import { isMoneyNumericConversion } from '../../sql-semantics/money-callables.js'
import {
  isTemporalContextArithmetic,
  isTemporalContextCast,
  isTemporalContextComparison,
  isTemporalLocalTimezone,
  isTemporalInstantConstructor,
  isTemporalIntervalFormatting,
  isTemporalTimestampFormatting,
  isTemporalTemplateParsing,
  isTemporalInstantPeriod,
  isTemporalInstantAge,
  isTemporalCurrentAge,
  isTemporalDatePart,
  isTemporalSessionTruncation,
  isTemporalSessionExtraction,
  isTemporalExplicitZoneLookup,
} from '../../sql-semantics/temporal-casts.js'
import { CheckRustDiagnostics } from './check-rust-diagnostics.js'
import {
  isXmlOptionPredicate,
  isXmlPreparationCallable,
  isXmlXPathCallable,
} from '../../sql-semantics/xml-callables.js'
import {
  compositeProfile,
  compositeContainerProfile,
  compositeFieldType,
  compositePhysicalType,
  type CompositeProfile,
} from '../../sql-semantics/composite-profiles.js'
import { compositePlanExpression } from './check-composite-types.js'
import { recordHashLayouts, recordFieldHashSupport } from './check-record-hash.js'
import { recordComparisonLayouts, isRecordComparison } from './check-record-comparison.js'
import {
  anonymousRecordProfile,
  canRelabelAnonymousRecords,
  commonAnonymousRecordType,
} from '../../sql-semantics/anonymous-records.js'
import type { ArrayElementType, ScalarType } from '../../sql-semantics/expressions.js'
import { arrayType } from '../../sql-semantics/expressions.js'
import {
  rangeTypeProfile,
  multirangeTypeProfile,
  rangeProfileSupport,
  rangeContainerKind,
  rangeNestedProfile,
  rangeTypeOutput,
  rangeTypeInput,
  rangeSubtypeIsDomain,
  rangeSubtypeOutput,
  type RangeProfile,
} from '../../sql-semantics/range-profiles.js'
import {
  nativeHashContext,
  isArrayHash,
  isRangeHash,
  isMultirangeHash,
  rangeHashSupport,
} from './check-hash-context.js'
import { characterEncodingContext } from './check-character-context.js'
import { circlePolygonTrigonometry } from './check-trigonometry-context.js'
import { jsonbTextRenderingContext, jsonScalarExtractionContext } from './check-jsonb-context.js'
import {
  rustCallCanFail,
  rustArrayCastAlwaysValid,
  rustScalarOwnCanFail,
  rustExpressionCanFail,
  rustExpressionValidityProbes,
} from './check-rust-validity.js'
import {
  arrayElementDelimiter,
  rangeBoundProfiles,
  rangeArrayHashPlan,
  type RangeArrayHashPlan,
  arrayElementFamily,
  arrayElementIdentity,
  arrayElementComparison,
  arrayElementComparisonAvailable,
  arrayIdentityPlan,
  arrayRangeProfile,
  arrayMultirangeProfile,
} from './check-array-types.js'
import { checkRustEntryName, type CheckConstraintIdentity } from './check-rust-names.js'
import { rangeConstructorImplementation } from '../../sql-semantics/range-callables.js'
import { callableIdentity } from '../../postgres/builtins/catalog.js'
import {
  builtinCast,
  builtinMetadata,
  builtinTypeIO,
  builtinTypeComparison,
  builtinTypeResolution,
  builtinRangeType,
  builtinMultirangeType,
  isBuiltinRangeConstructor,
  builtinCallables,
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
  caseBoundExpression,
  strictNullPreparation,
  nullifNullPreparation,
  type ConstantPreparation,
} from './check-rust-constants.js'
import {
  enumType,
  arrayElementBaseType,
  isCatalogVectorType,
  isArrayLikeType,
  arrayLikeElementType,
  arrayPhysicalType,
  capturedEnumSupport,
  catalogScalarType,
  isOidType,
  isOidAliasType,
  isSnapshotType,
  isRangeType,
  isMultirangeType,
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
      [['pg_catalog.xml'], 'xml'],
      [['pg_catalog.aclitem'], 'aclitem'],
      [['pg_catalog.tsvector'], 'tsvector'],
      [['pg_catalog.tsquery'], 'tsquery'],
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
  type.startsWith('enum:')
    ? 'jsonb_input_from_enum'
    : rangeTypeProfile(type)
      ? 'jsonb_input_from_range'
      : multirangeTypeProfile(type)
        ? 'jsonb_input_from_multirange'
        : jsonbConversionHelpers.get(type)

export const supportsJsonbConversion = (type: string): boolean => {
  type = arrayElementBaseType(type)
  while (isArrayLikeType(type)) {
    const element = arrayLikeElementType(type)!
    if (arrayElementFamily(element) === null) return false
    type = arrayElementBaseType(element)
  }
  return (
    compositeProfile(type) !== null ||
    anonymousRecordProfile(type) !== null ||
    jsonbConversionHelper(type) !== undefined
  )
}

export const isCatalogVectorTypeNames = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'oidvectortypes' &&
  item.args.join(',') === 'pg_catalog.oidvector' &&
  item.result === 'pg_catalog.text' &&
  item.strict &&
  item.volatility === 's' &&
  !item.returnsSet

export const isJsonConversion = (
  item: ReturnType<typeof builtinMetadata>,
): item is ReturnType<typeof builtinMetadata> & {
  kind: 'function'
  name: 'to_json' | 'array_to_json' | 'row_to_json'
} =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.result === 'pg_catalog."json"' &&
  item.strict &&
  !item.returnsSet &&
  item.volatility === 's' &&
  ((item.name === 'to_json' && item.args.join(',') === 'pg_catalog.anyelement') ||
    (item.name === 'row_to_json' &&
      ['pg_catalog.record', 'pg_catalog.record,pg_catalog.bool'].includes(item.args.join(','))) ||
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

const rangeContextExpression = (
  profile: RangeProfile,
  context: { defaultCollation?: 'C'; serverEncoding?: 'UTF8' },
  bind: (call: string) => string,
): string => {
  const nodes = rangeBoundProfiles(profile, context)
  if (!nodes)
    throw new UnsupportedCheckRustExpression(
      'Range subtype dependencies need a concrete owned context',
    )
  let current = bind('empty_range_bound_context()')
  for (const node of nodes)
    current = bind(
      `append_range_bound_profile_with_canonical(${current},${rustStringLiteral(node.typeName)},${node.kind},${node.comparison},${node.canonical},${node.missingComparison},${rustStringLiteral(node.elementType)},${node.child},${rustStringLiteral(node.enumLabels)},${node.enumCount})`,
    )
  for (const [index, node] of nodes.entries())
    for (const field of node.fields ?? [])
      current = bind(
        `append_range_bound_field(${current},${index},${field.child},${rustStringLiteral(field.typeName)},${field.comparisonAvailable})`,
      )
  return current
}

const rangeDefinitionArguments = (
  profile: RangeProfile,
  context: { defaultCollation?: 'C'; serverEncoding?: 'UTF8' },
  bind: (call: string) => string,
): string =>
  rangeContainerKind(profile.elementType) !== null
    ? `,${rangeContextExpression(profile, context, bind)}.clone()`
    : profile.subtypeEnum
      ? `,${rustStringLiteral(profile.subtypeEnum.values.join('\0'))},${profile.subtypeEnum.values.length}`
      : ''

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

const intervalStyleCode = (context: Pick<CheckExecutionContext, 'intervalStyle'>): number =>
  context.intervalStyle === undefined
    ? 0
    : ['postgres', 'postgres_verbose', 'sql_standard', 'iso_8601'].indexOf(context.intervalStyle) +
      1

const calendarOutputStyle = (context: Pick<CheckExecutionContext, 'dateStyle'>): number => {
  const profile = context.dateStyle
  if (!profile) return 0
  if (profile.format === 'ISO') return 1
  if (profile.format === 'German') return 6
  const dayFirst = profile.order === 'DMY'
  return profile.format === 'SQL' ? (dayFirst ? 3 : 2) : dayFirst ? 5 : 4
}

const arrayElementOutput = (
  elementType: string,
  definition: EnumDefinition | undefined,
  element: string,
  scalar: string,
  context: Pick<
    CheckExecutionContext,
    | 'moneyLocale'
    | 'moneyFractionDigits'
    | 'extraFloatDigits'
    | 'byteaOutput'
    | 'dateStyle'
    | 'timeZone'
    | 'intervalStyle'
  >,
): { prefix: string; conversion: string; scalarRequired: boolean } => {
  elementType = arrayElementBaseType(elementType)
  const family = arrayElementFamily(elementType)
  if (family === null)
    throw new UnsupportedCheckRustExpression('Missing array output element carrier')
  const profile = rangeTypeProfile(elementType) ?? multirangeTypeProfile(elementType)
  const elementOutput =
    definition?.outputFunction ?? rangeTypeOutput(elementType) ?? builtinTypeIO(elementType)?.output
  if (
    profile?.captured &&
    (profile.subtypeOutput !== rangeSubtypeOutput(profile) ||
      (isMultirangeType(elementType) &&
        profile.output !== builtinTypeIO('pg_catalog.int4range')?.output))
  )
    throw new UnsupportedCheckRustExpression(
      'Array output requires selected range and subtype output implementations',
    )
  const metadata = elementOutput
    ? builtinCallables().find((item) => callableIdentity(item) === elementOutput)
    : null
  if (
    !metadata ||
    metadata.kind !== 'function' ||
    !metadata.strict ||
    metadata.returnsSet ||
    metadata.args.length !== 1 ||
    metadata.args[0] !==
      (definition
        ? 'pg_catalog.anyenum'
        : isMultirangeType(elementType)
          ? 'pg_catalog.anymultirange'
          : isRangeType(elementType)
            ? 'pg_catalog.anyrange'
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
  if (isGeometryConstantType(elementType))
    conversion = `geometry_${prefix}_output_context(${scalar},${context.extraFloatDigits ?? 0},${context.extraFloatDigits !== undefined})`
  else if (isCatalogVectorType(elementType))
    conversion = `catalog_vector_to_text(${scalar},${elementType === 'pg_catalog.oidvector'})`
  else if (family <= 3) conversion = `${prefix}_to_text(${scalar})`
  else if (family === 6) {
    if (!definition || definition.values.some((label) => label.includes('\0')))
      throw new UnsupportedCheckRustExpression('Array enum output requires captured labels')
    conversion = `enum_to_text(${scalar}, ${rustStringLiteral(definition.values.join('\0'))}, ${definition.values.length})`
  } else if (family === 8) conversion = scalar
  else if (family === 31)
    conversion = `money_to_text_context(${scalar},${moneyTextCLocale(context)})`
  else if (family === 45) conversion = `xml_to_output_text(${scalar})`
  else if (family === 9) conversion = `array_boolean_output(${scalar})`
  else if (family === 10) conversion = `array_numeric_output(${scalar})`
  else if (family === 4 || family === 7)
    conversion = `${family === 4 ? 'timestamp' : 'date'}_output_context(${scalar},${calendarOutputStyle(context)})`
  else if (family === 23)
    conversion = `interval_output_context(${scalar},${intervalStyleCode(context)})`
  else if (family === 5)
    conversion =
      context.timeZone === undefined
        ? `timestamptz_output_without_context(${scalar})`
        : `timestamptz_output_context(${scalar},${calendarOutputStyle(context)},${rustStringLiteral(context.timeZone)},false)`
  else if (family === 15)
    conversion = `bytea_output_context(${scalar},${context.byteaOutput === 'hex' ? 1 : context.byteaOutput === 'escape' ? 2 : 0},false)`
  else if ([11, 12, 14, 16, 17, 18, 34, 35, 37, 38, 39, 40, 42, 43, 46, 47, 48].includes(family))
    conversion = `${prefix}_to_text(${scalar})`
  else if (family === 13)
    conversion = `array_network_output(${scalar}, ${elementType === 'pg_catalog.cidr'})`
  else if (family === 19 || family === 20)
    conversion =
      context.extraFloatDigits === undefined
        ? `array_${prefix}_output(${scalar})`
        : `${prefix}_output_context(${scalar},${context.extraFloatDigits},true)`
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

export { isRecordComparison } from './check-record-comparison.js'

export const isRecordHash = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.strict &&
  item.volatility === 'i' &&
  !item.returnsSet &&
  item.args[0] === 'pg_catalog.record' &&
  ((item.name === 'hash_record' && item.args.length === 1 && item.result === 'pg_catalog.int4') ||
    (item.name === 'hash_record_extended' &&
      item.args.join(',') === 'pg_catalog.record,pg_catalog.int8' &&
      item.result === 'pg_catalog.int8'))

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

export const isRecordBinarySend = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'record_send' &&
  item.strict &&
  item.volatility === 's' &&
  !item.returnsSet &&
  item.args.length === 1 &&
  item.args[0] === 'pg_catalog.record' &&
  item.result === 'pg_catalog.bytea'

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

export const isRangeBinarySend = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'range_send' &&
  item.args.join(',') === 'pg_catalog.anyrange' &&
  item.result === 'pg_catalog.bytea' &&
  item.strict &&
  item.volatility === 's' &&
  !item.returnsSet

export const isMultirangeBinarySend = (item: ReturnType<typeof builtinMetadata>): boolean =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  item.name === 'multirange_send' &&
  item.args.join(',') === 'pg_catalog.anymultirange' &&
  item.result === 'pg_catalog.bytea' &&
  item.strict &&
  item.volatility === 's' &&
  !item.returnsSet

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
  type = arrayElementBaseType(type)
  if (compositeProfile(type) || anonymousRecordProfile(type)) return 'CompositeValue'
  if (type === 'pg_catalog."json"') return 'JsonValue'
  if (type === 'pg_catalog.jsonb') return 'JsonbValue'
  if (type === 'pg_catalog.xml') return 'XmlValue'
  if (type === 'pg_catalog.jsonpath') return 'JsonpathValue'
  if (isArrayLikeType(type)) return 'ArrayValue'
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
  if (type === 'pg_catalog.tsvector') return 'TsvectorValue'
  if (type === 'pg_catalog.tsquery') return 'TsqueryValue'
  if (type === 'pg_catalog.aclitem') return 'AclitemValue'
  if (type === 'pg_catalog.xid') return 'XidValue'
  if (type === 'pg_catalog.cid') return 'CidValue'
  if (type === 'pg_catalog.pg_lsn') return 'PgLsnValue'
  if (type === 'pg_catalog."char"') return 'InternalCharValue'
  if (type === 'pg_catalog.tid') return 'TidValue'
  if (type === 'pg_catalog.xid8') return 'Xid8Value'
  if (isSnapshotType(type)) return 'SnapshotValue'
  if (isMultirangeType(type)) return 'MultirangeValue'
  if (isRangeType(type)) return 'RangeValue'
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
  maxIdentifierBytes?: number
  trigonometry?: 'fdlibm'
  arrayNulls?: boolean
  quoteAllIdentifiers?: boolean
  byteaOutput?: 'hex' | 'escape'
  timeZone?: string
  timeZoneAbbreviations?: 'Default'
  intervalStyle?: 'postgres' | 'postgres_verbose' | 'sql_standard' | 'iso_8601'
  dateStyle?: { format: 'ISO' | 'SQL' | 'Postgres' | 'German'; order: 'MDY' | 'DMY' | 'YMD' }
  xmlOption?: 'document' | 'content'
  xmlBinary?: 'base64' | 'hex'
  timeLocale?: 'C'
  moneyLocale?: 'C'
  moneyFractionDigits?: number
  extraFloatDigits?: number
  xpathRecursionLimit?: number
  xpathPowerOfTenBits?: readonly string[]
  clientEncoding?: 'UTF8'
}

export function emitCheckRustEvaluator(
  expression: EvalBoolExpression,
  identity?: CheckConstraintIdentity,
  executionContext: CheckExecutionContext = {},
  preparationOnly = false,
): {
  source: string
  entryName: string
  diagnosticEntryName?: string
  inputs: readonly Input[]
  callables: readonly string[]
  requiresRegex: boolean
} {
  const inputs = new Map<string, Input>()
  const localInputs = new Map<string, Input>()
  const binaryEnums = new Map<string, EnumDefinition>()
  const collectBinaryEnums = (value: unknown): void => {
    if (!value || typeof value !== 'object') return
    if ('enum' in value && value.enum && typeof value.enum === 'object') {
      const definition = value.enum as EnumDefinition
      if (
        typeof definition.schema === 'string' &&
        typeof definition.name === 'string' &&
        Array.isArray(definition.values)
      )
        binaryEnums.set(enumType(definition), definition)
    }
    for (const child of Object.values(value)) collectBinaryEnums(child)
  }
  collectBinaryEnums(expression)
  const callables = new Set<string>()
  const domainHelpers: string[] = []
  let domainPreparationState: string | null = null
  let domainInputPreparation: { lines: string[]; status: string } | null = null
  let jsonPopulateHardError: string | null = null
  let jsonPopulateInput: {
    input: string
    text: string
    base?: string
    arrayModifier?: number
  } | null = null
  let next = 0
  let requiresRegex = false
  const entryName = identity ? checkRustEntryName(identity) : 'evaluate_check'
  const fresh = (prefix: string): string => `${prefix}_${next++}`
  const indent = (lines: readonly string[]): string[] => lines.map((line) => `    ${line}`)
  const constantDeclarations: string[] = []
  const constantBindings: { name: string; type: string }[] = []
  const declareConstant = (name: string, type: string, initializer: string): void => {
    constantBindings.push({ name, type })
    constantDeclarations.push(`let mut ${name}: ${type} = ${initializer};`)
  }
  const constantLines: string[] = []
  const literalLines: string[] = []
  let valueLiteralDepth = 0
  let preparationLines = constantLines
  const preparationState = 'constant_preparation'
  let preparationDepth = 0
  const containsDomainCast = (value: unknown): boolean =>
    value !== null &&
    typeof value === 'object' &&
    (('kind' in value && value.kind === 'domain-cast') ||
      Object.values(value).some(containsDomainCast))
  let constantOperandDepth = preparationOnly || containsDomainCast(expression) ? 1 : 0
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
  const prepareOpaque = (): void => {
    if (!preparationOnly) return
    const status = fresh('opaque_preparation')
    preparationLines.push(
      `let ${status} = check_unknown();`,
      `${preparationState} = array_validity_finish(${preparationState}, ${status});`,
    )
  }
  const preparedGuard = (lines: readonly string[], name: string): string => {
    const guard = fresh('prepared_guard')
    declareConstant(guard, 'CheckOutcome', 'check_unknown()')
    const requirement = diagnostics.declared(guard, constantDeclarations)
    preparationLines.push(
      ...lines,
      `${guard} = ${name};`,
      ...(diagnostics.enabled
        ? [
            `${requirement} = check_requirement_for_outcome(${guard}, ${diagnostics.reference(name)});`,
          ]
        : []),
      ...preparationFinishLines(guard, diagnostics.reference(guard)),
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
    const local = localInputs.get(key)
    if (local) {
      if (local.type !== type)
        throw new UnsupportedCheckRustExpression(
          'Array conversion requires a matching lexical element',
        )
      return local
    }
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
      'XmlValue',
      'ArrayValue',
      'TsvectorValue',
      'TsqueryValue',
      'SnapshotValue',
      'RangeValue',
      'MultirangeValue',
      'CompositeValue',
      'PolygonValue',
      'PathValue',
      'TextValue',
      'ByteaValue',
      'BitValue',
      'NumericValue',
    ].includes(rustType(operand.type))
      ? `${operand.name}.clone()`
      : operand.name
  const containsPreparedXml = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false
    const node = value as { kind?: string; call?: { signature?: string } }
    if (
      node.kind === 'call' &&
      node.call?.signature &&
      isXmlPreparationCallable(builtinMetadata(node.call.signature))
    )
      return true
    return Object.values(value).some(containsPreparedXml)
  }
  const hasPreparedXml = containsPreparedXml(expression)
  const diagnostics = new CheckRustDiagnostics(
    !preparationOnly && hasPreparedXml,
    fresh,
    rustType,
    ownedOperand,
  )
  const preparationDiagnosticDeclarations: string[] = []
  const preparationRequirement = diagnostics.declared(
    preparationState,
    preparationDiagnosticDeclarations,
    '0',
  )
  const diagnosticCall = (call: Extract<EvalExpression, { kind: 'call' }>['call']): boolean => {
    if (!call.signature) return true
    const item = builtinMetadata(call.signature),
      implementation = item.kind === 'operator' ? builtinMetadata(item.implementation) : item
    if (implementation.kind !== 'function') return false
    if (
      implementation.args.join(',') === 'pg_catalog.xml' &&
      implementation.result === 'pg_catalog.text'
    )
      return true
    if (
      [
        'cardinality',
        'array_length',
        'array_ndims',
        'array_dims',
        'array_lower',
        'array_upper',
      ].includes(implementation.name)
    )
      return true
    if (
      implementation.result === 'pg_catalog.bool' &&
      implementation.strict &&
      implementation.args.every((type) =>
        ['pg_catalog.bool', 'pg_catalog.int2', 'pg_catalog.int4', 'pg_catalog.int8'].includes(type),
      )
    )
      return true
    return (
      implementation.result === 'pg_catalog.bool' &&
      implementation.args.every((type) => type === 'pg_catalog.text') &&
      ['texteq', 'textne', 'text_lt', 'text_le', 'text_gt', 'text_ge'].includes(
        implementation.name,
      ) &&
      call.kind !== 'cast' &&
      (call.collation === 'C' ||
        (['texteq', 'textne'].includes(implementation.name) &&
          call.collation === 'deterministic') ||
        (call.collationDefault === true && executionContext.defaultCollation === 'C'))
    )
  }
  const scalarType = (operand: EvalExpression): string =>
    operand.kind === 'certain'
      ? operand.expression.type
      : operand.kind === 'call'
        ? operand.call.type
        : operand.kind === 'regex-count'
          ? 'pg_catalog.int4'
          : operand.type

  const appendValidityRequirement = (
    scope: string,
    state: string,
    reason: string,
    lines: string[],
  ): void => {
    if (!diagnostics.enabled || diagnostics.reference(scope) === '-1') return
    const filtered = fresh('validity_requirement')
    lines.push(
      `let ${filtered} = check_requirement_for_outcome(${state}, ${reason});`,
      `${diagnostics.reference(scope)} = check_requirement_merge(${diagnostics.reference(scope)}, ${filtered});`,
    )
  }
  const validityRequirementLines = (scope: string, state: string, reason: string): string[] => {
    const lines: string[] = []
    appendValidityRequirement(scope, state, reason, lines)
    return lines
  }
  const preparationFinishLines = (state: string, reason = '-1'): string[] => {
    const lines = [`${preparationState} = constant_finish(${preparationState}, ${state});`]
    appendValidityRequirement(preparationState, state, reason, lines)
    return hasPreparedXml
      ? [`if case_guard_stops(${preparationState}) == false {`, ...indent(lines), '};']
      : lines
  }
  const carryPreparedRequirement = (
    name: string,
    value: { name: string; type: string },
    lines: string[],
  ): void => {
    if (!diagnostics.enabled) return
    const requirement = diagnostics.declared(name, constantDeclarations)
    const reason = diagnostics.reason(value, lines)
    lines.push(
      `${requirement} = ${reason === '-1' || reason === '0' ? `check_requirement_code(${reason})` : reason};`,
    )
  }
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
    const reason = diagnostics.reason(value, destination)
    appendValidityRequirement(arrayValidityScope, state, reason, destination)
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
      const outerPreparation = preparationLines
      arrayValidityScope = null
      preparationLines = lines
      let value: { name: string; type: string }
      try {
        value = emitScalar(probe, lines, used)
      } finally {
        arrayValidityScope = outer
        preparationLines = outerPreparation
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
    appendValidityRequirement(arrayValidityScope, possible, '-1', lines)
    destination.push(`if array_validity_unknown(${guard}) {`, ...indent(lines), '}')
  }

  const usesTypedRangeOutput = (profile: RangeProfile | null | undefined): boolean => {
    if (!profile) return false
    return (
      !!profile.subtypeCompositeGraph ||
      [4, 5, 7, 15, 23].includes(
        arrayElementFamily(arrayElementBaseType(profile.elementType)) ?? -1,
      ) ||
      (rangeBoundProfiles(profile, executionContext)?.some((node) =>
        [4, 5, 7, 15, 23].includes(node.kind),
      ) ??
        false) ||
      (moneyTextCLocale(executionContext) &&
        (arrayElementFamily(arrayElementBaseType(profile.elementType)) === 31 ||
          (rangeBoundProfiles(profile, executionContext)?.some((node) => node.kind === 31) ??
            false)))
    )
  }

  const renderTypedOutput = (
    cell: string,
    type: string,
    destination: string[],
    definition?: EnumDefinition,
  ): string => {
    const scalar = fresh('container_output_scalar')
    const prefix = rustValuePrefix(rustType(type))
    const extract = () => destination.push(`let ${scalar}=array_element_to_${prefix}(${cell});`)
    if (anonymousRecordProfile(type)) {
      extract()
      return renderAnonymousRecordOutput({ name: scalar, type }, destination)
    }
    const range = rangeTypeProfile(type),
      multi = multirangeTypeProfile(type)
    if (range || multi) {
      extract()
      return renderRangeOutput(scalar, (range ?? multi)!, !!multi, destination)
    }
    if (compositeProfile(type) || type.startsWith('array:')) {
      extract()
      const name = '__pgsid_container_output',
        key = JSON.stringify([name, false]),
        outer = localInputs.get(key)
      localInputs.set(key, { name, type, rustName: scalar, rustType: rustType(type) })
      try {
        const result = emitScalar(
          compositeProfile(type)
            ? {
                kind: 'composite-to-text',
                type: 'pg_catalog.text',
                operand: { kind: 'input', name, type: type as ScalarType },
              }
            : {
                kind: 'array-to-text',
                type: 'pg_catalog.text',
                operand: { kind: 'input', name, type: type as ScalarType },
                elementType: type.slice(6) as ArrayElementType,
                ...(definition ? { enum: definition } : {}),
                output: builtinTypeIO('pg_catalog._int4')!.output!,
              },
          destination,
          new Set(),
        )
        return result.name
      } finally {
        if (outer) localInputs.set(key, outer)
        else localInputs.delete(key)
      }
    }
    const output = arrayElementOutput(type, definition, cell, scalar, executionContext)
    if (output.scalarRequired) extract()
    return type === 'pg_catalog.jsonb'
      ? `jsonb_text_context(${scalar},${executionContext.serverEncoding === 'UTF8'})`
      : output.conversion
  }
  const renderRangeOutput = (
    input: string,
    profile: RangeProfile,
    multi: boolean,
    destination: string[],
  ): string => {
    if (!usesTypedRangeOutput(profile))
      return `${multi ? 'multirange' : 'range'}_to_text(${input}.clone())`
    if (multi) {
      const payload = fresh('multirange_output_payload'),
        count = fresh('multirange_output_count'),
        index = fresh('multirange_output_index'),
        output = fresh('multirange_output'),
        member = fresh('multirange_output_member')
      destination.push(
        `let ${payload}=multirange_binary_payload(${input}.clone());`,
        `let ${count}=multirange_binary_count(&${payload});`,
        `let mut ${index}:Int4Value=make_int4_value(0);`,
        `let mut ${output}:TextValue=multirange_output_initial(${input}.clone());`,
      )
      const body = [`let ${member}=multirange_binary_member(&${payload},${index});`]
      const rendered = renderRangeOutput(member, profile, false, body)
      const text = fresh('multirange_member_text')
      body.push(
        `let ${text}=${rendered};`,
        `${output}=multirange_output_append(${output},${text},${index});`,
        `${index}=array_text_next_index(${index});`,
      )
      destination.push(
        `while multirange_output_continues(${count},${index},${output}.clone()) {`,
        ...indent(body),
        '}',
      )
      return `multirange_output_finish(${output})`
    }
    const bounds: string[] = []
    for (const upper of [false, true]) {
      const cell = fresh('range_output_bound'),
        text = fresh('range_output_text')
      destination.push(`let ${cell}=range_bound(${input}.clone(),${upper});`)
      const rendered = renderTypedOutput(
        cell,
        profile.elementType,
        destination,
        profile.subtypeEnum,
      )
      destination.push(`let ${text}=${rendered};`)
      bounds.push(text)
    }
    return `range_format_text(${input}.clone(),${bounds[0]},${bounds[1]})`
  }

  const renderAnonymousRecordOutput = (
    operand: { name: string; type: string },
    destination: string[],
  ): string => {
    const layouts = anonymousRecordProfile(operand.type)
    if (!layouts)
      throw new UnsupportedCheckRustExpression('Record output requires its field layouts')
    const cell = fresh('xml_record_cell'),
      initial = fresh('xml_record_initial'),
      result = fresh('xml_record_result')
    destination.push(
      `let ${cell}=array_element_from_composite(${ownedOperand(operand)});`,
      `let ${initial}=array_contextual_output(${cell}.clone());`,
      `let mut ${result}:TextValue=${initial};`,
    )
    for (const layout of layouts) {
      if (layout.namedType) {
        const lines: string[] = []
        const rendered = renderTypedOutput(`${cell}.clone()`, layout.namedType, lines)
        lines.push(`${result}=${rendered};`)
        destination.push(
          `if composite_output_matches(${ownedOperand(operand)},${rustStringLiteral(layout.identity)},${layout.fieldCount!}) {`,
          ...indent(lines),
          '}',
        )
        continue
      }
      const lines: string[] = [],
        start = fresh('xml_record_start')
      lines.push(
        `let ${start}=prepare_composite_output(${ownedOperand(operand)},${rustStringLiteral(layout.identity)},${layout.fields.length});`,
      )
      let current = start
      for (const [index, field] of layout.fields.entries()) {
        const position = fresh('xml_record_position'),
          cell = fresh('xml_record_field'),
          text = fresh('xml_record_text'),
          next = fresh('xml_record_next')
        lines.push(
          `let ${position}=make_int4_value(${index});`,
          `let ${cell}=composite_field_at(${ownedOperand(operand)},${position});`,
        )
        const conversion = field.unknown
          ? field.type === 'pg_catalog.text'
            ? `array_element_to_text(${cell})`
            : `array_contextual_output(${cell})`
          : renderTypedOutput(cell, field.type, lines, field.enum as EnumDefinition | undefined)
        lines.push(
          `let ${text}=${conversion};`,
          `let ${next}=append_composite_output(${current},${text},${index === 0});`,
        )
        current = next
      }
      lines.push(`${result}=finish_composite_output(${current});`)
      destination.push(
        `if composite_output_matches(${ownedOperand(operand)},${rustStringLiteral(layout.identity)},${layout.fields.length}) {`,
        ...indent(lines),
        '}',
      )
    }
    return result
  }

  const renderXmlValue = (
    original: { name: string; type: string },
    escape: boolean,
    destination: string[],
    definition?: EnumDefinition,
  ): string => {
    let operand = { ...original, type: arrayElementBaseType(original.type) }
    if (isCatalogVectorType(operand.type))
      operand = { ...operand, type: arrayPhysicalType(operand.type)! }
    if (operand.type.startsWith('array:')) {
      const payload = fresh('xml_array_payload'),
        initial = fresh('xml_array_initial'),
        output = fresh('xml_array_output'),
        first = fresh('xml_array_first'),
        index = fresh('xml_array_index'),
        cell = fresh('xml_array_cell'),
        scalar = fresh('xml_array_scalar'),
        part = fresh('xml_array_part'),
        type = arrayElementBaseType(operand.type.slice(6)),
        prefix = rustValuePrefix(rustType(type))
      destination.push(
        `let ${payload}=prepare_array_output(${ownedOperand(operand)});`,
        `let ${initial}=xml_array_output_initial(${ownedOperand(operand)});`,
        `let ${first}=make_int4_value(0);`,
        `let mut ${output}:TextValue=${initial};`,
        `let mut ${index}:Int4Value=${first};`,
      )
      const body = [
        `let ${cell}=array_output_element_at(&${payload},${index});`,
        `let ${scalar}=array_element_to_${prefix}(${cell});`,
      ]
      const rendered = renderXmlValue({ name: scalar, type }, true, body, definition)
      body.push(
        `let ${part}=xml_forest_part("element",true,false,${rendered});`,
        `${output}=xml_element_append(${output},${part});`,
        `${index}=array_text_next_index(${index});`,
      )
      destination.push(
        `while array_output_has_element(&${payload},${index}) {`,
        ...indent(body),
        '}',
      )
      return output
    }
    const output = fresh('xml_scalar_output'),
      rendered = fresh('xml_scalar_rendered'),
      special: Record<string, string> = {
        'pg_catalog.xml': 'xml_to_output_text',
        'pg_catalog.bool': 'xml_value_boolean',
        'pg_catalog.date': 'xml_value_date',
        'pg_catalog."timestamp"': 'xml_value_timestamp',
        'pg_catalog.timestamptz': 'xml_value_timestamptz',
      }
    let conversion: string
    if (special[operand.type]) conversion = `${special[operand.type]}(${ownedOperand(operand)})`
    else if (operand.type === 'pg_catalog.bytea')
      conversion = `xml_value_binary(${ownedOperand(operand)},${executionContext.xmlBinary === 'hex' ? 1 : executionContext.xmlBinary === 'base64' ? 2 : 0})`
    else if (anonymousRecordProfile(operand.type))
      conversion = renderAnonymousRecordOutput(operand, destination)
    else {
      const cell = fresh('xml_scalar_cell'),
        prefix = rustValuePrefix(rustType(operand.type))
      destination.push(`let ${cell}=array_element_from_${prefix}(${ownedOperand(operand)});`)
      conversion = renderTypedOutput(cell, operand.type, destination, definition)
    }
    destination.push(
      `let ${output}=${conversion};`,
      `let ${rendered}=xml_element_value_escape(${output},${escape && operand.type !== 'pg_catalog.xml' && operand.type !== 'pg_catalog.bytea'});`,
    )
    return rendered
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
    const inner: string[] = []
    const base = arrayElementBaseType(elementType)
    let conversion: string
    if (
      usesTypedRangeOutput(rangeTypeProfile(base) ?? multirangeTypeProfile(base)) ||
      anonymousRecordProfile(base)
    ) {
      conversion = renderTypedOutput(element, base, inner, definition)
    } else if (compositeProfile(base)) {
      const key = JSON.stringify(['__pgsid_array_output_element', false]),
        outer = localInputs.get(key)
      inner.push(`let ${scalar}=array_element_to_composite(${element});`)
      localInputs.set(key, {
        name: '__pgsid_array_output_element',
        type: base,
        rustName: scalar,
        rustType: 'CompositeValue',
      })
      try {
        const result = emitScalar(
          {
            kind: 'composite-to-text',
            type: 'pg_catalog.text',
            operand: {
              kind: 'input',
              name: '__pgsid_array_output_element',
              type: base as ScalarType,
            },
          },
          inner,
          new Set(),
        )
        conversion = result.name
      } finally {
        if (outer) localInputs.set(key, outer)
        else localInputs.delete(key)
      }
    } else if (base.startsWith('array:')) {
      const nested = fresh('array_nested')
      inner.push(
        `let ${scalar} = array_element_to_array(${element});`,
        `let ${nested} = prepare_array_output(${scalar});`,
      )
      const values = renderArrayOutput(nested, base.slice(6), definition, inner)
      conversion = `finish_array_output(${nested}, ${values}, ${arrayElementDelimiter(base.slice(6)) === ';'})`
    } else {
      const output = arrayElementOutput(elementType, definition, element, scalar, executionContext)
      if (output.scalarRequired)
        inner.push(`let ${scalar} = array_element_to_${output.prefix}(${element});`)
      conversion =
        base === 'pg_catalog.jsonb'
          ? `jsonb_text_context(${scalar}, ${executionContext.serverEncoding === 'UTF8'})`
          : output.conversion
    }
    destination.push(...indent(inner))
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

  let storedArrayInputScope = false
  let storedArrayXmlStorageScope = false
  let comparisonProfileScope: CompositeProfile | null = null
  let comparisonCollationInvalid = false
  let storedArrayMoneyLiterals: readonly { text: string; units: string }[] | undefined
  let storedTsqueryStorageScope: { plan: string; index: string } | null = null
  const renderStoredTsquery = (input: string, lines: string[]): string => {
    if (storedTsqueryStorageScope === null)
      throw new UnsupportedCheckRustExpression(
        'Stored tsquery container input requires captured query trees',
      )
    const { plan, index } = storedTsqueryStorageScope,
      result = fresh('tsquery_storage_value'),
      nullness = fresh('tsquery_storage_nullness')
    lines.push(
      `let ${result}=tsquery_from_captured_text(${input},&${plan},${index});`,
      `let ${nullness}=tsquery_is_null(${result}.clone());`,
      `${index}=advance_tsquery_storage(${nullness},${index});`,
    )
    return result
  }
  let storedTsvectorStorageScope: { plan: string; index: string } | null = null
  const applyTsvectorStorage = (input: string, lines: string[]): string => {
    if (storedTsvectorStorageScope === null) return input
    const result = fresh('tsvector_storage_value'),
      nullness = fresh('tsvector_storage_nullness')
    const { plan, index } = storedTsvectorStorageScope
    lines.push(
      `let ${result}=apply_tsvector_storage(${input},&${plan},${index});`,
      `let ${nullness}=tsvector_is_null(${result}.clone());`,
      `${index}=advance_tsvector_storage(${nullness},${index});`,
    )
    return result
  }
  const portableComparison = (
    type: string,
    signature: string | null | undefined,
  ): string | null => {
    if (type === 'pg_catalog.tsquery' && signature === arrayElementComparison(type)?.comparator)
      return 'tsquery_order'
    if (type === 'pg_catalog.tsvector' && signature === arrayElementComparison(type)?.comparator)
      return 'tsvector_order'
    if (
      isRangeType(type) &&
      signature === builtinTypeComparison('pg_catalog.int4range')?.comparator
    )
      return 'range_order'
    if (
      isMultirangeType(type) &&
      signature === builtinTypeComparison('pg_catalog.int4multirange')?.comparator
    )
      return 'multirange_order'
    return null
  }
  let declaredArrayInputScope = false
  const renderArrayInputElement = (
    elementType: string,
    definition: EnumDefinition | undefined,
    event: string,
    stored: boolean,
    destination: string[],
    moneyLiterals?: readonly { text: string; units: string }[],
    declaredEncoding = false,
    inputConversion?: EvalExpression,
    used?: Set<string>,
    xmlStorage = false,
  ): string => {
    const family = arrayElementFamily(elementType)
    if (family === null)
      throw new UnsupportedCheckRustExpression('Missing array input element carrier')
    if (isCatalogVectorType(elementType) && !inputConversion) {
      const signature = builtinTypeIO(elementType)?.input
      const input = signature ? builtinMetadata(signature) : null
      if (
        input?.kind !== 'function' ||
        input.result !== elementType ||
        input.args.join(',') !== 'pg_catalog.cstring' ||
        !input.strict ||
        input.returnsSet
      )
        throw new UnsupportedCheckRustExpression(
          'Vector array input requires its catalog I/O identity',
        )
      const value = fresh('vector_array_input')
      const element = fresh('vector_array_element')
      destination.push(
        `let ${value}=catalog_vector_from_text(${event},${elementType === 'pg_catalog.oidvector'});`,
        `let ${element}=array_element_from_array(${value});`,
      )
      return element
    }
    if (family === 41 || family === 44 || inputConversion) {
      if (!inputConversion || !used)
        throw new UnsupportedCheckRustExpression(
          'Nested array text input requires its element conversion plan',
        )
      const key = JSON.stringify(['__pgsid_array_text_element', false])
      const outerInput = localInputs.get(key),
        outerValidity = arrayValidityScope,
        outerStored = storedArrayInputScope,
        outerXmlStorage = storedArrayXmlStorageScope,
        outerMoney = storedArrayMoneyLiterals,
        outerDeclared = declaredArrayInputScope,
        outerDepth = preparationDepth
      localInputs.set(key, {
        name: '__pgsid_array_text_element',
        type: 'pg_catalog.text',
        rustName: event,
        rustType: 'TextValue',
      })
      arrayValidityScope = null
      storedArrayInputScope = stored
      storedArrayXmlStorageScope = storedArrayXmlStorageScope || xmlStorage
      storedArrayMoneyLiterals = stored ? moneyLiterals : undefined
      declaredArrayInputScope = declaredArrayInputScope || declaredEncoding
      preparationDepth = 0
      try {
        const value = emitScalar(inputConversion, destination, used)
        if (value.type !== elementType)
          throw new UnsupportedCheckRustExpression(
            'Nested array input requires its matching base carrier',
          )
        const result = fresh('nested_array_input_element')
        destination.push(
          `let ${result}=array_element_from_${rustValuePrefix(rustType(elementType))}(${ownedOperand(value)});`,
        )
        return result
      } finally {
        if (outerInput) localInputs.set(key, outerInput)
        else localInputs.delete(key)
        arrayValidityScope = outerValidity
        storedArrayInputScope = outerStored
        storedArrayXmlStorageScope = outerXmlStorage
        storedArrayMoneyLiterals = outerMoney
        declaredArrayInputScope = outerDeclared
        preparationDepth = outerDepth
      }
    }
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
      scalar =
        elementType === 'pg_catalog.name' && !stored
          ? `name_from_text_context(${event},${executionContext.maxIdentifierBytes ?? -1},${executionContext.serverEncoding === 'UTF8'})`
          : event
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
    } else if (family === 31) {
      scalar = `money_from_text_context(${event},${moneyTextCLocale(executionContext)})`
    } else if (family === 40) {
      if (!stored) requiresRegex = true
      scalar = stored
        ? `jsonpath_from_stored_text(${event})`
        : `jsonpath_from_text(${event}, ${executionContext.defaultCollation === 'C'}, ${executionContext.serverEncoding === 'UTF8'})`
    } else if (family === 48) {
      if (stored) {
        const captured = renderStoredTsquery(event, destination)
        destination.push(`let ${element}=array_element_from_tsquery(${captured});`)
        return element
      }
      scalar = `tsquery_from_text_context(${event},${executionContext.serverEncoding === 'UTF8'})`
    } else if (family === 47) {
      scalar = `${stored ? 'tsvector_from_stored_text_context' : 'tsvector_from_text_context'}(${event},${executionContext.serverEncoding === 'UTF8'})`
    } else if (family === 46) {
      scalar = `aclitem_from_text_context(${event},${executionContext.maxIdentifierBytes ?? -1},${executionContext.serverEncoding === 'UTF8'})`
    } else if (family === 45) {
      scalar =
        xmlStorage || storedArrayXmlStorageScope
          ? `xml_from_storage_text(${event})`
          : stored
            ? `xml_from_rendered_text(${event})`
            : `xml_from_text_context(${event},${executionContext.xmlOption === 'document' ? 1 : executionContext.xmlOption === 'content' ? 2 : 0},${executionContext.serverEncoding === 'UTF8'})`
    } else if (family === 23) {
      scalar = `interval_from_text_context(${event},${stored ? 0 : intervalStyleCode(executionContext)})`
    } else if (family === 43) {
      const multi = builtinMultirangeType(arrayElementBaseType(elementType))!
      scalar = `multirange_from_text(${event}, ${rustStringLiteral(multi.multirange)}, ${rustStringLiteral(multi.identity)}, ${rustStringLiteral(multi.subtype)}, ${arrayElementFamily(multi.subtype)})`
    } else if (family === 42) {
      const range = builtinRangeType(arrayElementBaseType(elementType))!
      scalar = `range_from_text(${event}, ${rustStringLiteral(range.identity)}, ${rustStringLiteral(range.subtype)}, ${arrayElementFamily(range.subtype)})`
    } else scalar = `${prefix}_from_text(${event})`

    if (family === 12)
      scalar =
        jsonPopulateInput?.text === event
          ? `json_populate_array_jsonb(${jsonPopulateInput.input}.clone(),${event},${executionContext.serverEncoding === 'UTF8'})`
          : `jsonb_from_text_context(${event}, ${executionContext.serverEncoding === 'UTF8'})`
    if (jsonPopulateInput?.text === event && jsonPopulateInput.arrayModifier !== undefined) {
      const modifier = jsonPopulateInput.arrayModifier
      if (family === 14)
        scalar = `bit_from_text_modifier(${event},${modifier},${elementType === 'pg_catalog.varbit'},${executionContext.serverEncoding === 'UTF8'})`
      if (family === 23) {
        const fields = fresh('array_interval_fields')
        destination.push(`let ${fields} = make_int4_value(${Math.floor(modifier / 65536)});`)
        scalar = `interval_from_text_fields_context(${event},${fields},${intervalStyleCode(executionContext)})`
      }
    }
    const value = fresh('array_input_scalar')
    destination.push(`let ${value} = ${scalar};`)
    const applied = family === 47 && stored ? applyTsvectorStorage(value, destination) : value
    destination.push(`let ${element} = array_element_from_${prefix}(${applied});`)
    return element
  }

  const renderJsonPopulateFields = (
    initial: string,
    profile: CompositeProfile,
    conversion: Extract<EvalExpression, { kind: 'text-to-composite' }>,
    destination: string[],
    used: Set<string>,
  ): string => {
    const definition = profile.graph.definitions.find((n) => n.identity === profile.identity)!
    const utf8 = executionContext.serverEncoding === 'UTF8'
    const bindPopulate = (source: string): string => {
      const name = fresh('json_populate')
      destination.push(`let ${name} = ${source};`)
      return name
    }
    let state = initial
    for (const [index, field] of definition.fields.entries()) {
      const type = compositeFieldType(profile, field.type),
        declared = profile.graph.definitions.find((n) => n.identity === field.type),
        physical = compositePhysicalType(profile, field.type)
      if (!type || !declared || !physical)
        throw new UnsupportedCheckRustExpression(
          'JSON record fields require captured input carriers',
        )
      state = bindPopulate(`json_populate_select(${state},${rustStringLiteral(field.name)})`)
      const next = fresh('json_populate_next'),
        text = fresh('json_populate_text'),
        current = fresh('json_populate_input'),
        base = fresh('json_populate_base'),
        hard = fresh('json_populate_hard'),
        status = fresh('json_populate_preparation'),
        cell = fresh('json_populate_field'),
        kind = rustType(type),
        prefix = rustValuePrefix(kind),
        prepared: string[] = [],
        lines: string[] = [],
        key = JSON.stringify(['__pgsid_composite_text_field', false]),
        outer = localInputs.get(key),
        outerValidity = arrayValidityScope,
        outerPreparation = domainInputPreparation,
        outerDepth = preparationDepth,
        outerHard = jsonPopulateHardError,
        outerInput = jsonPopulateInput,
        outerStored = storedArrayInputScope,
        outerXmlStorage = storedArrayXmlStorageScope
      localInputs.set(key, {
        name: '__pgsid_composite_text_field',
        type: 'pg_catalog.text',
        rustName: text,
        rustType: 'TextValue',
      })
      arrayValidityScope = null
      domainInputPreparation = { lines: prepared, status }
      preparationDepth = 0
      jsonPopulateHardError = hard
      let arrayModifier = field.typeMod
      let modifierType = declared
      const modifierTypes = new Set<string>()
      while (!modifierTypes.has(modifierType.identity)) {
        modifierTypes.add(modifierType.identity)
        if (modifierType.baseTypeMod !== -1) arrayModifier = modifierType.baseTypeMod
        const next = modifierType.base ?? modifierType.element
        const nextType = next && profile.graph.definitions.find((n) => n.identity === next)
        if (!nextType) break
        modifierType = nextType
      }
      jsonPopulateInput = {
        input: current,
        text,
        base,
        ...(arrayModifier >= 0 ? { arrayModifier } : {}),
      }
      storedArrayInputScope = false
      storedArrayXmlStorageScope = false
      let unavailable = false
      try {
        const name =
          declared.kind === 'd'
            ? 'domain_in'
            : physical.kind === 'e'
              ? 'enum_in'
              : physical.kind === 'c'
                ? 'record_in'
                : physical.element && !isCatalogVectorType(arrayElementBaseType(type))
                  ? 'array_in'
                  : null
        const selected = name
          ? builtinCallables().find(
              (n) =>
                n.kind === 'function' &&
                n.schema === 'pg_catalog' &&
                n.name === name &&
                n.args[0] === 'pg_catalog.cstring',
            )
          : null
        const expected = selected
          ? callableIdentity(selected)
          : (rangeTypeInput(type) ?? builtinTypeIO(type)?.input)
        if (!expected || declared.input !== expected)
          throw new UnsupportedCheckRustExpression('Unavailable selected field input callback')
        const value = emitScalar(conversion.conversions[index]!, lines, used)
        lines.push(`let ${cell} = array_element_from_${prefix}(${ownedOperand(value)});`)
      } catch (error) {
        if (!(error instanceof UnsupportedCheckRustExpression)) throw error
        unavailable = true
        prepared.length = 0
        lines.length = 0
      } finally {
        if (outer) localInputs.set(key, outer)
        else localInputs.delete(key)
        arrayValidityScope = outerValidity
        domainInputPreparation = outerPreparation
        preparationDepth = outerDepth
        jsonPopulateHardError = outerHard
        jsonPopulateInput = outerInput
        storedArrayInputScope = outerStored
        storedArrayXmlStorageScope = outerXmlStorage
      }
      const container = type.startsWith('array:')
          ? 1
          : compositeProfile(arrayElementBaseType(type))
            ? 2
            : 0,
        quoted = ['pg_catalog."json"', 'pg_catalog.jsonb'].includes(arrayElementBaseType(type)),
        calendar = [
          'pg_catalog.date',
          'pg_catalog."timestamp"',
          'pg_catalog.timestamptz',
          'pg_catalog."time"',
          'pg_catalog.timetz',
        ].includes(arrayElementBaseType(type)),
        finished = fresh('json_populate_finished'),
        result = fresh('json_populate_value'),
        accepted = fresh('json_populate_cell'),
        needsBase = new RegExp(`\\b${base}\\b`).test([...prepared, ...lines].join('\n')),
        needsText = new RegExp(`\\b${text}\\b`).test([...prepared, ...lines].join('\n'))
      destination.push(
        `let mut ${result}:${kind} = ${prefix}_unknown();`,
        `let mut ${hard}:CheckOutcome = json_populate_begin_hard();`,
        `if json_populate_should_convert(&${state}) {`,
        `    let ${current} = json_populate_current(&${state});`,
        ...(needsBase ? [`    let ${base} = json_populate_base_current(&${state});`] : []),
        ...(unavailable
          ? [
              `    let ${cell} = json_populate_unavailable(${current},${declared.kind === 'd'});`,
              `    let ${status} = json_populate_begin_hard();`,
            ]
          : [
              ...(needsText
                ? [
                    `    let ${text} = json_populate_scalar_text(${current}.clone(),${quoted},${container},${calendar},${utf8});`,
                  ]
                : []),
              `    let mut ${status}:CheckOutcome = json_populate_begin_hard();`,
              ...indent(prepared),
              ...indent(lines),
            ]),
        `    let ${finished} = finish_domain_conversion(${cell},${status});`,
        `    ${result} = array_element_to_${prefix}(${finished});`,
        '};',
        `let ${accepted} = array_element_from_${prefix}(${ownedOperand({ name: result, type })});`,
        `let ${next} = json_populate_accept(${state},${accepted},${hard});`,
      )
      state = next
    }
    return state
  }
  const renderJsonPopulateDomain = (
    state: string,
    conversion: Extract<EvalExpression, { kind: 'domain-cast' }>,
    destination: string[],
    used: Set<string>,
  ): string => {
    const value = fresh('json_populate_domain_value'),
      result = fresh('json_populate_domain_result'),
      hard = fresh('json_populate_domain_hard'),
      status = fresh('json_populate_domain_preparation'),
      cell = fresh('json_populate_domain_cell'),
      finished = fresh('json_populate_domain_finished'),
      next = fresh('json_populate_domain_next'),
      prepared: string[] = [],
      lines: string[] = [],
      name = '__pgsid_json_populate_domain',
      key = JSON.stringify([name, false]),
      outer = localInputs.get(key),
      outerValidity = arrayValidityScope,
      outerPreparation = domainInputPreparation,
      outerDepth = preparationDepth,
      outerHard = jsonPopulateHardError,
      outerInput = jsonPopulateInput
    const replace = (node: EvalExpression): EvalExpression =>
      node.kind === 'domain-cast'
        ? { ...node, operand: replace(node.operand) }
        : { kind: 'input', type: conversion.type, name }
    localInputs.set(key, {
      name,
      type: conversion.type,
      rustName: value,
      rustType: 'CompositeValue',
    })
    arrayValidityScope = null
    domainInputPreparation = { lines: prepared, status }
    preparationDepth = 0
    jsonPopulateHardError = hard
    jsonPopulateInput = null
    let converted: { name: string; type: string }
    try {
      converted = emitScalar(replace(conversion), lines, used)
      if (converted.type !== conversion.type)
        throw new UnsupportedCheckRustExpression(
          'JSON root domain requires its populated record carrier',
        )
    } finally {
      if (outer) localInputs.set(key, outer)
      else localInputs.delete(key)
      arrayValidityScope = outerValidity
      domainInputPreparation = outerPreparation
      preparationDepth = outerDepth
      jsonPopulateHardError = outerHard
      jsonPopulateInput = outerInput
    }
    destination.push(
      `let mut ${result}:CompositeValue = composite_unknown();`,
      `let mut ${hard}:CheckOutcome = json_populate_begin_hard();`,
      `if json_populate_domain_ready(&${state}) {`,
      `    let ${value} = json_populate_domain_value(&${state});`,
      `    let mut ${status}:CheckOutcome = json_populate_begin_hard();`,
      ...indent(prepared),
      ...indent(lines),
      `    let ${cell} = array_element_from_composite(${ownedOperand(converted)});`,
      `    let ${finished} = finish_domain_conversion(${cell},${status});`,
      `    ${result} = array_element_to_composite(${finished});`,
      '};',
      `let ${next} = json_populate_accept_domain(${state},${result},${hard});`,
    )
    return next
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
        (node.kind === 'text-to-enum' && node.literal === true) ||
        (node.kind === 'text-to-boolean' && node.literal === true) ||
        (node.kind === 'text-to-vector' && node.literal === true) ||
        (node.kind === 'text-to-range' && node.literal === true) ||
        (node.kind === 'text-to-multirange' && node.literal === true) ||
        (node.kind === 'text-to-composite' && node.literal === true) ||
        (node.kind === 'certain' &&
          (node.expression.kind === 'point' ||
            node.expression.kind === 'range' ||
            node.expression.kind === 'multirange' ||
            node.expression.kind === 'json' ||
            node.expression.kind === 'jsonb' ||
            node.expression.kind === 'jsonpath' ||
            node.expression.kind === 'xml' ||
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
      declareConstant(name, rustType(value.type), `${prefix}_unknown()`)
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
            isXmlPreparationCallable(implementation) ||
            isRecordComparison(implementation) ||
            isArrayExtremum(implementation) ||
            isArrayBucket(implementation) ||
            isArrayHash(implementation) ||
            isRecordHash(implementation)))) &&
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
      declareConstant(name, kind, `${prefix}_unknown()`)
      preparationLines.push(`${name} = ${ownedOperand(value)};`)
      carryPreparedRequirement(name, value, preparationLines)
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
      if (outer !== null) {
        bindings.push(`${outer} = array_validity_finish(${outer}, ${validity});`)
        appendValidityRequirement(outer, validity, diagnostics.reference(validity), bindings)
      }
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
      )
      const requirement = diagnostics.reason(value, bindings)
      bindings.push(...preparationFinishLines(state, requirement))
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
  const prepareCompositeOperand = (operand: EvalExpression): void => {
    const start = constantBindings.length
    const outer: string | null = arrayValidityScope
    arrayValidityScope = null
    try {
      emitPreparedOperand(operand, [], new Set())
    } finally {
      arrayValidityScope = outer
    }
    for (const binding of constantBindings.slice(start)) {
      const prefix =
        binding.type === 'CheckOutcome'
          ? 'bool_from_check'
          : rustValuePrefix(binding.type) + '_is_null'
      const argument =
        binding.name +
        ([
          'JsonValue',
          'JsonbValue',
          'JsonpathValue',
          'XmlValue',
          'ArrayValue',
          'TsvectorValue',
          'TsqueryValue',
          'SnapshotValue',
          'RangeValue',
          'MultirangeValue',
          'CompositeValue',
          'PolygonValue',
          'PathValue',
          'TextValue',
          'ByteaValue',
          'BitValue',
          'NumericValue',
        ].includes(binding.type)
          ? '.clone()'
          : '')
      const nullness = fresh('discarded_field_nullness'),
        status = fresh('discarded_field_preparation')
      preparationLines.push(
        `let ${nullness} = ${prefix}(${argument});`,
        `let ${status} = array_value_validity(${nullness}, true);`,
        ...preparationFinishLines(status),
      )
    }
  }
  const arrayStorageInProgress = new Set<EvalExpression>()
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
    if (
      (node.kind === 'array-text-literal' ||
        node.kind === 'text-to-composite' ||
        node.kind === 'text-to-range' ||
        node.kind === 'text-to-multirange' ||
        node.kind === 'array-constructor') &&
      (('origin' in node && node.origin === 'stored') || node.arrayStorage !== undefined) &&
      !arrayStorageInProgress.has(node)
    ) {
      arrayStorageInProgress.add(node)
      let value: { name: string; type: string }
      try {
        value = emitScalarInner(node, bindings, used)
      } finally {
        arrayStorageInProgress.delete(node)
      }
      const prefix = rustValuePrefix(rustType(value.type)),
        cell = bind(`array_element_from_${prefix}(${ownedOperand(value)})`)
      let restored: string
      if (
        node.arrayStorage !== undefined &&
        node.arrayStorage.every(
          (entry) =>
            entry &&
            /^(?:\/(?:0|[1-9]\d*))*$/u.test(entry.path) &&
            Number.isInteger(entry.dimensions) &&
            entry.dimensions >= 0 &&
            entry.dimensions <= 6 &&
            Number.isInteger(entry.elements) &&
            entry.elements >= 0 &&
            entry.elements <= 2147483647 &&
            typeof entry.nullBitmap === 'boolean',
        )
      ) {
        let plan = bind('make_array_storage_plan()')
        for (const entry of node.arrayStorage) {
          plan = bind(
            `append_array_storage(${plan},${rustStringLiteral(entry.path)},${entry.dimensions},${entry.elements},${entry.nullBitmap})`,
          )
        }
        restored = bind(`apply_array_storage(${cell},&${plan})`)
      } else restored = bind(`forget_array_storage(${cell})`)
      return { name: bind(`array_element_to_${prefix}(${restored})`), type: value.type }
    }
    if (
      (node.kind === 'array-text-literal' ||
        node.kind === 'text-to-composite' ||
        node.kind === 'text-to-range' ||
        node.kind === 'text-to-multirange') &&
      node.tsqueryStorage !== undefined
    ) {
      const { tsqueryStorage, ...plain } = node
      let plan = bind('make_tsquery_storage_plan()')
      const initial = bind('make_int4_value(0)'),
        index = fresh('tsquery_storage_index')
      bindings.push(`let mut ${index}:Int4Value=${initial};`)
      for (const entry of tsqueryStorage) {
        if (!validTsqueryConstantStorage(entry))
          throw new UnsupportedCheckRustExpression('Invalid tsquery container storage metadata')
        let payload = bind(`make_tsquery_payload(${entry.nativeBytes})`)
        for (const node of entry.nodes)
          payload = bind(
            `tsquery_append_node(${payload},${node.kind},${rustStringLiteral(node.text)},${node.weight},${node.prefix},${node.distance},${node.left},${node.right})`,
          )
        const value = bind(`make_tsquery_value(${payload})`)
        plan = bind(`append_tsquery_storage(${plan},${value})`)
      }
      const previous = storedTsqueryStorageScope
      storedTsqueryStorageScope = { plan, index }
      try {
        const decoded = emitScalarInner(plain, bindings, used),
          prefix = rustValuePrefix(rustType(decoded.type)),
          cell = bind(`array_element_from_${prefix}(${ownedOperand(decoded)})`),
          finished = bind(`finish_tsquery_storage(${cell},&${plan},${index})`)
        return { name: bind(`array_element_to_${prefix}(${finished})`), type: decoded.type }
      } finally {
        storedTsqueryStorageScope = previous
      }
    }
    if (
      (node.kind === 'array-text-literal' ||
        node.kind === 'text-to-composite' ||
        node.kind === 'text-to-range' ||
        node.kind === 'text-to-multirange') &&
      node.tsvectorStorage !== undefined
    ) {
      const { tsvectorStorage, ...plain } = node
      let plan = bind('make_tsvector_storage_plan()')
      const initial = bind('make_int4_value(0)'),
        index = fresh('tsvector_storage_index')
      bindings.push(`let mut ${index}:Int4Value=${initial};`)
      for (const entry of tsvectorStorage) {
        if (
          !Number.isInteger(entry.nativeBytes) ||
          !Number.isInteger(entry.lexemeCount) ||
          entry.nativeBytes < 8 ||
          entry.nativeBytes > 1073741823 ||
          entry.lexemeCount < 0 ||
          entry.lexemeCount > 1048575
        )
          throw new UnsupportedCheckRustExpression('Invalid tsvector container storage metadata')
        plan = bind(`append_tsvector_storage(${plan},${entry.nativeBytes},${entry.lexemeCount})`)
      }
      const previous = storedTsvectorStorageScope
      storedTsvectorStorageScope = { plan, index }
      try {
        const decoded = emitScalarInner(plain, bindings, used),
          prefix = rustValuePrefix(rustType(decoded.type))
        const cell = bind(`array_element_from_${prefix}(${ownedOperand(decoded)})`)
        const finished = bind(`finish_tsvector_storage(${cell},&${plan},${index})`)
        return { name: bind(`array_element_to_${prefix}(${finished})`), type: decoded.type }
      } finally {
        storedTsvectorStorageScope = previous
      }
    }
    if (node.kind === 'xml-constructor') {
      const operands = node.operands.map((operand) => emitScalar(operand, bindings, used))
      if (node.operation === 'element' || node.operation === 'forest') {
        const validity = fresh('xml_argument_validity'),
          valid = bind('make_bool_value(true)'),
          initial = bind(`check_from_bool(${valid})`),
          empty = node.operation === 'element' ? bind('make_text_value("")') : null,
          missing = bind('text_null()'),
          attributes = fresh('xml_attributes'),
          content = fresh('xml_content')
        bindings.push(
          `let mut ${validity}:CheckOutcome=${initial};`,
          ...(empty ? [`let mut ${attributes}:TextValue=${empty};`] : []),
          `let mut ${content}:TextValue=${missing};`,
        )
        for (const operand of operands) {
          const nullness = bind(
              `${rustValuePrefix(rustType(operand.type))}_is_null(${ownedOperand(operand)})`,
            ),
            state = bind(`array_value_validity(${nullness},true)`)
          bindings.push(`${validity}=array_validity_finish(${validity},${state});`)
        }
        for (const [index, operand] of operands.entries()) {
          let leaf = arrayElementBaseType(operand.type)
          while (leaf.startsWith('array:')) leaf = arrayElementBaseType(leaf.slice(6))
          const named = node.named?.[index],
            attribute = node.operation === 'element' && !!named,
            definition = node.inputEnums?.find((d) => enumType(d) === leaf),
            text = renderXmlValue(operand, !attribute, bindings, definition),
            part = named
              ? bind(
                  `${attribute ? 'xml_element_attribute' : 'xml_forest_part'}(${rustStringLiteral(named.name)},${named.mapped},${named.implicit},${text}${attribute ? ',' + String(executionContext.serverEncoding === 'UTF8') : ''})`,
                )
              : text,
            destination = attribute ? attributes : content
          bindings.push(`${destination}=xml_element_append(${destination},${part});`)
        }
        return {
          name: bind(
            node.operation === 'element'
              ? `xml_element_finish(${rustStringLiteral(node.name ?? '')},${node.mapped === true},${attributes},${content},${validity})`
              : `xml_forest_finish(${content},${validity})`,
          ),
          type: node.type,
        }
      }
      if (node.operation === 'concat') {
        const initial = bind('xml_concat_begin()'),
          state = fresh('xml_concat')
        bindings.push(`let mut ${state}: XmlConcatState = ${initial};`)
        for (const operand of operands)
          bindings.push(`${state} = xml_concat_append(${state}, ${ownedOperand(operand)});`)
        return { name: bind(`xml_concat_finish(${state})`), type: node.type }
      }
      if (node.operation === 'root')
        return {
          name: bind(
            `xml_root(${ownedOperand(operands[0]!)},${ownedOperand(operands[1]!)},${node.standalone ?? 3})`,
          ),
          type: node.type,
        }
      const content = operands[0] ? ownedOperand(operands[0]) : bind('text_null()')
      return {
        name: bind(
          `xml_make_processing_instruction(${rustStringLiteral(node.name ?? '')},${content},${operands.length === 1},${node.mapped === true})`,
        ),
        type: node.type,
      }
    }
    if (node.kind === 'xml-operation') {
      const operand = emitScalar(node.operand, bindings, used)
      const value = ownedOperand(operand),
        utf8 = executionContext.serverEncoding === 'UTF8'
      const mode = node.mode ?? executionContext.xmlOption
      const option = mode === 'document' ? 1 : mode === 'content' ? 2 : 0
      const helper =
        node.operation === 'text'
          ? `xml_to_text(${value})`
          : node.operation === 'document'
            ? `xml_is_document_context(${value},${utf8})`
            : node.operation === 'serialize'
              ? `xml_serialize_context(${value},${option},${node.indent === true},${utf8})`
              : node.operation === 'cast' && storedArrayInputScope
                ? `${storedArrayXmlStorageScope ? 'xml_from_storage_text' : 'xml_from_rendered_text'}(${value})`
                : `xml_from_text_context(${value},${option},${utf8})`
      const result = { name: bind(helper), type: node.type }
      if (node.operation === 'text') diagnostics.flow(result, [operand], bindings)
      return result
    }
    if (node.kind === 'range-constant' || node.kind === 'multirange-constant') {
      const profile = rangeTypeProfile(node.type) ?? multirangeTypeProfile(node.type)
      if (!profile)
        throw new UnsupportedCheckRustExpression('Stored range requires a captured type profile')
      const support = rangeProfileSupport(profile, executionContext),
        compiled = bind(`make_range_support(${support.comparison},${support.canonical})`)
      if (node.kind === 'multirange-constant') {
        if (node.operands.some((arg) => scalarType(arg) !== profile.rangeType))
          throw new UnsupportedCheckRustExpression(
            'Stored multirange members require the captured range identity',
          )
        const array = emitScalar(
          {
            kind: 'array-constructor',
            type: arrayType(profile.rangeType),
            elementType: profile.rangeType,
            multidimensional: false,
            operands: node.operands,
          },
          bindings,
          used,
        )
        return {
          type: node.type,
          name: bind(
            `multirange_from_coerced_array(${ownedOperand(array)},${rustStringLiteral(profile.multirange)},${rustStringLiteral(profile.identity)},${rustStringLiteral(profile.subtype)},${arrayElementFamily(profile.elementType)},${compiled})`,
          ),
        }
      }
      if (
        node.operands.length !== (node.empty ? 0 : 2) ||
        node.operands.some((arg) => scalarType(arg) !== profile.elementType)
      )
        throw new UnsupportedCheckRustExpression('Stored range bounds require the captured subtype')
      const operands = node.operands.map((arg) => emitScalar(arg, bindings, used)),
        cells = operands.map((arg) =>
          bind(`array_element_from_${rustValuePrefix(rustType(arg.type))}(${ownedOperand(arg)})`),
        )
      if (node.empty) {
        const value = bind('int4_null()'),
          cell = bind(`array_element_from_int4(${value})`)
        cells.push(`${cell}.clone()`, cell)
      }
      const helper =
        rangeContainerKind(profile.elementType) !== null
          ? 'range_from_typed_bounds'
          : profile.subtypeEnum
            ? 'range_from_defined_bounds'
            : 'range_from_profiled_bounds'
      return {
        type: node.type,
        name: bind(
          `${helper}(${rustStringLiteral(profile.identity)},${rustStringLiteral(profile.subtype)},${arrayElementFamily(profile.elementType)},${node.empty},${node.lowerInclusive},${node.upperInclusive},${cells[0]},${cells[1]},${compiled}${rangeContainerKind(profile.elementType) !== null ? ',"",-1' : ''}${rangeDefinitionArguments(profile, executionContext, bind)})`,
        ),
      }
    }
    if (node.kind === 'captured-range-call') {
      const profile = rangeTypeProfile(node.type) ?? multirangeTypeProfile(node.type)
      const implementation = profile ? rangeConstructorImplementation(profile, node.callable) : null
      if (!profile?.captured || !implementation)
        throw new UnsupportedCheckRustExpression(
          'Custom constructor requires its selected captured implementation',
        )
      const operands = node.operands.map((operand) => emitScalar(operand, bindings, used))
      const support = rangeProfileSupport(profile, executionContext)
      const compiled = bind(`make_range_support(${support.comparison},${support.canonical})`)
      const metadata = `${rustStringLiteral(profile.multirange)},${rustStringLiteral(profile.identity)},${rustStringLiteral(profile.subtype)},${arrayElementFamily(profile.elementType)},${compiled}`
      if (implementation === 'range_constructor2' || implementation === 'range_constructor3') {
        const flags =
          implementation === 'range_constructor3'
            ? operands[2]
            : { name: bind('make_text_value("[)")'), type: 'pg_catalog.text' }
        if (
          operands.length !== (implementation === 'range_constructor2' ? 2 : 3) ||
          operands.slice(0, 2).some((operand) => operand.type !== profile.elementType) ||
          flags?.type !== 'pg_catalog.text' ||
          node.type !== profile.rangeType
        )
          throw new UnsupportedCheckRustExpression(
            'Custom range constructor requires its concrete coerced bounds',
          )
        const lower = bind(
          `array_element_from_${rustValuePrefix(rustType(profile.elementType))}(${ownedOperand(operands[0]!)})`,
        )
        const upper = bind(
          `array_element_from_${rustValuePrefix(rustType(profile.elementType))}(${ownedOperand(operands[1]!)})`,
        )
        return {
          type: node.type,
          name: bind(
            `range_construct_${rangeContainerKind(profile.elementType) !== null ? 'typed' : profile.subtypeEnum ? 'defined' : 'with_support'}(${rustStringLiteral(profile.identity)},${rustStringLiteral(profile.subtype)},${arrayElementFamily(profile.elementType)},${lower},${upper},${ownedOperand(flags)},${compiled}${rangeContainerKind(profile.elementType) !== null ? ',"",-1' : ''}${rangeDefinitionArguments(profile, executionContext, bind)})`,
          ),
        }
      }
      if (node.type !== profile.multirangeType)
        throw new UnsupportedCheckRustExpression(
          'Custom multirange constructor requires its declared result',
        )
      if (implementation === 'multirange_constructor0' && operands.length === 0)
        return {
          type: node.type,
          name: bind(`multirange_construct_empty_with_support(${metadata})`),
        }
      if (
        implementation === 'multirange_constructor1' &&
        operands.length === 1 &&
        operands[0]!.type === profile.rangeType
      )
        return {
          type: node.type,
          name: bind(
            `multirange_construct_single_with_support(${ownedOperand(operands[0]!)},${metadata})`,
          ),
        }
      if (implementation === 'multirange_constructor2') {
        let array: string
        if (node.expanded) {
          if (operands.some((operand) => operand.type !== profile.rangeType))
            throw new UnsupportedCheckRustExpression(
              'Custom variadic multirange requires matching range arguments',
            )
          const initial = bind(`make_array_arguments(${rustStringLiteral(profile.identity)},42)`),
            builder = fresh('multirange_constructor_members')
          bindings.push(`let mut ${builder}:ArrayArguments=${initial};`)
          for (const operand of operands) {
            const cell = bind(`array_element_from_range(${ownedOperand(operand)})`)
            bindings.push(`${builder}=append_array_argument(${builder},${cell});`)
          }
          array = bind(`finish_array_constructor(${builder})`)
        } else {
          if (operands.length !== 1 || operands[0]!.type !== `array:${profile.rangeType}`)
            throw new UnsupportedCheckRustExpression(
              'Custom variadic multirange requires its declared range array',
            )
          array = ownedOperand(operands[0]!)
        }
        return {
          type: node.type,
          name: bind(`multirange_construct_array_with_support(${array},${metadata})`),
        }
      }
      throw new UnsupportedCheckRustExpression(
        'Custom constructor arguments do not match the selected declaration',
      )
    }
    if (node.kind === 'domain-cast') {
      const array = node.type.startsWith('array:')
      const range = isRangeType(node.type)
      const multirange = isMultirangeType(node.type)
      const xml = node.type === 'pg_catalog.xml'
      const tsvector = node.type === 'pg_catalog.tsvector'
      const tsquery = node.type === 'pg_catalog.tsquery'
      if (
        !array &&
        !range &&
        !multirange &&
        !xml &&
        !tsvector &&
        !tsquery &&
        arrayElementFamily(node.type) === null
      )
        throw new UnsupportedCheckRustExpression(
          'Domain conversion requires a represented value carrier',
        )
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== node.type)
        throw new UnsupportedCheckRustExpression(
          'Domain conversion requires its SQL-coerced base type',
        )
      const prefix = rustValuePrefix(rustType(node.type))
      const nullness = bind(`${prefix}_is_null(${ownedOperand(operand)})`)
      const element =
        array || range || multirange || xml || tsvector || tsquery
          ? null
          : bind(`array_element_from_${prefix}(${ownedOperand(operand)})`)
      const initial = bind(`domain_conversion_start(${nullness}, ${node.notNull})`)
      const status = fresh('domain_status')
      bindings.push(`let mut ${status}: CheckOutcome = ${initial};`)
      for (const check of node.checks) {
        const checker = emitCheckRustEvaluator(
          check.expression,
          {
            schema: node.schema,
            kind: 'domain',
            owner: node.name + ':' + entryName,
            constraint: check.name + ':' + fresh('domain_check'),
          },
          executionContext,
        )
        domainHelpers.push(checker.source)
        checker.callables.forEach((name) => callables.add(name))
        requiresRegex ||= checker.requiresRegex
        const preparer = emitCheckRustEvaluator(
          check.expression,
          {
            schema: node.schema,
            kind: 'domain',
            owner: node.name + ':' + entryName,
            constraint: check.name + ':' + fresh('domain_prepare'),
          },
          executionContext,
          true,
        )
        domainHelpers.push(preparer.source)
        preparer.callables.forEach((name) => callables.add(name))
        requiresRegex ||= preparer.requiresRegex
        const targetPreparation = domainInputPreparation?.lines ?? preparationLines
        if (!domainInputPreparation) {
          if (domainPreparationState === null) {
            domainPreparationState = fresh('domain_preparation_status')
            declareConstant(domainPreparationState, 'CheckOutcome', 'check_unknown()')
          }
          targetPreparation.push(
            `${domainPreparationState} = array_validity_finish(${domainPreparationState}, ${preparationState});`,
          )
        }
        const preparationArgs = preparer.inputs.map((input) => {
          const name = fresh('domain_preparation_input')
          targetPreparation.push(
            `let ${name} = ${input.nullness ? 'bool' : rustValuePrefix(rustType(input.type))}_unknown();`,
          )
          return name
        })
        const prepared = fresh('domain_prepared')
        targetPreparation.push(
          `let ${prepared} = ${preparer.entryName}(${preparationArgs.join(', ')});`,
        )
        if (jsonPopulateHardError)
          targetPreparation.push(
            `${jsonPopulateHardError} = json_populate_hard_error(${jsonPopulateHardError}, ${prepared});`,
          )
        if (domainInputPreparation)
          targetPreparation.push(
            `${domainInputPreparation.status} = array_validity_finish(${domainInputPreparation.status}, ${prepared});`,
          )
        else
          targetPreparation.push(
            `${domainPreparationState} = array_validity_finish(${domainPreparationState}, ${prepared});`,
            ...preparationFinishLines(prepared),
          )
        const args = checker.inputs.map((input) => {
          if (input.name !== 'value' || (!input.nullness && input.type !== node.type))
            throw new UnsupportedCheckRustExpression(
              'Domain CHECK requires a local VALUE of its base type',
            )
          return input.nullness ? nullness : ownedOperand(operand)
        })
        const checked = fresh('domain_checked')
        bindings.push(
          `if domain_conversion_continues(${status}) {`,
          `    let ${checked} = ${checker.entryName}(${args.join(', ')});`,
          ...(jsonPopulateHardError
            ? [
                `    ${jsonPopulateHardError} = json_populate_hard_error(${jsonPopulateHardError}, ${checked});`,
              ]
            : []),
          `    ${status} = domain_conversion_check(${status}, ${checked});`,
          '};',
        )
      }
      if (tsvector)
        return {
          name: bind(`finish_tsvector_domain_conversion(${ownedOperand(operand)}, ${status})`),
          type: node.type,
        }
      if (tsquery)
        return {
          name: bind(`finish_tsquery_domain_conversion(${ownedOperand(operand)}, ${status})`),
          type: node.type,
        }
      if (xml)
        return {
          name: bind(`finish_xml_domain_conversion(${ownedOperand(operand)}, ${status})`),
          type: node.type,
        }
      if (array)
        return {
          name: bind(`finish_array_domain_conversion(${ownedOperand(operand)}, ${status})`),
          type: node.type,
        }
      if (range)
        return {
          name: bind(`finish_range_domain_conversion(${ownedOperand(operand)}, ${status})`),
          type: node.type,
        }
      if (multirange)
        return {
          name: bind(`finish_multirange_domain_conversion(${ownedOperand(operand)}, ${status})`),
          type: node.type,
        }
      const finished = bind(`finish_domain_conversion(${element}, ${status})`)
      return { name: bind(`array_element_to_${prefix}(${finished})`), type: node.type }
    }
    if (node.kind === 'array-subscript') {
      const operand = emitScalar(node.operand, bindings, used)
      const family = arrayElementFamily(node.elementType)
      if (
        family === null ||
        arrayLikeElementType(operand.type) !== node.elementType ||
        node.upper.length === 0 ||
        node.upper.length > 6 ||
        node.lower.length !== (node.slice ? node.upper.length : 0) ||
        node.type !==
          (node.slice ? arrayPhysicalType(operand.type) : arrayElementBaseType(node.elementType)) ||
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
      const initialRequirement = diagnostics.reason(operand, bindings)
      const requirement = diagnostics.declared(result, bindings, initialRequirement)
      const diagnosticBounds: { name: string; type: string }[] = []
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
          diagnosticBounds.push(value)
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
      if (diagnostics.enabled) {
        const source = diagnostics.merge([operand, ...diagnosticBounds], inner)
        const filtered = diagnostics.filtered({ name: result, type: node.type }, source, inner)
        inner.push(`${requirement} = ${filtered};`)
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
      const result = {
        name: bind(
          `finish_array_output(${payload}, ${builder}, ${arrayElementDelimiter(node.elementType) === ';'})`,
        ),
        type: node.type,
      }
      diagnostics.flow(result, [operand], bindings)
      return result
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
      const baseType = arrayElementBaseType(node.elementType)
      const family = arrayElementFamily(baseType)
      const input = baseType.startsWith('enum:')
        ? null
        : (rangeTypeInput(baseType) ?? builtinTypeIO(baseType)?.input)
      const metadata = input
        ? builtinCallables().find((item) => callableIdentity(item) === input)
        : null
      if (
        family === null ||
        (family !== 41 &&
          family !== 44 &&
          !baseType.startsWith('enum:') &&
          (!metadata || metadata.args[0] !== 'pg_catalog.cstring'))
      )
        throw new UnsupportedCheckRustExpression(
          'Array input requires its catalog element I/O identity',
        )
      if (family === 6 && (!node.enum || enumType(node.enum) !== baseType))
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
      const stored =
        storedArrayInputScope || (node.kind === 'array-text-literal' && node.origin === 'stored')
      const conversion = stored ? undefined : node.conversion
      const nulls = stored
        ? 1
        : executionContext.arrayNulls === true
          ? 1
          : executionContext.arrayNulls === false
            ? 0
            : -1
      if (
        !conversion &&
        anonymousRecordProfile(baseType) &&
        node.inputConversion?.kind === 'text-to-composite' &&
        node.inputConversion.anonymous
      )
        return {
          name: bind(`record_array_from_text(${ownedOperand(operand)},${nulls})`),
          type: node.type,
        }
      const populateScope =
        node.kind === 'text-to-array' && jsonPopulateInput?.text === operand.name
          ? jsonPopulateInput
          : null
      const populatePlan = populateScope
        ? bind(
            `prepare_json_populate_array(${populateScope.input}.clone(),${ownedOperand(operand)},${arrayElementDelimiter(node.elementType) === ';'},${nulls},${['pg_catalog."json"', 'pg_catalog.jsonb'].includes(baseType)},${baseType.startsWith('array:') ? 1 : compositeProfile(baseType) ? 2 : 0},${['pg_catalog.date', 'pg_catalog."timestamp"', 'pg_catalog.timestamptz', 'pg_catalog."time"', 'pg_catalog.timetz'].includes(baseType)},${executionContext.serverEncoding === 'UTF8'})`,
          )
        : null
      const payload = bind(
        populatePlan
          ? `json_populate_array_text(&${populatePlan})`
          : `prepare_array_text(${ownedOperand(operand)}, ${arrayElementDelimiter(node.elementType) === ';'}, ${nulls})`,
      )
      const initial = bind(`make_array_conversion()`)
      const builder = fresh('array_builder')
      const first = bind('make_int4_value(0)')
      const index = fresh('array_index')
      const event = fresh('array_event')
      const element = fresh('array_element')
      const jsonEvent = populatePlan ? fresh('array_json_event') : null
      bindings.push(
        `let mut ${builder}: ArrayOutputPayload = ${initial};`,
        `let mut ${index}: Int4Value = ${first};`,
      )
      const lines: string[] = []
      const outerPopulateInput = jsonPopulateInput
      if (populateScope && jsonEvent)
        jsonPopulateInput = {
          input: jsonEvent,
          text: event,
          ...(populateScope.arrayModifier === undefined
            ? {}
            : { arrayModifier: populateScope.arrayModifier }),
        }
      let converted = renderArrayInputElement(
        baseType,
        node.enum,
        event,
        stored,
        lines,
        node.kind === 'array-text-literal' ? node.moneyLiterals : storedArrayMoneyLiterals,
        conversion !== undefined || declaredArrayInputScope,
        stored ? (node.storedInputConversion ?? node.inputConversion) : node.inputConversion,
        used,
        node.kind === 'array-text-literal' && node.xmlStorage === true,
      )
      jsonPopulateInput = outerPopulateInput
      if (populateScope?.arrayModifier !== undefined) {
        const modified = fresh('array_input_modifier')
        lines.push(
          `let ${modified} = json_populate_array_modifier(${converted},${rustStringLiteral(arrayElementIdentity(baseType))},${populateScope.arrayModifier});`,
        )
        converted = modified
      }
      const inputPreparation: string[] = []
      if (conversion) {
        const prefix = rustValuePrefix(rustType(baseType))
        const scalar = fresh('domain_input_scalar')
        lines.push(`let ${scalar} = array_element_to_${prefix}(${converted}.clone());`)
        const key = JSON.stringify(['__pgsid_domain_element', false])
        const outerInput = localInputs.get(key),
          outerValidity = arrayValidityScope,
          outerPreparation = domainInputPreparation,
          outerDepth = preparationDepth
        const status = fresh('domain_input_preparation'),
          initialized = fresh('domain_input_initialized')
        const prepared: string[] = []
        domainInputPreparation = { lines: prepared, status }
        localInputs.set(key, {
          name: '__pgsid_domain_element',
          type: baseType,
          rustName: scalar,
          rustType: rustType(baseType),
        })
        arrayValidityScope = null
        preparationDepth = 0
        let value: { name: string; type: string }
        try {
          value = emitScalar(conversion, lines, used)
        } finally {
          if (outerInput) localInputs.set(key, outerInput)
          else localInputs.delete(key)
          arrayValidityScope = outerValidity
          domainInputPreparation = outerPreparation
          preparationDepth = outerDepth
        }
        if (value.type !== baseType)
          throw new UnsupportedCheckRustExpression(
            'Domain input conversion requires its concrete base carrier',
          )
        const preparationStart = bind('make_bool_value(true)')
        bindings.push(`let mut ${status}: CheckOutcome = check_from_bool(${preparationStart});`)
        if (prepared.length) {
          bindings.push(`let mut ${initialized}: CheckOutcome = check_unknown();`)
          inputPreparation.push(
            `if array_validity_unknown(${initialized}) {`,
            `    if array_text_event_needs_input(&${payload}, ${index}) {`,
            ...indent(indent(prepared)),
            `        ${initialized} = check_from_bool(${preparationStart});`,
            '    };',
            '};',
          )
        }
        const raw = fresh('domain_input_element'),
          finished = fresh('domain_input_finished')
        lines.push(
          `let ${raw} = array_element_from_${prefix}(${ownedOperand(value)});`,
          `let ${finished} = finish_domain_conversion(${raw}, ${status});`,
        )
        converted = finished
      }
      bindings.push(
        `while ${populatePlan ? `json_populate_array_has_event(&${payload},${index},&${builder})` : `array_text_has_event(&${payload}, ${index})`} {`,
        ...indent(inputPreparation),
        `    let ${event} = array_text_event_at(&${payload}, ${index});`,
        ...(populatePlan &&
        jsonEvent &&
        new RegExp(`\\b${jsonEvent}\\b`).test([...inputPreparation, ...lines].join('\n'))
          ? [`    let ${jsonEvent} = json_populate_array_current(&${populatePlan},${index});`]
          : []),
        ...indent(lines),
        `    let ${element} = ${converted};`,
      )
      bindings.push(
        `    ${builder} = append_array_conversion(${builder}, ${element}, ${!populatePlan && !conversion && family !== 42 && family !== 43});`,
        `    ${index} = array_text_next_index(${index});`,
        '}',
      )
      const arguments_ = bind(
        `array_conversion_arguments(${builder}, ${rustStringLiteral(arrayElementIdentity(node.elementType))}, ${family})`,
      )
      if (populatePlan && jsonPopulateHardError) {
        const hard = bind(`json_populate_array_hard(&${populatePlan},${index})`)
        bindings.push(
          `${jsonPopulateHardError} = json_populate_hard_error(${jsonPopulateHardError},${hard});`,
        )
      }
      return {
        name: bind(
          `${populatePlan ? 'finish_json_populate_array' : conversion || family === 42 || family === 43 ? 'finish_domain_array_input' : 'finish_prepared_array_text'}(${payload}, ${arguments_})`,
        ),
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
      diagnostics.declared(guard, preparationLines, '0')
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
        const requirement = diagnostics.reason(value, preparationLines)
        appendValidityRequirement(guard, state, requirement, preparationLines)
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
      declareConstant(name, kind, `${prefix}_unknown()`)
      preparationLines.push(
        `${name} = ${prefix}_null();`,
        `if case_guard_stops(${guard}) {`,
        `    ${name} = ${prefix === 'bool' ? 'bool_from_check' : `${prefix}_from_case_guard`}(${guard});`,
        '};',
        ...preparationFinishLines(guard, diagnostics.reference(guard)),
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
          if (diagnostics.enabled) {
            if (diagnosticCall(call)) diagnostics.flow(value, operands, lines)
            const target = diagnostics.declared(name, destination, '0')
            const reason = diagnostics.reason(value, lines)
            lines.push(`${target} = ${reason};`)
          }
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
      if (!folded && diagnosticCall(call)) diagnostics.flow(value, operands, destination)
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
      hashByteOrder?: number,
      arrayHashPlan?: RangeArrayHashPlan,
      rangeOverride?: RangeProfile,
    ): { name: string; type: string } => {
      const metadata = call.signature === null ? null : builtinMetadata(call.signature)
      const physical = operands.map((operand, index) =>
        isCatalogVectorType(operand.type) &&
        ['pg_catalog.anyarray', 'pg_catalog.anycompatiblearray'].includes(
          metadata?.args[index] ?? '',
        )
          ? { ...operand, type: arrayPhysicalType(operand.type)! }
          : operand,
      )
      const normalized =
        isCatalogVectorType(call.type) && metadata?.result === 'pg_catalog.anyarray'
          ? { ...call, type: arrayPhysicalType(call.type)! }
          : call
      const result = emitCallCore(
        normalized,
        physical,
        destination,
        folded,
        hashByteOrder,
        arrayHashPlan,
        rangeOverride,
      )
      return { ...result, type: call.type }
    }
    const emitCallCore = (
      call: Extract<EvalExpression, { kind: 'call' }>['call'],
      operands: readonly { name: string; type: string }[],
      destination = bindings,
      folded?: { name: string; type: string },
      hashByteOrder?: number,
      arrayHashPlan?: RangeArrayHashPlan,
      rangeOverride?: RangeProfile,
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
            !canRelabelAnonymousRecords(operands[0]!.type, call.type) &&
            !(
              isCatalogVectorType(operands[0]!.type) &&
              arrayPhysicalType(operands[0]!.type) === call.type
            ) &&
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
      if (isCollationMetadataCallable(implementation)) {
        if (call.kind !== 'function' || operands.length !== 1 || call.type !== 'pg_catalog.text')
          throw new UnsupportedCheckRustExpression('Invalid collation metadata call')
        if (folded) return folded
        const operand = operands[0]!
        let type = arrayElementBaseType(operand.type)
        while (type.startsWith('array:')) type = arrayElementBaseType(type.slice(6))
        const collatable = [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(type)
        const resolved =
          call.collationResolved === true ||
          call.collationDefault === true ||
          call.collation === 'C' ||
          call.collation === 'deterministic'
        const argument = fresh('metadata_argument')
        const collation = fresh('metadata_collation')
        const result = fresh('metadata_result')
        destination.push(
          `let ${argument} = ${rustValuePrefix(rustType(operand.type))}_is_null(${ownedOperand(operand)});`,
          `let ${collation} = ${!collatable ? 'make_bool_value(false)' : resolved ? 'make_bool_value(true)' : 'bool_unknown()'};`,
          `let ${result} = ${implementation.rustName}(${argument},${collation});`,
        )
        callables.add(implementation.rustName)
        return { name: result, type: call.type }
      }
      if (isJsonPopulateCallable(implementation)) {
        const profile = operands[0] && compositeProfile(arrayElementBaseType(operands[0].type)),
          definition = profile?.graph.definitions.find((n) => n.identity === profile.identity),
          rootConversion =
            node.kind === 'call' && node.call === call ? node.inputConversion : undefined
        let conversion = rootConversion
        while (conversion?.kind === 'domain-cast') conversion = conversion.operand
        const input = definition?.input
          ? builtinCallables().find((n) => callableIdentity(n) === definition.input)
          : null
        if (
          call.kind !== 'function' ||
          operands.length !== implementation.args.length ||
          !profile ||
          !definition ||
          conversion?.kind !== 'text-to-composite' ||
          conversion.conversions.length !== definition.fields.length ||
          operands[1]?.type !== implementation.args[1] ||
          call.type !==
            (implementation.name === 'jsonb_populate_record_valid'
              ? 'pg_catalog.bool'
              : operands[0]!.type) ||
          input?.kind !== 'function' ||
          input.schema !== 'pg_catalog' ||
          input.name !== 'record_in' ||
          !input.strict ||
          input.volatility !== 's' ||
          input.returnsSet
        )
          throw new UnsupportedCheckRustExpression(
            'JSON record population requires its captured composite input plan',
          )
        if (folded) return folded
        const bindPopulate = (source: string): string => {
          const name = fresh('json_populate')
          destination.push(`let ${name} = ${source};`)
          return name
        }
        const utf8 = executionContext.serverEncoding === 'UTF8',
          carrier = bindPopulate(
            `${implementation.name === 'json_populate_record' ? 'jsonb_input_from_json' : 'jsonb_input_from_jsonb'}(${ownedOperand(operands[1]!)})`,
          )
        let state = bindPopulate(
          `prepare_json_populate(${ownedOperand(operands[0]!)},${carrier},${rustStringLiteral(profile.identity)},${definition.fields.length},${utf8})`,
        )
        if (operands[2]) {
          const safe =
            node.kind === 'call' && !rustExpressionCanFail(node.operands[2], executionContext)
          state = bindPopulate(`json_populate_guard(${state},${ownedOperand(operands[2])},${safe})`)
        }
        state = renderJsonPopulateFields(state, profile, conversion, destination, used)
        if (rootConversion?.kind === 'domain-cast')
          state = renderJsonPopulateDomain(state, rootConversion, destination, used)
        callables.add(implementation.rustName)
        const finished = bindPopulate(`make_json_populate_plan(${state})`)
        return { name: bindPopulate(`${implementation.rustName}(${finished})`), type: call.type }
      }
      if (isNullableQuote(implementation) || isGenericLiteralQuote(implementation)) {
        if (
          call.kind !== 'function' ||
          call.type !== implementation.result ||
          operands.length !== 1 ||
          operands[0]!.type !== 'pg_catalog.text'
        )
          throw new UnsupportedCheckRustExpression(
            'Literal quoting requires its selected text coercion',
          )
        if (folded) return folded
        const name = fresh('nullable_quote')
        destination.push(`let ${name} = ${implementation.rustName}(${ownedOperand(operands[0]!)});`)
        callables.add(implementation.rustName)
        return { name, type: call.type }
      }
      if (isTextFormatCallable(implementation)) {
        if (
          call.kind !== 'function' ||
          call.type !== implementation.result ||
          !operands.length ||
          operands[0]!.type !== 'pg_catalog.text' ||
          (implementation.variadic === null && operands.length !== 1) ||
          (call.variadic && (operands.length !== 2 || !isArrayLikeType(operands[1]!.type)))
        )
          throw new UnsupportedCheckRustExpression('Invalid formatting call')
        if (folded) return folded
        const bind = (value: string): string => {
          const name = fresh('format_value')
          destination.push(`let ${name} = ${value};`)
          return name
        }
        let guard = bind('make_bool_value(true)')
        const nullness = operands.map((operand) => {
          const state = bind(
            `${rustValuePrefix(rustType(operand.type))}_is_null(${ownedOperand(operand)})`,
          )
          guard = bind(`concat_argument_guard(${guard}, ${state})`)
          return state
        })
        const payload = call.variadic
            ? bind(`prepare_array_output(${ownedOperand(operands[1]!)})`)
            : null,
          count = bind(
            payload ? `format_array_count(&${payload})` : `make_int4_value(${operands.length - 1})`,
          ),
          initial = bind(`format_begin(${ownedOperand(operands[0]!)}, ${count}, ${guard})`),
          state = fresh('format_state'),
          quoteAll =
            executionContext.quoteAllIdentifiers === undefined
              ? -1
              : executionContext.quoteAllIdentifiers
                ? 1
                : 0
        destination.push(
          `let mut ${state}: TextFormatState = ${initial};`,
          `while format_continues(&${state}) {`,
          `    ${state} = format_next(${state});`,
        )
        const supply = (cell: string, type: string, bitmap: string, lines: string[]) => {
          lines.push(
            `${state} = format_before_argument(${state}, ${bitmap}, ${quoteAll});`,
            `if format_should_render(&${state}) {`,
          )
          const inner: string[] = []
          const family = arrayElementFamily(type)
          let hint =
            ((family === 19 ||
              family === 20 ||
              (family !== null && family >= 24 && family <= 30)) &&
              executionContext.extraFloatDigits === undefined) ||
            ((family === 4 ||
              family === 7 ||
              (family === 5 && executionContext.timeZone !== undefined)) &&
              executionContext.dateStyle === undefined) ||
            (family === 15 && executionContext.byteaOutput === undefined) ||
            (family === 23 && executionContext.intervalStyle === undefined)
              ? (family ?? 0)
              : 0
          let base = arrayElementBaseType(type)
          while (base.startsWith('array:')) base = arrayElementBaseType(base.slice(6))
          const definition =
            call.inputEnums?.find((item) => enumType(item) === base) ?? binaryEnums.get(base)
          let conversion: string
          try {
            conversion = renderTypedOutput(cell, type, inner, definition)
          } catch (error) {
            if (!(error instanceof UnsupportedCheckRustExpression)) throw error
            inner.length = 0
            conversion = `array_contextual_output(${cell})`
            hint = 0
          }
          const original = hint ? fresh('format_original') : null
          if (original) inner.unshift(`let ${original} = ${cell}.clone();`)
          const rendered = fresh('format_rendered')
          inner.push(
            `let ${rendered} = ${conversion};`,
            original
              ? hint === 5
                ? `${state} = format_accept_timezone(${state}, ${rendered}, ${original}, ${quoteAll}, ${rustStringLiteral(executionContext.timeZone!)});`
                : `${state} = format_accept_typed(${state}, ${rendered}, ${original}, ${hint}, ${quoteAll});`
              : `${state} = format_accept(${state}, ${rendered}, ${quoteAll});`,
          )
          lines.push(...indent(inner), '}')
        }
        if (payload) {
          const index = fresh('format_index'),
            cell = fresh('format_element'),
            bitmap = fresh('format_nullness'),
            inner = [
              `let ${index} = format_argument_index(&${state});`,
              `let ${cell} = array_output_element_at(&${payload}, ${index});`,
              `let ${bitmap} = concat_array_element_nullness(&${payload}, ${cell}.clone());`,
            ]
          supply(cell, arrayLikeElementType(operands[1]!.type)!, bitmap, inner)
          destination.push(
            `    if format_needs_argument(&${state}) {`,
            ...indent(indent(inner)),
            '    }',
          )
        } else {
          for (const [index, operand] of operands.entries()) {
            if (!index) continue
            const cell = fresh('format_element'),
              inner = [
                `let ${cell} = array_element_from_${rustValuePrefix(rustType(operand.type))}(${ownedOperand(operand)});`,
              ]
            supply(cell, operand.type, nullness[index]!, inner)
            destination.push(
              `    if format_requests(&${state}, ${index}) {`,
              ...indent(indent(inner)),
              '    }',
            )
          }
        }
        destination.push('}')
        const input = bind(`make_format_input(${state})`),
          name = bind(`${implementation.rustName}(${input})`)
        callables.add(implementation.rustName)
        return { name, type: call.type }
      }
      if (isTextConcatCallable(implementation)) {
        const fixed = implementation.name === 'concat_ws' ? 1 : 0
        if (
          call.kind !== 'function' ||
          call.type !== implementation.result ||
          operands.length <= fixed ||
          (fixed === 1 && operands[0]!.type !== 'pg_catalog.text') ||
          (call.variadic &&
            (operands.length !== fixed + 1 || !isArrayLikeType(operands[fixed]!.type)))
        )
          throw new UnsupportedCheckRustExpression('Invalid concatenation call')
        if (folded) return folded
        const bind = (value: string, label = 'concat_value'): string => {
          const name = fresh(label)
          destination.push(`let ${name} = ${value};`)
          return name
        }
        let guard = bind('make_bool_value(true)')
        const nullness = operands.map((operand) => {
          const state = bind(
            `${rustValuePrefix(rustType(operand.type))}_is_null(${ownedOperand(operand)})`,
          )
          guard = bind(`concat_argument_guard(${guard}, ${state})`)
          return state
        })
        const separator = bind(fixed ? ownedOperand(operands[0]!) : 'make_text_value("")'),
          state = fresh('concat_state'),
          initial = bind(`concat_begin(${separator}, ${guard})`)
        destination.push(`let mut ${state}: TextConcatState = ${initial};`)
        const append = (cell: string, type: string, nullness: string, lines: string[]) => {
          lines.push(
            `${state} = concat_before_argument(${state}, ${nullness}, ${!call.variadic});`,
            `if concat_should_render(&${state}) {`,
          )
          const rendered: string[] = []
          let base = arrayElementBaseType(type)
          while (base.startsWith('array:')) base = arrayElementBaseType(base.slice(6))
          const definition =
            call.inputEnums?.find((item) => enumType(item) === base) ?? binaryEnums.get(base)
          let conversion: string
          try {
            conversion = renderTypedOutput(cell, type, rendered, definition)
          } catch (error) {
            if (!(error instanceof UnsupportedCheckRustExpression)) throw error
            rendered.length = 0
            conversion = `array_contextual_output(${cell})`
          }
          const output = fresh('concat_rendered')
          rendered.push(
            `let ${output} = ${conversion};`,
            `${state} = concat_after_argument(${state}, ${output});`,
          )
          lines.push(...indent(rendered), '}')
        }
        if (call.variadic) {
          const operand = operands[fixed]!,
            payload = bind(`prepare_array_output(${ownedOperand(operand)})`),
            index = fresh('concat_index'),
            start = bind('make_int4_value(0)')
          destination.push(
            `${state} = concat_variadic_begin(${state}, ${nullness[fixed]});`,
            `let mut ${index}: Int4Value = ${start};`,
            `while array_output_has_element(&${payload}, ${index}) {`,
          )
          const cell = fresh('concat_element'),
            bitmap = fresh('concat_nullness'),
            inner = [
              `let ${cell} = array_output_element_at(&${payload}, ${index});`,
              `let ${bitmap} = concat_array_element_nullness(&${payload}, ${cell}.clone());`,
            ]
          append(cell, arrayLikeElementType(operand.type)!, bitmap, inner)
          inner.push(`${index} = array_text_next_index(${index});`)
          destination.push(...indent(inner), '}')
        } else {
          for (const [index, operand] of operands.entries()) {
            if (index < fixed) continue
            const cell = bind(
              `array_element_from_${rustValuePrefix(rustType(operand.type))}(${ownedOperand(operand)})`,
            )
            append(cell, operand.type, nullness[index]!, destination)
          }
        }
        const name = bind(`${implementation.rustName}(${state})`)
        callables.add(implementation.rustName)
        return { name, type: call.type }
      }
      if (isNullCountCallable(implementation)) {
        if (call.kind !== 'function' || call.type !== implementation.result || !operands.length)
          throw new UnsupportedCheckRustExpression('Invalid null-counting call')
        for (const operand of operands) rustType(operand.type)
        const variadic = call.variadic === true
        if (variadic && (operands.length !== 1 || !isArrayLikeType(operands[0]!.type)))
          throw new UnsupportedCheckRustExpression('Null counting requires one VARIADIC array')
        if (folded) return folded
        const bindArgument = (source: string): string => {
          const name = fresh('null_count_arguments')
          destination.push(`let ${name} = ${source};`)
          return name
        }
        let arguments_ = variadic
          ? bindArgument(`null_count_array_arguments(${ownedOperand(operands[0]!)})`)
          : bindArgument('make_null_count_arguments()')
        if (!variadic)
          for (const operand of operands) {
            const nullness = bindArgument(
              `${rustValuePrefix(rustType(operand.type))}_is_null(${ownedOperand(operand)})`,
            )
            arguments_ = bindArgument(`append_null_count_argument(${arguments_}, ${nullness})`)
          }
        const name = bindArgument(`${implementation.rustName}(${arguments_})`)
        callables.add(implementation.rustName)
        return { name, type: call.type }
      }
      const anonymousArray = isArrayComparison(implementation)
        ? commonAnonymousRecordType(operands.map((operand) => operand.type))
        : null
      if (anonymousArray)
        operands = operands.map((operand) => ({ ...operand, type: anonymousArray }))
      const vectorTypeNames = isCatalogVectorTypeNames(implementation)
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
      const xmlCast =
        call.signature === builtinCast('pg_catalog.text', 'pg_catalog.xml')?.implementation
      const xmlSend = call.signature === builtinTypeIO('pg_catalog.xml')?.send
      const jsonSend = call.signature === builtinTypeIO('pg_catalog."json"')?.send
      const jsonpathSend = call.signature === builtinTypeIO('pg_catalog.jsonpath')?.send
      const jsonbSend = call.signature === builtinTypeIO('pg_catalog.jsonb')?.send
      const tsvectorSend = call.signature === builtinTypeIO('pg_catalog.tsvector')?.send
      const tsquerySend = call.signature === builtinTypeIO('pg_catalog.tsquery')?.send
      const tsqueryComparison =
        implementation.kind === 'function' &&
        implementation.schema === 'pg_catalog' &&
        [
          'tsquery_cmp',
          'tsquery_eq',
          'tsquery_ne',
          'tsquery_lt',
          'tsquery_le',
          'tsquery_gt',
          'tsquery_ge',
        ].includes(implementation.name) &&
        implementation.args.join(',') === 'pg_catalog.tsquery,pg_catalog.tsquery'
      const tsqueryRewrite =
        implementation.kind === 'function' &&
        implementation.schema === 'pg_catalog' &&
        implementation.name === 'ts_rewrite' &&
        implementation.args.join(',') ===
          'pg_catalog.tsquery,pg_catalog.tsquery,pg_catalog.tsquery' &&
        implementation.result === 'pg_catalog.tsquery'
      const xmlPredicate = isXmlOptionPredicate(implementation)
      const xmlConcat =
        implementation.schema === 'pg_catalog' &&
        implementation.name === 'xmlconcat2' &&
        implementation.args.join(',') === 'pg_catalog.xml,pg_catalog.xml' &&
        implementation.result === 'pg_catalog.xml' &&
        implementation.volatility === 'i' &&
        !implementation.strict &&
        !implementation.returnsSet
      const rangeConstructor = isBuiltinRangeConstructor(implementation)
      const arraySearch = isArraySearch(implementation)
      const arrayStringIO = isArrayStringIO(implementation)
      const arrayFill = isArrayFill(implementation)
      const arrayTrim = isArrayTrim(implementation)
      const arrayReverse = isArrayReverse(implementation)
      const arraySort = isArraySort(implementation)
      const arrayExtremum = isArrayExtremum(implementation)
      const arrayBucket = isArrayBucket(implementation)
      const arrayBinarySend = isArrayBinarySend(implementation)
      const recordBinarySend = isRecordBinarySend(implementation)
      const rangeBinarySend = isRangeBinarySend(implementation)
      const multirangeBinarySend = isMultirangeBinarySend(implementation)
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
      const multirangeTypes = implementation.args.flatMap((type, index) =>
        type === 'pg_catalog.anymultirange' ? [operands[index]?.type] : [],
      )
      const multirangeIdentity = multirangeTypes[0]
      const multirangeProfile =
        multirangeIdentity && multirangeTypes.every((type) => type === multirangeIdentity)
          ? rangeOverride?.multirangeType === multirangeIdentity
            ? rangeOverride
            : multirangeTypeProfile(multirangeIdentity)
          : null
      const rangeTypes = [
        ...(multirangeProfile ? [multirangeProfile.rangeType] : []),
        ...implementation.args.flatMap((type, index) =>
          type === 'pg_catalog.anyrange' ? [operands[index]?.type] : [],
        ),
      ]
      const rangeIdentity = rangeTypes[0]
      const rangeSubtype =
        rangeIdentity && rangeTypes.every((type) => type === rangeIdentity)
          ? rangeOverride?.rangeType === rangeIdentity
            ? rangeOverride.elementType
            : rangeTypeProfile(rangeIdentity)?.elementType
          : undefined
      const resultType =
        multirangeProfile && implementation.result === 'pg_catalog.anymultirange'
          ? multirangeIdentity
          : rangeSubtype && implementation.result === 'pg_catalog.anyelement'
            ? rangeSubtype
            : rangeSubtype && implementation.result === 'pg_catalog.anyrange'
              ? rangeIdentity
              : arraySearch && implementation.name === 'array_positions'
                ? 'array:pg_catalog.int4'
                : arrayTransform || arrayRewrite
                  ? transformArray
                  : enumSupport && implementation.result === 'pg_catalog.anyarray'
                    ? `array:${enumIdentity}`
                    : implementation.result === 'pg_catalog.anyenum'
                      ? enumIdentity
                      : arrayFill
                        ? call.type.startsWith('array:') &&
                          arrayElementBaseType(call.type.slice(6)) === operands[0]?.type
                          ? call.type
                          : null
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
          !isLegacySimilarCallable(implementation) &&
          !isIntegerSumCallable(implementation) &&
          !isTypeFormatCallable(implementation) &&
          !xmlConcat &&
          !rangeConstructor &&
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
          !isTypeFormatCallable(implementation) &&
          !vectorTypeNames &&
          !enumSupport &&
          !arrayBinarySend &&
          !recordBinarySend &&
          !rangeBinarySend &&
          !multirangeBinarySend &&
          !arrayStringIO &&
          !jsonbConversion &&
          !jsonConversion &&
          !jsonbBuilder &&
          !jsonBuilder &&
          !jsonpathTimezone &&
          !xmlCast &&
          !xmlSend &&
          !xmlPredicate &&
          !isMoneyNumericConversion(implementation) &&
          !isTemporalContextCast(implementation) &&
          !isTemporalContextArithmetic(implementation) &&
          !isTemporalContextComparison(implementation) &&
          !isTemporalLocalTimezone(implementation) &&
          !isTemporalInstantConstructor(implementation) &&
          !isTemporalInstantPeriod(implementation) &&
          !isTemporalCurrentAge(implementation) &&
          !isTemporalIntervalFormatting(implementation) &&
          !isTemporalTimestampFormatting(implementation) &&
          !isTemporalTemplateParsing(implementation) &&
          !isTemporalExplicitZoneLookup(implementation) &&
          !isTemporalSessionTruncation(implementation) &&
          !isTemporalSessionExtraction(implementation) &&
          !(
            (['namesend', 'textsend', 'varcharsend', 'bpcharsend'].includes(implementation.name) &&
              implementation.schema === 'pg_catalog' &&
              implementation.args.length === 1 &&
              implementation.args[0] ===
                {
                  namesend: 'pg_catalog.name',
                  textsend: 'pg_catalog.text',
                  varcharsend: 'pg_catalog."varchar"',
                  bpcharsend: 'pg_catalog.bpchar',
                }[implementation.name] &&
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
        !xmlCast &&
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
                ]?.type.startsWith('array:') &&
                arrayElementBaseType(
                  operands[
                    arrayBucket || (arrayTransform && implementation.name === 'array_prepend')
                      ? 1
                      : 0
                  ]!.type.slice(6),
                ) === operands[index]?.type
              ? false
              : type === 'pg_catalog.anymultirange' &&
                  multirangeProfile &&
                  operands[index]?.type === multirangeIdentity
                ? false
                : type === 'pg_catalog.anyrange' &&
                    rangeSubtype &&
                    operands[index]?.type === rangeIdentity
                  ? false
                  : type === 'pg_catalog.anyelement' &&
                      rangeSubtype &&
                      operands[index]?.type === rangeSubtype
                    ? false
                    : type === 'pg_catalog.record' &&
                        (isRecordComparison(implementation) ||
                          isRecordHash(implementation) ||
                          recordBinarySend ||
                          (jsonConversion && implementation.name === 'row_to_json')) &&
                        (compositeProfile(operands[index]?.type ?? '') ||
                          anonymousRecordProfile(operands[index]?.type ?? ''))
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
      if (rangeSubtype && implementation.result === 'pg_catalog.anyelement') {
        const cell = fresh('range_bound')
        const name = fresh('range_value')
        callables.add(implementation.rustName)
        destination.push(
          `let ${cell} = ${implementation.rustName}(${operands.map(ownedOperand).join(', ')});`,
          `let ${name} = array_element_to_${rustValuePrefix(rustType(call.type))}(${cell});`,
        )
        return { name, type: call.type }
      }
      if (rangeSubtype && implementation.args.includes('pg_catalog.anyelement')) {
        const args = operands.map((operand, index) =>
          implementation.args[index] === 'pg_catalog.anyelement'
            ? bind(
                `array_element_from_${rustValuePrefix(rustType(operand.type))}(${ownedOperand(operand)})`,
              )
            : ownedOperand(operand),
        )
        callables.add(implementation.rustName)
        return { name: bind(`${implementation.rustName}(${args.join(', ')})`), type: call.type }
      }
      if (arrayBinarySend || recordBinarySend) {
        const bindBinary = (value: string, lines = destination): string => {
          const name = fresh('container_binary_value')
          lines.push(`let ${name}=${value};`)
          return name
        }
        const sendSignature = (type: string): string | null | undefined => {
          type = arrayElementBaseType(type)
          if (isCatalogVectorType(type)) return builtinTypeIO(type)?.send
          if (isArrayLikeType(type)) return builtinTypeIO('pg_catalog._int4')?.send
          if (compositeProfile(type) || anonymousRecordProfile(type))
            return builtinTypeIO('pg_catalog.record')?.send
          const range = rangeTypeProfile(type),
            multi = multirangeTypeProfile(type)
          if (range || multi) return multi ? multi.multirangeSend : range!.send
          if (type.startsWith('enum:')) {
            const send = builtinCallables().find(
              (item) =>
                item.kind === 'function' &&
                item.schema === 'pg_catalog' &&
                item.name === 'enum_send' &&
                item.args.join(',') === 'pg_catalog.anyenum' &&
                item.result === 'pg_catalog.bytea',
            )
            return send ? callableIdentity(send) : undefined
          }
          return builtinTypeIO(type)?.send
        }
        const sendChild = (
          cell: string,
          type: string | null,
          lines: string[],
          selected?: string | null,
          definition?: EnumDefinition,
        ): string => {
          if (!type) return bindBinary(`container_binary_missing(${cell}.clone(),false)`, lines)
          type = arrayElementBaseType(type)
          const signature = selected === undefined ? sendSignature(type) : selected
          const metadata = signature
            ? builtinCallables().find((item) => callableIdentity(item) === signature)
            : null
          if (
            !metadata ||
            metadata.kind !== 'function' ||
            metadata.schema !== 'pg_catalog' ||
            !metadata.strict ||
            metadata.returnsSet ||
            metadata.result !== 'pg_catalog.bytea' ||
            metadata.args.length !== 1
          )
            return bindBinary(
              `container_binary_missing(${cell}.clone(),${signature === null})`,
              lines,
            )
          const prefix = rustValuePrefix(rustType(type))
          const scalar = bindBinary(`array_element_to_${prefix}(${cell}.clone())`, lines)
          let argument = { name: scalar, type }
          if (
            type.startsWith('enum:') &&
            metadata.name === 'enum_send' &&
            metadata.args[0] === 'pg_catalog.anyenum'
          ) {
            const labels = definition ?? binaryEnums.get(type)
            if (!labels) return bindBinary(`container_binary_missing(${cell}.clone(),false)`, lines)
            const text = bindBinary(
              `enum_to_text(${scalar},${rustStringLiteral(labels.values.join('\0'))},${labels.values.length})`,
              lines,
            )
            const result = emitCallInner(
              {
                kind: 'function',
                signature: builtinTypeIO('pg_catalog.text')!.send!,
                type: 'pg_catalog.bytea',
              },
              [{ name: text, type: 'pg_catalog.text' }],
              lines,
            )
            return bindBinary(
              `container_binary_cell(${cell}.clone(),${ownedOperand(result)})`,
              lines,
            )
          }
          if (!checkRustCallableNames().has(metadata.rustName))
            return bindBinary(`container_binary_missing(${cell}.clone(),false)`, lines)
          if (
            ![
              type,
              'pg_catalog.anyarray',
              'pg_catalog.anyrange',
              'pg_catalog.anymultirange',
              'pg_catalog.record',
            ].includes(metadata.args[0]!)
          ) {
            if (rustType(type) === rustType(metadata.args[0]!)) {
              argument = { ...argument, type: metadata.args[0]! }
            } else {
              if (builtinCast(type, metadata.args[0]!)?.method !== 'b')
                return bindBinary(`container_binary_missing(${cell}.clone(),false)`, lines)
              argument = emitCallInner(
                { kind: 'cast', signature: null, type: metadata.args[0]! },
                [argument],
                lines,
              )
            }
          }
          const result = emitCallInner(
            { kind: 'function', signature: signature!, type: 'pg_catalog.bytea' },
            [argument],
            lines,
          )
          return bindBinary(`container_binary_cell(${cell}.clone(),${ownedOperand(result)})`, lines)
        }
        const operand = operands[0]!
        let result: string
        if (arrayBinarySend) {
          if (!operand.type.startsWith('array:'))
            throw new UnsupportedCheckRustExpression(
              'Array binary output requires a concrete element type',
            )
          const elementType = operand.type.slice(6),
            signature = sendSignature(elementType)
          const payload = bindBinary(`prepare_array_output(${ownedOperand(operand)})`)
          const initial = bindBinary(
            `array_binary_initial(&${payload},${signature === null ? 0 : signature === undefined ? -1 : 1})`,
          )
          const index = fresh('array_binary_index')
          result = fresh('array_binary_result')
          destination.push(
            `let mut ${result}:ByteaValue=${initial};`,
            `let mut ${index}:Int4Value=make_int4_value(0);`,
          )
          const body: string[] = []
          const cell = bindBinary(`array_output_element_at(&${payload},${index})`, body)
          const bytes = sendChild(cell, elementType, body)
          body.push(
            `${result}=container_binary_append(${result},${bytes},4);`,
            `${index}=array_text_next_index(${index});`,
          )
          destination.push(
            `while array_binary_has_element(&${payload},${index},${result}.clone()) {`,
            ...indent(body),
            '}',
          )
        } else {
          const initial = bindBinary(`record_binary_initial(${ownedOperand(operand)})`)
          result = fresh('record_binary_result')
          destination.push(`let mut ${result}:ByteaValue=${initial};`)
          const layouts = recordComparisonLayouts(operand.type)
          if (!layouts)
            throw new UnsupportedCheckRustExpression(
              'Record binary output requires captured layouts',
            )
          for (const layout of layouts) {
            for (const node of layout.profile?.graph.definitions ?? [])
              if (node.kind === 'e' && node.enumLabels)
                binaryEnums.set(enumType(node), {
                  schema: node.schema,
                  name: node.name,
                  values: node.enumLabels,
                })
            const lines: string[] = [],
              start = bindBinary('record_binary_start()', lines),
              current = fresh('record_binary_fields')
            lines.push(`let mut ${current}:ByteaValue=${start};`)
            const fields = layout.profile?.graph.definitions.find(
              (node) => node.identity === layout.profile!.identity,
            )?.fields
            for (const [index, field] of layout.fields.entries()) {
              const body: string[] = []
              const position = bindBinary(`make_int4_value(${index})`, body)
              const cell = bindBinary(
                `composite_field_at(${ownedOperand(operand)},${position})`,
                body,
              )
              const physical =
                layout.profile && fields?.[index]
                  ? compositePhysicalType(layout.profile, fields[index]!.type)
                  : null
              const definition =
                physical?.kind === 'e'
                  ? {
                      schema: physical.schema,
                      name: physical.name,
                      values: physical.enumLabels ?? [],
                    }
                  : undefined
              const bytes = sendChild(cell, field.type, body, physical?.send, definition)
              body.push(`${current}=container_binary_append(${current},${bytes},8);`)
              lines.push(
                `if container_binary_continues(${current}.clone()) {`,
                ...indent(body),
                '}',
              )
            }
            lines.push(`${result}=${current};`)
            destination.push(
              `if composite_output_matches(${ownedOperand(operand)},${rustStringLiteral(layout.identity)},${layout.fields.length}) {`,
              ...indent(lines),
              '}',
            )
          }
        }
        callables.add(implementation.rustName)
        return {
          name: bindBinary(`${implementation.rustName}(${ownedOperand(operand)},${result})`),
          type: call.type,
        }
      }
      if (multirangeBinarySend || isMultirangeHash(implementation)) {
        const bindMultirange = (expression: string): string => {
          const name = fresh('multirange_binary_value')
          destination.push(`let ${name} = ${expression};`)
          return name
        }
        if (!multirangeProfile || !rangeSubtype)
          throw new UnsupportedCheckRustExpression(
            'Multirange binary operations need one captured range identity',
          )
        const extended = implementation.args.length === 2
        const hashSupport = rangeHashSupport(multirangeProfile, extended)
        if (!multirangeBinarySend && !hashSupport.compatible)
          throw new UnsupportedCheckRustExpression(
            'Multirange hashing requires compatible subtype equality/hash classes without runtime type-cache dependencies',
          )
        const width = extended ? '64' : '32'
        if (!multirangeBinarySend && !hashSupport.available) {
          const state = bindMultirange(`multirange_is_null(${ownedOperand(operands[0]!)})`)
          const seed = extended
            ? ownedOperand(operands[1]!)
            : bindMultirange('make_int8_value(0i64)')
          return {
            name: bindMultirange(`range_hash_missing${width}(${state},${seed})`),
            type: call.type,
          }
        }
        const memberSupport = builtinTypeComparison('pg_catalog.int4range')
        const memberSignature = multirangeBinarySend
          ? multirangeProfile.send
          : extended
            ? memberSupport?.hashExtended
            : memberSupport?.hash
        const memberMetadata = memberSignature
          ? builtinCallables().find((item) => callableIdentity(item) === memberSignature)
          : null
        const outerSupport = builtinTypeComparison('pg_catalog.int4multirange')
        const outerSignature = multirangeBinarySend
          ? multirangeProfile.multirangeSend
          : extended
            ? outerSupport?.hashExtended
            : outerSupport?.hash
        if (
          !memberMetadata ||
          memberMetadata.kind !== 'function' ||
          !memberSignature ||
          outerSignature !== call.signature ||
          !(multirangeBinarySend
            ? isRangeBinarySend(memberMetadata)
            : isRangeHash(memberMetadata)) ||
          !checkRustCallableNames().has(memberMetadata.rustName)
        )
          throw new UnsupportedCheckRustExpression(
            'Multirange binary operation requires captured range support',
          )
        const nativeContext = hashSupport.context
        const orders = multirangeBinarySend
          ? [0]
          : hashByteOrder !== undefined
            ? [hashByteOrder]
            : nativeContext && executionContext.nativeByteOrder === undefined
              ? [1, 2]
              : [executionContext.nativeByteOrder === 'big' ? 2 : 1]
        const input = operands[0]!
        const seed = extended ? operands[1]!.name : fresh('multirange_binary_seed')
        if (!extended && !multirangeBinarySend)
          destination.push(`let ${seed} = make_int8_value(0i64);`)
        const state = bindMultirange(`multirange_is_null(${ownedOperand(input)})`)
        const payload = bindMultirange(`multirange_binary_payload(${ownedOperand(input)})`)
        const count = bindMultirange(`multirange_binary_count(&${payload})`)
        const initial = bindMultirange(
          multirangeBinarySend
            ? `multirange_binary_initial_send(${state}, ${count})`
            : `multirange_binary_initial${width}(${state}, ${count}, ${seed})`,
        )
        const index = fresh('multirange_binary_index')
        const start = bindMultirange('make_int4_value(0)')
        const results = orders.map(() => fresh('multirange_binary_result'))
        destination.push(
          `let mut ${index}: Int4Value = ${start};`,
          ...results.map(
            (result) =>
              `let mut ${result}: ${rustType(call.type)} = ${initial}${multirangeBinarySend ? '.clone()' : ''};`,
          ),
        )
        const member = fresh('multirange_binary_member')
        const body = [`let ${member} = multirange_binary_member(&${payload}, ${index});`]
        for (const [position, order] of orders.entries()) {
          const result = emitCallInner(
            { kind: 'function', signature: memberSignature, type: call.type },
            [
              { name: member, type: multirangeProfile.rangeType },
              ...(extended ? [operands[1]!] : []),
            ],
            body,
            undefined,
            order,
            undefined,
            multirangeProfile,
          )
          body.push(
            `${results[position]} = ${multirangeBinarySend ? 'multirange_binary_append' : 'array_hash_step' + width}(${results[position]}, ${ownedOperand(result)});`,
          )
        }
        body.push(`${index} = array_text_next_index(${index});`)
        const first = results[0]!
        const condition = multirangeBinarySend
          ? `multirange_binary_continues_send(${count}, ${index}, ${first}.clone())`
          : `multirange_binary_continues${width}(${count}, ${index}, ${first}, ${results[1] ?? first})`
        destination.push(`while ${condition} {`, ...indent(body), '}')
        const finished = multirangeBinarySend
          ? first
          : bindMultirange(`array_hash_finish${width}(${first}, ${results[1] ?? first})`)
        callables.add(implementation.rustName)
        return { name: bindMultirange(`${implementation.rustName}(${finished})`), type: call.type }
      }
      if (rangeBinarySend || isRangeHash(implementation)) {
        const bindRange = (expression: string): string => {
          const name = fresh('range_binary_value')
          destination.push(`let ${name} = ${expression};`)
          return name
        }
        const input = operands[0]!
        const range =
          rangeOverride?.rangeType === input.type ? rangeOverride : rangeTypeProfile(input.type)
        if (!range || !rangeSubtype)
          throw new UnsupportedCheckRustExpression(
            'Range binary operations need one captured range identity',
          )
        const extended = implementation.args.length === 2
        const hashSupport = rangeHashSupport(range, extended)
        if (!rangeBinarySend && !hashSupport.compatible)
          throw new UnsupportedCheckRustExpression(
            'Range hashing requires compatible subtype equality/hash classes without runtime type-cache dependencies',
          )
        const signature = rangeBinarySend
          ? range.subtypeSend
          : extended
            ? range.subtypeHashExtended
            : range.subtypeHash
        if (!rangeBinarySend && !hashSupport.available) {
          const state = bindRange(`range_is_null(${ownedOperand(input)})`)
          const seed = extended ? ownedOperand(operands[1]!) : bindRange('make_int8_value(0i64)')
          return {
            name: bindRange(`range_hash_missing${extended ? '64' : '32'}(${state},${seed})`),
            type: call.type,
          }
        }
        const scalar = signature
          ? builtinCallables().find((item) => callableIdentity(item) === signature)
          : null
        const enumSend =
          rangeBinarySend &&
          range.subtypeEnum !== undefined &&
          scalar?.kind === 'function' &&
          scalar.schema === 'pg_catalog' &&
          scalar.name === 'enum_send' &&
          scalar.args.join(',') === 'pg_catalog.anyenum' &&
          scalar.volatility === 's'
        const arraySupport =
          isArrayLikeType(rangeSubtype) &&
          scalar != null &&
          (rangeBinarySend ? isArrayBinarySend(scalar) : isArrayHash(scalar))
        const nestedType = rangeTypeProfile(rangeSubtype) ?? multirangeTypeProfile(rangeSubtype)
        const nestedProfile = nestedType
          ? (rangeNestedProfile(range, nestedType.identity) ?? nestedType)
          : null
        const nestedSupport =
          nestedProfile &&
          scalar != null &&
          (rangeContainerKind(rangeSubtype) === 42
            ? rangeBinarySend
              ? isRangeBinarySend(scalar)
              : isRangeHash(scalar)
            : rangeContainerKind(rangeSubtype) === 43 &&
              (rangeBinarySend ? isMultirangeBinarySend(scalar) : isMultirangeHash(scalar)))
        const recordSupport =
          compositeProfile(rangeSubtype) !== null &&
          scalar != null &&
          (rangeBinarySend ? isRecordBinarySend(scalar) : isRecordHash(scalar))
        if (
          !scalar ||
          scalar.kind !== 'function' ||
          !scalar.strict ||
          scalar.returnsSet ||
          (scalar.volatility !== 'i' &&
            !enumSend &&
            !arraySupport &&
            !nestedSupport &&
            !recordSupport &&
            !(
              rangeBinarySend &&
              scalar.schema === 'pg_catalog' &&
              ['textsend', 'namesend', 'varcharsend', 'bpcharsend'].includes(scalar.name) &&
              scalar.args[0] ===
                {
                  namesend: 'pg_catalog.name',
                  textsend: 'pg_catalog.text',
                  varcharsend: 'pg_catalog."varchar"',
                  bpcharsend: 'pg_catalog.bpchar',
                }[scalar.name] &&
              scalar.volatility === 's'
            )) ||
          scalar.result !== call.type ||
          (scalar.args[0] !== rangeSubtype &&
            !(range.subtypeEnum && scalar.args[0] === 'pg_catalog.anyenum') &&
            !(arraySupport && scalar.args[0] === 'pg_catalog.anyarray') &&
            !(recordSupport && scalar.args[0] === 'pg_catalog.record') &&
            !(
              nestedSupport &&
              ['pg_catalog.anyrange', 'pg_catalog.anymultirange'].includes(scalar.args[0] ?? '')
            ) &&
            (!scalar.args[0] || builtinCast(rangeSubtype, scalar.args[0])?.method !== 'b')) ||
          scalar.args.length !== (extended ? 2 : 1) ||
          (extended && scalar.args[1] !== 'pg_catalog.int8') ||
          (!enumSend && !checkRustCallableNames().has(scalar.rustName)) ||
          (rangeBinarySend && range.send !== call.signature)
        )
          throw new UnsupportedCheckRustExpression(
            'Range binary operation requires captured subtype support',
          )
        const deferredTextHash =
          !rangeBinarySend &&
          ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(
            range.elementType,
          ) &&
          range.collationDeterministic !== true
        const bounds = (deferredTextHash ? [] : [false, true]).map((upper) => {
          const cell = bindRange(`range_bound(${ownedOperand(input)}, ${upper})`)
          const bound = {
            name: bindRange(`array_element_to_${rustValuePrefix(rustType(rangeSubtype))}(${cell})`),
            type: rangeSubtype,
          }
          return scalar.args[0] === rangeSubtype ||
            (range.subtypeEnum && scalar.args[0] === 'pg_catalog.anyenum') ||
            arraySupport ||
            nestedSupport ||
            recordSupport
            ? bound
            : emitCallInner(
                { kind: 'cast', signature: null, type: scalar.args[0]! },
                [bound],
                destination,
              )
        })
        if (rangeBinarySend) {
          const bytes = bounds.map((bound) => {
            if (enumSend) {
              const text = bindRange(
                `enum_to_text(${ownedOperand(bound)}${rangeDefinitionArguments(range, executionContext, bind)})`,
              )
              return emitCallInner(
                {
                  kind: 'function',
                  signature: builtinTypeIO('pg_catalog.text')!.send!,
                  type: 'pg_catalog.bytea',
                },
                [{ name: text, type: 'pg_catalog.text' }],
                destination,
              )
            }
            return emitCallInner(
              { kind: 'function', signature: signature!, type: 'pg_catalog.bytea' },
              [bound],
              destination,
              undefined,
              undefined,
              undefined,
              nestedProfile ?? undefined,
            )
          })
          callables.add(implementation.rustName)
          return {
            name: bindRange(
              `${implementation.rustName}(${ownedOperand(input)}, ${bytes.map(ownedOperand).join(', ')})`,
            ),
            type: call.type,
          }
        }
        const flags = {
          name: bindRange(`range_hash_flags(${ownedOperand(input)})`),
          type: 'pg_catalog.int4' as const,
        }
        const flagSupport = builtinTypeComparison('pg_catalog.int4')!
        const flagSignature = (extended ? flagSupport.hashExtended : flagSupport.hash)!
        const seed = extended ? operands[1]! : null
        const basis = emitCallInner(
          { kind: 'function', signature: flagSignature, type: call.type },
          [flags, ...(seed ? [seed] : [])],
          destination,
        )
        const context = hashSupport.context ?? (recordSupport ? 'bytes' : null)
        const orders =
          hashByteOrder !== undefined
            ? [hashByteOrder]
            : context && executionContext.nativeByteOrder === undefined
              ? [1, 2]
              : [executionContext.nativeByteOrder === 'big' ? 2 : 1]
        const alternatives = orders.map((order) => {
          const hashes = deferredTextHash
            ? [false, true].map(() => bindRange(`${extended ? 'int8' : 'int4'}_unknown()`))
            : bounds.map((bound) => {
                if (arraySupport || nestedSupport || recordSupport) {
                  const result = emitCallInner(
                    {
                      kind: 'function',
                      signature: signature!,
                      type: call.type,
                      collation:
                        range.collationIsC === true
                          ? 'C'
                          : range.collationDeterministic === true
                            ? 'deterministic'
                            : undefined,
                      collationDefault: range.collationIsDefault === true,
                    },
                    [bound, ...(seed ? [seed] : [])],
                    destination,
                    undefined,
                    order,
                    rangeArrayHashPlan(range) ?? undefined,
                    nestedProfile ?? undefined,
                  )
                  return ownedOperand(result)
                }
                const args = [
                  ownedOperand(bound),
                  ...(seed ? [ownedOperand(seed)] : []),
                  ...(context ? [String(order)] : []),
                  ...(context === 'text'
                    ? [String(executionContext.serverEncoding === 'UTF8')]
                    : []),
                ]
                callables.add(scalar.rustName)
                return bindRange(`${scalar.rustName}(${args.join(', ')})`)
              })
          callables.add(implementation.rustName)
          return bindRange(
            `${implementation.rustName}(${ownedOperand(input)}, ${seed ? ownedOperand(seed) + ', ' : ''}${ownedOperand(basis)}, ${hashes.join(', ')})`,
          )
        })
        const name =
          alternatives.length === 1
            ? alternatives[0]!
            : bindRange(`array_hash_finish${extended ? '64' : '32'}(${alternatives.join(', ')})`)
        return { name, type: call.type }
      }
      if (isArrayHash(implementation)) {
        const arrayType = operands[0]?.type
        if (!arrayType?.startsWith('array:'))
          throw new UnsupportedCheckRustExpression(
            'Array hashing requires one concrete array identity',
          )
        const elementType = arrayType.slice(6),
          family = arrayElementFamily(elementType)
        let leaf = arrayElementBaseType(elementType)
        while (leaf.startsWith('array:')) leaf = arrayElementBaseType(leaf.slice(6))
        const recordLeaf = compositeProfile(leaf) !== null || anonymousRecordProfile(leaf) !== null
        const defaults =
          arrayHashPlan?.element ??
          arrayElementComparison(elementType) ??
          (anonymousRecordProfile(arrayElementBaseType(elementType))
            ? {
                hash: recordFieldHashSupport(elementType, false).signature,
                hashExtended: recordFieldHashSupport(elementType, true).signature,
              }
            : null)
        if (family === null || !defaults)
          throw new UnsupportedCheckRustExpression(
            'Array hashing requires captured element support metadata',
          )
        const extended = implementation.args.length === 2,
          width = extended ? '64' : '32'
        const selected = extended ? defaults.hashExtended : defaults.hash
        const scalar = selected
          ? builtinCallables().find((item) => callableIdentity(item) === selected)
          : null
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
        let leafType = arrayElementBaseType(elementType)
        while (leafType.startsWith('array:')) leafType = arrayElementBaseType(leafType.slice(6))
        let capturedLeaf = arrayHashPlan
        while (capturedLeaf?.child) {
          const hash = extended ? capturedLeaf.element.hashExtended : capturedLeaf.element.hash
          const metadata = hash
            ? builtinCallables().find((item) => callableIdentity(item) === hash)
            : null
          if (!metadata || !isArrayHash(metadata)) break
          capturedLeaf = capturedLeaf.child
        }
        const leafSupport = capturedLeaf?.element ?? arrayElementComparison(leafType)
        const leafHash = extended ? leafSupport?.hashExtended : leafSupport?.hash
        const leafRange =
          capturedLeaf?.range ?? rangeTypeProfile(leafType) ?? multirangeTypeProfile(leafType)
        if (
          leafRange &&
          (!rangeHashSupport(leafRange, extended).compatible ||
            (rangeTypeProfile(leafType)
              ? leafRange.rangeHashEqualityCompatible
              : leafRange.multirangeHashEqualityCompatible) !== true)
        )
          throw new UnsupportedCheckRustExpression(
            'Range array hashing requires compatible equality/hash classes without runtime type-cache dependencies',
          )
        const nativeHash = extended ? leafSupport?.hashExtended : leafSupport?.hash
        const nativeMetadata = nativeHash
          ? builtinCallables().find((item) => callableIdentity(item) === nativeHash)
          : null
        const nativeContext = leafRange
          ? rangeHashSupport(leafRange, extended).context
          : nativeMetadata
            ? nativeHashContext(nativeMetadata)
            : null
        const missingRangeHash = leafRange && !rangeHashSupport(leafRange, extended).available
        const orders =
          hashByteOrder !== undefined
            ? [hashByteOrder]
            : (nativeContext || recordLeaf) && executionContext.nativeByteOrder === undefined
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
          initial = fresh('array_hash_basis'),
          index = fresh('array_hash_index'),
          start = fresh('array_hash_start')
        const results = orders.map(() => fresh('array_hash_result'))
        destination.push(
          recordLeaf
            ? `let ${payload} = prepare_record_array_hash(${ownedOperand(operands[0]!)}, ${seed}, ${anonymousRecordProfile(arrayElementBaseType(elementType)) ? (extended ? 0 : 1) : recordFieldHashSupport(elementType, extended).availability});`
            : `let ${payload} = prepare_array_hash(${ownedOperand(operands[0]!)}, ${seed}, ${selected !== null && leafHash != null && !missingRangeHash});`,
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
        const baseType = arrayElementBaseType(elementType)
        let argument = { name: value, type: baseType }
        if (
          !deferred &&
          scalar &&
          scalar.args[0] !== baseType &&
          scalar.args[0] !== 'pg_catalog.anyenum' &&
          !(scalar.args[0] === 'pg_catalog.anyrange' && isRangeType(baseType)) &&
          !(scalar.args[0] === 'pg_catalog.anymultirange' && isMultirangeType(baseType)) &&
          !(scalar.args[0] === 'pg_catalog.anyarray' && isArrayLikeType(baseType)) &&
          !(
            scalar.args[0] === 'pg_catalog.record' &&
            (compositeProfile(baseType) || anonymousRecordProfile(baseType))
          )
        ) {
          const target = scalar.args[0]
          if (!target || builtinCast(baseType, target)?.method !== 'b')
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
            if (
              isArrayHash(scalar) ||
              isRangeHash(scalar) ||
              isMultirangeHash(scalar) ||
              isRecordHash(scalar)
            ) {
              const nested: string[] = []
              const result = emitCallInner(
                {
                  kind: 'function',
                  signature: selected!,
                  type: call.type,
                  collation: effectiveCollation,
                },
                [argument, ...(extended ? [{ name: seed, type: 'pg_catalog.int8' }] : [])],
                nested,
                undefined,
                order,
                arrayHashPlan?.child ?? undefined,
                arrayHashPlan?.range ?? undefined,
              )
              body.push(...indent(nested), `    ${hash} = ${result.name};`)
            } else {
              const args = [ownedOperand(argument), ...(extended ? [seed] : [])]
              if (hashContext) args.push(String(order))
              if (hashContext === 'text')
                args.push(String(executionContext.serverEncoding === 'UTF8'))
              body.push(`    ${hash} = ${scalar.rustName}(${args.join(', ')});`)
              callables.add(scalar.rustName)
            }
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
        const elementType = call.type.startsWith('array:') ? call.type.slice(6) : null,
          family = elementType ? arrayElementFamily(elementType) : null
        if (
          family === null ||
          !elementType ||
          operands[0]?.type !== arrayElementBaseType(elementType)
        )
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
          rustStringLiteral(arrayElementIdentity(elementType)),
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
                : arrayElementBaseType(transformArray.slice(6))),
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
            `let ${name} = ${implementation.rustName}(${args.join(', ')}, ${rustStringLiteral(arrayElementIdentity(elementType))}, ${family});`,
          )
        }
        return { name, type: call.type }
      }
      if (isRecordHash(implementation)) {
        const extended = implementation.args.length === 2,
          width = extended ? '64' : '32',
          kind = extended ? 'Int8Value' : 'Int4Value',
          operand = operands[0]!,
          layouts = recordHashLayouts(operand.type, extended)
        if (!layouts)
          throw new UnsupportedCheckRustExpression('Record hashing requires field descriptors')
        const seed = operands[1]?.name ?? fresh('record_hash_seed')
        if (!operands[1]) destination.push(`let ${seed}=make_int8_value(0i64);`)
        const initial = fresh('record_hash_unresolved'),
          result = fresh('record_hash_result'),
          initialHelper = extended ? 'record_hash_initial64' : 'array_comparison_initial'
        destination.push(
          `let ${initial}=prepare_record_hash(${ownedOperand(operand)},${seed},"",-1);`,
          `let mut ${result}:${kind}=${initialHelper}(&${initial});`,
        )
        const orders =
          hashByteOrder !== undefined
            ? [hashByteOrder]
            : executionContext.nativeByteOrder
              ? [executionContext.nativeByteOrder === 'little' ? 1 : 2]
              : [1, 2]
        for (const layout of layouts) {
          const frame = fresh('record_hash_frame'),
            basis = fresh('record_hash_basis'),
            totals = orders.map(() => fresh('record_hash_total'))
          destination.push(
            `let ${frame}=prepare_record_hash(${ownedOperand(operand)},${seed},${rustStringLiteral(layout.identity)},${layout.fields.length});`,
            `if record_hash_ready(&${frame}) {`,
          )
          const lines = [
            `let ${basis}=${initialHelper}(&${frame});`,
            ...totals.map((total) => `let mut ${total}:${kind}=${basis};`),
          ]
          for (const [index, field] of layout.fields.entries()) {
            const position = fresh('record_hash_position'),
              cell = fresh('record_hash_field_element')
            lines.push(
              `let ${position}=make_int4_value(${index});`,
              `if array_hash_continues${width}(&${frame},${position},${totals[0]},${totals[1] ?? totals[0]}) {`,
              `    let ${cell}=array_comparison_element_at(&${frame},${position},false);`,
            )
            for (const [i, order] of orders.entries()) {
              const hash = fresh('record_field_hash'),
                body: string[] = []
              lines.push(
                `    let mut ${hash}:${kind}=record_hash_cell${width}(${cell}.clone(),${field.availability});`,
                `    if array_hash_requires_scalar${width}(${hash}) {`,
              )
              try {
                if (!field.type || !field.signature)
                  throw new UnsupportedCheckRustExpression('Unimplemented record field hash')
                const scalar = builtinCallables().find(
                    (item) => callableIdentity(item) === field.signature,
                  ),
                  type = arrayElementBaseType(field.type),
                  collation =
                    field.collation === 'default'
                      ? executionContext.defaultCollation
                      : field.collation
                if (
                  !scalar ||
                  scalar.kind !== 'function' ||
                  scalar.schema !== 'pg_catalog' ||
                  !scalar.strict ||
                  scalar.volatility !== 'i' ||
                  scalar.returnsSet ||
                  scalar.result !== call.type ||
                  !checkRustCallableNames().has(scalar.rustName) ||
                  type.startsWith('enum:')
                )
                  throw new UnsupportedCheckRustExpression(
                    'Record field hashing requires its selected implementation',
                  )
                const text = scalar.args.some((type) =>
                  ['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog.name'].includes(type),
                )
                if (text && !supportsTextCallableCollation(field.signature, collation))
                  throw new UnsupportedCheckRustExpression(
                    'Record field hashing requires its collation',
                  )
                const value = fresh('record_hash_scalar')
                body.push(
                  `let ${value}=array_element_to_${rustValuePrefix(rustType(type))}(${cell}.clone());`,
                )
                let argument = { name: value, type }
                const target = scalar.args[0]!
                if (
                  ![
                    type,
                    'pg_catalog.anyarray',
                    'pg_catalog.anyrange',
                    'pg_catalog.anymultirange',
                    'pg_catalog.record',
                  ].includes(target)
                ) {
                  if (builtinCast(type, target)?.method !== 'b')
                    throw new UnsupportedCheckRustExpression(
                      'Record hash field requires its binary relabel',
                    )
                  argument = emitCall(
                    { kind: 'cast', signature: null, type: target },
                    [argument],
                    body,
                  )
                }
                if (
                  isRecordHash(scalar) ||
                  isArrayHash(scalar) ||
                  isRangeHash(scalar) ||
                  isMultirangeHash(scalar)
                ) {
                  const value = emitCallInner(
                    { kind: 'function', signature: field.signature, type: call.type, collation },
                    [argument, ...(extended ? [{ name: seed, type: 'pg_catalog.int8' }] : [])],
                    body,
                    undefined,
                    order,
                  )
                  body.push(`${hash}=${value.name};`)
                } else {
                  const args = [ownedOperand(argument), ...(extended ? [seed] : [])],
                    context = nativeHashContext(scalar)
                  if (context) args.push(String(order))
                  if (context === 'text')
                    args.push(String(executionContext.serverEncoding === 'UTF8'))
                  body.push(`${hash}=${scalar.rustName}(${args.join(',')});`)
                  callables.add(scalar.rustName)
                }
                lines.push(...body.map((line) => '        ' + line))
              } catch (error) {
                if (!(error instanceof UnsupportedCheckRustExpression)) throw error
                lines.push(`        ${hash}=${extended ? 'int8' : 'int4'}_unknown();`)
              }
              lines.push('    }', `    ${totals[i]}=array_hash_step${width}(${totals[i]},${hash});`)
            }
            lines.push('}')
          }
          lines.push(`${result}=array_hash_finish${width}(${totals[0]},${totals[1] ?? totals[0]});`)
          destination.push(...indent(lines), '}')
        }
        const name = fresh('value')
        destination.push(`let ${name}=${implementation.rustName}(${result});`)
        callables.add(implementation.rustName)
        return { name, type: call.type }
      }
      if (isRecordComparison(implementation)) {
        const left = operands[0]!,
          right = operands[1]!,
          leftLayouts = recordComparisonLayouts(left.type),
          rightLayouts = recordComparisonLayouts(right.type)
        if (!leftLayouts || !rightLayouts)
          throw new UnsupportedCheckRustExpression('Record comparison requires known field layouts')
        const unresolved = fresh('record_comparison_unresolved'),
          resolved = fresh('record_comparison_resolved')
        destination.push(
          `let ${unresolved}=prepare_record_comparison(${ownedOperand(left)},${ownedOperand(right)},"","",-1,-1);`,
          `let mut ${resolved}:Int4Value=array_comparison_initial(&${unresolved});`,
        )
        for (const first of leftLayouts)
          for (const second of rightLayouts) {
            const a = first.profile
            const equality = ['record_eq', 'record_ne'].includes(implementation.name),
              payload = fresh('record_comparison'),
              result = fresh('record_ordering')
            destination.push(
              `let ${payload}=prepare_record_comparison(${ownedOperand(left)},${ownedOperand(right)},${rustStringLiteral(first.identity)},${rustStringLiteral(second.identity)},${first.fields.length},${second.fields.length});`,
              `if record_comparison_ready(&${payload}) {`,
              `let mut ${result}:Int4Value=array_comparison_initial(&${payload});`,
            )
            for (
              let index = 0;
              index < Math.min(first.fields.length, second.fields.length);
              index++
            ) {
              const field = first.fields[index]!,
                other = second.fields[index]!,
                selectedType = field.type,
                otherType = other.type,
                support = field.support,
                otherSupport = other.support,
                availability =
                  support &&
                  otherSupport &&
                  (equality
                    ? support.equalityImplementation === otherSupport.equalityImplementation &&
                      support.equalityAvailable === otherSupport.equalityAvailable
                    : support.comparator === otherSupport.comparator &&
                      support.comparisonAvailable === otherSupport.comparisonAvailable)
                    ? (equality ? support.equalityAvailable : support.comparisonAvailable)
                      ? 1
                      : 0
                    : -1,
                selected = equality ? support?.equalityImplementation : support?.comparator,
                metadata = selected
                  ? builtinCallables().find((n) => callableIdentity(n) === selected)
                  : null,
                leftCell = fresh('record_left_cell'),
                rightCell = fresh('record_right_cell'),
                position = fresh('record_position'),
                pair = fresh('record_pair'),
                compared = fresh('record_compared'),
                lines: string[] = [],
                scalarLines: string[] = []
              lines.push(
                `let ${position}=make_int4_value(${index});`,
                `let ${leftCell}=array_comparison_element_at(&${payload},${position},false);`,
                `let ${rightCell}=array_comparison_element_at(&${payload},${position},true);`,
                `let ${pair}=record_comparison_pair(${leftCell}.clone(),${rightCell}.clone(),${field.identity === other.identity},${availability},${equality});`,
                `let mut ${compared}:Int4Value=${pair};`,
              )
              const text = metadata?.args.some((type) =>
                  [
                    'pg_catalog.text',
                    'pg_catalog."varchar"',
                    'pg_catalog.bpchar',
                    'pg_catalog.name',
                  ].includes(type),
                ),
                invalid = field.collationIdentity !== other.collationIdentity,
                collation =
                  field.collation === 'C' && other.collation === 'C'
                    ? ('C' as const)
                    : field.collation === 'default' &&
                        other.collation === 'default' &&
                        executionContext.defaultCollation === 'C'
                      ? ('C' as const)
                      : field.collation !== 'other' && other.collation !== 'other'
                        ? ('deterministic' as const)
                        : ('other' as const)
              if (invalid && text) scalarLines.push(`${compared}=record_invalid_collation();`)
              else if (
                field.identity === other.identity &&
                selected &&
                selectedType &&
                otherType &&
                metadata?.kind === 'function' &&
                metadata.strict &&
                !metadata.returnsSet &&
                metadata.volatility === 'i' &&
                checkRustCallableNames().has(metadata.rustName) &&
                (!text || supportsTextCallableCollation(selected, collation))
              ) {
                const prefix = rustValuePrefix(rustType(selectedType)),
                  leftScalar = fresh('record_left_scalar'),
                  rightScalar = fresh('record_right_scalar')
                scalarLines.push(
                  `let ${leftScalar}=array_element_to_${prefix}(${leftCell});`,
                  `let ${rightScalar}=array_element_to_${rustValuePrefix(rustType(otherType))}(${rightCell});`,
                )
                const outer = comparisonProfileScope,
                  outerInvalid = comparisonCollationInvalid
                comparisonProfileScope = a
                comparisonCollationInvalid = invalid
                try {
                  const values = [
                    { name: leftScalar, type: selectedType },
                    { name: rightScalar, type: otherType },
                  ].map((value, i) => {
                    const target = metadata.args[i]!
                    if (
                      [
                        'pg_catalog.anyenum',
                        'pg_catalog.anyarray',
                        'pg_catalog.anyrange',
                        'pg_catalog.anymultirange',
                        'pg_catalog.record',
                      ].includes(target) ||
                      target === value.type
                    )
                      return value
                    if (builtinCast(value.type, target)?.method !== 'b')
                      throw new UnsupportedCheckRustExpression(
                        'Record field support requires its catalog binary relabel',
                      )
                    return emitCall(
                      { kind: 'cast', signature: null, type: target as typeof selectedType },
                      [value],
                      scalarLines,
                    )
                  })
                  const normalizedComparison = !equality
                    ? portableComparison(selectedType, selected)
                    : null
                  const value = normalizedComparison
                    ? { name: fresh('record_comparison_value'), type: 'pg_catalog.int4' }
                    : emitCall(
                        { kind: 'function', signature: selected, type: metadata.result, collation },
                        values,
                        scalarLines,
                      )
                  if (normalizedComparison)
                    scalarLines.push(
                      `let ${value.name}=${normalizedComparison}(${[...values.map(ownedOperand), ...(normalizedComparison === 'tsquery_order' ? [String(executionContext.serverEncoding === 'UTF8')] : [])].join(', ')});`,
                    )
                  scalarLines.push(
                    `${compared}=${equality ? 'array_equality_step' : 'array_order_step'}(${value.name});`,
                  )
                } finally {
                  comparisonProfileScope = outer
                  comparisonCollationInvalid = outerInvalid
                }
              } else scalarLines.push(`${compared}=int4_unknown();`)
              lines.push(
                `if array_pair_requires_scalar(${pair}) {`,
                ...indent(scalarLines),
                '}',
                `${result}=${compared};`,
              )
              destination.push(`if row_compare_continues(${result}) {`, ...indent(lines), '}')
            }
            const completed = fresh('record_completed')
            destination.push(
              `let ${completed}=finish_record_comparison(&${payload},${result});`,
              `${resolved}=${completed};`,
              '}',
            )
          }
        const name = fresh('record_result')
        destination.push(`let ${name}=${implementation.rustName}(${resolved});`)
        callables.add(implementation.rustName)
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
            ? operands.length !== 2 ||
              operands[0]?.type !== arrayElementBaseType(arrayType.slice(6))
            : arraySort
              ? operands.slice(1).some((operand) => operand.type !== 'pg_catalog.bool')
              : arrayRewrite
                ? operands
                    .slice(1)
                    .some((operand) => operand.type !== arrayElementBaseType(arrayType.slice(6)))
                : arraySearch
                  ? operands[1]?.type !== arrayElementBaseType(arrayType.slice(6))
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
        const captured = comparisonProfileScope?.graph.definitions.find(
          (n) => compositeFieldType(comparisonProfileScope!, n.identity, true) === elementType,
        )?.comparison
        const defaults = captured
          ? { ...captured, equality: captured.equalityImplementation }
          : arrayElementComparison(elementType)
        if (family === null || !defaults)
          throw new UnsupportedCheckRustExpression(
            'Array comparison requires captured element comparison metadata',
          )
        const selected = equality ? defaults.equality : defaults.comparator
        const available = captured
          ? equality
            ? captured.equalityAvailable
            : captured.comparisonAvailable
          : arrayElementComparisonAvailable(elementType, equality)
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
          const scalar = selected
            ? builtinCallables().find((item) => callableIdentity(item) === selected)
            : null
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
              arrayElementBaseType(elementType) === 'pg_catalog.jsonb' &&
              (executionContext.defaultCollation !== 'C' ||
                executionContext.serverEncoding !== 'UTF8'))
          const emitElement = (selected: string, scalar: ReturnType<typeof builtinMetadata>) => {
            const baseType = arrayElementBaseType(elementType)
            const prefix = rustValuePrefix(rustType(elementType))
            const args = [left, right].map((element, position) => {
              const name = fresh('array_comparison_scalar')
              scalarLines.push(`let ${name} = array_element_to_${prefix}(${element});`)
              const target = scalar.args[position]
              if (
                target === baseType ||
                (target === 'pg_catalog.record' &&
                  (compositeProfile(baseType) || anonymousRecordProfile(baseType))) ||
                target === 'pg_catalog.anyenum' ||
                (target === 'pg_catalog.anyrange' && isRangeType(baseType)) ||
                (target === 'pg_catalog.anymultirange' && isMultirangeType(baseType)) ||
                (target === 'pg_catalog.anyarray' && isArrayLikeType(baseType))
              )
                return { name, type: baseType }
              if (!target || builtinCast(baseType, target)?.method !== 'b')
                throw new UnsupportedCheckRustExpression(
                  'Array element comparison requires its catalog binary relabel',
                )
              return emitCall(
                { kind: 'cast', signature: null, type: target },
                [{ name, type: baseType }],
                scalarLines,
              )
            })
            const normalizedComparison = portableComparison(baseType, selected)
            if (normalizedComparison) {
              const name = fresh('array_comparison_value')
              scalarLines.push(
                `let ${name}=${normalizedComparison}(${[...args.map(ownedOperand), ...(normalizedComparison === 'tsquery_order' ? [String(executionContext.serverEncoding === 'UTF8')] : [])].join(', ')});`,
              )
              return { name, type: 'pg_catalog.int4' }
            }
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
          if (comparisonCollationInvalid && text) {
            scalarLines.push(`${result}=record_invalid_collation();`)
          } else if (!deferred && scalar && selected) {
            const compared = emitElement(selected, scalar)
            scalarLines.push(
              `${result} = ${equality ? 'array_equality_step' : 'array_order_step'}(${compared.name});`,
            )
          } else {
            const eq = defaults.equality
              ? builtinCallables().find((item) => callableIdentity(item) === defaults.equality)
              : null
            const eqActual = eq?.kind === 'operator' ? builtinMetadata(eq.implementation) : eq
            if (
              !equality &&
              !compositeProfile(arrayElementBaseType(elementType)) &&
              actual?.kind === 'function' &&
              actual.schema === 'pg_catalog' &&
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
            `let ${payload} = prepare_array_bucket(${needle}, ${ownedOperand(operands[1]!)}, ${available});`,
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
            `let ${initial} = prepare_array_sort(${ownedOperand(operands[0]!)}, ${direction}, ${nullsFirst}, ${available});`,
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
            `let ${payload} = prepare_array_rewrite(${ownedOperand(operands[0]!)}, ${needle}, ${replacement}, ${remove}, ${available});`,
            `let ${initial} = array_search_initial(&${payload});`,
            `let ${first} = make_int4_value(0);`,
            `let mut ${result}: Int4Value = ${initial};`,
            `let mut ${index}: Int4Value = ${first};`,
            `let ${empty} = make_array_arguments(${rustStringLiteral(arrayElementIdentity(elementType))}, ${family});`,
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
            `let ${payload} = prepare_array_search(${ownedOperand(operands[0]!)}, ${needle}, ${start.name}, ${operands.length === 3}, ${available});`,
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
            `let ${payload} = prepare_array_membership(${ownedOperand(operands[0]!)}, ${ownedOperand(operands[1]!)}, ${reverse}, ${available});`,
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
          `let ${payload} = prepare_array_comparison(${ownedOperand(operands[0]!)}, ${ownedOperand(operands[1]!)}, ${equality}, ${available});`,
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
      if (
        implementation.kind === 'function' &&
        implementation.schema === 'pg_catalog' &&
        implementation.name === 'name' &&
        implementation.result === 'pg_catalog.name' &&
        implementation.args.length === 1 &&
        ['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog."varchar"'].includes(
          implementation.args[0]!,
        )
      ) {
        let argument = ownedOperand(operands[0]!)
        if (implementation.args[0] === 'pg_catalog.bpchar')
          argument = bind(`sql__pg_catalog__text__vc4r(${argument})`)
        return {
          name: bind(
            `name_from_text_context(${argument},${executionContext.maxIdentifierBytes ?? -1},${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: call.type,
        }
      }
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
          enumOverride?: EnumDefinition,
        ): string => {
          let operand = { ...original, type: arrayElementBaseType(original.type) }
          if (isCatalogVectorType(operand.type))
            operand = { ...operand, type: arrayPhysicalType(operand.type)! }
          if (operand.type.startsWith('array:'))
            return arrayValueInput(operand, key === true, lines, enumOverride)
          if (compositeProfile(operand.type) || anonymousRecordProfile(operand.type)) {
            if (key === true) {
              const carrier = fresh('json_record_key')
              lines.push(`let ${carrier}=json_record_key_input(${ownedOperand(operand)});`)
              return carrier
            }
            const pretty = fresh('json_record_compact')
            lines.push(`let ${pretty}=make_bool_value(false);`)
            const plan = recordInputs(operand, pretty, lines),
              carrier = fresh('json_record_value')
            lines.push(
              `let ${carrier}=${rawJson ? 'json_record_input' : 'jsonb_record_input'}(${plan}${rawJson ? ', ' + String(executionContext.serverEncoding === 'UTF8') : ''});`,
            )
            return carrier
          }
          const range = rangeTypeProfile(operand.type),
            multirange = multirangeTypeProfile(operand.type),
            profile = range ?? multirange
          if (profile && !profile.captured && usesTypedRangeOutput(profile)) {
            if (profile.subtypeOutput !== rangeSubtypeOutput(profile))
              throw new UnsupportedCheckRustExpression(
                'JSON range output requires its selected subtype output',
              )
            const rendered = renderRangeOutput(operand.name, profile, !!multirange, lines),
              text = fresh('json_builtin_range_text'),
              carrier = fresh('json_builtin_range_input')
            lines.push(`let ${text}=${rendered};`, `let ${carrier}=jsonb_input_from_text(${text});`)
            return carrier
          }
          if (profile?.captured) {
            const conversion = range ? profile.jsonConversion : profile.multirangeJsonConversion,
              cast = range ? profile.jsonCast : profile.multirangeJsonCast,
              rangeOutput = builtinTypeIO('pg_catalog.int4range')?.output,
              multirangeOutput = builtinTypeIO('pg_catalog.int4multirange')?.output,
              outputKnown =
                profile.output === rangeOutput &&
                (!multirange || profile.multirangeOutput === multirangeOutput) &&
                profile.subtypeOutput === rangeSubtypeOutput(profile),
              category =
                conversion === 'cast' && cast !== null
                  ? 2
                  : conversion === 'output' && cast === null && outputKnown
                    ? 1
                    : 0,
              carrier = fresh('jsonb_range_input'),
              helper = range ? 'jsonb_range_input_category' : 'jsonb_multirange_input_category'
            if (category === 1 && usesTypedRangeOutput(profile)) {
              const rendered = renderRangeOutput(operand.name, profile, !!multirange, lines),
                text = fresh('json_record_range_text')
              lines.push(
                `let ${text}=${rendered};`,
                `let ${carrier}=jsonb_input_from_text(${text});`,
              )
            } else
              lines.push(
                `let ${carrier} = ${helper}(${ownedOperand(operand)}, ${category}, ${key});`,
              )
            return carrier
          }
          const definition =
            enumOverride ??
            (call.kind === 'cast'
              ? undefined
              : call.inputEnums?.find((item) => enumType(item) === operand.type))
          if (
            operand.type.startsWith('enum:') &&
            definition &&
            (definition.jsonConversion === 'label' ||
              (definition.jsonConversion === 'cast' && key === true))
          ) {
            const text = fresh('jsonb_enum_label')
            const output = arrayElementOutput(
              operand.type,
              definition,
              '',
              operand.name,
              executionContext,
            )
            lines.push(`let ${text} = ${output.conversion};`)
            if (definition.jsonConversion === 'cast') {
              const input = fresh('jsonb_enum_key_input'),
                value = fresh('jsonb_enum_key_value'),
                marker = fresh('jsonb_enum_key_marker')
              const conversion = builtinMetadata(
                'function:["pg_catalog","to_jsonb"](pg_catalog.anyelement)',
              )
              if (conversion.kind !== 'function')
                throw new UnsupportedCheckRustExpression(
                  'JSON cast keys require the JSONB conversion function',
                )
              lines.push(
                `let ${input} = jsonb_input_from_text(${text});`,
                `let ${value} = ${conversion.rustName}(${input});`,
                `let ${marker} = jsonb_input_from_jsonb(${value});`,
              )
              return marker
            }
            operand = { name: text, type: 'pg_catalog.text' }
          }
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
              !(
                metadata.args[0] === operand.type ||
                (metadata.args[0] === 'pg_catalog.anyrange' && isRangeType(operand.type)) ||
                (metadata.args[0] === 'pg_catalog.anymultirange' && isMultirangeType(operand.type))
              ) ||
              metadata.result !== 'pg_catalog.cstring'
            )
              throw new UnsupportedCheckRustExpression(
                'JSONB string conversion requires its catalog output identity',
              )
          }
          const floatOutput = [
              'pg_catalog.float4',
              'pg_catalog.float8',
              'pg_catalog.point',
              'pg_catalog.line',
              'pg_catalog.lseg',
              'pg_catalog.box',
              'pg_catalog.circle',
              'pg_catalog.path',
              'pg_catalog.polygon',
            ].includes(operand.type),
            helper = floatOutput
              ? jsonbConversionHelper(operand.type) + '_context'
              : operand.type === 'pg_catalog.money'
                ? 'jsonb_input_from_money_context'
                : operand.type === 'pg_catalog.bytea'
                  ? 'jsonb_input_from_bytea_context'
                  : operand.type === 'pg_catalog."interval"'
                    ? 'jsonb_input_from_interval_context'
                    : rawJson && operand.type === 'pg_catalog."numeric"'
                      ? 'json_input_from_numeric'
                      : operand.type === 'pg_catalog."json"' && !rawJson
                        ? 'jsonb_input_from_json_context'
                        : jsonbConversionHelper(operand.type)
          if (!helper)
            throw new UnsupportedCheckRustExpression(
              `JSONB conversion requires a supported concrete input category: ${operand.type}`,
            )
          const carrier = fresh('jsonb_input')
          const args = [ownedOperand(operand)]
          if (
            operand.type === 'pg_catalog.timestamptz' &&
            executionContext.timeZone !== undefined
          ) {
            args.push(rustStringLiteral(executionContext.timeZone))
          }
          if (operand.type === 'pg_catalog.money')
            args.push(String(moneyTextCLocale(executionContext)))
          if (operand.type === 'pg_catalog."interval"')
            args.push(String(intervalStyleCode(executionContext)))
          if (operand.type === 'pg_catalog.bytea')
            args.push(
              String(
                executionContext.byteaOutput === 'hex'
                  ? 1
                  : executionContext.byteaOutput === 'escape'
                    ? 2
                    : 0,
              ),
            )
          if (operand.type === 'pg_catalog."json"' && !rawJson)
            args.push(String(executionContext.serverEncoding === 'UTF8'))
          if (floatOutput)
            args.push(
              String(executionContext.extraFloatDigits ?? 0),
              String(executionContext.extraFloatDigits !== undefined),
            )
          if (['pg_catalog.float4', 'pg_catalog.float8'].includes(operand.type))
            args.push(rawJson ? 'true' : typeof key === 'string' ? key : String(key))
          const contextualHelper =
            operand.type === 'pg_catalog.timestamptz' && executionContext.timeZone !== undefined
              ? 'jsonb_input_from_timestamptz_context'
              : helper
          lines.push(`let ${carrier} = ${contextualHelper}(${args.join(', ')});`)
          return carrier
        }
        const arrayInputs = (
          operand: { name: string; type: string },
          object: boolean,
          lines = destination,
          enumOverride?: EnumDefinition,
        ): string => {
          const elementType = operand.type.slice(6)
          const baseType = arrayElementBaseType(elementType)
          if (!operand.type.startsWith('array:') || arrayElementFamily(elementType) === null)
            throw new UnsupportedCheckRustExpression(
              'JSONB array conversion requires a concrete element identity',
            )
          const initial = fresh('jsonb_array_initial'),
            cursor = fresh('jsonb_array_cursor'),
            element = fresh('jsonb_array_element'),
            scalar = fresh('jsonb_array_scalar')
          lines.push(
            `let ${initial} = prepare_jsonb_array_input(${ownedOperand(operand)});`,
            `let mut ${cursor}: JsonbArrayInputPayload = ${initial};`,
          )
          const body: string[] = [
            `let ${element} = jsonb_array_input_element(&${cursor});`,
            `let ${scalar} = array_element_to_${rustValuePrefix(rustType(elementType))}(${element});`,
          ]
          const input = { name: scalar, type: baseType }
          const castEnum =
            call.kind !== 'cast' &&
            (enumOverride?.jsonConversion === 'cast' ||
              call.inputEnums?.some(
                (item) => enumType(item) === baseType && item.jsonConversion === 'cast',
              ))
          if (
            object &&
            (baseType.startsWith('array:') ||
              compositeProfile(baseType) ||
              anonymousRecordProfile(baseType) ||
              castEnum ||
              rangeTypeProfile(baseType)?.captured ||
              multirangeTypeProfile(baseType)?.captured)
          ) {
            const keyLines: string[] = [],
              valueLines: string[] = []
            const keyCarrier = scalarInput(input, true, keyLines, enumOverride)
            const valueCarrier = scalarInput(input, false, valueLines, enumOverride)
            body.push(
              `if jsonb_array_input_is_key(&${cursor}) {`,
              ...indent(keyLines),
              `    ${cursor} = append_jsonb_array_input(${cursor}, ${keyCarrier});`,
              '} else {',
              ...indent(valueLines),
              `    ${cursor} = append_jsonb_array_input(${cursor}, ${valueCarrier});`,
              '};',
            )
          } else {
            let key: boolean | string = false
            if (
              !rawJson &&
              object &&
              ['pg_catalog.float4', 'pg_catalog.float8'].includes(baseType)
            ) {
              key = fresh('jsonb_array_key')
              body.push(`let ${key} = jsonb_array_input_is_key(&${cursor});`)
            }
            const carrier = scalarInput(input, key, body, enumOverride)
            body.push(`${cursor} = append_jsonb_array_input(${cursor}, ${carrier});`)
          }
          lines.push(`while jsonb_array_input_continues(&${cursor}) {`, ...indent(body), '}')
          return cursor
        }
        const arrayValueInput = (
          operand: { name: string; type: string },
          key: boolean,
          lines: string[],
          enumOverride?: EnumDefinition,
        ): string => {
          const carrier = fresh('jsonb_array_input')
          if (key) {
            lines.push(`let ${carrier} = jsonb_array_key_input(${ownedOperand(operand)});`)
            return carrier
          }
          const cursor = arrayInputs(operand, false, lines, enumOverride),
            value = fresh('jsonb_array_value')
          if (rawJson) {
            const compact = fresh('json_array_compact')
            lines.push(
              `let ${compact} = make_bool_value(false);`,
              `let ${value} = json_array_input_value(${cursor}, ${compact}, ${executionContext.serverEncoding === 'UTF8'});`,
              `let ${carrier} = json_array_value_input(${ownedOperand(operand)}, ${value});`,
            )
          } else
            lines.push(
              `let ${value} = jsonb_array_input_value(${cursor});`,
              `let ${carrier} = jsonb_array_value_input(${ownedOperand(operand)}, ${value});`,
            )
          return carrier
        }
        const recordInputs = (
          operand: { name: string; type: string },
          pretty: string,
          lines: string[],
        ): string => {
          const namedLayout = (type: string) => {
            const profile = compositeProfile(type),
              definition = profile?.graph.definitions.find((n) => n.identity === profile.identity)
            return profile && definition
              ? {
                  identity: profile.identity,
                  fields: definition.fields.map((field) => {
                    let leaf = compositePhysicalType(profile, field.type)
                    while (leaf?.element) leaf = compositePhysicalType(profile, leaf.element)
                    const enumDefinition: EnumDefinition | undefined =
                      leaf?.kind === 'e' && leaf.jsonCast !== undefined
                        ? {
                            schema: leaf.schema,
                            name: leaf.name,
                            values: leaf.enumLabels ?? [],
                            outputFunction: leaf.output ?? undefined,
                            jsonConversion: leaf.jsonCast === null ? 'label' : 'cast',
                          }
                        : undefined
                    return {
                      name: field.name,
                      type: compositeFieldType(profile, field.type),
                      enum: enumDefinition,
                    }
                  }),
                }
              : null
          }
          const anonymous = anonymousRecordProfile(operand.type),
            named = namedLayout(operand.type),
            layouts =
              anonymous?.map((layout) =>
                layout.namedType
                  ? namedLayout(layout.namedType)!
                  : {
                      identity: layout.identity,
                      fields: layout.fields.map((field, index) => ({
                        name: 'f' + (index + 1),
                        type: field.type as string | null,
                        enum: field.enum as EnumDefinition | undefined,
                      })),
                    },
              ) ?? (named ? [named] : null)
          if (!layouts)
            throw new UnsupportedCheckRustExpression(
              'JSON record conversion requires field descriptors',
            )
          const initial = fresh('json_record_initial'),
            cursor = fresh('json_record_cursor')
          lines.push(
            `let ${initial}=prepare_json_record_pending(${ownedOperand(operand)},${pretty});`,
            `let mut ${cursor}:JsonRecordInputPayload=${initial};`,
          )
          for (const layout of layouts) {
            lines.push(
              `if json_record_layout_matches(&${cursor},${rustStringLiteral(layout.identity)},${layout.fields.length}) {`,
              `    ${cursor}=select_json_record_layout(${cursor},${rustStringLiteral(layout.identity)},${layout.fields.length});`,
              '}',
            )
            for (const field of layout.fields) {
              const cell = fresh('json_record_field'),
                scalar = fresh('json_record_scalar'),
                body = [`let ${cell}=json_record_field(&${cursor});`],
                type = field.type
              let carrier: string | undefined
              if (type) {
                const outerValidity = arrayValidityScope
                arrayValidityScope = null
                try {
                  const prefix = rustValuePrefix(rustType(type)),
                    conversion = [`let ${scalar}=array_element_to_${prefix}(${cell}.clone());`]
                  carrier = scalarInput({ name: scalar, type }, false, conversion, field.enum)
                  body.push(...conversion)
                } catch (error) {
                  if (!(error instanceof UnsupportedCheckRustExpression)) throw error
                } finally {
                  arrayValidityScope = outerValidity
                }
              }
              if (!carrier) {
                carrier = fresh('json_record_unknown')
                body.push(`let ${carrier}=json_record_opaque_input(${cell});`)
              }
              lines.push(
                ...body,
                `if json_record_has_field(&${cursor}) {`,
                `    ${cursor}=append_json_record(${cursor},${rustStringLiteral(field.name)},${carrier});`,
                '}',
              )
            }
          }
          return cursor
        }
        if (jsonConversion && implementation.name === 'row_to_json') {
          const pretty = operands[1]?.name ?? fresh('json_record_pretty')
          if (!operands[1]) destination.push(`let ${pretty}=make_bool_value(false);`)
          const cursor = recordInputs(operands[0]!, pretty, destination),
            plan = fresh('json_record_plan'),
            name = fresh('value')
          destination.push(`let ${plan}=finish_json_record_plan(${cursor});`)
          destination.push(
            `let ${name}=${implementation.rustName}(${plan}${operands[1] ? ', ' + pretty : ''},${executionContext.serverEncoding === 'UTF8'});`,
          )
          callables.add(implementation.rustName)
          return { name, type: call.type }
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
            carriers.push(scalarInput(operand, key, destination))
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
      const jsonExtraction = jsonScalarExtractionContext(implementation)
      const textSend =
        implementation.schema === 'pg_catalog' &&
        implementation.result === 'pg_catalog.bytea' &&
        implementation.args.length === 1 &&
        implementation.args[0] ===
          (
            {
              namesend: 'pg_catalog.name',
              textsend: 'pg_catalog.text',
              varcharsend: 'pg_catalog."varchar"',
              bpcharsend: 'pg_catalog.bpchar',
            } as Record<string, string>
          )[implementation.name]
      const identifierQuote = isIdentifierQuote(implementation)
      const callable = identifierQuote
        ? 'quote_ident_context'
        : textSend
          ? 'text_wire_context'
          : characterContext
            ? characterContext + '_context'
            : jsonSend
              ? 'json_send_context'
              : jsonpathSend
                ? 'jsonpath_send_context'
                : jsonbSend
                  ? 'jsonb_send_context'
                  : jsonExtraction
                    ? implementation.name + '_context'
                    : jsonpathExecution
                      ? implementation.name.replace('jsonb_path_', 'jsonpath_') +
                        (executionContext.timeZone === undefined ? '_context' : '_session')
                      : implementation.rustName
      if (characterContext) arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      if (identifierQuote)
        arguments_.push(
          String(
            executionContext.quoteAllIdentifiers === undefined
              ? -1
              : executionContext.quoteAllIdentifiers
                ? 1
                : 0,
          ),
        )
      if (textSend) arguments_.push(String(executionContext.clientEncoding === 'UTF8'))
      if (jsonExtraction) arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      if (circlePolygonTrigonometry(implementation))
        arguments_.push(String(executionContext.trigonometry === 'fdlibm'))
      if (jsonbTextRenderingContext(implementation))
        arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
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
      if (jsonpathExecution && executionContext.timeZone !== undefined)
        arguments_.push(rustStringLiteral(executionContext.timeZone))
      if (isMoneyNumericConversion(implementation))
        arguments_.push(String(moneyContextFractionDigits(executionContext)))
      if (isTemporalDatePart(implementation))
        arguments_.push(
          String(executionContext.maxIdentifierBytes ?? -1),
          String(executionContext.serverEncoding === 'UTF8'),
        )
      if (isTemporalTemplateParsing(implementation))
        arguments_.push(
          rustStringLiteral(executionContext.timeZone ?? ''),
          String(executionContext.timeLocale === 'C'),
          String(
            call.kind !== 'cast' &&
              (call.collation === 'C' ||
                (call.collationDefault === true && executionContext.defaultCollation === 'C')),
          ),
          String(executionContext.serverEncoding === 'UTF8'),
          String(executionContext.timeZoneAbbreviations === 'Default'),
        )
      if (isTemporalTimestampFormatting(implementation)) {
        if (implementation.args[0] === 'pg_catalog.timestamptz')
          arguments_.push(rustStringLiteral(executionContext.timeZone ?? ''))
        arguments_.push(
          String(executionContext.timeLocale === 'C'),
          String(
            call.kind !== 'cast' &&
              (call.collation === 'C' ||
                (call.collationDefault === true && executionContext.defaultCollation === 'C')),
          ),
        )
      }

      if (
        isTemporalContextCast(implementation) ||
        isTemporalContextArithmetic(implementation) ||
        isTemporalContextComparison(implementation) ||
        isTemporalInstantPeriod(implementation) ||
        isTemporalInstantAge(implementation) ||
        (isTemporalLocalTimezone(implementation) &&
          implementation.args[0] !== 'pg_catalog.timetz') ||
        (isTemporalInstantConstructor(implementation) && implementation.args.length !== 7)
      )
        arguments_.push(rustStringLiteral(executionContext.timeZone ?? ''))
      if (
        isTemporalSessionTruncation(implementation) ||
        isTemporalSessionExtraction(implementation)
      )
        arguments_.push(
          rustStringLiteral(executionContext.timeZone ?? ''),
          String(executionContext.maxIdentifierBytes ?? -1),
          String(executionContext.serverEncoding === 'UTF8'),
        )
      if (
        isTemporalExplicitZoneLookup(implementation) ||
        (isTemporalLocalTimezone(implementation) && implementation.args[0] === 'pg_catalog.timetz')
      )
        arguments_.push(
          rustStringLiteral(executionContext.timeZone ?? ''),
          String(executionContext.maxIdentifierBytes ?? -1),
          String(executionContext.serverEncoding === 'UTF8'),
          String(executionContext.timeZoneAbbreviations === 'Default'),
        )
      if (xmlCast || xmlPredicate)
        arguments_.push(
          String(
            executionContext.xmlOption === 'document'
              ? 1
              : executionContext.xmlOption === 'content'
                ? 2
                : 0,
          ),
        )
      if (xmlCast) arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      if (xmlSend) arguments_.push(String(executionContext.clientEncoding === 'UTF8'))
      if (jsonbSend) arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      if (jsonSend || jsonbSend || jsonpathSend)
        arguments_.push(String(executionContext.clientEncoding === 'UTF8'))
      if (tsqueryComparison || tsqueryRewrite)
        arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      if (tsvectorSend || tsquerySend)
        arguments_.push(String(executionContext.clientEncoding === 'UTF8'))
      if (
        implementation.schema === 'pg_catalog' &&
        implementation.name === 'array_to_tsvector' &&
        implementation.args.join(',') === 'pg_catalog._text'
      )
        arguments_.push(String(executionContext.serverEncoding === 'UTF8'))
      if (isXmlXPathCallable(implementation))
        arguments_.push(
          String(executionContext.serverEncoding === 'UTF8'),
          String(executionContext.xpathRecursionLimit ?? 0),
          String(executionContext.extraFloatDigits ?? 0),
          String(executionContext.extraFloatDigits !== undefined),
          rustStringLiteral(executionContext.xpathPowerOfTenBits?.join('') ?? ''),
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
      if (diagnostics.enabled && !folded && isXmlXPathCallable(implementation)) {
        const args = [...arguments_]
        if (operands.length === 2) {
          const namespaces = fresh('xpath_namespaces')
          destination.push(`let ${namespaces} = xpath_diagnostic_namespaces();`)
          args.splice(2, 0, namespaces)
        }
        args.push(String(implementation.name === 'xpath'))
        const plan = fresh('xpath_diagnostic'),
          requirement = fresh('_xpath_requirement')
        destination.push(
          `let ${plan} = xpath_diagnostic_execute(${args.join(', ')});`,
          `let ${requirement} = xpath_diagnostic_requirement(&${plan});`,
          `let ${name} = ${implementation.name === 'xpath' ? 'xpath_diagnostic_array' : 'xpath_diagnostic_exists'}(${plan});`,
        )
        diagnostics.set(name, requirement)
      } else destination.push(`let ${name} = ${callable}(${arguments_.join(', ')});`)
      return { name, type: call.type }
    }
    if (node.kind === 'array-io-coerce') {
      const operand = emitScalar(node.operand, bindings, used)
      const family = arrayElementFamily(node.elementType)
      const castLink = builtinCast(node.sourceElementType, node.elementType)
      const input = builtinCallables().find((item) => callableIdentity(item) === node.input)
      if (!input)
        throw new UnsupportedCheckRustExpression(
          'Array I/O coercion requires a supported captured input implementation',
        )
      const output =
        node.sourceEnum?.outputFunction ??
        rangeTypeOutput(node.sourceElementType) ??
        builtinTypeIO(node.sourceElementType)?.output
      const expectedInput = node.enum
        ? input.kind === 'function' &&
          input.schema === 'pg_catalog' &&
          input.name === 'enum_in' &&
          input.args.join(',') === 'pg_catalog.cstring,pg_catalog.oid'
        : (rangeTypeInput(node.elementType) ?? builtinTypeIO(node.elementType)?.input) ===
          node.input
      if (
        arrayPhysicalType(operand.type) !== `array:${node.sourceElementType}` ||
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
            : isMultirangeType(node.elementType)
              ? 'pg_catalog.anymultirange'
              : isRangeType(node.elementType)
                ? 'pg_catalog.anyrange'
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
      const rendered = arrayElementOutput(
        node.sourceElementType,
        node.sourceEnum,
        element,
        scalar,
        executionContext,
      )
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
        node.inputConversion,
        used,
      )
      if (node.modifier >= 0) {
        const modified = fresh('array_io_modified')
        lines.push(
          `let ${modified} = array_element_typmod(${converted}, ${rustStringLiteral(arrayElementIdentity(node.elementType))}, ${node.modifier});`,
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
        `array_conversion_arguments(${builder}, ${rustStringLiteral(arrayElementIdentity(node.elementType))}, ${family})`,
      )
      return {
        name: bind(`finish_array_coercion(${payload}, ${arguments_}, false)`),
        type: node.type,
      }
    }
    if (node.kind === 'array-domain-coerce') {
      const operand = emitScalar(node.operand, bindings, used)
      const family = arrayElementFamily(node.elementType)
      if (arrayPhysicalType(operand.type) !== 'array:' + node.sourceElementType || family === null)
        throw new UnsupportedCheckRustExpression(
          'Domain array conversion requires concrete element carriers',
        )
      const payload = bind(`prepare_array_output(${ownedOperand(operand)})`)
      const initial = bind('make_array_conversion()')
      const first = bind('make_int4_value(0)')
      const builder = fresh('domain_array_builder'),
        index = fresh('domain_array_index')
      const element = fresh('domain_array_element'),
        scalar = fresh('domain_array_scalar')
      const lines: string[] = []
      const sourceType = arrayElementBaseType(node.sourceElementType)
      const prefix = rustValuePrefix(rustType(sourceType))
      lines.push(`let ${scalar} = array_element_to_${prefix}(${element}.clone());`)
      const key = JSON.stringify(['__pgsid_domain_element', false])
      const outer = localInputs.get(key),
        outerValidity = arrayValidityScope
      localInputs.set(key, {
        name: '__pgsid_domain_element',
        type: sourceType,
        rustName: scalar,
        rustType: rustType(sourceType),
      })
      arrayValidityScope = null
      let converted: { name: string; type: string }
      try {
        converted = emitScalar(node.conversion, lines, used)
      } finally {
        if (outer) localInputs.set(key, outer)
        else localInputs.delete(key)
        arrayValidityScope = outerValidity
      }
      const targetPrefix = rustValuePrefix(rustType(arrayElementBaseType(node.elementType)))
      const result = fresh('domain_array_converted')
      bindings.push(
        `let mut ${builder}: ArrayOutputPayload = ${initial};`,
        `let mut ${index}: Int4Value = ${first};`,
        `while array_output_has_element(&${payload}, ${index}) {`,
        `    let ${element} = array_output_element_at(&${payload}, ${index});`,
        ...indent(lines),
        `    let ${result} = array_element_from_${targetPrefix}(${ownedOperand(converted)});`,
        `    ${builder} = append_array_conversion(${builder}, ${result}, ${!rustScalarOwnCanFail(node.conversion, executionContext)});`,
        `    ${index} = array_text_next_index(${index});`,
        '}',
      )
      const arguments_ = bind(
        `array_conversion_arguments(${builder}, ${rustStringLiteral(arrayElementIdentity(node.elementType))}, ${family})`,
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
        arrayPhysicalType(operand.type) !== sourceType ||
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
        `    let ${validity} = array_cast_validity(${element}, ${rustStringLiteral(arrayElementIdentity(node.sourceElementType))}, ${rustStringLiteral(arrayElementIdentity(node.elementType))}, ${alwaysValid});`,
        `    ${builder} = append_array_cast_conversion(${builder}, ${converted}, ${validity});`,
        `    ${index} = array_text_next_index(${index});`,
        '}',
      )
      const arguments_ = bind(
        `array_conversion_arguments(${builder}, ${rustStringLiteral(arrayElementIdentity(node.elementType))}, ${family})`,
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
      if (node.expression.kind === 'uncertain') {
        if (node.expression.preparation !== 'runtime') prepareOpaque()
        return { name: bind('bool_unknown()'), type: 'pg_catalog.bool' }
      }
      const outcome = emit(node.expression)
      bindings.push(...outcome.lines)
      for (const input of outcome.inputs) used.add(input)
      return { name: bind(`bool_from_check(${outcome.name})`), type: 'pg_catalog.bool' }
    }
    if (node.kind === 'input') {
      const item = input(node.name, node.type, false, node.enum)
      used.add(item.name)
      if (isCatalogVectorType(node.type))
        return {
          name: bind(
            `catalog_vector_from_coerced(${item.rustName}.clone(), ${node.type === 'pg_catalog.oidvector'})`,
          ),
          type: node.type,
        }
      if (compositeProfile(node.type)) {
        const plan = compositePlanExpression(node.type, executionContext, bind)
        if (!plan)
          throw new UnsupportedCheckRustExpression(
            'Composite input requires captured field profiles',
          )
        return {
          name: bind(`composite_from_coerced_plan(${item.rustName}.clone(),${plan})`),
          type: node.type,
        }
      }
      const multirange = multirangeTypeProfile(node.type)
      if (multirange?.captured) {
        const support = rangeProfileSupport(multirange, executionContext)
        return {
          name: bind(
            `multirange_from_coerced_${rangeContainerKind(multirange.elementType) !== null ? 'typed_profile' : multirange.subtypeEnum ? 'defined_profile' : 'profile'}(${item.rustName}.clone(), ${rustStringLiteral(multirange.multirange)}, ${rustStringLiteral(multirange.identity)}, ${rustStringLiteral(multirange.subtype)}, ${arrayElementFamily(multirange.elementType)}, ${support.comparison}, ${support.canonical}${rangeDefinitionArguments(multirange, executionContext, bind)})`,
          ),
          type: node.type,
        }
      }
      if (multirange)
        return {
          name: bind(
            `multirange_require_type(${item.rustName}.clone(), ${rustStringLiteral(multirange.multirange)}, ${rustStringLiteral(multirange.identity)}, ${rustStringLiteral(multirange.subtype)}, ${arrayElementFamily(multirange.subtype)})`,
          ),
          type: node.type,
        }
      const range = rangeTypeProfile(node.type)
      if (range?.captured) {
        const support = rangeProfileSupport(range, executionContext)
        return {
          name: bind(
            `range_from_coerced_${rangeContainerKind(range.elementType) !== null ? 'typed_profile' : range.subtypeEnum ? 'defined_profile' : 'profile'}(${item.rustName}.clone(), ${rustStringLiteral(range.identity)}, ${rustStringLiteral(range.subtype)}, ${arrayElementFamily(range.elementType)}, ${support.comparison}, ${support.canonical}${rangeDefinitionArguments(range, executionContext, bind)})`,
          ),
          type: node.type,
        }
      }
      if (range)
        return {
          name: bind(
            `range_require_type(${item.rustName}.clone(), ${rustStringLiteral(range.identity)}, ${rustStringLiteral(range.subtype)}, ${arrayElementFamily(range.subtype)})`,
          ),
          type: node.type,
        }
      const arrayMulti = node.type.startsWith('array:') ? arrayMultirangeProfile(node.type) : null
      const arrayComposite = node.type.startsWith('array:')
        ? compositeContainerProfile(node.type.slice(6))
        : null
      if (arrayComposite) {
        const plan = compositePlanExpression(node.type.slice(6), executionContext, bind)
        if (!plan)
          throw new UnsupportedCheckRustExpression(
            'Composite array input requires captured field profiles',
          )
        return {
          name: bind(
            `array_from_coerced_composite_plan(${item.rustName}.clone(),${rustStringLiteral(arrayElementIdentity(node.type.slice(6)))},${plan})`,
          ),
          type: node.type,
        }
      }
      if (arrayMulti) {
        const plan = arrayIdentityPlan(node.type)!
        return {
          name: bind(
            `array_from_coerced_multirange${arrayMulti.captured ? (rangeContainerKind(arrayMulti.elementType) !== null ? '_typed_profile' : arrayMulti.subtypeEnum ? '_defined_profile' : '_profile') : ''}_tree(${item.rustName}.clone(), ${rustStringLiteral(plan.types)}, ${rustStringLiteral(plan.kinds)}, ${rustStringLiteral(arrayMulti.multirange)}, ${rustStringLiteral(arrayMulti.identity)}, ${rustStringLiteral(arrayMulti.subtype)}, ${arrayElementFamily(arrayMulti.elementType)}${arrayMulti.captured ? `,${rangeProfileSupport(arrayMulti, executionContext).comparison},${rangeProfileSupport(arrayMulti, executionContext).canonical}${rangeDefinitionArguments(arrayMulti, executionContext, bind)}` : ''})`,
          ),
          type: node.type,
        }
      }
      const arrayRange = node.type.startsWith('array:') ? arrayRangeProfile(node.type) : null
      if (arrayRange) {
        const plan = arrayIdentityPlan(node.type)!
        return {
          name: bind(
            `array_from_coerced_range${arrayRange.captured ? (rangeContainerKind(arrayRange.elementType) !== null ? '_typed_profile' : arrayRange.subtypeEnum ? '_defined_profile' : '_profile') : ''}_tree(${item.rustName}.clone(), ${rustStringLiteral(plan.types)}, ${rustStringLiteral(plan.kinds)}, ${rustStringLiteral(arrayRange.identity)}, ${rustStringLiteral(arrayRange.subtype)}, ${arrayElementFamily(arrayRange.elementType)}${arrayRange.captured ? `,${rangeProfileSupport(arrayRange, executionContext).comparison},${rangeProfileSupport(arrayRange, executionContext).canonical}${rangeDefinitionArguments(arrayRange, executionContext, bind)}` : ''})`,
          ),
          type: node.type,
        }
      }
      return { name: item.rustName, type: node.type }
    }
    if (node.kind === 'uncertain') {
      if (node.preparation === 'constant') {
        const status = fresh('unavailable_constant')
        preparationLines.push(`let ${status} = check_unknown();`, ...preparationFinishLines(status))
      }
      prepareOpaque()
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
      const output =
        node.enum?.outputFunction ??
        rangeTypeOutput(operand.type) ??
        builtinTypeIO(operand.type)?.output
      if (!output || output !== node.output)
        throw new UnsupportedCheckRustExpression('Text output needs its catalog I/O identity')
      if (operand.type === 'pg_catalog.tsvector')
        return { name: bind(`tsvector_to_text(${ownedOperand(operand)})`), type: node.type }
      if (operand.type === 'pg_catalog.tsquery')
        return { name: bind(`tsquery_to_text(${ownedOperand(operand)})`), type: node.type }
      if (operand.type === 'pg_catalog.aclitem')
        return { name: bind(`aclitem_to_text(${ownedOperand(operand)})`), type: node.type }
      if (operand.type === 'pg_catalog.money')
        return {
          name: bind(
            `money_to_text_context(${ownedOperand(operand)},${moneyTextCLocale(executionContext)})`,
          ),
          type: node.type,
        }
      if (operand.type === 'pg_catalog.xml') {
        const result = {
          name: bind(`xml_to_output_text(${ownedOperand(operand)})`),
          type: node.type,
        }
        diagnostics.flow(result, [operand], bindings)
        return result
      }
      const range = rangeTypeProfile(operand.type)
      const multirange = multirangeTypeProfile(operand.type)
      if (
        (range && output !== builtinTypeIO('pg_catalog.int4range')?.output) ||
        (multirange && output !== builtinTypeIO('pg_catalog.int4multirange')?.output)
      )
        throw new UnsupportedCheckRustExpression(
          'Range text output needs its selected catalog implementation',
        )
      const metadata = builtinMetadata(output)
      if (
        metadata.kind !== 'function' ||
        metadata.result !== 'pg_catalog.cstring' ||
        !metadata.strict ||
        metadata.args.length !== 1 ||
        metadata.args[0] !==
          (node.enum
            ? 'pg_catalog.anyenum'
            : isRangeType(operand.type)
              ? 'pg_catalog.anyrange'
              : isMultirangeType(operand.type)
                ? 'pg_catalog.anymultirange'
                : operand.type)
      )
        throw new UnsupportedCheckRustExpression('Unsupported text output function')
      if (isGeometryConstantType(operand.type))
        return {
          type: node.type,
          name: bind(
            `geometry_${rustValuePrefix(rustType(operand.type))}_output_context(${ownedOperand(operand)},${executionContext.extraFloatDigits ?? 0},${executionContext.extraFloatDigits !== undefined})`,
          ),
        }
      if (operand.type === 'pg_catalog.float4' || operand.type === 'pg_catalog.float8')
        return {
          type: node.type,
          name: bind(
            `${rustValuePrefix(rustType(operand.type))}_output_context(${operand.name},${executionContext.extraFloatDigits ?? 0},${executionContext.extraFloatDigits !== undefined})`,
          ),
        }
      if (operand.type === 'pg_catalog.date' || operand.type === 'pg_catalog."timestamp"')
        return {
          type: node.type,
          name: bind(
            `${operand.type === 'pg_catalog.date' ? 'date' : 'timestamp'}_output_context(${operand.name},${calendarOutputStyle(executionContext)})`,
          ),
        }
      if (operand.type === 'pg_catalog.timestamptz')
        return {
          type: node.type,
          name: bind(
            executionContext.timeZone === undefined
              ? `timestamptz_output_without_context(${operand.name})`
              : `timestamptz_output_context(${operand.name},${calendarOutputStyle(executionContext)},${rustStringLiteral(executionContext.timeZone)},false)`,
          ),
        }
      if (operand.type === 'pg_catalog."interval"')
        return {
          type: node.type,
          name: bind(
            `interval_output_context(${ownedOperand(operand)},${intervalStyleCode(executionContext)})`,
          ),
        }
      if (operand.type === 'pg_catalog.bytea')
        return {
          type: node.type,
          name: bind(
            `bytea_output_context(${ownedOperand(operand)},${executionContext.byteaOutput === 'hex' ? 1 : executionContext.byteaOutput === 'escape' ? 2 : 0},true)`,
          ),
        }
      if (isCatalogVectorType(operand.type))
        return {
          name: bind(
            `catalog_vector_to_text(${ownedOperand(operand)}, ${operand.type === 'pg_catalog.oidvector'})`,
          ),
          type: node.type,
        }
      if (multirange) {
        const memberOutput = multirange.output
        const subtypeOutput = multirange.subtypeOutput
        if (
          memberOutput !== builtinTypeIO('pg_catalog.int4range')?.output ||
          subtypeOutput !== rangeSubtypeOutput(multirange)
        )
          throw new UnsupportedCheckRustExpression(
            'Multirange text output needs selected range and subtype implementations',
          )
        const member = memberOutput ? builtinMetadata(memberOutput) : null
        const subtype = subtypeOutput ? builtinMetadata(subtypeOutput) : null
        if (
          metadata.schema !== 'pg_catalog' ||
          metadata.name !== 'multirange_out' ||
          metadata.volatility !== 's' ||
          metadata.returnsSet ||
          member?.kind !== 'function' ||
          member.schema !== 'pg_catalog' ||
          member.name !== 'range_out' ||
          member.volatility !== 's' ||
          member.returnsSet ||
          !member.strict ||
          member.args.length !== 1 ||
          member.args[0] !== 'pg_catalog.anyrange' ||
          member.result !== 'pg_catalog.cstring' ||
          subtype?.kind !== 'function' ||
          !subtype.strict ||
          subtype.returnsSet ||
          subtype.args.length !== 1 ||
          subtype.args[0] !==
            (rangeContainerKind(multirange.elementType) !== null &&
            !isCatalogVectorType(multirange.elementType)
              ? {
                  41: 'pg_catalog.anyarray',
                  42: 'pg_catalog.anyrange',
                  43: 'pg_catalog.anymultirange',
                  44: 'pg_catalog.record',
                }[rangeContainerKind(multirange.elementType)!]
              : multirange.subtypeEnum
                ? 'pg_catalog.anyenum'
                : multirange.elementType) ||
          subtype.result !== 'pg_catalog.cstring'
        )
          throw new UnsupportedCheckRustExpression(
            'Multirange output requires captured multirange, range and subtype I/O identities',
          )
        return {
          name: bind(renderRangeOutput(operand.name, multirange, true, bindings)),
          type: node.type,
        }
      }
      if (range) {
        const subtypeOutput = range.subtypeOutput
        if (subtypeOutput !== rangeSubtypeOutput(range))
          throw new UnsupportedCheckRustExpression(
            'Range text output needs its selected subtype implementation',
          )
        const subtype = subtypeOutput ? builtinMetadata(subtypeOutput) : null
        if (
          metadata.name !== 'range_out' ||
          metadata.schema !== 'pg_catalog' ||
          metadata.volatility !== 's' ||
          metadata.returnsSet ||
          subtype?.kind !== 'function' ||
          !subtype.strict ||
          subtype.returnsSet ||
          subtype.args.length !== 1 ||
          subtype.args[0] !==
            (rangeContainerKind(range.elementType) !== null &&
            !isCatalogVectorType(range.elementType)
              ? {
                  41: 'pg_catalog.anyarray',
                  42: 'pg_catalog.anyrange',
                  43: 'pg_catalog.anymultirange',
                  44: 'pg_catalog.record',
                }[rangeContainerKind(range.elementType)!]
              : range.subtypeEnum
                ? 'pg_catalog.anyenum'
                : range.elementType) ||
          subtype.result !== 'pg_catalog.cstring'
        )
          throw new UnsupportedCheckRustExpression(
            'Range output requires captured range and subtype output identities',
          )
        return {
          name: bind(renderRangeOutput(operand.name, range, false, bindings)),
          type: node.type,
        }
      }
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
    if (node.kind === 'text-to-tsquery') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (!io || builtinMetadata(io).args[0] !== 'pg_catalog.cstring')
        throw new UnsupportedCheckRustExpression('Tsquery input requires its catalog I/O identity')
      if (storedArrayInputScope)
        return { name: renderStoredTsquery(ownedOperand(operand), bindings), type: node.type }
      return {
        name: bind(
          `tsquery_from_text_context(${ownedOperand(operand)},${executionContext.serverEncoding === 'UTF8'})`,
        ),
        type: node.type,
      }
    }
    if (node.kind === 'text-to-tsvector') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (!io || builtinMetadata(io).args[0] !== 'pg_catalog.cstring')
        throw new UnsupportedCheckRustExpression('Tsvector input requires its catalog I/O identity')
      const value = bind(
        `${storedArrayInputScope ? 'tsvector_from_stored_text_context' : 'tsvector_from_text_context'}(${ownedOperand(operand)},${executionContext.serverEncoding === 'UTF8'})`,
      )
      return {
        name: storedArrayInputScope ? applyTsvectorStorage(value, bindings) : value,
        type: node.type,
      }
    }
    if (node.kind === 'text-to-aclitem') {
      const operand = emitScalar(node.operand, bindings, used)
      return {
        name: bind(
          `aclitem_from_text_context(${ownedOperand(operand)},${executionContext.maxIdentifierBytes ?? -1},${executionContext.serverEncoding === 'UTF8'})`,
        ),
        type: node.type,
      }
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
      const literals = node.moneyLiterals
      const value = literals?.length
        ? `money_from_captured_text(${ownedOperand(operand)},${rustStringLiteral(literals.map((literal) => literal.text).join('\0'))},${rustStringLiteral(literals.map((literal) => literal.units).join('\0'))},${literals.length})`
        : `money_from_text_context(${ownedOperand(operand)},${moneyTextCLocale(executionContext)})`
      return { name: bind(value), type: node.type }
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
      if (
        node.type === 'pg_catalog.jsonb' &&
        jsonPopulateInput &&
        node.operand.kind === 'input' &&
        node.operand.name === '__pgsid_composite_text_field' &&
        localInputs.get(JSON.stringify(['__pgsid_composite_text_field', false]))?.rustName ===
          jsonPopulateInput.text
      )
        return {
          name: bind(
            `json_populate_jsonb(${jsonPopulateInput.input}.clone(),${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: node.type,
        }
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
    if (node.kind === 'text-to-vector') {
      const operand = emitScalar(node.operand, bindings, used)
      const identity = builtinTypeIO(node.type)?.input
      const callable = identity ? builtinMetadata(identity) : null
      if (
        callable?.kind !== 'function' ||
        callable.result !== node.type ||
        callable.args.join(',') !== 'pg_catalog.cstring' ||
        !callable.strict ||
        callable.returnsSet
      )
        throw new UnsupportedCheckRustExpression('Vector input requires its catalog I/O identity')
      return {
        name: bind(
          `catalog_vector_from_text(${ownedOperand(operand)}, ${node.type === 'pg_catalog.oidvector'})`,
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
    const emitRangeInput = (
      operand: { name: string; type: string },
      type: string,
      conversion?: EvalExpression,
      stored = false,
    ) => {
      const range = rangeTypeProfile(type)
      const signature = stored ? builtinTypeIO('pg_catalog.int4range')?.input : range?.input
      if (signature !== builtinTypeIO('pg_catalog.int4range')?.input)
        throw new UnsupportedCheckRustExpression(
          'Range input requires its selected catalog implementation',
        )
      const input = signature ? builtinMetadata(signature) : null
      if (
        !range ||
        input?.kind !== 'function' ||
        input.schema !== 'pg_catalog' ||
        input.name !== 'range_in' ||
        input.args.join(',') !== 'pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4' ||
        input.result !== 'pg_catalog.anyrange' ||
        !input.strict ||
        input.volatility !== 's' ||
        input.returnsSet ||
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type)
      )
        throw new UnsupportedCheckRustExpression(
          'Range input requires its captured type and catalog I/O identity',
        )
      if (range.captured) {
        const subtype = builtinCallables().find(
          (item) => callableIdentity(item) === range.subtypeInput,
        )
        const domain = rangeSubtypeIsDomain(range)
        const validSubtype = stored
          ? range.output === builtinTypeIO('pg_catalog.int4range')?.output &&
            range.subtypeOutput === rangeSubtypeOutput(range)
          : subtype?.kind === 'function' &&
            !(domain
              ? subtype.schema !== 'pg_catalog' ||
                subtype.name !== 'domain_in' ||
                subtype.args.join(',') !== 'pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4' ||
                subtype.result !== 'pg_catalog."any"' ||
                subtype.strict ||
                subtype.volatility !== 's'
              : range.subtypeEnum
                ? subtype.schema !== 'pg_catalog' ||
                  subtype.name !== 'enum_in' ||
                  subtype.args.join(',') !== 'pg_catalog.cstring,pg_catalog.oid' ||
                  subtype.result !== 'pg_catalog.anyenum' ||
                  !subtype.strict ||
                  subtype.volatility !== 's'
                : range.subtypeInput !==
                  builtinTypeIO(
                    rangeContainerKind(range.elementType) !== null &&
                      !isCatalogVectorType(range.elementType)
                      ? {
                          41: 'pg_catalog._int4',
                          42: 'pg_catalog.int4range',
                          43: 'pg_catalog.int4multirange',
                          44: 'pg_catalog.record',
                        }[rangeContainerKind(range.elementType)!]
                      : range.elementType,
                  )?.input) &&
            !subtype.returnsSet
        if (!conversion || !validSubtype)
          throw new UnsupportedCheckRustExpression(
            'Custom range input requires its captured subtype conversion',
          )
        const support = rangeProfileSupport(range, executionContext)
        const profile = bind(`make_range_support(${support.comparison},${support.canonical})`)
        const plan = bind(`prepare_range_text(${ownedOperand(operand)})`)
        const metadata = `${rustStringLiteral(range.identity)}, ${rustStringLiteral(range.subtype)}, ${arrayElementFamily(range.elementType)}, ${profile}`
        const result = fresh('range_input_result')
        const initialHelper = stored ? 'range_stored_text_initial' : 'range_text_initial'
        const finishHelper =
          (stored ? 'finish_range_stored_text' : 'finish_range_text') +
          (rangeContainerKind(range.elementType) !== null
            ? '_typed'
            : range.subtypeEnum
              ? '_defined'
              : '')
        const definition = rangeDefinitionArguments(range, executionContext, bind)
        const initialExpression = `${initialHelper}(${plan}.clone(), ${metadata})`
        const hasDefinition =
          range.subtypeEnum !== undefined || rangeContainerKind(range.elementType) !== null
        const initial = hasDefinition ? bind(initialExpression) : initialExpression
        bindings.push(
          `let mut ${result}:RangeValue=${hasDefinition ? (rangeContainerKind(range.elementType) !== null ? 'range_with_bound_profile(' : 'range_with_enum_definition(') : ''}${initial}${hasDefinition ? definition + ')' : ''};`,
        )
        const inner: string[] = []
        const bound = (upper: boolean, destination: string[]): string => {
          const element = fresh('range_input_bound')
          const prefix = rustValuePrefix(rustType(range.elementType))
          const boundValue = fresh('range_input_bound_value')
          destination.push(`let mut ${boundValue}:${rustType(range.elementType)}=${prefix}_null();`)
          const text = fresh('range_input_text'),
            status = fresh('range_input_prepared'),
            initial = fresh('range_input_preparation_start')
          const prepared: string[] = [],
            lines: string[] = []
          const key = JSON.stringify(['__pgsid_range_text_bound', false])
          const outer = localInputs.get(key),
            outerStoredArrayInput = storedArrayInputScope,
            outerValidity = arrayValidityScope,
            outerPreparation = domainInputPreparation,
            outerDepth = preparationDepth
          localInputs.set(key, {
            name: '__pgsid_range_text_bound',
            type: 'pg_catalog.text',
            rustName: text,
            rustType: 'TextValue',
          })
          arrayValidityScope = null
          storedArrayInputScope = stored || outerStoredArrayInput
          domainInputPreparation = { lines: prepared, status }
          preparationDepth = 0
          let value: { name: string; type: string }
          try {
            value =
              stored && range.elementType === 'pg_catalog.name'
                ? { name: text, type: range.elementType }
                : emitScalar(conversion, lines, used)
          } finally {
            if (outer) localInputs.set(key, outer)
            else localInputs.delete(key)
            arrayValidityScope = outerValidity
            storedArrayInputScope = outerStoredArrayInput
            domainInputPreparation = outerPreparation
            preparationDepth = outerDepth
          }
          if (value.type !== range.elementType)
            throw new UnsupportedCheckRustExpression(
              'Range bound input requires its concrete scalar carrier',
            )
          const scalar = fresh('range_input_converted')
          const finished = fresh('range_input_finished')
          const decoded = fresh('range_input_decoded')
          destination.push(
            `if range_text_bound_present(${plan}.clone(),${upper}) {`,
            `    let ${text}=range_text_bound(${plan}.clone(),${upper});`,
            `    let ${initial}=make_bool_value(true);`,
            `    let mut ${status}:CheckOutcome=check_from_bool(${initial});`,
            ...indent(prepared),
            ...indent(lines),
            `    let ${scalar}=array_element_from_${rustValuePrefix(rustType(range.elementType))}(${ownedOperand(value)});`,
            ...(stored ? [`    let ${decoded}=range_stored_text_bound(${scalar});`] : []),
            `    let ${finished}=finish_domain_conversion(${stored ? decoded : scalar},${status});`,
            `    ${boundValue}=array_element_to_${prefix}(${finished});`,
            '};',
          )
          destination.push(
            `let ${element}=array_element_from_${prefix}(${ownedOperand({ name: boundValue, type: range.elementType })});`,
          )
          return element
        }
        const lower = bound(false, inner)
        if (!stored) {
          const unknown = fresh('range_input_unknown'),
            unknownElement = fresh('range_input_unknown_element')
          inner.push(
            `let ${unknown}=${rustValuePrefix(rustType(range.elementType))}_unknown();`,
            `let ${unknownElement}=array_element_from_${rustValuePrefix(rustType(range.elementType))}(${ownedOperand({ name: unknown, type: range.elementType })});`,
          )
          inner.push(
            `${result}=${finishHelper}(${plan}.clone(), ${metadata},${lower}.clone(),${unknownElement}${definition});`,
          )
        }
        const upperLines: string[] = []
        const upper = bound(true, upperLines)
        if (stored)
          inner.push(
            ...upperLines,
            `${result}=${finishHelper}(${plan}.clone(), ${metadata},${lower},${upper}${definition});`,
          )
        else
          inner.push(
            `if range_text_bound_continues(${lower}.clone()) {`,
            ...indent(upperLines),
            `    ${result}=${finishHelper}(${plan}.clone(), ${metadata},${lower},${upper}${definition});`,
            '};',
          )
        bindings.push(`if range_text_needs_bounds(${plan}.clone()) {`, ...indent(inner), '};')
        return { name: result, type }
      }
      return {
        name: bind(
          `range_from_text(${ownedOperand(operand)}, ${rustStringLiteral(range.identity)}, ${rustStringLiteral(range.subtype)}, ${arrayElementFamily(range.subtype)})`,
        ),
        type,
      }
    }
    if (node.kind === 'text-to-range') {
      const operand = emitScalar(node.operand, bindings, used)
      return emitRangeInput(operand, node.type, node.conversion, node.origin === 'stored')
    }
    const emitMultirangeInput = (
      operand: { name: string; type: string },
      type: string,
      conversion?: EvalExpression,
      stored = false,
    ) => {
      const multirange = multirangeTypeProfile(type)
      const signature = stored
        ? builtinTypeIO('pg_catalog.int4multirange')?.input
        : multirange?.multirangeInput
      const rangeSignature = stored
        ? builtinTypeIO('pg_catalog.int4range')?.input
        : multirange?.input
      if (
        signature !== builtinTypeIO('pg_catalog.int4multirange')?.input ||
        rangeSignature !== builtinTypeIO('pg_catalog.int4range')?.input
      )
        throw new UnsupportedCheckRustExpression(
          'Multirange input requires its selected catalog implementations',
        )
      const metadata = signature ? builtinMetadata(signature) : null
      const rangeInput = rangeSignature ? builtinMetadata(rangeSignature) : null
      const inputTypes = 'pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4'
      if (
        !multirange ||
        metadata?.kind !== 'function' ||
        metadata.schema !== 'pg_catalog' ||
        metadata.name !== 'multirange_in' ||
        metadata.args.join(',') !== inputTypes ||
        metadata.result !== 'pg_catalog.anymultirange' ||
        !metadata.strict ||
        metadata.volatility !== 's' ||
        metadata.returnsSet ||
        rangeInput?.kind !== 'function' ||
        rangeInput.schema !== 'pg_catalog' ||
        rangeInput.name !== 'range_in' ||
        rangeInput.args.join(',') !== inputTypes ||
        rangeInput.result !== 'pg_catalog.anyrange' ||
        !rangeInput.strict ||
        rangeInput.volatility !== 's' ||
        rangeInput.returnsSet ||
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type)
      )
        throw new UnsupportedCheckRustExpression(
          'Multirange input requires its captured multirange/range profiles and catalog I/O identities',
        )
      if (multirange.captured) {
        if (
          !conversion ||
          (stored &&
            multirange.multirangeOutput !== builtinTypeIO('pg_catalog.int4multirange')?.output)
        )
          throw new UnsupportedCheckRustExpression(
            'Custom multirange input requires its captured member conversion and I/O identities',
          )
        const initial = bind(`prepare_multirange_text(${ownedOperand(operand)})`)
        const cursor = fresh('multirange_input_cursor')
        bindings.push(`let mut ${cursor}:MultirangeTextPayload=${initial};`)
        const text = fresh('multirange_input_member')
        const key = JSON.stringify(['__pgsid_multirange_text_member', false])
        const outer = localInputs.get(key),
          outerValidity = arrayValidityScope,
          outerPreparation = domainInputPreparation,
          outerDepth = preparationDepth
        const body: string[] = [`let ${text}=multirange_text_member(&${cursor});`]
        localInputs.set(key, {
          name: '__pgsid_multirange_text_member',
          type: 'pg_catalog.text',
          rustName: text,
          rustType: 'TextValue',
        })
        arrayValidityScope = null
        domainInputPreparation = null
        preparationDepth = 0
        let member: { name: string; type: string }
        try {
          member = emitScalar(
            {
              kind: 'text-to-range',
              type: multirange.rangeType,
              operand: {
                kind: 'input',
                type: 'pg_catalog.text',
                name: '__pgsid_multirange_text_member',
              },
              conversion,
              ...(stored ? { origin: 'stored' } : {}),
            },
            body,
            used,
          )
        } finally {
          if (outer) localInputs.set(key, outer)
          else localInputs.delete(key)
          arrayValidityScope = outerValidity
          domainInputPreparation = outerPreparation
          preparationDepth = outerDepth
        }
        body.push(`${cursor}=append_multirange_text(${cursor},${ownedOperand(member)});`)
        bindings.push(`while multirange_text_has_member(&${cursor}) {`, ...indent(body), '}')
        const support = rangeProfileSupport(multirange, executionContext)
        const profile = bind(`make_range_support(${support.comparison},${support.canonical})`)
        return {
          name: bind(
            `${stored ? 'finish_multirange_stored_text' : 'finish_multirange_text'}(${cursor},${rustStringLiteral(multirange.multirange)},${rustStringLiteral(multirange.identity)},${rustStringLiteral(multirange.subtype)},${arrayElementFamily(multirange.elementType)},${profile})`,
          ),
          type,
        }
      }
      return {
        name: bind(
          `multirange_from_text(${ownedOperand(operand)}, ${rustStringLiteral(multirange.multirange)}, ${rustStringLiteral(multirange.identity)}, ${rustStringLiteral(multirange.subtype)}, ${arrayElementFamily(multirange.subtype)})`,
        ),
        type,
      }
    }
    if (node.kind === 'text-to-multirange') {
      const operand = emitScalar(node.operand, bindings, used)
      return emitMultirangeInput(operand, node.type, node.conversion, node.origin === 'stored')
    }
    if (node.kind === 'text-to-boolean') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      const input = io ? builtinMetadata(io) : null
      if (
        input?.kind !== 'function' ||
        input.args.join(',') !== 'pg_catalog.cstring' ||
        input.result !== node.type ||
        !input.strict ||
        input.volatility !== 'i' ||
        input.returnsSet ||
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type)
      )
        throw new UnsupportedCheckRustExpression('Boolean input requires a character value')
      return { name: bind(`scalar_boolean_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-enum') {
      const operand = emitScalar(node.operand, bindings, used)
      const input = node.enum.inputFunction ? builtinMetadata(node.enum.inputFunction) : null
      if (
        input?.kind !== 'function' ||
        input.schema !== 'pg_catalog' ||
        input.name !== 'enum_in' ||
        input.args.join(',') !== 'pg_catalog.cstring,pg_catalog.oid' ||
        !input.strict ||
        input.returnsSet ||
        (!node.literal && !node.enum.inputSources?.includes(operand.type)) ||
        enumType(node.enum) !== node.type ||
        node.enum.values.length > 2147483647 ||
        node.enum.values.some((label) => label.includes('\0')) ||
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type)
      )
        throw new UnsupportedCheckRustExpression(
          'Enum input requires captured labels and a character input',
        )
      return {
        name: bind(
          `scalar_enum_from_text(${ownedOperand(operand)}, ${rustStringLiteral(node.enum.values.join('\0'))}, ${node.enum.values.length})`,
        ),
        type: node.type,
      }
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
        name: bind(
          node.inputModifier === undefined
            ? `bit_from_text(${ownedOperand(operand)})`
            : `bit_from_text_modifier(${ownedOperand(operand)},${node.inputModifier},${node.type === 'pg_catalog.varbit'},${executionContext.serverEncoding === 'UTF8'})`,
        ),
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
      let intervalOutput = node.operand
      while (
        intervalOutput.kind === 'call' &&
        intervalOutput.call.kind === 'cast' &&
        intervalOutput.call.signature === null &&
        intervalOutput.call.type === 'pg_catalog.text' &&
        intervalOutput.operands.length === 1 &&
        scalarType(intervalOutput.operands[0]!) === 'pg_catalog.text'
      )
        intervalOutput = intervalOutput.operands[0]!
      if (
        node.kind === 'text-to-interval' &&
        intervalOutput.kind === 'io-to-text' &&
        intervalOutput.operand.kind === 'text-to-interval' &&
        intervalOutput.output === builtinTypeIO('pg_catalog."interval"')?.output
      ) {
        const original = intervalOutput.operand,
          operand = emitScalar(original.operand, bindings, used)
        if (operand.type !== 'pg_catalog.text')
          throw new UnsupportedCheckRustExpression('An interval round trip requires text')
        const firstFields = bind(
            `make_int4_value(${Math.floor((original.inputModifier ?? 32767 * 65536 + 65535) / 65536)})`,
          ),
          lastFields = bind(
            `make_int4_value(${Math.floor((node.inputModifier ?? 32767 * 65536 + 65535) / 65536)})`,
          )
        return {
          name: bind(
            `interval_text_roundtrip_context(${ownedOperand(operand)},${firstFields},${lastFields},${storedArrayInputScope ? 0 : intervalStyleCode(executionContext)})`,
          ),
          type: node.type,
        }
      }
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
      if (node.kind === 'text-to-interval') {
        const fields = bind(
          `make_int4_value(${Math.floor((node.inputModifier ?? 32767 * 65536 + 65535) / 65536)})`,
        )
        return {
          name: bind(
            `interval_from_text_fields_context(${ownedOperand(operand)},${fields},${storedArrayInputScope ? 0 : intervalStyleCode(executionContext)})`,
          ),
          type: node.type,
        }
      }
      return { name: bind(`${helper}(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'certain') {
      const value = node.expression
      if (value.kind === 'snapshot-storage') {
        if (!validSnapshotConstantStorage(value))
          throw new UnsupportedCheckRustExpression('Invalid captured snapshot payload')
        const bits = (word: string) => BigInt.asIntN(64, BigInt(word)).toString() + 'i64'
        let result = bind(`start_stored_snapshot(${bits(value.xmin)},${bits(value.xmax)})`)
        for (const word of value.xip)
          result = bind(`append_stored_snapshot(${result},${bits(word)})`)
        return { type: value.type, name: result }
      }
      if (value.kind === 'system-storage') {
        if (!validSystemConstantStorage(value))
          throw new UnsupportedCheckRustExpression('Invalid captured system payload')
        const wide = value.type === 'pg_catalog.xid8' || value.type === 'pg_catalog.pg_lsn',
          word = wide ? BigInt.asIntN(64, BigInt(value.value)).toString() : value.value,
          prefix = value.type.slice('pg_catalog.'.length)
        return {
          type: value.type,
          name: bind(`make_${prefix}_${wide ? 'bits' : 'value'}(${word}i64)`),
        }
      }
      if (value.kind === 'geometry-storage') {
        if (!validGeometryConstantStorage(value))
          throw new UnsupportedCheckRustExpression('Invalid captured geometry payload')
        const bits = (word: string) => BigInt.asIntN(64, BigInt('0x' + word)).toString() + 'i64',
          words = value.words.map(bits),
          type = value.type,
          prefix = type.slice('pg_catalog.'.length)
        if (type === 'pg_catalog.path' || type === 'pg_catalog.polygon') {
          let result: string
          if (type === 'pg_catalog.path') result = bind(`start_stored_path(${value.closed})`)
          else {
            const bounds = bind(`make_box_bits(${value.bounds!.map(bits).join(',')})`)
            result = bind(`start_stored_polygon(${bounds})`)
          }
          for (let i = 0; i < words.length; i += 2) {
            const point = bind(`make_point_bits(${words[i]},${words[i + 1]})`)
            result = bind(`append_stored_${prefix}_point(${result},${point})`)
          }
          return { type, name: result }
        }
        return {
          type,
          name: bind(
            `make_${type === 'pg_catalog.line' ? 'stored_line' : prefix}_bits(${words.join(',')})`,
          ),
        }
      }
      if (value.kind === 'temporal-storage') {
        if (!validTemporalConstantStorage(value))
          throw new UnsupportedCheckRustExpression('Invalid captured temporal payload')
        if (value.type === 'pg_catalog.date') {
          const days = value.value === '-2147483648' ? '-2147483647 - 1' : value.value
          return { name: bind(`make_stored_date_value(${days})`), type: value.type }
        }
        if (value.type === 'pg_catalog.timetz') {
          const zone = value.zone === -2147483648 ? '-2147483647 - 1' : String(value.zone)
          return { name: bind(`make_timetz_value(${value.value}i64,${zone})`), type: value.type }
        }
        if (value.type === 'pg_catalog."interval"') {
          const day = value.days === -2147483648 ? '-2147483647 - 1' : String(value.days),
            month = value.months === -2147483648 ? '-2147483647 - 1' : String(value.months)
          return {
            name: bind(`make_interval_value(${month},${day},${value.value}i64)`),
            type: value.type,
          }
        }
        const prefix =
          value.type === 'pg_catalog."time"'
            ? 'time'
            : value.type === 'pg_catalog."timestamp"'
              ? 'stored_timestamp'
              : 'stored_timestamptz'
        return { name: bind(`make_${prefix}_value(${value.value}i64)`), type: value.type }
      }
      if (value.kind === 'xml') {
        if (value.value === null) return { name: bind('xml_null()'), type: value.type }
        if (value.storage !== undefined)
          return {
            name: bind(`make_xml_value(${rustStringLiteral(value.storage)})`),
            type: value.type,
          }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return {
          name: bind(
            value.origin === 'stored'
              ? `xml_from_rendered_text(${text})`
              : `xml_from_text_context(${text},${executionContext.xmlOption === 'document' ? 1 : executionContext.xmlOption === 'content' ? 2 : 0},${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: value.type,
        }
      }
      if (value.kind === 'multirange') {
        if (value.value === null) return { name: bind('multirange_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return emitMultirangeInput({ name: text, type: 'pg_catalog.text' }, value.type)
      }
      if (value.kind === 'range') {
        if (value.value === null) return { name: bind('range_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return emitRangeInput({ name: text, type: 'pg_catalog.text' }, value.type)
      }
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
      if (value.kind === 'tsquery') {
        if (value.value === null) return { name: bind('tsquery_null()'), type: value.type }
        if (value.stored && value.storage) {
          const storage = value.storage
          if (!validTsqueryConstantStorage(storage))
            throw new UnsupportedCheckRustExpression('Invalid stored tsquery tree metadata')
          let payload = bind(`make_tsquery_payload(${storage.nativeBytes})`)
          for (const node of storage.nodes)
            payload = bind(
              `tsquery_append_node(${payload},${node.kind},${rustStringLiteral(node.text)},${node.weight},${node.prefix},${node.distance},${node.left},${node.right})`,
            )
          return { name: bind(`make_tsquery_value(${payload})`), type: value.type }
        }
        if (value.stored)
          throw new UnsupportedCheckRustExpression(
            'Stored tsquery constants require captured query trees',
          )
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return {
          name: bind(
            `tsquery_from_text_context(${text},${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: value.type,
        }
      }
      if (value.kind === 'tsvector') {
        if (value.value === null) return { name: bind('tsvector_null()'), type: value.type }
        if (value.stored && value.storage?.lexemes !== undefined) {
          const storage = value.storage
          if (!validStoredTsvectorValue(storage))
            throw new UnsupportedCheckRustExpression('Invalid stored tsvector value')
          let payload = bind(`make_stored_tsvector_payload(${storage.nativeBytes})`)
          for (const lexeme of storage.lexemes) {
            let word = bind(`make_stored_tsvector_lexeme(${rustStringLiteral(lexeme.text)})`)
            for (const position of lexeme.positions)
              word = bind(
                `tsvector_append_stored_position(${word},${position.position},${position.weight})`,
              )
            payload = bind(`tsvector_append_stored_lexeme(${payload},${word})`)
          }
          return { type: value.type, name: bind(`make_tsvector_value(${payload})`) }
        }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        const storage = value.stored ? value.storage : undefined
        if (
          storage &&
          (!Number.isInteger(storage.nativeBytes) ||
            storage.nativeBytes < 8 ||
            storage.nativeBytes > 1073741823 ||
            !Number.isInteger(storage.lexemeCount) ||
            storage.lexemeCount < 0 ||
            storage.lexemeCount > 1048575)
        )
          throw new UnsupportedCheckRustExpression('Invalid stored tsvector size metadata')
        return {
          name: bind(
            storage
              ? `tsvector_from_stored_text_native_context(${text},${executionContext.serverEncoding === 'UTF8'},${storage.nativeBytes},${storage.lexemeCount})`
              : `${value.stored ? 'tsvector_from_stored_text_context' : 'tsvector_from_text_context'}(${text},${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: value.type,
        }
      }
      if (value.kind === 'aclitem') {
        if (value.storage !== undefined) {
          const storage = value.storage
          if (!validAclitemConstantKnowledge(storage))
            throw new UnsupportedCheckRustExpression('Invalid stored ACL knowledge')
          return {
            type: value.type,
            name: bind(
              `make_aclitem_catalog_value(${storage.privileges}i64,${storage.grantOptions}i64,${storage.publicGrantee},${storage.invalidGrantor})`,
            ),
          }
        }
        if (value.value === null) return { name: bind('aclitem_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return {
          name: bind(
            `aclitem_from_text_context(${text},${executionContext.maxIdentifierBytes ?? -1},${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: value.type,
        }
      }
      if (value.kind === 'money') {
        if (value.value === null) return { name: bind('money_null()'), type: value.type }
        if (value.units !== undefined)
          return { name: bind(`make_money_value(${value.units}i64)`), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return {
          name: bind(`money_from_text_context(${text},${moneyTextCLocale(executionContext)})`),
          type: value.type,
        }
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
        if (value.stored) return { name: text, type: value.type }
        return {
          name: bind(
            `name_from_text_context(${text},${executionContext.maxIdentifierBytes ?? -1},${executionContext.serverEncoding === 'UTF8'})`,
          ),
          type: value.type,
        }
      }
      if (value.kind === 'internal-char') {
        if (value.byte !== undefined) {
          if (!Number.isInteger(value.byte) || value.byte < 0 || value.byte > 255)
            throw new UnsupportedCheckRustExpression('Invalid stored PostgreSQL char byte')
          return { name: bind(`make_internal_char_value(${value.byte})`), type: value.type }
        }
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
        if (value.storage !== undefined) {
          if (!validJsonpathConstantStorage(value.storage))
            throw new UnsupportedCheckRustExpression('Invalid stored JSONPath graph')
          let payload = bind(
            `make_stored_jsonpath_payload(${value.storage.lax},${value.storage.root})`,
          )
          for (const node of value.storage.nodes.slice(1))
            payload = bind(
              `append_stored_jsonpath_node(${payload},${node.kind},${node.next},${node.left},${node.right},${rustStringLiteral(node.text)},${node.first},${node.last},${node.flags})`,
            )
          return { name: bind(`make_stored_jsonpath_value(${payload})`), type: value.type }
        }
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
        if (value.stored) {
          if (!isOidAliasType(value.type) || value.value !== '0')
            throw new UnsupportedCheckRustExpression('Invalid stored OID alias sentinel')
          return { type: value.type, name: bind('make_oid_value(0i64)') }
        }
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
        return {
          name: bind(`make_${prefix}_${value.exact ? 'bits' : 'literal_bits'}(${literal})`),
          type: value.type,
        }
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
    if (node.kind === 'composite-coerce') {
      const profile = compositeProfile(node.type)
      if (!profile) throw new UnsupportedCheckRustExpression('Missing ancestor record profile')
      const operand = emitScalar(node.operand, bindings, used)
      if (node.mapping === null)
        return {
          name: bind(`invalid_composite_row_coercion(${ownedOperand(operand)})`),
          type: node.type,
        }
      let value = bind(
        `prepare_composite_row_coercion(${ownedOperand(operand)},${rustStringLiteral(profile.identity)})`,
      )
      for (const index of node.mapping) {
        const position = bind(`make_int4_value(${index})`),
          cell = bind(`composite_field_at(${ownedOperand(operand)},${position})`)
        value = bind(`append_composite_field(${value},${cell})`)
      }
      return { name: value, type: node.type }
    }
    if (node.kind === 'composite-field') {
      if (
        node.operand.kind === 'composite-constructor' &&
        node.operand.projectable[node.index] === null
      )
        throw new UnsupportedCheckRustExpression(
          'Composite projection requires captured field-expression collation identity',
        )
      if (node.operand.kind === 'composite-constructor' && node.operand.projectable[node.index]) {
        const outer: string | null = arrayValidityScope
        arrayValidityScope = null
        let selected: { name: string; type: string } | undefined
        try {
          for (const index of node.operand.physical?.discarded ?? [])
            prepareCompositeOperand(node.operand.physical!.operands[index]!)
          for (const [index, operand] of node.operand.operands.entries()) {
            if (index === node.index) selected = emitPreparedOperand(operand, bindings, used)
            else prepareCompositeOperand(operand)
          }
        } finally {
          arrayValidityScope = outer
        }
        if (!selected)
          throw new UnsupportedCheckRustExpression('Missing composite constructor field')
        return selected
      }
      const value = emitScalar(node.operand, bindings, used)
      const index = bind(`make_int4_value(${node.index})`)
      const cell = bind(`composite_field_at(${ownedOperand(value)},${index})`)
      return {
        name: bind(`array_element_to_${rustValuePrefix(rustType(node.type))}(${cell})`),
        type: node.type,
      }
    }
    if (node.kind === 'text-to-composite') {
      if (node.anonymous) {
        const operand = emitScalar(node.operand, bindings, used)
        return { name: bind(`record_anonymous_input(${ownedOperand(operand)})`), type: node.type }
      }
      const profile = compositeProfile(node.type)
      const definition = profile?.graph.definitions.find((n) => n.identity === profile.identity)
      const stored = node.origin === 'stored'
      const selected = stored ? definition?.output : definition?.input
      const io = selected ? builtinCallables().find((n) => callableIdentity(n) === selected) : null
      if (
        !profile ||
        !definition ||
        io?.kind !== 'function' ||
        io.schema !== 'pg_catalog' ||
        io.name !== (stored ? 'record_out' : 'record_in') ||
        !io.strict ||
        io.returnsSet ||
        io.volatility !== 's' ||
        io.args.join(',') !==
          (stored ? 'pg_catalog.record' : 'pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4') ||
        io.result !== (stored ? 'pg_catalog.cstring' : 'pg_catalog.record') ||
        definition.fields.length !== node.conversions.length
      )
        throw new UnsupportedCheckRustExpression(
          'Composite input requires captured record and field I/O identities',
        )
      const operand = emitScalar(node.operand, bindings, used)
      const populateScope =
        node.origin !== 'stored' && jsonPopulateInput?.text === operand.name
          ? jsonPopulateInput
          : null
      if (populateScope) {
        const value = fresh('json_populate_record'),
          nested: string[] = [],
          fallback: string[] = []
        const bindNested = (source: string): string => {
          const name = fresh('json_populate_nested')
          nested.push(`let ${name} = ${source};`)
          return name
        }
        const base = populateScope.base ?? bindNested('composite_null()')
        const initial = bindNested(
          `prepare_json_populate(${base}.clone(),${populateScope.input}.clone(),${rustStringLiteral(profile.identity)},${definition.fields.length},${executionContext.serverEncoding === 'UTF8'})`,
        )
        const state = renderJsonPopulateFields(initial, profile, node, nested, used)
        if (jsonPopulateHardError) {
          const hard = bindNested(`json_populate_nested_hard(&${state})`)
          nested.push(
            `${jsonPopulateHardError} = json_populate_hard_error(${jsonPopulateHardError},${hard});`,
          )
        }
        const populated = bindNested(`finish_json_populate(${state})`)
        const name = '__pgsid_json_record_text',
          key = JSON.stringify([name, false]),
          outer = localInputs.get(key),
          outerInput = jsonPopulateInput
        localInputs.set(key, {
          name,
          type: 'pg_catalog.text',
          rustName: operand.name,
          rustType: 'TextValue',
        })
        jsonPopulateInput = null
        let converted: { name: string; type: string }
        try {
          converted = emitScalar(
            { ...node, operand: { kind: 'input', type: 'pg_catalog.text', name } },
            fallback,
            used,
          )
        } finally {
          if (outer) localInputs.set(key, outer)
          else localInputs.delete(key)
          jsonPopulateInput = outerInput
        }
        bindings.push(
          `let mut ${value}:CompositeValue = composite_unknown();`,
          `if json_populate_record_object(${populateScope.input}.clone()) {`,
          ...indent(nested),
          `    ${value} = ${populated};`,
          '} else {',
          ...indent(fallback),
          `    ${value} = ${ownedOperand(converted)};`,
          '};',
        )
        return { name: value, type: node.type }
      }
      let plan = bind(
        `prepare_composite_text(${ownedOperand(operand)},${definition.fields.length})`,
      )
      for (const [index, conversion] of node.conversions.entries()) {
        const fieldType = compositeFieldType(profile, definition.fields[index]!.type)
        const declared = profile.graph.definitions.find(
          (n) => n.identity === definition.fields[index]!.type,
        )
        const physical = compositePhysicalType(profile, definition.fields[index]!.type)
        if (!fieldType)
          throw new UnsupportedCheckRustExpression('Missing composite field input carrier')
        if (node.origin !== 'stored') {
          const name =
            declared?.kind === 'd'
              ? 'domain_in'
              : physical?.kind === 'e'
                ? 'enum_in'
                : physical?.kind === 'c'
                  ? 'record_in'
                  : physical?.element && !isCatalogVectorType(arrayElementBaseType(fieldType))
                    ? 'array_in'
                    : null
          const selected = name
            ? builtinCallables().find(
                (n) =>
                  n.kind === 'function' &&
                  n.schema === 'pg_catalog' &&
                  n.name === name &&
                  n.args[0] === 'pg_catalog.cstring',
              )
            : null
          const expected = selected
            ? callableIdentity(selected)
            : (rangeTypeInput(fieldType) ?? builtinTypeIO(fieldType)?.input)
          if (!expected || declared?.input !== expected)
            throw new UnsupportedCheckRustExpression(
              'Composite field input requires its selected catalog implementation',
            )
        } else {
          const name =
            physical?.kind === 'e'
              ? 'enum_out'
              : physical?.kind === 'c'
                ? 'record_out'
                : physical?.element && !isCatalogVectorType(arrayElementBaseType(fieldType))
                  ? 'array_out'
                  : null
          const selected = name
            ? builtinCallables().find(
                (n) => n.kind === 'function' && n.schema === 'pg_catalog' && n.name === name,
              )
            : null
          const expected = selected
            ? callableIdentity(selected)
            : (rangeTypeOutput(fieldType) ?? builtinTypeIO(fieldType)?.output)
          if (!expected || physical?.output !== expected)
            throw new UnsupportedCheckRustExpression(
              'Stored composite fields require their selected catalog output implementation',
            )
        }
        const kind = rustType(fieldType),
          prefix = rustValuePrefix(kind),
          value = fresh('record_field_value')
        bindings.push(`let mut ${value}:${kind}=${prefix}_unknown();`)
        const text = fresh('record_field_text'),
          status = fresh('record_field_preparation'),
          start = fresh('record_field_start')
        const prepared: string[] = [],
          lines: string[] = []
        const key = JSON.stringify(['__pgsid_composite_text_field', false])
        const outer = localInputs.get(key),
          outerValidity = arrayValidityScope,
          outerPreparation = domainInputPreparation,
          outerDepth = preparationDepth,
          outerStored = storedArrayInputScope,
          outerXmlStorage = storedArrayXmlStorageScope
        localInputs.set(key, {
          name: '__pgsid_composite_text_field',
          type: 'pg_catalog.text',
          rustName: text,
          rustType: 'TextValue',
        })
        arrayValidityScope = null
        domainInputPreparation = { lines: prepared, status }
        preparationDepth = 0
        storedArrayInputScope = node.origin === 'stored' || outerStored
        storedArrayXmlStorageScope = node.xmlStorage === true || outerXmlStorage
        let converted: { name: string; type: string }
        try {
          converted = emitScalar(conversion, lines, used)
        } finally {
          if (outer) localInputs.set(key, outer)
          else localInputs.delete(key)
          arrayValidityScope = outerValidity
          domainInputPreparation = outerPreparation
          preparationDepth = outerDepth
          storedArrayInputScope = outerStored
          storedArrayXmlStorageScope = outerXmlStorage
        }
        const cell = fresh('record_field_cell'),
          finished = fresh('record_field_finished')
        bindings.push(
          `if composite_text_has_field(${plan}.clone()) {`,
          `    let ${text}=composite_text_field(${plan}.clone());`,
          `    let ${start}=make_bool_value(true);`,
          `    let mut ${status}:CheckOutcome=check_from_bool(${start});`,
          ...indent(prepared),
          ...indent(lines),
          `    let ${cell}=array_element_from_${prefix}(${ownedOperand(converted)});`,
          `    let ${finished}=finish_domain_conversion(${cell},${status});`,
          `    ${value}=array_element_to_${prefix}(${finished});`,
          '}',
        )
        const element = bind(
          `array_element_from_${prefix}(${ownedOperand({ name: value, type: fieldType })})`,
        )
        const decoded =
          node.origin === 'stored' ? bind(`range_stored_text_bound(${element})`) : element
        plan = bind(`append_composite_text(${plan},${decoded},${node.origin === 'stored'})`)
      }
      return {
        name: bind(`finish_composite_text(${plan},${rustStringLiteral(profile.identity)})`),
        type: node.type,
      }
    }
    if (node.kind === 'composite-to-text') {
      const type = scalarType(node.operand),
        profile = compositeProfile(type),
        anonymous = anonymousRecordProfile(type)
      const definition = profile?.graph.definitions.find((n) => n.identity === profile.identity)
      const outputIdentity = anonymous
        ? builtinTypeIO('pg_catalog.record')?.output
        : definition?.output
      const io = outputIdentity
        ? builtinCallables().find((n) => callableIdentity(n) === outputIdentity)
        : null
      if (
        ((!profile || !definition) && !anonymous) ||
        io?.kind !== 'function' ||
        io.schema !== 'pg_catalog' ||
        io.name !== 'record_out' ||
        !io.strict ||
        io.returnsSet ||
        io.volatility !== 's' ||
        io.args.join(',') !== 'pg_catalog.record' ||
        io.result !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Composite output requires its captured record I/O identity',
        )
      const operand = emitScalar(node.operand, bindings, used)
      if (anonymous)
        return { name: renderAnonymousRecordOutput(operand, bindings), type: node.type }
      if (!profile || !definition)
        throw new UnsupportedCheckRustExpression('Composite output requires its captured layout')
      let output = bind(
        `prepare_composite_output(${ownedOperand(operand)},${rustStringLiteral(profile.identity)},${definition.fields.length})`,
      )
      for (const [index, field] of definition.fields.entries()) {
        const fieldType = compositeFieldType(profile, field.type),
          physical = compositePhysicalType(profile, field.type)
        if (!fieldType || !physical)
          throw new UnsupportedCheckRustExpression('Missing composite output field carrier')
        const lines: string[] = [],
          position = fresh('record_output_position'),
          cell = fresh('record_output_cell'),
          scalar = fresh('record_output_scalar'),
          rendered = fresh('record_output_text')
        lines.push(
          `let ${position}=make_int4_value(${index});`,
          `let ${cell}=composite_field_at(${ownedOperand(operand)},${position});`,
        )
        let result: string
        if (usesTypedRangeOutput(rangeTypeProfile(fieldType) ?? multirangeTypeProfile(fieldType))) {
          if (physical.output !== rangeTypeOutput(fieldType))
            throw new UnsupportedCheckRustExpression(
              'Composite range field output requires its captured implementation',
            )
          result = renderTypedOutput(cell, fieldType, lines)
        } else if (compositeProfile(fieldType) || fieldType.startsWith('array:')) {
          const prefix = rustValuePrefix(rustType(fieldType)),
            name = '__pgsid_composite_output_field',
            key = JSON.stringify([name, false]),
            outer = localInputs.get(key)
          lines.push(`let ${scalar}=array_element_to_${prefix}(${cell});`)
          localInputs.set(key, {
            name,
            type: fieldType,
            rustName: scalar,
            rustType: rustType(fieldType),
          })
          try {
            const value = emitScalar(
              compositeProfile(fieldType)
                ? {
                    kind: 'composite-to-text',
                    type: 'pg_catalog.text',
                    operand: { kind: 'input', type: fieldType, name },
                  }
                : {
                    kind: 'array-to-text',
                    type: 'pg_catalog.text',
                    operand: { kind: 'input', type: fieldType, name },
                    elementType: fieldType.slice(6) as ArrayElementType,
                    output: physical.output!,
                    ...(physical.element &&
                    compositePhysicalType(profile, physical.element)?.kind === 'e'
                      ? {
                          enum: (() => {
                            const n = compositePhysicalType(profile, physical.element!)!
                            return {
                              schema: n.schema,
                              name: n.name,
                              values: n.enumLabels ?? [],
                              outputFunction: n.output ?? undefined,
                            }
                          })(),
                        }
                      : {}),
                  },
              lines,
              used,
            )
            result = value.name
          } finally {
            if (outer) localInputs.set(key, outer)
            else localInputs.delete(key)
          }
        } else {
          const enumDefinition =
            physical.kind === 'e'
              ? {
                  schema: physical.schema,
                  name: physical.name,
                  values: physical.enumLabels ?? [],
                  outputFunction: physical.output ?? undefined,
                }
              : undefined
          const conversion = arrayElementOutput(
            fieldType,
            enumDefinition,
            cell,
            scalar,
            executionContext,
          )
          if (
            physical.output !==
            (enumDefinition?.outputFunction ??
              rangeTypeOutput(fieldType) ??
              builtinTypeIO(fieldType)?.output)
          )
            throw new UnsupportedCheckRustExpression(
              'Composite field output requires its selected catalog implementation',
            )
          if (conversion.scalarRequired)
            lines.push(`let ${scalar}=array_element_to_${conversion.prefix}(${cell});`)
          result =
            fieldType === 'pg_catalog.jsonb'
              ? `jsonb_text_context(${scalar},${executionContext.serverEncoding === 'UTF8'})`
              : conversion.conversion
        }
        const value = fresh('record_output_field')
        bindings.push(
          `let mut ${value}:TextValue=text_unknown();`,
          `if composite_output_has_field(${output}.clone()) {`,
          ...indent(lines),
          `    let ${rendered}=${result};`,
          `    ${value}=${rendered};`,
          '}',
        )
        output = bind(`append_composite_output(${output},${value},${index === 0})`)
      }
      return { name: bind(`finish_composite_output(${output})`), type: node.type }
    }
    if (node.kind === 'composite-null') return { name: bind('composite_null()'), type: node.type }
    if (node.kind === 'composite-constructor') {
      for (const index of node.physical?.discarded ?? [])
        prepareCompositeOperand(node.physical!.operands[index]!)
      const profile = compositeProfile(node.type)
      const anonymous = anonymousRecordProfile(node.type)
      const identity =
        profile?.identity ??
        anonymous?.find((layout) => layout.identity === node.anonymousIdentity)?.identity
      if (!identity)
        throw new UnsupportedCheckRustExpression('Missing composite constructor profile')
      const operands = node.operands.map((operand) => emitPreparedOperand(operand, bindings, used))
      let value = bind(`make_composite_fields(${rustStringLiteral(identity)})`)
      for (const operand of operands) {
        const cell = bind(
          `array_element_from_${rustValuePrefix(rustType(operand.type))}(${ownedOperand(operand)})`,
        )
        value = bind(`append_composite_field(${value},${cell})`)
      }
      return { name: value, type: node.type }
    }
    if (
      node.kind === 'null-test' &&
      !node.datum &&
      (compositeProfile(scalarType(node.operand)) ||
        anonymousRecordProfile(scalarType(node.operand)))
    ) {
      if (
        node.operand.kind === 'composite-constructor' &&
        !node.operand.wholeRow &&
        !constantScalarExpression(node.operand)
      ) {
        const profile = compositeProfile(node.operand.type)
        const definition = profile?.graph.definitions.find(
          (node) => node.identity === profile.identity,
        ) ?? {
          attributeCount: node.operand.operands.length,
          fields: node.operand.operands.map((_, index) => ({ position: index + 1 })),
        }
        if (
          typeof definition.attributeCount !== 'number' ||
          !Number.isInteger(definition.attributeCount) ||
          definition.attributeCount < definition.fields.length ||
          definition.attributeCount > 2147483647 ||
          definition.fields.some(
            (field) =>
              !Number.isInteger(field.position) ||
              field.position < 1 ||
              field.position > definition.attributeCount!,
          ) ||
          new Set(definition.fields.map((field) => field.position)).size !==
            definition.fields.length
        )
          throw new UnsupportedCheckRustExpression(
            'Composite constructor NULL tests require physical attribute counts',
          )
        for (const operand of node.operand.physical?.operands ?? node.operand.operands)
          prepareCompositeOperand(operand)
        const operands: EvalExpression[] = []
        const rowOperands = node.operand.operands
        const physical =
          node.operand.physical?.operands ??
          Array.from({ length: definition.attributeCount }, (_, index) => {
            const field = definition.fields.findIndex((field) => field.position === index + 1)
            return field >= 0
              ? rowOperands[field]!
              : {
                  kind: 'certain' as const,
                  expression: {
                    kind: 'integer' as const,
                    type: 'pg_catalog.int4' as const,
                    value: null,
                  },
                }
          })
        for (const operand of physical) {
          operands.push({
            kind: 'null-test',
            type: 'pg_catalog.bool',
            negated: node.negated,
            datum: true,
            operand,
          })
        }
        const ordered = [
          ...operands.filter((operand) => constantScalarExpression(operand)),
          ...operands.filter((operand) => !constantScalarExpression(operand)),
        ]
        const conjunction = ordered.reduce<EvalExpression | null>(
          (left, right) =>
            left
              ? {
                  kind: 'boolean-logic',
                  type: 'pg_catalog.bool',
                  operation: 'and',
                  operands: [left, right],
                }
              : right,
          null,
        )
        return conjunction
          ? emitScalar(conjunction, bindings, used)
          : { name: bind('make_bool_value(true)'), type: node.type }
      }
      const value = emitScalar(node.operand, bindings, used)
      return {
        name: bind(
          `composite_row_is_${node.negated ? 'not_null' : 'null'}(${ownedOperand(value)})`,
        ),
        type: node.type,
      }
    }
    if (node.kind === 'null-test') {
      if (
        node.operand.kind === 'input' &&
        !localInputs.has(JSON.stringify([node.operand.name, false])) &&
        !compositeProfile(node.operand.type) &&
        !node.operand.type.startsWith('enum:') &&
        !isOidType(node.operand.type) &&
        !isRangeType(node.operand.type) &&
        !isMultirangeType(node.operand.type) &&
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
          'pg_catalog.tsvector',
          'pg_catalog.tsquery',
          'pg_catalog.aclitem',
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
          'pg_catalog.xml',
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
        node.call.signature ===
          builtinCast('pg_catalog."interval"', 'pg_catalog."interval"')?.implementation &&
        node.operands.length === 2 &&
        node.operands[0]?.kind === 'text-to-interval'
      ) {
        const original = node.operands[0],
          operand = emitScalar(original.operand, bindings, used),
          modifier = emitScalar(node.operands[1]!, bindings, used)
        if (operand.type !== 'pg_catalog.text' || modifier.type !== 'pg_catalog.int4')
          throw new UnsupportedCheckRustExpression('Interval precision requires text and int4')
        const fields = bind(
          `make_int4_value(${Math.floor((original.inputModifier ?? 32767 * 65536 + 65535) / 65536)})`,
        )
        const selected = builtinMetadata(node.call.signature!)
        if (selected.kind !== 'function')
          throw new UnsupportedCheckRustExpression('Interval precision requires its function')
        callables.add(selected.rustName)
        return {
          name: bind(
            `interval_text_precision_context(${ownedOperand(operand)},${fields},${modifier.name},${storedArrayInputScope ? 0 : intervalStyleCode(executionContext)})`,
          ),
          type: 'pg_catalog."interval"',
        }
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
        declareConstant(guard, 'CheckOutcome', 'check_unknown()')
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
          declareConstant(name, kind, `${prefix}_unknown()`)
          preparationLines.push(`${name} = ${ownedOperand(value)};`)
          carryPreparedRequirement(name, value, preparationLines)
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
        const requirement = diagnostics.declared(name, bindings, '0')
        const selectedRequirement = diagnostics.reason(value, lines)
        bindings.push(
          `let mut ${name}: ${kind} = ${prefix}_null();`,
          `if case_guard_takes(${guard}) == false {`,
          ...indent(lines),
          `    ${name} = ${ownedOperand(value)};`,
          ...(diagnostics.enabled
            ? [
                `    ${requirement} = ${selectedRequirement === '-1' || selectedRequirement === '0' ? `check_requirement_code(${selectedRequirement})` : selectedRequirement};`,
              ]
            : []),
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
      if (node.dimensions !== undefined && node.multidimensional)
        throw new UnsupportedCheckRustExpression('Explicit array dimensions require flat cells')
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
        `${node.multidimensional ? 'make_array_children' : 'make_array_arguments'}(${rustStringLiteral(arrayElementIdentity(node.elementType))}, ${family})`,
      )
      for (const dimension of node.dimensions ?? [])
        builder = bind(
          `append_array_dimension(${builder}, ${dimension.lower}, ${dimension.length})`,
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
        `${node.multidimensional ? 'finish_array_children' : node.dimensions !== undefined ? 'finish_array_arguments' : 'finish_array_constructor'}(${builder})`,
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
      const result = { name: bind(`bool_from_check(${outcome.name})`), type: node.type }
      if (diagnostics.enabled)
        diagnostics.set(
          result.name,
          diagnostics.filtered(result, diagnostics.reference(outcome.name), bindings),
        )
      return result
    }
    if (node.kind === 'distinct') {
      const operands = node.operands.map((operand) => emitPreparedOperand(operand, bindings, used))
      const nulls = operands.map((operand) => {
        const helper = rustValuePrefix(rustType(operand.type)) + '_is_null'
        return bind(`${helper}(${ownedOperand(operand)})`)
      })
      const name = fresh('distinct_result')
      const inputRequirement = diagnostics.merge(operands, bindings)
      const requirement = diagnostics.declared(name, bindings, inputRequirement)
      bindings.push(`let mut ${name}: CheckOutcome = distinct_nulls_finish(${nulls.join(', ')});`)
      const lines: string[] = []
      const comparison = emitCall(node.comparison, operands, lines)
      const outcome = fresh('distinct_comparison')
      const comparisonRequirement = diagnostics.reason(comparison, lines)
      bindings.push(
        `if distinct_needs_comparison(${nulls.join(', ')}) {`,
        ...indent(lines),
        `    let ${outcome} = check_from_bool(${comparison.name});`,
        `    ${name} = not_finish(${outcome});`,
        ...(diagnostics.enabled ? [`    ${requirement} = ${comparisonRequirement};`] : []),
        '}',
      )
      const result = node.negated ? bind(`not_finish(${name})`) : name
      const value = { name: bind(`bool_from_check(${result})`), type: node.type }
      if (diagnostics.enabled)
        diagnostics.set(value.name, diagnostics.filtered(value, requirement, bindings))
      return value
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
      if (arrayLikeElementType(array.type) !== node.elementType)
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
        [subject.type, arrayElementBaseType(node.elementType)],
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
          [subject, { name: value, type: arrayElementBaseType(node.elementType) }],
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
      if (outer && preparationDepth === 0) {
        bindings.push(`${outer} = array_validity_finish(${outer}, ${validity});`)
        appendValidityRequirement(outer, validity, diagnostics.reference(validity), bindings)
      }
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
            ...indent(validityRequirementLines(outer, possible, diagnostics.reference(validity))),
            `} else {`,
            `    ${outer} = array_validity_finish(${outer}, ${validity});`,
            ...indent(validityRequirementLines(outer, validity, diagnostics.reference(validity))),
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
          const type = [
            'pg_catalog.anyenum',
            'pg_catalog.anyarray',
            'pg_catalog.anyrange',
            'pg_catalog.anymultirange',
            'pg_catalog.record',
          ].includes(metadata.args[index]!)
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
        declareConstant(name, kind, `${prefix}_unknown()`)
        const nullness = fresh('prepared_nullness')
        const guard = fresh('prepared_null_guard')
        const lines = [
          ...operand.preparation,
          ...operand.lines,
          `${name} = ${ownedOperand(operand.value)};`,
          `let ${nullness} = ${prefix}_is_null(${ownedOperand({ name, type: node.type })});`,
          `let ${guard} = check_from_bool(${nullness});`,
        ]
        carryPreparedRequirement(name, operand.value, lines)
        lines.push(
          ...preparationFinishLines(guard, diagnostics.reference(name)),
          `if case_guard_takes(${guard}) {`,
          ...indent(rest),
          '};',
        )
        operand.value = { name, type: node.type }
        operand.lines = []
        return lines
      }
      preparationLines.push(...prepareOperand(0))
      const first = operands[0]!.value
      bindings.push(...operands[0]!.lines)
      if (node.operands.length === 1) return first
      const name = fresh('coalesce_result')
      const firstRequirement = diagnostics.reason(first, bindings)
      const requirement = diagnostics.declared(name, bindings, firstRequirement)
      bindings.push(`let mut ${name}: ${kind} = ${ownedOperand(first)};`)
      for (const [index, operand] of operands.slice(1).entries()) {
        const nullness = bind(
          `${prefix}_is_null(${
            [
              'JsonValue',
              'JsonbValue',
              'JsonpathValue',
              'XmlValue',
              'ArrayValue',
              'TsvectorValue',
              'TsqueryValue',
              'SnapshotValue',
              'RangeValue',
              'MultirangeValue',
              'CompositeValue',
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
        const nextRequirement = diagnostics.reason(operand.value, operand.lines)
        bindings.push(
          `if case_guard_takes(${guard}) {`,
          ...indent(operand.lines),
          ...(diagnostics.enabled ? [`    ${requirement} = ${nextRequirement};`] : []),
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
      const requirement = diagnostics.declared(name, bindings)
      bindings.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
      const branchLines = (position: number): string[] => {
        const lines: string[] = []
        if (position === node.branches.length) {
          const otherwise = emitScalar(node.otherwise, lines, used)
          if (otherwise.type !== node.type)
            throw new UnsupportedCheckRustExpression('CASE result type mismatch')
          const reason = diagnostics.reason(otherwise, lines)
          return [
            ...lines,
            `${name} = ${ownedOperand(otherwise)};`,
            ...(diagnostics.enabled ? [`${requirement} = ${reason};`] : []),
          ]
        }
        const branch = node.branches[position]!
        const when =
          node.scrutinee?.binding && constantScalarExpression(node.scrutinee.expression)
            ? caseBoundExpression(node, branch.when)
            : branch.when
        let condition = emitScalar(when, lines, used)
        if (scrutinee && node.scrutinee && !node.scrutinee.binding) {
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
          constantScalarExpression(caseBoundExpression(node, branch.when)) &&
            (!node.scrutinee || constantScalarExpression(node.scrutinee.expression)),
          lines,
          guard,
          selectedPreparation.lines,
          otherwise.lines,
        )
        const conditionGuard = prepared ?? guard
        const conditionRequirement = prepared
          ? 'check_requirement_code(-1)'
          : diagnostics.reason(condition, lines)
        const selectedRequirement = diagnostics.reason(selected, selectedLines)
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
          ...(diagnostics.enabled ? [`    ${requirement} = ${conditionRequirement};`] : []),
          `} else if case_guard_takes(${conditionGuard}) {`,
          ...indent(selectedLines),
          `    ${name} = ${ownedOperand(selected)};`,
          ...(diagnostics.enabled ? [`    ${requirement} = ${selectedRequirement};`] : []),
          '} else {',
          ...indent(otherwise.value),
          '};',
        ]
      }
      const binding = node.scrutinee?.binding,
        key = binding ? JSON.stringify([binding, false]) : undefined,
        outer = key ? localInputs.get(key) : undefined
      if (key && binding && scrutinee)
        localInputs.set(key, {
          name: binding,
          type: scrutinee.type,
          rustName: scrutinee.name,
          rustType: rustType(scrutinee.type),
        })
      let branches: ReturnType<typeof capturePreparation<string[]>>
      try {
        branches = capturePreparation(() => branchLines(0))
      } finally {
        if (key) {
          if (outer) localInputs.set(key, outer)
          else localInputs.delete(key)
        }
      }
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
    const outer: string | null = arrayValidityScope
    if (outer !== null && constantCheckExpression(node)) arrayValidityScope = null
    try {
      const value = emitWithValidity(node)
      diagnostics.outcome(value.name, diagnostics.reference(value.name), value.lines)
      return value
    } finally {
      arrayValidityScope = outer
    }
  }
  const emitWithValidity = (node: EvalBoolExpression): Emitted => {
    if (node.kind === 'eval-test') {
      const operand = emit(node.operand)
      const tested = fresh('test_result')
      const name = node.negated ? fresh('negated_test_result') : tested
      diagnostics.set(name, diagnostics.reference(operand.name))
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
        diagnostics.set(name, diagnostics.reference(operand.name))
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
          ...indent(
            validityRequirementLines(outerValidity, possible, diagnostics.reference(rightValidity)),
          ),
          `} else {`,
          `    ${outerValidity} = array_validity_finish(${outerValidity}, ${rightValidity});`,
          ...indent(
            validityRequirementLines(
              outerValidity,
              rightValidity,
              diagnostics.reference(rightValidity),
            ),
          ),
          '};',
        )
      }
      const diagnosticLines: string[] = []
      const leftRequirement = diagnostics.enabled ? fresh('left_requirement') : '0'
      if (diagnostics.enabled)
        diagnosticLines.push(
          `let ${leftRequirement} = check_requirement_for_outcome(${leftName}, ${leftName === left.name ? diagnostics.reference(left.name) : '-1'});`,
        )
      const requirement = diagnostics.declared(name, diagnosticLines, leftRequirement)
      if (diagnostics.enabled)
        rightLines.push(
          `${requirement} = check_requirement_merge(${leftRequirement}, ${diagnostics.reference(right.name)});`,
        )
      return {
        lines: [
          ...leftLines,
          ...diagnosticLines,
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
      const initialLines: string[] = []
      const requirement = diagnostics.declared(name, initialLines)
      const used = new Set<string>()
      const branchLines = (position: number): string[] => {
        if (position === node.branches.length) {
          const otherwise = emit(node.otherwise)
          for (const input of otherwise.inputs) used.add(input)
          return [
            ...otherwise.lines,
            `${name} = ${otherwise.name};`,
            ...(diagnostics.enabled
              ? [`${requirement} = ${diagnostics.reference(otherwise.name)};`]
              : []),
          ]
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
          ...(diagnostics.enabled
            ? [
                `    ${requirement} = ${prepared ? 'check_requirement_code(-1)' : diagnostics.reference(condition.name)};`,
              ]
            : []),
          `} else if case_guard_takes(${guard}) {`,
          ...indent(selected.lines),
          `    ${name} = ${selected.name};`,
          ...(diagnostics.enabled
            ? [`    ${requirement} = ${diagnostics.reference(selected.name)};`]
            : []),
          '} else {',
          ...indent(otherwise.value),
          '};',
        ]
      }
      return {
        lines: [
          ...initialLines,
          `let mut ${name}: CheckOutcome = check_unknown();`,
          ...branchLines(0),
        ],
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
      diagnostics.set(name, diagnostics.reason(result, bindings))
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
      diagnostics.set(name, diagnostics.reason(result, bindings))
      return {
        lines: [...bindings, `let ${name} = check_from_bool(${result.name});`],
        name,
        inputs: used,
      }
    }
    if (node.kind === 'uncertain') {
      const name = fresh('unknown_result')
      if (node.preparation !== 'runtime') prepareOpaque()
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
  const validityDiagnosticLines: string[] = []
  const validityRequirement = diagnostics.declared(validity, validityDiagnosticLines, '0')
  arrayValidityScope = validity
  const emitted = emit(expression)
  arrayValidityScope = null
  const validated = fresh('validated_expression')
  const entryRequirement = diagnostics.enabled ? fresh('entry_requirement') : '0'
  const entry = {
    ...emitted,
    name: validated,
    lines: [
      `let ${validityStart} = make_bool_value(true);`,
      `let mut ${validity}: CheckOutcome = check_from_bool(${validityStart});`,
      ...validityDiagnosticLines,
      ...emitted.lines,
      `let mut ${validated}: CheckOutcome = ${emitted.name};`,
      `if case_guard_stops(${validity}) {`,
      `    ${validated} = ${validity};`,
      '};',
      ...(diagnostics.enabled
        ? [
            `${entryRequirement} = ${diagnostics.reference(emitted.name)};`,
            `if case_guard_stops(${validity}) { ${entryRequirement} = check_requirement_merge(${validityRequirement}, ${entryRequirement}); };`,
          ]
        : []),
    ],
  }
  let lines = entry.lines
  let resultName = entry.name
  if (constantLines.length || literalLines.length || preparationOnly) {
    const start = fresh('preparation_start')
    resultName = fresh('prepared_result')
    const observed: string[] = []
    if (preparationOnly)
      for (const binding of constantBindings) {
        const nullness = fresh('prepared_binding_nullness')
        const status = fresh('prepared_binding_status')
        const owned = [
          'JsonValue',
          'JsonbValue',
          'JsonpathValue',
          'XmlValue',
          'ArrayValue',
          'TsvectorValue',
          'TsqueryValue',
          'SnapshotValue',
          'RangeValue',
          'MultirangeValue',
          'CompositeValue',
          'PolygonValue',
          'PathValue',
          'TextValue',
          'ByteaValue',
          'BitValue',
          'NumericValue',
        ].includes(binding.type)
        const argument = binding.name + (owned ? '.clone()' : '')
        observed.push(
          `let ${nullness} = ${binding.type === 'CheckOutcome' ? 'bool_from_check' : rustValuePrefix(binding.type) + '_is_null'}(${argument});`,
          `let ${status} = array_value_validity(${nullness}, true);`,
          ...preparationFinishLines(status),
        )
      }
    const domainPreparationLines = domainPreparationState
      ? [
          `${preparationState} = array_validity_finish(${domainPreparationState}, ${preparationState});`,
          ...validityRequirementLines(preparationState, domainPreparationState, '-1'),
        ]
      : []
    lines = [
      ...constantDeclarations,
      ...preparationDiagnosticDeclarations,
      `let ${start} = make_bool_value(true);`,
      `let mut ${preparationState}: CheckOutcome = check_from_bool(${start});`,
      ...(domainPreparationState ? [`${domainPreparationState} = ${preparationState};`] : []),
      ...literalLines,
      ...constantLines,
      ...observed,
      ...(hasPreparedXml && domainPreparationLines.length
        ? [
            `if case_guard_stops(${preparationState}) == false {`,
            ...indent(domainPreparationLines),
            '};',
          ]
        : domainPreparationLines),
      `let mut ${resultName}: CheckOutcome = ${preparationState};`,
      ...(diagnostics.enabled ? [`${entryRequirement} = ${preparationRequirement};`] : []),
      ...(preparationOnly
        ? []
        : [
            `if case_guard_stops(${preparationState}) == false {`,
            ...indent(entry.lines),
            `    ${resultName} = ${entry.name};`,
            '}',
          ]),
    ]
  }
  let source: string
  const diagnosticEntryName = diagnostics.enabled
    ? /_h[a-z0-9]{4}$/u.test(entryName)
      ? entryName.replace(/(_h[a-z0-9]{4})$/u, '_diagnostic$1')
      : entryName + '_diagnostic'
    : undefined
  if (diagnosticEntryName) {
    const finished = fresh('final_requirement')
    const detailLines = [
      `let mut ${entryRequirement}:i32 = check_requirement_code(-1);`,
      ...lines,
      `let ${finished} = check_requirement_for_outcome(${resultName}, ${entryRequirement});`,
    ]
    source =
      `pub fn ${entryName}(${parameters(entry.inputs)}) -> CheckOutcome {\n    let result = ${diagnosticEntryName}(${ordered(
        entry.inputs,
      )
        .map((item) => item.rustName)
        .join(', ')});\n    check_evaluation_outcome(result)\n}\n` +
      `pub fn ${diagnosticEntryName}(${parameters(entry.inputs)}) -> CheckEvaluationResult {\n${indent(detailLines).join('\n')}\n    make_check_evaluation_result(${resultName}, ${finished})\n}\n`
  } else
    source = `pub fn ${entryName}(${parameters(entry.inputs)}) -> CheckOutcome {\n${indent(lines).join('\n')}\n    ${resultName}\n}\n`
  return {
    source: source + domainHelpers.join('\n'),
    entryName,
    ...(diagnosticEntryName ? { diagnosticEntryName } : {}),
    inputs: ordered(entry.inputs),
    callables: [...callables],
    requiresRegex,
  }
}
