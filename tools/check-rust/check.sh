#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_dir"
bash scripts/build-check-rust-wasm.sh
bash tools/check-rust-spike/check.sh
node --import tsx tools/check-rust-bound/check.ts
node --import tsx tools/check-rust-cases/check.ts
node --import tsx tools/check-rust-membership/check.ts
node --import tsx tools/check-rust-between/check.ts
cargo run --quiet --locked --manifest-path tools/check-rust-dialect/Cargo.toml -- artifacts/check-rust-bound/evaluator.rs
cargo run --quiet --locked --manifest-path tools/check-rust-dialect/Cargo.toml -- artifacts/check-rust-bound/group-evaluator.rs
bash tools/check-rust-operations/check.sh
node --import tsx tools/check-rust/check-wasm.ts
