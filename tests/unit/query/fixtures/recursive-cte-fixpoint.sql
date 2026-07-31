-- Resolving a recursive CTE's self-reference is an induction, and the induction
-- has to be iterated to a fixed point rather than stopped after one pass.
--
-- `step` is the straightforward case: 0 in the base term, step + 1 in the
-- recursive one, so non-null at every level.
--
-- `carried` is the trap. A first pass assumes the self-reference produces what
-- the base term produces — every column non-null — and under that assumption
-- `t.faded` reads non-null, making `carried` non-null too. The same pass
-- concludes `faded` is nullable, which disproves the assumption it was computed
-- under: one level further down, `carried` really is NULL. Only re-analysing
-- under the weakened assumption reports it, so a single-pass implementation is
-- unsound here rather than merely imprecise.
WITH RECURSIVE t AS (
  SELECT 0 AS step, 1 AS carried, 1 AS faded
  UNION ALL
  SELECT t.step + 1, t.faded, NULL::int
  FROM t
  WHERE t.step < 3
)
SELECT
  step     AS step,     -- @notNull
  carried  AS carried,  -- @nullable
  faded    AS faded     -- @nullable
FROM t
