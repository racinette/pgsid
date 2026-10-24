export type ContainerStorageFacet<Leaf> =
  | Leaf
  | { kind: 'record'; fields: (ContainerStorageFacet<Leaf> | null)[] }
  | {
      kind: 'array'
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
  length: number
  alignment: string
  delimiter: string
  attributes: { type: number; length: number; alignment: string; dropped: boolean }[]
}

export function storageContainerTypes(
  types: ReadonlyMap<number, ConstantStorageType>,
  identity: string,
): Set<number> {
  const parents = new Map<number, Set<number>>(),
    roots: number[] = []
  for (const type of types.values()) {
    if (type.identity === identity) roots.push(type.oid)
    const children =
      type.kind === 'd'
        ? [type.base]
        : type.element
          ? [type.element]
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
  for (const type of types.values()) if (type.identity === identity) result.delete(type.oid)
  return result
}

export function containerConstant<Leaf>(
  bytes: Buffer,
  oid: number,
  types: ReadonlyMap<number, ConstantStorageType>,
  identity: string,
  leaf: (input: Buffer, header: number) => Leaf | undefined,
): ContainerStorageFacet<Leaf> | undefined {
  const candidates: ContainerStorageFacet<Leaf>[] = []
  const containers = storageContainerTypes(types, identity)
  for (const little of [true, false])
    for (const doubleAlign of [4, 8]) {
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
        if (type.identity !== identity && !containers.has(typeOid)) return null
        if (type.kind === 'd') return decode(input, type.base)
        if (type.identity !== identity && !type.element && type.kind !== 'c') return null
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
          return { kind: 'array', delimiter: element.delimiter, dimensions: shape, elements }
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
