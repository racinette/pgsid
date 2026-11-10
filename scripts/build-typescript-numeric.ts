import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { assembleCheckRust } from '../src/codegen/shared/check-rust-source.js'
import {
  checkTypescriptArtifacts,
  transpileCheckRustTypescriptFiles,
} from '../src/codegen/shared/check-rust-transpile.js'
import { typescriptNumericModule } from '../src/codegen/typescript/numeric-module.js'

// The TypeScript numeric module's evaluator files: the evaluator runtime translated without
// checks, pruned to what the numeric module reaches. Translating takes long enough that it is
// done here, once, rather than in every generation that meets a numeric.
const asset = fileURLToPath(
  new URL('../src/codegen/go/assets/typescript-numeric.json', import.meta.url),
)

export function buildTypescriptNumericAsset(): string {
  const files = checkTypescriptArtifacts(
    transpileCheckRustTypescriptFiles(assembleCheckRust({ source: '', callables: [] })),
    [{ source: typescriptNumericModule, prefix: './numeric/' }],
  )
  return JSON.stringify({ files }, null, 1) + '\n'
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const built = buildTypescriptNumericAsset()
  if (process.argv.includes('--check')) {
    if (readFileSync(asset, 'utf8') !== built) {
      console.error('typescript-numeric.json is stale; run pnpm typescript-numeric:build')
      process.exit(1)
    }
  } else writeFileSync(asset, built)
}
