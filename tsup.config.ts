import { cp } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig } from 'tsup'

export default defineConfig((overrides) => {
  const outDir = overrides.outDir ?? 'dist'
  return {
    entry: ['src/bin.ts', 'src/language-server-bin.ts'],
    format: ['esm'],
    sourcemap: true,
    clean: true,
    target: 'es2022',
    platform: 'node',
    outDir,
    publicDir: 'src/codegen/go/assets',
    // The Rust assets sit beside the bundle where the Rust generator looks for them.
    async onSuccess() {
      await cp('src/codegen/rust/assets/values', join(outDir, 'values'), { recursive: true })
      await cp('src/codegen/rust/assets/check-inputs.rs', join(outDir, 'check-inputs.rs'))
    },
  }
})
