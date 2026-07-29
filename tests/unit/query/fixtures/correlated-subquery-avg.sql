-- Correlated scalar subqueries: per-order total (single-row aggregate)
-- and a correlated aggregate in WHERE comparing against the customer average.
SELECT
  o.id          AS order_id,      -- @notNull
  o.customer_id AS customer_id,   -- @notNull
  o.status      AS status,        -- @notNull
  (SELECT sum(oi.unit_price * oi.quantity)
   FROM order_items oi
   WHERE oi.order_id = o.id)      AS order_total   -- @nullable
FROM orders o
WHERE (SELECT avg(oi2.unit_price * oi2.quantity)
       FROM order_items oi2
       JOIN orders o2 ON o2.id = oi2.order_id
       WHERE o2.customer_id = o.customer_id) > 100
