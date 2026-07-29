-- 5-level deep nesting: outer CTE → scalar subquery → subquery in FROM →
-- inner CTE → correlated scalar subquery with count(*).
-- The walk recurses through all 5 scope levels to propagate nullability.
WITH outer_cte AS (
  SELECT
    o.id AS oid,
    (
      SELECT COALESCE(max(sub.cnt), 0) FROM (
        WITH inner_cte AS (
          SELECT p.id,
            (SELECT count(*) FROM order_items oi WHERE oi.product_id = p.id) AS cnt
          FROM products p
          WHERE p.category_id = o.customer_id
        )
        SELECT ic.cnt FROM inner_cte ic
      ) sub
    ) AS deep_count
  FROM orders o
)
SELECT
  oc.oid        AS order_id,    -- @notNull
  oc.deep_count AS deep_count   -- @notNull
FROM outer_cte oc
