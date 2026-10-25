import { scalar, type Tree } from './expression-tree.js'
import { storedVarlenaBody } from './constant-storage-bytes.js'
import { numericStorageText } from './numeric-constant-storage.js'

export function storedJsonpathConstant(
  node: Tree,
  byteOrder: 'little' | 'big',
  utf8: boolean,
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
        const result = prefix + text
        if (!next) return result
        if (next > data.length - position) throw new Error('next')
        return render(position + next, result)
      } finally {
        active.delete(position)
      }
    }
  try {
    const header = word(body, 0)
    if ((header & 0x7fffffff) !== 1) return undefined
    return (header & 0x80000000 ? 'lax ' : 'strict ') + render(0)
  } catch {
    return undefined
  }
}
