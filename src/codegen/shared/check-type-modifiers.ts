import { builtinCast, builtinMetadata } from '../../postgres/builtins/inventory.js'
import { rustCallableName } from '../../postgres/builtins/rust-name.js'
import { checkRustCallableNames } from './check-rust-source.js'

/**
 * The function the server applies a type modifier with when it reads a parameter of the type: the
 * type's length coercion, given the modifier and, where it takes one, that the cast is implicit.
 * `callable` is the evaluator's name for it; null when the evaluator has none.
 */
export function checkTypeModifierCoercion(
  type: string,
): { callable: string; explicit: boolean } | null {
  const conversion = builtinCast(type, type)
  if (conversion?.method !== 'f' || !conversion.implementation) return null
  const callable = builtinMetadata(conversion.implementation)
  if (
    callable.kind !== 'function' ||
    ![2, 3].includes(callable.args.length) ||
    callable.args[1] !== 'pg_catalog.int4' ||
    (callable.args.length === 3 && callable.args[2] !== 'pg_catalog.bool')
  )
    return null
  const name = rustCallableName(callable)
  return checkRustCallableNames().has(name)
    ? { callable: name, explicit: callable.args.length === 3 }
    : null
}
