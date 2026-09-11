-- EXCEPT emits left-arm rows. The right predicate cannot donate its non-NULL
-- proof to those rows, and the missing reading leaves NULL in the result.
-- @args [0]
-- @param 1 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  r.demand_mw -- @nullable
FROM meter_readings r
EXCEPT
SELECT
  r.demand_mw
FROM meter_readings r
WHERE r.demand_mw >= $1
