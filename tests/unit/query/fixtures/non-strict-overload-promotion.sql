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
-- `NULL::text[] || ARRAY['x']` is `{x}`, so row 1 satisfies the filter with a
-- NULL `tags`. A strict reading concludes the operands are non-null and
-- promotes; PostgreSQL returns the NULL.
WITH swapped AS (
  SELECT t.tags AS a, t.more AS b FROM tagged t
  UNION ALL
  SELECT t.more, t.tags FROM tagged t
)
SELECT
  s.a AS promoted,  -- @nullable
  s.b AS other      -- @nullable
FROM swapped s
WHERE (s.a || s.b) = ARRAY['x']
