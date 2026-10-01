#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_dir"
bash scripts/build-check-rust-wasm.sh
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
pnpm exec vitest run tests/sql-semantics/check-enums.test.ts tests/sql-semantics/check-collation.test.ts tests/sql-semantics/check-dates.test.ts tests/sql-semantics/check-date-text.test.ts tests/sql-semantics/check-timestamp-text.test.ts tests/sql-semantics/check-timestamp.test.ts tests/sql-semantics/check-timestamptz.test.ts tests/sql-semantics/check-timestamptz-text.test.ts tests/sql-semantics/check-arithmetic.test.ts
node --import tsx tools/check-rust/check-wasm.ts
