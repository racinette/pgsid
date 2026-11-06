# Vendor inputs

PGlite core is installed from the npm
[0.5.9 release](https://github.com/electric-sql/pglite/releases/tag/%40electric-sql/pglite%400.5.9).
The extension tarball is packaged from the matching
[upstream CI build](https://github.com/electric-sql/pglite/actions/runs/38226673336)
and committed, because upstream CI artifacts expire and the extension is not on
npm yet ([electric-sql/pglite#1198](https://github.com/electric-sql/pglite/issues/1198)).
Move the dependency to npm once it is published.

While the upstream artifact is still available, an authenticated GitHub CLI can
rebuild the tarball:

```bash
bash scripts/fetch-plpgsql-check.sh
pnpm install --frozen-lockfile
```

The fetch command verifies the pinned artifact checksum, uses package metadata
from the release commit, and sets the core peer dependency to the released version.
It packages the prebuilt files without compiling PostgreSQL or the extension,
and reproduces the committed tarball byte for byte.
