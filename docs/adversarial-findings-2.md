# Adversarial sweep 2 — findings

## What this document is

The report of the targeted graybox sweep specified in
`docs/adversarial-sweep-2.md`: ~120 probes over 12 rounds aimed at the code
the fix phase wrote on 2026-08-04/05, each running `inferQueryContract` on a
statement AND executing that same statement against inline-seeded data in one
PGlite, compared per the first sweep's rank table. PGlite is the referee
throughout; every behavioural claim below was measured, not read off
documentation.

**Thirteen findings.** Eight rank-1 (`notNull` unsoundness), three rank-2
(shape) — *all three of which also falsify a flag*, so eleven statements in
total carry a wrong `notNull` — and two rank-3 (param contract, one of them
conditional on the existential reading, see finding 8). **Zero rank-5
(parity)** and **zero rank-6 (crash)** across every probe: the traced and
untraced walks agreed on columns, groups and refusal sites everywhere,
including all the new refusal and void paths, and nothing threw outside
`UnsupportedNodeError`.

The catalog's two named suspects both landed: `CHECK … NO INHERIT`
entailment (finding 2) and composite-element `unnest` (finding 4). The
highest-yield section was not in the catalog's order, though — **section A's
first shape, partition row movement, is the same class of defect as the
post-phase probe that chartered this sweep** (a hook question asked about the
wrong thing), and section G's re-sweep of the "already swept" builtin tables
produced two more rank-1s from input classes nobody had tried.

Each finding has a quarantine fixture in `tests/unit/query/fixtures-adversarial/`
carrying the claims the engine CURRENTLY makes, plus a header with the
falsifying data, the observed outcome, and the suspected mechanism. The DDL
those fixtures need is `fixtures-adversarial/schema-adversarial.sql`; it is
deliberately NOT folded into `fixtures/schema.sql`, because the fixtures beside
it record wrong claims and the suite must stay green until the fix phase. The
full suite is green as of this writing.

Nothing was fixed. Section 3 proposes fixes with blast radius and an order.

**Status: the fix phase ran (2026-08-05) and closed all thirteen
findings**, one commit per fix in section 3's recommended order — with one
deviation from the sketches: fix 5 kept PRECISION (the recorder resolves
ordinals against the expanded list via `groupingOrdinalPositions`) rather
than taking the refuse-flag alternative, and fix 10's mechanism-B tree
switch and unreferenced-CTE gate landed together as one commit. The
quarantine directory is retired: every fixture graduated into
`tests/unit/query/fixtures/` with corrected claims and witnesses (the
MERGE-source fixture's qty gained the row-implied promotion the old shape
had landed on `id`), the DDL folded into the fixture schema, the
search-path halves pinned in `search-path.test.ts` (they need a second
catalog the fixture harness cannot build), and the composite-star refusal
re-pinned in `unsupported-nodes.test.ts` on the shapes that remain
unresolvable (unknown cast targets, subquery composite columns — the ROW
constructor now expands). Fix 9(b) — where the search path comes from — is
recorded for the consumer design, and finding 9's wide reachability
question sits beside the claim semantics in
`docs/argument-nullability.md`, deliberately open. The closure entries are
in `docs/deferred-tasks.md` section 2. This document remains the sweep's
report, unmodified below this line.

---

## 1. Findings

| id | rank | claim vs reality | fixture |
|---|---|---|---|
| 1 | 1 + 3 | an UPDATE that moves a row across partitions fires the DESTINATION partition's BEFORE **INSERT** trigger; the hook gate asks only about the statement's own command | `partition-row-movement-trigger.sql`, `partition-row-movement-param.sql` |
| 2 | 1 | `CHECK … NO INHERIT` on a parent is never copied to a child, but entailment reads it for a tree scan | `check-no-inherit-tree.sql`, `check-no-inherit-conditional.sql` |
| 3 | 1 | a child may define its OWN generation expression for an inherited column; the walk evaluates the parent's | `generated-child-override.sql` |
| 4 | 2→1 | `unnest` of a COMPOSITE-element array expands the element's FIELDS; the engine emits one column per argument | `unnest-composite-shape.sql`, `unnest-composite-merge-source.sql` |
| 5 | 2 | relation resolution hardcodes `public` while `resolveTable`'s documented contract is search-path resolution — shadowing answers for the wrong table, non-public names refuse | `search-path-shadow.sql`, `search-path-refusal.sql` |
| 6 | 1 | a LANGUAGE sql body's `INSERT … RETURNING` builds its scope with `buildDmlScope`, bypassing the INSTEAD OF void and the DO INSTEAD rule refusal | `body-insert-instead-of-view.sql`, `body-insert-do-instead-rule.sql` |
| 7 | 1 | two SRFs in one target list expand in lockstep and the SHORT one is NULL-padded after it returned | `srf-target-list-padding.sql` |
| 8 | 3* | mechanism B reads the named relation's `attnotnull` while UPDATE/DELETE/MERGE target the tree | `param-mech-b-inheritance-tree.sql` |
| 9 | 3 | an execution-time rejection site inside an UNREFERENCED CTE never runs, in any data state | `param-unreferenced-cte.sql` |
| 10 | 1 | the grouping-set ORDINAL spelling resolves against the RAW target list, where a star entry is one ResTarget and N columns | `grouping-set-ordinal-star.sql` |
| 11 | 1 | `extract`/`date_part` on an infinite timestamp/date/interval return NULL for every non-monotonic field | `builtin-extract-infinity.sql` |
| 12 | 1 | `VARIADIC <null array>` defeats `ALWAYS_NOT_NULL_BUILTINS` and `FIRST_ARG_BUILTINS`, which reason about elements | `builtin-variadic-null.sql` |
| 13 | 2→1 | `(x).*` where `x` names both an alias and a composite COLUMN of it: PostgreSQL picks the column, the engine the alias | `composite-star-alias-clash.sql` |

\* Finding 8 is conditional: `notNull` is existential, and a parent-stored
row is an execution in which the NULL binding does raise. It is recorded
because the claim is unwitnessable in every child-only data state, the
asymmetry with the output side is unintended (`resolveColumnNotNullTree`
exists and this site does not call it), and composing it with finding 2
(`CHECK (false) NO INHERIT` on the parent) makes it unconditional.

Findings 4, 5 and 13 are shape defects. All three also produce a live
`notNull` falsification, because the misalignment lands a non-null flag on a
column that comes back NULL — for 13 the arity is even IDENTICAL (2 vs 2),
which is the second instance this project has met of the ordered-name gate
being the only guard that can see the defect (sweep-1 finding 10 was the
first). That is now two independent arguments for the same scheduled item.

One rank-7 is recorded as register material: `composite-column-star-over-refusal.sql`.

---

## 2. Root causes

Nine mechanisms account for all thirteen. Five of them are one shape of one
idea, and that idea is the sweep's headline:

> **A fact was moved from "the named relation" to "the relation set", or from
> "the statement" to "the row PostgreSQL reports" — and the move was made at
> the sites the fix phase happened to be looking at, not at every site that
> asks the question.**

RC-1, RC-2, RC-3 and RC-6 below are each one unconverted site.

### RC-1 — the hook question is per-command, and row movement crosses commands

**Finding 1.** `src/query/nullability-walk.ts` (`buildUpdateScope`,
`buildMergeScope`), `src/query/param-nullability.ts` (`columnRejection`).

`writeRewritesTree` unions `beforeRow` over the inheritance subtree, which
correctly answers *"can any relation this write can land in rewrite the row?"*
— for the statement's own command. It then throws away which member
contributed which command. That is fine for INSERT (routing lands an insert
in a partition, which fires that partition's BEFORE INSERT) and for UPDATE of
a stationary row. It is not fine for **row movement**: PostgreSQL performs a
partition-crossing UPDATE as DELETE + INSERT and fires the destination
partition's **BEFORE INSERT** triggers on the new row (measured — the routed
row came back with `a` nulled by a trigger declared `BEFORE INSERT`).

So for an UPDATE (and MERGE's UPDATE arm) on a partitioned target, the
rewriting question is `beforeRow ∩ {"update", "insert"} ≠ ∅`, not
`beforeRow.has("update")`. The param side inherits it exactly: the same
destination trigger was measured RESCUING a NULL binding
(`NEW.b := coalesce(NEW.b, 'rescued')`) that the stationary control raises on.

Two negative results bound it: an INSERT through the parent and a MERGE
`NOT MATCHED … INSERT` DO see the partition's trigger (the tree union
working), and the non-moving UPDATE is correct.

### RC-2 — the CHECK path's "children carry their own copy" is false for `NO INHERIT`

**Finding 2.** `src/catalog/snapshot.ts` (`queryConstraints`),
`src/query/check-entailment.ts` (by consumption).

RC-3 of the first fix phase closed the `attnotnull` half of the relation-set
problem and explicitly recorded that *"the CHECK path needed nothing: children
carry their own pg_constraint rows and cannot drop or invalidate them
(measured)"*. The measurement was right and the generalization is not:
`connoinherit` constraints are never copied to a child, and the snapshot does
not select `connoinherit` at all, so a NO INHERIT constraint is
indistinguishable from an inheritable one.

The sweep hunted the whole family of divergence routes and **every other one
is refused by PostgreSQL** (each measured):

| route | PostgreSQL |
|---|---|
| `ALTER TABLE ONLY p ADD CHECK …` (no NO INHERIT) | *constraint must be added to child tables too* |
| `ALTER TABLE child DROP CONSTRAINT <inherited>` | *cannot drop inherited constraint* |
| `ALTER TABLE child ALTER CONSTRAINT … NOT ENFORCED` | *cannot alter enforceability … of relation* |
| `ALTER TABLE ONLY p VALIDATE CONSTRAINT …` | *constraint must be validated on child tables too* |
| `ALTER TABLE ONLY p RENAME COLUMN …` | *inherited column must be renamed in child tables too* |
| `CHECK … NO INHERIT` on a PARTITIONED table | *cannot add NO INHERIT constraint to partitioned table* |

That last row is the fix's shape: NO INHERIT is an **inheritance-only**
hazard, exactly like the `ALTER TABLE ONLY … SET NOT NULL` hole RC-3 closed,
and partitioned trees are provably safe.

The defect reaches origin tracking too: the same falsification lands through
a CTE re-export with the filter outside (measured), so the origin-side CHECK
consumer is a second call site, not a second bug.

### RC-3 — the generation expression has no relation-set analogue at all

**Finding 3.** `src/catalog/snapshot.ts` (`ColumnInfo.generated` /
`defaultExpr`), `src/query/nullability-walk.ts` (generated-column dispatch,
`storedRowNotNull`).

`notNullTree` and `writeRewritesTree` exist. The generation expression is the
third per-column fact the walk reads from the named relation while the query
scans the tree, and it got no analogue. A child MAY define its own generation
expression for an inherited column — PostgreSQL accepts
`CREATE TABLE c (d int GENERATED ALWAYS AS (nullif(a, a)) STORED) INHERITS (p)`
(measured, and it is the *only* accepted divergence besides NO INHERIT) — and
the walk then evaluates a formula the child's rows were never computed with.

Unlike RC-2 this one has no cheap conjunction: the honest tree answer is
"every descendant's expression proves non-null", which means walking each
child's expression, or refusing to conclude when any descendant's expression
differs from the parent's. The second is one string comparison and is
probably the right price.

### RC-4 — the SRF shape rules count arguments, not element types; and row counts interact

**Findings 4 and 7.** `src/query/nullability-walk.ts`, the RangeFunction arm
and the target-list SRF handling.

Two shapes of one blind spot: **a set-returning function's contribution is
computed without asking what it actually returns per row.**

- In FROM (finding 4), sweep-1 finding 12 established "one column per array
  argument" for `unnest`. When the element type is a COMPOSITE, PostgreSQL
  expands the element's fields instead, so one argument contributes N
  columns. Measured through five spellings — bare, `WITH ORDINALITY`, a
  qualified star, a CTE re-export, `ROWS FROM`, and as a MERGE source. The
  MERGE-source spelling composes with the source-first order (sweep-1
  finding 10) and shifts the entire target list by one.
- In the TARGET LIST (finding 7), two SRFs are expanded in lockstep to the
  LCM of their row counts and the short one is NULL-padded. That padding NULL
  is manufactured by the projection *after* the function returned, so a
  `SETOF <NOT NULL domain>` — whose per-call notNull claim is entirely
  correct — comes back NULL. Measured for both a literal-bodied and a
  table-reading SETOF function; a scalar call in the same position repeats
  instead of padding, which is the control.

### RC-5 — a promise in the catalog interface that the adapter does not keep

**Finding 5.** `src/query/catalog-adapter.ts` (`resolveTable`, `resolveIn`),
against the contract on `NullabilityCatalog` in `src/query/types.ts`.

The interface documents `resolveTable` as *"resolve by (schema, name) via
search_path — if `schema` is undefined, search each schema in the search path
in order"*, and `DepCatalog` even explains that the search path is passed
separately *"so the same catalog can serve queries with different search_path
settings"*. The nullability adapter takes no search path and substitutes
`"public"`.

This was harmless while every relation lived in `public`. The
unresolvable-relation REFUSAL the fix phase added (sweep-1 finding 11) made
half of it loud — a non-public relation now refuses instead of silently
contributing zero columns — and left the other half silent and worse: when
`public` happens to hold a same-named relation, the engine answers
confidently for the wrong one. Both halves are the same missing input.

This is the one finding whose fix is not local to the engine: it needs the
consumer to decide what search path a query is checked under
(`docs/postgres-language-server-notes.md` already notes `SET search_path` per
connection as a real-world input).

### RC-6 — the function-body DML path is a second, unpatched copy of the DML scope builders

**Finding 6.** `src/query/nullability-walk.ts`
(`analyzeSqlFunctionReturn` / `analyzeSqlFunctionReturnTraced`, the
`"InsertStmt"` arm).

The first fix phase put the rewrite-hook responses INTO the scope builders
precisely so that both entry points would share them by construction — the
lesson from the traced walk's earlier drift. The function-body inliner is a
THIRD caller, and it calls `buildDmlScope` directly rather than
`buildInsertScope`, so none of it runs: no INSTEAD OF void, no DO INSTEAD
rule refusal, no written-value map.

Before RC-1 of the first fix phase this path was nearly unreachable for
strict functions (priority 4 answered first). Making the fall-through
load-bearing is exactly what exposed it — which is the charter's hypothesis,
confirmed.

The controls matter: the top-level spelling and the data-modifying-CTE
spelling of the identical INSERT are both handled correctly (measured), so
this is a bypassed call site, not a missing rule.

### RC-7 — an ordinal into a list that has not been expanded yet

**Finding 10.** `src/query/nullability-walk.ts`
(`collectGroupingSetTermKeys`).

Sweep-1 finding 9 taught the grouping-set recorder two more spellings, an
output ORDINAL and an output ALIAS, both resolved by indexing/scanning
`targetList`. A star entry is ONE `ResTarget` and N output columns, so
`targetList[n-1]` is the wrong entry as soon as any star precedes the
ordinal, and for the star entry itself `collectColumnRefKeys` walks a
`ColumnRef` whose fields are `[String, A_Star]` and records nothing usable.
`groupingSetColumns` comes back empty and the NULLing override — the whole
point of the mechanism — never applies.

The alias spelling has the same shape of hole (`rt?.name` is undefined for a
star entry) but is unreachable: a star-expanded column cannot be aliased.

The plain `GROUP BY ROLLUP(1, 2)` over explicit refs is correct; `CUBE(1)`
and `GROUPING SETS ((1,2,3,4,5), ())` over stars both falsify.

### RC-8 — the builtin tables were re-swept with the same input class as before

**Findings 11 and 12.** `src/query/nullability-walk.ts`
(`STRICT_TOTAL_BUILTINS`, `ALWAYS_NOT_NULL_BUILTINS`, `FIRST_ARG_BUILTINS`).

Sweep 1 pruned six members with adversarial *values* — no-match regexes,
empty arrays, NaN. This sweep changed the axis twice:

- **Infinite temporal values** (finding 11). `extract` and `date_part` are
  the same function under two names and both are in `STRICT_TOTAL_BUILTINS`.
  For `±infinity` PostgreSQL returns `±Infinity` only for monotonically
  increasing fields and **NULL** for the rest — measured NULL for `month`,
  `day` and `hour` on `timestamp`, `timestamptz`, `date` and `interval`. The
  table's own admission criterion excludes them.
- **The calling convention** (finding 12). `ALWAYS_NOT_NULL_BUILTINS`
  ("concat ignores NULL arguments") and `FIRST_ARG_BUILTINS`
  ("concat_ws(',', NULL) is ''") reason about ELEMENTS. `VARIADIC <array>`
  passes the variadic parameter as one array, and a NULL array yields NULL:
  measured for `concat`, `concat_ws` (with a non-null first argument!),
  `jsonb_build_array`, `json_build_array`, `jsonb_build_object`, `num_nulls`
  and `num_nonnulls`. `concat(VARIADIC ARRAY[NULL,NULL]::text[])` is `''`,
  so the distinction is array-nullability, not element-nullability — and no
  branch in priority 6b inspects `FuncCall.func_variadic`.

The second one is the more interesting defect: `ALWAYS_NOT_NULL` concludes
without looking at arguments at all, so it is unfalsifiable-by-construction
until a calling convention changes what "the arguments" means.

### RC-9 — `expandCompositeStar` tries the alias branch before asking whether a column wins

**Finding 13**, and the rank-7 over-refusal beside it.
`src/query/nullability-walk.ts` (`expandCompositeStar`).

The arm resolves exactly two shapes — bare alias, function call — and tries
the alias first. PostgreSQL's rule for the parenthesized `(x).*` form is the
opposite: the parentheses force the VALUE reading, so a composite column
named `x` beats a range-table alias named `x`. Same arity, entirely different
columns, and the engine's `id`-notNull lands on `sku`.

The over-refusal is the same arm's other end: `(c.p).*` over a composite
COLUMN, `(s.c).*` over a subquery's, and `(ROW(1,2)).*` — all legal, all
refused, all with a shape the catalog can produce. The fix phase already
measured that a NULL composite nulls every field, so the precise answer
(fields, all nullable) is available for exactly the same cost as the refusal.

---

## 3. Proposed fixes, blast radius, order

Soundness first, cheapest first — the first sweep's order, which worked.
Every entry below is a proposal; none was implemented.

**Fix 1 — RC-8, the two builtin table entries.** Drop `extract` and
`date_part` from `STRICT_TOTAL_BUILTINS`; make priority 6b consult
`FuncCall.func_variadic` and fall through to conservative nullable for any
variadic-array call in all three tables. *Radius:* the `extract` half costs
precision on every finite-timestamp `extract`, which is the common case —
the same trade sweep-1 finding 7 made for `substring`. Grep the fixture suite
and generated corpus for `extract`/`date_part` before landing; the corpus's
function axis may carry them. The variadic half flips nothing that exists
(no fixture spells `VARIADIC`).

**Fix 2 — RC-1, the row-movement command crossing.** In `buildUpdateScope`
and `buildMergeScope`'s UPDATE arm, when the target is a PARTITIONED table
(`relkind 'p'` — the snapshot now captures it) test
`beforeRow.has("update") || beforeRow.has("insert")`. Same test in
`columnRejection`. *Radius:* zero for plain inheritance (no routing) and
zero for partitioned targets whose partitions carry no INSERT triggers;
`trigger-partition-routed.sql` already pins the INSERT direction and does not
move. Cheap, local, no new catalog field.

**Fix 3 — RC-6, the third scope-builder caller.** Route the body inliner's
`"InsertStmt"` arm through `buildInsertScope`. It already has the statement
and a scope to use as outer. Note that `buildInsertScope` can THROW the DO
INSTEAD rule refusal, and a refusal from inside a function body is a refusal
of the whole statement — which is right (the body's return value is
unanalysable, not the caller's column list) but should be a deliberate
decision, and the alternative (catch it, return nullable) is one line. Prefer
the catch: an inlined body is an optimization, and losing it should cost
precision, not the statement. *Radius:* two claims in the fixture suite at
most; `insert_tag`-style bodies target trigger-free tables.

**Fix 4 — RC-2, `NO INHERIT`.** Capture `connoinherit` in `queryConstraints`,
carry it on `ConstraintInfo`, include it in `diffCatalogs` (dropping NO
INHERIT changes inference), and have the CHECK consumer skip NO INHERIT
constraints when the reading entry is a tree scan (`scanInh !== false`) whose
relation HAS descendants. The origin-side consumer needs the same gate;
origins carry no ONLY bit, so — exactly as RC-3 did for `notNullTree` — the
conservative reading applies unconditionally there. *Radius:* zero for every
existing fixture (none uses NO INHERIT), and zero for partitioned trees,
where PostgreSQL refuses the construct. This is the cleanest of the eight.

**Fix 5 — RC-7, ordinals over an expanded list.** Resolve grouping-set
ordinals against the EXPANDED target list. The expansion already exists at
the assembly loops; the recorder runs before them. Either expand the star
entries once up front for the recorder's purposes, or record a "contains a
star, refuse to resolve ordinals" flag and treat the whole grouping-set
column set as unknown — which, since the set only ever turns claims
nullable, means turning every grouped column nullable. The second is sound
and trivially safe; the first keeps precision. *Radius:* the first sweep's
grouping-set fixtures use explicit refs and do not move.

**Fix 6 — RC-4, the two SRF shapes.** (a) In FROM: when an `unnest` argument's
element type is a composite the snapshot knows
(`resolveCompositeType` exists), contribute that composite's fields, all
nullable; when it is a composite the snapshot does NOT know, refuse at the
from-item site rather than emit one column. (b) In the target list: when a
target list contains TWO OR MORE set-returning calls, every SRF-produced
column drops to nullable — the padding is unconditional and the row counts
are not statically known. A single SRF in the target list is unaffected.
*Radius:* (a) is additive except for the refusal arm; (b) touches any
fixture with two SRFs in one target list — grep first.

**Fix 7 — RC-9, the composite-star arm.** Reorder: try column resolution
before alias resolution for the single-part `(x).*` shape, and add arms for a
qualified composite column and a `RowExpr`/`TypeCast` whose composite type the
catalog knows — fields, all nullable, which is what the FuncCall arm already
does. Keep the refusal for genuinely unresolvable composites. *Radius:*
`composite-star-whole-row.sql` pins the non-clashing alias spelling and must
keep working; the reorder only changes behaviour when a column of that name
exists, which is the clashing case.

**Fix 8 — RC-3, generation expressions across the tree.** Add
`ColumnInfo.generatedTree` — or, cheaper, a `generationDivergesInTree` bit
computed the same way `notNullTree` is (compare each descendant's
`defaultExpr` string to the parent's; any difference, or any uncaptured
descendant, sets it). A tree scan of a column with the bit set drops to
nullable. Diff-included. *Radius:* zero for childless tables, which is every
generated-column fixture today.

**Fix 9 — RC-5, search_path.** Two parts and they are NOT the same size.
(a) Thread a search path into `buildNullabilityCatalog`'s `resolveTable`,
`resolveWriteRewrites*`, `resolveColumnNotNull*` and the function resolvers,
defaulting to `["public"]` — mechanical, and it makes the documented contract
true. (b) Decide where the search path comes from at the consumer boundary:
it is a per-query (or per-project) input the engine cannot discover, and the
`postgres-language-server-notes` already flag it. **This one belongs in the
consumer design, not in the engine fix phase** — schedule (a) with the fix
phase and (b) with the slice that owns connection settings.

**Fix 10 — RC-5's other half and finding 9, both deferrable.** The
unreferenced-CTE reachability hole (finding 9) is one narrow fix — skip
CTEs no `RangeVar` references when collecting parameter facts — and one wide
question: `notNull`'s existential claim has no reachability qualifier, so
*any* provably-dead subtree (a `WHERE false` conjunct, a never-taken arm)
falsifies it for every execution-time mechanism, not just the frame offset.
Do the narrow fix; record the wide question in the register beside the
existential-semantics paragraph in `docs/argument-nullability.md`. Finding 8
(mechanism B over the tree) is the same shape of "the claim is technically
existential" argument and should be settled the same way: switch
`columnRejection` to `resolveColumnNotNullTree` for UPDATE/DELETE/MERGE
targets — a dropped claim, never a wrong one — and note the asymmetry is
closed.

### Recommended order

1. Fix 1 (builtin tables) — smallest, and the only one that can flip existing
   corpus claims, so land it while everything else is still stable.
2. Fix 4 (`NO INHERIT`) — cleanest soundness win, zero radius.
3. Fix 2 (row movement) — local, zero radius.
4. Fix 3 (body scope builder) — one call site.
5. Fix 8 (generation across the tree) — one snapshot field, mirrors an
   existing one.
6. Fix 5 (grouping-set ordinals) — decide precision-vs-safety first.
7. Fix 6 (SRF shapes) — the largest additive change; do it after the flag
   fixes so its shape churn lands on correct flags.
8. Fix 7 (composite-star reorder).
9. Fix 10 (param-side conservatism: tree flags, unreferenced CTEs).
10. Fix 9(a) (search-path threading), with 9(b) handed to the consumer design.

### And the gate, again

Findings 4, 5 and 13 are three more arguments for the **arity-and-order gate**
(register section 1), and finding 13 is the second same-arity permutation this
project has found. The gate is still scheduled for the consumer's first
contract-holding slice; nothing here changes that, but the count of defects it
would have caught silently is now eight across two sweeps.

---

## 4. Negative results

Worth as much as the bugs — these mechanisms held under the shapes named.

**A. The rewrite-hook model** (14 shapes). AFTER ROW triggers cannot rewrite
RETURNING for INSERT or UPDATE (measured — a trigger setting `NEW.a := NULL`
and returning NEW is ignored), which is what the model assumes. Statement-level
triggers with transition tables likewise. The tree union recurses correctly
through two-level inheritance (a GRANDCHILD's BEFORE UPDATE trigger voids the
parent's map) and reaches partitions of partitions. A MERGE DELETE arm through
an INSTEAD OF DELETE trigger on a view is IMMUNE — the trigger's modified OLD
is ignored and the view's own computed columns come back as the view produced
them (measured; the DELETE-immunity measurement generalizes to MERGE as the
fix phase assumed). MERGE into an inheritance parent whose CHILD carries the
BEFORE UPDATE trigger voids correctly (the arm-command union composed with the
tree lookup — the composition the charter asked for, and it holds). A DISABLED
trigger is still captured, which voids conservatively: a dropped claim, never a
wrong one — `tgenabled` remains uncaptured and that is sound in both the
disabled and ENABLE REPLICA directions. A conditional DO ALSO rule leaves the
original RETURNING alone and is correctly not refused. Triggers on relations in
non-public schemas resolve.

**B. Relation-set reasoning** (8 shapes). Every inheritance divergence route
except NO INHERIT and generation expressions is REFUSED BY POSTGRESQL — the
table in RC-2 lists six. Diamond inheritance merges NOT NULL as a disjunction,
so the child is MORE constrained than either parent and the conjunction stays
sound. A view whose definition scans `ONLY p` keeps the parent's own flags and
one that scans the tree takes the conjunction — the `RangeVar.inh` bit survives
the `pg_get_viewdef` round trip. Partition DEFAULT divergence is not reachable
through the parent (PostgreSQL uses the named relation's default — measured).
A parent's NOT VALID CHECK is correctly ignored. `UPDATE … FROM ONLY p` versus
`UPDATE … FROM p` distinguish correctly on the FROM side.

**C. The new refusal boundaries** (15 shapes). Coldeflists agree with
PostgreSQL under `ROWS FROM` + `WITH ORDINALITY`, mixed with catalog-typed
items, and mixed with `unnest`. An alias column list SHORTER than the
coldeflist renames the prefix and keeps the rest — engine and PostgreSQL agree.
`(f(x)).*` over a SETOF composite resolves correctly. The only under-refusal
found is the composite-element one (finding 4); the only over-refusals are the
composite-star arms (rank 7) and the search-path half of finding 5.

**D. The RC-1 fall-through** (14 shapes). The body walk's zero-row gate is
correct under every shape tried: set-operation bodies, multi-row VALUES in
either order, `LIMIT 0`, `OFFSET 1`, and `WHERE false` on a FROM-less SELECT
all read nullable. STRICT functions with DEFAULT arguments behave: an omitted
default reads nullable, named-and-reordered arguments resolve correctly
(`maybeReorderNamedArgs` holds), and `dflt_first(b => 'y')` — the shape where
the omitted parameter is FIRST — is nullable too. Mutual recursion hits the
cycle guard and returns nullable without crashing (the statement itself
exhausts PostgreSQL's stack, so only the engine side is meaningful). The
strict-identity control (`SELECT $1` with a non-null argument) keeps its
notNull, as the fix phase intended.

**E. Parameters through the new gates** (10 shapes). Both AST spellings of the
frame offset reject correctly: `OVER (w ROWS $1 PRECEDING)` (named-window
copy-and-modify, `refname` set, the offset unwrapped on `FuncCall.over`) and
`WINDOW w AS (… ROWS $1 PRECEDING)` (wrapped in the windowClause). The frame
offset raises over EMPTY input, confirming the fix phase's measurement — so
emptiness is not an escape and only non-execution is (finding 9). GROUPS mode
without ORDER BY raises a plan-time error rather than a NULL rejection, and the
claim is not falsified by it (the statement raises under every binding). A
joint set straddling a gated site is correctly not filed: the trigger-bearing
target produces no `paramRejectionSets` while the ungated control produces
`[[1,2]]`.

**F. Order and shape composition** (8 shapes). MERGE's source-first
`RETURNING *` holds with a coldeflist source, a `WITH ORDINALITY` source, and a
`NOT MATCHED BY SOURCE` arm (whose presence groups come out right —
`{columns:[0,1], discriminants:[0,1]}`). `merge_action()` mixed into a star
list produces the right arity with an empty name — the documented
`FigureColname` degradation, not a defect. MERGE into an INSTEAD OF view with
`RETURNING *` voids correctly. Grouping-set ordinals under a set operation and
grouping-set ALIASES inside a subquery both resolve correctly.

**G. The pruned tables** (~150 calls, two input classes). Beyond findings 11
and 12, every remaining member survived: empty strings, empty arrays, zero,
NaN, ±Infinity, `-0`, and multibyte input across the math, string, regex,
array, date/time, JSON and misc groups. `width_bucket` with NaN RAISES (an
error is not a NULL). The varchar half of the distinctness whitelist is still
LATENT: both fact sources reachable — a CHECK and a generated CASE — deparse
through `::text` casts (`CHECK (((k)::text = 'aa'::text) OR …)`, measured), the
literal-cast gate refuses cross-type, and no third fact source reaches the
judgment. The gate holds.

**H. Parity** (~120 probes, every probe in the sweep). Zero disagreements
between `inferQueryContract` and `inferNullabilityTraced` +
`inferPresenceGroups(traced)`, on columns, on groups, and on refusal site and
node type — across the rule refusal, the unresolvable-relation refusal, the
composite-star refusal, the BEFORE ROW void, the INSTEAD OF void, MERGE arm
voids, tree-versus-ONLY flags, grouping-set overrides, multi-argument unnest,
coldeflists and composite stars. Moving the refusals into the shared scope
builders did what it was supposed to do.

---

## 5. Environment bounds

Unchanged from the first report's section 6, and re-confirmed: no FDW in this
PGlite build (foreign-table capture rides on inspection), catalog-only ICU,
RLS unprobed. Everything here was measured on PGlite's PG18; the
version-sensitive measurements are finding 11 (the infinite-timestamp
`extract` rule dates from PG14), finding 1 (partition row-movement trigger
firing order), and the MERGE-into-view path (PG17+). Re-pin them if the
target ever moves off PG18.

One PGlite artefact worth recording: two mutually recursive `LANGUAGE sql`
functions exhaust the backend and return `ERRORDATA_STACK_SIZE exceeded`,
which kills the connection for subsequent probes in the same session. The
engine handles the same pair correctly (cycle guard, nullable); only the
oracle needs isolating.
