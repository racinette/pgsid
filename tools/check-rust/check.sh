#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_dir"
bash scripts/build-check-rust-wasm.sh
cargo test --quiet --locked --manifest-path crates/check-evaluator/Cargo.toml
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
pnpm exec vitest run tests/sql-semantics/check-module-split.test.ts tests/sql-semantics/check-bytea-core.test.ts tests/sql-semantics/check-bytea-edit.test.ts tests/sql-semantics/check-bytea-ranges.test.ts tests/sql-semantics/check-bytea-integers.test.ts tests/sql-semantics/check-bytea-hash.test.ts tests/sql-semantics/check-bit-output.test.ts tests/sql-semantics/check-bit-count.test.ts tests/sql-semantics/check-bit-position.test.ts tests/sql-semantics/check-bit-overlay.test.ts tests/sql-semantics/check-bit-substring.test.ts tests/sql-semantics/check-bit-edit.test.ts tests/sql-semantics/check-bit-integers.test.ts tests/sql-semantics/check-bit-casts.test.ts tests/sql-semantics/check-bitwise.test.ts tests/sql-semantics/check-bit.test.ts tests/sql-semantics/check-uuid.test.ts tests/sql-semantics/check-uuid-output.test.ts tests/sql-semantics/check-uuid-timestamp.test.ts tests/sql-semantics/check-macaddr.test.ts tests/sql-semantics/check-macaddr-functions.test.ts tests/sql-semantics/check-macaddr-output.test.ts tests/sql-semantics/check-network.test.ts tests/sql-semantics/check-network-functions.test.ts tests/sql-semantics/check-network-bitwise.test.ts tests/sql-semantics/check-network-order.test.ts tests/sql-semantics/check-network-hash.test.ts tests/sql-semantics/check-network-output.test.ts tests/sql-semantics/check-owned-text.test.ts tests/sql-semantics/check-coalesce.test.ts tests/sql-semantics/check-integer-case.test.ts tests/sql-semantics/check-integer-promotion.test.ts tests/sql-semantics/check-bigint-arithmetic.test.ts tests/sql-semantics/check-int8.test.ts tests/sql-semantics/check-predicates.test.ts tests/sql-semantics/inventory.test.ts tests/sql-semantics/check-integer-casts.test.ts tests/sql-semantics/check-mixed-integers.test.ts tests/sql-semantics/check-character.test.ts tests/sql-semantics/check-smallint.test.ts tests/sql-semantics/check-numeric.test.ts tests/sql-semantics/check-worlds.test.ts tests/sql-semantics/check-static-tables.test.ts tests/sql-semantics/check-enums.test.ts tests/sql-semantics/check-collation.test.ts tests/sql-semantics/check-dates.test.ts tests/sql-semantics/check-date-text.test.ts tests/sql-semantics/check-timestamp-text.test.ts tests/sql-semantics/check-timestamp.test.ts tests/sql-semantics/check-timestamptz.test.ts tests/sql-semantics/check-timestamptz-text.test.ts tests/sql-semantics/check-arithmetic.test.ts "$@"
pnpm exec vitest run tests/sql-semantics/check-bytea-encoding.test.ts tests/sql-semantics/check-bytea-crypto.test.ts tests/sql-semantics/check-ascii.test.ts tests/sql-semantics/check-codepoints.test.ts tests/sql-semantics/check-diagnostics.test.ts tests/sql-semantics/check-bytea-like.test.ts tests/sql-semantics/check-bytea-input.test.ts tests/sql-semantics/check-numeric-send.test.ts tests/sql-semantics/check-integer-functions.test.ts tests/sql-semantics/check-temporal-functions.test.ts "$@"
node --import tsx tools/check-rust/check-wasm.ts
