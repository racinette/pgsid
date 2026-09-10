-- The filter is on the upper bound, so the band constraint is what carries a
-- conclusion across to the lower one.
-- @args [0]
-- @param 1 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  c.name,          -- @notNull
  c.min_weight_kg  -- @nullable
FROM carriers c
WHERE c.max_weight_kg >= $1
