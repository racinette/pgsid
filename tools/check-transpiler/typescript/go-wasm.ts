import { readFileSync, writeFileSync } from 'node:fs'

interface Bridge {
  memory: { buffer: ArrayBufferLike }
  _initialize(): void
  alloc(size: number): number
  transpile(): number
  transpile_configured(): number
  output_ptr(): number
  output_len(): number
  dispose(): void
}

export function transpileGo(
  ast: Uint8Array,
  wasmBytes: Buffer,
  options?: { immutableValueTypes: readonly string[]; split?: boolean; schemaImportPath?: string },
): string {
  const bytes = new Uint8Array(wasmBytes.length)
  bytes.set(wasmBytes)
  const wasm = (
    globalThis as unknown as {
      WebAssembly: {
        Module: { new (bytes: Uint8Array): unknown; imports(module: unknown): unknown[] }
        Instance: new (module: unknown) => { exports: unknown }
      }
    }
  ).WebAssembly
  const module = new wasm.Module(bytes)
  if (wasm.Module.imports(module).length !== 0) {
    throw new Error('Go transpiler unexpectedly requires WASM imports')
  }
  const instance = new wasm.Instance(module)
  const bridge = instance.exports as unknown as Bridge
  bridge._initialize()
  const input = options
    ? Buffer.from(JSON.stringify({ ast: JSON.parse(Buffer.from(ast).toString('utf8')), options }))
    : ast
  const pointer = bridge.alloc(input.length)
  try {
    new Uint8Array(bridge.memory.buffer, pointer, input.length).set(input)
    const status = options ? bridge.transpile_configured() : bridge.transpile()
    const result = Buffer.from(
      new Uint8Array(bridge.memory.buffer, bridge.output_ptr(), bridge.output_len()),
    ).toString('utf8')
    if (status !== 0) throw new Error(result)
    return result
  } finally {
    bridge.dispose()
  }
}

if (process.argv[1]?.endsWith('/go-wasm.ts')) {
  const [wasmPath, astPath, outputPath] = process.argv.slice(2)
  if (!wasmPath || !astPath || !outputPath) {
    throw new Error('usage: go-wasm.ts WASM AST_JSON OUTPUT_GO')
  }
  const result = transpileGo(readFileSync(astPath), readFileSync(wasmPath))
  writeFileSync(outputPath, result)
}
