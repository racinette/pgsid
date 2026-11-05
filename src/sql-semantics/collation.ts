import { callableIdentity } from '../postgres/builtins/catalog.js'
import { isTextFormatCallable } from './text-format-callables.js'
import { isLegacySimilarCallable } from './text-similar-callables.js'
import { isTextConcatCallable } from './text-concat-callables.js'
import {
  isTemporalClockZoneLookup,
  isTemporalInstantConstructor,
  isTemporalIntervalFormatting,
  isTemporalTimestampFormatting,
  isNumberFormatting,
  isTemporalTemplateParsing,
  isTemporalSessionTruncation,
  isTemporalSessionExtraction,
} from './temporal-casts.js'
import { isIdentifierQuote } from './identifier-quote.js'
import { isNullableQuote, isGenericLiteralQuote } from './literal-quote-callables.js'
import {
  isXmlOptionPredicate,
  isXmlValidationCallable,
  isXmlXPathCallable,
} from './xml-callables.js'
import {
  builtinBtreeComparisons,
  builtinCallables,
  builtinCast,
  builtinMetadata,
  isBuiltinRangeConstructor,
} from '../postgres/builtins/inventory.js'

export function isRegexArrayCallable(signature: string): boolean {
  const metadata = builtinMetadata(signature)
  return (
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    ['regexp_match', 'regexp_split_to_array'].includes(metadata.name) &&
    metadata.result === 'pg_catalog._text' &&
    metadata.strict &&
    metadata.volatility === 'i' &&
    !metadata.returnsSet &&
    [2, 3].includes(metadata.args.length) &&
    metadata.args.every((type) => type === 'pg_catalog.text')
  )
}

export function isIdentifierParseCallable(signature: string): boolean {
  const metadata = builtinMetadata(signature)
  return (
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.name === 'parse_ident' &&
    metadata.args.join(',') === 'pg_catalog.text,pg_catalog.bool' &&
    metadata.result === 'pg_catalog._text' &&
    metadata.strict &&
    metadata.volatility === 'i' &&
    !metadata.returnsSet
  )
}

export function equalityOperation(signature: string, argumentType: string): '=' | '<>' | null {
  const metadata = builtinMetadata(signature)
  if (
    (metadata.kind !== 'operator' && metadata.kind !== 'function') ||
    metadata.result !== 'pg_catalog.bool' ||
    metadata.args.length !== 2 ||
    !metadata.args.every((type) => type === argumentType) ||
    !metadata.strict ||
    metadata.volatility !== 'i' ||
    metadata.returnsSet
  )
    return null
  if (metadata.kind === 'operator')
    return metadata.name === '=' || metadata.name === '<>' ? metadata.name : null
  const operators = builtinCallables().filter(
    (item) =>
      item.kind === 'operator' &&
      item.implementation === signature &&
      (item.name === '=' || item.name === '<>'),
  )
  return operators.length === 1 ? (operators[0]!.name as '=' | '<>') : null
}

const textOrderingCallables = new Set<string>()
for (const item of builtinCallables()) {
  if (
    !item.args.every((type) =>
      ['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog.name'].includes(type),
    )
  )
    continue
  const signature = callableIdentity(item)
  if (item.kind === 'operator') {
    const comparisons = builtinBtreeComparisons(signature)
    if (!comparisons.length) continue
    textOrderingCallables.add(signature)
    textOrderingCallables.add(item.implementation)
    for (const comparison of comparisons)
      if (comparison.comparator) textOrderingCallables.add(comparison.comparator)
  } else if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.length === 2 &&
    item.args.every((type) => type === item.result) &&
    ['text_larger', 'text_smaller', 'bpchar_larger', 'bpchar_smaller'].includes(item.name)
  )
    textOrderingCallables.add(signature)
}

export function isTextOrderingCallable(signature: string): boolean {
  return textOrderingCallables.has(signature)
}

// Casing, case-insensitive LIKE and regex read the collation's ctype; with the database default
// they need a declared ctype, which the default ordering does not supply.
const ctypeNames = new Set([
  'lower',
  'upper',
  'initcap',
  'casefold',
  'texticlike',
  'texticnlike',
  'bpchariclike',
  'bpcharicnlike',
  'nameiclike',
  'nameicnlike',
  'textregexeq',
  'textregexne',
  'texticregexeq',
  'texticregexne',
  'nameregexeq',
  'nameregexne',
  'nameicregexeq',
  'nameicregexne',
  'bpcharregexeq',
  'bpcharregexne',
  'bpcharicregexeq',
  'bpcharicregexne',
  'regexp_like',
  'regexp_count',
  'regexp_instr',
  'regexp_substr',
  'regexp_replace',
])
const ctypeCallables = new Set<string>()
for (const item of builtinCallables()) {
  const implementation = item.kind === 'operator' ? builtinMetadata(item.implementation) : item
  if (
    implementation.kind !== 'function' ||
    implementation.schema !== 'pg_catalog' ||
    !implementation.strict ||
    implementation.volatility !== 'i' ||
    implementation.returnsSet ||
    !implementation.args.some((type) =>
      ['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog.name'].includes(type),
    ) ||
    !(
      ctypeNames.has(implementation.name) ||
      (implementation.name === 'substring' &&
        [
          'pg_catalog.text,pg_catalog.text',
          'pg_catalog.text,pg_catalog.text,pg_catalog.text',
        ].includes(implementation.args.join(',')))
    )
  )
    continue
  ctypeCallables.add(callableIdentity(item))
}

// Case mapping of valid text cannot raise under any provider, unlike pattern-driven LIKE and regex.
export function isTextCasingCallable(signature: string): boolean {
  const metadata = builtinMetadata(signature)
  return (
    metadata.kind === 'function' &&
    ['lower', 'upper', 'initcap', 'casefold'].includes(metadata.name) &&
    metadata.args.length === 1 &&
    metadata.args[0] === 'pg_catalog.text' &&
    metadata.result === 'pg_catalog.text' &&
    ctypeCallables.has(signature)
  )
}

export function isCtypeCallable(signature: string): boolean {
  return ctypeCallables.has(signature) && supportsTextCallableCollation(signature, 'C')
}

export function supportsBoundTextCallableCollation(
  signature: string,
  collation?: BoundCollation | null,
): boolean {
  return (
    supportsTextCallableCollation(signature, collation?.kind) ||
    (collation?.default === true &&
      (isTextOrderingCallable(signature) || isCtypeCallable(signature)))
  )
}

// Calls the server rejects with 42P22 when their arguments' implicit collations conflict. Each is
// strict, so a NULL argument answers NULL before the collation is consulted.
const collationConflictRaising: ReadonlySet<string> = new Set([
  'function:["pg_catalog","bpchariclike"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharicnlike"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharicregexeq"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharicregexne"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharlike"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharnlike"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharregexeq"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharregexne"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","btnametextcmp"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","bttextcmp"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","bttextnamecmp"](pg_catalog.text,pg_catalog.name)',
  'function:["pg_catalog","casefold"](pg_catalog.text)',
  'function:["pg_catalog","hashtextextended"](pg_catalog.text,pg_catalog.int8)',
  'function:["pg_catalog","hashtext"](pg_catalog.text)',
  'function:["pg_catalog","initcap"](pg_catalog.text)',
  'function:["pg_catalog","like"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","like"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","lower"](pg_catalog.text)',
  'function:["pg_catalog","nameeqtext"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","namegetext"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","namegttext"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","nameiclike"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","nameicnlike"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","nameicregexeq"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","nameicregexne"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","nameletext"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","namelike"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","namelttext"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","namenetext"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","namenlike"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","nameregexeq"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","nameregexne"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","notlike"](pg_catalog.name,pg_catalog.text)',
  'function:["pg_catalog","notlike"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","position"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_count"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_count"](pg_catalog.text,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","regexp_instr"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_instr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","regexp_instr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4)',
  'function:["pg_catalog","regexp_instr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4)',
  'function:["pg_catalog","regexp_like"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_match"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_replace"](pg_catalog.text,pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_replace"](pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","regexp_replace"](pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4)',
  'function:["pg_catalog","regexp_split_to_array"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_substr"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_substr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","regexp_substr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4)',
  'function:["pg_catalog","replace"](pg_catalog.text,pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","split_part"](pg_catalog.text,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","starts_with"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","string_to_array"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","string_to_array"](pg_catalog.text,pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","strpos"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","substring"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","texteqname"](pg_catalog.text,pg_catalog.name)',
  'function:["pg_catalog","texteq"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textgename"](pg_catalog.text,pg_catalog.name)',
  'function:["pg_catalog","text_ge"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textgtname"](pg_catalog.text,pg_catalog.name)',
  'function:["pg_catalog","text_gt"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","texticlike"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","texticnlike"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","texticregexeq"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","texticregexne"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","text_larger"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textlename"](pg_catalog.text,pg_catalog.name)',
  'function:["pg_catalog","text_le"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textlike"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textltname"](pg_catalog.text,pg_catalog.name)',
  'function:["pg_catalog","text_lt"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textnename"](pg_catalog.text,pg_catalog.name)',
  'function:["pg_catalog","textne"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textnlike"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textregexeq"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textregexne"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","text_smaller"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","upper"](pg_catalog.text)',
])

// Calls the server rejects with 0A000 under a nondeterministic collation, after answering NULL on a
// NULL argument.
const nondeterministicRaising: ReadonlySet<string> = new Set([
  'function:["pg_catalog","bpchariclike"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharicnlike"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharicregexeq"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharicregexne"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharregexeq"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","bpcharregexne"](pg_catalog.bpchar,pg_catalog.text)',
  'function:["pg_catalog","regexp_count"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_count"](pg_catalog.text,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","regexp_count"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.text)',
  'function:["pg_catalog","regexp_instr"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_instr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","regexp_instr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4)',
  'function:["pg_catalog","regexp_instr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4)',
  'function:["pg_catalog","regexp_instr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.text)',
  'function:["pg_catalog","regexp_instr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4,pg_catalog.int4,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","regexp_like"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_like"](pg_catalog.text,pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_match"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_match"](pg_catalog.text,pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_replace"](pg_catalog.text,pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_replace"](pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","regexp_replace"](pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4)',
  'function:["pg_catalog","regexp_replace"](pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4,pg_catalog.text)',
  'function:["pg_catalog","regexp_replace"](pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_split_to_array"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_split_to_array"](pg_catalog.text,pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_substr"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","regexp_substr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","regexp_substr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4)',
  'function:["pg_catalog","regexp_substr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4,pg_catalog.text)',
  'function:["pg_catalog","regexp_substr"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4,pg_catalog.text,pg_catalog.int4)',
  'function:["pg_catalog","starts_with"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","substring"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","texticlike"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","texticnlike"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","texticregexeq"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","texticregexne"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textregexeq"](pg_catalog.text,pg_catalog.text)',
  'function:["pg_catalog","textregexne"](pg_catalog.text,pg_catalog.text)',
])

export function raisesOnNondeterministicCollation(signature: string): boolean {
  const metadata = builtinMetadata(signature)
  return nondeterministicRaising.has(
    metadata.kind === 'operator' ? metadata.implementation : signature,
  )
}

export function raisesOnCollationConflict(signature: string): boolean {
  const metadata = builtinMetadata(signature)
  return collationConflictRaising.has(
    metadata.kind === 'operator' ? metadata.implementation : signature,
  )
}

export function supportsTextCallableCollation(signature: string, collation?: string): boolean {
  const metadata = builtinMetadata(signature)
  const oidAliasLookup =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.strict &&
    metadata.args.length === 1 &&
    metadata.args[0] === 'pg_catalog.text' &&
    (metadata.name === 'to_' + metadata.result.slice('pg_catalog.'.length) ||
      builtinCast('pg_catalog.text', metadata.result)?.implementation === signature) &&
    metadata.result.startsWith('pg_catalog.reg') &&
    builtinCast(metadata.result, 'pg_catalog.oid')?.method === 'b'
  const nameIntrinsic =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.strict &&
    ((metadata.name === 'name' &&
      metadata.args.length === 1 &&
      metadata.result === 'pg_catalog.name') ||
      (metadata.args[0] === 'pg_catalog.name' &&
        ((metadata.args.length === 1 &&
          ['text', 'bpchar', 'varchar', 'hashname', 'namesend'].includes(metadata.name)) ||
          (metadata.name === 'hashnameextended' && metadata.args[1] === 'pg_catalog.int8'))))
  const textWire =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    ['textsend', 'varcharsend', 'bpcharsend'].includes(metadata.name) &&
    metadata.strict &&
    metadata.args.length === 1 &&
    metadata.args[0] ===
      {
        textsend: 'pg_catalog.text',
        varcharsend: 'pg_catalog."varchar"',
        bpcharsend: 'pg_catalog.bpchar',
      }[metadata.name] &&
    metadata.result === 'pg_catalog.bytea'
  const characterCode =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.name === 'ascii' &&
    metadata.args.length === 1 &&
    metadata.args[0] === 'pg_catalog.text' &&
    metadata.result === 'pg_catalog.int4'
  const internalCharCast =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.args.length === 1 &&
    ((metadata.args[0] === 'pg_catalog.text' && metadata.result === 'pg_catalog."char"') ||
      (metadata.args[0] === 'pg_catalog."char"' &&
        ['pg_catalog.text', 'pg_catalog.bpchar'].includes(metadata.result)))
  const characterText =
    builtinCast('pg_catalog.bpchar', 'pg_catalog.text')?.implementation === signature
  const asciiConversion =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.name === 'to_ascii' &&
    metadata.result === 'pg_catalog.text' &&
    metadata.args[0] === 'pg_catalog.text' &&
    (metadata.args.length === 1 ||
      (metadata.args.length === 2 &&
        ['pg_catalog.int4', 'pg_catalog.name'].includes(metadata.args[1] ?? '')))
  const byteCodec =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    ((metadata.name === 'encode' &&
      metadata.args.length === 2 &&
      metadata.args[0] === 'pg_catalog.bytea' &&
      metadata.args[1] === 'pg_catalog.text' &&
      metadata.result === 'pg_catalog.text') ||
      (metadata.name === 'decode' &&
        metadata.args.length === 2 &&
        metadata.args.every((type) => type === 'pg_catalog.text') &&
        metadata.result === 'pg_catalog.bytea'))
  const textDigest =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.name === 'md5' &&
    metadata.args.length === 1 &&
    metadata.args[0] === 'pg_catalog.text' &&
    metadata.result === 'pg_catalog.text'
  const utcConversion =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.name === 'timezone' &&
    metadata.args.length === 2 &&
    metadata.args[0] === 'pg_catalog.text' &&
    (metadata.args[1] === 'pg_catalog."timestamp"' || metadata.args[1] === 'pg_catalog.timestamptz')
  const zonedCalendar =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.strict &&
    metadata.volatility === 'i' &&
    !metadata.returnsSet &&
    ['date_add', 'date_subtract'].includes(metadata.name) &&
    metadata.args.length === 3 &&
    metadata.args[0] === 'pg_catalog.timestamptz' &&
    metadata.args[1] === 'pg_catalog."interval"' &&
    metadata.args[2] === 'pg_catalog.text' &&
    metadata.result === 'pg_catalog.timestamptz'
  const temporalField =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.strict &&
    metadata.volatility === 'i' &&
    !metadata.returnsSet &&
    metadata.args[0] === 'pg_catalog.text' &&
    ((metadata.name === 'date_trunc' &&
      ((metadata.args.length === 2 &&
        ['pg_catalog."timestamp"', 'pg_catalog."interval"'].includes(metadata.args[1]!) &&
        metadata.result === metadata.args[1]) ||
        (metadata.args.length === 3 &&
          metadata.args[1] === 'pg_catalog.timestamptz' &&
          metadata.args[2] === 'pg_catalog.text' &&
          metadata.result === 'pg_catalog.timestamptz'))) ||
      (metadata.name === 'extract' &&
        metadata.args.length === 2 &&
        [
          'pg_catalog.date',
          'pg_catalog."timestamp"',
          'pg_catalog."time"',
          'pg_catalog.timetz',
          'pg_catalog."interval"',
        ].includes(metadata.args[1]!) &&
        metadata.result === 'pg_catalog."numeric"') ||
      (metadata.name === 'date_part' &&
        metadata.args.length === 2 &&
        [
          'pg_catalog."time"',
          'pg_catalog.timetz',
          'pg_catalog."interval"',
          'pg_catalog."timestamp"',
          'pg_catalog.date',
        ].includes(metadata.args[1]!) &&
        metadata.result === 'pg_catalog.float8'))
  const implementation =
    metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
  const jsonField =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.strict &&
    implementation.volatility === 'i' &&
    !implementation.returnsSet &&
    implementation.args.length === 2 &&
    implementation.args[1] === 'pg_catalog.text' &&
    ((implementation.args[0] === 'pg_catalog."json"' &&
      ((implementation.name === 'json_object_field' &&
        implementation.result === 'pg_catalog."json"') ||
        (implementation.name === 'json_object_field_text' &&
          implementation.result === 'pg_catalog.text'))) ||
      (implementation.args[0] === 'pg_catalog.jsonb' &&
        ((implementation.name === 'jsonb_object_field' &&
          implementation.result === 'pg_catalog.jsonb') ||
          (implementation.name === 'jsonb_object_field_text' &&
            implementation.result === 'pg_catalog.text') ||
          (implementation.name === 'jsonb_exists' && implementation.result === 'pg_catalog.bool') ||
          (implementation.name === 'jsonb_delete' &&
            implementation.result === 'pg_catalog.jsonb'))))
  const textHash =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.strict &&
    implementation.volatility === 'i' &&
    !implementation.returnsSet &&
    ((implementation.args.length === 1 &&
      implementation.result === 'pg_catalog.int4' &&
      ((implementation.name === 'hashtext' && implementation.args[0] === 'pg_catalog.text') ||
        (implementation.name === 'hashbpchar' &&
          implementation.args[0] === 'pg_catalog.bpchar'))) ||
      (implementation.args.length === 2 &&
        implementation.args[1] === 'pg_catalog.int8' &&
        implementation.result === 'pg_catalog.int8' &&
        ((implementation.name === 'hashtextextended' &&
          implementation.args[0] === 'pg_catalog.text') ||
          (implementation.name === 'hashbpcharextended' &&
            implementation.args[0] === 'pg_catalog.bpchar'))))
  const textSlice =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.strict &&
    implementation.volatility === 'i' &&
    !implementation.returnsSet &&
    implementation.result === 'pg_catalog.text' &&
    ((implementation.args.length === 1 &&
      implementation.args[0] === 'pg_catalog.text' &&
      implementation.name === 'reverse') ||
      ([2, 3].includes(implementation.args.length) &&
        implementation.args[0] === 'pg_catalog.text' &&
        implementation.args.slice(1).every((type) => type === 'pg_catalog.int4') &&
        (['substr', 'substring'].includes(implementation.name) ||
          (implementation.args.length === 2 && ['left', 'right'].includes(implementation.name)))) ||
      (implementation.args.length === 1 &&
        ['pg_catalog.bool', 'pg_catalog.bpchar'].includes(implementation.args[0]!) &&
        implementation.name === 'text'))
  const textBuilder =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.strict &&
    implementation.volatility === 'i' &&
    !implementation.returnsSet &&
    implementation.result === 'pg_catalog.text' &&
    ((implementation.name === 'quote_literal' &&
      implementation.args.length === 1 &&
      implementation.args[0] === 'pg_catalog.text') ||
      (['lpad', 'rpad'].includes(implementation.name) &&
        [2, 3].includes(implementation.args.length) &&
        implementation.args[0] === 'pg_catalog.text' &&
        implementation.args[1] === 'pg_catalog.int4' &&
        (implementation.args.length === 2 || implementation.args[2] === 'pg_catalog.text')) ||
      (implementation.name === 'repeat' &&
        implementation.args.length === 2 &&
        implementation.args[0] === 'pg_catalog.text' &&
        implementation.args[1] === 'pg_catalog.int4') ||
      (implementation.name === 'translate' &&
        implementation.args.length === 3 &&
        implementation.args.every((type) => type === 'pg_catalog.text')) ||
      (implementation.name === 'textcat' &&
        implementation.args.length === 2 &&
        implementation.args.every((type) => type === 'pg_catalog.text')) ||
      (implementation.name === 'overlay' &&
        [3, 4].includes(implementation.args.length) &&
        implementation.args.slice(0, 2).every((type) => type === 'pg_catalog.text') &&
        implementation.args.slice(2).every((type) => type === 'pg_catalog.int4')))
  const textSearch =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.strict &&
    implementation.volatility === 'i' &&
    !implementation.returnsSet &&
    ((['position', 'strpos'].includes(implementation.name) &&
      implementation.args.length === 2 &&
      implementation.args.every((type) => type === 'pg_catalog.text') &&
      implementation.result === 'pg_catalog.int4') ||
      (implementation.name === 'starts_with' &&
        implementation.args.length === 2 &&
        implementation.args.every((type) => type === 'pg_catalog.text') &&
        implementation.result === 'pg_catalog.bool') ||
      (implementation.name === 'replace' &&
        implementation.args.length === 3 &&
        implementation.args.every((type) => type === 'pg_catalog.text') &&
        implementation.result === 'pg_catalog.text') ||
      (implementation.name === 'split_part' &&
        implementation.args.length === 3 &&
        implementation.args[0] === 'pg_catalog.text' &&
        implementation.args[1] === 'pg_catalog.text' &&
        implementation.args[2] === 'pg_catalog.int4' &&
        implementation.result === 'pg_catalog.text'))
  const textWidth =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.strict &&
    implementation.volatility === 'i' &&
    !implementation.returnsSet &&
    implementation.args.length === 3 &&
    implementation.args[1] === 'pg_catalog.int4' &&
    implementation.args[2] === 'pg_catalog.bool' &&
    implementation.result === implementation.args[0] &&
    ((implementation.name === 'bpchar' && implementation.args[0] === 'pg_catalog.bpchar') ||
      (implementation.name === 'varchar' && implementation.args[0] === 'pg_catalog."varchar"'))
  const textLike =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.strict &&
    implementation.volatility === 'i' &&
    !implementation.returnsSet &&
    implementation.result === 'pg_catalog.bool' &&
    implementation.args.length === 2 &&
    ['pg_catalog.text', 'pg_catalog.bpchar'].includes(implementation.args[0]!) &&
    implementation.args[1] === 'pg_catalog.text' &&
    ['like', 'notlike', 'textlike', 'textnlike', 'bpcharlike', 'bpcharnlike'].includes(
      implementation.name,
    )
  const likeEscape =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.strict &&
    implementation.volatility === 'i' &&
    !implementation.returnsSet &&
    implementation.name === 'like_escape' &&
    implementation.result === 'pg_catalog.text' &&
    implementation.args.length === 2 &&
    implementation.args.every((type) => type === 'pg_catalog.text')
  const sizeBytes =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.name === 'pg_size_bytes' &&
    implementation.strict &&
    implementation.volatility === 'i' &&
    !implementation.returnsSet &&
    implementation.args.length === 1 &&
    implementation.args[0] === 'pg_catalog.text' &&
    implementation.result === 'pg_catalog.int8'
  const textIntrinsic =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.strict &&
    implementation.volatility === 'i' &&
    !implementation.returnsSet &&
    ((implementation.args.length === 1 &&
      implementation.args[0] === 'pg_catalog.text' &&
      implementation.result === 'pg_catalog.xml' &&
      ['xmltext', 'xmlcomment'].includes(implementation.name)) ||
      (implementation.args.length === 2 &&
        implementation.args.every((type) => type === 'pg_catalog.text') &&
        ['normalize', 'is_normalized'].includes(implementation.name) &&
        ['pg_catalog.text', 'pg_catalog.bool'].includes(implementation.result)) ||
      (implementation.args.length === 1 &&
        implementation.args[0] === 'pg_catalog.text' &&
        implementation.result === 'pg_catalog.text' &&
        implementation.name === 'unistr') ||
      (implementation.args.length === 1 &&
        implementation.args[0] === 'pg_catalog.text' &&
        implementation.result === 'pg_catalog.bool' &&
        ['unicode_assigned', 'xml_is_well_formed_content', 'xml_is_well_formed_document'].includes(
          implementation.name,
        )) ||
      (implementation.args.length === 1 &&
        ['pg_catalog.text', 'pg_catalog.bpchar'].includes(implementation.args[0]!) &&
        implementation.result === 'pg_catalog.int4' &&
        (['char_length', 'character_length', 'length', 'octet_length'].includes(
          implementation.name,
        ) ||
          (implementation.args[0] === 'pg_catalog.text' &&
            ['textlen', 'bit_length'].includes(implementation.name)))) ||
      ([1, 2].includes(implementation.args.length) &&
        implementation.args.every((type) => type === 'pg_catalog.text') &&
        implementation.result === 'pg_catalog.text' &&
        ['btrim', 'ltrim', 'rtrim', 'similar_to_escape'].includes(implementation.name)) ||
      (implementation.args.length === 2 &&
        implementation.args.every((type) => type === implementation.args[0]) &&
        ((implementation.args[0] === 'pg_catalog.text' &&
          ((['text_pattern_lt', 'text_pattern_le', 'text_pattern_gt', 'text_pattern_ge'].includes(
            implementation.name,
          ) &&
            implementation.result === 'pg_catalog.bool') ||
            (['bttext_pattern_cmp', 'gin_cmp_tslexeme', 'gin_compare_jsonb'].includes(
              implementation.name,
            ) &&
              implementation.result === 'pg_catalog.int4'))) ||
          (implementation.args[0] === 'pg_catalog.bpchar' &&
            (([
              'bpchar_pattern_lt',
              'bpchar_pattern_le',
              'bpchar_pattern_gt',
              'bpchar_pattern_ge',
            ].includes(implementation.name) &&
              implementation.result === 'pg_catalog.bool') ||
              (implementation.name === 'btbpchar_pattern_cmp' &&
                implementation.result === 'pg_catalog.int4'))))))
  const arrayStringIO =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    !implementation.returnsSet &&
    [2, 3].includes(implementation.args.length) &&
    implementation.args.slice(1).every((type) => type === 'pg_catalog.text') &&
    ((implementation.name === 'string_to_array' &&
      implementation.args[0] === 'pg_catalog.text' &&
      implementation.result === 'pg_catalog._text' &&
      !implementation.strict &&
      implementation.volatility === 'i') ||
      (implementation.name === 'array_to_string' &&
        implementation.args[0] === 'pg_catalog.anyarray' &&
        implementation.result === 'pg_catalog.text' &&
        implementation.strict === (implementation.args.length === 2) &&
        implementation.volatility === 's'))
  return (
    isTemporalIntervalFormatting(metadata) ||
    isTemporalTimestampFormatting(metadata) ||
    isNumberFormatting(metadata) ||
    isTemporalTemplateParsing(metadata) ||
    isTemporalClockZoneLookup(metadata) ||
    (isTemporalInstantConstructor(metadata) && metadata.args.length === 7) ||
    isTemporalSessionTruncation(metadata) ||
    isTemporalSessionExtraction(metadata) ||
    (metadata.kind === 'function' &&
      metadata.schema === 'pg_catalog' &&
      metadata.name === 'ts_delete' &&
      metadata.args.join(',') === 'pg_catalog.tsvector,pg_catalog.text' &&
      metadata.result === 'pg_catalog.tsvector' &&
      metadata.strict &&
      metadata.volatility === 'i' &&
      !metadata.returnsSet) ||
    isIdentifierParseCallable(signature) ||
    isIdentifierQuote(metadata) ||
    isTextFormatCallable(metadata) ||
    isLegacySimilarCallable(metadata) ||
    isTextConcatCallable(metadata) ||
    isNullableQuote(metadata) ||
    isGenericLiteralQuote(metadata) ||
    isBuiltinRangeConstructor(implementation) ||
    (implementation.kind === 'function' &&
      implementation.schema === 'pg_catalog' &&
      implementation.name === 'jsonb_set_lax' &&
      implementation.args.join(',') ===
        'pg_catalog.jsonb,pg_catalog._text,pg_catalog.jsonb,pg_catalog.bool,pg_catalog.text' &&
      implementation.result === 'pg_catalog.jsonb' &&
      !implementation.strict &&
      implementation.volatility === 'i' &&
      !implementation.returnsSet) ||
    arrayStringIO ||
    jsonField ||
    (metadata.kind === 'function' &&
      metadata.schema === 'pg_catalog' &&
      metadata.name === 'makeaclitem' &&
      metadata.strict &&
      metadata.volatility === 'i' &&
      !metadata.returnsSet &&
      metadata.args.join(',') === 'pg_catalog.oid,pg_catalog.oid,pg_catalog.text,pg_catalog.bool' &&
      metadata.result === 'pg_catalog.aclitem') ||
    nameIntrinsic ||
    textWire ||
    isXmlXPathCallable(metadata) ||
    isXmlValidationCallable(metadata) ||
    isXmlOptionPredicate(metadata) ||
    oidAliasLookup ||
    likeEscape ||
    textIntrinsic ||
    sizeBytes ||
    textBuilder ||
    textWidth ||
    textSlice ||
    temporalField ||
    zonedCalendar ||
    characterCode ||
    asciiConversion ||
    characterText ||
    internalCharCast ||
    byteCodec ||
    textDigest ||
    utcConversion ||
    collation === 'C' ||
    (collation === 'deterministic' &&
      (textLike ||
        textHash ||
        textSearch ||
        equalityOperation(signature, 'pg_catalog.text') !== null ||
        equalityOperation(signature, 'pg_catalog.bpchar') !== null))
  )
}

export type BoundCollation = {
  kind: 'C' | 'deterministic' | 'other'
  identity: string | number
  default?: true
  explicit?: true
  nondeterministic?: true
}

export const defaultCollation: BoundCollation = {
  kind: 'deterministic',
  identity: 'default',
  default: true,
}

export function combineCollations(
  values: readonly (BoundCollation | undefined)[],
): BoundCollation | undefined {
  const collations = values.filter((value): value is BoundCollation => value !== undefined)
  const explicit = collations.filter((value) => value.explicit)
  const nondefault = collations.filter((value) => !value.default)
  const selected = explicit.length ? explicit : nondefault.length ? nondefault : collations
  const first = selected[0]
  if (!first) return undefined
  if (selected.some((value) => value.identity !== first.identity))
    return { kind: 'other', identity: 'conflict', ...(explicit.length ? { explicit: true } : {}) }
  return selected.some((value) => value.kind === 'other') ? { ...first, kind: 'other' } : first
}
