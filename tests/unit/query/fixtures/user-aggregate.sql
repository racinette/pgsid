-- User-defined aggregate (count_it) with GROUP BY.
-- count_it declares INITCOND '0'. With no rows to transition the initial
-- state is the result, so the aggregate is non-null even over zero rows.
SELECT
  o.customer_id    AS customer_id,   -- @notNull
  count_it(oi.id)  AS item_count     -- @notNull
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.customer_id
