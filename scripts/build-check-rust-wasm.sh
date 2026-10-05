#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
asset_dir="$repo_dir/src/codegen/go/assets"
bash "$repo_dir/scripts/generate-check-timezone-data.sh"
target_dir=/tmp/pgsid-check-rust-transpiler-target
wasm_lib_dir=$(rustc --print target-libdir --target wasm32-unknown-unknown)

if [[ ! -d "$wasm_lib_dir" ]]; then
  echo 'Rust target wasm32-unknown-unknown is not installed' >&2
  exit 1
fi

cargo build --locked --manifest-path "$repo_dir/tools/check-transpiler/Cargo.toml" \
  --target wasm32-unknown-unknown --lib --release --target-dir "$target_dir"
cp "$target_dir/wasm32-unknown-unknown/release/pgsid_check_transpiler.wasm" \
  "$asset_dir/check-rust-parser.wasm"
bash "$repo_dir/scripts/build-tinygo-wasm.sh" \
  "$repo_dir/tools/check-transpiler/go/wasm" "$asset_dir/check-go-transpiler.wasm"
node --input-type=module - "$repo_dir" "$asset_dir" /tmp/pgsid-check-timezone-data/tables.rs <<'JS'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
const [repo, assets, timezoneTables] = process.argv.slice(2)
const read = path => ({ path, source: readFileSync(`${repo}/${path}`, 'utf8') })
const schema = 'crates/check-evaluator/src/operations/pg_catalog'
const files = readdirSync(`${repo}/${schema}`).filter(name => name.endsWith('.rs')).sort()
writeFileSync(`${assets}/check-rust-sources.json`, JSON.stringify({
  schemaVersion: 1,
  modules: [
    { name: 'regex_engine', dependencies: [], files: [read('crates/regex-engine/src/lib.rs')] },
    { name: 'checkruntime', dependencies: [], files: [
      read('crates/check-evaluator/src/values.rs'),
      read('crates/check-evaluator/src/date.rs'),
      read('crates/check-evaluator/src/timestamp.rs'),
      read('crates/check-evaluator/src/timestamptz.rs'),
      read('crates/check-evaluator/src/logic.rs'),
    ] },
    { name: 'pg_catalog', dependencies: ['checkruntime', 'regex_engine'], files: [
      ...files.map(name => read(`${schema}/${name}`)),
      { path: 'generated/timezone_tables.rs', source: readFileSync(timezoneTables, 'utf8') },
    ] },
  ],
}, null, 2) + '\n')
JS
rm -f "$asset_dir/check-rust-integer.rs" "$asset_dir/check-rust-regex.rs" "$asset_dir/check-rust-regex-operation.rs"
cp "$repo_dir/tools/check-transpiler/typescript/runtime-prelude.ts" \
  "$asset_dir/check-ts-prelude.ts"
