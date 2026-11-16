const typeKeys = new Set(['type', 'targetType', 'payload', 'returnType', 'typeArguments'])

// Every node of a transpiler AST with a `kind`. Types reuse kinds such as `path` that expressions
// use too, so each node says whether it is part of a type.
export function* astNodes(value, type = false) {
  if (Array.isArray(value)) {
    for (const element of value) yield* astNodes(element, type)
    return
  }
  if (value === null || typeof value !== 'object') return
  if (typeof value.kind === 'string') yield { node: value, type }
  for (const [key, child] of Object.entries(value))
    yield* astNodes(child, type || typeKeys.has(key))
}

// One file read as a module of its own, with source positions. When the transpiler accepts the
// file alone, the result also carries the types validation inferred; otherwise only the syntax,
// and the rejection.
export function readModule(parse, name, path, source) {
  const graph = {
    schemaVersion: 1,
    locations: true,
    inferredTypes: true,
    modules: [{ name, dependencies: [], files: [{ path, source }] }],
  }
  const validated = parse(graph)
  if (validated.document) return validated.document
  const syntax = parse({ ...graph, validate: false, inferredTypes: false })
  return syntax.document ? { ...syntax.document, rejection: validated.error } : syntax
}
