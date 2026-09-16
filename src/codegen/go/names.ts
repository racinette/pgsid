const goKeywords = new Set([
  'break',
  'case',
  'chan',
  'const',
  'continue',
  'default',
  'defer',
  'else',
  'fallthrough',
  'for',
  'func',
  'go',
  'goto',
  'if',
  'import',
  'interface',
  'map',
  'package',
  'range',
  'return',
  'select',
  'struct',
  'switch',
  'type',
  'var',
])

export const goName = (name: string): string => {
  const words = name.split(/[^A-Za-z0-9]+/u).filter(Boolean)
  let result = words.map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`).join('')
  if (!result) result = 'Unnamed'
  if (/^[0-9]/u.test(result)) result = `N${result}`
  if (goKeywords.has(result.toLowerCase())) result = `${result}Value`
  return result
}

export const goPackageName = (name: string): string => {
  const words = name
    .toLowerCase()
    .split(/[^a-z0-9_]+/u)
    .filter(Boolean)
  let result = words.join('_') || 'db'
  if (/^[0-9]/u.test(result)) result = `schema_${result}`
  if (goKeywords.has(result)) result = `${result}_pkg`
  return result
}

export const assertUniqueGoNames = (
  values: readonly { source: string; generated: string }[],
  kind: string,
): void => {
  const names = new Map<string, string>()
  for (const value of values) {
    const previous = names.get(value.generated)
    if (previous !== undefined) {
      throw new GeneratedGoNameCollisionError(
        `${kind} names ${JSON.stringify(previous)} and ${JSON.stringify(value.source)} both generate ${value.generated}`,
      )
    }
    names.set(value.generated, value.source)
  }
}

export class GeneratedGoNameCollisionError extends Error {}

export const isPortableGoSchemaDirectory = (name: string): boolean =>
  /^[a-z0-9][a-z0-9._-]*$/u.test(name) &&
  !name.endsWith('.') &&
  !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/u.test(name)

export const goSchemaDirectory = (
  schema: string,
  overrides: Readonly<Record<string, string>> = {},
): string =>
  Object.hasOwn(overrides, schema)
    ? overrides[schema]!
    : isPortableGoSchemaDirectory(schema)
      ? schema
      : `schema_${Buffer.from(schema, 'utf8').toString('hex')}`

export const assertUniqueGoSchemaDirectories = (
  schemas: readonly string[],
  overrides: Readonly<Record<string, string>> = {},
): void => {
  const directories = new Map<string, string>()
  for (const schema of schemas) {
    const directory = goSchemaDirectory(schema, overrides)
    const previous = directories.get(directory)
    if (previous !== undefined && previous !== schema) {
      throw new GeneratedGoNameCollisionError(
        `Database schemas ${JSON.stringify(previous)} and ${JSON.stringify(schema)} both generate Go directory ${JSON.stringify(directory)}; set distinct sql.codegen.go.schema.names overrides`,
      )
    }
    directories.set(directory, schema)
  }
}
