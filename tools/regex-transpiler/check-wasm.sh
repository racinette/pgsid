#!/usr/bin/env bash
set -euo pipefail

transpiler_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$transpiler_dir/../.." && pwd)
go_bin=${PGSID_GO_BIN:-$(command -v go || true)}
if [[ -z "$go_bin" ]]; then
  for candidate in /usr/local/go/bin/go /snap/go/current/bin/go; do
    if [[ -x "$candidate" ]]; then
      go_bin=$candidate
      break
    fi
  done
fi
if [[ -z "$go_bin" ]]; then
  echo 'Go executable not found; set PGSID_GO_BIN' >&2
  exit 1
fi
target_dir=/tmp/pgsid-regex-transpiler-target
go_cache=/tmp/pgsid-regex-go-cache
artifact_dir="$repo_dir/artifacts/regex-transpiler"
smoke_dir="$artifact_dir/smoke"
wasm_lib_dir=$(rustc --print target-libdir --target wasm32-unknown-unknown)

if [[ ! -d "$wasm_lib_dir" ]]; then
  echo 'Rust target wasm32-unknown-unknown is not installed' >&2
  exit 1
fi

bash "$transpiler_dir/check.sh"
cargo build --locked --manifest-path "$transpiler_dir/Cargo.toml" \
  --target wasm32-unknown-unknown --lib --release --target-dir "$target_dir"
docker run --rm \
  -v "$transpiler_dir/go:/src" \
  -v "$smoke_dir:/out" \
  -w /src/wasm \
  tinygo/tinygo:0.42.0 \
  tinygo build -target wasm-unknown -buildmode=c-shared -no-debug -o /out/go-transpiler.wasm .

cd "$repo_dir"
node --import tsx "$transpiler_dir/typescript/rust-wasm.ts" \
  "$target_dir/wasm32-unknown-unknown/release/pgsid_regex_transpiler.wasm" \
  "$transpiler_dir/transpiler_smoke.rs" \
  "$smoke_dir/from-rust-wasm.ast.json"
node -e 'const fs = require("node:fs"); const a = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const b = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); if (JSON.stringify(a) !== JSON.stringify(b)) process.exit(1)' \
  "$smoke_dir/engine.ast.json" "$smoke_dir/from-rust-wasm.ast.json"

node --import tsx "$transpiler_dir/typescript/transpile.ts" \
  "$smoke_dir/from-rust-wasm.ast.json" "$smoke_dir/from-full-wasm.ts"
node --import tsx "$transpiler_dir/typescript/go-wasm.ts" \
  "$smoke_dir/go-transpiler.wasm" \
  "$smoke_dir/from-rust-wasm.ast.json" \
  "$smoke_dir/from-full-wasm.go"
cmp "$smoke_dir/engine.ts" "$smoke_dir/from-full-wasm.ts"
cmp "$smoke_dir/engine.go" "$smoke_dir/from-full-wasm.go"

node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --skipLibCheck "$smoke_dir/from-full-wasm.ts"
"$go_bin" build -o "$target_dir/from-full-wasm.a" "$smoke_dir/from-full-wasm.go"
node --import tsx "$transpiler_dir/smoke/check.ts" \
  "$smoke_dir/from-full-wasm.ts"

test_dir=$(mktemp -d /tmp/pgsid-regex-conformance.XXXXXX)
cp "$smoke_dir/from-full-wasm.go" "$test_dir/engine.go"
cp "$transpiler_dir/smoke/generated_test.go" "$test_dir/engine_test.go"
(cd "$test_dir" && GO111MODULE=off GOCACHE="$go_cache" "$go_bin" test .)
