-- Triple-nested correlated subquery: subquery inside a subquery inside a
-- COALESCE, with correlated references at each level.
-- Level 0: outer SELECT from orders.
-- Level 1: scalar subquery (SELECT count(*) ...) — aggregate, single-row.
-- Level 2: inside that, a correlated subquery referencing the outer order.
-- The innermost expression is COALESCE over a non-null count(*) → non-null.
SELECT
  o.id     AS order_id,   -- @notNull
  o.status AS status,     -- @notNull
  COALESCE(
    (SELECT count(*) FROM order_items oi
     WHERE oi.order_id = o.id
       AND oi.product_id IN (
         SELECT p.id FROM products p
         WHERE p.deleted_at IS NULL
           AND p.price > (SELECT avg(p2.price) FROM products p2
                         WHERE p2.category_id = p.category_id)
       )),
    0
  ) AS premium_item_count   -- @notNull
FROM orders o
