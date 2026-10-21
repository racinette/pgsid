import { checkRustAsset } from '../codegen/shared/check-rust-assets.js'

interface GrammarBridge {
  memory: { buffer: ArrayBufferLike }
  alloc(size: number): number
  decode(): number
  output_ptr(): number
  output_len(): number
  dispose(): void
}

export type LiteralFields =
  | { kind: 'Value'; fields: readonly (string | null)[] }
  | { kind: 'Error'; state: number }
  | { kind: 'Unknown' }

let instance: GrammarBridge | undefined

export function readLiteralFields(
  kind: 'range' | 'multirange' | 'array',
  text: string,
): LiteralFields {
  if (!instance) {
    const wasm = (
      globalThis as unknown as {
        WebAssembly: {
          Module: { new (bytes: Uint8Array): unknown; imports(module: unknown): unknown[] }
          Instance: new (module: unknown) => { exports: unknown }
        }
      }
    ).WebAssembly
    const module = new wasm.Module(new Uint8Array(checkRustAsset('check-catalog-grammar.wasm')))
    if (wasm.Module.imports(module).length)
      throw new Error('Catalog text grammar requires no WASM imports')
    instance = new wasm.Instance(module).exports as GrammarBridge
  }
  const bridge = instance,
    input = Buffer.from(JSON.stringify({ kind, text }), 'utf8'),
    pointer = bridge.alloc(input.length)
  try {
    new Uint8Array(bridge.memory.buffer, pointer, input.length).set(input)
    const status = bridge.decode(),
      output = Buffer.from(
        new Uint8Array(bridge.memory.buffer, bridge.output_ptr(), bridge.output_len()),
      ).toString('utf8')
    if (status !== 0) throw new Error(output)
    const result: unknown = JSON.parse(output)
    if (result && typeof result === 'object' && 'kind' in result) {
      if (result.kind === 'Unknown') return { kind: 'Unknown' }
      if (
        result.kind === 'Error' &&
        'state' in result &&
        typeof result.state === 'number' &&
        Number.isInteger(result.state) &&
        result.state >= 0 &&
        result.state <= 4294967295
      )
        return { kind: 'Error', state: result.state }
      if (
        result.kind === 'Value' &&
        'fields' in result &&
        Array.isArray(result.fields) &&
        result.fields.every((field) => field === null || typeof field === 'string')
      )
        return { kind: 'Value', fields: result.fields as (string | null)[] }
    }
    throw new Error('Invalid catalog text grammar result')
  } finally {
    bridge.dispose()
  }
}
