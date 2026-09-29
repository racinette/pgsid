import { existsSync, readFileSync } from 'node:fs'
import { parseRust } from '../../../tools/regex-transpiler/typescript/rust-wasm.js'
import { transpileGo } from '../../../tools/regex-transpiler/typescript/go-wasm.js'
import { transpile } from '../../../tools/regex-transpiler/typescript/transpile.js'

const asset = (name: string): Buffer => {
  const source = new URL(`../go/assets/${name}`, import.meta.url)
  const bundled = new URL(`./${name}`, import.meta.url)
  return readFileSync(existsSync(source) ? source : bundled)
}

export function transpileCheckRust(source: string): { typescript: string; go: string } {
  const ast = parseRust(source, asset('check-rust-parser.wasm'))
  return {
    typescript: transpile(JSON.parse(ast)),
    go: transpileGo(Buffer.from(ast, 'utf8'), asset('check-go-transpiler.wasm')),
  }
}
