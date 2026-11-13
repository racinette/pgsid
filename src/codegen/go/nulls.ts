import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import type { Config } from '../../config/schema.js'
import { go, printGoFile, type GoDeclaration, type GoExpression } from './ast.js'

export type GoNulls = 'pointers' | 'structs'
export const goJsonNulls = (config: Config): GoNulls =>
  config.sql.codegen?.go?.jsonSchemas.nulls ?? config.sql.codegen?.go?.nulls ?? 'pointers'
export const usesGoNullStructs = (config: Config): boolean =>
  config.sql.codegen?.go?.nulls === 'structs' || goJsonNulls(config) === 'structs'
export const goNullsOutDir = (schemaOutDir: string): string => join(dirname(schemaOutDir), 'pgsid')
export const goNullsImportPath = (schemaImportPath: string): string =>
  posix.join(posix.dirname(schemaImportPath.replace(/\/$/u, '')), 'pgsid')
export const nullStruct = (
  kind: 'Null' | 'Undefined' | 'NullOrUndefined',
  type: GoExpression,
): GoExpression => go.index(go.selector(go.ident('pgsid'), kind), type)
export const runtimeSource = (
  name: 'null.go' | 'null-pgx.go' | 'validation.go' | 'array.go' | 'temporal.go' | 'range.go' | 'json.go' | 'null-alias.go' | 'dimensions.go',
): string => {
  const source = new URL(`./assets/${name}`, import.meta.url)
  return readFileSync(existsSync(source) ? source : new URL(`./${name}`, import.meta.url), 'utf8')
}
// The null wrappers' own package, beneath the pgsid package, which names the same types.
export const goNullWrappersImportPath = (nullsImportPath: string): string => `${nullsImportPath}/null`
export const goNullArtifacts = (
  directory: string,
  nullsImportPath: string,
): { path: string; content: string }[] => [
  {
    path: join(directory, 'null', 'null.go'),
    content: printGoFile({
      package: 'null',
      imports: [],
      declarations: [],
      source: runtimeSource('null.go'),
    }),
  },
  {
    path: join(directory, 'null.go'),
    content: printGoFile({
      package: 'pgsid',
      imports: [{ path: goNullWrappersImportPath(nullsImportPath), alias: 'pgsidnull' }],
      declarations: [],
      source: runtimeSource('null-alias.go'),
    }),
  },
]
const goValueFiles = [
  { name: 'temporal.go', names: /\bpgsid\.(?:Timestamptz|Timestamp|Date|Interval)\b/u },
  { name: 'range.go', names: /\bpgsid\.(?:Range|Multirange|Bound)\b/u },
  { name: 'json.go', names: /\bpgsid\.JSON\b/u },
  { name: 'dimensions.go', names: /\bpgsid\.(?:D[1-6]|Array\d(?:Or\d)*)\b/u },
] as const
// The pgsid package's value files that generated Go names a type of, each written once, and a
// file of its own for each set of array dimension counts named, so that renders naming different
// sets never write one file differently.
export const goValueArtifacts = (
  directory: string,
  contents: readonly string[],
): { path: string; content: string }[] => [
  ...goValueFiles
    .filter((file) => contents.some((content) => file.names.test(content)))
    .map((file) => ({
      path: join(directory, file.name),
      content: printGoFile({
        package: 'pgsid',
        imports: [],
        declarations: [],
        source: runtimeSource(file.name),
      }),
    })),
  ...[
    ...new Set(
      contents.flatMap((content) =>
        [...content.matchAll(/\bpgsid\.(Array\d(?:Or\d)*)\[/gu)].map((match) => match[1]!),
      ),
    ),
  ]
    .sort()
    .map((name) => ({
      path: join(directory, `${name.toLowerCase()}.go`),
      content: printGoFile({ package: 'pgsid', imports: [], declarations: goArrayUnionDeclarations(name) }),
    })),
]

// An array of one of several dimension counts: a sealed interface over its element type that the
// array of each count implements. Its method takes the element type, so that an array of other
// elements is not one.
const goArrayUnionDeclarations = (name: string): GoDeclaration[] => {
  const element = go.ident('T')
  const typeParams = [{ names: ['T'], type: go.any() }]
  const method = `${name[0]!.toLowerCase()}${name.slice(1)}`
  return [
    go.type(
      name,
      go.interface([{ names: [method], type: go.functionType([{ type: element }], []) }]),
      typeParams,
    ),
    ...name
      .slice('Array'.length)
      .split('Or')
      .map((count) =>
        go.function(method, [{ type: element }], [], [], [
          { type: go.index(go.ident(`D${count}`), element) },
        ]),
      ),
  ]
}

export const hasNullStruct = (type: GoExpression): boolean => {
  if (
    type.kind === 'index' &&
    type.left.kind === 'selector' &&
    type.left.left.kind === 'ident' &&
    type.left.left.name === 'pgsid'
  )
    return true
  return Object.values(type).some((value: unknown) => {
    if (Array.isArray(value))
      return value.some(
        (item: unknown) =>
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          hasNullStruct((item as { type: GoExpression }).type),
      )
    return (
      typeof value === 'object' &&
      value !== null &&
      'kind' in value &&
      hasNullStruct(value as GoExpression)
    )
  })
}
