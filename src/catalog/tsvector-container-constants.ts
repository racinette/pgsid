import {
  containerConstant,
  storageContainerTypes,
  type ConstantStorageType,
  type ContainerStorageFacet,
} from './container-constant-storage.js'
import {
  tsvectorConstantStorage,
  type TsvectorConstantStorage,
} from './tsvector-constant-storage.js'

export function tsvectorConstantTypes(types: ReadonlyMap<number, ConstantStorageType>): {
  scalars: Set<number>
  containers: Set<number>
} {
  const isScalar = (oid: number, seen = new Set<number>()): boolean => {
    if (seen.has(oid)) return false
    seen.add(oid)
    const type = types.get(oid)
    return (
      type?.identity === 'pg_catalog.tsvector' || (type?.kind === 'd' && isScalar(type.base, seen))
    )
  }
  const scalars = new Set([...types.keys()].filter((oid) => isScalar(oid))),
    containers = storageContainerTypes(types, 'pg_catalog.tsvector', true)
  for (const oid of scalars) containers.delete(oid)
  return { scalars, containers }
}

export function tsvectorContainerConstant(
  bytes: Buffer,
  oid: number,
  types: ReadonlyMap<number, ConstantStorageType>,
): TsvectorConstantStorage[] | undefined {
  const facet = containerConstant(
    bytes,
    oid,
    types,
    'pg_catalog.tsvector',
    (input) => {
      const storage = tsvectorConstantStorage(input)
      return storage ? { kind: 'tsvector' as const, storage } : undefined
    },
    { ranges: true },
  )
  if (!facet) return undefined
  const entries: TsvectorConstantStorage[] = []
  const visit = (
    node: ContainerStorageFacet<{ kind: 'tsvector'; storage: TsvectorConstantStorage }> | null,
  ): void => {
    if (!node) return
    if (node.kind === 'tsvector') entries.push(node.storage)
    else if (node.kind === 'array') node.elements.forEach(visit)
    else
      (node.kind === 'record'
        ? node.fields
        : node.kind === 'range'
          ? node.bounds
          : node.ranges
      ).forEach(visit)
  }
  visit(facet)
  return entries
}
