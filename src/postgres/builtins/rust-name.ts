import { createHash } from 'node:crypto'

export interface PgFunctionIdentity {
  schema: string
  name: string
  args: readonly string[]
}

const encode = (value: string): string =>
  /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u.test(value)
    ? value
    : `x${Buffer.from(value, 'utf8').toString('hex')}`

export function rustCallableName(identity: PgFunctionIdentity): string {
  const canonical = JSON.stringify(['pg_proc', identity.schema, identity.name, identity.args])
  const digest = createHash('sha256').update(canonical, 'utf8').digest('hex')
  const suffix = (BigInt(`0x${digest}`) % 36n ** 4n).toString(36).padStart(4, '0')
  return `sql__${encode(identity.schema)}__${encode(identity.name)}__${suffix}`
}

export function assertUniqueRustCallableNames(identities: readonly PgFunctionIdentity[]): void {
  const names = new Map<string, string>()
  const targetNames = new Map<string, string>()
  for (const identity of identities) {
    const canonical = JSON.stringify([identity.schema, identity.name, identity.args])
    const name = rustCallableName(identity)
    const previous = names.get(name)
    if (previous && previous !== canonical)
      throw new Error(`Rust callable name collision: ${name}: ${previous} and ${canonical}`)
    names.set(name, canonical)
    const targetName = name
      .split('_')
      .filter(Boolean)
      .map((part, index) => (index === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
      .join('')
    const previousTarget = targetNames.get(targetName)
    if (previousTarget && previousTarget !== canonical)
      throw new Error(
        `Target callable name collision: ${targetName}: ${previousTarget} and ${canonical}`,
      )
    targetNames.set(targetName, canonical)
  }
}
