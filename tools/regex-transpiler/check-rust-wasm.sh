#!/usr/bin/env bash
set -euo pipefail

transpiler_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$transpiler_dir/../.." && pwd)
target_dir=/tmp/pgsid-regex-transpiler-target
artifact_dir="$repo_dir/artifacts/regex-transpiler"
smoke_dir="$artifact_dir/smoke"
wasm_lib_dir=$(rustc --print target-libdir --target wasm32-unknown-unknown)

if [[ ! -d "$wasm_lib_dir" ]]; then
  echo 'Rust target wasm32-unknown-unknown is not installed' >&2
  exit 1
fi

bash "$transpiler_dir/check.sh"
cargo build --locked --manifest-path "$transpiler_dir/Cargo.toml" \
  --target wasm32-unknown-unknown --lib --release --target-dir "$target_dir"

cd "$repo_dir"
node --import tsx "$transpiler_dir/typescript/rust-wasm.ts" \
  "$target_dir/wasm32-unknown-unknown/release/pgsid_regex_transpiler.wasm" \
  "$transpiler_dir/transpiler_smoke.rs" \
  "$smoke_dir/from-rust-wasm.ast.json"

node -e 'const fs = require("node:fs"); const a = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const b = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); if (JSON.stringify(a) !== JSON.stringify(b)) process.exit(1)' \
  "$smoke_dir/engine.ast.json" "$smoke_dir/from-rust-wasm.ast.json"
