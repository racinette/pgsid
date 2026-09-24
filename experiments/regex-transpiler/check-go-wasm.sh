#!/usr/bin/env bash
set -euo pipefail

experiment_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$experiment_dir/../.." && pwd)
artifact_dir="$repo_dir/artifacts/regex-transpiler-spike"

bash "$experiment_dir/check.sh"
docker run --rm \
  -v "$experiment_dir/go:/src" \
  -v "$artifact_dir:/out" \
  -w /src/wasm \
  tinygo/tinygo:0.42.0 \
  tinygo build -target wasm-unknown -buildmode=c-shared -no-debug -o /out/go-transpiler.wasm .

cd "$repo_dir"
node --import tsx "$experiment_dir/typescript/go-wasm.ts" \
  "$artifact_dir/go-transpiler.wasm" \
  "$artifact_dir/smoke.ast.json" \
  "$artifact_dir/from-wasm.go"
cmp "$artifact_dir/from-ast.go" "$artifact_dir/from-wasm.go"
