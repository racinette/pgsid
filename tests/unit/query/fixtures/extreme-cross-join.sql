-- CROSS JOIN: parses as JOIN_INNER with no quals. Both sides are REQUIRED.
-- CROSS JOIN of two NOT NULL tables — all columns non-null.
-- Combined with a LEFT JOIN to show mixed join types in one FROM.
--
-- The LEFT JOIN's ON is an equality on orders.customer_id, a NOT NULL FOREIGN
-- KEY onto customers.id, so it matches for every row of orders and the
-- optional side never null-extends. This claim carried an @unwitnessable
-- reason until the engine read foreign keys — twice, in fact: the first
-- reason blamed the CROSS JOIN, which has nothing to do with it.
SELECT
  o.id    AS order_id,    -- @notNull
  oi.id   AS item_id,     -- @notNull
  c.email AS customer_email,  -- @notNull
  oi.quantity AS quantity  -- @notNull
FROM orders o
CROSS JOIN order_items oi
LEFT JOIN customers c ON c.id = o.customer_id
