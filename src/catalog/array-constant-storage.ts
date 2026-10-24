import {
  containerConstant,
  storageContainerTypes,
  type ConstantStorageType,
  type ContainerStorageFacet,
} from './container-constant-storage.js'

export interface ArrayConstantStorage {
  path: string
  dimensions: number
  elements: number
  nullBitmap: boolean
}

export function arrayStorageContainerTypes(
  types: ReadonlyMap<number, ConstantStorageType>,
): Set<number> {
  return storageContainerTypes(
    types,
    new Set([...types.values()].filter((t) => t.element !== null).map((t) => t.oid)),
  )
}

export function arrayConstantStorage(
  bytes: Buffer,
  oid: number,
  types: ReadonlyMap<number, ConstantStorageType>,
  roots: ReadonlySet<number>,
): ArrayConstantStorage[] | undefined {
  const facet = containerConstant<never>(bytes, oid, types, '', () => undefined, {
    containers: roots,
    arrayStorage: true,
  })
  if (!facet) return undefined
  const entries: ArrayConstantStorage[] = []
  const visit = (node: ContainerStorageFacet<never> | null, path: string): void => {
    if (!node) return
    if (node.kind === 'array') {
      entries.push({
        path,
        dimensions: node.dimensions.length,
        elements: node.elements.length,
        nullBitmap: node.nullBitmap!,
      })
      node.elements.forEach((value, index) => visit(value, path + '/' + index))
    } else node.fields.forEach((value, index) => visit(value, path + '/' + index))
  }
  visit(facet, '')
  return entries
}
