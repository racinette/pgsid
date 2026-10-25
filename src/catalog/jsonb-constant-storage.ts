import type { Tree } from './expression-tree.js'
import { storedVarlenaBody } from './constant-storage-bytes.js'
import { numericStorageText } from './numeric-constant-storage.js'

type Entry = { kind: 'value'; type: number; start: number; end: number }
type Work = Entry | { kind: 'container'; start: number; end: number; root: boolean } | string

export function storedJsonbConstant(
  node: Tree,
  byteOrder: 'little' | 'big',
  utf8: boolean,
): string | undefined {
  const body = storedVarlenaBody(node, byteOrder)
  if (!body) return undefined
  const word = (at: number) =>
      byteOrder === 'little' ? body.readUInt32LE(at) : body.readUInt32BE(at),
    string = (start: number, end: number): string | undefined => {
      const bytes = body.subarray(start, end)
      if (!utf8 && bytes.some((byte) => byte > 127)) return undefined
      const value = bytes.toString('utf8')
      return value.includes('\0') || !Buffer.from(value, 'utf8').equals(bytes) ? undefined : value
    },
    output: string[] = [],
    work: Work[] = [{ kind: 'container', start: 0, end: body.length, root: true }]
  while (work.length) {
    const item = work.pop()!
    if (typeof item === 'string') {
      output.push(item)
      continue
    }
    if (item.kind === 'value') {
      if (item.type === 0) {
        const value = string(item.start, item.end)
        if (value === undefined) return undefined
        output.push(JSON.stringify(value))
      } else if (item.type === 1 || item.type === 5) {
        const start = Math.ceil(item.start / 4) * 4
        if (start >= item.end || body.subarray(item.start, start).some((byte) => byte !== 0))
          return undefined
        if (item.type === 5) work.push({ kind: 'container', start, end: item.end, root: false })
        else {
          const value = numericStorageText(body.subarray(start, item.end), byteOrder)
          if (value === undefined || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) return undefined
          output.push(value)
        }
      } else {
        if (item.start !== item.end || item.type < 2 || item.type > 4) return undefined
        output.push(item.type === 2 ? 'false' : item.type === 3 ? 'true' : 'null')
      }
      continue
    }
    if (item.end - item.start < 4) return undefined
    const header = word(item.start),
      count = header & 0x0fffffff,
      flags = header >>> 28,
      object = flags === 2,
      scalar = flags === 5,
      size = object ? count * 2 : count,
      data = item.start + 4 + size * 4
    if (
      (!object && flags !== 4 && !scalar) ||
      (scalar && (!item.root || count !== 1)) ||
      data > item.end
    )
      return undefined
    const entries: Entry[] = []
    let offset = 0
    for (let i = 0; i < size; i++) {
      const entry = word(item.start + 4 + i * 4),
        type = (entry >>> 28) & 7,
        length = entry & 0x0fffffff,
        next = entry & 0x80000000 ? length : offset + length
      if (type > 5 || next < offset || data + next > item.end) return undefined
      entries.push({ kind: 'value', type, start: data + offset, end: data + next })
      offset = next
    }
    if (data + offset !== item.end || (scalar && entries[0]!.type === 5)) return undefined
    if (object) {
      const keys: string[] = []
      for (let i = 0; i < count; i++) {
        const entry = entries[i]!,
          key = entry.type === 0 ? string(entry.start, entry.end) : undefined
        if (key === undefined) return undefined
        if (i > 0) {
          const previous = entries[i - 1]!,
            length = entry.end - entry.start,
            previousLength = previous.end - previous.start
          if (
            length < previousLength ||
            (length === previousLength &&
              Buffer.compare(
                body.subarray(previous.start, previous.end),
                body.subarray(entry.start, entry.end),
              ) >= 0)
          )
            return undefined
        }
        keys.push(JSON.stringify(key))
      }
      output.push('{')
      work.push('}')
      for (let i = count - 1; i >= 0; i--) {
        work.push(entries[count + i]!, ':', keys[i]!)
        if (i > 0) work.push(',')
      }
    } else if (scalar) work.push(entries[0]!)
    else {
      output.push('[')
      work.push(']')
      for (let i = count - 1; i >= 0; i--) {
        work.push(entries[i]!)
        if (i > 0) work.push(',')
      }
    }
  }
  return output.join('')
}
