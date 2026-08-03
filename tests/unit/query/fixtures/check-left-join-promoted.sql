-- The gate's complement: the same predicate in the WHERE promotes the
-- LEFT-JOINed entry to REQUIRED (only matched rows survive the filter), and
-- a present row IS a stored row, so CHECK entailment speaks again.
SELECT
  h.id AS hid,          -- @notNull
  g.arrived_at AS ga    -- @notNull
FROM t h
LEFT JOIN guest g ON g.id = h.id
WHERE g.status = 'arrived'
