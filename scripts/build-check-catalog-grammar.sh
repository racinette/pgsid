#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
target_dir=/tmp/pgsid-check-rust-transpiler-target
cargo build --locked --manifest-path "$repo_dir/tools/check-catalog-grammar/Cargo.toml" \
  --target wasm32-unknown-unknown --lib --release --target-dir "$target_dir"
cp "$target_dir/wasm32-unknown-unknown/release/pgsid_check_catalog_grammar.wasm" \
  "$repo_dir/src/codegen/go/assets/check-catalog-grammar.wasm"
