import type { ValueLineage, WriteValueLineage } from '../../query/value-lineage.js'
import type { JsonSchemaBindings } from './json-schema-lineage.js'

export interface JsonSchemaInputPlan {
  parameters: ReadonlyMap<number, readonly ValueLineage[]>
  unsupported: readonly { column: string; parameters: readonly number[] }[]
}

export function planJsonSchemaInputs(
  writes: readonly WriteValueLineage[],
  bindings: JsonSchemaBindings,
): JsonSchemaInputPlan {
  const parameters = new Map<number, ValueLineage[]>()
  const unsupported: { column: string; parameters: number[] }[] = []
  const seen = new Set<string>()
  for (const write of writes) {
    const column = `${write.target.schema}.${write.target.relation}.${write.target.column}`
    if (!bindings.columns[column]) continue
    const allParameters = parameterNumbers(write.value)
    if (!allParameters.length) continue
    const direct = write.partial ? null : directParameters(write.value)
    if (direct === null) {
      const key = JSON.stringify([column, allParameters])
      if (!seen.has(key)) unsupported.push({ column, parameters: allParameters })
      seen.add(key)
      continue
    }
    for (const number of direct) {
      const key = JSON.stringify([column, number])
      if (seen.has(key)) continue
      seen.add(key)
      const values = parameters.get(number) ?? []
      values.push({ kind: 'column', column: write.target, resolvedType: 'jsonb' })
      parameters.set(number, values)
    }
  }
  return { parameters, unsupported }
}

const parameterNumbers = (value: ValueLineage): number[] => {
  if (value.kind === 'parameter') return [value.number]
  if (value.kind === 'row-absence') return parameterNumbers(value.origin)
  if (value.kind !== 'transform') return []
  return [...new Set(value.inputs.flatMap(parameterNumbers))].sort((a, b) => a - b)
}

const directParameters = (value: ValueLineage): number[] | null => {
  if (value.kind === 'parameter') return [value.number]
  if (value.kind === 'literal' || value.kind === 'column') return []
  if (value.kind !== 'transform') return null
  if (value.operation.kind === 'assignment') return directParameters(value.inputs[0]!)
  if (
    value.operation.kind === 'cast' &&
    ['json', 'jsonb'].includes(value.resolvedType ?? '') &&
    ['json', 'jsonb'].includes(value.inputs[0]?.resolvedType ?? '')
  )
    return directParameters(value.inputs[0]!)
  if (value.operation.kind === 'choice' && ['values', 'union'].includes(value.operation.form)) {
    const inputs = value.inputs.map(directParameters)
    return inputs.some((input) => input === null) ? null : [...new Set(inputs.flat() as number[])]
  }
  return parameterNumbers(value).length ? null : []
}
