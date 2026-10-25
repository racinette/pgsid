export type Value = string | Value[] | Tree
export type Tree = { kind: string; fields: Record<string, Value[]> }

export function parseTree(source: string): Value {
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

export const tree = (value: Value | undefined): Tree | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : null
export const scalar = (node: Tree, name: string): string | null => {
  const values = node.fields[name]
  return values?.length === 1 && typeof values[0] === 'string' ? values[0] : null
}

export function oidList(node: Tree, name: string): number[] | undefined {
  const list = node.fields[name]?.[0]
  if (!Array.isArray(list) || list[0] !== 'o') return undefined
  const ids = list.slice(1)
  return ids.every((id) => typeof id === 'string' && /^\d+$/u.test(id) && Number(id) <= 4294967295)
    ? ids.map((id) => Number(id))
    : undefined
}
