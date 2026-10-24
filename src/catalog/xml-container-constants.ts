import {
  containerConstant,
  storageContainerTypes,
  type ContainerStorageFacet,
  type ConstantStorageType,
} from './container-constant-storage.js'

export type XmlStorageFacet =
  | { kind: 'xml'; text: string }
  | { kind: 'record'; fields: (XmlStorageFacet | null)[] }
  | {
      kind: 'array'
      delimiter: string
      dimensions: { lower: number; length: number }[]
      elements: (XmlStorageFacet | null)[]
    }
export type XmlStorageType = ConstantStorageType

export function xmlStorageContainerTypes(types: ReadonlyMap<number, XmlStorageType>): Set<number> {
  return storageContainerTypes(types, 'pg_catalog.xml')
}

export function xmlContainerConstant(
  bytes: Buffer,
  oid: number,
  types: ReadonlyMap<number, XmlStorageType>,
  utf8: boolean,
): XmlStorageFacet | undefined {
  const facet = containerConstant(bytes, oid, types, 'pg_catalog.xml', (input, header) => {
    const body = input.subarray(header),
      text = body.toString('utf8')
    return (!utf8 && body.some((b) => b > 127)) ||
      text.includes('\0') ||
      !Buffer.from(text, 'utf8').equals(body)
      ? undefined
      : { kind: 'xml' as const, text }
  })
  const supported = (
    value: ContainerStorageFacet<{ kind: 'xml'; text: string }> | null,
  ): value is XmlStorageFacet | null => {
    if (!value || value.kind === 'xml') return true
    if (value.kind === 'range' || value.kind === 'multirange') return false
    return (value.kind === 'array' ? value.elements : value.fields).every(supported)
  }
  return facet && supported(facet) ? facet : undefined
}
