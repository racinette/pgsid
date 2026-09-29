import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function checkRustAsset(name: string): Buffer {
  const source = new URL(`../go/assets/${name}`, import.meta.url)
  const bundled = new URL(`./${name}`, import.meta.url)
  if (!existsSync(source) && !existsSync(bundled)) {
    const build = new URL('../../../scripts/build-check-rust-wasm.sh', import.meta.url)
    if (!existsSync(build)) throw new Error(`Missing packaged CHECK Rust asset: ${name}`)
    execFileSync('bash', [fileURLToPath(build)], { stdio: 'inherit' })
  }
  return readFileSync(existsSync(source) ? source : bundled)
}
