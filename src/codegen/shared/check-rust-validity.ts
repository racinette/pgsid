import { arrayElementComparison } from './check-array-types.js'
import { rangeTypeProfile, multirangeTypeProfile } from '../../sql-semantics/range-profiles.js'
import { supportsTextCallableCollation } from '../../sql-semantics/collation.js'
import {
  nativeHashContext,
  isArrayHash,
  isRangeHash,
  isMultirangeHash,
  rangeHashSupport,
} from './check-hash-context.js'
import { characterEncodingContext } from './check-character-context.js'
import { callableIdentity } from '../../postgres/builtins/catalog.js'
import {
  builtinBtreeComparisons,
  builtinCallables,
  builtinCast,
  builtinMetadata,
  builtinTypeComparison,
  builtinTypeResolution,
} from '../../postgres/builtins/inventory.js'
import {
  capturedEnumSupport,
  catalogScalarType,
  arrayElementBaseType,
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
  let element = arrayElementBaseType(type.slice(6))
  while (element.startsWith('array:')) element = arrayElementBaseType(element.slice(6))
  return (
    builtinTypeComparison(element.startsWith('enum:') ? 'pg_catalog.anyenum' : element)
      ?.btreeClass != null
  )
}
type ValidityContext = { serverEncoding?: 'UTF8' }
export function rustCallCanFail(
  call: SqlCallableExpression,
  types: readonly string[],
  context: ValidityContext = {},
): boolean {
  if (call.kind === 'cast' && call.signature === null) return false
  if (!call.signature) return true
  if (nativeHashContext(builtinMetadata(call.signature))) return false
  const hash = builtinMetadata(call.signature)
  if (isRangeHash(hash) || isMultirangeHash(hash)) {
    const range = isMultirangeHash(hash)
      ? multirangeTypeProfile(types[0] ?? '')
      : rangeTypeProfile(types[0] ?? '')
    if (range && rangeHashSupport(range, hash.args.length === 2).safe) return false
  }
  if (
    hash.kind === 'function' &&
    hash.schema === 'pg_catalog' &&
    hash.strict &&
    hash.volatility === 'i' &&
    !hash.returnsSet &&
    hash.args.length === 1 &&
    types.length === 1
  ) {
    const inputType = hash.args[0]
    const bitSend =
      hash.result === 'pg_catalog.bytea' &&
      ((hash.name === 'bit_send' && inputType === 'pg_catalog."bit"') ||
        (hash.name === 'varbit_send' && inputType === 'pg_catalog.varbit'))
    const networkSend =
      hash.result === 'pg_catalog.bytea' &&
      ((hash.name === 'inet_send' && inputType === 'pg_catalog.inet') ||
        (hash.name === 'cidr_send' && inputType === 'pg_catalog.cidr'))
    const bitCount =
      hash.name === 'bit_count' &&
      hash.result === 'pg_catalog.int8' &&
      ['pg_catalog."bit"', 'pg_catalog.bytea'].includes(inputType!)
    const numericSend =
      hash.name === 'numeric_send' &&
      inputType === 'pg_catalog."numeric"' &&
      hash.result === 'pg_catalog.bytea'
    const ascii = characterEncodingContext(hash) === 'ascii' && context.serverEncoding === 'UTF8'
    const uuidTimestamp =
      hash.name === 'uuid_extract_timestamp' &&
      inputType === 'pg_catalog.uuid' &&
      hash.result === 'pg_catalog.timestamptz'
    const md5 =
      hash.name === 'md5' &&
      hash.result === 'pg_catalog.text' &&
      (inputType === 'pg_catalog.bytea' || inputType === 'pg_catalog.text')
    const sha2 =
      ['sha224', 'sha256', 'sha384', 'sha512'].includes(hash.name) &&
      inputType === 'pg_catalog.bytea' &&
      hash.result === 'pg_catalog.bytea'
    if (bitSend || networkSend || bitCount || numericSend || ascii || uuidTimestamp || md5 || sha2)
      return false
  }
  if (isArrayHash(hash) && types[0]?.startsWith('array:')) {
    let current = types[0]
    let safe = true
    while (current.startsWith('array:')) {
      const element = current.slice(6),
        support = arrayElementComparison(element),
        signature = hash.args.length === 1 ? support?.hash : support?.hashExtended,
        metadata = signature
          ? builtinCallables().find((item) => callableIdentity(item) === signature)
          : null
      if (
        !metadata ||
        !(isArrayHash(metadata) || isRangeHash(metadata) || isMultirangeHash(metadata))
      )
        safe = false
      current = arrayElementBaseType(element)
    }
    const range = rangeTypeProfile(current) ?? multirangeTypeProfile(current)
    if (range) {
      return !(safe && rangeHashSupport(range, hash.args.length === 2).safe)
    }
    let element = arrayElementBaseType(types[0].slice(6))
    while (element.startsWith('array:')) element = arrayElementBaseType(element.slice(6))
    const support = builtinTypeComparison(
      element.startsWith('enum:') ? 'pg_catalog.anyenum' : element,
    )
    const signature = hash.args.length === 1 ? support?.hash : support?.hashExtended
    if (signature) {
      const fn = builtinMetadata(signature)
      if (
        !['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog.name'].includes(fn.args[0] ?? '') ||
        (call.kind !== 'cast' && call.collationDefault) ||
        supportsTextCallableCollation(signature, call.kind === 'cast' ? undefined : call.collation)
      )
        return false
    }
  }

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
  context: ValidityContext = {},
): boolean {
  if (!rustCallCanFail(node.conversion, [node.sourceElementType], context)) return true
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

const zeroOrNonfiniteFloat = (node: EvalExpression): boolean => {
  if (
    node.kind === 'certain' &&
    node.expression.kind === 'float' &&
    node.expression.type === 'pg_catalog.float8'
  ) {
    const bits = node.expression.bits
    if (bits === null) return false
    const magnitude = BigInt('0x' + bits) & 0x7fffffffffffffffn
    return magnitude === 0n || (magnitude & 0x7ff0000000000000n) === 0x7ff0000000000000n
  }
  return (
    node.kind === 'text-to-float' &&
    node.type === 'pg_catalog.float8' &&
    node.operand.kind === 'certain' &&
    node.operand.expression.kind === 'text' &&
    node.operand.expression.value !== null &&
    /^[\t\n\v\f\r ]*[+-]?(?:nan|inf(?:inity)?|(?:0+(?:\.0*)?|\.0+)(?:e[+-]?\d+)?)[\t\n\v\f\r ]*$/i.test(
      node.operand.expression.value,
    )
  )
}
const safePathTranslation = (node: Extract<EvalExpression, { kind: 'call' }>): boolean => {
  if (!node.call.signature || node.operands.length !== 2) return false
  const metadata = builtinMetadata(node.call.signature)
  const implementation =
    metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
  if (
    implementation.kind !== 'function' ||
    implementation.schema !== 'pg_catalog' ||
    !implementation.strict ||
    implementation.volatility !== 'i' ||
    implementation.returnsSet ||
    !['path_add_pt', 'path_sub_pt'].includes(implementation.name) ||
    implementation.result !== 'pg_catalog.path' ||
    implementation.args.join(',') !== 'pg_catalog.path,pg_catalog.point'
  )
    return false
  const vector = node.operands[1]!
  if (vector.kind !== 'call' || !vector.call.signature || vector.operands.length !== 2) return false
  const point = builtinMetadata(vector.call.signature)
  return (
    point.kind === 'function' &&
    point.schema === 'pg_catalog' &&
    point.name === 'point' &&
    point.strict &&
    point.volatility === 'i' &&
    !point.returnsSet &&
    point.result === 'pg_catalog.point' &&
    point.args.join(',') === 'pg_catalog.float8,pg_catalog.float8' &&
    vector.operands.every(zeroOrNonfiniteFloat)
  )
}

const safeFloatEncoding = (node: Extract<EvalExpression, { kind: 'call' }>): boolean => {
  if (!node.call.signature || node.operands.length !== 2) return false
  const metadata = builtinMetadata(node.call.signature)
  const [input, format] = node.operands
  if (
    metadata.kind !== 'function' ||
    metadata.schema !== 'pg_catalog' ||
    metadata.name !== 'encode' ||
    !metadata.strict ||
    metadata.volatility !== 'i' ||
    metadata.returnsSet ||
    metadata.args.join(',') !== 'pg_catalog.bytea,pg_catalog.text' ||
    metadata.result !== 'pg_catalog.text' ||
    input?.kind !== 'call' ||
    !input.call.signature ||
    format?.kind !== 'certain' ||
    format.expression.kind !== 'text' ||
    format.expression.value === null ||
    !['hex', 'base64', 'escape'].includes(format.expression.value.toLowerCase())
  )
    return false
  const send = builtinMetadata(input.call.signature)
  return (
    send.kind === 'function' &&
    send.schema === 'pg_catalog' &&
    send.strict &&
    send.volatility === 'i' &&
    !send.returnsSet &&
    send.result === 'pg_catalog.bytea' &&
    send.args.length === 1 &&
    ((send.name === 'float4send' && send.args[0] === 'pg_catalog.float4') ||
      (send.name === 'float8send' && send.args[0] === 'pg_catalog.float8'))
  )
}

export function rustScalarOwnCanFail(node: EvalExpression, context: ValidityContext = {}): boolean {
  switch (node.kind) {
    case 'captured-range-call':
      return true
    case 'array-domain-coerce':
      return true
    case 'domain-cast':
      return node.notNull || node.checks.length > 0
    case 'input':
    case 'composite-null':
    case 'composite-constructor':
    case 'composite-field':
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
      if (safePathTranslation(node) || safeFloatEncoding(node)) return false
      if (node.call.signature !== null && node.operands.length === 3) {
        const callable = builtinMetadata(node.call.signature)
        const explicit = node.operands[2]
        if (
          callable.kind === 'function' &&
          callable.schema === 'pg_catalog' &&
          callable.name === 'varchar' &&
          callable.args.join(',') === 'pg_catalog."varchar",pg_catalog.int4,pg_catalog.bool' &&
          callable.result === 'pg_catalog."varchar"' &&
          explicit?.kind === 'certain' &&
          explicit.expression.kind === 'boolean' &&
          explicit.expression.value === true
        )
          return false
      }
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
      return rustCallCanFail(node.call, node.operands.map(typeOf), context)
    }
    case 'array-constructor':
      return node.multidimensional
    case 'array-io-coerce':
      return !(
        builtinTypeResolution(node.elementType)?.category === 'S' ||
        (node.sourceElementType === 'pg_catalog.jsonb' && node.elementType === 'pg_catalog."json"')
      )
    case 'array-coerce':
      return !rustArrayCastAlwaysValid(node, context)
    case 'distinct':
    case 'nullif':
      return rustCallCanFail(node.comparison, node.operands.map(typeOf), context)
    case 'minmax':
      return rustCallCanFail(node.comparison, [node.type, node.type], context)
    case 'membership':
      return rustCallCanFail(node.comparison, [typeOf(node.subject), typeOf(node.subject)], context)
    case 'array-quantifier':
      return rustCallCanFail(node.comparison, [typeOf(node.operands[0]), node.elementType], context)
    case 'row-compare':
      return node.pairs.some((pair) =>
        rustCallCanFail(pair.comparison, pair.operands.map(typeOf), context),
      )
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
export function rustExpressionCanFail(node: unknown, context: ValidityContext = {}): boolean {
  if (!node || typeof node !== 'object') return false
  if (Array.isArray(node)) return node.some((node) => rustExpressionCanFail(node, context))
  const value = node as Record<string, unknown>
  if (value.kind === 'certain') return false
  const boolKind = typeof value.kind === 'string' && value.kind.startsWith('eval-')
  if (
    !boolKind &&
    typeof value.kind === 'string' &&
    rustScalarOwnCanFail(value as EvalExpression, context)
  )
    return true
  return reachableChildren(value).some((node) => rustExpressionCanFail(node, context))
}
export function rustExpressionValidityProbes(
  nodes: readonly unknown[],
  context: ValidityContext = {},
): EvalExpression[] {
  const inputs = new Map<string, EvalExpression>()
  const computations = new Set<EvalExpression>()
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    const value = node as Record<string, unknown>
    if (value.kind === 'input' || value.kind === 'input-null-test') {
      const input = value as Extract<EvalExpression, { kind: 'input' | 'input-null-test' }>
      inputs.set(input.name, input)
      return
    }
    if (value.kind === 'certain') return
    if (
      typeof value.kind === 'string' &&
      !value.kind.startsWith('eval-') &&
      rustScalarOwnCanFail(value as EvalExpression, context)
    ) {
      computations.add(value as EvalExpression)
      return
    }
    reachableChildren(value).forEach(visit)
  }
  nodes.forEach(visit)
  return [...computations, ...inputs.values()]
}
