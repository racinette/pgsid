export const typescriptJsonHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  SqlJsonNode: {
    dependencies: ['SqlDecimal'],
    source: `type SqlJsonNode =
  | { kind: 'null'; raw: string }
  | { kind: 'bool'; raw: string; value: boolean }
  | { kind: 'number'; raw: string; value: SqlDecimal }
  | { kind: 'string'; raw: string; value: string }
  | { kind: 'array'; raw: string; elements: SqlJsonNode[] }
  | { kind: 'object'; raw: string; pairs: { key: string; value: SqlJsonNode }[] }`,
  },
  SqlJson: {
    dependencies: ['SqlJsonNode'],
    source: `class SqlJson {
  constructor(readonly text: string, readonly node: SqlJsonNode) {}
  toString(): string { return this.text }
}`,
  },
  SqlJsonb: {
    dependencies: ['SqlJsonNode', 'jsonbFormat'],
    source: `class SqlJsonb {
  constructor(readonly node: SqlJsonNode) {}
  toString(): string { return jsonbFormat(this.node) }
}`,
  },
  jsonError: {
    dependencies: [],
    source: `function jsonError(code: string): never {
  throw Object.assign(new Error('invalid json'), { code })
}`,
  },
  jsonParse: {
    dependencies: ['SqlJsonNode', 'decimalInput', 'jsonError'],
    source: `function jsonParse(input: string, forJsonb: boolean): SqlJsonNode {
  let index = 0
  function error(code = '22P02'): never {
    return jsonError(code)
  }
  const skip = (): void => {
    while (index < input.length && ' \\t\\n\\r'.includes(input[index]!)) index++
  }
  const unpaired = (value: string): boolean =>
    /[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]/u.test(value)
  const parseString = (): string => {
    if (input[index] !== '"') error()
    index++
    let value = ''
    while (index < input.length) {
      const char = input[index]!
      if (char === '"') {
        index++
        return value
      }
      if (char === '\\\\') {
        index++
        const escape = input[index]
        if (escape === undefined) error()
        index++
        if (escape === '"' || escape === '\\\\' || escape === '/') value += escape
        else if (escape === 'b') value += '\\b'
        else if (escape === 'f') value += '\\f'
        else if (escape === 'n') value += '\\n'
        else if (escape === 'r') value += '\\r'
        else if (escape === 't') value += '\\t'
        else if (escape === 'u') {
          const hex = input.slice(index, index + 4)
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) error()
          index += 4
          const code = Number.parseInt(hex, 16)
          if (code >= 0xd800 && code <= 0xdbff && input[index] === '\\\\' && input[index + 1] === 'u') {
            const lowHex = input.slice(index + 2, index + 6)
            if (/^[0-9a-fA-F]{4}$/.test(lowHex)) {
              const low = Number.parseInt(lowHex, 16)
              if (low >= 0xdc00 && low <= 0xdfff) {
                index += 6
                value += String.fromCodePoint(((code - 0xd800) << 10) + (low - 0xdc00) + 0x10000)
                continue
              }
            }
          }
          value += String.fromCharCode(code)
        } else error()
        continue
      }
      if (char.charCodeAt(0) < 32) error()
      value += char
      index++
    }
    return error()
  }
  const parseNumber = (): string => {
    const start = index
    if (input[index] === '-') index++
    if (input[index] === '0') index++
    else if (input[index] !== undefined && input[index]! >= '1' && input[index]! <= '9') {
      index++
      while (input[index] !== undefined && input[index]! >= '0' && input[index]! <= '9') index++
    } else error()
    if (input[index] === '.') {
      index++
      if (input[index] === undefined || input[index]! < '0' || input[index]! > '9') error()
      while (input[index] !== undefined && input[index]! >= '0' && input[index]! <= '9') index++
    }
    if (input[index] === 'e' || input[index] === 'E') {
      index++
      if (input[index] === '+' || input[index] === '-') index++
      if (input[index] === undefined || input[index]! < '0' || input[index]! > '9') error()
      while (input[index] !== undefined && input[index]! >= '0' && input[index]! <= '9') index++
    }
    return input.slice(start, index)
  }
  const parseValue = (): SqlJsonNode => {
    skip()
    const start = index
    if (input.startsWith('null', index) && !/[A-Za-z0-9_]/.test(input[index + 4] ?? '')) {
      index += 4
      return { kind: 'null', raw: input.slice(start, index) }
    }
    if (input.startsWith('true', index) && !/[A-Za-z0-9_]/.test(input[index + 4] ?? '')) {
      index += 4
      return { kind: 'bool', raw: input.slice(start, index), value: true }
    }
    if (input.startsWith('false', index) && !/[A-Za-z0-9_]/.test(input[index + 5] ?? '')) {
      index += 5
      return { kind: 'bool', raw: input.slice(start, index), value: false }
    }
    if (input[index] === '"') {
      const value = parseString()
      if (forJsonb) {
        if (value.includes('\\0')) error('22P05')
        if (unpaired(value)) error()
      }
      return { kind: 'string', raw: input.slice(start, index), value }
    }
    if (input[index] === '-' || (input[index] !== undefined && input[index]! >= '0' && input[index]! <= '9')) {
      const raw = parseNumber()
      let number = decimalInput(raw)!
      if (number.value.isZero() && /^-/.test(raw)) number = decimalInput(raw.replace(/^-/, ''))!
      return { kind: 'number', raw, value: number }
    }
    if (input[index] === '[') {
      index++
      skip()
      const elements: SqlJsonNode[] = []
      if (input[index] !== ']') {
        for (;;) {
          elements.push(parseValue())
          skip()
          if (input[index] === ',') {
            index++
            continue
          }
          break
        }
      }
      if (input[index] !== ']') error()
      index++
      return { kind: 'array', raw: input.slice(start, index), elements }
    }
    if (input[index] === '{') {
      index++
      skip()
      const pairs: { key: string; value: SqlJsonNode }[] = []
      if (input[index] !== '}') {
        for (;;) {
          skip()
          if (input[index] !== '"') error()
          const key = parseString()
          if (forJsonb) {
            if (key.includes('\\0')) error('22P05')
            if (unpaired(key)) error()
          }
          skip()
          if (input[index] !== ':') error()
          index++
          pairs.push({ key, value: parseValue() })
          skip()
          if (input[index] === ',') {
            index++
            continue
          }
          break
        }
      }
      if (input[index] !== '}') error()
      index++
      return { kind: 'object', raw: input.slice(start, index), pairs }
    }
    return error()
  }
  const value = parseValue()
  skip()
  if (index !== input.length) error()
  return value
}`,
  },
  jsonUtf8Bytes: {
    dependencies: [],
    source: `function jsonUtf8Bytes(value: string): number[] {
  const bytes: number[] = []
  for (let index = 0; index < value.length; index++) {
    let code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const low = value.charCodeAt(index + 1)
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = ((code - 0xd800) << 10) + (low - 0xdc00) + 0x10000
        index++
      }
    }
    if (code < 0x80) bytes.push(code)
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    else if (code < 0x10000)
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    else
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
  }
  return bytes
}`,
  },
  jsonbKeyCompare: {
    dependencies: ['jsonUtf8Bytes', 'jsonStringCompare'],
    source: `function jsonbKeyCompare(left: string, right: string): number {
  const leftBytes = jsonUtf8Bytes(left)
  const rightBytes = jsonUtf8Bytes(right)
  if (leftBytes.length !== rightBytes.length)
    return leftBytes.length > rightBytes.length ? 1 : -1
  return jsonStringCompare(left, right)
}`,
  },
  jsonStringCompare: {
    dependencies: ['jsonUtf8Bytes'],
    source: `function jsonStringCompare(left: string, right: string): number {
  const leftBytes = jsonUtf8Bytes(left)
  const rightBytes = jsonUtf8Bytes(right)
  const length = Math.min(leftBytes.length, rightBytes.length)
  for (let index = 0; index < length; index++) {
    if (leftBytes[index] !== rightBytes[index])
      return leftBytes[index]! - rightBytes[index]!
  }
  if (leftBytes.length === rightBytes.length) return 0
  return leftBytes.length < rightBytes.length ? -1 : 1
}`,
  },
  jsonbCanonicalize: {
    dependencies: ['SqlJsonNode', 'jsonbKeyCompare'],
    source: `function jsonbCanonicalize(node: SqlJsonNode): SqlJsonNode {
  if (node.kind === 'array')
    return { kind: 'array', raw: '', elements: node.elements.map(jsonbCanonicalize) }
  if (node.kind === 'object') {
    const last = new Map<string, SqlJsonNode>()
    for (const pair of node.pairs) last.set(pair.key, jsonbCanonicalize(pair.value))
    return {
      kind: 'object',
      raw: '',
      pairs: [...last.entries()]
        .sort((left, right) => jsonbKeyCompare(left[0], right[0]))
        .map(([key, value]) => ({ key, value })),
    }
  }
  return node
}`,
  },
  jsonbEscape: {
    dependencies: [],
    source: `function jsonbEscape(value: string): string {
  let output = '"'
  for (const char of value) {
    const code = char.codePointAt(0)!
    if (char === '"') output += '\\\\"'
    else if (char === '\\\\') output += '\\\\\\\\'
    else if (char === '\\b') output += '\\\\b'
    else if (char === '\\f') output += '\\\\f'
    else if (char === '\\n') output += '\\\\n'
    else if (char === '\\r') output += '\\\\r'
    else if (char === '\\t') output += '\\\\t'
    else if (code < 32) output += '\\\\u' + code.toString(16).padStart(4, '0')
    else output += char
  }
  return output + '"'
}`,
  },
  jsonbFormat: {
    dependencies: ['SqlJsonNode', 'jsonbEscape'],
    source: `function jsonbFormat(node: SqlJsonNode): string {
  if (node.kind === 'null') return 'null'
  if (node.kind === 'bool') return node.value ? 'true' : 'false'
  if (node.kind === 'number') return node.value.toString()
  if (node.kind === 'string') return jsonbEscape(node.value)
  if (node.kind === 'array')
    return '[' + node.elements.map((element) => jsonbFormat(element)).join(', ') + ']'
  return '{' + node.pairs.map((pair) => jsonbEscape(pair.key) + ': ' + jsonbFormat(pair.value)).join(', ') + '}'
}`,
  },
  jsonInput: {
    dependencies: ['SqlJson', 'jsonParse'],
    source: `function jsonInput(value: string | null): SqlJson | null {
  return value === null ? null : new SqlJson(value, jsonParse(value, false))
}`,
  },
  jsonbInput: {
    dependencies: ['SqlJsonb', 'jsonParse', 'jsonbCanonicalize'],
    source: `function jsonbInput(value: string | null): SqlJsonb | null {
  return value === null ? null : new SqlJsonb(jsonbCanonicalize(jsonParse(value, true)))
}`,
  },
  jsonText: {
    dependencies: ['SqlJson'],
    source: `function jsonText(value: SqlJson | null): string | null {
  return value === null ? null : value.text
}`,
  },
  jsonbText: {
    dependencies: ['SqlJsonb'],
    source: `function jsonbText(value: SqlJsonb | null): string | null {
  return value === null ? null : value.toString()
}`,
  },
  jsonFromText: {
    dependencies: ['jsonInput'],
    source: `function jsonFromText(value: string | null): SqlJson | null { return jsonInput(value) }`,
  },
  jsonbFromText: {
    dependencies: ['jsonbInput'],
    source: `function jsonbFromText(value: string | null): SqlJsonb | null { return jsonbInput(value) }`,
  },
  jsonToJsonb: {
    dependencies: ['SqlJson', 'SqlJsonb', 'jsonParse', 'jsonbCanonicalize'],
    source: `function jsonToJsonb(value: SqlJson | null): SqlJsonb | null {
  return value === null ? null : new SqlJsonb(jsonbCanonicalize(jsonParse(value.text, true)))
}`,
  },
  jsonbToJson: {
    dependencies: ['SqlJson', 'SqlJsonb', 'jsonbFormat'],
    source: `function jsonbToJson(value: SqlJsonb | null): SqlJson | null {
  if (value === null) return null
  const text = jsonbFormat(value.node)
  return new SqlJson(text, value.node)
}`,
  },
  jsonTypeof: {
    dependencies: ['SqlJson'],
    source: `function jsonTypeof(value: SqlJson | null): string | null {
  return value === null ? null : value.node.kind === 'bool' ? 'boolean' : value.node.kind
}`,
  },
  jsonbTypeof: {
    dependencies: ['SqlJsonb'],
    source: `function jsonbTypeof(value: SqlJsonb | null): string | null {
  return value === null ? null : value.node.kind === 'bool' ? 'boolean' : value.node.kind
}`,
  },
  jsonArrayLength: {
    dependencies: ['SqlJson', 'jsonError'],
    source: `function jsonArrayLength(value: SqlJson | null): bigint | null {
  if (value === null) return null
  if (value.node.kind === 'array') return BigInt(value.node.elements.length)
  throw Object.assign(new Error('cannot get array length'), {
    code: '22023',
  })
}`,
  },
  jsonbArrayLength: {
    dependencies: ['SqlJsonb'],
    source: `function jsonbArrayLength(value: SqlJsonb | null): bigint | null {
  if (value === null) return null
  if (value.node.kind === 'array') return BigInt(value.node.elements.length)
  throw Object.assign(new Error('cannot get array length'), { code: '22023' })
}`,
  },
  jsonField: {
    dependencies: ['SqlJsonNode'],
    source: `function jsonField(node: SqlJsonNode, key: string): SqlJsonNode | null {
  if (node.kind !== 'object') return null
  for (let index = node.pairs.length - 1; index >= 0; index--)
    if (node.pairs[index]!.key === key) return node.pairs[index]!.value
  return null
}`,
  },
  jsonIndex: {
    dependencies: ['SqlJsonNode'],
    source: `function jsonIndex(node: SqlJsonNode, index: number, rawScalar: boolean): SqlJsonNode | null {
  const elements =
    node.kind === 'array' ? node.elements : rawScalar && node.kind !== 'object' ? [node] : null
  if (elements === null) return null
  if (index < 0) index += elements.length
  return index >= 0 && index < elements.length ? elements[index]! : null
}`,
  },
  jsonAsText: {
    dependencies: ['SqlJsonNode', 'jsonbFormat'],
    source: `function jsonAsText(node: SqlJsonNode | null, jsonb: boolean): string | null {
  if (node === null || node.kind === 'null') return null
  if (node.kind === 'string') return node.value
  if (node.kind === 'bool') return node.value ? 'true' : 'false'
  if (node.kind === 'number') return jsonb ? node.value.toString() : node.raw
  return jsonb ? jsonbFormat(node) : node.raw
}`,
  },
  jsonObjectField: {
    dependencies: ['SqlJson', 'jsonField'],
    source: `function jsonObjectField(value: SqlJson | null, key: string | null): SqlJson | null {
  if (value === null || key === null) return null
  const node = jsonField(value.node, key)
  return node === null ? null : new SqlJson(node.raw, node)
}`,
  },
  jsonObjectFieldText: {
    dependencies: ['SqlJson', 'jsonField', 'jsonAsText'],
    source: `function jsonObjectFieldText(value: SqlJson | null, key: string | null): string | null {
  return value === null || key === null ? null : jsonAsText(jsonField(value.node, key), false)
}`,
  },
  jsonbObjectField: {
    dependencies: ['SqlJsonb', 'jsonField'],
    source: `function jsonbObjectField(value: SqlJsonb | null, key: string | null): SqlJsonb | null {
  if (value === null || key === null) return null
  const node = jsonField(value.node, key)
  return node === null ? null : new SqlJsonb(node)
}`,
  },
  jsonbObjectFieldText: {
    dependencies: ['SqlJsonb', 'jsonField', 'jsonAsText'],
    source: `function jsonbObjectFieldText(value: SqlJsonb | null, key: string | null): string | null {
  return value === null || key === null ? null : jsonAsText(jsonField(value.node, key), true)
}`,
  },
  jsonArrayElement: {
    dependencies: ['SqlJson', 'jsonIndex'],
    source: `function jsonArrayElement(value: SqlJson | null, index: bigint | null): SqlJson | null {
  if (value === null || index === null) return null
  const node = jsonIndex(value.node, Number(index), false)
  return node === null ? null : new SqlJson(node.raw, node)
}`,
  },
  jsonArrayElementText: {
    dependencies: ['SqlJson', 'jsonIndex', 'jsonAsText'],
    source: `function jsonArrayElementText(value: SqlJson | null, index: bigint | null): string | null {
  return value === null || index === null ? null : jsonAsText(jsonIndex(value.node, Number(index), false), false)
}`,
  },
  jsonbArrayElement: {
    dependencies: ['SqlJsonb', 'jsonIndex'],
    source: `function jsonbArrayElement(value: SqlJsonb | null, index: bigint | null): SqlJsonb | null {
  if (value === null || index === null) return null
  const node = jsonIndex(value.node, Number(index), true)
  return node === null ? null : new SqlJsonb(node)
}`,
  },
  jsonbArrayElementText: {
    dependencies: ['SqlJsonb', 'jsonIndex', 'jsonAsText'],
    source: `function jsonbArrayElementText(value: SqlJsonb | null, index: bigint | null): string | null {
  return value === null || index === null ? null : jsonAsText(jsonIndex(value.node, Number(index), true), true)
}`,
  },
  jsonPathIndex: {
    dependencies: [],
    source: `function jsonPathIndex(value: string): number | null {
  const match = /^[ \\t\\n\\r\\v\\f]*([+-]?\\d+)$/.exec(value)
  if (!match) return null
  const number = Number(match[1])
  if (!Number.isInteger(number) || number < -2147483647 || number > 2147483647) return null
  return number
}`,
  },
  jsonPathKeys: {
    dependencies: ['SqlArray'],
    source: `function jsonPathKeys(path: SqlArray | null): (string | null)[] | null {
  if (path === null) return null
  return path.elements.map((element) => (element.value === null ? null : String(element.value)))
}`,
  },
  jsonExtract: {
    dependencies: ['SqlJsonNode', 'jsonField', 'jsonIndex', 'jsonPathIndex'],
    source: `function jsonExtract(node: SqlJsonNode, path: readonly (string | null)[], rawScalar: boolean): SqlJsonNode | null {
  if (path.some((step) => step === null)) return null
  let current: SqlJsonNode | null = node
  for (const step of path) {
    if (current === null) return null
    if (current.kind === 'object') current = jsonField(current, step!)
    else if (current.kind === 'array' || rawScalar) {
      const index = jsonPathIndex(step!)
      current = index === null ? null : jsonIndex(current, index, rawScalar && current.kind !== 'array')
    } else current = null
  }
  return current
}`,
  },
  jsonExtractPath: {
    dependencies: ['SqlJson', 'jsonPathKeys', 'jsonExtract'],
    source: `function jsonExtractPath(value: SqlJson | null, path: SqlArray | null): SqlJson | null {
  const keys = jsonPathKeys(path)
  if (value === null || keys === null) return null
  const node = jsonExtract(value.node, keys, false)
  return node === null ? null : new SqlJson(node.raw, node)
}`,
  },
  jsonExtractPathText: {
    dependencies: ['SqlJson', 'jsonPathKeys', 'jsonExtract', 'jsonAsText'],
    source: `function jsonExtractPathText(value: SqlJson | null, path: SqlArray | null): string | null {
  const keys = jsonPathKeys(path)
  return value === null || keys === null ? null : jsonAsText(jsonExtract(value.node, keys, false), false)
}`,
  },
  jsonbExtractPath: {
    dependencies: ['SqlJsonb', 'jsonPathKeys', 'jsonExtract'],
    source: `function jsonbExtractPath(value: SqlJsonb | null, path: SqlArray | null): SqlJsonb | null {
  const keys = jsonPathKeys(path)
  if (value === null || keys === null) return null
  const node = jsonExtract(value.node, keys, false)
  return node === null ? null : new SqlJsonb(node)
}`,
  },
  jsonbExtractPathText: {
    dependencies: ['SqlJsonb', 'jsonPathKeys', 'jsonExtract', 'jsonAsText'],
    source: `function jsonbExtractPathText(value: SqlJsonb | null, path: SqlArray | null): string | null {
  const keys = jsonPathKeys(path)
  return value === null || keys === null ? null : jsonAsText(jsonExtract(value.node, keys, false), true)
}`,
  },
  jsonbTypeRank: {
    dependencies: [],
    source: `function jsonbTypeRank(kind: string): number {
  return kind === 'null' ? 0 : kind === 'string' ? 1 : kind === 'number' ? 2 : kind === 'bool' ? 3 : kind === 'array' ? 16 : 17
}`,
  },
  jsonbScalarCompare: {
    dependencies: ['SqlJsonNode', 'sqlDecimalCompare', 'jsonStringCompare'],
    source: `function jsonbScalarCompare(left: SqlJsonNode, right: SqlJsonNode): number {
  if (left.kind === 'null') return 0
  if (left.kind === 'bool' && right.kind === 'bool') return Number(left.value) - Number(right.value)
  if (left.kind === 'number' && right.kind === 'number')
    return sqlDecimalCompare(left.value.value, right.value.value)
  if (left.kind === 'string' && right.kind === 'string') return jsonStringCompare(left.value, right.value)
  return 0
}`,
  },
  jsonbCompare: {
    dependencies: ['SqlJsonb', 'jsonbTypeRank', 'jsonbScalarCompare', 'jsonStringCompare'],
    source: `function jsonbCompare(left: SqlJsonb | null, right: SqlJsonb | null): bigint | null {
  if (left === null || right === null) return null
  type Token =
    | { kind: 'array'; rawScalar: boolean; count: number }
    | { kind: 'object'; count: number }
    | { kind: 'end' }
    | { kind: 'key'; value: string }
    | { kind: 'scalar'; node: SqlJsonNode }
  const walk = function* (node: SqlJsonNode, root: boolean): Generator<Token> {
    const wrap = root && node.kind !== 'array' && node.kind !== 'object'
    if (wrap) {
      yield { kind: 'array', rawScalar: true, count: 1 }
      yield { kind: 'scalar', node }
      yield { kind: 'end' }
      return
    }
    if (node.kind === 'array') {
      yield { kind: 'array', rawScalar: false, count: node.elements.length }
      for (const element of node.elements) {
        if (element.kind === 'array' || element.kind === 'object') yield* walk(element, false)
        else yield { kind: 'scalar', node: element }
      }
      yield { kind: 'end' }
      return
    }
    if (node.kind === 'object') {
      yield { kind: 'object', count: node.pairs.length }
      for (const pair of node.pairs) {
        yield { kind: 'key', value: pair.key }
        if (pair.value.kind === 'array' || pair.value.kind === 'object') yield* walk(pair.value, false)
        else yield { kind: 'scalar', node: pair.value }
      }
      yield { kind: 'end' }
    }
  }
  const tokenType = (token: Token): number =>
    token.kind === 'array' ? 16 : token.kind === 'object' ? 17 : token.kind === 'key' ? 1 : token.kind === 'scalar' ? jsonbTypeRank(token.node.kind) : 0
  const leftTokens = walk(left.node, true)
  const rightTokens = walk(right.node, true)
  for (;;) {
    const a = leftTokens.next()
    const b = rightTokens.next()
    if (a.done && b.done) return 0n
    const va = a.value!, vb = b.value!
    if (va.kind === vb.kind) {
      if (va.kind === 'end') continue
      if (va.kind === 'array' && vb.kind === 'array') {
        let result = 0
        if (va.rawScalar !== vb.rawScalar) result = va.rawScalar ? -1 : 1
        if (va.count !== vb.count) result = va.count > vb.count ? 1 : -1
        if (result !== 0) return BigInt(result)
        continue
      }
      if (va.kind === 'object' && vb.kind === 'object') {
        if (va.count !== vb.count) return BigInt(va.count > vb.count ? 1 : -1)
        continue
      }
      if (va.kind === 'key' && vb.kind === 'key') {
        const result = jsonStringCompare(va.value, vb.value)
        if (result !== 0) return BigInt(result)
        continue
      }
      if (va.kind === 'scalar' && vb.kind === 'scalar') {
        if (va.node.kind === vb.node.kind) {
          const result = jsonbScalarCompare(va.node, vb.node)
          if (result !== 0) return BigInt(result)
        } else return BigInt(jsonbTypeRank(va.node.kind) > jsonbTypeRank(vb.node.kind) ? 1 : -1)
      }
    } else return BigInt(tokenType(va) > tokenType(vb) ? 1 : -1)
  }
}`,
  },
  jsonbContains: {
    dependencies: ['SqlJsonb', 'jsonbScalarCompare'],
    source: `function jsonbContains(left: SqlJsonb | null, right: SqlJsonb | null): boolean | null {
  if (left === null || right === null) return null
  const container = (node: SqlJsonNode): boolean => node.kind === 'array' || node.kind === 'object'
  const deep = (value: SqlJsonNode, contained: SqlJsonNode): boolean => {
    if (contained.kind === 'object') {
      if (value.kind !== 'object' || value.pairs.length < contained.pairs.length) return false
      for (const pair of contained.pairs) {
        const match = value.pairs.find((item) => item.key === pair.key)?.value
        if (!match) return false
        if (!container(match) && !container(pair.value)) {
          if (match.kind !== pair.value.kind || jsonbScalarCompare(match, pair.value) !== 0)
            return false
        } else if (container(match) && container(pair.value)) {
          if (!deep(match, pair.value)) return false
        } else return false
      }
      return true
    }
    const valueRaw = !container(value)
    const containedRaw = !container(contained)
    if (value.kind === 'object') return false
    if (valueRaw && !containedRaw) return false
    const values = valueRaw ? [value] : value.kind === 'array' ? value.elements : []
    const items = containedRaw ? [contained] : contained.kind === 'array' ? contained.elements : []
    for (const item of items) {
      if (!container(item)) {
        if (!values.some((element) => !container(element) && element.kind === item.kind && jsonbScalarCompare(element, item) === 0))
          return false
      } else if (!values.filter(container).some((element) => deep(element, item))) return false
    }
    return true
  }
  if ((left.node.kind === 'object') !== (right.node.kind === 'object')) return false
  return deep(left.node, right.node)
}`,
  },
  jsonbExists: {
    dependencies: ['SqlJsonb'],
    source: `function jsonbExists(value: SqlJsonb | null, key: string | null): boolean | null {
  if (value === null || key === null) return null
  if (value.node.kind === 'object') return value.node.pairs.some((pair) => pair.key === key)
  if (value.node.kind === 'array')
    return value.node.elements.some((element) => element.kind === 'string' && element.value === key)
  return value.node.kind === 'string' && value.node.value === key
}`,
  },
  jsonbExistsAll: {
    dependencies: ['SqlJsonb', 'jsonPathKeys', 'jsonbExists'],
    source: `function jsonbExistsAll(value: SqlJsonb | null, keys: SqlArray | null): boolean | null {
  const path = jsonPathKeys(keys)
  if (value === null || path === null) return null
  return path.every((key) => key === null || jsonbExists(value, key) === true)
}`,
  },
  jsonbExistsAny: {
    dependencies: ['SqlJsonb', 'jsonPathKeys', 'jsonbExists'],
    source: `function jsonbExistsAny(value: SqlJsonb | null, keys: SqlArray | null): boolean | null {
  const path = jsonPathKeys(keys)
  if (value === null || path === null) return null
  return path.some((key) => key !== null && jsonbExists(value, key) === true)
}`,
  },
}

for (const [name, operator] of [
  ['Eq', '==='],
  ['Ne', '!=='],
  ['Lt', '<'],
  ['Le', '<='],
  ['Gt', '>'],
  ['Ge', '>='],
] as const) {
  typescriptJsonHelpers[`jsonb${name}`] = {
    dependencies: ['jsonbCompare'],
    source: `function jsonb${name}(left: SqlJsonb | null, right: SqlJsonb | null): boolean | null {
  const comparison = jsonbCompare(left, right)
  return comparison === null ? null : comparison ${operator} 0n
}`,
  }
}

typescriptJsonHelpers.jsonbContained = {
  dependencies: ['jsonbContains'],
  source: `function jsonbContained(left: SqlJsonb | null, right: SqlJsonb | null): boolean | null {
  return jsonbContains(right, left)
}`,
}

Object.assign(typescriptJsonHelpers, {
  jsonbNodeCopy: {
    dependencies: ['SqlJsonNode'],
    source: `function jsonbNodeCopy(node: SqlJsonNode): SqlJsonNode {
  if (node.kind === 'array')
    return { kind: 'array', raw: '', elements: node.elements.map(jsonbNodeCopy) }
  if (node.kind === 'object')
    return {
      kind: 'object',
      raw: '',
      pairs: node.pairs.map((pair) => ({ key: pair.key, value: jsonbNodeCopy(pair.value) })),
    }
  return node
}`,
  },
  jsonbConcat: {
    dependencies: ['SqlJsonb', 'jsonbCanonicalize', 'jsonbNodeCopy'],
    source: `function jsonbConcat(left: SqlJsonb | null, right: SqlJsonb | null): SqlJsonb | null {
  if (left === null || right === null) return null
  const leftObject = left.node.kind === 'object'
  const rightObject = right.node.kind === 'object'
  const leftEmpty =
    leftObject ? left.node.pairs.length === 0 : left.node.kind === 'array' && left.node.elements.length === 0
  const rightEmpty =
    rightObject ? right.node.pairs.length === 0 : right.node.kind === 'array' && right.node.elements.length === 0
  if (leftObject === rightObject) {
    if (leftEmpty && right.node.kind !== 'null' && right.node.kind !== 'bool' && right.node.kind !== 'number' && right.node.kind !== 'string')
      return right
    if (rightEmpty && left.node.kind !== 'null' && left.node.kind !== 'bool' && left.node.kind !== 'number' && left.node.kind !== 'string')
      return left
  }
  if (leftObject && rightObject) {
    const last = new Map<string, SqlJsonNode>()
    for (const pair of left.node.pairs) last.set(pair.key, pair.value)
    for (const pair of right.node.pairs) last.set(pair.key, pair.value)
    return new SqlJsonb(
      jsonbCanonicalize({
        kind: 'object',
        raw: '',
        pairs: [...last.entries()].map(([key, value]) => ({ key, value })),
      }),
    )
  }
  const wrap = (node: SqlJsonNode): SqlJsonNode[] =>
    node.kind === 'array' ? node.elements.map(jsonbNodeCopy) : [jsonbNodeCopy(node)]
  return new SqlJsonb({ kind: 'array', raw: '', elements: [...wrap(left.node), ...wrap(right.node)] })
}`,
  },
  jsonbDeleteKey: {
    dependencies: ['SqlJsonb', 'jsonError'],
    source: `function jsonbDeleteKey(value: SqlJsonb | null, key: string | null): SqlJsonb | null {
  if (value === null || key === null) return null
  if (value.node.kind !== 'array' && value.node.kind !== 'object') jsonError('22023')
  if (value.node.kind === 'object') {
    if (value.node.pairs.length === 0) return value
    return new SqlJsonb({
      kind: 'object',
      raw: '',
      pairs: value.node.pairs.filter((pair) => pair.key !== key),
    })
  }
  if (value.node.elements.length === 0) return value
  return new SqlJsonb({
    kind: 'array',
    raw: '',
    elements: value.node.elements.filter((element) => !(element.kind === 'string' && element.value === key)),
  })
}`,
  },
  jsonbDeleteIndex: {
    dependencies: ['SqlJsonb', 'jsonError'],
    source: `function jsonbDeleteIndex(value: SqlJsonb | null, index: bigint | null): SqlJsonb | null {
  if (value === null || index === null) return null
  if (value.node.kind !== 'array') jsonError('22023')
  const count = value.node.elements.length
  if (count === 0) return value
  let idx = Number(index)
  if (idx < 0) {
    const abs = idx === -2147483648 ? 2147483648 : -idx
    idx = abs > count ? count : count + idx
  }
  if (idx >= count) return value
  return new SqlJsonb({
    kind: 'array',
    raw: '',
    elements: value.node.elements.filter((_, position) => position !== idx),
  })
}`,
  },
  jsonbDeleteKeys: {
    dependencies: ['SqlJsonb', 'jsonPathKeys', 'jsonbDeleteKey', 'jsonError'],
    source: `function jsonbDeleteKeys(value: SqlJsonb | null, keys: SqlArray | null): SqlJsonb | null {
  if (value === null || keys === null) return null
  if (keys.dimensions.length > 1) jsonError('2202E')
  if (value.node.kind !== 'array' && value.node.kind !== 'object') jsonError('22023')
  const path = jsonPathKeys(keys)!
  if (
    (value.node.kind === 'object' ? value.node.pairs.length : value.node.elements.length) === 0 ||
    path.length === 0
  )
    return value
  let result: SqlJsonb | null = value
  for (const key of path) if (key !== null) result = jsonbDeleteKey(result, key)
  return result
}`,
  },
  jsonbPathInt: {
    dependencies: ['jsonError'],
    source: `function jsonbPathInt(value: string): number {
  const match = /^[ \\t\\n\\r\\v\\f]*([+-]?\\d+)$/.exec(value)
  if (!match) jsonError('22P02')
  const number = Number(match[1])
  if (!Number.isInteger(number) || number < -2147483648 || number > 2147483647) jsonError('22P02')
  return number
}`,
  },
  jsonbSetPath: {
    dependencies: ['SqlJsonNode', 'jsonbPathInt', 'jsonbCanonicalize', 'jsonError'],
    source: `function jsonbSetPath(
  node: SqlJsonNode,
  path: readonly (string | null)[],
  level: number,
  next: SqlJsonNode | null,
  op: 'create' | 'replace' | 'delete' | 'insert-before' | 'insert-after',
): SqlJsonNode {
  if (path[level] === null) jsonError('22004')
  const last = level === path.length - 1
  const createOrInsert = op === 'create' || op === 'insert-before' || op === 'insert-after'
  if (node.kind === 'object') {
    const key = path[level]!
    if (node.pairs.length === 0 && createOrInsert && last && next)
      return jsonbCanonicalize({ kind: 'object', raw: '', pairs: [{ key, value: next }] })
    const match = node.pairs.findIndex((pair) => pair.key === key)
    if (match >= 0) {
      if (last) {
        if (op === 'insert-before' || op === 'insert-after') jsonError('22023')
        if (op === 'delete')
          return {
            kind: 'object',
            raw: '',
            pairs: node.pairs.filter((_, index) => index !== match),
          }
        return jsonbCanonicalize({
          kind: 'object',
          raw: '',
          pairs: node.pairs.map((pair, index) => (index === match ? { key, value: next! } : pair)),
        })
      }
      return jsonbCanonicalize({
        kind: 'object',
        raw: '',
        pairs: node.pairs.map((pair, index) =>
          index === match ? { key, value: jsonbSetPath(pair.value, path, level + 1, next, op) } : pair,
        ),
      })
    }
    if (createOrInsert && last && next)
      return jsonbCanonicalize({
        kind: 'object',
        raw: '',
        pairs: [...node.pairs, { key, value: next }],
      })
    return node
  }
  if (node.kind === 'array') {
    const count = node.elements.length
    let idx = jsonbPathInt(path[level]!)
    if (idx < 0) {
      const abs = idx === -2147483648 ? 2147483648 : -idx
      idx = abs > count ? -2147483648 : count + idx
    }
    if (idx > 0 && idx > count) idx = count
    if ((idx === -2147483648 || count === 0) && last && createOrInsert && next)
      return { kind: 'array', raw: '', elements: [next, ...node.elements] }
    if (idx >= 0 && idx < count) {
      if (last) {
        const elements: SqlJsonNode[] = []
        for (let index = 0; index < count; index++) {
          if (index === idx) {
            if (op === 'insert-before' || op === 'create') elements.push(next!)
            if (op === 'insert-after' || op === 'insert-before') elements.push(node.elements[index]!)
            if (op === 'insert-after' || op === 'replace') elements.push(next!)
          } else elements.push(node.elements[index]!)
        }
        return { kind: 'array', raw: '', elements }
      }
      return {
        kind: 'array',
        raw: '',
        elements: node.elements.map((element, index) =>
          index === idx ? jsonbSetPath(element, path, level + 1, next, op) : element,
        ),
      }
    }
    if (createOrInsert && last && next)
      return { kind: 'array', raw: '', elements: [...node.elements, next] }
    return node
  }
  return node
}`,
  },
  jsonbMutatePath: {
    dependencies: ['SqlJsonb', 'jsonPathKeys', 'jsonbSetPath', 'jsonError'],
    source: `function jsonbMutatePath(
  value: SqlJsonb | null,
  path: SqlArray | null,
  next: SqlJsonb | null,
  op: 'create' | 'replace' | 'delete' | 'insert-before' | 'insert-after',
): SqlJsonb | null {
  if (value === null || path === null || (op !== 'delete' && next === null)) return null
  if (path.dimensions.length > 1) jsonError('2202E')
  if (value.node.kind !== 'array' && value.node.kind !== 'object') jsonError('22023')
  const keys = jsonPathKeys(path)
  if (keys === null) return null
  if (
    keys.length === 0 ||
    ((value.node.kind === 'object' ? value.node.pairs.length : value.node.elements.length) === 0 &&
      op !== 'create' &&
      op !== 'insert-before' &&
      op !== 'insert-after')
  )
    return value
  return new SqlJsonb(jsonbSetPath(value.node, keys, 0, next?.node ?? null, op))
}`,
  },
  jsonbDeletePath: {
    dependencies: ['jsonbMutatePath'],
    source: `function jsonbDeletePath(value: SqlJsonb | null, path: SqlArray | null): SqlJsonb | null {
  return jsonbMutatePath(value, path, null, 'delete')
}`,
  },
  jsonbSet: {
    dependencies: ['jsonbMutatePath'],
    source: `function jsonbSet(
  value: SqlJsonb | null,
  path: SqlArray | null,
  next: SqlJsonb | null,
  create: boolean | null,
): SqlJsonb | null {
  if (value === null || path === null || next === null || create === null) return null
  return jsonbMutatePath(value, path, next, create ? 'create' : 'replace')
}`,
  },
  jsonbInsert: {
    dependencies: ['jsonbMutatePath'],
    source: `function jsonbInsert(
  value: SqlJsonb | null,
  path: SqlArray | null,
  next: SqlJsonb | null,
  after: boolean | null,
): SqlJsonb | null {
  if (value === null || path === null || next === null || after === null) return null
  return jsonbMutatePath(value, path, next, after ? 'insert-after' : 'insert-before')
}`,
  },
  jsonbSetLax: {
    dependencies: ['SqlJsonb', 'jsonbSet', 'jsonbDeletePath', 'jsonError'],
    source: `function jsonbSetLax(
  value: SqlJsonb | null,
  path: SqlArray | null,
  next: SqlJsonb | null,
  create: boolean | null,
  treatment: string | null,
): SqlJsonb | null {
  if (value === null || path === null || create === null) return null
  if (treatment === null) jsonError('22023')
  if (next !== null) return jsonbSet(value, path, next, create)
  if (treatment === 'raise_exception') jsonError('22004')
  if (treatment === 'use_json_null')
    return jsonbSet(value, path, new SqlJsonb({ kind: 'null', raw: 'null' }), create)
  if (treatment === 'delete_key') return jsonbDeletePath(value, path)
  if (treatment === 'return_target') return value
  return jsonError('22023')
}`,
  },
  jsonFormatCompact: {
    dependencies: ['SqlJsonNode', 'jsonbEscape'],
    source: `function jsonFormatCompact(node: SqlJsonNode): string {
  if (node.kind === 'null' || node.kind === 'bool' || node.kind === 'number')
    return node.kind === 'number' ? node.raw : node.kind === 'null' ? 'null' : node.value ? 'true' : 'false'
  if (node.kind === 'string') return jsonbEscape(node.value)
  if (node.kind === 'array') return '[' + node.elements.map(jsonFormatCompact).join(',') + ']'
  return '{' + node.pairs.map((pair) => jsonbEscape(pair.key) + ':' + jsonFormatCompact(pair.value)).join(',') + '}'
}`,
  },
  jsonStripNullsNode: {
    dependencies: ['SqlJsonNode'],
    source: `function jsonStripNullsNode(node: SqlJsonNode, arrays: boolean): SqlJsonNode {
  if (node.kind === 'object')
    return {
      kind: 'object',
      raw: '',
      pairs: node.pairs
        .filter((pair) => pair.value.kind !== 'null')
        .map((pair) => ({ key: pair.key, value: jsonStripNullsNode(pair.value, arrays) })),
    }
  if (node.kind === 'array')
    return {
      kind: 'array',
      raw: '',
      elements: (arrays ? node.elements.filter((element) => element.kind !== 'null') : node.elements).map(
        (element) => jsonStripNullsNode(element, arrays),
      ),
    }
  return node
}`,
  },
  jsonStripNulls: {
    dependencies: ['SqlJson', 'jsonStripNullsNode', 'jsonFormatCompact'],
    source: `function jsonStripNulls(value: SqlJson | null, arrays: boolean | null): SqlJson | null {
  if (value === null || arrays === null) return null
  const node = jsonStripNullsNode(value.node, arrays)
  return new SqlJson(jsonFormatCompact(node), node)
}`,
  },
  jsonbStripNulls: {
    dependencies: ['SqlJsonb', 'jsonStripNullsNode', 'jsonbCanonicalize'],
    source: `function jsonbStripNulls(value: SqlJsonb | null, arrays: boolean | null): SqlJsonb | null {
  if (value === null || arrays === null) return null
  if (value.node.kind !== 'array' && value.node.kind !== 'object') return value
  return new SqlJsonb(jsonbCanonicalize(jsonStripNullsNode(value.node, arrays)))
}`,
  },
  jsonbPretty: {
    dependencies: ['SqlJsonb', 'jsonbEscape', 'jsonbFormat'],
    source: `function jsonbPretty(value: SqlJsonb | null): string | null {
  if (value === null) return null
  const render = (node: SqlJsonNode, level: number): string => {
    if (node.kind !== 'array' && node.kind !== 'object') return jsonbFormat(node)
    const open = node.kind === 'array' ? '[' : '{'
    const close = node.kind === 'array' ? ']' : '}'
    const items =
      node.kind === 'array'
        ? node.elements.map((element) => render(element, level + 1))
        : node.pairs.map((pair) => jsonbEscape(pair.key) + ': ' + render(pair.value, level + 1))
    const pad = (depth: number): string => '    '.repeat(depth)
    if (items.length === 0) return open + '\\n' + pad(level) + close
    return open + '\\n' + items.map((item) => pad(level + 1) + item).join(',\\n') + '\\n' + pad(level) + close
  }
  return render(value.node, 0)
}`,
  },
  jsonbToBool: {
    dependencies: ['SqlJsonb', 'jsonError'],
    source: `function jsonbToBool(value: SqlJsonb | null): boolean | null {
  if (value === null) return null
  if (value.node.kind === 'null') return null
  if (value.node.kind !== 'bool') jsonError('22023')
  return value.node.value
}`,
  },
  jsonbToNumeric: {
    dependencies: ['SqlJsonb', 'jsonError'],
    source: `function jsonbToNumeric(value: SqlJsonb | null): SqlDecimal | null {
  if (value === null) return null
  if (value.node.kind === 'null') return null
  if (value.node.kind !== 'number') jsonError('22023')
  return value.node.value
}`,
  },
  jsonbToInt2: {
    dependencies: ['jsonbToNumeric', 'int2FromDecimal'],
    source: `function jsonbToInt2(value: SqlJsonb | null): bigint | null {
  return int2FromDecimal(jsonbToNumeric(value))
}`,
  },
  jsonbToInt4: {
    dependencies: ['jsonbToNumeric', 'int4FromDecimal'],
    source: `function jsonbToInt4(value: SqlJsonb | null): bigint | null {
  return int4FromDecimal(jsonbToNumeric(value))
}`,
  },
  jsonbToInt8: {
    dependencies: ['jsonbToNumeric', 'int8FromDecimal'],
    source: `function jsonbToInt8(value: SqlJsonb | null): bigint | null {
  return int8FromDecimal(jsonbToNumeric(value))
}`,
  },
  jsonbToFloat4: {
    dependencies: ['jsonbToNumeric', 'float4FromDecimal'],
    source: `function jsonbToFloat4(value: SqlJsonb | null): number | null {
  return float4FromDecimal(jsonbToNumeric(value))
}`,
  },
  jsonbToFloat8: {
    dependencies: ['jsonbToNumeric', 'float8FromDecimal'],
    source: `function jsonbToFloat8(value: SqlJsonb | null): number | null {
  return float8FromDecimal(jsonbToNumeric(value))
}`,
  },
  jsonTextPairs: {
    dependencies: ['SqlArray', 'jsonError'],
    source: `function jsonTextPairs(keys: SqlArray, values: SqlArray | null): { key: string; value: string | null }[] {
  if (values === null) {
    if (keys.dimensions.length > 2) jsonError('2202E')
    if (keys.dimensions.length === 2 && keys.dimensions[1] !== 2) jsonError('2202E')
    if (keys.dimensions.length === 1 && keys.elements.length % 2 !== 0) jsonError('2202E')
    if (keys.dimensions.length === 0) return []
    const pairs: { key: string; value: string | null }[] = []
    for (let index = 0; index < keys.elements.length; index += 2) {
      const key = keys.elements[index]!
      const value = keys.elements[index + 1]!
      if (key.value === null) jsonError('22004')
      pairs.push({ key: String(key.value), value: value.value === null ? null : String(value.value) })
    }
    return pairs
  }
  if (keys.dimensions.length > 1 || keys.dimensions.length !== values.dimensions.length) jsonError('2202E')
  if (keys.dimensions.length === 0) return []
  if (keys.elements.length !== values.elements.length) jsonError('2202E')
  return keys.elements.map((key, index) => {
    if (key.value === null) jsonError('22004')
    const value = values.elements[index]!
    return { key: String(key.value), value: value.value === null ? null : String(value.value) }
  })
}`,
  },
  jsonObject: {
    dependencies: ['SqlJson', 'jsonTextPairs', 'jsonbEscape', 'jsonParse'],
    source: `function jsonObject(keys: SqlArray | null): SqlJson | null {
  if (keys === null) return null
  const pairs = jsonTextPairs(keys, null)
  const text =
    '{' +
    pairs
      .map((pair) => jsonbEscape(pair.key) + ' : ' + (pair.value === null ? 'null' : jsonbEscape(pair.value)))
      .join(', ') +
    '}'
  return new SqlJson(text, jsonParse(text, false))
}`,
  },
  jsonObjectPair: {
    dependencies: ['SqlJson', 'jsonTextPairs', 'jsonbEscape', 'jsonParse'],
    source: `function jsonObjectPair(keys: SqlArray | null, values: SqlArray | null): SqlJson | null {
  if (keys === null || values === null) return null
  const pairs = jsonTextPairs(keys, values)
  const text =
    '{' +
    pairs
      .map((pair) => jsonbEscape(pair.key) + ' : ' + (pair.value === null ? 'null' : jsonbEscape(pair.value)))
      .join(', ') +
    '}'
  return new SqlJson(text, jsonParse(text, false))
}`,
  },
  jsonbObject: {
    dependencies: ['SqlJsonb', 'jsonTextPairs', 'jsonbCanonicalize'],
    source: `function jsonbObject(keys: SqlArray | null): SqlJsonb | null {
  if (keys === null) return null
  return new SqlJsonb(
    jsonbCanonicalize({
      kind: 'object',
      raw: '',
      pairs: jsonTextPairs(keys, null).map((pair) => ({
        key: pair.key,
        value:
          pair.value === null
            ? { kind: 'null' as const, raw: 'null' }
            : { kind: 'string' as const, raw: '', value: pair.value },
      })),
    }),
  )
}`,
  },
  jsonbObjectPair: {
    dependencies: ['SqlJsonb', 'jsonTextPairs', 'jsonbCanonicalize'],
    source: `function jsonbObjectPair(keys: SqlArray | null, values: SqlArray | null): SqlJsonb | null {
  if (keys === null || values === null) return null
  return new SqlJsonb(
    jsonbCanonicalize({
      kind: 'object',
      raw: '',
      pairs: jsonTextPairs(keys, values).map((pair) => ({
        key: pair.key,
        value:
          pair.value === null
            ? { kind: 'null' as const, raw: 'null' }
            : { kind: 'string' as const, raw: '', value: pair.value },
      })),
    }),
  )
}`,
  },
  jsonKeyString: {
    dependencies: [
      'SqlDecimal',
      'SqlUuid',
      'SqlEnum',
      'SqlJson',
      'SqlJsonb',
      'SqlArray',
      'arrayFloatText',
      'jsonError',
    ],
    source: `function jsonKeyString(type: string, value: any): string {
  if (value === null) jsonError('22004')
  if (value instanceof SqlArray || value instanceof SqlJson || value instanceof SqlJsonb) jsonError('22023')
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number') return arrayFloatText(value, type === 'pg_catalog.float4')
  if (typeof value === 'string') return value
  if (value instanceof SqlDecimal) return value.toString()
  if (value instanceof SqlUuid || value instanceof SqlEnum) return value.toString()
  return jsonError('22023')
}`,
  },
  jsonFromValue: {
    dependencies: [
      'SqlJsonNode',
      'SqlDecimal',
      'SqlJson',
      'SqlJsonb',
      'SqlUuid',
      'SqlEnum',
      'SqlArray',
      'arrayFloatText',
      'jsonbEscape',
      'jsonbFormat',
      'decimalInput',
      'jsonKeyString',
      'jsonError',
    ],
    source: `function jsonFromValue(
  type: string,
  value: any,
  asKey: boolean,
): { text: string; node: SqlJsonNode } {
  if (asKey) {
    const key = jsonKeyString(type, value)
    return { text: jsonbEscape(key), node: { kind: 'string', raw: jsonbEscape(key), value: key } }
  }
  if (value === null) return { text: 'null', node: { kind: 'null', raw: 'null' } }
  if (typeof value === 'boolean') {
    const text = value ? 'true' : 'false'
    return { text, node: { kind: 'bool', raw: text, value } }
  }
  if (typeof value === 'bigint') {
    const text = value.toString()
    return { text, node: { kind: 'number', raw: text, value: decimalInput(text)! } }
  }
  if (typeof value === 'number') {
    const text = arrayFloatText(value, type === 'pg_catalog.float4')
    if (text === 'NaN' || text === 'Infinity' || text === '-Infinity')
      return { text: jsonbEscape(text), node: { kind: 'string', raw: jsonbEscape(text), value: text } }
    return { text, node: { kind: 'number', raw: text, value: decimalInput(text)! } }
  }
  if (typeof value === 'string')
    return { text: jsonbEscape(value), node: { kind: 'string', raw: jsonbEscape(value), value } }
  if (value instanceof SqlDecimal) {
    const text = value.toString()
    if (!/^-?\\d/.test(text))
      return { text: jsonbEscape(text), node: { kind: 'string', raw: jsonbEscape(text), value: text } }
    return { text, node: { kind: 'number', raw: text, value } }
  }
  if (value instanceof SqlJson) return { text: value.text, node: value.node }
  if (value instanceof SqlJsonb) return { text: jsonbFormat(value.node), node: value.node }
  if (value instanceof SqlUuid || value instanceof SqlEnum) {
    const text = value.toString()
    return { text: jsonbEscape(text), node: { kind: 'string', raw: jsonbEscape(text), value: text } }
  }
  if (value instanceof SqlArray) {
    let offset = 0
    const walk = (dim: number, pretty: boolean): { text: string; node: SqlJsonNode } => {
      if (value.dimensions.length === 0) return { text: '[]', node: { kind: 'array', raw: '[]', elements: [] } }
      const texts: string[] = []
      const elements: SqlJsonNode[] = []
      const sep = pretty ? ',\\n ' : ','
      for (let index = 0; index < value.dimensions[dim]!; index++) {
        if (dim === value.dimensions.length - 1) {
          const element = value.elements[offset++]!
          const converted = jsonFromValue(value.elementType, element.value, false)
          texts.push(converted.text)
          elements.push(converted.node)
        } else {
          const nested = walk(dim + 1, false)
          texts.push(nested.text)
          elements.push(nested.node)
        }
      }
      return { text: '[' + texts.join(sep) + ']', node: { kind: 'array', raw: '', elements } }
    }
    return walk(0, false)
  }
  return jsonError('22023')
}`,
  },
  arrayToJson: {
    dependencies: ['SqlJson', 'SqlArray', 'jsonFromValue'],
    source: `function arrayToJson(value: SqlArray | null): SqlJson | null {
  if (value === null) return null
  const converted = jsonFromValue(value.elementType, value, false)
  return new SqlJson(converted.text, converted.node)
}`,
  },
  arrayToJsonPretty: {
    dependencies: ['SqlJson', 'SqlArray', 'jsonFromValue', 'arrayToJson'],
    source: `function arrayToJsonPretty(value: SqlArray | null, pretty: boolean | null): SqlJson | null {
  if (value === null || pretty === null) return null
  if (!pretty) return arrayToJson(value)
  let offset = 0
  const walk = (dim: number, usePretty: boolean): { text: string; node: SqlJsonNode } => {
    if (value.dimensions.length === 0) return { text: '[]', node: { kind: 'array', raw: '[]', elements: [] } }
    const texts: string[] = []
    const elements: SqlJsonNode[] = []
    const sep = usePretty ? ',\\n ' : ','
    for (let index = 0; index < value.dimensions[dim]!; index++) {
      if (dim === value.dimensions.length - 1) {
        const element = value.elements[offset++]!
        const converted = jsonFromValue(value.elementType, element.value, false)
        texts.push(converted.text)
        elements.push(converted.node)
      } else {
        const nested = walk(dim + 1, false)
        texts.push(nested.text)
        elements.push(nested.node)
      }
    }
    return { text: '[' + texts.join(sep) + ']', node: { kind: 'array', raw: '', elements } }
  }
  const converted = walk(0, true)
  return new SqlJson(converted.text, converted.node)
}`,
  },
  toJson: {
    dependencies: ['SqlJson', 'jsonFromValue'],
    source: `function toJson(type: string, value: any): SqlJson | null {
  if (value === null) return null
  const converted = jsonFromValue(type, value, false)
  return new SqlJson(converted.text, converted.node)
}`,
  },
  toJsonb: {
    dependencies: ['SqlJsonb', 'jsonFromValue', 'jsonbCanonicalize'],
    source: `function toJsonb(type: string, value: any): SqlJsonb | null {
  if (value === null) return null
  return new SqlJsonb(jsonbCanonicalize(jsonFromValue(type, value, false).node))
}`,
  },
  jsonBuildArray: {
    dependencies: ['SqlJson', 'jsonFromValue'],
    source: `function jsonBuildArray(...args: any[]): SqlJson {
  const texts: string[] = []
  const elements: SqlJsonNode[] = []
  for (let index = 0; index < args.length; index += 2) {
    const converted = jsonFromValue(args[index], args[index + 1], false)
    texts.push(converted.text)
    elements.push(converted.node)
  }
  return new SqlJson('[' + texts.join(', ') + ']', { kind: 'array', raw: '', elements })
}`,
  },
  jsonBuildObject: {
    dependencies: [
      'SqlJson',
      'jsonFromValue',
      'jsonKeyString',
      'jsonbEscape',
      'jsonParse',
      'jsonError',
    ],
    source: `function jsonBuildObject(...args: any[]): SqlJson {
  if (args.length % 4 !== 0) jsonError('22023')
  const texts: string[] = []
  for (let index = 0; index < args.length; index += 4) {
    const key = jsonKeyString(args[index], args[index + 1])
    const value = jsonFromValue(args[index + 2], args[index + 3], false)
    texts.push(jsonbEscape(key) + ' : ' + value.text)
  }
  const text = '{' + texts.join(', ') + '}'
  return new SqlJson(text, jsonParse(text, false))
}`,
  },
  jsonbBuildArray: {
    dependencies: ['SqlJsonb', 'jsonFromValue', 'jsonbCanonicalize'],
    source: `function jsonbBuildArray(...args: any[]): SqlJsonb {
  const elements: SqlJsonNode[] = []
  for (let index = 0; index < args.length; index += 2)
    elements.push(jsonFromValue(args[index], args[index + 1], false).node)
  return new SqlJsonb(jsonbCanonicalize({ kind: 'array', raw: '', elements }))
}`,
  },
  jsonbBuildObject: {
    dependencies: ['SqlJsonb', 'jsonFromValue', 'jsonKeyString', 'jsonbCanonicalize', 'jsonError'],
    source: `function jsonbBuildObject(...args: any[]): SqlJsonb {
  if (args.length % 4 !== 0) jsonError('22023')
  const pairs: { key: string; value: SqlJsonNode }[] = []
  for (let index = 0; index < args.length; index += 4)
    pairs.push({
      key: jsonKeyString(args[index], args[index + 1]),
      value: jsonFromValue(args[index + 2], args[index + 3], false).node,
    })
  return new SqlJsonb(jsonbCanonicalize({ kind: 'object', raw: '', pairs }))
}`,
  },
})
