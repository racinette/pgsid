import type { GoTypeImport } from '../../config/schema.js'
import type { GoImport } from './ast.js'

export const normalizeGoImports = (imports: readonly GoTypeImport[]): GoImport[] => {
  const aliases = new Map<string, string | undefined>()
  for (const item of imports) {
    const previous = aliases.get(item.path)
    if (aliases.has(item.path) && previous !== item.as) {
      throw new Error(
        `Go import ${JSON.stringify(item.path)} is configured with conflicting aliases`,
      )
    }
    aliases.set(item.path, item.as)
  }
  const names = new Map<string, string>()
  for (const [path, configured] of aliases) {
    const alias = configured ?? path.split('/').at(-1)!
    if (alias === '_' || alias === '.') continue
    const previous = names.get(alias)
    if (previous && previous !== path)
      throw new Error(
        `Go imports ${JSON.stringify(previous)} and ${JSON.stringify(path)} share alias ${JSON.stringify(alias)}`,
      )
    names.set(alias, path)
  }
  return [...aliases]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([path, alias]) => ({ path, ...(alias ? { alias } : {}) }))
}
