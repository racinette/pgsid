-- Scalar subqueries: aggregate (single-row-guaranteed) vs plain FROM
-- (zero-rows-possible). LIMIT 1 does NOT count as single-row-guaranteed.
SELECT
  (SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id)  AS item_count,  -- @notNull
  (SELECT max(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) AS max_qty,  -- @nullable
  (SELECT oi2.unit_price FROM order_items oi2 WHERE oi2.order_id = o.id LIMIT 1) AS first_price  -- @nullable
FROM orders o
