#!/usr/bin/env bash
set -euo pipefail

transpiler_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$transpiler_dir/../.." && pwd)
go_bin=${PGSID_GO_BIN:-$(command -v go || true)}
if [[ -z "$go_bin" ]]; then
  for candidate in /usr/local/go/bin/go /snap/go/current/bin/go; do
    if [[ -x "$candidate" ]]; then
      go_bin=$candidate
      break
    fi
  done
fi
if [[ -z "$go_bin" ]]; then
  echo 'Go executable not found; set PGSID_GO_BIN' >&2
  exit 1
fi
target_dir=/tmp/pgsid-regex-transpiler-target
go_cache=/tmp/pgsid-regex-go-cache
artifact_dir="$repo_dir/artifacts/regex-transpiler"
smoke_dir="$artifact_dir/smoke"

cd "$repo_dir"
mkdir -p "$smoke_dir"
node "$transpiler_dir/conformance/materialize-stress-fixtures.mjs" --check
node "$transpiler_dir/conformance/materialize-targeted-postgres-fixtures.mjs" --check
cargo test --locked --manifest-path "$repo_dir/crates/regex-engine/Cargo.toml" --target-dir "$target_dir"
cargo test --locked --manifest-path "$transpiler_dir/Cargo.toml" --target-dir "$target_dir"
cargo build --locked --manifest-path "$transpiler_dir/Cargo.toml" --target-dir "$target_dir" --bins
GOCACHE="$go_cache" "$go_bin" -C "$transpiler_dir/go" test ./...
"$target_dir/debug/pgsid-regex-transpiler" --ast "$transpiler_dir/transpiler_smoke.rs" "$smoke_dir/engine.ast.json"
node --import tsx "$transpiler_dir/typescript/transpile.ts" "$smoke_dir/engine.ast.json" "$smoke_dir/engine.ts"
GOCACHE="$go_cache" "$go_bin" -C "$transpiler_dir/go" run ./cmd/transpile "$smoke_dir/engine.ast.json" "$smoke_dir/engine.go"

node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --skipLibCheck "$smoke_dir/engine.ts"
"$go_bin" build -o "$target_dir/smoke-engine.a" "$smoke_dir/engine.go"
node --import tsx "$transpiler_dir/smoke/check.ts" "$smoke_dir/engine.ts"

test_dir=$(mktemp -d /tmp/pgsid-regex-conformance.XXXXXX)
printf 'module pgsid-regex-generated-smoke\n\ngo 1.25\n' > "$test_dir/go.mod"
cp "$smoke_dir/engine.go" "$test_dir/engine.go"
cp "$transpiler_dir/smoke/generated_test.go" "$test_dir/engine_test.go"
cp "$transpiler_dir/smoke/generated_public_smoke_test.go" "$test_dir/public_test.go"
(cd "$test_dir" && GOCACHE="$go_cache" "$go_bin" test .)

"$target_dir/debug/pgsid-regex-transpiler" --ast "$repo_dir/crates/regex-engine/src/lib.rs" "$artifact_dir/engine.ast.json"
node --import tsx "$transpiler_dir/typescript/transpile.ts" "$artifact_dir/engine.ast.json" "$artifact_dir/engine.ts"
GOCACHE="$go_cache" "$go_bin" -C "$transpiler_dir/go" run ./cmd/transpile "$artifact_dir/engine.ast.json" "$artifact_dir/engine.go"
cmp "$artifact_dir/engine.go" "$repo_dir/src/codegen/shared/regex-engine/engine.go"
cmp "$artifact_dir/engine.ts" "$repo_dir/src/codegen/shared/regex-engine/engine.ts"

node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --skipLibCheck "$artifact_dir/engine.ts"
"$go_bin" build -o "$target_dir/engine.a" "$artifact_dir/engine.go"
node --import tsx "$transpiler_dir/smoke/engine_check.ts" "$artifact_dir/engine.ts"
node --import tsx "$transpiler_dir/smoke/fixture_check.ts" "$artifact_dir/engine.ts" \
  "$transpiler_dir/conformance/postgres-fixtures.json" \
  "$transpiler_dir/conformance/stress-fixtures.json" \
  "$transpiler_dir/conformance/targeted-postgres-fixtures.json" \
  "$transpiler_dir/conformance/stress-position-fixtures.json" \
  "$transpiler_dir/conformance/stress-boundary-fixtures.json" \
  "$transpiler_dir/conformance/stress-classification-fixtures.json"

cp "$artifact_dir/engine.go" "$test_dir/engine.go"
cp "$transpiler_dir/smoke/generated_engine_test.go" "$test_dir/engine_test.go"
cp "$transpiler_dir/smoke/generated_public_engine_test.go" "$test_dir/public_test.go"
cp "$transpiler_dir/smoke/generated_fixture_test.go" "$test_dir/fixture_test.go"
cp "$transpiler_dir/conformance/postgres-fixtures.json" "$test_dir/postgres-fixtures.json"
cp "$transpiler_dir/conformance/stress-fixtures.json" "$test_dir/stress-fixtures.json"
cp "$transpiler_dir/conformance/targeted-postgres-fixtures.json" "$test_dir/targeted-postgres-fixtures.json"
cp "$transpiler_dir/conformance/stress-position-fixtures.json" "$test_dir/stress-position-fixtures.json"
cp "$transpiler_dir/conformance/stress-boundary-fixtures.json" "$test_dir/stress-boundary-fixtures.json"
cp "$transpiler_dir/conformance/stress-classification-fixtures.json" "$test_dir/stress-classification-fixtures.json"
(cd "$test_dir" && GOCACHE="$go_cache" "$go_bin" test .)
