# Witness coverage for the nullability fixture suite

## What this document is

How the executable fixture suite is made to verify what it claims to verify,
and what it currently measures. Read `docs/nullability-walk.md` first for how
the engine itself works; this document is only about the tests around it.

## Why coverage is the thing to measure

`tests/unit/query/nullability-soundness.test.ts` executes every fixture against
PGlite and checks that no column the engine calls `notNull` ever comes back
NULL. That check is only meaningful when the query actually returns rows: a
statement that returns nothing cannot contradict anything, so unless something
else stands behind them its `notNull` claims are checked by nothing at all. (The
one thing that can stand behind them is PostgreSQL refusing to run the statement
— see "How a fixture is executed".)

The mirror-image question applies to the other flag. A `nullable` claim is
*witnessed* when some execution yields a genuine NULL in that column.
Unwitnessed means one of two things, and they need separating: the column truly
can never be NULL (imprecision in the engine — sound, but a lost guarantee for a
consumer), or the data is too weak to show that it can (a hole in the suite).

Both numbers are reported on every run, and both are held by a bar — see
"The two bars" below.

## How a fixture is executed

Each fixture is run under the cross product of **data states** and **argument
bindings**, and five things are asserted:

| | |
|---|---|
| Validity | PostgreSQL accepts the statement (`PREPARE`) |
| Shape | the engine's output column list equals PostgreSQL's, in order |
| Soundness | no `notNull` column is ever NULL, under *every* state and binding |
| Liveness | the fixture returns at least one row somewhere, or declares the error it raises instead |
| Coverage | one suite-wide test: every nullable claim witnessed, or its unwitnessability recorded with `@unwitnessable` |

Soundness must hold for every binding: a claim contradicted by any argument set
is a bug. Witnesses, by contrast, accumulate — any state or binding that
produces a NULL witnesses that column.

A statement that raises is not a counterexample. It returned no rows, so "never
NULL" still holds for every row it did return; errors are recorded for
diagnostics and otherwise skipped.

The exception is a fixture that can *only* raise. `SELECT CAST(NULL AS nn_text)
FROM products` does not return NULL — PostgreSQL refuses, because the domain
forbids it, and that refusal is exactly what the column's `notNull` claim says.
Such a fixture declares both why it returns nothing and the error it must raise:

```sql
-- @no-rows: CAST(NULL AS nn_text) raises the domain's NOT NULL violation for
-- every row evaluated, which is the behaviour the @notNull claims assert.
-- @raises: domain nn_text does not allow null values
```

Both are required together, and both are checked: the fixture must return no
rows, must actually raise somewhere, and every error it raises must match the
declared text. Returning nothing is not evidence on its own — a false `WHERE`
does that too — so without the refusal the marker would exempt a fixture that
asserts nothing. Matching the text is what keeps an unrelated failure, a
renamed column or a missing table, from being accepted as the expected one.

Execution is arranged state-major: one PGlite instance per data state, loaded
once, with each fixture's own writes rolled back around it. Applying a state per
fixture instead would churn the same rows through WASM linear memory hundreds of
times, which rule 6 in the workspace `AGENTS.md` is about — a long-lived PGlite
instance never returns pages, and `ROLLBACK` reclaims nothing.

## Data states

Two kinds, in `tests/unit/query/fixtures/data/` and in the generator. They
answer different questions and neither subsumes the other.

### Hand-written: `empty`, `sparse`, `dense`, `uniform`

Standalone SQL files, reviewable on their own. Each row in them exists to
construct a structural situation that random generation does not reliably
reach — NULLs come from structure, and structure is built rather than stumbled
into:

- a customer with a NULL `name` *and* a non-NULL `deleted_at`, which is what
  makes `case-path-sensitive.sql`'s `AND`-negation trap actually fire;
- a tag with no matching product, which is what triggers
  `WHEN NOT MATCHED BY SOURCE` in `merge-returning.sql`;
- exactly seven reviews on every product, without which the set-operation cases
  in `scalar-subquery-zero-row-guards.sql` raise instead of returning a row;
- a product whose sku is the sentinel a `NULLIF` compares against, which is the
  only way a `NULLIF` yields NULL.

Explicit ids in these files stay below 1000. The identity columns in
`schema.sql` start there, so a fixture that inserts without naming a key never
collides with a row a data state wrote.

### Generated

Derived from the catalog snapshot, so the schema is the single input: a table or
column added to `fixtures/schema.sql` is populated automatically and cannot
silently go unseeded.

**Two tiers of generator**, in `fixture-data/generators.ts`, resolved
most-specific-first. A type entry has to satisfy every CHECK its type carries,
which is why a domain gets its own entry rather than inheriting its base type's.
A column entry exists when a value must fall inside a *query's* vocabulary
rather than merely its type's — `orders.status` has to sometimes be
`'fulfilled'` because fixtures filter on it.

Full resolution order for a column:

```
column-specific → foreign key → surrogate key → its own type name
  (which is the domain name for a domain column) → the domain's base type
```

The snapshot is taken with an empty `search_path`, so a type outside
`pg_catalog` arrives schema-qualified. The type tier is therefore keyed by the
schema that *owns the type* rather than the one that owns the table: two schemas
may each declare a `pct` domain, and they are not the same type. Built-ins come
through unqualified and resolve under the table's schema.

**No match is an error, not a default.** A column whose type has no generator
fails loudly, so adding one forces a decision — the same discipline
`node-census.test.ts` applies to AST node types. So does the reverse: a registry
entry naming a column or table that does not exist is an error too, since a
misspelled column would otherwise fall through to the type tier and read as
configured while doing nothing.

**The tiers compose, they do not merely override.** A column generator receives
the type tier as a callback and decides whether to use it:

```ts
name: (rand, ctx) => (rand.chance(0.25) ? "x" : ctx.ofType()),
```

A quarter of `customers.name` is the literal several fixtures compare against;
the rest is whatever a `text` column looks like, without restating it. The
callback resolves on call, so a column that never delegates does not need its
type to have a generator at all.

**What the framework owns**, rather than the individual generators:

- **NULL injection.** The catalog says which columns are nullable; a nullable
  column gets NULL according to its own NULL policy, and the generator is called
  only once non-NULL is decided. Generators therefore never return NULL. The
  policy is per column (resolved column → type → default) because how often a
  column is NULL is what produces witnesses: `products.deleted_at` wants NULL in
  most rows so that a soft-delete filter has live rows to keep, and `u.status`
  wants NULL rarely so that rows survive to reach a comparison. A single figure
  for the whole dataset can only be a compromise between the two.
- **Foreign keys.** A FK column draws from the referenced column's already
  generated values, so referential integrity is a property of the framework.
- **Surrogate keys.** A single-column integer primary key is numbered 1..N.
- **Uniqueness.** Rows repeating an earlier row's PK or unique key are dropped.
- **Which columns are filled at all** — see below.

**Column policy.** A `GENERATED ALWAYS AS` column and an `ALWAYS` identity are
omitted from the INSERT: PostgreSQL computes the first and rejects an explicit
value for the second. Nothing can draw a foreign key from either, since their
values do not exist until the INSERT runs.

Everything else is filled explicitly, *including* columns that have a DEFAULT and
`BY DEFAULT` identity columns. A default is what a column takes when nothing is
said about it, and this generator's job is to say something about every column: a
default would silently override the NULL a null policy chose, which is the one
decision that produces witnesses. `BY DEFAULT` identities are filled for a
different reason — a foreign key has to draw from keys that are already known,
and an identity's values are not known until PostgreSQL assigns them.

Generation is on demand and depth-first: asking for another table's values
generates that table first, so declared foreign keys and hand-written
cross-table generators both get a valid emission order for free. A cycle between
two tables is an error. A self-reference is not, and resolves against the rows
generated so far — `categories.parent_id` references an earlier id, or nothing.

`t`, `u` and `v` declare no keys and no foreign keys, but the fixtures join them
as though they did (`ON u.t_id = t.id`). The join predicate is what makes the
reference real, so `u.t_id` draws from `t.id` — and a quarter of its rows dangle
on purpose, because with every reference resolving, an outer join is an inner
join and its NULL-extended columns are never observed.

**Determinism** comes from seeding each value stream by the identity of what it
fills: `hash(schema.table.column) ⊕ FUZZ_SEED` for values,
`hash(schema.table) ⊕ FUZZ_SEED` for row counts, and a separate derived stream
per column for the NULL decision. Adding a column perturbs only that column;
adding a table perturbs nothing else; retuning one column's NULL policy leaves
every other column's data byte-identical, and leaves that column's non-NULL
values unchanged as well. The exception is FK columns, whose values follow their
target's.

Identity here means *names*. Nothing in generation reads a PostgreSQL OID —
tables, columns, types and domains are addressed by name throughout, including
in the seeds — so recreating the schema, which reassigns every OID, produces a
byte-identical dataset. `fixture-data.test.ts` asserts exactly that against a
second database built from the same DDL.

`FUZZ_SEED` is fixed by default and overridable by the environment variable of
the same name. A varying seed by default would let coverage drift between runs,
so the suite could weaken on an unlucky draw without failing. Under an
overridden seed the witness invariant is reported but not enforced, since
witnessing is measured against the default seed's data; liveness is still
enforced, because no seed may leave a fixture returning nothing.

`DUMP_GENERATED_DATA=<path>` writes the generated SQL out for inspection.

## Argument bindings

Fixtures declare parameter values as JSON, one array per line, each line an
independent case:

```sql
-- @args ["a@b.c", 10, null]
-- @args [null, 0, "x"]
```

JSON gives unambiguous typing for free — `null` is not `"null"`, `10` is not
`"10"` — and needs no parser beyond `JSON.parse`. A fixture with no `@args` line
runs once with every parameter bound to NULL.

Arguments are substituted as literals rather than passed as protocol parameters.
PostgreSQL infers a parameter's type from its use, and several fixtures use one
where nothing constrains it (`SELECT $1 AS direct_param`), which is an error
before any value is considered. A literal carries the same unknown type a
fixture author means and resolves the same way.

A fixture that references `$n` beyond what `@args` supplies, or supplies more
than it references, is an error.

## The two bars

**Liveness is a hard failure.** A fixture that returns no rows under any state
and binding asserts nothing, and that should be impossible to add by accident.
The failure message names the states whose execution raised, which is usually
the explanation.

A fixture whose statement raises for *every* row it would produce declares that
with a reason:

```sql
-- @no-rows: NULL::nn_text raises for every row evaluated, which is exactly the
-- claim above. The statement either fails or has no rows to fail on.
```

The marker is checked both ways: a fixture that carries it and does return rows
fails too, so the exemption cannot go stale.

**Coverage is a per-claim invariant.** Every `nullable` claim must either be
witnessed, or carry a `-- @unwitnessable <column index>: <reason>` annotation
recording *why* no data can witness it — `CURRENT_SCHEMA` is NULL only when
the search path resolves to nothing, a `SETOF` row type erases the NOT NULL
constraints its columns actually have, and so on. The marker is checked both
ways, like `@no-rows`: an unwitnessed claim with no annotation fails, and an
annotation on a claim that *is* witnessed fails too, so a recorded reason is
always a current fact rather than a historical excuse. Claims inside
`@no-rows` fixtures are exempt wholesale — nothing a rowless statement claims
can be witnessed.

An aggregate ratchet (a baseline count that could only rise) held this before
and was replaced deliberately: a ratchet compares sums, so a witnessing
regression can hide behind an unrelated improvement, and its number conflated
engine imprecision with data reach. The invariant is exact at any corpus
size, and the annotations are the triage, kept where the claim lives. This is
still not a demand for 100% witnessing — an unwitnessable claim is fine — but
non-witnessing must be *explicit*, never incidental.

## Presence groups: the two-arm witness

A `@null-group` annotation (Wave 13) is a JOINT claim and gets a joint
oracle. Statically, the agreement suite holds compulsory bidirectional
coverage against `outputPresenceGroups`, discriminant sets compared exactly,
every member required to carry its per-column `@nullable`. Executably, the
soundness suite checks each engine-claimed group **per returned row**: the
discriminants must agree (all NULL or all non-NULL — a split row falsifies
the unit), and on the absent arm every member must be NULL. Both arms must
then have actually run: some row absent, some row present.

The absent arm's exemption is **derived, not declared**: that arm fires
exactly when a discriminant is NULL, so it is unwitnessable precisely when
every discriminant's own `@nullable` claim is — each already carrying its
`@unwitnessable N: reason`. The per-column staleness check removes those
the moment data witnesses a NULL, which re-arms the group assertion
automatically; the two annotation layers cannot drift. The present arm has
no exemption at all — a fixture that cannot reach it should not claim a
group.

## Current measurement

**The suite prints it. This document does not carry a copy** — the numbers
below come from a run, not from here:

    pnpm exec vitest run tests/unit/query/nullability-soundness.test.ts
    WITNESS_REPORT=1 …          # adds the per-claim list with its reason

    witness coverage over 593 fixtures and 5 data states (…):
      notNull claims:  1212 — 1201 falsifiable (99%), 11 guarded by a
                       checked refusal, 0 unverified
      nullable claims: 793 — 769 witnessed (97%), 18 unwitnessed with the
                       reason recorded, 6 exempt (@no-rows)
      alwaysNull:      46 — every returned row tests one, 0 falsified

**This section used to be a table, and on 2026-08-25 every number in it was
wrong** — found by the claims sweep. It read 410 fixtures, 917 `notNull`,
627 `nullable`, 538 witnessed (86%), 89 unwitnessed; the run above says 593,
1212, 793, 769 (97%), 18. It was a snapshot of roughly 2026-08-06, sitting
under the heading "Current measurement" with no date on it, in the document
`docs/harness-strengthening-handoff.md` calls "the map the next reader
trusts".

Nothing had drifted in the ENGINE — every number moved the good way. That is
the point: **a copied number is falsified by success, and no suite goes red
when it is.** The register (`docs/deferred-tasks.md`) deleted 89% of itself
on 2026-08-21 for this exact reason and stated the rule this section now
follows — *if a fact can live next to the code it is about, it belongs there,
not here.* The rule was never applied to this file, which is the one a new
reader is pointed at first.

The reproduction line stays; the numbers in it are an ILLUSTRATION of the
shape, dated 2026-08-25, and go stale by design. Re-run rather than read.

**A fourth annotation kind joined the three above**, on the ARGUMENT side:
`-- @param-opaque N: <reason>` records a parameter whose NULL binding raises
for a reason no static analysis can see — a user function's BODY, which the
contract deliberately does not read. It is held to the same bar as the rest:
the raise must be OBSERVED, so a stale marker fails as loudly as a missing
one, mutation-checked in both directions. One fixture carries it
(`param-domain-return-body.sql`), and what it records is a decision rather
than a gap — see `docs/argument-nullability.md`, "What a nullable parameter
does not promise".

The fourth sweep's unwitnessed entries are also one shape repeated, and it is
the padding rule's own: in a multi-arm `ROWS FROM` the LONGEST arm is never
padded, so its conservative nullable claim has nothing to witness it — the
same uniform conservatism `body-shape-rows-from-padding.sql` already recorded
one clause over.

The unwitnessed entries before them are one shape repeated too: unnesting a NULL array
produces NO rows, so the array column a fixture unnests can never be
observed NULL through that join. `pair_holder`'s three array columns
rotate their NULLs by row index for exactly this reason — whichever column
a fixture unnests, the surviving rows still carry a NULL in the other two —
and `trow_holder` is the same shape one type-kind over. `cc.p` takes its
three composite shapes (whole, empty qty, empty sku) by row index for the
same reason: a NULL FIELD inside a PRESENT composite is the only witness a
field claim has, a whole-column NULL is not a substitute, and at these row
counts a probability left it to luck.

The generated corpus carries the same group oracle annotation-free: 1490
engine-claimed groups over ~9k queries (post-widening — refilter wrappers,
union-full-var, dup-names, gm structures), all arms observed, zero per-row
falsifications, the GROUP_UNWITNESSABLE rule list empty. The two-arm bar
has now paid three times: 67 INTERSECT groups with uninhabitable absent
arms (the setop dead rule), the cross-unit presence-implication
imprecision (closed via unit chains the same session), and the
required-alternative gap in origin entailment (closed likewise).

Every fixture returns rows under some state and binding, except the four that
declare `@no-rows` (measured 2026-08-25; it read "the two" until then).

## What remains unwitnessed

Every remaining claim's reason lives on its fixture as an `@unwitnessable`
annotation — `WITNESS_REPORT=1` prints the per-column list with those reasons
inline. A reason may run past one line: continuation lines (`--` followed by
two or more spaces) are recorded joined, so the report prints the whole fact
rather than its first clause.

They fall into three groups, plus the rowless fixtures. **The GROUPS are the
lasting part; the counts on them are not.** Both counts below are the
2026-08-06 audit's, when there were 78 annotations across 352 fixtures; the
live list is 18 across 593, and `WITNESS_REPORT=1` prints it with each reason
inline. Read the groups as a taxonomy and the report as the census.

`docs/imprecision-closure.md` carries that audit's exact per-claim census —
ten of the hundred reasons were wrong, five of them calling a filter in the
fixture's own query a gap in the data. The three that were genuinely data
gaps are closed (2026-08-06), which is why no group below is one. **Its §D
classification has since been falsified in the direction that matters** —
see the dated banner on that file.

**A row type carries no constraints — CLOSED (2026-08-06).** This was the
largest group at 15. `SETOF <table>` and `SETOF <composite>` erase the NOT
NULLs, and PostgreSQL re-imposes nothing — but the bodies behind them select
the very columns those constraints sit on, and the walk reads them now
(`docs/nullability-walk.md`, "Reading the body back"). Fourteen graduated to
witnessed `notNull`; the fifteenth returns the function's own PARAMETER,
which the reading takes as nullable by design, and it is counted below.

**Conservative by design (39 claims at the audit).** The value is provably
non-null and the engine reports nullable anyway. Each is a known imprecision
registered in §4 of `docs/deferred-tasks.md` — array subscripting,
population statistics, built-ins outside the curated tables, multi-statement
function bodies, JSON_TABLE columns, the VARIADIC gate, the SRF padding rule,
multi-candidate operators, and the CHECK machinery's deliberate gates — plus
the six the imprecision closure leaves: a parameter inside an inlined body,
the longer call in a `ROWS FROM` that padding never reaches, a foreign key
the engine refuses to read (NOT VALID, DEFERRABLE), and a correlated subquery
whose FROM carries a JOIN.

*The two examples this paragraph used to give — `date_part` and
`array_length` — are both `notNull` now, and were the point of the sentence
they illustrated.* It also said **"Only four are closable by work already
planned"**, naming `docs/type-aware-overloads.md`. That work landed
2026-08-20, and the claims sweep measured the outcome on 2026-08-25: one of
the four closed, and SEVEN claims the same audit classified as *not*
closable closed anyway. Closing one turns its claim into `notNull` rather
than witnessing it, which is why the annotation simply comes off (the
presence-consumption entry retired exactly that way).

**The query's own shape rules out the NULL case (39 claims at the audit).** The other half
group: the fixture selects away the rows that would show the NULL. A
`LEFT JOIN` whose `ON` is an equality on a NOT NULL foreign key always
matches. A `CROSS JOIN LATERAL` drops exactly the orders that would leave the
aggregate side of an earlier `LEFT JOIN` unmatched. A correlated subquery
keyed on a primary key always finds its row. Unnesting a NULL array produces
no rows, so the unnested column is never observed. `scalar-subquery-zero-row-guards`
forces every product to exactly seven reviews in any state that returns rows.
`presence-group-full`'s orders side never extends because `shipments.order_id`
is a NOT NULL foreign key — the annotations that also exempt its group's
absent arm by derivation. Changing any of these means changing what the
fixture asserts, which is a worse trade than leaving the claim unwitnessed.
The three the audit found to be genuine data gaps were the exception and are
closed: two of them cost a fixture one literal, because what a fixture
asserts and what its ids happen to match are not the same thing.

**Inside a `@no-rows` fixture (6 claims).** Nothing in a statement that never
returns a row can be witnessed. These are the wholesale exemption, and until
2026-08-25 the suite's own summary line counted them as "unwitnessed with the
reason recorded" — they have no reason, which is the whole difference. They
are printed by name now, under `WITNESS_REPORT=1`.

## The EXPLAIN oracle (observatory)

`tests/unit/query/explain-oracle.test.ts` compares the corpus against the one
static reasoner PostgreSQL exposes through public API. The planner's prep
phase runs `reduce_outer_joins`: an outer join whose optional side a strict
qual above it would reject is converted to a plain join — PostgreSQL's own
implementation of WHERE promotion, logic-based rather than cost-based, and
visible in every plan as the node's `Join Type`. The oracle runs
`EXPLAIN (FORMAT JSON)` (with `GENERIC_PLAN` for parameterized fixtures, the
same unbound-`$n` treatment PREPARE gives them) against the empty schema and
counts surviving outer-join plan nodes against the walk's own verdicts.

The engine side is `WalkOptions.joinAudit`: one record per syntactic outer
join (deduped on the `JoinExpr` node — fixpoint re-runs and set-operation
branch rebuilds revisit the same join), each extended side marked settled or
surviving by the presence fixpoint, plus the side's null-group id. The
settled flags are scope-local while the planner is statement-global (it
flattens scopes, so an outer WHERE reduces an inner join), so the oracle
reconciles units through the claims: a column proved notNull whose origin
crosses unit U certifies U's absent arm never reaches the output, and such a
unit does not count as surviving. Counts, not identities — the planner
reorders joins, commutes a LEFT into a "Right" hash join, and pulls sublinks
into Semi/Anti joins that correspond to no FROM-clause join. Classes:
`agree`, `planner-stronger` (the plan has fewer surviving outer joins than
the walk), `engine-stronger` (the walk has fewer than the plan).

The interpretation is asymmetric, and the asymmetry is the instrument's
honesty condition: the planner acting is evidence, the planner declining
proves nothing. The walk is deliberately stronger — CHECK entailment,
foreign-key entailment, and cross-scope refilters promote where
`reduce_outer_joins` never will, because the planner does not make those
inferences. So `engine-stronger` is expected and must merely *classify*
(FK, CHECK, origin/refilter, or MERGE's target/source join, which is no
`JoinExpr` and invisible to the audit); `planner-stronger` is the class that
carries information — a strict-qual reduction the fixpoint missed; and an
engine-stronger entry whose settlement evidence is a plain strict qual would
be the soundness smell.

Measurement (2026-08-19, 454 fixtures; participation closure and
unitCrossings channel landed): 435 agree, 18 engine-stronger — all
classified (FK/CHECK, MERGE, an INTERSECT-arm refilter) — 1
planner-stronger, declared (`@planner-reduces`: the join-removal pin, the
one divergence that is a row-count fact rather than a nullability fact),
nothing unexplainable, suspect class empty. The two FK composition
fixtures moved from engine-stronger to agree when the closure landed:
their key chains settle SIDES while both FULL JOINs keep a genuinely
extending side, an advantage a join-granular count cannot see. The SRF
refilter fixture agreed once the instrument could attribute it: claims
under `WalkOptions.collectUnitCrossings` carry the units their production
chain crosses — the anchor-less counterpart of origins' units, which is
what a set-returning function's pass-through needed.

The bar holds both directions through the fixtures themselves, the
`@unwitnessable` discipline. An engine-stronger fixture declares
`-- @planner-keeps N: reason` (N = plan minus surviving, the reason naming
the evidence the planner lacks — a key, a CHECK, a cross-branch refilter,
or MERGE's no-JoinExpr matching). A planner-stronger fixture declares
`-- @planner-reduces N: reason`, and its reason must be an INVESTIGATED
cause — one of the classifier verdicts in `explain-instrument.ts`. Only
one remains live: uniqueness-based join removal
(`explain-join-removal.sql`, permanently out of scope — a row-count fact,
not a nullability fact). The other two closed on 2026-08-19 and their
fixtures flipped to positive pins: the slice-local participation
imprecision (the fixpoint's participation closure;
`explain-slice-local-flat.sql` and `explain-slice-local-inner-qual.sql`
now agree with the planner and carry the presence groups the closure
recovered) and the SRF unit-channel blind spot (the `unitCrossings`
diagnostic channel; `explain-srf-refilter-blindspot.sql` now attributes
its refilter). The suite fails an undeclared divergence in either
direction, a drifted count, and an annotation on an agreeing fixture.

The GENERATED corpus runs the same comparison without an annotation channel
(`generated/generated-explain.test.ts`): agreement is measured, and every
planner-stronger divergence must CLASSIFY — `explain-instrument.ts` goes
into the query and attributes it to a known cause with a recorded verdict
(known imprecision, out-of-scope uniqueness removal, instrument blind
spot), the per-cause census is pinned both directions, and an unexplained
divergence fails naming the query. Each cause and its status is documented on
`DivergenceCause` in `explain-instrument.ts`, and the census is pinned in
`generated/generated-explain.test.ts`: "the planner did better" is never a
bare count — it is either understood or a failure.

## Borrowed corpora

`tests/unit/query/sqlc-corpus/` vendors sqlc's endtoend testdata (release
pinned in its PROVENANCE.md, MIT license vendored alongside): 253
content-deduped postgresql cases of foreign-authored, issue-derived
schema/query pairs. The JUDGE is PostgreSQL, exactly as for the generated
corpus — PREPARE gates validity, the shape oracle compares column lists
against a real execution, the EXPLAIN census holds planner-stronger at
zero, and refusals, crashes, and every tally are pinned both directions in
`sqlc-corpus.test.ts`.

Soundness WAS deliberately not asserted, on the reasoning that sqlc ships
no data and a zero-row execution asserts nothing. The first half was
always true and the second does not follow from it: the data can be ours.
For the 28 cases the disagreement register argues about, `data.sql` sits
beside the vendored files — a state constructed to BREAK the disputed
claim — and the suite executes each query under it and under the bindings
in `adjudication.json`. A column the walk calls notNull coming back NULL
is an unsoundness there exactly as it is in the fixture corpus, and it
fails the same way. The other 225 cases still assert only shape and
validity; a case with no state executes nothing, because inventing a
binding for a query nobody reasoned about manufactures rows with no
argument behind them.

sqlc's own expectations ride along as `expected.json` per case — its IR's
per-column `not_null`, extracted by `tests/probe/sqlc-extract-expected.ts`
running the pinned sqlc release with the built-in json codegen (never
parsed out of generated Go, never blurred by type overrides). They are a
lead source, not a judge. All disagreements are adjudicated
(2026-08-20): 30 entries — 16 ticket-ready, 14 expected conservatism, and
**no pgsid imprecisions and no pgsid unsoundness**. It began at 40 entries
with 10 imprecisions, and all ten closed the same day: six to the function
overload merge (`docs/function-overload-merge.md`), two to admitting the
sequence functions to `STRICT_TOTAL_BUILTINS`, one to excluding `returnsSet`
from the strict-total branch, and one that was never an engine defect at all
— this corpus was calling the walk without the subtree evaluator both
fixture suites pass. That is the register working as intended: an imprecision
with a named fix is a worklist item, not a verdict. The conclusions live per case in
`adjudication.json` and `docs/sqlc-disagreements.md` is GENERATED from
them by `tests/probe/sqlc-register.ts`, so regenerating cannot destroy
them; the suite pins each disagreement and each verdict BY NAME, so a
compensating swap cannot hide behind a count, and a conclusion drawn
against a superseded sqlc release fails on `adjudicatedAgainst`. The
first sweep of this corpus
also closed a real gap: a sequence is a legal FROM item with three NOT
NULL columns, and the snapshot now captures relkind 'S' so the walk claims
it instead of refusing.

## Where things are

| | |
|---|---|
| Engine | `src/query/nullability-walk.ts`, `src/query/catalog-adapter.ts` |
| Engine design | `docs/nullability-walk.md` |
| Fixtures + schema | `tests/unit/query/fixtures/` |
| Hand-written data states | `tests/unit/query/fixtures/data/` |
| Data generation | `tests/unit/query/fixture-data/` |
| Generation framework's own rules | `tests/unit/query/fixture-data.test.ts` |
| Fixture directives (`@args`, `@no-rows`) | `tests/unit/query/fixture-args.ts` |
| Unwitnessability annotations | `-- @unwitnessable N: reason` in each fixture; parsed in `fixture-args.ts` |
| Presence-group annotations | `-- @null-group N[*],M[*]` in each fixture; parsed in `fixture-args.ts`, agreement in `nullability-walk.test.ts`, per-row + two-arm oracle in `nullability-soundness.test.ts` |
| Presence-group pure-function edges | `tests/unit/query/presence-groups.test.ts` (star expansion, `UPDATE … FROM`, the floors) |
| Annotation-based suite | `tests/unit/query/nullability-walk.test.ts` |
| Executable suite (validity, shape, soundness, liveness, coverage) | `tests/unit/query/nullability-soundness.test.ts` |
| EXPLAIN oracle (planner join reduction, observatory) | `tests/unit/query/explain-oracle.test.ts` |
| Fallback census (name/consensus branches reached through the UNREADABLE path — the 2026-08-24 unsoundness class; per-key entries generated from `PARTIAL_OVERLOADS`/`NON_STRICT_OVERLOADS`, witnesses pinned by name, schema vocabulary derived from the escape tables) | `tests/unit/query/fallback-census.test.ts`, `fallback-spy.ts` |
| Rung census (every traced verdict site fired on the corpus, outcome directions floored both ways; dark rungs triaged by category — instrument-blind / defensive / capture-backstop) | `tests/unit/query/rung-census.test.ts`, `rung-extractor.ts` |
| Wrap invariance (verdicts must not WEAKEN across a subselect or CTE wrapper — the monotonicity oracle for precision LOSS, which execution is one-sided against; first crop: the star-expansion alwaysNull crossing, fixed same day) | `tests/unit/query/wrap-invariance.test.ts` |
| AST node coverage | `tests/unit/query/node-census.test.ts`, `grammar-sampler.ts` |
| Column order vs PostgreSQL | `tests/unit/query/column-sequence.test.ts` |
| Generating queries to extend this corpus | `docs/query-generator.md` |
| Borrowed sqlc corpus (vendoring, pins, miner) | `tests/unit/query/sqlc-corpus/`, `sqlc-corpus.test.ts`, `tests/probe/sqlc-extract-expected.ts` |
| Borrowed PostgreSQL regression corpus (shape + refusal replay over the engine authors' own scripts; census pinned by name, poison/crash classes counted) | `tests/unit/query/pg-regress.test.ts`, `tests/unit/query/pg-regress/` |
| sqlc disagreement register (adjudication worklist) | `docs/sqlc-disagreements.md`, regenerated by `tests/probe/sqlc-register.ts` |

Run the suite with `npx vitest run` from `pgsid/`.

Environment variables it honours:

| | |
|---|---|
| `FUZZ_SEED` | seed for generated data; the witness invariant is reported but not enforced when set |
| `WITNESS_REPORT=1` | list every unwitnessed claim with its recorded reason, and every claim guarded by a refusal |
| `DUMP_GENERATED_DATA=<path>` | write the generated SQL to a file |
