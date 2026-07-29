-- Mixed join types in one FROM: INNER + LEFT, with WHERE promotion on the
-- optional side of the LEFT JOIN (c.email IS NOT NULL promotes customers c).
SELECT
  o.id           AS order_id,   -- 
  c.email        AS email,      -- 
  oi.unit_price  AS price       -- 
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
INNER JOIN order_items oi ON oi.order_id = o.id
WHERE c.email IS NOT NULL
