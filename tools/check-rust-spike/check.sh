#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
artifact_dir="$repo_dir/artifacts/check-rust-spike"
mkdir -p "$artifact_dir/go"

cd "$repo_dir"
node --import tsx scripts/generate-builtin-inventory.ts --check
cargo test --locked --manifest-path crates/check-evaluator/Cargo.toml
node --import tsx tools/check-rust-spike/generate.ts "$artifact_dir/check.rs" "$artifact_dir/evaluator.rs"
cargo test --locked --manifest-path tools/check-rust-dialect/Cargo.toml
cargo run --quiet --locked --manifest-path tools/check-rust-dialect/Cargo.toml -- "$artifact_dir/evaluator.rs"
rustc --edition 2021 --crate-name check_spike --crate-type lib "$artifact_dir/check.rs" -o "$artifact_dir/libcheck_spike.rlib"
rustc --edition 2021 --test tools/check-rust-spike/rust_test.rs --extern check_spike="$artifact_dir/libcheck_spike.rlib" -o "$artifact_dir/rust-test"
"$artifact_dir/rust-test"

cargo run --locked --manifest-path tools/regex-transpiler/Cargo.toml -- --ast "$artifact_dir/check.rs" "$artifact_dir/check.ast.json"
node --import tsx tools/regex-transpiler/typescript/transpile.ts "$artifact_dir/check.ast.json" "$artifact_dir/check.ts"
GOCACHE=/tmp/pgsid-check-rust-go-cache go -C tools/regex-transpiler/go run ./cmd/transpile "$artifact_dir/check.ast.json" "$artifact_dir/go/check.go"

node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --skipLibCheck "$artifact_dir/check.ts"
node --import tsx tools/check-rust-spike/check.ts "$artifact_dir/check.ts"
cp tools/check-rust-spike/generated_test.go "$artifact_dir/go/check_test.go"
printf 'module pgsid-check-rust-spike\n\ngo 1.25\n' > "$artifact_dir/go/go.mod"
(cd "$artifact_dir/go" && GOCACHE=/tmp/pgsid-check-rust-go-cache go test .)
