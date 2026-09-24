#!/usr/bin/env bash
set -euo pipefail

experiment_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$experiment_dir/../.." && pwd)
go_bin=${PGSID_GO_BIN:-/snap/go/current/bin/go}
target_dir=/tmp/pgsid-regex-transpiler-target
go_cache=/tmp/pgsid-regex-go-cache
artifact_dir="$repo_dir/artifacts/regex-transpiler-spike"
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
  -v "$artifact_dir:/out" \
  -w /src/wasm \
  tinygo/tinygo:0.42.0 \
  tinygo build -target wasm-unknown -buildmode=c-shared -no-debug -o /out/go-transpiler.wasm .

cd "$repo_dir"
node --import tsx "$experiment_dir/typescript/rust-wasm.ts" \
  "$target_dir/wasm32-unknown-unknown/release/regex_transpiler_spike.wasm" \
  "$experiment_dir/transpiler_fixture.rs" \
  "$artifact_dir/from-rust-wasm.ast.json"
node -e 'const fs = require("node:fs"); const a = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const b = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); if (JSON.stringify(a) !== JSON.stringify(b)) process.exit(1)' \
  "$artifact_dir/engine.ast.json" "$artifact_dir/from-rust-wasm.ast.json"

node --import tsx "$experiment_dir/typescript/transpile.ts" \
  "$artifact_dir/from-rust-wasm.ast.json" "$artifact_dir/from-full-wasm.ts"
node --import tsx "$experiment_dir/typescript/go-wasm.ts" \
  "$artifact_dir/go-transpiler.wasm" \
  "$artifact_dir/from-rust-wasm.ast.json" \
  "$artifact_dir/from-full-wasm.go"
cmp "$artifact_dir/from-ast.ts" "$artifact_dir/from-full-wasm.ts"
cmp "$artifact_dir/from-ast.go" "$artifact_dir/from-full-wasm.go"

node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --skipLibCheck "$artifact_dir/from-full-wasm.ts"
"$go_bin" build -o "$artifact_dir/from-full-wasm.a" "$artifact_dir/from-full-wasm.go"
node --import tsx "$experiment_dir/conformance/check.ts" \
  "$artifact_dir/from-full-wasm.ts" "$experiment_dir/conformance/cases.json"

test_dir=$(mktemp -d /tmp/pgsid-regex-conformance.XXXXXX)
cp "$artifact_dir/from-full-wasm.go" "$test_dir/engine.go"
cp "$experiment_dir/conformance/generated_test.go" "$test_dir/engine_test.go"
(cd "$test_dir" && PGSID_REGEX_VECTOR_PATH="$experiment_dir/conformance/cases.json" GO111MODULE=off GOCACHE="$go_cache" "$go_bin" test .)
