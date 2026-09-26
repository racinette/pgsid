#!/usr/bin/env bash
set -euo pipefail

experiment_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$experiment_dir/../.." && pwd)
go_bin=${PGSID_GO_BIN:-/snap/go/current/bin/go}
target_dir=/tmp/pgsid-regex-transpiler-target
go_cache=/tmp/pgsid-regex-go-cache
artifact_dir="$repo_dir/artifacts/regex-transpiler-spike"
smoke_dir="$artifact_dir/smoke"

cd "$repo_dir"
mkdir -p "$smoke_dir"
node "$experiment_dir/conformance/materialize-stress-fixtures.mjs" --check
node "$experiment_dir/conformance/materialize-targeted-postgres-fixtures.mjs" --check
cargo test --locked --manifest-path "$experiment_dir/Cargo.toml" --target-dir "$target_dir"
cargo build --locked --manifest-path "$experiment_dir/Cargo.toml" --target-dir "$target_dir" --bins
GOCACHE="$go_cache" "$go_bin" -C "$experiment_dir/go" test ./...
"$target_dir/debug/regex-transpiler-spike" --ast "$experiment_dir/transpiler_smoke.rs" "$smoke_dir/engine.ast.json"
node --import tsx "$experiment_dir/typescript/transpile.ts" "$smoke_dir/engine.ast.json" "$smoke_dir/engine.ts"
GOCACHE="$go_cache" "$go_bin" -C "$experiment_dir/go" run ./cmd/transpile "$smoke_dir/engine.ast.json" "$smoke_dir/engine.go"

node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --skipLibCheck "$smoke_dir/engine.ts"
"$go_bin" build -o "$target_dir/smoke-engine.a" "$smoke_dir/engine.go"
node --import tsx "$experiment_dir/smoke/check.ts" "$smoke_dir/engine.ts"

test_dir=$(mktemp -d /tmp/pgsid-regex-conformance.XXXXXX)
printf 'module pgsid-regex-generated-smoke\n\ngo 1.25\n' > "$test_dir/go.mod"
cp "$smoke_dir/engine.go" "$test_dir/engine.go"
cp "$experiment_dir/smoke/generated_test.go" "$test_dir/engine_test.go"
cp "$experiment_dir/smoke/generated_public_smoke_test.go" "$test_dir/public_test.go"
(cd "$test_dir" && GOCACHE="$go_cache" "$go_bin" test .)

"$target_dir/debug/regex-transpiler-spike" --ast "$experiment_dir/regex_engine_transpilable.rs" "$artifact_dir/engine.ast.json"
node --import tsx "$experiment_dir/typescript/transpile.ts" "$artifact_dir/engine.ast.json" "$artifact_dir/engine.ts"
GOCACHE="$go_cache" "$go_bin" -C "$experiment_dir/go" run ./cmd/transpile "$artifact_dir/engine.ast.json" "$artifact_dir/engine.go"

node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --skipLibCheck "$artifact_dir/engine.ts"
"$go_bin" build -o "$target_dir/engine.a" "$artifact_dir/engine.go"
node --import tsx "$experiment_dir/smoke/engine_check.ts" "$artifact_dir/engine.ts"
node --import tsx "$experiment_dir/smoke/fixture_check.ts" "$artifact_dir/engine.ts" \
  "$experiment_dir/conformance/postgres-fixtures.json" \
  "$experiment_dir/conformance/stress-fixtures.json" \
  "$experiment_dir/conformance/targeted-postgres-fixtures.json" \
  "$experiment_dir/conformance/stress-position-fixtures.json" \
  "$experiment_dir/conformance/stress-boundary-fixtures.json"

cp "$artifact_dir/engine.go" "$test_dir/engine.go"
cp "$experiment_dir/smoke/generated_engine_test.go" "$test_dir/engine_test.go"
cp "$experiment_dir/smoke/generated_public_engine_test.go" "$test_dir/public_test.go"
cp "$experiment_dir/smoke/generated_fixture_test.go" "$test_dir/fixture_test.go"
cp "$experiment_dir/conformance/postgres-fixtures.json" "$test_dir/postgres-fixtures.json"
cp "$experiment_dir/conformance/stress-fixtures.json" "$test_dir/stress-fixtures.json"
cp "$experiment_dir/conformance/targeted-postgres-fixtures.json" "$test_dir/targeted-postgres-fixtures.json"
cp "$experiment_dir/conformance/stress-position-fixtures.json" "$test_dir/stress-position-fixtures.json"
cp "$experiment_dir/conformance/stress-boundary-fixtures.json" "$test_dir/stress-boundary-fixtures.json"
(cd "$test_dir" && GOCACHE="$go_cache" "$go_bin" test .)
