# Design: pgsid — Standalone Postgres Language Server and CLI (PGlite-first)

## Goal

**pgsid** is a **single-process** tool that is both a **language server** and a **CLI** (CI/CD-friendly) and:

1. Loads a SQL schema from configured file(s) / globs into an **in-process** Postgres engine.
2. Speaks LSP so IDEs and LLM agents can attach; the same binary runs headless checks/codegen in pipelines.
3. Typechecks live SQL (`sql.paths`) and schema/migration apply against that catalog (including **plpgsql_check by default**).
4. Optionally regenerates **TypeScript schema types, query types, and driver wrappers** when the catalog or query sources change.

**Project direction (beyond strict MVP):** a **lint rule system** with first-class access to (a) the live catalog / a TypeScript object tree of the schema and (b) ASTs for every SQL file — unusually strong context for writing SQL linters. **Later:** multi-language codegen and more specific ORM emit targets.

Constraints:

- No external / “dummy” Postgres server.
- No TCP/Unix socket bridge to the engine.
- One distributable runtime (Node/Bun), with WASM assets bundled as resources—not a multi-binary orchestration story.

## Prerequisites

- `plpgsql_check` **is available as a PGlite extension** (WASM side-module bundle loadable via PGlite’s extension API), matching the engine’s Postgres major.

## Decision summary

| Decision                 | Choice                                             | Rationale                                                                  |
| ------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------- |
| Host language            | **TypeScript** (Node or Bun)                       | PGlite's maintained embed host is TS; in-process API avoids sockets.       |
| Config format            | **YAML** (`yaml` pkg)                              | Comments, lists, less noise than JSON.                                      |
| Config validation        | **zod**                                            | Typed config object; single source of truth for the schema.                |
| Engine                   | `@electric-sql/pglite` **pool**                    | Cheap create/tear-down; multiplex checks across identical snapshots.       |
| Engine abstraction       | **`PgEngine` interface**                           | Decouples pool from concrete `PGlite`; future `PGliteWorker` drop-in.      |
| Pool model               | **Generation/epoch swap**                          | Only current generation serves checks; stale instances drain + close.      |
| Schema input             | **`schema`: string \| string[]**                   | Paths/globs/`!` negation; one file or migrations = ordered UP apply chain. |
| Preprocess               | **`preprocess.strip.{dml,do}`**                    | Schema-only catalog; steer ambiguous `DO` blocks.                          |
| Statement splitting      | **`libpg-query@pg18` scan/split**                  | Accurate boundaries; PG18 build pinned to match PGlite.                    |
| Change detection         | **AST-hash per file**                              | Cosmetic edits (whitespace, comments, keyword case) don't trigger rebuilds.|
| Schema cache             | **`dumpDataDir` in `.pgsid/cache/`**               | Keyed on `orderedAstHashes ‖ configFingerprint`; not SQL `pg_dump`.        |
| Migration validation     | **Sequential txn apply; halt on failure**         | Stop at first failing stmt (txn poisoned) → first failing file; no partial catalog. |
| Live SQL check           | **Always PREPARE**; **`plpgsql` default on**       | Per-statement PREPARE; continue after errors; toggle plpgsql_check via `sql.typecheck.plpgsql`. |
| `searchPath`             | **Default `["public"]`**, `SET LOCAL` per check    | Unqualified-name policy; `SET LOCAL` inside txn auto-reverts on ROLLBACK.  |
| Functions                | **In schema/migrations only**                      | No schema `functions.ts` wrappers; call via sqlc queries.                  |
| TS codegen               | **`sql.codegen.typescript`**                       | Schema types + query types + optional wrappers; FE/BE split supported.     |
| Codegen driver target    | **`pg` only (MVP)**                                | `target` enum; `postgres` added later without config migration.            |
| Query convention         | **`sqlc`** (`:one` / `:many` / `:exec`)            | Extensible later; MVP ships this convention only.                          |
| Distribution             | **`pgsid`: LSP + CLI one binary**                  | Embed in CI/CD (`pgsid check`, codegen, …) without a separate daemon.      |
| Architecture             | **Four disjoint components**                        | FS Tracker, Engine, LSP Adapter, CLI — communicate only via events.       |
| Engine                   | **One system (pool + schema-apply + typecheck)**   | Owns file map, pool, state machine; too tightly coupled to separate.      |
| Event vocabulary         | **`FileChangeEvent` + `DiagnosticEvent`**          | Two disjoined event types across two boundaries; no unification.          |
| Schema failure behavior  | **Clear query diagnostics, no partial catalog**    | On failure: emit diagnostics on failing migration, clear all query diags, pool has no generation. |
| LSP library              | **`vscode-languageserver`** + textdocument         | VSCode-first; stdio transport.                                             |
| Query cancellation       | **No WASM-level cancel**                           | "Cancel" = discard stale-generation results; PREPARE is sub-100ms.         |
| Testing                  | **E2E-first**                                      | Real Engine + pool + FS Tracker harness; unit tests for pure pieces.      |
| Completions / hover      | **Out of scope (MVP)**                             | —                                                                          |
| Lint rule framework      | **Project goal** (post-MVP)                        | Catalog object tree + per-file ASTs = high-leverage lint context.          |
| Multi-lang / ORM codegen | **Future**                                         | More codegen languages; ORM targets beyond raw `pg` / `postgres`.          |

## Architecture

Four disjoint components communicating only via events — no shared mutable state.

```
┌──────────────┐                    ┌─────────────────────────────────────────┐                    ┌──────────────────┐
│  FS Tracker  │                    │  Engine (one system)                    │                    │  LSP Adapter     │
│              │  FileChangeEvent  │                                         │ DiagnosticEvent   │  (publishDiag)   │
│  - raw FS    │───────────────────►│  ┌─────────────┐  ┌─────────────┐       │───────────────────►│                  │
│    watcher   │                    │  │ File map    │  │ PGlite pool │       │                    └──────────────────┘
│  - LSP       │                    │  │ (path→text, │  │ (gen/epoch) │       │                    ┌──────────────────┐
│    didChange │                    │  │  statements,│  │             │       │                    │  CLI             │
│    didSave   │                    │  │  astHash)   │  │             │       │                    │  (collect, exit) │
│  - AST dedup │                    │  └─────────────┘  └─────────────┘       │                    └──────────────────┘
│  - tip/retro │                    │  ┌─────────────┐  ┌──────────────┐      │
│    classify  │                    │  │ Snapshot    │  │ Internal     │      │
│  - debounce  │                    │  │ cache       │  │ loop (state  │      │
│              │                    │  │ (.pgsid/)   │  │ machine)     │      │
└──────────────┘                    │  └─────────────┘  └──────────────┘      │
       ▲                            │                                         │
       │ didChange/didSave          │  Schema apply + Typecheck (PREPARE,     │
       │                            │  plpgsql_check) share the pool + file   │
┌──────────────┐                   │  map — too tightly coupled to separate.│
│  LSP Adapter │                   └─────────────────────────────────────────┘
│  (forward)   │
└──────────────┘
```

**Note:** the LSP Adapter appears twice — once as a producer (forwarding `didChange`/`didSave` to the FS Tracker) and once as a consumer (receiving `DiagnosticEvent`s from the Engine). Two separate channels, no shared state.

### Components

1. **FS Tracker** — merges raw filesystem events and LSP `didChange`/`didSave` notifications. Owns: glob patterns, AST-hash map (dedup), tip/retro classification, debounce policy. Emits `FileChangeEvent`s. Reads nothing from outside (resolves globs itself for tip classification). See [FS Tracker](#fs-tracker).
2. **Engine** — one system: owns the file map (`{path → {text, statements, astHash}}`), the PGlite pool (generation/epoch), the snapshot cache, the schema-apply pipeline, and the typecheck pipeline. Has an internal loop (state machine) that consumes `FileChangeEvent`s, coalesces them, dispatches workers, and emits `DiagnosticEvent`s. Does not access the filesystem (computes migration order from config globs + known paths). See [Engine](#engine).
3. **LSP Adapter** — stdio LSP server. As a **producer**: forwards `didChange`/`didSave` to the FS Tracker. As a **consumer**: subscribes to `DiagnosticEvent`s and calls `publishDiagnostics`. No completions/hover in MVP.
4. **CLI** — the `pgsid` binary/entry: headless `check`, codegen for CI/CD (exit codes, machine-readable diagnostics). Pushes a control signal to the Engine, calls `drainUntilIdle()`, collects diagnostics, exits.
5. **libpg-query** (`@pg18`) — statement **scan/split** (tracking byte offsets), top-level statement classification for preprocess, and AST production for change detection. Used by both the FS Tracker (AST-hash dedup) and the Engine (split + typecheck).
6. **Logger** — structured log interface (no-op default); single seam at the Engine's internal loop for observability.

---

## FS Tracker

Merges raw filesystem events (from `chokidar`/`node:fs`) and LSP `didChange`/`didSave` notifications into a unified `FileChangeEvent` stream. Owns: glob patterns, AST-hash map (dedup), tip/retro classification, debounce policy. Does not access the pool or any Engine state.

**Responsibilities:**

1. **Initial scan:** scans `schema` and `sql.paths` globs. For migrations, emits a single batch `{source: 'migrations-discovered', files: [...]}` (the full ordered list). For queries, emits individual `{source: 'query', event: 'discovered', ...}` per file.
2. **AST-aware dedup:** on every change (raw FS or LSP), parses the file and computes an AST hash. If the hash matches the previous hash for that path, suppresses the event (cosmetic edit — whitespace, comments, keyword case).
3. **Tip/retro classification:** resolves the schema globs to determine which migration is the tip (last in sorted order). Applies the debounce policy:
   - `didChange` on the **tip** migration → debounce ~500ms → emit `FileChangeEvent`.
   - `didChange` on a **retro** migration → suppress (wait for `didSave`).
   - `didSave` on any migration → emit immediately.
   - `didChange` on a query → debounce ~150ms → emit.
   - Raw FS write (always "saved") → emit immediately.
4. **Merge:** both raw FS events and LSP events feed into the same dedup + debounce pipeline. The Engine never knows whether a `FileChangeEvent` came from the filesystem or the editor.

**Why tip/retro is internal to the FS Tracker:** the Engine treats all migration events identically (rebuild the schema). The tip/retro distinction only affects *when* the event is emitted (debounce policy), which is the FS Tracker's concern. The event `source` field is `'migration'` — no tip/retro in the event type.

The FS Tracker maintains its own set of known migration paths to compute the tip. When files are created/deleted, it re-evaluates. This is independent from the Engine's own ordering (both read the same config globs; acceptable duplication — different purposes).

---

## Engine

One system: schema-apply + typecheck + pool + file map + internal loop. These are too tightly coupled to separate — a typecheck needs the current pool generation; a schema build bumps the generation; both need the file map.

**Event vocabulary (input):**

```ts
type FileChangeEvent =
  | { source: 'migrations-discovered'; files: { path: string; text: string }[] }
  | { source: 'migration' | 'query'; event: 'discovered' | 'modified'; path: string; text: string }
  | { source: 'migration' | 'query'; event: 'deleted'; path: string }
```

- `migrations-discovered` — the full ordered batch (initial scan or config-change re-scan). Receiving it means the Engine has the complete migration set and can build. This replaces individual migration discoveries (which are useless — the Engine needs the full sequence to build).
- `discovered` (individual) — a single file is now present. For migrations: add to set, rebuild. For queries: add to buffer, typecheck when pool ready.
- `modified` — content changed. Update file, rebuild (migrations) or re-typecheck (queries).
- `deleted` — file gone. Remove from set, rebuild (migrations) or clear diagnostics (queries).

**Event vocabulary (output):**

```ts
type DiagnosticEvent = { event: 'diagnostics'; path: string; diagnostics: Diagnostic[] }
```

One shape: "here are the current diagnostics for file X." Empty array = clear. The downstream consumer (LSP adapter, CLI) does one thing: replace the diagnostics for `event.path`. Whether they came from PREPARE, plpgsql_check, or a migration apply failure is encoded in `diagnostic.source`, not in the event type.

**Internal loop (state machine):**

```
                  ┌──────────┐
           ┌──────│  IDLE    │◄──────────────────────────┐
           │      └──────┬───┘                            │ all query buffers
           │             │ query event                    │ drained
           │             ▼                                │
           │      ┌──────────────┐                        │
           │      │TYPECHECKING  │────────────────────────┘
           │      └──────┬───────┘
           │             │ migration event
           ▼             ▼
  ┌────────────┐  ┌──────────────┐
  │ DISCOVERING│─►│SCHEMA_BUILDING│
  └────────────┘  └──────┬───────┘
                         │ worker: schema-built (success)
                         ▼
                  ┌──────────────┐
                  │ POOL_SWAPPING │
                  └──────┬───────┘
                         │ worker: pool-swapped
                         ▼
                  ┌──────────────┐
                  │TYPECHECKING  │
                  └──────────────┘
```

- `DISCOVERING`: collecting `migrations-discovered` + query `discovered` events. On receiving the migration batch → transition to `SCHEMA_BUILDING`.
- `SCHEMA_BUILDING`: builder instance applies migrations. `schemaRebuildPending = true` — no new query typechecks dispatched. On success → `POOL_SWAPPING`. On failure → emit diagnostics on failing migration, clear all query diagnostics, pool has no generation, back to `IDLE` (or `SCHEMA_BUILDING` if another migration event is pending).
- `POOL_SWAPPING`: creating N fresh PGlite instances from the snapshot. On complete → `TYPECHECKING`.
- `TYPECHECKING`: draining dirty query buffers — dispatching typechecks to the pool. On all-drained → `IDLE`.
- `IDLE`: waiting for events. On query event → `TYPECHECKING` (just the affected buffer). On migration event → `SCHEMA_BUILDING`.

**Query file coalescing:** the Engine maintains `Map<path, {text, dirty: boolean}>` per query file. Multiple rapid edits to the same file just overwrite the buffer — only the latest content survives. `deleted` removes the buffer and emits `{path, diagnostics: []}`. No `setTimeout` debounce; coalescing is structural.

**Migration coalescing:** any migration event sets `schemaRebuildPending = true`. No new query typechecks are dispatched while pending. The rebuild uses the latest file map state (which includes all edits). One outstanding schema rebuild at a time.

**Worker completion is internal:** workers report back to the Engine's loop via an internal completion queue (not the `FileChangeEvent` stream). The loop processes both external events and internal completions. Idle = input queue empty + no dirty buffers + no in-flight workers.

**Engine does not access the filesystem.** It maintains the set of known migration paths (from events) and computes the order itself (config glob ordering + lexicographic sort). The FS Tracker independently does the same for tip classification. Acceptable duplication — different purposes.

**`drainUntilIdle()`** — a primitive the CLI uses: push control signal, wait for the Engine's queue + buffers + workers to all reach idle, collect diagnostics, exit.

---

## PGlite pool model

The pool is owned by the Engine. It's the resource manager for PGlite instances; the Engine's internal loop decides when to acquire and swap.

**Core invariant:** at any instant, `pool.current` is a set of N PGlite instances all carrying exactly the same catalog snapshot, tagged with `generation = G`. Only `pool.current` serves check requests. Stale instances drain (finish in-flight work) then close.

**Build → swap protocol:**

1. Schema rebuild computes the new catalog in a _builder_ PGlite (a throwaway instance, not from the pool). Applies files txn-by-txn, `CREATE EXTENSION plpgsql_check` first. On success: `dumpDataDir('gzip')` → `snapshot`.
2. Bump `targetGeneration = G+1`. Spin up N fresh PGlite instances with `loadDataDir: snapshot` + the `plpgsql_check` extension (`loadDataDir` rehydrates extension state; no re-`CREATE EXTENSION` needed).
3. Atomic swap: `pool.current = { generation: G+1, instances }`. The previous `current` becomes `draining`.
4. New acquires go to the new generation. In-flight acquires on the old generation finish (PGlite checks are fast; we don't interrupt WASM mid-query).
5. Once `draining` has zero in-flight, close those instances.

**Acquire/release contract:**

```
acquire(): { generation, instance, release() }
```

The caller checks `generation === pool.current.generation` before using the result; if mismatched, discard (the check ran against a stale catalog). Per-instance hygiene: every check runs in a `BEGIN…ROLLBACK` txn with `SAVEPOINT` per PREPARE, so `SET LOCAL`, prepared statements, and `CREATE OR REPLACE FUNCTION` (plpgsql_check) are all discarded. `DEALLOCATE ALL` runs before `ROLLBACK` to clean up session-scoped prepared statements.

**On schema failure (no partial catalog):** the builder is closed, the pool is **not** swapped. The previous generation, if any, is **dropped** — the pool has no generation. The Engine emits diagnostics on the failing migration file and `{diagnostics: []}` for every query file (clear all). No typechecks run until the schema is fixed. This avoids state inconsistency: at runtime, a broken schema means no typechecks; on reboot, the cache misses (AST hashes changed) → failed rebuild → no pool → cleared diagnostics. Same state. Keeping a previous-good generation would be mildly useful (stale-but-valid query checkmarks) but mostly confusing (inconsistent between runs).

**`PgEngine` interface** sits in front of the concrete `PGlite` so a future `PGliteWorker` (PGlite in a `worker_threads` thread) is a drop-in. MVP runs main-thread PGlite; checks are sub-100ms with an empty catalog.

**Pool size:** default 2 (`engine.poolSize`). Concurrency beyond N queues at the Engine's loop level. PGlite instances are single-connection; `acquire()` serializes via a free-list of idle instances.

**Snapshot cache** is internal to the schema-apply module. The Engine calls `applySchema({files, config, cacheDir})` and gets back `{snapshot, success, diagnostics}`. Whether the snapshot came from cache or a fresh build is invisible to the Engine. Cache key = `orderedAstHashes ‖ configFingerprint`; stored as `.pgsid/cache/<hash>.bin.gz`. Only successful full builds are cached.

---

## AST-hash change detection

Both the FS Tracker (for dedup) and the Engine (for cache keys) use AST hashing:

1. Parse text → AST (libpg-query). On parse failure, `ast = null`, `astHash = null` → treat as "definitely changed."
2. Canonicalize the AST for hashing (strip location/position fields, strip comments, normalize semantically-unordered lists).
3. `astHash = sha256(canonicalAst)`.
4. Compare to the previous `astHash` for this path. Unchanged → cosmetic edit (whitespace, comments, keyword case) → suppress (FS Tracker) or skip re-PREPARE (Engine).

**FS Tracker dedup:** on every raw FS or LSP change, parses the file and computes the AST hash. If it matches the previous hash for that path, suppresses the `FileChangeEvent` entirely. The Engine never sees cosmetic edits.

**Engine cache key:** `orderedAstHashes ‖ configFingerprint` — so format-on-save and comment edits that do slip through (e.g., from the raw FS watcher) don't invalidate the snapshot cache.

**Engine query typecheck skip:** if a query file's AST hash hasn't changed, the Engine skips re-PREPARE and doesn't republish diagnostics (avoids IDE flicker).

---

## Schema sources

`schema` resolves to an ordered list of `.sql` files (UP-only). A single dump and a migrations folder are the same pipeline.

**Shape:** `string | string[]` (YAML scalar or list). Globs + `!` negation; multimatch-style.

**Resolution:**

1. Normalize to a list.
2. For each entry in order: expand positive globs (lexicographic sort per expansion), append unique paths; apply `!` negations.
3. Empty / missing file → fail boot.
4. Group order matters: `[migrations2/*.sql, migrations/*.up.sql]` = all of `migrations2` (sorted), then matching `migrations/*.up.sql` (sorted).

No custom migrator format drivers. Exclude downs with `!*.down.sql` / `!U*.sql` as needed.

---

## Schema build pipeline

For each resolved file, in order:

1. Split (libpg-query).
2. **Preprocess** (`preprocess.strip`):

- Allowlist schema DDL + `SET` (esp. `search_path`).
- Keep whole `CREATE FUNCTION` / views / etc.; do not inspect bodies.
- `strip.dml: true` → drop `INSERT`/`UPDATE`/`DELETE`/`COPY`/`TRUNCATE`/…
- `strip.do: true` → drop `DO` blocks (warn when ambiguity matters).
- Strip `CONCURRENTLY` on supported DDL so the file can run in a transaction (optional hint).

3. Apply file in a **transaction**.
4. On failure → rollback the file's txn (Postgres poisons the txn after an error; subsequent statements would fail too), emit a diagnostic on the failing statement, and **halt the chain**. The pool is **not** swapped to a partial catalog. The Engine emits diagnostics on the failing migration file and `{diagnostics: []}` for every query file (clear all). No typechecks run until the schema is fixed. Files after the failing one are not attempted. The diagnostic on the failing file makes clear: "migration chain halted here; subsequent migrations not applied."
5. On success of full chain → `dumpDataDir` cache.

**Cache key:** `orderedAstHashes ‖ configFingerprint` (`preprocess`, `schema` patterns, PG major, extensions, plpgsql_check on/off). Stored as `.pgsid/cache/<hash>.bin.gz`. Using AST hashes (not raw content) means cosmetic edits don't invalidate the cache. Only successful full builds are cached — no partial snapshots.

**Boot:** `migrations-discovered` → cache hit/miss → pool swap (generation++) + `plpgsql_check` loaded → ready; typecheck all discovered queries. See [PGlite pool model](#pglite-pool-model).

---

## Live SQL (`sql`)

`sql.paths` — files analyzed as **current** SQL against the catalog (queries). Not the migration apply chain.

**Always typecheck** open/`sql.paths` files via **PREPARE** (and related analyze). There is no supported “LSP on, typecheck off” mode in MVP.

**`plpgsql_check` is on by default** (extension loaded; PL/pgSQL analyzed). The `sql.typecheck` object is reserved for future knobs; today:

```yaml
sql:
  typecheck:
    plpgsql: true # default; set false to disable plpgsql_check only
```

Omit `sql.typecheck` → same as `sql.typecheck.plpgsql: true`.

**`searchPath`:** default `["public"]`. Ordered unqualified-name resolution for live SQL. Listing schemas from PGlite does not define this policy (order / subset / ambiguity).

### Per document (debounced)

Each statement is typechecked independently; a failing PREPARE in statement 3 does not poison statement 4 (savepoints). Continue and collect all diagnostics.

1. Split via libpg-query (tracking byte offsets for diagnostic ranges).
2. Acquire instance from pool (generation G).
3. `BEGIN; SET LOCAL search_path = <config>;`
4. For each statement: `SAVEPOINT s_n; PREPARE p_n AS <stmt>` → on error, `ROLLBACK TO s_n` (un-aborts the txn), map `err.position` (1-based into prepared text) to a file offset → diagnostic. Continue to next statement.
5. Unless `sql.typecheck.plpgsql: false`, for each `CREATE FUNCTION … LANGUAGE plpgsql`: `SET LOCAL check_function_bodies=off`, `CREATE OR REPLACE`, `SELECT plpgsql_check_function(..., format:='json')` → diagnostics.
6. `DEALLOCATE ALL` (prepared statements are session-scoped, not txn-scoped — `ROLLBACK` alone doesn't clean them up).
7. `ROLLBACK` (discards `SET LOCAL`, the created function, savepoints).
8. Release instance. If `pool.current.generation !== G`, discard results (schema changed under us).
9. Emit `DiagnosticEvent` for this file.
10. If codegen enabled for that file → refresh query types [/ wrappers].

**Why a txn for read-only PREPARE?** (a) `SET LOCAL` requires a txn to scope `search_path` per check without leaking to the next check on the pooled instance; (b) `ROLLBACK` cleans up created functions and savepoints; (c) parity with the plpgsql_check flow (one code path). **Savepoints** ensure a failed PREPARE doesn't abort the txn — without them, PostgreSQL poisons the txn after any error and all subsequent commands fail. **No `statement_timeout`:** PREPARE is parse+analyze+plan only — it doesn't execute, so there's nothing to time out (the catalog is schema-only, no rows).

---

## CLI (CI/CD)

The same `pgsid` package/binary exposes a **CLI** so pipelines do not need an editor or long-running LSP:

- **`pgsid check`** — build/load schema, typecheck `sql.paths` (plpgsql on by default), non-zero exit on errors; optional machine-readable report later.
- **`pgsid generate`** — run TypeScript (and later other) codegen from the same config.
- Shared config discovery with the language server.

LSP and CLI share the Engine. The CLI pushes a control signal to the Engine, then calls **`drainUntilIdle()`** and collects `DiagnosticEvent`s. Same Engine code path as LSP; different transport.

---

## Linting (project goal)

Not MVP, but a first-class **direction**: custom and built-in SQL lint rules with context most linters lack—

1. **Live catalog** (and/or a structured TypeScript object tree of the schema from the same IR used for codegen).
2. **ASTs** for every SQL file (trees already obtained for split/checks).

That combination makes schema-aware and migration-aware rules far cheaper to author than text-only or parser-only linters. Keep the core IR so a future lint plugin API can consume it without a second schema pipeline.

---

## TypeScript codegen

Nested under `sql.codegen` by language (multi-language later). **Driver target: `pg` only in MVP** (the `target` field is an enum; `postgres` is added later without a config migration).

### Schema types (`codegen.typescript.schema`)

From the catalog (full build):

- Tables/views with `NOT NULL` / `DEFAULT` / `GENERATED` → `InferSelect` / `InferInsert` / `InferUpdate`
- Enums
- Domains as **string-literal brands** (configurable keys; value = schema-qualified name, e.g. `public.user_id`)
- **No** function wrappers — call functions through sqlc query files

Layout under `schema.outDir`:

```text
outDir/
  helpers.d.ts
  public/
    index.ts          # per-schema barrel only (no repo-root mega-barrel)
    tables.d.ts
    enums.d.ts
    domains.d.ts
  billing/
    index.ts
    …
```

### Query codegen (`codegen.typescript.queries`)

- **Convention:** `sqlc` only in MVP (`:one` / `:many` / `:exec`).
- `:one` → `T | undefined` (missing row = `undefined`; SQL NULL stays `null` in fields).
- `:many` → `T[]`.
- `:exec` → `void` (or minimal exec result later).
- `.d.ts` / `.ts` **mirror source** relative to the matched `out` source root.

`queries.out` maps a source root to either:

| Form                   | Meaning                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| `string`               | **Collocated** types + wrappers in the same `.ts` tree under that dest       |
| `{ types, wrappers? }` | **Split** — types (`.d.ts`) and optional wrappers (`.ts`) to different roots |

Rules:

- Typecheck all `sql.paths`; codegen only files under an `out` key (minus `exclude`).
- Unmapped paths (e.g. bare `app/*.sql`) → typecheck only.
- Wrappers **import** query types when split; never duplicate type declarations.
- Omit wrappers (split without `wrappers`, or no `queries` block) → types-only / Kysely-friendly.
- Wrappers without a types destination (when not collocated) → invalid config.

### Type mappings

Resolution: **column → domain brand → enum →** `pgType` **→ driver default**.

```yaml
typeMappings:
  pgType: { int8: bigint, numeric: string }
  column: { public.users.metadata: 'import("../../user-meta").UserMeta' }
```

Emit-time only; runtime driver parsers remain the app’s job.

### Regeneration

- Schema rebuild → schema types (+ pool swap).
- Query file change → that query's types/wrappers (if mapped).
- Codegen failure must not block diagnostics.

### Write-back & determinism

- **Atomic writes:** tmp file + rename; never partial output visible to readers.
- **Skip-if-unchanged:** byte-compare before writing; avoids needless IDE reload churn.
- **No open-editor detection in MVP** (deferred).
- **Determinism:** sort schemas/tables/columns/enums by qualified name; stable, deduped imports; no timestamps or random ids. Snapshot tests assert byte-equality across runs.
- **Cross-file imports:** an `ImportCollector` dedupes `typeMappings.column` import specs (e.g. `'import("../../user-meta").UserMeta'`) per generated file and emits `import` statements at the top.

---

## Configuration

Primary file: **`pgsid.yaml`**. Parsed with `yaml`; validated with a **zod** schema that produces a typed config object.

```yaml
schema:
  - migrations/*.up.sql
  - "!migrations/*_test.up.sql"

preprocess:
  strip:
    dml: true
    do: true

engine:
  poolSize: 2

sql:
  paths:
    - sql/queries/**/*.sql
    - sql/collocated/**/*.sql
    - app/**/*.sql
  searchPath:
    - public

  typecheck:
    plpgsql: true # default when omitted; set false to disable plpgsql_check only

  codegen:
    typescript:
      target: pg
      convention: sqlc
      brands:
        - __brand
      typeMappings:
        pgType:
          int8: bigint
          numeric: string
        column:
          public.users.metadata: 'import("../../user-meta").UserMeta'
      schema:
        outDir: packages/db-types/src/schema
      queries:
        exclude:
          - "**/*_test.sql"
          - "**/_*.sql"
        out:
          sql/queries:
            types: packages/db-types/src/queries
            wrappers: apps/api/src/db/queries
          sql/collocated: apps/api/src/db/queries-and-types
```

---

## Out of MVP

Desirable or worth a later design pass, but **not** in the first ship:

- Editor niceties: autocompletion, hover, formatting.
- **Guest-doc typechecking** (open `.sql` files not under `sql.paths`) — on-demand or via a config flag; default off.
- **Open-editor detection** for codegen write-back (skip files being actively edited).
- Down/undo migrations and custom migrator format adapters (Flyway/Prisma/Liquibase drivers, etc.).
- Codegen for composite **UDTs**; validation-library emitters (Zod/valibot, etc.) until their design is settled.
- `postgres` driver target (MVP ships `pg` only).

Rejected alternatives and operational limits are documented elsewhere in this design (e.g. strip `CONCURRENTLY`, TypeScript+PGlite host, PREPARE always on).

## Future goals

- **Lint framework** — rules over catalog IR + SQL ASTs (built-in + user plugins).
- **Multi-language codegen** — additional `sql.codegen.<lang>` emitters.
- **ORM-oriented targets** — beyond raw `pg` / `postgres` wrappers (e.g. tighter Kysely/Drizzle/etc. integration), without replacing the core IR.

---

## Dependencies (MVP)

| Package                                          | Role                                                            |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `@electric-sql/pglite`                           | In-process Postgres + `dumpDataDir` / `loadDataDir`             |
| PGlite `plpgsql_check` extension                 | PL/pgSQL analysis                                               |
| `libpg-query@pg18`                               | Split + preprocess classification + AST-hash dedup; PG18 pinned |
| `fast-glob` + `picomatch`                        | `schema` / `sql.paths` glob expansion + `!` negation matching    |
| `chokidar`                                       | Raw filesystem watching (FS Tracker)                            |
| `yaml`                                           | Config parse                                                    |
| `zod`                                            | Config validation → typed config object                         |
| `vscode-languageserver` + `vscode-languageserver-textdocument` | LSP shell (VSCode-first, stdio)                  |

---

## Risks and open work

1. ~~libpg-query ↔ PGlite version skew~~ — mitigated: `libpg-query@pg18` pinned to match PGlite's PG18.
2. Preprocess limits (`DO` / dynamic SQL) — flags + warnings.
3. Checks must not permanently mutate pool instances — mitigated: every check runs in `BEGIN…ROLLBACK` with savepoints + `DEALLOCATE ALL` (see [PGlite pool model](#pglite-pool-model)).
4. ~~Pool identity on schema reload~~ — mitigated: generation/epoch swap (atomic replace; stale instances drain).
5. Stale-result races — mitigated: generation tagging; discard if `pool.current.generation` moved.
6. ~~Debounce / check-on-idle for incomplete buffers~~ — mitigated: FS Tracker handles debounce (tip vs retro migration); Engine uses structural coalescing (per-file buffer = latest-content-wins).
7. Exact relative-path root when mirroring query outputs (longest `out` prefix match).
8. PGlite query cancellation — accepted: no WASM-level cancel; "cancel" = discard stale-generation results. PREPARE is sub-100ms (schema-only, no execution). Revisit if a pathological case appears.
9. ~~State inconsistency between runtime and reboot on schema failure~~ — mitigated: dropped furthest-correct; on failure the pool has no generation both at runtime and on reboot (cache only stores successful full builds).

---

## Implementation phases

Phases are guidelines, not gates — if a better ordering emerges, take it. The **E2E test harness is a first-class deliverable of Phase 0** and grows alongside every feature.

### Phase 0 — Spike + harness

- E2E harness: `createWorkspace(tmpDir, config, files)` with real Engine (pool + schema-apply + typecheck) and FS Tracker; actions `writeFile`/`editFile`/`deleteFile`/`waitIdle`/`getDiagnostics`/`getPoolGeneration`.
- YAML config load (zod); schema glob resolve; preprocess strip; txn apply; halt-on-failure (no furthest-correct).
- `dumpDataDir` cache round-trip (`.pgsid/cache/`).
- PREPARE + plpgsql_check diagnostics on sample `sql.paths`.
- Engine state machine + pool generation model landed early.

### Phase 1 — MVP LS + CLI

- LSP + schema watch/rebuild + pool.
- Live SQL typecheck; plpgsql_check **on by default**.
- CLI `pgsid check` (+ exit codes) for CI; shared engine with LSP.

### Phase 2 — TypeScript codegen

- Schema types (`Infer*`, brands, enums).
- sqlc queries: types / wrappers / collocated `out` forms; `:one` → `T | undefined`.
- CLI `pgsid generate`.

### Phase 3 — Polish / direction

- Filter/codegen telemetry; agent JSON API.
- Lint IR groundwork; Zod/valibot radar; UDT revisit.
- Later: multi-lang codegen, ORM-specific emitters.

---

## Testing strategy

**E2E-first.** The E2E harness (`createWorkspace`) is the backbone: it spins up the entire machinery (real Engine with PGlite pool, FS Tracker, schema-apply, typecheck) pointed at a temp dir of migrations/queries, then drives it with file operations and asserts on observable state after `waitIdle`. Cover as many scenarios as possible here — schema edits mid-typecheck, pool swaps, schema failure (diagnostics cleared), codegen regeneration, CLI drain.

**Unit tests** for pure pieces that are painful to test E2E: offset→LSP mapping, sqlc directive parser, type-mapping resolver, codegen output snapshots, config schema validation, AST-hash canonicalization. These run without PGlite → fast feedback.

**PGlite fixture tests** for engine-specific flows scoped to one subsystem: `dumpDataDir`/`loadDataDir` round-trip with the extension, pool generation swap, plpgsql_check txn flow.

---

## Success criteria

- One Node/Bun `pgsid` entrypoint (LSP **and** CLI); no Postgres install; no DB port.
- `schema` + `preprocess` build a cached schema-only catalog; failure clears query diagnostics and leaves the pool without a generation (consistent runtime + reboot).
- `sql.paths` get PREPARE + plpgsql_check by default (`searchPath: [public]`).
- Codegen can split FE types vs BE wrappers or collocate; no schema function wrappers.
- Schema/query edits refresh pool and generated outputs deterministically.
- CI can run `pgsid check` / `pgsid generate` without running an editor.

---

## Implementation references

| Concern                       | Where to look                                                |
| ----------------------------- | ------------------------------------------------------------ |
| PREPARE + error→diagnostic    | `postgres-language-server/crates/pgls_typecheck/`            |
| plpgsql_check txn flow        | `postgres-language-server/crates/pgls_plpgsql_check/`        |
| Statement scan/split          | `postgres-language-server/crates/pgls_statement_splitter/`   |
| Schema introspection queries  | `postgres-language-server/crates/pgls_schema_cache/src/queries/` |
| PGlite client + `dumpDataDir` | `pglite/packages/pglite/`                                    |
| Extension loading             | `pglite/docs/extensions/development.md`, `extensionUtils.ts` |
| plpgsql_check SQL API + tests | `pglite/packages/pglite-plpgsql-check/` (tests prove dump/load + pool + txn isolation) |
| plpgsql_check upstream        | `postgres-pglite/pglite/other_extensions/plpgsql_check/`     |
