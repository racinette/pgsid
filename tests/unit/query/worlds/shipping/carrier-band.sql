-- The weight band is a two-column constraint, and neither column is declared
-- NOT NULL. Filtering one of them is what lets anything be concluded about the
-- other through the band.
SELECT
  c.name,
  c.min_weight_kg,
  c.max_weight_kg
FROM carriers c
WHERE c.max_weight_kg > 0
