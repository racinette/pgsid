import { isIdentifierQuote } from '../../sql-semantics/identifier-quote.js'
import {
  arrayElementBaseType,
  arrayLikeElementType,
  isArrayLikeType,
} from '../../sql-semantics/expressions.js'
import { anonymousRecordProfile } from '../../sql-semantics/anonymous-records.js'
import { rangeTypeProfile, multirangeTypeProfile } from '../../sql-semantics/range-profiles.js'
import { compositeProfile, compositeFieldType } from '../../sql-semantics/composite-profiles.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import type { CheckExecutionContext } from './check-rust-evaluator.js'
import { floatMathLibrary, trigonometryContext } from './check-trigonometry-context.js'
import { builtinCallables } from '../../postgres/builtins/inventory.js'
import { callableIdentity } from '../../postgres/builtins/catalog.js'
import {
  isCollationMetadataCallable,
  isTypeFormatCallable,
} from '../../sql-semantics/metadata-callables.js'
import {
  isTemporalContextArithmetic,
  isTemporalContextCast,
  isTemporalContextComparison,
  isTemporalLocalTimezone,
  isTemporalInstantConstructor,
  isTemporalInstantPeriod,
  isTemporalInstantAge,
  isTemporalCurrentAge,
  isTemporalDatePart,
  isTemporalTimestampFormatting,
  isTemporalTemplateParsing,
  isTemporalSessionTruncation,
  isTemporalSessionExtraction,
  isTemporalClockZoneLookup,
  isTemporalExplicitZoneLookup,
} from '../../sql-semantics/temporal-casts.js'

const temporalCasts = new Set(
  builtinCallables()
    .filter(
      (item) =>
        isTemporalContextCast(item) ||
        isTemporalContextComparison(item) ||
        isTemporalLocalTimezone(item) ||
        isTemporalInstantConstructor(item) ||
        isTemporalInstantPeriod(item) ||
        isTemporalInstantAge(item) ||
        isTemporalTemplateParsing(item) ||
        (isTemporalTimestampFormatting(item) && item.args[0] === 'pg_catalog.timestamptz') ||
        isTemporalContextArithmetic(item) ||
        isTemporalSessionTruncation(item) ||
        isTemporalSessionExtraction(item) ||
        isTemporalExplicitZoneLookup(item),
    )
    .map(callableIdentity),
)
const catalogMetadata = new Set(
  builtinCallables()
    .filter((item) => isTypeFormatCallable(item) || isCollationMetadataCallable(item))
    .map(callableIdentity),
)
const temporalCurrentAge = new Set(
  builtinCallables().filter(isTemporalCurrentAge).map(callableIdentity),
)
const temporalTimestampFormats = new Set(
  builtinCallables()
    .filter((item) => isTemporalTimestampFormatting(item) || isTemporalTemplateParsing(item))
    .map(callableIdentity),
)
const temporalTemplateParsers = new Set(
  builtinCallables().filter(isTemporalTemplateParsing).map(callableIdentity),
)
const temporalExplicitZones = new Set(
  builtinCallables()
    .filter(
      (item) =>
        isTemporalExplicitZoneLookup(item) ||
        (isTemporalLocalTimezone(item) && item.args[0] === 'pg_catalog.timetz'),
    )
    .map(callableIdentity),
)
const temporalDateParts = new Set(
  builtinCallables().filter(isTemporalDatePart).map(callableIdentity),
)
const temporalSessionUnits = new Set(
  builtinCallables()
    .filter((item) => isTemporalSessionTruncation(item) || isTemporalSessionExtraction(item))
    .map(callableIdentity),
)
const instantConstructorZones = new Set(
  builtinCallables()
    .filter((item) => isTemporalInstantConstructor(item) && item.args.length === 7)
    .map(callableIdentity),
)
const clockZoneLookups = new Set(
  builtinCallables()
    .filter(
      (item) =>
        isTemporalClockZoneLookup(item) ||
        (isTemporalLocalTimezone(item) && item.args[0] === 'pg_catalog.timetz'),
    )
    .map(callableIdentity),
)
const clockTimezoneCasts = new Set(
  builtinCallables()
    .filter((item) => isTemporalContextCast(item) && item.args[0] === 'pg_catalog."time"')
    .map(callableIdentity),
)
function containsSignature(value: unknown, signatures: ReadonlySet<string>): boolean {
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(
    ([key, item]) =>
      (key === 'signature' && typeof item === 'string' && signatures.has(item)) ||
      containsSignature(item, signatures),
  )
}

const identifierQuotes = new Set(builtinCallables().filter(isIdentifierQuote).map(callableIdentity))
function needsIdentifierQuote(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(
    ([key, item]) =>
      (key === 'signature' && typeof item === 'string' && identifierQuotes.has(item)) ||
      needsIdentifierQuote(item),
  )
}

const trigonometry = new Set(builtinCallables().filter(trigonometryContext).map(callableIdentity))
const mathLibrary = new Set(builtinCallables().filter(floatMathLibrary).map(callableIdentity))
// Operators such as ^ and ||/ are bound by their implementing function's signature.
function needsMathLibrary(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(
    ([key, item]) =>
      (key === 'signature' && typeof item === 'string' && mathLibrary.has(item)) ||
      needsMathLibrary(item),
  )
}
function needsTrigonometry(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(
    ([key, item]) =>
      (key === 'signature' && typeof item === 'string' && trigonometry.has(item)) ||
      needsTrigonometry(item),
  )
}

const jsonConversions = new Set(
  builtinCallables()
    .filter(
      (item) =>
        item.kind === 'function' &&
        item.schema === 'pg_catalog' &&
        [
          'to_json',
          'to_jsonb',
          'array_to_json',
          'row_to_json',
          'json_build_array',
          'jsonb_build_array',
          'json_build_object',
          'jsonb_build_object',
        ].includes(item.name),
    )
    .map(callableIdentity),
)
function rendersType(type: string, target: string, seen = new Set<string>()): boolean {
  type = arrayElementBaseType(type)
  if (type === target) return true
  if (seen.has(type)) return false
  seen.add(type)
  if (isArrayLikeType(type)) return rendersType(arrayLikeElementType(type)!, target, seen)
  const range = rangeTypeProfile(type) ?? multirangeTypeProfile(type)
  if (range) return rendersType(range.elementType, target, seen)
  const anonymous = anonymousRecordProfile(type)
  if (anonymous)
    return anonymous.some((layout) =>
      layout.namedType
        ? rendersType(layout.namedType, target, seen)
        : layout.fields.some((field) => rendersType(field.type, target, seen)),
    )
  const profile = compositeProfile(type),
    root = profile?.graph.definitions.find((definition) => definition.identity === profile.identity)
  return !!(
    profile &&
    root?.fields.some((field) => {
      const type = compositeFieldType(profile, field.type)
      return type !== null && rendersType(type, target, seen)
    })
  )
}

function needsAclRoleCatalog(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const node = value as {
    kind?: string
    call?: { signature?: string | null }
    operands?: { type?: string }[]
  }
  if (
    node.kind === 'call' &&
    node.call?.signature &&
    jsonConversions.has(node.call.signature) &&
    node.operands?.some(
      (operand) => operand.type !== undefined && rendersType(operand.type, 'pg_catalog.aclitem'),
    )
  )
    return true
  if (
    'kind' in value &&
    (value.kind === 'text-to-aclitem' ||
      (value.kind === 'aclitem' && 'value' in value && typeof value.value === 'string') ||
      (value.kind === 'io-to-text' &&
        'operand' in value &&
        value.operand !== null &&
        typeof value.operand === 'object' &&
        'type' in value.operand &&
        value.operand.type === 'pg_catalog.aclitem'))
  )
    return true
  return Object.values(value).some(needsAclRoleCatalog)
}

function needsByteaOutput(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const node = value as {
    kind?: string
    operand?: { type?: string; kind?: string; expression?: { type?: string } }
    elementType?: string
    call?: { signature?: string | null }
    operands?: { type?: string; kind?: string; expression?: { type?: string } }[]
  }
  if (['io-to-text', 'array-to-text', 'composite-to-text'].includes(node.kind ?? '')) {
    const type = node.elementType ?? node.operand?.type ?? node.operand?.expression?.type
    if (type && rendersType(type, 'pg_catalog.bytea')) return true
  }
  if (
    node.kind === 'call' &&
    node.call?.signature &&
    jsonConversions.has(node.call.signature) &&
    node.operands?.some((o) => {
      const type = o.type ?? o.expression?.type
      return type !== undefined && rendersType(type, 'pg_catalog.bytea')
    })
  )
    return true
  return Object.values(value).some(needsByteaOutput)
}

function needsCalendarOutput(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const node = value as {
    kind?: string
    elementType?: string
    operand?: { type?: string; expression?: { type?: string }; call?: { type?: string } }
  }
  if (['io-to-text', 'array-to-text', 'composite-to-text'].includes(node.kind ?? '')) {
    const type =
      node.elementType ??
      node.operand?.type ??
      node.operand?.expression?.type ??
      node.operand?.call?.type
    if (type) {
      const profile = rangeTypeProfile(type) ?? multirangeTypeProfile(type)
      const outputType = profile?.elementType ?? type
      if (
        rendersType(outputType, 'pg_catalog.date') ||
        rendersType(outputType, 'pg_catalog."timestamp"') ||
        rendersType(outputType, 'pg_catalog.timestamptz')
      )
        return true
    }
  }
  return Object.values(value).some(needsCalendarOutput)
}

function needsSessionTimezone(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const node = value as {
    kind?: string
    elementType?: string
    operand?: { type?: string; expression?: { type?: string }; call?: { type?: string } }
    call?: { signature?: string | null }
    operands?: { type?: string; expression?: { type?: string }; call?: { type?: string } }[]
  }
  if (['io-to-text', 'array-to-text', 'composite-to-text'].includes(node.kind ?? '')) {
    const type =
      node.elementType ??
      node.operand?.type ??
      node.operand?.expression?.type ??
      node.operand?.call?.type
    if (type && rendersType(type, 'pg_catalog.timestamptz')) return true
  }
  if (
    node.kind === 'call' &&
    node.call?.signature &&
    jsonConversions.has(node.call.signature) &&
    node.operands?.some((o) => {
      const type = o.type ?? o.expression?.type ?? o.call?.type
      return type !== undefined && rendersType(type, 'pg_catalog.timestamptz')
    })
  )
    return true
  return Object.values(value).some(needsSessionTimezone)
}

// Text input to date, timestamp and timestamptz reads the session DateStyle field order and,
// for timestamptz without an explicit zone, the session time zone.
function needsTemporalTextInput(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const kind = (value as { kind?: string }).kind
  if (kind === 'text-to-date' || kind === 'text-to-timestamp' || kind === 'text-to-timestamptz')
    return true
  return Object.values(value).some(needsTemporalTextInput)
}

function needsIntervalContext(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const node = value as {
    kind?: string
    elementType?: string
    operand?: { type?: string; expression?: { type?: string } }
    call?: { signature?: string | null }
    operands?: { type?: string; expression?: { type?: string } }[]
  }
  if (node.kind === 'text-to-interval' || node.kind === 'interval-literal') return true
  if (
    ['text-to-array', 'array-text-literal'].includes(node.kind ?? '') &&
    node.elementType &&
    rendersType(node.elementType, 'pg_catalog."interval"')
  )
    return true
  if (['io-to-text', 'array-to-text', 'composite-to-text'].includes(node.kind ?? '')) {
    const type = node.elementType ?? node.operand?.type ?? node.operand?.expression?.type
    if (type) {
      const profile = rangeTypeProfile(type) ?? multirangeTypeProfile(type)
      if (rendersType(profile?.elementType ?? type, 'pg_catalog."interval"')) return true
    }
  }
  if (
    node.kind === 'call' &&
    node.call?.signature &&
    jsonConversions.has(node.call.signature) &&
    node.operands?.some((o) => {
      const type = o.type ?? o.expression?.type
      return type !== undefined && rendersType(type, 'pg_catalog."interval"')
    })
  )
    return true
  return Object.values(value).some(needsIntervalContext)
}

export function checkUnknownMessage(
  expression: EvalBoolExpression,
  reason?: string,
  context: CheckExecutionContext = {},
): string {
  if (expression.kind === 'uncertain')
    return 'This CHECK expression is not supported by the local evaluator.'
  if (reason) return `Local evaluation is incomplete: ${reason}`
  let message =
    'A required input is unavailable, or its value or an evaluated expression is not supported.'
  if (containsSignature(expression, catalogMetadata))
    message +=
      ' Metadata name rendering can require the deployment catalog and search path; captured type and collation facts do not supply deployment names.'
  if (containsSignature(expression, temporalCurrentAge))
    message +=
      ' Finite one-argument calendar age requires the transaction current local date and session timezone; static timezone settings alone do not supply that date.'
  if (containsSignature(expression, temporalTimestampFormats)) {
    if (context.timeLocale === undefined)
      message += ' Localized temporal template names can require sql.codegen.checks.timeLocale.'
    if (context.defaultCollation === undefined)
      message +=
        ' Localized temporal template casing can require sql.codegen.checks.defaultCollation or an explicit C input collation.'
  }
  if (containsSignature(expression, temporalTemplateParsers)) {
    if (context.timeZoneAbbreviations === undefined)
      message +=
        ' Temporal template abbreviation lookup can require sql.codegen.checks.timeZoneAbbreviations.'
    if (context.serverEncoding === undefined)
      message +=
        ' Fixed-width non-ASCII temporal template input can require sql.codegen.checks.serverEncoding.'
  }
  if (context.quoteAllIdentifiers === undefined && needsIdentifierQuote(expression))
    message +=
      ' Identifier quoting can require an explicit sql.codegen.checks.quoteAllIdentifiers setting.'
  if (context.intervalStyle === undefined && needsIntervalContext(expression))
    message +=
      ' Interval text input or output can require an explicit sql.codegen.checks.intervalStyle setting.'
  if (context.dateStyle === undefined && needsTemporalTextInput(expression))
    message +=
      ' Date and timestamp text input with short leading fields can require an explicit sql.codegen.checks.dateStyle setting.'
  if (context.dateStyle === undefined && needsCalendarOutput(expression))
    message +=
      ' Calendar SQL text output can require an explicit sql.codegen.checks.dateStyle setting.'
  if (
    context.timeZone === undefined &&
    (needsSessionTimezone(expression) || containsSignature(expression, temporalCasts))
  )
    message +=
      ' Temporal casts, calendar arithmetic and timestamptz SQL and JSON text output can require an explicit sql.codegen.checks.timeZone setting.'
  if (containsSignature(expression, temporalExplicitZones)) {
    if (context.timeZoneAbbreviations === undefined)
      message +=
        ' Timezone-name lookup can require sql.codegen.checks.timeZoneAbbreviations with matching abbreviation definitions.'
    if (context.maxIdentifierBytes === undefined)
      message += ' Timezone-name lookup can require sql.codegen.checks.maxIdentifierBytes.'
    message +=
      ' Unavailable timezone data, implicit POSIX rules and abbreviation-cache collisions can also defer lookup.'
  }
  if (
    context.serverEncoding === undefined &&
    containsSignature(expression, instantConstructorZones)
  )
    message +=
      ' Non-ASCII constructor timezone names can require sql.codegen.checks.serverEncoding.'
  if (
    context.maxIdentifierBytes === undefined &&
    (containsSignature(expression, temporalSessionUnits) ||
      containsSignature(expression, temporalDateParts))
  )
    message += ' Temporal unit decoding can require sql.codegen.checks.maxIdentifierBytes.'
  if (context.serverEncoding === undefined && containsSignature(expression, temporalDateParts))
    message += ' Non-ASCII temporal unit clipping can require sql.codegen.checks.serverEncoding.'
  if (containsSignature(expression, clockZoneLookups))
    message +=
      ' Timezone conversion of timetz with a variable offset can require the transaction start instant.'
  if (containsSignature(expression, clockTimezoneCasts))
    message +=
      ' Time-to-timetz conversion in a variable-offset zone can also require the transaction local date.'
  if (context.byteaOutput === undefined && needsByteaOutput(expression))
    message += ' Binary text output can require an explicit sql.codegen.checks.byteaOutput setting.'
  if (needsAclRoleCatalog(expression))
    message += ' ACL text and JSON conversion can also depend on the deployment role catalog.'
  if (context.mathLibrary !== 'musl' && needsMathLibrary(expression))
    message +=
      ' Float8 exponentials, logarithms, roots, powers, hyperbolic, error and gamma functions also require sql.codegen.checks.mathLibrary: musl.'
  return context.trigonometry !== 'fdlibm' &&
    context.mathLibrary !== 'musl' &&
    needsTrigonometry(expression)
    ? message +
        ' Circle-to-polygon coordinate generation and float8 trigonometry also require sql.codegen.checks.trigonometry: fdlibm.'
    : message
}
