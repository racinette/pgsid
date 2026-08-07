-- Key entailment composing through a JOIN inside the subquery.
--
-- One hop settles the anchor: `order_items.order_id` is a NOT NULL key, so
-- the order the WHERE names exists. The second hop is the join — that order's
-- `customer_id` is a NOT NULL key too, and `customers` is a whole unfiltered
-- relation here, so the join matches for exactly that row and the subquery
-- returns it. A scalar subquery that returns a row propagates its column, and
-- `customers.email` is NOT NULL.
--
-- Each hop was already read individually; only the composition was missing.
-- What makes it sound is that the second key is carried by the relation the
-- first one settled — see fk-entail-subquery-join-direction.sql for the
-- reading that is not.
SELECT
  oi.id  AS oiid,   -- @notNull
  (
    SELECT c.email
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.id = oi.order_id
  )      AS email    -- @notNull
FROM order_items oi
