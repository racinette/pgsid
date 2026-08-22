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

Branch agreement gained a **vacuous arm** on 2026-08-22: a UNION branch
that cannot be absent — a row of literals has no outer join, so no unit,
so no group to agree WITH — no longer kills the other branch's group,
provided every discriminant is notNull there. Every row such a branch
contributes lands in the present arm, so neither half of the contract has
a case to fail on. This is what lets the add-a-sentinel idiom
(`… LEFT JOIN … UNION ALL SELECT 'z', 'z'`) keep the two-arm union its
LEFT JOIN earned, instead of degrading to two independently-nullable
columns. Not in tension with the setop dead rule, which drops groups whose
ABSENT arm cannot occur: an unreachable arm is noise, a reachable one is
the whole feature.

**Verification** landed at Wave 10's bar: `@null-group N[*],M`
annotations with compulsory bidirectional coverage (which flagged six
pre-existing fixtures on its first run), per-row falsification across the
five data states, and a two-arm witness whose absent-arm exemption is
derived from the discriminants' own `@unwitnessable` annotations — 29
groups across 24 fixtures. The generated corpus runs the same per-row
oracle annotation-free over its ~9k queries (the presence-group widening:
refilter wrappers, varied-branch unions, duplicate names, generated
columns): 1490 groups, all arms observed, zero falsifications — **2558 as
of the vacuous arm above (2026-08-22), still all arms observed and none
falsified**, the jump being the sentinel-union queries that had been
losing their group to a branch with nothing to say.

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

## Always-null columns

**Contract addition** — BUILT (2026-08-22):

```ts
alwaysNull?: boolean   // on OutputNullability, beside notNull
```

Proven NULL on EVERY row the statement emits. Additive and mutually
exclusive with `notNull`; absent means "not proven", exactly as
`notNull: false` does. A consumer reading only `notNull` sees what it
always saw, so this breaks nothing.

Emission is the `null` type: `{ deleted_at: null }`. That is the same
tagged union presence groups express, discriminated by VALUE instead of
by row presence — and the motivating cases are ordinary, not exotic:

```sql
-- the soft-delete idiom: deleted_at is dead weight in this query
SELECT id, name, deleted_at FROM product WHERE deleted_at IS NULL

-- a tagged union declared in SQL, and the query picks an arm
CHECK (CASE WHEN status = 'paid' THEN amount IS NOT NULL
                                 ELSE amount IS NULL END)
SELECT amount FROM inv WHERE status <> 'paid'      -- amount: null
```

**How it is proven.** Not a third value threaded through the walk — the
walk is two-valued end to end and a tri-state would touch every branch,
for a fact with a handful of sources where non-nullness has dozens. It is
one conservative question asked beside the walk (`alwaysNullExpr`),
defaulting to false, over two sources: a NULL literal through any cast,
and anything STRICT over a column the evidence pins NULL. The second is
`exprStrictlyForces` run against always-null leaves, which brings the
closure's existing care with it — `COALESCE(dead, 'x')` is correctly not
always-null, `NULLIF`'s left operand is, and `dead + 1` is.

What pins a column comes from the CHECK kernel, asked its mirror goal
(`checkConstraintsProveNull`). **Nothing new is derived for it**: the
harvest already recorded a NullTest of either polarity as a TRUE fact —
a NullTest is total, so notFALSE means TRUE — so the fact set has always
contained `amount IS NULL` on rows where the CASE selects that arm. Only
the final question was single-polarity. `WHERE col IS NULL` needs no
separate rung either, since evidence NullTests are harvested the same way.

**Verification is the inverse of the nullable side's, and far stronger.**
A wrong `alwaysNull` is falsified by ANY non-NULL value, so every returned
row is a test and no witness has to be constructed — the opposite
economics to a `nullable` claim, which needs a NULL to appear and may wait
forever (see the register's unwitnessed residue). Both corpora gate it.
Measured: **17 claims across the hand fixtures over five data states, 0
falsified**; 0 in the generated corpus, which is built around join structure
and emits neither an `IS NULL` filter nor a partitioning CHECK. The count
went 8 → 10 → 11 → 14 → 17 as each boundary below was measured and closed.

Fixtures can pin it: `-- @alwaysNull` occupies the same annotation slot as
`@nullable`/`@notNull` and is checked BIDIRECTIONALLY, like the presence
groups — an engine claim with no marker is an undocumented claim, a marker
the engine no longer makes is stale.

The first 8 were the shapes you would want: three soft-delete filters
(`extreme-correlated-everywhere`, `extreme-order-dashboard-multi-join`,
`extreme-product-catalog-comprehensive`), two CHECK discriminators
(`check-and-concatenated`, `check-case-discriminator-nullable`), and three
literal NULLs. `check-case-discriminator-nullable`'s own comment had said
the quiet part for months — *"the same CHECK forces it NULL on every
in-flight row"* — as prose consolation for a claim the engine could not
make. It makes it now.

**Coverage**, all four boundaries measured rather than argued (2026-08-22,
same day; the first cut's "not yet covered, deliberately" list turned out to
be three unmeasured guesses and one real gap):

| Shape | State |
|---|---|
| SELECT, table column, WHERE or CHECK evidence | yes |
| Strict expressions over an always-null column | yes |
| DML RETURNING | yes — SELECT's NEW-row channel, core masked, guards free |
| Bare re-export across subquery / CTE / view | yes, with **no join-state gate** |
| Outer evidence + inner CHECK, across a boundary | yes, via `originCheckEntailment` |
| OPTIONAL entries, outer-join `ON` quals as evidence | yes |
| Written values — INSERT / UPDATE / MERGE SET a NULL | yes |
| NULL literal under a strict operator or function | yes |
| `NULLIF(c, c)`, all-NULL `CASE`, all-NULL `COALESCE` | yes |
| Set operation where every branch is always-null | yes |
| Scalar subquery, or outer join, that no row can satisfy | yes |
| Aggregate / window over an always-null input | yes, curated |
| A column the CHECK forces NULL from a WRITTEN value | **no** — value tracking |

Three findings from measuring, none of which the armchair produced:

**The OPTIONAL gate was inert.** Removing it changed nothing, because every
evidence source that constrains an alias also promotes it out of OPTIONAL.
The one that does not is the extending join's own `ON` qual, which
`impliedQuals` withholds — correctly for a non-null goal, since on a
NULL-extended row that qual was not TRUE. For a null goal the case-split
closes it: matched ⇒ the qual held and the CHECKs apply; extended ⇒ every
column is NULL anyway. `qualsHoldingWhenPresent` supplies them, LEFT and
RIGHT only — a FULL join emits rows where the entry is present and the qual
was false, and the measured control returns a non-NULL there.

**The re-export needs no join-state gate**, which is the one place this
channel is stronger than its notNull mirror rather than weaker. For notNull
an OPTIONAL entry destroys the claim; here both arms agree.

**DML RETURNING was wired into the traced assembly and not the untraced
one** — so `inferNullability`, the function every consumer calls, silently
did not compute the flag, while its traced twin did. No test could see it:
the two are checked for agreement on `notNull`, and the annotation gate only
runs the untraced path. A one-line probe against PostgreSQL found it.

**And the `@alwaysNull` annotation gate caught a real unsoundness on its
first run.** `originAlternativeEntailment` has two shortcuts that conclude
NON-null ("required alternative + non-null per stored row"); reading their
boolean as "proved the goal" while the goal was NULL made `agg.order_id`
always-null under `LEFT JOIN (SELECT order_id, count(*) …) agg`. Both are
gated on the goal now. Bidirectional coverage is what surfaced it — an
engine claim with no marker fails, so a new claim cannot appear unannounced.

**The eleven remaining shapes were swept 2026-08-22 through a RED SUITE**
(`tests/unit/query/always-null-red.test.ts`), following the convention
`subtree-evaluation-red.test.ts` set: every `it.fails` asserts the target and
passes because the engine does not claim it yet, so landing the mechanism
forces the flip to a plain `it` in the same commit. Every case was
adjudicated against PostgreSQL first — targets observed all-NULL, guards
observed carrying values. 29 cases: 15 targets landed, 13 guards, 1 red.

Three of the five cost estimates were wrong, all in the same direction — I
had guessed at a mechanism instead of measuring one:

- **A** was "one line: widen the leaf predicate". Widening it did nothing;
  `exprStrictlyForces` only calls the leaf callback for a ColumnRef, so a
  constant fell through before the predicate was consulted. The fix is in
  the closure's dispatch, which now ASKS the leaf about an `A_Const` rather
  than answering. Delegating keeps it a no-op for the two column-side
  callers, whose predicates reject non-ColumnRef nodes.
- **D** was "a curated list like the non-null one". It is a curated list and
  it is NOT that one: `stddev`/`variance` are absent there and present here,
  `array_agg`/`json_agg`/`jsonb_agg` present there and absent here (they
  COLLECT NULLs into a non-null container). Admission demands NULL over
  all-NULL input AND over empty input, which is what lets FILTER be ignored.
- **C** was "a relation-emptiness analysis the walk has no notion of". It
  needed no new analysis: `predicateNeverTrue` reads a bare literal
  syntactically — which is `collectClosedSubtrees`' own instruction, since
  it excludes bare A_Consts because "alone its answer restates what the AST
  already says syntactically" — and asks the statement map for everything
  else, which already covers closed comparisons in qual position.

What is left is one case, and it is value tracking rather than a gap here:
`UPDATE inv SET status = 'draft' RETURNING amount` forces `amount IS NULL`
on the NEW row through the CHECK, but `amount` is not written — what forces
it is the CHECK reading the NEW `status`, which the statement DID write, and
a written value reaches the kernel as a written-value fact rather than as
evidence. Same family as the generated corpus's `r_ce`. It sits in the red
suite as the one live `it.fails`, not in this paragraph.

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

## search_path, and the negative dependency it forces

The engine takes a search path (`buildNullabilityCatalog`'s `searchPath`,
default `["public"]`) and resolves unqualified names through it correctly —
relations, types and domains by name, functions by merged candidate set,
both measured. What the engine cannot decide is WHERE the path comes from:
it is a per-connection or per-project input (`SET search_path` is a real
one — `docs/postgres-language-server-notes.md`), so this slice owns it. Two
things fall out, and the second is the one that will be missed.

**(a) The input.** Config-level default, overridable per query. Whatever the
spelling, it is an INPUT to the derived-value graph, so changing it
invalidates every query checked under it — the same triangle as a migration
edit, keyed on the path itself.

**(b) Dependencies must record the resolution ATTEMPT, not just its
result — a NEGATIVE dependency.** Today `extractDeps` records the entity
it found. Under a multi-schema path that is not enough, and the failure is
silent:

```sql
-- checked with path [app_s, public]; app_s.t does not exist
SELECT * FROM t;              -- resolves public.t, id notNull. Correct.
-- a later migration
CREATE TABLE app_s.t (zzz integer, qqq text);
```

Nothing was unknown at check time and nothing the query depends on was
modified, so no recheck fires — while the query now resolves to a different
relation with a different column list. The recorded dependency has to be
"searched app_s (ABSENT), found public.t", so that CREATING `app_s.t`
invalidates. The same holds for functions, where a new better-matching
overload appearing earlier in the path changes what the consensus rule
concludes (`docs/deferred-tasks.md`, open item 2, records why the plural
`resolveFunctions` cannot close this half).

Note that "assume nullable when the symbol is missing" — the engine's rule
for every unknown symbol that feeds a FLAG — does not help here: nothing
was missing, the resolution succeeded, and it succeeded at the wrong
relation only in hindsight. This is an invalidation-index property, not an
inference one.

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
