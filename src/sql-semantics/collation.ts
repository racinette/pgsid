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
  return (
    characterCode ||
    characterText ||
    byteCodec ||
    textDigest ||
    utcConversion ||
    collation === 'C' ||
    (collation === 'deterministic' &&
      (equalityOperation(signature, 'pg_catalog.text') !== null ||
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
    return { kind: 'other', identity: 'conflict' }
  return selected.some((value) => value.kind === 'other') ? { ...first, kind: 'other' } : first
}
