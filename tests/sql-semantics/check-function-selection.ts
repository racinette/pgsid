import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'

export function selectCheckFunctions(
  available: readonly FunctionMetadata[],
  requested: string | undefined,
) {
  if (requested === undefined)
    return { functions: available, scope: { kind: 'all-functions' as const } }
  const names = requested.split(',').map((name) => name.trim())
  if (names.some((name) => !name) || new Set(names).size !== names.length)
    throw new Error('Select distinct nonempty catalog function names or Rust callable names.')
  const selected = new Set<string>()
  for (const name of names) {
    const matches = available.filter((fn) => fn.name === name || fn.rustName === name)
    if (!matches.length) throw new Error(`Function selection is outside this parity owner: ${name}`)
    for (const fn of matches) {
      if (selected.has(fn.rustName))
        throw new Error(`Function selected more than once: ${callableIdentity(fn)}`)
      selected.add(fn.rustName)
    }
  }
  const functions = available.filter((fn) => selected.has(fn.rustName))
  return {
    functions,
    scope: {
      kind: 'selected-functions' as const,
      requested: names,
      identities: functions.map(callableIdentity),
    },
  }
}
