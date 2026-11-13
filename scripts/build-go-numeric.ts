import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assembleCheckRust } from '../src/codegen/shared/check-rust-source.js'
import { transpileCheckRustGoFiles } from '../src/codegen/shared/check-rust-transpile.js'
import { goNumericPlaceholder, goNumericRoots } from '../src/codegen/go/numeric.js'

// The Go numeric value's evaluator files: the evaluator runtime translated without checks, pruned
// to what the numeric value reaches. Translating and pruning take long enough that they are done
// here, once, rather than in every generation that meets a numeric.
const asset = fileURLToPath(new URL('../src/codegen/go/assets/go-numeric.json', import.meta.url))
const pruner = fileURLToPath(new URL('../tools/go-prune/', import.meta.url))

export function buildGoNumericAsset(): string {
  const translated = transpileCheckRustGoFiles(
    assembleCheckRust({ source: '', callables: [] }),
    `${goNumericPlaceholder}/pg_catalog`,
  )
  const root = mkdtempSync(join(tmpdir(), 'pgsid-go-numeric-'))
  try {
    const packages = {
      pg_catalog: translated.operations,
      checkruntime: translated.runtime,
      langruntime: translated.language,
    }
    for (const [name, source] of Object.entries(packages)) {
      mkdirSync(join(root, 'in', name), { recursive: true })
      writeFileSync(join(root, 'in', name, `${name}.go`), source!)
    }
    execFileSync(
      process.env['PGSID_GO_BINARY'] ?? 'go',
      [
        'run',
        '.',
        '-in',
        join(root, 'in'),
        '-out',
        join(root, 'out'),
        '-module',
        goNumericPlaceholder,
        ...goNumericRoots,
      ],
      { cwd: pruner, stdio: ['ignore', 'inherit', 'inherit'] },
    )
    const files = Object.keys(packages)
      .sort()
      .flatMap((name) =>
        readdirSync(join(root, 'out', name))
          .sort()
          .map((file) => ({
            path: `${name}/${file}`,
            content: readFileSync(join(root, 'out', name, file), 'utf8'),
          })),
      )
    return JSON.stringify({ files }, null, 1) + '\n'
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const built = buildGoNumericAsset()
  if (process.argv.includes('--check')) {
    if (readFileSync(asset, 'utf8') !== built) {
      console.error('go-numeric.json is stale; run pnpm go-numeric:build')
      process.exit(1)
    }
  } else writeFileSync(asset, built)
}
