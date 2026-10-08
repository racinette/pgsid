#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
unicode_build_dir=/tmp/pgsid-check-unicode-data
mkdir -p "$unicode_build_dir"
cargo run --quiet --locked --offline \
  --manifest-path "$repo_dir/tools/check-unicode-data/Cargo.toml" -- \
  "$repo_dir/vendor/postgresql-unicode" "$unicode_build_dir/tables.rs"
