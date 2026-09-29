import { parseRust } from '../../../tools/regex-transpiler/typescript/rust-wasm.js'
import { transpileGo } from '../../../tools/regex-transpiler/typescript/go-wasm.js'
import { transpile } from '../../../tools/regex-transpiler/typescript/transpile.js'
import { checkRustAsset } from './check-rust-assets.js'

export function transpileCheckRust(source: string): { typescript: string; go: string } {
  const ast = parseRust(source, checkRustAsset('check-rust-parser.wasm'))
  return {
    typescript: transpile(JSON.parse(ast)),
    go: transpileGo(Buffer.from(ast, 'utf8'), checkRustAsset('check-go-transpiler.wasm')),
  }
}
