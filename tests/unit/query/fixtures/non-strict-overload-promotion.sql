-- `||` IS ON THE STRICT LIST, AND ARRAY CONCATENATION ABSORBS NULL.
--
-- The strictness twin of `name-level-partial-overload.sql`, found the same day
-- by asking whether that bug had a sibling. It did, and for the same reason:
-- `promotionOperatorIsStrict` asks the RUNTIME first — per-signature, from the
-- snapshot's strictness capture — and falls back to the curated name set only
-- when the narrowing has no candidates at all. That fallback is reached
-- exactly where operand types are unreadable, which is exactly where the
-- non-strict array row cannot be eliminated.
--
-- `NON_STRICT_OVERLOADS` had recorded the hole since the name was kept, and
-- `totality-probe.test.ts` asserts the record against PostgreSQL from both
-- sides — so the ledger was right and enforced, and the WALK never read it. A
-- recorded hole with no consumer at the point of use is not a guard.
--
-- `NULL::text[] || ARRAY['x']` is `{x}`, so the row satisfies the filter with a
-- NULL `tags`. A strict reading concludes the operands are non-null and
-- promotes; PostgreSQL returns the NULL.
--
-- WRITTEN AROUND A SET OPERATION, AND MOVED OFF IT THE SAME DAY. The original
-- spelling staged the columns through `UNION ALL` because a set-op CTE column
-- read untyped, which put the decision on the name. `reExportedTypeSet` closed
-- that gap hours later: the columns now read `text[]`, the array row loses the
-- narrowing on its own, and the fixture would have gone on passing while
-- testing something else — the precise way a regression test rots.
--
-- A WINDOW call is the durable spelling. The type reading refuses one BY
-- DESIGN (its semantics live in its own dispatch), so `s.a` and `s.b` are
-- values of an unreadable type, which is what hands the decision to the
-- name-level fallback and makes the guard the thing under test. `PARTITION BY
-- t.id` over the primary key makes each window its own row, so the values are
-- the columns themselves and the NULL that falsifies the promotion is the
-- table's own.
WITH opaque AS (
  SELECT first_value(t.tags) OVER (PARTITION BY t.id) AS a,
         first_value(t.more) OVER (PARTITION BY t.id) AS b
  FROM tagged t
)
SELECT
  s.a AS promoted,  -- @nullable
  s.b AS other      -- @nullable
FROM opaque s
WHERE (s.a || s.b) = ARRAY['x']
