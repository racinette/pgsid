#!/usr/bin/env bash
set -euo pipefail

# The per-change tier: structural checks, then only the CHECK owner suites a change can affect
# (see affected.ts). The full tier, check.sh, runs every owner and belongs to nightly or
# pre-release runs; it also records the reach data this tier selects with.
# Usage: check-fast.sh [base revision, default HEAD]. PGSID_CHECK_WORKERS sets parallel suites.

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_dir"
base="${1:-HEAD}"
workers="${PGSID_CHECK_WORKERS:-2}"
export GOFLAGS="${GOFLAGS:+$GOFLAGS }-trimpath"
bash scripts/build-check-rust-wasm.sh
cargo test --quiet --locked --manifest-path crates/check-evaluator/Cargo.toml
go -C tools/check-transpiler/go test ./...
# The structural tests the full tier also runs; the generated-tree goldens stay serial because
# their fixed time limit is not meant for a loaded machine.
node node_modules/vitest/vitest.mjs run tests/unit/catalog tests/unit/config.test.ts \
  tests/sql-semantics/check-gate-coverage.test.ts --maxWorkers="$workers"
node node_modules/vitest/vitest.mjs run tests/unit/codegen-goldens.test.ts --maxWorkers=1
mapfile -t suites < <(node --import tsx tools/check-rust/affected.ts "$base")
if ((${#suites[@]} == 0)); then
  echo "No CHECK owner suites are affected."
  exit 0
fi
echo "Running ${#suites[@]} affected CHECK owner suites."
node node_modules/vitest/vitest.mjs run "${suites[@]}" --maxWorkers="$workers"
