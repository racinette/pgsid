import type { EnumDefinition, ScalarType } from './expressions.js'

export type AnonymousRecordType = `anonymous-record:${string}`
export interface AnonymousRecordField {
  type: ScalarType
  unknown?: true
  enum?: Pick<EnumDefinition, 'schema' | 'name' | 'values' | 'outputFunction' | 'jsonConversion'>
}
export interface AnonymousRecordLayout {
  identity: string
  fields: readonly AnonymousRecordField[]
}

function encodedFields(fields: readonly AnonymousRecordField[]): unknown[] {
  return fields.map((field) => {
    let base: string = field.type,
      arrays = 0
    while (base.startsWith('array:')) {
      arrays++
      base = base.slice(6)
    }
    if (!anonymousRecordProfile(base)) return field
    return { ...field, type: { record: JSON.parse(base.slice(17)) as unknown, arrays } }
  })
}

export function anonymousRecordType(fields: readonly AnonymousRecordField[]): AnonymousRecordType {
  return `anonymous-record:${JSON.stringify([encodedFields(fields)])}`
}

export function anonymousRecordProfile(type: string): readonly AnonymousRecordLayout[] | null {
  if (!type.startsWith('anonymous-record:')) return null
  try {
    const layouts = JSON.parse(type.slice(17)) as unknown
    if (!Array.isArray(layouts)) return null
    const result: AnonymousRecordLayout[] = []
    for (const layout of layouts) {
      if (!Array.isArray(layout)) return null
      const fields: AnonymousRecordField[] = []
      for (const raw of layout as AnonymousRecordField[]) {
        if (!raw || (raw.unknown !== undefined && raw.unknown !== true)) return null
        let fieldType: unknown = raw.type
        if (fieldType && typeof fieldType === 'object') {
          const nested = fieldType as { record?: unknown; arrays?: unknown }
          if (
            !Number.isInteger(nested.arrays) ||
            (nested.arrays as number) < 0 ||
            (nested.arrays as number) > 6
          )
            return null
          const child = `anonymous-record:${JSON.stringify(nested.record)}`
          if (!anonymousRecordProfile(child)) return null
          fieldType = 'array:'.repeat(nested.arrays as number) + child
        }
        if (typeof fieldType !== 'string' || !fieldType.length) return null
        const definition = raw.enum
        if (
          definition !== undefined &&
          (!definition ||
            typeof definition.schema !== 'string' ||
            typeof definition.name !== 'string' ||
            !Array.isArray(definition.values) ||
            !definition.values.every((label) => typeof label === 'string') ||
            'oid' in definition ||
            'valueOids' in definition ||
            (definition.outputFunction !== undefined &&
              typeof definition.outputFunction !== 'string') ||
            (definition.jsonConversion !== undefined &&
              !['label', 'cast'].includes(definition.jsonConversion)))
        )
          return null
        fields.push({ ...raw, type: fieldType as ScalarType })
      }
      result.push({ identity: `anonymous-record-layout:${JSON.stringify(layout)}`, fields })
    }
    return result
  } catch {
    return null
  }
}

export function commonAnonymousRecordType(types: readonly string[]): ScalarType | null {
  if (!types.length) return null
  if (types.every((type) => type.startsWith('array:'))) {
    const element = commonAnonymousRecordType(types.map((type) => type.slice(6)))
    return element ? (`array:${element}` as ScalarType) : null
  }
  const profiles = types.map(anonymousRecordProfile)
  if (profiles.some((profile) => profile === null)) return null
  const layouts = [
    ...new Set(
      profiles.flatMap((profile) => profile!.map((p) => JSON.stringify(encodedFields(p.fields)))),
    ),
  ].sort()
  return `anonymous-record:[${layouts.join(',')}]`
}

export function canRelabelAnonymousRecords(source: string, target: string): boolean {
  if (source.startsWith('array:') && target.startsWith('array:'))
    return canRelabelAnonymousRecords(source.slice(6), target.slice(6))
  const from = anonymousRecordProfile(source),
    to = anonymousRecordProfile(target)
  return (
    !!from && !!to && from.every((layout) => to.some((other) => other.identity === layout.identity))
  )
}
