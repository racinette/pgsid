-- Set operations with mixed column sources: one side has a scalar
-- subquery (aggregate → single-row → recurse), the other has a COALESCE
-- with a literal fallback. Both sides produce 3 columns with different
-- nullability profiles; the UNION result is the AND of both sides.
WITH review_stats AS (
  SELECT
    product_id,
    count(*) AS review_count,
    max(rating) AS best_rating
  FROM reviews
  GROUP BY product_id
)
SELECT
  p.id                          AS id,          -- @notNull
  COALESCE(p.name, 'unknown')   AS name,        -- @notNull
  (SELECT count(*) FROM order_items oi WHERE oi.product_id = p.id) AS order_count  -- @notNull
FROM products p
UNION
SELECT
  p.id                          AS id,
  p.name                        AS name,
  COALESCE(rs.best_rating, 0)   AS order_count
FROM products p
LEFT JOIN review_stats rs ON rs.product_id = p.id
