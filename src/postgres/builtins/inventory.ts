import { PG18_BUILTIN_GROUPS } from './groups.generated.js'
import { PG18_BUILTIN_CASTS } from './casts.generated.js'
import type { BuiltinCastMetadata, FunctionMetadata, OperatorMetadata } from './catalog.js'
import type { BuiltinCallable } from './taxonomy.js'

const casts: Readonly<Record<string, BuiltinCastMetadata>> = PG18_BUILTIN_CASTS

export function builtinCast(source: string, target: string): BuiltinCastMetadata | null {
  return casts[JSON.stringify([source, target])] ?? null
}

export function builtinCallables(): BuiltinCallable[] {
  return PG18_BUILTIN_GROUPS.flatMap(({ inventory }) => Object.values(inventory))
}

export function builtinMetadata(signature: string): BuiltinCallable {
  for (const { inventory } of PG18_BUILTIN_GROUPS) {
    if (Object.hasOwn(inventory, signature)) return inventory[signature]!
  }
  throw new Error(`Unknown builtin signature: ${signature}`)
}

export function operatorMetadata(signature: string): OperatorMetadata {
  const metadata = builtinMetadata(signature)
  if (metadata.kind !== 'operator') throw new Error(`Not an operator signature: ${signature}`)
  return metadata
}

export function functionMetadata(signature: string): FunctionMetadata {
  const metadata = builtinMetadata(signature)
  if (metadata.kind === 'operator') throw new Error(`Not a function signature: ${signature}`)
  return metadata
}
