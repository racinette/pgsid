import { scalar, type Tree } from './expression-tree.js'
import { storedReferenceBytes } from './constant-storage-bytes.js'
import type { ArrayConstantStorage } from './array-constant-storage.js'
import {
  containerConstant,
  type ConstantStorageType,
  type ContainerStorageFacet,
} from './container-constant-storage.js'

type Scalar = { kind: 'scalar'; expression: unknown }

export function storedContainerConstant(
  node: Tree,
  types: ReadonlyMap<number, ConstantStorageType>,
  byteOrder: 'little' | 'big',
  doubleAlign: 4 | 8 | undefined,
  convertScalar: (bytes: Buffer, type: ConstantStorageType) => unknown,
): unknown {
  const oid = Number(scalar(node, 'consttype')),
    base = (id: number): ConstantStorageType | undefined => {
      const seen = new Set<number>()
      let type = types.get(id)
      while (type?.kind === 'd') {
        if (seen.has(type.oid)) return undefined
        seen.add(type.oid)
        type = types.get(type.base)
      }
      return type
    },
    type = base(oid),
    element = type?.element ? types.get(type.element) : undefined,
    container = type && (type.element || ['c', 'r', 'm'].includes(type.kind))
  if (!container || !type) return undefined
  if (scalar(node, 'constisnull') === 'true') {
    if (type.kind === 'c') return { PgsidStoredRecordConstant: { type: type.identity, args: null } }
    if (type.kind === 'r') return { PgsidStoredRangeConstant: { type: type.identity, args: null } }
    if (type.kind === 'm')
      return { PgsidStoredMultirangeConstant: { type: type.identity, args: null } }
    return element
      ? {
          PgsidStoredArrayConstant: {
            element: element.identity,
            dimensions: [],
            nullBitmap: false,
            args: null,
          },
        }
      : undefined
  }
  const bytes = storedReferenceBytes(node, -1)
  if (!bytes) return undefined
  const facet = containerConstant<Scalar>(bytes, oid, types, '', () => undefined, {
    arrayStorage: true,
    ranges: true,
    byteOrder,
    doubleAlign,
    scalar: (bytes, type) => {
      const expression = convertScalar(bytes, type)
      return expression === undefined ? undefined : { kind: 'scalar', expression }
    },
  })
  const storage = (
    value: ContainerStorageFacet<Scalar> | null,
    path = '',
  ): ArrayConstantStorage[] =>
    value?.kind === 'array'
      ? [
          {
            path,
            dimensions: value.dimensions.length,
            elements: value.elements.length,
            nullBitmap: value.nullBitmap!,
          },
          ...value.elements.flatMap((v, i) => storage(v, path + '/' + i)),
        ]
      : value?.kind === 'record' || value?.kind === 'range' || value?.kind === 'multirange'
        ? (value.kind === 'record'
            ? value.fields
            : value.kind === 'range'
              ? value.bounds
              : value.ranges
          ).flatMap((v, i) => storage(v, path + '/' + i))
        : []
  const convert = (value: ContainerStorageFacet<Scalar> | null, id: number): unknown => {
    if (value === null) return { A_Const: { isnull: true } }
    const type = base(id)
    if (!type) return undefined
    if (value.kind === 'scalar') return value.expression
    if (value.kind === 'record' && type.kind === 'c') {
      const attributes = type.attributes.filter((a) => !a.dropped)
      if (attributes.length !== value.fields.length) return undefined
      const args = value.fields.map((field, index) => convert(field, attributes[index]!.type))
      return args.every((arg) => arg !== undefined)
        ? { PgsidStoredRecordConstant: { type: type.identity, args } }
        : undefined
    }
    if (value.kind === 'range' && type.kind === 'r' && type.rangeSubtype) {
      const args = value.bounds.map((bound) => convert(bound, type.rangeSubtype!))
      return args.every((arg) => arg !== undefined)
        ? {
            PgsidStoredRangeConstant: {
              type: type.identity,
              empty: (value.flags & 1) !== 0,
              lowerInclusive: (value.flags & 2) !== 0,
              upperInclusive: (value.flags & 4) !== 0,
              args,
            },
          }
        : undefined
    }
    if (value.kind === 'multirange' && type.kind === 'm' && type.rangeType) {
      const args = value.ranges.map((range) => convert(range, type.rangeType!))
      return args.every((arg) => arg !== undefined)
        ? { PgsidStoredMultirangeConstant: { type: type.identity, args } }
        : undefined
    }
    if (value.kind !== 'array' || !type.element) return undefined
    const element = types.get(type.element),
      args = value.elements.map((v) => convert(v, type.element!))
    return element && args.every((arg) => arg !== undefined)
      ? {
          PgsidStoredArrayConstant: {
            element: element.identity,
            dimensions: value.dimensions,
            nullBitmap: value.nullBitmap,
            arrayStorage: storage(value),
            args,
          },
        }
      : undefined
  }
  return facet ? convert(facet, oid) : undefined
}
