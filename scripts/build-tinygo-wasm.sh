#!/usr/bin/env bash
set -euo pipefail

source_dir=$(cd "$1" && pwd)
output_dir=$(cd "$(dirname "$2")" && pwd)
output_file="$output_dir/$(basename "$2")"
tinygo_bin=${PGSID_TINYGO_BIN:-$(command -v tinygo || true)}

if [[ -z "$tinygo_bin" ]]; then
  echo 'TinyGo 0.42.0 is required; install it or set PGSID_TINYGO_BIN' >&2
  exit 1
fi

tinygo_version=$("$tinygo_bin" version)
if [[ "$tinygo_version" != 'tinygo version 0.42.0 '* ]]; then
  echo "TinyGo 0.42.0 is required; found: $tinygo_version" >&2
  exit 1
fi

(cd "$source_dir" && "$tinygo_bin" build -target wasm-unknown -buildmode=c-shared -no-debug -o "$output_file" .)
