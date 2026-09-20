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
