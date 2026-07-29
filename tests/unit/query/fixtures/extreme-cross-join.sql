-- CROSS JOIN: parses as JOIN_INNER with no quals. Both sides are REQUIRED.
-- CROSS JOIN of two NOT NULL tables — all columns non-null.
-- Combined with a LEFT JOIN to show mixed join types in one FROM.
SELECT
  o.id    AS order_id,    -- 
  oi.id   AS item_id,     -- 
  c.email AS customer_email,  --  (LEFT JOIN optional side)
  oi.quantity AS quantity  -- 
FROM orders o
CROSS JOIN order_items oi
LEFT JOIN customers c ON c.id = o.customer_id
