-- Aggregate view + CTE + correlated subquery + multi-join.
-- The order_summary view has nullable columns (sum can be NULL over zero rows).
-- A CTE wraps it; a correlated subquery in the SELECT list references the
-- outer query. Multiple joins combine required and optional sides.
WITH order_totals AS (
  SELECT * FROM order_summary
)
SELECT
  c.id           AS customer_id,   -- 
  c.email        AS email,         -- 
  ot.item_count  AS item_count,    --  (from view, count(*) is non-null but view column is nullable in catalog)
  ot.total       AS total,         --  (from view, sum is nullable)
  (SELECT count(*)
   FROM orders o2
   WHERE o2.customer_id = c.id
     AND o2.status = 'shipped') AS shipped_orders  -- 
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
LEFT JOIN order_totals ot ON ot.order_id = o.id
WHERE c.deleted_at IS NULL
