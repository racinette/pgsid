import {
  containerConstant,
  storageContainerTypes,
  type ConstantStorageType,
  type ContainerStorageFacet,
} from './container-constant-storage.js'
import { tsqueryConstantStorage, type TsqueryConstantStorage } from './tsquery-constant-storage.js'

function queryLeaf(
  input: Buffer,
  header: number,
  utf8: boolean,
): TsqueryConstantStorage | undefined {
  if (header === 4) return tsqueryConstantStorage(input, utf8)
  const values: TsqueryConstantStorage[] = []
  for (const little of [true, false]) {
    const data = Buffer.concat([Buffer.alloc(4), input.subarray(1)])
    if (little) data.writeUInt32LE(data.length * 4)
    else data.writeUInt32BE(data.length)
    const value = tsqueryConstantStorage(data, utf8)
    if (value) values.push(value)
  }
  return values.length && values.every((v) => JSON.stringify(v) === JSON.stringify(values[0]))
    ? values[0]
    : undefined
}

export function tsqueryContainerTypes(
  types: ReadonlyMap<number, ConstantStorageType>,
  scalars: ReadonlySet<number>,
): Set<number> {
  const result = storageContainerTypes(types, 'pg_catalog.tsquery', true)
  for (const oid of scalars) result.delete(oid)
  return result
}

export function tsqueryContainerConstant(
  bytes: Buffer,
  oid: number,
  types: ReadonlyMap<number, ConstantStorageType>,
  utf8: boolean,
): TsqueryConstantStorage[] | undefined {
  const facet = containerConstant(
    bytes,
    oid,
    types,
    'pg_catalog.tsquery',
    (input, header) => {
      const storage = queryLeaf(input, header, utf8)
      return storage ? { kind: 'tsquery' as const, storage } : undefined
    },
    { ranges: true },
  )
  if (!facet) return undefined
  const entries: TsqueryConstantStorage[] = []
  const visit = (
    node: ContainerStorageFacet<{ kind: 'tsquery'; storage: TsqueryConstantStorage }> | null,
  ): void => {
    if (!node) return
    if (node.kind === 'tsquery') entries.push(node.storage)
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
