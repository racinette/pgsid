-- Data-modifying CTE: DELETE ... RETURNING inside a WITH clause,
-- then SELECT from the CTE. Cross-scope propagation: the CTE's
-- RETURNING columns determine the outer SELECT's nullability.
WITH deleted AS (
  DELETE FROM products WHERE deleted_at IS NOT NULL RETURNING id, name, sku
)
SELECT
  d.id    AS id,      -- 
  d.name  AS name,    -- 
  d.sku   AS sku       -- 
FROM deleted d
