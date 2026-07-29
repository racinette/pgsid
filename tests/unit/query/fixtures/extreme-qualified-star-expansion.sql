-- Qualified star expansion: p.*, oi.* in a multi-table query.
-- Each alias.* expands to just that relation's columns, preserving
-- their catalog nullability and join state. The optional side of the
-- LEFT JOIN makes all of c's columns nullable, while p and oi stay
-- non-null (INNER JOIN, required). WHERE promotion on c recovers non-null.
SELECT
  p.*,       -- @notNull
             -- @nullable
             -- @notNull
             -- @notNull
             -- @notNull
             -- @nullable
  oi.*,      -- @notNull
             -- @notNull
             -- @notNull
             -- @notNull
             -- @notNull
  c.email    -- @notNull
FROM products p
INNER JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN customers c ON c.id = (
  SELECT o.customer_id FROM orders o WHERE o.id = oi.order_id
)
WHERE c.email IS NOT NULL
