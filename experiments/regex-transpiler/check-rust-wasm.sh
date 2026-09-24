#!/usr/bin/env bash
set -euo pipefail

experiment_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$experiment_dir/../.." && pwd)
target_dir=/tmp/pgsid-regex-transpiler-target
artifact_dir="$repo_dir/artifacts/regex-transpiler-spike"
wasm_lib_dir=$(rustc --print target-libdir --target wasm32-unknown-unknown)

if [[ ! -d "$wasm_lib_dir" ]]; then
  echo 'Rust target wasm32-unknown-unknown is not installed' >&2
  exit 1
fi

bash "$experiment_dir/check.sh"
cargo build --locked --manifest-path "$experiment_dir/Cargo.toml" \
  --target wasm32-unknown-unknown --lib --release --target-dir "$target_dir"

cd "$repo_dir"
node --import tsx "$experiment_dir/typescript/rust-wasm.ts" \
  "$target_dir/wasm32-unknown-unknown/release/regex_transpiler_spike.wasm" \
  "$experiment_dir/transpiler_smoke.rs" \
  "$artifact_dir/from-rust-wasm.ast.json"

node -e 'const fs = require("node:fs"); const a = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const b = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); if (JSON.stringify(a) !== JSON.stringify(b)) process.exit(1)' \
  "$artifact_dir/smoke.ast.json" "$artifact_dir/from-rust-wasm.ast.json"
