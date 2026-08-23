-- The witness is the JOIN, not the subquery.
--
-- Identical to `row-witness-grouped-join.sql` except that the lateral is
-- LEFT JOIN ... ON true rather than CROSS JOIN. That one change removes the
-- entire premise: an order with no items keeps its row with `w` NULL-extended
-- instead of being dropped, so surviving does not prove the scan found
-- anything, and the join onto the grouped side can extend after all.
--
-- Order 4 in `dense` has no items and is exactly that row.
SELECT
  o.id     AS order_id,  -- @notNull
  tot.n    AS total_n    -- @nullable
FROM orders o
LEFT JOIN LATERAL (
  SELECT 1 AS one FROM order_items oi WHERE oi.order_id = o.id
) w ON true
LEFT JOIN (
  SELECT oi2.order_id AS k, count(*) AS n FROM order_items oi2 GROUP BY oi2.order_id
) tot ON tot.k = o.id
