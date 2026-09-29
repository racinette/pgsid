#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
artifact_dir="$repo_dir/artifacts/check-rust-operations"
mkdir -p "$artifact_dir/go"
cd "$repo_dir"

node --import tsx tools/check-rust-operations/generate.ts "$artifact_dir/operations.rs" "$artifact_dir/fixtures.json" "$artifact_dir/rust_test.rs" "$artifact_dir/go/check_test.go"
rustc --edition 2021 --crate-name check_operations --crate-type lib "$artifact_dir/operations.rs" -o "$artifact_dir/libcheck_operations.rlib"
rustc --edition 2021 --test "$artifact_dir/rust_test.rs" --extern check_operations="$artifact_dir/libcheck_operations.rlib" -o "$artifact_dir/rust-test"
"$artifact_dir/rust-test"

cargo run --quiet --locked --manifest-path tools/regex-transpiler/Cargo.toml -- --ast "$artifact_dir/operations.rs" "$artifact_dir/operations.ast.json"
node --import tsx tools/regex-transpiler/typescript/transpile.ts "$artifact_dir/operations.ast.json" "$artifact_dir/operations.ts"
GOCACHE=/tmp/pgsid-check-rust-go-cache go -C tools/regex-transpiler/go run ./cmd/transpile "$artifact_dir/operations.ast.json" "$artifact_dir/go/operations.go"

node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --skipLibCheck "$artifact_dir/operations.ts"
node --import tsx tools/check-rust-operations/check.ts "$artifact_dir/operations.ts" "$artifact_dir/fixtures.json"
printf 'module pgsid-check-rust-operations\n\ngo 1.25\n' > "$artifact_dir/go/go.mod"
(cd "$artifact_dir/go" && GOCACHE=/tmp/pgsid-check-rust-go-cache go test .)
