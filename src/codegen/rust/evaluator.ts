import { join } from 'node:path'
import { checkRustAsset } from '../shared/check-rust-assets.js'
import type { CheckRustSource } from '../shared/check-rust-source.js'

// The CHECK evaluator's Rust source, carried by generated Rust as modules of its own, pruned to
// the items the generated code reaches. The evaluator's modules hold only top-level functions,
// constants, structs and enums, each module seeing the modules it depends on whole, so an item is
// kept when a kept item of its module, or of a module depending on it, names it.

export interface RustSourceItem {
  name: string | null
  text: string
  names: ReadonlySet<string>
}

export interface RustSourceModule {
  name: string
  dependencies: readonly string[]
  items: readonly RustSourceItem[]
}

const identifier = /[A-Za-z_][A-Za-z0-9_]*/uy

/**
 * The top-level items of Rust source, each with the comments and attributes before it, the name
 * it declares and every identifier it holds outside literals and comments. An item without a
 * name, such as a use declaration, is kept with any module that keeps an item.
 */
export function splitRustItems(source: string): RustSourceItem[] {
  const items: RustSourceItem[] = []
  let start = 0
  let depth = 0
  let tokens: string[] = []
  let names = new Set<string>()
  // Names the item binds, as a local, a parameter or a field, and names it calls: a name only
  // bound refers to nothing outside the item.
  let bound = new Set<string>()
  let called = new Set<string>()
  let previous = ''
  let index = 0
  const finish = (end: number) => {
    const text = source.slice(start, end).trim()
    if (text) {
      const keyword = tokens.findIndex((token) =>
        ['fn', 'struct', 'enum', 'const', 'static', 'type', 'trait', 'union', 'mod'].includes(
          token,
        ),
      )
      const name = keyword >= 0 ? (tokens[keyword + 1] ?? null) : null
      for (const item of bound) if (!called.has(item) && item !== name) names.delete(item)
      items.push({ name, text, names })
    }
    start = end
    tokens = []
    names = new Set()
    bound = new Set()
    called = new Set()
    previous = ''
  }
  while (index < source.length) {
    const char = source[index]!
    const next = source[index + 1]
    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index)
      index = end < 0 ? source.length : end + 1
      continue
    }
    if (char === '/' && next === '*') {
      let level = 1
      index += 2
      while (index < source.length && level > 0) {
        if (source.startsWith('/*', index)) (level++, (index += 2))
        else if (source.startsWith('*/', index)) (level--, (index += 2))
        else index++
      }
      continue
    }
    const raw = /^b?r(#*)"/u.exec(source.slice(index, index + 260))
    if (raw && (index === 0 || !/[A-Za-z0-9_]/u.test(source[index - 1]!))) {
      const close = `"${raw[1]}`
      const end = source.indexOf(close, index + raw[0].length)
      index = end + close.length
      continue
    }
    if (
      char === '"' ||
      (char === 'b' && next === '"' && !/[A-Za-z0-9_]/u.test(source[index - 1] ?? ''))
    ) {
      index += char === 'b' ? 2 : 1
      while (source[index] !== '"') index += source[index] === '\\' ? 2 : 1
      index++
      continue
    }
    if (char === "'") {
      // A character literal, or a lifetime, which is an identifier after the quote.
      const literal = /^'(?:\\(?:u\{[0-9A-Fa-f]+\}|x[0-9A-Fa-f]{2}|.)|[^\\'])'/u.exec(
        source.slice(index, index + 12),
      )
      index += literal ? literal[0].length : 1
      continue
    }
    if (char === '{' || char === '(' || char === '[') depth++
    else if (char === '}' || char === ')' || char === ']') {
      depth--
      if (depth === 0 && char === '}') {
        index++
        // A struct or enum body ends the item; so does a function's, unless a semicolon follows.
        const rest = /^\s*;/u.exec(source.slice(index))
        if (rest) index += rest[0].length
        finish(index)
        continue
      }
    } else if (char === ';' && depth === 0) {
      index++
      finish(index)
      continue
    }
    identifier.lastIndex = index
    const word = identifier.exec(source)
    if (word && (index === 0 || !/[A-Za-z0-9_]/u.test(source[index - 1]!))) {
      if (depth === 0) tokens.push(word[0])
      names.add(word[0])
      index += word[0].length
      // A path, a call or a struct after `let` is a pattern naming an outside item.
      const after = /^\s*(::|:|\(|\{)?/u.exec(source.slice(index, index + 64))![1]
      if (after === '(') called.add(word[0])
      if (
        after === ':' ||
        (after === undefined && ['let', 'for', 'mut'].includes(previous) && word[0] !== 'self')
      )
        bound.add(word[0])
      previous = word[0]
      continue
    }
    if (!/\s/u.test(char)) previous = char
    index++
  }
  finish(source.length)
  return items
}

let maintained: RustSourceModule[] | undefined

// The evaluator's maintained modules, each file split once per process.
export function rustEvaluatorModules(): readonly RustSourceModule[] {
  maintained ??= (
    JSON.parse(checkRustAsset('check-rust-sources.json').toString('utf8')) as CheckRustSource
  ).modules.map((module) => ({
    name: module.name,
    dependencies: module.dependencies,
    items: module.files.flatMap((file) => splitRustItems(file.source)),
  }))
  return maintained
}

/**
 * The evaluator's modules holding what `roots`, given as `module::name`, reach, with `extra`
 * modules, such as the checks, alongside the maintained ones. Modules left empty are left out.
 */
export function pruneRustEvaluator(
  roots: readonly string[],
  extra: readonly RustSourceModule[] = [],
): { name: string; source: string }[] {
  const modules = [...rustEvaluatorModules(), ...extra]
  const byName = new Map(modules.map((module) => [module.name, module]))
  const dependents = new Map<string, string[]>()
  for (const module of modules)
    for (const dependency of module.dependencies)
      dependents.set(dependency, [...(dependents.get(dependency) ?? []), module.name])
  const declared = new Map<string, Map<string, number[]>>()
  for (const module of modules) {
    const names = new Map<string, number[]>()
    module.items.forEach((item, index) => {
      if (item.name) names.set(item.name, [...(names.get(item.name) ?? []), index])
    })
    declared.set(module.name, names)
  }
  const kept = new Map(modules.map((module) => [module.name, new Set<number>()]))
  const queue: [string, number][] = []
  const mark = (module: string, name: string) => {
    for (const index of declared.get(module)?.get(name) ?? [])
      if (!kept.get(module)!.has(index)) {
        kept.get(module)!.add(index)
        queue.push([module, index])
      }
  }
  for (const root of roots) {
    const [module, name] = root.split('::') as [string, string]
    if (!declared.get(module)?.has(name)) throw new Error(`The CHECK evaluator has no ${root}`)
    mark(module, name)
  }
  while (queue.length) {
    const [module, index] = queue.shift()!
    const source = byName.get(module)!
    for (const name of source.items[index]!.names) {
      mark(module, name)
      for (const dependency of source.dependencies) mark(dependency, name)
    }
  }
  return modules.flatMap((module) => {
    const items = module.items.filter((_, index) => kept.get(module.name)!.has(index))
    if (!items.length) return []
    const uses = module.dependencies
      .filter((dependency) =>
        byName.get(dependency)!.items.some((_, index) => kept.get(dependency)!.has(index)),
      )
      .map((dependency) => `use super::${dependency}::*;\n`)
      .join('')
    const unnamed = module.items.filter((item) => !item.name)
    return [
      {
        name: module.name,
        source: `${uses}${[...new Set([...unnamed, ...items])].map((item) => item.text).join('\n\n')}\n`,
      },
    ]
  })
}

/** The evaluator module tree under `directory`, with a root declaring each module kept. */
export function rustEvaluatorArtifacts(
  directory: string,
  roots: readonly string[],
  extra: readonly RustSourceModule[] = [],
): { path: string; content: string }[] {
  const modules = pruneRustEvaluator(roots, extra)
  return [
    {
      path: join(directory, 'mod.rs'),
      content: `//! The CHECK evaluator, pruned to what the generated code calls.\n\n${modules
        .map((module) => `pub mod ${module.name};\n`)
        .join('')}`,
    },
    ...modules.map((module) => ({
      path: join(directory, `${module.name}.rs`),
      content: module.source,
    })),
  ]
}
