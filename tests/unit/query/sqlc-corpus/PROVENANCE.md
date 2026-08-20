# sqlc borrowed corpus — provenance

Vendored from [sqlc](https://github.com/sqlc-dev/sqlc), release **v1.31.1**
(commit `a95e91d70`), extracted with `git archive v1.31.1` from
`internal/endtoend/testdata`. License: MIT (Riza, Inc.) — the upstream
`LICENSE` file is vendored verbatim alongside this note, satisfying its one
condition (the notice travels with the copies).

## What was copied

Every case's **postgresql** variant, content-deduped by (schema.sql,
query.sql) hash — driver variants (`pgx/v4`, `pgx/v5`, `stdlib`) usually
share identical SQL, so the first variant stands for all; a case with
genuinely distinct postgresql variants keeps each under a `__N` suffix.
253 unique cases from 509 postgresql query files. Per case:

- `schema.sql`, `query.sql` — the inputs.
- `sqlc.json` / `sqlc.yaml` — the case's own config, kept for reference
  only; the expected verdicts do NOT come from it (see next).
- `expected.json` — sqlc's own nullability verdicts, extracted by
  `tests/probe/sqlc-extract-expected.ts`: the pinned sqlc release is run
  with the built-in `json` codegen and a minimal injected config, and the
  IR's per-column `not_null` is saved per query (parameters too). This is
  sqlc's inference BEFORE any Go type mapping, so type `overrides` and
  emit-flags never blur the verdicts, and nothing parses generated Go. A
  case sqlc itself refuses (the corpus carries deliberately invalid ones)
  holds `{"error": …}` instead, so the refusal set is part of the vendored
  state.

## What was not

`mysql/` and `sqlite/` variants (different engines), and the generated
`go/` directories (superseded by `expected.json`; the Go types are a lossy
projection of the same IR).
Queries using sqlc-isms (`@name` params, `sqlc.arg/narg/embed/slice`) are
vendored as-is but SKIPPED by the suite — they are not valid PostgreSQL and
PREPARE is the gate. Schemas needing extensions load the contrib set the
installed PGlite ships (`uuid_ossp`, `pgcrypto`, `ltree`, `pg_trgm`,
`citext`); the one `vector` schema stays excluded (separate package, one
case).

## What is OURS, inside these directories

Two files per case are NOT vendored and must survive a refresh:

- `data.sql` — the data state sqlc does not ship, applied after `schema.sql`
  inside the case's transaction. Without it the suite can judge shape and
  validity but never soundness, because a zero-row execution asserts nothing.
- `adjudication.json` — the conclusion that state supports: the bindings, and
  per disagreeing column a disposition. It records `adjudicatedAgainst`, the
  sqlc release the reasoning was done against, and the suite fails when that
  parts from `SQLC_VERSION`.

`tickets/` at the corpus root is ours too: the upstream issue drafts the
dispositions point at. `docs/sqlc-disagreements.md` is GENERATED from all of
this by `tests/probe/sqlc-register.ts` and is not a source of truth.

## Refreshing

Deliberate act, not automation: re-extract the testdata from the new
release tag (`git archive`), re-run the vendoring **copying only the vendored
names over** (`schema.sql`, `query.sql`, `sqlc.json`/`sqlc.yaml`) so each
case's `data.sql` and `adjudication.json` stay, bump `SQLC_VERSION` in
`tests/unit/query/sqlc-corpus.ts`, re-run
`tests/probe/sqlc-extract-expected.ts` (requires a Go toolchain), then bump
the tag and commit recorded here and re-run the suite — the pins say what
changed.

The suite will then fail on every case whose `adjudicatedAgainst` still names
the old release. That is the point: a conclusion is only about the IR it was
drawn against, and re-reading it is the work a refresh creates. Re-run the
states, re-read the entries, bump `adjudicatedAgainst`, regenerate the
register. The corpus is judged against
PostgreSQL (validity, shape, EXPLAIN census, refusal/crash pins), never
against sqlc's expectations; those feed the disagreement register only.
See `docs/witness-coverage.md`, "Borrowed corpora".
