# Closing the recorded imprecisions — handoff

## Charter

The fixture suite records every `nullable` claim it could not witness with a
real NULL, each carrying a reason (`-- @unwitnessable N: …`). That list is
the engine's imprecision made visible: a claim nothing can falsify is either
correct conservatism, a hole in the seed data, or a guarantee the engine
failed to derive and a consumer therefore does not get.

**100 such annotations across 336 fixtures** (2026-08-05). This document
classifies them, says which are engine defects worth closing, which are
correct, and in what order to take them. Nothing here is implemented.

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
```

## Read this before trusting the classification

The counts below are **approximate**. They come from a mechanical pass over
the reason text; ~26 annotations resist it and several reasons are
truncated in the files.

Worse, and the reason step 0 exists: **two of roughly ten reasons read
closely were WRONG.**

- `extreme-cross-join#2` blamed the CROSS JOIN, when the LEFT JOIN is what
  makes the column nullable and a NOT NULL foreign key is what makes the
  NULL unreachable. Corrected 2026-08-05.
- `extreme-domain-not-null-left-join#1,#2` claimed foreign-key entailment.
  Its `ON` is `c.id = 1` — a constant. If coupon 1 were absent the column
  WOULD be NULL, so the claim is simply right and the two annotations are
  seed-data artifacts, not engine imprecision. **Not yet corrected.**

At that rate the classification is standing on some sand. Fix the reasons
before spending effort on any class.

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

## Step 0 — audit the reasons

Cheap, and everything else depends on it. Read all 100, confirm each states
a CURRENT fact about why no data can witness the claim, and correct or
delete the ones that do not. Expect the count to move in both directions.

## The classes

### A. Row-type erasure — ~13–17 claims. **The biggest available win.**

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

Fixtures in this class: `from-item-kinds`, `setof-composite-type`,
`table-function-return-types`, `coldeflist-user-record`,
`function-out-parameter-shape`, `function-single-out-composite`,
`pg-catalog-shadowed-from-shape`, `unnest-composite-function-return`.

### B. Key entailment — ~8–9 claims. Independent, but a new mechanism.

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

Fixtures: `presence-group-full`, `presence-group-reexport-view`,
`extreme-cross-join`, `extreme-dml-insert-shipping-pipeline`,
`extreme-activity-feed-union`, `extreme-domain-nested`,
`extreme-correlated-everywhere#17`.

### C. Data gaps — ~6–8 claims. Not engine work.

Seed data that never reaches the case, not imprecision. The remedy is the
move that fixed `cc.p` and `pair_holder` on 2026-08-05: replace a
probability with a deterministic row-index rule, so a witness cannot be
lost to luck at these tables' row counts. Cheapest item on the list.

Fixtures: `extreme-correlated-everywhere#4,#10`,
`extreme-dml-update-pricing#24`, `extreme-multi-join-types#4`, and — after
step 0 — `extreme-domain-not-null-left-join#1,#2`.

### D. Curated tables — ~18–27 claims. Out of scope; see the other charter.

Splits three ways. Per-signature verdicts and the overload work belong to
`docs/type-aware-overloads.md`. A second part is witness-corpus material
from that same charter. The residue — `JSON_TABLE` columns,
`merge_action()`, multi-statement bodies, the VARIADIC gate's uniform
conservatism — is conservative BY DESIGN and no overload work touches it;
those reasons should be relabelled so they stop reading as pending.

### E. Correct, or structurally unwitnessable — ~27 claims. Leave.

- **Composite VALUE expansion.** `(expr).*` reads a value; if that value is
  NULL every field is NULL (measured, domain-typed fields included), so the
  expansion must force nullable. Correct.
- **Unwitnessable by nature.** Unnesting a NULL array produces no rows, so
  the column being unnested can never be observed NULL through that join.
  `CURRENT_SCHEMA` is NULL only under an empty search path no data state
  can arrange.
- **LATERAL drops the unmatched** (7, all one fixture). The
  `CROSS JOIN LATERAL` emits nothing for exactly the rows whose LEFT JOIN
  side did not match, so the aggregate's NULL is dropped before output.
  Real reasoning, one query's shape.
- **Zero-row subquery coincidence.** `(SELECT max(val) FROM t)` is NULL
  over zero rows — but the subquery scans the table the outer query scans,
  so it is empty exactly when there is no row to attach the NULL to.
  Closing it needs one relation's non-emptiness proven from another's.

## Order, and why

**Step 0, then C, then A, then B.**

C is free and needs no design. A is contained, reuses proven machinery, and
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
| The discipline and the current numbers | `docs/witness-coverage.md` |
| The suite that enforces it | `tests/unit/query/nullability-soundness.test.ts` |
| Body inlining (class A's machinery) | `resolveSqlFunctionBodyTraced` in `src/query/nullability-walk.ts` |
| Foreign keys (class B's input) | `ConstraintInfo` in `src/catalog/types.ts` |
| Seed data and NULL policies (class C) | `tests/unit/query/fixture-data/generators.ts` |
| The overload charter (class D) | `docs/type-aware-overloads.md` |
| Open engine work | `docs/deferred-tasks.md` |

Run from `pgsid/` with `npx vitest run`; installs use `pnpm`.
