import type { CompositeTypeGraph, StoredRowCoercionContext } from '../catalog/types.js'

type Fields = Record<string, unknown>
type Cast = StoredRowCoercionContext['casts'][number]
type Identity = { identity: string; depth: number }
export type RowCoercionSites = ReadonlyMap<unknown, readonly Cast[]>
export type RowConstructorBinding = NonNullable<
  StoredRowCoercionContext['constructors']
>[number] & { source?: true }
export type RowConstructorBindings = ReadonlyMap<unknown, RowConstructorBinding>
const fields = (x: unknown): Fields | null =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Fields) : null

export function alignStoredRowConstructors(
  root: unknown,
  context: StoredRowCoercionContext,
): RowConstructorBindings {
  const result = new Map<unknown, RowConstructorBinding>()
  if (!context.complete) return result
  walkStoredExpression(root, (node, site) => {
    const row = fields(fields(node)?.['RowExpr'])
    if (!row || !Array.isArray(row['args'] ?? [])) return
    const matches = context.constructors?.filter((c) => c.site === site) ?? []
    if (matches.length === 1) result.set(row, matches[0]!)
  })
  return result
}

export function alignStoredRowCoercions(
  root: unknown,
  context: StoredRowCoercionContext,
  graph?: CompositeTypeGraph,
): RowCoercionSites {
  const result = new Map<unknown, Cast[]>()
  if (!context.complete || !graph) return result
  const physical = (identity: string, seen = new Set<string>()): Identity | null => {
    if (seen.has(identity)) return null
    seen.add(identity)
    const node = graph.definitions.find((n) => n.identity === identity)
    if (!node) return null
    if (node.kind === 'c') return { identity, depth: 0 }
    if (node.kind === 'd' && node.base) return physical(node.base, seen)
    const element = node.element ? physical(node.element, seen) : null
    return element ? { ...element, depth: element.depth + 1 } : null
  }
  const target = (raw: unknown): Identity | null => {
    const type = fields(raw),
      parts = type?.['names']
    if (!Array.isArray(parts)) return null
    const names = parts.map((n) => fields(fields(n)?.['String'])?.['sval'])
    if (!names.every((n) => typeof n === 'string')) return null
    const matches = graph.definitions.filter((n) =>
      names.length === 2
        ? n.schema === names[0] && n.name === names[1]
        : names.length === 1 && n.name === names[0],
    )
    if (matches.length !== 1) return null
    const value = physical(matches[0]!.identity),
      bounds = type?.['arrayBounds']
    return value
      ? { ...value, depth: value.depth + (Array.isArray(bounds) && bounds.length ? 1 : 0) }
      : null
  }
  const groups = new Map<string, { node: unknown; target: Identity; source: Identity | null }[]>()
  walkStoredExpression(root, (node, site) => {
    const wrapper = fields(node)
    if (!wrapper) return
    const cast = fields(wrapper['TypeCast'])
    if (cast) {
      const to = target(cast['typeName']),
        arg = fields(cast['arg']),
        inner = fields(arg?.['TypeCast']),
        from = inner ? target(inner['typeName']) : null
      if (
        to &&
        !arg?.['RowExpr'] &&
        !arg?.['A_Const'] &&
        (!from || from.identity !== to.identity || from.depth !== to.depth)
      ) {
        const group = groups.get(site) ?? []
        group.push({ node, target: to, source: from })
        groups.set(site, group)
      }
    }
  })
  for (const [site, nodes] of groups) {
    const casts = context.casts.filter((c) => c.site === site)
    if (!casts.length) continue
    const match = (i: number, j: number) => {
      const cast = casts[i]!,
        node = nodes[j]!
      return (
        cast.target === node.target.identity &&
        cast.depth === node.target.depth &&
        (!node.source || (cast.source === node.source.identity && cast.depth === node.source.depth))
      )
    }
    const earliest: number[] = [],
      latest: number[] = []
    let index = 0
    for (let i = 0; i < casts.length; i++) {
      while (index < nodes.length && !match(i, index)) index++
      if (index === nodes.length) break
      earliest.push(index++)
    }
    if (earliest.length !== casts.length) continue
    index = nodes.length - 1
    for (let i = casts.length - 1; i >= 0; i--) {
      while (index >= 0 && !match(i, index)) index--
      if (index < 0) break
      latest[i] = index--
    }
    if (latest.length !== casts.length) continue
    casts.forEach((cast, i) => {
      if (earliest[i] === latest[i]) result.set(nodes[earliest[i]!]!.node, [cast])
    })
  }
  return result
}

export function walkStoredExpression(
  root: unknown,
  inspect: (node: unknown, site: string) => void,
): void {
  const visit = (node: unknown, site: string): void => {
    const wrapper = fields(node)
    if (!wrapper) return
    inspect(node, site)
    const cast = fields(wrapper['TypeCast'])
    if (cast) {
      visit(cast['arg'], site)
      return
    }
    const at = (part: string) => site + '/' + part,
      list = (raw: unknown, part: string) => {
        if (Array.isArray(raw)) raw.forEach((v, i) => visit(v, at(part + '/' + i)))
      }
    const xml = fields(wrapper['XmlExpr']),
      serialized = fields(wrapper['XmlSerialize'])
    if (xml || serialized) {
      if (xml) {
        list(xml['args'], 'xml/arg')
        const named = xml['named_args']
        if (Array.isArray(named))
          named.forEach((arg, i) =>
            visit(fields(fields(arg)?.['ResTarget'])?.['val'] ?? arg, at('xml/named/' + i)),
          )
      } else visit(serialized?.['expr'], at('xml/arg/0'))
      return
    }
    const op = fields(wrapper['A_Expr'])
    if (op) {
      if (['AEXPR_DISTINCT', 'AEXPR_NOT_DISTINCT'].includes(String(op['kind']))) {
        const operands = [op['lexpr'], op['rexpr']],
          nullIndex = operands.findIndex(
            (value) => fields(fields(value)?.['A_Const'])?.['isnull'] === true,
          )
        if (nullIndex >= 0) {
          visit(operands[1 - nullIndex], at('nulltest'))
          return
        }
      }
      if (op['lexpr']) visit(op['lexpr'], at('operator/0'))
      visit(op['rexpr'], at('operator/' + (op['lexpr'] ? 1 : 0)))
      return
    }
    const boolean = fields(wrapper['BoolExpr'])
    if (boolean) {
      const args = boolean['args'],
        negated =
          Array.isArray(args) && args.length === 1 ? fields(fields(args[0])?.['A_Expr']) : null
      if (boolean['boolop'] === 'NOT_EXPR' && negated?.['kind'] === 'AEXPR_DISTINCT')
        visit((args as unknown[])[0], site)
      else list(args, 'boolean/' + String(boolean['boolop']).replace('_EXPR', '').toLowerCase())
      return
    }
    const choice = fields(wrapper['CaseExpr'])
    if (choice) {
      visit(choice['arg'], at('case/arg'))
      const args = choice['args']
      if (Array.isArray(args))
        args.forEach((arg, i) => {
          const when = fields(fields(arg)?.['CaseWhen'])
          visit(when?.['expr'], at('case/when/' + i + '/condition'))
          visit(when?.['result'], at('case/when/' + i + '/result'))
        })
      visit(choice['defresult'], at('case/else'))
      return
    }
    for (const [key, role, property] of [
      ['CoalesceExpr', 'coalesce', 'args'],
      ['MinMaxExpr', 'minmax', 'args'],
      ['FuncCall', 'call', 'args'],
      ['A_ArrayExpr', 'array', 'elements'],
      ['RowExpr', 'row', 'args'],
    ] as const) {
      const value = fields(wrapper[key])
      if (value) {
        list(value[property], role)
        return
      }
    }
    const indirect = fields(wrapper['A_Indirection'])
    if (indirect) {
      const items = indirect['indirection']
      if (!Array.isArray(items) || !items.length) return
      if (items.every((item) => fields(item)?.['A_Indices'])) {
        visit(indirect['arg'], at('subscript/base'))
        items.forEach((item, i) => {
          const index = fields(fields(item)?.['A_Indices'])
          visit(index?.['lidx'], at('subscript/' + i + '/lower'))
          visit(index?.['uidx'], at('subscript/' + i + '/upper'))
        })
      } else if (
        items.length === 1 &&
        (fields(items[0])?.['String'] || fields(items[0])?.['A_Star'])
      )
        visit(indirect['arg'], at('field'))
      return
    }
    for (const [key, role] of [
      ['NullTest', 'nulltest'],
      ['BooleanTest', 'booltest'],
      ['CollateClause', ''],
      ['NamedArgExpr', ''],
    ] as const) {
      const value = fields(wrapper[key])
      if (value) {
        visit(value['arg'], role ? at(role) : site)
        return
      }
    }
  }
  visit(root, '')
}
