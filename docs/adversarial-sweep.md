# Adversarial sweep — handoff

## Charter

The register says what is left: *"finding the defects nobody thought to
look for."* This document hands that job to you. You are a graybox
attacker with full source access and one goal: **break the nullability
engine's claims**, in as many DIFFERENT ways as you can, before the first
consumer ships on top of it.

Three rules define the engagement:

1. **Find, don't fix.** When an attack lands, record it (protocol below)
   and move on. No engine edits during the exploration phase — a fix
   narrows your own search and biases the next attack toward the shape
   you just repaired.
2. **Diversify by mechanism, not by query.** Two falsifications flowing
   through the same code path are ONE finding. After a hit, classify it
   (which function, which gate, which assumption) and attack a different
   mechanism next. The attack catalog below is organized to make that
   concrete.
3. **Synthesize at the end.** When you are genuinely out of ideas —
   the stop condition below says what that means — switch from attacker
   to analyst: read the implicated source, root-cause every finding
   class, and write the report (deliverables below) with proposed fixes.
   Still no implementing.

## What a finding is, ranked

The engine's contract (`QueryContract` in `src/query/nullability-walk.ts`)
makes four claim kinds. A finding is PostgreSQL disagreeing with one, or
the engine disagreeing with itself:

| rank | finding | what it looks like |
|---|---|---|
| 1 | **notNull unsoundness** | engine claims `notNull`, a returned row has NULL there — the worst possible defect; the emitted type would lie |
| 2 | **shape defect** | engine's column list ≠ PostgreSQL's RowDescription — misaligns every positional flag past the divergence |
| 3 | **param-contract unsoundness** | `nullable` param claim raises under a NULL binding the control accepted; or an admissible joint binding raises |
| 4 | **group falsification** | a returned row where a presence group's discriminants disagree, or an absent arm with a surviving member |
| 5 | **parity break** | `inferNullability` vs `inferNullabilityTraced` disagree (columns or groups) — the explanation describes a decision the engine did not make |
| 6 | **engine crash** | anything thrown that is not `UnsupportedNodeError` |
| 7 | **imprecision** | engine says nullable/no-group where the value is provably non-null — sound, but worth recording when the proof is one the engine's own machinery "should" reach |

Ranks 1–6 are bugs. Rank 7 is register material — record it only when it
is surprising, not when it lands in a documented conservative class.

## The system under attack, in one paragraph

`inferQueryContract(stmt, catalog)` is a pure walk over a libpg-query AST
plus a catalog snapshot. Per output column it claims `notNull`, computed
from: catalog flags, join-tree presence (a fixpoint over ON/WHERE quals
promotes OPTIONAL relations to REQUIRED), WHERE/HAVING/guard promotion,
generated-column expression dispatch, CHECK-constraint entailment (a
propositional kernel over 3VL facts, `src/query/check-entailment.ts`),
and origin tracking (pass-through provenance with rowPaths, unit-crossing
chains, per-branch slots through set operations). Per parameter it claims
rejection (NULL provably raises) via three mechanisms plus joint
rejection sets. Per optional join unit it claims presence groups
(columns NULL together, discriminants NULL ⟺ absent). Read, in order:
`docs/nullability-walk.md`, `docs/argument-nullability.md`,
`docs/witness-coverage.md`, `docs/query-generator.md`, and the closure
history in `docs/deferred-tasks.md` — the closures are your attack
surface list, because every closure carries soundness conditions someone
argued informally.

## Your oracles

**PGlite is the referee, never the PostgreSQL docs** — this project's
axioms are measured (the pin culture). Three ways to convict:

1. **The probe loop** (your main weapon — fast, no suite ceremony):
   spin one PGlite with `tests/unit/query/fixtures/schema.sql`, build the
   catalog (`snapshotCatalog` → `buildNullabilityCatalog`), then per
   candidate: run `inferQueryContract` on the parsed SQL AND execute the
   same text with `rowMode: "array"` against data YOU seed inline
   (`BEGIN` → your INSERTs → query → `ROLLBACK` keeps every probe
   independent). Compare per rank above. The session probes in the git
   history of `tests/unit/query/*-probe.test.ts` (deleted after use) show
   the exact pattern; `presence-groups.test.ts` is a live example.
   You may also extend `schema.sql` with new DDL when an attack needs a
   construct the schema lacks (triggers, exotic domains, zero-column
   tables) — keep additions at the bottom, commented in house style.
2. **The fixture suites**, for integration-grade confirmation:
   `pnpm exec vitest run tests/unit/query/nullability-walk.test.ts`
   (agreement), `nullability-soundness.test.ts` (execution oracle + the
   witness invariant), `param-soundness.test.ts`, generated corpus in
   `tests/unit/query/generated/`. `TRACE_NULLABILITY=1 … -t <fixture>`
   dumps the decision tree — your disassembler.
3. **Parity**: run both entry points on every probe. A traced/untraced
   disagreement is a rank-5 finding with zero data needed.

Run everything from `pgsid/`, pnpm only (`npx` resets cwd — known trap).

## Protocol per finding

Confirmed findings go to TWO places, and the suite must stay green
throughout the sweep:

- **Quarantine fixture**: `tests/unit/query/fixtures-adversarial/` (new
  directory — deliberately NOT matched by the suites' glob). One `.sql`
  per finding, house-annotated with the claims the engine CURRENTLY
  makes plus a header comment: the falsifying data, the observed
  outcome, the suspected mechanism. These graduate to real fixtures
  during the fix phase, not by you.
- **The findings log**: `docs/adversarial-findings.md`. Per finding:
  id, rank, one-line claim-vs-reality, minimal repro (SQL + seed rows),
  suspected mechanism (file:function), and which attack-catalog entry
  produced it. ALSO log failed attack ideas per catalog section — a
  mechanism that survived ten distinct shapes is a negative result worth
  a sentence each.

## Attack surface catalog

Ordered roughly by expected yield. For each: the assumption to stress,
then peculiar-shape starters. Your job is to go beyond the starters.

**A. Promotion trust.** Every promotion (WHERE guarantee, alias
promotion, null-group promotion, presence fixpoint, HAVING) assumes its
predicate filters NULL-extended rows. Attack with predicates that are
TRUE or non-NULL on NULL input: `IS NULL`, `IS NOT DISTINCT FROM`,
`IS NOT TRUE`, `bool_col IS UNKNOWN`, `COALESCE(x,'d') = 'd'`,
`x IS NULL OR x = 1` under AND/OR nesting, NOT-wrapped variants, CASE in
WHERE, predicates over USING-merged columns, `ON TRUE`/`ON (1=1)`
laterals, quals mentioning BOTH sides' columns in one strict comparison,
custom operators (the non-strict `===` exists in the schema; make more —
non-strict with `RETURNS NULL ON NULL INPUT` mismatches, operators whose
COMMUTATOR differs), `x = x` self-comparison, `NOT (x <> x)`.

**B. This session's fresh code** — least-aged, highest suspicion:
slot-per-branch setop origins (`combineSetOperation`): nest INTERSECT
under UNION under EXCEPT so slot arrays and `originNotNull` lengths must
stay aligned through pass-throughs; `EXCEPT ALL`/`INTERSECT ALL`;
branches of unequal arity. Unit chains (`unitChain`, `ColumnOrigin.units`,
the covering check): self-joins of one CTE (shared memo, prefix
disambiguation), a certifier from reference 1 must NEVER certify a goal
from reference 2; FULL JOIN chains where both sides carry multi-element
chains; the depth-equality assumption under uneven nesting.
`storedRowNotNull`: generation expressions consuming CHECK-derived facts,
NOT VALID CHECKs (must be excluded), the memo under presumption
(`presumedPresent` active while it computes). The NUL-sentinel rename:
duplicate outer names among certifiers, quoted identifiers of maximal
weirdness. Positional star resolution: dup names × USING × nested
re-export × `extraColumns` (SEARCH/CYCLE CTEs append generated columns —
ordinal arithmetic vs `cteColumns` offsets is untested territory).

**C. Things the engine does not model at all** — look for claims that
silently assume their absence: **BEFORE triggers** rewriting NEW (a
trigger nulling a nullable column falsifies written-value and
DML-RETURNING claims; nothing in the register records a trigger
boundary); **rules** on tables; updatable-VIEW DML (INSERT INTO view …
RETURNING — what entry kind does the DML walk build?); partitioned and
inherited tables (per-relation pg_constraint was handled for CHECKs —
attnotnull divergence between parent and child?); dropped columns
(`attisdropped` — does the snapshot skip them and does `SELECT *` shape
survive?); zero-column tables; whole-row references (`SELECT t FROM t
LEFT JOIN u …` — one output column, NULL when extended; does the shape
even match?); system columns (`ctid`, `xmin` — notNull? shape?).

**D. The entailment kernel's edges.** Its charter is propositional with
three atom gates. Stress: float `NaN` through the negator pairing
(`qty > 0` FALSE vs `qty <= 0` — NaN comparisons are all false except
sorting; the "sound for every btree opclass including NaN" claim
deserves a measured test); literal-cast matching across domains-over-
domains; `pg_get_constraintdef` re-rendering surprises (timestamp
rewrites are pinned — find another value class that re-renders:
intervals, numerics with trailing zeros, arrays); collation-gate
bypasses (a deterministic-collation column compared against a
NONDETERMINISTIC-collation expression); CHECKs mentioning system or
dropped columns; generated-equality arm exclusion with duplicate literal
arms.

**E. DML corners.** MERGE: `DO NOTHING` arms, `WHEN NOT MATCHED BY
SOURCE THEN DELETE`, RETURNING with `merge_action()`, source as VALUES
vs subquery. ON CONFLICT: partial-index arbiters (`WHERE` on the
conflict target — the written-value intersection assumed both paths;
does the arbiter predicate change reachability?), `DO UPDATE` reading
`excluded.*`. INSERT: `OVERRIDING SYSTEM VALUE`, `DEFAULT` keyword in
VALUES cells, multi-row VALUES with per-row nullability disagreement,
INSERT … SELECT where the source is a setop. PG18 `OLD.`/`NEW.`
RETURNING qualifications (deliberately origin-free today — are the flat
claims right?).

**F. Rows that multiply or vanish.** SRFs in the target list
(`SELECT id, generate_series(1, CASE WHEN … END) FROM t` — zero
expansion deletes the row; does any notNull claim depend on row
survival?); `WITH ORDINALITY` renames; `ROWS FROM(f() AS (a int), g())`;
GROUPING SETS including the empty set (`GROUPING SETS ((), (a))` emits a
super-aggregate row with every key NULL — group keys claimed notNull?);
`GROUPING()` the function; window frames with `EXCLUDE CURRENT ROW`
(the never-empty default-frame claim's boundary); aggregate `FILTER`
clauses; `DISTINCT ON` with expressions not in the target list.

**G. Parameters.** Joint sets where one member appears in TWO sets with
conflicting satisfiability; mechanism-A domain casts inside CASE arms
never taken; a parameter typed only through a later occurrence (the
deduction pin exists — invert it); params in `LIMIT`/`OFFSET`/`FETCH`
(placement axis exists — go weirder: params in frame bounds, in
`GROUPING SETS`); `$1` compared to itself; params inside the recursive
arm of a CTE.

**H. Recursion.** UNION (not ALL) recursive CTEs (dedup interacts with
the assumption fixpoint?); SEARCH BREADTH/DEPTH FIRST and CYCLE clauses
(extraColumns' claims: `is_cycle` notNull? `path`?); a recursive CTE
referenced twice at different join states; groups/origins through the
recursive assumption when the base branch itself re-exports another CTE.

## Known boundaries — do not re-find these

Attacking these is wasted effort UNLESS you convert a documented
imprecision into an UNSOUNDNESS (always in scope, always rank 1):
the decided-against list (value tracking, cross-literal order,
FigureColname); permanently-nullable classes (JSON_VALUE family,
plpgsql bodies, non-strict builtins outside the tables); the operator
shadowing blind spot; PGlite's catalog-only ICU (pinned); parameters
never matching CHECK literals; the register's imprecisions table.
Read the table before starting; it is short.

## Stop condition and final phase

You are done exploring when: every catalog section A–H has been attacked
with at least THREE structurally distinct shapes (log them, hits and
misses), and one free-form session beyond the catalog produced nothing
new. Then write the synthesis into `docs/adversarial-findings.md`:
findings grouped by root-cause mechanism, each with the implicated
source (file:function, the exact gate or assumption), why the bug
happens in the code's own terms, a proposed fix sketch with its blast
radius (which fixtures/claims flip), and a recommended fix order. End
with the negative results: which mechanisms held, under what shapes —
that list is worth as much as the bugs. Propose, do not implement.

## House expectations

Measure before asserting; PGlite over docs; terse commits (see git log
for the voice); fixtures carry their reasoning in comments; nothing
verified by nothing — if your probe returned no rows, it proved nothing,
say so. The register (`docs/deferred-tasks.md`) is the project's memory:
your findings doc will be folded into it during the fix phase, so write
it to be consumed, not admired.
