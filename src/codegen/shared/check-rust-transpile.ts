import { parseRust } from '../../../tools/check-transpiler/typescript/rust-wasm.js'
import { transpileGo } from '../../../tools/check-transpiler/typescript/go-wasm.js'
import { transpile } from '../../../tools/check-transpiler/typescript/transpile.js'
export { checkTypescriptArtifacts } from '../../../tools/check-transpiler/typescript/split.js'
import {
  splitCheckTypescript,
  splitCheckTypescriptChecks,
  splitCheckTypescriptRuntime,
  type CheckTypescriptFacts,
} from '../../../tools/check-transpiler/typescript/split.js'
import { checkRustAsset } from './check-rust-assets.js'
import type { CheckRustSource } from './check-rust-source.js'

function sourceNotices(source: string | CheckRustSource, module?: string): string {
  const files =
    typeof source === 'string'
      ? [{ source }]
      : source.modules
          .filter((item) => !module || item.name === module)
          .flatMap((item) => item.files)
  const notices = new Set<string>()
  for (const file of files) {
    const header = file.source.match(/^(?:\s*\/\*[\s\S]*?\*\/|\s*\/\/[^\n]*(?:\n|$))*/u)?.[0].trim()
    if (header && /copyright|SPDX-License-Identifier/iu.test(header)) notices.add(header)
  }
  return notices.size ? [...notices].join('\n\n') + '\n' : ''
}

type RustType = {
  kind: string
  inner?: RustType
  segments?: string[]
  typeArguments?: RustType[]
}
type RustItem = {
  kind: string
  name: string
  module?: string
  visibility?: string
  derives?: string[]
  fields?: { type: RustType }[]
  variants?: { payload?: RustType }[]
  parameters?: { type: RustType }[]
  returnType?: RustType
}

function valueOptions(items: RustItem[]): {
  immutableValueTypes: string[]
  readonlyValueTypes: string[]
} {
  const declarations = new Map(items.map((item) => [item.name, item]))
  const readonlyValueTypes = new Set<string>()
  const roots: RustType[] = []
  const visit = (type: RustType): void => {
    if (type.kind === 'reference') {
      if (type.inner) visit(type.inner)
      return
    }
    if (type.segments?.[0] === 'Vec') {
      for (const argument of type.typeArguments ?? []) {
        visit(argument)
      }
      return
    }
    const name = type.segments?.length === 1 ? type.segments[0] : undefined
    if (!name || readonlyValueTypes.has(name)) return
    const declaration = declarations.get(name)
    if (!declaration || !['struct', 'enum'].includes(declaration.kind)) return
    readonlyValueTypes.add(name)
    for (const field of declaration.fields ?? []) visit(field.type)
    for (const variant of declaration.variants ?? []) if (variant.payload) visit(variant.payload)
  }
  for (const item of items) {
    if (
      item.kind !== 'function' ||
      item.visibility !== 'public' ||
      !(
        item.module === 'checks' ||
        item.name === 'evaluate_check' ||
        item.name.startsWith('evaluate_check_') ||
        item.name.startsWith('sql__')
      )
    )
      continue
    for (const parameter of item.parameters ?? []) {
      roots.push(parameter.type)
      visit(parameter.type)
    }
    if (item.returnType) {
      roots.push(item.returnType)
      visit(item.returnType)
    }
  }
  const immutableValueTypes = new Set<string>()
  const immutable = (type: RustType, visiting: Set<string>): boolean => {
    if (type.kind === 'reference') return type.inner ? immutable(type.inner, visiting) : false
    if (type.segments?.length !== 1) return false
    const name = type.segments[0]!
    if (name === 'Vec') return false
    const declaration = declarations.get(name)
    if (!declaration) return true
    if (visiting.has(name)) return false
    const next = new Set(visiting).add(name)
    return [
      ...(declaration.fields ?? []).map((field) => field.type),
      ...(declaration.variants ?? []).flatMap((variant) =>
        variant.payload ? [variant.payload] : [],
      ),
    ].every((field) => immutable(field, next))
  }
  for (const type of roots) {
    if (immutable(type, new Set())) continue
    const declaration =
      type.segments?.length === 1 ? declarations.get(type.segments[0]!) : undefined
    if (
      declaration?.kind !== 'enum' ||
      declaration.visibility !== 'public' ||
      !declaration.derives?.includes('Clone')
    ) {
      throw new Error('Owned CHECK inputs and results require a public Clone value enum')
    }
  }
  for (const name of readonlyValueTypes)
    if (immutable({ kind: 'path', segments: [name] }, new Set())) immutableValueTypes.add(name)
  return {
    immutableValueTypes: [...immutableValueTypes],
    readonlyValueTypes: [...readonlyValueTypes],
  }
}

// The value contract shapes how the runtime itself is emitted, so it is decided by the runtime
// modules alone and the checks must stay within it; otherwise one runtime could not serve
// every check.
function checkValueOptions(items: RustItem[]): ReturnType<typeof valueOptions> {
  const options = valueOptions(items)
  if (!items.some((item) => item.module === 'checks')) return options
  const runtime = valueOptions(items.filter((item) => item.module !== 'checks'))
  for (const key of ['immutableValueTypes', 'readonlyValueTypes'] as const) {
    const outside = options[key].filter((name) => !runtime[key].includes(name))
    if (outside.length)
      throw new Error(
        `CHECK evaluators expose value types outside the runtime: ${outside.join(', ')}`,
      )
  }
  return options
}

export function transpileCheckRust(source: string | CheckRustSource): {
  typescript: string
  go: string
} {
  const ast = parseRust(
    typeof source === 'string' ? source : JSON.stringify(source),
    checkRustAsset('check-rust-parser.wasm'),
  )
  const document = JSON.parse(ast) as Parameters<typeof transpile>[0]
  const options = checkValueOptions(document.items)
  const notices = sourceNotices(source)
  return {
    typescript:
      notices +
      transpile(document, options, checkRustAsset('check-ts-prelude.ts').toString('utf8')),
    go:
      notices +
      transpileGo(Buffer.from(ast, 'utf8'), checkRustAsset('check-go-transpiler.wasm'), options),
  }
}

type CheckRustFileParts = {
  regex: string
  operations: string
  runtime: string
  language: string
  checks: string
}
function parseCheckRustDocument(source: CheckRustSource, schemaImportPath: string) {
  const ast = parseRust(JSON.stringify(source), checkRustAsset('check-rust-parser.wasm'))
  const document = JSON.parse(ast) as Parameters<typeof transpile>[0]
  return {
    ast,
    document,
    options: { ...checkValueOptions(document.items), split: true, schemaImportPath },
  }
}

function withSourceNotices(source: CheckRustSource, parts: CheckRustFileParts): CheckRustFileParts {
  const noticed = { ...parts }
  for (const [part, module] of [
    ['regex', 'regex_engine'],
    ['operations', 'pg_catalog'],
    ['runtime', 'checkruntime'],
    ['checks', 'checks'],
  ] as const)
    noticed[part] = sourceNotices(source, module) + noticed[part]
  return noticed
}

// Each target translates separately so that TypeScript generation, which places every schema in
// one group, never pays for a Go translation of the whole corpus that it would discard.
type ParsedCheckRust = ReturnType<typeof parseCheckRustDocument>

const typescriptFiles = ({ document, options }: ParsedCheckRust) =>
  splitCheckTypescript(
    transpile(document, options, checkRustAsset('check-ts-prelude.ts').toString('utf8')),
    document.items,
  )

const goFiles = ({ ast, options }: ParsedCheckRust) =>
  JSON.parse(
    transpileGo(Buffer.from(ast, 'utf8'), checkRustAsset('check-go-transpiler.wasm'), options),
  ) as CheckRustFileParts

export function transpileCheckRustTypescriptFiles(
  source: CheckRustSource,
  schemaImportPath = 'checkrust/pg_catalog',
): CheckRustFileParts {
  return withSourceNotices(
    source,
    typescriptFiles(parseCheckRustDocument(source, schemaImportPath)),
  )
}

export function transpileCheckRustGoFiles(
  source: CheckRustSource,
  schemaImportPath = 'checkrust/pg_catalog',
): CheckRustFileParts {
  return withSourceNotices(source, goFiles(parseCheckRustDocument(source, schemaImportPath)))
}

export function transpileCheckRustFiles(
  source: CheckRustSource,
  schemaImportPath = 'checkrust/pg_catalog',
): { typescript: CheckRustFileParts; go: CheckRustFileParts } {
  const parsed = parseCheckRustDocument(source, schemaImportPath)
  return {
    typescript: withSourceNotices(source, typescriptFiles(parsed)),
    go: withSourceNotices(source, goFiles(parsed)),
  }
}

// A runtime translated once serves every check built on the same runtime modules: the checks are
// then parsed, validated and emitted alone, against facts each stage recorded for the runtime.
// Both target emitters derive the runtime's output from the runtime alone, so appending the
// checks reproduces translating the combined source.
type DocumentItem = Parameters<typeof transpile>[0]['items'][number]

export type CheckRustRuntimeTranslation = {
  modules: { name: string; dependencies: string[] }[]
  items: DocumentItem[]
  declarations: string
  parserFacts: unknown
  typescriptFacts: CheckTypescriptFacts
  goFacts: unknown
  typescript: CheckRustFileParts
  go: CheckRustFileParts
}

// The Go emitter needs only the runtime's declarations, and decoding the bodies would cost
// as much as translating them.
function declarationsOnly(items: DocumentItem[]): unknown[] {
  return items.map((item) =>
    item.kind === 'function'
      ? { ...item, body: [] }
      : item.kind === 'constant'
        ? { ...item, value: { kind: 'integer', digits: '0' } }
        : item,
  )
}

export function translateCheckRustRuntime(
  source: CheckRustSource,
  schemaImportPath = 'checkrust/pg_catalog',
): CheckRustRuntimeTranslation {
  const modules = source.modules.filter((module) => module.name !== 'checks')
  const ast = parseRust(
    JSON.stringify({ schemaVersion: 1, modules, emitFacts: true }),
    checkRustAsset('check-rust-parser.wasm'),
  )
  const { facts: parserFacts, ...document } = JSON.parse(ast) as Parameters<typeof transpile>[0] & {
    facts: unknown
  }
  const options = { ...checkValueOptions(document.items), split: true, schemaImportPath }
  const runtime = { schemaVersion: 1 as const, modules }
  const typescript = splitCheckTypescriptRuntime(
    transpile(document, options, checkRustAsset('check-ts-prelude.ts').toString('utf8')),
    document.items,
  )
  const { facts: goFacts, ...go } = JSON.parse(
    transpileGo(
      Buffer.from(JSON.stringify(document), 'utf8'),
      checkRustAsset('check-go-transpiler.wasm'),
      {
        ...options,
        emitFacts: true,
      },
    ),
  ) as CheckRustFileParts & { facts: string }
  return {
    modules: document.modules!,
    items: document.items,
    declarations: JSON.stringify(declarationsOnly(document.items)),
    parserFacts,
    typescriptFacts: typescript.facts,
    goFacts: JSON.parse(goFacts) as unknown,
    typescript: withSourceNotices(runtime, typescript.files),
    go: withSourceNotices(runtime, go),
  }
}

export function translateCheckRustChecks(
  source: CheckRustSource,
  runtime: CheckRustRuntimeTranslation,
  schemaImportPath = 'checkrust/pg_catalog',
): { typescript: CheckRustFileParts; go: CheckRustFileParts } {
  const modules = source.modules.filter((module) => module.name === 'checks')
  const checks = JSON.parse(
    parseRust(
      JSON.stringify({ schemaVersion: 1, modules, runtimeFacts: runtime.parserFacts }),
      checkRustAsset('check-rust-parser.wasm'),
    ),
  ) as Parameters<typeof transpile>[0]
  const items = [...runtime.items, ...checks.items]
  const options = { ...checkValueOptions(items), split: true, schemaImportPath }
  const typescript = splitCheckTypescriptChecks(
    transpile({ schemaVersion: 1, items }, { ...options, module: 'checks' }),
    checks.items,
    runtime.typescriptFacts,
  )
  const ast =
    `{"schemaVersion":1,"modules":${JSON.stringify([...runtime.modules, ...checks.modules!])},` +
    `"items":${runtime.declarations.slice(0, -1)}${checks.items.length ? ',' : ''}` +
    `${JSON.stringify(checks.items).slice(1)}}`
  const go = JSON.parse(
    transpileGo(Buffer.from(ast, 'utf8'), checkRustAsset('check-go-transpiler.wasm'), {
      ...options,
      runtimeFacts: runtime.goFacts,
    }),
  ) as { checks: string }
  const notices = sourceNotices({ schemaVersion: 1, modules }, 'checks')
  return {
    typescript: { ...runtime.typescript, checks: notices + typescript },
    go: { ...runtime.go, checks: notices + go.checks },
  }
}
