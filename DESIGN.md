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
| Migration validation     | **Sequential txn apply; furthest-correct catalog** | Stop at first failing stmt (txn poisoned) → first failing file; keep last good file. |
| Live SQL check           | **Always PREPARE**; **`plpgsql` default on**       | Per-statement PREPARE; continue after errors; toggle plpgsql_check via `sql.typecheck.plpgsql`. |
| `searchPath`             | **Default `["public"]`**, `SET LOCAL` per check    | Unqualified-name policy; `SET LOCAL` inside txn auto-reverts on ROLLBACK.  |
| Functions                | **In schema/migrations only**                      | No schema `functions.ts` wrappers; call via sqlc queries.                  |
| TS codegen               | **`sql.codegen.typescript`**                       | Schema types + query types + optional wrappers; FE/BE split supported.     |
| Codegen driver target    | **`pg` only (MVP)**                                | `target` enum; `postgres` added later without config migration.            |
| Query convention         | **`sqlc`** (`:one` / `:many` / `:exec`)            | Extensible later; MVP ships this convention only.                          |
| Distribution             | **`pgsid`: LSP + CLI one binary**                  | Embed in CI/CD (`pgsid check`, codegen, …) without a separate daemon.      |
| File tracking            | **Single event-loop dispatcher**                   | One queue, one consumer, big switch; producers only push events.           |
| Diagnostics fan-out      | **Dispatcher-owned**                               | LSP and CLI both subscribe to the dispatcher's diagnostic stream.          |
| Schema rebuild trigger   | **Hybrid debounce**                                | Latest migration: live `didChange` (~500ms); old migrations: `didSave` only.|
| LSP library              | **`vscode-languageserver`** + textdocument         | VSCode-first; stdio transport.                                             |
| Query cancellation       | **No WASM-level cancel**                           | "Cancel" = discard stale-generation results; PREPARE is sub-100ms.         |
| Testing                  | **E2E-first**                                      | Real workspace + pool + watcher harness; unit tests for pure pieces.      |
| Completions / hover      | **Out of scope (MVP)**                             | —                                                                          |
| Lint rule framework      | **Project goal** (post-MVP)                        | Catalog object tree + per-file ASTs = high-leverage lint context.          |
| Multi-lang / ORM codegen | **Future**                                         | More codegen languages; ORM targets beyond raw `pg` / `postgres`.          |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Node/Bun process                                               │
│                                                                 │
│  Producers                Event dispatcher         Consumers    │
│  ┌──────────────┐ push    ┌──────────────────┐    ┌──────────┐ │
│  │ LSP adapter  │──────▶  │ single loop +    │──▶ │ LSP pub  │ │
│  │ CLI          │──────▶  │ big switch(e)    │    │ Diags    │ │
│  │ FS watcher   │──────▶  │                  │    │ CLI exit │ │
│  └──────────────┘         │ schedules/cancels│    └──────────┘ │
│                           │ async jobs       │                 │
│                           └────────┬─────────┘                 │
│                                    ▼                           │
│                           ┌──────────────────┐                 │
│                           │ Workspace        │                 │
│                           │  schema: resolve → preprocess →    │
│                           │    txn apply → cache → pool swap   │
│                           │  sql.paths: split → PREPARE +      │
│                           │    plpgsql_check → codegen         │
│                           └────────┬─────────┘                 │
│                                    ▼                           │
│                           ┌──────────────────┐                 │
│                           │ PGlite pool      │                 │
│                           │  generation G    │                 │
│                           │  inst₁ … instₙ  │                 │
│                           │  acquire()/      │                 │
│                           │  release()       │                 │
│                           └──────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

1. **LSP adapter** — stdio LSP; document sync; `publishDiagnostics`. Translates LSP notifications into dispatcher events. No completions/hover in MVP.
2. **CLI** — the `pgsid` binary/entry: headless `check`, codegen, schema rebuild for CI/CD (exit codes, machine-readable diagnostics). Pushes synthetic events into the dispatcher and drains until idle.
3. **Event dispatcher** — single async queue + one consumer loop with a big `switch (event.type)`. Every state mutation flows through this point. Schedules/cancels async jobs (schema rebuild, doc typecheck, codegen) with generation tagging. Owns diagnostic fan-out to subscribers (LSP, CLI). See [Event dispatcher](#event-dispatcher).
4. **Workspace** — loads YAML config (zod-validated); resolves schema/`sql.paths` globs; owns the per-file `{ text, ast, astHash }` map; drives rebuild/check/codegen in response to dispatcher events. See [File tracking & change detection](#file-tracking--change-detection).
5. **libpg-query** (`@pg18`) — statement **scan/split** (tracking byte offsets), top-level statement classification for preprocess, and AST production for change detection. Not used as a second syntax diagnostics engine.
6. **Schema engine pool** — `PgEngine` interface over N PGlite instances sharing a `dumpDataDir` snapshot. Generation-tagged: only `pool.current` serves checks; stale instances drain + close. See [PGlite pool model](#pglite-pool-model).
7. **Logger** — structured log interface (no-op default); single seam at the dispatcher for observability.

---

## Event dispatcher

One async queue, one consumer loop, one big `switch (event.type)`. Producers (LSP adapter, CLI, filesystem watcher, internal timers) only **push** events; they never touch workspace state directly.

**Event taxonomy:**

- `ConfigChanged` — `pgsid.yaml` changed → invalidate everything, rebuild.
- `SchemaFileChanged { path, text, source }` / `SchemaFileDeleted` / `SchemaFileAdded` — from watching `schema` globs. `source: 'buffer' | 'save'` (observability only).
- `SqlFileChanged { path, text, source }` / `Deleted` / `Added` — from watching `sql.paths`.
- `DocumentOpened { uri, text }` / `DocumentChanged { uri, text }` / `DocumentClosed { uri }` — from LSP. CLI emits synthetic `DocumentOpened` per `sql.paths` file so the same pipeline runs.
- `RebuildRequested` — manual trigger (CLI `check`).
- `Shutdown`.

**Rules:**

- **Debounce at the producer, not the dispatcher.** File-watch bursts collapse (~150ms quiet); LSP doc edits (~30ms). The dispatcher is always responsive.
- **Dispatcher never `await`s a slow job inline.** Sync cases update state in microseconds; slow work (schema build, typecheck, codegen) is launched as a tracked async job.
- **Generation tagging.** Every job captures `currentGeneration` at scheduling time; on completion it checks whether it's still current and discards results silently if not. This is the single mechanism preventing stale-write races.
- **Coalescing.** A `SchemaFileChanged` while a schema rebuild is in flight → cancel the in-flight (let it finish, discard) and start fresh from the latest file set. One outstanding schema rebuild at a time. Per-document, only the latest pending typecheck for a given URI survives.
- **Diagnostics fan-out.** Jobs produce diagnostic blobs and hand them back to the dispatcher, which fans them out to subscribers (LSP `publishDiagnostics`, CLI collector). Keeps the LSP adapter purely a transport.
- **Drain-until-idle.** A primitive the CLI uses: push events, then wait for the dispatcher + all jobs to reach idle before collecting results.

---

## PGlite pool model

**Core invariant:** at any instant, `pool.current` is a set of N PGlite instances all carrying exactly the same catalog snapshot, tagged with `generation = G`. Only `pool.current` serves check requests. Stale instances drain (finish in-flight work) then close.

**Build → swap protocol:**

1. Schema rebuild computes the new catalog in a _builder_ PGlite (apply files txn-by-txn, `CREATE EXTENSION plpgsql_check`, run to furthest-correct). On success: `dumpDataDir('gzip')` → `snapshot`.
2. Bump `targetGeneration = G+1`. Spin up N fresh PGlite instances with `loadDataDir: snapshot` + the `plpgsql_check` extension (`loadDataDir` rehydrates extension state; no re-`CREATE EXTENSION` needed).
3. Atomic swap: `pool.current = { generation: G+1, instances }`. The previous `current` becomes `draining`.
4. New acquires go to the new generation. In-flight acquires on the old generation finish (PGlite checks are fast; we don't interrupt WASM mid-query).
5. Once `draining` has zero in-flight, close those instances.

**Acquire/release contract:**

```
acquire(): { generation, instance, release() }
```

The caller checks `generation === pool.current.generation` before using the result; if mismatched, discard (the check ran against a stale catalog). Per-instance hygiene: every check runs in a `BEGIN…ROLLBACK` txn, so `SET LOCAL`, prepared statements, and `CREATE OR REPLACE FUNCTION` (plpgsql_check) are all discarded automatically — no `DEALLOCATE ALL` needed.

**On rebuild failure (furthest-correct):** swap the pool to the furthest-correct snapshot (last fully-committed file's catalog) and surface the failure as diagnostics on the failing file. The previous-good generation still drains. `sql.paths` typechecks continue against the partial catalog.

**`PgEngine` interface** sits in front of the concrete `PGlite` so a future `PGliteWorker` (PGlite in a `worker_threads` thread) is a drop-in. MVP runs main-thread PGlite; checks are sub-100ms with an empty catalog. `PGliteWorker` itself is a thin client that talks to a real `PGlite` in a Web Worker (browser-oriented, leader-elected); the same pattern applies on Node via `worker_threads`.

**Pool size:** default 2 (`engine.poolSize`). Concurrency beyond N queues at the dispatcher level. PGlite instances are single-connection; `acquire()` serializes via a free-list of idle instances.

---

## File tracking & change detection

The Workspace maintains `Map<path, { text, ast, astHash }>` rather than raw text. On any change:

1. Parse text → AST (libpg-query). On parse failure, `ast = null`, `astHash = null` → treat as "definitely changed."
2. Canonicalize the AST for hashing (strip location/position fields, strip comments, normalize semantically-unordered lists).
3. `astHash = sha256(canonicalAst)`.
4. Compare to the previous `astHash` for this path. Unchanged → cosmetic edit (whitespace, comments, keyword case) → no downstream work. Changed → proceed.

**Pay-offs:**

- **Schema cache key** uses `orderedAstHashes ‖ configFingerprint`, so format-on-save and comment edits no longer trigger a full rebuild + pool swap.
- **Query typecheck skip:** an unchanged AST means unchanged diagnostics → skip re-PREPARE and don't republish (avoids IDE flicker).
- **Free:** we parse every file anyway (splitter + preprocess classification need the AST).

**Hybrid debounce (schema files):**

| File role                 | Trigger                              | Debounce     |
| ------------------------- | ------------------------------------ | ------------ |
| Latest migration file     | `didChange` (LSP unsaved buffer)     | ~500ms, live |
| Old migration files       | `didSave` (LSP) / FS `change`        | immediate    |
| Query files (`sql.paths`) | `didChange` (LSP unsaved buffer)     | ~150ms, live |
| Query files (not open)    | FS `change`                          | immediate    |

"Latest" = the last file in the resolved ordered list; recomputed when the file set changes. The "is this latest?" gate happens in the Workspace before pushing events, so the dispatcher stays simple. Editing an old migration requires saving to see feedback — a deliberate tradeoff (the common workflow is writing the new migration at the end, which gets live tracking).

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
4. On failure → rollback the file's txn (Postgres poisons the txn after an error; subsequent statements would fail too), emit a diagnostic on the failing statement, and **halt the chain**. **Furthest-correct = last fully-committed file's catalog.** Pool/codegen serve from furthest-correct. Files after the failing one are not attempted. The diagnostic on the failing file makes clear: "migration chain halted here; subsequent migrations not applied."
5. On success of full chain → `dumpDataDir` cache.

**Cache key:** `orderedAstHashes ‖ configFingerprint` (`preprocess`, `schema` patterns, PG major, extensions, plpgsql_check on/off). Stored as `.pgsid/cache/<hash>.bin.gz`. Using AST hashes (not raw content) means cosmetic edits don't invalidate the cache.

**Boot:** resolve → cache hit/miss → pool swap (generation++) + `plpgsql_check` loaded → ready; refresh open docs; run schema codegen if enabled. See [PGlite pool model](#pglite-pool-model).

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

Each statement is typechecked independently; a failing PREPARE in statement 3 does not poison statement 4 (no shared txn). Continue and collect all diagnostics.

1. Split via libpg-query (tracking byte offsets for diagnostic ranges).
2. Acquire instance from pool (generation G).
3. `BEGIN; SET LOCAL search_path = <config>;`
4. For each statement: `PREPARE p_n AS <stmt>` → on error, map `err.position` (1-based into prepared text) to a file offset → diagnostic. Continue to next statement.
5. Unless `sql.typecheck.plpgsql: false`, for each `CREATE FUNCTION … LANGUAGE plpgsql`: `SET LOCAL check_function_bodies=off`, `CREATE OR REPLACE`, `SELECT plpgsql_check_function(..., format:='json')` → diagnostics.
6. `ROLLBACK` (discards `SET LOCAL`, prepared statements, and the created function).
7. Release instance. If `pool.current.generation !== G`, discard results (schema changed under us).
8. Publish diagnostics (via dispatcher fan-out).
9. If codegen enabled for that file → refresh query types [/ wrappers].

**Why a txn for read-only PREPARE?** (a) `SET LOCAL` requires a txn to scope `search_path` per check without leaking to the next check on the pooled instance; (b) `ROLLBACK` cleans up prepared statements (no `DEALLOCATE ALL` needed); (c) parity with the plpgsql_check flow (one code path). **No `statement_timeout`:** PREPARE is parse+analyze+plan only — it doesn't execute, so there's nothing to time out (the catalog is schema-only, no rows).

---

## CLI (CI/CD)

The same `pgsid` package/binary exposes a **CLI** so pipelines do not need an editor or long-running LSP:

- **`pgsid check`** — build/load schema (furthest-correct), typecheck `sql.paths` (plpgsql on by default), non-zero exit on errors; optional machine-readable report later.
- **`pgsid generate`** — run TypeScript (and later other) codegen from the same config.
- Shared config discovery with the language server.

LSP and CLI share the workspace/engine/codegen implementation. The CLI pushes a `RebuildRequested` event + synthetic `DocumentOpened` per `sql.paths` file into the dispatcher, then calls **drain-until-idle** and collects diagnostics from the dispatcher's fan-out. Same code path as LSP; different transport.

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

From the catalog (furthest-correct / full build):

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
| `libpg-query@pg18`                               | Split + preprocess classification; PG18 build pinned to PGlite  |
| multimatch-style globs                           | `schema` / `sql.paths` / `!` negation                           |
| `yaml`                                           | Config parse                                                    |
| `zod`                                            | Config validation → typed config object                         |
| `vscode-languageserver` + `vscode-languageserver-textdocument` | LSP shell (VSCode-first, stdio)                  |

---

## Risks and open work

1. ~~libpg-query ↔ PGlite version skew~~ — mitigated: `libpg-query@pg18` pinned to match PGlite's PG18.
2. Preprocess limits (`DO` / dynamic SQL) — flags + warnings.
3. Checks must not permanently mutate pool instances — mitigated: every check runs in `BEGIN…ROLLBACK` (see [PGlite pool model](#pglite-pool-model)).
4. ~~Pool identity on schema reload~~ — mitigated: generation/epoch swap (atomic replace; stale instances drain).
5. Stale-result races — mitigated: generation tagging on every job; discard if `pool.current.generation` moved.
6. Debounce / check-on-idle for incomplete buffers — hybrid debounce (live for latest migration + queries; save-only for old migrations).
7. Exact relative-path root when mirroring query outputs (longest `out` prefix match).
8. PGlite query cancellation — accepted: no WASM-level cancel; "cancel" = discard stale-generation results. PREPARE is sub-100ms (schema-only, no execution). Revisit if a pathological case appears.

---

## Implementation phases

Phases are guidelines, not gates — if a better ordering emerges, take it. The **E2E test harness is a first-class deliverable of Phase 0** and grows alongside every feature.

### Phase 0 — Spike + harness

- E2E harness: `runWorkspace(tmpDir, config, actions[])` with real PGlite pool, dispatcher, watcher; actions `writeFile`/`editFile`/`deleteFile`/`waitIdle`/`getDiagnostics`/`getGenerated`/`getPoolGeneration`.
- YAML config load (zod); schema glob resolve; preprocess strip; txn apply; furthest-correct.
- `dumpDataDir` cache round-trip (`.pgsid/cache/`).
- PREPARE + plpgsql_check diagnostics on sample `sql.paths`.
- Dispatcher + pool generation model landed early.

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

**E2E-first.** The E2E harness (`runWorkspace`) is the backbone: it spins up the entire machinery (real PGlite pool, dispatcher, watcher) pointed at a temp dir of migrations/queries, then drives it with actions and asserts on observable state after `waitIdle`. Cover as many scenarios as possible here — schema edits mid-typecheck, pool swaps, furthest-correct on failure, codegen regeneration, CLI drain.

**Unit tests** for pure pieces that are painful to test E2E: offset→LSP mapping, sqlc directive parser, type-mapping resolver, codegen output snapshots, config schema validation, AST-hash canonicalization. These run without PGlite → fast feedback.

**PGlite fixture tests** for engine-specific flows scoped to one subsystem: `dumpDataDir`/`loadDataDir` round-trip with the extension, pool generation swap, plpgsql_check txn flow.

---

## Success criteria

- One Node/Bun `pgsid` entrypoint (LSP **and** CLI); no Postgres install; no DB port.
- `schema` + `preprocess` build a cached schema-only catalog; failure keeps furthest-correct.
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
