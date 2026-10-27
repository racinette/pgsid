import { scalar, type Tree } from './expression-tree.js'
import { storedVarlenaBody } from './constant-storage-bytes.js'
import { numericStorageText } from './numeric-constant-storage.js'

export interface JsonpathConstantNode {
  kind: number
  next: number
  left: number
  right: number
  text: string
  first: number
  last: number
  flags: number
}

export interface JsonpathConstantStorage {
  nodes: JsonpathConstantNode[]
  root: number
  lax: boolean
  source: string
}

const emptyNode = (): JsonpathConstantNode => ({
  kind: 0,
  next: 0,
  left: 0,
  right: 0,
  text: '',
  first: 0,
  last: 0,
  flags: 0,
})

export function validJsonpathConstantStorage(input: unknown): input is JsonpathConstantStorage {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  const value = input as JsonpathConstantStorage
  if (
    typeof value.lax !== 'boolean' ||
    typeof value.source !== 'string' ||
    value.source === '' ||
    value.source.includes('\0') ||
    Buffer.from(value.source).toString('utf8') !== value.source ||
    !Array.isArray(value.nodes) ||
    value.nodes.length < 2 ||
    !Number.isInteger(value.root) ||
    value.root < 1 ||
    value.root >= value.nodes.length
  )
    return false
  const kinds = new Set([
    0,
    ...Array.from({ length: 36 }, (_, i) => i + 1),
    102,
    104,
    108,
    109,
    111,
    114,
    115,
    116,
    118,
    121,
    122,
    123,
    124,
    125,
    126,
    128,
    129,
    130,
    132,
  ])
  for (const [index, node] of value.nodes.entries()) {
    if (
      !node ||
      ![node.kind, node.next, node.left, node.right, node.first, node.last, node.flags].every(
        Number.isInteger,
      ) ||
      !kinds.has(node.kind) ||
      (index === 0) !== (node.kind === 0) ||
      typeof node.text !== 'string' ||
      node.text.includes('\0') ||
      Buffer.from(node.text).toString('utf8') !== node.text ||
      node.first < -1 ||
      node.last < -1 ||
      node.first > 2147483647 ||
      node.last > 2147483647 ||
      node.flags < 0 ||
      node.flags > 31 ||
      (index === 0 && [node.next, node.left, node.right].some((n) => n !== 0)) ||
      (node.kind !== 15 && (node.first !== 0 || node.last !== 0)) ||
      (node.kind !== 36 && node.flags !== 0) ||
      (![4, 5, 6, 10, 36].includes(node.kind) && node.text !== '') ||
      [node.next, node.left, node.right].some((n) => n < 0 || n >= value.nodes.length)
    )
      return false
  }
  const pending = [value.root],
    visited = new Set<number>()
  while (pending.length) {
    const index = pending.pop()!
    if (visited.has(index)) return false
    visited.add(index)
    const node = value.nodes[index]!
    pending.push(...[node.next, node.left, node.right].filter((n) => n !== 0))
  }
  return visited.size === value.nodes.length - 1
}

export function storedJsonpathValue(
  node: Tree,
  byteOrder: 'little' | 'big',
  utf8: boolean,
): JsonpathConstantStorage | null | undefined {
  let graph: JsonpathConstantStorage | undefined
  const text = storedJsonpathConstant(node, byteOrder, utf8, (value) => {
    graph = value
  })
  return text === null ? null : graph && validJsonpathConstantStorage(graph) ? graph : undefined
}

export function storedJsonpathConstant(
  node: Tree,
  byteOrder: 'little' | 'big',
  utf8: boolean,
  capture?: (value: JsonpathConstantStorage) => void,
): string | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  const body = storedVarlenaBody(node, byteOrder)
  if (!body || body.length < 12) return undefined
  const little = byteOrder === 'little',
    word = (buffer: Buffer, at: number): number => {
      if (!Number.isInteger(at) || at < 0 || at + 4 > buffer.length) throw new Error('word')
      return little ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at)
    },
    data = body.subarray(4),
    active = new Set<number>(),
    positions = new Map<number, number>(),
    nodes: JsonpathConstantNode[] = [emptyNode()],
    binary = new Map([
      [4, '&&'],
      [5, '||'],
      [8, '=='],
      [9, '!='],
      [10, '<'],
      [11, '>'],
      [12, '<='],
      [13, '>='],
      [14, '+'],
      [15, '-'],
      [16, '*'],
      [17, '/'],
      [18, '%'],
      [41, 'starts with'],
    ]),
    methods = new Map([
      [31, 'type'],
      [32, 'size'],
      [33, 'abs'],
      [34, 'floor'],
      [35, 'ceiling'],
      [36, 'double'],
      [38, 'keyvalue'],
      [43, 'bigint'],
      [44, 'boolean'],
      [45, 'date'],
      [47, 'integer'],
      [48, 'number'],
      [49, 'string'],
    ]),
    argumentsMethods = new Map([
      [37, 'datetime'],
      [50, 'time'],
      [51, 'time_tz'],
      [52, 'timestamp'],
      [53, 'timestamp_tz'],
    ]),
    string = (at: number, length: number): string => {
      if (length > data.length || at + length >= data.length || data[at + length] !== 0)
        throw new Error('string')
      const bytes = data.subarray(at, at + length),
        text = bytes.toString('utf8')
      if (!Buffer.from(text, 'utf8').equals(bytes) || (!utf8 && bytes.some((n) => n > 127)))
        throw new Error('encoding')
      return JSON.stringify(text)
    },
    render = (position: number, prefix = ''): string => {
      if (
        !Number.isInteger(position) ||
        position < 0 ||
        position >= data.length ||
        active.has(position)
      )
        throw new Error('position')
      active.add(position)
      try {
        const index = nodes.length,
          portable = emptyNode()
        positions.set(position, index)
        nodes.push(portable)
        const kind = data[position]!,
          at = Math.ceil((position + 1) / 4) * 4,
          next = word(data, at),
          payload = at + 4,
          child = (offset: number): string => {
            const relative = word(data, offset)
            if (!relative || relative > data.length - position) throw new Error('child')
            return render(position + relative)
          },
          argument = (offset: number): string => (word(data, offset) ? child(offset) : '')
        let text: string,
          accessor = false
        if (kind === 0) text = 'null'
        else if ([1, 25, 28].includes(kind)) {
          text = string(payload + 4, word(data, payload))
          if (kind === 25) {
            text = '.' + text
            accessor = true
          }
          if (kind === 28) text = '$' + text
        } else if (kind === 2) {
          const header = word(data, payload),
            length = little ? header / 4 : header,
            numeric = numericStorageText(data.subarray(payload, payload + length), byteOrder)
          if (!numeric || !/^-?\d+(?:\.\d+)?$/u.test(numeric)) throw new Error('numeric')
          text = next ? '(' + numeric + ')' : numeric
        } else if (kind === 3) {
          if (data[payload] !== 0 && data[payload] !== 1) throw new Error('boolean')
          text = data[payload] ? 'true' : 'false'
        } else if (binary.has(kind))
          text = '(' + child(payload) + ' ' + binary.get(kind)! + ' ' + child(payload + 4) + ')'
        else if (kind === 6) text = '!(' + child(payload) + ')'
        else if (kind === 7) text = '(' + child(payload) + ') is unknown'
        else if (kind === 19 || kind === 20)
          text = '(' + (kind === 19 ? '+' : '-') + '(' + child(payload) + '))'
        else if (kind === 21 || kind === 22) {
          text = kind === 21 ? '[*]' : '.*'
          accessor = true
        } else if (kind === 23) {
          const count = word(data, payload),
            parts: string[] = []
          if (!count || count > (data.length - payload - 4) / 8) throw new Error('subscripts')
          for (let i = 0; i < count; i++) {
            const from = child(payload + 4 + i * 8),
              to = argument(payload + 8 + i * 8)
            parts.push(from + (to ? ' to ' + to : ''))
          }
          text = '[' + parts.join(',') + ']'
          accessor = true
        } else if (kind === 24) {
          const bound = (value: number) => (value === 4294967295 ? 'last' : String(value))
          text = '.**{' + bound(word(data, payload)) + ' to ' + bound(word(data, payload + 4)) + '}'
          accessor = true
        } else if (kind === 26 || kind === 27 || kind === 40)
          text = kind === 26 ? '@' : kind === 27 ? '$' : 'last'
        else if (kind === 29) {
          text = '?(' + child(payload) + ')'
          accessor = true
        } else if (kind === 30) text = 'exists(' + child(payload) + ')'
        else if (methods.has(kind)) {
          text = '.' + methods.get(kind)! + '()'
          accessor = true
        } else if (argumentsMethods.has(kind)) {
          text = '.' + argumentsMethods.get(kind)! + '(' + argument(payload) + ')'
          accessor = true
        } else if (kind === 46) {
          const left = argument(payload),
            right = argument(payload + 4)
          if (!left && right) throw new Error('decimal')
          text = '.decimal(' + left + (right ? ',' + right : '') + ')'
          accessor = true
        } else if (kind === 42) {
          const flags = word(data, payload)
          if (flags > 31) throw new Error('flags')
          text =
            '(' +
            child(payload + 4) +
            ' like_regex ' +
            string(payload + 12, word(data, payload + 8)) +
            ' flag ' +
            JSON.stringify(['i', 's', 'm', 'x', 'q'].filter((_, i) => flags & (1 << i)).join('')) +
            ')'
        } else throw new Error('kind')
        if (prefix && !accessor) throw new Error('chain')
        if (!prefix && accessor) throw new Error('root')
        const link = (offset: number): number => {
          const relative = word(data, offset)
          if (!relative) return 0
          const id = positions.get(position + relative)
          if (!id) throw new Error('link')
          return id
        }
        const mapping: Record<number, number> = {
          0: 7,
          1: 4,
          2: 5,
          3: 8,
          4: 33,
          5: 34,
          6: 18,
          7: 19,
          8: 27,
          9: 28,
          10: 29,
          11: 31,
          12: 30,
          13: 32,
          14: 22,
          15: 23,
          16: 24,
          17: 25,
          18: 26,
          19: 20,
          20: 21,
          21: 12,
          22: 11,
          23: 13,
          24: 15,
          25: 10,
          26: 2,
          27: 1,
          28: 6,
          29: 16,
          30: 17,
          31: 111,
          32: 108,
          33: 102,
          34: 114,
          35: 123,
          36: 116,
          37: 128,
          38: 129,
          40: 3,
          41: 35,
          42: 36,
          43: 115,
          44: 122,
          45: 104,
          46: 124,
          47: 125,
          48: 118,
          49: 121,
          50: 109,
          51: 126,
          52: 130,
          53: 132,
        }
        portable.kind = mapping[kind]!
        if ([1, 25, 28].includes(kind))
          portable.text = JSON.parse(
            kind === 25 ? text.slice(1) : kind === 28 ? text.slice(1) : text,
          ) as string
        if (kind === 2) portable.text = text.startsWith('(') ? text.slice(1, -1) : text
        if (kind === 3) portable.kind = data[payload] ? 8 : 9
        if (binary.has(kind)) {
          portable.left = link(payload)
          portable.right = link(payload + 4)
        }
        if ([6, 7, 19, 20, 29, 30].includes(kind)) portable.left = link(payload)
        if (kind === 23) {
          const count = word(data, payload)
          let previous = 0
          for (let i = 0; i < count; i++) {
            const entry = emptyNode()
            entry.kind = 14
            entry.left = link(payload + 4 + i * 8)
            entry.right = link(payload + 8 + i * 8)
            if (previous) nodes[previous]!.next = nodes.length
            else portable.left = nodes.length
            previous = nodes.length
            nodes.push(entry)
          }
        }
        if (kind === 24) {
          const bound = (value: number) => (value === 4294967295 ? -1 : value)
          portable.first = bound(word(data, payload))
          portable.last = bound(word(data, payload + 4))
        }
        if (argumentsMethods.has(kind)) portable.left = link(payload)
        if (kind === 46) {
          portable.left = link(payload)
          portable.right = link(payload + 4)
        }
        if (kind === 42) {
          portable.flags = word(data, payload)
          portable.left = link(payload + 4)
          portable.text = JSON.parse(string(payload + 12, word(data, payload + 8))) as string
        }
        const result = prefix + text
        if (!next) return result
        if (next > data.length - position) throw new Error('next')
        const rendered = render(position + next, result)
        portable.next = positions.get(position + next)!
        return rendered
      } finally {
        active.delete(position)
      }
    }
  try {
    const header = word(body, 0)
    if ((header & 0x7fffffff) !== 1) return undefined
    const rendered = (header & 0x80000000 ? 'lax ' : 'strict ') + render(0)
    capture?.({ nodes, root: 1, lax: (header & 0x80000000) !== 0, source: rendered })
    return rendered
  } catch {
    return undefined
  }
}
