# Adversarial sweep 2 — handoff

## Charter

The first sweep (`docs/adversarial-sweep.md` → `docs/adversarial-findings.md`)
attacked an engine whose mechanisms had aged under the fixture suites. Its
fix phase then ADDED a dozen mechanisms in two days — snapshot facts, refusal
classes, voids, fall-throughs — and a same-day probe of that new surface
found a live rank-1 defect the phase itself had left (the write-rewrite
hooks read the named relation while triggers fire on the relation the row
lives in; closed 2026-08-05, `trigger-partition-routed.sql`). One probe, one
conviction, on the first mechanism tried. This charter hands you the rest of
that surface.

You are a graybox attacker with full source access and one goal: **break
the claims the fix phase introduced**, plus anything its changes disturbed.
This is a TARGETED sweep — smaller than the first, aimed where the code is
youngest. The first sweep's engagement rules stand unchanged:

1. **Find, don't fix.** Record (protocol below) and move on.
2. **Diversify by mechanism, not by query.** Two falsifications through one
   code path are ONE finding.
3. **Synthesize at the end.** Root-cause, propose, do not implement.

Read the first charter for the full statement of each rule, the rank table
(reuse it verbatim — rank 1 notNull unsoundness worst, rank 7 imprecision
as register material), and the oracle setup. Everything there applies;
this document only replaces the ATTACK CATALOG and the boundaries list.

## What changed since the first sweep

The fix phase's closure entries — top of section 2 in
`docs/deferred-tasks.md`, one per root cause, dated 2026-08-04/05 — are
your primary reading. Each carries the soundness argument someone made
under fix-phase pressure; those arguments are the attack surface. The new
mechanisms, by file:

- `src/catalog/snapshot.ts`: `notNullTree` (attnotnull conjunction over
  pg_inherits), `WriteRewriteInfo` + `writeRewritesTree` (trigger/rule
  capture, tgtype/ev_type decoding, the namespace-unfiltered trigger
  query), relkind `'p'`/`'f'` capture.
- `src/query/nullability-walk.ts`: `scanInh`/`RangeVar.inh` honouring
  (flags AND hooks), the rewrite-stage voids (written map, widened SET
  mask, view-ast strip), the DO INSTEAD refusal in the scope builders, the
  unresolvable-relation refusal, `expandCompositeStar` and its refusal
  arm, coldeflist and multi-arg-unnest resolution, MERGE's source-first
  unshift, the grouping-set ordinal/alias resolution, priority 4's
  fall-through to body inlining, the INITCOND rule's removal.
- `src/query/param-nullability.ts`: the WindowDef rejection site (wrapped
  and unwrapped spellings), the mechanism-B gate on tree hooks.
- `src/query/catalog-adapter.ts`: the pruned distinctness whitelist and
  builtin-totality table.

## Attack surface catalog

Ordered by expected yield. Starters only — go beyond them.

**A. The rewrite-hook model's edges.** The tree union covers `beforeRow`;
everything else rests on measurements taken for SPECIFIC shapes. Stress
the generalizations: MERGE into a parent whose CHILD carries the triggers
(the arm-command union met tree hooks only after the probe — compose
them); a MERGE delete arm through an INSTEAD OF DELETE trigger on a view
(the DELETE-immunity measurement was standalone DELETE, extended to MERGE
by analogy — measure it); AFTER ROW triggers (assumed unable to rewrite
RETURNING — measure); statement-level triggers with transition tables;
disabled triggers (`tgenabled` is NOT captured — voiding for a disabled
trigger is conservative, but is an ENABLED REPLICA trigger's non-firing
modelled right?); grandchild triggers through two-level inheritance and
sub-partitions; a conditional DO ALSO rule with its own RETURNING; rules
ON DELETE with `merge_action()`-era MERGE refusals.

**B. Relation-set reasoning beyond the two fixed facts.** `notNullTree`
and `writeRewritesTree` exist; what else is read from the named relation
while the query touches the tree? Prime suspect: **`CHECK … NO INHERIT`
on a parent** — the CHECK-entailment soundness argument ("a parent's CHECK
is copied into every child's own pg_constraint") was measured for plain
CHECKs, and a NO INHERIT check is never copied, so entailment over a tree
scan may derive from a constraint child rows never satisfied. Is
`connoinherit` captured at all? Also: generated columns diverging between
parent and child (child redefines the expression?); diamond inheritance
(two parents, merged columns — which parent's flags does the child report,
and what does `FROM either_parent` conclude?); `ONLY` inside view
definitions; origins produced through `ONLY` scans (recorded conservative
— convert to unsoundness if you can); identity/DEFAULT divergence across
the tree feeding the written-value map.

**C. The new refusal boundaries, both directions.** Over-refusal is a
consumer cost (rank 7, record it): `(t.c).*` over a composite COLUMN is
legal SQL the composite-star arm refuses (only `(alias).*` and
`(f(x)).*` resolve); `(ROW(1,2)).*` has a countable arity and refuses.
Under-refusal is rank 2: hunt relation shapes that resolve to a WRONG
list rather than refusing — `unnest` of a composite-element array in FROM
(`SELECT * FROM unnest(ARRAY[ROW(1,'a')::ct])` — does PostgreSQL expand
the composite's FIELDS while the engine emits one column?); coldeflists
combined `WITH ORDINALITY`; `ROWS FROM` mixing coldeflist items with
catalog-typed items; a table function whose alias column list is SHORTER
than the coldeflist; search_path shapes where the unresolvable-relation
refusal fires for a relation PostgreSQL resolves (non-public schemas,
same-name tables in two captured schemas).

**D. The RC-1 fall-through, now load-bearing.** Strict `LANGUAGE sql`
functions route through body inlining for their notNull claims — the body
walk carries weight it never carried before. Attack it: bodies that are
set operations, VALUES with multiple rows, DML with RETURNING as the last
statement; SETOF sql functions called in the TARGET LIST (zero-expansion
semantics vs the body's single-row gate); STRICT functions with DEFAULT
arguments (does `maybeReorderNamedArgs` leave body `$2` bound to the
right thing when the call omits it?); mutual recursion hitting the cycle
guard mid-consensus; a strict function whose body references its argument
under a guard the arg nullability should defeat.

**E. Params through the new gates.** Mechanism B through tree scans:
`UPDATE parent SET col = $1` where the constraint lives ONLY on the
parent and every stored row lives in an unconstrained child — the
existential raise may be unreachable in every data state (what does the
witness discipline say?). The frame-offset site under named-window
copy-and-modify (`OVER (w ROWS $1 PRECEDING)` — refname semantics);
GROUPS mode without ORDER BY (plan-time error, not NULL rejection — does
the claim survive?); joint sets whose members straddle a gated and an
ungated site.

**F. Order and shape composition.** MERGE `RETURNING *` now unshifts the
source — compose with: a source that is a coldeflist function, a
`WITH ORDINALITY` source, `merge_action()` mixed into a star list, MERGE
into a view (PG17 INSTEAD OF path) with `RETURNING *`. Grouping-set
ordinal/alias resolution under set operations (`GROUP BY ROLLUP(1)` where
entry 1 is itself a star expansion?) and in subqueries whose target lists
the recorder resolves against.

**G. The pruned tables' survivors.** The first sweep swept
`STRICT_TOTAL_BUILTINS` with adversarial non-null inputs and six fell;
the survivors were swept once. Go again with a different input class per
entry (empty strings, empty arrays, zero, infinity, `-0`, max-length
values, multibyte); same for `ALWAYS_NOT_NULL_BUILTINS` and
`FIRST_ARG_BUILTINS`. The distinctness whitelist is now {text, varchar} —
varchar distinctness is LATENT (its CHECKs deparse through `::text` casts
and the cast gate refuses); find a fact source that reaches varchar
distinctness without a deparsed cast, and check the gate still holds.

**H. Parity and the traced twin.** The fix phase edited the shared scope
builders repeatedly and moved refusals INTO them for parity — verify the
property held: run both entry points across every new mechanism above,
especially the refusal paths (does `inferNullabilityTraced` throw the
same `UnsupportedNodeError` for rules, unresolvable relations,
composite stars?) and the void paths (same SET mask, same written map).

## Known boundaries — do not re-find these

Everything in the register's imprecisions table and Decided-against list,
plus the fix phase's RECORDED costs (each deliberate, each with its reason
in a closure entry): `count_it` nullable; plpgsql strict functions
nullable with non-null args; `substring`/`to_char`/`to_number`/`scale`/
`min_scale`/`array_position` conservative; bpchar distinctness refused;
varchar cast-gate conservatism; coldeflist and composite-star fields all
nullable; `(expr).*` refusal for unresolvable composites; temp/pg_catalog/
information_schema refusals; ONLY-origin tree conservatism; the param
gate's ONLY conservatism; trigger-bearing targets' voided written maps.
Converting any documented imprecision into an UNSOUNDNESS remains always
in scope. The environment bounds are unchanged from the first report's
section 6: no FDW in this PGlite build, catalog-only ICU, RLS unprobed;
re-pin the version-sensitive measurements if the target ever moves off
PG18.

## Oracles, protocol, stop condition

As the first charter, verbatim: PGlite referee via the probe loop;
quarantine fixtures in `tests/unit/query/fixtures-adversarial/` (recreate
the directory — it retired empty when the fix phase closed) with the
engine's CURRENT claims plus falsifying data, observed outcome, suspected
mechanism; findings log in `docs/adversarial-findings-2.md` with failed
attacks recorded per section; suite green throughout; run from `pgsid/`,
pnpm only. Stop when every section A–H has taken at least three
structurally distinct shapes and one free-form session beyond the catalog
yields nothing; then synthesize — root causes, fix sketches, blast radii,
recommended order, negative results — for a fix phase that folds into the
register exactly as the first one did.
