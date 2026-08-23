-- The witness names an outer column, and it has to be THE SAME one the join
-- reads.
--
-- The lateral is correlated to `o.customer_id`, so what it proves is that
-- order_items holds a row whose order_id equals the CUSTOMER's id — a true
-- statement, and useless here, because the join asks about `o.id`. The two
-- differ by one token and the match refuses.
--
-- `dense` witnesses it on order 4: its customer is 1, order_items holds rows
-- with order_id 1, so the lateral is non-empty and the order survives — and
-- order 4 itself has no items, so the group is missing and `tot.n` is NULL.
SELECT
  o.id     AS order_id,  -- @notNull
  tot.n    AS total_n    -- @nullable
FROM orders o
CROSS JOIN LATERAL (
  SELECT 1 AS one FROM order_items oi WHERE oi.order_id = o.customer_id
) w
LEFT JOIN (
  SELECT oi2.order_id AS k, count(*) AS n FROM order_items oi2 GROUP BY oi2.order_id
) tot ON tot.k = o.id
