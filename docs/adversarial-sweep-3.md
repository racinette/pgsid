# Adversarial sweep 3 — handoff

## Charter

Two sweeps have run. The first (`docs/adversarial-sweep.md` →
`docs/adversarial-findings.md`) attacked an engine whose mechanisms had aged
under the fixture suites: 246 probes, 15 findings. The second
(`docs/adversarial-sweep-2.md` → `docs/adversarial-findings-2.md`) attacked
the code the FIRST fix phase wrote: ~120 probes, 13 findings — roughly
double the yield per probe, because young code is where the defects are.
That is now the project's most reliable empirical fact about itself, and it
is the entire reason this charter exists: **the second fix phase closed all
thirteen findings on 2026-08-05, and its ten fixes are the youngest code in
the repository.**

One thing makes this surface weaker than either predecessor's at the moment
you receive it. Sweep 2's fix phase verified itself almost entirely through
fixtures its own author wrote in the same session. PGlite refereed the
OUTPUTS through `nullability-soundness.test.ts` — that part is real, and the
suite is green at 2111 tests over 37 files — but no independent probe has
tried an input class the author did not think of. That is precisely the
failure mode `nullability-walk.test.ts`'s own header names: the engine and
the fixture author agree, which is not the same as either being right.

You are a graybox attacker with full source access and one goal: **break the
claims the second fix phase introduced**, plus anything its changes
disturbed. This is a TARGETED sweep, smaller than sweep 2 — the surface is
ten fixes, not a phase's worth of new mechanisms. The engagement rules stand
unchanged:

1. **Find, don't fix.** Record (protocol below) and move on.
2. **Diversify by mechanism, not by query.** Two falsifications through one
   code path are ONE finding.
3. **Synthesize at the end.** Root-cause, propose, do not implement.

Read the FIRST charter for the full statement of each rule, the rank table
(reuse it verbatim — rank 1 `notNull` unsoundness worst, rank 7 imprecision
as register material), and the oracle setup. Everything there applies; this
document replaces only the ATTACK CATALOG and the boundaries list.

## What changed since sweep 2

The fix phase's closure entries — top of section 2 in
`docs/deferred-tasks.md`, ten of them, dated 2026-08-05 — are your primary
reading. Each carries the soundness argument someone made under fix-phase
pressure; those arguments are the attack surface. Read them before the code.
The new mechanisms, by file:

- `src/catalog/snapshot.ts`: `ConstraintInfo.noInherit` (`connoinherit`
  capture), `TableInfo.hasDescendants`, `TableInfo.relkind`, and
  `ColumnInfo.generationDivergesInTree` — the rendered
  `(generated, defaultExpr)` pair compared over the subtree, uncaptured
  descendants diverging.
- `src/query/catalog-adapter.ts`: the `searchPath` option and the `inPath`
  helper every unqualified resolver now walks; `resolveCheckConstraintsTree`,
  `resolveGenerationExprTree`, `resolveIsPartitioned`.
- `src/query/nullability-walk.ts`: `updateBeforeRowHazard` (the partitioned
  two-command hook question), `entryGenerationExpr` (the generation
  `scanInh` split), `groupingOrdinalPositions` plus the recorder's move to
  AFTER the FROM walk, `srfPaddedTargets` / `countSetReturningCalls` /
  `isSetReturningCall` / `BUILTIN_SRF_NAMES` (the lockstep-padding rule),
  `unnestCompositeElementFields` and its from-item refusal,
  `expandCompositeStar`'s column-before-alias reorder and its three new
  value arms, the `func_variadic` gate ahead of the builtin tables,
  `extract`/`date_part` out of `STRICT_TOTAL_BUILTINS`, and the body
  inliner's route through `buildInsertScope` with a caught refusal.
- `src/query/param-nullability.ts`: `columnRejection`'s tree switch for
  update-command targets and its partitioned two-command set;
  `visitStatementWithCtes` / `collectRangeVarNames` / `visitSeenOnly` (the
  unreferenced-CTE gate).
- `src/catalog/diff.ts`: four new comparable properties (`relkind`,
  `hasDescendants`, `generationDivergesInTree`, and `noInherit` riding the
  constraint list).

## Attack surface catalog

Ordered by expected yield. Starters only — go beyond them. Section A's
headline was measured before this sweep was handed over and CONVICTED on
four mechanisms plus a pre-existing one it was not looking for; both are
fixed, and the section now reads "verify, then take the rest". Treat that
as calibration: the yield estimate behind this charter was not optimistic.

**A. Search-path resolution beyond relations. — PROBED AND FIXED BEFORE THIS
SWEEP; VERIFY, DO NOT RE-FIND.** The headline question was measured on
2026-08-05 and convicted: `inPath`'s first-schema-wins rule is right for
relations, types and domains but wrong for FUNCTIONS, which PostgreSQL
resolves by name AND argument types across the whole path. Four
falsifications through three code paths (a NOT NULL domain return read off
the wrong overload, the wrong BODY inlined, the wrong return type expanded
into a column list, and calls whose argument COUNT matched neither
candidate), plus a pre-existing one the probe stumbled into: an overloaded
table function in FROM whose candidates disagree on shape contributed ONE
column against PostgreSQL's three, with no search path involved at all.
Both are fixed — unqualified lookups merge candidates across the path
(deduped by `argTypes`, hiding measured as first-in-path in both
directions), and the FROM site takes shape consensus or refuses. The
closure entry is at the top of `docs/deferred-tasks.md` section 2; the pins
are `search-path.test.ts` and `unsupported-nodes.test.ts`.

The two residues that probe recorded were closed the same day and are
boundaries now, not targets: `DepCatalog.resolveFunctions` is plural, so an
ambiguous call registers against every candidate schema; and the FROM shape
question runs over the full candidate set before any arity narrowing, so a
variadic overload whose candidates agree resolves instead of collapsing to
one column. Both are pinned. ONE thing was left deliberately open and is
worth your evidence rather than your fix: a dependency on a symbol that does
not exist YET — a better-matching overload, or a shadowing RELATION, created
later in an earlier schema changes the answer with no recorded EntityId to
invalidate against. The fix shape is a negative dependency (record the
schemas SEARCHED, not just the entity found) and it is now written down in
`docs/consumer-design.md`; a concrete two-migration sequence demonstrating
the hole is useful material for that slice. Worth knowing while you probe:
the engine's rule for an unknown symbol is nullable wherever it feeds a
FLAG (unknown scalar function, unknown column either spelling, unknown cast
target — all measured) and REFUSAL wherever it feeds a SHAPE (unknown
relation, unknown schema, composite star over an unresolvable expression),
because a column list has no conservative value. The one site that broke
that rule — an unknown FUNCTION in FROM guessing a single column named
after the function — was probed and CLOSED the same session: it was a live
wrong shape for every builtin with named output columns (`json_each` →
`key, value`; `jsonb_array_elements` → one column named `value`, the
guess's own arity with the wrong name), and the snapshot now captures
those shapes from proargnames as `builtinTableFunctions`. What remains
there is the residual guess for builtins WITHOUT named output columns and
for genuinely unknown names, which is what PostgreSQL emits for the scalar
SRFs — find a shape where that residual is still wrong (a composite
element type? an extension's SRF the capture misses? a builtin whose
overloads disagree on shape and is therefore excluded by design?).

What is left for you here is the REST of the section, which nobody has
touched: operators (`resolveOperatorMetadata` collects by name across ALL
schemas, path-agnostic — sound by superset, or is it?); composite types
feeding `unnestCompositeElementFields` and `expandCompositeStar`;
`isNotNullDomainByName`, where the code deliberately answers `false` for a
shadowing non-notNull domain — confirm first-schema-wins IS the rule for a
bare type name in a cast; and the paths nobody passes — empty array, a
schema that does not exist, `pg_catalog` named explicitly, duplicate
entries, and a path under which the unresolvable-relation REFUSAL becomes
wrong.

**B. `BUILTIN_SRF_NAMES` and the padding rule.** A brand-new hand-curated
name table, and both prior sweeps found existing tables failing their own
admission criteria. This one is unfalsifiable-by-construction in the way
`ALWAYS_NOT_NULL` was: a MISSING name means the padding rule silently does
not apply, so the claim that survives is the old one. Sweep it as a table —
which pg_catalog SRFs are absent (`generate_series` variants, `unnest` with
ordinality in the target list, `jsonb_path_query_array` vs `_query`,
`pg_ls_dir`-family, `regexp_matches` with `g`, `string_to_table`,
XML/JSON-table-adjacent forms, extension SRFs) — and then attack the rule
itself: `countSetReturningCalls` excludes `SubLink` subtrees, so what about
an SRF inside a CASE arm, a COALESCE, a cast, a composite-star expansion, or
a lateral? Is "two or more in ONE target list" the right unit — does a
single target-list SRF interact with one in another clause, or with
`ORDER BY`/`DISTINCT` applied over the expansion? Does the LCM lockstep
actually null-pad in the shape the fix assumes when row counts divide evenly
(3 and 6, not 3 and 4)? And the user-function half: `isSetReturningCall`
reads a rendered `returnType` prefix (`SETOF `/`TABLE(`) — find a rendering
that defeats the string test.

**C. `unnestCompositeElementFields` — an enumerated spelling list.** It
recognises exactly three shapes that carry an element type statically: a
cast with array bounds, an `A_ArrayExpr` whose elements are casts, and a
`ColumnRef` whose catalog type renders `T[]`. Everything else falls to one
column, and a provably-composite-but-unresolvable element REFUSES. The
sweep-2 pattern says the defect is an input class nobody tried: a domain
over a composite array; a domain over the composite as element type;
multi-dimensional arrays (`sku_pair[][]` — how many columns?); an array
column re-exported through a CTE, a subquery, or a view (does the
`ColumnRef` branch still find a table entry?); a function RETURNING the
array; `unnest` of an array built by `array_agg` over a composite; a
parameter or a `ROW()` without a cast; `unnest` in `ROWS FROM` mixing
composite and scalar arguments, with and without `WITH ORDINALITY`; the
composite whose field names collide with the ordinality column. Both
directions count: a wrong LIST is rank 2, a refusal of legal SQL is rank 7.

**D. The grouping-set recorder's move.** `collectGroupingSetColumns` now
runs AFTER the FROM walk, inside `buildScope`, and calls
`groupingOrdinalPositions`, which calls `expandCompositeStar` and
`relationColumnsIntrinsic`. Three distinct hazards. (1) SEQUENCING: this is
a change to shared scope construction, the traced/untraced drift lesson's
home ground — verify both entry points still build identical scopes for
grouping-set queries, including ones whose FROM items are functions
(`relationColumnsIntrinsic` memoizes into `entry.functionColumns`, and it now
runs EARLIER than it used to — does that interact with the coldeflist
precomputation path?). (2) REFUSAL SITE: `expandCompositeStar` can THROW,
and it is now reachable from scope construction — a grouping-set query over
an unresolvable composite star may refuse from a different place, or refuse
where it did not, or (worse) throw during a scope build some caller does not
expect. (3) The RULE: ordinals resolve against expanded positions, but the
ALIAS spelling still scans the raw list on the argument that a star-expanded
column cannot be aliased — test that argument (a subquery or CTE re-export
whose star-derived column HAS a name, `GROUP BY` an output name that
collides with a base column, ordinals mixed with aliases in one
`GROUPING SETS`, ordinals under set operations, ordinals past the end of the
expanded list).

**E. `expandCompositeStar`'s new order and arms.** Column-before-alias is the
rule for the parenthesized form — confirm the boundaries. A composite column
whose name collides with an alias of a DIFFERENT relation; a merged
USING/NATURAL column of that name (the code deliberately drops it into the
refusal rather than the alias fallback — is that PostgreSQL's answer?); a
SCALAR column colliding with an alias (now refuses — does PostgreSQL error,
or does it fall back to the alias?); the two-part `(t.c).*` where `t` is a
CTE or subquery rather than a table; a cast to a DOMAIN over a composite; a
`ROW()` with zero fields; nested `((c.p).*)`; `(c.p).*` where `p` is an ARRAY
of composite. The new arms all force every field nullable — find a field that
is provably non-null and see whether the imprecision is worth recording
(rank 7), then try the other direction: a field the expansion claims exists
that PostgreSQL does not emit.

**F. `visitStatementWithCtes` — restructured traversal.** The unreferenced-CTE
gate rewrote the collector's recursion for any statement carrying a WITH
clause, with an early `return` and a hand-rolled `rest` walk. Completeness is
the question: does every rejection site the old generic recursion reached
still get reached? Probe DML-in-CTE combinations (`WITH a AS (INSERT …),
b AS (SELECT FROM a) UPDATE …`), nested WITH inside a CTE body, `WITH
RECURSIVE`, a CTE referenced only from another unreferenced CTE (should stay
unwalked — the transitive closure starts from the body, verify), a CTE
referenced only inside a sub-SELECT's FROM, a CTE whose name collides with a
real table (over-approximation is supposed to keep the OLD behaviour —
confirm it does not instead LOSE a claim), `MATERIALIZED`/`NOT MATERIALIZED`
hints, and the parameter-numbering path (`visitSeenOnly` must still see every
`$n` — a gap makes the contract array short, which is worse than a wrong
flag). Then the soundness direction: is "unreferenced ⇒ never executed" true
for every non-data-modifying CTE PostgreSQL accepts?

**G. The two-command partitioned hook question.** `updateBeforeRowHazard`
fires on `relkind 'p'` and adds `insert` to the UPDATE question. Attack the
boundaries: sub-partitions (a partition of a partition carrying the trigger —
does the tree union reach it, and is the PARENT the relkind the gate reads?);
`UPDATE ONLY parent` on a partitioned table (routing still possible?);
a partition-crossing update that lands in a partition with no trigger while a
SIBLING has one (the union cannot tell them apart — correct, but confirm the
cost is only precision); MERGE with both insert and update arms on a
partitioned target; row movement into a partition whose trigger REJECTS the
row; `DELETE` on a partitioned parent (immune — verify the fix did not widen
it); the DEFAULT partition; attaching/detaching a partition mid-diff. Same
question from the param side, where the gate is `columnRejection`'s.

**H. The relation-SET facts' third and fourth members.** `noInherit` and
`generationDivergesInTree` joined `notNullTree` and `writeRewritesTree`. The
sweep-2 headline was that such facts get converted at the sites someone was
looking at — so look for the FIFTH. What else does the walk read from the
named relation while the query scans the tree? Candidates: identity columns,
DEFAULT expressions feeding the written-value map, the composite/row type of
the relation itself, `relkind` (a partitioned parent's child is `'r'` —
anywhere that matters?), column TYPE divergence (can a child retype an
inherited column? mechanism A assumes not — measure it), and the ordering of
`columns` between parent and child for star expansion. Also attack the two
new facts directly: `generationDivergesInTree` compares RENDERED expression
strings, so a semantically identical expression rendered differently across
the tree costs precision (rank 7) while a semantically DIFFERENT one
rendering identically would be unsoundness — can `pg_get_expr` produce that?
And `noInherit` + `hasDescendants` gate on descendants EXISTING, not on the
scan reaching them.

**I. Diff completeness for the four new properties.** Each new snapshot fact
claims to be diff-comparable. Verify by construction: create the schema
change that flips each one (a first child appearing, a NO INHERIT constraint
dropped, a child redefining a generation expression, a table dropped and
recreated as partitioned) and confirm `diffCatalogs` reports the entity whose
INFERENCE changed — including the parent when only the child moved. A missed
invalidation is invisible to every other suite and is exactly the shape the
consumer build will depend on.

**J. Parity, again, and the builtin flips.** The traced twin must agree
everywhere the fix phase touched: the SRF padding entry (it fabricates a
trace node — same flags?), the grouping-set scope build, the composite-star
arms, the body inliner's caught refusal (does the traced path catch it too?),
and every refusal site. Zero disagreements is the standing record across two
sweeps; a break here is rank 5. Separately, re-check the two builtin flips
against their own criterion: is `extract`'s exclusion complete (what about
`date_trunc`, `age`, `justify_*`, `make_interval` on infinite inputs — the
same input class, one table entry away), and does the `func_variadic` gate
cover the calling conventions that are NOT `VARIADIC <array>` (a variadic
call spelled with ordinary arguments, `VARIADIC` on a user function with
metadata, named notation crossed with variadic)?

## Known boundaries — do not re-find these

Everything in the register's imprecisions table and Decided-against list,
plus BOTH fix phases' recorded costs — sweep 2's are in the ten closure
entries and are deliberate: `date_part`/`extract` conservative on finite
input; every `VARIADIC` array call conservative regardless of the array's
own nullability; composite-star and coldeflist fields all nullable;
generation refused for a whole subtree on any divergence (including a
merely-rendered one); the ONLY-side CHECK and generation conservatisms;
mechanism B dropped for update targets whose tree diverges; unreferenced-CTE
sites dropped; single-SRF target lists unaffected by the padding rule;
partitioned targets voided by a sibling's trigger. Converting any documented
imprecision into an UNSOUNDNESS remains always in scope — that is a finding,
not a boundary violation.

Two questions are open BY DECISION and are not defects to re-report, though
evidence sharpening either is welcome: search-path half (b), where the path
comes from at the consumer boundary (it belongs to
`docs/consumer-design.md`), and the WIDE reachability question behind
finding 9 — `notNull`'s existential claim has no reachability qualifier, so
any provably-dead subtree (`WHERE false`, a never-taken arm) falsifies an
execution-time mechanism. That paragraph is beside the claim semantics in
`docs/argument-nullability.md`. A CONCRETE new dead-subtree shape is worth
recording as evidence for it; the general observation is already on record.

Environment bounds are unchanged from the first report's section 6: no FDW
in this PGlite build, catalog-only ICU, RLS unprobed. Sweep 2's
version-sensitive measurements (the infinite-timestamp `extract` rule from
PG14, partition row-movement trigger order, MERGE-into-view on PG17+) are
re-pinned in fixtures; re-measure if the target ever moves off PG18. The
PGlite artefact from sweep 2 still holds: two mutually recursive `LANGUAGE
sql` functions exhaust the backend and kill the connection for subsequent
probes in the same session — isolate the oracle, not the engine.

## Oracles, protocol, stop condition

As the first charter, verbatim: PGlite referee via the probe loop — every
probe runs `inferQueryContract` on a statement AND executes that same
statement against inline-seeded data in one PGlite, compared per the rank
table. Quarantine fixtures go in `tests/unit/query/fixtures-adversarial/`
(recreate the directory — it retired empty again when this fix phase closed)
carrying the engine's CURRENT claims plus a header with the falsifying data,
the observed outcome, and the suspected mechanism; their DDL goes in
`fixtures-adversarial/schema-adversarial.sql`, deliberately NOT folded into
`fixtures/schema.sql`. The findings log is `docs/adversarial-findings-3.md`,
with failed attacks recorded per section — the negative results earned their
keep in both prior reports. Keep the suite GREEN throughout: 2111 tests, 37
files, 311 fixtures as you receive it. Run from `pgsid/`, pnpm only.

Note one new suite: `tests/unit/query/search-path.test.ts` builds a SECOND
catalog under a non-default path, because the fixture harness builds exactly
one. Section A's probes will need the same trick — the fixture format cannot
express a search path.

Stop when every section A–J has taken at least three structurally distinct
shapes and one free-form session beyond the catalog yields nothing; then
synthesize — root causes, fix sketches, blast radii, recommended order,
negative results — for a fix phase that folds into the register exactly as
the first two did. If the yield is materially lower than sweep 2's (13 in
~120), say so in the report and say what you think it means: two sweeps of
diminishing returns is the evidence that would finally retire this cycle and
send the register to the consumer build unconditionally.
