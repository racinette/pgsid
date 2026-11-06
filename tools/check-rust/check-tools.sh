#!/usr/bin/env bash
set -euo pipefail

# The full tier's steps outside Vitest: crate and generator tests, transpiler and dialect checks.
# check.sh runs them before the owner suites; CI runs them as one job beside the suite shards.
# Needs the assets from scripts/build-check-rust-wasm.sh.

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_dir"
export GOFLAGS="${GOFLAGS:+$GOFLAGS }-trimpath"
cargo test --quiet --locked --manifest-path crates/check-evaluator/Cargo.toml
cargo test --quiet --locked --manifest-path tools/check-timezone-data/Cargo.toml
cargo test --quiet --locked --manifest-path tools/check-unicode-data/Cargo.toml
cargo test --quiet --locked --manifest-path tools/check-catalog-grammar/Cargo.toml
go -C tools/check-transpiler/go test ./...
bash tools/check-rust-spike/check.sh
node --import tsx tools/check-rust-bound/check.ts
node --import tsx tools/check-rust-cases/check.ts
node --import tsx tools/check-rust-membership/check.ts
node --import tsx tools/check-rust-between/check.ts
node --import tsx tools/check-rust-int8/check.ts
cargo run --quiet --locked --manifest-path tools/check-rust-dialect/Cargo.toml -- artifacts/check-rust-bound/evaluator.rs
cargo run --quiet --locked --manifest-path tools/check-rust-dialect/Cargo.toml -- artifacts/check-rust-bound/group-evaluator.rs
bash tools/check-rust-operations/check.sh
node --import tsx tools/check-rust/check-wasm.ts
