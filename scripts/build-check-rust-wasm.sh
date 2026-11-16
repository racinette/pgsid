#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
asset_dir="$repo_dir/src/codegen/go/assets"
node "$repo_dir/tools/check-jsonpath-grammar/generate.mjs" --check
bash "$repo_dir/scripts/generate-check-timezone-data.sh"
bash "$repo_dir/scripts/generate-check-unicode-data.sh"
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
bash "$repo_dir/scripts/build-check-catalog-grammar.sh"
bash "$repo_dir/scripts/build-tinygo-wasm.sh" \
  "$repo_dir/tools/check-transpiler/go/wasm" "$asset_dir/check-go-transpiler.wasm"
node --input-type=module - "$repo_dir" "$asset_dir" /tmp/pgsid-check-timezone-data/tables.rs /tmp/pgsid-check-unicode-data/tables.rs <<'JS'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
const [repo, assets, timezoneTables, unicodeTables] = process.argv.slice(2)
const { checkSourceGraph } = await import(`${repo}/tools/check-transpiler/dialects/source-graph.mjs`)
const crates = `${repo}/crates`
const graph = await checkSourceGraph(JSON.parse(readFileSync(`${crates}/check-sources.json`, 'utf8')), {
  list: directory => readdirSync(`${crates}/${directory}`).map(name => `${directory}/${name}`),
  read: path => readFileSync(`${crates}/${path}`, 'utf8'),
  generated: {
    'unicode_tables.rs': readFileSync(unicodeTables, 'utf8'),
    'timezone_tables.rs': readFileSync(timezoneTables, 'utf8'),
  },
})
writeFileSync(`${assets}/check-rust-sources.json`, JSON.stringify(graph, null, 2) + '\n')
JS
rm -f "$asset_dir/check-rust-integer.rs" "$asset_dir/check-rust-regex.rs" "$asset_dir/check-rust-regex-operation.rs"
cp "$repo_dir/tools/check-transpiler/typescript/runtime-prelude.ts" \
  "$asset_dir/check-ts-prelude.ts"
