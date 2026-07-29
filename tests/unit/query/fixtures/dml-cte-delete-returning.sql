-- Data-modifying CTE: DELETE ... RETURNING inside a WITH clause,
-- then SELECT from the CTE. Cross-scope propagation: the CTE's
-- RETURNING columns determine the outer SELECT's nullability.
WITH deleted AS (
  DELETE FROM products WHERE deleted_at IS NOT NULL RETURNING id, name, sku
)
SELECT
  d.id    AS id,      -- @notNull
  d.name  AS name,    -- @notNull
  d.sku   AS sku       -- @notNull
FROM deleted d
