-- FULL JOIN chain + COALESCE + function + set operation.
-- Two FULL JOINs make everything optional; COALESCE recovers non-null.
-- UNION with a query that has NOT NULL columns tests set-op AND propagation.
SELECT
  COALESCE(p.id, -1)        AS product_id,   -- 
  COALESCE(p.name, 'none')  AS product_name,  -- 
  oi.quantity               AS qty,          -- 
  oi.unit_price             AS unit_price    -- 
FROM orders o
FULL JOIN order_items oi ON oi.order_id = o.id
FULL JOIN products p ON p.id = oi.product_id
UNION
SELECT
  id           AS product_id,
  name         AS product_name,
  NULL::integer AS qty,
  price        AS unit_price
FROM products
