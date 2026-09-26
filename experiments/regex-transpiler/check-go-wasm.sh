#!/usr/bin/env bash
set -euo pipefail

experiment_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$experiment_dir/../.." && pwd)
artifact_dir="$repo_dir/artifacts/regex-transpiler-spike"
smoke_dir="$artifact_dir/smoke"

bash "$experiment_dir/check.sh"
docker run --rm \
  -v "$experiment_dir/go:/src" \
  -v "$smoke_dir:/out" \
  -w /src/wasm \
  tinygo/tinygo:0.42.0 \
  tinygo build -target wasm-unknown -buildmode=c-shared -no-debug -o /out/go-transpiler.wasm .

cd "$repo_dir"
node --import tsx "$experiment_dir/typescript/go-wasm.ts" \
  "$smoke_dir/go-transpiler.wasm" \
  "$smoke_dir/engine.ast.json" \
  "$smoke_dir/from-wasm.go"
cmp "$smoke_dir/engine.go" "$smoke_dir/from-wasm.go"
