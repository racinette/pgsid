import { parseRust } from '../../../tools/check-transpiler/typescript/rust-wasm.js'
import { transpileGo } from '../../../tools/check-transpiler/typescript/go-wasm.js'
import { transpile } from '../../../tools/check-transpiler/typescript/transpile.js'
export { checkTypescriptArtifacts } from '../../../tools/check-transpiler/typescript/split.js'
import { splitCheckTypescript } from '../../../tools/check-transpiler/typescript/split.js'
import { checkRustAsset } from './check-rust-assets.js'
import type { CheckRustSource } from './check-rust-source.js'

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

function checkValueOptions(items: RustItem[]): {
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
  return {
    typescript: transpile(
      document,
      options,
      checkRustAsset('check-ts-prelude.ts').toString('utf8'),
    ),
    go: transpileGo(Buffer.from(ast, 'utf8'), checkRustAsset('check-go-transpiler.wasm'), options),
  }
}

export function transpileCheckRustFiles(
  source: CheckRustSource,
  schemaImportPath = 'checkrust/pg_catalog',
): {
  typescript: {
    regex: string
    operations: string
    runtime: string
    language: string
    checks: string
  }
  go: { regex: string; operations: string; runtime: string; language: string; checks: string }
} {
  const ast = parseRust(JSON.stringify(source), checkRustAsset('check-rust-parser.wasm'))
  const document = JSON.parse(ast) as Parameters<typeof transpile>[0]
  const options = { ...checkValueOptions(document.items), split: true, schemaImportPath }
  const typescript = splitCheckTypescript(
    transpile(document, options, checkRustAsset('check-ts-prelude.ts').toString('utf8')),
    document.items,
  )
  const go = JSON.parse(
    transpileGo(Buffer.from(ast, 'utf8'), checkRustAsset('check-go-transpiler.wasm'), options),
  ) as { regex: string; operations: string; runtime: string; language: string; checks: string }
  return { typescript, go }
}
