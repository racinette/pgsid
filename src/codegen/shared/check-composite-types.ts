import { arrayElementBaseType } from '../../sql-semantics/expressions.js'
import { rustStringLiteral } from './rust-literals.js'
import {
  compositeProfile,
  compositePhysicalType,
  compositeFieldType,
} from '../../sql-semantics/composite-profiles.js'
import {
  arrayElementFamily,
  arrayElementIdentity,
  rangeBoundProfiles,
  type RangeBoundProfilePlan,
} from './check-array-types.js'
import {
  rangeTypeProfile,
  multirangeTypeProfile,
  rangeProfileSupport,
  rangeContainerKind,
  type RangeProfile,
} from '../../sql-semantics/range-profiles.js'

export interface CompositeNodePlan {
  typeName: string
  kind: number
  elementType: string
  child: number
  fields: number[]
  boundProfile: RangeBoundProfilePlan[]
}
const scalar = (
  typeName: string,
  kind: number,
  labels?: readonly string[],
): RangeBoundProfilePlan => ({
  typeName,
  kind,
  comparison: 0,
  canonical: 1,
  missingComparison: true,
  elementType: '',
  child: 0,
  enumLabels: labels?.join('\0') ?? '',
  enumCount: labels?.length ?? -1,
})

function rangeNodes(
  p: RangeProfile,
  multi: boolean,
  context: { defaultCollation?: 'C'; serverEncoding?: 'UTF8' },
): RangeBoundProfilePlan[] | null {
  const offset = multi ? 2 : 1,
    support = rangeProfileSupport(p, context)
  const nested = rangeContainerKind(p.elementType)
    ? rangeBoundProfiles(p, context)
    : [scalar(p.subtype, arrayElementFamily(p.elementType)!, p.subtypeEnum?.values)]
  if (!nested?.length) return null
  const children = nested.map((n, i) => ({
    ...n,
    child: n.kind >= 41 ? n.child + offset : 0,
    ...(i === 0
      ? { comparison: support.comparison, missingComparison: p.comparator === null }
      : {}),
  }))
  const range: RangeBoundProfilePlan = {
    typeName: p.identity,
    kind: 42,
    comparison: 42,
    canonical: support.canonical,
    missingComparison: false,
    elementType: p.subtype,
    child: offset,
    enumLabels: '',
    enumCount: -1,
  }
  return [
    ...(multi
      ? [
          {
            ...range,
            typeName: p.multirange,
            kind: 43,
            comparison: 43,
            canonical: 1,
            elementType: p.identity,
            child: 1,
          },
        ]
      : []),
    range,
    ...children,
  ]
}

export function compositeNodes(
  type: string,
  context: { defaultCollation?: 'C'; serverEncoding?: 'UTF8' } = {},
): CompositeNodePlan[] | null {
  const base = arrayElementBaseType(type)
  if (base.startsWith('array:')) {
    const element = base.slice(6),
      children = compositeNodes(element, context)
    if (!children) return null
    return [
      {
        typeName: arrayElementIdentity(type),
        kind: 41,
        elementType: arrayElementIdentity(element),
        child: 1,
        fields: [],
        boundProfile: [],
      },
      ...children.map((node) => ({
        ...node,
        child: node.kind === 41 ? node.child + 1 : node.child,
        fields: node.fields.map((index) => index + 1),
      })),
    ]
  }
  const p = compositeProfile(base)
  if (!p) return null
  const nodes: CompositeNodePlan[] = [],
    indices = new Map<string, number>(),
    visiting = new Set<string>()
  const append = (identity: string): number | null => {
    const n = compositePhysicalType(p, identity)
    if (!n || visiting.has(n.identity)) return null
    if (indices.has(n.identity)) return indices.get(n.identity)!
    visiting.add(n.identity)
    const logical = compositeFieldType(p, n.identity),
      kind = n.kind === 'c' ? 44 : logical ? (arrayElementFamily(logical) ?? 0) : 0
    const index = nodes.length
    const node: CompositeNodePlan = {
      typeName: n.identity,
      kind,
      elementType: '',
      child: 0,
      fields: [],
      boundProfile: [],
    }
    nodes.push(node)
    indices.set(n.identity, index)
    if (n.kind === 'c') {
      for (const field of n.fields) {
        const child = append(field.type)
        if (child === null) return null
        node.fields.push(child)
      }
    } else if (n.element) {
      const child = append(n.element),
        element = compositeFieldType(p, n.element, true)
      if (child === null || !element) return null
      node.elementType = arrayElementIdentity(element)
      node.child = child
    } else if (kind === 42 || kind === 43) {
      const profile = kind === 42 ? rangeTypeProfile(logical!) : multirangeTypeProfile(logical!)
      const bound = profile ? rangeNodes(profile, kind === 43, context) : null
      if (!bound) return null
      node.boundProfile = bound
    } else if (kind > 0)
      node.boundProfile = [
        scalar(n.identity, kind, n.kind === 'e' ? (n.enumLabels ?? []) : undefined),
      ]
    visiting.delete(n.identity)
    return index
  }
  return append(p.identity) === 0 ? nodes : null
}

export function compositePlanExpression(
  type: string,
  context: { defaultCollation?: 'C'; serverEncoding?: 'UTF8' },
  bind: (call: string) => string,
): string | null {
  const nodes = compositeNodes(type, context)
  if (!nodes) return null
  let plan = bind('empty_composite_type_plan()')
  for (const node of nodes) {
    let bounds = bind('empty_range_bound_context()')
    for (const n of node.boundProfile)
      bounds = bind(
        `append_range_bound_profile_with_canonical(${bounds},${rustStringLiteral(n.typeName)},${n.kind},${n.comparison},${n.canonical},${n.missingComparison},${rustStringLiteral(n.elementType)},${n.child},${rustStringLiteral(n.enumLabels)},${n.enumCount})`,
      )
    plan = bind(
      `append_composite_type_node(${plan},${rustStringLiteral(node.typeName)},${node.kind},${rustStringLiteral(node.elementType)},${node.child},${bounds})`,
    )
  }
  for (const [index, node] of nodes.entries())
    for (const child of node.fields)
      plan = bind(`append_composite_type_field(${plan},${index},${child})`)
  return plan
}
