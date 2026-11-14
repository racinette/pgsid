import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assembleCheckRust } from '../src/codegen/shared/check-rust-source.js'
import { rustNumericRoots } from '../src/codegen/rust/values.js'

// The Rust numeric value's evaluator modules: the evaluator runtime without checks, pruned to what
// the numeric value reaches and formatted. Pruning takes long enough that it is done here, once,
// rather than in every generation that meets a numeric.
const asset = fileURLToPath(new URL('../src/codegen/rust/assets/rust-numeric.json', import.meta.url))
const pruner = fileURLToPath(new URL('../tools/rust-prune/', import.meta.url))

export function buildRustNumericAsset(): string {
  const source = assembleCheckRust({ source: '', callables: [] })
  const root = mkdtempSync(join(tmpdir(), 'pgsid-rust-numeric-'))
  try {
    mkdirSync(join(root, 'in'))
    const modules = source.modules.filter((module) => module.name !== 'checks' && module.files.length)
    for (const module of modules) {
      writeFileSync(join(root, 'in', `${module.name}.rs`), module.files.map((file) => file.source).join('\n'))
      writeFileSync(join(root, 'in', `${module.name}.deps`), module.dependencies.join(' '))
    }
    const cargo = process.env['PGSID_CARGO_BINARY'] ?? 'cargo'
    execFileSync(
      cargo,
      ['run', '--offline', '--release', '--quiet', '--', join(root, 'in'), join(root, 'out'), ...rustNumericRoots],
      { cwd: pruner, stdio: ['ignore', 'inherit', 'inherit'] },
    )
    const files = readdirSync(join(root, 'out')).sort()
    execFileSync('rustfmt', ['--edition', '2021', ...files.map((file) => join(root, 'out', file))])
    return (
      JSON.stringify(
        { files: files.map((file) => ({ path: file, content: readFileSync(join(root, 'out', file), 'utf8') })) },
        null,
        1,
      ) + '\n'
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const built = buildRustNumericAsset()
  if (process.argv.includes('--check')) {
    if (readFileSync(asset, 'utf8') !== built) {
      console.error('rust-numeric.json is stale; run pnpm rust-numeric:build')
      process.exit(1)
    }
  } else writeFileSync(asset, built)
}
