import { dirname, join, posix } from 'node:path'
import type { Config, JsonSchemaDocument } from '../../config/schema.js'
import { normalizeQueryName } from '../../query-file.js'
import { go, printGoFile, type GoDeclaration, type GoExpression } from './ast.js'
import { createGoJsonSchemaTypes } from './json-schema-types.js'
import { hasNullStruct, type GoNulls } from './nulls.js'
import { assertUniqueGoNames, goName, goSchemaDirectory } from './names.js'

export const goJsonSchemasOutDir = (schemaOutDir: string): string =>
  join(dirname(schemaOutDir), 'jsonschemas')

export const goJsonSchemasImportPath = (schemaImportPath: string): string =>
  posix.join(posix.dirname(schemaImportPath.replace(/\/$/u, '')), 'jsonschemas')

export const referencedGoJsonSchemas = (config: Config): string[] =>
  [
    ...new Set(
      Object.values(config.sql.codegen?.go?.mappings.column ?? {}).flatMap((mapping) =>
        typeof mapping === 'object' && 'jsonSchema' in mapping ? [mapping.jsonSchema] : [],
      ),
    ),
  ].sort()

export function renderGoJsonSchemaArtifacts(
  names: readonly string[],
  schemas: Readonly<Record<string, JsonSchemaDocument>>,
  outDir: string,
  options: { nulls?: GoNulls; nullsImportPath?: string } = {},
): { path: string; content: string }[] {
  const definitions = names.map((name) => ({
    name,
    typeName: goName(name),
    filename: `${goSchemaDirectory(normalizeQueryName(name) || name)}.go`,
  }))
  assertUniqueGoNames(
    definitions.map((item) => ({ source: item.name, generated: item.typeName })),
    'JSON Schema type',
  )
  assertUniqueGoNames(
    definitions.map((item) => ({ source: item.name, generated: item.filename })),
    'JSON Schema filename',
  )
  const compiled = definitions.map((definition) => ({
    ...definition,
    types: createGoJsonSchemaTypes(schemas[definition.name]!, definition.typeName, options.nulls),
  }))
  assertUniqueGoNames(
    compiled.flatMap((definition) =>
      definition.types.declarations.map((type) => ({ source: type.source, generated: type.name })),
    ),
    'JSON Schema type',
  )
  return compiled.map(({ types, filename }) => {
    const hasNulls = types.declarations.some((type) => hasNullStruct(type.type))
    if (hasNulls && !options.nullsImportPath)
      throw new Error('Go JSON null structs require an import path')
    const imports = hasNulls ? [{ path: options.nullsImportPath!, alias: 'pgsid' }] : []
    const declarations: GoDeclaration[] = []
    let needsJson = false
    for (const { name, type } of types.declarations) {
      declarations.push(go.type(name, type))
      if (options.nulls === 'structs') {
        const methods = jsonMethods(name, type)
        declarations.push(...methods)
        if (type.kind !== 'index' && methods.length) needsJson = true
      }
    }
    if (needsJson) imports.push({ path: 'encoding/json', alias: 'json' })
    return {
      path: join(outDir, filename),
      content: printGoFile({ package: 'jsonschemas', imports, declarations }),
    }
  })
}

const jsonMethods = (name: string, type: GoExpression): GoDeclaration[] => {
  const data = { names: ['data'], type: go.slice(go.ident('byte')) }
  const error = { type: go.ident('error') }
  const receiver = [{ names: ['value'], type: go.pointer(go.ident(name)) }]
  if (type.kind === 'index') {
    return [
      go.function(
        'MarshalJSON',
        [],
        [{ type: go.slice(go.ident('byte')) }, error],
        [go.return(go.call(go.selector(go.call(type, [go.ident('value')]), 'MarshalJSON')))],
        [{ names: ['value'], type: go.ident(name) }],
      ),
      go.function(
        'UnmarshalJSON',
        [data],
        [error],
        [
          go.return(
            go.call(go.selector(go.call(go.pointer(type), [go.ident('value')]), 'UnmarshalJSON'), [
              go.ident('data'),
            ]),
          ),
        ],
        receiver,
      ),
    ]
  }
  if (type.kind === 'ident' && type.name === 'any') return []
  if (type.kind === 'struct')
    assertUniqueGoNames(
      [
        ...type.fields.map((field) => ({ source: field.names![0]!, generated: field.names![0]! })),
        { source: 'generated JSON decoder', generated: 'UnmarshalJSON' },
      ],
      'JSON Schema member',
    )
  return [
    go.function(
      'UnmarshalJSON',
      [data],
      [error],
      [
        go.localType('decoded', go.ident(name)),
        go.variable('next', go.ident('decoded')),
        go.assign(
          [go.ident('err')],
          [
            go.call(go.selector(go.ident('json'), 'Unmarshal'), [
              go.ident('data'),
              go.address(go.ident('next')),
            ]),
          ],
        ),
        go.if(go.notEqual(go.ident('err'), go.ident('nil')), [go.return(go.ident('err'))]),
        go.assign(
          [go.dereference(go.ident('value'))],
          [go.call(go.ident(name), [go.ident('next')])],
          '=',
        ),
        go.return(go.ident('nil')),
      ],
      receiver,
    ),
  ]
}
