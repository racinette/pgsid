# Closing the recorded imprecisions — handoff

## Charter

The fixture suite records every `nullable` claim it could not witness with a
real NULL, each carrying a reason (`-- @unwitnessable N: …`). That list is
the engine's imprecision made visible: a claim nothing can falsify is either
correct conservatism, a hole in the seed data, or a guarantee the engine
failed to derive and a consumer therefore does not get.

**100 such annotations across 336 fixtures**, now 78 across 352. This
document classifies them and says which are engine defects. **The charter is
DISCHARGED** (2026-08-06): step 0 (the reason audit) and all three closable
classes — C, A and B — are done, 25 of their 28 claims closed and the three
residues recorded below with what each would take.

Read `docs/witness-coverage.md` first — it defines the discipline (a reason
is required, and a reason that stops being needed FAILS as stale) and points
at the run that measures it. `docs/nullability-walk.md` is the engine.
One class has its own charter and is out of scope here:
`docs/type-aware-overloads.md`.

> **HISTORICAL — this is the 2026-08-06 audit, kept for its method, not its
> census.** Every count below is that day's: 78 annotations across 352
> fixtures. On 2026-08-25 the live list is 18 across 593; run
> `WITNESS_REPORT=1 pnpm exec vitest run
> tests/unit/query/nullability-soundness.test.ts` for the current one.
>
> **§D's classification was falsified, and in the direction that matters.**
> It says "Four kinds, and only the first is closable by work already
> planned". Measured 2026-08-25:
>
> - kind 1, *the overload charter's material (4)* — the one kind called
>   closable: **one of four closed** (`builtin-functions#4`, `upper`).
>   `param-fn-overload#0` and `overload-consensus#1,#2` are still annotated.
> - kind 2, *curated-table coverage (2)* — **both closed.**
>   `aggregate-modifiers#9` (`stddev_pop`) reads `notNull`; `pg_sleep(0)`
>   left `builtin-functions#24` entirely, and that column is `current_query()`
>   now, with a different reason (the fixture records the substitution on its
>   own line).
> - kind 3, *genuinely partial functions (5)* — "**No narrowing helps** …
>   closing these needs value analysis the engine does not do". **All five
>   closed**, by exactly that value analysis: `date_part`,
>   `extract(day)`, `array_length`, an in-range subscript and a closed
>   `= ANY` array all read `notNull` today (`closed-truths.ts`, and §4's "a
>   literal `ARRAY[…]` settles both causes").
>
> So the kind declared closable is the one that mostly did NOT close, and
> seven claims across two kinds declared not-closable did. The register
> convicted "closable, *if ever worth it*" as reach dressed as judgment;
> this is the same error with the sign flipped — **an impossibility asserted
> where a measurement belonged** — and it is why `AGENTS.md` rule 2 says
> correctness, not reach, is the metric. The text below is left exactly as
> written, because a corrected document would not show that.

## Current measurement

```
352 fixtures, 5 data states                        (before the audit → after C, A and B)
  notNull claims:  836 → 874 — 864 falsifiable, 10 guarded by a checked refusal, 0 unverified
  nullable claims: 542 → 543 — 440 → 463 witnessed (85%), 100 → 78 unwitnessed with a reason
                        (+2 inside `@no-rows` fixtures, exempt wholesale)
```

The sixteen new fixtures are the three classes' GATES, which carry claims of
their own — so the counts move by less than the twenty-five graduations, and
the corpus grew rather than shrank.

One correction to the post-audit census: class B was **10** claims, not the 11
first recorded, and class E **39**, not 38 — an arithmetic slip in the
classification, found by recounting against `WITNESS_REPORT` after B landed.
The classes still partition all 100.

## Step 0 — the reason audit (2026-08-06)

All 100 reasons were read against their fixture, and every one whose truth
was not evident from the SQL was measured against PGlite. **Ten carried a
wrong or misleading reason**, on top of the two corrected before the audit
started — twelve in a hundred, and they were not spread evenly. They
clustered exactly where the classification depended on them:

**Five of the six claims labelled "data gap" were not data gaps**, and two
claims nobody had labelled were. Every misreading ran the same direction: a
filter in the fixture's own query made the NULL unreachable, and the reason's
author looked at the data instead of the query.

- `extreme-correlated-everywhere#4` — labelled a data gap. The WHERE's
  category-size guard counts `p2.category_id = p.category_id`, an EQUALITY,
  which is never true for a NULL: a product with no category counts 0 and
  fails `> 2` in every state. Measured with four NULL-category products
  carrying order items and reviews; none reaches the output. → class E.
- `extreme-multi-join-types#4` — labelled a data gap. It is NOT NULL foreign
  key entailment (`order_items.product_id`), with the RIGHT/FULL extensions
  that could null the products side refiltered by `o.id IS NOT NULL`.
  Measured with an orphan customer and a shipped itemless order. → class B.
- `extreme-dml-update-pricing#24` — labelled a data gap. The UPDATE's own
  WHERE carries `EXISTS (… categories WHERE c.id = p.category_id AND
  c.deleted_at IS NULL)`, so every updated row has a live category and the
  RETURNING subquery keyed on that same id finds it. Measured with a
  NULL-category and a soft-deleted-category product. → class E, and a shape
  class B's foreign-key reading does not cover.
- `extreme-domain-not-null-left-join#1,#2` — the correction of 2026-08-05
  said a state seeding coupons without id 1 would witness both, making these
  seed-data artifacts. **That correction was itself wrong.** `c2` joins on
  the SAME constant and the WHERE requires `c2.code IS NOT NULL`, so any
  state that returns a row is one where coupon 1 exists — and then `c`
  matches too. Measured: deleting coupon 1 from `dense` returns no rows at
  all. → class E. Two reasons on the same claim, two errors.
- `from-item-kinds#4` — blamed row-type erasure. `lat` is the optional side
  of a LEFT JOIN LATERAL, which is a different rule entirely; the claim is
  unwitnessed only because the fixture is live only where order 1 has items
  (dense, uniform) and both of those states also seed products 1 and 2.
  Measured: a state with order-1 items and no product 1 or 2 witnesses it on
  every row. → class C.
- `scalar-subquery#2` — claimed the zero-input NULL coincides with
  rowlessness, as its siblings do. `max` is also NULL over a non-empty
  all-NULL input, which is a data property. `c1` raises with more than one
  `t` row, so the fixture is live only under `sparse`, whose single row has
  `val = 'x'`. Measured: a one-row `t` with a NULL val witnesses it.
  → class C.
- `xmltable-jsontable#5` — "the EXISTS column tests a member the document
  always has". The document does not have `$.b` at all; an EXISTS column
  answers a missing member with false, never NULL (measured).
- `scalar-subquery-zero-row-guards#8` — "the grouped subquery cannot produce
  an empty group" is false in general: a reviewless product empties it. What
  actually forbids it is the fixture's own UNION case, which returns two
  rows and raises unless the review count is exactly 7. That invariant
  rewrote #2 and #5 as well, which had gestured at it without naming it.

Two mechanical results came with the pass. `parseFixtureDirectives` now
records a reason's continuation lines (`--` + two or more spaces) instead of
the first line only — eleven reasons were half-recorded, so `WITNESS_REPORT`
printed a truncated sentence as the justification for a claim. And a
continuation carrying `@notNull`/`@nullable` is now an error: the per-column
scanner matches those anywhere after a `--`, so a reason could invent a
column.

## Already closed (do not redo)

**NOT NULL domain columns**, 2026-08-05. `attnotnull` stays FALSE for a
domain-constrained column, so the engine read them nullable. Every route to
a stored NULL was measured and rejected — INSERT omitting the column,
UPDATE to NULL, ADD COLUMN on a non-empty table, ALTER COLUMN TYPE over
existing NULLs, `ALTER DOMAIN … SET NOT NULL` while a column holds one —
and crucially there is **no `NOT VALID` form** of that ALTER to bypass the
validation with (syntax error). Applied to TABLES only: a VIEW column can
carry the domain as its type and still be NULL, because a LEFT JOIN inside
the definition null-extends it after the domain has had its say (measured,
matviews too). Tree-wide by construction — a child cannot retype an
inherited column. Two claims graduated to witnessed notNull.

## The classes

An exact census now, not the ranges the pre-audit pass produced. The five
classes partition all 100.

### A. Row-type erasure — 15 claims. **CLOSED 2026-08-06**, 14 of 15.

```sql
SELECT * FROM get_order_items(1)          -- RETURNS SETOF order_items
-- all five columns nullable; order_items declares all five NOT NULL
```

A row type carries column TYPES and no constraints, so `SETOF order_items`
genuinely permits NULL anywhere and the engine is right in general. It is
wrong here: the function's `LANGUAGE sql` body selects those very columns.

The walk already inlines `LANGUAGE sql` bodies for SCALAR returns
(priority 5, `resolveSqlFunctionBodyTraced`). The change is to analyse the
body's target list per-column for ROW returns instead of accepting the
declared row type's erasure.

| fixture | claims | closed |
|---|---|---|
| `table-function-return-types` | #0, #1, #2, #4, #6 | all |
| `from-item-kinds` | #2, #3 | both |
| `setof-composite-type` | #0, #1 | both |
| `coldeflist-user-record` | #0, #1 | both |
| `pg-catalog-shadowed-from-shape` | #0, #1 | both |
| `function-single-out-composite` | #0 | yes |
| `function-out-parameter-shape` | #0 | **no** — see below |

`unnest-composite-function-return#0` is NOT in this class, though the
pre-audit pass listed it: a composite ELEMENT may itself be NULL, which
nulls every field, so that expansion's uniform rule is correct (class E).

**What landed.** `sqlFunctionBodyShape` reads a single-candidate `LANGUAGE
sql` body's target list per column and ORs it into the declared list.
Two mappings, both spellings measured as accepted: positional (one target
entry per output column) and a ROW CONSTRUCTOR delivering the whole row as
one composite-typed entry, which PostgreSQL expands into fields. Only a
constructor is read the second way — it is never itself NULL, while any
other composite-typed expression may be, and a NULL value nulls every field.

**Four gates, each measured and each pinned from both sides** by a new
`body-shape-*` fixture. They are the whole soundness argument:

1. `ROWS FROM` with two or more functions NULL-pads the shorter one after it
   has returned — measured against this very body. No padding partner, no
   reading.
2. A non-set-returning composite return whose body can yield zero rows comes
   back as one row of all NULLs (measured), so `guaranteesSingleRow` gates
   it exactly as it gates the scalar path — with a positive control so the
   gate is not blanket.
3. Single candidate only: `fnBodyAsts` is keyed by `schema.name`, so an
   overloaded name's bodies collide there. The fixture loads the trap — the
   call takes the overload that emits NULLs while the shared key holds the
   one that does not — so a widening of this gate falsifies immediately.
4. One-against-one is refused for a row-typed return, where the two readings
   are indistinguishable and disagree.

**What it deliberately does not do**, and the one claim that pays for it:
a body's PARAMETERS read nullable, so `out_pair`'s `lo` — which returns its
own argument — keeps a reason. Closing it means threading the call's
argument nullability and being right about its join state at the call site;
the caller's NULL does reach the output (measured), so reading them nullable
is the conservative half. Set-operation and DML bodies are not read either,
which is the scalar inliner's boundary too.

**Verification.** The direction is nullable→notNull, so all 14 graduated
claims are executed against PostgreSQL under five data states with nothing
falsified, and the generated corpus was re-run — unmoved, though that is
weak evidence here for the reason `docs/generated-surface.md` measures: the
corpus has no schema axis and cannot express a table function with a body.
The fixture suite and the four gates are what carry this one.

### B. Key entailment — 10 claims. **CLOSED 2026-08-06**, 8 of 10.

```sql
-- shape 1: a join on a NOT NULL foreign key always matches
SELECT c.email FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
-- orders.customer_id is NOT NULL REFERENCES customers(id)

-- shape 2: a correlated subquery keyed on a unique column always returns a row
SELECT (SELECT p2.name FROM products p2 WHERE p2.id = p.id) FROM products p
```

One new catalog fact was needed after all: `condeferrable`. The rest was
already there (`ConstraintInfo.foreignSchema` / `foreignTable` /
`foreignColumns` / `validated`).

**The five chartered hazards were measured first, and the measurement moved
three of them:**

1. `NOT VALID` — confirmed: a pre-existing violating row is read back through
   the join. Gated on `convalidated`.
2. `DEFERRABLE` — confirmed, and worse than assumed: `INITIALLY IMMEDIATE` is
   no protection, since `SET CONSTRAINTS ALL DEFERRED` reaches it. The gate is
   on `condeferrable`, which the snapshot did not carry.
3. "The referenced column must be UNIQUE" — **not a hazard**: PostgreSQL
   refuses a foreign key onto a non-unique column outright. And uniqueness is
   not what the claim needs anyway — several matches make a scalar subquery
   RAISE, not return NULL, so at-least-one is the right predicate.
4. `MATCH SIMPLE` — **collapses into hazard 5**: with every referencing column
   NOT NULL there is no partial-NULL pair to permit. (Composite keys are
   nonetheless left out for now, recorded.)
5. The referencing column NOT NULL — confirmed, and read tree-wide.

**Three hazards the charter did not list, all measured:**

6. **PG18 `NOT ENFORCED` keys** accept violations freely — and need no gate of
   their own, because `convalidated` is false for one AND
   `ALTER CONSTRAINT … NOT ENFORCED` clears it on an already-validated key.
7. **INHERITANCE.** A parent's key is not copied to a child: pg_constraint
   records it on the parent alone and a violating child row inserts without
   complaint, so a TREE scan reads rows nothing checked. This is the
   relation-SET lesson of sweep 2, third instance. Partitioning is the
   opposite and needs no exclusion — the constraint is on every partition and
   `ATTACH PARTITION` validates the incoming rows.
8. **`ALTER TABLE … DISABLE TRIGGER ALL`.** Foreign keys are triggers, so this
   lets violating rows in while `convalidated` and `conenforced` both stay
   true — the catalog cannot tell you the data is dirty. Two more routes
   measured afterwards: `SET session_replication_role = 'replica'`, a session
   GUC needing no DDL, and disabling triggers on the REFERENCED side, where a
   delete's `ON DELETE CASCADE` never fires and orphans rows that were valid a
   moment earlier. It is the first fact the engine trusts that an
   administrative command can silently falsify: neither route bypasses a CHECK
   (measured), and NOT NULL is enforced in the executor. The DEFAULT stands —
   a declared key is the schema author's invariant, and PostgreSQL's own
   planner has trusted validated keys for join selectivity since 9.6 without
   revalidating them. What is missing is the escape hatch for a consumer that
   knows better, which needs config wiring that does not exist yet: section 1b
   of `docs/deferred-tasks.md`, beside search-path half (b).

| fixture | claims | shape | closed |
|---|---|---|---|
| `presence-group-full` | #0, #1 | 1 | both |
| `presence-group-reexport-view` | #0 | 1, through a view | yes |
| `extreme-cross-join` | #2 | 1 | yes |
| `extreme-multi-join-types` | #4 | 1 (found by the audit) | yes |
| `extreme-domain-nested` | #3 | 2, self-lookup | yes |
| `extreme-correlated-everywhere` | #17 | 2, self-lookup | yes |
| `extreme-activity-feed-union` | #5 | 2, key lookup | yes |
| `extreme-activity-feed-union` | #7 | 2, **join inside** | **no** |
| `extreme-dml-insert-shipping-pipeline` | #9 | 2, **join inside** | **no** |

**The residue is one shape**, and it is a composition rather than a gap: a
subquery whose FROM carries a JOIN — `(SELECT c.email FROM customers c JOIN
orders o ON o.customer_id = c.id WHERE o.id = s.order_id)`. Each hop is
individually a NOT NULL key the mechanism already reads; what is missing is
proving the inner JOIN matches for the row the outer key found. Both claims
carry that as their reason.

**Eleven gate fixtures**, each pinning a hazard from the side that would
produce a wrong `notNull`: `fk-entail-not-valid`, `-deferrable`,
`-inheritance` (+ its `ONLY` control), `-extra-conjunct`,
`-optional-referencer`, and for the subquery form `-subquery-extra-conjunct`,
`-subquery-optional-outer`, `-subquery-only-scan` (+ control),
`-subquery-nullable-key`. The inheritance ones are witnessed by a dangling row
seeded into an inheritance CHILD, which is legal precisely because the
parent's key does not reach it.

**Verification.** Twenty-three graduated claims execute against PostgreSQL
under five data states with nothing falsified. The generated corpus is again
weak evidence and again unmoved: its structures are over `t`/`u`/`v`, which
declare no foreign keys at all.

### C. Data gaps — 3 claims. **CLOSED 2026-08-06.** Not engine work.

Down from the six the pre-audit pass counted, and two of the three were new.
All three are now witnessed by real NULLs, and their annotations came off —
the staleness check is what proves each one, since a reason on a witnessed
claim fails as loudly as a missing one.

- `extreme-correlated-everywhere#10` — a correlated `avg(rating)` is NULL
  exactly for a product that was ordered and never reviewed, and every state
  reviewed every ordered product. `dense` sells product 6 now, one row in
  `order_items`. The only change that touched the seed data, and it moved
  nothing else in the corpus.
- `from-item-kinds#4` — the LATERAL lookup always landed because every state
  supplying order-1 items also seeds products 1 and 2. Closed in the FIXTURE:
  its `VALUES` list carries `-1` beside `1`, an id no state can seed
  (surrogate keys are numbered from 1), so both arms of the LEFT JOIN
  LATERAL run. The fixture now asserts what its own comment always claimed.
- `scalar-subquery#2` — `max(val)` over `sparse`'s single row, whose val is
  non-NULL. The subquery aggregates `name` now: same shape one column over,
  and `sparse`'s `t.name` IS NULL, so an aggregate's second route to NULL —
  a non-empty all-NULL input — is exercised rather than described.

Two of the three cost a fixture one literal. That is the general lesson: a
claim can go unwitnessed because of which ids a fixture happens to name,
which is not what the fixture asserts and is free to change.

### D. Conservative by design — 33 claims. Correct, and mostly chartered
elsewhere.

Four kinds, and only the first is closable by work already planned:

- **The overload charter's material (4).** A name-level verdict a
  per-signature one improves: `builtin-functions#4` (`upper`, whose
  `(anyrange)` form is what cost the `(text)` form its claim),
  `param-fn-overload#0`, `overload-consensus#1,#2`.
- **Curated-table coverage (2).** Total builtins with no verdict recorded:
  `builtin-functions#24` (`pg_sleep`), `aggregate-modifiers#9`
  (`stddev_pop`). `docs/generated-surface.md`'s second item is the audit
  that would find them.
- **Genuinely partial functions (5).** No narrowing helps — the same
  signature returns NULL for other inputs, so closing these needs value
  analysis the engine does not do: `date_part` of a finite timestamp
  (`builtin-functions#10`), `extract(day)` of an interval
  (`builtin-extract-infinity#3`), `array_length` with a valid dimension
  (`extreme-expression-combo#1`), an in-range subscript
  (`expression-node-coverage#9`), an opaque array expression
  (`quantified-sublinks#13`).
- **Mechanisms conservative by construction (22).** No charter touches
  them, and these reasons should read as settled rather than pending:
  the unanalysable aggregate transition (3), multi-statement bodies (3),
  aggregates under GROUPING SETS, `merge_action()`, explicit window frames,
  `JSON_TABLE` columns (3), the VARIADIC gate, the SRF target-list padding
  rule (3), an INSTEAD OF trigger's row, and the five CHECK-machinery gates
  (the collation gate, numeric token distinctness, the varchar cast gate,
  `NOT VALID`, origin death at a transforming expression).

### E. Structurally unwitnessable — 38 claims. Leave.

- **Composite VALUE expansion (9).** `(expr).*` and `unnest` of a composite
  array read a VALUE; if that value is NULL every field is NULL (measured,
  domain-typed fields included), so the expansion must force nullable.
- **LATERAL drops the unmatched (7).** All one fixture: the
  `CROSS JOIN LATERAL` emits nothing for exactly the rows whose LEFT JOIN
  side did not match, so the aggregate's NULL is dropped before output.
- **Unnesting a NULL array produces no rows (6).** The column being
  unnested can never be observed NULL through that join.
- **A builtin table function's own values (4).** `json_each`'s key is a
  field name, its value is a json datum (a JSON null is not a SQL NULL),
  `generate_series` over literal bounds.
- **The fixture's own set-operation invariant (4).**
  `scalar-subquery-zero-row-guards` forces every product to exactly seven
  reviews in any state that returns rows; one of the four
  (`UNION SELECT 7` always supplying a row) is structural outright.
- **Zero-row subquery coincidence (3).** `(SELECT max(val) FROM t)` is NULL
  over zero rows — but the subquery scans the table the outer query scans,
  so it is empty exactly when there is no row to attach the NULL to.
  Closing it needs one relation's non-emptiness proven from another's.
- **`CURRENT_SCHEMA` (2).** NULL only under an empty search path no data
  state can arrange.
- **A guard elsewhere in the same statement (3).** The three the audit
  reclassified: an equality guard that a NULL can never satisfy
  (`extreme-correlated-everywhere#4`), an `EXISTS` in the UPDATE's WHERE
  entailing the RETURNING subquery's row (`extreme-dml-update-pricing#24`),
  and two LEFT JOINs on the same constant where the WHERE promotes one
  (`extreme-domain-not-null-left-join#1,#2` — that is two claims, one
  reason). These are the interesting residue of the audit: each is a real
  entailment across clauses, none is reachable by class B's foreign-key
  reading, and none is worth its own mechanism.

## What is left

**Nothing in this charter is scheduled.** Step 0 and classes C, A and B are
done; 25 of their 28 claims are closed and the three residues are recorded on
their fixtures, each naming what it would take:

- `function-out-parameter-shape#0` — thread the CALL's argument nullability
  into the body reading, and be right about the argument's join state at the
  call site.
- `extreme-activity-feed-union#7`, `extreme-dml-insert-shipping-pipeline#9` —
  prove an INNER JOIN inside a correlated subquery matches, composing two key
  hops the mechanism already reads individually.

The 78 that remain are correct: 33 conservative by design (four of them the
overload charter's), 39 structurally unwitnessable, 3 the new gates' own
refusals, and the 3 residues above.

The method that worked, for whoever takes the next class of this kind:
measure what PostgreSQL actually guarantees BEFORE designing — the pass for B
moved three of the five chartered hazards and found three more, one of which
(`DISABLE TRIGGER`) has no catalog trace and had to become a recorded
assumption rather than a gate. Then land the reading behind gates, and pin
every gate from the side that would produce a wrong `notNull`, so it cannot
quietly widen.

Both A and B move claims from nullable to notNull, which is the UNSOUND
direction. Neither should land without the generated-corpus dry-run, and
each closed claim should graduate from an `@unwitnessable` reason to a
witnessed `@notNull` — the suite enforces that automatically, since a stale
reason fails.

## Where things are

| | |
|---|---|
| The annotations | `-- @unwitnessable N: …` in `tests/unit/query/fixtures/*.sql` |
| Their parser, including reason continuation | `tests/unit/query/fixture-args.ts` |
| The discipline and the current numbers | `docs/witness-coverage.md` |
| The suite that enforces it | `tests/unit/query/nullability-soundness.test.ts` |
| Body inlining (class A's machinery) | `resolveSqlFunctionBodyTraced` in `src/query/nullability-walk.ts` |
| Foreign keys (class B's input) | `ConstraintInfo` in `src/catalog/types.ts` |
| Seed data and NULL policies (class C) | `tests/unit/query/fixture-data/generators.ts` |
| The overload charter (class D) | `docs/type-aware-overloads.md` |
| Open engine work | `docs/deferred-tasks.md` |

Run from `pgsid/` with `npx vitest run`; installs use `pnpm`.
