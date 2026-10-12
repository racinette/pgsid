#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
download_dir=$(mktemp -d "${TMPDIR:-/tmp}/pgsid-plpgsql-check.XXXXXX")
trap 'rm -rf "$download_dir"' EXIT

gh api repos/electric-sql/pglite/actions/artifacts/11738057365/zip \
  > "$download_dir/artifact.zip"
(
  cd "$download_dir"
  printf '%s  artifact.zip\n' \
    '98cc5ed8ffb9705ffe4388811a9d228fed75c7ee73ee828a1c75689298004413' \
    | sha256sum --check
)

mkdir -p "$download_dir/package/dist"
unzip -q "$download_dir/artifact.zip" -d "$download_dir/package/dist"
gh api 'repos/electric-sql/pglite/contents/packages/pglite-plpgsql-check/package.json?ref=11df48e283ed556441a101707088f3235d58a32a' \
  --jq .content | base64 --decode > "$download_dir/package/package.json"

node --input-type=module - "$download_dir/package/package.json" "$repo_dir/package.json" <<'JS'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

const [manifestPath, projectPath] = process.argv.slice(2)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const project = JSON.parse(readFileSync(projectPath, 'utf8'))
assert.equal(manifest.name, '@electric-sql/pglite-plpgsql-check')
assert.equal(manifest.version, '0.0.1')
assert.equal(project.dependencies['@electric-sql/pglite'], '0.5.9')
assert.equal(manifest.peerDependencies['@electric-sql/pglite'], 'workspace:*')
manifest.peerDependencies['@electric-sql/pglite'] = '0.5.9'
delete manifest.devDependencies
delete manifest.scripts
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
JS

tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner --mode='u=rwX,go=rX' \
  -cf "$download_dir/package.tar" -C "$download_dir" package
gzip -n < "$download_dir/package.tar" > "$download_dir/package.tgz"
mkdir -p "$repo_dir/vendor"
mv "$download_dir/package.tgz" \
  "$repo_dir/vendor/electric-sql-pglite-plpgsql-check-0.0.1.tgz"
