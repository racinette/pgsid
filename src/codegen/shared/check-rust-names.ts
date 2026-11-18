import { createHash } from 'node:crypto'

export interface CheckConstraintIdentity {
  schema: string
  kind: 'table' | 'domain'
  owner: string
  constraint: string
  declaredOn?: { schema: string; owner: string }
}

function identityParts(identity: CheckConstraintIdentity): string[] {
  const parts = [identity.schema, identity.kind, identity.owner]
  if (
    identity.declaredOn &&
    (identity.declaredOn.schema !== identity.schema || identity.declaredOn.owner !== identity.owner)
  )
    parts.push('from', identity.declaredOn.schema, identity.declaredOn.owner)
  parts.push(identity.constraint)
  return parts
}

function hashedEntryName(kind: 'check' | 'value', parts: readonly string[]): string {
  const canonical = JSON.stringify([kind, ...parts])
  const digest = createHash('sha256').update(canonical, 'utf8').digest('hex')
  const suffix = (BigInt(`0x${digest}`) % 36n ** 4n).toString(36).padStart(4, '0')
  const readable = parts.map(
    (part) =>
      part
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, '_')
        .replace(/^_+|_+$/gu, '') || 'unnamed',
  )
  return `evaluate_${kind}_${readable.join('_')}_h${suffix}`
}

export function checkRustEntryName(identity: CheckConstraintIdentity): string {
  return hashedEntryName('check', identityParts(identity))
}

// The entry computing one expression's value; the name parts say which expression it is.
export function checkRustValueEntryName(...parts: readonly string[]): string {
  return hashedEntryName('value', parts)
}

export function assertUniqueCheckEntryNames(identities: readonly CheckConstraintIdentity[]): void {
  const names = new Map<string, CheckConstraintIdentity>()
  for (const identity of identities) {
    const name = checkRustEntryName(identity)
    const target = name
      .split('_')
      .map((part) => part[0]!.toUpperCase() + part.slice(1))
      .join('')
    const previous = names.get(target)
    if (previous)
      throw new Error(
        `CHECK evaluator name collision: ${name}: ${JSON.stringify(previous)} and ${JSON.stringify(identity)}`,
      )
    names.set(target, identity)
  }
}
