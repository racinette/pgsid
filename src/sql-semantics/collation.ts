import { builtinCallables, builtinCast, builtinMetadata } from '../postgres/builtins/inventory.js'

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

export function supportsTextCallableCollation(signature: string, collation?: string): boolean {
  const metadata = builtinMetadata(signature)
  const characterCode =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.name === 'ascii' &&
    metadata.args.length === 1 &&
    metadata.args[0] === 'pg_catalog.text' &&
    metadata.result === 'pg_catalog.int4'
  const characterText =
    builtinCast('pg_catalog.bpchar', 'pg_catalog.text')?.implementation === signature
  const asciiConversion =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.name === 'to_ascii' &&
    metadata.result === 'pg_catalog.text' &&
    metadata.args[0] === 'pg_catalog.text' &&
    (metadata.args.length === 1 ||
      (metadata.args.length === 2 && metadata.args[1] === 'pg_catalog.int4'))
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
  const temporalField =
    metadata.kind === 'function' &&
    metadata.schema === 'pg_catalog' &&
    metadata.strict &&
    metadata.volatility === 'i' &&
    !metadata.returnsSet &&
    metadata.args[0] === 'pg_catalog.text' &&
    ((metadata.name === 'date_trunc' &&
      ((metadata.args.length === 2 &&
        metadata.args[1] === 'pg_catalog."timestamp"' &&
        metadata.result === 'pg_catalog."timestamp"') ||
        (metadata.args.length === 3 &&
          metadata.args[1] === 'pg_catalog.timestamptz' &&
          metadata.args[2] === 'pg_catalog.text' &&
          metadata.result === 'pg_catalog.timestamptz'))) ||
      (metadata.name === 'extract' &&
        metadata.args.length === 2 &&
        ['pg_catalog.date', 'pg_catalog."timestamp"'].includes(metadata.args[1]!) &&
        metadata.result === 'pg_catalog."numeric"'))
  const implementation =
    metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
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
      implementation.result === 'pg_catalog.text' &&
      implementation.name === 'unistr') ||
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
  return (
    likeEscape ||
    textIntrinsic ||
    sizeBytes ||
    textBuilder ||
    textWidth ||
    textSlice ||
    temporalField ||
    characterCode ||
    asciiConversion ||
    characterText ||
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
