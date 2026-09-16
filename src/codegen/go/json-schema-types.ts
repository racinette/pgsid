import type { JsonSchemaDocument } from '../../config/schema.js'
import { go, type GoExpression } from './ast.js'
import { goTypeFromJsonSchema, type GoJsonSchemaOptions } from './json-schema.js'
import { goName, assertUniqueGoNames } from './names.js'
import type { GoNulls } from './nulls.js'

export interface GoJsonSchemaTypeDeclaration {
  name: string
  source: string
  type: GoExpression
}

export function createGoJsonSchemaTypes(
  document: JsonSchemaDocument,
  rootName: string,
  nulls: GoNulls = 'pointers',
) {
  const plain = goTypeFromJsonSchema(document, { document, rootName, nulls })
  const rootObjectName =
    plain.kind === 'struct' || plain.kind === 'map' ? rootName : `${rootName}Value`
  const objects = new Map<JsonSchemaDocument, GoJsonSchemaTypeDeclaration & { building: boolean }>()
  const resolving = new Set<JsonSchemaDocument>()
  const options: GoJsonSchemaOptions = {
    document,
    rootName,
    nulls,
    objectType(schema, path, build) {
      const existing = objects.get(schema)
      if (existing)
        return existing.building ? go.pointer(go.ident(existing.name)) : go.ident(existing.name)
      const suffix = locationName(path)
      const entry = {
        name: suffix ? `${rootName}${suffix}` : rootObjectName,
        source: `${rootName}#/${path.map((part) => part.replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`,
        type: go.any(),
        building: true,
      }
      objects.set(schema, entry)
      entry.type = build()
      entry.building = false
      return go.ident(entry.name)
    },
    referenceType(schema) {
      const existing = objects.get(schema)
      if (existing) return go.pointer(go.ident(existing.name))
      if (resolving.has(schema)) return go.any()
      resolving.add(schema)
      const type = goTypeFromJsonSchema(schema, options)
      resolving.delete(schema)
      return type
    },
  }
  const compiled = goTypeFromJsonSchema(document, options)
  const root = [...objects.values()].find((entry) => entry.name === rootName)
  const declarations: GoJsonSchemaTypeDeclaration[] = [
    {
      name: rootName,
      source: `${rootName}#`,
      type: root && compiled.kind === 'ident' && compiled.name === rootName ? root.type : compiled,
    },
    ...[...objects.values()]
      .filter((entry) => entry !== root)
      .map(({ name, source, type }) => ({ name, source, type })),
  ]
  assertUniqueGoNames(
    declarations.map((entry) => ({ source: entry.source, generated: entry.name })),
    'JSON Schema type',
  )
  return {
    declarations,
    resolve(schema: JsonSchemaDocument, reference: (name: string) => GoExpression) {
      return goTypeFromJsonSchema(schema, {
        document,
        nulls,
        rootName,
        rootType: () => reference(rootName),
        objectType(value, _path, build) {
          const entry = objects.get(value)
          return entry ? reference(entry.name) : build()
        },
        referenceType(value) {
          const entry = objects.get(value)
          return entry ? go.pointer(reference(entry.name)) : undefined
        },
      })
    },
  }
}

const locationName = (path: readonly string[]): string => {
  const names: string[] = []
  for (let index = 0; index < path.length; index++) {
    const part = path[index]!
    if (part === 'properties' || part === '$defs' || part === 'definitions') {
      names.push(goName(path[++index]!))
    } else if (part === 'items') names.push('Item')
    else if (part === 'additionalProperties' || part === 'unevaluatedProperties')
      names.push('Value')
    else if (part === 'alternatives' || part === 'allOf') index++
    else names.push(goName(part))
  }
  return names.join('')
}
