-- The weight band is a two-column constraint, and neither column is declared
-- NOT NULL. Filtering one of them is what lets anything be concluded about the
-- other through the band.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  c.name,          -- @notNull
  c.min_weight_kg, -- @nullable
  c.max_weight_kg  -- @notNull
FROM carriers c
WHERE c.max_weight_kg > 0
