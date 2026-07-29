-- COALESCE / NULLIF / CASE in output columns.
-- NULLIF is an unknown built-in → conservative nullable.
-- CASE is conservative nullable (no path-sensitive analysis).
-- COALESCE with a non-null literal or non-null column is non-null.
SELECT
  COALESCE(p.deleted_at, '1970-01-01'::timestamptz) AS deleted_or_epoch,  -- 
  NULLIF(p.sku, 'UNKNOWN')                           AS sku_or_null,      -- 
  CASE WHEN p.price > 100 THEN 'premium' ELSE 'standard' END AS tier,    -- 
  COALESCE(CASE WHEN p.price > 100 THEN p.name END, p.sku) AS label      -- 
FROM products p
