import { cp } from 'node:fs/promises'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts', 'src/language-server-bin.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  dts: true,
  target: 'es2022',
  platform: 'node',
  publicDir: 'src/codegen/go/assets',
  // The Rust assets sit beside the bundle where the Rust generator looks for them.
  async onSuccess() {
    await cp('src/codegen/rust/assets/values', 'dist/values', { recursive: true })
    await cp('src/codegen/rust/assets/check-inputs.rs', 'dist/check-inputs.rs')
  },
})
