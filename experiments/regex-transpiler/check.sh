#!/usr/bin/env bash
set -euo pipefail

experiment_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$experiment_dir/../.." && pwd)
go_bin=${PGSID_GO_BIN:-/snap/go/current/bin/go}
target_dir=/tmp/pgsid-regex-transpiler-target
go_cache=/tmp/pgsid-regex-go-cache
artifact_dir="$repo_dir/artifacts/regex-transpiler-spike"

cd "$repo_dir"
mkdir -p "$artifact_dir"
node "$experiment_dir/conformance/materialize-stress-fixtures.mjs" --check
cargo test --locked --manifest-path "$experiment_dir/Cargo.toml" --target-dir "$target_dir"
cargo build --locked --manifest-path "$experiment_dir/Cargo.toml" --target-dir "$target_dir"
"$target_dir/debug/regex-transpiler-spike" --ast "$experiment_dir/transpiler_smoke.rs" "$artifact_dir/smoke.ast.json"
node --import tsx "$experiment_dir/typescript/transpile.ts" "$artifact_dir/smoke.ast.json" "$artifact_dir/from-ast.ts"
GOCACHE="$go_cache" "$go_bin" -C "$experiment_dir/go" run ./cmd/transpile "$artifact_dir/smoke.ast.json" "$artifact_dir/from-ast.go"

node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --skipLibCheck "$artifact_dir/from-ast.ts"
"$go_bin" build -o "$artifact_dir/from-ast.a" "$artifact_dir/from-ast.go"
node --import tsx "$experiment_dir/smoke/check.ts" "$artifact_dir/from-ast.ts"

test_dir=$(mktemp -d /tmp/pgsid-regex-conformance.XXXXXX)
cp "$artifact_dir/from-ast.go" "$test_dir/engine.go"
cp "$experiment_dir/smoke/generated_test.go" "$test_dir/engine_test.go"
(cd "$test_dir" && GO111MODULE=off GOCACHE="$go_cache" "$go_bin" test .)
