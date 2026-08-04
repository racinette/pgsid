# Consumer design — query files to shipped TypeScript

## What this document is

The design that `docs/deferred-tasks.md` prescribes ahead of building the
first consumer of the nullability engine. It opens with the register's six
product questions and their answers (decided 2026-08-04), then specifies
what those answers imply: the query-file dialect, the preprocessor, the
artifact, the presence-group union feature that replaced `sqlc.embed`, the
diagnostics contract, and the slice plan. The architectural ground rules
were settled earlier over the `src/engine.ts` sketch and are restated here
as constraints, not proposals — do not re-litigate without new information.

`DESIGN.md` remains the reference for the subsystems this document
inherits; the supersession map below says exactly which parts still govern.
`docs/nullability-walk.md` is the engine.

## The six decisions

**1. Query discovery and naming.** Queries live in `.sql` files matched by
`sql.paths`, sqlc's file model with pgsid's own dialect: a `-- name: <Name>
:<cmd>` annotation opens each query, `@name` spells a named parameter, and
there is **no macro namespace** — every sqlc macro patches a weakness pgsid
does not have (`sqlc.arg` exists because MySQL lacks `@`; `sqlc.narg`
because sqlc's nullability inference guesses; `sqlc.slice` because MySQL
lacks arrays; `sqlc.embed` because sqlc cannot prove group-nullability).
sqlc compatibility is a **one-shot codemod** (`pgsid migrate-from-sqlc`),
not a runtime alias layer, so the dialect can evolve without carrying
sqlc's bolt-ons. Multiple named queries per file; each is exactly one
statement (the PREPARE contract is per-statement). Cardinality is always
explicit, never inferred.

**2. Artifact shape.** Types first, but typed functions are designed in
from day one and the product does not ship without them — the config's
collocated/split `out` map already encodes the duality. Functions are
generated **from queries**, never from PostgreSQL functions (call those
through queries — `DESIGN.md`'s standing decision). `:one` returns
`Row | undefined`; a nullable column renders `T | null`, never an optional
property, not configurable. Parameter rejection sets and optional-join
outputs both emit as **factored local unions** (flat type ∩ one union per
set/group) — the presence-group section below records why that shape is
measured-safe.

**3. Config surface.** `pgsid.yaml` (YAML + zod) as designed in `DESIGN.md`
and already implemented in `src/config/` — kept, with one amendment: the
`schema` entry grammar (decision 4). Database-less PGlite is not a default
posture but a constraint (`DESIGN.md`: no external server); single project
per config; multi-schema via `searchPath` and qualification.

**4. Migration ordering and identity.** `schema:` becomes an **ordered list
of single-directory entries**. Each entry is either a literal file path or
`<literal-dir>/<filename-glob>` — no glob characters in the directory part,
no `/` or `**` in the glob part. Entries apply in written order; files
within an entry sort lexicographically; a file matched by two entries is a
config error. This keeps the one genuinely ambiguous case — ordering
*across* sources — explicit in the file, covers baseline-dump-then-
migrations and extensions-preamble layouts, and drops multimatch `!`
negation entirely (the filename glob already selects: `*.up.sql`). Any
migration change, including editing an old file, means "rebuild snapshot" —
schema is a fold over the ordered list and the invalidation triangle
already treats it so; watch tolerates edits by design. Down-migrations are
simply never matched. Cross-directory timestamp interleaving (monorepo
per-service migrations against one database) is documented out of scope:
if the services' schemas are independent any order works, and if they are
not, no config syntax fixes it.

**5. Diagnostics contract.** `pgsid check` exits non-zero on **errors**:
config errors, dialect errors, migration apply/validate failures, PREPARE
failures, and arity-gate mismatches — each means broken SQL or a broken
invariant. Engine refusals (`UnsupportedNodeError`) are **warnings**: the
query's artifact degrades to all-nullable, loudly, and `--strict` promotes
refusals to errors. An engine gap never blocks a user's build by default.
Positions are byte-precise from day one — `DESIGN.md`'s machinery, plus
one added remap layer for the preprocessor.

**6. Slice order.** config + discovery → batch pipeline (pure core) →
emitter + goldens → parity suite (written as the spec) → watch shell
(makes it pass) → LSP last. Detailed in the slice plan below.

## Settled architecture (restated as constraints)

- ONE run path for CLI and language server, held by a parity suite from the
  first vertical slice: batch output over a project ≡ watch-shell steady
  state after replaying the same edits.
- The shared path is a pure, memoized derived-value graph: config →
  migration list → applied schema → snapshot → catalog → per-query contract
  → artifact. Events exist only in the shells and terminate at "invalidate
  key K". The CLI is a shell that feeds inputs once and exits — no engine
  mode, no stop-after-ready flag.
- Invalidation is the existing triangle: any migration change → rebuild
  snapshot → `diffCatalogs` → changed `EntityId`s → recheck queries whose
  `extractDeps` touch them. Per-migration incrementality is not a lever
  (schema is a fold); the diff is.
- `src/engine.ts` salvage: keep the event taxonomy, ready barrier, and
  coalescing/debounce/retry patterns as the watch shell's vocabulary;
  retire trackers-that-compute (a tracker acquires input, the graph
  computes); the subscription map becomes the EntityId-keyed invalidation
  index (`DatabaseIdentifier` reinvented `EntityId` — drop it). Wall-clock
  event ordering → monotonic per-source sequence numbers if kept at all.
- Emitted types inherit: rejection sets as factored local unions, names
  from RowDescription, contracts from `inferQueryContract` verbatim. LSP
  comes last; the dual-parser question stays deferred
  (`docs/postgres-language-server-notes.md`).

## Supersession map for DESIGN.md

Superseded:

- The four-component event architecture (FS Tracker / Engine / LSP adapter /
  Codegen communicating via events, workers reporting to an internal state
  machine). Replaced by the derived-value graph plus thin shells.
- The "Nullability rules" section — a sqlc-style join walk sketched before
  the engine existed. The engine's walk, contract, and boundary list are
  `docs/nullability-walk.md` and `docs/argument-nullability.md`.
- `schema` as free-form glob groups with `!` negation (decision 4).
- The subscription/`DatabaseIdentifier` vocabulary (see salvage above).

Still authoritative:

- The schema build pipeline: two-phase apply + deferred validation,
  `check_function_bodies=off`, pg_proc/pg_trigger provenance, the useful
  false positive, byte-level offset mapping, CONCURRENTLY stripping.
- The PREPARE harness: per-statement savepoints, `BEGIN…ROLLBACK` hygiene,
  `DEALLOCATE ALL`, signature extraction via `pg_prepared_statements` +
  `EXECUTE`.
- The pool model (generation/epoch swap) — execution infrastructure used by
  the graph's PREPARE-bearing nodes, not an architecture of its own.
- The snapshot cache (`orderedAstHashes ‖ configFingerprint` — the
  fingerprint now also includes the dialect/preprocessor version), AST-hash
  change detection, atomic + deterministic write-back, the type-mapping
  chain (column → domain brand → enum → pgType → driver default), and the
  `pgsid.yaml` surface as amended.

## The dialect

### Annotations

```sql
-- name: GetAuthor :one
SELECT id, name, bio FROM authors WHERE id = @author_id;
```

`-- name: <Name> :<cmd>` on its own comment line opens a query block, which
runs to the next annotation or EOF and must contain **exactly one
statement** (checked by the libpg-query scan/split the pipeline already
uses). `<Name>` is `[A-Za-z_][A-Za-z0-9_]*`. Commands and their wrapper
result types:

| Command | Wrapper returns | Notes |
|---|---|---|
| `:one` | `Row \| undefined` | first row; no LIMIT is injected, extra rows are not an error |
| `:many` | `Row[]` | |
| `:exec` | `void` | |
| `:execrows` | `number` | `result.rowCount` |

`:execlastid` is rejected permanently (a MySQL concept — the PostgreSQL
answer is `RETURNING`). `:batchexec`/`:batchmany`/`:batchone` and
`:copyfrom` are rejected as not supported yet (pgx-/driver-specific).

Duplicate query names **within a file** are an error; the same name in
different files is fine (emission is per-file modules). In a
codegen-mapped file every statement must belong to a named query;
typecheck-only files (matched by `sql.paths` but under no `out` root) may
contain bare SQL.

### Named parameters

`@name` — an `@` immediately followed by an identifier — is a named
parameter. Detection uses the libpg-query **scanner**, not regex: a
parameter is an operator token that is exactly `@` with an identifier
token adjacent (no intervening whitespace). The scanner already understands
strings, dollar-quoting, quoted identifiers, nested block comments, and
operator tokens (`@>`, `@@` are single tokens and never match), so the
rule inherits PostgreSQL's lexical structure instead of approximating it.

Rules:

- First appearance assigns `$1`, `$2`, …; every later occurrence of the
  same name reuses the same placeholder.
- Mixing `@name` and explicit `$n` in one query is an error.
- Names emit as camelCased keys of the params object.

One documented collision: PostgreSQL has a prefix `@` (absolute value) and
permits custom infix `@` operators, so `a@b` written tight reads as `a`
followed by parameter `@b`. The failure is loud, not silent — the
rewritten SQL is `a $1`, which PREPARE rejects. Workaround: space the
operator (`a @ b` does not match — adjacency fails) or use
`OPERATOR(pg_catalog.@)`. sqlc's `@` shortcut has the same ambiguity.

### The preprocessor contract

The engine, PREPARE, and every analysis see **only native SQL** — the
canonical positional text after annotation extraction and `@name`
rewriting. Alongside it ride the query metadata (name, command, source
range) and the parameter name map. The rewrite records per-replacement
offset deltas so diagnostics map back to the author's text — the same
pattern as `mapStrippedToOriginal` for CONCURRENTLY. Any occurrence of a
`sqlc.` macro is a dialect error whose message names the fix: `sqlc.arg`/
`sqlc.narg` → "run `pgsid migrate-from-sqlc` (or write `@name`)",
`sqlc.slice` → "PostgreSQL: `= ANY(@name)`", `sqlc.embed` → "alias the
columns; pgsid emits presence-group unions instead".

## The artifact

Per source file, per the config `out` map (collocated `.ts` or split
`.d.ts` types + `.ts` wrappers — `DESIGN.md`): for each query, the
canonical SQL constant, a `Params` type, a `Row` type, and (in wrapper
mode) a typed function.

- **Params.** Named params → one object parameter, camelCased keys;
  positional-only queries → positional function arguments (labeled tuple
  in types-only mode). A parameter the engine proves null-rejected is
  `T`; otherwise `T | null`. Joint rejection sets add one local union per
  set, intersected with the flat object type — the emission derives
  directly from the contract's CNF (`paramRejectionSets`); its exact arm
  shape is fixed by goldens in the emitter slice, not prose here.
- **Row.** Column names come from RowDescription verbatim (camelCased);
  the engine's best-effort names stay diagnostic-only (the register's
  FigureColname stance). **Duplicate output names are a dialect error**
  with an alias hint — an object type cannot hold two `id` keys, and the
  `pg` driver's row object silently collapses them, so refusing is the
  only honest emission. Types via the mapping chain; nullability from the
  contract, `T | null`.
- **The arity gate** (register §1) is built into the emitter slice: the
  contract's positional nullability is zipped against RowDescription only
  after a length check; on mismatch every column degrades to nullable and
  a loud diagnostic names the query. The consumer holds both lists by
  construction.
- **Wrappers.** Target `pg` (MVP). Functions take a `Queryable` — the
  structural `{ query(text, values) }` interface `Pool`, `Client`, and
  `PoolClient` all satisfy — so transaction scoping stays the caller's.
  Wrappers import types when split; never duplicate declarations.
- **Determinism.** Atomic writes, skip-if-unchanged byte compare, sorted
  emission order, no timestamps — inherited. Goldens assert byte equality,
  and the golden suite **compiles the emitted artifacts with tsc together
  with narrowing-assertion files** — the presence-group measurements below
  graduate from a scratch experiment into a permanent compile-time check.

## Presence-group unions (replaces sqlc.embed)

The decision: pgsid does not adopt `sqlc.embed`. The row-shaping it
provides is the application's business, and its LEFT JOIN behavior is a
known sqlc wart — the embedded struct cannot say "this whole group is null
because the join missed". What pgsid can do instead is *prove* that fact
and emit it as a union, because the engine already holds it internally:
`ColumnOrigin.optional`'s own contract comment states that a NULL-extended
slice has every pass-through NULL, so any pinned sibling certifies the row
(`src/query/types.ts`). Exporting that fact is contract surface, not new
inference — the output-side analogue of Wave 10's `paramRejectionSets`.

**Contract addition** — BUILT (Wave 13, 2026-08-04; the walk doc's
"Presence groups" section is the rule list, the register's closure entry
the history):

```ts
outputPresenceGroups: { columns: number[]; discriminants: number[] }[]
```

One group per surviving optional extension UNIT (`RelationEntry.nullGroup`
— so `books LEFT JOIN (authors JOIN publishers …)` is ONE group spanning
both tables). Semantics per returned row: either the unit's row was
present, or **every** column in `columns` is NULL; a column in
`discriminants` (provably non-null on the present arm by the walk's full
machinery — catalog, generated expressions, CHECK entailment, the inner
analysis) is NULL **iff** the unit was absent. The implementation
surpassed this section's original sketch in one respect worth naming:
membership does NOT require pass-through origins — extension nulls the
optional side's whole output row, computed columns included, so a
`count(*)` from an optional aggregate subquery is a legitimate
discriminant; only transforming expressions at the group's own scope are
excluded (a `COALESCE` there could manufacture non-NULL from an absent
row). The refilter interplay resolved as predicted: promoted units emit
no group. Groups propagate through subquery/CTE/view re-export (bare
projections lift the inner analysis's groups, with a dead rule for outer
refilters), survive set operations by branch agreement with a
setop-level dead rule, and generation-expression discriminants resolve
under the presumption — the launch residues AND the post-launch
conservatisms (presence consumption of catalog notNull, UNION subset
matching, recursive-CTE groups) all closed 2026-08-04; the register's
Wave 13 entry is the history, and no group-specific conservatism remains
recorded.

**Verification** landed at Wave 10's bar: `@null-group N[*],M`
annotations with compulsory bidirectional coverage (which flagged six
pre-existing fixtures on its first run), per-row falsification across the
five data states, and a two-arm witness whose absent-arm exemption is
derived from the discriminants' own `@unwitnessable` annotations — 29
groups across 24 fixtures. The generated corpus runs the same per-row
oracle annotation-free over its ~9k queries (the presence-group widening:
refilter wrappers, varied-branch unions, duplicate names, generated
columns): 1490 groups, all arms observed, zero falsifications.

**Emission** — factored, mirroring the parameter decision: flat row type ∩
one local union per group. Measured 2026-08-04, tsc 5.9.3 `--strict`, all
compile-verified:

| Case | Result |
|---|---|
| Two-arm union `{aId: number; aName: string} \| {aId: null; aName: null}` | narrows on `aId !== null`, both arms |
| Check on a nullable-even-when-present member (`bio`) | exact asymmetry for free: `bio !== null` proves presence and narrows; `bio === null` concludes nothing |
| Factored `Base & (unionA) & (unionB)` | narrowing distributes through the intersection; the other group is untouched |
| Expanded 4-arm product, two groups | independent narrowing per group |
| `const { aId, aName } = row` destructuring | co-narrows (TS dependent destructuring handles null discriminants) |

**Sequencing.** The contract carries groups from day one — the engine
wave landed before the consumer build started — so the emitter can emit
the factored unions in its first golden set, or ship flat and layer them
in; either way the change is local and golden-driven. An embed-style
*nested* emit remains possible later as pure emitter sugar over the same
data, if ever wanted; nothing is foreclosed.

## Diagnostics

| Category | Severity | Examples |
|---|---|---|
| Config | error (exit 2 if the file is unreadable/invalid, 1 otherwise) | unknown key, double-matched migration file, glob in dir part |
| Dialect | error | missing/duplicate annotation, multi-statement query, mixed `@name`/`$n`, duplicate output column names, any `sqlc.` macro, `:execlastid` |
| Migration apply/validate | error | `DESIGN.md` pipeline verbatim, provenance-mapped positions |
| PREPARE failure | error | cursor mapped through preprocessor deltas to the author's file |
| Arity-gate mismatch | error | artifact degrades all-nullable for that query AND the run fails |
| Engine refusal (`UnsupportedNodeError`) | warning; error under `--strict` | artifact degrades to all-nullable for that query, refusal printed |

Exit codes: 0 = success (warnings allowed), 1 = errors, 2 = usage/config
unreadable. Machine-readable report format stays deferred (`DESIGN.md`).

## migrate-from-sqlc

A one-shot codemod over a query corpus, not a compat layer:

- `sqlc.arg('x')` / `sqlc.arg(x)` / `@x` → `@x`.
- `sqlc.narg('x')` → `@x`. The report **names every parameter whose type
  tightens**: where sqlc's forced-nullable meets an engine proof that NULL
  raises, callers passing null now break at compile time — that is the bug
  being caught, and the report says so per param.
- `expr IN (sqlc.slice('x'))` → `expr = ANY(@x)` — mechanical.
- `sqlc.embed(t)` is left in place (rewriting it means choosing aliases);
  the report lists each site with the aliasing guidance.
- Annotations pass through; `:execlastid`/batch/copyfrom sites are listed
  as manual work.

## Shells over the graph

- **CLI**: `pgsid check`, `pgsid generate`, `pgsid migrate-from-sqlc`.
  A CLI run feeds the graph its inputs once, drains, reports, exits — the
  single-PoV lock falls out of the driver.
- **Watch**: `pgsid generate --watch` / `pgsid check --watch`. The salvaged
  vocabulary acquires input (chokidar + AST-hash dedup, tip/retro debounce
  policy, coalescing, ready barrier); every event terminates at
  "invalidate key K" and the graph recomputes. No computation in trackers.
- **LSP**: last slice; `pgsid lsp` (stdio), diagnostics-first, the
  dual-parser question decided then (`docs/postgres-language-server-notes.md`
  holds the salvage: statement splitting, PREPARE harness productionization,
  error-cursor mapping).

## The parity suite

The executable definition of "one run path", written **before** the watch
shell exists. Corpus entries are (fixture project, edit script). For each:
run batch over the final file state; separately, start the watch shell at
the initial state, replay the edit script, drain to steady state. Compare
emitted artifacts **byte-for-byte** and diagnostics structurally
(path, range, code, severity). A second axis pins determinism: the same
batch run twice is byte-identical. This is the traced/untraced drift
lesson at product scale — the parity property is held by tests, not by
discipline.

## Slice plan

1. **Config + discovery.** Amended `schema` entry grammar; query-file
   discovery; annotation parsing; the preprocessor with offset maps.
   Existing: `src/config/`. Verified by unit fixtures over dialect errors
   and rewrite offset round-trips.
2. **Batch pipeline.** The graph end-to-end: migrations → SchemaBuilder →
   snapshot → catalog → per-query PREPARE + `inferQueryContract` →
   diagnostics. Existing: `src/schema-builder.ts`, `src/catalog/`,
   `src/query/`. `pgsid check` works at the end of this slice. Verified by
   e2e fixtures asserting diagnostics and exit codes.
3. **Emitter + goldens.** Types, wrappers, the arity gate, determinism.
   Verified by byte-golden files that are also tsc-compiled with narrowing
   assertions.
4. **Parity suite.** As above — written against the only existing shell,
   spec for the next.
5. **Watch shell.** Built to make the parity suite pass, from the salvaged
   engine.ts vocabulary.
6. **LSP.** Diagnostics-first adapter over the same graph.

The presence-group engine wave already landed (Wave 13); the emitter can
carry the factored unions from its first goldens.

## Decided against — do not re-open without new information

- **A runtime sqlc compat layer.** Aliases would freeze sqlc's spellings
  into the dialect forever; the codemod pays the cost once. sqlc is a good
  baseline whose macros are workarounds for weaknesses pgsid lacks.
- **`sqlc.embed`.** Superseded by presence-group unions, which are provable
  and need no invented syntax; nested emit stays possible later as sugar.
- **Optional-property nullables** (`field?: T`). Drivers return `null`,
  not absent keys; `?` misstates presence vs nullness. Not configurable —
  a config axis would double every golden.
- **Cardinality inference** (from `LIMIT 1` etc.). Explicit annotations
  only; inference is fragile and silent.
- **A pgsid macro namespace** (`pgsid.arg(...)`). The dialect needs
  annotations and `@name`, nothing else; adopting the macro *shape*
  without its reasons would be cargo cult.
- **`!` negation in schema entries.** The filename glob already selects;
  negation was carrying multi-migrator generality the single-dir entry
  grammar deliberately dropped.
- **A TypeScript config file.** Config is an input to the pure graph;
  executing user code to obtain it punctures hashing, invalidation, and
  watch. YAML stays.
- **Name-keyed contract joining and FigureColname** — already in the
  register; positions join, RowDescription names, duplicate names refuse
  at emission.
