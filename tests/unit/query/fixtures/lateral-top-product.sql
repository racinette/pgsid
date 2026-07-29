-- LATERAL join: top product per order via a correlated subquery in FROM.
-- The LATERAL subquery is on the optional side of a LEFT JOIN, so its
-- columns are nullable (it may produce zero rows for an order).
SELECT
  o.id    AS order_id,    -- @notNull
  lp.name AS top_product  -- @nullable
FROM orders o
LEFT JOIN LATERAL (
  SELECT p.name
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = o.id
  ORDER BY oi.quantity DESC
  LIMIT 1
) lp ON true
