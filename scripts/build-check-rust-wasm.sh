#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
asset_dir="$repo_dir/src/codegen/go/assets"
target_dir=/tmp/pgsid-check-rust-transpiler-target
wasm_lib_dir=$(rustc --print target-libdir --target wasm32-unknown-unknown)

if [[ ! -d "$wasm_lib_dir" ]]; then
  echo 'Rust target wasm32-unknown-unknown is not installed' >&2
  exit 1
fi

cargo build --locked --manifest-path "$repo_dir/tools/regex-transpiler/Cargo.toml" \
  --target wasm32-unknown-unknown --lib --release --target-dir "$target_dir"
cp "$target_dir/wasm32-unknown-unknown/release/pgsid_regex_transpiler.wasm" \
  "$asset_dir/check-rust-parser.wasm"
bash "$repo_dir/scripts/build-tinygo-wasm.sh" \
  "$repo_dir/tools/regex-transpiler/go/wasm" "$asset_dir/check-go-transpiler.wasm"
cat \
  "$repo_dir/crates/check-evaluator/src/values.rs" \
  "$repo_dir/crates/check-evaluator/src/operations/integer.rs" \
  "$repo_dir/crates/check-evaluator/src/operations/text.rs" \
  "$repo_dir/crates/check-evaluator/src/logic.rs" \
  > "$asset_dir/check-rust-integer.rs"
