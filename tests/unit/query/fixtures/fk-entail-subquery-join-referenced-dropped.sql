-- Gate: the relation a key settles must still be in its own side of the join.
--
-- The order's `customer_id` does point at a customer that exists, and that is
-- the whole of what the key says. It is not what this join looks at: the
-- customers side is itself an INNER join onto addresses, so a customer with no
-- address is gone before the outer join sees it, and the subquery is empty for
-- that order. dense and uniform both return one.
--
-- The join form answers the same question with the same reading
-- (fk-entail-referenced-not-preserved-proven.sql); a subquery's FROM is where
-- it arrives second.
SELECT
  oi.id  AS oiid,   -- @notNull
  (
    SELECT a.city
    FROM orders o
    JOIN (customers c JOIN addresses a ON a.customer_id = c.id)
      ON c.id = o.customer_id
    WHERE o.id = oi.order_id
  )      AS city    -- @nullable
FROM order_items oi
