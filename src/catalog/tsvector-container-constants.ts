import {
  containerConstant,
  type ConstantStorageType,
  type ContainerStorageFacet,
} from './container-constant-storage.js'
import {
  tsvectorConstantStorage,
  type TsvectorConstantStorage,
} from './tsvector-constant-storage.js'

export function tsvectorContainerConstant(
  bytes: Buffer,
  oid: number,
  types: ReadonlyMap<number, ConstantStorageType>,
): TsvectorConstantStorage[] | undefined {
  const facet = containerConstant(bytes, oid, types, 'pg_catalog.tsvector', (input) => {
    const storage = tsvectorConstantStorage(input)
    return storage ? { kind: 'tsvector' as const, storage } : undefined
  })
  if (!facet) return undefined
  const entries: TsvectorConstantStorage[] = []
  const visit = (
    node: ContainerStorageFacet<{ kind: 'tsvector'; storage: TsvectorConstantStorage }> | null,
  ): void => {
    if (!node) return
    if (node.kind === 'tsvector') entries.push(node.storage)
    else if (node.kind === 'array') node.elements.forEach(visit)
    else node.fields.forEach(visit)
  }
  visit(facet)
  return entries
}
