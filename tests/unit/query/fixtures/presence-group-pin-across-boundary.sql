-- `presenceGroupPins`: a presence-group member pinned in THIS scope proves
-- the inner row present, so every discriminant of its group is non-null.
-- Landed 2026-08-22 as a second consumer for a fact the walk already
-- computed, cached in `groupCache` and lifted across boundaries — and never
-- read by the outer column resolution.
--
-- `srf` is the case that needed it and the plain-table `tbl` is why: the
-- two escapes from a nullable inner verdict are twins with different reach.
-- Origins are TABLE-anchored, and `originOf` returns none for a table
-- function ("table functions above all"), so `tbl` already read notNull
-- through origin CHECK entailment while `srf` had no channel at all. Only
-- the pairing of a function with a boundary was dark. Groups need no
-- anchor, so one arm covers both.
--
-- Mutating `presenceGroupPins` to return null is caught by the generated
-- corpus only through its classification gate — an outcome, four claims
-- wide, and dependent on the srf rule having been deleted when it closed.
-- This pins the mechanism instead: if `srf` goes nullable the channel is
-- gone, and if `tbl` goes nullable the origin route is.
--
-- `unpinned` is the control that keeps the pin honest. Same CTE, same SRF,
-- no `IS NOT NULL` on a group member — the LEFT JOIN LATERAL's extension is
-- real and nothing refilters it, so it must stay nullable.
-- @planner-keeps 1: the walk settles `p`'s LEFT JOIN through the outer
--   `p.b_tc IS NOT NULL`, which refilters its extension; the planner keeps
--   the join anyway because that predicate sits outside the CTE and it does
--   not pull the qual through. An engine-stronger divergence, declared.
WITH q AS (
  SELECT g.email AS a_tb, g.val AS a_tc
  FROM t LEFT JOIN LATERAL gfn_urows(t.id) AS g ON true
),
p AS (
  SELECT u.email AS b_tb, u.val AS b_tc
  FROM t LEFT JOIN u ON u.t_id = t.id
)
SELECT
  q.a_tb AS srf,       -- @notNull   the group carries the pin from a_tc
  p.b_tb AS tbl,       -- @notNull   origins already reached this one
  q2.a_tb AS unpinned  -- @nullable  no member pinned, extension survives
FROM q
CROSS JOIN p
CROSS JOIN q AS q2
WHERE q.a_tc IS NOT NULL
  AND p.b_tc IS NOT NULL
