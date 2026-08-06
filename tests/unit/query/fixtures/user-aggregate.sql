-- User-defined aggregate (count_it) with GROUP BY.
-- count_it declares INITCOND '0', which fixes the EMPTY-input result only —
-- and a GROUP BY group is never empty, so the result here is whatever the
-- transition function accumulated, which the engine cannot analyse. The
-- honest claim is nullable, the price of an unanalysable transition.
-- @unwitnessable 1: count_it's transition ('SELECT state + 1') in fact
--   preserves non-null state, so no data can witness the conservative claim.
SELECT
  o.customer_id    AS customer_id,   -- @notNull
  count_it(oi.id)  AS item_count     -- @nullable
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.customer_id
