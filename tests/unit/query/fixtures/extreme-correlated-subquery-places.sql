-- Correlated subqueries in unexpected places: in a CASE condition,
-- in a function argument inside an aggregate, and in ORDER BY
-- (not an output column, but the walk must handle it without crashing).
SELECT
  p.id AS product_id,   -- 
  CASE
    WHEN EXISTS (
      SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
    ) THEN 'has_orders'
    ELSE 'no_orders'
  END AS order_status,   -- 
  sum(
    CASE WHEN p.deleted_at IS NULL THEN 1 ELSE 0 END
  ) AS active_sum,       -- 
  COALESCE(
    (SELECT max(rating) FROM reviews r WHERE r.product_id = p.id),
    0
  ) AS best_rating       -- 
FROM products p
ORDER BY (
  SELECT count(*) FROM order_items oi WHERE oi.product_id = p.id
)
