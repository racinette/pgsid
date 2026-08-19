-- The SRF unit-channel blind spot — the divergence where the ENGINE and the
-- planner agree and the INSTRUMENT cannot see it (3 generated cases;
-- deferred-tasks §4).
--
-- The outer WHERE proves `uem` non-null, which refilters exactly the rows
-- where the LATERAL function's absent arm produced them — the planner
-- reduces the inner LEFT accordingly, and the walk proves the same thing at
-- the claim level: `uem` is notNull. But the oracle's refilter subtraction
-- attributes claims to join units through `ColumnOrigin.units`, and a
-- set-returning function has no base table — no origin, no unit id, nothing
-- to subtract. The divergence is the instrument's, not the engine's, which
-- is why the claims below are the strong ones and only the join accounting
-- disagrees.
--
-- @planner-reduces 1: the outer IS NOT NULL refilters the LATERAL
--   function's absent arm; the walk proves it at the claim level (uem is
--   notNull) but the instrument has no unit-id channel for function-scan
--   entries, so the subtraction cannot see it (the srf-unit-blindspot
--   verdict — an instrument limitation, not an engine gap).
SELECT
  s.tid,   -- @notNull
  s.uem    -- @notNull
FROM (
  SELECT t.id AS tid, g.email AS uem
  FROM t
  LEFT JOIN LATERAL gfn_urows(t.id) AS g ON true
) AS s
WHERE s.uem IS NOT NULL
