-- Multi-CTE with different join structures, self-joined in the outer query.
-- CTE 'with_reviews' has a LEFT JOIN (nullable rating).
-- CTE 'with_orders' has an INNER JOIN (non-null order info).
-- Outer query self-joins the two CTEs + LEFT JOINs a table + WHERE promotes.
WITH with_reviews AS (
  SELECT p.id, p.name, p.deleted_at, r.rating
  FROM products p
  LEFT JOIN reviews r ON r.product_id = p.id
),
with_orders AS (
  SELECT wr.id, wr.name, wr.deleted_at, wr.rating, oi.order_id
  FROM with_reviews wr
  JOIN order_items oi ON oi.product_id = wr.id
)
SELECT
  wo.id      AS product_id,   -- 
  wo.name    AS name,         -- 
  wo.rating  AS rating,       --  (from LEFT JOIN in with_reviews)
  wo.order_id AS order_id,    --  (from INNER JOIN in with_orders)
  c.email    AS customer_email  --  (WHERE c.email IS NOT NULL promotes it)
FROM with_orders wo
LEFT JOIN orders o ON o.id = wo.order_id
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.email IS NOT NULL  -- promotes c to required
