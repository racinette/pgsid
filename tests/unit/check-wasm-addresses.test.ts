import { expect, it } from 'vitest'
import { parseRust } from '../../tools/check-transpiler/typescript/rust-wasm.js'
import { transpileGo } from '../../tools/check-transpiler/typescript/go-wasm.js'

const unsigned = (value: number): number[] => {
  const bytes: number[] = []
  do {
    const byte = value & 127
    value = Math.floor(value / 128)
    bytes.push(byte | (value ? 128 : 0))
  } while (value)
  return bytes
}
const signed = (value: number): number[] => {
  const bytes: number[] = []
  while (true) {
    const byte = value & 127
    value >>= 7
    const done = (value === 0 && !(byte & 64)) || (value === -1 && !!(byte & 64))
    bytes.push(byte | (done ? 0 : 128))
    if (done) return bytes
  }
}
const moduleWithHighAddress = (highInput: boolean, status = 0): Buffer => {
  const section = (id: number, bytes: number[]) => [id, ...unsigned(bytes.length), ...bytes]
  const body = (value?: number) => {
    const bytes = value === undefined ? [0, 11] : [0, 65, ...signed(value), 11]
    return [...unsigned(bytes.length), ...bytes]
  }
  const exports: [string, number, number][] = [
    ['memory', 2, 0],
    ['alloc', 0, 0],
    ['parse', 0, 1],
    ['output_ptr', 0, 2],
    ['output_len', 0, 3],
    ['dispose', 0, 4],
    ['_initialize', 0, 4],
    ['transpile', 0, 1],
    ['transpile_configured', 0, 1],
  ]
  return Buffer.from([
    0,
    97,
    115,
    109,
    1,
    0,
    0,
    0,
    ...section(1, [3, 96, 0, 1, 127, 96, 1, 127, 1, 127, 96, 0, 0]),
    ...section(3, [5, 1, 0, 0, 0, 2]),
    ...section(5, [1, 0, ...unsigned(32769)]),
    ...section(7, [
      exports.length,
      ...exports.flatMap(([name, kind, index]) => {
        const bytes = [...Buffer.from(name)]
        return [...unsigned(bytes.length), ...bytes, kind, index]
      }),
    ]),
    ...section(10, [
      5,
      ...body(highInput ? -2147483648 : 1024),
      ...body(status),
      ...body(-2147483648),
      ...body(2),
      ...body(),
    ]),
    ...section(11, [1, 0, 65, ...signed(-2147483648), 11, 2, 111, 107]),
  ])
}
for (const [name, run] of [
  ['Rust parser', (source: string, wasm: Buffer) => parseRust(source, wasm)],
  ['Go transpiler', (source: string, wasm: Buffer) => transpileGo(Buffer.from(source), wasm)],
] as const) {
  for (const highInput of [false, true])
    it(`${name} reads wasm32 output above 2 GiB with ${highInput ? 'high' : 'low'} input allocation`, () => {
      expect(run('hi', moduleWithHighAddress(highInput))).toBe(highInput ? 'hi' : 'ok')
    })
  it(`${name} retains a tool error returned above the signed address boundary`, () => {
    expect(() => run('hi', moduleWithHighAddress(false, 1))).toThrow('ok')
  })
}
