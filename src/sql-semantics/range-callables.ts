import { parseSync } from 'libpg-query'
import { catalogScalarType } from './expressions.js'
import { builtinTypeResolution } from '../postgres/builtins/inventory.js'
import type { RangeCallInfo, RangeTypeInfo, RangeCallResolution } from '../catalog/types.js'

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

export interface RangeCallArgument {
  type: string | null
  base: string | null
  name?: string
}

export type RangeCallSelection =
  | {
      kind: 'call'
      callable: RangeCallInfo
      order: readonly number[]
      targets: readonly string[]
      expanded: boolean
    }
  | { kind: 'cast' }
  | { kind: 'unresolved' }

const typeKeys = new Map<string, string>()
export function rangeCallTypeKey(type: string): string {
  const cached = typeKeys.get(type)
  if (cached) return cached
  const normalized = catalogScalarType(type) ?? type
  if (normalized.startsWith('array:')) return 'array:' + rangeCallTypeKey(normalized.slice(6))
  const fields = (v: unknown): Record<string, unknown> | null =>
    v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  try {
    const p = parseSync(`SELECT NULL::${normalized}`)
    const s = fields(fields(p.stmts?.[0]?.stmt)?.['SelectStmt']),
      targets = s?.['targetList']
    const val = Array.isArray(targets) ? fields(fields(targets[0])?.['ResTarget'])?.['val'] : null
    const names = fields(fields(val)?.['TypeCast'])?.['typeName']
    const parts = fields(names)?.['names']
    const result = Array.isArray(parts)
      ? JSON.stringify(parts.map((x) => fields(fields(x)?.['String'])?.['sval']))
      : normalized
    typeKeys.set(type, result)
    return result
  } catch {
    return normalized
  }
}

export function resolveRangeCall(
  callables: readonly RangeCallInfo[],
  arguments_: readonly RangeCallArgument[],
  explicitVariadic: boolean,
  cast: { type: string; base: string } | null,
  resolution: RangeCallResolution | undefined,
): RangeCallSelection {
  const types = new Map(resolution?.types.map((t) => [rangeCallTypeKey(t.identity), t]))
  const element = (type: string): string | null => {
    const normalized = catalogScalarType(type) ?? type
    return normalized.startsWith('array:')
      ? normalized.slice(6)
      : (types.get(rangeCallTypeKey(type))?.element ?? null)
  }
  const key = (type: string): string => {
    const child = element(type)
    return child ? 'array:' + key(child) : rangeCallTypeKey(type)
  }
  const base = (type: string): string => {
    const seen = new Set<string>()
    while (!seen.has(type)) {
      seen.add(type)
      const parent = types.get(rangeCallTypeKey(type))?.base
      if (!parent) break
      type = parent
    }
    return type
  }
  const category = (type: string) =>
    types.get(rangeCallTypeKey(type)) ?? builtinTypeResolution(catalogScalarType(type) ?? type)
  const casts = new Map(
    resolution?.implicitCasts.map((c) => [
      JSON.stringify([key(c.source), key(c.target)]),
      c.method,
    ]),
  )
  const canCoerce = (source: string | null, target: string): boolean | null => {
    if (source === null) return true
    source = base(source)
    target = base(target)
    if (key(source) === key(target)) return true
    if (category(target)?.category === 'P') return null
    const from = element(source),
      to = element(target)
    if (from && to) return canCoerce(from, to)
    if (casts.has(JSON.stringify([key(source), key(target)]))) return true
    return resolution ? false : null
  }
  type Match = {
    callable: RangeCallInfo
    order: number[]
    targets: string[]
    effective: string[]
    expanded: boolean
    uncertain: boolean
  }
  const named = arguments_.some((a) => a.name !== undefined)
  const matches: Match[] = []
  for (const callable of callables) {
    const expanded =
      callable.variadic !== null && !explicitVariadic && arguments_.length >= callable.args.length
    if (explicitVariadic && callable.variadic === null) continue
    if (expanded && named) continue
    if (
      expanded ? arguments_.length < callable.args.length : arguments_.length > callable.args.length
    )
      continue
    const order: number[] = [],
      effective: string[] = [],
      targets: string[] = []
    let valid = true,
      seenNamed = false
    for (const [index, arg] of arguments_.entries()) {
      let position = index
      if (arg.name !== undefined) {
        seenNamed = true
        position = callable.argumentNames.indexOf(arg.name)
      } else if (seenNamed) {
        valid = false
        break
      }
      if (
        position < 0 ||
        (!expanded && position >= callable.args.length) ||
        order[position] !== undefined
      ) {
        valid = false
        break
      }
      if (expanded && position >= callable.args.length - 1) {
        order[position] = index
        targets[position] = callable.variadic!
        effective[index] = callable.variadic!
      } else {
        order[position] = index
        targets[position] = callable.args[position]!
        effective[index] = callable.args[position]!
      }
    }
    if (!valid) continue
    if (!expanded)
      for (let i = 0; i < callable.args.length; i++)
        if (order[i] === undefined) {
          if (i < callable.args.length - callable.numArgDefaults) {
            valid = false
            break
          }
          order[i] = -1
          targets[i] = callable.args[i]!
        }
    if (valid) matches.push({ callable, order, targets, effective, expanded, uncertain: false })
  }
  let remaining = matches.filter(
    (m) =>
      !m.expanded ||
      !matches.some(
        (other) =>
          !other.expanded &&
          other.callable.schema === m.callable.schema &&
          other.effective.length === m.effective.length &&
          other.effective.every((t, i) => key(t) === key(m.effective[i]!)),
      ),
  )
  const exact = remaining.filter((m) =>
    m.effective.every((t, i) => key(t) === key(arguments_[i]!.type ?? 'pg_catalog.unknown')),
  )
  const selected = (m: Match): RangeCallSelection =>
    m.uncertain
      ? { kind: 'unresolved' }
      : {
          kind: 'call',
          callable: m.callable,
          order: m.order,
          targets: m.targets,
          expanded: m.expanded,
        }
  if (exact.length) return exact.length === 1 ? selected(exact[0]!) : { kind: 'unresolved' }
  if (cast && arguments_.length === 1 && !explicitVariadic && !named) {
    const arg = arguments_[0]!,
      source = arg.base
    if (
      arg.type === null ||
      (source && category(source)?.category === 'S') ||
      (source &&
        (key(base(source)) === key(base(cast.base)) ||
          casts.get(JSON.stringify([key(base(source)), key(base(cast.base))])) === 'b'))
    )
      return { kind: 'cast' }
  }
  remaining = remaining.filter((m) => {
    for (const [i, target] of m.effective.entries()) {
      const possible = canCoerce(arguments_[i]!.base, target)
      if (possible === false) return false
      if (possible === null) m.uncertain = true
    }
    return true
  })
  if (remaining.length <= 1)
    return remaining.length ? selected(remaining[0]!) : { kind: 'unresolved' }
  const retainBest = (score: (m: Match) => number): void => {
    const max = Math.max(...remaining.map(score))
    remaining = remaining.filter((m) => score(m) === max)
  }
  retainBest(
    (m) =>
      m.effective.filter(
        (t, i) => arguments_[i]!.base !== null && key(t) === key(arguments_[i]!.base!),
      ).length,
  )
  if (remaining.length === 1) return selected(remaining[0]!)
  retainBest(
    (m) =>
      m.effective.filter((t, i) => {
        const source = arguments_[i]!.base
        if (source === null) return false
        const from = category(source),
          to = category(t)
        return key(t) === key(source) || (from?.category === to?.category && to?.preferred)
      }).length,
  )
  if (remaining.length === 1) return selected(remaining[0]!)
  const preferences: { index: number; category: string; preferred: boolean }[] = []
  for (const [i, arg] of arguments_.entries())
    if (arg.type === null) {
      const facts = remaining.map((m) => category(m.effective[i]!))
      if (facts.some((f) => !f)) return { kind: 'unresolved' }
      const categories = new Set(facts.map((f) => f!.category))
      const chosen = categories.has('S') ? 'S' : categories.size === 1 ? [...categories][0] : null
      if (chosen === null) return { kind: 'unresolved' }
      const preferred = facts.some((f) => f!.category === chosen && f!.preferred)
      preferences.push({ index: i, category: chosen!, preferred })
    }
  remaining = remaining.filter((m) =>
    preferences.every((p) => {
      const fact = category(m.effective[p.index]!)
      return fact?.category === p.category && (!p.preferred || fact.preferred)
    }),
  )
  if (remaining.length === 1) return selected(remaining[0]!)
  const known = arguments_.flatMap((a) => (a.base === null ? [] : [a.base]))
  if (
    known.length &&
    known.every((t) => key(t) === key(known[0]!)) &&
    known.length < arguments_.length
  ) {
    remaining = remaining.filter((m) => m.effective.every((t) => canCoerce(known[0]!, t) === true))
    if (remaining.length === 1) return selected(remaining[0]!)
  }
  return { kind: 'unresolved' }
}
