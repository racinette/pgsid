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
| Host language            | **TypeScript** (Node or Bun)                       | PGlite’s maintained embed host is TS; in-process API avoids sockets.       |
| Config format            | **YAML**                                           | Comments, lists, less noise than JSON; validate with a schema.             |
| Engine                   | `@electric-sql/pglite` **pool**                    | Cheap create/tear-down; multiplex checks across identical snapshots.       |
| Schema input             | **`schema`: string \| string[]**                   | Paths/globs/`!` negation; one file or migrations = ordered UP apply chain. |
| Preprocess               | **`preprocess.strip.{dml,do}`**                    | Schema-only catalog; steer ambiguous `DO` blocks.                          |
| Statement splitting      | **libpg-query scan/split**                         | Accurate boundaries; also used to classify statements for strip.           |
| Schema cache             | **`dumpDataDir` + hash(raw files ‖ config)**       | Fast restore; not SQL `pg_dump` on the hot path.                           |
| Migration validation     | **Sequential txn apply; furthest-correct catalog** | Apply errors _are_ the check; keep last good prefix on failure.            |
| Live SQL check           | **Always PREPARE**; **`plpgsql` default on**       | Set `sql.typecheck.plpgsql: false` to disable plpgsql_check only.          |
| `searchPath`             | **Default `["public"]`**                           | Unqualified-name policy for live SQL; not derivable from “all schemas.”    |
| Functions                | **In schema/migrations only**                      | No schema `functions.ts` wrappers; call via sqlc queries.                  |
| TS codegen               | **`sql.codegen.typescript`**                       | Schema types + query types + optional wrappers; FE/BE split supported.     |
| Query convention         | **`sqlc`** (`:one` / `:many` / `:exec`)            | Extensible later; MVP ships this convention only.                          |
| Distribution             | **`pgsid`: LSP + CLI one binary**                  | Embed in CI/CD (`pgsid check`, codegen, …) without a separate daemon.      |
| Completions / hover      | **Out of scope (MVP)**                             | —                                                                          |
| Lint rule framework      | **Project goal** (post-MVP)                        | Catalog object tree + per-file ASTs = high-leverage lint context.          |
| Multi-lang / ORM codegen | **Future**                                         | More codegen languages; ORM targets beyond raw `pg` / `postgres`.          |

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Node/Bun process                                              │
│                                                                │
│  ┌──────────────────┐     diagnostics        ┌───────────────┐ │
│  │ LSP adapter      │ ─────────────────────► │ IDE / agent   │ │
│  └────────┬─────────┘                        └───────────────┘ │
│           ▼                                                    │
│  ┌──────────────────┐                                          │
│  │ Workspace        │  sql.paths, schema watch, codegen        │
│  └────────┬─────────┘                                          │
│           │                                                    │
│           ├─ schema: resolve → preprocess → txn apply → cache  │
│           │         → pool (PGlite×N) + schema types codegen   │
│           │                                                    │
│           └─ sql.paths: split → PREPARE + plpgsql_check (default) │
│                         → query types [/ wrappers] codegen        │
└────────────────────────────────────────────────────────────────┘
```

### Components

1. **LSP adapter** — stdio LSP; document sync; `publishDiagnostics`. No completions/hover in MVP.
2. **CLI** — the `pgsid` binary/entry: headless `check`, codegen, schema rebuild for CI/CD (exit codes, machine-readable diagnostics).
3. **Workspace** — loads YAML config; watches schema + `sql.paths`; owns rebuild/check/codegen triggers.
4. **libpg-query** — statement **scan/split** and top-level statement classification for preprocess. Not used as a second syntax diagnostics engine.
5. **Schema engine pool** — build catalog once → `dumpDataDir` snapshot → N identical PGlite instances (multiplex checks). Reload replaces the whole pool. Each instance is still single-connection.

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
4. On failure → diagnostics on that file/statement; **retain catalog after last successful file** (furthest-correct); stop the chain. Pool/codegen use furthest-correct when available.
5. On success of full chain → `dumpDataDir` cache.

**Cache key:** ordered **raw** file content hashes **plus** config fingerprint (`preprocess`, `schema` patterns, PG major, extensions, …).

**Boot:** resolve → cache hit/miss → pool × N + `plpgsql_check` → ready; refresh open docs; run schema codegen if enabled.

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

1. Split via libpg-query.
2. `SET search_path` from config.
3. PREPARE / analyze → diagnostics.
4. Unless `sql.typecheck.plpgsql: false`, run plpgsql_check where applicable (rolled-back txn).
5. Publish diagnostics.
6. If codegen enabled for that file → refresh query types [/ wrappers].

---

## CLI (CI/CD)

The same `pgsid` package/binary exposes a **CLI** so pipelines do not need an editor or long-running LSP:

- **`pgsid check`** — build/load schema (furthest-correct), typecheck `sql.paths` (plpgsql on by default), non-zero exit on errors; optional machine-readable report later.
- **`pgsid generate`** — run TypeScript (and later other) codegen from the same config.
- Shared config discovery with the language server.

LSP and CLI share the workspace/engine/codegen implementation.

---

## Linting (project goal)

Not MVP, but a first-class **direction**: custom and built-in SQL lint rules with context most linters lack—

1. **Live catalog** (and/or a structured TypeScript object tree of the schema from the same IR used for codegen).
2. **ASTs** for every SQL file (trees already obtained for split/checks).

That combination makes schema-aware and migration-aware rules far cheaper to author than text-only or parser-only linters. Keep the core IR so a future lint plugin API can consume it without a second schema pipeline.

---

## TypeScript codegen

Nested under `sql.codegen` by language (multi-language later). Driver target: `pg` **|** `postgres` only.

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

- Schema rebuild → schema types (+ pool refresh).
- Query file change → that query’s types/wrappers (if mapped).
- Codegen failure must not block diagnostics.

---

## Configuration

Primary file: **`pgsid.yaml`**. Validate with a schema.

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
      target: postgres
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
- Down/undo migrations and custom migrator format adapters (Flyway/Prisma/Liquibase drivers, etc.).
- Codegen for composite **UDTs**; validation-library emitters (Zod/valibot, etc.) until their design is settled.

Rejected alternatives and operational limits are documented elsewhere in this design (e.g. strip `CONCURRENTLY`, TypeScript+PGlite host, PREPARE always on).

## Future goals

- **Lint framework** — rules over catalog IR + SQL ASTs (built-in + user plugins).
- **Multi-language codegen** — additional `sql.codegen.<lang>` emitters.
- **ORM-oriented targets** — beyond raw `pg` / `postgres` wrappers (e.g. tighter Kysely/Drizzle/etc. integration), without replacing the core IR.

---

## Dependencies (MVP)

| Package                                  | Role                                                            |
| ---------------------------------------- | --------------------------------------------------------------- |
| `@electric-sql/pglite`                   | In-process Postgres + `dumpDataDir` / `loadDataDir`             |
| PGlite `plpgsql_check` extension         | PL/pgSQL analysis                                               |
| `@libpg-query/parser` (or matching)      | Split + preprocess classification; PG major aligned with PGlite |
| multimatch-style globs                   | `schema` / `sql.paths` / `!` negation                           |
| YAML parser + config schema              | Config load/validate                                            |
| `vscode-languageserver` (+ textdocument) | LSP shell                                                       |

---

## Risks and open work

1. libpg-query ↔ PGlite version skew.
2. Preprocess limits (`DO` / dynamic SQL) — flags + warnings.
3. Checks must not permanently mutate pool instances (txn / savepoint / PREPARE).
4. Pool identity on schema reload (atomic replace).
5. Debounce / check-on-idle for incomplete buffers.
6. Exact relative-path root when mirroring query outputs (longest `out` prefix match).

---

## Implementation phases

### Phase 0 — Spike

- YAML config load; schema glob resolve; preprocess strip; txn apply; furthest-correct.
- `dumpDataDir` cache round-trip.
- PREPARE + plpgsql_check diagnostics on sample `sql.paths`.

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
| PGlite client + `dumpDataDir` | `pglite/packages/pglite/`                                    |
| Extension loading             | `pglite/docs/extensions/development.md`, `extensionUtils.ts` |
| plpgsql_check SQL API         | `plpgsql_check/`                                             |
