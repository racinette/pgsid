import type { RangeCallInfo, RangeTypeInfo } from '../catalog/types.js'

export type RangeConstructorImplementation =
  | 'range_constructor2'
  | 'range_constructor3'
  | 'multirange_constructor0'
  | 'multirange_constructor1'
  | 'multirange_constructor2'

export function rangeConstructorImplementation(
  profile: RangeTypeInfo,
  callable: RangeCallInfo,
): RangeConstructorImplementation | null {
  if (callable.kind !== 'function' || callable.volatility !== 'i' || callable.returnsSet)
    return null
  const matches = (types: readonly string[]): boolean =>
    callable.args.length === types.length &&
    callable.args.every((type, index) => type === types[index])
  if (callable.result === profile.identity && !callable.strict && callable.variadic === null) {
    if (
      callable.implementation === 'range_constructor2' &&
      matches([profile.subtype, profile.subtype])
    )
      return callable.implementation
    if (
      callable.implementation === 'range_constructor3' &&
      matches([profile.subtype, profile.subtype, 'pg_catalog.text'])
    )
      return callable.implementation
  }
  if (callable.result === profile.multirange && callable.strict) {
    if (
      callable.implementation === 'multirange_constructor0' &&
      callable.variadic === null &&
      matches([])
    )
      return callable.implementation
    if (
      callable.implementation === 'multirange_constructor1' &&
      callable.variadic === null &&
      matches([profile.identity])
    )
      return callable.implementation
    if (
      callable.implementation === 'multirange_constructor2' &&
      callable.variadic === profile.identity &&
      matches([profile.array])
    )
      return callable.implementation
  }
  return null
}
