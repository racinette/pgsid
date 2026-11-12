import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import type { Config } from '../../config/schema.js'
import { go, printGoFile, type GoExpression } from './ast.js'

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
  name: 'null.go' | 'null-pgx.go' | 'validation.go' | 'array.go' | 'temporal.go' | 'range.go' | 'json.go' | 'null-alias.go',
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
] as const
// The pgsid package's value files that generated Go names a type of, each written once.
export const goValueArtifacts = (
  directory: string,
  contents: readonly string[],
): { path: string; content: string }[] =>
  goValueFiles
    .filter((file) => contents.some((content) => file.names.test(content)))
    .map((file) => ({
      path: join(directory, file.name),
      content: printGoFile({
        package: 'pgsid',
        imports: [],
        declarations: [],
        source: runtimeSource(file.name),
      }),
    }))

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
