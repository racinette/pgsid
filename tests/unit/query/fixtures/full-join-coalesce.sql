-- FULL JOINs make every relation optional; COALESCE with literals recovers
-- non-null output columns. Tests join nullability propagation through a
-- chain of two FULL JOINs.
SELECT
  COALESCE(o.id, -1)        AS order_id,     -- 
  COALESCE(p.name, 'none')  AS product_name, -- 
  oi.quantity               AS qty,          -- 
  p.price                   AS price         -- 
FROM orders o
FULL JOIN order_items oi ON oi.order_id = o.id
FULL JOIN products p ON p.id = oi.product_id
