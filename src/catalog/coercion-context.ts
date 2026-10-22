import type { StoredDomainCoercionContext, StoredRowCoercionContext } from './types.js'

type Value = string | Value[] | Tree
type Tree = { kind: string; fields: Record<string, Value[]> }
export type DomainCoercionIdentity = { schema: string; name: string; array: boolean }
export type RowCoercionIdentity = { identity: string; depth: number }

function parseTree(source: string): Value {
  const tokens: string[] = []
  let index = 0
  while (index < source.length) {
    if (/\s/u.test(source[index]!)) {
      index++
      continue
    }
    const start = index,
      first = source[index]!
    if ('{}()[]'.includes(first)) {
      tokens.push(first)
      index++
      continue
    }
    const quoted = first === '"'
    if (quoted) index++
    while (index < source.length) {
      const char = source[index]!
      if (char === '\\') {
        index += 2
        continue
      }
      if (quoted ? char === '"' : /\s/u.test(char) || '{}()[]'.includes(char)) break
      index++
    }
    if (quoted) {
      if (source[index] !== '"') throw new Error('Unclosed catalog string')
      index++
    }
    if (index === start) throw new Error('Invalid catalog token')
    tokens.push(source.slice(start, index))
  }
  let position = 0
  const value = (): Value => {
    const token = tokens[position++]
    if (token === undefined) throw new Error('Incomplete catalog expression')
    if (token === '{') {
      const kind = tokens[position++]
      if (!kind || !/^[A-Za-z][A-Za-z0-9_]*$/u.test(kind)) throw new Error('Invalid catalog node')
      const fields: Record<string, Value[]> = {}
      while (tokens[position] !== '}') {
        const key = tokens[position++]
        if (!key || !/^:[A-Za-z][A-Za-z0-9_]*$/u.test(key) || Object.hasOwn(fields, key.slice(1)))
          throw new Error('Invalid catalog field')
        const values: Value[] = []
        while (tokens[position] !== '}' && !tokens[position]?.startsWith(':')) values.push(value())
        fields[key.slice(1)] = values
      }
      position++
      return { kind, fields }
    }
    if (token === '(' || token === '[') {
      const close = token === '(' ? ')' : ']'
      const list: Value[] = []
      while (tokens[position] !== close) list.push(value())
      position++
      return list
    }
    if ('})]'.includes(token)) throw new Error('Unexpected catalog delimiter')
    return token
  }
  const result = value()
  if (position !== tokens.length) throw new Error('Trailing catalog expression')
  return result
}

const tree = (value: Value | undefined): Tree | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : null
const scalar = (node: Tree, name: string): string | null => {
  const values = node.fields[name]
  return values?.length === 1 && typeof values[0] === 'string' ? values[0] : null
}

export function captureRowCoercionContext(
  source: string | null,
  definition: string,
  identities: ReadonlyMap<number, RowCoercionIdentity>,
): StoredRowCoercionContext | undefined {
  if (!source || !/\{(?:COERCEVIAIO|CONVERTROWTYPEEXPR|FUNCEXPR|ARRAYCOERCEEXPR)\s/u.test(source))
    return undefined
  const casts: StoredRowCoercionContext['casts'] = []
  let complete = true
  const expressionType = (node: Tree): string | null => {
    const field: Record<string, string> = {
      VAR: 'vartype',
      CONST: 'consttype',
      PARAM: 'paramtype',
      FUNCEXPR: 'funcresulttype',
      OPEXPR: 'opresulttype',
      NULLIFEXPR: 'opresulttype',
      CASEEXPR: 'casetype',
      COALESCEEXPR: 'coalescetype',
      MINMAXEXPR: 'minmaxtype',
      ARRAYEXPR: 'array_typeid',
      ROWEXPR: 'row_typeid',
      CASETESTEXPR: 'typeId',
      COERCETODOMAINVALUE: 'typeId',
      SQLVALUEFUNCTION: 'type',
      SUBSCRIPTINGREF: 'refrestype',
    }
    if (node.kind === 'COLLATEEXPR') {
      const arg = tree(node.fields['arg']?.[0])
      return arg ? expressionType(arg) : null
    }
    return scalar(node, field[node.kind] ?? 'resulttype')
  }
  const conversionKind = (node: Tree | null): 'io' | 'row' | 'function' | null => {
    if (!node) return null
    if (node.kind === 'COERCEVIAIO') return 'io'
    if (node.kind === 'CONVERTROWTYPEEXPR') return 'row'
    if (node.kind === 'FUNCEXPR') return 'function'
    if (node.kind === 'COERCETODOMAIN' || node.kind === 'RELABELTYPE')
      return conversionKind(tree(node.fields['arg']?.[0]))
    if (node.kind === 'ARRAYCOERCEEXPR') return conversionKind(tree(node.fields['elemexpr']?.[0]))
    return null
  }
  try {
    const visit = (value: Value): void => {
      if (Array.isArray(value)) {
        value.forEach(visit)
        return
      }
      const node = tree(value)
      if (!node) return
      const isCast =
        ['COERCEVIAIO', 'CONVERTROWTYPEEXPR', 'ARRAYCOERCEEXPR'].includes(node.kind) ||
        (node.kind === 'FUNCEXPR' && ['1', '2', '3'].includes(scalar(node, 'funcformat') ?? ''))
      let arrayConversion = false
      if (isCast) {
        const target = identities.get(Number(expressionType(node))),
          args = node.fields['args']?.[0],
          arg = tree(node.fields['arg']?.[0] ?? (Array.isArray(args) ? args[0] : undefined)),
          sourceType = arg ? expressionType(arg) : null,
          from = sourceType === null ? undefined : identities.get(Number(sourceType))
        if (target && sourceType === null) complete = false
        if (target && from && (target.identity !== from.identity || target.depth !== from.depth)) {
          const kind = conversionKind(node)
          if (!kind || target.depth !== from.depth) complete = false
          else {
            casts.push({
              source: from.identity,
              target: target.identity,
              depth: target.depth,
              kind,
            })
            arrayConversion = node.kind === 'ARRAYCOERCEEXPR'
          }
        }
      }
      for (const [key, values] of Object.entries(node.fields))
        if (!arrayConversion || key !== 'elemexpr') values.forEach(visit)
    }
    visit(parseTree(source))
  } catch {
    complete = false
  }
  return casts.length || !complete ? { definition, complete, casts } : undefined
}

export function captureDomainCoercionContext(
  source: string | null,
  definition: string,
  identities: ReadonlyMap<number, DomainCoercionIdentity>,
): StoredDomainCoercionContext | undefined {
  if (!source) return undefined
  if (
    !source.includes('{COERCETODOMAIN') &&
    ![...source.matchAll(/:(?:consttype|resulttype)\s+(\d+)/gu)].some((match) =>
      identities.has(Number(match[1])),
    )
  )
    return undefined
  const casts: StoredDomainCoercionContext['casts'] = []
  let complete = true
  try {
    const add = (node: Tree, field: string, constant = false): boolean => {
      const oid = scalar(node, field)
      const identity = oid === null ? undefined : identities.get(Number(oid))
      if (!identity) return false
      const format = constant
        ? '1'
        : (scalar(node, 'coercionformat') ??
          scalar(node, 'coerceformat') ??
          scalar(node, 'relabelformat'))
      if (!format || !['0', '1', '2', '3'].includes(format)) {
        complete = false
        return false
      }
      casts.push({
        schema: identity.schema,
        name: identity.name,
        array: identity.array,
        input: format === '2',
        constant,
      })
      return true
    }
    const visit = (value: Value, hiddenInput = false): void => {
      if (Array.isArray(value)) {
        value.forEach((item) => visit(item))
        return
      }
      const node = tree(value)
      if (!node) return
      if (node.kind === 'COERCETODOMAIN') {
        if (!add(node, 'resulttype')) complete = false
        for (const [key, values] of Object.entries(node.fields))
          for (const value of values) {
            const argument = tree(value)
            visit(
              value,
              key === 'arg' &&
                argument?.kind === 'COERCEVIAIO' &&
                scalar(argument, 'coerceformat') === '2',
            )
          }
        return
      }
      if (node.kind === 'CONST') add(node, 'consttype', true)
      if (!hiddenInput && (node.kind === 'COERCEVIAIO' || node.kind === 'RELABELTYPE'))
        add(node, 'resulttype')
      if (node.kind === 'ARRAYCOERCEEXPR' && add(node, 'resulttype')) {
        const element = tree(node.fields['elemexpr']?.[0])
        const identity = identities.get(Number(scalar(node, 'resulttype')))
        const elementIdentity = element
          ? identities.get(Number(scalar(element, 'resulttype')))
          : undefined
        if (
          !element ||
          element.kind !== 'COERCETODOMAIN' ||
          elementIdentity?.array !== false ||
          elementIdentity.schema !== identity?.schema ||
          elementIdentity.name !== identity?.name
        )
          complete = false
        for (const [key, values] of Object.entries(node.fields))
          if (key !== 'elemexpr') values.forEach((item) => visit(item))
        return
      }
      Object.values(node.fields).forEach((values) => values.forEach((item) => visit(item)))
    }
    visit(parseTree(source))
  } catch {
    complete = false
  }
  return casts.length || !complete ? { definition, complete, casts } : undefined
}
