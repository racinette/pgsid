import { existsSync, readFileSync } from 'node:fs'

export interface GoImport {
  alias?: string
  path: string
}

export interface GoField {
  names?: string[]
  type: GoExpression
  tag?: string
  sqlNullable?: boolean
  sqlJson?: boolean
  jsonValidation?: { contract: string; column: string; query: string }
  arrayValidation?: {
    dimensions: readonly number[]
    element: GoExpression
    query: string
    column: string
    nullable: boolean
  }
}

export type GoExpression =
  | { kind: 'ident'; name: string }
  | { kind: 'parsed'; value: string }
  | { kind: 'string'; value: string }
  | { kind: 'index'; left: GoExpression; right: GoExpression }
  | { kind: 'selector'; left: GoExpression; name: string }
  | { kind: 'pointer'; type: GoExpression }
  | { kind: 'slice'; type: GoExpression }
  | { kind: 'map'; left: GoExpression; right: GoExpression }
  | { kind: 'struct'; fields: GoField[] }
  | { kind: 'interface'; fields?: GoField[] }
  | { kind: 'function-type'; parameters: GoField[]; results: GoField[] }
  | { kind: 'ellipsis'; type: GoExpression }
  | { kind: 'number'; value: string }
  | { kind: 'call'; expression: GoExpression; arguments: GoExpression[] }
  | { kind: 'unary'; operator: '&' | '*'; expression: GoExpression }
  | { kind: 'binary'; operator: '!='; left: GoExpression; right: GoExpression }
  | { kind: 'composite'; type: GoExpression; elements: GoExpression[] }
  | { kind: 'key-value'; left: GoExpression; right: GoExpression }

export type GoStatement =
  | { kind: 'assign'; targets: GoExpression[]; expressions: GoExpression[]; operator: ':=' | '=' }
  | { kind: 'local-type'; name: string; type: GoExpression }
  | { kind: 'var'; name: string; type: GoExpression }
  | { kind: 'return'; expressions: GoExpression[] }
  | { kind: 'expression-statement' | 'defer'; expression: GoExpression }
  | { kind: 'if'; init?: GoStatement; condition: GoExpression; body: GoStatement[] }
  | { kind: 'for'; condition: GoExpression; body: GoStatement[] }

export type GoDeclaration =
  | { kind: 'type'; name: string; type: GoExpression }
  | { kind: 'const'; name: string; type?: GoExpression; expression: GoExpression }
  | {
      kind: 'function'
      name: string
      receiver?: GoField[]
      parameters: GoField[]
      results: GoField[]
      body: GoStatement[]
    }

export interface GoFile {
  package: string
  imports: GoImport[]
  declarations: GoDeclaration[]
  source?: string
}

interface GoAstExports {
  memory: { buffer: ArrayBufferLike }
  _initialize(): void
  alloc(size: number): number
  render(): number
  output_ptr(): number
  output_len(): number
  dispose(): void
}

let bridge: GoAstExports | undefined

export const go = {
  index: (left: GoExpression, right: GoExpression): GoExpression => ({
    kind: 'index',
    left,
    right,
  }),
  ident: (name: string): GoExpression => ({ kind: 'ident', name }),
  parsed: (value: string): GoExpression => ({ kind: 'parsed', value }),
  string: (value: string): GoExpression => ({ kind: 'string', value }),
  selector: (left: GoExpression, name: string): GoExpression => ({ kind: 'selector', left, name }),
  pointer: (type: GoExpression): GoExpression => ({ kind: 'pointer', type }),
  slice: (type: GoExpression): GoExpression => ({ kind: 'slice', type }),
  map: (key: GoExpression, value: GoExpression): GoExpression => ({
    kind: 'map',
    left: key,
    right: value,
  }),
  struct: (fields: GoField[]): GoExpression => ({ kind: 'struct', fields }),
  interface: (fields: GoField[]): GoExpression => ({ kind: 'interface', fields }),
  functionType: (parameters: GoField[], results: GoField[]): GoExpression => ({
    kind: 'function-type',
    parameters,
    results,
  }),
  ellipsis: (type: GoExpression): GoExpression => ({ kind: 'ellipsis', type }),
  number: (value: number): GoExpression => ({ kind: 'number', value: String(value) }),
  call: (expression: GoExpression, arguments_: GoExpression[] = []): GoExpression => ({
    kind: 'call',
    expression,
    arguments: arguments_,
  }),
  dereference: (expression: GoExpression): GoExpression => ({
    kind: 'unary',
    operator: '*',
    expression,
  }),
  address: (expression: GoExpression): GoExpression => ({
    kind: 'unary',
    operator: '&',
    expression,
  }),
  notEqual: (left: GoExpression, right: GoExpression): GoExpression => ({
    kind: 'binary',
    operator: '!=',
    left,
    right,
  }),
  composite: (type: GoExpression, elements: GoExpression[] = []): GoExpression => ({
    kind: 'composite',
    type,
    elements,
  }),
  keyValue: (name: string, value: GoExpression): GoExpression => ({
    kind: 'key-value',
    left: go.ident(name),
    right: value,
  }),
  assign: (
    targets: GoExpression[],
    expressions: GoExpression[],
    operator: ':=' | '=' = ':=',
  ): GoStatement => ({ kind: 'assign', targets, expressions, operator }),
  localType: (name: string, type: GoExpression): GoStatement => ({
    kind: 'local-type',
    name,
    type,
  }),
  variable: (name: string, type: GoExpression): GoStatement => ({ kind: 'var', name, type }),
  return: (...expressions: GoExpression[]): GoStatement => ({ kind: 'return', expressions }),
  expression: (expression: GoExpression): GoStatement => ({
    kind: 'expression-statement',
    expression,
  }),
  defer: (expression: GoExpression): GoStatement => ({ kind: 'defer', expression }),
  if: (condition: GoExpression, body: GoStatement[], init?: GoStatement): GoStatement => ({
    kind: 'if',
    condition,
    body,
    ...(init ? { init } : {}),
  }),
  for: (condition: GoExpression, body: GoStatement[]): GoStatement => ({
    kind: 'for',
    condition,
    body,
  }),
  function: (
    name: string,
    parameters: GoField[],
    results: GoField[],
    body: GoStatement[],
    receiver?: GoField[],
  ): GoDeclaration => ({
    kind: 'function',
    name,
    parameters,
    results,
    body,
    ...(receiver ? { receiver } : {}),
  }),
  any: (): GoExpression => ({ kind: 'ident', name: 'any' }),
  type: (name: string, type: GoExpression): GoDeclaration => ({ kind: 'type', name, type }),
  const: (name: string, expression: GoExpression, type?: GoExpression): GoDeclaration => ({
    kind: 'const',
    name,
    ...(type ? { type } : {}),
    expression,
  }),
}

export function printGoFile(file: GoFile): string {
  const runtime = bridge ?? (bridge = loadBridge())
  const input = Buffer.from(JSON.stringify(file))
  const pointer = runtime.alloc(input.length)
  try {
    new Uint8Array(runtime.memory.buffer, pointer, input.length).set(input)
    const status = runtime.render()
    const output = Buffer.from(
      new Uint8Array(runtime.memory.buffer, runtime.output_ptr(), runtime.output_len()),
    ).toString('utf8')
    if (status !== 0) throw new Error(output)
    return output
  } finally {
    runtime.dispose()
  }
}

const loadBridge = (): GoAstExports => {
  const source = new URL('./assets/go-ast.wasm', import.meta.url)
  const bundled = new URL('./go-ast.wasm', import.meta.url)
  const bytes = readFileSync(existsSync(source) ? source : bundled)
  const wasm = (
    globalThis as unknown as {
      WebAssembly: {
        Module: {
          new (bytes: Buffer): unknown
          imports(module: unknown): unknown[]
        }
        Instance: new (module: unknown) => { exports: unknown }
      }
    }
  ).WebAssembly
  const module = new wasm.Module(bytes)
  const imports = wasm.Module.imports(module)
  if (imports.length) throw new Error('The Go AST bridge unexpectedly requires runtime imports')
  const instance = new wasm.Instance(module)
  const exports = instance.exports as GoAstExports
  exports._initialize()
  return exports
}
