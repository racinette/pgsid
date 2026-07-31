# postgres-language-server: salvage notes

## What this document is

Observations from reading `postgres-language-server` (checked out at
`../postgres-language-server` in this workspace) during the 2026-08
differential-oracle assessment. The verdict for that purpose — no comparable
nullability analysis, nothing to differentially test against — is recorded in
`docs/deferred-tasks.md`. This document keeps the other half of what the
reading produced: pgsid is itself a language server (the LSP dependencies are
in `package.json`; nothing imports them yet), and several of their
architectural decisions answer problems we will hit when that surface gets
built. Paths below point into the workspace checkout.

## The dual-parser architecture — the important one

They run two parsers side by side, and the reason applies to us verbatim:
**libpg_query only parses complete, valid SQL, and an editor's primary state
is incomplete SQL.** A user mid-keystroke has `SELECT id, | FROM t` in the
buffer; the real grammar rejects it, and completions must work exactly then.

Their split:

- **Authoritative parse** — a vendored libpg_query behind
  `crates/pgls_query/` (they in-tree'd what the `pg_query` crate used to
  provide, honoring `LIBPG_QUERY_PATH`). Everything correctness-flavoured
  hangs off this tree.
- **Error-tolerant parse** — a bespoke tree-sitter grammar,
  `crates/pgls_treesitter_grammar/`, self-described as "specifically designed
  … tailored to provide autocompletions", plus a hand-written lexer
  (`crates/pgls_lexer`, `crates/pgls_tokenizer`). The tree-sitter side never
  answers semantic questions; it exists to know *where the cursor is* — which
  relation, which alias scope, which clause — on broken input. Its query
  captures (`crates/pgls_treesitter/src/queries/`: `select_columns.rs`,
  `relations.rs`, `table_aliases.rs`, `where_columns.rs`) feed unordered hash
  sets consumed by completion ranking, and nothing else trusts them.

The lesson for pgsid: our nullability walk and catalog machinery all assume
the libpg_query AST, and that is correct — but a completions feature cannot
be built on it, and we should decide *deliberately* what the error-tolerant
layer is (tree-sitter's existing SQL grammar, their grammar, a
last-good-parse cache, or token-level heuristics) rather than discovering the
problem mid-implementation. A last-good-parse cache plus token context may go
a long way given we already re-analyze on every change (`src/engine.ts`).

## Statement splitting as a standalone component

`crates/pgls_statement_splitter/` finds statement boundaries without a full
parse (it understands just enough — including `WITH`/set-operation headers in
`splitter/dml.rs` — to split reliably on broken input). Everything downstream
operates per-statement. pgsid's fixture and migration files are multi-
statement too; when the LSP arrives, per-statement incrementality (re-analyze
only the statement containing the edit) will want exactly this component, and
it is the kind of thing worth doing early because diagnostics ranges, caches,
and cursor mapping all key off it.

## The live-PREPARE harness, in production form

`crates/pgls_typecheck/src/lib.rs` is the productionized version of what our
test suites do against PGlite — worth reading before we ever point pgsid at a
user's real database:

- `SET search_path TO …` per connection before checking.
- `close_on_drop` on prepared statements to defeat server-side plan caching —
  a failure mode our fresh-PGlite-per-state pattern never exposes.
- `crates/pgls_typecheck/src/diagnostics.rs` maps PostgreSQL's error *cursor
  position* back to a source range in the original document — we will need
  precisely this to turn engine/PREPARE errors into squiggles.
- `crates/pgls_typecheck/src/typed_identifier.rs` substitutes SQL-function
  parameters with **typed default literals** so function bodies can be
  PREPAREd — the same problem our `@args` literal substitution solves for
  unconstrained `$n`, solved from the type side instead of the value side.
  If we ever check function bodies standalone, compare the two approaches.

(Their docs say typecheck works "via EXPLAIN"; the code uses PREPARE. Trust
the code.)

## Schema cache and what it powers

`crates/pgls_schema_cache/` snapshots the catalog into memory (the
`is_nullable` field is a straight `pg_attribute.attnotnull` passthrough —
`queries/columns.sql`), and completions/hover run entirely off the cache:
`crates/pgls_completions/src/providers/columns.rs` iterates *every* column in
the cache and ranks by relevance rather than resolving scope first. Crude,
but instructive: with an error-tolerant context giving only "these relations
are mentioned", rank-everything beats resolve-precisely. pgsid's
`snapshotCatalog` is already this cache in miniature; the note is that hover
and completions need nothing deeper to start.

## A catalogue of DDL lint ideas

`crates/pgls_analyser/src/lint/safety/` holds 52 migration-safety rules
(`banDropColumn`, `preferTimestamptz`, `requireConcurrentIndexCreation`,
`adding_not_null_field`, …) with a suppressions system
(`crates/pgls_suppressions/`). None of it overlaps our engine's territory —
it is DDL/migration hygiene — which is exactly why it is a ready-made feature
inventory if pgsid ever wants lint rules on migration files, which our
watcher (`src/engine.ts`) already classifies as a distinct file type.

## plpgsql_check integration parallel

`crates/pgls_plpgsql_check/src/lib.rs` runs the `plpgsql_check` extension
against a live database inside a rolled-back transaction. We run the same
extension inside PGlite. Same tool, two transports — theirs is the reference
if pgsid ever offers checking against a user's real server.

## What not to copy

Their semantic model is "ask the server": every question about a query's
meaning is answered by a live PostgreSQL, so they can never say anything a
server round-trip cannot — no offline analysis, no per-column nullability, no
input contracts. That gap is precisely pgsid's reason to exist. The salvage
here is their *editor plumbing*, not their analysis — take the harness, the
splitter, and the dual-parser lesson; the semantics stay ours.
