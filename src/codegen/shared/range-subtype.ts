import type { CatalogSnapshot } from '../../catalog/types.js'
import { PG18_RANGE_TYPES } from '../../postgres/builtins/type-ranges.generated.js'

const builtinRanges = Object.values(PG18_RANGE_TYPES)

export const rangeSubtype = (
  schema: string | undefined,
  name: string,
  catalog: CatalogSnapshot | undefined,
): { kind: 'range' | 'multirange'; subtype: string } | null => {
  const qualified = (identity: string) =>
    identity.split('.').map((part) => part.replaceAll('"', ''))
  const matches = (identity: string) => {
    const [owner, item] = qualified(identity)
    return item === name && (schema === undefined ? true : owner === schema)
  }
  for (const range of [...(catalog?.rangeTypes ?? []), ...builtinRanges]) {
    // The catalog names an array subtype by its internal name (pg_catalog._int4); its element
    // makes it a list of that element. int2vector and oidvector record their element too, for
    // the evaluator, but their text is not array text and they keep their own codec.
    const node =
      'subtypeDefinitions' in range
        ? range.subtypeDefinitions?.find((item) => item.identity === range.subtype)
        : undefined
    const subtype =
      node &&
      node.kind !== 'd' &&
      node.element !== null &&
      !['pg_catalog.int2vector', 'pg_catalog.oidvector'].includes(node.identity)
        ? `${node.element}[]`
        : range.subtype
    if (matches(range.identity)) return { kind: 'range', subtype }
    if (matches(range.multirange)) return { kind: 'multirange', subtype }
  }
  return null
}
