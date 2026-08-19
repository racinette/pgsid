-- The SRF refilter, attributed — the positive pin for the unitCrossings
-- channel (was the instrument's last blind spot; deferred-tasks §4).
--
-- The outer WHERE proves `uem` non-null, which refilters exactly the rows
-- where the LATERAL function's absent arm produced them — the planner
-- reduces the inner LEFT accordingly, and the walk proves the same thing
-- at the claim level: `uem` is notNull. Attribution needs a units channel
-- from claim to join, and origins cannot carry it here — an origin is
-- table-anchored (it exists to name what CHECKs and keys are stated over)
-- and a set-returning function has no table. The diagnostic
-- `unitCrossings` channel is that attribution without the anchor: the
-- claim carries the units its production chain crosses, the oracle
-- subtracts them, and this fixture agrees with the planner — no declared
-- divergence, which is the point.
SELECT
  s.tid,   -- @notNull
  s.uem    -- @notNull
FROM (
  SELECT t.id AS tid, g.email AS uem
  FROM t
  LEFT JOIN LATERAL gfn_urows(t.id) AS g ON true
) AS s
WHERE s.uem IS NOT NULL
