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
| Preprocess               | **Strip `CONCURRENTLY` only**                     | Enables in-txn apply of CONCURRENTLY-bearing DDL (rollback safety).        |
| Statement splitting      | **`libpg-query@pg18` scan/split**                  | Accurate boundaries; PG18 build pinned to match PGlite.                    |
| Change detection         | **AST-hash per file**                              | Cosmetic edits (whitespace, comments, keyword case) don't trigger rebuilds.|
| Schema cache             | **`dumpDataDir` in `.pgsid/cache/`**               | Keyed on `orderedAstHashes ‖ configFingerprint`; not SQL `pg_dump`.        |
| Migration validation     | **Two-phase: apply + deferred validate**         | Phase 1: `check_function_bodies=off`, apply all migrations, diff `pg_proc` per-statement to track provenance (OID → file/byte-range/body). DDL/DML errors halt immediately. DO blocks validated inline via temp-function + plpgsql_check. Phase 2: query surviving `pg_proc`, run `plpgsql_check_function_tb` (plpgsql) or re-CREATE with `check_function_bodies=on` (sql) on each, collect all diagnostics. |
| Live SQL check           | **Always PREPARE**; **`plpgsql` default on**       | Per-statement PREPARE; continue after errors; toggle plpgsql_check via `sql.typecheck.plpgsql`. |
| `searchPath`             | **Default `["public"]`**, `SET LOCAL` per check    | Unqualified-name policy; `SET LOCAL` inside txn auto-reverts on ROLLBACK.  |
| Functions                | **In schema/migrations only**                      | No schema `functions.ts` wrappers; call via sqlc queries.                  |
| TS codegen               | **`sql.codegen.typescript`**                       | Schema types + query types + optional wrappers; FE/BE split supported.     |
| Codegen driver target    | **`pg` only (MVP)**                                | `target` enum; `postgres` added later without config migration.            |
| Query convention         | **`sqlc`** (`:one` / `:many` / `:exec`)            | Extensible later; MVP ships this convention only.                          |
| Distribution             | **`pgsid`: LSP + CLI one binary**                  | Embed in CI/CD (`pgsid check`, codegen, …) without a separate daemon.      |
| Architecture             | **Four disjoint components**                        | FS Tracker, Engine, LSP Adapter, CLI, Codegen — communicate only via events. |
| Engine                   | **One system (pool + schema-apply + typecheck + deps)** | Owns file map, pool, state machine, dependency graph; too coupled to separate. |
| Event vocabulary         | **`FileChangeEvent` + `EngineEvent`**               | Two boundaries; `EngineEvent` = typechecked + schema-error + schema-ready. |
| Schema failure behavior  | **Apply-phase: clear query diagnostics, no pool; Validate-phase: pool swaps, function diags emitted** | Apply failures (DDL/DML/DO): no partial catalog, pool has no generation. Validate failures (function bodies): schema committed, pool swaps, function diagnostics on the defining migration file. |
| Query signature          | **PREPARE + pg_prepared_statements + EXECUTE**      | Standard PG introspection; works for SELECT, INSERT RETURNING, etc. Always emitted. |
| Selective re-typecheck   | **Column-level dependency graph + schema diff**    | Track per-column (type, NOT NULL, DEFAULT, GENERATED). Transitive closure through functions + views. |
| Dependency extraction    | **AST walking + body parsing**                      | Query AST: column-level. SQL functions: parse body. Views: parse definition. plpgsql: statement extractor (conservative for dynamic SQL). |
| Subscriptions            | **By name, not by existence**                       | `nonexistent_table` subscribes; events arrive when the entity is created. |
| Codegen                  | **Separate consumer of `EngineEvent`s**             | Subscribes to `typechecked` (signature) + `schema-ready` (catalog). Signature comparison skips unchanged. |
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
│              │  FileChangeEvent  │                                         │ EngineEvent       │  (publishDiag)   │
│  - raw FS    │───────────────────►│  ┌─────────────┐  ┌─────────────┐       │───────────────────►│                  │
│    watcher   │                    │  │ File map    │  │ PGlite pool │       │                    └──────────────────┘
│  - LSP       │                    │  │ (path→text, │  │ (gen/epoch) │       │                    ┌──────────────────┐
│    didChange │                    │  │  statements,│  │             │       │                    │  CLI             │
│    didSave   │                    │  │  astHash)   │  │             │       │                    │  (collect, exit) │
│  - AST dedup │                    │  └─────────────┘  └─────────────┘       │                    └──────────────────┘
│  - tip/retro │                    │  ┌─────────────┐  ┌──────────────┐      │                    ┌──────────────────┐
│    classify  │                    │  │ Snapshot    │  │ Internal     │      │  typechecked      │  Codegen         │
│  - debounce  │                    │  │ cache       │  │ loop (state  │      │  (signature) ────►│  (query types +  │
│              │                    │  │ (.pgsid/)   │  │ machine)     │      │  schema-ready      │   wrappers)      │
└──────────────┘                    │  └─────────────┘  └──────────────┘      │  (catalog) ──────►│  (schema types)  │
       ▲                            │                                         │                    └──────────────────┘
       │ didChange/didSave          │  ┌──────────────────────────────────┐  │                            │
       │                            │  │ Dependency graph + subscriber idx │  │                            ▼
┌──────────────┐                   │  │ (column-level pub/sub)            │  │                    Generated .ts/.d.ts
│  LSP Adapter │                   │  │ - query AST → table/column refs   │  │
│  (forward)   │                   │  │ - function body → deps (SQL parse│  │
└──────────────┘                   │  │   or plpgsql extract)            │  │
                                   │  │ - view definition → deps         │  │
                                   │  │ - schema diff → selective re-TC  │  │
                                   │  └──────────────────────────────────┘  │
                                   │                                         │
                                   │  Schema apply + Typecheck (PREPARE,     │
                                   │  plpgsql_check, signature extraction)   │
                                   │  share the pool + file map — too        │
                                   │  tightly coupled to separate.           │
                                   └─────────────────────────────────────────┘
```

**Note:** the LSP Adapter appears twice — once as a producer (forwarding `didChange`/`didSave` to the FS Tracker) and once as a consumer (receiving `EngineEvent`s from the Engine). Two separate channels, no shared state.

### Components

1. **FS Tracker** — merges raw filesystem events and LSP `didChange`/`didSave` notifications. Owns: glob patterns, AST-hash map (dedup), tip/retro classification, debounce policy. Emits `FileChangeEvent`s. Reads nothing from outside (resolves globs itself for tip classification). See [FS Tracker](#fs-tracker).
2. **Engine** — one system: owns the file map (`{path → {text, statements, astHash}}`), the PGlite pool (generation/epoch), the snapshot cache, the schema-apply pipeline, the typecheck pipeline, the catalog snapshot (introspection result), the dependency graph (column-level pub/sub), and the subscriber index (entity → queries). Has an internal loop (state machine) that consumes `FileChangeEvent`s, coalesces them, dispatches workers, and emits `EngineEvent`s. Does not access the filesystem (computes migration order from config globs + known paths). See [Engine](#engine).
3. **LSP Adapter** — stdio LSP server. As a **producer**: forwards `didChange`/`didSave` to the FS Tracker. As a **consumer**: subscribes to `EngineEvent`s (`typechecked` + `schema-error`) and calls `publishDiagnostics`. No completions/hover in MVP.
4. **CLI** — the `pgsid` binary/entry: headless `check`, codegen for CI/CD (exit codes, machine-readable diagnostics). Pushes a control signal to the Engine, calls `drainUntilIdle()`, collects `EngineEvent`s, exits.
5. **Codegen** — a separate consumer of `EngineEvent`s. Subscribes to `typechecked` (uses `signature` for query types + wrappers) and `schema-ready` (uses `catalog` for schema types). Compares signatures to skip unchanged files. Writes generated `.ts`/`.d.ts` atomically. Never accesses the pool or Engine state. See [Codegen](#codegen).
6. **libpg-query** (`@pg18`) — statement **scan/split** (tracking byte offsets), top-level statement classification, AST production for change detection, and dependency extraction (RangeVar, ColumnRef, FuncCall walking). Used by the FS Tracker (AST-hash dedup), the Engine (split + typecheck + dependency extraction), and the codegen (not directly — it consumes signatures).
7. **Logger** — structured log interface (no-op default); single seam at the Engine's internal loop for observability.

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
type EngineEvent =
  | { event: 'typechecked'; path: string; diagnostics: Diagnostic[]; signature: QuerySignature }
  | { event: 'schema-error'; path: string; diagnostics: Diagnostic[] }
  | { event: 'schema-ready'; catalog: CatalogSnapshot; diff: SchemaDiff }
```

Three shapes, three consumers:

- **`typechecked`** — emitted for a query file after typecheck. Always carries a `signature` (return columns, parameter types, sqlc name + cardinality). The LSP adapter / CLI use `diagnostics`; the codegen uses `signature`.
- **`schema-error`** — emitted for a migration file that failed to apply. The LSP adapter / CLI use `diagnostics`; the codegen ignores this.
- **`schema-ready`** — emitted after a successful schema rebuild. Carries the full `catalog` snapshot (tables, columns, enums, domains, functions, views) and the `diff` (what changed, with old + new states). The codegen uses `catalog` for schema types; the Engine uses `diff` internally for selective re-typecheck.

Downstream consumers subscribe and pick what they need:
- **LSP adapter / CLI:** `typechecked` + `schema-error` (diagnostics only).
- **Codegen:** `typechecked` (signature) + `schema-ready` (catalog).

**Internal loop (state machine):**

```
                  ┌──────────┐
           ┌──────│  IDLE    │◄──────────────────────────┐
           │      └──────┬───┘                           │ all query buffers
           │             │ query event                   │ drained
           │             ▼                               │
           │      ┌──────────────┐                       │
           │      │TYPECHECKING  │───────────────────────┘
           │      └──────┬───────┘
           │             │ migration event
           ▼             ▼
  ┌────────────┐  ┌───────────────┐
  │ DISCOVERING│─►│SCHEMA_BUILDING│
  └────────────┘  └──────┬────────┘
                         │ worker: schema-built (success)
                         ▼
                  ┌───────────────┐
                  │ POOL_SWAPPING │
                  └──────┬────────┘
                         │ worker: pool-swapped
                         ▼
                  ┌──────────────┐
                  │TYPECHECKING  │
                  └──────────────┘
```

- `DISCOVERING`: collecting `migrations-discovered` + query `discovered` events. On receiving the migration batch → transition to `SCHEMA_BUILDING`.
- `SCHEMA_BUILDING`: `SchemaBuilder` applies migrations (phase 1: `check_function_bodies=off`, diff-based provenance) then validates functions (phase 2: deferred plpgsql_check + SQL re-CREATE). `schemaRebuildPending = true` — no new query typechecks dispatched. On apply-phase success + validate-phase success → `POOL_SWAPPING`. On apply-phase failure (DDL/DML/DO) → emit diagnostics on failing migration, clear all query diagnostics, pool has no generation, back to `IDLE`. On validate-phase failure (function body errors) → pool IS swapped (schema committed), function diagnostics emitted, → `POOL_SWAPPING` (queries can still be typechecked; broken functions will cause their own query errors).
- `POOL_SWAPPING`: creating N fresh PGlite instances from the snapshot. On complete → `TYPECHECKING`.
- `TYPECHECKING`: draining dirty query buffers — dispatching typechecks to the pool. On all-drained → `IDLE`.
- `IDLE`: waiting for events. On query event → `TYPECHECKING` (just the affected buffer). On migration event → `SCHEMA_BUILDING`.

**Query file coalescing:** the Engine maintains `Map<path, {text, dirty: boolean}>` per query file. Multiple rapid edits to the same file just overwrite the buffer — only the latest content survives. `deleted` removes the buffer and emits `{event: 'typechecked', path, diagnostics: [], signature: null}`. No `setTimeout` debounce; coalescing is structural.

**Migration coalescing:** any migration event sets `schemaRebuildPending = true`. No new query typechecks are dispatched while pending. The rebuild uses the latest file map state (which includes all edits). One outstanding schema rebuild at a time.

**Dependency graph + selective re-typecheck:** on schema rebuild success, the Engine computes a schema diff (old vs new catalog snapshot), expands the affected set transitively (through type deps, function deps, view deps), and re-typechecks only queries whose dependencies intersect the affected set. Unaffected queries keep their existing diagnostics + signatures. See [Codegen > Dependency model](#dependency-model-column-level-pubsub).

**Worker completion is internal:** workers report back to the Engine's loop via an internal completion queue (not the `FileChangeEvent` stream). The loop processes both external events and internal completions. Idle = input queue empty + no dirty buffers + no in-flight workers.

**Engine does not access the filesystem.** It maintains the set of known migration paths (from events) and computes the order itself (config glob ordering + lexicographic sort). The FS Tracker independently does the same for tip classification. Acceptable duplication — different purposes.

**`drainUntilIdle()`** — a primitive the CLI uses: push control signal, wait for the Engine's queue + buffers + workers to all reach idle, collect diagnostics, exit.

---

## PGlite pool model

The pool is owned by the Engine. It's the resource manager for PGlite instances; the Engine's internal loop decides when to acquire and swap.

**Core invariant:** at any instant, `pool.current` is a set of N PGlite instances all carrying exactly the same catalog snapshot, tagged with `generation = G`. Only `pool.current` serves check requests. Stale instances drain (finish in-flight work) then close.

**Build → swap protocol:**

1. Schema rebuild computes the new catalog in a _builder_ PGlite (a throwaway instance, not from the pool). `CREATE EXTENSION plpgsql_check` first, then `SchemaBuilder.applyMigration()` per file (phase 1: `check_function_bodies=off`, diff-based provenance tracking). After all files: `SchemaBuilder.validate()` (phase 2: deferred function validation). On success: `dumpDataDir('gzip')` → `snapshot`. On apply-phase failure (DDL/DML/DO-block): diagnostics on the failing file, halt. On validate-phase failure (function body errors): the schema IS committed (functions are valid syntax, just semantically broken); diagnostics are emitted but the pool is still swapped — the catalog is usable for query typechecking (queries that reference broken functions will get their own errors).
2. Bump `targetGeneration = G+1`. Spin up N fresh PGlite instances with `loadDataDir: snapshot` + the `plpgsql_check` extension (`loadDataDir` rehydrates extension state; no re-`CREATE EXTENSION` needed).
3. Atomic swap: `pool.current = { generation: G+1, instances }`. The previous `current` becomes `draining`.
4. New acquires go to the new generation. In-flight acquires on the old generation finish (PGlite checks are fast; we don't interrupt WASM mid-query).
5. Once `draining` has zero in-flight, close those instances.

**Acquire/release contract:**

```
acquire(): { generation, instance, release() }
```

The caller checks `generation === pool.current.generation` before using the result; if mismatched, discard (the check ran against a stale catalog). Per-instance hygiene: every check runs in a `BEGIN…ROLLBACK` txn with `SAVEPOINT` per PREPARE, so `SET LOCAL`, prepared statements, and `CREATE OR REPLACE FUNCTION` (plpgsql_check) are all discarded. `DEALLOCATE ALL` runs before `ROLLBACK` to clean up session-scoped prepared statements.

**On schema failure (no partial catalog):** there are two failure modes:
- **Apply-phase failure** (DDL/DML exec error, DO-block plpgsql_check error): the builder txn is rolled back, the pool is **not** swapped. Diagnostics emitted on the failing migration file; `{diagnostics: []}` for every query file. No typechecks run until the schema is fixed.
- **Validate-phase failure** (function body errors caught by deferred validation): the schema IS committed (the apply phase succeeded). The pool IS swapped — the catalog is usable. Function body diagnostics are emitted on the migration file that last defined the broken function. Queries that reference broken functions will get their own typecheck errors. This is correct behavior: a function with a broken body is still a catalog object (it exists in `pg_proc`), it just can't be called without error.

**`PgEngine` interface** sits in front of the concrete `PGlite` so a future `PGliteWorker` (PGlite in a `worker_threads` thread) is a drop-in. MVP runs main-thread PGlite; checks are sub-100ms with an empty catalog.

**Pool size:** default 2 (`engine.poolSize`). Concurrency beyond N queues at the Engine's loop level. PGlite instances are single-connection; `acquire()` serializes via a free-list of idle instances.

**Snapshot cache** is internal to the schema-apply module. The Engine calls `SchemaBuilder` (apply + validate) and gets back `{snapshot, success, diagnostics}`. Whether the snapshot came from cache or a fresh build is invisible to the Engine. Cache key = `orderedAstHashes ‖ configFingerprint`; stored as `.pgsid/cache/<hash>.bin.gz`. Only successful full builds (apply + validate both pass) are cached.

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

Two-phase: **apply** (no body validation) then **deferred validation** (check all surviving functions against the final schema state). This allows forward references — a function in migration 2 can reference a table created in migration 3.

### Phase 1: Apply

For each resolved migration file, in order, via `SchemaBuilder.applyMigration(pg, source, migrationIndex)`:

1. Parse with libpg-query (byte offsets). On parse error → diagnostic, halt.
2. **Preprocess** — strip `CONCURRENTLY` from `CREATE INDEX`, `DROP INDEX`, `REINDEX` statements so the file can run inside a transaction. No other statement removal. Position remapping translates PGlite error positions in the stripped content back to original file offsets.
3. `SET LOCAL check_function_bodies TO off` for the whole transaction — functions are stored without body validation.
4. Execute statements one at a time. **Hooks** fire before/after each statement:
   - `onBeforeStatementApplied(ctx)` — **DO blocks**: create `pg_temp` function with same body → `plpgsql_check_function_tb` → if dirty, throw `StmtDiagnosticsError` (halts this file). If clean, let the executor run the DO block. **Function statements**: snapshot `pg_proc` (oid → `{ prosrc, xmin, ctid }`) for the diff.
   - `onAfterStatementApplied(ctx, before)` — re-query `pg_proc`, diff against snapshot. New OID → record provenance. Changed `xmin`/`ctid` (even with same body) → update provenance. Missing OID → remove provenance.
   - `onStatementApplicationFailed(ctx, err)` — wrap exec error into `StmtDiagnosticsError`.
5. DDL/DML exec errors halt immediately (txn poisoned). DO-block plpgsql_check errors halt immediately. **Function body errors do NOT halt** — the function is created, the migration succeeds, the error surfaces in phase 2.
6. On failure → rollback the file's txn, emit diagnostics, halt the chain. On success → commit, proceed to next file.

**Provenance tracking** — the `SchemaBuilder` accumulates `oid → FunctionProvenance` across all migrations:
- `migration` — reference to the `MigrationContext` (source buffer, removals, index).
- `stmtStart`/`stmtEnd` — byte range of the CREATE FUNCTION statement (stripped space).
- `bodyOffset` — byte offset of the body within the statement (computed via `Buffer.indexOf`, byte-level).
- `bodyText` — the function body (= `pg_proc.prosrc`, decoded identically by libpg-query on both sides).
- `language`, `signature` — for `plpgsql_check_function_tb` calls.

**Why `xmin` + `ctid` for the diff:** `xmin` (transaction ID) changes across transactions (between migration files). `ctid` (physical tuple location) changes within the same transaction (multiple CREATE OR REPLACE in one file). Using both detects same-body REPLACE (PG still UPDATEs the row, bumping both) and disambiguates in the multi-schema case (only the replaced function's row changes).

**DO-block-created functions** — when a DO block `EXECUTE 'CREATE FUNCTION ...'` creates a function dynamically, the broad `pg_proc` snapshot catches it. Provenance is recorded pointing at the DO block's byte range (the body text is extracted from `pg_get_functiondef` since the DoStmt AST doesn't have a `CreateFunctionStmt`).

### Phase 2: Deferred validation

After all migrations are applied, `SchemaBuilder.validate(pg)`:

1. `BEGIN` (validation uses SAVEPOINTs for SQL function re-CREATE, which requires a transaction block).
2. Query surviving user functions from `pg_proc` (filter: user schemas, `lanname IN ('plpgsql','sql')`, no extension deps).
3. For each surviving OID with provenance:
   - **PL/pgSQL**: `plpgsql_check_function_tb(signature)` → map diagnostics via stored `bodyOffset` + `bodyText` → provenance byte range in the original migration file.
   - **SQL**: re-CREATE via `pg_get_functiondef` output with `check_function_bodies=on` inside a SAVEPOINT → on error, map the position from the re-issued text to the original migration file via the body offset (body is verbatim in both texts), `ROLLBACK TO SAVEPOINT`.
4. Collect all diagnostics (no halt on first failure — functions are independent).
5. `ROLLBACK` (validation txn discards any re-CREATE side effects).

**Byte-level offset correctness** — all offset computations use `Buffer.indexOf(value, 0, "utf8")`, not `String.indexOf`. This is critical when multi-byte UTF-8 characters (e.g. comments with `café ☕ 日本語`) appear before the function body: `String.indexOf` returns UTF-16 code unit indices, which differ from byte offsets. Both `findBodyOffsetInStatement` and `extractPlpgsqlCheckDiagnostic` use byte-level search.

**SQL function position mapping** — the re-issued `pg_get_functiondef` text has a different header format than the original migration (`CREATE OR REPLACE`, `$function$` tags), but the body is byte-identical. The error `position` from PG is into the re-issued text. We translate: `errorPosInBody = (position - 1) - defBodyOffset`, then `errorPosInStripped = prov.stmtStart + prov.bodyOffset + errorPosInBody`, then `mapStrippedToOriginal(removals, ...)`. If the error is in the header (before the body), the mapping doesn't apply → fall back to the whole statement range.

**Cache key:** `orderedAstHashes ‖ configFingerprint` (`schema` patterns, PG major, extensions, plpgsql_check on/off). Stored as `.pgsid/cache/<hash>.bin.gz`. Using AST hashes (not raw content) means cosmetic edits don't invalidate the cache. Only successful full builds are cached — no partial snapshots.

**Boot:** `migrations-discovered` → cache hit/miss → pool swap (generation++) + `plpgsql_check` loaded → introspect catalog snapshot → compute diff (first boot: everything added) → selective re-typecheck affected queries → emit `schema-ready` + `typechecked` events. See [PGlite pool model](#pglite-pool-model) and [Codegen > Dependency model](#dependency-model-column-level-pubsub).

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
6. **Signature extraction:** `SELECT parameter_types FROM pg_prepared_statements WHERE name = 'p_n'` → input types. `EXECUTE p_n(NULL, ...)` → return columns (from `result.fields`). Safe inside the ROLLBACK txn.
7. `DEALLOCATE ALL` (prepared statements are session-scoped, not txn-scoped).
8. `ROLLBACK` (discards `SET LOCAL`, the created function, savepoints, any DML from EXECUTE).
9. Release instance. If `pool.current.generation !== G`, discard results (schema changed under us).
10. Emit `{event: 'typechecked', path, diagnostics, signature}` for this file.

**Why a txn for read-only PREPARE?** (a) `SET LOCAL` requires a txn to scope `search_path` per check without leaking to the next check on the pooled instance; (b) `ROLLBACK` cleans up created functions and savepoints; (c) parity with the plpgsql_check flow (one code path). **Savepoints** ensure a failed PREPARE doesn't abort the txn — without them, PostgreSQL poisons the txn after any error and all subsequent commands fail. **No `statement_timeout`:** PREPARE is parse+analyze+plan only — it doesn't execute, so there's nothing to time out (the catalog is schema-only, no rows).

---

## CLI (CI/CD)

The same `pgsid` package/binary exposes a **CLI** so pipelines do not need an editor or long-running LSP:

- **`pgsid check`** — build/load schema, typecheck `sql.paths` (plpgsql on by default), non-zero exit on errors; optional machine-readable report later.
- **`pgsid generate`** — run TypeScript (and later other) codegen from the same config.
- Shared config discovery with the language server.

LSP and CLI share the Engine. The CLI pushes a control signal to the Engine, then calls **`drainUntilIdle()`** and collects `EngineEvent`s (`typechecked` + `schema-error`). Same Engine code path as LSP; different transport.

---

## Linting (project goal)

Not MVP, but a first-class **direction**: custom and built-in SQL lint rules with context most linters lack—

1. **Live catalog** (and/or a structured TypeScript object tree of the schema from the same IR used for codegen).
2. **ASTs** for every SQL file (trees already obtained for split/checks).

That combination makes schema-aware and migration-aware rules far cheaper to author than text-only or parser-only linters. Keep the core IR so a future lint plugin API can consume it without a second schema pipeline.

---

## Codegen

The codegen is a **separate system** — a consumer of `EngineEvent`s and a producer of generated `.ts`/`.d.ts` files. It subscribes to the Engine's output stream alongside the LSP adapter and CLI. It never accesses the pool or the Engine's internal state.

```
                    EngineEvent
Engine ─────────────────────────────────► Codegen
  typechecked {path, diagnostics,       │  signature → query types + wrappers
              signature}                │  (skip if signature unchanged)
  schema-ready {catalog, diff}          │  catalog → schema types
                                        │  (full regen, atomic write, skip-if-unchanged)
                                        ▼
                                   Generated .ts / .d.ts files
```

### Query signature extraction

During typecheck, the Engine extracts the query signature using standard PostgreSQL introspection:

1. `PREPARE pgsid_stmt_N AS <sql>` — typecheck (catch errors). On failure: emit `typechecked` with empty signature + error diagnostics.
2. `SELECT parameter_types FROM pg_prepared_statements WHERE name = 'pgsid_stmt_N'` — input parameter types (array of OIDs).
3. `EXECUTE pgsid_stmt_N(NULL, NULL, ...)` — return columns (from `result.fields`). Safe because we're inside a `BEGIN…ROLLBACK` txn — any DML mutation is rolled back. The catalog is schema-only, so SELECTs return 0 rows but still produce field descriptions.
4. `DEALLOCATE pgsid_stmt_N` — cleanup.

Works for ALL statement types: SELECT, INSERT RETURNING, UPDATE RETURNING, DELETE RETURNING (return columns), and plain INSERT/UPDATE/DELETE (no return columns → `:exec` → void signature).

```ts
interface QuerySignature {
  /** sqlc directive: name + cardinality */
  name: string                    // "GetUser"
  cardinality: 'one' | 'many' | 'exec'

  /** Return columns (empty for :exec or non-returning DML) */
  columns: {
    name: string                  // "id"
    pgTypeOid: number             // 20 (int8)
    pgTypeName: string            // "int8"
    nullable: boolean             // from NOT NULL constraint
  }[]

  /** Parameter types */
  params: {
    pgTypeOid: number
    pgTypeName: string
  }[]
}
```

The Engine emits raw PG types. The codegen applies the type-mapping chain (`column → domain brand → enum → pgType → driver default`) using the `typeMappings` config — it owns the mapping logic, not the Engine.

### Catalog snapshot

After every successful schema rebuild, the Engine introspects a pool instance and emits a `CatalogSnapshot`:

```ts
interface CatalogSnapshot {
  tables: {
    schema: string
    name: string
    columns: {
      name: string
      typeOid: number
      typeName: string
      notNull: boolean
      hasDefault: boolean
      generated: 'always' | 'byDefault' | 'none'
    }[]
  }[]
  functions: {
    schema: string
    name: string
    argTypes: string[]
    returnType: string
    language: string
    body: string              // for dependency extraction (SQL: parse; plpgsql: statement extraction)
  }[]
  views: {
    schema: string
    name: string
    columns: { name: string; typeOid: number; typeName: string }[]
    definition: string        // SQL text from pg_views.definition — parse for deps
  }[]
  enums: {
    schema: string
    name: string
    values: string[]
  }[]
  domains: {
    schema: string
    name: string
    baseType: string
    notNull: boolean
    default: string | null
  }[]
}
```

### Schema diff

Computed by comparing the old and new `CatalogSnapshot`. Carries old + new states for future features (constraint analysis, transpilation):

```ts
interface SchemaDiff {
  added: EntityId[]                                                    // new entities
  removed: EntityId[]                                                  // dropped entities
  modified: { entityId: EntityId; old: EntityState; new: EntityState }[]  // changed entities
}

// EntityId is a schema-qualified, column-level identifier:
//   "public.users.id"     — a specific column
//   "public.users"        — a table (for existence tracking)
//   "public.calculate_total" — a function
//   "public.active_status"   — an enum
//   "public.user_id"         — a domain
```

### Dependency model (column-level pub/sub)

The Engine maintains a **dependency graph** and a **subscriber index** — the core optimization that avoids re-typechecking all queries on every schema change.

**What we track per column:** type (OID + name), NOT NULL, DEFAULT (present/absent), GENERATED (`always` / `byDefault` / `none`). These are the four properties that affect type generation. Primary key is not tracked separately (it implies NOT NULL, already covered). Indexes, triggers, foreign keys, check constraints do not affect type generation. (Check constraints are interesting for future transpilation to Zod/valibot — the catalog snapshot is extensible for this, but not MVP.)

**Dependency extraction:**

| Source | Method | Precision |
|---|---|---|
| Query AST | Walk `RangeVar` (tables) + `ColumnRef` (columns) + `FuncCall` (functions). Resolve unqualified names via `search_path`. Recurse into subqueries, CTEs, JOINs. | Column-level, precise |
| SQL functions (`LANGUAGE sql`) | Parse `pg_proc.prosrc` body with libpg-query → walk AST → extract same. | Column-level, precise |
| Views | Parse `pg_views.definition` with libpg-query → walk AST → extract same. | Column-level, precise |
| plpgsql functions | **plpgsql statement extractor:** tokenize the body to find SQL-bearing constructs (`SELECT INTO`, `PERFORM`, `INSERT/UPDATE/DELETE`, `RETURN QUERY`, `FOR r IN SELECT`, `IF (SELECT…)`). Parse each extracted SQL fragment with libpg-query → walk AST → extract deps. | Column-level for static SQL; **conservative** (depends on everything) for `EXECUTE` (dynamic SQL) |
| Enums/domains | Tracked indirectly: if an enum/domain changes, all columns using that type are affected (propagated via the catalog snapshot's type OIDs). | Automatic |

**Subscription by name, not by existence:** a query referencing `nonexistent_table` subscribes to the *name* `public.nonexistent_table` regardless of whether the entity exists. When the table later appears (migration adds it), the diff includes it as `added`, the subscription matches → re-typecheck. The typecheck error (PREPARE fails) and the subscription are separate concerns.

**Transitive closure on schema change:**

1. Start with directly changed entities (from the diff).
2. **Propagate through type deps:** enum/domain change → all columns using that type are affected.
3. **Propagate through function deps:** table/column change → functions referencing it are affected → queries using those functions are affected. Walk transitively (function A calls B which references table T → if T changes, B affected, A affected, queries using A affected).
4. **Propagate through view deps:** table/column change → views referencing it are affected → queries using those views are affected. Walk transitively (view V1 references V2 which references table T → if T changes, V2 affected, V1 affected, queries using V1 affected).
5. The result is a set of affected query paths → re-typecheck ONLY those. Emit `typechecked` for each. Unaffected queries keep their existing diagnostics + signatures.

**On query file change (not schema):** re-parse the query AST → re-extract dependencies → update the dependency graph + subscriber index → re-typecheck this query only.

**On first boot:** no previous catalog snapshot → all entities are "added" → all queries are affected → typecheck all. One-time cost.

### Codegen behavior

**On `schema-ready`:** regenerate ALL schema types from `catalog`. Full regeneration (a few file writes). Write-back is atomic + skip-if-unchanged, so unchanged files don't cause IDE churn. The codegen doesn't use the diff for this — it regenerates everything from the current catalog.

**On `typechecked`:** compare `signature` to the stored signature for that path. If unchanged → skip (the query's types didn't change, even though the schema changed). If changed → regenerate query types + wrappers for that file. Double optimization: the Engine's selective re-typecheck ensures only affected queries produce events; the codegen's signature comparison ensures only changed signatures trigger regeneration.

**On `schema-error`:** the codegen does nothing. No schema types to generate (the catalog is broken). Existing generated files are left as-is (stale but not wrong — they represent the last known-good schema).

**Codegen failure must not block diagnostics.** If type mapping fails (e.g., an unknown pg type with no mapping), the codegen logs the error and skips the file. The `typechecked` event (with diagnostics) is already emitted by the Engine before the codegen processes it.

### TypeScript emit

Nested under `sql.codegen` by language (multi-language later). **Driver target: `pg` only in MVP** (the `target` field is an enum; `postgres` is added later without a config migration).

#### Schema types (`codegen.typescript.schema`)

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

#### Query codegen (`codegen.typescript.queries`)

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

#### Type mappings

Resolution: **column → domain brand → enum →** `pgType` **→ driver default**.

```yaml
typeMappings:
  pgType: { int8: bigint, numeric: string }
  column: { public.users.metadata: 'import("../../user-meta").UserMeta' }
```

Emit-time only; runtime driver parsers remain the app's job.

#### Write-back & determinism

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
- Codegen for composite **UDTs**.
- `postgres` driver target (MVP ships `pg` only).

Rejected alternatives and operational limits are documented elsewhere in this design (e.g. strip `CONCURRENTLY`, TypeScript+PGlite host, PREPARE always on).

## Future goals

- **Check constraint transpilation** — `CHECK (age > 0)` → `z.number().min(0)` (Zod/valibot). The catalog snapshot is extensible (add `checkConstraints` field); the dependency graph already tracks column-level references; the codegen emit is additive. The architecture supports this without redesign.
- **Lint framework** — rules over catalog IR + SQL ASTs (built-in + user plugins).
- **Multi-language codegen** — additional `sql.codegen.<lang>` emitters.
- **ORM-oriented targets** — beyond raw `pg` / `postgres` wrappers (e.g. tighter Kysely/Drizzle/etc. integration), without replacing the core IR.

---

## Dependencies (MVP)

| Package                                          | Role                                                            |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `@electric-sql/pglite`                           | In-process Postgres + `dumpDataDir` / `loadDataDir`             |
| PGlite `plpgsql_check` extension                 | PL/pgSQL analysis                                               |
| `libpg-query@pg18`                               | Split + AST-hash dedup + CONCURRENTLY stripping; PG18 pinned |
| `fast-glob` + `picomatch`                        | `schema` / `sql.paths` glob expansion + `!` negation matching   |
| `chokidar`                                       | Raw filesystem watching (FS Tracker)                            |
| `yaml`                                           | Config parse                                                    |
| `zod`                                            | Config validation → typed config object                         |
| `vscode-languageserver` + `vscode-languageserver-textdocument` | LSP shell (VSCode-first, stdio)                   |

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
9. ~~State inconsistency between runtime and reboot on schema failure~~ — mitigated: apply-phase failures drop the pool (no generation); validate-phase failures swap the pool (schema committed). On reboot, cache misses (AST hashes changed) → same behavior. Cache only stores successful full builds (apply + validate).
10. plpgsql function dependency extraction — the statement extractor may miss edge cases (unusual control flow, nested BEGIN/END). Conservative fallback for dynamic SQL (`EXECUTE`): depends on everything. Over-checking is correct; under-checking would be a bug.
11. Column-level dependency tracking precision — `SELECT *` expands to all columns of the table (from the catalog). If the catalog changes (column added/removed), the expansion changes, and the query is affected. Tracked correctly via the diff.
12. Future: check constraint transpilation — architecture supports it (extensible catalog snapshot, column-level deps, additive codegen emit) but not implemented.
13. Future: pool-based parallel validation — the `SchemaBuilder.validate()` loop is sequential. When the PGlite pool is available, function validation could be distributed across pool instances for parallel checking. Deferred until after first release.
14. **`%TYPE` / `%ROWTYPE` resolution semantics** — two distinct behaviors confirmed by spike testing. **This is counter-intuitive: both constructs appear in `DECLARE`, but they resolve differently.**
    - **`%TYPE` (in signatures AND in DECLARE): frozen at CREATE time.** Resolves to a scalar type OID (e.g., 23 for `int4`) when the function is compiled. This OID is baked into the function's compiled representation — there's no indirection. `ALTER TABLE ... ALTER COLUMN` does NOT update it. Operators on the variable still use the old type (e.g. `r + 1` works if `r` was `int` at CREATE time, even if the column is now `text`). `plpgsql_check` does NOT flag this — there's no mismatch because the variable is still `int`. This is correct PG behavior, not a bug.
    - **`%ROWTYPE` (in DECLARE only): dynamic.** Creates a composite-type variable that references the table's row type via `pg_class` → `pg_attribute`. This indirection is live — dropping a column removes the `pg_attribute` row, the composite type changes, and `r.dropped_col` becomes an error (`record "r" has no field "dropped_col"`). `plpgsql_check` catches this because it re-resolves `%ROWTYPE` against the current catalog at check time.
    - **Why the asymmetry?** `%TYPE` bakes in a scalar OID (immutable, no catalog indirection). `%ROWTYPE` references a composite type (mutable catalog object — its `pg_attribute` rows can change). The PL/pgSQL compiler treats them differently: `%TYPE` → static type OID; `%ROWTYPE` → live composite-type reference.
    - **`%ROWTYPE` cannot appear in function signatures** (args or RETURNS) — it's a syntax error. Only `%TYPE` is valid there, and it's frozen.
    - **Stale `%TYPE` is a linter concern, not a type error.** A function created with `RETURNS col%TYPE` when `col` was `text`, where `col` is now `varchar(50)`, still claims `RETURNS text`. The function works (PG implicit casts handle calls), but the signature is semantically stale. A future lint rule could flag this ("column type changed since function was created — consider `CREATE OR REPLACE` to refresh"). The typecheck pipeline does not enforce this.

---

## Implementation phases

Phases are guidelines, not gates — if a better ordering emerges, take it. The **E2E test harness is a first-class deliverable of Phase 0** and grows alongside every feature.

### Phase 0 — Spike + harness

- E2E harness: `createWorkspace(tmpDir, config, files)` with real Engine (pool + schema-apply + typecheck) and FS Tracker; actions `writeFile`/`editFile`/`deleteFile`/`waitIdle`/`getDiagnostics`/`getPoolGeneration`.
- YAML config load (zod); schema glob resolve; CONCURRENTLY strip; `SchemaBuilder` two-phase apply (check_function_bodies=off + deferred validation).
- `dumpDataDir` cache round-trip (`.pgsid/cache/`).
- PREPARE + plpgsql_check diagnostics on sample `sql.paths`.
- Engine state machine + pool generation model landed early.

### Phase 1 — MVP LS + CLI

- LSP + schema watch/rebuild + pool.
- Live SQL typecheck; plpgsql_check **on by default**.
- CLI `pgsid check` (+ exit codes) for CI; shared engine with LSP.

### Phase 2 — Dependency model + codegen

- Catalog snapshot introspection (tables, columns, enums, domains, functions, views).
- Schema diff computation (old vs new, with old/new states).
- Dependency graph: query AST → column-level table/column refs + function refs.
- Function dependency extraction: SQL functions (parse body), plpgsql (statement extractor), views (parse definition).
- Transitive closure: type deps + function deps + view deps → affected query set.
- Selective re-typecheck: only affected queries.
- Query signature extraction (PREPARE + pg_prepared_statements + EXECUTE).
- Codegen: schema types from catalog, query types from signatures, `pg` wrappers.
- Signature comparison: skip unchanged codegen output.
- CLI `pgsid generate`.

### Phase 3 — Polish / direction

- Check constraint transpilation (Zod/valibot) — catalog snapshot extensible, dependency graph already tracks column refs.
- Lint IR groundwork; UDT revisit.
- Later: multi-lang codegen, ORM-specific emitters.

---

## Testing strategy

**E2E-first.** The E2E harness (`createWorkspace`) is the backbone: it spins up the entire machinery (real Engine with PGlite pool, FS Tracker, schema-apply, typecheck) pointed at a temp dir of migrations/queries, then drives it with file operations and asserts on observable state after `waitIdle`. Cover as many scenarios as possible here — schema edits mid-typecheck, pool swaps, schema failure (diagnostics cleared), codegen regeneration, CLI drain.

**Unit tests** for pure pieces that are painful to test E2E: offset→LSP mapping, sqlc directive parser, type-mapping resolver, codegen output snapshots, config schema validation, AST-hash canonicalization. These run without PGlite → fast feedback.

**PGlite fixture tests** for engine-specific flows scoped to one subsystem: `dumpDataDir`/`loadDataDir` round-trip with the extension, pool generation swap, plpgsql_check txn flow.

---

## Success criteria

- One Node/Bun `pgsid` entrypoint (LSP **and** CLI); no Postgres install; no DB port.
- `schema` applies a cached schema-only catalog; apply-phase failures (DDL/DML/DO) clear query diagnostics and leave the pool without a generation; validate-phase failures (function bodies) still swap the pool (schema is committed) and emit function diagnostics on the defining migration file.
- `sql.paths` get PREPARE + plpgsql_check by default (`searchPath: [public]`).
- Selective re-typecheck: only queries whose column-level dependencies changed are re-typechecked on schema rebuild.
- Codegen produces schema types (from catalog) + query types/wrappers (from signatures); signature comparison skips unchanged files.
- Codegen can split FE types vs BE wrappers or collocate; no schema function wrappers.
- Schema/query edits refresh pool, generated outputs, and diagnostics deterministically.
- CI can run `pgsid check` / `pgsid generate` without running an editor.

---

## Implementation references

| Concern                       | Where to look                                                |
| ----------------------------- | ------------------------------------------------------------ |
| SchemaBuilder (apply + validate) | `pgsid/src/schema-builder.ts`                              |
| AST helpers (getFunctionBody, etc.) | `pgsid/src/ast.ts`                                      |
| Diagnostic extractors         | `pgsid/src/errors.ts`                                        |
| PREPARE + error→diagnostic    | `postgres-language-server/crates/pgls_typecheck/`            |
| plpgsql_check txn flow        | `postgres-language-server/crates/pgls_plpgsql_check/`        |
| Statement scan/split          | `postgres-language-server/crates/pgls_statement_splitter/`   |
| Schema introspection queries  | `postgres-language-server/crates/pgls_schema_cache/src/queries/` |
| PGlite client + `dumpDataDir` | `pglite/packages/pglite/`                                    |
| Extension loading             | `pglite/docs/extensions/development.md`, `extensionUtils.ts` |
| plpgsql_check SQL API + tests | `pglite/packages/pglite-plpgsql-check/` (tests prove dump/load + pool + txn isolation) |
| plpgsql_check upstream        | `postgres-pglite/pglite/other_extensions/plpgsql_check/`     |
