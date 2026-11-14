import { rustIdentifier } from './ast.js'

const words = (name: string): string[] =>
  name
    .replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)

// A type or variant name: the words of the SQL name, each capitalized.
export const rustTypeName = (name: string): string => {
  let result = words(name)
    .map((word) => `${word[0]!.toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join('')
  if (!result) result = 'Unnamed'
  if (/^[0-9]/u.test(result)) result = `N${result}`
  if (result === 'Self') result = 'SelfValue'
  return result
}

// A field, module or function name: the words of the SQL name in lower case, joined by
// underscores; a keyword is written raw.
export const rustFieldName = (name: string): string => {
  let result = words(name)
    .map((word) => word.toLowerCase())
    .join('_')
  if (!result) result = 'unnamed'
  if (/^[0-9]/u.test(result)) result = `n${result}`
  if (['self', 'super', 'crate'].includes(result)) result = `${result}_value`
  rustIdentifier(result)
  return result
}

export class GeneratedRustNameCollisionError extends Error {}

export const assertUniqueRustNames = (
  values: readonly { source: string; generated: string }[],
  kind: string,
): void => {
  const names = new Map<string, string>()
  for (const value of values) {
    const previous = names.get(value.generated)
    if (previous !== undefined)
      throw new GeneratedRustNameCollisionError(
        `${kind} names ${JSON.stringify(previous)} and ${JSON.stringify(value.source)} both generate ${value.generated}`,
      )
    names.set(value.generated, value.source)
  }
}

// A name unique among others generated in one scope, numbered after the first.
export const uniqueNames = (names: readonly string[]): string[] => {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const count = seen.get(name) ?? 0
    seen.set(name, count + 1)
    return count ? `${name}${count + 1}` : name
  })
}

// The variant of each label of a PostgreSQL enum.
export const rustEnumVariants = (labels: readonly string[]): string[] => uniqueNames(labels.map(rustTypeName))
