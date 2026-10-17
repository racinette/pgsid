import { callableIdentity } from '../../postgres/builtins/catalog.js'
import {
  builtinBtreeComparisons,
  builtinCallables,
  builtinCast,
  builtinTypeComparison,
  builtinTypeResolution,
} from '../../postgres/builtins/inventory.js'
import {
  capturedEnumSupport,
  catalogScalarType,
  type SqlCallableExpression,
} from '../../sql-semantics/expressions.js'
import type { EvalExpression } from '../../sql-semantics/eval-expressions.js'

const scalarComparisons = new Set<string>()
const arrayComparisons = new Set<string>()
const scalarPairs = new Set<string>()
const arrayPairs = new Set<string>()
const operators = builtinCallables().filter((item) => item.kind === 'operator')
for (const item of operators) {
  const signature = callableIdentity(item)
  const support = builtinBtreeComparisons(signature)
  if (!support.length) continue
  const array = item.args.every((type) => type === 'pg_catalog.anyarray')
  if (
    !array &&
    !item.args.every(
      (type) =>
        type === 'pg_catalog.anyenum' ||
        (catalogScalarType(type) !== null && !catalogScalarType(type)!.startsWith('array:')),
    )
  )
    continue
  const target = array ? arrayComparisons : scalarComparisons
  for (const name of [signature, item.implementation, ...support.map((entry) => entry.comparator)])
    if (name) target.add(name)
  if (item.name === '=') (array ? arrayPairs : scalarPairs).add(item.args.join(','))
}
for (const item of operators) {
  if (!['<>', '!='].includes(item.name)) continue
  const key = item.args.join(',')
  const target = scalarPairs.has(key)
    ? scalarComparisons
    : arrayPairs.has(key)
      ? arrayComparisons
      : null
  if (target) {
    target.add(callableIdentity(item))
    target.add(item.implementation)
  }
}
const arrayMetadata = new Set<string>()
const arrayBuckets = new Set<string>()
const enumSupport = new Map<string, string>()
for (const item of builtinCallables()) {
  if (capturedEnumSupport(item)) enumSupport.set(callableIdentity(item), item.name)
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'width_bucket' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.length === 2 &&
    item.args[0] === 'pg_catalog.anycompatible' &&
    item.args[1] === 'pg_catalog.anycompatiblearray' &&
    item.result === 'pg_catalog.int4'
  )
    arrayBuckets.add(callableIdentity(item))
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 'i' ||
    item.returnsSet ||
    item.args[0] !== 'pg_catalog.anyarray'
  )
    continue
  if (
    ['array_larger', 'array_smaller'].includes(item.name) &&
    item.args.length === 2 &&
    item.args[1] === 'pg_catalog.anyarray' &&
    item.result === 'pg_catalog.anyarray'
  )
    arrayComparisons.add(callableIdentity(item))
  if (
    (['array_dims', 'array_ndims', 'cardinality'].includes(item.name) && item.args.length === 1) ||
    (['array_length', 'array_lower', 'array_upper'].includes(item.name) &&
      item.args.length === 2 &&
      item.args[1] === 'pg_catalog.int4')
  )
    arrayMetadata.add(callableIdentity(item))
}
const widths: Readonly<Record<string, number>> = {
  'pg_catalog.int2': 16,
  'pg_catalog.int4': 32,
  'pg_catalog.int8': 64,
}
const typeOf = (node: EvalExpression): string =>
  node.kind === 'certain'
    ? node.expression.type
    : node.kind === 'call'
      ? node.call.type
      : node.kind === 'regex-count'
        ? 'pg_catalog.int4'
        : node.type
const orderedElement = (type: string): boolean => {
  if (!type.startsWith('array:')) return false
  const element = type.slice(6)
  return (
    builtinTypeComparison(element.startsWith('enum:') ? 'pg_catalog.anyenum' : element)
      ?.btreeClass != null
  )
}
export function rustCallCanFail(call: SqlCallableExpression, types: readonly string[]): boolean {
  if (call.kind === 'cast' && call.signature === null) return false
  if (!call.signature) return true
  const enumFunction = enumSupport.get(call.signature)
  if (
    enumFunction &&
    (enumFunction === 'enum_range' ||
      (call.kind !== 'cast' && call.enum && call.enum.values.length > 0))
  )
    return false
  if (scalarComparisons.has(call.signature) || arrayMetadata.has(call.signature)) return false
  if (arrayComparisons.has(call.signature) && types.every(orderedElement)) return false
  if (types.length !== 1) return true
  const from = types[0]!,
    to = call.type,
    cast = builtinCast(from, to)
  if (cast?.implementation !== call.signature) return true
  if (builtinTypeResolution(to)?.category === 'S') return false
  if (widths[from] && widths[to] && widths[from]! <= widths[to]!) return false
  if (
    widths[from] &&
    ['pg_catalog."numeric"', 'pg_catalog.float4', 'pg_catalog.float8'].includes(to)
  )
    return false
  if (from === 'pg_catalog.float4' && to === 'pg_catalog.float8') return false
  if (
    (from === 'pg_catalog.bool' && to === 'pg_catalog.int4') ||
    (from === 'pg_catalog.int4' && to === 'pg_catalog.bool')
  )
    return false
  return true
}

export function rustArrayCastAlwaysValid(
  node: Extract<EvalExpression, { kind: 'array-coerce' }>,
): boolean {
  if (!rustCallCanFail(node.conversion, [node.sourceElementType])) return true
  const from = node.sourceElementType,
    to = node.elementType
  if (
    node.modifier >= -1 &&
    ['pg_catalog."bit"', 'pg_catalog.varbit'].includes(to) &&
    ['pg_catalog.int4', 'pg_catalog.int8', 'pg_catalog."bit"', 'pg_catalog.varbit'].includes(from)
  )
    return true
  return (
    (from === 'pg_catalog.money' && to === 'pg_catalog."numeric"') ||
    (from === 'pg_catalog."time"' && to === 'pg_catalog.timetz') ||
    (from === 'pg_catalog.timestamptz' && ['pg_catalog."time"', 'pg_catalog.timetz'].includes(to))
  )
}

export function rustScalarOwnCanFail(node: EvalExpression): boolean {
  switch (node.kind) {
    case 'input':
    case 'input-null-test':
    case 'certain':
    case 'null-test':
    case 'case':
    case 'coalesce':
    case 'boolean-logic':
    case 'check':
    case 'io-to-text':
    case 'array-to-text':
    case 'clock-to-text':
    case 'uuid-to-text':
    case 'mac-to-text':
    case 'bit-to-text':
    case 'refcursor-text-coercion':
    case 'array-subscript':
      return false
    case 'call': {
      const thresholds = node.operands[1]
      if (
        node.call.signature &&
        arrayBuckets.has(node.call.signature) &&
        thresholds?.kind === 'array-constructor' &&
        !thresholds.multidimensional &&
        orderedElement(thresholds.type) &&
        thresholds.operands.every(
          (element) =>
            element.kind === 'certain' &&
            (('value' in element.expression && element.expression.value !== null) ||
              ('bits' in element.expression && element.expression.bits !== null)),
        )
      )
        return false
      return rustCallCanFail(node.call, node.operands.map(typeOf))
    }
    case 'array-constructor':
      return node.multidimensional
    case 'array-io-coerce':
      return !(
        builtinTypeResolution(node.elementType)?.category === 'S' ||
        (node.sourceElementType === 'pg_catalog.jsonb' && node.elementType === 'pg_catalog."json"')
      )
    case 'array-coerce':
      return !rustArrayCastAlwaysValid(node)
    case 'distinct':
    case 'nullif':
      return rustCallCanFail(node.comparison, node.operands.map(typeOf))
    case 'minmax':
      return rustCallCanFail(node.comparison, [node.type, node.type])
    case 'membership':
      return rustCallCanFail(node.comparison, [typeOf(node.subject), typeOf(node.subject)])
    case 'row-compare':
      return node.pairs.some((pair) => rustCallCanFail(pair.comparison, pair.operands.map(typeOf)))
    default:
      return true
  }
}
const children = [
  'operand',
  'operands',
  'expression',
  'scrutinee',
  'branches',
  'when',
  'then',
  'otherwise',
  'subject',
  'groups',
  'pairs',
  'upper',
  'lower',
]
const record = (node: unknown): Record<string, unknown> | null =>
  node !== null && typeof node === 'object' && !Array.isArray(node)
    ? (node as Record<string, unknown>)
    : null
const booleanConstant = (node: unknown): boolean | null | undefined => {
  const value = record(node)
  if (value?.kind === 'eval-scalar' || value?.kind === 'check')
    return booleanConstant(value.expression)
  const expression = value?.kind === 'certain' ? record(value.expression) : null
  return expression?.kind === 'boolean' ? (expression.value as boolean | null) : undefined
}
const reachableChildren = (value: Record<string, unknown>): unknown[] => {
  if (
    (value.kind === 'case' || value.kind === 'eval-case') &&
    !value.scrutinee &&
    Array.isArray(value.branches)
  ) {
    const result: unknown[] = []
    for (const node of value.branches) {
      const branch = record(node)
      if (!branch) continue
      result.push(branch.when)
      const condition = booleanConstant(branch.when)
      if (condition !== false && condition !== null) result.push(branch.then)
      if (condition === true) return result
    }
    return [...result, value.otherwise]
  }
  if (
    (value.kind === 'boolean-logic' || value.kind === 'eval-boolean-logic') &&
    Array.isArray(value.operands)
  ) {
    const condition = booleanConstant(value.operands[0])
    if (
      (value.operation === 'and' && condition === false) ||
      (value.operation === 'or' && condition === true)
    )
      return [value.operands[0]]
  }
  if (value.kind === 'coalesce' && Array.isArray(value.operands)) {
    const result: unknown[] = []
    for (const node of value.operands) {
      result.push(node)
      const operand = record(node),
        expression = operand?.kind === 'certain' ? record(operand.expression) : null
      if (expression && Object.hasOwn(expression, 'value') && expression.value !== null) break
    }
    return result
  }
  return children.map((key) => value[key])
}
export function rustExpressionCanFail(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false
  if (Array.isArray(node)) return node.some(rustExpressionCanFail)
  const value = node as Record<string, unknown>
  if (value.kind === 'certain') return false
  const boolKind = typeof value.kind === 'string' && value.kind.startsWith('eval-')
  if (!boolKind && typeof value.kind === 'string' && rustScalarOwnCanFail(value as EvalExpression))
    return true
  return reachableChildren(value).some(rustExpressionCanFail)
}
export function rustExpressionInputs(
  nodes: readonly unknown[],
): Extract<EvalExpression, { kind: 'input' | 'input-null-test' }>[] {
  const result = new Map<string, Extract<EvalExpression, { kind: 'input' | 'input-null-test' }>>()
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    const value = node as Record<string, unknown>
    if (value.kind === 'input' || value.kind === 'input-null-test') {
      const input = value as Extract<EvalExpression, { kind: 'input' | 'input-null-test' }>
      result.set(input.name, input)
      return
    }
    reachableChildren(value).forEach(visit)
  }
  nodes.forEach(visit)
  return [...result.values()]
}
