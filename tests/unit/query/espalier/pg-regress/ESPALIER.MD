---
description: replay adapters for PostgreSQL's regression-test corpus
---

The SQL corpus replayed here is not authored by pgsid. The harness points at
pglite/postgres-pglite/src/test/regress, which is a literal copy of the
regression test suite from a PostgreSQL checkout. Preserve that provenance:
changes to PostgreSQL's SQL belong in the upstream copy, not in these adapters.

Files in this directory are pgsid-owned replay machinery. They split psql
input, isolate PGlite crashes and hangs, and report the engine's shape and
refusal behavior over the borrowed corpus.
