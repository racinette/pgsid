#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_dir"
bash scripts/build-check-rust-wasm.sh
bash tools/check-rust-spike/check.sh
bash tools/check-rust-operations/check.sh
node --import tsx tools/check-rust/check-wasm.ts
