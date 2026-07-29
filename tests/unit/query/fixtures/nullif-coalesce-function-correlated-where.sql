-- NULLIF + COALESCE + nested function calls + scalar subquery in WHERE.
-- NULLIF returns nullable (unknown built-in). COALESCE with a non-null
-- fallback makes it non-null. The WHERE clause has a correlated scalar
-- subquery comparing against an aggregate.
SELECT
  p.id    AS product_id,   -- 
  p.name  AS name,         -- 
  COALESCE(NULLIF(p.sku, 'UNKNOWN'), 'MISSING') AS safe_sku,  -- 
  lower_strict(p.name)    AS lower_name,  -- 
  lower_strict(p.deleted_at) AS lower_deleted  -- 
FROM products p
WHERE p.price >= (
  SELECT avg(p2.price)
  FROM products p2
  WHERE p2.category_id = p.category_id
    AND p2.deleted_at IS NULL
)
