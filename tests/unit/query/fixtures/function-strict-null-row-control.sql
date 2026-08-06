-- The control for function-strict-null-row, one argument apart. With the
-- second parameter SUPPLIED, no argument is NULL, the function runs, and the
-- body reading is exactly what it was before the short-circuit gate existed:
-- both fields of the row it constructs are non-null.
--
-- It is here so a fix for the short-circuit cannot pay for itself by refusing
-- every strict function in the FROM position.
SELECT
  p.sku,  -- @notNull
  p.qty   -- @notNull
FROM pair_strict(1, 2) p
