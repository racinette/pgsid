-- User-defined aggregate (count_it) with GROUP BY.
-- User aggregates are conservatively nullable (the walk does not snapshot
-- pg_aggregate.agginitval), even when the initcond is non-null.
SELECT
  o.customer_id    AS customer_id,   -- @notNull
  count_it(oi.id)  AS item_count     -- @nullable
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.customer_id
