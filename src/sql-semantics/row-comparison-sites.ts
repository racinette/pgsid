type Fields = Record<string, unknown>
const fields = (value: unknown): Fields | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Fields) : null

const row = (value: unknown): { args: unknown[]; cast: boolean } | null => {
  const wrapper = fields(value),
    cast = fields(wrapper?.['TypeCast'])
  if (cast) {
    const inner = row(cast['arg'])
    return inner ? { ...inner, cast: true } : null
  }
  const expression = fields(wrapper?.['RowExpr']),
    args = expression?.['args'] ?? []
  return expression && Array.isArray(args) ? { args, cast: false } : null
}
const argumentsOf = (value: unknown, operation: string, count: number): unknown[] | null => {
  if (count === 1) return [value]
  const expression = fields(fields(value)?.['BoolExpr']),
    args = expression?.['args']
  return expression?.['boolop'] === operation && Array.isArray(args) && args.length === count
    ? args
    : null
}
const scalarComparison = (value: unknown, kind: string, operator?: string): boolean => {
  const expression = fields(fields(value)?.['A_Expr'])
  if (expression?.['kind'] !== kind) return false
  if (operator) {
    const names = expression['name']
    if (!Array.isArray(names) || fields(fields(names.at(-1))?.['String'])?.['sval'] !== operator)
      return false
  }
  return true
}

export function isExpandedRowComparison(
  source: unknown,
  stored: unknown,
  namedOnly = true,
): boolean {
  const expression = fields(fields(source)?.['A_Expr']),
    left = row(expression?.['lexpr'])
  if (!expression || !left || (namedOnly && !left.cast) || !left.args.length) return false
  const kind = expression['kind']
  if (kind === 'AEXPR_DISTINCT' || kind === 'AEXPR_NOT_DISTINCT') {
    const right = row(expression['rexpr'])
    if (!right || right.args.length !== left.args.length) return false
    let selected = stored
    if (kind === 'AEXPR_NOT_DISTINCT') {
      const negation = fields(fields(selected)?.['BoolExpr']),
        args = negation?.['args']
      if (negation?.['boolop'] !== 'NOT_EXPR' || !Array.isArray(args) || args.length !== 1)
        return false
      selected = args[0]
    }
    const terms = argumentsOf(selected, 'OR_EXPR', left.args.length)
    if (!terms || !terms.every((term) => scalarComparison(term, 'AEXPR_DISTINCT'))) return false
    if (terms.length === 1) {
      const scalar = fields(fields(terms[0])?.['A_Expr'])
      if (row(scalar?.['lexpr']) || row(scalar?.['rexpr'])) return false
    }
    return true
  }
  if (kind !== 'AEXPR_IN') return false
  const right = fields(fields(expression['rexpr'])?.['List'])?.['items'] ?? expression['rexpr']
  if (!Array.isArray(right) || !right.length) return false
  const names = expression['name']
  if (!Array.isArray(names)) return false
  const operation = fields(fields(names.at(-1))?.['String'])?.['sval'],
    equal = operation === '='
  if (!equal && operation !== '<>') return false
  if (!right.every((value) => row(value)?.args.length === left.args.length)) return false
  const rows = argumentsOf(stored, equal ? 'OR_EXPR' : 'AND_EXPR', right.length)
  return (
    !!rows &&
    rows.every((value) => {
      const terms = argumentsOf(value, equal ? 'AND_EXPR' : 'OR_EXPR', left.args.length)
      if (!terms || !terms.every((term) => scalarComparison(term, 'AEXPR_OP', equal ? '=' : '<>')))
        return false
      if (terms.length === 1) {
        const scalar = fields(fields(terms[0])?.['A_Expr'])
        return !row(scalar?.['lexpr']) && !row(scalar?.['rexpr'])
      }
      return true
    })
  )
}

export interface ExpandedBooleanPair {
  source: unknown
  stored: unknown
  selection?: { nodes: unknown[]; operation: 'and' | 'or' }
}

export function alignExpandedBooleanArguments(
  source: unknown,
  stored: unknown,
): ExpandedBooleanPair[] | null {
  const a = fields(fields(source)?.['BoolExpr']),
    b = fields(fields(stored)?.['BoolExpr']),
    left = a?.['args'],
    right = b?.['args'],
    kind = a?.['boolop']
  if (
    !Array.isArray(left) ||
    !Array.isArray(right) ||
    left.length >= right.length ||
    kind !== b?.['boolop'] ||
    !['AND_EXPR', 'OR_EXPR'].includes(String(kind))
  )
    return null
  const result: ExpandedBooleanPair[] = []
  let position = 0
  for (const [index, node] of left.entries()) {
    if (position >= right.length) return null
    if (isExpandedRowComparison(node, right[position], false)) {
      result.push({ source: node, stored: right[position++] })
      continue
    }
    let count = 1
    for (let length = 2; length <= right.length - position - (left.length - index - 1); length++) {
      const selected = {
        BoolExpr: { boolop: kind, args: right.slice(position, position + length) },
      }
      if (isExpandedRowComparison(node, selected, false)) {
        count = length
        break
      }
    }
    const nodes = right.slice(position, position + count)
    result.push(
      count === 1
        ? { source: node, stored: nodes[0] }
        : {
            source: node,
            stored: { BoolExpr: { boolop: kind, args: nodes } },
            selection: { nodes, operation: kind === 'AND_EXPR' ? 'and' : 'or' },
          },
    )
    position += count
  }
  return position === right.length ? result : null
}
