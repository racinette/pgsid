-- Aggregates with GROUP BY: count(*) is non-null; max/sum are nullable
-- (aggregates return NULL over zero rows). The group key is a NOT NULL column.
SELECT
  c.id                       AS customer_id,   -- @notNull
  count(*)                   AS order_count,   -- @notNull
  max(o.placed_at)           AS last_order,    -- @nullable
  sum(oi.unit_price * oi.quantity) AS total    -- @nullable
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.id
