-- Aggregates with GROUP BY. A plain GROUP BY emits no empty groups, so an
-- aggregate over a non-null expression has at least one non-null value to
-- work with and cannot return NULL. placed_at, unit_price and quantity are
-- all NOT NULL and reached through inner joins. The group key is NOT NULL.
SELECT
  c.id                       AS customer_id,   -- @notNull
  count(*)                   AS order_count,   -- @notNull
  max(o.placed_at)           AS last_order,    -- @notNull
  sum(oi.unit_price * oi.quantity) AS total    -- @notNull
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.id
