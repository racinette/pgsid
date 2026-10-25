import type { RowCoercionIdentity } from './coercion-context.js'

export type ContainerStorageFacet<Leaf> =
  | Leaf
  | { kind: 'record'; fields: (ContainerStorageFacet<Leaf> | null)[] }
  | { kind: 'range'; flags: number; bounds: (ContainerStorageFacet<Leaf> | null)[] }
  | { kind: 'multirange'; ranges: ContainerStorageFacet<Leaf>[] }
  | {
      kind: 'array'
      nullBitmap?: boolean
      delimiter: string
      dimensions: { lower: number; length: number }[]
      elements: (ContainerStorageFacet<Leaf> | null)[]
    }

export interface ConstantStorageType {
  oid: number
  identity: string
  kind: string
  base: number
  element: number | null
  rangeSubtype?: number | null
  rangeType?: number | null
  length: number
  alignment: string
  delimiter: string
  attributes: { name?: string; type: number; length: number; alignment: string; dropped: boolean }[]
}

export function storageRowIdentities(
  types: ReadonlyMap<number, ConstantStorageType>,
): Map<number, RowCoercionIdentity> {
  const rowIdentity = (oid: number, seen = new Set<number>()): RowCoercionIdentity | null => {
    if (seen.has(oid)) return null
    seen.add(oid)
    const type = types.get(oid)
    if (!type) return null
    if (type.kind === 'c')
      return {
        identity: type.identity,
        depth: 0,
        fields: type.attributes.flatMap((field, index) => (field.dropped ? [] : [index])),
      }
    if (type.kind === 'd') return rowIdentity(type.base, seen)
    const element = type.element ? rowIdentity(type.element, seen) : null
    return element ? { ...element, depth: element.depth + 1 } : null
  }
  return new Map(
    [...types.keys()].flatMap((oid) => {
      const identity = rowIdentity(oid)
      return identity ? [[oid, identity] as const] : []
    }),
  )
}

export function storageContainerTypes(
  types: ReadonlyMap<number, ConstantStorageType>,
  identity: string | ReadonlySet<number>,
  ranges = false,
): Set<number> {
  const parents = new Map<number, Set<number>>(),
    roots: number[] = []
  for (const type of types.values()) {
    if (typeof identity === 'string' ? type.identity === identity : identity.has(type.oid))
      roots.push(type.oid)
    const children =
      type.kind === 'd'
        ? [type.base]
        : type.element
          ? [type.element]
          : ranges && type.rangeSubtype
            ? [type.rangeSubtype]
            : ranges && type.rangeType
              ? [type.rangeType]
              : type.attributes.filter((a) => !a.dropped).map((a) => a.type)
    for (const child of children) {
      const owners = parents.get(child) ?? new Set<number>()
      owners.add(type.oid)
      parents.set(child, owners)
    }
  }
  const result = new Set(roots)
  for (let index = 0; index < roots.length; index++)
    for (const parent of parents.get(roots[index]!) ?? []) {
      if (!result.has(parent)) {
        result.add(parent)
        roots.push(parent)
      }
    }
  if (typeof identity === 'string')
    for (const type of types.values()) if (type.identity === identity) result.delete(type.oid)
  return result
}

export function containerConstant<Leaf>(
  bytes: Buffer,
  oid: number,
  types: ReadonlyMap<number, ConstantStorageType>,
  identity: string,
  leaf: (input: Buffer, header: number) => Leaf | undefined,
  options?: {
    containers?: ReadonlySet<number>
    arrayStorage?: boolean
    ranges?: boolean
    byteOrder?: 'little' | 'big'
    doubleAlign?: 4 | 8
    scalar?: (input: Buffer, type: ConstantStorageType) => Leaf | undefined
  },
): ContainerStorageFacet<Leaf> | undefined {
  const candidates: ContainerStorageFacet<Leaf>[] = []
  const containers = options?.containers ?? storageContainerTypes(types, identity, options?.ranges)
  for (const little of options?.byteOrder ? [options.byteOrder === 'little'] : [true, false])
    for (const doubleAlign of options?.doubleAlign ? [options.doubleAlign] : [4, 8]) {
      const read = (data: Buffer, offset: number) =>
        little ? data.readInt32LE(offset) : data.readInt32BE(offset)
      const word = (data: Buffer, offset: number) =>
        little ? data.readUInt32LE(offset) : data.readUInt32BE(offset)
      const short = (data: Buffer, offset: number) =>
        little ? data.readUInt16LE(offset) : data.readUInt16BE(offset)
      const align = (offset: number, alignment: string): number => {
        const width =
          alignment === 'c'
            ? 1
            : alignment === 's'
              ? 2
              : alignment === 'i'
                ? 4
                : alignment === 'd'
                  ? doubleAlign
                  : 0
        return width ? Math.ceil(offset / width) * width : -1
      }
      const frame = (
        data: Buffer,
      ): { length: number; header: number; plain: boolean } | undefined => {
        if (!data.length) return undefined
        const first = data[0]!
        if (little ? first & 1 : first & 128) {
          const length = little ? first >>> 1 : first & 127
          return length > 0 && length <= data.length
            ? { length, header: 1, plain: true }
            : undefined
        }
        if (data.length < 4) return undefined
        const value = word(data, 0),
          length = little ? value >>> 2 : value & 1073741823
        return length >= 4 && length <= data.length
          ? { length, header: 4, plain: little ? (value & 3) === 0 : value < 1073741824 }
          : undefined
      }
      const decode = (
        input: Buffer,
        typeOid: number,
      ): ContainerStorageFacet<Leaf> | null | undefined => {
        const type = types.get(typeOid)
        if (!type) return undefined
        if (type.identity !== identity && !containers.has(typeOid) && !options?.scalar) return null
        if (type.kind === 'd') return decode(input, type.base)
        if (
          type.identity !== identity &&
          !type.element &&
          type.kind !== 'c' &&
          !(options?.ranges && (type.kind === 'r' || type.kind === 'm'))
        )
          return options?.scalar ? options.scalar(input, type) : null
        const stored = frame(input)
        if (!stored || stored.length !== input.length || !stored.plain) return undefined
        if (type.identity === identity) return leaf(input, stored.header)
        const data =
          stored.header === 4 ? input : Buffer.concat([Buffer.alloc(4), input.subarray(1)])
        const take = (offset: number, length: number): Buffer | undefined => {
          if (offset < 0 || offset >= data.length) return undefined
          if (length > 0)
            return offset + length <= data.length
              ? data.subarray(offset, offset + length)
              : undefined
          if (length === -1) {
            const value = frame(data.subarray(offset))
            return value ? data.subarray(offset, offset + value.length) : undefined
          }
          if (length === -2) {
            const end = data.indexOf(0, offset)
            return end < 0 ? undefined : data.subarray(offset, end + 1)
          }
          return undefined
        }
        if (options?.ranges && (type.kind === 'r' || type.kind === 'm')) {
          const range = type.kind === 'r' ? type : types.get(type.rangeType ?? 0),
            subtype = types.get(range?.rangeSubtype ?? 0)
          if (
            !range ||
            !subtype ||
            data.length < (type.kind === 'r' ? 9 : 12) ||
            word(data, 4) !== type.oid
          )
            return undefined
          const bounds = (
            flags: number,
            start: number,
            limit: number,
          ): { value: ContainerStorageFacet<Leaf>; end: number } | undefined => {
            if (flags & 224) return undefined
            if (flags & 1)
              return flags === 1
                ? { value: { kind: 'range', flags, bounds: [] }, end: start }
                : undefined
            if ((flags & 8 && flags & 2) || (flags & 16 && flags & 4)) return undefined
            const values: (ContainerStorageFacet<Leaf> | null)[] = []
            let position = start
            for (const infinite of [8, 16]) {
              if (flags & infinite) {
                values.push(null)
                continue
              }
              if (subtype.length !== -1 || data[position] === 0)
                position = align(position, subtype.alignment)
              const value = take(position, subtype.length)
              if (!value || position + value.length > limit) return undefined
              const facet = decode(value, subtype.oid)
              if (facet === undefined) return undefined
              values.push(facet)
              position += value.length
            }
            return { value: { kind: 'range', flags, bounds: values }, end: position }
          }
          if (type.kind === 'r') {
            const value = bounds(data[data.length - 1]!, 8, data.length - 1)
            return value?.end === data.length - 1 ? value.value : undefined
          }
          const count = word(data, 8),
            flags = 12 + Math.max(count - 1, 0) * 4
          if (count === 0)
            return data.length === 12 ? { kind: 'multirange', ranges: [] } : undefined
          if (count > 2147483647 || flags + count > data.length) return undefined
          const begin = align(flags + count, subtype.alignment),
            values: ContainerStorageFacet<Leaf>[] = []
          if (begin < 0 || begin > data.length) return undefined
          let position = begin,
            previous = 0
          for (let index = 0; index < count; index++) {
            if (index > 0) {
              const item = word(data, 12 + (index - 1) * 4),
                absolute = (item & 2147483648) !== 0,
                offset = item & 2147483647
              if (absolute !== (index % 4 === 0)) return undefined
              const relative = absolute ? offset : previous + offset
              if (begin + relative !== position) return undefined
              previous = relative
            }
            const flag = data[flags + index]!
            if (flag & 1) return undefined
            const value = bounds(flag, position, data.length)
            if (!value) return undefined
            values.push(value.value)
            position = align(value.end, subtype.alignment)
          }
          if (position !== data.length) return undefined
          return { kind: 'multirange', ranges: values }
        }
        if (type.element) {
          if (data.length < 16 || word(data, 12) !== type.element) return undefined
          const dimensions = read(data, 4),
            offset = read(data, 8),
            element = types.get(type.element)
          if (!element || dimensions < 0 || dimensions > 6 || 16 + dimensions * 8 > data.length)
            return undefined
          const shape: { lower: number; length: number }[] = []
          let count = dimensions ? 1 : 0
          for (let i = 0; i < dimensions; i++) {
            const length = read(data, 16 + i * 4),
              lower = read(data, 16 + dimensions * 4 + i * 4)
            if (length <= 0 || lower + length > 2147483648 || count * length > 2147483647)
              return undefined
            count *= length
            shape.push({ lower, length })
          }
          const fixed = 16 + dimensions * 8
          if (
            offset < 0 ||
            (offset && (offset < fixed + Math.ceil(count / 8) || offset > data.length))
          )
            return undefined
          let position = offset || fixed
          const elements: (ContainerStorageFacet<Leaf> | null)[] = []
          for (let i = 0; i < count; i++) {
            if (offset && (data[fixed + (i >>> 3)]! & (1 << (i & 7))) === 0) {
              elements.push(null)
              continue
            }
            position = align(position, element.alignment)
            const value = take(position, element.length)
            if (!value) return undefined
            const facet = decode(value, type.element)
            if (facet === undefined) return undefined
            elements.push(facet)
            position += value.length
          }
          if (
            position > data.length ||
            data.length - position > 7 ||
            data.subarray(position).some((b) => b !== 0)
          )
            return undefined
          return {
            kind: 'array',
            delimiter: element.delimiter,
            dimensions: shape,
            elements,
            ...(options?.arrayStorage ? { nullBitmap: offset !== 0 } : {}),
          }
        }
        if (data.length < 23 || word(data, 8) !== type.oid) return undefined
        const count = short(data, 18) & 2047,
          flags = short(data, 20),
          offset = data[22]!
        if (
          count > type.attributes.length ||
          flags & 8 ||
          offset < 23 + (flags & 1 ? Math.ceil(count / 8) : 0) ||
          offset > data.length
        )
          return undefined
        const fields: (ContainerStorageFacet<Leaf> | null)[] = []
        let position = offset
        for (const [index, attribute] of type.attributes.entries()) {
          if (
            index >= count ||
            (flags & 1 && (data[23 + (index >>> 3)]! & (1 << (index & 7))) === 0)
          ) {
            if (!attribute.dropped) fields.push(null)
            continue
          }
          if (attribute.length !== -1 || data[position] === 0)
            position = align(position, attribute.alignment)
          const value = take(position, attribute.length)
          if (!value) return undefined
          if (!attribute.dropped) {
            const facet = decode(value, attribute.type)
            if (facet === undefined) return undefined
            fields.push(facet)
          }
          position += value.length
        }
        if (
          position > data.length ||
          data.length - position > 7 ||
          data.subarray(position).some((b) => b !== 0)
        )
          return undefined
        return { kind: 'record', fields }
      }
      const result = decode(bytes, oid)
      if (result) candidates.push(result)
    }
  return candidates.length &&
    candidates.every((c) => JSON.stringify(c) === JSON.stringify(candidates[0]))
    ? candidates[0]
    : undefined
}
