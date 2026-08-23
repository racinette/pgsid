-- User-defined aggregate (count_it) with GROUP BY.
--
-- count_it declares INITCOND '0', which fixes the EMPTY-input result only —
-- and a GROUP BY group is never empty, so the result here is whatever the
-- transition function accumulated. That used to end the analysis; the
-- transition is now READ. `count_it_sfunc(state bigint, val integer)` is a
-- LANGUAGE sql function like any other and its body has always been parsed
-- into `fnBodyAsts`. What was missing was the link saying which aggregate
-- folds through it.
--
-- The induction: the INITCOND makes the state non-null to start, `SELECT
-- state + 1` is non-null whenever the state is (walked with the state
-- assumed non-null and `val` assumed NULL — `val` is not read, so the
-- weakest hypothesis still closes), and count_it declares no FINALFUNC, so
-- the accumulated state IS the result.
SELECT
  o.customer_id    AS customer_id,   -- @notNull
  count_it(oi.id)  AS item_count     -- @notNull
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.customer_id
