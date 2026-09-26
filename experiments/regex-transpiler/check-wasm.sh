#!/usr/bin/env bash
set -euo pipefail

experiment_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$experiment_dir/../.." && pwd)
go_bin=${PGSID_GO_BIN:-/snap/go/current/bin/go}
target_dir=/tmp/pgsid-regex-transpiler-target
go_cache=/tmp/pgsid-regex-go-cache
artifact_dir="$repo_dir/artifacts/regex-transpiler-spike"
smoke_dir="$artifact_dir/smoke"
wasm_lib_dir=$(rustc --print target-libdir --target wasm32-unknown-unknown)

if [[ ! -d "$wasm_lib_dir" ]]; then
  echo 'Rust target wasm32-unknown-unknown is not installed' >&2
  exit 1
fi

bash "$experiment_dir/check.sh"
cargo build --locked --manifest-path "$experiment_dir/Cargo.toml" \
  --target wasm32-unknown-unknown --lib --release --target-dir "$target_dir"
docker run --rm \
  -v "$experiment_dir/go:/src" \
  -v "$smoke_dir:/out" \
  -w /src/wasm \
  tinygo/tinygo:0.42.0 \
  tinygo build -target wasm-unknown -buildmode=c-shared -no-debug -o /out/go-transpiler.wasm .

cd "$repo_dir"
node --import tsx "$experiment_dir/typescript/rust-wasm.ts" \
  "$target_dir/wasm32-unknown-unknown/release/regex_transpiler_spike.wasm" \
  "$experiment_dir/transpiler_smoke.rs" \
  "$smoke_dir/from-rust-wasm.ast.json"
node -e 'const fs = require("node:fs"); const a = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const b = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); if (JSON.stringify(a) !== JSON.stringify(b)) process.exit(1)' \
  "$smoke_dir/engine.ast.json" "$smoke_dir/from-rust-wasm.ast.json"

node --import tsx "$experiment_dir/typescript/transpile.ts" \
  "$smoke_dir/from-rust-wasm.ast.json" "$smoke_dir/from-full-wasm.ts"
node --import tsx "$experiment_dir/typescript/go-wasm.ts" \
  "$smoke_dir/go-transpiler.wasm" \
  "$smoke_dir/from-rust-wasm.ast.json" \
  "$smoke_dir/from-full-wasm.go"
cmp "$smoke_dir/engine.ts" "$smoke_dir/from-full-wasm.ts"
cmp "$smoke_dir/engine.go" "$smoke_dir/from-full-wasm.go"

node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --skipLibCheck "$smoke_dir/from-full-wasm.ts"
"$go_bin" build -o "$target_dir/from-full-wasm.a" "$smoke_dir/from-full-wasm.go"
node --import tsx "$experiment_dir/smoke/check.ts" \
  "$smoke_dir/from-full-wasm.ts"

test_dir=$(mktemp -d /tmp/pgsid-regex-conformance.XXXXXX)
cp "$smoke_dir/from-full-wasm.go" "$test_dir/engine.go"
cp "$experiment_dir/smoke/generated_test.go" "$test_dir/engine_test.go"
(cd "$test_dir" && GO111MODULE=off GOCACHE="$go_cache" "$go_bin" test .)
