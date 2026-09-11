-- The left arm admits missing readings and therefore nullable demand. The
-- right arm refilters the shared values through a strict range predicate, so
-- INTERSECT cannot return the left arm's NULL value.
-- @args [0]
-- @param 1 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  r.demand_mw -- @notNull
FROM meter_readings r
INTERSECT
SELECT
  r.demand_mw
FROM meter_readings r
WHERE r.demand_mw >= $1
