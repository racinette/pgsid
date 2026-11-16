import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('../../../', import.meta.url))

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repo, encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr}${result.stdout}`)
}

// Built from the transpiler's current source, so a lint judges the dialect translation accepts
// now rather than whichever parser asset was built last.
function parserWasm() {
  const target = '/tmp/pgsid-check-rust-transpiler-target'
  run('cargo', [
    'build',
    '--quiet',
    '--locked',
    '--manifest-path',
    join(repo, 'tools/check-transpiler/Cargo.toml'),
    '--target',
    'wasm32-unknown-unknown',
    '--lib',
    '--release',
    '--target-dir',
    target,
  ])
  return readFileSync(join(target, 'wasm32-unknown-unknown/release/pgsid_check_transpiler.wasm'))
}

// A private directory, because the asset build writes the same tables to fixed paths and may run
// alongside a lint.
function generatedTables() {
  const directory = mkdtempSync(join(tmpdir(), 'pgsid-check-tables-'))
  try {
    run('bash', ['scripts/generate-check-unicode-data.sh', join(directory, 'unicode')])
    run('bash', ['scripts/generate-check-timezone-data.sh', join(directory, 'timezone')])
    return {
      'unicode_tables.rs': readFileSync(join(directory, 'unicode/tables.rs'), 'utf8'),
      'timezone_tables.rs': readFileSync(join(directory, 'timezone/tables.rs'), 'utf8'),
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

// Parses a source graph request into the transpiler's AST document, or its rejection.
export function createParser(wasm) {
  const module = new WebAssembly.Module(wasm)
  return (graph) => {
    // A fresh instance per request returns the memory a whole-runtime parse grows.
    const bridge = new WebAssembly.Instance(module).exports
    const input = Buffer.from(JSON.stringify(graph), 'utf8')
    const pointer = bridge.alloc(input.length) >>> 0
    new Uint8Array(bridge.memory.buffer, pointer, input.length).set(input)
    const status = bridge.parse()
    const output = Buffer.from(
      new Uint8Array(bridge.memory.buffer, bridge.output_ptr() >>> 0, bridge.output_len() >>> 0),
    ).toString('utf8')
    return status === 0 ? { document: JSON.parse(output) } : { error: output }
  }
}

export function prepare() {
  return { wasm: parserWasm(), generated: generatedTables() }
}

export function setup(prepared) {
  return { parse: createParser(prepared.wasm), generated: prepared.generated }
}
