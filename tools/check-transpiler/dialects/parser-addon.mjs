import { createParser, parserWasm } from './addons.mjs'

export function prepare() {
  return { wasm: parserWasm() }
}

export function setup(prepared) {
  return { parse: createParser(prepared.wasm) }
}
