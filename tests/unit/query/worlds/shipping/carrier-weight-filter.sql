-- The filter is on the upper bound, so the band constraint is what carries a
-- conclusion across to the lower one.
SELECT
  c.name,
  c.min_weight_kg
FROM carriers c
WHERE c.max_weight_kg >= $1
