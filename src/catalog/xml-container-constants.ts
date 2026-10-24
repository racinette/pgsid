import {
  containerConstant,
  storageContainerTypes,
  type ContainerStorageFacet,
  type ConstantStorageType,
} from './container-constant-storage.js'

export type XmlStorageFacet = ContainerStorageFacet<{ kind: 'xml'; text: string }>
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
  return containerConstant(bytes, oid, types, 'pg_catalog.xml', (input, header) => {
    const body = input.subarray(header),
      text = body.toString('utf8')
    return (!utf8 && body.some((b) => b > 127)) ||
      text.includes('\0') ||
      !Buffer.from(text, 'utf8').equals(body)
      ? undefined
      : { kind: 'xml', text }
  })
}
