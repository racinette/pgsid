-- Multiple join types in a single FROM: INNER + LEFT + RIGHT + FULL.
-- The outer FULL JOIN makes everything optional. ON clauses reference
-- columns from earlier joins. WHERE promotes two aliases (o and c) but
-- leaves two optional (oi/p, s). The per-alias promotion means
-- c.id is notNull (promoted via c.email IS NOT NULL), not just c.email.
SELECT
  o.id           AS order_id,       -- 
  oi.id          AS item_id,        -- 
  c.id           AS customer_id,    -- 
  c.name         AS customer_name,  -- 
  p.name         AS product_name,   -- 
  s.carrier      AS carrier,        -- 
  COALESCE(s.tracking_no, 'N/A') AS tracking  -- 
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
RIGHT JOIN customers c ON c.id = o.customer_id
FULL JOIN shipments s ON s.order_id = o.id
WHERE o.id IS NOT NULL AND c.email IS NOT NULL
