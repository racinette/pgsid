import { PG18_BUILTIN_GROUPS } from './groups.generated.js'
import { PG18_BUILTIN_CASTS } from './casts.generated.js'
import { PG18_TYPE_RESOLUTION } from './type-resolution.generated.js'
import { PG18_BTREE_COMPARISONS } from './btree-comparisons.generated.js'
import { PG18_TYPE_IO } from './type-io.generated.js'
import { PG18_TYPE_COMPARISONS } from './type-comparisons.generated.js'
import { PG18_RANGE_TYPES } from './type-ranges.generated.js'
import type { BuiltinTypeComparison } from './type-comparisons.js'
import type { RangeTypeMetadata } from '../range-types.js'
import type {
  BuiltinCastMetadata,
  BuiltinTypeResolution,
  BuiltinTypeIO,
  BuiltinBtreeComparison,
  FunctionMetadata,
  OperatorMetadata,
} from './catalog.js'
import type { BuiltinCallable } from './taxonomy.js'

const casts: Readonly<Record<string, BuiltinCastMetadata>> = PG18_BUILTIN_CASTS
const types: Readonly<Record<string, BuiltinTypeResolution>> = PG18_TYPE_RESOLUTION
const typeIO: Readonly<Record<string, BuiltinTypeIO>> = PG18_TYPE_IO
const comparisons: Readonly<Record<string, BuiltinTypeComparison>> = PG18_TYPE_COMPARISONS
const ranges: Readonly<Record<string, RangeTypeMetadata>> = PG18_RANGE_TYPES
const multiranges = new Map(
  Object.values(ranges).map((range) => [range.multirange, range] as const),
)

export function builtinRangeType(identity: string): RangeTypeMetadata | null {
  return Object.hasOwn(ranges, identity) ? ranges[identity]! : null
}

export function builtinMultirangeType(identity: string): RangeTypeMetadata | null {
  return multiranges.get(identity) ?? null
}

export function builtinTypeComparison(identity: string): BuiltinTypeComparison | null {
  return comparisons[identity] ?? null
}

export function builtinTypeIO(identity: string): BuiltinTypeIO | null {
  return typeIO[identity] ?? null
}
const btree = new Map<string, BuiltinBtreeComparison[]>()
for (const comparison of PG18_BTREE_COMPARISONS) {
  const entries = btree.get(comparison.operator) ?? []
  entries.push(comparison)
  btree.set(comparison.operator, entries)
}

export function builtinBtreeComparisons(operator: string): readonly BuiltinBtreeComparison[] {
  return btree.get(operator) ?? []
}

export function builtinTypeResolution(identity: string): BuiltinTypeResolution | null {
  return types[identity] ?? null
}

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

export function isBuiltinRangeConstructor(item: BuiltinCallable): boolean {
  if (item.kind !== 'function') return false
  const range = builtinRangeType(item.result)
  return (
    range !== null &&
    item.schema === 'pg_catalog' &&
    item.name === range.identity.slice('pg_catalog.'.length) &&
    !item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    (item.args.length === 2 || item.args.length === 3) &&
    item.args[0] === range.subtype &&
    item.args[1] === range.subtype &&
    (item.args.length === 2 || item.args[2] === 'pg_catalog.text')
  )
}
