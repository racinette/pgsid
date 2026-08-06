# Closing the recorded imprecisions — handoff

## Charter

The fixture suite records every `nullable` claim it could not witness with a
real NULL, each carrying a reason (`-- @unwitnessable N: …`). That list is
the engine's imprecision made visible: a claim nothing can falsify is either
correct conservatism, a hole in the seed data, or a guarantee the engine
failed to derive and a consumer therefore does not get.

**100 such annotations across 336 fixtures.** This document classifies
them, says which are engine defects worth closing, which are correct, and in
what order to take them. Step 0 — the audit of the reasons themselves — is
DONE (2026-08-06) and its result is below; nothing else here is implemented.

Read `docs/witness-coverage.md` first — it defines the discipline (a reason
is required, and a reason that stops being needed FAILS as stale) and
carries the current measurements. `docs/nullability-walk.md` is the engine.
One class has its own charter and is out of scope here:
`docs/type-aware-overloads.md`.

## Current measurement

```
336 fixtures, 5 data states
  notNull claims:  836 — 826 falsifiable, 10 guarded by a checked refusal, 0 unverified
  nullable claims: 542 — 440 witnessed (81%), 100 unwitnessed with a reason
                        (+2 inside `@no-rows` fixtures, exempt wholesale)
```

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

### A. Row-type erasure — 15 claims. **The biggest available win.**

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

Bounded by what already bounds the inliner: single-candidate only (bodies
differ across overloads), `LANGUAGE sql` only, multi-statement bodies stay
conservative. The direction is nullable→notNull, so it needs the generated
corpus dry-run the fix phases used.

| fixture | claims |
|---|---|
| `table-function-return-types` | #0, #1, #2, #4, #6 |
| `from-item-kinds` | #2, #3 |
| `setof-composite-type` | #0, #1 |
| `coldeflist-user-record` | #0, #1 |
| `pg-catalog-shadowed-from-shape` | #0, #1 |
| `function-out-parameter-shape` | #0 |
| `function-single-out-composite` | #0 |

The last two are the OUT-parameter spellings, whose bodies are equally
readable; `coldeflist-user-record` takes its shape from the column
definition list and its flags from the same body analysis.

`unnest-composite-function-return#0` is NOT in this class, though the
pre-audit pass listed it: a composite ELEMENT may itself be NULL, which
nulls every field, so that expansion's uniform rule is correct (class E).

### B. Key entailment — 11 claims. Independent, but a new mechanism.

```sql
-- shape 1: a join on a NOT NULL foreign key always matches
SELECT c.email FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
-- orders.customer_id is NOT NULL REFERENCES customers(id)

-- shape 2: a correlated subquery keyed on a unique column always returns a row
SELECT (SELECT p2.name FROM products p2 WHERE p2.id = p.id) FROM products p
```

No new catalog fact needed — the snapshot already carries foreign keys
(`ConstraintInfo.foreignSchema` / `foreignTable` / `foreignColumns`, plus
`validated`).

**Five hazards, each to be MEASURED before designing**, the way the
coercion model was:

1. `NOT VALID` foreign keys — pre-existing rows unchecked. The engine
   already models exactly this for CHECK constraints; reuse that reading.
2. `DEFERRABLE` constraints — violable mid-transaction, and a query in
   that same transaction can observe the violation.
3. The referenced column must be UNIQUE for "a match exists" to mean "one
   row".
4. `MATCH SIMPLE` on multi-column keys permits partial NULLs.
5. The referencing column must itself be NOT NULL — a nullable FK column
   holding NULL matches nothing.

| fixture | claims | shape |
|---|---|---|
| `presence-group-full` | #0, #1 | 1 |
| `presence-group-reexport-view` | #0 | 1, through a view |
| `extreme-cross-join` | #2 | 1 |
| `extreme-multi-join-types` | #4 | 1 (found by the audit) |
| `extreme-activity-feed-union` | #5, #7 | 2 |
| `extreme-dml-insert-shipping-pipeline` | #9 | 2, in RETURNING |
| `extreme-domain-nested` | #3 | 2 |
| `extreme-correlated-everywhere` | #17 | 2 |

Shape 2 needs hazard 3 and nothing else: the key is the scanned relation's
own primary key, so the row provably exists. Shape 1 needs all five.

### C. Data gaps — 3 claims. Not engine work.

Down from the six the pre-audit pass counted, and two of the three are new.
Each is measured — the witness exists, the corpus simply does not reach it.

- `extreme-correlated-everywhere#10` — needs a product with order items but
  no reviews. Adding one to `dense` witnesses it (measured).
- `from-item-kinds#4` — the LATERAL lookup always lands because every state
  that supplies order-1 items also seeds products 1 and 2. Cheapest closed
  in the FIXTURE rather than the data: give the VALUES list one id that no
  product carries, keeping the matching row beside it so both arms run.
- `scalar-subquery#2` — `max(val)` over `sparse`'s single non-NULL row.
  `sparse`'s `t.name` IS NULL, so the same shape one column over is
  witnessed by data that already exists.

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

## Order, and why

**C, then A, then B.** Step 0 is done.

C is three claims and needs no design — two of them close in the fixture
rather than in a data state. A is contained, reuses proven machinery, and
carries the largest count. B is a new mechanism whose hazards deserve their
own measurement pass first — and it is the one where being wrong produces a
wrong `notNull` on a very common query shape.

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
