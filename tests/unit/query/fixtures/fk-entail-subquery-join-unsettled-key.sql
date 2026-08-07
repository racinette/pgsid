-- Gate: the key must be carried by a relation whose row is already SETTLED,
-- not merely by one sitting on the anchor's side of the join.
--
-- The anchor is `oi2`, found by self-lookup. `orders` arrives beside it
-- through a LEFT JOIN that matches on nothing in particular, so for most items
-- there is no order row at all — and a NULL-extended `o` carries a NULL
-- `customer_id`, which keys into nothing. The INNER join to customers then
-- drops the anchor row and the subquery is empty: dense returns it NULL.
--
-- The key itself is impeccable — `orders.customer_id` is NOT NULL and
-- references customers — which is the point. A key is a fact about a STORED
-- row, and reading it off a row that may not be there is where the chain would
-- go wrong.
SELECT
  oi.id  AS oiid,   -- @notNull
  (
    SELECT c.email
    FROM order_items oi2
    LEFT JOIN orders o ON o.id = oi2.id
    JOIN customers c ON c.id = o.customer_id
    WHERE oi2.id = oi.id
  )      AS email   -- @nullable
FROM order_items oi
