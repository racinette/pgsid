# Vendor inputs

PGlite core is installed from the npm
[0.5.9 release](https://github.com/electric-sql/pglite/releases/tag/%40electric-sql/pglite%400.5.9).
The extension tarball is packaged from the matching
[upstream CI build](https://github.com/electric-sql/pglite/actions/runs/38226673336).

Before installing dependencies, fetch the extension with an authenticated GitHub CLI:

```bash
bash scripts/fetch-plpgsql-check.sh
pnpm install --frozen-lockfile
```

The fetch command verifies the pinned artifact checksum, uses package metadata
from the release commit, and sets the core peer dependency to the released version.
It packages the prebuilt files without compiling PostgreSQL or the extension.
The generated tarball stays ignored by Git. Upstream CI artifacts expire; keep
the tarball until the extension dependency can move to npm.
