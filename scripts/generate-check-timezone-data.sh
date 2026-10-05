#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
timezone_build_dir=/tmp/pgsid-check-timezone-data
rm -rf "$timezone_build_dir/tzif"
mkdir -p "$timezone_build_dir/tzif"
"${ZIC:-zic}" -d "$timezone_build_dir/tzif" "$repo_dir/vendor/postgresql-timezone/tzdata.zi"
cargo run --quiet --locked --offline \
  --manifest-path "$repo_dir/tools/check-timezone-data/Cargo.toml" -- \
  "$timezone_build_dir/tzif" "$timezone_build_dir/tables.rs"
