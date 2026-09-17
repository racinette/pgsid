import type { CatalogSnapshot } from '../../catalog/types.js'
import type { ArrayDimensionsMapping } from '../../config/schema.js'
import type { DatabaseColumn, ValueLineage, WriteValueLineage } from '../../query/value-lineage.js'

export const columnKey = (column: DatabaseColumn): string =>
  `${column.schema}.${column.relation}.${column.column}`

export function arrayDimensionsMapping(value: unknown): ArrayDimensionsMapping | null {
  return typeof value === 'object' && value !== null && 'dimensions' in value
    ? (value as ArrayDimensionsMapping)
    : null
}

export function assertArrayDimensions(type: string, column: string): void {
  if (!type.endsWith('[]'))
    throw new Error(
      `Array dimensions mapping for ${column} requires a PostgreSQL array, received ${type}`,
    )
}

export function arrayColumnType(column: DatabaseColumn, catalog?: CatalogSnapshot): string | null {
  const relation = [
    ...(catalog?.tables ?? []),
    ...(catalog?.views ?? []),
    ...(catalog?.materializedViews ?? []),
  ].find((item) => item.schema === column.schema && item.name === column.relation)
  return relation?.columns.find((item) => item.name === column.column)?.typeName ?? null
}

export function resolveArrayDimensions(
  value: ValueLineage | undefined,
  mappings: Readonly<Record<string, unknown>>,
): ArrayDimensionsMapping | null {
  if (!value) return null
  if (value.kind === 'row-absence') return resolveArrayDimensions(value.origin, mappings)
  if (value.kind === 'column') {
    const mapping = arrayDimensionsMapping(mappings[columnKey(value.column)])
    if (mapping) assertArrayDimensions(value.resolvedType ?? 'unknown', columnKey(value.column))
    return mapping
  }
  if (value.kind !== 'transform') return null
  if (value.operation.kind === 'assignment') {
    const mapping = arrayDimensionsMapping(mappings[columnKey(value.operation.target)])
    if (mapping)
      assertArrayDimensions(value.resolvedType ?? 'unknown', columnKey(value.operation.target))
    return mapping ?? resolveArrayDimensions(value.inputs[0], mappings)
  }
  if (
    (value.operation.kind === 'cast' &&
      value.resolvedType?.endsWith('[]') &&
      value.inputs[0]?.resolvedType?.endsWith('[]')) ||
    (value.operation.kind === 'array-access' && value.operation.slice)
  )
    return resolveArrayDimensions(value.inputs[0], mappings)
  if (value.operation.kind !== 'choice' || !value.resolvedType?.endsWith('[]')) return null
  const inputs = value.inputs.filter((input) => !(input.kind === 'literal' && input.value === null))
  const resolved = inputs.map((input) => resolveArrayDimensions(input, mappings))
  if (!resolved.some(Boolean)) return null
  if (inputs.some((input, index) => !resolved[index] && input.kind !== 'column')) return null
  const dimensions = [...new Set(resolved.flatMap((mapping) => mapping?.dimensions ?? 1))].sort(
    (a, b) => a - b,
  )
  return { dimensions: dimensions.length === 1 ? dimensions[0]! : dimensions }
}

export function planArrayDimensionInputs(
  writes: readonly WriteValueLineage[],
  mappings: Readonly<Record<string, unknown>>,
  catalog?: CatalogSnapshot,
): ReadonlyMap<number, readonly ValueLineage[]> {
  const parameters = new Map<number, ValueLineage[]>()
  for (const write of writes) {
    if (write.partial || !arrayDimensionsMapping(mappings[columnKey(write.target)])) continue
    const type = arrayColumnType(write.target, catalog)
    assertArrayDimensions(type ?? 'unknown', columnKey(write.target))
    for (const number of directParameters(write.value)) {
      const destinations = parameters.get(number) ?? []
      if (
        !destinations.some(
          (value) => value.kind === 'column' && columnKey(value.column) === columnKey(write.target),
        )
      )
        destinations.push({ kind: 'column', column: write.target, resolvedType: type })
      parameters.set(number, destinations)
    }
  }
  return parameters
}

function directParameters(value: ValueLineage): number[] {
  if (value.kind === 'parameter') return [value.number]
  if (value.kind !== 'transform') return []
  if (
    value.operation.kind === 'assignment' ||
    (value.operation.kind === 'cast' &&
      value.resolvedType?.endsWith('[]') &&
      value.inputs[0]?.resolvedType?.endsWith('[]'))
  )
    return value.inputs[0] ? directParameters(value.inputs[0]) : []
  if (value.operation.kind === 'choice' && ['values', 'union'].includes(value.operation.form))
    return [...new Set(value.inputs.flatMap(directParameters))]
  return []
}
