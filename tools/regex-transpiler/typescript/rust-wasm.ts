import { readFileSync, writeFileSync } from 'node:fs'

interface Bridge {
  memory: { buffer: ArrayBufferLike }
  alloc(size: number): number
  parse(): number
  output_ptr(): number
  output_len(): number
  dispose(): void
}

export function parseRust(source: string, wasmBytes: Buffer): string {
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
    throw new Error('Rust AST parser unexpectedly requires WASM imports')
  }
  const instance = new wasm.Instance(module)
  const bridge = instance.exports as unknown as Bridge
  const input = Buffer.from(source, 'utf8')
  const pointer = bridge.alloc(input.length)
  try {
    new Uint8Array(bridge.memory.buffer, pointer, input.length).set(input)
    const status = bridge.parse()
    const result = Buffer.from(
      new Uint8Array(bridge.memory.buffer, bridge.output_ptr(), bridge.output_len()),
    ).toString('utf8')
    if (status !== 0) throw new Error(result)
    return result
  } finally {
    bridge.dispose()
  }
}

if (process.argv[1]?.endsWith('/rust-wasm.ts')) {
  const [wasmPath, rustPath, outputPath] = process.argv.slice(2)
  if (!wasmPath || !rustPath || !outputPath) {
    throw new Error('usage: rust-wasm.ts WASM RUST_SOURCE OUTPUT_AST_JSON')
  }
  const result = parseRust(readFileSync(rustPath, 'utf8'), readFileSync(wasmPath))
  writeFileSync(outputPath, result)
}
